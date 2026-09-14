/** 看训练计划（HELP 场景 05「健身计划」下一级「看训练计划」）：`calorie.view.plan` 读。
 *
 * 取数住视图层 `render/planPlate.ts` 的 `buildPlanView`（全计划：配置＋周×日×动作），
 * 整页模板住 `render/html.ts` 的 `renderPlanHtml`——这两件是视图层的活，
 * 本能力只经它们的公开函数调用，不把那份取数抄进自己目录（铁律一）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { renderPlanHtml } from '../render/html.js';
import { buildPlanView } from '../render/planPlate.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { dayField, nums } from '../shared/params.js';

/** `calorie.view.plan` · 训练计划看（整个计划：总周数／训练日／动作数 ＋ 每周完成率；带 `date` 即只看该日）。 */
export function viewPlan(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const v = buildPlanView(db, { dateISO: dayField(params, 'date') ?? undefined });
  const metrics = nums({ totalSessions: v.totalSessions, totalMovements: v.totalMovements, totalWeeks: v.totalWeeks });
  return { data: { metrics }, html: renderPlanHtml(v) };
}
