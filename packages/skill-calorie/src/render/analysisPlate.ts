/** T9 #28 · 分析盘数据（render_analysis 对应：combined/deficit/diet_review）。
 *
 * 死规矩：数列唯一源 T5 buildSeries（resolveWindow 解析窗口别名，不自造日期偏移）；
 * 组合相关走 analyzePair（11 配对原样，pair 非法即 bad-input）；缺口/趋势为 T7 薄壳
 * （buildDeficitData/buildTrendData，不自算）；饮食复盘三件套为 T5 口径
 * （dietCalorieTrend/dietMacroRatio/dietDeficitAnalysis，rejection 即阻断）。
 * 餐别窗口跟 diet.ts：复盘附带按餐桶汇总，归类走 inferMealType（与 MEAL_WINDOWS
 * 同源），加餐 = 下午茶 + 夜宵；窗口存在性先断言（老家旧口径作废）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { MEAL_WINDOWS, inferMealType, listMeals } from '../fetch/diet.js';
import { buildSeries, resolveWindow, seriesCount } from '../analysis/series.js';
import type { DaySeries } from '../analysis/series.js';
import { analyzePair, PAIRS } from '../analysis/cross.js';
import type { PairAnalysis } from '../analysis/cross.js';
import { buildDeficitData } from '../analysis/deficit.js';
import type { DeficitData } from '../analysis/deficit.js';
import { buildTrendData } from '../analysis/trend.js';
import type { TrendData } from '../analysis/trend.js';
import { dietCalorieTrend, dietDeficitAnalysis, dietMacroRatio } from '../analysis/diet.js';
import type { CalorieTrend, DeficitAnalysis, MacroRatio } from '../analysis/diet.js';
import type { AnalysisResult } from '../analysis/result.js';
import { FetchError } from '../fetch/errors.js';
import { round2 } from '../kcal.js';
import { CalorieRenderError } from './errors.js';
import { MEAL_BUCKETS } from './diet.js';
import type { MealBucket } from './diet.js';

export const COMBINED_PAIRS = Object.keys(PAIRS);

export interface CombinedAnalysis {
  pair: string;
  window: string;
  start: string;
  end: string;
  series: DaySeries[];
  analysis: PairAnalysis;
}

function assertDate(s: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s + 'T12:00:00Z'))) {
    throw new CalorieRenderError('bad-input', '日期非法: ' + String(s));
  }
}

/** 组合分析盘（combined_analysis）：pair + 窗口别名，series→analyzePair 直通。 */
export function buildCombinedAnalysis(
  db: DatabaseSync,
  pair: string,
  window = '30d',
  start?: string | null,
  end?: string | null,
  today?: string,
): CombinedAnalysis {
  if (!(pair in PAIRS)) throw new CalorieRenderError('bad-input', '未知配对 ' + String(pair) + '，可选: ' + Object.keys(PAIRS).join(', '));
  let s: string;
  let e: string;
  if (start && end) {
    assertDate(start);
    assertDate(end);
    if (start > end) throw new CalorieRenderError('bad-input', 'start 不得晚于 end');
    s = start;
    e = end;
  } else {
    try {
      const [rs, re] = resolveWindow(window, start ?? null, end ?? null, today);
      s = rs;
      e = re;
    } catch (err) {
      if (err instanceof FetchError) throw new CalorieRenderError('bad-input', err.message);
      throw err;
    }
  }
  const series = buildSeries(db, s, e);
  let analysis: PairAnalysis;
  try {
    analysis = analyzePair(series, pair, db, window);
  } catch (err) {
    if (err instanceof FetchError) throw new CalorieRenderError('bad-input', err.message);
    throw err;
  }
  if (analysis.aCount === 0 && analysis.bCount === 0) {
    throw new CalorieRenderError('missing-data', '组合无数据（' + pair + '，' + s + ' ~ ' + e + '）');
  }
  return { pair, window, start: s, end: e, series, analysis };
}

