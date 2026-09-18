/** T8 #27 · 饮食视图数据（diet_overview + meal_distribution 对应）。
 *
 * 死规矩 1（#717 批① 收口）：餐别窗口、归属、四桶**只有一处定义**，住共用位
 * `shared/meal.ts`——本文件不硬编码任何小时区间，也不自己写归桶分支：
 * 单条归类走 `inferMealType`、桶走 `mealBucketOf`、四桶的名字走 `MEAL_BUCKETS`。
 * 死规矩 3：日数列用 T5 series（buildSeries/seriesSum/seriesAvg），不自造 SUM。
 * 饮食总览趋势段用 T7 buildTrendData（同样以 series 为源）。空窗即 missing-data。
 */
import type { DatabaseSync } from 'node:sqlite';
import { listMeals } from '../fetch/diet.js';
import { MEAL_BUCKETS, inferMealType, mealBucketOf } from '../shared/meal.js';
import type { MealBucket } from '../shared/meal.js';
import { buildSeries, seriesAvg, seriesCount, seriesSum } from '../analysis/series.js';
import type { DaySeries } from '../analysis/series.js';
import { buildTrendData } from '../analysis/trend.js';
import type { TrendData } from '../analysis/trend.js';
import { round2 } from '../kcal.js';
import { CalorieRenderError } from './errors.js';

/** 四桶分布（触发词 meal_dist_all 口径）：早餐/午餐/晚餐/加餐（加餐=下午茶+夜宵）。
 *  #717 批①·餐别归一：分组逻辑（`bucketOf`／`assertMealWindows`）已删，改走共用位；
 *  `MEAL_BUCKETS`／`MealBucket` 两个对外名字按原样转出（`render/index.ts` 的出口面一个不少）。 */
export { MEAL_BUCKETS };
export type { MealBucket };

export interface MealSlice {
  meal: MealBucket;
  count: number;
  calories: number;
  pct: number;
}

export interface MealDistribution {
  date: string;
  totalCalories: number;
  slices: MealSlice[];
  /** 明细 5 类（早/午/下午茶/晚/夜宵）+ 加餐聚合，供模板展开。 */
  detail: { meal: string; count: number; calories: number }[];
}

/** C4 #43 · 空日零分布（窗内有数但尾日无记录时回零，不掀整窗 missing）。 */
export function zeroMealDistribution(date: string): MealDistribution {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new CalorieRenderError('bad-input', '日期非法: ' + date);
  return {
    date,
    totalCalories: 0,
    slices: MEAL_BUCKETS.map((meal) => ({ meal, count: 0, calories: 0, pct: 0 })),
    detail: [],
  };
}

export function buildMealDistribution(db: DatabaseSync, date: string): MealDistribution {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new CalorieRenderError('bad-input', '日期非法: ' + date);
  const rows = listMeals(db, date).filter((r) => r.food_name !== '💧水');
  // 日总量以 T5 series 为准（死规矩 3），分组小计仅做桶内累加，分母不自造。
  const series = buildSeries(db, date, date);
  const totalCalories = series[0]?.calories ?? 0;
  if (rows.length === 0 || totalCalories === 0) {
    throw new CalorieRenderError('missing-data', '无饮食记录（' + date + '）');
  }
  const byBucket = new Map<string, { count: number; calories: number }>();
  const byDetail = new Map<string, { count: number; calories: number }>();
  for (const r of rows) {
    const b = mealBucketOf(r.time);
    if (b === null) continue;
    const e = byBucket.get(b) ?? { count: 0, calories: 0 };
    e.count += 1;
    e.calories += r.calories;
    byBucket.set(b, e);
    const dm = inferMealType(String(r.time ?? ''));
    const d = byDetail.get(dm) ?? { count: 0, calories: 0 };
    d.count += 1;
    d.calories += r.calories;
    byDetail.set(dm, d);
  }
  const total = totalCalories;
  const slices: MealSlice[] = MEAL_BUCKETS.map((meal) => {
    const e = byBucket.get(meal) ?? { count: 0, calories: 0 };
    return { meal, count: e.count, calories: round2(e.calories), pct: total ? round2((e.calories / total) * 100) : 0 };
  });
  const detail = [...byDetail.entries()].map(([meal, e]) => ({ meal, count: e.count, calories: round2(e.calories) }));
  return { date, totalCalories, slices, detail };
}

export interface DietOverview {
  start: string;
  end: string;
  days: number;
  loggedDays: number;
  totalCalories: number;
  avgCalories: number | null;
  calorieGoal: number;
  trend: TrendData;
  series: DaySeries[];
}

export function buildDietOverview(db: DatabaseSync, start: string, end: string): DietOverview {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    throw new CalorieRenderError('bad-input', '起止日期非法: ' + start + ' ~ ' + end);
  }
  if (start > end) throw new CalorieRenderError('bad-input', 'start 不得晚于 end');
  const series = buildSeries(db, start, end);
  const loggedDays = seriesCount(series, 'calories');
  if (loggedDays === 0) throw new CalorieRenderError('missing-data', '无饮食记录（' + start + ' ~ ' + end + '）');
  const trend = buildTrendData(db, start, end);
  return {
    start,
    end,
    days: series.length,
    loggedDays,
    totalCalories: seriesSum(series, 'calories'),
    avgCalories: seriesAvg(series, 'calories'),
    calorieGoal: series[0]?.calorieGoal ?? 1800,
    trend,
    series,
  };
}
