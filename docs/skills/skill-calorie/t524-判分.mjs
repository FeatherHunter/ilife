/** #524 · 场景 09 视觉整改基准 · 判分脚本（入仓的唯一判分口径）
 *
 *  根因（`docs/skills/skill-calorie/t524-对抗审查.md` §4）：基准件曾并存两套权重与两套算式，
 *  同一页两套口径差 43 分（20.9 vs 63.9）。本件把**权重、每维算式、硬扣分**三者收进一个可跑文件，
 *  并自带「同一页用脚本算 ＝ 用字面公式算（差 0）」的一致性自证。
 *
 *  口径（编排者裁定 2026-09-15，逐条）：
 *   · 权重以表为准：D1 15 ／ D2 20 ／ D3 25 ／ D4 15 ／ D5 25（手机端与 HELP 同档在手机端取高的一支）。
 *   · H6（点击区 <44px）**只在触摸档扣**：390／768 档，或 CDP 显式打开 `pointer: coarse`——
 *     44px 是**触屏**要求；1440 档不硬扣、只记观感（仓内既有口径也是 ≤820px 才放大，见 `pageUi.ts` 的媒体查询）。
 *   · D4 的「跨宽自适应」**只有一条腿**：回归门破格 −5／破档（无隐藏 −5）。页壳定宽 960 的观感债
 *     归 D1 人核，不写进 D4 算式——这样「逐页 ≥90 且每维 ≥满权 80%」自己走一遍能走通。
 *
 *  输入（都是机器读数，逐件给来源；缺件即报缺，不静默取 0）：
 *   · <dir>/sep.json       `audit-separators.mjs --dir <页群> --json <落点>`（节点级 H1／H2／H4）
 *   · <dir>/resp.json      `measure-responsive.mjs --dir <页群> --widths 390,768,1440 --json <落点>`（H5／D4）
 *   · <dir>/fmt.json       `t516-判据-版式.mjs --dir <页群> --widths 390,768,1440 --json <落点>`（H6／D5）
 *   · <dir>/facts.json     本脚本的同目录姊妹读件：静态 DOM 探针 ＋ 人核的两张表
 *                         （`tdDataLabel`／`tocEl`／`aspectRatio`／`scrollMargin` 由 `correction-probe.mjs` 产；
 *                          `dupFacts` 抄 `t524-改前读数.md` §3；`english` 由人工清点；`d1`／`d2` 抄 `vision-deductions.json`）
 *
 *  用法：
 *    node docs/skills/skill-calorie/t524-判分.mjs --dir <页群读数目录>          # 判分＋一致性自证
 *    node docs/skills/skill-calorie/t524-判分.mjs --dir <目录> --json <落点>    # 另存逐页 JSON
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** 权重表（唯一口径；改这里就是改全部分账）。 */
export const WEIGHTS = Object.freeze({ d1: 15, d2: 20, d3: 25, d4: 15, d5: 25 });
/** 每维下限＝满权 80%（§4.3）。 */
export const FLOOR = Object.freeze(
  Object.fromEntries(Object.entries(WEIGHTS).map(([k, v]) => [k, v * 0.8])),
);
/** 硬扣分条款（§4.2；H6 的档见 `touchViolations`）。 */
export const HARD = Object.freeze({ H1: 2, H2: 3, H3: 2, H4: 1, H5: 5, H6: 1, H7: 1 });
/** 触摸档：44px 只在这些宽度问（`pointer: coarse` 由 CDP 显式打开时也进这一档）。 */
export const TOUCH_WIDTHS = Object.freeze([390, 768]);
/** D3 折算系数（分隔符节点／标识符节点／真冗余处／符号顶替处）。 */
const D3W = Object.freeze({ sep: 1.2, ident: 1.5, dup: 2.0, symbol: 1.0 });
/** D5 折算（字号档／表格横滚或卡片化／页内定位／图片容器）。 */
const D5W = Object.freeze({ font: 5, table: 6, toc: 4, image: 3 });

