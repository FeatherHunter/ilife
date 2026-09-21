/** 分析与洞察的处理函数（命令事实的执行一半；声明在 `./commands.ts`）。
 *
 * 逐字搬自 `src/cli/cmd_read.ts` 的 switch 一臂 ＋ `monthRange`（行为零改动）。
 */
import { ScheduleFetchError, listRecordsRange } from '../fetch/index.js';
import { l1Of, validateCompareInput } from '../policy/index.js';
import { buildAnomaly, buildCategoryDeep, buildRecordCompare } from '../render/index.js';
import type { ScheduleDb } from '../fetch/db.js';
import type { ViewHandler } from '../shared/commandSpec.js';

function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  const dd = String(last).padStart(2, '0');
  return { start: month + '-01', end: month + '-' + dd };
}

export const viewRecordCompare: ViewHandler = (params, handle: ScheduleDb) => {
  const c = validateCompareInput(params) as Record<string, unknown>;
  if (c.kind === 'months') {
    const ra = monthRange(c.monthA as string);
    const rb = monthRange(c.monthB as string);
    const a = listRecordsRange(handle, ra.start, ra.end);
    const b = listRecordsRange(handle, rb.start, rb.end);
    if (!a.length || !b.length) {
      throw new ScheduleFetchError('SCHEDULE_EMPTY_RANGE', '对比缺数据：' + c.monthA + '(' + a.length + '块)/' + c.monthB + '(' + b.length + '块)');
    }
    return { data: buildRecordCompare({ labelA: c.monthA as string, labelB: c.monthB as string, a, b }), html: '' };
  }
  if (c.kind === 'ranges') {
    const a = listRecordsRange(handle, c.startA as string, c.endA as string);
    const b = listRecordsRange(handle, c.startB as string, c.endB as string);
    if (!a.length || !b.length) throw new ScheduleFetchError('SCHEDULE_EMPTY_RANGE', '对比缺数据（两侧均须有记录）');
    return { data: buildRecordCompare({ labelA: c.labelA as string, labelB: c.labelB as string, a, b }), html: '' };
  }
  if (c.kind === 'category') {
    const records = listRecordsRange(handle, c.start as string, c.end as string);
    if (!records.length) throw new ScheduleFetchError('SCHEDULE_EMPTY_RANGE', '区间无记录：' + c.start + '~' + c.end);
    return { data: buildCategoryDeep(c.start as string, c.end as string, c.category as string, records), html: '' };
  }
  const w = c.windowDays as number;
  const end = c.end as string;
  const d = new Date(end + 'T00:00:00');
  d.setDate(d.getDate() - (w - 1));
  const start = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const records = listRecordsRange(handle, start, end);
  if (!records.length) throw new ScheduleFetchError('SCHEDULE_EMPTY_RANGE', '窗口无记录：' + start + '~' + end);
  const byDay = new Map<string, Record<string, number>>();
  for (const r of records) {
    const m = byDay.get(r.date) || {};
    const k = l1Of(r.category);
    m[k] = (m[k] || 0) + (r.duration_minutes || 0);
    byDay.set(r.date, m);
  }
  const daily = [...byDay.entries()].sort().map(([date, byL1]) => ({ date, byL1 }));
  return { data: buildAnomaly(end, w, daily), html: '' };
};
