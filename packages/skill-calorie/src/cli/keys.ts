/** 本文件由 `scripts/gen-cli.mjs` 生成，勿手改（`pnpm gen` 重生成，`pnpm gen:check` 验真）。
 *
 * registry 合法键表：写 54 ＋ 读 85 ＝ 139 条。
 * 一条命令的**事实**住它自己的能力目录（`src/<能力>/commands.ts`）；本文件只是那处的派生，不手改。
 *
 * 键序＝写键（键名升序）在前、读键（键名升序）在后（确定性排序，见生成器）。
 * 背景照旧：VIEW_KEYS/PHOTO_VIEW_KEYS 用下划线键，过不了 link-core registry（KEY_RE 只许
 * [a-z0-9-.]），T11 出口把下划线改成点（calorie.view.home）复用同一语义。
 * 仅 type-only 消费 link-core（零运行时依赖）；envelope 手工装配，字段对齐 link-core 0.1.0。
 * 缺失阻断不返空：未知键抛，调用方 exit 3。
 */
import type { EnvelopeShape } from 'base-link-core';
import { CalorieRenderError } from '../render/errors.js';

export const ENVELOPE_VERSION = '0.1.0' as const;
export const CALORIE_SKILL = 'calorie' as const;

/** registry 合法键正则（与 base-link-core registry.KEY_RE 同值，本地拷贝不运行时 import）。 */
export const COMBO_KEY_RE = /^[a-z][a-z0-9-]*\.[a-z0-9][a-z0-9-.]*$/;