// ── 读数读取 ────────────────────────────────────────────────────────────────
const rd = (p) => JSON.parse(readFileSync(p, 'utf8'));

/** 读数目录：本身须有 facts.json；sep／resp／fmt 缺件时可从 facts.inherit 指的目录借（用于"同一份产物、不同人核档"的对照页）。 */
function loadAll(dir) {
  const facts = rd(join(dir, 'facts.json'));
  const from = facts.inherit ? resolve(dir, facts.inherit) : dir;
  const pick = (f) => (existsSync(join(dir, f)) ? join(dir, f) : join(from, f));
  return { sep: rd(pick('sep.json')), resp: rd(pick('resp.json')), fmt: rd(pick('fmt.json')), facts };
}

const nameOf = (n) => n.replace(/^09-(\d\d)-/, '').replace(/\.html$/, '');
const keyOf = (n) => n.slice(0, 5);

/** 每档破格数（`why` 非空即破；`ok:false` 兜底）。 */
function brokenWidths(respRow) {
  const out = [];
  for (const w of respRow.widths ? Object.keys(respRow.widths).map(Number) : []) {
    const cell = respRow.widths[String(w)];
    if (cell.why !== '' || cell.ok === false) out.push(w);
  }
  return out;
}

/** H6 的命中处数：**只在触摸档**数；非触摸档只记观感（不回扣分）。 */
function touchViolations(fmtRow) {
  let hits = 0;
  const per = {};
  const coarse = fmtRow.pointerCoarse === true;
  for (const w of Object.keys(fmtRow.widths).map(Number)) {
    const cell = fmtRow.widths[String(w)];
    const small = cell.touchSmall ?? 0;
    per[w] = small;
    if (TOUCH_WIDTHS.includes(w) || coarse) hits += small;
  }
  return { hits, per, coarse };
}

/** 一页的机器侧命中（H1／H2／H4／H5／H6）。 */
function hitsOf(sepRow, respRow, fmtRow, factsRow) {
  const node = sepRow.node.hits ?? [];
  const sepNodes = node.filter((h) => h.tags.some((t) => t !== 'R7'));
  const identNodes = node.filter((h) => h.tags.includes('R7'));
  const symbolNodes = node.filter((h) => h.tags.includes('R6'));
  const broken = brokenWidths(respRow);
  const touch = touchViolations(fmtRow);
  return {
    h1: { hits: sepNodes.length },
    h2: { hits: identNodes.length },
    h3: { hits: factsRow.dupFacts ?? 0 },
    h4: { hits: symbolNodes.length },
    h5: { hits: broken.length, widths: broken },
    h6: { hits: touch.hits, per: touch.per, coarse: touch.coarse },
    h7: { hits: factsRow.english ?? 0 },
  };
}

