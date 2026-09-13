/** 构建向导（HELP 场景 05「健身计划」下一级「定训练计划」的检视半）：`calorie.view.plan-wizard` 读。
 *
 * **不是**「定训练计划」这个写场景本身——那句词的执行层不承接（见 `src/workout/routes.ts` 里
 * 该词的非执行记录与理由）。本键只把候选计划送进校验器出报告：错误／警告逐条与逐场检查数。
 *
 * 校验口径住视图层 `render/planPlate.ts` 的 `buildPlanWizardView`（内部经 `workout/planStore.ts` 的
 * `validatePlan`），整页模板住 `render/html.ts` 的 `renderPlanWizardHtml`；本能力只调公开函数。
 */
import type { DatabaseSync } from 'node:sqlite';
import { renderPlanWizardHtml } from '../render/html.js';
import { buildPlanWizardView } from '../render/planPlate.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { fail, nums } from '../shared/params.js';

/** `calorie.view.plan-wizard` · 构建向导（把一份计划候选跑一遍校验：错误／警告／场次数）。 */
export function viewPlanWizard(params: Record<string, unknown>, _db: DatabaseSync): ViewOut {
  const plan = params['plan'];
  if (typeof plan !== 'object' || plan === null || Array.isArray(plan)) fail(2, '缺参数 plan（PlanInput 对象）');
  const catalog = params['catalog'];
  const v = buildPlanWizardView(plan, (catalog as string[] | undefined) ?? undefined);
  const metrics = nums({ errorCount: v.errorCount, warningCount: v.warningCount, checkedSessions: v.checkedSessions });
  return { data: { metrics }, html: renderPlanWizardHtml(v) };
}
