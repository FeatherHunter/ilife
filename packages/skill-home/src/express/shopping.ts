// 快递购物能力·购物查询与购物管理（`home.shopping.query`／`home.shopping.write` 的处理函数，
// #800 从 cmd_read 逐字搬迁）。出参 list／receipt 形，行为与搬迁前一致。

import type { HomeDb } from '../fetch/db.js';
import { STATUS_AT_HOME, STATUS_SPARE, STATUS_SHIPPING } from '../fetch/db.js';
import {
  getItemById, adjustQuantity, setLocationStatus,
  listShopping, addShopping, checkShopping, setThreshold,
} from '../fetch/index.js';
import { fail } from '../shared/fail.js';
import { asInt } from '../shared/params.js';
import { needId } from '../policy/index.js';
import { buildShoppingList, buildReceipt } from '../render/index.js';
import { m } from '../entries/index.js';

export function runShoppingQuery(params: Record<string, unknown>, handle: HomeDb): unknown {
  const kind = (params.kind as string | undefined) ?? 'list';
  if (kind === 'missing') {
    // 缺货：有阈值且（在家＋备用）合计＜阈值；只计在家／备用，快递中不算在库（沿老 ops 口径）。
    // #927：分类名走 categories JOIN（老库无 items.category 列）。
    const rows = handle.db.prepare(
      `SELECT i.id, i.name, c.name AS category_name, ifnull(sum(CASE WHEN l.location_status IN ('${STATUS_AT_HOME}','${STATUS_SPARE}') THEN l.quantity ELSE 0 END),0) AS qty, s.threshold FROM items i JOIN stock_thresholds s ON s.item_id=i.id LEFT JOIN item_locations l ON l.item_id=i.id LEFT JOIN categories c ON c.id=i.category_id GROUP BY i.id HAVING qty < s.threshold ORDER BY i.name`,
    ).all() as { id: number; name: string; category_name: string | null; qty: number; threshold: number }[];
    const items = rows.map((r) => {
      const qty = Number(r.qty ?? 0);
      const th = Number(r.threshold);
      const status = qty <= 0 ? m('skill-home.express-shopping.c001') : m('skill-home.express-shopping.c002');
      const suggest = Math.max(2 * th - qty, 1);
      return {
        name: String(r.name),
        id: r.id,
        current: qty,
        threshold: th,
        threshold_source: m('skill-home.express-shopping.c003'),
        status,
        suggest,
        category_name: String(r.category_name ?? m('skill-home.express-shopping.c004')),
      };
    });
    const base = buildShoppingList(items.map((it) => ({ name: it.name })));
    return { ...base, items, scope: m('skill-home.express-shopping.c005'), threshold_default: 1 };
  }
  if (kind === 'stock') {
    // 囤货：有阈值物品给当前量／阈值／库存状态；无阈值常用品给提示（按使用次数前 10）。
    // #927：分类名走 categories JOIN。
    const rows = handle.db.prepare(
      `SELECT i.id, i.name, c.name AS category_name, ifnull(sum(CASE WHEN l.location_status IN ('${STATUS_AT_HOME}','${STATUS_SPARE}') THEN l.quantity ELSE 0 END),0) AS qty, s.threshold FROM items i LEFT JOIN item_locations l ON l.item_id=i.id LEFT JOIN stock_thresholds s ON s.item_id=i.id LEFT JOIN categories c ON c.id=i.category_id GROUP BY i.id ORDER BY i.name`,
    ).all() as { id: number; name: string; category_name: string | null; qty: number; threshold: number | null }[];
    const stockOf = (qty: number, th: number): string => (qty <= 0 ? m('skill-home.express-shopping.c006') : qty < th ? m('skill-home.express-shopping.c007') : m('skill-home.express-shopping.c008'));
    const items = rows
      .filter((r) => r.threshold !== null && r.threshold !== undefined)
      .map((r) => {
        const qty = Number(r.qty ?? 0);
        const th = Number(r.threshold);
        return {
          name: String(r.name),
          id: r.id,
          current: qty,
          threshold: th,
          status: stockOf(qty, th),
          category_name: String(r.category_name ?? m('skill-home.express-shopping.c009')),
        };
      });
    const hints = (handle.db.prepare(
      "SELECT i.id, i.name, c.name AS category_name FROM items i LEFT JOIN categories c ON c.id=i.category_id WHERE NOT EXISTS (SELECT 1 FROM stock_thresholds s WHERE s.item_id=i.id) ORDER BY i.access_count DESC, i.name LIMIT 10",
    ).all() as { id: number; name: string; category_name: string | null }[]).map((r) => ({
      name: String(r.name),
      id: r.id,
      category_name: String(r.category_name ?? m('skill-home.express-shopping.c010')),
    }));
    const base = buildShoppingList(items.map((it) => ({ name: it.name })));
    return { ...base, items, hints };
  }
  if (kind === 'express') {
    const days = params.timeout_days !== undefined ? Number(params.timeout_days) : 7;
    if (!Number.isInteger(days) || days <= 0) fail(2, m('skill-home.express-shopping.c011'));
    const rows = handle.db.prepare(
      `SELECT i.id, i.name, c.name AS category_name, i.photo AS photo, l.location AS location, l.quantity AS quantity, l.purchase_date AS purchase_date FROM items i JOIN item_locations l ON l.item_id=i.id LEFT JOIN categories c ON c.id=i.category_id WHERE l.location_status='${STATUS_SHIPPING}' ORDER BY l.purchase_date LIMIT 50`,
    ).all() as { id: number; name: string; category_name: string | null; photo: string | null; location: string; quantity: number; purchase_date: string | null }[];
    const today = Date.now();
    const items = rows.map((r) => {
      const t = r.purchase_date ? Math.floor((today - new Date(r.purchase_date).getTime()) / 86400000) : 0;
      const wait = Math.max(t, 0);
      return {
        name: String(r.name),
        id: r.id,
        quantity: Number(r.quantity ?? 1),
        category_name: String(r.category_name ?? m('skill-home.express-shopping.c012')),
        location: String(r.location ?? ''),
        photo: r.photo ? String(r.photo) : '',
        days: wait,
        overdue: wait > days,
      };
    });
    const base = buildShoppingList(items.map((it) => ({ name: it.name })));
    return { ...base, items, timeout_days: days };
  }
  const all = listShopping(handle) as { id: number; name: string; quantity: number; routine: string | null; checked: number }[];
  const items = all.map((r) => ({
    name: String(r.name),
    id: r.id,
    quantity: Number(r.quantity ?? 1),
    routine: r.routine ? String(r.routine) : '',
    checked: Number(r.checked ?? 0),
    sourceLabel: r.routine ? m('skill-home.express-shopping.c013') : m('skill-home.express-shopping.c014'),
    statusLabel: Number(r.checked ?? 0) ? m('skill-home.express-shopping.c015') : m('skill-home.express-shopping.c016'),
  }));
  const base = buildShoppingList(items.map((it) => ({ name: it.name })));
  return { ...base, items };
}

