// 日程与计划·时间口径（能力内部件）：本地库的 (日期, "HH:MM") ↔ 飞书 ISO 8601（+08:00）。
// 一条口径只写一处：24:00 在本地是「当天末」，在飞书是「次日 00:00」——两侧互相换算都走这里。
// 老出处：`feishu_sync.py:628`（`_to_iso`）、`:639`（`_from_iso`）、`:459`（`_ensure_iso`）、
// `schedule_cli.py:1431`（跨日边界：飞书 end 次日 00:00 等价于本地 23:59）。
export const TZ_SUFFIX = '+08:00';
/** 分片拉取的窗口宽度（小时）。老家 `feishu_sync.py:522` 的 `timedelta(hours=6)`。 */
export const SHARD_HOURS = 6;

function pad(n: number): string { return String(n).padStart(2, '0'); }

/** 日期挪一天（正负都走这一个公式；`nextDay` 与历史窗口都用它，别处不许再抄一遍）。 */
export function shiftDay(date: string, delta: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(y, m - 1, d);
  t.setDate(t.getDate() + delta);
  return t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate());
}

export function nextDay(date: string): string {
  return shiftDay(date, 1);
}

/** 本地 (日期, HH:MM) → 飞书 ISO。`24:00` 换到次日 `00:00`（飞书日历不接受 24:00）。 */
export function toFeishuISO(date: string, hhmm: string): string {
  if (hhmm === '24:00') return nextDay(date) + 'T00:00:00' + TZ_SUFFIX;
  return date + 'T' + hhmm + ':00' + TZ_SUFFIX;
}

export function dayStartISO(date: string): string { return date + 'T00:00:00' + TZ_SUFFIX; }
export function dayEndISO(date: string): string { return date + 'T23:59:59' + TZ_SUFFIX; }

/** ISO → 'HH:MM'；抠不出来返空串（不猜）。 */
export function hhmmOfISO(iso: string): string {
  const i = iso.indexOf('T');
  if (i < 0 || i + 6 > iso.length) return '';
  return iso.slice(i + 1, i + 6);
}

export function dateOfISO(iso: string): string { return iso.slice(0, 10); }

/**
 * 远端一对 (start, end) ISO → 本地槽位 (HH:MM, HH:MM)。
 * 跨日规则：结束落在次日 00:00 ⇒ 本地记 23:59（两条口径在这里对上，别处不许再抄一遍）。
 */
export function remoteSlotOf(startISO: string, endISO: string): { start: string; end: string } {
  let end = hhmmOfISO(endISO);
  if (end === '00:00' && dateOfISO(startISO) !== dateOfISO(endISO)) end = '23:59';
  return { start: hhmmOfISO(startISO), end };
}

/** 一天的检索分片：按 6 小时切片（规避 `+search-event` 单次返回上限）。 */
export function shardWindows(date: string): { start: string; end: string }[] {
  const out: { start: string; end: string }[] = [];
  for (let h = 0; h < 24; h += SHARD_HOURS) {
    const endH = h + SHARD_HOURS;
    out.push({
      start: date + 'T' + pad(h) + ':00:00' + TZ_SUFFIX,
      end: endH >= 24 ? nextDay(date) + 'T00:00:00' + TZ_SUFFIX : date + 'T' + pad(endH) + ':00:00' + TZ_SUFFIX,
    });
  }
  return out;
}

/** 24 小时的槽位标签（聚合视图用）：`00:00 - 01:00`。 */
export function hourLabel(h: number): string { return pad(h) + ':00 - ' + pad(h + 1) + ':00'; }
