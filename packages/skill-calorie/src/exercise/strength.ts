/** 力量（HELP 场景 04「运动」下一级 · 运动分析）：`calorie.view.exercise-strength` 读命令。
 *
 * #316 搬迁：处理函数逐字取自 `src/cli/cmd_read.ts` 的 `case 'calorie.view.exercise-strength'` 分支
 * （#111 运动移植 6 键之一）——**纯搬迁，行为不变**。取数与页面装配走既有的
 * `render/exercisePort.ts`／`render/sportPortDocs.ts`。
 */
import type { DatabaseSync } from 'node:sqlite';
import { buildStrengthView } from '../render/exercisePort.js';
import { buildStrengthDoc } from './sportPortDocs.js';
import { defaultRange, nums } from '../shared/params.js';
import type { ViewOut } from '../shared/commandSpec.js';

/** `calorie.view.exercise-strength` · 力量训练总览：动作数／组数／总容量／总次数。 */
export function viewExerciseStrength(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params);
  const v = buildStrengthView(db, start, end);
  const metrics = nums({
    movementCount: v.movementCount, totalSets: v.totalSets,
    totalVolumeKg: v.totalVolumeKg, totalReps: v.totalReps,
  });
  return { data: { metrics }, html: buildStrengthDoc(v) };
}
