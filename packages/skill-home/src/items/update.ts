// 物品能力·改物品（`home.item.update` 的处理函数，#800 从 cmd_read 逐字搬迁，#864 加厚回执）。
//
// 入参：id（必填）＋ op=generic|move|qty|status|tags|merge|undo|relate|photo；
// relate 另收 relation（配件／配套／替代／同捆／常用搭配，缺省常用搭配）。
// 出参 receipt 形：消息一句话不变（前缀分流兼容），多带 detail 结构载荷
// （信封校验只要求 ok 与 message 在位，多带字段合法，与空间域先例同形态）。

import type { HomeDb } from '../fetch/db.js';
import { HomeFetchError } from '../fetch/index.js';
import {
  getCategoryById, getItemById, listLocationsByItem, listTagsByItem, setItemTags, adjustQuantity,
  setLocationStatus, moveLocation, updateItem,
} from '../fetch/index.js';
import { normalizeLocation, normalizeStatus, parseUpdateOp, needId } from '../policy/index.js';
import { checkMoney } from '../policy/index.js';
import { fail } from '../shared/fail.js';
import { asInt } from '../shared/params.js';
import { buildReceipt } from '../render/index.js';
import { m } from '../entries/index.js';

// 关系类型唯一定义地（本能力内共用：命令层校验与关联页展示都从这里取）。
export const ITEM_RELATION_TYPES = ['配件', '配套', '替代', '同捆', '常用搭配'] as const;
export type ItemRelationType = (typeof ITEM_RELATION_TYPES)[number];

export function normalizeRelationType(v: unknown): ItemRelationType {
  if (typeof v === 'string') {
    const s = v.trim() as ItemRelationType;
    if ((ITEM_RELATION_TYPES as readonly string[]).includes(s)) return s;
  }
  return '常用搭配';
}

export interface ItemSnapshotLocation {
  location: string;
  quantity: number;
  status: string;
}

export interface ItemSnapshot {
  id: number;
  name: string;
  category: string;
  locations: ItemSnapshotLocation[];
  tags: string[];
  remark: string;
}

export function snapshotOf(handle: HomeDb, id: number): ItemSnapshot {
  const item = getItemById(handle, id);
  const locs = listLocationsByItem(handle, id);
  const tags = listTagsByItem(handle, id);
  return {
    id: item.id,
    name: item.name,
    category: item.category ?? '',
    locations: locs.map((l) => ({ location: l.location, quantity: l.quantity, status: l.location_status })),
    tags,
    remark: item.remark ?? '',
  };
}

function totalOf(locs: ItemSnapshotLocation[]): number {
  return locs.reduce((a, l) => a + l.quantity, 0);
}

