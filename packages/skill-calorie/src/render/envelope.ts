/** T8 #27 + T9 #28 · 视图 envelope 键表（T11 出口复用同一命名；仅 type-only 消费 link-core）。
 *
 * T8 四主视图：calorie.view_home / calorie.view_diet / calorie.view_exercise / calorie.view_goal；
 * T9 目标分析盘：calorie.view_goal_* / combined / deficit / diet_review / health / ranking / library / search。
 * 视图 key 另立 view 域，避免与取数 key 混淆；形状一律 stat（metrics 全 number，envelope 全字段校验可过）。
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
