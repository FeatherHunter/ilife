// 空间能力·位置查询与位置管理（`home.location.query`／`home.location.write` 的处理函数，
// #800 从 cmd_read 逐字搬迁；#809 同形状富数据：list 项可带结构化字段，receipt 可带 detail。
// 命令、出参形状、失败口径一字不动（`commands.ts`／`routes.ts` 权威源不碰）；
// 页装配（`pages/<族>.ts`）只读本件给出的数据，不再查库。
import type { HomeDb } from '../fetch/db.js';
import {
  getCategoryById, getItemById, searchItems, listLocationNodes, ensureLocationNode, updateItem,
} from '../fetch/index.js';
import { normalizeLocation, needId } from '../policy/index.js';
import { fail } from '../shared/fail.js';
import { buildLocationList, buildReceipt } from '../render/index.js';

// ---- 富数据类型（每型字段不超八个；只经 envelope 流动，不另开接口） ----

/** 位置树节点（location_manage 查询面／写入回执共用）。 */
export interface LocNode {
  kind: 'location_node'; path: string; name: string; depth: number; count: number; empty: boolean;
}
/** 相似位置组（flattened 等价：同位置两种写法，建议合并）。 */
export interface SimilarGroup {
  kind: 'similar_group'; paths: string[]; target: string; affected: number;
}
/** 固定位条目。 */
export interface FixedEntry {
  id: number; name: string; fixed: string; currents: FixedCur[]; warn: boolean;
}
export interface FixedCur { location: string; quantity: number; status: string; }
/** 单件收纳建议（suggest_storage 一行一件：推荐／保持／暂无依据三态之一有值）。 */
export interface Recommendation {
  kind: 'recommendation'; mode: string;
  item: { id: number; name: string; category: string; current: string; fixed: string };
  recommend: { location: string; reason: string } | null;
  keep: { location: string; reason: string } | null;
  alternates: { location: string; reason: string }[];
}
/** 空间视图一层（space_view 一页一层：面包屑＋子层＋本层物品）。 */
export interface SpaceView {
  kind: 'space_view'; path: string; name: string;
  crumbs: { name: string; path: string }[];
  children: { name: string; path: string; count: number; kids: boolean; empty: boolean }[];
  items: { id: number; name: string; qty: number; status: string }[];
  hints: string[]; total: number;
}

interface ActiveLoc {
  location: string; item_id: number; quantity: number; status: string;
  name: string; category_id: number | null; fixed: string | null;
}

// ---- 内部读取（读侧宽容：脏数据不抛，跳过即是） ----

function rows(handle: HomeDb, sql: string, ...args: (string | number | null)[]): Record<string, unknown>[] {
  return handle.db.prepare(sql).all(...args) as unknown as Record<string, unknown>[];
}

/** 宽容规范化（读侧用：不抛，非法返回空串；写侧仍走 `normalizeLocation` 严格版）。 */
function softNorm(v: unknown): string {
  if (typeof v !== 'string') return '';
  return v.replace(/／/g, '/').split('/').map((s) => s.trim()).filter(Boolean).join('/');
}

function activeLocs(handle: HomeDb): ActiveLoc[] {
  return rows(handle,
    `SELECT il.location AS location, il.item_id AS item_id, il.quantity AS quantity,
      il.location_status AS status, i.name AS name, i.category_id AS category_id,
      i.fixed_location AS fixed FROM item_locations il JOIN items i ON i.id=il.item_id
      WHERE il.location IS NOT NULL AND il.location <> ''
      AND il.location_status NOT IN ('已废弃','已用完') ORDER BY il.location, i.id`)
    .map((r) => ({
      location: softNorm(r.location), item_id: Number(r.item_id), quantity: Number(r.quantity) || 0,
      status: String(r.status ?? '在家'), name: String(r.name ?? ''),
      category_id: r.category_id === null ? null : Number(r.category_id),
      fixed: r.fixed === null ? null : String(r.fixed),
    })).filter((r) => r.location !== '');
}

