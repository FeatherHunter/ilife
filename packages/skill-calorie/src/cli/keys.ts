/** T11 #30 · cmd_read 组合键表（registry 合法命名，点式分隔；内部 VIEW_KEYS 下划线键仅渲染层复用，不直接登记）。
 *
 * 背景：VIEW_KEYS/PHOTO_VIEW_KEYS 用 calorie.view_home / calorie.photo_list（下划线），
 * 过不了 link-core registry（KEY_RE 只许 [a-z0-9-.]，下划线非法）。T11 出口复用“同一语义”，
 * 分隔符下划线→点（calorie.view.home），registry 合法，skilllink 登记可用；内部渲染仍走原 VIEW_KEYS。
 * 仅 type-only 消费 link-core（零运行时依赖，沿 T8 前例）；envelope 手工装配，字段对齐 link-core 0.1.0。
 * 缺失阻断不返空：未知键抛，调用方 exit 3。
 */
import type { EnvelopeShape } from '@feather_wch/base-link-core';
import { CalorieRenderError } from '../render/errors.js';

export const ENVELOPE_VERSION = '0.1.0' as const;
export const CALORIE_SKILL = 'calorie' as const;

/** registry 合法键正则（与 base-link-core registry.KEY_RE 同值，本地拷贝不运行时 import）。 */
export const COMBO_KEY_RE = /^[a-z][a-z0-9-]*\.[a-z0-9][a-z0-9-.]*$/;

export const CALORIE_COMBOS = {
  'calorie.today': { shape: 'list' as EnvelopeShape, title: '今日饮食' },
  'calorie.view.home': { shape: 'stat' as EnvelopeShape, title: '今日总览' },
  'calorie.view.diet': { shape: 'stat' as EnvelopeShape, title: '饮食总览' },
  'calorie.view.exercise': { shape: 'stat' as EnvelopeShape, title: '运动总览' },
  'calorie.view.goal': { shape: 'stat' as EnvelopeShape, title: '目标分析' },
  'calorie.view.goal-config': { shape: 'stat' as EnvelopeShape, title: '目标配置' },
  'calorie.view.goal-recommend': { shape: 'stat' as EnvelopeShape, title: '目标推荐' },
  'calorie.view.goal-weight': { shape: 'stat' as EnvelopeShape, title: '体重目标' },
  'calorie.view.goal-progress': { shape: 'stat' as EnvelopeShape, title: '目标进度' },
  'calorie.view.goal-status': { shape: 'stat' as EnvelopeShape, title: '目标状态' },
  'calorie.view.combined': { shape: 'stat' as EnvelopeShape, title: '组合分析' },
  'calorie.view.deficit': { shape: 'stat' as EnvelopeShape, title: '热量缺口' },
  'calorie.view.diet-review': { shape: 'stat' as EnvelopeShape, title: '饮食复盘' },
  'calorie.view.health': { shape: 'stat' as EnvelopeShape, title: '健康盘' },
  'calorie.view.ranking': { shape: 'stat' as EnvelopeShape, title: '食品排行' },
  'calorie.view.library': { shape: 'stat' as EnvelopeShape, title: '食品库' },
  'calorie.view.search': { shape: 'stat' as EnvelopeShape, title: '查食品' },
  'calorie.photo.list': { shape: 'list' as EnvelopeShape, title: '看身材照' },
  'calorie.photo.detail': { shape: 'detail' as EnvelopeShape, title: '查身材照' },
  'calorie.photo.compare': { shape: 'list' as EnvelopeShape, title: '对比照片' },
  'calorie.photo.gif': { shape: 'analysis' as EnvelopeShape, title: '生成GIF' },
  'calorie.help.center': { shape: 'list' as EnvelopeShape, title: '身材照HELP' },
  'calorie.help.lookup': { shape: 'list' as EnvelopeShape, title: '唤醒词HELP' },
  'calorie.history': { shape: 'list' as EnvelopeShape, title: '热量历史' },
} as const;

export type CalorieComboKey = keyof typeof CALORIE_COMBOS;

export function calorieShapeFor(key: string): EnvelopeShape {
  if (!COMBO_KEY_RE.test(key)) {
    throw new CalorieRenderError('bad-input', '非法 registry key：' + JSON.stringify(key) + '（形如 skill.combo）');
  }
  const hit = (CALORIE_COMBOS as Record<string, { shape: EnvelopeShape }>)[key];
  if (!hit) throw new CalorieRenderError('bad-input', '未知 calorie key：' + key);
  return hit.shape;
}

export function assertCalorieKey(key: string): asserts key is CalorieComboKey {
  calorieShapeFor(key);
}
