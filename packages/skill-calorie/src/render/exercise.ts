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
import { FetchError } from '../fetch/errors.js';
import { CalorieRenderError } from './errors.js';

export interface ExerciseView {
  start: string;
  end: string;
  review: ExerciseReview;
  series: DaySeries[];
  activeDays: number;
  totalBurnedSeries: number;
  avgBurnedPerLoggedDay: number | null;
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
  return {
    start,
    end,
    review,
    series,
    activeDays,
    totalBurnedSeries: seriesSum(series, 'exerciseKcal'),
    avgBurnedPerLoggedDay: seriesAvg(series, 'exerciseKcal'),
  };
}