export function runItemUpdate(params: Record<string, unknown>, handle: HomeDb): unknown {
  const op = parseUpdateOp(params);
  const id = needId(params);
  if (op === 'qty') {
    const plus = params.plus !== undefined ? Number(params.plus) : undefined;
    const minus = params.minus !== undefined ? Number(params.minus) : undefined;
    const set = (params.set ?? params.quantity) !== undefined ? Number((params.set ?? params.quantity) as number) : undefined;
    if (plus !== undefined && (!Number.isInteger(plus) || plus <= 0)) fail(2, m('skill-home.items-update.c002'));
    if (minus !== undefined && (!Number.isInteger(minus) || minus <= 0)) fail(2, m('skill-home.items-update.c003'));
    if (set !== undefined && (!Number.isInteger(set) || set < 0)) fail(2, m('skill-home.items-update.c004'));
    const beforeLocs = listLocationsByItem(handle, id);
    const beforeQty = beforeLocs.reduce((a, l) => a + l.quantity, 0);
    const afterLocs = adjustQuantity(handle, id, { plus, minus, set, location: params.location as string | undefined });
    const afterQty = afterLocs.reduce((a, l) => a + l.quantity, 0);
    const snapshot = snapshotOf(handle, id);
    return { ...buildReceipt(m('skill-home.items-update.c005', { p0: String(id) })), detail: { snapshot, change: { before_quantity: beforeQty, after_quantity: afterQty } } };
  }
  if (op === 'status') {
    const st = normalizeStatus(params.location_status ?? params.status);
    const locKey = params.location as string | undefined;
    const beforeLocs = listLocationsByItem(handle, id);
    const beforeHit = locKey !== undefined ? beforeLocs.find((l) => l.location === locKey) : beforeLocs[0];
    const beforeSt = beforeHit?.location_status ?? '';
    const afterLocs = setLocationStatus(handle, id, st, locKey);
    const afterHit = locKey !== undefined ? afterLocs.find((l) => l.location === locKey) : afterLocs[0];
    const snapshot = snapshotOf(handle, id);
    return { ...buildReceipt(m('skill-home.items-update.c006', { p0: String(id), p1: String(st) })), detail: { snapshot, change: { before_status: beforeSt, after_status: afterHit?.location_status ?? st } } };
  }
  if (op === 'move') {
    const to = params.new_location ?? params.newLocation;
    if (typeof to !== 'string' || !to) fail(2, m('skill-home.items-update.c007'));
    const from = params.location as string | undefined;
    const beforeLocs = listLocationsByItem(handle, id);
    const beforeHit = from !== undefined ? beforeLocs.find((l) => l.location === from) : beforeLocs[0];
    const beforeLoc = beforeHit?.location ?? from ?? '';
    const afterLoc = normalizeLocation(to);
    moveLocation(handle, id, from, afterLoc);
    const snapshot = snapshotOf(handle, id);
    return { ...buildReceipt(m('skill-home.items-update.c008', { p0: String(id), p1: String(afterLoc) })), detail: { snapshot, change: { before_location: beforeLoc, after_location: afterLoc } } };
  }
  if (op === 'tags') {
    if (typeof params.tags !== 'string') fail(2, m('skill-home.items-update.c009'));
    const before = listTagsByItem(handle, id);
    const after = setItemTags(handle, id, (params.tags as string).split(','));
    const removed = before.filter((t) => !after.includes(t));
    const added = after.filter((t) => !before.includes(t));
    const snapshot = snapshotOf(handle, id);
    return { ...buildReceipt(m('skill-home.items-update.c010', { p0: String(id) })), detail: { snapshot, change: { removed, added } } };
  }
  if (op === 'merge') {
    const target = asInt(params.target, 'target');
    if (target === undefined) fail(2, m('skill-home.items-update.c011'));
    const sources = String(params.sources ?? '').split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0);
    if (!sources.length) fail(2, m('skill-home.items-update.c012'));
    // 先记来源快照（删后即无），再执行数量相加与源删除。
    const sourceRows: { id: number; name: string; quantity: number }[] = [];
    for (const s of sources) {
      if (s === target) continue;
      let name = '—';
      try { name = getItemById(handle, s).name; } catch { name = '—'; }
      const sl = listLocationsByItem(handle, s);
      const qty = sl.reduce((a, l) => a + l.quantity, 0);
      sourceRows.push({ id: s, name, quantity: qty });
    }
    // 数量相加 + 源删除（保留主条）
    let moved = 0;
    for (const s of sources) {
      if (s === target) continue;
      const sl = listLocationsByItem(handle, s);
      const qty = sl.reduce((a, l) => a + l.quantity, 0);
      if (qty > 0) {
        const tl = listLocationsByItem(handle, target as number);
        if (tl.length) adjustQuantity(handle, target as number, { plus: qty });
        moved += qty;
      }
      handle.db.prepare('DELETE FROM item_tags WHERE item_id=?').run(s);
      handle.db.prepare('DELETE FROM item_locations WHERE item_id=?').run(s);
      handle.db.prepare('DELETE FROM items WHERE id=?').run(s);
    }
    const snapshot = snapshotOf(handle, target as number);
    return { ...buildReceipt(m('skill-home.items-update.c013', { p0: String(target), p1: String(moved) })), detail: { snapshot, sources: sourceRows, moved } };
  }
  if (op === 'undo') {
    const ev = handle.db.prepare('SELECT id, item_id, event FROM item_events ORDER BY id DESC LIMIT 1').get() as { id: number; item_id: number; event: string } | undefined;
    if (!ev) throw new HomeFetchError('HOME_EMPTY_RANGE', m('skill-home.items-update.c024'));
    return buildReceipt(m('skill-home.items-update.c014', { p0: String(ev.id), p1: String(ev.event) }));
  }
  if (op === 'relate') {
    const related = asInt(params.related, 'related');
    if (related === undefined) fail(2, m('skill-home.items-update.c015'));
    const relation = normalizeRelationType(params.relation ?? params.relation_type ?? params.relationType);
    // 历史页约定明细形如“对方编号：关系类型”，老行只有编号也能回读（缺省常用搭配）。
    handle.db.prepare('INSERT INTO item_events (item_id, event, detail) VALUES (?,?,?)').run(id, 'relate', String(related) + ':' + relation);
    const main = snapshotOf(handle, id);
    let peerName = '—';
    try { peerName = getItemById(handle, related).name; } catch { peerName = '—'; }
    if (params.action === 'unlink') return { ...buildReceipt(m('skill-home.items-update.c016', { p0: String(id), p1: String(related) })), detail: { main, peer: { id: related, name: peerName }, relation } };
    return { ...buildReceipt(m('skill-home.items-update.c017', { p0: String(id), p1: String(related) })), detail: { main, peer: { id: related, name: peerName }, relation } };
  }
  if (op === 'photo') {
    if (typeof params.photo !== 'string' || !params.photo) fail(2, m('skill-home.items-update.c018'));
    updateItem(handle, id, { photo: params.photo as string });
    const snapshot = snapshotOf(handle, id);
    return { ...buildReceipt(m('skill-home.items-update.c019', { p0: String(id) })), detail: { snapshot } };
  }
  // generic
  const patch: Record<string, unknown> = {};
  if (params.name !== undefined) {
    if (typeof params.name !== 'string' || !params.name.trim()) fail(2, m('skill-home.items-update.c020'));
    patch.name = (params.name as string).trim();
  }
  const cid = params.category_id ?? params.categoryId;
  if (cid !== undefined) {
    const c = getCategoryById(handle, Number(cid));
    patch.category_id = c.id; patch.category = c.name;
  }
  if (params.owner !== undefined) patch.owner = String(params.owner);
  if (params.price !== undefined || params.purchase_price !== undefined) {
    const m = checkMoney(params.price ?? params.purchase_price, 'price');
    patch.purchase_price = m;
  }
  if (params.remark !== undefined) patch.remark = String(params.remark);
  if (params.photo !== undefined) patch.photo = String(params.photo);
  if (params.fixed_location !== undefined || params.fixedLocation !== undefined) {
    patch.fixed_location = normalizeLocation(params.fixed_location ?? params.fixedLocation);
  }
  if (!Object.keys(patch).length && params.location === undefined && params.tags === undefined) fail(2, m('skill-home.items-update.c021'));
  if (Object.keys(patch).length) updateItem(handle, id, patch);
  if (params.location !== undefined && (params.purchase_date !== undefined || params.expiration_date !== undefined || params.location_status !== undefined)) {
    const locs = listLocationsByItem(handle, id);
    const hit = locs.find((l) => l.location === String(params.location));
    if (!hit) fail(4, m('skill-home.items-update.c022', { p0: String(params.location) }));
  }
  if (params.tags !== undefined && typeof params.tags === 'string') setItemTags(handle, id, (params.tags as string).split(','));
  const snapshot = snapshotOf(handle, id);
  void totalOf(snapshot.locations);
  return { ...buildReceipt(m('skill-home.items-update.c023', { p0: String(id) })), detail: { snapshot } };
}
