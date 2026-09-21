// 快递购物能力·购物查询与购物管理（`home.shopping.query`／`home.shopping.write` 的处理函数，
// #800 从 cmd_read 逐字搬迁）。出参 list／receipt 形，行为与搬迁前一致。

import type { HomeDb } from '../fetch/db.js';
import {
  getItemById, adjustQuantity, setLocationStatus,
  listShopping, addShopping, checkShopping, setThreshold,
} from '../fetch/index.js';
import { fail } from '../shared/fail.js';
import { asInt } from '../shared/params.js';
import { needId } from '../policy/index.js';
import { buildShoppingList, buildReceipt } from '../render/index.js';

export function runShoppingQuery(params: Record<string, unknown>, handle: HomeDb): unknown {
  const kind = (params.kind as string | undefined) ?? 'list';
  if (kind === 'missing') {
    // 缺货：有阈值且（在家＋备用）合计＜阈值；只计在家／备用，快递中不算在库（沿老 ops 口径）。
    const rows = handle.db.prepare(
      "SELECT i.id, i.name, i.category AS category_name, ifnull(sum(CASE WHEN l.location_status IN ('在家','备用') THEN l.quantity ELSE 0 END),0) AS qty, s.threshold FROM items i JOIN stock_thresholds s ON s.item_id=i.id LEFT JOIN item_locations l ON l.item_id=i.id GROUP BY i.id HAVING qty < s.threshold ORDER BY i.name",
    ).all() as { id: number; name: string; category_name: string | null; qty: number; threshold: number }[];
    const items = rows.map((r) => {
      const qty = Number(r.qty ?? 0);
      const th = Number(r.threshold);
      const status = qty <= 0 ? '空' : '低';
      const suggest = Math.max(2 * th - qty, 1);
      return {
        name: String(r.name),
        id: r.id,
        current: qty,
        threshold: th,
        threshold_source: '囤货设置',
        status,
        suggest,
        category_name: String(r.category_name ?? '(未分类)'),
      };
    });
    const base = buildShoppingList(items.map((it) => ({ name: it.name })));
    return { ...base, items, scope: '全屋', threshold_default: 1 };
  }
  if (kind === 'stock') {
    // 囤货：有阈值物品给当前量／阈值／库存状态；无阈值常用品给提示（按使用次数前 10）。
    const rows = handle.db.prepare(
      "SELECT i.id, i.name, i.category AS category_name, ifnull(sum(CASE WHEN l.location_status IN ('在家','备用') THEN l.quantity ELSE 0 END),0) AS qty, s.threshold FROM items i LEFT JOIN item_locations l ON l.item_id=i.id LEFT JOIN stock_thresholds s ON s.item_id=i.id GROUP BY i.id ORDER BY i.name",
    ).all() as { id: number; name: string; category_name: string | null; qty: number; threshold: number | null }[];
    const stockOf = (qty: number, th: number): string => (qty <= 0 ? '空' : qty < th ? '低' : '充足');
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
          category_name: String(r.category_name ?? '(未分类)'),
        };
      });
    const hints = (handle.db.prepare(
      "SELECT i.id, i.name, i.category AS category_name FROM items i WHERE NOT EXISTS (SELECT 1 FROM stock_thresholds s WHERE s.item_id=i.id) ORDER BY i.access_count DESC, i.name LIMIT 10",
    ).all() as { id: number; name: string; category_name: string | null }[]).map((r) => ({
      name: String(r.name),
      id: r.id,
      category_name: String(r.category_name ?? '(未分类)'),
    }));
    const base = buildShoppingList(items.map((it) => ({ name: it.name })));
    return { ...base, items, hints };
  }
  if (kind === 'express') {
    const days = params.timeout_days !== undefined ? Number(params.timeout_days) : 7;
    if (!Number.isInteger(days) || days <= 0) fail(2, 'timeout-days 须为正整数');
    const rows = handle.db.prepare(
      "SELECT i.id, i.name, i.category AS category_name, i.photo AS photo, l.location AS location, l.quantity AS quantity, l.purchase_date AS purchase_date FROM items i JOIN item_locations l ON l.item_id=i.id WHERE l.location_status='快递中' ORDER BY l.purchase_date LIMIT 50",
    ).all() as { id: number; name: string; category_name: string | null; photo: string | null; location: string; quantity: number; purchase_date: string | null }[];
    const today = Date.now();
    const items = rows.map((r) => {
      const t = r.purchase_date ? Math.floor((today - new Date(r.purchase_date).getTime()) / 86400000) : 0;
      const wait = Math.max(t, 0);
      return {
        name: String(r.name),
        id: r.id,
        quantity: Number(r.quantity ?? 1),
        category_name: String(r.category_name ?? '(未分类)'),
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
    sourceLabel: r.routine ? '例行' : '手动记的',
    statusLabel: Number(r.checked ?? 0) ? '已买' : '待买',
  }));
  const base = buildShoppingList(items.map((it) => ({ name: it.name })));
  return { ...base, items };
}

export function runShoppingWrite(params: Record<string, unknown>, handle: HomeDb): unknown {
  const op = (params.op as string | undefined) ?? 'check';
  if (op === 'list-add') {
    if (typeof params.name !== 'string' || !params.name.trim()) fail(2, 'list-add 须给 name');
    const id = addShopping(handle, params.name as string, Number(params.quantity ?? 1), (params.routine as string | undefined) ?? null);
    return buildReceipt('已加入购物清单：' + id);
  }
  if (op === 'list-check' || op === 'check') {
    const ids = String(params.ids ?? '').split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0);
    if (!ids.length) fail(2, 'list-check 须给 ids 逗号列表');
    const n = checkShopping(handle, ids);
    return buildReceipt('已勾选：' + n + ' 项');
  }
  if (op === 'missing-to-list') {
    const ids = String(params.ids ?? '').split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0);
    if (!ids.length) fail(2, 'missing-to-list 须给 ids');
    for (const id of ids) {
      const it = getItemById(handle, id);
      addShopping(handle, it.name, 1, null);
    }
    return buildReceipt('缺货已进清单：' + ids.length + ' 项');
  }
  if (op === 'stock-threshold' || op === 'stock-set-threshold') {
    const id = asInt(params.id ?? params.item_id, 'id');
    const th = params.threshold;
    if (id === undefined || !Number.isInteger(th)) fail(2, '须给 id+threshold');
    setThreshold(handle, id as number, th as number);
    return buildReceipt('已设阈值：' + id + '=' + th);
  }
  if (op === 'stock-fix') {
    const id = needId(params);
    const qty = Number(params.quantity);
    if (!Number.isInteger(qty) || qty < 0) fail(2, 'stock-fix 须给 quantity 非负整数');
    adjustQuantity(handle, id, { set: qty });
    return buildReceipt('已校准库存：' + id + '=' + qty);
  }
  if (op === 'express-confirm') {
    const id = needId(params);
    setLocationStatus(handle, id, '在家');
    return buildReceipt('已收货确认：' + id + '（快递中→在家）');
  }
  fail(2, '未知 shopping op：' + op); return null;
}
