/** #112 · 营养移植 4 键取数（t71 需移植 nutrition_ratio／nutrition_detail／
 * source_stats／today_water 四模板的数据面）。
 *
 * 口径（旧脚本逐行对照，见证据 t112 §1）：
 * - 窗查询一律 food_log（水行按新侧约定以 WATER_NAME 排除；水行宏量全 0，
 *   排除与否数值无差）／nutrition_products（is_deprecated＝0，沿旧 product_library）。
 * - R1 收敛（#111 T2 记账）：本域无分类推断——食物名原样使用，不做任何按名
 *   推断；nutrition_detail 的库匹配为**精确名匹配**（沿旧 `food not in lib`），
 *   不做子串（R12 在本票的收敛点：双向子串是运动 review 域口径，不扩散到本域）。
 * - R11 收敛：today-water 的 7 天窗＝date 当天往前 6 个自然日（沿旧“含今天，
 *   最早 6 天前”），不做周一派生（周一口径是计划会话域口径，不扩散到本域）。
 * 缺失阻断不返空：窗内无行／库空／目标缺失可展示即 `missing-data`（G5 #100 口径）；
 * 日期非法即 `bad-input`。本层只做取数＋聚合，不组 HTML（组装归 `render/nutritionPortDocs.ts`）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { WATER_NAME, readGoal } from '../fetch/diet.js';
import { sourceStats } from '../fetch/products.js';
import { shiftISODate } from '../analysis/utils.js';
import { CalorieRenderError } from './errors.js';

function assertRange(start: string, end: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    throw new CalorieRenderError('bad-input', '起止日期非法: ' + start + ' ~ ' + end);
  }
  if (start > end) throw new CalorieRenderError('bad-input', 'start 不得晚于 end');
}

function assertISODate(v: string, field: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    throw new CalorieRenderError('bad-input', field + ' 非法（须 YYYY-MM-DD）：' + v);
  }
}

function daysBetween(start: string, end: string): number {
  return Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
}

/* ── 营养配比（nutrition_ratio：蛋白/碳水/脂肪克数＋热量占比＋目标＋推荐范围） ── */

export interface NutritionRatioRange { min: number; max: number; label: string }

export interface NutritionRatioView {
  start: string;
  end: string;
  days: number;
  totalCalorie: number;
  proteinG: number;
  proteinPct: number;
  carbG: number;
  carbPct: number;
  fatG: number;
  fatPct: number;
  balance: 'good' | 'warn' | 'bad';
  targetProteinG: number | null;
  targetCarbG: number | null;
  targetFatG: number | null;
  range: { protein: NutritionRatioRange; carb: NutritionRatioRange; fat: NutritionRatioRange };
}

/** 推荐范围（旧 render_nutrition_ratio.py range 表逐字）。 */
const RATIO_RANGE = {
  protein: { min: 10, max: 20, label: '10-20%' },
  carb: { min: 45, max: 65, label: '45-65%' },
  fat: { min: 20, max: 35, label: '20-35%' },
} as const;

export function buildNutritionRatioView(db: DatabaseSync, start: string, end: string): NutritionRatioView {
  assertRange(start, end);
  const row = db.prepare(
    `SELECT COUNT(*) AS n, COALESCE(SUM(protein), 0) AS p, COALESCE(SUM(carbs), 0) AS c,
       COALESCE(SUM(fat), 0) AS f, COALESCE(SUM(calories), 0) AS cal
     FROM food_log WHERE date BETWEEN ? AND ? AND food_name != ?`,
  ).get(start, end, WATER_NAME) as { n: number; p: number; c: number; f: number; cal: number };
  if (row.n === 0) throw new CalorieRenderError('missing-data', `无饮食记录：${start} ~ ${end}`);
  const days = daysBetween(start, end);
  const total = row.cal;
  // 占比口径沿旧（蛋白/碳水×4、脂肪×9 除以总热量；实现差异：旧 Python round 为银行家
  // 舍入，本层 Math.round 半值上入，pct 整数差至多 1，见证据 R5）。
  const pPct = total > 0 ? Math.round((row.p * 4) / total * 100) : 0;
  const cPct = total > 0 ? Math.round((row.c * 4) / total * 100) : 0;
  const fPct = total > 0 ? Math.round((row.f * 9) / total * 100) : 0;
  // 失衡计数沿旧（蛋白<5、碳水<30 或 >70、脂肪>40）。
  const bad = (pPct < 5 ? 1 : 0) + (cPct < 30 || cPct > 70 ? 1 : 0) + (fPct > 40 ? 1 : 0);
  // 目标沿新侧约定读 daily_goal id=1（fetch/diet readGoal）；无目标行即 null 不编数
  // （旧脚本的 (120,200,60,1800) 硬编码回退不沿用，见证据 R6）。
  const goal = readGoal(db);
  return {
    start,
    end,
    days,
    totalCalorie: total,
    proteinG: row.p,
    proteinPct: pPct,
    carbG: row.c,
    carbPct: cPct,
    fatG: row.f,
    fatPct: fPct,
    balance: bad === 0 ? 'good' : (bad <= 1 ? 'warn' : 'bad'),
    targetProteinG: goal ? goal.protein_goal * days : null,
    targetCarbG: goal ? goal.carbs_goal * days : null,
    targetFatG: goal ? goal.fat_goal * days : null,
    range: {
      protein: { ...RATIO_RANGE.protein },
      carb: { ...RATIO_RANGE.carb },
      fat: { ...RATIO_RANGE.fat },
    },
  };
}

