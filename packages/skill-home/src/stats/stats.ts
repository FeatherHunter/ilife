// 统计能力·总览与预警（`home.stats.overview`／`home.stats.alert` 的处理函数，#800 从 cmd_read 逐字搬迁）。
// 出参 stat／list 形，行为与搬迁前一致；#817 补：价格聚合（总价／覆盖率／价值排行）、预警回执补 category 与本次 days、盘点回执补真条数与最近一次明细。
// #865 补（只增字段，键与形状不动）：summary 带分布逐项计数／价值与高频排行／近 30 天趋势；
// idle／expiring 逐条带天数与来源、回执带本次 days 与 allowed 档位；inventory 带盘点明细与遗留差异总数。
import type { HomeDb } from '../fetch/db.js';
import {
  listInventoryRecords, statsOverview, highFreq, idleItems, expiringItems,
  frequentTopItems, valueTopItems, categoryDistribution, locationDistribution,
  statusDistribution, ownerDistribution, recordTrend, inventoryDetail,
} from '../fetch/index.js';
import { fail } from '../shared/fail.js';
import { buildStatsOverview, buildStatsAlert } from '../render/index.js';

/** 闲置阈值档位（老 `stats/idle.py` ALLOWED_THRESHOLDS）。 */
const IDLE_GEARS = [90, 180, 365];
/** 过期预告档位（老 `stats/expiring.py` ALLOWED_DAYS）。 */
const EXPIRING_GEARS = [7, 30, 90];

export function runStatsOverview(params: Record<string, unknown>, handle: HomeDb): unknown {
  const kind = (params.kind as string | undefined) ?? 'summary'; const metrics: Record<string, number> = { ...statsOverview(handle) };
  for (const t of highFreq(handle, 5)) metrics['top.' + t.name.slice(0, 8)] = t.count;
  const price = handle.db.prepare('SELECT ifnull(sum(purchase_price),0) AS total, count(purchase_price) AS covered FROM items').get() as { total: number; covered: number };
  const vals = handle.db.prepare('SELECT name, purchase_price AS p FROM items WHERE purchase_price IS NOT NULL ORDER BY p DESC LIMIT 5').all() as { name: string; p: number }[];
  metrics['price.total'] = price.total; metrics['price.covered'] = price.covered;
  metrics['price.cover'] = metrics.items ? Math.round((price.covered * 100) / metrics.items) : 0;
  for (const v of vals) metrics['value.' + v.name] = v.p;
  if (kind !== 'inventory') {
    return {
      ...buildStatsOverview(metrics),
      distributions: {
        categories: categoryDistribution(handle), locations: locationDistribution(handle),
        statuses: statusDistribution(handle), owners: ownerDistribution(handle),
      },
      topValue: valueTopItems(handle, 5),
      topFreq: frequentTopItems(handle, 5),
      trend: recordTrend(handle, 30),
    };
  }
  // #865：records 取全表真实条数（旧写法先 `listInventoryRecords(handle, 1)` 再取 [0]，明细只剩最近一条）。
  const inv = inventoryDetail(handle, 20);
  const latest = listInventoryRecords(handle, 1)[0] as Record<string, unknown> | undefined;
  metrics.records = inv.total;
  const inventory = latest ? {
    scope: String(latest.scope ?? ''), location: String(latest.location ?? ''), date: String(latest.created_at ?? ''),
    total: Number(latest.total ?? 0), missing: Number(latest.missing ?? 0), extra: Number(latest.extra ?? 0),
  } : null;
  // 完成率：状态列在库时才给（新库无 status 列 → null，页面照实标待补，不编数）。
  const done = inv.rows.filter((r) => r.status === '已完成').length;
  const completion = inv.rows.some((r) => r.status !== null)
    ? { done, total: inv.total, pct: inv.total ? Math.round((done * 100) / inv.total) : 0 }
    : null;
  return { ...buildStatsOverview(metrics), inventory, inventoryDetail: inv.rows, inventoryDiffTotal: inv.diffTotal, completion };
}

export function runStatsAlert(params: Record<string, unknown>, handle: HomeDb): unknown {
  const kind = (params.kind as string | undefined) ?? 'idle';
  if (kind === 'expiring') {
    const days = params.days !== undefined ? Number(params.days) : 30;
    if (!Number.isInteger(days) || days <= 0) fail(2, 'days 须为正整数');
    const rows = expiringItems(handle, days, params.expired_only === true || params.expiredOnly === true);
    const items = rows.map((r) => ({
      id: r.item_id, name: r.item_name, location: r.expiration_date, place: r.location,
      quantity: r.quantity, status: r.location_status, category: r.category, tags: '',
      daysLeft: r.days_left, expirationDate: r.expiration_date,
    }));
    return { ...buildStatsAlert(items), days, allowed: EXPIRING_GEARS };
  }
  const days = params.days !== undefined ? Number(params.days) : 90;
  if (!IDLE_GEARS.includes(days) && (!Number.isInteger(days) || days <= 0)) fail(2, 'days 须为正整数（90/180/365）');
  // #865：闲置天数按 `coalesce(last_accessed_at, created_at)` 算，未满阈值的（含今天刚录入、从没用过的）不算闲置；
  // 按闲置天数降序（老 idle.py 口径），不再是「谁从没被访问过谁就算闲置」。
  const rows = idleItems(handle, days).filter((r) => r.days_idle >= days).sort((a, b) => b.days_idle - a.days_idle);
  const items = rows.map((r) => ({
    id: r.id, name: r.name, location: r.location, quantity: r.quantity,
    status: '闲置', category: r.category, tags: '', daysIdle: r.days_idle, source: r.source,
  }));
  return { ...buildStatsAlert(items), days, allowed: IDLE_GEARS };
}
