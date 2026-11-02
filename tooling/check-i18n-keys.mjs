#!/usr/bin/env node
/**
 * #1199 · key 残留门：已迁入词条层的件里，**不许再留文案字面**。
 *
 * 它守什么：清单里每一件已迁入词条层的源文件，其字符串字面量里不许再出现「该进词条表的文案」。
 * 残留一条就红，并逐条点名「文件:行 + 那句话」。
 *
 * 口径（语言列，取自 tooling/i18n-langs.mjs 的 LANG_REGISTERS，本门不各写一套）：
 *   中文列（基准语言 zh）：字面量里出现 CJK（\u4e00-\u9fff）＝残留；
 *   英文列（en）：不按「出现拉丁字母」判（英文本来就是这样），只判「多词句子」（≥3 段成词、含空格）＝残留。
 * 豁免三条（缺一即误判，逐条都有机器判据）：
 *   ① 注释行里的中文不算（注释是给读代码的人看的，不上屏）；
 *   ② 命令关键字冻结（`bill.record.add` 这类 key 串、`--params`／`--html` 这类开关、'base-entries' 这类模块名）；
 *   ③ 范围清单 allowlist 里的显式豁免（逐条带 why：用户数据位／派生件／错误码这类本就不该进词条的位）。
 *
 * 不许空转绿（#1199 票面硬要求）：范围 0 件时**显式**印
 *   EMPTY-SCOPE 范围 0 件：扫描面为空——缩面＝放宽，不许空转当绿（先登记范围清单）
 * 照 tooling/check-base-floor.mjs:22／:139 的先例；空范围 exit 0（起步必须绿），但读数看得见。
 *
 * 用法：
 *   node tooling/check-i18n-keys.mjs              # 门禁口径
 *   node tooling/check-i18n-keys.mjs --list        # 只列抽到的字面量与判读，不判红
 *   node tooling/check-i18n-keys.mjs --selftest    # 变异自证：塞一句残留必红、删回去必绿
 *   node tooling/check-i18n-keys.mjs --scope <文件> --root <目录>   # 夹具／变异入口
 * 末行固定：RESULT: files=<n> literals=<n> residue=<n>
 * 依赖：零第三方；只读，不写任何文件。
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { LANGUAGES, DEFAULT_LANGUAGE, EMPTY_SCOPE_VERDICT, registerOf } from './i18n-langs.mjs';
import { loadScope, importsEntries, extractKeys } from './check-i18n-entries.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const DEFAULT_SCOPE = join(HERE, 'i18n-scope.json');

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : dflt;
};
const LIST = argv.includes('--list');
const SELFTEST = argv.includes('--selftest');
const HINTS = argv.includes('--hints');
const SCOPE_PATH = flag('--scope', DEFAULT_SCOPE);
const ROOT_DIR = flag('--root', ROOT);

/** 命令关键字与模块名：冻结不译的那些串（抽出来但不算残留）。 */
const FROZEN = [
  /^[a-z][a-z0-9-]*(\.[a-z0-9-]+)+$/,          // 命令 key：bill.record.add／calorie.view.home
  /^--[a-z][a-z0-9-]*$/,                        // 开关：--params／--html／--lang
  /^[a-z][a-z0-9-]*$/,                          // 单词标识：base-entries／skill-bill／en／zh
  /^[A-Z][A-Z0-9_]*$/,                          // 常量名
  /^[\w./@-]+$/,                                // 路径／包名
];

/** SQL 语句（#1220）：大写关键字开头、以参数占位符结尾的串是数据库代码，不是给读者看的话。
 *  只在**非基准语言**列生效（中文列照旧严格判 CJK；SQL 里不会有中文可见文案）。
 *  判据只看字面形状（大写 SQL 关键字），不按具体文案放行；--selftest 钉住「SQL 放行、普通句子照红」。 */
const SQL_HEAD = /^(?:SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|PRAGMA|WITH|REPLACE)\b/;

