/** 看训练计划（HELP 场景 05「健身计划」下一级「看训练计划」）：`calorie.view.plan` 读 ＋
 * `calorie.view.plan-vs-actual` 读（计划 vs 实际对比）。
 *
 * 取数住视图层 `render/planPlate.ts` 的 `buildPlanView`（全计划：配置＋周×日×动作；
 * 带 `date`／`week`／`weekOffset`／`movement` 即按粒度过滤）与 `buildPlanVsActualView`
 * （窗内计划动作 × 运动记录逐日命中），整页模板住 `render/html.ts`——这两件是视图层的活，
 * 本能力只经它们的公开函数调用，不把那份取数抄进自己目录（铁律一）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { renderPlanHtml, renderPlanVsActualHtml, renderPlanWritePreviewHtml } from '../render/html.js';
import { buildPlanView, buildPlanVsActualView } from '../render/planPlate.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { anchorOf, assertISO, dayField, fail, nums, optInt, optStr, windowRange } from '../shared/params.js';
import { previewWrite } from './write.js';

/** `calorie.view.plan` · 训练计划看（整个计划：总周数／训练日／动作数 ＋ 每周完成率；带筛选即看该粒度）。 */
export function viewPlan(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const v = buildPlanView(db, {
    dateISO: dayField(params, 'date') ?? undefined,
    week: optInt(params, 'week') ?? undefined,
    weekOffset: optInt(params, 'weekOffset') ?? undefined,
    anchorISO: anchorOf(params),
    movement: optStr(params, 'movement') || undefined,
  });
  const metrics = nums({ totalSessions: v.totalSessions, totalMovements: v.totalMovements, totalWeeks: v.totalWeeks });
  return { data: { metrics }, html: renderPlanHtml(v) };
}

/** `calorie.view.plan-write-preview` · 写前预览（只读：改前 → 改后，不写库；与写实现同一定位规则）。 */
export function viewPlanWritePreview(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const v = previewWrite(params, db);
  const metrics = nums({ beforeLines: v.before.length, afterLines: v.after.length });
  return { data: { metrics }, html: renderPlanWritePreviewHtml(v) };
}
/** `calorie.view.plan-vs-actual` · 计划比实际（窗内计划动作 × 运动记录逐日命中；缺 `window` 即本周）。 */
export function viewPlanVsActual(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const s0 = optStr(params, 'start');
  const e0 = optStr(params, 'end');
  const range = windowRange(params) ??
    (s0 && e0 ? { start: s0, end: e0 } : windowRange({ ...params, window: '本周' }));
  if (!range) fail(2, '缺参数 window（或 start＋end）');
  assertISO(range.start, 'start');
  assertISO(range.end, 'end');
  const v = buildPlanVsActualView(db, range);
  const metrics = nums({ plannedCount: v.plannedCount, doneCount: v.doneCount, completionRate: v.completionRate });
  return { data: { metrics }, html: renderPlanVsActualHtml(v) };
}
