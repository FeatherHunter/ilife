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
    if (plus !== undefined && (!Number.isInteger(plus) || plus <= 0)) fail(2, 'plus 须为正整数');
    if (minus !== undefined && (!Number.isInteger(minus) || minus <= 0)) fail(2, 'minus 须为正整数');
    if (set !== undefined && (!Number.isInteger(set) || set < 0)) fail(2, 'set 须为非负整数');
    const beforeLocs = listLocationsByItem(handle, id);
    const beforeQty = beforeLocs.reduce((a, l) => a + l.quantity, 0);
    const afterLocs = adjustQuantity(handle, id, { plus, minus, set, location: params.location as string | undefined });
    const afterQty = afterLocs.reduce((a, l) => a + l.quantity, 0);
    const snapshot = snapshotOf(handle, id);
    return { ...buildReceipt('已变更数量：' + id), detail: { snapshot, change: { before_quantity: beforeQty, after_quantity: afterQty } } };
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
    return { ...buildReceipt('已变更状态：' + id + '→' + st), detail: { snapshot, change: { before_status: beforeSt, after_status: afterHit?.location_status ?? st } } };
  }
  if (op === 'move') {
    const to = params.new_location ?? params.newLocation;
    if (typeof to !== 'string' || !to) fail(2, '移物品须给 new_location');
    const from = params.location as string | undefined;
    const beforeLocs = listLocationsByItem(handle, id);
    const beforeHit = from !== undefined ? beforeLocs.find((l) => l.location === from) : beforeLocs[0];
    const beforeLoc = beforeHit?.location ?? from ?? '';
    const afterLoc = normalizeLocation(to);
    moveLocation(handle, id, from, afterLoc);
    const snapshot = snapshotOf(handle, id);
    return { ...buildReceipt('已移动：' + id + '→' + afterLoc), detail: { snapshot, change: { before_location: beforeLoc, after_location: afterLoc } } };
  }
  if (op === 'tags') {
    if (typeof params.tags !== 'string') fail(2, '标物品须给 tags 逗号分隔');
    const before = listTagsByItem(handle, id);
    const after = setItemTags(handle, id, (params.tags as string).split(','));
    const removed = before.filter((t) => !after.includes(t));
    const added = after.filter((t) => !before.includes(t));
    const snapshot = snapshotOf(handle, id);
    return { ...buildReceipt('已更新标签：' + id), detail: { snapshot, change: { removed, added } } };
  }
  if (op === 'merge') {
    const target = asInt(params.target, 'target');
    if (target === undefined) fail(2, '合并须给 target');
    const sources = String(params.sources ?? '').split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0);
    if (!sources.length) fail(2, '合并须给 sources 逗号 id 列表');
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
    return { ...buildReceipt('已合并到 ' + target + '：+' + moved + ' 件'), detail: { snapshot, sources: sourceRows, moved } };
  }
  if (op === 'undo') {
    const ev = handle.db.prepare('SELECT id, item_id, event FROM item_events ORDER BY id DESC LIMIT 1').get() as { id: number; item_id: number; event: string } | undefined;
    if (!ev) throw new HomeFetchError('HOME_EMPTY_RANGE', '无可撤销操作');
    return buildReceipt('最近操作：#' + ev.id + ' ' + ev.event + '（一次性回滚须人工确认，本调用仅登记意图）');
  }
  if (op === 'relate') {
    const related = asInt(params.related, 'related');
    if (related === undefined) fail(2, '关联须给 related');
    const relation = normalizeRelationType(params.relation ?? params.relation_type ?? params.relationType);
    // 历史页约定明细形如“对方编号：关系类型”，老行只有编号也能回读（缺省常用搭配）。
    handle.db.prepare('INSERT INTO item_events (item_id, event, detail) VALUES (?,?,?)').run(id, 'relate', String(related) + ':' + relation);
    const main = snapshotOf(handle, id);
    let peerName = '—';
    try { peerName = getItemById(handle, related).name; } catch { peerName = '—'; }
    if (params.action === 'unlink') return { ...buildReceipt('已解除关联：' + id + '×' + related), detail: { main, peer: { id: related, name: peerName }, relation } };
    return { ...buildReceipt('已关联：' + id + '×' + related), detail: { main, peer: { id: related, name: peerName }, relation } };
  }
  if (op === 'photo') {
    if (typeof params.photo !== 'string' || !params.photo) fail(2, '管照片须给 photo');
    updateItem(handle, id, { photo: params.photo as string });
    const snapshot = snapshotOf(handle, id);
    return { ...buildReceipt('已更新照片：' + id), detail: { snapshot } };
  }
  // generic
  const patch: Record<string, unknown> = {};
  if (params.name !== undefined) {
    if (typeof params.name !== 'string' || !params.name.trim()) fail(2, 'name 须非空');
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
  if (!Object.keys(patch).length && params.location === undefined && params.tags === undefined) fail(2, '改物品须给至少一个可改字段');
  if (Object.keys(patch).length) updateItem(handle, id, patch);
  if (params.location !== undefined && (params.purchase_date !== undefined || params.expiration_date !== undefined || params.location_status !== undefined)) {
    const locs = listLocationsByItem(handle, id);
    const hit = locs.find((l) => l.location === String(params.location));
    if (!hit) fail(4, '指定位置无记录：' + String(params.location));
  }
  if (params.tags !== undefined && typeof params.tags === 'string') setItemTags(handle, id, (params.tags as string).split(','));
  const snapshot = snapshotOf(handle, id);
  void totalOf(snapshot.locations);
  return { ...buildReceipt('已更新：' + id), detail: { snapshot } };
}
