#!/usr/bin/env node
/** #867 · facts.json 的 DOM 列探针（**吃 `--dir`，不写死任何目录**；并入仓）。
 *
 *  来历：[#851](https://github.com/FeatherHunter/ilife/issues/851) 第二遍诊断量出 —— `facts.json` 的
 *  DOM 列出自一次性脚本（写死某一个页群目录），备忘录域没有可重跑的产出者。本件把它通用化：
 *  页群目录走参数，页群里几件产物就出几页，件名一律按**文件名主体**取键。
 *
 *  产出（形状冻结在 `docs/base/base-render/t867-读数链契约.md` §四）：
 *    · **DOM 六列**（逐字进 `facts.json`，判分件读这六列判 D5）：
 *      `tables`／`imgTags`／`tdDataLabel`／`tocEl`／`aspectRatio`／`scrollMargin`。
 *    · **两列机器候选**（给人核档判分用，不是最终取值）：`dupFacts`（H3 与 D3 的入口）、
 *      `english`（H7 的入口）。候选是**静态上界** —— 例如折叠态菜单里的英文标签按
 *      `docs/skills/skill-calorie/t524-场景09-视觉整改基准.md` §4.7 记 0 处，静态探针看不见折叠，
 *      故候选含它、由人核改判并写理由。
 *
 *  用法（仓根）：
 *    node docs/skills/skill-memo-ilife/t867-dom-probe.mjs --dir <页群目录> [--json <落点>] [--quiet]
 *
 *  退出码：0＝读数完整；1＝有页读不动（点名）；2＝用法错／页群目录不存在／页群目录里没有 .html。
 *  可见文本口径**不重写**：直接 import `packages/base-render/test/separator-probe.mjs` 导出的同一函数。
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { visibleText } from '../../../packages/base-render/test/separator-probe.mjs';

const SENTINEL = '\u0000';
/** H3 用：重复的可见文本节点（页身域、归一化后长度 ≥ DUP_MIN 才算一处真冗余）。 */
const DUP_MIN = 4;
/** H7 用：英文词（连续 ASCII 字母）。 */
const RE_WORD = /[A-Za-z]+/g;
/** H7 用：半角标点候选集。 */
const RE_PUNC = /[,.;:!?()"'@#$%^&*_+=~|/\\<>{}\[\]-]/g;

/** DOM 六列的正则表（**冻结**；改表即改契约，见契约件 §四）。 */
export const DOM_COLUMNS = Object.freeze([
  ['tables', /<table\b/gi, '页内 <table> 元素数'],
  ['imgTags', /<img\b/gi, '页内 <img> 元素数'],
  ['tdDataLabel', /td[^>]*\bdata-label=/g, '带列头数据标签的单元格数'],
  ['tocEl', /class="[^"]*\bilife-block-toc\b/g, '页内目录元素数（元素级，不是样式规则）'],
  ['aspectRatio', /aspect-ratio/g, '宽高比声明数'],
  ['scrollMargin', /scroll-margin-top/g, '页内定位避让声明数'],
]);

/** 文件名主体（用词照 `docs/agents/wording.md`：文件名里时间戳之前的那一段）＝ `facts.json` 的页键。 */
export function pageKeyOf(fileName) {
  return fileName.replace(/_\d{8}_\d{6}\.html$/i, '').replace(/\.html$/i, '');
}

/** 可见文本节点表：剥壳 → 哨兵切段 → 归一去空 → 序号 1 起（口径同分隔符探针）。 */
export function nodesOf(html) {
  const vis = visibleText(html);
  const headEnd = (() => { const i = html.search(/<\/head\s*>/i); return i < 0 ? 0 : i; })();
  const ENT = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'",
    '&nbsp;': ' ', '&middot;': '·', '&hellip;': '…', '&mdash;': '—', '&ndash;': '–',
    '&times;': '×', '&rarr;': '→', '&larr;': '←', '&deg;': '°', '&permil;': '‰',
  };
  const norm = (piece) => piece.replace(/\u0000+/g, ' ')
    .replace(/&(?:#(\d+)|#x([0-9a-fA-F]+)|[a-zA-Z]+);/g, (m, d, h) => {
      if (d !== undefined) return String.fromCodePoint(Number(d));
      if (h !== undefined) return String.fromCodePoint(parseInt(h, 16));
      return Object.prototype.hasOwnProperty.call(ENT, m.toLowerCase()) ? ENT[m.toLowerCase()] : m;
    })
    .replace(/\s+/g, ' ').trim();
  const out = [];
  let offset = 0;
  let n = 0;
  for (const piece of vis.split(SENTINEL)) {
    const at = offset;
    offset += piece.length + SENTINEL.length;
    const text = norm(piece);
    if (text === '') continue;
    n += 1;
    out.push({ n, line: vis.slice(0, at).split('\n').length, text, zone: at < headEnd ? 'head' : 'body' });
  }
  return out;
}

/** H3 候选：页身域、归一化后长度 ≥ DUP_MIN 的可见文本节点，按文本全等分组；每组 count−1 处。 */
function dupCandidates(nodes) {
  const tally = new Map();
  for (const x of nodes) {
    if (x.zone !== 'body' || x.text.length < DUP_MIN) continue;
    if (!tally.has(x.text)) tally.set(x.text, []);
    tally.get(x.text).push(x.n);
  }
  const kinds = [...tally.entries()].filter(([, ns]) => ns.length >= 2)
    .map(([text, ns]) => ({ text: text.slice(0, 80), count: ns.length, nodes: ns }))
    .sort((a, b) => b.count - a.count);
  return { hits: kinds.reduce((a, k) => a + k.count - 1, 0), kinds };
}

