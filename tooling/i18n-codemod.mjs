#!/usr/bin/env node
/**
 * #1233 · 整仓文本抽取改写器 v1：扫描分类标红（只读）。
 *
 * v1 只做三件事：抽取全部中文字面量、按位置归位、拼接串标红产清单。
 * v1 不改 packages/ 一行（整句化写模式待 #1200 词条接口冻结后接，
 * 见 ticket 进度里的依赖发现；贸然手写 shim 会抢试点 #1202 的载体裁决）。
 *
 * 读数：
 *   node tooling/i18n-codemod.mjs --scan      # 全仓扫，落台账＋红单（只写 tooling/ 两份 JSON）
 *   node tooling/i18n-codemod.mjs --selftest  # 自证（纯内存夹具，零落盘）
 *
 * 只读证明：scan 路径除两份 JSON 落盘外无任何写操作
 * （grep writeFileSync 本件即验）；跑法文档见 docs/agents/多语言-位置四分规则.md。
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const TOOL_VERSION = '1.0.0';
export const TICKET = '#1233';
export const SCOPE = 'packages/*/src/**/*.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEDGER_PATH = join(root, 'tooling', 'i18n-codemod.ledger.json');
const REDLIST_PATH = join(root, 'tooling', 'i18n-codemod.redlist.json');

const CJK_RE = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u309F\u30A0-\u30FF\uFF00-\uFFEF]/;
const GENERATED_NAME_RE = /\.generated\.ts$|\/cli\/(registry|keys)\.ts$|helpAssets\.ts$|sceneData\.ts$|helpShell\.ts$/;
const GENERATED_HEAD_RE = /机器生成|禁手改|请勿手改|GENERATED|do not edit|auto-generated/i;
const TRUTH_HEAD_RE = /唯一事实源|事实源|逐字落地/i;
const STEM_LINE_RE = /_STEM\b|_DIR_|DIR_|_PATH\b|\bPATH\b|\bEXT\b|htmlDir|helpDir|fileStem|lookupFileStem/;
const KNOWN_STEMS = ['饼干记账_HELP', '卡路里_HELP', '卡路里_照片HELP', '私家大厨_HELP', '居家管家_HELP', '备忘录_HELP', '作息管家_HELP'];
const COMMAND_KEY_RE = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/;
const VERSION_RE = /^v?\d+(\.\d+)+$/;
const PATHY_RE = /[\/\\]|\.html?$|\.json$|\.db$|_html/;
const STRIP_STRINGS_RE = /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g;
const UNIT1 = '元块个次天日周月年时分秒卡克毫斤公升％%人条张页步组份道杯碗瓶包袋盒箱辆米厘档级星点圈套把场轮版代型款色号楼层名位项类种';
const UNIT2 = ['千卡', '毫克', '公斤', '千克', '毫升', '厘米', '千米'];

export const CLASSES = {
  copy: '文案候选（整句化待#1200）',
  data: '数据位候选（数据常量化）',
  ident: '标识符位·不动',
  cmdkey: '命令关键字·冻结不动',
  derived: '派生件·走生成器不动',
  payload: '事实源载荷·整体迁移不动',
  concat: '拼接串·只标红不改',
};

export function tokenize(text) {
  const lits = [];
  const n = text.length;
  let i = 0;
  let line = 1;
  while (i < n) {
    const ch = text[i];
    const nx = text[i + 1];
    if (ch === '/' && nx === '/') { while (i < n && text[i] !== '\n') i++; continue; }
    if (ch === '/' && nx === '*') {
      i += 2;
      while (i < n && !(text[i] === '*' && text[i + 1] === '/')) { if (text[i] === '\n') line++; i++; }
      i += 2; continue;
    }
    if (ch === "'" || ch === '"') {
      const q = ch; const startLine = line; let j = i + 1; let val = '';
      while (j < n && text[j] !== q && text[j] !== '\n') {
        if (text[j] === '\\' && j + 1 < n) { val += text[j + 1]; j += 2; continue; }
        val += text[j]; j++;
      }
      if (j < n && text[j] === q) { lits.push({ kind: 'str', value: val, line: startLine }); i = j + 1; continue; }
      i++; continue;
    }
    if (ch === `\``) {
      const startLine = line; let j = i + 1; let val = ''; let hasExpr = false; let depth = 0;
      while (j < n) {
        const c = text[j];
        if (c === '\\' && j + 1 < n) { val += text[j + 1]; j += 2; continue; }
        if (c === `\`` && depth === 0) break;
        if (c === '$' && text[j + 1] === '{') { hasExpr = true; depth++; j += 2; continue; }
        if (c === '{') { depth++; val += c; j++; continue; }
        if (c === '}') { if (depth > 0) depth--; val += c; j++; continue; }
        if (c === '\n') line++;
        val += c; j++;
      }
      lits.push({ kind: 'tpl', value: val, line: startLine, hasExpr });
      i = (j < n) ? j + 1 : j; continue;
    }
    if (ch === '\n') line++;
    i++;
  }
  return lits;
}

