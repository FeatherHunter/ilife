// 空间能力·位置查询与位置管理（`home.location.query`／`home.location.write` 的处理函数，
// #800 从 cmd_read 逐字搬迁）。出参 list／receipt 形，行为与搬迁前一致。

import type { HomeDb } from '../fetch/db.js';
import {
  getCategoryById, searchItems, listLocationNodes, ensureLocationNode, updateItem,
} from '../fetch/index.js';
import { normalizeLocation, needId } from '../policy/index.js';
import { fail } from '../shared/fail.js';
import { buildLocationList, buildReceipt } from '../render/index.js';

export function runLocationQuery(params: Record<string, unknown>, handle: HomeDb): unknown {
  const mode = (params.mode as string | undefined) ?? 'manage';
  if (mode === 'space') {
    const nodes = listLocationNodes(handle);
    return buildLocationList(nodes.length ? nodes : ['(空：先录物品落位置)']);
  }
  if (mode === 'suggest') {
    const cid = params.category_id ?? params.categoryId;
    if (cid === undefined) fail(2, '推位置须给 category_id');
    getCategoryById(handle, Number(cid));
    const rows = handle.db.prepare(
      'SELECT l.location, count(*) AS c FROM item_locations l JOIN items i ON i.id=l.item_id WHERE i.category_id=? GROUP BY l.location ORDER BY c DESC LIMIT ?',
    ).all(Number(cid), Number(params.limit ?? 10)) as { location: string; c: number }[];
    return buildLocationList(rows.map((r) => r.location + ' [' + r.c + '件同类]'));
  }
  if (mode === 'find') {
    const ref = params.reference as string | undefined;
    if (!ref) fail(2, '找位置须给 reference');
    const hits = searchItems(handle, { name: ref, limit: 5 });
    return buildLocationList(hits.map((h) => h.item.name + ' #' + h.item.id + ' ' + h.locations.map((l) => l.location).join('；')));
  }
  // manage/storage：位置总览
  const nodes = listLocationNodes(handle);
  if (!nodes.length) {
    const locs = handle.db.prepare('SELECT DISTINCT location FROM item_locations ORDER BY location LIMIT 50').all() as { location: string }[];
    return buildLocationList(locs.map((r) => r.location));
  }
  return buildLocationList(nodes);
}

export function runLocationWrite(params: Record<string, unknown>, handle: HomeDb): unknown {
  const op = (params.op as string | undefined) ?? 'manage';
  if (op === 'fixed') {
    const id = needId(params);
    const loc = params.fixed_location ?? params.fixedLocation ?? params.location;
    if (typeof loc !== 'string' || !loc) fail(2, '固定位须给 fixed_location');
    updateItem(handle, id, { fixed_location: normalizeLocation(loc) });
    return buildReceipt('已设固定位：' + id + '→' + normalizeLocation(loc));
  }
  const action = (params.action as string | undefined) ?? 'add';
  if (action === 'add') {
    const path = params.path as string | undefined;
    if (!path) fail(2, '位置新增须给 path');
    ensureLocationNode(handle, normalizeLocation(path));
    return buildReceipt('已新增位置：' + normalizeLocation(path));
  }
  if (action === 'rename') {
    const from = params.from as string | undefined, to = params.to as string | undefined;
    if (!from || !to) fail(2, '位置改名须给 from/to');
    const nf = normalizeLocation(from), nt = normalizeLocation(to);
    handle.db.prepare('UPDATE item_locations SET location=? WHERE location=?').run(nt, nf);
    handle.db.prepare('UPDATE location_nodes SET path=? WHERE path=?').run(nt, nf);
    return buildReceipt('已改名位置：' + nf + '→' + nt);
  }
  if (action === 'merge') {
    const from = params.from as string | undefined, to = params.to as string | undefined;
    if (!from || !to) fail(2, '位置合并须给 from/to');
    const nf = normalizeLocation(from), nt = normalizeLocation(to);
    handle.db.prepare('UPDATE item_locations SET location=? WHERE location=?').run(nt, nf);
    handle.db.prepare('DELETE FROM location_nodes WHERE path=?').run(nf);
    ensureLocationNode(handle, nt);
    return buildReceipt('已合并位置：' + nf + '→' + nt);
  }
  return buildReceipt('位置管理：' + listLocationNodes(handle).length + ' 节点（详情走 home.location.query）');
}
