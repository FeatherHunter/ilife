#!/usr/bin/env node
// HELP 构建期注入（T11，照 M6 范式；#40 追加 35 写键）：CALORIE_COMBOS 全量键 + 代表唤醒词→速查表→SKILL.md 互联区；只重写标记块，其余不动。无标记即大声失败。
//
// 入口：`pnpm help:build`（= 跑本文件）。本文件里**没有一条命令的手写事实**：
//   REPR 表与 EXAMPLE 表都是 `scripts/gen-cli.mjs` 的标记块生成物，其余从 `dist/cli/keys.js` 读。
// 重生成 SKILL.md 的正确顺序（少一步就会得到「键数停在旧的」这种静默结果）：
//   `pnpm build` → `pnpm gen` → `pnpm build`（把生成出来的 `src/cli/keys.ts` 编进 `dist/`）→ `pnpm help:build`
//   → 需要 `combos.yaml` 的镜像连带时再 `node packages/base-combos/scripts/gen-present.mjs`。
// `pnpm gen:check`（CI 一道门）比对的是**生成物 == 生成器输出**，不含 SKILL.md 本身；
// 本文件的产物新鲜度由 `pnpm help:examples:check` 的「AUTO 块 == renderSkillMd 输出」那一条盯。
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CALORIE_COMBOS } from '../dist/cli/keys.js';

export const START = '<!-- HELP-AUTO-START -->';
export const END = '<!-- HELP-AUTO-END -->';

