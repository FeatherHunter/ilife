/** T8 #27 + T9 #28 + T10 #29 + #41 · 主视图 + 目标分析盘 + 身体照片 + 读链补齐 envelope 键表（T11 出口复用同一命名；仅 type-only 消费 link-core）。
 *
 * T8 四主视图 key 另立 view 域：calorie.view_home / calorie.view_diet / calorie.view_exercise / calorie.view_goal（一律 stat）。
 * T9 目标分析盘：goal_config / goal_recommend / goal_weight / goal_progress / goal_status / combined / deficit / diet_review / health / ranking / library / search（一律 stat）。
 * T10 照片视图 key 挂 calorie.photo_*（gallery/compare/viewer/gif/help/receipt 六键，就近形状）。
 */
import type { EnvelopeShape } from '@feather_wch/base-link-core';
import { calorieKey } from '../fetch/shapes.js';
import { CalorieRenderError } from './errors.js';

export const VIEW_KEYS = {
  home: calorieKey('view', 'home'),
  diet: calorieKey('view', 'diet'),
  exercise: calorieKey('view', 'exercise'),
  goal: calorieKey('view', 'goal'),
  goalConfig: calorieKey('view', 'goal_config'),
  goalRecommend: calorieKey('view', 'goal_recommend'),
  goalWeight: calorieKey('view', 'goal_weight'),
  goalProgress: calorieKey('view', 'goal_progress'),
  goalStatus: calorieKey('view', 'goal_status'),
  combined: calorieKey('view', 'combined'),
  deficit: calorieKey('view', 'deficit'),
  dietReview: calorieKey('view', 'diet_review'),
  health: calorieKey('view', 'health'),
  ranking: calorieKey('view', 'ranking'),
  library: calorieKey('view', 'library'),
  search: calorieKey('view', 'search'),
  weight: calorieKey('view', 'weight'),
  weightHistory: calorieKey('view', 'weight_history'),
  weightCompare: calorieKey('view', 'weight_compare'),
  weightReview: calorieKey('view', 'weight_review'),
  volatility: calorieKey('view', 'volatility'),
  bodyComposition: calorieKey('view', 'body_composition'),
  bodyMeasure: calorieKey('view', 'body_measure'),
  plan: calorieKey('view', 'plan'),
  planWizard: calorieKey('view', 'plan_wizard'),
  exerciseGoal: calorieKey('view', 'exercise_goal'),
  goalExpiring: calorieKey('view', 'goal_expiring'),
  goalPredict: calorieKey('view', 'goal_predict'),
  goalVsActual: calorieKey('view', 'goal_vs_actual'),
  predict: calorieKey('view', 'predict'),
  anomaly: calorieKey('view', 'anomaly'),
  contraindication: calorieKey('view', 'contraindication'),
  dedupe: calorieKey('view', 'dedupe'),
  profile: calorieKey('view', 'profile'),
} as const;
export type ViewName = keyof typeof VIEW_KEYS;

export const VIEW_SHAPES: Record<ViewName, EnvelopeShape> = {
  home: 'stat',
  diet: 'stat',
  exercise: 'stat',
  goal: 'stat',
  goalConfig: 'stat',
  goalRecommend: 'stat',
  goalWeight: 'stat',
  goalProgress: 'stat',
  goalStatus: 'stat',
  combined: 'stat',
  deficit: 'stat',
  dietReview: 'stat',
  health: 'stat',
  ranking: 'stat',
  library: 'stat',
  search: 'stat',
  weight: 'stat',
  weightHistory: 'stat',
  weightCompare: 'stat',
  weightReview: 'stat',
  volatility: 'stat',
  bodyComposition: 'stat',
  bodyMeasure: 'stat',
  plan: 'stat',
  planWizard: 'stat',
  exerciseGoal: 'stat',
  goalExpiring: 'stat',
  goalPredict: 'stat',
  goalVsActual: 'stat',
  predict: 'stat',
  anomaly: 'stat',
  contraindication: 'stat',
  dedupe: 'stat',
  profile: 'stat',
};

export function viewShapeFor(key: string): EnvelopeShape {
  const hit = (Object.entries(VIEW_KEYS) as [ViewName, string][]).find(([, v]) => v === key);
  if (!hit) throw new CalorieRenderError('bad-input', '未知视图 key：' + key);
  return VIEW_SHAPES[hit[0]];
}

/** stat 载荷守卫：metrics 须全 number（envelope 全字段前置校验，坏载荷不进渲染）。 */
export function assertStatMetrics(metrics: Record<string, unknown>): asserts metrics is Record<string, number> {
  for (const [k, v] of Object.entries(metrics)) {
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      throw new CalorieRenderError('bad-input', 'stat.metrics 值须全为有限 number：' + k);
    }
  }
}

export const PHOTO_VIEW_KEYS = {
  gallery: calorieKey('photo', 'list'),
  viewer: calorieKey('photo', 'detail'),
  compare: calorieKey('photo', 'compare'),
  receipt: calorieKey('photo', 'receipt'),
  gif: calorieKey('photo', 'gif'),
  help: calorieKey('help', 'center'),
} as const;
export type PhotoViewName = keyof typeof PHOTO_VIEW_KEYS;

export const PHOTO_VIEW_SHAPES: Record<PhotoViewName, EnvelopeShape> = {
  gallery: 'list',
  viewer: 'detail',
  compare: 'list',
  receipt: 'receipt',
  gif: 'analysis',
  help: 'list',
};

export function photoShapeFor(key: string): EnvelopeShape {
  const hit = (Object.entries(PHOTO_VIEW_KEYS) as [PhotoViewName, string][]).find(([, v]) => v === key);
  if (!hit) throw new CalorieRenderError('bad-input', '未知照片视图 key：' + key);
  return PHOTO_VIEW_SHAPES[hit[0]];
}
