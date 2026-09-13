/** 尚未搬迁的命令的权威声明（**冻结清单，只许变短**）：`#293` 把汇总位改成生成物时，
 * 已搬到各自能力目录的命令由那份 `commands.ts` 声明；这里只留**还没搬**的那些。
 *
 * 每搬走一条：从这里删掉那一行（它的键／形状／标题／代表唤醒词随之改由能力目录声明）——
 * 计数断言不再需要手改数字，因为 `scripts/gen-cli.mjs` 从「本文件 ＋ 各能力声明」算出全量。
 * 本文件**不是**副本：一个键的声明要么在这里，要么在能力目录里，恰一处（铁律二）。
 *
 * `wakeWord`＝代表唤醒词（生成 `SKILL.md` 速查表第一列用）；缺失表示该键没有手选代表词，
 * 速查表**退回键名本身**（照 `build-help.mjs` 原口径 `REPR[k] || k`）。
 */
import type { EnvelopeShape } from 'base-link-core';

/** 一条未搬迁命令的声明：键／形状／标题／代表唤醒词（读写由 `kind` 分）。 */
export interface LegacyCommandDecl {
  readonly kind: 'read' | 'write';
  readonly key: string;
  readonly shape: EnvelopeShape;
  readonly title: string;
  readonly wakeWord?: string;
}

