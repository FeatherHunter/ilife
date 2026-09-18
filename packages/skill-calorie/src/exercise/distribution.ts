/** 分布（HELP 场景 04「运动」下一级 · 运动分析）：`calorie.view.exercise-distribution` 读命令。
 *
 * #316 搬迁：处理函数逐字取自 `src/cli/cmd_read.ts` 的 `case 'calorie.view.exercise-distribution'`
 * 分支（#111 运动移植 6 键之一）——**纯搬迁，行为不变**。取数与页面装配走既有的
 * `render/exercisePort.ts`／`render/sportPortDocs.ts`。
 */
import type { DatabaseSync } from 'node:sqlite';
import { buildDistributionView } from '../render/exercisePort.js';
import { buildDistributionDoc } from './sportPortDocs.js';
import { defaultRange, nums } from '../shared/params.js';
import type { ViewOut } from '../shared/commandSpec.js';

/** `calorie.view.exercise-distribution` · 运动类型分布：场次／活跃天／消耗／摄入／TDEE／缺口。 */
export function viewExerciseDistribution(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params);
  const v = buildDistributionView(db, start, end);
  const metrics = nums({
    sessions: v.sessions, activeDays: v.activeDays, days: v.days, totalBurned: v.totalBurned,
    intakeCal: v.intakeCal, tdeeTotal: v.tdeeTotal, deficit: v.deficit,
  });
  return { data: { metrics }, html: buildDistributionDoc(v) };
}
