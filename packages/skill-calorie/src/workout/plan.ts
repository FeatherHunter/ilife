/** 看训练计划（HELP 场景 05「健身计划」下一级「看训练计划」）：`calorie.view.plan` 读 ＋
 * `calorie.view.plan-vs-actual` 读（计划 vs 实际对比）。
 *
 * 取数住视图层 `render/planPlate.ts` 的 `buildPlanView`（全计划：配置＋周×日×动作；
 * 带 `date`／`week`／`weekOffset`／`movement` 即按粒度过滤）与 `buildPlanVsActualView`
 * （窗内计划动作 × 运动记录逐日命中），整页模板住 `render/html.ts`——这两件是视图层的活，
 * 本能力只经它们的公开函数调用，不把那份取数抄进自己目录（铁律一）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { renderPlanHtml, renderPlanVsActualHtml } from '../render/html.js';
import { buildPlanProcessDoc } from '../render/workoutPlanDocs.js';
import { buildPlanView, buildPlanVsActualView } from '../render/planPlate.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { anchorOf, assertISO, dayField, fail, nums, optInt, optStr, windowRange } from '../shared/params.js';
import { commandLine } from '../shared/writeParts.js';
import { planConfirmCommand, planModifyPayload } from './planPreviewPayloads.js';
import { previewWrite } from './write.js';

/** `calorie.view.plan` · 训练计划看（整个计划：总周数／训练日／动作数 ＋ 每周完成率；带筛选即看该粒度）。
 *  无计划（空库／撤销后）就照 `buildPlanView` 的缺失阻断抛 `missing-data`（调用方走 fallback，不静默空页）：
 *  读命令要能区分「没有计划」与「有计划」，不许用 catch 把它吞成一张好看的空态页。
 *
 *  **#947 · 目标日下传 ＋ 两张新读数**（报障单 #944 故障 4／5）：
 *  ① 目标日（`params.date`）经 `dayField` 进 `buildPlanView` 的 `dateISO`——页面四态（已结束／未开始／
 *     本日无课／真无计划）由取数层按这一个日子判，命令层不再自己算周次；
 *  ② `data.metrics` 里那三个键**保持现义**（`totalSessions`／`totalMovements`＝本次过滤取到的，
 *     `totalWeeks`＝配置全量）：它们是**报文契约**，`test/scene05-read`（8 条读词）与
 *     `test/scene05-write-create`／`scene05-write-mutate` 三件冻结用例按「本次取到几场」读它们，
 *     本票不动这三件的路径，故不动这三个键的语义；
 *  ③ 于是**计划全量**另出两个键 `planSessions`／`planMovements`（与 `totalWeeks` 同源），页面「总场次／
 *     总动作」两张卡读的就是这两个——带参与不带参两页因此逐字相等（票面判据 ④）。 */
export function viewPlan(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const v = buildPlanView(db, {
    dateISO: dayField(params, 'date') ?? undefined,
    week: optInt(params, 'week') ?? undefined,
    weekOffset: optInt(params, 'weekOffset') ?? undefined,
    anchorISO: anchorOf(params),
    movement: optStr(params, 'movement') || undefined,
  });
  const metrics = nums({
    totalSessions: v.totalSessions, totalMovements: v.totalMovements, totalWeeks: v.totalWeeks,
    planSessions: v.planSessions, planMovements: v.planMovements,
  });
  return { data: { metrics }, html: renderPlanHtml(v, { key: 'calorie.view.plan', command: commandLine('calorie.view.plan', params) }) };
}

/** `calorie.view.plan-write-preview` · 写前预览（只读：改前 → 改后，不写库；与写实现同一定位规则）。
 *  页面底部出**两枚载荷**（`#946`；`#944` 故障 3／8）：确认指令＝本次 op 那条会改数据库的命令、带本次
 *  改后值、可原样执行；修改指令＝「我现在需要把什么修改为什么，确定录入，可以进行修改了」＋同一条命令名。
 *  两枚按本次 op 与本次参数现算（`./planPreviewPayloads.js`），交给页面装配件 `../render/workoutPlanDocs.js`
 *  的 `buildPlanProcessDoc`（`../render/html.ts` 那个薄转出仍留原签名，本页不再走它：它只带得动一个 `prompt` 位）。 */
export function viewPlanWritePreview(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const v = previewWrite(params, db);
  const metrics = nums({ beforeLines: v.before.length, afterLines: v.after.length });
  return {
    data: { metrics },
    html: buildPlanProcessDoc(v, {
      key: 'calorie.view.plan-write-preview',
      command: commandLine('calorie.view.plan-write-preview', params),
      confirmPayload: planConfirmCommand(v.op, params),
      modifyPayload: planModifyPayload(v.op),
    }),
  };
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
  return { data: { metrics }, html: renderPlanVsActualHtml(v, { key: 'calorie.view.plan-vs-actual', command: commandLine('calorie.view.plan-vs-actual', params) }) };
}