/* ── 营养素深度（nutrition_detail：纤维/钠/糖实际 vs 固定 DRI） ── */

export interface NutrientItem {
  key: string;
  label: string;
  unit: string;
  value: number;
  avg: number;
  target: number;
  pct: number;
  good: string;
  status: 'ok' | 'over';
}

export interface NutritionDetailView {
  start: string;
  end: string;
  days: number;
  items: NutrientItem[];
  matchedMeals: number;
  missingFoods: string[];
}

/** 固定推荐值（旧 render_nutrition_detail.py DRI 表逐字：中国居民膳食指南 2022）。 */
const DRI = [
  { key: 'fiber', label: '膳食纤维', unit: 'g', target: 25, good: '≥25g/天' },
  { key: 'sodium', label: '钠', unit: 'mg', target: 2000, good: '≤2000mg/天' },
  { key: 'sugar', label: '糖', unit: 'g', target: 50, good: '≤50g/天' },
] as const;

export function buildNutritionDetailView(db: DatabaseSync, start: string, end: string): NutritionDetailView {
  assertRange(start, end);
  const meals = db.prepare(
    'SELECT food_name, grams FROM food_log WHERE date BETWEEN ? AND ? AND food_name != ?',
  ).all(start, end, WATER_NAME) as { food_name: string; grams: number }[];
  if (meals.length === 0) throw new CalorieRenderError('missing-data', `无饮食记录：${start} ~ ${end}`);
  // 食品库按名称聚合（首条命中，沿旧 `lib[food][0]`；精确名匹配，不做子串——R12 收敛点）。
  const lib = new Map<string, { fiber: number; sodium: number; sugar: number }>();
  const prodRows = db.prepare(
    'SELECT product_name, dietary_fiber, sodium, sugar FROM nutrition_products WHERE is_deprecated = 0',
  ).all() as { product_name: string; dietary_fiber: number | null; sodium: number | null; sugar: number | null }[];
  for (const r of prodRows) {
    if (!lib.has(r.product_name)) {
      lib.set(r.product_name, {
        fiber: r.dietary_fiber ?? 0,
        sodium: r.sodium ?? 0,
        sugar: r.sugar ?? 0,
      });
    }
  }
  const totals = { fiber: 0, sodium: 0, sugar: 0 };
  const missing = new Set<string>();
  let matched = 0;
  for (const m of meals) {
    const grams = Number(m.grams ?? 0);
    const hit = lib.get(m.food_name);
    if (!hit || !(grams > 0)) {
      missing.add(m.food_name);
      continue;
    }
    const scale = grams / 100;
    totals.fiber += hit.fiber * scale;
    totals.sodium += hit.sodium * scale;
    totals.sugar += hit.sugar * scale;
    matched += 1;
  }
  const days = Math.max(1, daysBetween(start, end));
  const round1 = (n: number): number => Math.round(n * 10) / 10;
  // 命中 0 亦渲染（缺数据盒明示，不编数）；连一餐都没有才 missing（上游已拦）。
  const items: NutrientItem[] = DRI.map((spec) => {
    const val = round1(totals[spec.key as keyof typeof totals]);
    const avg = round1(val / days);
    const pct = spec.target > 0 ? round1((avg / spec.target) * 100) : 0;
    // 状态口径沿旧（三项一律 pct<=100 即 ok，含纤维；旧模板未对纤维反转，见证据 R7）。
    return {
      key: spec.key,
      label: spec.label,
      unit: spec.unit,
      value: val,
      avg,
      target: spec.target,
      pct,
      good: spec.good,
      status: pct <= 100 ? 'ok' : 'over',
    };
  });
  return { start, end, days, items, matchedMeals: matched, missingFoods: [...missing].sort() };
}

