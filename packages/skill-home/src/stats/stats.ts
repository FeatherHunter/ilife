// 统计能力·总览与预警（`home.stats.overview`／`home.stats.alert` 的处理函数，#800 从 cmd_read 逐字搬迁）。
// 出参 stat／list 形，行为与搬迁前一致；#817 补：价格聚合（总价／覆盖率／价值排行）、预警回执补 category 与本次 days、盘点回执补真条数与最近一次明细。
import type { HomeDb } from '../fetch/db.js';
import { listInventoryRecords, statsOverview, highFreq, idleItems, expiringItems } from '../fetch/index.js';
import { fail } from '../shared/fail.js';
import { buildStatsOverview, buildStatsAlert } from '../render/index.js';

export function runStatsOverview(params: Record<string, unknown>, handle: HomeDb): unknown {
  const kind = (params.kind as string | undefined) ?? 'summary'; const metrics: Record<string, number> = { ...statsOverview(handle) };
  for (const t of highFreq(handle, 5)) metrics['top.' + t.name.slice(0, 8)] = t.count;
  const price = handle.db.prepare('SELECT ifnull(sum(purchase_price),0) AS total, count(purchase_price) AS covered FROM items').get() as { total: number; covered: number };
  const vals = handle.db.prepare('SELECT name, purchase_price AS p FROM items WHERE purchase_price IS NOT NULL ORDER BY p DESC LIMIT 5').all() as { name: string; p: number }[];
  metrics['price.total'] = price.total; metrics['price.covered'] = price.covered;
  metrics['price.cover'] = metrics.items ? Math.round((price.covered * 100) / metrics.items) : 0;
  for (const v of vals) metrics['value.' + v.name] = v.p;
  if (kind !== 'inventory') return buildStatsOverview(metrics);
  const last = listInventoryRecords(handle, 1)[0] as Record<string, unknown> | undefined;
  metrics.records = (handle.db.prepare('SELECT count(*) AS c FROM inventory_records').get() as { c: number }).c;
  const inventory = last ? { scope: String(last.scope ?? ''), location: String(last.location ?? ''), date: String(last.created_at ?? ''), total: Number(last.total ?? 0), missing: Number(last.missing ?? 0), extra: Number(last.extra ?? 0) } : null;
  return { ...buildStatsOverview(metrics), inventory };
}

export function runStatsAlert(params: Record<string, unknown>, handle: HomeDb): unknown {
  const kind = (params.kind as string | undefined) ?? 'idle';
  if (kind === 'expiring') {
    const days = params.days !== undefined ? Number(params.days) : 30;
    if (!Number.isInteger(days) || days <= 0) fail(2, 'days 须为正整数');
    const rows = expiringItems(handle, days, params.expired_only === true || params.expiredOnly === true);
    return { ...buildStatsAlert(rows.map((r) => ({ id: r.item_id, name: r.item_name, location: r.expiration_date, place: r.location, quantity: 1, status: '到期', category: r.category, tags: '' }))), days };
  }
  const days = params.days !== undefined ? Number(params.days) : 90;
  if (![90, 180, 365].includes(days) && (!Number.isInteger(days) || days <= 0)) fail(2, 'days 须为正整数（90/180/365）');
  const rows = idleItems(handle, days);
  return { ...buildStatsAlert(rows.map((r) => ({ id: r.id, name: r.name, location: '', quantity: 1, status: '闲置', category: r.category, tags: '' }))), days };
}
