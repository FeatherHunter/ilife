#!/usr/bin/env node
/**
 * #393 · 对 `src/render/dietDocs.ts` 做定点删除（§2.5：先在内存里算出产物 → 跑完全部断言 → 全过才落盘）。
 *
 * 删除集只由**当刻内容**的锚点派生（不按行号、不按预备快照）：每个小节注释必须恰出现一次，
 * 命中 0 次记「已被别人做掉」并跳过，命中多次即抛错。删除范围＝该小节注释行到下一小节注释行的前一行。
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const TARGET = 'packages/skill-calorie/src/render/dietDocs.ts';
const BACKUP = '.scratch/t393/backup/dietDocs.orig.ts';
const DRY = process.argv.includes('--dry');

const src = readFileSync(TARGET, 'utf8');

const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
const lines = src.split('\n');

/** 小节注释锚点（搬走的五个小节）＋它们各自的下一小节（保留或也搬走）。 */
const A_TODAY = '/* ── 今日饮食（today_diet.html 对照：餐次进度＋营养配比＋今日明细） ── */';
const A_VIEWDIET = '/* ── 饮食总览＋餐别分布（diet_overview／meal_distribution／today_meals 子集对照） ── */';
const A_REVIEW = '/* ── 饮食复盘（diet_review.html 对照：每日热量趋势＋配比＋高频 TOP＋按餐汇总） ── */';
const A_RANK = '/* ── 食品排行（food_ranking.html 对照：榜单表＋复制榜单；tab 交互归宿主，静态页逐榜/全榜直出） ── */';
const A_LIB = '/* ── 查食品／食品库（food_search／food_library 对照：参数表单＋结果表＋复制） ── */';
const A_HEALTH = '/* ── 健康盘（health_dashboard.html 对照：四维＋今日该做什么＋复制回 AI） ── */';
const A_DEDUPE = '/* ── 去重报告（dedupe_report.html 对照：KPI＋重复组表＋处理建议） ── */';

function indexOfAnchor(text, anchor) {
  const idx = lines.indexOf('' + anchor);
  if (idx < 0) return { state: 'done' };
  if (lines.filter((l) => l === anchor).length !== 1) throw new Error('锚点出现多次: ' + anchor);
  return { state: 'ok', idx };
}

/** 删除区间（0 基，左闭右闭）：从本小节注释到下一小节注释的前一行；末节删到最后一个非空行。 */
function rangeToNext(anchor, nextAnchor) {
  const a = indexOfAnchor(src, anchor);
  if (a.state === 'done') return null;
  const b = indexOfAnchor(src, nextAnchor);
  if (b.state !== 'ok') throw new Error('下一小节锚点缺失: ' + nextAnchor);
  if (!(a.idx < b.idx)) throw new Error('锚点顺序不对: ' + anchor);
  return [a.idx, b.idx - 1];
}

/** 末节：从本小节注释一直删到数组末尾（`split('\n')` 留下的收尾空元素一并删掉，落盘才是「原文减去本小节」）。 */
function rangeToEnd(anchor) {
  const a = indexOfAnchor(src, anchor);
  if (a.state === 'done') return null;
  return [a.idx, lines.length - 1];
}

const cuts = [
  rangeToNext(A_TODAY, A_VIEWDIET),
  rangeToNext(A_REVIEW, A_RANK),
  rangeToNext(A_RANK, A_LIB),
  rangeToNext(A_LIB, A_HEALTH),
  rangeToEnd(A_DEDUPE),
].filter(Boolean);

/* ── 断言①：删除区间互不重叠、且不覆盖准备保留的函数 ── */
/** 保留项的**定义行**（不按出现处判：同名会被搬走的那份输入形引用到，那不是保留项本身）。 */
const keptDecls = [
  'export function buildViewDietDoc(',
  'export function buildHealthDoc(',
  'export interface DietMealRow {',
  'const MEAL_COLUMNS: DataTableColumn[] = [',
  'const HEALTH_DIMS = [',
  "const MEAL_NOTE = ",
];
const sorted = [...cuts].sort((x, y) => x[0] - y[0]);
for (let i = 1; i < sorted.length; i += 1) {
  if (sorted[i][0] <= sorted[i - 1][1]) throw new Error('删除区间重叠: ' + JSON.stringify(sorted));
}
const cutSet = new Set();
for (const [s, e] of cuts) for (let i = s; i <= e; i += 1) cutSet.add(i);
keptDecls.forEach((decl) => {
  const idxs = lines.map((l, i) => (l.startsWith(decl) ? i : -1)).filter((i) => i >= 0);
  if (idxs.length !== 1) throw new Error('保留项定义不是恰一处: ' + decl + ' → ' + idxs.length);
  if (cutSet.has(idxs[0])) throw new Error('删除区间吃掉了保留项: ' + decl);
});
/** 反向自证：删除集里确实含今天那次误判的那一行（`TodayDietDocInput` 的 `meals: DietMealRow[];`）。 */
const mealRowUse = lines.map((l, i) => (l.trim() === 'meals: DietMealRow[];' ? i : -1)).filter((i) => i >= 0);
if (mealRowUse.length !== 2) throw new Error('DietMealRow 作为字段出现次数不对: ' + mealRowUse.length);
if (!mealRowUse.some((i) => cutSet.has(i)) || !mealRowUse.some((i) => !cutSet.has(i))) {
  throw new Error('两处 DietMealRow 字段应一处被删一处留下');
}