/** H7 候选：页身域每个可见文本节点，命中英文词或半角标点即算 1 处（按节点计处）。 */
function englishCandidates(nodes) {
  const list = [];
  for (const x of nodes) {
    if (x.zone === 'head') continue;
    const words = [...x.text.matchAll(RE_WORD)]
      .filter((m) => !(x.text[m.index - 1] === '#' && /^\d+$/.test(m[0])))
      .map((m) => m[0]);
    const punc = [];
    for (const m of x.text.matchAll(RE_PUNC)) {
      const a = x.text[m.index - 1];
      const b = x.text[m.index + 1];
      if (':./-'.includes(m[0]) && /\d/.test(a ?? '') && /\d/.test(b ?? '')) continue;
      punc.push(m[0]);
    }
    if (words.length === 0 && punc.length === 0) continue;
    list.push({ n: x.n, words: [...new Set(words)], punc: [...new Set(punc)], text: x.text.slice(0, 100) });
  }
  return {
    hits: list.length,
    occurrences: list.reduce((a, h) => a + h.words.length + h.punc.length, 0),
    nodes: list,
  };
}

/** 一件产物 → 页记录。 */
export function probePage(html, fileName) {
  const count = (re) => (html.match(re) ?? []).length;
  const nodes = nodesOf(html);
  const row = {
    file: fileName, key: pageKeyOf(fileName), bytes: Buffer.byteLength(html, 'utf8'),
    totalLines: html.split(/\r?\n/).length, // 人核档的 `L<行号>` 出处按这个行数核（见契约 §五）
    visibleTextNodes: nodes.length,
  };
  for (const [name, re] of DOM_COLUMNS) row[name] = count(re);
  row.candidates = { dupFacts: dupCandidates(nodes), english: englishCandidates(nodes) };
  return row;
}

/** 页群目录 → 逐页记录（键＝文件名主体；撞键即报，不许静默覆盖）。 */
export function probeDir(dir) {
  const abs = resolve(dir);
  if (!statSync(abs).isDirectory()) throw new Error('--dir 不是目录：' + dir);
  const files = readdirSync(abs).filter((f) => f.toLowerCase().endsWith('.html')).sort();
  const pages = {};
  for (const f of files) {
    const row = probePage(readFileSync(join(abs, f), 'utf8'), f);
    if (pages[row.key] !== undefined) throw new Error('页键撞车（文件名主体重复）：' + row.key);
    pages[row.key] = row;
  }
  return {
    at: new Date().toISOString(), dir: abs, files: files.length,
    columns: DOM_COLUMNS.map(([name, re, meaning]) => ({ name, re: String(re), meaning })),
    pages,
  };
}

/* ── 命令行 ────────────────────────────────────────────────────────────── */
function argOf(name, dflt) {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}

const isMain = process.argv[1] && resolve(process.argv[1]).endsWith('t867-dom-probe.mjs');
if (isMain) {
  const DIR = argOf('--dir', '');
  const JSON_OUT = argOf('--json', '');
  const QUIET = process.argv.includes('--quiet');
  if (DIR === '') {
    console.log('用法: node docs/skills/skill-memo-ilife/t867-dom-probe.mjs --dir <页群目录> [--json <落点>] [--quiet]');
    console.log('RESULT: ABORT exit=2 :: 没有输入页群目录');
    process.exit(2);
  }
  let got;
  try {
    got = probeDir(DIR);
  } catch (err) {
    console.log('RESULT: ABORT exit=2 :: ' + err.message);
    process.exit(2);
  }
  if (got.files === 0) {
    console.log('RESULT: ABORT exit=2 :: 页群目录里没有 .html（' + got.dir + '）');
    process.exit(2);
  }
  for (const [key, row] of Object.entries(got.pages)) {
    console.log('PAGE ' + key + '  文件=' + row.file + '  DOM六列: tables=' + row.tables + ' imgTags=' + row.imgTags
      + ' tdDataLabel=' + row.tdDataLabel + ' tocEl=' + row.tocEl + ' aspectRatio=' + row.aspectRatio
      + ' scrollMargin=' + row.scrollMargin + '  候选: dupFacts=' + row.candidates.dupFacts.hits
      + ' english=' + row.candidates.english.hits);
    if (QUIET) continue;
    for (const k of row.candidates.dupFacts.kinds) console.log('    dup #' + k.nodes.join(' #') + ' ×' + k.count + '  ' + JSON.stringify(k.text));
    for (const h of row.candidates.english.nodes) console.log('    en  #' + h.n + '  ' + JSON.stringify(h.text)
      + '  词=' + JSON.stringify(h.words) + ' 标点=' + JSON.stringify(h.punc));
  }
  if (JSON_OUT !== '') {
    writeFileSync(resolve(JSON_OUT), JSON.stringify(got, null, 1), 'utf8');
    console.log('DOM-PROBE-WROTE ' + resolve(JSON_OUT));
  }
  console.log('RESULT: DOM 六列 ' + got.files + ' 页（页群产物 ' + got.files + ' 件）');
  process.exit(0);
}
