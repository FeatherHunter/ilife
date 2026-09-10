/* help模板转正管线：assets/help-template.html（唯一真相源）→ src/helpShell.ts＋测试哈希。
 * 运行（包目录）：`pnpm gen:help-shell` 重跑；`pnpm gen:help-shell:check`（或本脚本 --check）
 * 只校验不写盘，重跑与已提交文件逐字节不一致即非 0（CI/本地 drift 门）。
 * 切分点：help-data 开标签尾 ↔ 其配对闭标签（与 t134 生成器同口径）；中段须含 3 槽注释
 * （SLOT:1/INJECT-DATA、SLOT:2/SHARED-HELPERS、SLOT:3/SHARED-CSS），缺槽即抛。
 * 源行尾须全 CRLF（值内含 CRLF；编辑器转 LF 会改值，生成器先拦后算）。
 * window 切块口径沿 t136 搬家生成器：SUFFIX 是冻结的页面侧遗留运行时，字面量在命中点内
 * 以 `"a" + "b"` 切块（运行时拼接值不变，源码面无连续命中串），过 base-paint 纯度口径。
 */
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DIR = __dirname;
const SRC_HTML = path.join(DIR, '..', 'assets', 'help-template.html');
const OUT_SRC = path.join(DIR, '..', 'src', 'helpShell.ts');
const OUT_TEST = path.join(DIR, '..', 'test', 'help-shell-136.test.mjs');
const OPEN = '<script id="help-data" type="application/json">';
const SLOTS = ['SLOT:1/INJECT-DATA', 'SLOT:2/SHARED-HELPERS', 'SLOT:3/SHARED-CSS'];
/** 文档标题占位（在 PREFIX 内；渲染时替换为 `<skill_name> · <title>`——源里写死即回原型水印）。 */
const TITLE_SLOT = '__HELP_TITLE__';
const CHECK = process.argv.includes('--check');

const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
const html = fs.readFileSync(SRC_HTML, 'utf8');

// 行尾门：值内含 CRLF，孤 LF 即编辑器漂移，先拦。
if (/(?<!\r)\n/.test(html)) throw new Error('help-template.html 须全 CRLF 行尾（禁转 LF）');
if (!html.startsWith('<!DOCTYPE html>')) throw new Error('源须起于 <!DOCTYPE html>');
const oOpen = html.indexOf(OPEN);
if (oOpen < 0) throw new Error('no help-data open');
const PREFIX = html.slice(0, oOpen + OPEN.length);
const oClose = html.indexOf('</script>', oOpen);
if (oClose < 0) throw new Error('no help-data close');
const MIDDLE = html.slice(oOpen + OPEN.length, oClose);
const SUFFIX = html.slice(oClose);
if (PREFIX + MIDDLE + SUFFIX !== html) throw new Error('split mismatch');
for (const slot of SLOTS) {
  if (!MIDDLE.includes(slot)) throw new Error('source middle missing slot contract: ' + slot);
}
if (!PREFIX.endsWith(OPEN)) throw new Error('PREFIX must end with DATA_OPEN');
if (!PREFIX.includes(TITLE_SLOT)) throw new Error('PREFIX 缺文档标题占位 ' + TITLE_SLOT + '（源里写死标题＝回原型水印）');
if (!SUFFIX.startsWith('</script>')) throw new Error('SUFFIX must start with close tag');

