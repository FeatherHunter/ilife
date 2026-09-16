#!/usr/bin/env node
/**
 * 分隔符设计债探针（受控入仓件，票号 508，归属件 base-render）。
 *
 * 来源：`.scratch/sep-audit/probe.mjs`（8538B，被 `.gitignore` 的 `.scratch/` 规则挡在仓外，未入仓）。
 * 本件是该来源的受控复制：口径逐字搬，逻辑一行未放宽；新增的只是“可被测试引用”的 plumbing
 *（`auditHtml`／`exitCodeFor`／`import` 主入口守卫），判据本身一字未动。
 *
 * 用法：
 *   node packages/base-render/test/separator-probe.mjs <结果型 HTML>            # 人读（行级 ＋ 节点级两套读数）
 *   node packages/base-render/test/separator-probe.mjs <结果型 HTML> --json      # 机器读
 *   node packages/base-render/test/separator-probe.mjs <结果型 HTML> || exit 1   # 门禁口径：有命中＝1，无命中＝0，用法错＝2
 *
 * ── 口径（用户裁定，逐字；与来源 `:8-32` 同源） ──────────────────────────────
 * 「当一个内容需要通过 `；` 和 `·` 分割时，代表需要进行 UI 上的设计，
 *   该问题是用这些符号简化了 UI 展示的设计」
 * ⇒ 可见文本里出现 `·`／`；`／多段并列 就是设计债。
 *
 * 可见文本 = 源文件里，剥掉
 *   ① <style>…</style>、<script>…</script> 整段
 *   ② <!-- … --> 注释
 *   ③ 全部 <…> 标签（**属性因此天然不进可见文本**；必须全串级剥，因为产物里有跨行属性值
 *      ——「复制数据」面板的 data-t 载荷，逐行剥标签会把属性内部的行误当可见文本）
 * ④ 解 HTML 实体
 * 剥壳一律用「字符替换为等长哨兵、换行原样保留」，故 **行号与 read 工具一致**（1 起）。
 *
 * 三级读数：
 *   行级（line）   —— 源文件一行的**全部**可见文本拼起来判。产物被压行时一行含整页，故会低估。
 *   节点级（node） —— 单个文本节点判（`>文本<` 之间的文本；相邻文本节点被标签隔开，天然分开）。
 *                    节点级附**归属元素 class**，可直接对到区块件上。
 *   段落级（para） —— 节点级按「分隔符 + 前后空白」切成并列段后判。
 *     注：行级/节点级的 `·`/`；` 是**判据**，段落级只用来量「并列了几段」。
 *
 * 命中规则（三条互相独立，同一处可同时命中）：
 *   R1  含 `·`(U+00B7)
 *   R2  含 `；`(U+FF1B)
 *   R3  ≥3 段并列：以**同一个**并列分隔符切开后，连续 ≥3 个非空片段、且每段 ≤ MAXSEG(40) 字。
 *       并列分隔符集 PARALLEL = · ； ; ｜ | ／ / 、 ＋
 *       （`，` `。` `：` `~` `→` `＝` 是行文标点/范围/指向/等号，**不算**并列分隔符，
 *        免得把正常散文误判成并列。）
 *
 * 门禁以节点级为准（行级会低估：样板产物正文被压成一行，6 处债只报 1 行）。
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
    return Object.prototype.hasOwnProperty.call(ENTITIES, m.toLowerCase()) ? ENTITIES[m.toLowerCase()] : m;
  });
}

/** 抹掉一段，但换行原样留下 ⇒ 行号与总行数不变。 */
const blank = (m) => m.replace(/[^\n]/g, SENTINEL);

/** ①②③ 全串级剥壳 → 只剩「可见文本」的同长度串（长度与源文件一致 ⇒ 偏移可直接回查归属元素）。
 *   ④ 解实体放在取到单个节点之后做（解实体会改长度，不能先做）。 */
function visibleText(text) {
  return text
    .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, blank)  // ① 样式/脚本整段
    .replace(/<!--[\s\S]*?-->/g, blank)                            // ② 注释
    .replace(/<[^>]*>/g, blank);                                   // ③ 标签（含跨行标签，属性一并消失）
}

const lineOf = (text, offset) => text.slice(0, offset).split('\n').length;

/** 行列位置 → 归属元素（最近的、在它前面的开标签的 class）。 */
function ownerOf(html, offset) {
  const before = html.slice(Math.max(0, offset - 4000), offset);
  const opens = [...before.matchAll(/<([a-zA-Z][\w-]*)\b[^>]*class="([^"]*)"[^>]*>/g)];
  return opens.length ? opens[opens.length - 1][2].trim() : '';
}

/** 同一分隔符切出的**极大**并列串（连续 ≥3 段、每段 ≤MAXSEG）。返回最长的那个或 null。 */
function parallelRun(text) {
  let best = null;
  for (const sep of PARALLEL) {
    if (!text.includes(sep)) continue;
    const parts = text.split(sep);
    let i = 0;
    while (i < parts.length) {
      if (parts[i].trim() === '' || parts[i].trim().length > MAXSEG) { i++; continue; }
      let end = i;
      while (end + 1 < parts.length
        && parts[end + 1].trim() !== '' && parts[end + 1].trim().length <= MAXSEG) end++;
      const segs = parts.slice(i, end + 1).map((p) => p.trim());
      if (segs.length >= 3 && (!best || segs.length > best.segs.length)) best = { sep, segs };
      i = end + 1;
    }
  }
  return best;
}

