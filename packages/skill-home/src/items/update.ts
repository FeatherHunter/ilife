// 物品能力·改物品（`home.item.update` 的处理函数，#800 从 cmd_read 逐字搬迁）。
//
// 入参：id（必填）＋ op=generic|move|qty|status|tags|merge|undo|relate|photo；
// 出参 receipt 形，行为与搬迁前一致。

import type { HomeDb } from '../fetch/db.js';
import { HomeFetchError } from '../fetch/index.js';
import {
  getCategoryById, listLocationsByItem, setItemTags, adjustQuantity,
  setLocationStatus, moveLocation, updateItem,
} from '../fetch/index.js';
import { normalizeLocation, normalizeStatus, parseUpdateOp, needId } from '../policy/index.js';
import { checkMoney } from '../policy/index.js';
import { fail } from '../shared/fail.js';
import { asInt } from '../shared/params.js';
import { buildReceipt } from '../render/index.js';

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
    adjustQuantity(handle, id, { plus, minus, set, location: params.location as string | undefined });
    return buildReceipt('已变更数量：' + id);
  }
  if (op === 'status') {
    const st = normalizeStatus(params.location_status ?? params.status);
    setLocationStatus(handle, id, st, params.location as string | undefined);
    return buildReceipt('已变更状态：' + id + '→' + st);
  }
  if (op === 'move') {
    const to = params.new_location ?? params.newLocation;
    if (typeof to !== 'string' || !to) fail(2, '移物品须给 new_location');
    moveLocation(handle, id, params.location as string | undefined, normalizeLocation(to));
    return buildReceipt('已移动：' + id + '→' + normalizeLocation(to));
  }
  if (op === 'tags') {
    if (typeof params.tags !== 'string') fail(2, '标物品须给 tags 逗号分隔');
    setItemTags(handle, id, (params.tags as string).split(','));
    return buildReceipt('已更新标签：' + id);
  }
  if (op === 'merge') {
    const target = asInt(params.target, 'target');
    if (target === undefined) fail(2, '合并须给 target');
    const sources = String(params.sources ?? '').split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0);
    if (!sources.length) fail(2, '合并须给 sources 逗号 id 列表');
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
    return buildReceipt('已合并到 ' + target + '：+' + moved + ' 件');
  }
  if (op === 'undo') {
    const ev = handle.db.prepare('SELECT id, item_id, event FROM item_events ORDER BY id DESC LIMIT 1').get() as { id: number; item_id: number; event: string } | undefined;
    if (!ev) throw new HomeFetchError('HOME_EMPTY_RANGE', '无可撤销操作');
    return buildReceipt('最近操作：#' + ev.id + ' ' + ev.event + '（一次性回滚须人工确认，本调用仅登记意图）');
  }
  if (op === 'relate') {
    const related = asInt(params.related, 'related');
    if (related === undefined) fail(2, '关联须给 related');
    handle.db.prepare('INSERT INTO item_events (item_id, event, detail) VALUES (?,?,?)').run(id, 'relate', String(related));
    if (params.action === 'unlink') return buildReceipt('已解除关联：' + id + '×' + related);
    return buildReceipt('已关联：' + id + '×' + related);
  }
  if (op === 'photo') {
    if (typeof params.photo !== 'string' || !params.photo) fail(2, '管照片须给 photo');
    updateItem(handle, id, { photo: params.photo as string });
    return buildReceipt('已更新照片：' + id);
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
  return buildReceipt('已更新：' + id);
}
