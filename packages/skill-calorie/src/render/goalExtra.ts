/** #41 · 目标扩展读链 render 数据（goal 11 模式之 expiring/predict/vs_actual）。
 *
 * 旧口径对照：scripts/render_goal_progress.py --mode today/week/weight/expiring/predict/vs_actual
 * 中 today/week/weight 已由既有 goalPlate（config/recommend/weight/progress/status）承接，
 * 本票只补三缺口模式。数据源全复用既有层：
 * expiring=daily_goal.goal_deadline + weightGoalInfo（无截止即 missing）；
 * predict=analysis/series.buildSeries + analysis/simulate.weightTarget（<14 天降级转 missing）；
 * vs_actual=fetch/goalHistory.listCompletedGoals + analysis/trend.buildTrendData。
 */
import type { DatabaseSync } from 'node:sqlite';
import { getNutritionGoal } from '../fetch/nutritionGoal.js';
import { listCompletedGoals } from '../fetch/goalHistory.js';
import type { GoalHistory } from '../fetch/goalHistory.js';
import { buildSeries } from '../analysis/series.js';
import { weightTarget } from '../analysis/simulate.js';
import { buildTrendData } from '../analysis/trend.js';
import type { TrendData } from '../analysis/trend.js';
import { getWeightGoalInfo } from '../analysis/weight.js';
import { FetchError } from '../fetch/errors.js';
import { CalorieRenderError } from './errors.js';

function assertDate(s: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s + 'T12:00:00Z'))) {
    throw new CalorieRenderError('bad-input', '日期非法: ' + String(s));
  }
}

export interface GoalExpiringView {
  deadline: string;
  daysLeft: number;
  withinDays: number;
  expiring: boolean;
  weightGoal: number | null;
  calorieGoal: number | null;
}

export function buildGoalExpiringView(db: DatabaseSync, withinDays = 14, today?: string): GoalExpiringView {
  if (!Number.isInteger(withinDays) || withinDays < 1 || withinDays > 365) {
    throw new CalorieRenderError('bad-input', 'withinDays 须为 1..365 整数');
  }
  const t = today ?? new Date().toISOString().slice(0, 10);
  assertDate(t);
  const nutrition = getNutritionGoal(db);
  const info = getWeightGoalInfo(db, t);
  const deadline = info?.deadline ?? null;
  if (!deadline) throw new CalorieRenderError('missing-data', '无到期目标（daily_goal.goal_deadline 缺失）');
  assertDate(deadline);
  const daysLeft = Math.round((Date.parse(deadline + 'T12:00:00Z') - Date.parse(t + 'T12:00:00Z')) / 86400000);
  return {
    deadline,
    daysLeft,
    withinDays,
    expiring: daysLeft >= 0 && daysLeft <= withinDays,
    weightGoal: info?.weightGoal ?? null,
    calorieGoal: nutrition?.calorie_goal ?? null,
  };
}

export interface GoalPredictView {
  start: string;
  end: string;
  targetKg: number;
  current: number;
  eta: string;
  daysLeft: number;
  ratePerWeek: number;
  feasible: boolean;
}

export function buildGoalPredictView(db: DatabaseSync, start: string, end: string): GoalPredictView {
  assertDate(start);
  assertDate(end);
  if (start > end) throw new CalorieRenderError('bad-input', 'start 不得晚于 end');
  const nutrition = getNutritionGoal(db);
  const targetKg = nutrition?.weight_goal ?? null;
  if (targetKg === null || targetKg === undefined) {
    throw new CalorieRenderError('missing-data', '无体重目标（先定体重目标）');
  }
  const series = buildSeries(db, start, end);
  const fc = weightTarget(series, targetKg, '目标预测达成');
  if (fc.degraded || fc.current === undefined || fc.eta === undefined || fc.daysLeft === undefined || fc.ratePerWeek === undefined) {
    throw new CalorieRenderError('missing-data', fc.degradeMsg || '数据不足，无法预测目标达成（需≥14 天体重记录）');
  }
  return {
    start, end, targetKg,
    current: fc.current as number,
    eta: fc.eta as string,
    daysLeft: fc.daysLeft as number,
    ratePerWeek: fc.ratePerWeek as number,
    feasible: (fc.feasible ?? false) as boolean,
  };
}

export interface GoalVsActualView {
  start: string;
  end: string;
  calorieGoal: number | null;
  completedCount: number;
  incompleteCount: number;
  completionPct: number | null;
  trendAvg: number;
  history: GoalHistory;
  trend: TrendData;
}

export function buildGoalVsActualView(db: DatabaseSync, start: string, end: string, historyDays = 30): GoalVsActualView {
  assertDate(start);
  assertDate(end);
  if (start > end) throw new CalorieRenderError('bad-input', 'start 不得晚于 end');
  if (!Number.isInteger(historyDays) || historyDays < 1 || historyDays > 365) {
    throw new CalorieRenderError('bad-input', 'historyDays 须为 1..365 整数');
  }
  const nutrition = getNutritionGoal(db);
  if (!nutrition) throw new CalorieRenderError('missing-data', '未设营养目标（daily_goal#1 缺失，先维护目标）');
  let history: GoalHistory;
  let trend: TrendData;
  try {
    history = listCompletedGoals(db, historyDays, end);
    trend = buildTrendData(db, start, end);
  } catch (e) {
    if (e instanceof FetchError) throw new CalorieRenderError('missing-data', e.message);
    throw e;
  }
  const total = history.completedCount + history.incompleteCount;
  return {
    start, end,
    calorieGoal: history.calorieGoal,
    completedCount: history.completedCount,
    incompleteCount: history.incompleteCount,
    completionPct: total ? Math.round((history.completedCount / total) * 10000) / 100 : null,
    trendAvg: trend.summary.avg,
    history,
    trend,
  };
}