/* ── 断言②：被删的七个函数在删除区间内，且只在其中 ── */
const removedFns = ['buildTodayDietDoc', 'buildDietReviewDoc', 'buildRankingDoc', 'buildAllRankingsDoc', 'buildSearchDoc', 'buildLibraryDoc', 'buildDedupeDoc'];
removedFns.forEach((fn) => {
  const decl = lines.map((l, i) => (l.startsWith('export function ' + fn + '(') ? i : -1)).filter((i) => i >= 0);
  if (decl.length !== 1) throw new Error('被删函数声明不是恰一处: ' + fn + ' → ' + decl.length);
  if (!cutSet.has(decl[0])) throw new Error('被删函数不在删除区间内: ' + fn + ' @' + (decl[0] + 1));
});

/* ── 算出新内容 ── */
let out = lines.filter((_, i) => !cutSet.has(i)).join('\n');

if (DRY) {
  console.log('DRY cuts(1-based) ' + JSON.stringify(cuts.map(([s, e]) => [s + 1, e + 1])));
  console.log('DRY lines ' + lines.length + ' → ' + out.split('\n').length);
  console.log('DRY out tail ' + JSON.stringify(out.slice(-24)));
  console.log('DRY line532 ' + JSON.stringify(lines[532]));
  console.log('DRY line611 ' + JSON.stringify(lines[611]) + ' line612 ' + JSON.stringify(lines[612]));
  console.log('DRY line662 ' + JSON.stringify(lines[662]));
  process.exit(0);
}

/* ── 断言③：剩下的 export function 恰两件 ── */
const leftFns = out.split('\n').filter((l) => l.startsWith('export function ')).map((l) => l.slice(16, l.indexOf('(')));
if (leftFns.length !== 2 || leftFns[0] !== 'buildViewDietDoc' || leftFns[1] !== 'buildHealthDoc') {
  throw new Error('剩下两件对不上: ' + JSON.stringify(leftFns));
}
removedFns.forEach((fn) => {
  if (out.includes(fn)) throw new Error('新内容仍含被搬函数名: ' + fn);
});

/* ── 删掉搬走后不再使用的 import（先断言原文恰一处） ── */
const importEdits = [
  ["import {\n  renderChartBlock,\n  renderDataTable,\n  renderDisclosure,\n  renderKpiGrid,\n  renderListRows,\n  renderParamForm,\n} from 'base-paint/blocks';",
   "import {\n  renderChartBlock,\n  renderDataTable,\n  renderDisclosure,\n  renderKpiGrid,\n  renderListRows,\n} from 'base-paint/blocks';"],
  ["import type { FoodRanking, MacroRatio } from '../diet/dietEngine.js';\n", ''],
  ["import type { DietReview } from './analysisPlate.js';\n", ''],
  ["import type { AllRankings } from '../diet/rankingPlate.js';\n", ''],
  ["import type { DedupeView } from './insightPlate.js';\n", ''],
  ["import type { ProductLibrary, ProductSearch } from '../diet/libraryPlate.js';\n", ''],
];
importEdits.forEach(([from, to]) => {
  const n = out.split(from).length - 1;
  if (n !== 1) throw new Error('import 待改片段不是恰一处（' + n + '）: ' + JSON.stringify(from.slice(0, 60)));
  out = out.replace(from, to);
});

/* ── 文件头不动（派单：只许删掉搬走的那 7 个函数与它们的私有辅助；「不趁手改文案」）。
 *    文件头「范围」段里那几页的名字本票不改，作为遗留写进证据与回执。 ── */

/* ── 断言④：保留件与工具仍在，且新内容不再引用搬走的类型 ── */
['export interface DietMealRow', 'export interface ViewDietDocInput', 'const MEAL_COLUMNS', 'const HEALTH_DIMS',
  'const MEAL_NOTE', 'const DOC_VERSION', 'function fmt(', 'function r1('].forEach((needle) => {
  if (!out.includes(needle)) throw new Error('新内容缺保留件: ' + needle);
});
['MacroRatio', 'DietReview', 'AllRankings', 'DedupeView', 'ProductLibrary', 'ProductSearch', 'renderParamForm'].forEach((needle) => {
  if (out.includes(needle)) throw new Error('新内容仍引用搬走的东西: ' + needle);
});
if (!out.endsWith('}\n')) throw new Error('新内容结尾不对: ' + JSON.stringify(out.slice(-24)) + ' lines=' + lines.length + '→' + out.split('\n').length);

if (DRY) {
  console.log('DRY cuts(1-based) ' + JSON.stringify(cuts.map(([s, e]) => [s + 1, e + 1])));
  console.log('DRY lines ' + lines.length + ' → ' + out.split('\n').length);
  console.log('DRY out tail ' + JSON.stringify(out.slice(-24)));
  process.exit(0);
}

if (DRY) {
  console.log('DRY cuts(1-based) ' + JSON.stringify(cuts.map(([s, e]) => [s + 1, e + 1])));
  console.log('DRY lines ' + lines.length + ' → ' + out.split('\n').length);
  console.log('DRY out tail ' + JSON.stringify(out.slice(-24)));
  process.exit(0);
}

/* ── 全过才落盘 ── */
writeFileSync(BACKUP, src, 'utf8');
writeFileSync(TARGET, out, 'utf8');
if (sha(readFileSync(TARGET, 'utf8')) !== sha(out)) throw new Error('落盘后回读与原内容不一致');
console.log('SPLIT ok ' + TARGET + ' 行数 ' + lines.length + ' → ' + out.split('\n').length);
console.log('SPLIT sha256 ' + sha(src) + ' → ' + sha(out));
console.log('SPLIT cut ' + JSON.stringify(cuts.map(([s, e]) => [s + 1, e + 1])));
