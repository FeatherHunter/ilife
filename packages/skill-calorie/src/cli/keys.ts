/** T11 #30 + #41 · cmd_read 组合键表（registry 合法命名，点式分隔；内部 VIEW_KEYS 下划线键仅渲染层复用，不直接登记）。
 * #40 追加 35 写键（CALORIE_WRITE_COMBOS，一律 receipt 形）：单条 CRUD 可执行入口，命名对照旧 CLI；
 * CALORIE_COMBOS 为读 42 + 写 35 全量注册表（skilllink 登记与 HELP 注入的上游）。
 *
 * 背景：VIEW_KEYS/PHOTO_VIEW_KEYS 用 calorie.view_home / calorie.photo_list（下划线），
 * 过不了 link-core registry（KEY_RE 只许 [a-z0-9-.]，下划线非法）。T11 出口复用“同一语义”，
 * 分隔符下划线→点（calorie.view.home），registry 合法，skilllink 登记可用；内部渲染仍走原 VIEW_KEYS。
 * 仅 type-only 消费 link-core（零运行时依赖，沿 T8 前例）；envelope 手工装配，字段对齐 link-core 0.1.0。
 * 缺失阻断不返空：未知键抛，调用方 exit 3。
 */
import type { EnvelopeShape } from 'base-link-core';
import { CalorieRenderError } from '../render/errors.js';

export const ENVELOPE_VERSION = '0.1.0' as const;
export const CALORIE_SKILL = 'calorie' as const;

/** registry 合法键正则（与 base-link-core registry.KEY_RE 同值，本地拷贝不运行时 import）。 */
export const COMBO_KEY_RE = /^[a-z][a-z0-9-]*\.[a-z0-9][a-z0-9-.]*$/;

export const CALORIE_WRITE_COMBOS = {
  'calorie.diet.add': { shape: 'receipt' as EnvelopeShape, title: '记一餐' },
  'calorie.diet.update': { shape: 'receipt' as EnvelopeShape, title: '改饮食' },
  'calorie.diet.remove': { shape: 'receipt' as EnvelopeShape, title: '删饮食' },
  'calorie.diet.batch': { shape: 'receipt' as EnvelopeShape, title: '批量记饮食' },
  'calorie.diet.copy': { shape: 'receipt' as EnvelopeShape, title: '复制饮食' },
  'calorie.diet.update-by-date': { shape: 'receipt' as EnvelopeShape, title: '按日改饮食' },
  'calorie.diet.remove-by-date': { shape: 'receipt' as EnvelopeShape, title: '按日删饮食' },
  'calorie.diet.remove-by-range': { shape: 'receipt' as EnvelopeShape, title: '按范围删饮食' },
  'calorie.diet.remove-by-type': { shape: 'receipt' as EnvelopeShape, title: '按餐别删饮食' },
  'calorie.water.log': { shape: 'receipt' as EnvelopeShape, title: '记喝水' },
  'calorie.weight.log': { shape: 'receipt' as EnvelopeShape, title: '记体重' },
  'calorie.weight.update': { shape: 'receipt' as EnvelopeShape, title: '改体重' },
  'calorie.weight.remove': { shape: 'receipt' as EnvelopeShape, title: '删体重' },
  'calorie.weight.batch': { shape: 'receipt' as EnvelopeShape, title: '批量记体重' },
  'calorie.exercise.add': { shape: 'receipt' as EnvelopeShape, title: '记运动' },
  'calorie.exercise.update': { shape: 'receipt' as EnvelopeShape, title: '改运动' },
  'calorie.exercise.remove': { shape: 'receipt' as EnvelopeShape, title: '删运动' },
  'calorie.photo.add': { shape: 'receipt' as EnvelopeShape, title: '记身材照' },
  'calorie.photo.remove': { shape: 'receipt' as EnvelopeShape, title: '删身材照' },
  'calorie.photo.tag': { shape: 'receipt' as EnvelopeShape, title: '改照片标签' },
  'calorie.product.add': { shape: 'receipt' as EnvelopeShape, title: '存食品' },
  'calorie.product.update': { shape: 'receipt' as EnvelopeShape, title: '改食品' },
  'calorie.product.deprecate': { shape: 'receipt' as EnvelopeShape, title: '下架食品' },
  'calorie.profile.set': { shape: 'receipt' as EnvelopeShape, title: '设置档案' },
  'calorie.profile.activity': { shape: 'receipt' as EnvelopeShape, title: '设活动量' },
  'calorie.profile.update': { shape: 'receipt' as EnvelopeShape, title: '改档案' },
  'calorie.goal.set': { shape: 'receipt' as EnvelopeShape, title: '定营养目标' },
  'calorie.goal.water': { shape: 'receipt' as EnvelopeShape, title: '定饮水目标' },
  'calorie.goal.weight': { shape: 'receipt' as EnvelopeShape, title: '定体重目标' },
  'calorie.goal.pause': { shape: 'receipt' as EnvelopeShape, title: '暂停目标' },
  'calorie.goal.resume': { shape: 'receipt' as EnvelopeShape, title: '重启目标' },
  'calorie.body.composition-add': { shape: 'receipt' as EnvelopeShape, title: '记体脂' },
  'calorie.body.composition-remove': { shape: 'receipt' as EnvelopeShape, title: '删体脂' },
  'calorie.body.measure-add': { shape: 'receipt' as EnvelopeShape, title: '记围度' },
  'calorie.body.measure-remove': { shape: 'receipt' as EnvelopeShape, title: '删围度' },
} as const;