// -- GEN-CLI-START REPR 表（由 packages/skill-calorie/scripts/gen-cli.mjs 生成，勿手改）
// 每组合键一行代表唤醒词（优先真实 TRIGGERS 短语，照片 HELP 10 键原样，通用 HELP 走 lookup）。
const REPR = {
  'calorie.body.composition-add': '记体脂',
  'calorie.body.composition-remove': '删体脂',
  'calorie.body.measure-add': '记围度',
  'calorie.body.measure-remove': '删围度',
  'calorie.diet.add': '记一餐',
  'calorie.diet.batch': '批量补记饮食',
  'calorie.diet.copy': '复制昨日饮食',
  'calorie.diet.remove': '删饮食记录',
  'calorie.diet.remove-by-date': '删某日饮食',
  'calorie.diet.remove-by-range': '批量删饮食',
  'calorie.diet.remove-by-type': '删一餐',
  'calorie.diet.update': '改饮食记录',
  'calorie.diet.update-by-date': '改某日饮食',
  'calorie.exercise.add': '记运动',
  'calorie.exercise.remove': '删运动记录',
  'calorie.exercise.update': '改运动记录',
  'calorie.goal.pause': '暂停所有目标',
  'calorie.goal.resume': '重启所有目标',
  'calorie.goal.set': '定营养目标',
  'calorie.goal.water': '定饮水目标',
  'calorie.goal.weight': '定体重目标',
  'calorie.photo.add': '记身材照',
  'calorie.photo.remove': '删身材照',
  'calorie.photo.tag': '改照片标签',
  'calorie.product.add': '存食品',
  'calorie.product.deprecate': '下架食品',
  'calorie.product.import': '批量导入食品',
  'calorie.product.update': '改食品',
  'calorie.profile.activity': '设活动量',
  'calorie.profile.set': '设置档案',
  'calorie.profile.update': '改档案',
  'calorie.water.log': '记喝水',
  'calorie.weight.batch': '批量补录体重',
  'calorie.weight.log': '记体重',
  'calorie.weight.remove': '删体重记录',
  'calorie.weight.update': '改体重记录',
  'calorie.workout.plan-add-movement': '加训练动作',
  'calorie.workout.plan-copy': '复制训练计划',
  'calorie.workout.plan-delete': '撤销训练计划',
  'calorie.workout.plan-delete-day': '删某天训练',
  'calorie.workout.plan-set': '定训练计划',
  'calorie.workout.plan-set-rest': '定休息日',
  'calorie.workout.plan-set-week': '定一周计划',
  'calorie.workout.plan-update': '改训练计划',
  'calorie.workout.plan-update-day': '改某天训练',
  'calorie.workout.plan-update-movement': '改动作',
  'calorie.help.center': '记身材照',
  'calorie.help.lookup': '看今日主页',
  'calorie.history': '查热量历史',
  'calorie.photo.compare': '对比两张照片',
  'calorie.photo.detail': '查身材照',
  'calorie.photo.gif': '做身材照GIF',
  'calorie.photo.list': '看身材照',
  'calorie.today': '看今日饮食概览',
  'calorie.view.batch-import-preview': '看批量导入预览',
  'calorie.view.body-composition-compare': '对比体脂',
  'calorie.view.body-measure-compare': '对比围度',
  'calorie.view.calorie-trend': '看热量趋势',
  'calorie.view.combined': '看体重 vs 摄入(最近 7 天)',
  'calorie.view.composition-wizard': '看体脂向导',
  'calorie.view.deficit': '看热量缺口',
  'calorie.view.diet': '看今日饮食概览',
  'calorie.view.diet-review': '今日复盘',
  'calorie.view.exercise': '看今日运动概览',
  'calorie.view.exercise-cardio': '看有氧训练总览',
  'calorie.view.exercise-distribution': '看运动类型分布',
  'calorie.view.exercise-goal': '看今日运动（vs 目标）',
  'calorie.view.exercise-recap': '运动复盘（本周）',
  'calorie.view.exercise-records': '看运动记录（有备注）',
  'calorie.view.exercise-review': '计划复盘（本周）',
  'calorie.view.exercise-strength': '看力量训练总览',
  'calorie.view.exercise-trend': '看运动趋势',
  'calorie.view.gif-planner': '看GIF规划器',
  'calorie.view.goal': '看今日目标进度',
  'calorie.view.goal-config': '定营养目标',
  'calorie.view.goal-expiring': '看即将到期的目标',
  'calorie.view.goal-predict': '看目标预测达成',
  'calorie.view.goal-progress': '看今日目标进度',
  'calorie.view.goal-recommend': '定营养目标(自动算)',
  'calorie.view.goal-status': '看目标状态',
  'calorie.view.goal-vs-actual': '看目标对比实际',
  'calorie.view.goal-weight': '定体重目标',
  'calorie.view.goal-wizard': '看目标预检',
  'calorie.view.health': '看健康盘',
  'calorie.view.home': '看今日主页',
  'calorie.view.library': '查食品库',
  'calorie.view.lint-health': '查卡路里数据',
  'calorie.view.long-trend': '看整体趋势',
  'calorie.view.measure-wizard': '看围度向导',
  'calorie.view.multi-trend': '看整体趋势(含目标对比)',
  'calorie.view.nutrition-analysis': '看营养分析',
  'calorie.view.nutrition-detail': '看营养素深度',
  'calorie.view.nutrition-ratio': '查营养配比',
  'calorie.view.photo-log-wizard': '看身材照向导',
  'calorie.view.photo-picker': '选身材照',
  'calorie.view.plan': '看计划概览',
  'calorie.view.plan-vs-actual': '看计划 vs 实际',
  'calorie.view.process-progress': '看落地训练进度',
  'calorie.view.profile-wizard': '看档案预检',
  'calorie.view.ranking': '查高热量排行',
  'calorie.view.review-template': '看复盘报告',
  'calorie.view.search': '查食品',
  'calorie.view.six-factors': '看每日六因素',
  'calorie.view.source-stats': '看食品来源统计',
  'calorie.view.today-water': '看今日喝水',
  'calorie.view.volatility': '看体重稳不稳（增强版）',
  'calorie.view.weight': '看今日体重',
  'calorie.view.weight-compare': '对比体重：本月 vs 上月',
  'calorie.view.weight-history': '看本周体重',
  'calorie.view.weight-review': '看体重复核',
};
// -- GEN-CLI-END REPR 表