/** 裁到 ≤40 字，命中处居中。 */
function clip(text, needle) {
  if (text.length <= MAXSEG) return text;
  const at = needle === undefined ? 0 : Math.max(0, text.indexOf(needle));
  let s = Math.max(0, at - 12);
  if (s + MAXSEG > text.length) s = Math.max(0, text.length - MAXSEG);
  return (s > 0 ? '…' : '') + text.slice(s, s + MAXSEG - 1) + '…';
}

function judge(text) {
  const tags = [];
  if (text.includes('·')) tags.push('R1');
  if (text.includes('；')) tags.push('R2');
  const run = parallelRun(text);
  if (run) tags.push('R3');
  return { tags, run };
}

/** 字符串版核心（与来源 `audit(path)` 同步：同一套 `visibleText`／`judge`，只是输入改成字符串）。 */
function auditHtml(html, label = '<inline>') {
  const vis = visibleText(html);
  const rawLines = vis.split(/\r?\n/);

  // ── 行级 ──
  const lineHits = [];
  rawLines.forEach((raw, i) => {
    const text = decodeEntities(raw.replace(/\u0000+/g, ' ')).replace(/\s+/g, ' ').trim();
    if (text === '') return;
    const { tags, run } = judge(text);
    if (!tags.length) return;
    lineHits.push({ line: i + 1, tags, text: clip(text, '·'), run: run && { sep: run.sep, n: run.segs.length, joined: clip(run.segs.join(run.sep)) } });
  });

  // ── 节点级（哨兵切段，段内含非空白即成节点；偏移与源文件同长，可回查归属元素）──
  const nodeHits = [];
  let offset = 0;
  let ordinal = 0;
  for (const piece of vis.split(SENTINEL)) {
    const at = offset;
    offset += piece.length + SENTINEL.length;
    const text = decodeEntities(piece.replace(/\u0000+/g, ' ')).replace(/\s+/g, ' ').trim();
    if (text === '') continue;
    ordinal += 1;
    const { tags, run } = judge(text);
    if (!tags.length) continue;
    nodeHits.push({
      n: ordinal, line: lineOf(vis, at), tags, text: clip(text, '·'), owner: ownerOf(html, at),
      run: run && { sep: run.sep, n: run.segs.length, segs: run.segs.map((s) => clip(s)) },
    });
  }

  const count = (arr, t) => arr.filter((h) => h.tags.includes(t)).length;
  return {
    path: label, totalLines: rawLines.length,
    line: { R1: count(lineHits, 'R1'), R2: count(lineHits, 'R2'), R3: count(lineHits, 'R3'), hits: lineHits },
    node: { R1: count(nodeHits, 'R1'), R2: count(nodeHits, 'R2'), R3: count(nodeHits, 'R3'), hits: nodeHits },
  };
}

function audit(filePath) {
  const html = readFileSync(filePath, 'utf8');
  return auditHtml(html, filePath);
}

/** 门禁退出码：有命中＝1，无命中＝0（与来源同口径；用法错＝2 由 CLI 分支给出）。 */
function exitCodeFor(result) {
  return (result.line.hits.length || result.node.hits.length) ? 1 : 0;
}

function printReport(r) {
  console.log(`产物: ${r.path}   可见文本行: ${r.totalLines}`);
  console.log(`【行级】含 · : ${r.line.R1} 行   含 ；: ${r.line.R2} 行   ≥3 段并列: ${r.line.R3} 行   命中合计: ${r.line.hits.length} 行`);
  for (const h of r.line.hits) {
    const run = h.run ? `  [R3:${h.run.sep}x${h.run.n}]` : '';
    console.log(`   L${String(h.line).padStart(4)} ${h.tags.join('+')}  ${h.text}${run}`);
  }
  console.log(`【节点级】含 · : ${r.node.R1} 处   含 ；: ${r.node.R2} 处   ≥3 段并列: ${r.node.R3} 处   命中合计: ${r.node.hits.length} 处`);
  for (const h of r.node.hits) {
    const run = h.run ? `  [R3:${h.run.sep}x${h.run.n} = ${h.run.segs.join(' ｜ ')}]` : '';
    console.log(`   L${String(h.line).padStart(4)} #${String(h.n).padStart(3)} ${h.tags.join('+')}  ${h.text}   <${h.owner}>${run}`);
  }
}

const isMainEntry = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMainEntry) {
  const argv = process.argv.slice(2);
  const target = argv.find((a) => !a.startsWith('--'));
  if (!target) {
    console.error('用法: node packages/base-render/test/separator-probe.mjs <结果型 HTML> [--json] [--nodes]');
    process.exit(2);
  }
  const r = audit(target);
  if (argv.includes('--json')) {
    console.log(JSON.stringify(r, null, 2));
  } else {
    printReport(r);
  }
  process.exit(exitCodeFor(r));
}

export { audit, auditHtml, exitCodeFor, judge, parallelRun, visibleText };