/** 缺口盘（calorie_deficit）：T7 薄壳直通，空窗转 missing-data。 */
export function buildDeficitPlate(db: DatabaseSync, start: string, end: string): DeficitData {
  assertDate(start);
  assertDate(end);
  if (start > end) throw new CalorieRenderError('bad-input', 'start 不得晚于 end');
  try {
    return buildDeficitData(db, start, end);
  } catch (e) {
    if (e instanceof FetchError) throw new CalorieRenderError('missing-data', e.message);
    throw e;
  }
}

/** 趋势盘（render_analysis 趋势段）：T7 薄壳直通。 */
export function buildTrendPlate(db: DatabaseSync, start: string, end: string): TrendData {
  assertDate(start);
  assertDate(end);
  if (start > end) throw new CalorieRenderError('bad-input', 'start 不得晚于 end');
  try {
    return buildTrendData(db, start, end);
  } catch (e) {
    if (e instanceof FetchError) throw new CalorieRenderError('missing-data', e.message);
    throw e;
  }
}

function assertMealWindows(): void {
  for (const k of ['早餐', '午餐', '下午茶', '晚餐', '夜宵', '加餐']) {
    if (!MEAL_WINDOWS[k]) throw new CalorieRenderError('missing-data', 'MEAL_WINDOWS 缺餐别: ' + k);
  }
}

function bucketOf(time: string | null): MealBucket | '其他' {
  if (!time) return '其他';
  const m = inferMealType(time);
  if (m === '早餐' || m === '午餐' || m === '晚餐') return m;
  if (m === '下午茶' || m === '夜宵') return '加餐';
  return '其他';
}

export interface ReviewMealSlice {
  meal: MealBucket;
  days: number;
  totalCalories: number;
}

export interface DietReview {
  start: string;
  end: string;
  trend: AnalysisResult<CalorieTrend>;
  macro: AnalysisResult<MacroRatio>;
  deficit: AnalysisResult<DeficitAnalysis>;
  loggedDays: number;
  byMeal: ReviewMealSlice[];
}

/** 饮食复盘盘（diet_review/nutrition_ratio）：T5 三件套 + 按餐桶汇总（MEAL_WINDOWS 同源）。 */
export function buildDietReview(db: DatabaseSync, start: string, end: string): DietReview {
  assertDate(start);
  assertDate(end);
  if (start > end) throw new CalorieRenderError('bad-input', 'start 不得晚于 end');
  assertMealWindows();
  const trend = dietCalorieTrend(db, start, end);
  const macro = dietMacroRatio(db, start, end);
  const deficit = dietDeficitAnalysis(db, start, end);
  if (trend.status !== 'ok' && macro.status !== 'ok' && deficit.status !== 'ok') {
    throw new CalorieRenderError('missing-data', '无饮食记录（' + start + ' ~ ' + end + '）');
  }
  const series = buildSeries(db, start, end);
  const loggedDays = seriesCount(series, 'calories');
  if (loggedDays === 0) throw new CalorieRenderError('missing-data', '无饮食记录（' + start + ' ~ ' + end + '）');
  const agg = new Map<MealBucket, { days: Set<string>; total: number }>();
  for (const d of series) {
    let rows: Array<{ time: string | null; food_name: string; calories: number }>;
    try {
      rows = listMeals(db, d.date).filter((r) => r.food_name !== '💧水');
    } catch {
      continue;
    }
    for (const r of rows) {
      const b = bucketOf(r.time);
      if (b === '其他') continue;
      let e = agg.get(b);
      if (!e) {
        e = { days: new Set<string>(), total: 0 };
        agg.set(b, e);
      }
      e.days.add(d.date);
      e.total += r.calories;
    }
  }
  const byMeal: ReviewMealSlice[] = MEAL_BUCKETS.map((meal) => {
    const e = agg.get(meal);
    return { meal, days: e ? e.days.size : 0, totalCalories: e ? round2(e.total) : 0 };
  });
  return { start, end, trend, macro, deficit, loggedDays, byMeal };
}
