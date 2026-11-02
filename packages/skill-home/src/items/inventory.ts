// 物品能力·盘点（`home.inventory.round`／`home.inventory.records` 的处理函数，
// #800 从 cmd_read 逐字搬迁）。出参 receipt／list 形，行为与搬迁前一致。

import type { HomeDb } from '../fetch/db.js';
import { addInventoryRecord, listInventoryRecords } from '../fetch/index.js';
import { normalizeLocation } from '../policy/index.js';
import { fail } from '../shared/fail.js';
import { asInt } from '../shared/params.js';
import { buildReceipt, buildInventoryRecords } from '../render/index.js';
import { m } from '../entries/index.js';

export function runInventoryRound(params: Record<string, unknown>, handle: HomeDb): unknown {
  const op = (params.op as string | undefined) ?? 'round';
  if (op === 'round') {
    const scopeRaw = String(params.scope ?? 'all');
    const loc = params.location !== undefined ? normalizeLocation(params.location) : null;
    // #916：scope 存范围名（老库语义）。location 最具体时优先；all→全屋；location 无具体位置→按位置；其余原样（已是中文范围名）。
    const scopeName = loc ? loc : scopeRaw === 'all' ? '全屋' : scopeRaw === 'location' ? '按位置' : scopeRaw.trim() === '' ? '全屋' : scopeRaw;
    let total = 0;
    if (loc) total = (handle.db.prepare('SELECT count(*) AS c FROM item_locations WHERE location LIKE ?').get(loc + '%') as { c: number }).c;
    else total = (handle.db.prepare('SELECT count(*) AS c FROM item_locations').get() as { c: number }).c;
    const id = addInventoryRecord(handle, scopeName, { total });
    return buildReceipt(m('skill-home.items-inventory.c004', { p0: String(id), p1: String(scopeName), p2: String(total) }));
  }
  if (op === 'resolve') {
    const rid = asInt(params.record_id ?? params.recordId ?? params.id, 'record_id');
    if (rid === undefined) fail(2, m('skill-home.items-inventory.c005'));
    return buildReceipt(m('skill-home.items-inventory.c006', { p0: String(rid) }));
  }
  if (op === 'move') {
    const mode = String(params.mode ?? 'checklist');
    if (mode === 'commit') return buildReceipt(m('skill-home.items-inventory.c007'));
    return buildReceipt(m('skill-home.items-inventory.c008'));
  }
  fail(2, m('skill-home.items-inventory.c009', { p0: String(op) })); return null;
}

export function runInventoryRecords(params: Record<string, unknown>, handle: HomeDb): unknown {
  void params;
  const rows = listInventoryRecords(handle);
  // #916：老形状无 total 列。规模优先读 detail_json.total（round 落盘时带），否则按缺+多+异+待确认合计，兼容新形状遗留库的 total/missing/extra。
  const totalOf = (r: Record<string, unknown>): number => {
    try {
      const raw = r.detail_json;
      if (typeof raw === 'string' && raw.trim() !== '' && raw.trim() !== '[]') {
        const d = JSON.parse(raw) as { total?: unknown };
        if (typeof d.total === 'number' && Number.isInteger(d.total) && d.total >= 0) return d.total;
      }
    } catch { /* 非 JSON 即按合计 */ }
    const legacy = r.total;
    if (typeof legacy === 'number' && Number.isInteger(legacy)) return legacy;
    const m = Number((r.missing_cnt ?? r.missing ?? 0) as unknown) || 0;
    const e = Number((r.extra_cnt ?? r.extra ?? 0) as unknown) || 0;
    const df = Number((r.diff_cnt ?? 0) as unknown) || 0;
    const p = Number((r.pending_cnt ?? 0) as unknown) || 0;
    return m + e + df + p;
  };
  return buildInventoryRecords(rows.map((r) => ({ id: Number(r.id), scope: String(r.scope), total: totalOf(r) })));
}
