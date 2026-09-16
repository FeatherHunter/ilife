/** T8 #27 · 运动视图数据（exercise 核心 render 对应）。
 *
 * 数据源：T7 buildExerciseReview（T3 listWindow 行源 + MET 估算，复核摘要）
 * + T5 buildSeries（每日 exerciseKcal 数列，唯一数列源，不自查 exercise_log）。
 * 无运动记录时 buildExerciseReview 抛 FetchError，此处转 missing-data（缺失阻断不返空）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { buildSeries, seriesAvg, seriesCount, seriesSum } from '../analysis/series.js';
import type { DaySeries } from '../analysis/series.js';
import { buildExerciseReview } from '../analysis/exerciseReview.js';
import type { ExerciseReview } from '../analysis/exerciseReview.js';
import { buildExerciseGoalView } from '../render/planPlate.js';
import { FetchError } from '../fetch/errors.js';
import { CalorieRenderError } from '../render/errors.js';

export interface ExerciseView {
  start: string;
  end: string;
  review: ExerciseReview;
  series: DaySeries[];
  activeDays: number;
  totalBurnedSeries: number;
  avgBurnedPerLoggedDay: number | null;
  /** #389 · 目标对照位（读目标公开接口 `render/planPlate.ts::buildExerciseGoalView`，不重写目标 SQL 与算式）。
   *  可选＝存量直构造（旧探针未带目标键）仍逐字节不变；取数链恒给显式值（有目标给数、无目标给 null）。 */
  dailyGoal?: number | null;
  goalTotal?: number | null;
  goalPct?: number | null;
  goalGap?: number | null;
  goalAchieved?: boolean | null;
}

export function buildExerciseView(db: DatabaseSync, start: string, end: string, bodyWeightKg = 70): ExerciseView {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    throw new CalorieRenderError('bad-input', '起止日期非法: ' + start + ' ~ ' + end);
  }
  if (start > end) throw new CalorieRenderError('bad-input', 'start 不得晚于 end');
  let review: ExerciseReview;
  try {
    review = buildExerciseReview(db, start, end, bodyWeightKg);
  } catch (e) {
    if (e instanceof FetchError) throw new CalorieRenderError('missing-data', e.message);
    throw e;
  }
  const series = buildSeries(db, start, end);
  const activeDays = seriesCount(series, 'exerciseKcal');
  /* #389 · 目标对照取数：经目标公开接口拿每日目标＋完成度＋差额（同一口径同一算式，不另写 SELECT）。
   *  缺失目标（未设／非法）即显式 null（汇总页走未设指引）；窗内无运动已在上一步抛缺失阻断，到此必有复核。 */
  let dailyGoal: number | null = null;
  let goalTotal: number | null = null;
  let goalPct: number | null = null;
  let goalGap: number | null = null;
  let goalAchieved: boolean | null = null;
  try {
    const g = buildExerciseGoalView(db, start, end);
    dailyGoal = g.dailyGoal;
    goalTotal = g.goalTotal;
    goalPct = g.pct;
    goalGap = g.gap;
    goalAchieved = g.achieved;
  } catch (e) {
    if (e instanceof CalorieRenderError && e.code === 'missing-data') {
      dailyGoal = null; goalTotal = null; goalPct = null; goalGap = null; goalAchieved = null;
    } else throw e;
  }
  return {
    start,
    end,
    review,
    series,
    activeDays,
    totalBurnedSeries: seriesSum(series, 'exerciseKcal'),
    avgBurnedPerLoggedDay: seriesAvg(series, 'exerciseKcal'),
    dailyGoal, goalTotal, goalPct, goalGap, goalAchieved,
  };
}
