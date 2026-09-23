/** 健身计划的命令声明（**权威源**，HELP 场景 05「健身计划」）。
 *
 * 加一条命令＝只改这个文件＋它那个子功能文件；`cli/` 里的索引与分派层一行不动。
 * 每条声明六件事：键（`cli/keys.ts` 登记的那个）／形状／标题（用户看到的中文名）／
 * 代表唤醒词（生成 SKILL.md 速查表用，必须是 `TRIGGERS` 里真有的唤醒词）／
 * 可执行示例（生成 SKILL.md 速查表「例」列用，照抄即能跑）／处理函数。
 *
 * 子功能与命令的对应（HELP 下一级 → 键）：看训练计划＝`view.plan`（＋同子功能的
 * `view.plan-vs-actual` 计划比实际）；定训练计划（过程页）＝
 * `view.plan-wizard`——**这一键的产出是计划编辑器（可写页）**，产出者住 `render/planEditorPort.ts`；
 * 计划复盘＝`view.exercise-review`；安全检查＝`view.contraindication`；
 * 落地训练（读侧进度）＝`view.process-progress`。
 * 「定训练计划」有写键（过程页出可写编辑器，用户复制命令后由下方 `workout.plan-*` 那一族写声明落库）；
 * 「落地训练」#612 起有写键 `workout.land`（读计划→补计划→记心愿→推送→回写收进同一命令，
 * `dryRun` 转预演过程页）；「落地到本周末」／「落地到本月底」#613 起有写键
 * `workout.land-weekend`／`workout.land-monthend`（天数自算＋逐天复用单日链，`dryRun` 同形）；「同步到训记」「拉训记实绩」两条是训记模块
 * 对外命令的薄包装（`xunjiPush.ts`／`xunjiBackfill.ts`：审计／调用／过程页／结果页收进同一命令），
 * 写键形（`workout.xunji-*`），`dryRun` 转预演过程页。「查训记 KEY 状态」是只读自救入口
 * （`xunjiKey.ts`：`view.xunji-key`），「设／清训记 KEY」是写自救入口（`workout.xunji-key-*`：写配置文件）。
 *
 * #703 · 写命令的**信封形状**不写在声明上（写命令一律 `receipt` 形，那件事实的唯一定义地在生成器
 * `scripts/gen-cli.mjs` 合成的 `cli/keys.ts`）；带整页回执的写命令另在声明上挂 `doc:` 那一位。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import { viewPlanEditor } from './planEditorPort.js';
import { viewContraindication } from './contraindication.js';
import { viewPlan, viewPlanVsActual, viewPlanWritePreview } from './plan.js';
import { viewProcessProgress } from './progress.js';
import { viewExerciseReview } from './review.js';
import { writeLand } from './land.js';
import { writeLandMonthend, writeLandWeekend } from './landBatch.js';
import { writeXunjiBackfill } from './xunjiBackfill.js';
import { writeXunjiPush } from './xunjiPush.js';
import { viewXunjiKeyStatus, writeXunjiKeyClear, writeXunjiKeySet } from './xunjiKey.js';
import {
  writePlanAddMovement,
  writePlanCopy,
  writePlanDelete,
  writePlanDeleteDay,
  writePlanSet,
  writePlanSetRest,
  writePlanSetWeek,
  writePlanUpdate,
  writePlanUpdateDay,
  writePlanUpdateMovement,
} from './write.js';
import { workoutReceiptDoc } from './receipt.js';

export const WORKOUT_COMMANDS = [
  { kind: 'read', key: 'calorie.view.plan', shape: 'stat', title: '训练计划看', wakeWord: '看计划概览', run: viewPlan, example: 'calorie-cmd-read calorie.view.plan --params \'{"date":"今日"}\'' },
  { kind: 'read', key: 'calorie.view.plan-wizard', shape: 'stat', title: '定训练计划', run: viewPlanEditor, example: 'calorie-cmd-read calorie.view.plan-wizard --params \'{"plan":{"config":{"title":"减脂4周","start_date":"<开始日期>","user_level":"中手","available_equipment":["瑜伽垫"]},"weeks":[{"week_number":1,"days":[{"day_of_week":1,"sessions":[{"session_label":"上肢","movements":[{"name":"俯卧撑","part":"胸","type":"力量","sets":[]}]}]}]}]}}\'' },
  { kind: 'read', key: 'calorie.view.exercise-review', shape: 'stat', title: '计划复盘', wakeWord: '计划复盘（本周）', run: viewExerciseReview, example: 'calorie-cmd-read calorie.view.exercise-review --params \'{"window":"本周"}\'' },
  { kind: 'read', key: 'calorie.view.contraindication', shape: 'stat', title: '禁忌扫描', run: viewContraindication, example: 'calorie-cmd-read calorie.view.contraindication --params \'{"part":"all"}\'' },
  { kind: 'read', key: 'calorie.view.process-progress', shape: 'stat', title: '落地训练进度', wakeWord: '看落地训练进度', run: viewProcessProgress, example: 'calorie-cmd-read calorie.view.process-progress' },
  { kind: 'read', key: 'calorie.view.plan-vs-actual', shape: 'stat', title: '计划比实际', wakeWord: '看计划 vs 实际', run: viewPlanVsActual, example: 'calorie-cmd-read calorie.view.plan-vs-actual --params \'{"window":"本周"}\'' },
  { kind: 'read', key: 'calorie.view.plan-write-preview', shape: 'stat', title: '写前预览', run: viewPlanWritePreview, example: 'calorie-cmd-read calorie.view.plan-write-preview --params \'{"op":"copy"}\'' },
  { kind: 'write', key: 'calorie.workout.plan-set', title: '定训练计划', wakeWord: '确认定训练计划', run: writePlanSet, doc: workoutReceiptDoc, example: 'calorie-cmd-read calorie.workout.plan-set --params \'{"plan":{"config":{"title":"示例计划","start_date":"2026-09-07","user_level":"中手","available_equipment":["瑜伽垫"]},"weeks":[{"week_number":1,"days":[{"day_of_week":1,"sessions":[{"session_label":"上肢","movements":[{"name":"俯卧撑"}]}]}]}]}}\'' },
  { kind: 'write', key: 'calorie.workout.plan-copy', title: '复制训练计划', wakeWord: '确认复制训练计划', run: writePlanCopy, doc: workoutReceiptDoc, example: 'calorie-cmd-read calorie.workout.plan-copy --params \'{"newTitle":"示例副本"}\'' },
  { kind: 'write', key: 'calorie.workout.plan-set-week', title: '定一周计划', wakeWord: '确认定一周计划', run: writePlanSetWeek, doc: workoutReceiptDoc, example: 'calorie-cmd-read calorie.workout.plan-set-week --params \'{"week":1,"days":[{"dayOfWeek":1,"sessionLabel":"上肢","movements":[{"name":"俯卧撑"}]}]}\'' },
  { kind: 'write', key: 'calorie.workout.plan-add-movement', title: '加训练动作', wakeWord: '确认加训练动作', run: writePlanAddMovement, doc: workoutReceiptDoc, example: 'calorie-cmd-read calorie.workout.plan-add-movement --params \'{"week":1,"dayOfWeek":1,"movement":{"name":"深蹲"}}\'' },
  { kind: 'write', key: 'calorie.workout.plan-set-rest', title: '定休息日', wakeWord: '确认定休息日', run: writePlanSetRest, doc: workoutReceiptDoc, example: 'calorie-cmd-read calorie.workout.plan-set-rest --params \'{"week":1,"dayOfWeek":3}\'' },
  { kind: 'write', key: 'calorie.workout.plan-update', title: '改训练计划', wakeWord: '确认改训练计划', run: writePlanUpdate, doc: workoutReceiptDoc, example: 'calorie-cmd-read calorie.workout.plan-update --params \'{"title":"示例改名"}\'' },
  { kind: 'write', key: 'calorie.workout.plan-update-day', title: '改某天训练', wakeWord: '确认改某天训练', run: writePlanUpdateDay, doc: workoutReceiptDoc, example: 'calorie-cmd-read calorie.workout.plan-update-day --params \'{"week":1,"dayOfWeek":3,"newLabel":"下肢＋核心"}\'' },
  { kind: 'write', key: 'calorie.workout.plan-delete-day', title: '删某天训练', wakeWord: '确认删某天训练', run: writePlanDeleteDay, doc: workoutReceiptDoc, example: 'calorie-cmd-read calorie.workout.plan-delete-day --params \'{"week":1,"dayOfWeek":3}\'' },
  { kind: 'write', key: 'calorie.workout.plan-update-movement', title: '改动作', wakeWord: '确认改动作', run: writePlanUpdateMovement, doc: workoutReceiptDoc, example: 'calorie-cmd-read calorie.workout.plan-update-movement --params \'{"oldMovement":"硬拉","newMovement":{"name":"杠铃划船"}}\'' },
  { kind: 'write', key: 'calorie.workout.plan-delete', title: '撤销训练计划', wakeWord: '确认撤销训练计划', run: writePlanDelete, doc: workoutReceiptDoc, example: 'calorie-cmd-read calorie.workout.plan-delete --params \'{"confirm":true}\'' },
  /* #943 · 五条键的「例」列：训记那两条（只碰训记，种子的训记入口可按配置指挡板）已改回**实跑形态**；
     落地三条仍是**预演形态**——真落地链的第一步要写飞书日历（`schedule.plan.write` 的远端门要本机
     `lark-cli` 已登录），标准种子环境到不了，而「例」列是「照抄即跑」、示例门（`#99`）要求它 exit 0。
     两态各是什么、实跑怎么跑，见 `SKILL.md`「联动速查」节首那条说明。 */
  { kind: 'write', key: 'calorie.workout.land', title: '落地训练', wakeWord: '落地训练', run: writeLand, example: 'calorie-cmd-read calorie.workout.land --params \'{"date":"2026-09-07","dryRun":true}\'' },
  { kind: 'write', key: 'calorie.workout.land-weekend', title: '落地到本周末', wakeWord: '落地到本周末', run: writeLandWeekend, example: 'calorie-cmd-read calorie.workout.land-weekend --params \'{"date":"2026-09-07","dryRun":true}\'' },
  { kind: 'write', key: 'calorie.workout.land-monthend', title: '落地到本月底', wakeWord: '落地到本月底', run: writeLandMonthend, example: 'calorie-cmd-read calorie.workout.land-monthend --params \'{"date":"2026-09-07","dryRun":true}\'' },
  { kind: 'read', key: 'calorie.view.xunji-key', shape: 'stat', title: '查训记KEY状态', wakeWord: '查训记KEY状态', run: viewXunjiKeyStatus, example: 'calorie-cmd-read calorie.view.xunji-key' },
  { kind: 'write', key: 'calorie.workout.xunji-push', title: '同步到训记', wakeWord: '同步到训记', run: writeXunjiPush, example: 'calorie-cmd-read calorie.workout.xunji-push --params \'{"date":"2026-09-07"}\'' },
  { kind: 'write', key: 'calorie.workout.xunji-backfill', title: '拉训记实绩', wakeWord: '拉训记实绩', run: writeXunjiBackfill, example: 'calorie-cmd-read calorie.workout.xunji-backfill --params \'{"date":"2026-09-07","days":1}\'' },
  { kind: 'write', key: 'calorie.workout.xunji-key-set', title: '设训记KEY', wakeWord: '设训记KEY', run: writeXunjiKeySet, doc: workoutReceiptDoc, example: 'calorie-cmd-read calorie.workout.xunji-key-set --params \'{"xunjiKey":"<KEY值>"}\'' },
  { kind: 'write', key: 'calorie.workout.xunji-key-clear', title: '清训记KEY', wakeWord: '清训记KEY', run: writeXunjiKeyClear, doc: workoutReceiptDoc, example: 'calorie-cmd-read calorie.workout.xunji-key-clear --params \'{"confirm":true}\'' },
] satisfies readonly CommandSpec[];
