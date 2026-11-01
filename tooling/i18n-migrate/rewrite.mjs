/** #1197 · 迁移器的 AST 层：找候选字面量、判位置（迁 / 不迁）、整句化、算编辑。**本件不写盘**。
 *
 *  一条「迁移单元」是什么：一个用户可见的字符串表达式——单字面量、无插值模板、或一条 + 链／带插值的模板。
 *  单元改写成 m('key') 或 m('key', { p0: String(表达式) })；整句化后的模板留在词条表里：
 *  字面量片段逐字进模板，非字面量操作数成为 {p0}… 具名参数。
 *
 *  为什么非字面量操作数要包一层 String()：
 *    · 与 + 的 ToString 语义相同（+ 拼接时对非串操作数做的就是 ToString），行为逐字一致；
 *    · MessageParams 的类型面只收 string | number，具体表达式是别的类型时，不包就是编译期红。
 *
 *  fail-closed：拿不准的形状（标签模板、JSX、展开、链内的条件分支、字面量里的 {name} 形态）
 *  整件报 UNSUPPORTED、一个字节都不写；每一条「不迁」都记进报告，不许静默丢。
 */
import { readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

export const TOOL_VERSION = '1.0.0';

/** 候选判据：含汉字或假名。全角标点（，。（））单独出现不算文案，不建词条。 */
const CANDIDATE_RE = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u309F\u30A0-\u30FF]/;
/** 整句里带 HTML 标签（<div class="…"> 这类）：标签、class、id 是结构，不是文案，词条表里只放文案。 */
const HTML_TAG_RE = /<[a-zA-Z][a-zA-Z0-9]*(?:\s[^<>]*)?\/?>/;
/** 派生件：改生成器，不手改生成物。 */
const GENERATED_NAME_RE = /\.generated\.ts$|\/cli\/(registry|keys)\.ts$|helpAssets\.ts$|sceneData\.ts$|helpShell\.ts$/;
const GENERATED_HEAD_RE = /机器生成|禁手改|请勿手改|GENERATED|do not edit|auto-generated/i;
/** 具名占位符：与 packages/base-entries/src/evaluate.ts 的 PLACEHOLDER 同形。 */
const PLACEHOLDER_RE = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
/** 冻结的命令键前缀（词条 key 不许以它们打头）。 */
const CMD_PREFIX_RE = /^(bill|calorie|chef|home|memo|schedule|life|ilife)\./;
/** 开发期失败报文：这些调用的实参不上屏。 */
const DEV_CALLEES = new Set(['fail', 'failIf', 'failWith', 'assert', 'assertEqual', 'assertDeepEqual', 'assertTrue', 'assertFalse', 'assertOk', 'panic', 'die', 'invariant', 'ensure', 'expect', 'log', 'warn', 'error', 'info', 'debug', 'trace']);
/** 比较／匹配用串：这些方法收到的串是判据，不是文案。 */
const MATCH_METHODS = new Set(['includes', 'startsWith', 'endsWith', 'indexOf', 'lastIndexOf', 'match', 'matchAll', 'test', 'search', 'replace', 'replaceAll', 'split', 'exec', 'localeCompare', 'toEqual', 'toMatch', 'toBe']);
/** 比较运算符：操作数是判据。 */
const COMPARE_OPS = new Set([
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.LessThanToken,
  ts.SyntaxKind.LessThanEqualsToken,
  ts.SyntaxKind.GreaterThanToken,
  ts.SyntaxKind.GreaterThanEqualsToken,
  ts.SyntaxKind.InKeyword,
  ts.SyntaxKind.InstanceOfKeyword,
]);

/** 行号（1 起）。 */
function lineOf(src, node) {
  return src.getLineAndCharacterOfPosition(node.getStart(src)).line + 1;
}

/** 节点所在行的行首空白（多行改写时对齐用）。 */
function indentOf(src, node) {
  const line = src.getLineAndCharacterOfPosition(node.getStart(src)).line;
  const full = src.text.split('\n')[line] || '';
  const m = /^[ \t]*/.exec(full);
  return m === null ? '' : m[0];
}

/** 这个字面量／模板里有没有候选（汉字或假名）。 */
function hasCandidate(node) {
  if (ts.isTemplateExpression(node)) {
    if (CANDIDATE_RE.test(node.head.text)) return true;
    return node.templateSpans.some((span) => CANDIDATE_RE.test(span.literal.text));
  }
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return CANDIDATE_RE.test(node.text);
  return false;
}

