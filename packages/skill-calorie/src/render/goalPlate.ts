/** T9 #28 · 目标盘数据（render_goal_* 对应：config/recommend/weight/progress/status）。
 *
 * 数据源全 T4：getNutritionGoal（目标四数+饮水+体重+截止）/ recommendNutritionGoal /
 * recommendWaterGoal / getPausedState-pause/resume / listCompletedGoals（80%-120% 完成带）。
 * 趋势缺口为 T7 薄壳（buildDeficitData/buildTrendData，不自算）；数列唯一源 T5
 * buildSeries（seriesDelta/seriesCount，不自查 food_log/weight_log）。
 * 无目标行即 missing-data（目标分析无目标不返空页，与 T8 goal 同约）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { getNutritionGoal, recommendNutritionGoal, recommendWaterGoal } from '../fetch/nutritionGoal.js';
import type { NutriProfile, NutritionGoalRow, RecommendResult } from '../fetch/nutritionGoal.js';
import { getPausedState } from '../fetch/goal.js';
import { listCompletedGoals } from '../fetch/goalHistory.js';
import type { GoalHistory } from '../fetch/goalHistory.js';
import { buildDeficitData } from '../analysis/deficit.js';
import type { DeficitData } from '../analysis/deficit.js';
import { buildTrendData } from '../analysis/trend.js';
import type { TrendData } from '../analysis/trend.js';
import { buildSeries, seriesCount, seriesDelta } from '../analysis/series.js';
import { FetchError } from '../fetch/errors.js';
import { round2 } from '../kcal.js';
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

export interface GoalConfig {
  nutrition: NutritionGoalRow;
  paused: boolean;
  pausedAt: string | null;
  diffKcal: number;
  consistent: boolean;
}

/** 目标配置盘（goal_config）：当前四数+饮水+暂停态，自洽 diff 回传。 */
export function buildGoalConfig(db: DatabaseSync): GoalConfig {
  const nutrition = getNutritionGoal(db);
  if (!nutrition) throw new CalorieRenderError('missing-data', '未设营养目标（daily_goal#1 缺失，先维护目标）');
  const paused = getPausedState(db);
  const pro = nutrition.protein_goal ?? 0;
  const cb = nutrition.carbs_goal ?? 0;
  const fat = nutrition.fat_goal ?? 0;
  const diffKcal = pro * 4 + cb * 4 + fat * 9 - nutrition.calorie_goal;
  return { nutrition, paused: paused.paused, pausedAt: paused.pausedAt, diffKcal, consistent: Math.abs(diffKcal) <= 50 };
}

export interface GoalRecommend {
  profile: NutriProfile;
  recommend: RecommendResult;
  water: { weightKg: number; season: '夏' | '冬'; mlPerKg: number; recommendedWaterMl: number; oldWaterGoal: number | null; basis: string };
}

const PROFILES: readonly string[] = ['cut', 'maintain', 'bulk'];

/** 目标推荐盘（goal_recommend）：纯算式推荐 + 饮水推荐，恒有值（缺项记 missing，不抛）。 */
export function buildGoalRecommend(db: DatabaseSync, profile: string = 'cut'): GoalRecommend {
  if (!PROFILES.includes(profile)) throw new CalorieRenderError('bad-input', 'profile 非法（cut/maintain/bulk）: ' + String(profile));
  const p = profile as NutriProfile;
  const recommend = recommendNutritionGoal(db, { profile: p });
  const water = recommendWaterGoal(db, {});
  return { profile: p, recommend, water };
}

export interface GoalWeight {
  start: string;
  end: string;
  weightGoal: number | null;
  deadline: string | null;
  latestKg: number | null;
  deltaKg: number | null;
  loggedDays: number;
}

/** 体重目标盘（goal_weight）：目标体重+截止 vs T5 series 体重数列净变化。 */
export function buildGoalWeight(db: DatabaseSync, start: string, end: string): GoalWeight {
  assertRange(start, end);
  const nutrition = getNutritionGoal(db);
  const series = buildSeries(db, start, end);
  const loggedDays = seriesCount(series, 'weightKg');
  if ((nutrition?.weight_goal === null || nutrition?.weight_goal === undefined) && loggedDays === 0) {
    throw new CalorieRenderError('missing-data', '无体重目标且窗口无体重记录（' + start + ' ~ ' + end + '）');
  }
  let latestKg: number | null = null;
  for (let i = series.length - 1; i >= 0; i--) {
    const v = (series[i] as { weightKg: number | null }).weightKg;
    if (typeof v === 'number') {
      latestKg = v;
      break;
    }
  }
  return {
    start,
    end,
    weightGoal: nutrition?.weight_goal ?? null,
    deadline: nutrition?.goal_deadline ?? null,
    latestKg,
    deltaKg: seriesDelta(series, 'weightKg'),
    loggedDays,
  };
}

export interface GoalProgress {
  start: string;
  end: string;
  nutrition: NutritionGoalRow;
  history: GoalHistory;
  deficit: DeficitData;
  trend: TrendData;
  completionPct: number | null;
}

/** 目标进度盘（goal_progress）：T4 目标+历史完成带 + T7 缺口趋势，completionPct 同 T8 口径。 */
export function buildGoalProgress(db: DatabaseSync, start: string, end: string, historyDays = 30): GoalProgress {
  assertRange(start, end);
  if (!Number.isInteger(historyDays) || historyDays < 1 || historyDays > 365) {
    throw new CalorieRenderError('bad-input', 'historyDays 须为 1..365 整数');
  }
  const nutrition = getNutritionGoal(db);
  if (!nutrition) throw new CalorieRenderError('missing-data', '未设营养目标（daily_goal#1 缺失，先维护目标）');
  let history: GoalHistory;
  try {
    history = listCompletedGoals(db, historyDays, end);
  } catch (e) {
    if (e instanceof FetchError) throw new CalorieRenderError('missing-data', e.message);
    throw e;
  }
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
  return { start, end, nutrition, history, deficit, trend, completionPct: total ? round2((history.completedCount / total) * 100) : null };
}

export interface GoalStatus {
  paused: boolean;
  pausedAt: string | null;
  nutrition: NutritionGoalRow;
}

/** 目标状态盘（goal_status）：暂停/重启态，无目标行即 missing-data。 */
export function buildGoalStatus(db: DatabaseSync): GoalStatus {
  const nutrition = getNutritionGoal(db);
  if (!nutrition) throw new CalorieRenderError('missing-data', '未设营养目标（daily_goal#1 缺失，先维护目标）');
  const paused = getPausedState(db);
  return { paused: paused.paused, pausedAt: paused.pausedAt, nutrition };
}
