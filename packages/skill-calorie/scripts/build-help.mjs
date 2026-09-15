#!/usr/bin/env node
// HELP 构建期注入（T11，照 M6 范式；#40 追加 35 写键）：CALORIE_COMBOS 全量键 + 代表唤醒词→速查表→SKILL.md 互联区；只重写标记块，其余不动。无标记即大声失败。
//
// 入口：`pnpm help:build`（= 跑本文件）。本文件里**没有一条命令的手写事实**：
//   REPR 表、EXAMPLE 表与 FLOW 表（#338）都是 `scripts/gen-cli.mjs` 的标记块生成物，其余从 `dist/cli/keys.js` 读。
//   #278 追加「场景 02 饮食」逐词表（一行一条唤醒词 → 命令 → 工作流程，70 行）：唤醒词与类型取自 HELP 资产
//   「饮食」组（`dist/triggers/wake-assets.js`），并与冻结表 `dist/triggers/scene-02-diet.js` 逐词核对；
//   命令取自路由层（`dist/triggers/routing.js` 的 `ALL_ROUTES`）。任一侧缺一条即抛，不静默少一行。
//   同票：示例里的写死日期换成登记过的占位符（照抄出来不许指向过期时间段）；饮食场景的命令，其代表唤醒词
//   取自它自己那条词（源＝路由层），不再退回命令名。
//   工作流程名的唯一住处是命令声明上的可选 `flow`（`src/shared/commandSpec.ts`）；本文件只列名单（`BODY_HELP_FLOWS`
//   ＝帮助面场景 03 的八个下一级分组名），声明里出现名单外的名字即抛。
// 重生成 SKILL.md 的正确顺序（少一步就会得到「键数停在旧的」这种静默结果）：
//   `pnpm build` → `pnpm gen` → `pnpm build`（把生成出来的 `src/cli/keys.ts` 编进 `dist/`）→ `pnpm help:build`
//   → 需要 `combos.yaml` 的镜像连带时再 `node packages/base-combos/scripts/gen-present.mjs`。
// `pnpm gen:check`（CI 一道门）比对的是**生成物 == 生成器输出**，不含 SKILL.md 本身；
// 本文件的产物新鲜度由 `pnpm help:examples:check` 的「AUTO 块 == renderSkillMd 输出」那一条盯。
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CALORIE_COMBOS, isCalorieWriteKey } from '../dist/cli/keys.js';
import { ALL_ROUTES } from '../dist/triggers/routing.js';
import { SCENE_02_DIET } from '../dist/triggers/scene-02-diet.js';
import { WAKE_GROUPS } from '../dist/triggers/wake-assets.js';

export const START = '<!-- HELP-AUTO-START -->';
export const END = '<!-- HELP-AUTO-END -->';