/** 未搬迁命令全表（按键名升序：确定性输出的一半；另一半在生成器里）。 */
export const LEGACY_COMMANDS = [
  { kind: 'write', key: 'calorie.body.composition-add', shape: 'receipt', title: '记体脂', wakeWord: '记体脂' },
  { kind: 'write', key: 'calorie.body.composition-remove', shape: 'receipt', title: '删体脂', wakeWord: '删体脂' },
  { kind: 'write', key: 'calorie.body.measure-add', shape: 'receipt', title: '记围度', wakeWord: '记围度' },
  { kind: 'write', key: 'calorie.body.measure-remove', shape: 'receipt', title: '删围度', wakeWord: '删围度' },
  { kind: 'write', key: 'calorie.diet.add', shape: 'receipt', title: '记一餐', wakeWord: '记一餐' },
  { kind: 'write', key: 'calorie.diet.batch', shape: 'receipt', title: '批量记饮食', wakeWord: '批量补记饮食' },
  { kind: 'write', key: 'calorie.diet.copy', shape: 'receipt', title: '复制饮食', wakeWord: '复制昨日饮食' },
  { kind: 'write', key: 'calorie.diet.remove', shape: 'receipt', title: '删饮食', wakeWord: '删饮食记录' },
  { kind: 'write', key: 'calorie.diet.remove-by-date', shape: 'receipt', title: '按日删饮食', wakeWord: '删某日饮食' },
  { kind: 'write', key: 'calorie.diet.remove-by-range', shape: 'receipt', title: '按范围删饮食', wakeWord: '批量删饮食' },
  { kind: 'write', key: 'calorie.diet.remove-by-type', shape: 'receipt', title: '按餐别删饮食', wakeWord: '删一餐' },
  { kind: 'write', key: 'calorie.diet.update', shape: 'receipt', title: '改饮食', wakeWord: '改饮食记录' },
  { kind: 'write', key: 'calorie.diet.update-by-date', shape: 'receipt', title: '按日改饮食', wakeWord: '改某日饮食' },
  { kind: 'write', key: 'calorie.exercise.add', shape: 'receipt', title: '记运动', wakeWord: '记运动' },
  { kind: 'write', key: 'calorie.exercise.remove', shape: 'receipt', title: '删运动', wakeWord: '删运动记录' },
  { kind: 'write', key: 'calorie.exercise.update', shape: 'receipt', title: '改运动', wakeWord: '改运动记录' },
  { kind: 'write', key: 'calorie.goal.pause', shape: 'receipt', title: '暂停目标', wakeWord: '暂停所有目标' },
  { kind: 'write', key: 'calorie.goal.resume', shape: 'receipt', title: '重启目标', wakeWord: '重启所有目标' },
  { kind: 'write', key: 'calorie.goal.set', shape: 'receipt', title: '定营养目标', wakeWord: '定营养目标' },
  { kind: 'write', key: 'calorie.goal.water', shape: 'receipt', title: '定饮水目标', wakeWord: '定饮水目标' },
  { kind: 'write', key: 'calorie.goal.weight', shape: 'receipt', title: '定体重目标', wakeWord: '定体重目标' },
  { kind: 'read', key: 'calorie.help.center', shape: 'list', title: '身材照HELP', wakeWord: '记身材照' },
  { kind: 'read', key: 'calorie.help.lookup', shape: 'list', title: '唤醒词HELP', wakeWord: '看今日主页' },
  { kind: 'read', key: 'calorie.history', shape: 'list', title: '热量历史', wakeWord: '查热量历史' },
  { kind: 'write', key: 'calorie.photo.add', shape: 'receipt', title: '记身材照', wakeWord: '记身材照' },
  { kind: 'read', key: 'calorie.photo.compare', shape: 'list', title: '对比照片', wakeWord: '对比两张照片' },
  { kind: 'read', key: 'calorie.photo.detail', shape: 'detail', title: '查身材照', wakeWord: '查身材照' },
  { kind: 'read', key: 'calorie.photo.gif', shape: 'analysis', title: '生成GIF', wakeWord: '做身材照GIF' },
  { kind: 'read', key: 'calorie.photo.list', shape: 'list', title: '看身材照', wakeWord: '看身材照' },
  { kind: 'write', key: 'calorie.photo.remove', shape: 'receipt', title: '删身材照', wakeWord: '删身材照' },
  { kind: 'write', key: 'calorie.photo.tag', shape: 'receipt', title: '改照片标签', wakeWord: '改照片标签' },
  { kind: 'write', key: 'calorie.product.add', shape: 'receipt', title: '存食品', wakeWord: '存食品' },
  { kind: 'write', key: 'calorie.product.deprecate', shape: 'receipt', title: '下架食品', wakeWord: '下架食品' },
  { kind: 'write', key: 'calorie.product.update', shape: 'receipt', title: '改食品', wakeWord: '改食品' },
  { kind: 'write', key: 'calorie.profile.activity', shape: 'receipt', title: '设活动量', wakeWord: '设活动量' },
  { kind: 'write', key: 'calorie.profile.set', shape: 'receipt', title: '设置档案', wakeWord: '设置档案' },
  { kind: 'write', key: 'calorie.profile.update', shape: 'receipt', title: '改档案', wakeWord: '改档案' },
  { kind: 'read', key: 'calorie.today', shape: 'list', title: '今日饮食', wakeWord: '看今日饮食概览' },
  { kind: 'read', key: 'calorie.view.anomaly', shape: 'stat', title: '异常诊断' },
  { kind: 'read', key: 'calorie.view.batch-import-preview', shape: 'stat', title: '批量导入预览', wakeWord: '看批量导入预览' },
  { kind: 'read', key: 'calorie.view.body-composition', shape: 'stat', title: '体成分看' },
  { kind: 'read', key: 'calorie.view.body-measure', shape: 'stat', title: '围度看' },
  { kind: 'read', key: 'calorie.view.calorie-trend', shape: 'stat', title: '热量趋势', wakeWord: '看热量趋势' },
  { kind: 'read', key: 'calorie.view.combined', shape: 'stat', title: '组合分析', wakeWord: '看体重 vs 摄入(最近 7 天)' },
  { kind: 'read', key: 'calorie.view.composition-wizard', shape: 'stat', title: '体脂向导', wakeWord: '看体脂向导' },
  { kind: 'read', key: 'calorie.view.contraindication', shape: 'stat', title: '禁忌扫描' },
  { kind: 'read', key: 'calorie.view.dedupe', shape: 'stat', title: '去重报告' },
  { kind: 'read', key: 'calorie.view.deficit', shape: 'stat', title: '热量缺口', wakeWord: '看热量缺口' },
  { kind: 'read', key: 'calorie.view.diet', shape: 'stat', title: '饮食总览', wakeWord: '看今日饮食概览' },
  { kind: 'read', key: 'calorie.view.diet-review', shape: 'stat', title: '饮食复盘', wakeWord: '今日复盘' },
  { kind: 'read', key: 'calorie.view.exercise', shape: 'stat', title: '运动总览', wakeWord: '看今日运动概览' },
  { kind: 'read', key: 'calorie.view.exercise-cardio', shape: 'stat', title: '有氧训练总览', wakeWord: '看有氧训练总览' },
  { kind: 'read', key: 'calorie.view.exercise-distribution', shape: 'stat', title: '运动类型分布', wakeWord: '看运动分类占比' },
  { kind: 'read', key: 'calorie.view.exercise-goal', shape: 'stat', title: '运动目标视图' },
  { kind: 'read', key: 'calorie.view.exercise-recap', shape: 'stat', title: '运动复盘', wakeWord: '看运动复盘' },
  { kind: 'read', key: 'calorie.view.exercise-review', shape: 'stat', title: '计划复盘', wakeWord: '计划复盘（本周）' },
  { kind: 'read', key: 'calorie.view.exercise-strength', shape: 'stat', title: '力量训练总览', wakeWord: '看力量训练总览' },
  { kind: 'read', key: 'calorie.view.exercise-trend', shape: 'stat', title: '运动趋势', wakeWord: '看运动消耗趋势' },
  { kind: 'read', key: 'calorie.view.gif-planner', shape: 'stat', title: 'GIF规划器', wakeWord: '看GIF规划器' },
  { kind: 'read', key: 'calorie.view.goal', shape: 'stat', title: '目标分析', wakeWord: '看今日目标进度' },
  { kind: 'read', key: 'calorie.view.goal-config', shape: 'stat', title: '目标配置', wakeWord: '定营养目标' },
  { kind: 'read', key: 'calorie.view.goal-expiring', shape: 'stat', title: '即将到期目标', wakeWord: '看即将到期的目标' },
  { kind: 'read', key: 'calorie.view.goal-predict', shape: 'stat', title: '目标预测达成', wakeWord: '看目标预测达成' },
  { kind: 'read', key: 'calorie.view.goal-progress', shape: 'stat', title: '目标进度', wakeWord: '看今日目标进度' },
  { kind: 'read', key: 'calorie.view.goal-recommend', shape: 'stat', title: '目标推荐', wakeWord: '定营养目标(自动算)' },
  { kind: 'read', key: 'calorie.view.goal-status', shape: 'stat', title: '目标状态', wakeWord: '看目标状态' },
  { kind: 'read', key: 'calorie.view.goal-vs-actual', shape: 'stat', title: '目标对比实际', wakeWord: '看目标对比实际' },
  { kind: 'read', key: 'calorie.view.goal-weight', shape: 'stat', title: '体重目标', wakeWord: '定体重目标' },
  { kind: 'read', key: 'calorie.view.goal-wizard', shape: 'stat', title: '目标预检', wakeWord: '看目标预检' },
  { kind: 'read', key: 'calorie.view.health', shape: 'stat', title: '健康盘', wakeWord: '看健康盘' },
  { kind: 'read', key: 'calorie.view.home', shape: 'stat', title: '今日总览', wakeWord: '看今日主页' },
  { kind: 'read', key: 'calorie.view.library', shape: 'stat', title: '食品库', wakeWord: '查食品库' },
  { kind: 'read', key: 'calorie.view.lint-health', shape: 'stat', title: '数据健康检查', wakeWord: '查卡路里数据' },
  { kind: 'read', key: 'calorie.view.long-trend', shape: 'stat', title: '整体趋势', wakeWord: '看整体趋势' },
  { kind: 'read', key: 'calorie.view.measure-wizard', shape: 'stat', title: '围度向导', wakeWord: '看围度向导' },
  { kind: 'read', key: 'calorie.view.nutrition-analysis', shape: 'stat', title: '营养分析', wakeWord: '看营养分析' },
  { kind: 'read', key: 'calorie.view.nutrition-detail', shape: 'stat', title: '营养素深度', wakeWord: '看营养素深度' },
  { kind: 'read', key: 'calorie.view.nutrition-ratio', shape: 'stat', title: '营养配比', wakeWord: '查营养配比' },
  { kind: 'read', key: 'calorie.view.photo-log-wizard', shape: 'stat', title: '身材照向导', wakeWord: '看身材照向导' },
  { kind: 'read', key: 'calorie.view.plan', shape: 'stat', title: '训练计划看' },
  { kind: 'read', key: 'calorie.view.plan-wizard', shape: 'stat', title: '构建向导' },
  { kind: 'read', key: 'calorie.view.predict', shape: 'stat', title: '体重预测' },
  { kind: 'read', key: 'calorie.view.process-progress', shape: 'stat', title: '落地训练进度', wakeWord: '看落地训练进度' },
  { kind: 'read', key: 'calorie.view.profile', shape: 'stat', title: '档案视图' },
  { kind: 'read', key: 'calorie.view.profile-wizard', shape: 'stat', title: '档案预检', wakeWord: '看档案预检' },
  { kind: 'read', key: 'calorie.view.ranking', shape: 'stat', title: '食品排行', wakeWord: '查高热量排行' },
  { kind: 'read', key: 'calorie.view.review-template', shape: 'stat', title: '复盘报告', wakeWord: '看复盘报告' },
  { kind: 'read', key: 'calorie.view.search', shape: 'stat', title: '查食品', wakeWord: '查食品' },
  { kind: 'read', key: 'calorie.view.six-factors', shape: 'stat', title: '每日六因素', wakeWord: '看每日六因素' },
  { kind: 'read', key: 'calorie.view.source-stats', shape: 'stat', title: '食品来源统计', wakeWord: '看食品来源统计' },
  { kind: 'read', key: 'calorie.view.today-water', shape: 'stat', title: '今日饮水', wakeWord: '看今日喝水' },
  { kind: 'write', key: 'calorie.water.log', shape: 'receipt', title: '记喝水', wakeWord: '记喝水' },
] satisfies readonly LegacyCommandDecl[];