export const CALORIE_WRITE_COMBOS = {
  'calorie.body.composition-add': { shape: 'receipt' as EnvelopeShape, title: '记体脂' },
  'calorie.body.composition-remove': { shape: 'receipt' as EnvelopeShape, title: '删体脂' },
  'calorie.body.measure-add': { shape: 'receipt' as EnvelopeShape, title: '记围度' },
  'calorie.body.measure-remove': { shape: 'receipt' as EnvelopeShape, title: '删围度' },
  'calorie.diet.add': { shape: 'receipt' as EnvelopeShape, title: '记一餐' },
  'calorie.diet.batch': { shape: 'receipt' as EnvelopeShape, title: '批量记饮食' },
  'calorie.diet.copy': { shape: 'receipt' as EnvelopeShape, title: '复制饮食' },
  'calorie.diet.remove': { shape: 'receipt' as EnvelopeShape, title: '删饮食' },
  'calorie.diet.remove-by-date': { shape: 'receipt' as EnvelopeShape, title: '按日删饮食' },
  'calorie.diet.remove-by-range': { shape: 'receipt' as EnvelopeShape, title: '按范围删饮食' },
  'calorie.diet.remove-by-type': { shape: 'receipt' as EnvelopeShape, title: '按餐别删饮食' },
  'calorie.diet.update': { shape: 'receipt' as EnvelopeShape, title: '改饮食' },
  'calorie.diet.update-by-date': { shape: 'receipt' as EnvelopeShape, title: '按日改饮食' },
  'calorie.exercise.add': { shape: 'receipt' as EnvelopeShape, title: '记运动' },
  'calorie.exercise.remove': { shape: 'receipt' as EnvelopeShape, title: '删运动' },
  'calorie.exercise.update': { shape: 'receipt' as EnvelopeShape, title: '改运动' },
  'calorie.goal.exercise': { shape: 'receipt' as EnvelopeShape, title: '定运动目标' },
  'calorie.goal.pause': { shape: 'receipt' as EnvelopeShape, title: '暂停目标' },
  'calorie.goal.resume': { shape: 'receipt' as EnvelopeShape, title: '重启目标' },
  'calorie.goal.set': { shape: 'receipt' as EnvelopeShape, title: '定营养目标' },
  'calorie.goal.water': { shape: 'receipt' as EnvelopeShape, title: '定饮水目标' },
  'calorie.goal.weight': { shape: 'receipt' as EnvelopeShape, title: '定体重目标' },
  'calorie.photo.add': { shape: 'receipt' as EnvelopeShape, title: '记身材照' },
  'calorie.photo.remove': { shape: 'receipt' as EnvelopeShape, title: '删身材照' },
  'calorie.photo.tag': { shape: 'receipt' as EnvelopeShape, title: '改照片标签' },
  'calorie.product.add': { shape: 'receipt' as EnvelopeShape, title: '存食品' },
  'calorie.product.deprecate': { shape: 'receipt' as EnvelopeShape, title: '下架食品' },
  'calorie.product.import': { shape: 'receipt' as EnvelopeShape, title: '批量导入食品' },
  'calorie.product.update': { shape: 'receipt' as EnvelopeShape, title: '改食品' },
  'calorie.profile.activity': { shape: 'receipt' as EnvelopeShape, title: '设活动量' },
  'calorie.profile.set': { shape: 'receipt' as EnvelopeShape, title: '设置档案' },
  'calorie.profile.update': { shape: 'receipt' as EnvelopeShape, title: '改档案' },
  'calorie.water.log': { shape: 'receipt' as EnvelopeShape, title: '记喝水' },
  'calorie.weight.batch': { shape: 'receipt' as EnvelopeShape, title: '批量记体重' },
  'calorie.weight.log': { shape: 'receipt' as EnvelopeShape, title: '记体重' },
  'calorie.weight.remove': { shape: 'receipt' as EnvelopeShape, title: '删体重' },
  'calorie.weight.update': { shape: 'receipt' as EnvelopeShape, title: '改体重' },
  'calorie.workout.land': { shape: 'receipt' as EnvelopeShape, title: '落地训练' },
  'calorie.workout.land-monthend': { shape: 'receipt' as EnvelopeShape, title: '落地到本月底' },
  'calorie.workout.land-weekend': { shape: 'receipt' as EnvelopeShape, title: '落地到本周末' },
  'calorie.workout.plan-add-movement': { shape: 'receipt' as EnvelopeShape, title: '加训练动作' },
  'calorie.workout.plan-copy': { shape: 'receipt' as EnvelopeShape, title: '复制训练计划' },
  'calorie.workout.plan-delete': { shape: 'receipt' as EnvelopeShape, title: '撤销训练计划' },
  'calorie.workout.plan-delete-day': { shape: 'receipt' as EnvelopeShape, title: '删某天训练' },
  'calorie.workout.plan-set': { shape: 'receipt' as EnvelopeShape, title: '定训练计划' },
  'calorie.workout.plan-set-rest': { shape: 'receipt' as EnvelopeShape, title: '定休息日' },
  'calorie.workout.plan-set-week': { shape: 'receipt' as EnvelopeShape, title: '定一周计划' },
  'calorie.workout.plan-update': { shape: 'receipt' as EnvelopeShape, title: '改训练计划' },
  'calorie.workout.plan-update-day': { shape: 'receipt' as EnvelopeShape, title: '改某天训练' },
  'calorie.workout.plan-update-movement': { shape: 'receipt' as EnvelopeShape, title: '改动作' },
  'calorie.workout.xunji-backfill': { shape: 'receipt' as EnvelopeShape, title: '拉训记实绩' },
  'calorie.workout.xunji-key-clear': { shape: 'receipt' as EnvelopeShape, title: '清训记KEY' },
  'calorie.workout.xunji-key-set': { shape: 'receipt' as EnvelopeShape, title: '设训记KEY' },
  'calorie.workout.xunji-push': { shape: 'receipt' as EnvelopeShape, title: '同步到训记' },
} as const;

export type CalorieWriteKey = keyof typeof CALORIE_WRITE_COMBOS;

export function isCalorieWriteKey(key: string): key is CalorieWriteKey {
  return Object.prototype.hasOwnProperty.call(CALORIE_WRITE_COMBOS, key);
}

