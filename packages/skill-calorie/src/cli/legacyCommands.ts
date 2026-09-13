/** 尚未搬迁的命令的权威声明（**冻结清单，只许变短**）：`#293` 把汇总位改成生成物时，
 * 已搬到各自能力目录的命令由那份 `commands.ts` 声明；这里只留**还没搬**的那些。
 *
 * 每搬走一条：从这里删掉那一行（它的键／形状／标题／代表唤醒词随之改由能力目录声明）——
 * 计数断言不再需要手改数字，因为 `scripts/gen-cli.mjs` 从「本文件 ＋ 各能力声明」算出全量。
 * 本文件**不是**副本：一个键的声明要么在这里，要么在能力目录里，恰一处（铁律二）。
 *
 * `wakeWord`＝代表唤醒词（生成 `SKILL.md` 速查表第一列用）；缺失表示该键没有手选代表词，
 * 速查表**退回键名本身**（照 `build-help.mjs` 原口径 `REPR[k] || k`）。
 * `example`＝照抄即能跑的一行（生成 `SKILL.md` 速查表第四列「例」用）——住声明里，
 * `build-help.mjs` 不再逐键手写 `case`（#295 返修 A3）。
 */
import type { EnvelopeShape } from 'base-link-core';

/** 一条未搬迁命令的声明：键／形状／标题／代表唤醒词／可执行示例（读写由 `kind` 分）。 */
export interface LegacyCommandDecl {
  readonly kind: 'read' | 'write';
  readonly key: string;
  readonly shape: EnvelopeShape;
  readonly title: string;
  readonly wakeWord?: string;
  readonly example: string;
}

