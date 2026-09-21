// 快递购物能力·购物查询与购物管理（`home.shopping.query`／`home.shopping.write` 的处理函数，
// #800 从 cmd_read 逐字搬迁）。出参 list／receipt 形，行为与搬迁前一致。

import type { HomeDb } from '../fetch/db.js';
import {
  getItemById, adjustQuantity, setLocationStatus,
  listShopping, addShopping, checkShopping, missingItems, stockList, setThreshold,
} from '../fetch/index.js';
import { fail } from '../shared/fail.js';
import { asInt } from '../shared/params.js';
import { needId } from '../policy/index.js';
import { buildShoppingList, buildReceipt } from '../render/index.js';

export function runShoppingQuery(params: Record<string, unknown>, handle: HomeDb): unknown {
  const kind = (params.kind as string | undefined) ?? 'list';
  if (kind === 'missing') return buildShoppingList(missingItems(handle).map((r) => ({ name: String(r.name) })));
  if (kind === 'stock') return buildShoppingList(stockList(handle).map((r) => ({ name: String(r.name) + '×' + String((r as { qty?: unknown }).qty) })));
  if (kind === 'express') {
    const days = params.timeout_days !== undefined ? Number(params.timeout_days) : 7;
    if (!Number.isInteger(days) || days <= 0) fail(2, 'timeout-days 须为正整数');
    const rows = handle.db.prepare("SELECT i.id, i.name, l.purchase_date FROM items i JOIN item_locations l ON l.item_id=i.id WHERE l.location_status='快递中' LIMIT 50").all() as { id: number; name: string; purchase_date: string | null }[];
    const today = Date.now();
    return buildShoppingList(rows.map((r) => {
      const t = r.purchase_date ? Math.floor((today - new Date(r.purchase_date).getTime()) / 86400000) : 0;
      return { name: r.name + (t > days ? '（超时' + t + '天）' : '（' + t + '天）') };
    }));
  }
  return buildShoppingList(listShopping(handle).map((r) => ({ name: String(r.name) })));
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