/** 把源码切成「非注释的字面量」：返回 [{line, text, kind}]。kind ∈ 'str'|'tpl'。
 *  注释整段跳过（豁免①的机器判据：不看注释里的字面量）。 */
export function literalsOf(source) {
  const out = [];
  let i = 0;
  let line = 1;
  const n = source.length;
  const push = (text, kind, ln) => out.push({ line: ln, text, kind });
  const lineAt = (upto) => { let c = 1; for (let k = 0; k < upto; k += 1) if (source[k] === '\n') c += 1; return c; };
  while (i < n) {
    const c = source[i];
    if (c === '\n') { line += 1; i += 1; continue; }
    if (c === '/' && source[i + 1] === '/') { while (i < n && source[i] !== '\n') i += 1; continue; }
    if (c === '/' && source[i + 1] === '*') { i += 2; while (i < n && !(source[i] === '*' && source[i + 1] === '/')) { if (source[i] === '\n') line += 1; i += 1; } i += 2; continue; }
    if (c === '\'' || c === '\"' || c === '`') {
      const q = c;
      const startLine = line;
      let j = i + 1;
      let buf = '';
      while (j < n) {
        const d = source[j];
        if (d === '\\') { buf += source[j + 1] === undefined ? '' : source[j + 1]; j += 2; continue; }
        if (d === q) break;
        if (d === '\n') { line += 1; buf += '\n'; j += 1; continue; }
        buf += d;
        j += 1;
      }
      push(buf, q === '`' ? 'tpl' : 'str', startLine);
      i = j + 1;
      continue;
    }
    i += 1;
  }
  void lineAt;
  return out;
}

/** 冻结串判据（豁免②）。 */
export function isFrozen(text) {
  const t = String(text).trim();
  if (t === '') return true;
  return FROZEN.some((re) => re.test(t));
}

/** 单条字面量在某个语言列下算不算残留。 */
/** 单条字面量在某个语言列下算不算残留。
 *
 *  三条豁免（都是「这一位本就不该进词条」的机器判据，不是放宽）：
 *   ① 代码片段：含 `<` 或 `>` 的串是 HTML／CSS 片段（class／属性／标签），不是给读者看的话；
 *   ② 开发者报文：含 `：`（全角冒号）或「必须是」的串是 `badInput()` 那种抛给开发者的校验语，不上屏；
 *   ③ 冻结串（命令关键字／开关／模块名／常量名），见 isFrozen。
 *  余下才是「该进词条表的用户可见文案」。 */
/** 开发者报文的字面量集合：`badInput(...)`／`throw new Error(...)` 这类**抛给开发者**的串。
 *
 *  为什么按调用点判而不按字面（#1199 评审返修）：按中文字面子串放行＝「把具体文案当判据」，
 *  而「必填」这种片段正是**插值句的一段**（`truthy(req,'…') + ' 必填…'`），不是完整文案；
 *  按调用点豁免才判得准：谁也别想在用户可见文案里蹭这个豁免，除非它真被当错误报文抛出去。 */