export function isDataValue(v) {
  if (!/[0-9]/.test(v)) return false;
  const t = v.replace(/[0-9\s.,，．％%°℃×÷＋－\-\/\\:：;；、·'"…—–]/g, '');
  if (t === '') return true;
  if (t.length <= 2 && (UNIT1.indexOf(t) !== -1 || UNIT2.indexOf(t) !== -1)) return true;
  return false;
}

function stripStrings(line) { return line.replace(STRIP_STRINGS_RE, '～'); }

function plusOn(stripped) {
  const s = stripped.replace(/\/\/.*$/, '');
  if (/\+=\s*～/.test(s)) return true;
  return /(～|\]|\))\s*\+\s*\S|\S\s*\+\s*(～|\[|\()/.test(s);
}

export function classify(rel, head5, lit, lineText, prevText, nextText) {
  if (lit.hasExpr) return { cls: 'concat', reason: '模板插值' };
  if (GENERATED_NAME_RE.test(rel) || GENERATED_HEAD_RE.test(head5)) return { cls: 'derived', reason: '派生件走生成器' };
  if (TRUTH_HEAD_RE.test(head5)) return { cls: 'payload', reason: '事实源资产整体迁移' };
  const v = lit.value;
  if (COMMAND_KEY_RE.test(v)) return { cls: 'cmdkey', reason: '命令关键字冻结' };
  if (VERSION_RE.test(v)) return { cls: 'ident', reason: '版本号' };
  if (PATHY_RE.test(v)) return { cls: 'ident', reason: '路径或文件名' };
  if (KNOWN_STEMS.indexOf(v) !== -1) return { cls: 'ident', reason: 'HELP文件名主体冻结' };
  if (STEM_LINE_RE.test(lineText)) return { cls: 'ident', reason: '落点或目录或主体行' };
  if (plusOn(stripStrings(lineText))) return { cls: 'concat', reason: '加号拼接（同行）' };
  if (prevText && /\+\s*(\/\/.*)?$/.test(stripStrings(prevText))) return { cls: 'concat', reason: '加号拼接（跨行上）' };
  if (nextText && /^\s*\+/.test(stripStrings(nextText))) return { cls: 'concat', reason: '加号拼接（跨行下）' };
  if (isDataValue(v)) return { cls: 'data', reason: '数据位候选' };
  return { cls: 'copy', reason: '文案候选' };
}

function walk(dir, out) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { walk(p, out); continue; }
    if (e.isFile() && e.name.endsWith('.ts')) out.push(p);
  }
  return out;
}

export function collectFiles() {
  const pkgs = join(root, 'packages');
  const files = [];
  for (const e of readdirSync(pkgs, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const src = join(pkgs, e.name, 'src');
    try { if (statSync(src).isDirectory()) walk(src, files); } catch { continue; }
  }
  return files.map((p) => relative(root, p).replace(/\\/g, '/')).sort();
}

export function scanFile(rel) {
  const text = readFileSync(join(root, rel), 'utf8').replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const head5 = lines.slice(0, 5).join('\n');
  const counts = { copy: 0, data: 0, ident: 0, cmdkey: 0, derived: 0, payload: 0, concat: 0 };
  const reds = [];
  let literals = 0;
  for (const lit of tokenize(text)) {
    if (!CJK_RE.test(lit.value)) continue;
    literals++;
    const lineText = lines[lit.line - 1] || '';
    const prevText = lines[lit.line - 2] || '';
    const nextText = lines[lit.line] || '';
    const r = classify(rel, head5, lit, lineText, prevText, nextText);
    counts[r.cls]++;
    if (r.cls === 'concat') {
      reds.push({ path: rel, line: lit.line, reason: r.reason, snippet: lineText.trim().slice(0, 120) });
    }
  }
  return { rel, literals, counts, reds };
}

export function scanAll() {
  const files = collectFiles();
  const rows = [];
  const totals = { files: files.length, literals: 0, byClass: { copy: 0, data: 0, ident: 0, cmdkey: 0, derived: 0, payload: 0, concat: 0 } };
  const redItems = [];
  for (const rel of files) {
    const r = scanFile(rel);
    if (r.literals === 0) continue;
    totals.literals += r.literals;
    for (const k of Object.keys(totals.byClass)) totals.byClass[k] += r.counts[k];
    rows.push({ path: rel, literals: r.literals, byClass: r.counts });
    for (const red of r.reds) redItems.push(red);
  }
  redItems.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : a.line - b.line));
  return {
    ledger: { tool: 'tooling/i18n-codemod.mjs', version: TOOL_VERSION, ticket: TICKET, scope: SCOPE, classes: CLASSES, totals, files: rows },
    redlist: { tool: 'tooling/i18n-codemod.mjs', version: TOOL_VERSION, ticket: TICKET, count: redItems.length, items: redItems },
  };
}

