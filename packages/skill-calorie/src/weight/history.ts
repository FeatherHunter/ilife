/** 看体重明细（HELP 场景 03「体重」下一级）：`calorie.view.weight-history` 读。
 *
 * 「看体重明细」与「看体重曲线」在命令面上是**同一个键**（曲线＝同一页在不同窗口词下的读法，
 * 见 `triggers/routing.ts` 的「看体重曲线」系列），故本文件是那两条子功能共同的住处。
 * 体重记录的取数（含「只看有备注的那些」）住同目录 `records.ts`。
 */
import type { DatabaseSync } from 'node:sqlite';
import { nums, optNum, optStr } from '../shared/params.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { buildWeightHistoryView } from './plate.js';
import { buildWeightHistoryDoc } from './plateDocs.js';

/** `calorie.view.weight-history` · 体重明细／曲线（显式起止优先，其次天数，缺省 30 天）。 */
export function viewWeightHistory(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const startDate = optStr(params, 'startDate') ?? optStr(params, 'start');
  const endDate = optStr(params, 'endDate') ?? optStr(params, 'end');
  const days = optNum(params, 'days');
  let h;
  if (startDate && endDate) h = buildWeightHistoryView(db, { startDate, endDate });
  else if (startDate && !endDate) h = buildWeightHistoryView(db, { startDate });
  else if (days !== undefined) h = buildWeightHistoryView(db, { days });
  else h = buildWeightHistoryView(db, {});
  const metrics = nums({
    rows: h.rows.length,
    spanDays: h.change?.spanDays, first: h.change?.first, last: h.change?.last,
    delta: h.change?.delta, dailyAvg: h.change?.dailyAvg,
  });
  return { data: { metrics }, html: buildWeightHistoryDoc(h) };
}
