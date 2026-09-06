/** #41 · 体重系读链 render 数据（体重盘/历史/对比/复核/波动 v2）。
 *
 * 数据源全复用既有取数层，不自查 DB 新口径：
 * 盘=analysis/weight.weightTrend + weight.getWeightGoalInfo；
 * 历史=fetch/weight.getWeightHistory（旧 weight-history 同义）；
 * 对比=analysis/weight.weightCompare；
 * 复核=analysis/weight.weightMilestone（未设目标/无记录即阻断）；
 * 波动 v2=analysis/volatility.weightVolatilityV2（rolling/goal 双基线）。
 * 缺失阻断不返空：空窗/无目标一律 CalorieRenderError missing-data；日期非法 bad-input。
 */
import type { DatabaseSync } from 'node:sqlite';
import { getWeightGoalInfo, weightCompare, weightMilestone, weightTrend } from '../analysis/weight.js';
import type { WeightCompare, WeightMilestone, WeightTrend } from '../analysis/weight.js';
import { getWeightHistory } from '../fetch/weight.js';
import type { WeightHistory } from '../fetch/weight.js';
import { weightVolatilityV2 } from '../analysis/volatility.js';
import type { BaselineMode, VolatilityV2 } from '../analysis/volatility.js';
import type { AnalysisResult } from '../analysis/result.js';
import { FetchError } from '../fetch/errors.js';
import { CalorieRenderError } from './errors.js';

function assertDate(s: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s + 'T12:00:00Z'))) {
    throw new CalorieRenderError('bad-input', '日期非法: ' + String(s));
  }
}

function assertRange(start: string, end: string): void {
  assertDate(start);
  assertDate(end);
  if (start > end) throw new CalorieRenderError('bad-input', 'start 不得晚于 end');
}

export interface WeightDashboard {
  start: string;
  end: string;
  trend: WeightTrend;
  weightGoal: number | null;
  deadline: string | null;
  gapKg: number | null;
}

export function buildWeightDashboard(db: DatabaseSync, start: string, end: string): WeightDashboard {
  assertRange(start, end);
  let trendRes: AnalysisResult<WeightTrend>;
  try {
    trendRes = weightTrend(db, start, end);
  } catch (e) {
    if (e instanceof FetchError) throw new CalorieRenderError('missing-data', e.message);
    throw e;
  }
  if (trendRes.status !== 'ok' || !trendRes.data) {
    throw new CalorieRenderError('missing-data', trendRes.message || ('无体重记录（' + start + ' ~ ' + end + '）'));
  }
  const info = getWeightGoalInfo(db);
  const latest = trendRes.data.lastWeight;
  const gapKg = info && typeof latest === 'number' ? Math.round((latest - info.weightGoal) * 10) / 10 : null;
  return { start, end, trend: trendRes.data, weightGoal: info?.weightGoal ?? null, deadline: info?.deadline ?? null, gapKg };
}

export interface WeightHistoryView {
  range: string;
  rows: WeightHistory['rows'];
  change: WeightHistory['change'];
}

export function buildWeightHistoryView(
  db: DatabaseSync,
  opts: { days?: number; startDate?: string; endDate?: string } = {},
): WeightHistoryView {
  const { days = 30, startDate, endDate } = opts;
  try {
    if (startDate && endDate) {
      assertRange(startDate, endDate);
      const h = getWeightHistory(db, { startDate, endDate });
      return { range: h.range, rows: h.rows, change: h.change };
    }
    if (startDate && !endDate) {
      assertDate(startDate);
      const h = getWeightHistory(db, { startDate });
      return { range: h.range, rows: h.rows, change: h.change };
    }
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      throw new CalorieRenderError('bad-input', 'days 须为 1..365 整数');
    }
    const h = getWeightHistory(db, { days });
    return { range: h.range, rows: h.rows, change: h.change };
  } catch (e) {
    if (e instanceof CalorieRenderError) throw e;
    if (e instanceof FetchError) throw new CalorieRenderError('missing-data', e.message);
    throw e;
  }
}

export interface WeightCompareView {
  start: string;
  end: string;
  compareStart: string;
  compareEnd: string;
  compare: WeightCompare;
}

export function buildWeightCompareView(
  db: DatabaseSync,
  start: string,
  end: string,
  compareStart: string,
  compareEnd: string,
): WeightCompareView {
  assertRange(start, end);
  assertRange(compareStart, compareEnd);
  let res: AnalysisResult<WeightCompare>;
  try {
    res = weightCompare(db, start, end, compareStart, compareEnd);
  } catch (e) {
    if (e instanceof FetchError) throw new CalorieRenderError('bad-input', e.message);
    throw e;
  }
  if (res.status !== 'ok' || !res.data) {
    throw new CalorieRenderError('missing-data', res.message || '对比时间段内无体重记录，无法对比');
  }
  return { start, end, compareStart, compareEnd, compare: res.data };
}

export interface WeightReviewView {
  today: string;
  milestone: WeightMilestone;
}

export function buildWeightReviewView(db: DatabaseSync, today?: string): WeightReviewView {
  const t = today ?? new Date().toISOString().slice(0, 10);
  assertDate(t);
  const res = weightMilestone(db, t);
  if (res.status !== 'ok' || !res.data) {
    throw new CalorieRenderError('missing-data', res.message || '无体重目标或无体重记录');
  }
  return { today: t, milestone: res.data };
}

export interface VolatilityView {
  start: string;
  end: string;
  baselineMode: BaselineMode;
  volatility: VolatilityV2;
}

export function buildVolatilityView(
  db: DatabaseSync,
  start: string,
  end: string | null | undefined,
  baselineMode: BaselineMode = 'rolling',
): VolatilityView {
  assertDate(start);
  if (end !== null && end !== undefined) assertDate(end);
  if (baselineMode !== 'rolling' && baselineMode !== 'goal') {
    throw new CalorieRenderError('bad-input', 'baselineMode 非法（rolling/goal）：' + String(baselineMode));
  }
  let res: AnalysisResult<VolatilityV2>;
  try {
    res = weightVolatilityV2(db, start, end ?? null, baselineMode);
  } catch (e) {
    if (e instanceof FetchError) throw new CalorieRenderError('bad-input', e.message);
    throw e;
  }
  if (res.status !== 'ok' || !res.data) {
    throw new CalorieRenderError('missing-data', res.message || ('记录不足（' + start + ' ~ ' + (end ?? start) + '），需要至少2条记录'));
  }
  return { start, end: end ?? start, baselineMode, volatility: res.data };
}