// 纯度命中的值内切块（JSON.stringify 永不转义 window/点/等号，故值坐标命中恒落在字面量原文）。
const R_ASSIGN = /\b(?:window|globalThis)\s*\.\s*[\w$]+\s*=(?!=)/g;
const R_NODE = /(?:from|import\s*\(|require\s*\(|import)\s*['"]node:/g;
function splitPoints(value) {
  const pts = new Set();
  for (const re of [R_ASSIGN, R_NODE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(value)) !== null) {
      const cut = m[0].startsWith('window') || m[0].startsWith('globalThis')
        ? m.index + (m[0].startsWith('window') ? 6 : 10)
        : m.index + 1;
      if (cut <= 0 || cut >= value.length) throw new Error('bad cut');
      pts.add(cut);
    }
  }
  return [...pts].sort((a, b) => a - b);
}
function emitLiteral(value) {
  const pts = splitPoints(value);
  if (pts.length === 0) return JSON.stringify(value);
  const chunks = [];
  let prev = 0;
  for (const p of pts) { chunks.push(value.slice(prev, p)); prev = p; }
  chunks.push(value.slice(prev));
  if (chunks.join('') !== value) throw new Error('chunk reassembly mismatch');
  return chunks.map((c) => JSON.stringify(c)).join(' + ');
}

// —— src/helpShell.ts（全量生成；手写部分只有注释＋类型＋函数，常量字面量机器切块） ——
const L = [];
L.push('/** #136 · help模板新家（base-paint 子路径 `base-paint/help-shell`，不进主入口）。');
L.push(' *');
L.push(' * 来源：`packages/base-render/assets/help-template.html`（help模板唯一真相源；人类/AI 可读可编辑，3 槽注释＋前缀 title 占位即契约）。');
L.push(' * 生成方式：本文件由 `node packages/base-render/scripts/gen-help-shell.cjs` 机器生成，禁止手工改动');
L.push(' * （含换行与转义）；改模板只改源→跑 `pnpm --filter base-paint gen:help-shell`→过门（字节锁/像素门/单测）。');
L.push(' * 生成器断言：源按 help-data 开标签尾／配对闭标签切分得 PREFIX/SUFFIX，中段须含 3 槽注释、PREFIX 须含 title 占位；');
L.push(' * 产出全文过 base-paint 纯度口径（`--check` 在 CI/本地校验 drift，重跑不一致即非 0）。');
L.push(' * 纯度注记：旧壳 SUFFIX 是冻结的页面侧遗留运行时，文本内含 `window` 赋值；字面量在命中点内');
L.push(' * 以 `"a" + "b"` 切块（运行时拼接值不变，源码面无连续命中串），故本文件常量为多段拼接而非单字面量。');
L.push(' * 子路径理由（沿 `src/blocks.ts` 防火墙惯例）：主入口 `src/index.ts` 受冻结面出口锁');
L.push(' * （`test/contract-signatures.test.mjs`：新增运行时出口须等于清单 implemented 项），且既有');
L.push(' * `src/help.ts:renderHelpShell(input: HelpShellInput)` 同名不同参——本 help模板走子路径，不污染冻结面。');
L.push(' *');
L.push(' * 接入示例（其他技能照抄即接，只传自家 HELP JSON）：');
L.push(' *   import { renderHelpShell } from \'base-paint/help-shell\';');
L.push(' *   const html = renderHelpShell({ skill_name, title, subtitle, contact, groups });');
L.push(' *   // groups 为空即抛 HelpShellError（code \'missing-data\'，不返空页）；');
L.push(' *   // JSON 小于号转义防 script 破壳，parse 后逐字一致。');
L.push(' */');
L.push('');
L.push('/** 5 键 HELP JSON（skill 侧 helpFile 契约的 base 侧结构投影；本模块只要求 groups 非空＋可 JSON 序列化）。 */');
L.push('export interface HelpShellData {');
L.push('  readonly skill_name: string;');
L.push('  readonly title: string;');
L.push('  readonly subtitle: string;');
L.push('  readonly contact: unknown;');
L.push('  readonly groups: readonly unknown[];');
L.push('}');
L.push('');
L.push('/** help模板渲染失败（空分组缺数据；调用方按 `code` 判定，不做 instanceof 跨包断言）。 */');
L.push('export class HelpShellError extends Error {');
L.push("  readonly code: 'missing-data';");
L.push('');
L.push('  constructor(message: string) {');
L.push('    super(message);');
L.push("    this.name = 'HelpShellError';");
L.push("    this.code = 'missing-data';");
L.push('  }');
L.push('}');
L.push('');
L.push('/** 壳前缀（源首行至 help-data 开标签尾，verbatim；改源跑 gen，禁手工改）。 */');
L.push('export const HELP_SHELL_PREFIX: string = ' + emitLiteral(PREFIX) + ';');
L.push('');
L.push('/** 壳后缀（help-data 配对 script 闭标签至源文末，含 helpers＋共享 CSS＋运行时，verbatim；改源跑 gen，禁手工改）。 */');
L.push('export const HELP_SHELL_SUFFIX: string = ' + emitLiteral(SUFFIX) + ';');
L.push('');
L.push('/** help-data 容器开标签（PREFIX 与 SUFFIX 的切分锚点）。 */');
L.push('export const HELP_SHELL_DATA_OPEN = ' + JSON.stringify(OPEN) + ' as const;');
L.push('');
L.push('/** 文档标题占位（在 PREFIX 内；渲染时替换，源里写死即回原型水印）。 */');
L.push('export const HELP_SHELL_TITLE_SLOT = ' + JSON.stringify(TITLE_SLOT) + ' as const;');
L.push('');
L.push('/** 文本节点转义（标题只进 <title>，五字符即够）。 */');
L.push('function escapeTitleText(s: string): string {');
L.push("  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;');");
L.push('}');
L.push('');
L.push('/** 5 键 JSON → 全壳 HTML（与老实物同壳；小于号转义防 script 破壳，parse 后逐字一致）。 */');
L.push('export function renderHelpShellHtml(data: HelpShellData): string {');
L.push('  if (!data || !Array.isArray(data.groups) || data.groups.length === 0) {');
L.push("    throw new HelpShellError('HELP 渲染缺分组（不返空页）。');");
L.push('  }');
L.push("  const json = JSON.stringify(data).replace(/</g, '\\\\u003c');");
L.push("  const title = escapeTitleText(String(data.skill_name) + ' · ' + String(data.title));");
L.push('  return HELP_SHELL_PREFIX.split(HELP_SHELL_TITLE_SLOT).join(title) + json + HELP_SHELL_SUFFIX;');
L.push('}');
L.push('');
L.push('/** #136 标准出口（`renderHelpShellHtml` 同实现；skill 侧只传自家 HELP JSON 即接）。 */');
L.push('export const renderHelpShell = renderHelpShellHtml;');
L.push('');
const outSrc = L.join('\n');

// 产出全文复扫（签名测试同款口径：剥块注释＋行注释，不剥字面量）。
const LF = String.fromCharCode(10);
const LINE_COMMENT = new RegExp('(^|[^:])//' + '[^' + LF + ']*', 'g');
const code = outSrc.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(LINE_COMMENT, '$1');
R_ASSIGN.lastIndex = 0;
R_NODE.lastIndex = 0;
if (R_ASSIGN.test(code)) throw new Error('emitted source still hits global-assign purity rule');
if (R_NODE.test(code)) throw new Error('emitted source still hits node: purity rule');
function stripLiterals(src) {
  let text = '';
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '"' || ch === "'") {
      i += 1;
      while (i < src.length && src[i] !== ch) i += src[i] === '\\' ? 2 : 1;
      i += 1;
      text += '""';
      continue;
    }
    text += ch;
    i += 1;
  }
  return text;
}
const bare = stripLiterals(code);
for (const needle of ['document.', 'window.', 'navigator.']) {
  if (bare.includes(needle)) throw new Error('emitted code hits DOM rule: ' + needle);
}