export type CalorieWriteKey = keyof typeof CALORIE_WRITE_COMBOS;

export function isCalorieWriteKey(key: string): key is CalorieWriteKey {
  return Object.prototype.hasOwnProperty.call(CALORIE_WRITE_COMBOS, key);
}

export const CALORIE_COMBOS = {
  ...(CALORIE_WRITE_COMBOS as unknown as Record<string, { shape: EnvelopeShape; title: string }>),
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
  'calorie.view.weight': { shape: 'stat' as EnvelopeShape, title: '体重盘' },
  'calorie.view.weight-history': { shape: 'stat' as EnvelopeShape, title: '体重历史' },
  'calorie.view.weight-compare': { shape: 'stat' as EnvelopeShape, title: '体重对比' },
  'calorie.view.weight-review': { shape: 'stat' as EnvelopeShape, title: '体重复核' },
  'calorie.view.volatility': { shape: 'stat' as EnvelopeShape, title: '波动分析' },
  'calorie.view.body-composition': { shape: 'stat' as EnvelopeShape, title: '体成分看' },
  'calorie.view.body-measure': { shape: 'stat' as EnvelopeShape, title: '围度看' },
  'calorie.view.plan': { shape: 'stat' as EnvelopeShape, title: '训练计划看' },
  'calorie.view.plan-wizard': { shape: 'stat' as EnvelopeShape, title: '构建向导' },
  'calorie.view.exercise-goal': { shape: 'stat' as EnvelopeShape, title: '运动目标视图' },
  'calorie.view.goal-expiring': { shape: 'stat' as EnvelopeShape, title: '即将到期目标' },
  'calorie.view.goal-predict': { shape: 'stat' as EnvelopeShape, title: '目标预测达成' },
  'calorie.view.goal-vs-actual': { shape: 'stat' as EnvelopeShape, title: '目标对比实际' },
  'calorie.view.predict': { shape: 'stat' as EnvelopeShape, title: '体重预测' },
  'calorie.view.anomaly': { shape: 'stat' as EnvelopeShape, title: '异常诊断' },
  'calorie.view.contraindication': { shape: 'stat' as EnvelopeShape, title: '禁忌扫描' },
  'calorie.view.dedupe': { shape: 'stat' as EnvelopeShape, title: '去重报告' },
  'calorie.view.profile': { shape: 'stat' as EnvelopeShape, title: '档案视图' },
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