// -- GEN-CLI-START EXAMPLE 表（由 packages/skill-calorie/scripts/gen-cli.mjs 生成，勿手改）
// 每键一行「照抄即能跑」的示例：住声明的 `example` 字段（各能力 `commands.ts`／`legacyCommands.ts`）。
// 无 `--params` 的写法照抄即 exit 2／4——所以新键必须自带可执行示例（#99 生成期结构断言的来意）。
const EXAMPLES = {
  'calorie.body.composition-add': 'calorie-cmd-read calorie.body.composition-add --params \'{"source":"gym","bodyFatPct":18.5}\'',
  'calorie.body.composition-remove': 'calorie-cmd-read calorie.body.composition-remove --params \'{"id":1}\'',
  'calorie.body.measure-add': 'calorie-cmd-read calorie.body.measure-add --params \'{"waistCm":85}\'',
  'calorie.body.measure-remove': 'calorie-cmd-read calorie.body.measure-remove --params \'{"id":1}\'',
  'calorie.diet.add': 'calorie-cmd-read calorie.diet.add --params \'{"foodName":"鸡胸","calories":200,"protein":35}\'',
  'calorie.diet.batch': 'calorie-cmd-read calorie.diet.batch --params \'{"items":[{"foodName":"粥","calories":150,"protein":3}]}\'',
  'calorie.diet.copy': 'calorie-cmd-read calorie.diet.copy --params \'{"from":"<日期>"}\'',
  'calorie.diet.remove': 'calorie-cmd-read calorie.diet.remove --params \'{"id":1}\'',
  'calorie.diet.remove-by-date': 'calorie-cmd-read calorie.diet.remove-by-date --params \'{"date":"<日期>"}\'',
  'calorie.diet.remove-by-range': 'calorie-cmd-read calorie.diet.remove-by-range --params \'{"start":"<日期>","end":"<日期>"}\'',
  'calorie.diet.remove-by-type': 'calorie-cmd-read calorie.diet.remove-by-type --params \'{"mealType":"早餐","date":"<日期>"}\'',
  'calorie.diet.update': 'calorie-cmd-read calorie.diet.update --params \'{"id":1,"grams":150}\'',
  'calorie.diet.update-by-date': 'calorie-cmd-read calorie.diet.update-by-date --params \'{"note":"食堂","date":"<日期>"}\'',
  'calorie.exercise.add': 'calorie-cmd-read calorie.exercise.add --params \'{"type":"慢跑","calories":320,"minutes":30}\'',
  'calorie.exercise.remove': 'calorie-cmd-read calorie.exercise.remove --params \'{"id":1}\'',
  'calorie.exercise.update': 'calorie-cmd-read calorie.exercise.update --params \'{"id":1,"minutes":40}\'',
  'calorie.goal.pause': 'calorie-cmd-read calorie.goal.pause',
  'calorie.goal.resume': 'calorie-cmd-read calorie.goal.resume',
  'calorie.goal.set': 'calorie-cmd-read calorie.goal.set --params \'{"calorie":1800,"protein":150,"carbs":200,"fat":50}\'',
  'calorie.goal.water': 'calorie-cmd-read calorie.goal.water --params \'{"water":2000}\'',
  'calorie.goal.weight': 'calorie-cmd-read calorie.goal.weight --params \'{"kg":68}\'',
  'calorie.photo.add': 'calorie-cmd-read calorie.photo.add --params \'{"srcPaths":["<照片路径>"],"tag":"正面"}\'',
  'calorie.photo.remove': 'calorie-cmd-read calorie.photo.remove --params \'{"id":1}\'',
  'calorie.photo.tag': 'calorie-cmd-read calorie.photo.tag --params \'{"id":1,"op":"add","tag":"晨起"}\'',
  'calorie.product.add': 'calorie-cmd-read calorie.product.add --params \'{"productName":"鸡胸肉","calories":165,"protein":31,"fat":3.6,"carbohydrates":0,"sodium":70}\'',
  'calorie.product.deprecate': 'calorie-cmd-read calorie.product.deprecate --params \'{"id":1}\'',
  'calorie.product.import': 'calorie-cmd-read calorie.product.import --params \'{"items":[{"productName":"测试导入燕麦","calories":389,"protein":13,"fat":7,"carbohydrates":66,"sodium":5}]}\'',
  'calorie.product.update': 'calorie-cmd-read calorie.product.update --params \'{"id":1,"note":"新版"}\'',
  'calorie.profile.activity': 'calorie-cmd-read calorie.profile.activity --params \'{"activityLevel":"active"}\'',
  'calorie.profile.set': 'calorie-cmd-read calorie.profile.set --params \'{"heightCm":175,"activityLevel":"moderate"}\'',
  'calorie.profile.update': 'calorie-cmd-read calorie.profile.update --params \'{"field":"heightCm","value":176}\'',
  'calorie.water.log': 'calorie-cmd-read calorie.water.log --params \'{"ml":300}\'',
  'calorie.weight.batch': 'calorie-cmd-read calorie.weight.batch --params \'{"items":[{"date":"<日期>","kg":70.5}]}\'',
  'calorie.weight.log': 'calorie-cmd-read calorie.weight.log --params \'{"kg":70.5}\'',
  'calorie.weight.remove': 'calorie-cmd-read calorie.weight.remove --params \'{"id":1}\'',
  'calorie.weight.update': 'calorie-cmd-read calorie.weight.update --params \'{"id":1,"kg":70.2}\'',
  'calorie.workout.plan-add-movement': 'calorie-cmd-read calorie.workout.plan-add-movement --params \'{"week":1,"dayOfWeek":1,"movement":{"name":"深蹲"}}\'',
  'calorie.workout.plan-copy': 'calorie-cmd-read calorie.workout.plan-copy --params \'{"newTitle":"示例副本"}\'',
  'calorie.workout.plan-delete': 'calorie-cmd-read calorie.workout.plan-delete --params \'{"confirm":true}\'',
  'calorie.workout.plan-delete-day': 'calorie-cmd-read calorie.workout.plan-delete-day --params \'{"week":1,"dayOfWeek":3}\'',
  'calorie.workout.plan-set': 'calorie-cmd-read calorie.workout.plan-set --params \'{"plan":{"config":{"title":"示例计划","start_date":"2026-09-07","user_level":"中手","available_equipment":["瑜伽垫"]},"weeks":[{"week_number":1,"days":[{"day_of_week":1,"sessions":[{"session_label":"上肢","movements":[{"name":"俯卧撑"}]}]}]}]}}\'',
  'calorie.workout.plan-set-rest': 'calorie-cmd-read calorie.workout.plan-set-rest --params \'{"week":1,"dayOfWeek":3}\'',
  'calorie.workout.plan-set-week': 'calorie-cmd-read calorie.workout.plan-set-week --params \'{"week":1,"days":[{"dayOfWeek":1,"sessionLabel":"上肢","movements":[{"name":"俯卧撑"}]}]}\'',
  'calorie.workout.plan-update': 'calorie-cmd-read calorie.workout.plan-update --params \'{"title":"示例改名"}\'',
  'calorie.workout.plan-update-day': 'calorie-cmd-read calorie.workout.plan-update-day --params \'{"week":1,"dayOfWeek":3,"newLabel":"下肢＋核心"}\'',
  'calorie.workout.plan-update-movement': 'calorie-cmd-read calorie.workout.plan-update-movement --params \'{"oldMovement":"硬拉","newMovement":{"name":"杠铃划船"}}\'',
  'calorie.help.center': 'calorie-cmd-read calorie.help.center --params \'{"q":"记身材照"}\'',
  'calorie.help.lookup': 'calorie-cmd-read calorie.help.lookup --params \'{"q":"看今日主页"}\'',
  'calorie.history': 'calorie-cmd-read calorie.history --params \'{"days":7}\'',
  'calorie.photo.compare': 'calorie-cmd-read calorie.photo.compare --params \'{"id1":1,"id2":2}\'',
  'calorie.photo.detail': 'calorie-cmd-read calorie.photo.detail --params \'{"id":1}\'',
  'calorie.photo.gif': 'calorie-cmd-read calorie.photo.gif --params \'{"tag":"正面"}\'',
  'calorie.photo.list': 'calorie-cmd-read calorie.photo.list --params \'{"tag":"正面"}\'',
  'calorie.today': 'calorie-cmd-read calorie.today --params \'{"date":"今日"}\'',
  'calorie.view.anomaly': 'calorie-cmd-read calorie.view.anomaly --params \'{"kind":"weight_volatility","window":"90d"}\'',
  'calorie.view.batch-import-preview': 'calorie-cmd-read calorie.view.batch-import-preview --params \'{"items":[{"foodName":"粥","calories":150,"protein":3,"date":"<日期>"}]}\'',
  'calorie.view.body-composition': 'calorie-cmd-read calorie.view.body-composition',
  'calorie.view.body-composition-compare': 'calorie-cmd-read calorie.view.body-composition-compare --params \'{"period1Start":"2026-09-05","period1End":"2026-09-05","period2Start":"2026-09-07","period2End":"2026-09-07"}\'',
  'calorie.view.body-measure': 'calorie-cmd-read calorie.view.body-measure --params \'{"metric":"waist_cm"}\'',
  'calorie.view.body-measure-compare': 'calorie-cmd-read calorie.view.body-measure-compare --params \'{"date1":"2026-09-05","date2":"2026-09-07"}\'',
  'calorie.view.calorie-trend': 'calorie-cmd-read calorie.view.calorie-trend --params \'{"window":"7d"}\'',
  'calorie.view.combined': 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_calorie","window":"7d"}\'',
  'calorie.view.composition-wizard': 'calorie-cmd-read calorie.view.composition-wizard',
  'calorie.view.contraindication': 'calorie-cmd-read calorie.view.contraindication --params \'{"part":"all"}\'',
  'calorie.view.dedupe': 'calorie-cmd-read calorie.view.dedupe',
  'calorie.view.deficit': 'calorie-cmd-read calorie.view.deficit --params \'{"window":"7d"}\'',
  'calorie.view.diet': 'calorie-cmd-read calorie.view.diet --params \'{"window":"今日"}\'',
  'calorie.view.diet-review': 'calorie-cmd-read calorie.view.diet-review --params \'{"window":"7d"}\'',
  'calorie.view.exercise': 'calorie-cmd-read calorie.view.exercise --params \'{"window":"今日"}\'',
  'calorie.view.exercise-cardio': 'calorie-cmd-read calorie.view.exercise-cardio --params \'{"window":"7d"}\'',
  'calorie.view.exercise-distribution': 'calorie-cmd-read calorie.view.exercise-distribution --params \'{"window":"7d"}\'',
  'calorie.view.exercise-goal': 'calorie-cmd-read calorie.view.exercise-goal --params \'{"window":"今日"}\'',
  'calorie.view.exercise-recap': 'calorie-cmd-read calorie.view.exercise-recap --params \'{"window":"7d"}\'',
  'calorie.view.exercise-records': 'calorie-cmd-read calorie.view.exercise-records --params \'{"window":"7d"}\'',
  'calorie.view.exercise-review': 'calorie-cmd-read calorie.view.exercise-review --params \'{"window":"本周"}\'',
  'calorie.view.exercise-strength': 'calorie-cmd-read calorie.view.exercise-strength --params \'{"window":"7d"}\'',
  'calorie.view.exercise-trend': 'calorie-cmd-read calorie.view.exercise-trend --params \'{"window":"7d"}\'',
  'calorie.view.gif-planner': 'calorie-cmd-read calorie.view.gif-planner --params \'{"tag":"正面"}\'',
  'calorie.view.goal': 'calorie-cmd-read calorie.view.goal --params \'{"window":"7d"}\'',
  'calorie.view.goal-config': 'calorie-cmd-read calorie.view.goal-config',
  'calorie.view.goal-expiring': 'calorie-cmd-read calorie.view.goal-expiring',
  'calorie.view.goal-predict': 'calorie-cmd-read calorie.view.goal-predict --params \'{"window":"14d"}\'',
  'calorie.view.goal-progress': 'calorie-cmd-read calorie.view.goal-progress --params \'{"window":"今日"}\'',
  'calorie.view.goal-recommend': 'calorie-cmd-read calorie.view.goal-recommend --params \'{"profile":"cut"}\'',
  'calorie.view.goal-status': 'calorie-cmd-read calorie.view.goal-status',
  'calorie.view.goal-vs-actual': 'calorie-cmd-read calorie.view.goal-vs-actual --params \'{"window":"30d"}\'',
  'calorie.view.goal-weight': 'calorie-cmd-read calorie.view.goal-weight --params \'{"window":"30d"}\'',
  'calorie.view.goal-wizard': 'calorie-cmd-read calorie.view.goal-wizard',
  'calorie.view.health': 'calorie-cmd-read calorie.view.health --params \'{"window":"本周"}\'',
  'calorie.view.home': 'calorie-cmd-read calorie.view.home --params \'{"date":"今日"}\'',
  'calorie.view.library': 'calorie-cmd-read calorie.view.library',
  'calorie.view.lint-health': 'calorie-cmd-read calorie.view.lint-health',
  'calorie.view.long-trend': 'calorie-cmd-read calorie.view.long-trend --params \'{"group":"weight_calorie","window":"30d"}\'',
  'calorie.view.measure-wizard': 'calorie-cmd-read calorie.view.measure-wizard',
  'calorie.view.multi-trend': 'calorie-cmd-read calorie.view.multi-trend --params \'{"window":"90d","compare":"target"}\'',
  'calorie.view.nutrition-analysis': 'calorie-cmd-read calorie.view.nutrition-analysis --params \'{"window":"7d"}\'',
  'calorie.view.nutrition-detail': 'calorie-cmd-read calorie.view.nutrition-detail --params \'{"window":"7d"}\'',
  'calorie.view.nutrition-ratio': 'calorie-cmd-read calorie.view.nutrition-ratio --params \'{"window":"7d"}\'',
  'calorie.view.photo-log-wizard': 'calorie-cmd-read calorie.view.photo-log-wizard',
  'calorie.view.photo-picker': 'calorie-cmd-read calorie.view.photo-picker',
  'calorie.view.plan': 'calorie-cmd-read calorie.view.plan --params \'{"date":"今日"}\'',
  'calorie.view.plan-vs-actual': 'calorie-cmd-read calorie.view.plan-vs-actual --params \'{"window":"本周"}\'',
  'calorie.view.plan-wizard': 'calorie-cmd-read calorie.view.plan-wizard --params \'{"plan":{"config":{"title":"减脂4周","start_date":"<开始日期>","user_level":"中手","available_equipment":["瑜伽垫"]},"weeks":[{"week_number":1,"days":[{"day_of_week":1,"sessions":[{"session_label":"上肢","movements":[{"name":"俯卧撑","part":"胸","type":"力量","sets":[]}]}]}]}]}}\'',
  'calorie.view.plan-write-preview': 'calorie-cmd-read calorie.view.plan-write-preview --params \'{"op":"copy"}\'',
  'calorie.view.predict': 'calorie-cmd-read calorie.view.predict --params \'{"horizonDays":7,"window":"14d"}\'',
  'calorie.view.process-progress': 'calorie-cmd-read calorie.view.process-progress',
  'calorie.view.profile': 'calorie-cmd-read calorie.view.profile',
  'calorie.view.profile-wizard': 'calorie-cmd-read calorie.view.profile-wizard',
  'calorie.view.ranking': 'calorie-cmd-read calorie.view.ranking --params \'{"category":"high_calorie","topN":10,"window":"7d"}\'',
  'calorie.view.review-template': 'calorie-cmd-read calorie.view.review-template --params \'{"window":"7d"}\'',
  'calorie.view.search': 'calorie-cmd-read calorie.view.search --params \'{"keyword":"鸡胸"}\'',
  'calorie.view.six-factors': 'calorie-cmd-read calorie.view.six-factors --params \'{"date":"今日"}\'',
  'calorie.view.source-stats': 'calorie-cmd-read calorie.view.source-stats',
  'calorie.view.today-water': 'calorie-cmd-read calorie.view.today-water --params \'{"date":"今日"}\'',
  'calorie.view.volatility': 'calorie-cmd-read calorie.view.volatility --params \'{"window":"7d"}\'',
  'calorie.view.weight': 'calorie-cmd-read calorie.view.weight',
  'calorie.view.weight-compare': 'calorie-cmd-read calorie.view.weight-compare --params \'{"window":"30d","compareWindow":"prev"}\'',
  'calorie.view.weight-history': 'calorie-cmd-read calorie.view.weight-history --params \'{"days":7}\'',
  'calorie.view.weight-review': 'calorie-cmd-read calorie.view.weight-review',
};
// -- GEN-CLI-END EXAMPLE 表

