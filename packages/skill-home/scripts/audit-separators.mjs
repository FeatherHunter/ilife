#!/usr/bin/env node
/** 居家管家 · 文案与分隔符判据件（票 #803）。
 *
 * 照抄 `packages/skill-calorie/scripts/audit-separators.mjs` 的引擎（R1–R7 七条规则、
 * 节点级判红绿、等长哨兵剥壳、行号与 read 工具一致、数学记号 `|X|` 先滤），只换两处常量：
 * 命令键 `calorie.` → `home.`、命令原文 `calorie-cmd-read` → `home-cmd-read`。
 * R1–R7 的规则语义一字不动。
 *
 * 并进来的两处 t407／t417 口径：
 * ① 位置四分（逐字符标签栈扫描器，照 `docs/skills/skill-bill/t417-query-audit.mjs:89-111`，
 *    不用 `indexOf('>')` 反推——复制载荷的属性值里可带换行）：
 *    版式位（分隔符顶替设计的地方）＝ `badge`（状态徽章）／`item-head`（条目头）／`stat`（统计块）。
 *    刻意不含 `.content`（条目正文，数据）与 `.cmd`（命令原文 boilerplate，载荷）。
 *    标题写法位（允许保留一个分隔符，不进红）＝ `page-shell-eyebrow`／`page-shell-title`
 *   （HELP 分支的共享模板类名）＋ 裸 `h1`（普通产物页标题，无 class，t407 整改裁定同口径）。
 *    非版式位（旁证，不进红）＝ `.content` 等数据区。
 *    载荷位（标点是载荷本来的样子，不是页面文案）＝ `pre-block-code`／`data-t`／`copy-btn`／
 *    `copy-menu`／`cmd`（普通产物每页那行 `home-cmd-read home.…` boilerplate）。
 * ② 共享层 vs 本页两套读数（照 t417）：head 里那份样式表（普通产物是自家极简 `SHARED_CSS`，
 *    HELP 分支是共享模板样式）单列成「共享层的成绩」，不记到每页头上；本页只看 body 之后的
 *    样式块与内联 style。直接拿 head 判「本页有没有做双端」会全绿——那是共享层的成绩。
 *
 * 红判据（照 t417:244-251）＝ 版式位上的 `·`／`|`（分隔符懒政）＋ 载荷区外英文裸词行 ＋
 * 重复句 ＋ 清单缺件。R1–R7 节点读数全部照打（`；`／`;` 只报告不进红：大量是正经句末分号，
 * t407 同口径）；标题写法位逐处在行里标出，不进红。
 *
 * 用法（仓根，经排队）：
 *   node tooling/run-locked.mjs --ticket 803 --max-wait-ms 600000 -- node packages/skill-home/scripts/audit-separators.mjs <a.html> [<b.html> …]
 *   node tooling/run-locked.mjs --ticket 803 --max-wait-ms 600000 -- node packages/skill-home/scripts/audit-separators.mjs --dir <样例产物目录> [--json <路径>] [--quiet]
 *   node tooling/run-locked.mjs --ticket 866 --max-wait-ms 600000 -- node packages/skill-home/scripts/audit-separators.mjs --dir <样例产物目录> --manifest <产物目录>/manifest.json
 *     清单作用域（票 #866：只审清单 `rows[].file` 点名的产物文件；墙与索引是生成器
 *     产物，走墙自检，不进本门）。清单读不动／`rows` 空／有行缺 `file` → exit 2；
 *     清单点名却没有文件 → 按 PARSE-FAIL 计，exit 1。`--manifest` 须与 `--dir` 同给，
 *     与具名文件二选一；不给清单即整目录旧行为，一字不动。
 * 退出码：0＝全绿；1＝有命中或缺件（含解析失败件）；2＝用法错或没有输入件。摘要行固定
 * `RESULT: <全绿页数>/<总页数>` ＋ 末行 `PASS`／`FAIL`。
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

function visibleText(text) {
  return text
    .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, blank)
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/<[^>]*>/g, blank);
}

/** 内部标识符的七个具名子模式（R7）。顺序即报出顺序。只换了前两项的居家前缀。 */
const IDENTIFIERS = [
  ['命令键', /home\.[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+/],
  ['命令原文', /home-cmd-read\b/],
  ['库表名', /\b[a-z][a-z0-9_]*\.db\b/],
  ['蛇形名', /[a-z][a-z0-9]*(?:_[a-z0-9]+)+/],
  ['驼峰参数名', /\b[a-z]+(?:[A-Z][a-z0-9]*)+\b/],
  ['常量名', /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/],
  ['票号', /(?:^|[^0-9A-Za-z#])#\d{2,}\b|\bt\d{3,}\b/],
];

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

const MATH_ABS = /\|([^\s|]{0,4})\|/g;
function stripMathAbs(s) {
  return s.replace(MATH_ABS, (m, inner) => (
    inner.length >= 1 && inner.length <= 4 && (inner.length === 1 || !/[A-Za-z0-9_]/.test(inner))
      ? ' ' + inner + ' ' : m));
}

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

function clip(text) {
  return text.length <= MAXSEG ? text : text.slice(0, MAXSEG - 1) + '…';
}

const lineOf = (text, offset) => text.slice(0, offset).split('\n').length;

function ownerOf(html, offset) {
  const headEnd = html.search(/<\/head\s*>/i);
  const zone = headEnd >= 0 && offset < headEnd ? 'head' : 'body';
  const before = html.slice(Math.max(0, offset - 4000), offset);
  const opens = [...before.matchAll(/<([a-zA-Z][\w-]*)\b[^>]*class="([^"]*)"[^>]*>/g)];
  return { owner: opens.length ? opens[opens.length - 1][2].trim() : '', zone };
}

const flatten = (raw) => decodeEntities(raw.replace(/\u0000+/g, ' ')).replace(/\s+/g, ' ').trim();

/* ── 居家位置四分（t417 口径，类名换成居家自己的） ─────────────────────── */
const DESIGN_POS = /(badge|item-head|stat)/;
const TITLE_POS = /(page-shell-eyebrow|page-shell-title)/;
const NON_DESIGN_POS = /(content|data-table-cell|param-form-input|param-form-label|param-form-required)/;
const PAYLOAD_POS = /(pre-block-code|data-t|copy-btn|copy-menu|cmd)/;
const VOID = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'source', 'col', 'area', 'base', 'wbr']);

/** 可见文本区逐字符判位置：返回每处分隔符的 {ch, cls, tag}。单遍标签栈扫描器。 */
function locateSeps(visibleArea) {
  const steps = [];
  for (const t of visibleArea.matchAll(/<[^>]*>/g)) steps.push({ at: t.index, tag: t[0] });
  const out = [];
  const stack = [];
  let ti = 0;
  let next = steps.length > 0 ? steps[0].at : Infinity;
  for (const m of visibleArea.matchAll(/·|；|;|\|/g)) {
    while (next < m.index && ti < steps.length) {
      const s = steps[ti++];
      const name = (s.tag.match(/^<\/?\s*([a-z0-9]+)/i) ?? [])[1]?.toLowerCase() ?? '';
      if (s.tag.startsWith('</')) {
        const keep = stack.lastIndexOf(name);
        if (keep >= 0) stack.length = keep;
      } else if (!VOID.has(name) && !s.tag.endsWith('/>')) {
        stack.push({ name, cls: (s.tag.match(/class="([^"]*)"/) ?? [])[1] ?? '' });
      }
      next = ti < steps.length ? steps[ti].at : Infinity;
    }
    const top = [...stack].reverse().find((x) => x.cls);
    out.push({ ch: m[0], cls: top ? top.cls : '', tag: stack.length > 0 ? stack[stack.length - 1].name : '', idx: m.index });
  }
  return out;
}

/** 剥掉样式与脚本，取可见文本行（复制载荷 `data-t`、写库 `<pre>`、`.cmd` 命令原文行不算页面文案）。 */
function visibleLines(html) {
  const body = html
    .replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/data-t="[^"]*"/g, '')
    .replace(/<pre[\s\S]*?<\/pre>/gi, '')
    .replace(/<p class="cmd">[\s\S]*?<\/p>/gi, '')
    .replace(/<[^>]+>/g, '\n');
  return body.split('\n').map((s) => s.trim()).filter(Boolean);
}

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

  /* 位置四分：全页判（只剔样式／脚本／复制载荷——`<title>` 的写法位也在 head 里，不含它读数就对不上节点行）。
   *  共享层／本页 CSS 读数仍按 head／body 分家，见下。 */
  const bodyStart = html.indexOf('<body');
  const pageHtml = bodyStart < 0 ? html : html.slice(bodyStart);
  const headCss = bodyStart < 0 ? '' : [...html.slice(0, bodyStart).matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((m) => m[1]).join('\n');
  const styleText = [...pageHtml.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n');
  const scanArea = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/data-t="[\s\S]*?"/g, '');
  const seps = locateSeps(scanArea);
  const designHits = seps.filter((s) => (s.ch === '·' || s.ch === '|') && DESIGN_POS.test(s.cls));
  const titleHits = seps.filter((s) => (s.ch === '·' || s.ch === '|')
    && (TITLE_POS.test(s.cls) || s.tag === 'h1' || s.tag === 'title') && !DESIGN_POS.test(s.cls));
  const nonDesignHits = seps.filter((s) => (s.ch === '·' || s.ch === '|')
    && !DESIGN_POS.test(s.cls) && !TITLE_POS.test(s.cls) && s.tag !== 'h1' && s.tag !== 'title' && NON_DESIGN_POS.test(s.cls));
  const semi = seps.filter((s) => s.ch === '；' || s.ch === ';').length;
  const semiPayload = seps.filter((s) => (s.ch === '；' || s.ch === ';') && PAYLOAD_POS.test(s.cls)).length;
  const nearOf = (idx) => scanArea.slice(Math.max(0, idx - 400), idx + 400)
    .replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  const textLines = visibleLines(html);
  const claim = (hits) => {
    const nearList = hits.map((s) => nearOf(s.idx));
    const sep = textLines.filter((s) => /[·；;|]/.test(s));
    return sep.filter((s) => /[·|]/.test(s)
      && (nearList.some((n) => n.includes(s)) || nearList.some((n) => s.includes(n))));
  };

  /* 英文裸词（载荷区外）与重复句（照 t417:127-146；种子允许清单待票 5 落地后补，见遗留出口）。 */
  const cellText = new Set([...html.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)]
    .map((m) => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()));
  const MASK = /[‌﻿]/g;
  const prose = textLines.map((s) => s.replace(MASK, '')).filter((s) => s.length > 6
    && !/^[\d\s\-–—/.、:：]+$/.test(s) && !cellText.has(s));
  const dupes = [...new Set(prose.filter((s) => prose.filter((x) => x === s).length > 1))];
  const ASCII_OK = /20\d\d-\d\d-\d\d|\d\d:\d\d|L1|L2|L3|HTML|\d+\.\d{2}/g;
  const FIXTURE_DATA = /本域无豁免夹具名/g;
  const copyLines = visibleLines(html.replace(/<pre[\s\S]*?<\/pre>/gi, '')
    .replace(/<button[^>]*data-t="[^"]*"[\s\S]*?<\/button>/gi, ''));
  const asciiBad = copyLines
    .filter((s) => !cellText.has(s))
    .map((s) => ({ line: s, rest: s.replace(ASCII_OK, '').replace(FIXTURE_DATA, '') }))
    .filter((x) => /[A-Za-z]/.test(x.rest))
    .map((x) => x.line);

  const liveCss = styleText.replace(/\/\*[\s\S]*?\*\//g, '');
  const headLive = headCss.replace(/\/\*[\s\S]*?\*\//g, '');
  const colors = new Set((liveCss.match(/#[0-9a-fA-F]{3,8}/g) ?? []).map((c) => c.toLowerCase()));
  const headColors = new Set((headLive.match(/#[0-9a-fA-F]{3,8}/g) ?? []).map((c) => c.toLowerCase()));

  const count = (arr, t) => arr.filter((h) => h.tags.includes(t)).length;
  const per = (arr) => Object.fromEntries(['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7'].map((t) => [t, count(arr, t)]));
  return {
    path, name: path.replace(/\\/g, '/').split('/').pop(), bytes: Buffer.byteLength(html, 'utf8'),
    totalLines: lines.length,
    line: { ...per(lineHits), hits: lineHits },
    node: { ...per(nodeHits), hits: nodeHits },
    design: designHits.length, designLines: claim(designHits),
    titleDots: titleHits.length,
    nonDesign: nonDesignHits.length, nonDesignLines: claim(nonDesignHits).filter((s) => !claim(designHits).includes(s)),
    semi, semiPayload,
    ascii: asciiBad.length, asciiLines: asciiBad,
    dupes: dupes.length, dupeLines: dupes,
    headCss: headCss.length,
    headBp820: /@media\s*\(max-width:\s*820px\)/.test(headCss),
    headMin44: /min-height:\s*44px/.test(headCss),
    headWrap: /flex-wrap/.test(headCss),
    headGridAuto: /grid-template-columns:\s*repeat\(auto-fit/.test(headCss),
    headPad: /@media\s*\(max-width:\s*820px\)[\s\S]{0,400}?padding:/.test(headCss),
    headColors: headColors.size,
    styleBlocks: (pageHtml.match(/<style/gi) ?? []).length,
    inlineStyle: (pageHtml.match(/\sstyle="/g) ?? []).length,
    colors: colors.size,
  };
}

/* ── 参数与主入口 ───────────────────────────────────────────────────────── */
function argOf(name, dflt) {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}
const FLAGS = ['--dir', '--json', '--manifest'];
const positional = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !FLAGS.includes(all[i - 1]));
const DIR = argOf('--dir', '');
const JSON_OUT = argOf('--json', '');
const MANIFEST = argOf('--manifest', '');
const QUIET = process.argv.includes('--quiet');

if (DIR === '' && positional.length === 0) {
  console.log('用法: node packages/skill-home/scripts/audit-separators.mjs <a.html> [<b.html> …] | --dir <目录> [--manifest <清单>] [--json <路径>] [--quiet]');
  console.log('RESULT: ABORT exit=2 :: 没有输入件');
  process.exit(2);
}
if (MANIFEST !== '' && DIR === '') {
  console.log('用法: node packages/skill-home/scripts/audit-separators.mjs <a.html> [<b.html> …] | --dir <目录> [--manifest <清单>] [--json <路径>] [--quiet]');
  console.log('RESULT: ABORT exit=2 :: --manifest 须与 --dir 同给（清单文件名相对产物目录解）');
  process.exit(2);
}
if (MANIFEST !== '' && positional.length > 0) {
  console.log('用法: node packages/skill-home/scripts/audit-separators.mjs <a.html> [<b.html> …] | --dir <目录> [--manifest <清单>] [--json <路径>] [--quiet]');
  console.log('RESULT: ABORT exit=2 :: --manifest 与具名文件只能二选一');
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
if (MANIFEST !== '') {
  let mf;
  try {
    mf = JSON.parse(readFileSync(resolve(MANIFEST), 'utf8'));
  } catch (e) {
    console.log('RESULT: ABORT exit=2 :: 清单读不动 ' + MANIFEST + ' :: ' + e.message);
    process.exit(2);
  }
  const rows = mf.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log('RESULT: ABORT exit=2 :: 清单 rows 为空 ' + MANIFEST);
    process.exit(2);
  }
  const names = [];
  for (const r of rows) {
    if (!r || typeof r.file !== 'string' || r.file === '') {
      console.log('RESULT: ABORT exit=2 :: 清单有行缺 file ' + MANIFEST);
      process.exit(2);
    }
    names.push(r.file);
  }
  const d = resolve(DIR);
  files = names.map((f) => join(d, f));
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
    + '  命中=' + n + '  (行级命中=' + r.line.hits.length + ')'
    + '  版式位' + r.design + ' 标题位' + r.titleDots + ' 非版式' + r.nonDesign
    + ' 英文行' + r.ascii + ' 重复句' + r.dupes);
  if (QUIET) continue;
  for (const h of r.node.hits) {
    const where = h.owner ? '<' + h.owner + '>' : '<' + (h.zone === 'head' ? 'head' : '无 class') + '>';
    const run = h.run ? '  [R3:' + h.run.sep + 'x' + h.run.n + ' = ' + h.run.segs.join(' ｜ ') + ']' : '';
    const id = h.ident.length ? '  [R7:' + h.ident.join('+') + ']' : '';
    console.log('   L' + String(h.line).padStart(5) + ' #' + String(h.n).padStart(3) + ' ' + h.tags.join('+')
      + '  ' + h.text + '   ' + where + ' zone=' + h.zone + run + id);
  }
}

const green = rows.filter((r) => !r.error && r.design === 0 && r.ascii === 0 && r.dupes === 0).length;
const total = rows.length;
const badDesign = rows.filter((r) => !r.error && r.design > 0).map((r) => r.name + '(' + r.design + ')');
const badAscii = rows.filter((r) => !r.error && r.ascii > 0).map((r) => r.name + '(' + r.ascii + ')');
const badDupes = rows.filter((r) => !r.error && r.dupes > 0).map((r) => r.name + '(' + r.dupes + ')');
console.log('===== 逐条汇总（共 ' + total + ' 份）=====');
console.log('有分隔符懒政（版式位 `·`／`|`）：' + (badDesign.length === 0 ? '0 份' : badDesign.length + ' 份 → ' + badDesign.join('、')));
console.log('有英文裸词：' + (badAscii.length === 0 ? '0 份' : badAscii.length + ' 份 → ' + badAscii.join('、')));
console.log('有重复句：' + (badDupes.length === 0 ? '0 份' : badDupes.length + ' 份 → ' + badDupes.join('、')));
console.log('  合计：版式位 `·`／`|` ' + rows.reduce((a, r) => a + (r.design || 0), 0) + ' 处；'
  + '标题写法位（允许保留）' + rows.reduce((a, r) => a + (r.titleDots || 0), 0) + ' 处；'
  + '非版式位旁证 ' + rows.reduce((a, r) => a + (r.nonDesign || 0), 0) + ' 处；'
  + '`；`／`;` ' + rows.reduce((a, r) => a + (r.semi || 0), 0) + ' 处（其中落在载荷位 '
  + rows.reduce((a, r) => a + (r.semiPayload || 0), 0) + ' 处）。');
const first = rows.find((r) => !r.error);
console.log('===== 共享层（head 里那份样式表，共享层的成绩，不是本页的）=====');
if (first) {
  console.log('head 样式表 ' + first.headCss + ' 字符；820 断点 ' + (first.headBp820 ? '有' : '无')
    + '；min-height:44px ' + (first.headMin44 ? '有' : '无') + '；flex-wrap ' + (first.headWrap ? '有' : '无')
    + '；auto-fit ' + (first.headGridAuto ? '有' : '无') + '；窄屏内距 ' + (first.headPad ? '有' : '无')
    + '；色值 ' + first.headColors + ' 个');
  console.log('共享样式表逐字节同一份的页：' + rows.filter((r) => !r.error && r.headCss === first.headCss).length + '／' + rows.filter((r) => !r.error).length);
  console.log('本页 body 之后有样式块的页：' + (rows.filter((r) => !r.error && r.styleBlocks > 0).length === 0
    ? '0 份 —— 外观全部来自共享样式表' : rows.filter((r) => !r.error && r.styleBlocks > 0).map((r) => r.name).join('、')));
  console.log('本页有内联 style 属性的页：' + (rows.filter((r) => !r.error && r.inlineStyle > 0).length === 0
    ? '0 份' : rows.filter((r) => !r.error && r.inlineStyle > 0).map((r) => r.name).join('、')));
}
console.log('分隔符懒政逐行（`·`／`|` 落在版式位上，只列有问题的）：');
for (const r of rows.filter((x) => !x.error && x.design > 0)) {
  console.log('  [' + r.name + '  ' + r.design + ' 处]');
  for (const l of r.designLines) console.log('      ' + l);
}
console.log('英文裸词逐行（只列有问题的）：');
for (const r of rows.filter((x) => !x.error && x.ascii > 0)) {
  console.log('  [' + r.name + '  ' + r.ascii + ' 行]');
  for (const l of r.asciiLines) console.log('      ' + l);
}
console.log('重复句逐行（只列有问题的）：');
for (const r of rows.filter((x) => !x.error && x.dupes > 0)) {
  console.log('  [' + r.name + ']');
  for (const l of r.dupeLines) console.log('      ' + l);
}
console.log('RESULT: ' + green + '/' + total);
console.log(green === total && broke === 0 ? 'PASS' : 'FAIL');
if (JSON_OUT !== '') {
  writeFileSync(resolve(JSON_OUT), JSON.stringify({
    at: new Date().toISOString(), dir: DIR, manifest: MANIFEST === '' ? undefined : MANIFEST,
    files: total, green, broken: broke,
    totals: ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7'].reduce((a, t) => {
      a[t] = rows.reduce((s, r) => s + (r.node ? r.node[t] : 0), 0); return a;
    }, {}),
    nodeHitsTotal: rows.reduce((s, r) => s + (r.node ? r.node.hits.length : 0), 0),
    designTotal: rows.reduce((s, r) => s + (r.design || 0), 0),
    rows,
  }, null, 1), 'utf8');
}
process.exit(green === total && broke === 0 ? 0 : 1);