// -- GEN-CLI-START REPR 表（由 packages/skill-calorie/scripts/gen-cli.mjs 生成，勿手改）
// 每组合键一行代表唤醒词（优先真实 TRIGGERS 短语，照片 HELP 10 键原样，通用 HELP 走 lookup）。
const REPR = {
  'calorie.body.composition-add': '记体脂（皮褶钳）',
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
  'calorie.help.center': '卡路里HELP',
  'calorie.help.lookup': '看今日主页',
  'calorie.history': '查热量历史',
  'calorie.photo.compare': '对比两张照片',
  'calorie.photo.detail': '查身材照',
  'calorie.photo.gif': '生成身材照GIF',
  'calorie.photo.list': '看身材照',
  'calorie.report.bmi': '看BMI报告',
  'calorie.report.bmr': '看BMR报告',
  'calorie.report.compare': '看健康报告(含对比)',
  'calorie.report.protein': '看蛋白质摄入报告',
  'calorie.report.score': '看综合评分',
  'calorie.report.tdee': '看TDEE报告',
  'calorie.report.trend': '看健康趋势',
  'calorie.report.water': '看水分摄入报告',
  'calorie.today': '看今日饮食概览',
  'calorie.view.batch-import-preview': '看批量导入预览',
  'calorie.view.body-composition': '看体脂',
  'calorie.view.body-composition-compare': '对比体脂',
  'calorie.view.body-measure': '看围度',
  'calorie.view.body-measure-compare': '对比围度',
  'calorie.view.calorie-trend': '看热量趋势',
  'calorie.view.combined': '看体重 vs 摄入(最近 7 天)',
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
  'calorie.view.multi-trend': '看整体趋势(含目标对比)',
  'calorie.view.nutrition-analysis': '看营养分析',
  'calorie.view.nutrition-detail': '看营养素深度',
  'calorie.view.nutrition-ratio': '查营养配比',
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

// #338 · 帮助面场景 03（体重）工作流程名的**名单**：与「帮助面八个下一级分组」一一对应。
// 名字的事实住命令声明（`src/weight/commands.ts` 的 `flow`），这里只列合法取值、当校验表用。
export const BODY_HELP_FLOWS = ['量体重', '改体重记录', '看体重明细', '看体重曲线', '看体重稳不稳', '看体重备注', '对比体重', '体重复盘'];

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
  'calorie.report.bmi': 'calorie-cmd-read calorie.report.bmi --params \'{"window":"90d"}\'',
  'calorie.report.bmr': 'calorie-cmd-read calorie.report.bmr --params \'{"window":"30d"}\'',
  'calorie.report.compare': 'calorie-cmd-read calorie.report.compare --params \'{"window":"7d"}\'',
  'calorie.report.protein': 'calorie-cmd-read calorie.report.protein --params \'{"window":"30d"}\'',
  'calorie.report.score': 'calorie-cmd-read calorie.report.score --params \'{"window":"30d"}\'',
  'calorie.report.tdee': 'calorie-cmd-read calorie.report.tdee --params \'{"window":"30d"}\'',
  'calorie.report.trend': 'calorie-cmd-read calorie.report.trend --params \'{"window":"90d"}\'',
  'calorie.report.water': 'calorie-cmd-read calorie.report.water --params \'{"window":"30d"}\'',
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
  'calorie.view.label-precheck': 'calorie-cmd-read calorie.view.label-precheck --params \'{"productName":"鸡胸","calories":200,"protein":35,"note":"营养表识别"}\'',
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

// -- GEN-CLI-START FLOW 表（由 packages/skill-calorie/scripts/gen-cli.mjs 生成，勿手改）
// #338 · 命令 → 工作流程名（读声明上的可选 `flows`；缺的键此处没有行，不补默认值）。
const FLOW = {
  'calorie.weight.batch': ['量体重'],
  'calorie.weight.log': ['量体重'],
  'calorie.weight.remove': ['改体重记录'],
  'calorie.weight.update': ['改体重记录'],
  'calorie.view.goal-weight': ['对比体重'],
  'calorie.view.volatility': ['看体重稳不稳'],
  'calorie.view.weight': ['量体重', '体重复盘'],
  'calorie.view.weight-compare': ['对比体重'],
  'calorie.view.weight-history': ['看体重明细', '看体重曲线', '看体重备注'],
  'calorie.view.weight-review': ['体重复盘'],
};
// -- GEN-CLI-END FLOW 表

// -- GEN-CLI-START 预检页表（由 packages/skill-calorie/scripts/gen-cli.mjs 生成，勿手改）
// 写命令 → 它先出的预检确认页命令（值一律是注册表里的键；读命令与「读—确认—写」那一类没有行）。
// 源＝`src/body/wizardPlate.ts` 的 `WIZARD_WRITE_KEYS`（键名＝页名，值＝该页服务的写命令），本表只做反查。
const PRECHECK_PAGE = {
  'calorie.body.composition-add': 'calorie.view.composition-wizard',
  'calorie.body.measure-add': 'calorie.view.measure-wizard',
};
// -- GEN-CLI-END 预检页表

/** 该键的预检确认页命令；读命令与「没有预检页的写命令」都返空串（表格那一格留空，不造占位文案）。 */
function precheckFor(key) {
  const page = PRECHECK_PAGE[key];
  if (page === undefined) return '';
  if (CALORIE_COMBOS[page] === undefined) {
    throw new Error('预检页不是注册表里的键：' + key + ' → ' + page);
  }
  return page;
}

/** 逐键取示例：住声明的 `example` 字段，由 `gen-cli.mjs` 落成上面那张表（#295 返修 A3）。
 * 表里没有＝声明漏了 `example`（`CommandSpec` 的必填字段，tsc 与生成器各拦一道）——大声失败，不静默降级。
 * #278：示例里的具体日期换成占位符再上表——写死的 `2026-09-xx` 照抄出来指向过期时间段，
 * 而占位符的替换值登记在 `docs/research/t81-seed.mjs`（`pnpm help:examples:check` 按那份登记逐行实跑）。 */
export const EXAMPLE_PLACEHOLDERS = ['<开始日期>', '<结束日期>', '<对比开始日期>', '<对比结束日期>', '<日期>'];
const ISO_DATE_RE = /\b\d{4}-\d{2}-\d{2}\b/g;
/** 一个日期＝让调用方自己填哪天（只此一个占位符）。 */
const ONE_DATE_PLACEHOLDER = '<日期>';
/** 两个以上＝两段（或多段）对比的起止，按出现次序取。 */
const RANGE_PLACEHOLDERS = EXAMPLE_PLACEHOLDERS.filter((p) => p !== ONE_DATE_PLACEHOLDER);

/** 把示例里的日期字面量按**出现次序**换成登记过的占位符。
 *
 *  按次序（不是按「不同日期分组替换」）：一个日期＝让调用方自己填哪天（`<日期>`）；
 *  两个以上＝两段对比的起止，按出现次序取 `<开始日期>`／`<结束日期>`／`<对比开始日期>`／`<对比结束日期>`。
 *  按次序才守得住两件事：① 同一天的起止（`period1Start`／`period1End` 同值）会得到**同一个**占位符，
 *  替换回同一个真实日期，起止仍是一天；② 两段对比的四个位置各得各的占位符，
 *  替换回**各自登记的**日子，照抄出来仍是两段而不是同一个日期铺满四处。
 *  位置不够就抛（不静默退回「按值分组」那种铺满四处的写法）。 */
export function dateFreeExample(cmd) {
  const dates = cmd.match(ISO_DATE_RE) ?? [];
  if (dates.length === 0) return cmd;
  const picks = dates.length === 1 ? [ONE_DATE_PLACEHOLDER] : RANGE_PLACEHOLDERS;
  if (dates.length > picks.length) {
    throw new Error('示例里的日期多于已登记的占位符：' + cmd + '（' + dates.length + ' 处日期，只有 '
      + picks.length + ' 个位置：' + picks.join('、')
      + '。要加位置，先在 docs/research/t81-seed.mjs 的 PLACEHOLDER_SUBSTITUTIONS 登记替换值，'
      + '再加进本文件的 EXAMPLE_PLACEHOLDERS——两处同一份口径，不许只改一处）');
  }
  let i = 0;
  return cmd.replace(ISO_DATE_RE, () => picks[i++]);
}

function exampleFor(key) {
  const hit = EXAMPLES[key];
  if (hit === undefined) {
    throw new Error('exampleFor 缺 case：' + key + '（新增键必须在声明里带 example，不得落 default）');
  }
  return dateFreeExample(hit);
}

/* ── 场景 02 饮食：一行一条唤醒词 → 命令 → 工作流程 ──────────────────────────────────────
 *
 * 单一来源两处，本文件不存第三份：
 *   ① 唤醒词与它的类型（结果／回执／过程）＝ HELP 资产「饮食」组的场景数据
 *      （`src/triggers/wake-assets.ts`，用户看的 HELP 场景页与它是同一份）；与冻结唤醒词表
 *      `src/triggers/scene-02-diet.ts` 逐词双向核对，差一条即抛并点名。
 *   ② 该词跑哪条命令＝路由层（`src/triggers/routing.ts` 的 `ALL_ROUTES`，记录住 `src/diet/routes.ts`）；
 *      该词没有可执行命令即抛并点名——不许静默少一行。 */

/** 一条场景的流程类别 → 表里那句话。三类名字取 HELP 资产自己的 `types`（结果／回执／过程），不另造词。 */
const DIET_FLOW_TEXT = {
  结果: '结果：跑这条命令 → 结果型 HTML 落盘',
  回执: '回执：跑这条命令 → 写后回执页落盘',
  过程: '过程：先出预检确认页 → 用户确认 → 跑这条命令',
};

/** HELP 资产「饮食」组的场景（唤醒词 ＋ 类型），照实物分组顺序。 */
export function dietScenes(groups = WAKE_GROUPS) {
  const group = groups.find((g) => g.id === 'diet');
  if (group === undefined) throw new Error('HELP 资产缺「饮食」分组（id=diet）');
  return group.subgroups.flatMap((s) => s.scenes);
}

/** 流程类别：HELP 资产的 `types` 是第一来源；实物遗留的那 1 条没有 `types`，按它那条命令的种类定。
 *  同时核对「类型 ↔ 命令种类」对得上（回执／过程＝会改数据库的命令，结果＝查询命令）——对不上即抛。 */
function dietFlowOf(scene, key) {
  const hit = (Array.isArray(scene.types) ? scene.types : []).find((t) => DIET_FLOW_TEXT[t] !== undefined);
  const isWrite = isCalorieWriteKey(key);
  if (hit === undefined) return isWrite ? '回执' : '结果';
  if (isWrite !== (hit === '回执' || hit === '过程')) {
    throw new Error('饮食场景的类型与命令对不上：' + scene.wake_word + ' 类型=' + hit + ' 命令=' + key);
  }
  return hit;
}

/** 逐词行：顺序＝冻结唤醒词表的顺序（用户语言的原序）。行数对不上、词没有命令 ⇒ 抛。 */
export function buildDietRows({ scenes = dietScenes(), routes = ALL_ROUTES } = {}) {
  const frozen = SCENE_02_DIET.map((t) => t.wake_word);
  const assetWords = scenes.map((s) => s.wake_word);
  const onlyAsset = assetWords.filter((w) => !frozen.includes(w));
  const onlyFrozen = frozen.filter((w) => !assetWords.includes(w));
  if (onlyAsset.length > 0 || onlyFrozen.length > 0) {
    throw new Error('饮食唤醒词两处对不上——HELP 资产多出：[' + onlyAsset.join('、')
      + ']；冻结唤醒词表多出：[' + onlyFrozen.join('、') + ']');
  }
  const firstRoute = new Map();
  for (const r of routes) {
    if (r.kind !== 'exec' || firstRoute.has(r.wakeWord)) continue;
    firstRoute.set(r.wakeWord, r);
  }
  return frozen.map((wake) => {
    const route = firstRoute.get(wake);
    if (route === undefined) throw new Error('饮食唤醒词没有可执行的命令：' + wake);
    if (typeof route.cli !== 'string' || route.cli === '') throw new Error('饮食唤醒词那条路由缺命令原文：' + wake);
    return { wake, cli: route.cli, key: route.key, flow: dietFlowOf(scenes.find((s) => s.wake_word === wake), route.key) };
  });
}

/** 场景 02 的逐词表：一行一条唤醒词。行数与两处来源逐条对得上，缺一条即抛。 */
export function buildDietSection(opts) {
  const rows = buildDietRows(opts);
  const count = (t) => rows.filter((r) => r.flow === t).length;
  const L = ['### 场景 02 饮食 · 逐条唤醒词 → 命令 → 工作流程（' + rows.length + ' 条，一行一条唤醒词）', '',
    '| 唤醒词 | 命令（照抄即跑） | 工作流程 |', '|---|---|---|'];
  for (const r of rows) L.push('| ' + r.wake + ' | \u0060' + r.cli + '\u0060 | ' + DIET_FLOW_TEXT[r.flow] + ' |');
  L.push('');
  L.push('本表 ' + rows.length + ' 行＝HELP 资产「饮食」组的场景条数＝冻结唤醒词表 `scene-02-diet.ts` 的条数'
    + '（构建期逐词核对，差一条即停）；三类流程：结果 ' + count('结果') + ' 条／回执 ' + count('回执')
    + ' 条／过程 ' + count('过程') + ' 条。');
  L.push('「命令」列是该词在路由层（`src/diet/routes.ts`）记的那一条，照抄即跑；'
    + '三类的步骤与交付判据见「场景 02 饮食工作流程」一节。');
  return L.join('\n');
}

/** 饮食场景各命令的代表唤醒词（该场景自己的词，按路由层记录顺序取第一条）。 */
export function dietRepresentatives(routes = ALL_ROUTES, frozen = SCENE_02_DIET.map((t) => t.wake_word)) {
  const words = new Set(frozen);
  const m = new Map();
  for (const r of routes) {
    if (r.kind !== 'exec' || !words.has(r.wakeWord) || m.has(r.key)) continue;
    m.set(r.key, r.wakeWord);
  }
  return m;
}

/** #338 · 声明里的工作流程名只许取 `BODY_HELP_FLOWS` 里的取值：名字写错即抛（不静默少一列）。
 *  一个键可以服务多条流程（`calorie.view.weight-history`＝明细／曲线／备注），故值是「／」连的一份表。 */
function flowFor(key) {
  const flows = FLOW[key];
  if (!Array.isArray(flows) || flows.length === 0) return '';
  for (const f of flows) {
    if (!BODY_HELP_FLOWS.includes(f)) {
      throw new Error('流程名不在名单里：' + key + ' → ' + f + '（合法取值见 BODY_HELP_FLOWS）');
    }
  }
  return flows.join('／');
}

export function buildHelpBlock() {
  const keys = Object.keys(CALORIE_COMBOS).sort();
  const diet = dietRepresentatives();
  const src = { diet: 0, declared: 0, none: 0 };
  const wakeOf = (k) => {
    if (diet.has(k)) { src.diet += 1; return diet.get(k); }
    if (REPR[k] !== undefined) { src.declared += 1; return REPR[k]; }
    src.none += 1; return k;         // 只为页面服务、没有唤醒词的命令：首列列命令名自身（条数写进下面那句自述）
  };
  const lines = ['| 唤醒词 | key | shape | 预检页 | 流程 | 例 |', '|---|---|---|---|---|---|'];
  for (const k of keys) {
    const shape = CALORIE_COMBOS[k].shape;
    lines.push('| ' + wakeOf(k) + ' | ' + k + ' | ' + shape + ' | ' + precheckFor(k) + ' | ' + flowFor(k)
      + ' | \u0060' + exampleFor(k) + '\u0060 |');
  }
  lines.push('');
  lines.push('「唤醒词」列是这条命令的代表词，三个来源逐条自述：饮食场景的命令取它自己那条词（源＝路由层，'
    + src.diet + ' 条）；其余取命令声明里的代表词（`gen-cli.mjs` 写 `REPR` 表，' + src.declared + ' 条）；'
    + '只为页面服务、没有唤醒词的命令列命令名自身（' + src.none + ' 条）。本生成器不另存第二份唤醒词。'
    + '「预检页」列是该写命令**先出的预检确认页命令**（查询命令与「读—确认—写」那一类留空，事实出处＝'
    + '`src/body/wizardPlate.ts` 的 `WIZARD_WRITE_KEYS`）；「流程」列是它服务的工作流程名。'
    + '三列的事实都住各自能力目录的声明与路由，本表由 `pnpm help:build` 生成。');
  lines.push('体重一族 58 条唤醒词各归**一条**工作流程（八条流程的步骤与逐条对照见「场景 03 体重工作流程」一节与'
    + ' `docs/skills/skill-calorie/t338-流程接线-证据.md` §3）；流程名的事实住命令声明（`src/weight/commands.ts` 与'
    + ' `src/goal/commands.ts` 的 `flows`），本表由 `pnpm help:build` 生成。');
  lines.push('上表「流程」列按**命令**列：一条命令服务多条流程时用「／」列全（`calorie.view.weight-history`＝看体重明细／看体重曲线／看体重备注），'
    + '首项是「唤醒词」列那条代表词所在的流程；「唤醒词」列是这条命令的代表词，个别命令的代表词取自别的场景清单'
    + '（如 `calorie.view.weight-review` 一行的「看体重复核」）。');
  lines.push('相关场景：' + keys.join('、') + '（' + keys.length + ' 组合，key 字符串 skilllink 登记时冻结；内部 VIEW 的下划线名只供页面装配复用）。');
  lines.push('身材照片 HELP 模块：skill-calorie/photo/photo＋skill-calorie/photo/photos（gallery/compare/viewer/gif/picker + buildPhotoHelp/lookupPhotoHelp，现找直达可执行 exec）。');
  lines.push('');
  lines.push(buildDietSection());
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
