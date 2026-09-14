#!/usr/bin/env node
/**
 * #393 · 只读比对探针：对同一批输入跑「搬迁前／搬迁后」两态的七个装配函数，逐函数比 sha256。
 *
 * 只读：不写工作区里的受版本控制件，只写 `--out` 指定的 json（本票草稿目录下）。
 *
 * 用法：
 *   node .scratch/t393/probe.mjs --map .scratch/t393/map-before.json --state before --out .scratch/t393/before.json
 *   node .scratch/t393/probe.mjs --map .scratch/t393/map-after.json  --state after  --out .scratch/t393/after.json
 *   node .scratch/t393/probe.mjs --compare .scratch/t393/before.json .scratch/t393/after.json
 *
 * `--map`＝`{ "<函数名>": "<dist 相对模块说明符>" }`（相对 `packages/skill-calorie/dist`）。
 * 两态喂的输入完全一样（本文件下半部的用例电池），所以输出 sha 相等 ⇔ 产物逐字节不变。
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..');
const DIST = path.join(REPO_ROOT, 'packages', 'skill-calorie', 'dist');

function argOf(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

/** 产物摘要：正常返回 → `ok:<sha256>`；抛错 → `throw:<构造名>:<消息>`（两态同样比）。 */
function digest(fn, args) {
  let out;
  try {
    out = fn(...args);
  } catch (e) {
    return 'throw:' + (e && e.constructor ? e.constructor.name : typeof e) + ':' + String(e && e.message);
  }
  if (typeof out !== 'string') return 'not-a-string:' + typeof out;
  return 'ok:' + createHash('sha256').update(out, 'utf8').digest('hex');
}

/* ───────────────────────── 用例电池（两态共用，逐字节同一份） ───────────────────────── */

const SLICES_FULL = [
  { meal: '早餐', count: 2, calories: 620, pct: 31.16 },
  { meal: '午餐', count: 3, calories: 830, pct: 41.71 },
  { meal: '晚餐', count: 2, calories: 540, pct: 27.14 },
  { meal: '加餐', count: 1, calories: 0, pct: 0 },
];

const ROW = (over = {}) => ({
  date: '2026-09-02', time: '08:15', food_name: '燕麦', grams: 60,
  calories: 228, protein: 8.4, carbs: 39.6, fat: 4.2, ...over,
});

const OVERVIEW = (over = {}) => ({
  start: '2026-09-01', end: '2026-09-07', days: 7, loggedDays: 5,
  totalCalories: 9210, avgCalories: 1842, calorieGoal: 1800,
  trend: { summary: { trend: 'flat', avg: 1842, start: 1800, end: 1842, deltaPct: 2.3, slope: 4.2 }, direction: 'flat' },
  series: [],
  ...over,
});

const MACRO = (over = {}) => ({
  protein: { pct: 21.5, targetPct: 33.3, diff: -11.8, status: 'low' },
  carb: { pct: 52.0, targetPct: 44.4, diff: 7.6, status: 'high' },
  fat: { pct: 26.5, targetPct: 30.0, diff: -3.5, status: 'low' },
  ...over,
});

const RANK_ITEM = (over = {}) => ({
  rank: 1, foodName: '鸡胸肉', totalCal: 660, totalGrams: 500,
  totalProtein: 120, totalCarbs: 0, totalFat: 12, cnt: 4, avgCalPerMeal: 165, ...over,
});

const RANKING = (over = {}) => ({
  category: 'high_calorie', title: '🔥 热量炸弹榜', start: '2026-09-01', end: '2026-09-07',
  topN: 5, items: [RANK_ITEM(), RANK_ITEM({ rank: 2, foodName: '坚果', totalCal: 620, cnt: 3, avgCalPerMeal: 206 })],
  ...over,
});

const TREND_OK = {
  status: 'ok',
  data: {
    daysCount: 5, totalCal: 9210, avgCal: 1842, calGoal: 1800, complianceDays: 3,
    weekdayAvg: 1801, weekendAvg: 1930,
    daily: [
      { date: '2026-09-01', totalCal: 1750, totalProtein: 88, totalCarbs: 210, totalFat: 55 },
      { date: '2026-09-02', totalCal: 1842, totalProtein: 92, totalCarbs: 198, totalFat: 60 },
      { date: '2026-09-03', totalCal: 1930, totalProtein: 101, totalCarbs: 221, totalFat: 64 },
    ],
  },
  message: '热量趋势 3 天，日均 1840 卡',
};

