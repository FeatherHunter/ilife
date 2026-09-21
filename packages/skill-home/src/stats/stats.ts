// 统计能力·总览与预警（`home.stats.overview`／`home.stats.alert` 的处理函数，
// #800 从 cmd_read 逐字搬迁）。出参 stat／list 形，行为与搬迁前一致。

import type { HomeDb } from '../fetch/db.js';
import { listInventoryRecords } from '../fetch/index.js';
import { statsOverview, highFreq, idleItems, expiringItems } from '../fetch/index.js';
import { fail } from '../shared/fail.js';
import { buildStatsOverview, buildStatsAlert } from '../render/index.js';

export function runStatsOverview(params: Record<string, unknown>, handle: HomeDb): unknown {
  const kind = (params.kind as string | undefined) ?? 'summary';
  const base = statsOverview(handle);
  const top = highFreq(handle, 5);
  const metrics: Record<string, number> = { ...base };
  for (const t of top) metrics['top.' + t.name.slice(0, 8)] = t.count;
  if (kind === 'inventory') {
    const recs = listInventoryRecords(handle, 1);
    metrics.records = recs.length;
  }
  return buildStatsOverview(metrics);
}

export function runStatsAlert(params: Record<string, unknown>, handle: HomeDb): unknown {
  const kind = (params.kind as string | undefined) ?? 'idle';
  if (kind === 'expiring') {
    const days = params.days !== undefined ? Number(params.days) : 30;
    if (!Number.isInteger(days) || days <= 0) fail(2, 'days 须为正整数');
    const rows = expiringItems(handle, days, params.expired_only === true || params.expiredOnly === true);
    return buildStatsAlert(rows.map((r) => ({ id: r.item_id, name: '#' + r.item_id + ' ' + r.location, location: r.expiration_date, quantity: 1, status: '到期', category: '', tags: '' })));
  }
  const days = params.days !== undefined ? Number(params.days) : 90;
  if (![90, 180, 365].includes(days) && (!Number.isInteger(days) || days <= 0)) fail(2, 'days 须为正整数（90/180/365）');
  const rows = idleItems(handle, days);
  return buildStatsAlert(rows.map((r) => ({ id: r.id, name: r.name, location: '', quantity: 1, status: '闲置', category: '', tags: '' })));
}