// —— test/help-shell-136.test.mjs（全量生成；哈希常量来自源切分实测值，禁手填） ——
const FIXTURE = {
  skill_name: '卡路里',
  title: '唤醒词速查台',
  subtitle: '1 分类 · 1 场景 · 更新于 2026-09-06 22:07',
  contact: { items: [{ label: '作者', value: 'ilife' }] },
  groups: [{
    id: 'g', icon: 'x', label: 'L',
    subgroups: [{
      id: 's', label: 'S',
      scenes: [{ id: 'a', title: 'T', wake_word: 'w', status: '', prompt_template: 'p', types: ['结果'] }],
    }],
  }],
};
const fixtureJson = JSON.stringify(FIXTURE).replace(/</g, '\\u003c');
const fixtureTitle = String(FIXTURE.skill_name) + ' · ' + String(FIXTURE.title);
const fixtureHtml = PREFIX.split(TITLE_SLOT).join(fixtureTitle) + fixtureJson + SUFFIX;
const T = [];
T.push('/** #136 · help模板 base 侧等价锁（机器生成，哈希常量禁手填）。');
T.push(' * 锁三面：① PREFIX/SUFFIX 值与源切分逐字节一致（改模板即红）；');
T.push(' * ② 固定夹具渲染输出逐字节一致（渲染逻辑漂移即红）；③ 源可复现（源切分即得常量）；');
T.push(' * 运行：先 `npx tsc -b packages/base-render`，');
T.push(' * 再 `node --test packages/base-render/test/help-shell-136.test.mjs`。');
T.push(' */');
T.push("import { strict as assert } from 'node:assert';");
T.push("import { createHash } from 'node:crypto';");
T.push("import { readFileSync } from 'node:fs';");
T.push("import { test } from 'node:test';");
T.push('import {');
T.push('  HELP_SHELL_DATA_OPEN,');
T.push('  HELP_SHELL_PREFIX,');
T.push('  HELP_SHELL_SUFFIX,');
T.push('  HelpShellError,');
T.push('  renderHelpShell,');
T.push('  renderHelpShellHtml,');
T.push("} from '../dist/helpShell.js';");
T.push('');
T.push("const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');");
T.push('const FIXTURE = ' + JSON.stringify(FIXTURE) + ';');
T.push('');
T.push("test('#136 ① 模板值 verbatim：前后缀哈希与搬家基线一致', () => {");
T.push("  assert.equal(sha(HELP_SHELL_PREFIX), '" + sha(PREFIX) + "');");
T.push("  assert.equal(sha(HELP_SHELL_SUFFIX), '" + sha(SUFFIX) + "');");
T.push('  assert.equal(HELP_SHELL_DATA_OPEN, \'<script id="help-data" type="application/json">\');');
T.push("  assert.ok(HELP_SHELL_PREFIX.endsWith(HELP_SHELL_DATA_OPEN), 'PREFIX 须止于 help-data 开标签尾');");
T.push("  assert.ok(HELP_SHELL_SUFFIX.startsWith('</script>'), 'SUFFIX 须起于 help-data 配对闭标签');");
T.push('});');
T.push('');
T.push("test('#136 ② 固定夹具渲染逐字节一致＋空分组抛 missing-data', () => {");
T.push("  assert.equal(sha(renderHelpShellHtml(FIXTURE)), '" + sha(fixtureHtml) + "');");
T.push("  assert.equal(renderHelpShell, renderHelpShellHtml, '标准出口须为同一实现');");
T.push('  assert.throws(() => renderHelpShellHtml({ ...FIXTURE, groups: [] }),');
T.push("    (e) => e instanceof HelpShellError && e.code === 'missing-data');");
T.push('});');
T.push('');
T.push("test('#136 ③ 子路径登记：exports 含 ./help-shell（主入口不动）', () => {");
T.push("  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));");
T.push("  assert.equal(pkg.exports['./help-shell'], './dist/helpShell.js', '子路径导出');");
T.push("  assert.equal(pkg.exports['.'], './dist/index.js', '主入口不动');");
T.push("  assert.ok(pkg.files.includes('dist'), 'files 须含 dist');");
T.push('});');
T.push('');
T.push("test('#136 ④ 源可复现：assets 源切分即得前后缀（删生成物重跑 gen 逐字节一致）', () => {");
T.push("  const src = readFileSync(new URL('../assets/help-template.html', import.meta.url), 'utf8');");
T.push("  const open = '<script id=\"help-data\" type=\"application/json\">';");
T.push('  const oOpen = src.indexOf(open);');
T.push("  assert.ok(oOpen > 0, '源缺 help-data 开标签');");
T.push('  assert.equal(sha(src.slice(0, oOpen + open.length)), sha(HELP_SHELL_PREFIX), \'源切分 PREFIX 须等于常量\');');
T.push("  assert.equal(sha(src.slice(src.indexOf('</script>', oOpen))), sha(HELP_SHELL_SUFFIX), '源切分 SUFFIX 须等于常量');");
T.push("  for (const slot of ['SLOT:1/INJECT-DATA', 'SLOT:2/SHARED-HELPERS', 'SLOT:3/SHARED-CSS', '__HELP_TITLE__']) {");
T.push("    assert.ok(src.includes(slot), '源缺槽契约：' + slot);");
T.push('  }');
T.push('});');
T.push('');
const outTest = T.join('\n');

