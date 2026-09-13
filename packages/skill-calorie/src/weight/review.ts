/** 体重复盘（HELP 场景 03「体重」下一级）：`calorie.view.weight-review` 读。
 *
 * 复核口径（目标 vs 实际、预计达成日）住同目录 `figures.ts` 的 `weightMilestone`；
 * 「体重目标取数」`getWeightGoalInfo` 也住那里——本能力对外那道门（`index.ts`）把它转给
 * 目标管理那侧（`render/goalExtra.ts`）用，免得同一件事有两份取数。
 */
import type { DatabaseSync } from 'node:sqlite';
import { dayField, nums } from '../shared/params.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { buildWeightReviewView } from './plate.js';
import { buildWeightReviewDoc } from './plateDocs.js';

/** `calorie.view.weight-review` · 体重复核（今天或指定日：当前 vs 目标、还差多少、按现状几天到）。 */
export function viewWeightReview(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const today = dayField(params, 'today') ?? dayField(params, 'date');
  const v = buildWeightReviewView(db, today ?? undefined);
  const metrics = nums({
    currentWeight: v.milestone.currentWeight, weightGoal: v.milestone.weightGoal,
    gapKg: v.milestone.gapKg, actualDailyChangeKg: v.milestone.actualDailyChangeKg,
    estDays: v.milestone.estDays, calorieAdjustment: v.milestone.calorieAdjustment,
  });
  return { data: { metrics }, html: buildWeightReviewDoc(v) };
}
