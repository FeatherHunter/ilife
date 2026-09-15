#!/usr/bin/env node
/** #516 · 分隔符与内部标识符设计债门（场景 10 的 31 页视觉整改基准的判据工具）。
 *
 * 判据出处（用户裁定，逐字）：
 *   「当一个内容需要通过 `；` 和 `·` 分割时，代表需要进行 UI 上的设计，
 *     该问题是用这些符号简化了 UI 展示的设计」
 * ⇒ **可见文本里出现并列分隔符就是设计债**，不是排版问题：该处内容要换形状
 *   （徽章列／卡片格／键值行／进度条／小表／结论条），见
 *   `docs/skills/skill-calorie/t516-场景10-视觉整改基准.md` §形状化规则。
 *
 * 用法（仓根）：
 *   node packages/skill-calorie/scripts/audit-separators.mjs <a.html> [<b.html> …]
 *   node packages/skill-calorie/scripts/audit-separators.mjs --dir <目录> [--json <路径>]
 *
 * 选项：`--dir <目录>`（扫目录下全部 `.html`，按文件名排序）／`--json <路径>`（判据读数写 JSON）／
 *       `--quiet`（只打摘要行）。**没有缺省的放宽开关**：绿就是每页节点级命中 0。
 *
 * 退出码：0＝全绿；1＝有债（含解析失败件）；2＝用法错或没有输入件。摘要行固定
 * `RESULT: <命中 0 的页数>/<总页数>` ＋ 末行 `PASS`／`FAIL`——收活只读这两行与退出码（§2.2）。
 *
 * ── 可见文本口径（与 `.scratch/sep-audit/probe.mjs` 同口径，**向后兼容**） ──────────
 * 可见文本 = 源文件里剥掉 ① `<style>…</style>`／`<script>…</script>` 整段 ② `<!-- … -->` 注释
 * ③ 全部 `<…>` 标签（**属性因此天然不进可见文本**——复制载荷住在 `data-t=` 属性里，自动出局；
 * 必须全串级剥，因为产物里有跨行属性值）④ 解 HTML 实体。剥壳一律「字符替换为等长哨兵、
 * 换行原样保留」，故**行号与 read 工具一致**（1 起），偏移可直接回查归属元素。
 *
 * 三级读数：
 *   行级（line）  —— 源文件一行的**全部**可见文本拼起来判。产物被压行时一行含整页，故会低估。
 *   节点级（node）—— 单个文本节点判（哨兵切段，段内含非空白即成节点），附**归属元素 class**
 *                    与**所在区**（`head`＝题名等非页身文本、`body`＝页身）。**本门只以节点级判红绿。**
 *
 * ── 判据（节点级命中全零才绿；同一处可同时命中多条） ──────────────────────────────
 *   R1 含 `·`(U+00B7)              —— 探针原有判据
 *   R2 含 `；`(U+FF1B)             —— 探针原有判据
 *   R3 ≥3 段并列                    —— 探针原有判据（同一分隔符切出连续 ≥3 个非空片段、每段 ≤40 字）
 *   R4 含 `｜`(U+FF5C)／`|`(U+007C) —— **#516 新增**
 *   R5 含 `、`(U+3001)             —— **#516 新增**
 *   R6 含 `~`(U+007E)／`～`(U+FF5E) —— **#516 新增**（符号顶替文字：范围写「至」）
 *   R7 内部标识符                   —— **#516 新增**，七个具名子模式，命中时点名是哪一个：
 *        命令键 `calorie.a.b`／命令原文 `calorie-cmd-read`／库表名 `*.db`／蛇形名 `a_b`／
 *        驼峰参数名 `aB`／常量名 `A_B`／票号 `#12`·`t123`
 *   并列分隔符集 PARALLEL（只供 R3 切段用，与探针逐字相同）＝ `· ； ; ｜ | ／ / 、 ＋`
 *   （`，` `。` `：` `→` `＝` 是行文标点／指向／等号，**不算**并列分隔符，免得把正常散文误判成并列。）
 *
 * 注一：R4／R5／R6 比探针严——探针只在 R3（≥3 段）口径上看它们，本门按**出现即债**判。
 * 依据：已经过验收的样板页（`.scratch/t467/看今日目标进度.html`，票 #467）在这三条上本来就读 0，
 * 说明「出现即债」是**可达的**，不是把尺子抬到没人够得着（读数见 `t516-证据.md`）。
 *
 * 注二（**数学记号不算分隔符**，判前先滤）：ASCII 竖线成对包裹一个短 token 的写法是绝对值／范数记号
 * （`按 |Δ| 降序`），它**不是在切并列语义**，探针把它按 `|` 切成三段属误判。滤法（`stripMathAbs`）：
 * 成对 ASCII 竖线、内层 ≤4 字、内层无空白无竖线，且内层「长度 1 或不含 ASCII 字母数字下划线」；
 * 命中即把这两个竖线连同内层换成空格再判。**全角 `｜` 不滤**（那才是并列符号）；作者若真要用竖线并列，
 * 写全角即照常判债。
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const MAXSEG = 40;
const PARALLEL = ['·', '；', ';', '｜', '|', '／', '/', '、', '＋'];
const SENTINEL = '\u0000';
const ENTITIES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'",
  '&nbsp;': ' ', '&middot;': '·', '&hellip;': '…', '&mdash;': '—', '&ndash;': '–',
  '&times;': '×', '&rarr;': '→', '&larr;': '←', '&deg;': '°', '&permil;': '‰',
};

function decodeEntities(s) {
  return s.replace(/&(?:#(\d+)|#x([0-9a-fA-F]+)|[a-zA-Z]+);/g, (m, dec, hex) => {
    if (dec !== undefined) return String.fromCodePoint(Number(dec));
    if (hex !== undefined) return String.fromCodePoint(parseInt(hex, 16));
    const k = m.toLowerCase();
    return Object.prototype.hasOwnProperty.call(ENTITIES, k) ? ENTITIES[k] : m;
  });
}

/** 抹掉一段，但换行原样留下 ⇒ 行号与总行数不变。 */
const blank = (m) => m.replace(/[^\n]/g, SENTINEL);

