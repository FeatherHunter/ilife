/** 有氧（HELP 场景 04「运动」下一级 · 运动分析）：`calorie.view.exercise-cardio` 读命令。
 *
 * #316 搬迁：处理函数逐字取自 `src/cli/cmd_read.ts` 的 `case 'calorie.view.exercise-cardio'` 分支
 * （#111 运动移植 6 键之一）——**纯搬迁，行为不变**。取数与页面装配走既有的
 * `render/exercisePort.ts`／`render/sportPortDocs.ts`。
 */
import type { DatabaseSync } from 'node:sqlite';
import { buildCardioView } from '../render/exercisePort.js';
import { buildCardioDoc } from '../render/sportPortDocs.js';
import { defaultRange, nums } from '../shared/params.js';
import type { ViewOut } from '../shared/commandSpec.js';

/** `calorie.view.exercise-cardio` · 有氧训练总览：场次／时长／距离／平均配速。 */
export function viewExerciseCardio(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params);
  const v = buildCardioView(db, start, end);
  const metrics = nums({
    sessions: v.sessions, totalMinutes: v.totalMinutes,
    totalDistanceKm: v.totalDistanceKm, avgPaceMinPerKm: v.avgPaceMinPerKm,
  });
  return { data: { metrics }, html: buildCardioDoc(v) };
}