export function runShoppingWrite(params: Record<string, unknown>, handle: HomeDb): unknown {
  const op = (params.op as string | undefined) ?? 'check';
  if (op === 'list-add') {
    if (typeof params.name !== 'string' || !params.name.trim()) fail(2, m('skill-home.express-shopping.c017'));
    const id = addShopping(handle, params.name as string, Number(params.quantity ?? 1), (params.routine as string | undefined) ?? null);
    return buildReceipt(m('skill-home.express-shopping.c018', { p0: String(id) }));
  }
  if (op === 'list-check' || op === 'check') {
    const ids = String(params.ids ?? '').split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0);
    if (!ids.length) fail(2, m('skill-home.express-shopping.c019'));
    const n = checkShopping(handle, ids);
    return buildReceipt(m('skill-home.express-shopping.c020', { p0: String(n) }));
  }
  if (op === 'missing-to-list') {
    const ids = String(params.ids ?? '').split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0);
    if (!ids.length) fail(2, m('skill-home.express-shopping.c021'));
    for (const id of ids) {
      const it = getItemById(handle, id);
      addShopping(handle, it.name, 1, null);
    }
    return buildReceipt(m('skill-home.express-shopping.c022', { p0: String(ids.length) }));
  }
  if (op === 'stock-threshold' || op === 'stock-set-threshold') {
    const id = asInt(params.id ?? params.item_id, 'id');
    const th = params.threshold;
    if (id === undefined || !Number.isInteger(th)) fail(2, m('skill-home.express-shopping.c023'));
    setThreshold(handle, id as number, th as number);
    return buildReceipt(m('skill-home.express-shopping.c024', { p0: String(id), p1: String(th) }));
  }
  if (op === 'stock-fix') {
    const id = needId(params);
    const qty = Number(params.quantity);
    if (!Number.isInteger(qty) || qty < 0) fail(2, m('skill-home.express-shopping.c025'));
    adjustQuantity(handle, id, { set: qty });
    return buildReceipt(m('skill-home.express-shopping.c026', { p0: String(id), p1: String(qty) }));
  }
  if (op === 'express-confirm') {
    const id = needId(params);
    setLocationStatus(handle, id, m('skill-home.express-shopping.c027'));
    return buildReceipt(m('skill-home.express-shopping.c028', { p0: String(id) }));
  }
  fail(2, m('skill-home.express-shopping.c029', { p0: String(op) })); return null;
}
