/** 运动趋势（HELP 场景 04「运动」下一级 · 运动分析）：`calorie.view.exercise-trend` 读命令。
 *
 * #316 搬迁：处理函数逐字取自 `src/cli/cmd_read.ts` 的 `case 'calorie.view.exercise-trend'` 分支
 * （#111 运动移植 6 键之一）——**纯搬迁，行为不变**。取数与页面装配走既有的
 * `render/exercisePort.ts`／`render/sportPortDocs.ts`。
 */
import type { DatabaseSync } from 'node:sqlite';
import { buildTrendView } from '../render/exercisePort.js';
import { buildTrendDoc } from '../render/sportPortDocs.js';
import { defaultRange, nums } from '../shared/params.js';
import type { ViewOut } from '../shared/commandSpec.js';

/** `calorie.view.exercise-trend` · 运动趋势：活跃天／总时长／总消耗／峰值。 */
export function viewExerciseTrend(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params);
  const v = buildTrendView(db, start, end);
  const metrics = nums({
    activeDays: v.activeDays, totalMinutes: v.totalMinutes,
    totalBurned: v.totalBurned, peakBurned: v.peak?.burned,
  });
  return { data: { metrics }, html: buildTrendDoc(v) };
}
