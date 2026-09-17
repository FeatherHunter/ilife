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
 * `dryRun` 转预演过程页）；「同步到训记」「拉训记实绩」两条是训记模块
 * 对外命令的薄包装（`xunjiPush.ts`／`xunjiBackfill.ts`：审计／调用／过程页／结果页收进同一命令），
 * 写键形（`workout.xunji-*`），`dryRun` 转预演过程页。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import { viewPlanEditor } from '../render/planEditorPort.js';
import { viewContraindication } from './contraindication.js';
import { viewPlan, viewPlanVsActual, viewPlanWritePreview } from './plan.js';
import { viewProcessProgress } from './progress.js';
import { viewExerciseReview } from './review.js';
import { writeLand } from './land.js';
import { writeXunjiBackfill } from './xunjiBackfill.js';
import { writeXunjiPush } from './xunjiPush.js';
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

export const WORKOUT_COMMANDS = [
  { kind: 'read', key: 'calorie.view.plan', shape: 'stat', title: '训练计划看', wakeWord: '看计划概览', run: viewPlan, example: 'calorie-cmd-read calorie.view.plan --params \'{"date":"今日"}\'' },
  { kind: 'read', key: 'calorie.view.plan-wizard', shape: 'stat', title: '定训练计划', run: viewPlanEditor, example: 'calorie-cmd-read calorie.view.plan-wizard --params \'{"plan":{"config":{"title":"减脂4周","start_date":"<开始日期>","user_level":"中手","available_equipment":["瑜伽垫"]},"weeks":[{"week_number":1,"days":[{"day_of_week":1,"sessions":[{"session_label":"上肢","movements":[{"name":"俯卧撑","part":"胸","type":"力量","sets":[]}]}]}]}]}}\'' },
  { kind: 'read', key: 'calorie.view.exercise-review', shape: 'stat', title: '计划复盘', wakeWord: '计划复盘（本周）', run: viewExerciseReview, example: 'calorie-cmd-read calorie.view.exercise-review --params \'{"window":"本周"}\'' },
  { kind: 'read', key: 'calorie.view.contraindication', shape: 'stat', title: '禁忌扫描', run: viewContraindication, example: 'calorie-cmd-read calorie.view.contraindication --params \'{"part":"all"}\'' },
  { kind: 'read', key: 'calorie.view.process-progress', shape: 'stat', title: '落地训练进度', wakeWord: '看落地训练进度', run: viewProcessProgress, example: 'calorie-cmd-read calorie.view.process-progress' },
  { kind: 'read', key: 'calorie.view.plan-vs-actual', shape: 'stat', title: '计划比实际', wakeWord: '看计划 vs 实际', run: viewPlanVsActual, example: 'calorie-cmd-read calorie.view.plan-vs-actual --params \'{"window":"本周"}\'' },
  { kind: 'read', key: 'calorie.view.plan-write-preview', shape: 'stat', title: '写前预览', run: viewPlanWritePreview, example: 'calorie-cmd-read calorie.view.plan-write-preview --params \'{"op":"copy"}\'' },
  { kind: 'write', key: 'calorie.workout.plan-set', shape: 'receipt', title: '定训练计划', wakeWord: '确认定训练计划', run: writePlanSet, example: 'calorie-cmd-read calorie.workout.plan-set --params \'{"plan":{"config":{"title":"示例计划","start_date":"2026-09-07","user_level":"中手","available_equipment":["瑜伽垫"]},"weeks":[{"week_number":1,"days":[{"day_of_week":1,"sessions":[{"session_label":"上肢","movements":[{"name":"俯卧撑"}]}]}]}]}}\'' },
  { kind: 'write', key: 'calorie.workout.plan-copy', shape: 'receipt', title: '复制训练计划', wakeWord: '确认复制训练计划', run: writePlanCopy, example: 'calorie-cmd-read calorie.workout.plan-copy --params \'{"newTitle":"示例副本"}\'' },
  { kind: 'write', key: 'calorie.workout.plan-set-week', shape: 'receipt', title: '定一周计划', wakeWord: '确认定一周计划', run: writePlanSetWeek, example: 'calorie-cmd-read calorie.workout.plan-set-week --params \'{"week":1,"days":[{"dayOfWeek":1,"sessionLabel":"上肢","movements":[{"name":"俯卧撑"}]}]}\'' },
  { kind: 'write', key: 'calorie.workout.plan-add-movement', shape: 'receipt', title: '加训练动作', wakeWord: '确认加训练动作', run: writePlanAddMovement, example: 'calorie-cmd-read calorie.workout.plan-add-movement --params \'{"week":1,"dayOfWeek":1,"movement":{"name":"深蹲"}}\'' },
  { kind: 'write', key: 'calorie.workout.plan-set-rest', shape: 'receipt', title: '定休息日', wakeWord: '确认定休息日', run: writePlanSetRest, example: 'calorie-cmd-read calorie.workout.plan-set-rest --params \'{"week":1,"dayOfWeek":3}\'' },
  { kind: 'write', key: 'calorie.workout.plan-update', shape: 'receipt', title: '改训练计划', wakeWord: '确认改训练计划', run: writePlanUpdate, example: 'calorie-cmd-read calorie.workout.plan-update --params \'{"title":"示例改名"}\'' },
  { kind: 'write', key: 'calorie.workout.plan-update-day', shape: 'receipt', title: '改某天训练', wakeWord: '确认改某天训练', run: writePlanUpdateDay, example: 'calorie-cmd-read calorie.workout.plan-update-day --params \'{"week":1,"dayOfWeek":3,"newLabel":"下肢＋核心"}\'' },
  { kind: 'write', key: 'calorie.workout.plan-delete-day', shape: 'receipt', title: '删某天训练', wakeWord: '确认删某天训练', run: writePlanDeleteDay, example: 'calorie-cmd-read calorie.workout.plan-delete-day --params \'{"week":1,"dayOfWeek":3}\'' },
  { kind: 'write', key: 'calorie.workout.plan-update-movement', shape: 'receipt', title: '改动作', wakeWord: '确认改动作', run: writePlanUpdateMovement, example: 'calorie-cmd-read calorie.workout.plan-update-movement --params \'{"oldMovement":"硬拉","newMovement":{"name":"杠铃划船"}}\'' },
  { kind: 'write', key: 'calorie.workout.plan-delete', shape: 'receipt', title: '撤销训练计划', wakeWord: '确认撤销训练计划', run: writePlanDelete, example: 'calorie-cmd-read calorie.workout.plan-delete --params \'{"confirm":true}\'' },
  { kind: 'write', key: 'calorie.workout.land', shape: 'receipt', title: '落地训练', wakeWord: '落地训练', run: writeLand, example: 'calorie-cmd-read calorie.workout.land --params \'{"date":"2026-09-07","dryRun":true}\'' },
  { kind: 'write', key: 'calorie.workout.xunji-push', shape: 'receipt', title: '同步到训记', wakeWord: '同步到训记', run: writeXunjiPush, example: 'calorie-cmd-read calorie.workout.xunji-push --params \'{"date":"2026-09-07","dryRun":true}\'' },
  { kind: 'write', key: 'calorie.workout.xunji-backfill', shape: 'receipt', title: '拉训记实绩', wakeWord: '拉训记实绩', run: writeXunjiBackfill, example: 'calorie-cmd-read calorie.workout.xunji-backfill --params \'{"date":"2026-09-07","days":1,"dryRun":true}\'' },
] satisfies readonly CommandSpec[];
