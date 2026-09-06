/** T8 #27 · 主视图 envelope 键表（T11 出口复用同一命名；仅 type-only 消费 link-core）。
 *
 * 四主视图 key 挂在 T4 补齐的 KEYS 命名下？不：视图 key 另立 view 域，避免与取数 key 混淆：
 * calorie.view_home / calorie.view_diet / calorie.view_exercise / calorie.view_goal。
 * 形状：总览/饮食/运动/目标一律 stat（metrics 全 number，envelope 全字段校验可过）。
 */
import type { EnvelopeShape } from '@feather_wch/base-link-core';
import { calorieKey } from '../fetch/shapes.js';
import { CalorieRenderError } from './errors.js';

export const VIEW_KEYS = {
  home: calorieKey('view', 'home'),
  diet: calorieKey('view', 'diet'),
  exercise: calorieKey('view', 'exercise'),
  goal: calorieKey('view', 'goal'),
} as const;
export type ViewName = keyof typeof VIEW_KEYS;

export const VIEW_SHAPES: Record<ViewName, EnvelopeShape> = {
  home: 'stat',
  diet: 'stat',
  exercise: 'stat',
  goal: 'stat',
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
