/** 目标管理（HELP 场景 06「目标管理」）的命令声明（**权威源**）。
 *
 * #318 · 从 `src/cli/legacy/scene-06.ts` 搬入（13 条：写 5 ＋ 读 8），**六字段逐字照抄**——
 * 键／形状／标题／代表唤醒词／示例一字未动（纯搬迁；行为不变）。
 * #320 · 再从 `src/cli/legacy/scene-03.ts` 补搬 1 条读命令（`calorie.view.goal-weight`，共 14 条）：
 * 它与本能力既有八条同族（键族 `calorie.view.goal*`），且与写命令 `calorie.goal.weight` 同属
 * 「体重目标」这一件事；六字段同样逐字照抄（`wakeWord` 保持旧值 `定体重目标` ⇒ 生成物 `REPR`
 * 块与 `SKILL.md` 逐字节不变，搬迁是纯的）。
 *
 * 核验发现（**只记录不在此改**，账见 `docs/skills/skill-calorie/t318-核验补齐-证据.md`）：
 * 三条声明的代表唤醒词在路由表里落的是别的键（#294 的对账口径是「代表唤醒词必须路由回同键」，
 * `test/cmd-registry-294.test.mjs:220-229`；该断言今天只跑 `WEIGHT_COMMANDS`，故三条不报红）：
 *   - `calorie.view.goal`：`看今日目标进度` 落 `calorie.view.goal-progress`（键属场景 01 那张票）；
 *   - `calorie.view.goal-config`：`定营养目标` 落 `calorie.goal.set`；
 *   - `calorie.view.goal-recommend`：`定营养目标(自动算)` 落 `calorie.view.goal-wizard`。
 *   - `calorie.view.goal-weight`（#320 从 `src/cli/legacy/scene-03.ts` 补搬）：`定体重目标` 落
 *     `calorie.goal.weight`（**同名写命令**，本能力那一件）。与上面三条同处理：照抄不动。
 * 四条各有一条**同键**的现成词可换（`看目标完成度`／`看目标配置`／`看目标推荐`／
 * `对比体重：当前 vs 目标体重`，均在路由表内）。
 * 编排者裁决（六席一致）：**代表唤醒词属产品内容，本票不替产品定**；故一律照抄，留待收口票处置。
 *
 * 子功能与命令的对应（HELP 下一级 → 命令）：定目标＝`calorie.goal.set`／`.water`／`.weight`／`.exercise`；
 * 改目标＝`calorie.goal.pause`／`.resume`；看目标＝`calorie.view.goal*` 九条（含 #320 补搬的
 * `view.goal-weight`）。
 *
 * #703 · 写命令的**信封形状**不写在声明上（写命令一律 `receipt` 形，那件事实的唯一定义地在生成器
 * `scripts/gen-cli.mjs` 合成的 `cli/keys.ts`）；带整页回执的写命令另在声明上挂 `doc:` 那一位。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import { viewGoal, viewGoalConfig, viewGoalExpiring, viewGoalPredict, viewGoalRecommend, viewGoalStatus, viewGoalVsActual, viewGoalWeight, viewGoalWizard } from './read.js';
import { writeGoalExercise, writeGoalPause, writeGoalResume, writeGoalSet, writeGoalWater, writeGoalWeight } from './write.js';
import { goalReceiptDoc } from './receipt.js';

export const GOAL_COMMANDS = [
  { kind: 'write', key: 'calorie.goal.pause', title: '暂停目标', wakeWord: '暂停所有目标', run: writeGoalPause, doc: goalReceiptDoc, example: 'calorie-cmd-read calorie.goal.pause' },
  { kind: 'write', key: 'calorie.goal.resume', title: '重启目标', wakeWord: '重启所有目标', run: writeGoalResume, doc: goalReceiptDoc, example: 'calorie-cmd-read calorie.goal.resume' },
  { kind: 'write', key: 'calorie.goal.set', title: '定营养目标', wakeWord: '定营养目标', run: writeGoalSet, doc: goalReceiptDoc, example: 'calorie-cmd-read calorie.goal.set --params \'{"calorie":1800,"protein":150,"carbs":200,"fat":50}\'' },
  { kind: 'write', key: 'calorie.goal.water', title: '定饮水目标', wakeWord: '定饮水目标', run: writeGoalWater, doc: goalReceiptDoc, example: 'calorie-cmd-read calorie.goal.water --params \'{"water":2000}\'' },
  { kind: 'write', key: 'calorie.goal.weight', title: '定体重目标', wakeWord: '定体重目标', run: writeGoalWeight, doc: goalReceiptDoc, example: 'calorie-cmd-read calorie.goal.weight --params \'{"kg":68}\'' },
  { kind: 'write', key: 'calorie.goal.exercise', title: '定运动目标', wakeWord: '定运动目标', run: writeGoalExercise, doc: goalReceiptDoc, example: 'calorie-cmd-read calorie.goal.exercise --params \'{"goal":300}\'' },
  { kind: 'read', key: 'calorie.view.goal', shape: 'stat', title: '目标分析', wakeWord: '看目标完成度', run: viewGoal, example: 'calorie-cmd-read calorie.view.goal --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.goal-config', shape: 'stat', title: '目标配置', wakeWord: '看目标配置', run: viewGoalConfig, example: 'calorie-cmd-read calorie.view.goal-config' },
  { kind: 'read', key: 'calorie.view.goal-expiring', shape: 'stat', title: '即将到期目标', wakeWord: '看即将到期的目标', run: viewGoalExpiring, example: 'calorie-cmd-read calorie.view.goal-expiring' },
  { kind: 'read', key: 'calorie.view.goal-predict', shape: 'stat', title: '目标预测达成', wakeWord: '看目标预测达成', run: viewGoalPredict, example: 'calorie-cmd-read calorie.view.goal-predict --params \'{"window":"14d"}\'' },
  { kind: 'read', key: 'calorie.view.goal-recommend', shape: 'stat', title: '目标推荐', wakeWord: '看目标推荐', run: viewGoalRecommend, example: 'calorie-cmd-read calorie.view.goal-recommend --params \'{"profile":"cut"}\'' },
  { kind: 'read', key: 'calorie.view.goal-status', shape: 'stat', title: '目标状态', wakeWord: '看目标状态', run: viewGoalStatus, example: 'calorie-cmd-read calorie.view.goal-status' },
  { kind: 'read', key: 'calorie.view.goal-vs-actual', shape: 'stat', title: '目标对比实际', wakeWord: '看目标对比实际', run: viewGoalVsActual, example: 'calorie-cmd-read calorie.view.goal-vs-actual --params \'{"window":"30d"}\'' },
  { kind: 'read', key: 'calorie.view.goal-wizard', shape: 'stat', title: '目标预检', wakeWord: '看目标预检', run: viewGoalWizard, example: 'calorie-cmd-read calorie.view.goal-wizard' },
  { kind: 'read', key: 'calorie.view.goal-weight', shape: 'stat', title: '体重目标', wakeWord: '看体重目标进度', flows: ['对比体重'], run: viewGoalWeight, example: 'calorie-cmd-read calorie.view.goal-weight --params \'{"window":"30d"}\'' },
] satisfies readonly CommandSpec[];
