/** 看运动（vs 目标）（HELP 场景 04「运动」下一级 · 看运动）：`calorie.view.exercise-goal` 读命令。
 *
 * #316 搬迁：处理函数逐字取自 `src/cli/cmd_read.ts` 的 `case 'calorie.view.exercise-goal'` 分支——
 * **纯搬迁，行为不变**。取数与页面装配走既有的 `render/planPlate.ts`／`render/sportDocs.ts`。
 */
import type { DatabaseSync } from 'node:sqlite';
import { buildExerciseGoalView } from '../render/planPlate.js';
import { buildExerciseGoalDoc } from '../render/sportDocs.js';
import { defaultRange, nums } from '../shared/params.js';
import type { ViewOut } from '../shared/commandSpec.js';

/** `calorie.view.exercise-goal` · 运动目标视图：目标／实际／完成度／差额。 */
export function viewExerciseGoal(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params);
  const v = buildExerciseGoalView(db, start, end);
  const metrics = nums({ dailyGoal: v.dailyGoal, goalTotal: v.goalTotal, actual: v.actual, pct: v.pct, gap: v.gap, achieved: v.achieved ? 1 : 0, days: v.days });
  return { data: { metrics }, html: buildExerciseGoalDoc(v) };
}