/** 全部有效路径→件数（条目位置 ∪ 节点位置，规范化去重排序）。 */
function pathQty(handle: HomeDb): [string, number][] {
  const seen = new Map<string, number>();
  for (const r of activeLocs(handle)) seen.set(r.location, (seen.get(r.location) ?? 0) + r.quantity);
  for (const p of listLocationNodes(handle)) {
    const n = softNorm(p);
    if (n !== '' && !seen.has(n)) seen.set(n, 0);
  }
  return [...seen.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
}

function subCount(locs: ActiveLoc[], path: string): number {
  let n = 0;
  for (const r of locs) if (r.location === path || r.location.startsWith(path + '/')) n += r.quantity;
  return n;
}

/** 位置树节点（前序：路径排序即前序，子树计数逐节点）。 */
function locNodes(handle: HomeDb): LocNode[] {
  const locs = activeLocs(handle);
  return pathQty(handle).map(([p, q]) => {
    const segs = p.split('/');
    return {
      kind: 'location_node' as const, path: p, name: segs[segs.length - 1],
      depth: segs.length, count: subCount(locs, p), empty: q === 0,
    };
  });
}

/** 相似位置检测（段拼接等价分组；建议保留＝段数最少 otherwise 字典序）。 */
function similarGroups(handle: HomeDb): SimilarGroup[] {
  const locs = activeLocs(handle);
  const groups = new Map<string, string[]>();
  for (const [p] of pathQty(handle)) {
    const flat = p.replace(/\//g, '');
    if (!groups.has(flat)) groups.set(flat, []);
    groups.get(flat)?.push(p);
  }
  const out: SimilarGroup[] = [];
  for (const paths of groups.values()) {
    if (paths.length < 2) continue;
    const target = [...paths].sort((a, b) => a.split('/').length - b.split('/').length || (a < b ? -1 : 1))[0];
    const hit = new Set<number>();
    for (const p of paths) {
      if (p === target) continue;
      for (const r of locs) if (r.location === p || r.location.startsWith(p + '/')) hit.add(r.item_id);
    }
    out.push({ kind: 'similar_group' as const, paths: [...paths].sort(), target, affected: hit.size });
  }
  return out;
}

/** 固定位清单（固定位＋当前位置对照，不在固定位即 warn）。 */
function fixedEntries(handle: HomeDb): FixedEntry[] {
  const locs = activeLocs(handle);
  return rows(handle,
    `SELECT id, name, fixed_location FROM items
     WHERE fixed_location IS NOT NULL AND fixed_location <> '' ORDER BY name`)
    .map((r) => {
      const fixed = softNorm(r.fixed_location);
      const currents = locs.filter((l) => l.item_id === Number(r.id))
        .map((l) => ({ location: l.location, quantity: l.quantity, status: l.status }));
      const at = currents.some((c) => softNorm(c.location) === fixed);
      return {
        id: Number(r.id), name: String(r.name ?? ''), fixed,
        currents, warn: !at,
      };
    });
}

/** 同类位置分布（排除自身；活跃口径与树一致）。 */
function categoryHits(handle: HomeDb, cid: number, exclude: number): { loc: string; n: number; ex: string[] }[] {
  const byLoc = new Map<string, { ids: Set<number>; names: string[] }>();
  for (const r of activeLocs(handle)) {
    if (r.category_id !== cid || r.item_id === exclude) continue;
    if (!byLoc.has(r.location)) byLoc.set(r.location, { ids: new Set(), names: [] });
    const e = byLoc.get(r.location);
    if (e && !e.ids.has(r.item_id)) {
      e.ids.add(r.item_id);
      if (e.names.length < 2) e.names.push(r.name);
    }
  }
  return [...byLoc.entries()].map(([loc, e]) => ({ loc, n: e.ids.size, ex: e.names }))
    .sort((a, b) => b.n - a.n).slice(0, 10);
}

/** 单件收纳建议（分类常用位置证据；关联／种子在新仓无表，不伪造：弱证据走保持现状／暂无依据）。 */
function recommendFor(handle: HomeDb, itemId: number, mode: string): Recommendation | null {
  let item: { id: number; name: string; category_id: number | null; fixed_location: string | null };
  try {
    item = getItemById(handle, itemId) as unknown as typeof item;
  } catch { return null; }
  const locs = activeLocs(handle).filter((l) => l.item_id === itemId);
  const current = locs.length > 0 ? locs[0].location : '';
  let catName = '未分类';
  if (item.category_id !== null) {
    try { catName = String((getCategoryById(handle, item.category_id) as { name: string }).name); }
    catch { catName = '未分类'; }
  }
  const ranked = item.category_id === null ? [] : categoryHits(handle, item.category_id, itemId)
    .filter((h) => h.loc !== current)
    .map((h) => ({
      location: h.loc,
      // 理由逐件唯一（同证据＋件名后缀）：机审重复句按整行判等，证据相同也须逐件区分。
      reason: '分类「' + catName + '」常用位置，' + h.n + '件同类在此（如' + h.ex.join('、') + '），与「' + item.name + '」同类',
      score: h.n,
    }));
  const strong = ranked.filter((r) => r.score >= 2).sort((a, b) => b.score - a.score);
  let recommend: Recommendation['recommend'] = null;
  let keep: Recommendation['keep'] = null;
  let alternates: Recommendation['alternates'] = [];
  if (strong.length > 0) {
    recommend = { location: strong[0].location, reason: strong[0].reason };
    alternates = [...strong.slice(1), ...ranked.filter((r) => r.score < 2)]
      .slice(0, 3).map((r) => ({ location: r.location, reason: r.reason }));
  } else if (current !== '') {
    keep = {
      location: current,
      reason: ranked.length > 0 && ranked.some((r) => r.score >= 1)
        ? '「' + item.name + '」已在常用位置「' + current + '」：分类「' + catName + '」的物品也分布在此，无需移动'
        : '「' + item.name + '」暂无强依据，保持现状（同分类没有更集中的位置）',
    };
    alternates = ranked.slice(0, 3).map((r) => ({ location: r.location, reason: r.reason }));
  } else {
    alternates = ranked.slice(0, 3).map((r) => ({ location: r.location, reason: r.reason }));
  }
  return {
    kind: 'recommendation', mode,
    item: {
      id: item.id, name: item.name, category: catName, current,
      fixed: item.fixed_location === null ? '' : softNorm(item.fixed_location),
    },
    recommend, keep, alternates,
  };
}

/** 空间视图一层（顶层 path=''；未知路径按空层 render，不抛）。 */
function spaceLayer(handle: HomeDb, rawPath: unknown): SpaceView {
  const locs = activeLocs(handle);
  const paths = pathQty(handle);
  const cur = typeof rawPath === 'string' && rawPath.trim() !== '' ? softNorm(rawPath) : '';
  const prefix = cur === '' ? '' : cur + '/';
  const depth = cur === '' ? 0 : cur.split('/').length;
  const kids = new Map<string, { name: string; path: string; kids: boolean }>();
  for (const [p] of paths) {
    if (!p.startsWith(prefix)) continue;
    const rest = p.slice(prefix.length).split('/');
    if (rest[0] === '' || rest[0] === undefined) continue;
    const cp = (cur === '' ? '' : cur + '/') + rest[0];
    const e = kids.get(rest[0]) ?? { name: rest[0], path: cp, kids: false };
    if (rest.length > 1) e.kids = true;
    kids.set(rest[0], e);
  }
  const children = [...kids.values()].map((c) => ({
    ...c, count: subCount(locs, c.path), empty: subCount(locs, c.path) === 0,
  })).sort((a, b) => b.count - a.count || (a.name < b.name ? -1 : 1));
  const items = locs
    .filter((r) => cur === '' ? !r.location.includes('/') : r.location === cur)
    .map((r) => ({ id: r.item_id, name: r.name, qty: r.quantity, status: r.status }));
  const childPaths = new Set(children.map((c) => c.path));
  const hints = paths.filter(([p, q]) => q === 0 && p.startsWith(prefix) && !childPaths.has(p)).map(([p]) => p);
  const crumbs: SpaceView['crumbs'] = [];
  if (cur !== '') {
    const segs = cur.split('/');
    let acc = '';
    for (const s of segs) {
      acc = acc === '' ? s : acc + '/' + s;
      crumbs.push({ name: s, path: acc });
    }
  }
  return {
    kind: 'space_view', path: cur, name: cur === '' ? '(全屋)' : cur.split('/').pop() ?? cur,
    crumbs, children, items, hints, total: paths.length,
  };
}

export function runLocationQuery(params: Record<string, unknown>, handle: HomeDb): unknown {
  const mode = (params.mode as string | undefined) ?? 'manage';
  if (mode === 'space') {
    const view = spaceLayer(handle, params.path);
    return { items: [view], total: 1 };
  }
  if (mode === 'suggest') {
    const batch = params.batch === true;
    let ids: number[];
    if (batch) {
      ids = rows(handle,
        `SELECT id FROM items WHERE (fixed_location IS NULL OR fixed_location='')
         AND (last_accessed_at IS NOT NULL OR access_count > 0)
         ORDER BY COALESCE(last_accessed_at,'') DESC, access_count DESC LIMIT 10`)
        .map((r) => Number(r.id));
    } else {
      const cid = params.category_id ?? params.categoryId;
      if (cid === undefined) fail(2, '推位置须给 category_id');
      getCategoryById(handle, Number(cid));
      ids = rows(handle, 'SELECT id FROM items WHERE category_id=? ORDER BY id LIMIT 10', Number(cid))
        .map((r) => Number(r.id));
    }
    const recs = ids
      .map((id) => recommendFor(handle, id, batch ? 'batch' : 'single'))
      .filter((r) => r !== null);
    return { items: recs, total: recs.length };
  }
  if (mode === 'find') {
    const ref = params.reference as string | undefined;
    if (!ref) fail(2, '找位置须给 reference');
    const hits = searchItems(handle, { name: ref, limit: 5 });
    return buildLocationList(hits.map((h) => h.item.name + ' #' + h.item.id + ' ' + h.locations.map((l) => l.location).join('；')));
  }
  // manage/storage：位置总览（节点＋相似组；页按 kind 分区 render）。
  const nodes = locNodes(handle);
  const sims = similarGroups(handle);
  return { items: [...nodes, ...sims], total: nodes.length };
}

export function runLocationWrite(params: Record<string, unknown>, handle: HomeDb): unknown {
  const op = (params.op as string | undefined) ?? 'manage';
  if (op === 'fixed') {
    const id = needId(params);
    const loc = params.fixed_location ?? params.fixedLocation ?? params.location;
    if (typeof loc !== 'string' || !loc) fail(2, '固定位须给 fixed_location');
    updateItem(handle, id, { fixed_location: normalizeLocation(loc) });
    const msg = '已设固定位：' + id + '→' + normalizeLocation(loc);
    const entries = fixedEntries(handle);
    return { ...buildReceipt(msg), detail: { fixed_items: entries, total: entries.length } };
  }
  const action = (params.action as string | undefined) ?? 'add';
  if (action === 'add') {
    const path = params.path as string | undefined;
    if (!path) fail(2, '位置新增须给 path');
    ensureLocationNode(handle, normalizeLocation(path));
    const msg = '已新增位置：' + normalizeLocation(path);
    const nodes = locNodes(handle);
    return { ...buildReceipt(msg), detail: { nodes, similar_groups: similarGroups(handle), total_nodes: nodes.length, action: 'add', subject: normalizeLocation(path) } };
  }
  if (action === 'rename') {
    const from = params.from as string | undefined, to = params.to as string | undefined;
    if (!from || !to) fail(2, '位置改名须给 from/to');
    const nf = normalizeLocation(from), nt = normalizeLocation(to);
    handle.db.prepare('UPDATE item_locations SET location=? WHERE location=?').run(nt, nf);
    handle.db.prepare('UPDATE location_nodes SET path=? WHERE path=?').run(nt, nf);
    const msg = '已改名位置：' + nf + '→' + nt;
    const nodes = locNodes(handle);
    return { ...buildReceipt(msg), detail: { nodes, similar_groups: similarGroups(handle), total_nodes: nodes.length, action: 'rename', subject: nf + '→' + nt } };
  }
  if (action === 'merge') {
    const from = params.from as string | undefined, to = params.to as string | undefined;
    if (!from || !to) fail(2, '位置合并须给 from/to');
    const nf = normalizeLocation(from), nt = normalizeLocation(to);
    handle.db.prepare('UPDATE item_locations SET location=? WHERE location=?').run(nt, nf);
    handle.db.prepare('DELETE FROM location_nodes WHERE path=?').run(nf);
    ensureLocationNode(handle, nt);
    const msg = '已合并位置：' + nf + '→' + nt;
    const nodes = locNodes(handle);
    return { ...buildReceipt(msg), detail: { nodes, similar_groups: similarGroups(handle), total_nodes: nodes.length, action: 'merge', subject: nf + '→' + nt } };
  }
  const nodes = locNodes(handle);
  return {
    ...buildReceipt('位置管理：' + listLocationNodes(handle).length + ' 节点（详情走 home.location.query）'),
    detail: { nodes, similar_groups: similarGroups(handle), total_nodes: nodes.length, action: 'view', subject: '' },
  };
}