export const CALORIE_COMBOS = {
  ...(CALORIE_WRITE_COMBOS as unknown as Record<string, { shape: EnvelopeShape; title: string }>),
  'calorie.data.query': { shape: 'resultset' as EnvelopeShape, title: '数据查询' },
  'calorie.data.schema': { shape: 'resultset' as EnvelopeShape, title: '数据目录' },
  'calorie.help.center': { shape: 'list' as EnvelopeShape, title: '身材照HELP' },
  'calorie.help.lookup': { shape: 'list' as EnvelopeShape, title: '唤醒词HELP' },
  'calorie.history': { shape: 'list' as EnvelopeShape, title: '热量历史' },
  'calorie.photo.compare': { shape: 'list' as EnvelopeShape, title: '对比照片' },
  'calorie.photo.detail': { shape: 'detail' as EnvelopeShape, title: '查身材照' },
  'calorie.photo.gif': { shape: 'analysis' as EnvelopeShape, title: '生成GIF' },
  'calorie.photo.list': { shape: 'list' as EnvelopeShape, title: '看身材照' },
  'calorie.report.bmi': { shape: 'stat' as EnvelopeShape, title: 'BMI 报告' },
  'calorie.report.bmr': { shape: 'stat' as EnvelopeShape, title: 'BMR 报告' },
  'calorie.report.compare': { shape: 'stat' as EnvelopeShape, title: '健康报告(含对比)' },
  'calorie.report.protein': { shape: 'stat' as EnvelopeShape, title: '蛋白质摄入报告' },
  'calorie.report.score': { shape: 'stat' as EnvelopeShape, title: '综合评分' },
  'calorie.report.tdee': { shape: 'stat' as EnvelopeShape, title: 'TDEE 报告' },
  'calorie.report.trend': { shape: 'stat' as EnvelopeShape, title: '健康趋势' },
  'calorie.report.water': { shape: 'stat' as EnvelopeShape, title: '水分摄入报告' },
  'calorie.today': { shape: 'list' as EnvelopeShape, title: '今日饮食' },
  'calorie.view.anomaly': { shape: 'stat' as EnvelopeShape, title: '异常诊断' },
  'calorie.view.batch-import-preview': { shape: 'stat' as EnvelopeShape, title: '批量导入预览' },
  'calorie.view.body-composition': { shape: 'stat' as EnvelopeShape, title: '体成分看' },
  'calorie.view.body-composition-compare': { shape: 'stat' as EnvelopeShape, title: '体脂对比' },
  'calorie.view.body-measure': { shape: 'stat' as EnvelopeShape, title: '围度看' },
  'calorie.view.body-measure-compare': { shape: 'stat' as EnvelopeShape, title: '围度对比' },
  'calorie.view.calorie-trend': { shape: 'stat' as EnvelopeShape, title: '热量趋势' },
  'calorie.view.combined': { shape: 'stat' as EnvelopeShape, title: '组合分析' },
  'calorie.view.composition-wizard': { shape: 'stat' as EnvelopeShape, title: '体脂向导' },
  'calorie.view.contraindication': { shape: 'stat' as EnvelopeShape, title: '禁忌扫描' },
  'calorie.view.dedupe': { shape: 'stat' as EnvelopeShape, title: '去重报告' },
  'calorie.view.deficit': { shape: 'stat' as EnvelopeShape, title: '热量缺口' },
  'calorie.view.diet': { shape: 'stat' as EnvelopeShape, title: '饮食总览' },
  'calorie.view.diet-review': { shape: 'stat' as EnvelopeShape, title: '饮食复盘' },
  'calorie.view.exercise': { shape: 'stat' as EnvelopeShape, title: '运动总览' },
  'calorie.view.exercise-cardio': { shape: 'stat' as EnvelopeShape, title: '有氧训练总览' },
  'calorie.view.exercise-distribution': { shape: 'stat' as EnvelopeShape, title: '运动类型分布' },
  'calorie.view.exercise-goal': { shape: 'stat' as EnvelopeShape, title: '运动目标视图' },
  'calorie.view.exercise-recap': { shape: 'stat' as EnvelopeShape, title: '运动复盘' },
  'calorie.view.exercise-records': { shape: 'stat' as EnvelopeShape, title: '运动记录' },
  'calorie.view.exercise-review': { shape: 'stat' as EnvelopeShape, title: '计划复盘' },
  'calorie.view.exercise-strength': { shape: 'stat' as EnvelopeShape, title: '力量训练总览' },
  'calorie.view.exercise-trend': { shape: 'stat' as EnvelopeShape, title: '运动趋势' },
  'calorie.view.gif-planner': { shape: 'stat' as EnvelopeShape, title: 'GIF规划器' },
  'calorie.view.goal': { shape: 'stat' as EnvelopeShape, title: '目标分析' },
  'calorie.view.goal-config': { shape: 'stat' as EnvelopeShape, title: '目标配置' },
  'calorie.view.goal-expiring': { shape: 'stat' as EnvelopeShape, title: '即将到期目标' },
  'calorie.view.goal-predict': { shape: 'stat' as EnvelopeShape, title: '目标预测达成' },
  'calorie.view.goal-progress': { shape: 'stat' as EnvelopeShape, title: '目标进度' },
  'calorie.view.goal-recommend': { shape: 'stat' as EnvelopeShape, title: '目标推荐' },
  'calorie.view.goal-status': { shape: 'stat' as EnvelopeShape, title: '目标状态' },
  'calorie.view.goal-vs-actual': { shape: 'stat' as EnvelopeShape, title: '目标对比实际' },
  'calorie.view.goal-weight': { shape: 'stat' as EnvelopeShape, title: '体重目标' },
  'calorie.view.goal-wizard': { shape: 'stat' as EnvelopeShape, title: '目标预检' },
  'calorie.view.health': { shape: 'stat' as EnvelopeShape, title: '健康盘' },
  'calorie.view.home': { shape: 'stat' as EnvelopeShape, title: '今日总览' },
  'calorie.view.label-precheck': { shape: 'stat' as EnvelopeShape, title: '营养表识别确认' },
  'calorie.view.library': { shape: 'stat' as EnvelopeShape, title: '食品库' },
  'calorie.view.lint-health': { shape: 'stat' as EnvelopeShape, title: '数据健康检查' },
  'calorie.view.long-trend': { shape: 'stat' as EnvelopeShape, title: '整体趋势' },
  'calorie.view.measure-wizard': { shape: 'stat' as EnvelopeShape, title: '围度向导' },
  'calorie.view.multi-trend': { shape: 'stat' as EnvelopeShape, title: '多指标趋势' },
  'calorie.view.nutrition-analysis': { shape: 'stat' as EnvelopeShape, title: '营养分析' },
  'calorie.view.nutrition-detail': { shape: 'stat' as EnvelopeShape, title: '营养素深度' },
  'calorie.view.nutrition-ratio': { shape: 'stat' as EnvelopeShape, title: '营养配比' },
  'calorie.view.photo-log-wizard': { shape: 'stat' as EnvelopeShape, title: '身材照向导' },
  'calorie.view.photo-picker': { shape: 'list' as EnvelopeShape, title: '删照候选' },
  'calorie.view.plan': { shape: 'stat' as EnvelopeShape, title: '训练计划看' },
  'calorie.view.plan-vs-actual': { shape: 'stat' as EnvelopeShape, title: '计划比实际' },
  'calorie.view.plan-wizard': { shape: 'stat' as EnvelopeShape, title: '定训练计划' },
  'calorie.view.plan-write-preview': { shape: 'stat' as EnvelopeShape, title: '写前预览' },
  'calorie.view.predict': { shape: 'stat' as EnvelopeShape, title: '体重预测' },
  'calorie.view.process-progress': { shape: 'stat' as EnvelopeShape, title: '落地训练进度' },
  'calorie.view.profile': { shape: 'stat' as EnvelopeShape, title: '档案视图' },
  'calorie.view.profile-wizard': { shape: 'stat' as EnvelopeShape, title: '档案预检' },
  'calorie.view.ranking': { shape: 'stat' as EnvelopeShape, title: '食品排行' },
  'calorie.view.review-template': { shape: 'stat' as EnvelopeShape, title: '复盘报告' },
  'calorie.view.search': { shape: 'stat' as EnvelopeShape, title: '查食品' },
  'calorie.view.six-factors': { shape: 'stat' as EnvelopeShape, title: '每日六因素' },
  'calorie.view.source-stats': { shape: 'stat' as EnvelopeShape, title: '食品来源统计' },
  'calorie.view.today-water': { shape: 'stat' as EnvelopeShape, title: '今日饮水' },
  'calorie.view.volatility': { shape: 'stat' as EnvelopeShape, title: '波动分析' },
  'calorie.view.weight': { shape: 'stat' as EnvelopeShape, title: '体重盘' },
  'calorie.view.weight-compare': { shape: 'stat' as EnvelopeShape, title: '体重对比' },
  'calorie.view.weight-history': { shape: 'stat' as EnvelopeShape, title: '体重历史' },
  'calorie.view.weight-review': { shape: 'stat' as EnvelopeShape, title: '体重复核' },
  'calorie.view.xunji-key': { shape: 'stat' as EnvelopeShape, title: '查训记KEY状态' },
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