/* ── 食品来源统计（source_stats：GROUP BY source） ── */

export interface SourceStatsItem { source: string; count: number; pct: number }

export interface SourceStatsView {
  total: number;
  sources: number;
  items: SourceStatsItem[];
}

export function buildSourceStatsView(db: DatabaseSync): SourceStatsView {
  const { stats, total } = sourceStats(db);
  if (total === 0) throw new CalorieRenderError('missing-data', '食品库为空（无来源统计）');
  // 空串／NULL 来源归“未知”（沿旧 `src or '未知'`）；占比保留 1 位小数（沿旧 round(cnt/total*100, 1)）。
  const items = stats.map((s) => ({
    source: s.source === null || s.source === undefined || String(s.source) === '' ? '未知' : String(s.source),
    count: s.count,
    pct: total > 0 ? Math.round((s.count / total) * 1000) / 10 : 0,
  }));
  const merged = new Map<string, { count: number; pct: number }>();
  for (const it of items) {
    const acc = merged.get(it.source) ?? { count: 0, pct: 0 };
    acc.count += it.count;
    acc.pct = total > 0 ? Math.round((acc.count / total) * 1000) / 10 : 0;
    merged.set(it.source, acc);
  }
  return {
    total,
    sources: merged.size,
    items: [...merged.entries()]
      .map(([source, v]) => ({ source, ...v }))
      .sort((a, b) => b.count - a.count),
  };
}

/* ── 今日饮水（today_water：当日累计/目标/每杯＋7 天序列） ── */

export interface WaterCup { time: string; ml: number }

export interface TodayWaterView {
  date: string;
  todayMl: number;
  targetMl: number;
  pct: number;
  remainMl: number;
  cups: WaterCup[];
  weekMl: number[];
  weekDates: string[];
}

export function buildTodayWaterView(db: DatabaseSync, date: string): TodayWaterView {
  assertISODate(date, 'date');
  const goal = readGoal(db);
  // 目标沿旧（water_goal 列，无行或空值即 2000；新侧 readGoal 同表同行）。
  const targetMl = goal && goal.water_goal ? goal.water_goal : 2000;
  const todayMl = Number((db.prepare(
    'SELECT COALESCE(SUM(grams), 0) AS w FROM food_log WHERE date = ? AND food_name = ?',
  ).get(date, WATER_NAME) as { w: number }).w ?? 0);
  const cupRows = db.prepare(
    'SELECT time, grams FROM food_log WHERE date = ? AND food_name = ? ORDER BY time',
  ).all(date, WATER_NAME) as { time: string | null; grams: number | null }[];
  // 7 天窗＝date 当天往前 6 个自然日（沿旧“含今天，最早 6 天前”；R11 收敛点：不做周一派生）。
  const weekMl: number[] = [];
  const weekDates: string[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = shiftISODate(date, -i);
    const w = Number((db.prepare(
      'SELECT COALESCE(SUM(grams), 0) AS w FROM food_log WHERE date = ? AND food_name = ?',
    ).get(d, WATER_NAME) as { w: number }).w ?? 0);
    weekMl.push(w);
    weekDates.push(d);
  }
  if (todayMl === 0 && weekMl.every((v) => v === 0)) {
    throw new CalorieRenderError('missing-data', `无饮水记录：${weekDates[0]} ~ ${date}`);
  }
  return {
    date,
    todayMl,
    targetMl,
    pct: targetMl > 0 ? Math.round((todayMl / targetMl) * 100) : 0,
    remainMl: targetMl - todayMl,
    cups: cupRows.map((c) => ({ time: String(c.time ?? '').slice(0, 5), ml: Number(c.grams ?? 0) })),
    weekMl,
    weekDates,
  };
}
