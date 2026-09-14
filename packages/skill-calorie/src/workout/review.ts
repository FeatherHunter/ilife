/** 计划复盘（HELP 场景 05「健身计划」下一级「计划复盘」）：`calorie.view.exercise-review` 读。
 *
 * 窗口口径走共用位 `shared/params.ts` 的 `defaultRange`（恰与分派层原来那几行同一份口径），
 * 复盘取数住视图层 `render/exercisePort.ts` 的 `buildReviewView`、整页住 `render/reviewDocs.ts`
 * 的 `buildReviewDoc`（T351-v7 从 `render/sportPortDocs.ts` 搬进复盘族自己的姊妹件）——
 * 本能力只调公开函数，不另写一份「计划 vs 实际」的算式。
 */
import type { DatabaseSync } from 'node:sqlite';
import { buildReviewView } from '../render/exercisePort.js';
import { buildReviewDoc } from '../render/reviewDocs.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { defaultRange, nums } from '../shared/params.js';

/** `calorie.view.exercise-review` · 计划复盘（窗口内 计划 vs 实际：场次／动作两路完成率）。 */
export function viewExerciseReview(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params);
  const v = buildReviewView(db, start, end);
  const metrics = nums({
    plannedSessions: v.plannedSessions, hitSessions: v.hitSessions,
    completionPct: v.completionPct, plannedMovements: v.plannedMovements,
    hitMovements: v.hitMovements, movementPct: v.movementPct,
  });
  return { data: { metrics }, html: buildReviewDoc(v) };
}