/** 逐键取示例：住声明的 `example` 字段，由 `gen-cli.mjs` 落成上面那张表（#295 返修 A3）。
 * 表里没有＝声明漏了 `example`（`CommandSpec` 的必填字段，tsc 与生成器各拦一道）——大声失败，不静默降级。 */
function exampleFor(key) {
  const hit = EXAMPLES[key];
  if (hit === undefined) {
    throw new Error('exampleFor 缺 case：' + key + '（新增键必须在声明里带 example，不得落 default）');
  }
  return hit;
}

export function buildHelpBlock() {
  const keys = Object.keys(CALORIE_COMBOS).sort();
  const lines = ['| 唤醒词 | key | shape | 例 |', '|---|---|---|---|'];
  for (const k of keys) {
    const shape = CALORIE_COMBOS[k].shape;
    const wake = REPR[k] || k;
    lines.push('| ' + wake + ' | ' + k + ' | ' + shape + ' | \u0060' + exampleFor(k) + '\u0060 |');
  }
  lines.push('');
  lines.push('相关场景：' + keys.join('、') + '（' + keys.length + ' 组合，key 字符串 skilllink 登记时冻结；内部 VIEW 下划线键仅渲染复用）。');
  lines.push('身材照片 HELP 模块：skill-calorie/photo/photo＋skill-calorie/photo/photos（gallery/compare/viewer/gif + buildPhotoHelp/lookupPhotoHelp，现找直达可执行 exec）。');
  return lines.join('\n');
}