/** 逐维算式（脚本腿；每一条都能在基准件 §4.2 逐字对上）。 */
function dimsOf(hitsOfPage, factsRow, fmtRow, w = WEIGHTS) {
  const { h1, h2, h3, h4, h5 } = hitsOfPage;
  // D3 分隔符与文字纪律：折算后用「本页硬扣分」压顶（同一条债不在两条腿里重复计价）。
  const d3cuts = [];
  if (h1.hits > 0) d3cuts.push({ ref: 'H1', pts: HARD.H1 * h1.hits });
  if (h2.hits > 0) d3cuts.push({ ref: 'H2', pts: HARD.H2 * h2.hits });
  if (h3.hits > 0) d3cuts.push({ ref: 'H3', pts: HARD.H3 * h3.hits });
  if (h4.hits > 0) d3cuts.push({ ref: 'H4', pts: HARD.H4 * h4.hits });
  const d3cut = d3cuts.reduce((a, c) => a + c.pts, 0);
  const d3 = Math.max(0, WEIGHTS.d3 - d3cut);
  // D4 跨宽自适应：**只有回归门一条腿**，破一档 −5（无隐藏 −5）。
  // 另有 facts.d4cut 一个人核位：给「三档虽全绿、但 1440 档只多留空」的观感债在**同一维**里落账
  // （default 0；正例＝0，下限页＝3）。**注意**：它不是算式里的隐藏 −5，而是人核表的显式输入。
  const d4cut = HARD.H5 * h5.hits + (factsRow.d4cut ?? 0);
  const d4 = Math.max(0, WEIGHTS.d4 - d4cut);
  // D5 手机端与 HELP 同档：字号档／表格行为／页内定位／图片容器。
  const f = fmtRow.widths['390'] ?? {};
  const minFont = f.minFontPxNoSvg ?? 12;
  const fontCut = minFont >= 12 ? 0 : D5W.font;
  const hasTable = (factsRow.tables ?? 0) > 0;
  const cardOK = (factsRow.tdDataLabel ?? 0) > 0;
  const tableCut = !hasTable || cardOK ? 0 : D5W.table;
  const tocCut = (factsRow.tocEl ?? 0) > 0 && (factsRow.scrollMargin ?? 0) > 0 ? 0 : D5W.toc;
  const imgCut = (factsRow.imgTags ?? 0) === 0 ? 0 : (factsRow.aspectRatio ?? 0) > 0 ? 0 : D5W.image;
  const d5cut = fontCut + tableCut + tocCut + imgCut;
  const d5 = Math.max(0, WEIGHTS.d5 - d5cut);
  // D1／D2 由人核扣分表给（逐条带证据）。
  const d1 = Math.max(0, WEIGHTS.d1 - (factsRow.d1 ?? 0));
  const d2 = Math.max(0, WEIGHTS.d2 - (factsRow.d2 ?? 0));
  return {
    d1, d2, d3, d4, d5,
    detail: {
      d3: { cut: d3cut, parts: d3cuts, coeff: D3W },
      d4: { cut: d4cut, broken: h5.widths },
      d5: { cut: d5cut, parts: { font: fontCut, table: tableCut, toc: tocCut, image: imgCut }, minFont, hasTable, cardOK },
    },
  };
}

/** 硬扣分合计（§4.2 七条逐条）。 */
function hardOf(hitsOfPage) {
  const parts = [];
  for (const [k, n] of [['H1', hitsOfPage.h1.hits], ['H2', hitsOfPage.h2.hits], ['H3', hitsOfPage.h3.hits],
    ['H4', hitsOfPage.h4.hits], ['H5', hitsOfPage.h5.hits], ['H6', hitsOfPage.h6.hits], ['H7', hitsOfPage.h7.hits]]) {
    if (n > 0) parts.push({ id: k, hits: n, pts: HARD[k] * n });
  }
  return { total: parts.reduce((a, p) => a + p.pts, 0), parts };
}

const floorOK = (dims) => Object.keys(WEIGHTS).every((k) => dims[k] >= FLOOR[k]);

// ── 主装配 ─────────────────────────────────────────────────────────────────
export function score(dir) {
  const { sep, resp, fmt, facts } = loadAll(dir);
  const rows = [];
  const byName = (rowsArr, n) => rowsArr.find((r) => r.name === n || r.file?.endsWith(n));
  for (const sr of sep.rows) {
    const name = sr.name;
    const k = keyOf(name);
    const rr = byName(resp.rows, name);
    const fr = byName(fmt.rows, name);
    const factRow = facts.pages[k] ?? {};
    if (!rr || !fr) throw new Error(`读数缺件：${name}（resp=${!!rr} fmt=${!!fr}）`);
    const h = hitsOf(sr, rr, fr, factRow);
    const dims = dimsOf(h, factRow, fr);
    const hard = hardOf(h);
    const raw = dims.d1 + dims.d2 + dims.d3 + dims.d4 + dims.d5;
    rows.push({
      key: k, name: nameOf(name), raw: +raw.toFixed(1),
      dims: { d1: dims.d1, d2: dims.d2, d3: dims.d3, d4: dims.d4, d5: dims.d5 },
      hits: h, hard, total: +Math.max(0, raw - hard.total).toFixed(1),
      floorOK: floorOK(dims), detail: dims.detail,
    });
  }
  const avg = (f) => +(rows.reduce((a, r) => a + r[f], 0) / rows.length).toFixed(2);
  const avgDim = (k) => +(rows.reduce((a, r) => a + r.dims[k], 0) / rows.length).toFixed(2);
  return {
    at: new Date().toISOString(), dir,
    weights: WEIGHTS, floor: FLOOR, hard: HARD, touchWidths: TOUCH_WIDTHS,
    rows,
    totals: {
      d1: avgDim('d1'), d2: avgDim('d2'), d3: avgDim('d3'), d4: avgDim('d4'), d5: avgDim('d5'),
      total: avg('total'),
      hard: +(rows.reduce((a, r) => a + r.hard.total, 0) / rows.length).toFixed(2),
      min: Math.min(...rows.map((r) => r.total)), max: Math.max(...rows.map((r) => r.total)),
      floorOKPages: rows.filter((r) => r.floorOK).length,
      passPages: rows.filter((r) => r.total >= 90 && r.floorOK).length,
    },
  };
}