/** 最简单可读的调用名：标识符或属性访问的末段。 */
function calleeName(expr) {
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isPropertyAccessExpression(expr)) return expr.name.text;
  return null;
}

/** 绑定名（标识符或解构）。 */
function bindingNames(name, out) {
  if (ts.isIdentifier(name)) { out.push(name.text); return out; }
  if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
    for (const element of name.elements) if (ts.isBindingElement(element)) bindingNames(element.name, out);
  }
  return out;
}

function isFunctionLike(node) {
  return ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)
    || ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node) || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node);
}

/** 函数体第一层的 m 声明（挡住最常见的一层遮蔽；更深的层级由 UNSUPPORTED 兜）。 */
function declaresInBody(fn, name) {
  const body = fn.body;
  if (body === undefined || !ts.isBlock(body)) return false;
  for (const statement of body.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const decl of statement.declarationList.declarations) {
      if (bindingNames(decl.name, []).indexOf(name) >= 0) return true;
    }
  }
  return false;
}

/** 单元的祖先里有没有 m 遮蔽（函数参数、函数体第一层声明，以及模块级同名声明）。 */
function isShadowed(rootNode, src, importedM) {
  for (let cur = rootNode; cur !== undefined; cur = cur.parent) {
    if (isFunctionLike(cur)) {
      for (const param of cur.parameters) if (bindingNames(param.name, []).indexOf('m') >= 0) return true;
      if (declaresInBody(cur, 'm')) return true;
    }
  }
  if (importedM) return false;
  for (const statement of src.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name !== undefined && statement.name.text === 'm') return true;
    if (ts.isClassDeclaration(statement) && statement.name !== undefined && statement.name.text === 'm') return true;
    if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (bindingNames(decl.name, []).indexOf('m') >= 0) return true;
      }
    }
  }
  return false;
}

/** 单元若落在模块级常量的初值上，迁移后语言会在模块加载时固化——报 SKIP_MODULE_CONST，留人处理。 */
function moduleScopeVarOf(rootNode, src) {
  for (let cur = rootNode; cur !== undefined; cur = cur.parent) {
    if (isFunctionLike(cur) || ts.isBlock(cur)) return null;
    if (ts.isVariableDeclaration(cur)) {
      const list = cur.parent;
      const statement = list === undefined ? undefined : list.parent;
      if (statement !== undefined && ts.isVariableStatement(statement) && statement.parent === src) return cur;
      return null;
    }
  }
  return null;
}

/** 向上找单元的根：整条 + 链或一个模板／字面量；括号包着的并进同一单元。 */
function rootOf(node) {
  let cur = node;
  for (;;) {
    const parent = cur.parent;
    if (parent === undefined) return cur;
    if (ts.isParenthesizedExpression(parent)) { cur = parent; continue; }
    if (ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.PlusToken) { cur = parent; continue; }
    return cur;
  }
}

/** 收集一件文件里的全部单元根（按出现位置排序，互不嵌套）。 */
function collectRoots(src) {
  const seen = new Set();
  const roots = [];
  const visit = (node) => {
    if (hasCandidate(node)) {
      const root = rootOf(node);
      if (!seen.has(root)) { seen.add(root); roots.push(root); }
    }
    ts.forEachChild(node, visit);
  };
  visit(src);
  roots.sort((a, b) => a.getStart(src) - b.getStart(src));
  return roots;
}

/** 链／模板是不是「字符串意义上的拼接」：含至少一个字符串字面量或模板，才允许继续摊平。 */
function isStringy(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) return true;
  if (ts.isParenthesizedExpression(node)) return isStringy(node.expression);
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) return isStringy(node.left) || isStringy(node.right);
  return false;
}

/** 按求值顺序摊平一条单元：字面量片段成 text，其余整个子表达式成一个 expr。 */
function flatten(node, out) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    out.push({ kind: 'text', text: node.text });
    return;
  }
  if (ts.isTemplateExpression(node)) {
    out.push({ kind: 'text', text: node.head.text });
    for (const span of node.templateSpans) {
      out.push({ kind: 'expr', node: span.expression });
      out.push({ kind: 'text', text: span.literal.text });
    }
    return;
  }
  if (ts.isParenthesizedExpression(node)) {
    flatten(node.expression, out);
    return;
  }
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken && isStringy(node)) {
    flatten(node.left, out);
    flatten(node.right, out);
    return;
  }
  out.push({ kind: 'expr', node });
}

