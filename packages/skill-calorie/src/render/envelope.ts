/** T10 #29 · 身体照片 envelope 键表（T11 出口复用同一命名；仅 type-only 消费 link-core）。
 *
 * 照片视图 key 挂 calorie.photo_* 命名下（取数 key 同名，T11 校验同注册表）：
 * gallery/compare/viewer/gif/help/receipt 六键。形状按载荷全字段就近分配：
 * 画廊/对比= list（items 数组），单图= detail，收据= receipt，动图规划= analysis
 * （任务描述摘要），HELP= list。
 */
import type { EnvelopeShape } from '@feather_wch/base-link-core';
import { calorieKey } from '../fetch/shapes.js';
import { CalorieRenderError } from './errors.js';

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