/** 一致性自证：脚本腿 vs 字面公式腿，逐页逐维比对。字面公式逐字重打一遍（不共享函数）。 */
export function literalScore(dir) {
  const { sep, resp, fmt, facts } = loadAll(dir);
  const W = { d1: 15, d2: 20, d3: 25, d4: 15, d5: 25 }, H = { H1: 2, H2: 3, H3: 2, H4: 1, H5: 5, H6: 1, H7: 1 };
  const out = [];
  for (const s of sep.rows) {
    const k = s.name.slice(0, 5);
    const r = resp.rows.find((x) => x.name === s.name);
    const f = fmt.rows.find((x) => x.name === s.name);
    const q = facts.pages[k] ?? {};
    const nonR7 = s.node.hits.filter((x) => x.tags.some((t) => t !== 'R7')).length;
    const r7 = s.node.hits.filter((x) => x.tags.includes('R7')).length;
    const r6 = s.node.hits.filter((x) => x.tags.includes('R6')).length;
    const dupFacts = q.dupFacts ?? 0;
    const broken = Object.keys(r.widths).map(Number).filter((w) => r.widths[String(w)].why !== '' || r.widths[String(w)].ok === false).length;
    const touch = Object.keys(f.widths).map(Number).filter((w) => [390, 768].includes(w)).reduce((a, w) => a + (f.widths[String(w)].touchSmall ?? 0), 0);
    const minFont = f.widths['390'].minFontPxNoSvg ?? 12;
    const floorRows = Math.max(0, W.d1 - (q.d1 ?? 0));
    const floorD2 = Math.max(0, W.d2 - (q.d2 ?? 0));
    const floorD3 = Math.max(0, W.d3 - (H.H1 * nonR7 + H.H2 * r7 + H.H3 * dupFacts + H.H4 * r6));
    const floorD4 = Math.max(0, W.d4 - H.H5 * broken - (q.d4cut ?? 0));
    const floorD5 = Math.max(0, W.d5 - ((minFont >= 12 ? 0 : 5)
      + (((q.tables ?? 0) > 0 && (q.tdDataLabel ?? 0) === 0) ? 6 : 0)
      + (((q.tocEl ?? 0) > 0 && (q.scrollMargin ?? 0) > 0) ? 0 : 4)
      + (((q.imgTags ?? 0) > 0 && (q.aspectRatio ?? 0) === 0) ? 3 : 0)));
    const hard = H.H1 * nonR7 + H.H2 * r7 + H.H3 * dupFacts + H.H4 * r6 + H.H5 * broken + H.H6 * touch + H.H7 * (q.english ?? 0);
    out.push({ key: k, dims: { d1: floorRows, d2: floorD2, d3: floorD3, d4: floorD4, d5: floorD5 }, hard, total: +Math.max(0, floorRows + floorD2 + floorD3 + floorD4 + floorD5 - hard).toFixed(1) });
  }
  return out;
}

