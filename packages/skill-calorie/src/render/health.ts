/** T9 #28 · 健康盘数据（health_dashboard 对应）。
 *
 * 数据源 T5 healthDashboard（体重/热量/运动/缺口四维独立容错，任一 error 即 warn）；
 * 数列侧唯一源 T5 buildSeries（loggedDays/avgIntake/avgDeficit 用 seriesCount/seriesAvg，
 * 不自查 food_log）。四维全空即 missing-data（缺失阻断不返空）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { healthDashboard } from '../analysis/dashboard.js';
import type { HealthDashboard } from '../analysis/dashboard.js';
import type { AnalysisResult } from '../analysis/result.js';
import { buildSeries, seriesAvg, seriesCount } from '../analysis/series.js';
import type { DaySeries } from '../analysis/series.js';
import { FetchError } from '../fetch/errors.js';
import { CalorieRenderError } from './errors.js';

export interface HealthPlate {
  start: string;
  end: string;
  dashboard: AnalysisResult<HealthDashboard>;
  series: DaySeries[];
  loggedDays: number;
  avgIntake: number | null;
  avgDeficit: number | null;
}

function assertDate(s: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s + 'T12:00:00Z'))) {
    throw new CalorieRenderError('bad-input', '日期非法: ' + String(s));
  }
}

export function buildHealthPlate(db: DatabaseSync, start: string, end: string): HealthPlate {
  assertDate(start);
  assertDate(end);
  if (start > end) throw new CalorieRenderError('bad-input', 'start 不得晚于 end');
  let dashboard: AnalysisResult<HealthDashboard>;
  try {
    dashboard = healthDashboard(db, start, end);
  } catch (e) {
    if (e instanceof FetchError) throw new CalorieRenderError('missing-data', e.message);
    throw e;
  }
  const series = buildSeries(db, start, end);
  const loggedDays = seriesCount(series, 'calories');
  const d = dashboard.data;
  const allNull = !d || (d.weight === null && d.calorie === null && d.exercise === null && d.deficit === null);
  if (allNull && loggedDays === 0) {
    throw new CalorieRenderError('missing-data', '无健康数据（' + start + ' ~ ' + end + '）');
  }
  return {
    start,
    end,
    dashboard,
    series,
    loggedDays,
    avgIntake: seriesAvg(series, 'calories'),
    avgDeficit: seriesAvg(series, 'deficit'),
  };
}
