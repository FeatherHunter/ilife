/** T8 #27 + T10 #29 · 主视图 + 身体照片 envelope 键表（T11 出口复用同一命名；仅 type-only 消费 link-core）。
 *
 * T8 四主视图 key 另立 view 域，避免与取数 key 混淆：
 * calorie.view_home / calorie.view_diet / calorie.view_exercise / calorie.view_goal。
 * 形状：总览/饮食/运动/目标一律 stat（metrics 全 number，envelope 全字段校验可过）。
 * T10 照片视图 key 挂 calorie.photo_* 命名下（取数 key 同名，T11 校验同注册表）：
 * gallery/compare/viewer/gif/help/receipt 六键。形状按载荷全字段就近分配：
 * 画廊/对比= list（items 数组），单图= detail，收据= receipt，动图规划= analysis
 * （任务描述摘要），HELP= list。
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