export function selftest() {
  const fails = [];
  const eq = (name, got, want) => { if (got !== want) fails.push(name + '：得 ' + got + '，想 ' + want); };
  const t1 = tokenize('const a = 1; // 注释中文\nconst b = 2;');
  eq('注释不收', String(t1.length), '0');
  const t2 = tokenize("const s = '保存成功';");
  eq('单引抽取', t2.length + ':' + t2[0].value, "1:保存成功");
  const t3 = tokenize('const s = `共 ${n} 天`;');
  eq('模板插值标记', String(t3[0].hasExpr), 'true');
  const c = (rel, head, lit, line, prev, next) => classify(rel, head || '', lit, line || '', prev || '', next || '').cls;
  eq('文案候选', c('packages/skill-bill/src/help/helpFile.ts', '', { value: '保存成功' }, "const t = '保存成功';"), 'copy');
  eq('模板拼接', c('f', '', { value: '共  天', hasExpr: true }, ''), 'concat');
  eq('加号拼接', c('f', '', { value: '合 ' }, "return '合 ' + saved + ' 折';"), 'concat');
  eq('加号拼接右', c('f', '', { value: ' 折' }, "return '合 ' + saved + ' 折';"), 'concat');
  eq('跨行拼接', c('f', '', { value: '后缀' }, "  '后缀';", 'const s = prefix +'), 'concat');
  eq('伪拼接不红', c('f', '', { value: '标题' }, "const o = { t: '标题', n: x + 1 };"), 'copy');
  eq('复合赋值拼接', c('f', '', { value: '后缀' }, "s += '后缀';"), 'concat');
  eq('注释加号不红', c('f', '', { value: '标题' }, "const t = '标题'; // a + b"), 'copy');
  eq('TEXT后缀不触发', c('f', '', { value: '实付' }, "export const FOO_TEXT = '实付';"), 'copy');
  eq('NEXT不触发EXT', c('f', '', { value: '下一步' }, "export const NEXT_STEP = '下一步';"), 'copy');
  eq('STEM下划线触发', c('f', '', { value: '私家大厨_HELP' }, "export const HELP_FILE_STEM = '私家大厨_HELP';"), 'ident');
  eq('无拼接', c('f', '', { value: '标题' }, "const t = '标题';"), 'copy');
  eq('命令冻结', c('f', '', { value: 'calorie.help.center' }, ''), 'cmdkey');
  eq('版本不动', c('f', '', { value: '2.0' }, ''), 'ident');
  eq('STEM不动', c('f', '', { value: '饼干记账_HELP' }, 'export const HELP_FILE_STEM = 1;'), 'ident');
  eq('小写dir不触发落点', c('f', '', { value: '中文' }, 'const dir = getDir(); // 中文'), 'copy');
  eq('派生件', c('packages/x/src/cli/registry.ts', '', { value: '标题' }, ''), 'derived');
  eq('生成头派生', c('f', '/* 机器生成，禁手改 */', { value: '标题' }, ''), 'derived');
  eq('事实源', c('f', '/* 唯一事实源，逐字落地 */', { value: '标题' }, ''), 'payload');
  eq('数据明确', c('f', '', { value: '100元' }, "const u = '100元';"), 'data');
  eq('裸单位不断数据', c('f', '', { value: '元' }, "const u = '元';"), 'copy');
  eq('数字数据', c('f', '', { value: '100' }, ''), 'data');
  eq('路径不动', c('f', '', { value: 'calorie_html' }, ''), 'ident');
  const s1 = JSON.stringify(scanTextFixture());
  const s2 = JSON.stringify(scanTextFixture());
  eq('行列式', s1 === s2 ? 'same' : 'diff', 'same');
  return fails;
}

function scanTextFixture() {
  const text = "const a = '标题';\nconst b = '合 ' + x;\n";
  const out = [];
  for (const lit of tokenize(text)) {
    if (!CJK_RE.test(lit.value)) continue;
    out.push(classify('f', '', lit, text.split('\n')[lit.line - 1], '', ''));
  }
  return out;
}

const invoked = (process.argv[1] || '').replace(/\\/g, '/').endsWith('tooling/i18n-codemod.mjs');
if (invoked) {
  const arg = process.argv[2] || '--scan';
  if (arg === '--selftest') {
    const fails = selftest();
    if (fails.length > 0) { for (const f of fails) console.error('RED ' + f); process.exit(1); }
    console.log('SELFTEST: 全部断言绿');
  } else if (arg === '--scan') {
    const { ledger, redlist } = scanAll();
    writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2) + '\n', 'utf8');
    writeFileSync(REDLIST_PATH, JSON.stringify(redlist, null, 2) + '\n', 'utf8');
    console.log('WROTE ledger files=' + ledger.totals.files + ' literals=' + ledger.totals.literals);
    console.log(JSON.stringify(ledger.totals.byClass));
    console.log('WROTE redlist count=' + redlist.count);
  } else { console.error('未知参数：' + arg); process.exit(2); }
}
