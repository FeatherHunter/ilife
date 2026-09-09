/** T8 #27 · 目标分析视图数据（目标分析块 + T4 缺 payload key 的消费侧）。
 *
 * 数据源：T4 getNutritionGoal（目标四数+饮水）/ listCompletedGoals（80%-120% 完成带）
 * + T7 buildDeficitData（缺口周汇总，薄壳不自算）+ T7 buildTrendData（摄入趋势）。
 * 死规矩 2：T4 缺的 payload key 在本票内补（见 fetch/shapes.ts KEYS 新增 9 键），
 * 本视图 payload 键即用那 9 键中的 nutrition_goal / goal_history（T11 复用同一命名）。
 * 无目标行即 missing-data（目标分析无目标不返空页）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { getNutritionGoal } from '../fetch/nutritionGoal.js';
import type { NutritionGoalRow } from '../fetch/nutritionGoal.js';
import { FetchError } from '../fetch/errors.js';
import { listCompletedGoals } from '../fetch/goalHistory.js';
import type { GoalHistory } from '../fetch/goalHistory.js';
import { buildDeficitData } from '../analysis/deficit.js';
import type { DeficitData } from '../analysis/deficit.js';
import { buildTrendData } from '../analysis/trend.js';
import type { TrendData } from '../analysis/trend.js';
import { round2 } from '../kcal.js';
import { CalorieRenderError } from './errors.js';

export interface GoalView {
  start: string;
  end: string;
  nutrition: NutritionGoalRow;
  history: GoalHistory;
  deficit: DeficitData;
  trend: TrendData;
  completionPct: number | null;
}

export function buildGoalView(db: DatabaseSync, start: string, end: string): GoalView {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    throw new CalorieRenderError('bad-input', '起止日期非法: ' + start + ' ~ ' + end);
  }
  if (start > end) throw new CalorieRenderError('bad-input', 'start 不得晚于 end');
  const nutrition = getNutritionGoal(db);
  if (!nutrition) throw new CalorieRenderError('missing-data', '未设营养目标（daily_goal#1 缺失，先维护目标）');
  const history = listCompletedGoals(db, 30, end);
  // #100 · 缺口/趋势空窗的 FetchError 转 missing-data（与 goalPlate.buildGoalProgress 同约）。
  let deficit: DeficitData;
  let trend: TrendData;
  try {
    deficit = buildDeficitData(db, start, end);
    trend = buildTrendData(db, start, end);
  } catch (e) {
    if (e instanceof FetchError) throw new CalorieRenderError('missing-data', e.message);
    throw e;
  }
  const total = history.completedCount + history.incompleteCount;
  const completionPct = total ? round2((history.completedCount / total) * 100) : null;
  return { start, end, nutrition, history, deficit, trend, completionPct };
}
