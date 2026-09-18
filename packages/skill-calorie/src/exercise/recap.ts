/** 运动复盘（HELP 场景 04「运动」下一级 · 运动复盘）：`calorie.view.exercise-recap` 读命令。
 *
 * #316 搬迁：处理函数逐字取自 `src/cli/cmd_read.ts` 的 `case 'calorie.view.exercise-recap'` 分支
 * （#111 运动移植 6 键之一）——**纯搬迁，行为不变**。取数与页面装配走既有的
 * `render/exercisePort.ts`／`render/sportPortDocs.ts`。
 */
import type { DatabaseSync } from 'node:sqlite';
import { buildRecapView } from '../render/exercisePort.js';
import { buildRecapDoc } from './sportPortDocs.js';
import { defaultRange, nums } from '../shared/params.js';
import type { ViewOut } from '../shared/commandSpec.js';

/** `calorie.view.exercise-recap` · 运动复盘：场次／总时长／总消耗／活跃天／天数。 */
export function viewExerciseRecap(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params);
  const v = buildRecapView(db, start, end);
  const metrics = nums({
    sessions: v.sessions, totalMinutes: v.totalMinutes, totalBurned: v.totalBurned,
    activeDays: v.activeDays, days: v.days,
  });
  return { data: { metrics }, html: buildRecapDoc(v) };
}
