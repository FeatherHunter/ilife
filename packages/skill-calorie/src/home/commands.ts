/** 主页能力的命令声明（**权威源**，HELP 一级分组「主页」／场景 01）。
 *
 * 加一条命令＝只改这个文件＋它那个子功能文件；`cli/` 里的索引与分派层一行不动。
 * 每条声明六件事：键（`cli/keys.ts` 登记的那个）／形状／标题（用户看到的中文名）／
 * 代表唤醒词（生成 SKILL.md 速查表用，必须是 `TRIGGERS` 里真有的唤醒词）／
 * 可执行示例（照抄即能跑）／处理函数。
 *
 * 子功能与命令的对应（HELP 下一级 → 键）：四条命令同住「看今日主页」这一组——
 * 它是 HELP 里那张 dashboard 的四块卡片（`src/triggers/scene-01-home.ts` 的 `subfunction` 字段）：
 *   · 看今日主页（`home_today_overview`）→ `calorie.view.home`；
 *   · 看今日饮食概览 → `calorie.view.diet`；看今日运动概览 → `calorie.view.exercise`；
 *     看今日目标进度 → `calorie.view.goal-progress`。
 * `calorie.view.home` 另承接「看周期主页／看今日成就」两组的唤醒词（看本周主页／看本月主页／
 * 看连续记录天数／看今日热量预算）——同一命令换窗口参数，故声明仍只此一条。
 */
import type { CommandSpec } from '../shared/commandSpec.js';
import { viewDietOverview, viewExerciseOverview, viewGoalProgress, viewHomeToday } from './today.js';

export const HOME_COMMANDS = [
  { kind: 'read', key: 'calorie.view.home', shape: 'stat', title: '今日总览', wakeWord: '看今日主页', run: viewHomeToday, example: 'calorie-cmd-read calorie.view.home --params \'{"date":"今日"}\'' },
  { kind: 'read', key: 'calorie.view.diet', shape: 'stat', title: '饮食总览', wakeWord: '看今日饮食概览', run: viewDietOverview, example: 'calorie-cmd-read calorie.view.diet --params \'{"window":"今日"}\'' },
  { kind: 'read', key: 'calorie.view.exercise', shape: 'stat', title: '运动总览', wakeWord: '看今日运动概览', run: viewExerciseOverview, example: 'calorie-cmd-read calorie.view.exercise --params \'{"window":"今日"}\'' },
  { kind: 'read', key: 'calorie.view.goal-progress', shape: 'stat', title: '目标进度', wakeWord: '看今日目标进度', run: viewGoalProgress, example: 'calorie-cmd-read calorie.view.goal-progress --params \'{"window":"今日"}\'' },
] satisfies readonly CommandSpec[];