const REVIEW = (over = {}) => ({
  start: '2026-09-01', end: '2026-09-07',
  trend: TREND_OK,
  macro: { status: 'ok', data: MACRO(), message: '营养配比 蛋白/碳水/脂肪 = 22/52/27' },
  deficit: { status: 'error', data: null, message: '无数据' },
  loggedDays: 5,
  byMeal: [
    { meal: '早餐', days: 4, totalCalories: 2400 },
    { meal: '午餐', days: 5, totalCalories: 3200 },
    { meal: '晚餐', days: 4, totalCalories: 2800 },
    { meal: '加餐', days: 2, totalCalories: 810 },
  ],
  ...over,
});

const PRODUCT = (over = {}) => ({
  id: 7, product_name: '希腊酸奶', brand: '某牌', calories: 59, protein: 10.0, fat: 0.4,
  saturated_fat: null, carbohydrates: 3.6, sugar: null, dietary_fiber: null, sodium: 36,
  source: '包装', note: null, updated_at: null, ...over,
});

function cases() {
  const out = [];
  const add = (fnName, fnArgs) => out.push({ fnName, fnArgs });

  /* buildTodayDietDoc —— 3 例：典型／全空／配比三项皆无 */
  const todayArgs = (over = {}) => [{
    overview: over.overview ?? OVERVIEW(),
    dist: over.dist ?? { date: '2026-09-01', totalCalories: 1990, slices: SLICES_FULL, detail: [] },
    meals: over.meals ?? [ROW(), ROW({ time: '12:40', food_name: '米饭', grams: 200, calories: 232, protein: 5.2, carbs: 51.6, fat: 0.6 }), ROW({ time: null, food_name: '随手记', grams: 0, calories: 120, protein: 0, carbs: 0, fat: 0 })],
    macro: over.macro === undefined ? MACRO() : over.macro,
  }];
  add('buildTodayDietDoc', todayArgs());
  add('buildTodayDietDoc', todayArgs({ dist: { date: '2026-09-01', totalCalories: 0, slices: SLICES_FULL.map((s) => ({ ...s, count: 0, calories: 0, pct: 0 })), detail: [] }, meals: [], macro: null }));
  add('buildTodayDietDoc', todayArgs({ macro: { protein: null, carb: null, fat: null } }));

  /* buildDietReviewDoc —— 3 例：趋势+配比齐、TOP5 六条／两段皆缺＋无 TOP5／趋势有值但 daily 空 */
  add('buildDietReviewDoc', [REVIEW(), RANKING({ items: [RANK_ITEM(), RANK_ITEM({ rank: 2 }), RANK_ITEM({ rank: 3 }), RANK_ITEM({ rank: 4 }), RANK_ITEM({ rank: 5 }), RANK_ITEM({ rank: 6 })] })]);
  add('buildDietReviewDoc', [REVIEW({ trend: { status: 'error', data: null, message: '无饮食记录' }, macro: { status: 'error', data: null, message: '无营养配比' } }), null]);
  add('buildDietReviewDoc', [REVIEW({ trend: { status: 'ok', data: { ...TREND_OK.data, daily: [] }, message: '' }, macro: { status: 'ok', data: { protein: null, carb: null, fat: null }, message: '' } }), null]);

  /* buildRankingDoc —— 3 例：已知类别／未知类别＋空榜／单条 */
  add('buildRankingDoc', [RANKING()]);
  add('buildRankingDoc', [RANKING({ category: 'unknown_cat', title: '未知榜', items: [], topN: 10 })]);
  add('buildRankingDoc', [RANKING({ category: 'low_calorie', items: [RANK_ITEM({ foodName: '黄瓜', totalCal: 32, cnt: 2, avgCalPerMeal: 16 })] })]);

  /* buildAllRankingsDoc —— 3 例：五榜齐／五榜全空／部分有榜 */
  const board = (over = {}) => ({ ...RANKING(), ...over });
  const allArgs = (boards, okCount) => [{ start: '2026-09-01', end: '2026-09-07', topN: 5, boards, okCount }];
  add('buildAllRankingsDoc', allArgs({
    high_calorie: board(), low_calorie: board({ category: 'low_calorie' }), frequent: board({ category: 'frequent' }),
    high_carb: board({ category: 'high_carb' }), high_protein: board({ category: 'high_protein' }),
  }, 5));
  add('buildAllRankingsDoc', allArgs({
    high_calorie: null, low_calorie: null, frequent: null, high_carb: null, high_protein: null,
  }, 0));
  add('buildAllRankingsDoc', allArgs({
    high_calorie: board(), low_calorie: null, frequent: board({ category: 'frequent' }), high_carb: null,
    high_protein: board({ category: 'high_protein', items: [] }),
  }, 3));

  /* buildSearchDoc —— 3 例：两命中／零命中／品牌与来源为空串 */
  add('buildSearchDoc', [{ keyword: '鸡胸', total: 2, items: [PRODUCT({ product_name: '鸡胸肉', brand: null }), PRODUCT({ id: 8, product_name: '即食鸡胸', source: undefined })] }]);
  add('buildSearchDoc', [{ keyword: 'zzz', total: 0, items: [] }]);
  add('buildSearchDoc', [{ keyword: '酸奶', total: 1, items: [PRODUCT({ brand: '', source: '包装' })] }]);

  /* buildLibraryDoc —— 4 例：全量／分类空页／单条／空串分类（照实测抛错，两态同样逐字比） */
  add('buildLibraryDoc', [{ category: null, total: 2, items: [PRODUCT(), PRODUCT({ id: 9, product_name: '无糖酸奶', brand: null })] }, 42]);
  add('buildLibraryDoc', [{ category: '乳制品', total: 0, items: [] }, 7]);
  add('buildLibraryDoc', [{ category: null, total: 1, items: [PRODUCT({ category: '乳制品' })] }, 7]);
  add('buildLibraryDoc', [{ category: '', total: 1, items: [PRODUCT({ category: '乳制品' })] }, 7]);

  /* buildDedupeDoc —— 3 例：无重复／两组重复／55 组（走「仅列前 50 组」） */
  add('buildDedupeDoc', [{ groups: [], groupCount: 0, rowCount: 0, totalProducts: 5 }]);
  add('buildDedupeDoc', [{
    groups: [
      { key: '希腊酸奶|某牌', ids: [1, 2], productName: '希腊酸奶', brand: '某牌' },
      { key: '牛奶|', ids: [3, 4, 5], productName: '牛奶', brand: null },
    ],
    groupCount: 2, rowCount: 5, totalProducts: 12,
  }]);
  add('buildDedupeDoc', [{
    groups: Array.from({ length: 55 }, (_, i) => ({ key: 'k' + i, ids: [i, i + 100], productName: '食品' + i, brand: i % 2 === 0 ? null : '某牌' })),
    groupCount: 55, rowCount: 110, totalProducts: 300,
  }]);

  return out;
}