/** 参数名前缀：避开字面量里已经出现的 {p0} 这类文本。 */
function pickPrefix(texts, count) {
  for (const prefix of ['p', 'a', 'v', 'x', 'k']) {
    let free = true;
    for (let i = 0; i < count; i += 1) {
      const token = '{' + prefix + i + '}';
      if (texts.some((text) => text.indexOf(token) >= 0)) { free = false; break; }
    }
    if (free) return prefix;
  }
  return null;
}

/** 子树里还有候选文案（如 a + (cond ? '甲' : '乙')）→ 整件不迁。 */
function subtreeHasCandidate(node) {
  let found = false;
  const visit = (child) => {
    if (found) return;
    if (child !== node && hasCandidate(child)) { found = true; return; }
    ts.forEachChild(child, visit);
  };
  visit(node);
  return found;
}

/**
 * 整句化一个单元根：返回 {ok:true, template, params:[{name, text, node}]} 或 {ok:false, why}。
 * template＝进词条表的文案（字面量片段逐字、非字面量操作数成 {p0}…）。
 */
export function buildSentence(rootNode, src) {
  const parts = [];
  flatten(rootNode, parts);
  const texts = parts.filter((part) => part.kind === 'text').map((part) => part.text);
  const exprCount = parts.filter((part) => part.kind === 'expr').length;
  const prefix = pickPrefix(texts, exprCount);
  if (prefix === null) return { ok: false, why: '字面量片段里含 {p0}/{a0} 这类占位符形态文本，参数名无从挑' };
  let template = '';
  const params = [];
  for (const part of parts) {
    if (part.kind === 'text') { template += part.text; continue; }
    const name = prefix + params.length;
    params.push({ name, text: part.node.getText(src), node: part.node });
    template += '{' + name + '}';
  }
  const declared = new Set(params.map((param) => param.name));
  let matches = 0;
  for (const mm of template.matchAll(PLACEHOLDER_RE)) {
    matches += 1;
    if (!declared.has(mm[1])) {
      return { ok: false, why: '字面量里含 {' + mm[1] + '} 形态的文本：求值端口会把它当占位符替换（要么补参数，要么人工改成不含花括号的说法）' };
    }
  }
  if (matches !== declared.size) return { ok: false, why: '占位符与参数个数对不上（字面量里有同名占位符文本）' };
  return { ok: true, template, params };
}

/** 把单元改写成取词调用（params 为空＝单字面量）。 */
function renderCall(key, params, indent) {
  if (params.length === 0) return "m('" + key + "')";
  const args = params.map((param) => param.name + ': String(' + param.text + ')');
  const one = "m('" + key + "', { " + args.join(', ') + ' })';
  const multiline = params.some((param) => param.text.indexOf('\n') >= 0) || indent.length + one.length > 110;
  if (!multiline) return one;
  const lines = params.map((param) => indent + '  ' + param.name + ': String(' + param.text + '),');
  return "m('" + key + "', {\n" + lines.join('\n') + '\n' + indent + '})';
}

/**
 * 判一个单元的位置：
 *  · skip＝按票面口径「不迁」，记进报告，不动源码；
 *  · unsupported＝形状拿不准，整件不写盘；
 *  · copy＝迁。
 */