/** 未搬迁命令全表（按键名升序：确定性输出的一半；另一半在生成器里）。 */
export const LEGACY_COMMANDS = [
  { kind: 'write', key: 'calorie.body.composition-add', shape: 'receipt', title: '记体脂', wakeWord: '记体脂', example: 'calorie-cmd-read calorie.body.composition-add --params \'{"source":"gym","bodyFatPct":18.5}\'' },
  { kind: 'write', key: 'calorie.body.composition-remove', shape: 'receipt', title: '删体脂', wakeWord: '删体脂', example: 'calorie-cmd-read calorie.body.composition-remove --params \'{"id":1}\'' },
  { kind: 'write', key: 'calorie.body.measure-add', shape: 'receipt', title: '记围度', wakeWord: '记围度', example: 'calorie-cmd-read calorie.body.measure-add --params \'{"waistCm":85}\'' },
  { kind: 'write', key: 'calorie.body.measure-remove', shape: 'receipt', title: '删围度', wakeWord: '删围度', example: 'calorie-cmd-read calorie.body.measure-remove --params \'{"id":1}\'' },
  { kind: 'write', key: 'calorie.diet.add', shape: 'receipt', title: '记一餐', wakeWord: '记一餐', example: 'calorie-cmd-read calorie.diet.add --params \'{"foodName":"鸡胸","calories":200,"protein":35}\'' },
  { kind: 'write', key: 'calorie.diet.batch', shape: 'receipt', title: '批量记饮食', wakeWord: '批量补记饮食', example: 'calorie-cmd-read calorie.diet.batch --params \'{"items":[{"foodName":"粥","calories":150,"protein":3}]}\'' },
  { kind: 'write', key: 'calorie.diet.copy', shape: 'receipt', title: '复制饮食', wakeWord: '复制昨日饮食', example: 'calorie-cmd-read calorie.diet.copy --params \'{"from":"<日期>"}\'' },
  { kind: 'write', key: 'calorie.diet.remove', shape: 'receipt', title: '删饮食', wakeWord: '删饮食记录', example: 'calorie-cmd-read calorie.diet.remove --params \'{"id":1}\'' },
  { kind: 'write', key: 'calorie.diet.remove-by-date', shape: 'receipt', title: '按日删饮食', wakeWord: '删某日饮食', example: 'calorie-cmd-read calorie.diet.remove-by-date --params \'{"date":"<日期>"}\'' },
  { kind: 'write', key: 'calorie.diet.remove-by-range', shape: 'receipt', title: '按范围删饮食', wakeWord: '批量删饮食', example: 'calorie-cmd-read calorie.diet.remove-by-range --params \'{"start":"<日期>","end":"<日期>"}\'' },
  { kind: 'write', key: 'calorie.diet.remove-by-type', shape: 'receipt', title: '按餐别删饮食', wakeWord: '删一餐', example: 'calorie-cmd-read calorie.diet.remove-by-type --params \'{"mealType":"早餐","date":"<日期>"}\'' },
  { kind: 'write', key: 'calorie.diet.update', shape: 'receipt', title: '改饮食', wakeWord: '改饮食记录', example: 'calorie-cmd-read calorie.diet.update --params \'{"id":1,"grams":150}\'' },
  { kind: 'write', key: 'calorie.diet.update-by-date', shape: 'receipt', title: '按日改饮食', wakeWord: '改某日饮食', example: 'calorie-cmd-read calorie.diet.update-by-date --params \'{"note":"食堂","date":"<日期>"}\'' },
  { kind: 'write', key: 'calorie.exercise.add', shape: 'receipt', title: '记运动', wakeWord: '记运动', example: 'calorie-cmd-read calorie.exercise.add --params \'{"type":"慢跑","calories":320,"minutes":30}\'' },
  { kind: 'write', key: 'calorie.exercise.remove', shape: 'receipt', title: '删运动', wakeWord: '删运动记录', example: 'calorie-cmd-read calorie.exercise.remove --params \'{"id":1}\'' },
  { kind: 'write', key: 'calorie.exercise.update', shape: 'receipt', title: '改运动', wakeWord: '改运动记录', example: 'calorie-cmd-read calorie.exercise.update --params \'{"id":1,"minutes":40}\'' },
  { kind: 'write', key: 'calorie.goal.pause', shape: 'receipt', title: '暂停目标', wakeWord: '暂停所有目标', example: 'calorie-cmd-read calorie.goal.pause' },
  { kind: 'write', key: 'calorie.goal.resume', shape: 'receipt', title: '重启目标', wakeWord: '重启所有目标', example: 'calorie-cmd-read calorie.goal.resume' },
  { kind: 'write', key: 'calorie.goal.set', shape: 'receipt', title: '定营养目标', wakeWord: '定营养目标', example: 'calorie-cmd-read calorie.goal.set --params \'{"calorie":1800,"protein":150,"carbs":200,"fat":50}\'' },
  { kind: 'write', key: 'calorie.goal.water', shape: 'receipt', title: '定饮水目标', wakeWord: '定饮水目标', example: 'calorie-cmd-read calorie.goal.water --params \'{"water":2000}\'' },
  { kind: 'write', key: 'calorie.goal.weight', shape: 'receipt', title: '定体重目标', wakeWord: '定体重目标', example: 'calorie-cmd-read calorie.goal.weight --params \'{"kg":68}\'' },
  { kind: 'read', key: 'calorie.help.center', shape: 'list', title: '身材照HELP', wakeWord: '记身材照', example: 'calorie-cmd-read calorie.help.center --params \'{"q":"记身材照"}\'' },
  { kind: 'read', key: 'calorie.help.lookup', shape: 'list', title: '唤醒词HELP', wakeWord: '看今日主页', example: 'calorie-cmd-read calorie.help.lookup --params \'{"q":"看今日主页"}\'' },
  { kind: 'read', key: 'calorie.history', shape: 'list', title: '热量历史', wakeWord: '查热量历史', example: 'calorie-cmd-read calorie.history --params \'{"days":7}\'' },
  { kind: 'write', key: 'calorie.photo.add', shape: 'receipt', title: '记身材照', wakeWord: '记身材照', example: 'calorie-cmd-read calorie.photo.add --params \'{"srcPaths":["<照片路径>"],"tag":"正面"}\'' },
  { kind: 'read', key: 'calorie.photo.compare', shape: 'list', title: '对比照片', wakeWord: '对比两张照片', example: 'calorie-cmd-read calorie.photo.compare --params \'{"id1":1,"id2":2}\'' },
  { kind: 'read', key: 'calorie.photo.detail', shape: 'detail', title: '查身材照', wakeWord: '查身材照', example: 'calorie-cmd-read calorie.photo.detail --params \'{"id":1}\'' },
  { kind: 'read', key: 'calorie.photo.gif', shape: 'analysis', title: '生成GIF', wakeWord: '做身材照GIF', example: 'calorie-cmd-read calorie.photo.gif --params \'{"tag":"正面"}\'' },
  { kind: 'read', key: 'calorie.photo.list', shape: 'list', title: '看身材照', wakeWord: '看身材照', example: 'calorie-cmd-read calorie.photo.list --params \'{"tag":"正面"}\'' },
  { kind: 'write', key: 'calorie.photo.remove', shape: 'receipt', title: '删身材照', wakeWord: '删身材照', example: 'calorie-cmd-read calorie.photo.remove --params \'{"id":1}\'' },
  { kind: 'write', key: 'calorie.photo.tag', shape: 'receipt', title: '改照片标签', wakeWord: '改照片标签', example: 'calorie-cmd-read calorie.photo.tag --params \'{"id":1,"op":"add","tag":"晨起"}\'' },
  { kind: 'write', key: 'calorie.product.add', shape: 'receipt', title: '存食品', wakeWord: '存食品', example: 'calorie-cmd-read calorie.product.add --params \'{"productName":"鸡胸肉","calories":165,"protein":31,"fat":3.6,"carbohydrates":0,"sodium":70}\'' },
  { kind: 'write', key: 'calorie.product.deprecate', shape: 'receipt', title: '下架食品', wakeWord: '下架食品', example: 'calorie-cmd-read calorie.product.deprecate --params \'{"id":1}\'' },
  { kind: 'write', key: 'calorie.product.update', shape: 'receipt', title: '改食品', wakeWord: '改食品', example: 'calorie-cmd-read calorie.product.update --params \'{"id":1,"note":"新版"}\'' },
  { kind: 'write', key: 'calorie.profile.activity', shape: 'receipt', title: '设活动量', wakeWord: '设活动量', example: 'calorie-cmd-read calorie.profile.activity --params \'{"activityLevel":"active"}\'' },
  { kind: 'write', key: 'calorie.profile.set', shape: 'receipt', title: '设置档案', wakeWord: '设置档案', example: 'calorie-cmd-read calorie.profile.set --params \'{"heightCm":175,"activityLevel":"moderate"}\'' },
  { kind: 'write', key: 'calorie.profile.update', shape: 'receipt', title: '改档案', wakeWord: '改档案', example: 'calorie-cmd-read calorie.profile.update --params \'{"field":"heightCm","value":176}\'' },
  { kind: 'read', key: 'calorie.today', shape: 'list', title: '今日饮食', wakeWord: '看今日饮食概览', example: 'calorie-cmd-read calorie.today --params \'{"date":"今日"}\'' },
  { kind: 'read', key: 'calorie.view.anomaly', shape: 'stat', title: '异常诊断', example: 'calorie-cmd-read calorie.view.anomaly --params \'{"kind":"weight_volatility","window":"90d"}\'' },
  { kind: 'read', key: 'calorie.view.batch-import-preview', shape: 'stat', title: '批量导入预览', wakeWord: '看批量导入预览', example: 'calorie-cmd-read calorie.view.batch-import-preview --params \'{"items":[{"foodName":"粥","calories":150,"protein":3,"date":"<日期>"}]}\'' },
  { kind: 'read', key: 'calorie.view.body-composition', shape: 'stat', title: '体成分看', example: 'calorie-cmd-read calorie.view.body-composition' },
  { kind: 'read', key: 'calorie.view.body-measure', shape: 'stat', title: '围度看', example: 'calorie-cmd-read calorie.view.body-measure --params \'{"metric":"waist_cm"}\'' },
  { kind: 'read', key: 'calorie.view.calorie-trend', shape: 'stat', title: '热量趋势', wakeWord: '看热量趋势', example: 'calorie-cmd-read calorie.view.calorie-trend --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.combined', shape: 'stat', title: '组合分析', wakeWord: '看体重 vs 摄入(最近 7 天)', example: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_calorie","window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.composition-wizard', shape: 'stat', title: '体脂向导', wakeWord: '看体脂向导', example: 'calorie-cmd-read calorie.view.composition-wizard' },
  { kind: 'read', key: 'calorie.view.contraindication', shape: 'stat', title: '禁忌扫描', example: 'calorie-cmd-read calorie.view.contraindication --params \'{"part":"all"}\'' },
  { kind: 'read', key: 'calorie.view.dedupe', shape: 'stat', title: '去重报告', example: 'calorie-cmd-read calorie.view.dedupe' },
  { kind: 'read', key: 'calorie.view.deficit', shape: 'stat', title: '热量缺口', wakeWord: '看热量缺口', example: 'calorie-cmd-read calorie.view.deficit --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.diet', shape: 'stat', title: '饮食总览', wakeWord: '看今日饮食概览', example: 'calorie-cmd-read calorie.view.diet --params \'{"window":"今日"}\'' },
  { kind: 'read', key: 'calorie.view.diet-review', shape: 'stat', title: '饮食复盘', wakeWord: '今日复盘', example: 'calorie-cmd-read calorie.view.diet-review --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.exercise', shape: 'stat', title: '运动总览', wakeWord: '看今日运动概览', example: 'calorie-cmd-read calorie.view.exercise --params \'{"window":"今日"}\'' },
  { kind: 'read', key: 'calorie.view.exercise-cardio', shape: 'stat', title: '有氧训练总览', wakeWord: '看有氧训练总览', example: 'calorie-cmd-read calorie.view.exercise-cardio --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.exercise-distribution', shape: 'stat', title: '运动类型分布', wakeWord: '看运动分类占比', example: 'calorie-cmd-read calorie.view.exercise-distribution --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.exercise-goal', shape: 'stat', title: '运动目标视图', example: 'calorie-cmd-read calorie.view.exercise-goal --params \'{"window":"今日"}\'' },
  { kind: 'read', key: 'calorie.view.exercise-recap', shape: 'stat', title: '运动复盘', wakeWord: '看运动复盘', example: 'calorie-cmd-read calorie.view.exercise-recap --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.exercise-review', shape: 'stat', title: '计划复盘', wakeWord: '计划复盘（本周）', example: 'calorie-cmd-read calorie.view.exercise-review --params \'{"window":"本周"}\'' },
  { kind: 'read', key: 'calorie.view.exercise-strength', shape: 'stat', title: '力量训练总览', wakeWord: '看力量训练总览', example: 'calorie-cmd-read calorie.view.exercise-strength --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.exercise-trend', shape: 'stat', title: '运动趋势', wakeWord: '看运动消耗趋势', example: 'calorie-cmd-read calorie.view.exercise-trend --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.gif-planner', shape: 'stat', title: 'GIF规划器', wakeWord: '看GIF规划器', example: 'calorie-cmd-read calorie.view.gif-planner --params \'{"tag":"正面"}\'' },
  { kind: 'read', key: 'calorie.view.goal', shape: 'stat', title: '目标分析', wakeWord: '看今日目标进度', example: 'calorie-cmd-read calorie.view.goal --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.goal-config', shape: 'stat', title: '目标配置', wakeWord: '定营养目标', example: 'calorie-cmd-read calorie.view.goal-config' },
  { kind: 'read', key: 'calorie.view.goal-expiring', shape: 'stat', title: '即将到期目标', wakeWord: '看即将到期的目标', example: 'calorie-cmd-read calorie.view.goal-expiring' },
  { kind: 'read', key: 'calorie.view.goal-predict', shape: 'stat', title: '目标预测达成', wakeWord: '看目标预测达成', example: 'calorie-cmd-read calorie.view.goal-predict --params \'{"window":"14d"}\'' },
  { kind: 'read', key: 'calorie.view.goal-progress', shape: 'stat', title: '目标进度', wakeWord: '看今日目标进度', example: 'calorie-cmd-read calorie.view.goal-progress --params \'{"window":"今日"}\'' },
  { kind: 'read', key: 'calorie.view.goal-recommend', shape: 'stat', title: '目标推荐', wakeWord: '定营养目标(自动算)', example: 'calorie-cmd-read calorie.view.goal-recommend --params \'{"profile":"cut"}\'' },
  { kind: 'read', key: 'calorie.view.goal-status', shape: 'stat', title: '目标状态', wakeWord: '看目标状态', example: 'calorie-cmd-read calorie.view.goal-status' },
  { kind: 'read', key: 'calorie.view.goal-vs-actual', shape: 'stat', title: '目标对比实际', wakeWord: '看目标对比实际', example: 'calorie-cmd-read calorie.view.goal-vs-actual --params \'{"window":"30d"}\'' },
  { kind: 'read', key: 'calorie.view.goal-weight', shape: 'stat', title: '体重目标', wakeWord: '定体重目标', example: 'calorie-cmd-read calorie.view.goal-weight --params \'{"window":"30d"}\'' },
  { kind: 'read', key: 'calorie.view.goal-wizard', shape: 'stat', title: '目标预检', wakeWord: '看目标预检', example: 'calorie-cmd-read calorie.view.goal-wizard' },
  { kind: 'read', key: 'calorie.view.health', shape: 'stat', title: '健康盘', wakeWord: '看健康盘', example: 'calorie-cmd-read calorie.view.health --params \'{"window":"本周"}\'' },
  { kind: 'read', key: 'calorie.view.home', shape: 'stat', title: '今日总览', wakeWord: '看今日主页', example: 'calorie-cmd-read calorie.view.home --params \'{"date":"今日"}\'' },
  { kind: 'read', key: 'calorie.view.library', shape: 'stat', title: '食品库', wakeWord: '查食品库', example: 'calorie-cmd-read calorie.view.library' },
  { kind: 'read', key: 'calorie.view.lint-health', shape: 'stat', title: '数据健康检查', wakeWord: '查卡路里数据', example: 'calorie-cmd-read calorie.view.lint-health' },
  { kind: 'read', key: 'calorie.view.long-trend', shape: 'stat', title: '整体趋势', wakeWord: '看整体趋势', example: 'calorie-cmd-read calorie.view.long-trend --params \'{"group":"weight_calorie","window":"30d"}\'' },
  { kind: 'read', key: 'calorie.view.measure-wizard', shape: 'stat', title: '围度向导', wakeWord: '看围度向导', example: 'calorie-cmd-read calorie.view.measure-wizard' },
  { kind: 'read', key: 'calorie.view.nutrition-analysis', shape: 'stat', title: '营养分析', wakeWord: '看营养分析', example: 'calorie-cmd-read calorie.view.nutrition-analysis --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.nutrition-detail', shape: 'stat', title: '营养素深度', wakeWord: '看营养素深度', example: 'calorie-cmd-read calorie.view.nutrition-detail --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.nutrition-ratio', shape: 'stat', title: '营养配比', wakeWord: '查营养配比', example: 'calorie-cmd-read calorie.view.nutrition-ratio --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.photo-log-wizard', shape: 'stat', title: '身材照向导', wakeWord: '看身材照向导', example: 'calorie-cmd-read calorie.view.photo-log-wizard' },
  { kind: 'read', key: 'calorie.view.plan', shape: 'stat', title: '训练计划看', example: 'calorie-cmd-read calorie.view.plan' },
  { kind: 'read', key: 'calorie.view.plan-wizard', shape: 'stat', title: '构建向导', example: 'calorie-cmd-read calorie.view.plan-wizard --params \'{"plan":{"config":{"title":"减脂4周","start_date":"<开始日期>","user_level":"中手","available_equipment":["瑜伽垫"]},"weeks":[{"week_number":1,"days":[{"day_of_week":1,"sessions":[{"session_label":"上肢","movements":[{"name":"俯卧撑","part":"胸","type":"力量","sets":[]}]}]}]}]}}\'' },
  { kind: 'read', key: 'calorie.view.predict', shape: 'stat', title: '体重预测', example: 'calorie-cmd-read calorie.view.predict --params \'{"horizonDays":7,"window":"14d"}\'' },
  { kind: 'read', key: 'calorie.view.process-progress', shape: 'stat', title: '落地训练进度', wakeWord: '看落地训练进度', example: 'calorie-cmd-read calorie.view.process-progress' },
  { kind: 'read', key: 'calorie.view.profile', shape: 'stat', title: '档案视图', example: 'calorie-cmd-read calorie.view.profile' },
  { kind: 'read', key: 'calorie.view.profile-wizard', shape: 'stat', title: '档案预检', wakeWord: '看档案预检', example: 'calorie-cmd-read calorie.view.profile-wizard' },
  { kind: 'read', key: 'calorie.view.ranking', shape: 'stat', title: '食品排行', wakeWord: '查高热量排行', example: 'calorie-cmd-read calorie.view.ranking --params \'{"category":"high_calorie","topN":10,"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.review-template', shape: 'stat', title: '复盘报告', wakeWord: '看复盘报告', example: 'calorie-cmd-read calorie.view.review-template --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.search', shape: 'stat', title: '查食品', wakeWord: '查食品', example: 'calorie-cmd-read calorie.view.search --params \'{"keyword":"鸡胸"}\'' },
  { kind: 'read', key: 'calorie.view.six-factors', shape: 'stat', title: '每日六因素', wakeWord: '看每日六因素', example: 'calorie-cmd-read calorie.view.six-factors --params \'{"date":"今日"}\'' },
  { kind: 'read', key: 'calorie.view.source-stats', shape: 'stat', title: '食品来源统计', wakeWord: '看食品来源统计', example: 'calorie-cmd-read calorie.view.source-stats' },
  { kind: 'read', key: 'calorie.view.today-water', shape: 'stat', title: '今日饮水', wakeWord: '看今日喝水', example: 'calorie-cmd-read calorie.view.today-water --params \'{"date":"今日"}\'' },
  { kind: 'write', key: 'calorie.water.log', shape: 'receipt', title: '记喝水', wakeWord: '记喝水', example: 'calorie-cmd-read calorie.water.log --params \'{"ml":300}\'' },
] satisfies readonly LegacyCommandDecl[];
