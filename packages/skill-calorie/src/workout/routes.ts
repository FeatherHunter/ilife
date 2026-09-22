/** #313 B 段 · 健身计划能力**已搬迁键**的路由声明（键属 `dist/workout/commands.js` 的
 * `WORKOUT_COMMANDS` 声明键集）。
 *
 * 搬迁口径与场景分片同：由 `.scratch/t313b1/dump-routes.mjs` 机械搬出，语义不动；`order` 仍是原列表内
 * 0 基位次（顺序权威，生成器按 `(list, order)` 复原三个列表）。键集搬家后本件跟着走，顺序不受影响。
 * 那 23 条「命中但不执行」的记录**理由文本逐字不动**（`legacy-chain`／`out-of-scope` 是今天的形态，
 * 翻案另开票；本票只换住处）——#614 起其中 order 199／200（同步到训记／拉训记实绩）转入可执行，
 * #612 起其中 order 196（落地训练）转入可执行，#613 起其中 order 197–198
 * （落地到本周末／落地到本月底）转入可执行，剩下 20 条的理由文本仍逐字不动。
 */
import type { RouteDecl } from '../triggers/routeSpec.js';

export const WORKOUT_ROUTES: readonly RouteDecl[] = [
  { list: 'wake', order: 176, wakeWord: '看本周计划', scene: '05', kind: 'exec', key: 'calorie.view.plan', cli: 'calorie-cmd-read calorie.view.plan --params \'{"weekOffset":0}\'' },
  { list: 'wake', order: 177, wakeWord: '看下周计划', scene: '05', kind: 'exec', key: 'calorie.view.plan', cli: 'calorie-cmd-read calorie.view.plan --params \'{"weekOffset":1}\'' },
  { list: 'wake', order: 178, wakeWord: '看上周计划', scene: '05', kind: 'exec', key: 'calorie.view.plan', cli: 'calorie-cmd-read calorie.view.plan --params \'{"weekOffset":-1}\'' },
  { list: 'wake', order: 179, wakeWord: '看指定周计划', scene: '05', kind: 'exec', key: 'calorie.view.plan', cli: 'calorie-cmd-read calorie.view.plan --params \'{"week":1}\'' },
  { list: 'wake', order: 180, wakeWord: '看今天练什么', scene: '05', kind: 'exec', key: 'calorie.view.plan', cli: 'calorie-cmd-read calorie.view.plan --params \'{"date":"今日"}\'' },
  { list: 'wake', order: 181, wakeWord: '看某动作安排', scene: '05', kind: 'exec', key: 'calorie.view.plan', cli: 'calorie-cmd-read calorie.view.plan --params \'{"movement":"硬拉"}\'' },
  { list: 'wake', order: 182, wakeWord: '看某天练什么', scene: '05', kind: 'exec', key: 'calorie.view.plan', cli: 'calorie-cmd-read calorie.view.plan --params \'{"date":"今日"}\'' },
  { list: 'wake', order: 183, wakeWord: '看计划概览', scene: '05', kind: 'exec', key: 'calorie.view.plan', cli: 'calorie-cmd-read calorie.view.plan' },
  { list: 'wake', order: 184, wakeWord: '看完整计划', scene: '05', kind: 'exec', key: 'calorie.view.plan', cli: 'calorie-cmd-read calorie.view.plan' },
  { list: 'wake', order: 185, wakeWord: '看计划 vs 实际', scene: '05', kind: 'exec', key: 'calorie.view.plan-vs-actual', cli: 'calorie-cmd-read calorie.view.plan-vs-actual --params \'{"window":"本周"}\'' },
  { list: 'wake', order: 186, wakeWord: '定训练计划', scene: '05', kind: 'exec', key: 'calorie.view.plan-wizard', cli: 'calorie-cmd-read calorie.view.plan-wizard --params \'{"plan":{"config":{"title":"减脂4周","start_date":"<开始日期>","user_level":"中手","available_equipment":["瑜伽垫"]},"weeks":[{"week_number":1,"days":[{"day_of_week":1,"sessions":[{"session_label":"上肢","movements":[{"name":"俯卧撑","part":"胸","type":"力量","sets":[]}]}]}]}]}}\'' },
  { list: 'wake', order: 187, wakeWord: '复制训练计划', scene: '05', kind: 'exec', key: 'calorie.view.plan-write-preview', cli: 'calorie-cmd-read calorie.view.plan-write-preview --params \'{"op":"copy"}\'' },
  { list: 'wake', order: 188, wakeWord: '定休息日', scene: '05', kind: 'exec', key: 'calorie.view.plan-write-preview', cli: 'calorie-cmd-read calorie.view.plan-write-preview --params \'{"op":"set-rest","week":1,"dayOfWeek":3}\'' },
  { list: 'wake', order: 189, wakeWord: '加训练动作', scene: '05', kind: 'exec', key: 'calorie.view.plan-write-preview', cli: 'calorie-cmd-read calorie.view.plan-write-preview --params \'{"op":"add-movement","week":1,"dayOfWeek":1,"movement":{"name":"硬拉"}}\'' },
  { list: 'wake', order: 190, wakeWord: '定一周计划', scene: '05', kind: 'exec', key: 'calorie.view.plan-write-preview', cli: 'calorie-cmd-read calorie.view.plan-write-preview --params \'{"op":"set-week","week":1}\'' },
  { list: 'wake', order: 191, wakeWord: '改训练计划', scene: '05', kind: 'exec', key: 'calorie.view.plan-write-preview', cli: 'calorie-cmd-read calorie.view.plan-write-preview --params \'{"op":"update","title":"示例改名"}\'' },
  { list: 'wake', order: 192, wakeWord: '改某天训练', scene: '05', kind: 'exec', key: 'calorie.view.plan-write-preview', cli: 'calorie-cmd-read calorie.view.plan-write-preview --params \'{"op":"update-day","week":1,"dayOfWeek":3,"newLabel":"下肢＋核心"}\'' },
  { list: 'wake', order: 193, wakeWord: '删某天训练', scene: '05', kind: 'exec', key: 'calorie.view.plan-write-preview', cli: 'calorie-cmd-read calorie.view.plan-write-preview --params \'{"op":"delete-day","week":1,"dayOfWeek":3}\'' },
  { list: 'wake', order: 194, wakeWord: '改动作', scene: '05', kind: 'exec', key: 'calorie.view.plan-write-preview', cli: 'calorie-cmd-read calorie.view.plan-write-preview --params \'{"op":"update-movement","oldMovement":"硬拉","newMovement":{"name":"杠铃划船"}}\'' },
  { list: 'wake', order: 195, wakeWord: '撤销训练计划', scene: '05', kind: 'exec', key: 'calorie.view.plan-write-preview', cli: 'calorie-cmd-read calorie.view.plan-write-preview --params \'{"op":"delete"}\'' },
  { list: 'wake', order: 196, wakeWord: '落地训练', scene: '05', kind: 'exec', key: 'calorie.workout.land', cli: 'calorie-cmd-read calorie.workout.land --params \'{"date":"2026-09-07","dryRun":true}\'' },
  { list: 'wake', order: 197, wakeWord: '落地到本周末', scene: '05', kind: 'exec', key: 'calorie.workout.land-weekend', cli: 'calorie-cmd-read calorie.workout.land-weekend --params \'{"date":"2026-09-07","dryRun":true}\'' },
  { list: 'wake', order: 198, wakeWord: '落地到本月底', scene: '05', kind: 'exec', key: 'calorie.workout.land-monthend', cli: 'calorie-cmd-read calorie.workout.land-monthend --params \'{"date":"2026-09-07","dryRun":true}\'' },
  { list: 'wake', order: 199, wakeWord: '同步到训记', scene: '05', kind: 'exec', key: 'calorie.workout.xunji-push', cli: 'calorie-cmd-read calorie.workout.xunji-push --params \'{"date":"2026-09-07","dryRun":true}\'' },
  { list: 'wake', order: 200, wakeWord: '拉训记实绩', scene: '05', kind: 'exec', key: 'calorie.workout.xunji-backfill', cli: 'calorie-cmd-read calorie.workout.xunji-backfill --params \'{"date":"2026-09-07","days":1,"dryRun":true}\'' },
  { list: 'wake', order: 201, wakeWord: '计划复盘（本周）', scene: '05', kind: 'exec', key: 'calorie.view.exercise-review', cli: 'calorie-cmd-read calorie.view.exercise-review --params \'{"window":"本周"}\'' },
  { list: 'wake', order: 202, wakeWord: '计划复盘（本月）', scene: '05', kind: 'exec', key: 'calorie.view.exercise-review', cli: 'calorie-cmd-read calorie.view.exercise-review --params \'{"window":"本月"}\'' },
  { list: 'wake', order: 203, wakeWord: '计划复盘（全部）', scene: '05', kind: 'exec', key: 'calorie.view.exercise-review', cli: 'calorie-cmd-read calorie.view.exercise-review --params \'{"window":"custom","start":"<开始日期>","end":"<结束日期>"}\'' },
  { list: 'wake', order: 204, wakeWord: '看计划完成率', scene: '05', kind: 'exec', key: 'calorie.view.exercise-review', cli: 'calorie-cmd-read calorie.view.exercise-review --params \'{"window":"7d"}\'' },
  { list: 'wake', order: 205, wakeWord: '看未完成训练', scene: '05', kind: 'exec', key: 'calorie.view.exercise-review', cli: 'calorie-cmd-read calorie.view.exercise-review --params \'{"window":"7d"}\'' },
  { list: 'wake', order: 206, wakeWord: '看动作完成率', scene: '05', kind: 'exec', key: 'calorie.view.exercise-review', cli: 'calorie-cmd-read calorie.view.exercise-review --params \'{"window":"7d"}\'' },
  { list: 'wake', order: 207, wakeWord: '扫禁忌', scene: '05', kind: 'exec', key: 'calorie.view.contraindication', cli: 'calorie-cmd-read calorie.view.contraindication' },
  { list: 'new', order: 26, wakeWord: '看训练计划', scene: '05', kind: 'exec', key: 'calorie.view.plan', cli: 'calorie-cmd-read calorie.view.plan' },
  { list: 'new', order: 30, wakeWord: '看禁忌扫描', scene: '05', kind: 'exec', key: 'calorie.view.contraindication', cli: 'calorie-cmd-read calorie.view.contraindication' },
  { list: 'new', order: 37, wakeWord: '看训练计划复盘', scene: '05', kind: 'exec', key: 'calorie.view.exercise-review', cli: 'calorie-cmd-read calorie.view.exercise-review --params \'{"window":"custom","start":"<开始日期>","end":"<结束日期>"}\'' },
  { list: 'new', order: 48, wakeWord: '看落地训练进度', scene: '05', kind: 'exec', key: 'calorie.view.process-progress', cli: 'calorie-cmd-read calorie.view.process-progress' },
  { list: 'new', order: 57, wakeWord: '确认定训练计划', scene: '05', kind: 'exec', key: 'calorie.workout.plan-set', cli: 'calorie-cmd-read calorie.workout.plan-set --params \'{"plan":{"config":{"title":"示例计划","start_date":"2026-09-07","user_level":"中手","available_equipment":["瑜伽垫"]},"weeks":[{"week_number":1,"days":[{"day_of_week":1,"sessions":[{"session_label":"上肢","movements":[{"name":"俯卧撑"}]}]}]}]}}\'' },
  { list: 'new', order: 58, wakeWord: '确认复制训练计划', scene: '05', kind: 'exec', key: 'calorie.workout.plan-copy', cli: 'calorie-cmd-read calorie.workout.plan-copy --params \'{"newTitle":"示例副本"}\'' },
  { list: 'new', order: 59, wakeWord: '确认定一周计划', scene: '05', kind: 'exec', key: 'calorie.workout.plan-set-week', cli: 'calorie-cmd-read calorie.workout.plan-set-week --params \'{"week":1,"days":[{"dayOfWeek":1,"sessionLabel":"上肢","movements":[{"name":"俯卧撑"}]}]}\'' },
  { list: 'new', order: 60, wakeWord: '确认加训练动作', scene: '05', kind: 'exec', key: 'calorie.workout.plan-add-movement', cli: 'calorie-cmd-read calorie.workout.plan-add-movement --params \'{"week":1,"dayOfWeek":1,"movement":{"name":"深蹲"}}\'' },
  { list: 'new', order: 61, wakeWord: '确认定休息日', scene: '05', kind: 'exec', key: 'calorie.workout.plan-set-rest', cli: 'calorie-cmd-read calorie.workout.plan-set-rest --params \'{"week":1,"dayOfWeek":3}\'' },
  { list: 'new', order: 62, wakeWord: '确认改训练计划', scene: '05', kind: 'exec', key: 'calorie.workout.plan-update', cli: 'calorie-cmd-read calorie.workout.plan-update --params \'{"title":"示例改名"}\'' },
  { list: 'new', order: 63, wakeWord: '确认改某天训练', scene: '05', kind: 'exec', key: 'calorie.workout.plan-update-day', cli: 'calorie-cmd-read calorie.workout.plan-update-day --params \'{"week":1,"dayOfWeek":3,"newLabel":"下肢＋核心"}\'' },
  { list: 'new', order: 64, wakeWord: '确认删某天训练', scene: '05', kind: 'exec', key: 'calorie.workout.plan-delete-day', cli: 'calorie-cmd-read calorie.workout.plan-delete-day --params \'{"week":1,"dayOfWeek":3}\'' },
  { list: 'new', order: 65, wakeWord: '确认改动作', scene: '05', kind: 'exec', key: 'calorie.workout.plan-update-movement', cli: 'calorie-cmd-read calorie.workout.plan-update-movement --params \'{"oldMovement":"硬拉","newMovement":{"name":"杠铃划船"}}\'' },
  { list: 'new', order: 66, wakeWord: '确认撤销训练计划', scene: '05', kind: 'exec', key: 'calorie.workout.plan-delete', cli: 'calorie-cmd-read calorie.workout.plan-delete --params \'{"confirm":true}\'' },
  { list: 'new', order: 69, wakeWord: '查训记KEY状态', scene: '05', kind: 'exec', key: 'calorie.view.xunji-key', cli: 'calorie-cmd-read calorie.view.xunji-key' },
  { list: 'new', order: 70, wakeWord: '设训记KEY', scene: '05', kind: 'exec', key: 'calorie.workout.xunji-key-set', cli: 'calorie-cmd-read calorie.workout.xunji-key-set --params \'{"xunjiKey":"<KEY值>"}\'' },
  { list: 'new', order: 71, wakeWord: '清训记KEY', scene: '05', kind: 'exec', key: 'calorie.workout.xunji-key-clear', cli: 'calorie-cmd-read calorie.workout.xunji-key-clear --params \'{"confirm":true}\'' },
];