export function classifyUnit(rootNode, src, hasImportedM) {
  let conditional = false;
  for (let cur = rootNode; cur.parent !== undefined; cur = cur.parent) {
    const parent = cur.parent;
    if (ts.isTypeNode(parent)) return { kind: 'skip', reason: 'SKIP_TYPE', detail: '类型位置（不上屏）' };
    if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent) || ts.isImportEqualsDeclaration(parent) || ts.isModuleDeclaration(parent)) {
      return { kind: 'skip', reason: 'SKIP_IDENT', detail: '模块说明符或声明名' };
    }
    if (ts.isNewExpression(parent)) {
      const name = calleeName(parent.expression);
      if (name !== null && (/Error$/.test(name) || DEV_CALLEES.has(name))) {
        return { kind: 'skip', reason: 'SKIP_DEV_MESSAGE', detail: '开发期失败报文的实参（' + name + '）' };
      }
    }
    if (ts.isThrowStatement(parent)) return { kind: 'skip', reason: 'SKIP_DEV_MESSAGE', detail: 'throw 的实参' };
    if (ts.isCallExpression(parent)) {
      const name = calleeName(parent.expression);
      const isArgument = parent.arguments.indexOf(cur) >= 0;
      if (isArgument && name !== null) {
        if (DEV_CALLEES.has(name) || /^assert[A-Za-z]/.test(name) || name === 'assert') {
          return { kind: 'skip', reason: 'SKIP_DEV_MESSAGE', detail: '开发期断言／日志的实参（' + name + '）' };
        }
        if (MATCH_METHODS.has(name)) return { kind: 'skip', reason: 'SKIP_COMPARISON', detail: '比较／匹配方法的实参（' + name + '）' };
        if (name === 'RegExp') return { kind: 'skip', reason: 'SKIP_COMPARISON', detail: '正则字面量' };
      } else if (name !== null && MATCH_METHODS.has(name)) {
        return { kind: 'skip', reason: 'SKIP_COMPARISON', detail: '比较／匹配集合里的串（' + name + ' 的接收者）' };
      }
    }
    if (ts.isBinaryExpression(parent) && COMPARE_OPS.has(parent.operatorToken.kind)) {
      return { kind: 'skip', reason: 'SKIP_COMPARISON', detail: '比较操作数' };
    }
    if (ts.isCaseClause(parent)) return { kind: 'skip', reason: 'SKIP_COMPARISON', detail: 'switch 分支标签' };
    if (ts.isPropertyAssignment(parent) || ts.isMethodDeclaration(parent) || ts.isPropertyDeclaration(parent)
      || ts.isPropertySignature(parent) || ts.isMethodSignature(parent) || ts.isGetAccessorDeclaration(parent)
      || ts.isSetAccessorDeclaration(parent) || ts.isFunctionDeclaration(parent) || ts.isEnumMember(parent)) {
      if (parent.name === cur) return { kind: 'skip', reason: 'SKIP_KEY', detail: '对象键／成员名' };
    }
    if (ts.isEnumMember(parent)) return { kind: 'skip', reason: 'SKIP_ENUM', detail: '枚举成员值必须是常量' };
    if (ts.isElementAccessExpression(parent) && parent.argumentExpression === cur) {
      return { kind: 'skip', reason: 'SKIP_DATA', detail: '下标取值的串＝键或用户数据' };
    }
    if (ts.isTaggedTemplateExpression(parent)) return { kind: 'unsupported', reason: '标签模板（String.raw 之类）形状固定不了' };
    if (ts.isJsxAttribute(parent) || ts.isJsxElement(parent) || ts.isJsxSelfClosingElement(parent) || ts.isJsxFragment(parent) || ts.isJsxExpression(parent) || ts.isJsxText(parent)) {
      return { kind: 'unsupported', reason: 'JSX' };
    }
    if (ts.isSpreadElement(parent) || ts.isSpreadAssignment(parent)) return { kind: 'unsupported', reason: '展开运算符' };
    if (ts.isAsExpression(parent) && parent.type.getText() === 'const') {
      return { kind: 'skip', reason: 'SKIP_AS_CONST', detail: 'as const 断言里换成函数调用会破类型' };
    }
    if (ts.isConditionalExpression(parent)) conditional = true;
  }
  if (moduleScopeVarOf(rootNode, src) !== null) {
    return { kind: 'skip', reason: 'SKIP_MODULE_CONST', detail: '模块级常量：迁移后语言在模块加载时固化，需人工改成按需取词' };
  }
  if (isShadowed(rootNode, src, hasImportedM)) {
    return { kind: 'unsupported', reason: 'm 遮蔽', detail: '作用域里有同名的 m 绑定，注入的取词调用会被遮住' };
  }
  return { kind: 'copy', conditional };
}

/** 相对路径里取包名：packages/<包>/src/... 的第二段。 */
export function packageOfRel(rel) {
  const parts = rel.split('/');
  if (parts.length < 4 || parts[0] !== 'packages') return null;
  return parts[1];
}

/** 区段名：packages/<包>/src/ 之后的相对路径，去 .ts，非字母数字折成 -（**大小写原样保留**：
 *  仓内既成 key 是 skill-bill.write-candidatePick.c001 这种，折掉大小写就换了一套 key 命名空间）。 */