/** 两腿逐页逐维比差（返回最大绝对差）。 */
export function reconcile(dir) {
  const a = score(dir), b = literalScore(dir);
  const diffs = [];
  for (const ra of a.rows) {
    const rb = b.find((x) => x.key === ra.key);
    for (const k of ['d1', 'd2', 'd3', 'd4', 'd5']) diffs.push({ key: ra.key, dim: k, script: ra.dims[k], literal: rb.dims[k], diff: +(ra.dims[k] - rb.dims[k]).toFixed(1) });
    diffs.push({ key: ra.key, dim: 'hard', script: ra.hard.total, literal: rb.hard, diff: +(ra.hard.total - rb.hard).toFixed(1) });
    diffs.push({ key: ra.key, dim: 'total', script: ra.total, literal: rb.total, diff: +(ra.total - rb.total).toFixed(1) });
  }
  const worst = diffs.reduce((m, d) => (Math.abs(d.diff) > Math.abs(m.diff) ? d : m), { diff: 0, dim: '—', key: '—', script: '—', literal: '—' });
  return { diffs, worst, zero: diffs.every((d) => d.diff === 0) };
}

// ── CLI ────────────────────────────────────────────────────────────────────
const isMain = process.argv[1] && resolve(process.argv[1]).endsWith('t524-判分.mjs');
if (isMain) {
  const argv = process.argv.slice(2);
  const get = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  const dir = resolve(get('--dir') ?? '.scratch/t524/out/readings-before');
  const jsonPath = get('--json');
  const res = score(dir);
  const rec = reconcile(dir);

  console.log(`| 样张 | D1/${WEIGHTS.d1} | D2/${WEIGHTS.d2} | D3/${WEIGHTS.d3} | D4/${WEIGHTS.d4} | D5/${WEIGHTS.d5} | 逐维合计 | 硬扣分 | **页分** | 每维≥80% |`);
  console.log('|---|---:|---:|---:|---:|---:|---:|---:|---:|---|');
  for (const r of res.rows) {
    console.log(`| ${r.name} | ${r.dims.d1} | ${r.dims.d2} | ${r.dims.d3} | ${r.dims.d4} | ${r.dims.d5} | ${r.raw} | −${r.hard.total} | **${r.total}** | ${r.floorOK ? '是' : '否'} |`);
  }
  console.log(`| **均分** | ${res.totals.d1} | ${res.totals.d2} | ${res.totals.d3} | ${res.totals.d4} | ${res.totals.d5} | — | −${res.totals.hard} | **${res.totals.total}** | ${res.totals.floorOKPages}/${res.rows.length} 页 |`);
  console.log(`\nSCORE dir=${dir} 均分=${res.totals.total} 最低=${res.totals.min} 最高=${res.totals.max} ≥90且每维≥80%的页=${res.totals.passPages}/${res.rows.length}`);
  console.log(`每维下限（满权 80%）：D1≥${FLOOR.d1} D2≥${FLOOR.d2} D3≥${FLOOR.d3} D4≥${FLOOR.d4} D5≥${FLOOR.d5}`);
  console.log(`\nRECONCILE 两腿比差：最坏 ${rec.worst.dim}@${rec.worst.key} 差 ${rec.worst.diff}（脚本 ${rec.worst.script} ／ 字面 ${rec.worst.literal}）`);
  console.log(`RECONCILE 逐页逐维（含硬扣分与总分）最大绝对差 = ${Math.abs(rec.worst.diff)}  ⇒ ${rec.zero ? '一致（差 0）' : '**不一致**'}（比对 ${rec.diffs.length} 项）`);
  if (jsonPath) {
    writeFileSync(resolve(jsonPath), JSON.stringify({ ...res, reconcile: { zero: rec.zero, worst: rec.worst, items: rec.diffs.length } }, null, 1), 'utf8');
    console.log('SCORE-WROTE ' + resolve(jsonPath));
  }
  process.exit(rec.zero ? 0 : 1);
}
