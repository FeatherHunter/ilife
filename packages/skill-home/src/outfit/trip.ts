// 穿搭出行能力·出行清单（`home.trip.manage` 的处理函数，#800 从 cmd_read 逐字搬迁）。
//
// 入参 mode=pack|return；出参 receipt 形，行为与搬迁前一致。

import type { HomeDb } from '../fetch/db.js';
import { setLocationStatus } from '../fetch/index.js';
import { buildReceipt } from '../render/index.js';

export function runTripManage(params: Record<string, unknown>, handle: HomeDb): unknown {
  const mode = (params.mode as string | undefined) ?? 'pack';
  if (mode === 'return') {
    const rows = handle.db.prepare("SELECT item_id FROM item_locations WHERE location_status='旅游中'").all() as { item_id: number }[];
    let n = 0;
    for (const r of rows) { setLocationStatus(handle, r.item_id, '在家'); n++; }
    return buildReceipt(n ? '已归位：' + n + ' 件（旅游中→在家）' : '无旅游中物品（真实无待归位）');
  }
  // pack：按 trip-type 置旅游中（默认全部在家件 too many？仅标记指定 ids 或前 N）
  const ids = Array.isArray(params.ids) ? (params.ids as unknown[]).filter((x) => Number.isInteger(x)) as number[] : [];
  if (ids.length) {
    for (const id of ids) setLocationStatus(handle, id, '旅游中');
    return buildReceipt('已带出：' + ids.length + ' 件（→旅游中）');
  }
  return buildReceipt('出行清单已生成（旅游中 0 件待确认；带 ids 落盘）');
}