/** ①②③ 全串级剥壳 → 只剩「可见文本」的同长度串（长度与源文件一致 ⇒ 偏移可直接回查归属元素）。
 *  ④ 解实体放在取到单个节点之后做（解实体会改长度，不能先做）。 */
function visibleText(text) {
  return text
    .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, blank)
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/<[^>]*>/g, blank);
}

/** 内部标识符的七个具名子模式（R7）。顺序即报出顺序。 */
const IDENTIFIERS = [
  ['命令键', /calorie\.[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+/],
  ['命令原文', /calorie-cmd-read\b/],
  ['库表名', /\b[a-z][a-z0-9_]*\.db\b/],
  ['蛇形名', /[a-z][a-z0-9]*(?:_[a-z0-9]+)+/],
  ['驼峰参数名', /\b[a-z]+(?:[A-Z][a-z0-9]*)+\b/],
  ['常量名', /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/],
  ['票号', /(?:^|[^0-9A-Za-z#])#\d{2,}\b|\bt\d{3,}\b/],
];

/** 同一分隔符切出的**极大**并列串（连续 ≥3 段、每段 ≤MAXSEG）。返回最长的那个或 null（探针原算法）。 */
function parallelRun(text) {
  let best = null;
  for (const sep of PARALLEL) {
    if (!text.includes(sep)) continue;
    const parts = text.split(sep);
    let i = 0;
    while (i < parts.length) {
      if (parts[i].trim() === '' || parts[i].trim().length > MAXSEG) { i += 1; continue; }
      let end = i;
      while (end + 1 < parts.length
        && parts[end + 1].trim() !== '' && parts[end + 1].trim().length <= MAXSEG) end += 1;
      const segs = parts.slice(i, end + 1).map((p) => p.trim());
      if (segs.length >= 3 && (!best || segs.length > best.segs.length)) best = { sep, segs };
      i = end + 1;
    }
  }
  return best;
}

/** 数学记号 `|X|` 的滤法：见件头「注二」。命中即换成空格，其余原样。 */
const MATH_ABS = /\|([^\s|]{0,4})\|/g;
function stripMathAbs(s) {
  return s.replace(MATH_ABS, (m, inner) => (
    inner.length >= 1 && inner.length <= 4 && (inner.length === 1 || !/[A-Za-z0-9_]/.test(inner))
      ? ' ' + inner + ' ' : m));
}

/** 命中判定：返回命中的规则 id 列表 ＋ R3／R7 的明细。 */
function judge(raw) {
  const text = stripMathAbs(raw);
  const tags = [];
  if (text.includes('·')) tags.push('R1');
  if (text.includes('；')) tags.push('R2');
  const run = parallelRun(text);
  if (run) tags.push('R3');
  if (/[｜|]/.test(text)) tags.push('R4');
  if (text.includes('、')) tags.push('R5');
  if (/[~～]/.test(text)) tags.push('R6');
  const ident = IDENTIFIERS.filter(([, re]) => re.test(text)).map(([n]) => n);
  if (ident.length) tags.push('R7');
  return { tags, run, ident };
}

/** 裁到 ≤40 字。 */
function clip(text) {
  return text.length <= MAXSEG ? text : text.slice(0, MAXSEG - 1) + '…';
}

const lineOf = (text, offset) => text.slice(0, offset).split('\n').length;

/** 行列位置 → 归属元素（最近的、在它前面的开标签的 class）＋所在区（head／body）。 */
function ownerOf(html, offset) {
  const headEnd = html.search(/<\/head\s*>/i);
  const zone = headEnd >= 0 && offset < headEnd ? 'head' : 'body';
  const before = html.slice(Math.max(0, offset - 4000), offset);
  const opens = [...before.matchAll(/<([a-zA-Z][\w-]*)\b[^>]*class="([^"]*)"[^>]*>/g)];
  return { owner: opens.length ? opens[opens.length - 1][2].trim() : '', zone };
}

const flatten = (raw) => decodeEntities(raw.replace(/\u0000+/g, ' ')).replace(/\s+/g, ' ').trim();

function auditFile(path) {
  const html = readFileSync(path, 'utf8');
  const vis = visibleText(html);
  const lines = vis.split(/\r?\n/);

  const lineHits = [];
  lines.forEach((raw, i) => {
    const text = flatten(raw);
    if (text === '') return;
    const { tags } = judge(text);
    if (tags.length) lineHits.push({ line: i + 1, tags, text: clip(text) });
  });

  // 节点级：哨兵切段，段内含非空白即成节点；偏移与源文件同长，可回查归属元素。
  const nodeHits = [];
  let offset = 0;
  let ordinal = 0;
  for (const piece of vis.split(SENTINEL)) {
    const at = offset;
    offset += piece.length + SENTINEL.length;
    const text = flatten(piece);
    if (text === '') continue;
    ordinal += 1;
    const { tags, run, ident } = judge(text);
    if (!tags.length) continue;
    nodeHits.push({
      n: ordinal, line: lineOf(vis, at), tags, text: clip(text), ident,
      ...ownerOf(html, at),
      run: run && { sep: run.sep, n: run.segs.length, segs: run.segs.map(clip) },
    });
  }

  const count = (arr, t) => arr.filter((h) => h.tags.includes(t)).length;
  const per = (arr) => Object.fromEntries(['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7'].map((t) => [t, count(arr, t)]));
  return {
    path, name: path.replace(/\\/g, '/').split('/').pop(), bytes: Buffer.byteLength(html, 'utf8'),
    totalLines: lines.length,
    line: { ...per(lineHits), hits: lineHits },
    node: { ...per(nodeHits), hits: nodeHits },
  };
}

/* ── 参数与主入口 ───────────────────────────────────────────────────────── */
function argOf(name, dflt) {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}
const FLAGS = ['--dir', '--json'];
const positional = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !FLAGS.includes(all[i - 1]));
const DIR = argOf('--dir', '');
const JSON_OUT = argOf('--json', '');
const QUIET = process.argv.includes('--quiet');

if (DIR === '' && positional.length === 0) {
  console.log('用法: node packages/skill-calorie/scripts/audit-separators.mjs <a.html> [<b.html> …] | --dir <目录> [--json <路径>] [--quiet]');
  console.log('RESULT: ABORT exit=2 :: 没有输入件');
  process.exit(2);
}

let files = positional.map((p) => resolve(p));
if (DIR !== '') {
  const d = resolve(DIR);
  if (!statSync(d).isDirectory()) {
    console.log('RESULT: ABORT exit=2 :: --dir 不是目录 ' + DIR);
    process.exit(2);
  }
  files = readdirSync(d).filter((f) => f.toLowerCase().endsWith('.html')).sort().map((f) => join(d, f));
}
if (files.length === 0) {
  console.log('RESULT: ABORT exit=2 :: 目录下没有 .html ' + DIR);
  process.exit(2);
}

const rows = [];
let broke = 0;
for (const f of files) {
  let r;
  try {
    r = auditFile(f);
  } catch (e) {
    broke += 1;
    console.log('FILE ' + f + '  PARSE-FAIL :: ' + e.message);
    rows.push({ path: f, name: f, error: String(e.message) });
    continue;
  }
  rows.push(r);
  const n = r.node.hits.length;
  console.log('FILE ' + r.name + '  node·' + r.node.R1 + ' ；' + r.node.R2 + ' ≥3段' + r.node.R3
    + ' ｜' + r.node.R4 + ' 、' + r.node.R5 + ' ~' + r.node.R6 + ' 标识符' + r.node.R7
    + '  命中=' + n + '  (行级命中=' + r.line.hits.length + ')');
  if (QUIET) continue;
  for (const h of r.node.hits) {
    const where = h.owner ? '<' + h.owner + '>' : '<' + (h.zone === 'head' ? 'head' : '无 class') + '>';
    const run = h.run ? '  [R3:' + h.run.sep + 'x' + h.run.n + ' = ' + h.run.segs.join(' ｜ ') + ']' : '';
    const id = h.ident.length ? '  [R7:' + h.ident.join('+') + ']' : '';
    console.log('   L' + String(h.line).padStart(5) + ' #' + String(h.n).padStart(3) + ' ' + h.tags.join('+')
      + '  ' + h.text + '   ' + where + ' zone=' + h.zone + run + id);
  }
}

const green = rows.filter((r) => !r.error && r.node.hits.length === 0).length;
const total = rows.length;
console.log('RESULT: ' + green + '/' + total);
console.log(green === total ? 'PASS' : 'FAIL');
if (JSON_OUT !== '') {
  writeFileSync(resolve(JSON_OUT), JSON.stringify({
    at: new Date().toISOString(), dir: DIR, files: total, green, broken: broke,
    totals: ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7'].reduce((a, t) => {
      a[t] = rows.reduce((s, r) => s + (r.node ? r.node[t] : 0), 0); return a;
    }, {}),
    nodeHitsTotal: rows.reduce((s, r) => s + (r.node ? r.node.hits.length : 0), 0),
    rows,
  }, null, 1), 'utf8');
}
process.exit(green === total ? 0 : 1);