/* ───────────────────────── 入口 ───────────────────────── */

async function run() {
  const mapPath = argOf('--map');
  const outPath = argOf('--out');
  const state = argOf('--state') ?? 'unknown';
  const map = JSON.parse(readFileSync(path.resolve(REPO_ROOT, mapPath), 'utf8'));

  const mods = new Map();
  for (const spec of new Set(Object.values(map))) {
    mods.set(spec, await import(pathToFileURL(path.join(DIST, spec)).href));
  }

  const result = {};
  let throws = 0;
  for (const [i, c] of cases().entries()) {
    const spec = map[c.fnName];
    if (!spec) throw new Error('映射缺函数: ' + c.fnName);
    const mod = mods.get(spec);
    const fn = mod[c.fnName];
    if (typeof fn !== 'function') throw new Error(spec + ' 不导出 ' + c.fnName);
    const d = digest(fn, c.fnArgs);
    if (d.startsWith('throw:')) throws += 1;
    result[c.fnName + '#case' + (i + 1)] = d;
  }

  writeFileSync(path.resolve(REPO_ROOT, outPath), JSON.stringify({ state, map: mapPath, cases: result }, null, 2) + '\n', 'utf8');
  console.log('PROBE state=' + state + ' cases=' + Object.keys(result).length + ' throws=' + throws);
  console.log('RESULT: ' + Object.keys(result).length + '/' + Object.keys(result).length + ' 有读数（明细见 ' + outPath + '）');
}

function compare() {
  const [aPath, bPath] = [argOf('--compare'), process.argv[process.argv.indexOf('--compare') + 2]];
  const a = JSON.parse(readFileSync(path.resolve(REPO_ROOT, aPath), 'utf8'));
  const b = JSON.parse(readFileSync(path.resolve(REPO_ROOT, bPath), 'utf8'));
  const ka = Object.keys(a.cases);
  const kb = Object.keys(b.cases);
  const missing = [...ka.filter((k) => !kb.includes(k)), ...kb.filter((k) => !ka.includes(k))];
  const bad = ka.filter((k) => kb.includes(k) && a.cases[k] !== b.cases[k]);
  const same = ka.length - bad.length;
  console.log('COMPARE ' + aPath + ' ↔ ' + bPath);
  if (missing.length) console.log('缺用例: ' + missing.join(', '));
  if (bad.length) console.log('有差异: ' + bad.slice(0, 20).join(', ') + (bad.length > 20 ? ' …（共 ' + bad.length + '）' : ''));
  console.log('RESULT: ' + same + '/' + ka.length + ' 一致');
  if (missing.length || bad.length) process.exitCode = 1;
}

if (process.argv.includes('--compare')) compare();
else await run();
