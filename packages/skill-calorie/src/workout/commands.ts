/** 健身计划的命令声明（**权威源**，HELP 场景 05「健身计划」）。
 *
 * 加一条命令＝只改这个文件＋它那个子功能文件；`cli/` 里的索引与分派层一行不动。
 * 每条声明六件事：键（`cli/keys.ts` 登记的那个）／形状／标题（用户看到的中文名）／
 * 代表唤醒词（生成 SKILL.md 速查表用，必须是 `TRIGGERS` 里真有的唤醒词）／
 * 可执行示例（生成 SKILL.md 速查表「例」列用，照抄即能跑）／处理函数。
 *
 * 子功能与命令的对应（HELP 下一级 → 键）：看训练计划＝`view.plan`；定训练计划（检视半）＝
 * `view.plan-wizard`；计划复盘＝`view.exercise-review`；安全检查＝`view.contraindication`；
 * 落地训练（读侧进度）＝`view.process-progress`。
 * 「定训练计划」「落地训练」「同步到训记」这些词**本场景无写键**（理由逐字住 `routes.ts`）。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import { viewContraindication } from './contraindication.js';
import { viewPlan } from './plan.js';
import { viewProcessProgress } from './progress.js';
import { viewExerciseReview } from './review.js';
import { viewPlanWizard } from './wizard.js';

export const WORKOUT_COMMANDS = [
  { kind: 'read', key: 'calorie.view.plan', shape: 'stat', title: '训练计划看', run: viewPlan, example: 'calorie-cmd-read calorie.view.plan' },
  { kind: 'read', key: 'calorie.view.plan-wizard', shape: 'stat', title: '构建向导', run: viewPlanWizard, example: 'calorie-cmd-read calorie.view.plan-wizard --params \'{"plan":{"config":{"title":"减脂4周","start_date":"<开始日期>","user_level":"中手","available_equipment":["瑜伽垫"]},"weeks":[{"week_number":1,"days":[{"day_of_week":1,"sessions":[{"session_label":"上肢","movements":[{"name":"俯卧撑","part":"胸","type":"力量","sets":[]}]}]}]}]}}\'' },
  { kind: 'read', key: 'calorie.view.exercise-review', shape: 'stat', title: '计划复盘', wakeWord: '计划复盘（本周）', run: viewExerciseReview, example: 'calorie-cmd-read calorie.view.exercise-review --params \'{"window":"本周"}\'' },
  { kind: 'read', key: 'calorie.view.contraindication', shape: 'stat', title: '禁忌扫描', run: viewContraindication, example: 'calorie-cmd-read calorie.view.contraindication --params \'{"part":"all"}\'' },
  { kind: 'read', key: 'calorie.view.process-progress', shape: 'stat', title: '落地训练进度', wakeWord: '看落地训练进度', run: viewProcessProgress, example: 'calorie-cmd-read calorie.view.process-progress' },
] satisfies readonly CommandSpec[];