/** 只重写 AUTO 块：标记缺失即抛（不静默截断文件）。供 runMain 与门禁脚本复用。 */
export function renderSkillMd(text) {
  const si = text.indexOf(START), ei = text.indexOf(END);
  if (si < 0 || ei < 0 || ei < si) throw new Error('ERR: SKILL.md 缺 HELP 标记块');
  return text.slice(0, si + START.length) + '\n' + buildHelpBlock() + '\n' + text.slice(ei);
}

function runMain() {
  const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');
  const skillPath = join(pkgDir, 'SKILL.md');
  const next = renderSkillMd(readFileSync(skillPath, 'utf8'));
  writeFileSync(skillPath, next);
  console.log('HELP 已注入：' + skillPath);
}

// 只在**作为脚本运行**时写盘（照 packages/base-combos/scripts/build-help.mjs 同形，#80 已落地）。
// 被 import 时零副作用：否则 `pnpm test`（skill-t11 导入本模块取 buildHelpBlock）会在测试进程里
// 重写受跟踪的 SKILL.md —— 进程被杀即等长零填充（事故 #124），且会让 skill-t11 的「互联区新鲜」
// 断言恒真（自己写、自己比，永远相等，无鉴别力）。
const isMain = (() => {
  try { return process.argv[1] ? pathToFileURL(process.argv[1]).href === import.meta.url : false; }
  catch { return false; }
})();
if (isMain) runMain();