export function devMessageTexts(source) {
  const out = new Set();
  const CALL = /\b(?:badInput|assertPlainObject|assertActionId|assertDate|assertShape)\s*\(|\bthrow\s+new\s+\w*Error\s*\(/g;
  let m;
  while ((m = CALL.exec(source)) !== null) {
    let i = CALL.lastIndex;
    let depth = 1;
    const start = i;
    while (i < source.length && depth > 0) {
      const c = source[i];
      if (c === "\'" || c === '"' || c === '`') {
        const q = c;
        i += 1;
        while (i < source.length && source[i] !== q) { if (source[i] === '\\') i += 1; i += 1; }
        i += 1;
        continue;
      }
      if (c === '(') depth += 1;
      else if (c === ')') depth -= 1;
      i += 1;
    }
    const chunk = source.slice(start, Math.max(start, i - 1));
    const STR = /['"`]([^'"`]*(?:\.[^'"`]*)*)['"`]/g;
    let s;
    while ((s = STR.exec(chunk)) !== null) out.add(s[1]);
  }
  return out;
}

/** 单条字面量在某个语言列下算不算残留。
 *
 *  豁免（都是「这一位本就不该进词条」的机器判据，不是放宽）：
 *   ① 代码片段：含 `<`／`>` 的串是 HTML／CSS 片段（标签／class／属性），不是给读者看的话；
 *   ② 开发者报文：含全角冒号或「必须是」的串是 `badInput()` 抛给开发者的校验语，不上屏；
 *   ③ 标识符串：整串就是点分／连字符标识（命令键、字段路径）——是键不是话；
 *   ④ 冻结串（命令关键字／开关／模块名／常量名），见 isFrozen。
 *  余下才是「该进词条表的用户可见文案」。
 *
 *  两门语言的判据不同（口径取自 tooling/i18n-langs.mjs 的名册，本件不各写一套）：
 *   基准语言 zh：出现 CJK 即残留；
 *   非基准语言：不判「出现拉丁字母」（本语言本来如此），只判**成句的散文**——
 *     首词小写开头 ＋ ≥4 个词 ＋ 出现功能词（the／a／an／to／of／and／or／is／are／for／with／in／on），
 *     或出现句末标点（. ! ?）且 ≥3 个词。这样「代码形状的英文」（键、字段路径、标识）不误报，
 *     真句子的英文照样红。 */
/** 单条字面量在某个语言列下算不算残留。
 *
 *  豁免（每条都有机器判据，**不按文案字面放行**）：
 *   ① 开发者报文：这一条正是 `badInput()`／`throw new Error()` 的实参（由 `devMessageTexts(source)` 现算）；
 *   ② 代码片段：含 `<`／`>` 的串是 HTML／CSS 片段，不是给读者看的话；
 *   ③ 标识符串：整串就是点分／连字符标识（命令键、字段路径）——是键不是话；
 *   ④ 冻结串（命令关键字／开关／模块名／常量名），见 isFrozen。
 *  余下才是「该进词条表的用户可见文案」。
 *
 *  两门语言的判据（名册取自 tooling/i18n-langs.mjs，本件不各写一套）：
 *   基准语言 zh：出现 CJK 即残留；
 *   非基准语言：只判**成句的散文**——首词小写 ＋ ≥4 词 ＋ 出现功能词，或句末标点 ＋ ≥3 词；
 *     这样「代码形状的英文」（键、字段路径、标识）不误报，真句子的英文照样红。
 *   ⑤ 内联脚本行（#1205）：非基准语言列里，**同时出现花括号与分号／等号**（或箭头函数）的串是随页内联的
 *      JS 代码，不是给读者看的句子——中文列照旧严格判 CJK（代码里的中文也得上屏，不能漏）；英文列放行，
 *      否则 var on = 0; 这种行会被功能词、逐词判据误报成散文。
 *   ⑥ SQL 语句（#1220）：大写关键字开头（SELECT／INSERT／UPDATE／DELETE…）的串是数据库代码，英文列放行；
 *      判据只看形状，普通英文句子（哪怕以 Update 开头）照旧判红。
 *   注：`/\s+/` 那一处曾误写成 `/s+/`（少一个反斜杠）⇒ 英文列一句都判不出来而门全绿；
 *   本件 `--selftest` 因此同时钉一句中文与一句英文的变异／还原两行。 */
export function residueOf(text, lang, devTexts = new Set()) {
  const t = String(text);
  const reg = registerOf(lang);
  if (devTexts.has(t)) return null;
  if (isFrozen(t)) return null;
  if (t.includes(String.fromCharCode(60)) || t.includes(String.fromCharCode(62))) return null;
  if (/^[A-Za-z][A-Za-z0-9_.-]*$/.test(t.trim())) return null;
  if (lang === DEFAULT_LANGUAGE) {
    return new RegExp(reg.scriptRe).test(t) ? "含中文（该进 " + lang + " 词条表）" : null;
  }
  // ⑤ 内联脚本行（#1205）：花括号 ＋ 分号/等号，或箭头函数——代码，不是句子。中文列不走这条分支。
  if ((/[{}]/.test(t) && /[;=]/.test(t)) || /=>/.test(t)) return null;
  // ⑥ SQL 语句（#1220）：大写关键字开头的是数据库代码，不是句子（中文列已在上面的分支判过）。
  if (SQL_HEAD.test(t.trim())) return null;
  const words = t.trim().split(/\s+/).filter((w) => /[A-Za-z]/.test(w));
  if (words.length < 3) return null;
  const startsLower = /^[a-z]/.test(words[0]);
  const FUNC = new Set(["the", "a", "an", "to", "of", "and", "or", "is", "are", "for", "with", "in", "on"]);
  const hasFunc = words.some((w) => FUNC.has(w.toLowerCase().replace(/[^a-z]/g, "")));
  const endsSentence = /[.!?]['"]?$/.test(t.trim());
  const prose = (startsLower && words.length >= 4 && hasFunc) || (endsSentence && words.length >= 3);
  return prose ? "多词句子（该进 " + lang + " 词条表）" : null;
}

/** 用户可见的属性名（这些属性值会被读屏／悬停看到，属可见文案；class／data-* 不算）。 */
const VISIBLE_ATTR = /^(?:aria-label|aria-description|title|placeholder|alt|content)$/i;

/** 一段含 HTML 标签的字面量里，把标签剥掉、只留可见文本（含可见属性值），用来找「标签串里夹着的文案」。
 *  这是 hints 读数的判据（**不参与红绿**）：本门主判据对含 '<'／'>' 的字面量整条豁免，
 *  于是「结构串里夹一句中文」的迁移遗漏看不见——hints 把这批候选逐条点出来供人判定。 */
export function visibleTextOf(literal) {
  let t = String(literal);
  t = t.replace(/<!--[\s\S]*?-->/g, ' ');
  t = t.replace(/\/\*[\s\S]*?\*\//g, ' ');
  t = t.replace(/<([a-zA-Z][^>]*?)>/g, (_m, inner) => {
    const vals = [];
    for (const am of inner.matchAll(/([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      if (VISIBLE_ATTR.test(am[1])) vals.push(am[2] !== undefined ? am[2] : am[3]);
    }
    return ' ' + vals.join(' ') + ' ';
  });
  return t.replace(/\s+/g, ' ').trim();
}

/** hints 判据：含标签的字面量里是否还残留中文可见文本（主判据豁免①漏掉的那一类）。
 *
 *  三道过滤，都是「这不是漏迁」的机器判据：
 *   ① 不含标签 → 归主判据管，不算 hint；
 *   ② 像内联代码／文档注释的串（含模板插值标记、箭头函数、function／return／throw 等）→ 不是可见文本；
 *   ③ 剥掉标签与注释后没有中文 → 没有可见中文。
 *  命中即「疑似漏迁」，**只报数不判红**：这一类的可见性需人判定（契约属性、注释、数据位各有例外），
 *  把它变成红会逼着人往 allowlist 里塞假豁免，反而把门弄松。 */
export function htmlHintOf(text, devTexts = new Set(), allow = new Set()) {
  const t = String(text);
  if (!t.includes('<') && !t.includes('>')) return null;
  if (devTexts.has(t) || allow.has(t)) return null;
  if (/\$\{|=>|\b(?:function|return|throw|const|let|var|typeof|import|export)\b/.test(t)) return null;
  const vis = visibleTextOf(t);
  if (!vis) return null;
  if (!/[\u4e00-\u9fff]/.test(vis)) return null;
  return vis.slice(0, 120);
}

/** 主判据：返回 {files, literals, residue:[{file,line,lang,why,text}], blind:[{file,why}]}。 */
export function audit(scope, root = ROOT_DIR) {
  const allow = new Set(scope.allowlist || []);
  const files = [];
  const blind = [];
  const residue = [];
  let literalCount = 0;
  for (const rel of scope.files) {
    const p = join(root, rel);
    if (!existsSync(p)) { blind.push({ file: rel, why: '清单里的件在盘上不存在（删了/改名了：显式更新清单）' }); continue; }
    const src = readFileSync(p, 'utf8');
    const devTexts = devMessageTexts(src);
    if (!importsEntries(src) || extractKeys(src).length === 0) {
      blind.push({ file: rel, why: '没迁完（没 import 词条层或抽不出 key）——先过缺词条门' });
      continue;
    }
    const lits = literalsOf(src);
    const found = [];
    for (const l of lits) {
      if (allow.has(l.text)) continue;
      for (const lang of LANGUAGES) {
        const why = residueOf(l.text, lang, devTexts);
        if (why) found.push({ file: rel, line: l.line, lang, why, text: l.text.slice(0, 80) });
      }
    }
    // 只有「读得动、没报失明」的件才计进读数（否则 files／literals 会把没迁完的件算成查过）。
    files.push({ file: rel, literals: lits.length });
    literalCount += lits.length;
    for (const x of found) residue.push(x);
  }
  return { files, literals: literalCount, residue, blind };
}

/** hints 读数：对已迁入的件再扫一遍「标签串里夹中文」的候选（只报数，不判红；见 htmlHintOf 注释）。 */
export function hintsOf(scope, root = ROOT_DIR) {
  const allow = new Set(scope.allowlist || []);
  const out = [];
  let files = 0;
  for (const rel of scope.files) {
    const p = join(root, rel);
    if (!existsSync(p)) continue;
    const src = readFileSync(p, 'utf8');
    if (!importsEntries(src) || extractKeys(src).length === 0) continue;
    const devTexts = devMessageTexts(src);
    files += 1;
    for (const l of literalsOf(src)) {
      const vis = htmlHintOf(l.text, devTexts, allow);
      if (vis !== null) out.push({ file: rel, line: l.line, text: vis });
    }
  }
  return { files, hints: out };
}

function main() {
  let scope;
  try { scope = loadScope(); } catch (e) { console.error('FAIL: ' + e.message); process.exit(2); }
  if (!Array.isArray(scope.allowlist)) { console.error('FAIL: 范围清单缺 allowlist 数组：' + SCOPE_PATH); process.exit(2); }
  if (SELFTEST) return selftest(scope);

  const r = audit(scope);
  const empty = scope.files.length === 0;
  console.log('# #1199 key 残留门（语言列：' + LANGUAGES.join('／') + '；中文列判 CJK、英文列判多词句）');
  console.log('SCOPE: ' + SCOPE_PATH + ' files=' + scope.files.length + ' allowlist=' + scope.allowlist.length);
  if (empty) console.log('EMPTY-SCOPE ' + EMPTY_SCOPE_VERDICT + '（清单：' + SCOPE_PATH + '）');
  if (LIST) {
    for (const f of r.files) console.log('FILE ' + f.file + ' literals=' + f.literals);
    for (const x of r.residue) console.log('RESIDUE ' + x.file + ':' + x.line + ' [' + x.lang + '] ' + x.why + ' ← ' + JSON.stringify(x.text));
    console.log('RESULT: files=' + r.files.length + ' literals=' + r.literals + ' residue=' + r.residue.length);
    return;
  }
  if (HINTS) {
    const h = hintsOf(scope);
    for (const x of h.hints) console.error('HINT ' + x.file + ':' + x.line + ' ← ' + JSON.stringify(x.text));
    console.log('HINTS: files=' + h.files + ' candidates=' + h.hints.length + '（只报数不判红：标签串里夹中文的疑似漏迁，逐条人判）');
  }
  let bad = 0;
  for (const b of r.blind) { console.error('RED 抽不出/没迁完：' + b.file + ' → ' + b.why); bad += 1; }
  for (const x of r.residue) {
    console.error('RED 文案残留：' + x.file + ':' + x.line + ' [' + x.lang + '] ' + x.why + ' ← ' + JSON.stringify(x.text));
    bad += 1;
  }
  console.log('RESULT: files=' + r.files.length + ' literals=' + r.literals + ' residue=' + r.residue.length);
  if (bad > 0) {
    console.error('FAIL: key 残留门未过（' + bad + ' 处；残留＝迁入漏改，把那句话搬进词条表，不许往 allowlist 里塞）');
    process.exit(1);
  }
  console.log(empty
    ? 'PASS: 范围 0 件（显式报数：这一轮什么都没查，不是「查过没问题」）'
    : 'PASS: ' + r.files.length + ' 件已迁入文件无文案残留（抽检字面量 ' + r.literals + ' 条）');
}

function selftest(scope) {
  const bad = [];
  const want = (cond, msg) => { if (!cond) bad.push(msg); };
  const emptyAudit = audit({ ...scope, files: [] });
  want(emptyAudit.files.length === 0 && emptyAudit.residue.length === 0, '空范围必须零残留');
  want(EMPTY_SCOPE_VERDICT.includes('范围 0 件'), '空范围判词必须显式说「范围 0 件」');
  const tmp = mkdtempSync(join(tmpdir(), 't1199-keys-'));
  try {
    const srcDir = join(tmp, 'packages', 'base-entries', 'src', 'entries');
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(srcDir, 'zh.json'), JSON.stringify({ 'demo.title': '标题', 'demo.clean': '干净' }), 'utf8');
    writeFileSync(join(srcDir, 'en.json'), JSON.stringify({ 'demo.title': 'Title', 'demo.clean': 'Clean' }), 'utf8');
    const fixture = join(tmp, 'demo.ts');
    // 注释里的中文（豁免①）＋ 命令关键字（豁免②）＋ 一句真残留（③ 该红）
    writeFileSync(fixture, [
      "import { e } from 'base-entries';",
      '// 这一行注释里有中文，不算残留',
      "export const key = 'bill.record.add';",
      "export const a = e('demo.title');",
      "export const b = e('demo.clean');",
      "export const leak = '这是硬编码的中文文案';\n",
    ].join('\n'), 'utf8');
    const one = audit({ files: ['demo.ts'], allowlist: [] }, tmp);
    want(one.files.length === 1, '夹具应抽到 1 件（实得 ' + one.files.length + '）');
    want(one.residue.length === 1, '应恰好 1 处残留（实得 ' + one.residue.length + '：' + JSON.stringify(one.residue.map((x) => x.text)) + '）');
    want(one.residue[0].line === 6, '残留行号应为 6（实得 ' + (one.residue[0] || {}).line + '）');
    console.log('SELFTEST 变异读数：files=' + one.files.length + ' literals=' + one.literals + ' residue=' + one.residue.length
      + '（' + one.residue.map((x) => x.lang + '@L' + x.line).join(',') + '）');
    // 还原：把残留那句搬进词条表
    writeFileSync(fixture, [
      "import { e } from 'base-entries';",
      '// 这一行注释里有中文，不算残留',
      "export const key = 'bill.record.add';",
      "export const a = e('demo.title');",
      "export const b = e('demo.clean');",
      "export const leak = e('demo.leak');\n",
    ].join('\n'), 'utf8');
    const two = audit({ files: ['demo.ts'], allowlist: [] }, tmp);
    want(two.residue.length === 0, '搬进词条表后必须零残留（实得 ' + two.residue.length + '）');
    console.log('SELFTEST 还原读数：residue=' + two.residue.length);
    // ②b 英文列同样要能红（`/\s+/` 曾误写成 `/s+/`＝英文半门全失效，这里把它钉住）：
    //    夹具件里放一句真英文用户文案，英文列必须报「多词句子」。
    writeFileSync(fixture, [
      "import { e } from 'base-entries';",
      "export const a = e('demo.title');",
      "export const leakEn = 'Save the record to continue.';\n",
    ].join('\n'), 'utf8');
    const twoEn = audit({ files: ['demo.ts'], allowlist: [] }, tmp);
    want(twoEn.residue.some((x) => x.lang === 'en'), '英文用户文案必须被英文列判红（实得 ' + JSON.stringify(twoEn.residue.map((x) => x.lang + ':' + x.text)) + '）');
    console.log('SELFTEST 英文列读数：residue=' + twoEn.residue.length + '（' + twoEn.residue.map((x) => x.lang).join(',') + '）');
    // ②c 开发者报文按**调用点**豁免：同一句当 `badInput()` 实参不红、当普通文案要红。
    writeFileSync(fixture, [
      "import { e } from 'base-entries';",
      "export const a = e('demo.title');",
      "export const guard = badInput('demo: 必须给个值');\n",
    ].join('\n'), 'utf8');
    const threeDev = audit({ files: ['demo.ts'], allowlist: [] }, tmp);
    want(!threeDev.residue.some((x) => x.text.includes('必须给个值')), 'badInput() 实参（开发者报文）不该算残留');
    writeFileSync(fixture, [
      "import { e } from 'base-entries';",
      "export const a = e('demo.title');",
      "export const copy = 'demo: 必须给个值';\n",
    ].join('\n'), 'utf8');
    const fourCopy = audit({ files: ['demo.ts'], allowlist: [] }, tmp);
    want(fourCopy.residue.some((x) => x.text.includes('必须给个值')), '同一句当普通文案必须判红（豁免不许按字面蹭）');
    console.log('SELFTEST 开发者报文豁免读数：实参 residue=' + threeDev.residue.length + '／普通文案 residue=' + fourCopy.residue.length);
    // 清场＋豁免用例：夹具换成「一句被放行的真文案」，放行后必须零残留。
    writeFileSync(fixture, [
      "import { e } from 'base-entries';",
      "export const a = e('demo.title');",
      "export const allowed = '这句被显式放行';",
      "",
    ].join(String.fromCharCode(10)), 'utf8');
    // 豁免：allowlist 里显式放行的那一句不算残留
    const threeAllow = audit({ files: ['demo.ts'], allowlist: ['这句被显式放行'] }, tmp);
    want(threeAllow.residue.length === 0, '放行后仍应零残留（实得 ' + threeAllow.residue.length + '）');
    // 失明：没迁完的件必须报 blind，不许当绿
    writeFileSync(join(tmp, 'raw.ts'), "export const x = '中文但没有迁';", 'utf8');
    const fourRaw = audit({ files: ['raw.ts'], allowlist: [] }, tmp);
    want(fourRaw.blind.length === 1 && fourRaw.residue.length === 0, '没迁完的件必须报 blind 而不是 residue');
    // ⑤ 内联脚本行（#1205）：随页内联的 JS 代码不是句子，英文列放行；同一行里的中文照旧判红。
    writeFileSync(fixture, [
      "import { e } from 'base-entries';",
      "export const a = e('demo.title');",
      "export const runtime = 'var on = 0; (C.slots || []).forEach(function(s){ if(s.opt) on++; });';",
    ].join(String.fromCharCode(10)), 'utf8');
    const codeOnly = audit({ files: ['demo.ts'], allowlist: [] }, tmp);
    want(codeOnly.residue.length === 0, '内联脚本行不带中文时英文列必须放行（实得 residue=' + codeOnly.residue.length + '）');
    writeFileSync(fixture, [
      "import { e } from 'base-entries';",
      "export const a = e('demo.title');",
      "export const mark = 'var c = \"未给\";';",
    ].join(String.fromCharCode(10)), 'utf8');
    const codeZh = audit({ files: ['demo.ts'], allowlist: [] }, tmp);
    want(codeZh.residue.some((x) => x.lang === 'zh'), '内联脚本行里的中文必须照旧判红（实得 ' + JSON.stringify(codeZh.residue.map((x) => x.lang)) + '）');
    want(!codeZh.residue.some((x) => x.lang === 'en'), '同一行英文列仍须放行（实得 ' + JSON.stringify(codeZh.residue.map((x) => x.lang)) + '）');
    console.log('SELFTEST 内联脚本行读数：无中文 residue=' + codeOnly.residue.length + '／含中文 residue=' + codeZh.residue.length);
    // ⑥ SQL 语句（#1220）：大写关键字开头的数据库代码不是文案，英文列放行；普通英文句子（哪怕以 Update 开头）照旧红。
    writeFileSync(fixture, [
      "import { e } from 'base-entries';",
      "export const a = e('demo.title');",
      "export const sql = db.prepare('SELECT count(*) AS c FROM item_locations WHERE location LIKE ?');",
    ].join(String.fromCharCode(10)), 'utf8');
    const sqlOnly = audit({ files: ['demo.ts'], allowlist: [] }, tmp);
    want(sqlOnly.residue.length === 0, 'SQL 语句必须放行（实得 ' + JSON.stringify(sqlOnly.residue.map((x) => x.lang + ':' + x.text)) + '）');
    writeFileSync(fixture, [
      "import { e } from 'base-entries';",
      "export const a = e('demo.title');",
      "export const leak2 = 'Update the record to continue.';",
    ].join(String.fromCharCode(10)), 'utf8');
    const notSql = audit({ files: ['demo.ts'], allowlist: [] }, tmp);
    want(notSql.residue.some((x) => x.lang === 'en'), '以 Update 开头的普通英文句子仍须判红（实得 ' + JSON.stringify(notSql.residue.map((x) => x.lang)) + '）');
    console.log('SELFTEST SQL 豁免读数：SQL residue=' + sqlOnly.residue.length + '／普通句子 residue=' + notSql.residue.length);
    // ⑪ 标签串里夹中文（主判据豁免①的盲区）：hints 必须点出来；剥不到可见中文／注释不算。
    writeFileSync(fixture, [
      "import { e } from 'base-entries';",
      "export const a = e('demo.title');",
      "export const cell = '<td class=\"x\">无标签</td>';",
    ].join(String.fromCharCode(10)), 'utf8');
    const hintOne = hintsOf({ files: ['demo.ts'], allowlist: [] }, tmp);
    want(hintOne.hints.length === 1 && hintOne.hints[0].text.includes('无标签'), '标签串里的中文必须进 hints（实得 ' + JSON.stringify(hintOne.hints) + '）');
    writeFileSync(fixture, [
      "import { e } from 'base-entries';",
      "export const a = e('demo.title');",
      "export const cell = '<td class=\"x\">' + e('demo.clean') + '</td>';",
    ].join(String.fromCharCode(10)), 'utf8');
    const hintMoved = hintsOf({ files: ['demo.ts'], allowlist: [] }, tmp);
    want(hintMoved.hints.length === 0, '搬进词条表后 hints 必须清零（实得 ' + hintMoved.hints.length + '）');
    writeFileSync(fixture, [
      "import { e } from 'base-entries';",
      "export const a = e('demo.title');",
      "export const style = '<style>/* 仅注释里的中文 */ .x{color:#fff}</style>';",
    ].join(String.fromCharCode(10)), 'utf8');
    const hintComment = hintsOf({ files: ['demo.ts'], allowlist: [] }, tmp);
    want(hintComment.hints.length === 0, '注释里的中文不算 hints（实得 ' + hintComment.hints.length + '）');
    console.log('SELFTEST 标签串 hints 读数：含中文 ' + hintOne.hints.length + '／搬走 ' + hintMoved.hints.length + '/／仅注释 ' + hintComment.hints.length);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  if (bad.length) { for (const b of bad) console.error('SELFTEST FAIL ' + b); process.exit(1); }
  console.log('SELFTEST: 空范围显式报数／注释豁免／命令关键字豁免／中文残留必红／英文残留必红／开发者报文按调用点豁免／搬走必绿／没迁完报失明／内联脚本行豁免／SQL 语句豁免／标签串 hints —— 十一条自证 OK');
}

/** 入口守卫（照 tooling/i18n-langs.mjs／skill-html-snapshot.mjs 的先例）：本件被别处 import 时**不跑** CLI，
 *  免得一红就把 import 它的那道门与测试一起吃掉。 */
const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