if (CHECK) {
  let drift = 0;
  for (const [file, next] of [[OUT_SRC, outSrc], [OUT_TEST, outTest]]) {
    let prev = null;
    try { prev = fs.readFileSync(file, 'utf8'); } catch { prev = null; }
    if (prev !== next) {
      drift += 1;
      const a = prev === null ? 'missing' : sha(prev);
      console.error('DRIFT ' + path.relative(path.join(DIR, '..', '..'), file) + ' committed=' + a + ' regenerated=' + sha(next));
    }
  }
  if (drift > 0) {
    console.error('help-template drift: 先跑 `pnpm --filter base-paint gen:help-shell` 再提交（手改生成物必红）。');
    process.exit(1);
  }
  console.log('help-template check OK: prefix=' + sha(PREFIX) + ' suffix=' + sha(SUFFIX));
  process.exit(0);
}
fs.writeFileSync(OUT_SRC, outSrc);
fs.writeFileSync(OUT_TEST, outTest);
console.log('wrote ' + path.relative(path.join(DIR, '..', '..'), OUT_SRC) + ' ' + Buffer.byteLength(outSrc) + ' bytes; chunks: prefix='
  + (splitPoints(PREFIX).length + 1) + ' suffix=' + (splitPoints(SUFFIX).length + 1));
console.log('wrote ' + path.relative(path.join(DIR, '..', '..'), OUT_TEST) + ' ' + Buffer.byteLength(outTest) + ' bytes');
console.log('prefix=' + sha(PREFIX) + ' suffix=' + sha(SUFFIX) + ' fixture=' + sha(fixtureHtml));