export function segmentOf(rel) {
  const prefix = 'packages/' + packageOfRel(rel) + '/src/';
  return rel.slice(prefix.length).replace(/\.ts$/, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** 词条 key：<包目录>.<区段>.c<三位序号>（与 docs/agents/多语言-渲染语言上下文.md 第 3 节同形）。 */
export function keyOf(rel, index) {
  const pkg = packageOfRel(rel);
  const seq = String(index).padStart(3, '0');
  return pkg + '.' + segmentOf(rel) + '.c' + seq;
}

/** 本包 entries/index.ts 里有没有 export function m(（没有就整件报 UNSUPPORTED，不许放宽）。 */
export function entriesHasM(root, pkg) {
  const path = join(root, 'packages', pkg, 'src', 'entries', 'index.ts');
  let text;
  try { text = readFileSync(path, 'utf8'); } catch (e) { return { ok: false, why: '读不出 ' + path + '：' + e.message }; }
  if (text.indexOf('export function m(') < 0) return { ok: false, why: 'entries/index.ts 缺 export function m(：' + path };
  return { ok: true };
}

/** 文件是否已经 import 了 m（任意来源）。 */
function importedMOf(src) {
  for (const statement of src.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const clause = statement.importClause;
    if (clause === undefined || clause.namedBindings === undefined) continue;
    if (ts.isNamedImports(clause.namedBindings)) {
      if (clause.namedBindings.elements.some((element) => element.name.text === 'm')) return true;
    }
  }
  return false;
}

/** 到本包 entries/index.js 的相对说明符。 */
export function importSpecifierFor(rel) {
  const pkg = packageOfRel(rel);
  const fileDir = rel.split('/').slice(0, -1).join('/');
  const target = 'packages/' + pkg + '/src/entries/index.js';
  let spec = posix.relative(fileDir, target);
  if (!spec.startsWith('.')) spec = './' + spec;
  return spec;
}

/** 取词 import 的编辑：已有同源具名 import 就并进去，否则另起一行。 */
function planImport(src, rel) {
  const spec = importSpecifierFor(rel);
  const imports = src.statements.filter((statement) => ts.isImportDeclaration(statement));
  const same = imports.find((statement) => statement.moduleSpecifier.text === spec);
  if (same !== undefined) {
    const clause = same.importClause;
    if (clause !== undefined && !clause.isTypeOnly && clause.namedBindings !== undefined && ts.isNamedImports(clause.namedBindings)) {
      const elements = clause.namedBindings.elements;
      if (elements.some((element) => element.name.text === 'm')) return null;
      const last = elements[elements.length - 1];
      if (last !== undefined) return { start: last.getEnd(), end: last.getEnd(), text: ', m' };
    }
  }
  const line = "import { m } from '" + spec + "';";
  if (imports.length > 0) {
    const last = imports[imports.length - 1];
    return { start: last.getEnd(), end: last.getEnd(), text: '\n' + line };
  }
  const first = src.statements[0];
  const at = first === undefined ? 0 : first.getStart(src);
  return { start: at, end: at, text: line + '\n' };
}

/** 空计划。 */
function emptyPlan(rel) {
  return { rel, status: 'skip', why: '', edits: [], entries: [], units: [], skips: [], warnings: [] };
}

/** 一件文件 → 迁移计划（不写盘）。 */
export function planFile(root, rel, opts) {
  const plan = emptyPlan(rel);
  const abs = join(root, rel);
  let text;
  try { text = readFileSync(abs, 'utf8'); } catch (e) {
    plan.why = '文件读不出：' + e.message;
    return plan;
  }
  // 读分析时看到的原文：写盘前拿它跟现读的比，不一样就说明这中间有人改过（并发写是本仓常态）
  plan.text = text;
  if (text.indexOf('\r') >= 0) { plan.status = 'unsupported'; plan.why = '文件含 CR 行尾（本工具只写 LF，先统一行尾）'; return plan; }
  if (!rel.endsWith('.ts')) { plan.status = 'unsupported'; plan.why = '只处理 .ts 源件'; return plan; }
  const pkg = packageOfRel(rel);
  if (pkg === null) { plan.status = 'unsupported'; plan.why = '不在 packages/<包>/src/ 下，判不了词条归属'; return plan; }
  const head5 = text.split('\n').slice(0, 5).join('\n');
  if (GENERATED_NAME_RE.test(rel) || GENERATED_HEAD_RE.test(head5)) { plan.why = '派生件走生成器（不手改生成物）'; return plan; }
  const src = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  if (src.parseDiagnostics.length > 0) {
    plan.status = 'unsupported';
    plan.why = '源码有语法错误：' + String(src.parseDiagnostics[0].messageText);
    return plan;
  }
  const hasM = entriesHasM(root, pkg);
  if (!hasM.ok) { plan.status = 'unsupported'; plan.why = hasM.why; return plan; }
  const importedM = importedMOf(src);
  const roots = collectRoots(src);
  if (roots.length === 0) { plan.why = '没有可迁的候选字面量'; return plan; }
  const edits = [];
  let settled = 0;
  let seq = 0;
  // 半迁移的件：表里已有本件的 c001…，新条目从已有最大序号往后接，绝不改既有 key 的含义
  const startIndex = opts.startIndex === undefined ? 1 : opts.startIndex;
  for (const rootNode of roots) {
    const line = lineOf(src, rootNode);
    const raw = rootNode.getText(src);
    const value = raw.length > 80 ? raw.slice(0, 80) + '…' : raw;
    const verdict = classifyUnit(rootNode, src, importedM);
    if (verdict.kind === 'skip') {
      plan.skips.push({ reason: verdict.reason, detail: verdict.detail, line, value });
      continue;
    }
    if (verdict.kind === 'unsupported') {
      plan.status = 'unsupported';
      plan.skips.push({ reason: 'UNSUPPORTED', detail: verdict.reason, line, value });
      plan.why = verdict.reason + '（第 ' + line + ' 行）';
      continue;
    }
    const sentence = buildSentence(rootNode, src);
    if (!sentence.ok) {
      plan.status = 'unsupported';
      plan.skips.push({ reason: 'UNSUPPORTED', detail: sentence.why, line, value });
      plan.why = sentence.why + '（第 ' + line + ' 行）';
      continue;
    }
    // 整段 HTML／脚本串：整句化出来是一坨标签，译者改不了、也不该整段换；交真人拆成文案再迁
    if (HTML_TAG_RE.test(sentence.template)) {
      plan.skips.push({ reason: 'SKIP_HTML_STRUCTURE', detail: '整句里带 HTML 标签（结构不进词条表，交真人拆文案）', line, value });
      continue;
    }
    const hidden = sentence.params.find((param) => subtreeHasCandidate(param.node));
    if (hidden !== undefined) {
      const why = '链内有条件分支／嵌套表达式还含着待迁文案（第 ' + line + ' 行的参数 ' + hidden.name + '）';
      plan.status = 'unsupported';
      plan.skips.push({ reason: 'UNSUPPORTED', detail: why, line, value });
      plan.why = why;
      continue;
    }
    if (verdict.conditional) plan.warnings.push({ kind: 'CONDITIONAL', line, detail: '单元落在条件分支里：逐支各建一条词条' });
    seq += 1;
    const key = keyOf(rel, startIndex + seq - 1);
    if (CMD_PREFIX_RE.test(key)) {
      plan.status = 'unsupported';
      plan.why = '派生 key 撞上冻结的命令键前缀：' + key;
      continue;
    }
    plan.entries.push({ key, value: sentence.template, line });
    plan.units.push({ key, line, template: sentence.template, params: sentence.params.map((param) => ({ name: param.name, text: param.text })) });
    edits.push({ start: rootNode.getStart(src), end: rootNode.getEnd(), text: renderCall(key, sentence.params, indentOf(src, rootNode)) });
    settled += 1;
  }
  if (plan.status === 'unsupported') {
    plan.edits = [];
    plan.entries = [];
    return plan;
  }
  if (settled === 0) { plan.why = '候选全部按口径不迁（见 skips）'; return plan; }
  const edit = planImport(src, rel);
  if (edit !== null) edits.push(edit);
  plan.status = 'ok';
  plan.edits = edits;
  return plan;
}

/** 按位置从后往前应用编辑（互不重叠）。 */
export function applyEdits(text, edits) {
  const sorted = edits.slice().sort((a, b) => b.start - a.start);
  let out = text;
  let lastStart = out.length + 1;
  for (const edit of sorted) {
    if (edit.end > lastStart) throw new Error('编辑区间重叠：' + edit.start + '-' + edit.end);
    out = out.slice(0, edit.start) + edit.text + out.slice(edit.end);
    lastStart = edit.start;
  }
  return out;
}
