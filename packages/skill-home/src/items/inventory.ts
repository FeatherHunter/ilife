// 物品能力·盘点（`home.inventory.round`／`home.inventory.records` 的处理函数，
// #800 从 cmd_read 逐字搬迁）。出参 receipt／list 形，行为与搬迁前一致。

import type { HomeDb } from '../fetch/db.js';
import { addInventoryRecord, listInventoryRecords } from '../fetch/index.js';
import { normalizeLocation } from '../policy/index.js';
import { fail } from '../shared/fail.js';
import { asInt } from '../shared/params.js';
import { buildReceipt, buildInventoryRecords } from '../render/index.js';

export function runInventoryRound(params: Record<string, unknown>, handle: HomeDb): unknown {
  const op = (params.op as string | undefined) ?? 'round';
  if (op === 'round') {
    const scope = String(params.scope ?? 'all');
    const loc = params.location !== undefined ? normalizeLocation(params.location) : null;
    let total = 0;
    if (loc) total = (handle.db.prepare('SELECT count(*) AS c FROM item_locations WHERE location LIKE ?').get(loc + '%') as { c: number }).c;
    else total = (handle.db.prepare('SELECT count(*) AS c FROM item_locations').get() as { c: number }).c;
    const id = addInventoryRecord(handle, scope, loc, total);
    return buildReceipt('已盘点：#' + id + ' ' + scope + ' 共 ' + total + ' 条位置记录');
  }
  if (op === 'resolve') {
    const rid = asInt(params.record_id ?? params.recordId ?? params.id, 'record_id');
    if (rid === undefined) fail(2, '差异处理须给 record_id');
    return buildReceipt('已处理差异：#' + rid + '（缺/多/异/待确认人工逐条确认）');
  }
  if (op === 'move') {
    const mode = String(params.mode ?? 'checklist');
    if (mode === 'commit') return buildReceipt('已提交搬家盘点（带走/不带走已落盘）');
    return buildReceipt('搬家清单已生成（带走/不带走待确认，确认后 mode=commit）');
  }
  fail(2, '未知 inventory op：' + op); return null;
}

export function runInventoryRecords(params: Record<string, unknown>, handle: HomeDb): unknown {
  void params;
  const rows = listInventoryRecords(handle);
  return buildInventoryRecords(rows.map((r) => ({ id: Number(r.id), scope: String(r.scope), total: Number(r.total) })));
}
