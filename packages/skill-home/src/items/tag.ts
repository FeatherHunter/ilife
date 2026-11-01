// 物品能力·标签与分类（`home.tag.query`／`home.tag.write` 的处理函数，
// #800 从 cmd_read 逐字搬迁，#864 加厚回执）。出参 list／receipt 形，
// 消息一句话不变（前缀分流兼容），多带 detail 结构载荷。

import type { HomeDb } from '../fetch/db.js';
import { getItemById, listAllTags, mergeTags, listCategories } from '../fetch/index.js';
import { fail } from '../shared/fail.js';
import { asInt, asLimit, asQueryString } from '../shared/params.js';
import { buildTagList, buildReceipt } from '../render/index.js';
import { m } from '../entries/index.js';

// #928 收口：**不给 limit 即全量**（页面不再按体积截断；用户裁定「不限制 html 文件大小」）。
// 给了 limit 才截，超界大声失败。只住本能力，位置取行另住 space。
const TAG_QUERY_LIMIT_MAX = 100000;

export function runTagQuery(params: Record<string, unknown>, handle: HomeDb): unknown {
  const kind = (params.kind as string | undefined) ?? 'tags';
  const limit = asLimit(params.limit, 'limit', 1, TAG_QUERY_LIMIT_MAX);
  const q = asQueryString(params.q, 'q');
  if (kind === 'categories' || kind === 'category') {
    const cats = listCategories(handle);
    const filtered = q === undefined
      ? cats
      : cats.filter((c) => c.name.includes(q) || c.name.toLowerCase().includes(q.toLowerCase()));
    const sliced = limit === undefined ? filtered : filtered.slice(0, limit);
    return buildTagList([], sliced, filtered.length);
  }
  const all = listAllTags(handle);
  const filtered = q === undefined
    ? all
    : all.filter((t) => t.tag.includes(q) || t.tag.toLowerCase().includes(q.toLowerCase()));
  const sliced = limit === undefined ? filtered : filtered.slice(0, limit);
  return buildTagList(sliced, undefined, filtered.length);
}

export interface TagStat {
  name: string;
  items: number;
  uses: number;
}

export function tagStatsOf(handle: HomeDb): { tags: TagStat[]; unused: TagStat[] } {
  const rows = listAllTags(handle);
  const tags: TagStat[] = rows.map((r) => {
    let uses = 0;
    try {
      const idRows = handle.db.prepare('SELECT item_id FROM item_tags WHERE tag=?').all(r.tag) as { item_id: number }[];
      for (const idRow of idRows) {
        try {
          const item = getItemById(handle, idRow.item_id);
          uses += item.access_count ?? 0;
        } catch { /* 单条读失败不阻断总览 */ }
      }
    } catch { uses = 0; }
    return { name: r.tag, items: r.count, uses };
  });
  // 未使用＝从未被访问命中的标签（access_count 之和为零）；库里无孤儿标签时为空数组，如实返回。
  const unused = tags.filter((t) => t.uses === 0);
  return { tags, unused };
}

export function similarityOf(a: string, b: string): number {
  if (a === b) return 100;
  let score = 80;
  if (a.length === b.length) score += 10;
  else if (Math.abs(a.length - b.length) <= 1) score += 5;
  if (a.includes(b) || b.includes(a)) score += 5;
  return Math.min(score, 95);
}

export interface CategoryNode {
  id: number;
  parent_id: number | null;
  name: string;
  items: number;
  quantity: number;
}

export function categoryTreeOf(handle: HomeDb): { tree: CategoryNode[]; total: number } {
  const cats = listCategories(handle);
  const countMap = new Map<number, number>();
  const qtyMap = new Map<number, number>();
  try {
    const countRows = handle.db.prepare('SELECT category_id AS cid, COUNT(*) AS c FROM items WHERE category_id IS NOT NULL GROUP BY category_id').all() as { cid: number; c: number }[];
    for (const r of countRows) countMap.set(r.cid, r.c);
  } catch { /* 计数失败即零 */ }
  try {
    const qtyRows = handle.db.prepare('SELECT i.category_id AS cid, COALESCE(SUM(l.quantity),0) AS q FROM items i LEFT JOIN item_locations l ON l.item_id=i.id WHERE i.category_id IS NOT NULL GROUP BY i.category_id').all() as { cid: number; q: number }[];
    for (const r of qtyRows) qtyMap.set(r.cid, r.q);
  } catch { /* 计数失败即零 */ }
  const tree: CategoryNode[] = cats.map((c) => ({
    id: c.id, parent_id: c.parent_id, name: c.name,
    items: countMap.get(c.id) ?? 0, quantity: qtyMap.get(c.id) ?? 0,
  }));
  return { tree, total: cats.length };
}

export function runTagWrite(params: Record<string, unknown>, handle: HomeDb): unknown {
  const op = (params.op as string | undefined) ?? 'merge';
  if (op === 'merge') {
    const from = params.from as string | undefined, to = params.to as string | undefined;
    if (!from || !to) fail(2, m('skill-home.items-tag.c001'));
    const n = mergeTags(handle, from as string, to as string);
    return { ...buildReceipt(m('skill-home.items-tag.c002', { p0: String(from), p1: String(to), p2: String(n) })), detail: { from, to, moved: n } };
  }
  if (op === 'overview') {
    const stats = tagStatsOf(handle);
    return { ...buildReceipt(m('skill-home.items-tag.c003', { p0: String(stats.tags.length) })), detail: { tags: stats.tags, unused: stats.unused, total: stats.tags.length } };
  }
  if (op === 'tidy') {
    const tags = listAllTags(handle).map((t) => t.tag);
    const sims: string[] = [];
    const pairs: { a: string; b: string; similarity: number }[] = [];
    for (let i = 0; i < tags.length; i++) for (let j = i + 1; j < tags.length; j++) {
      if (tags[i][0] === tags[j][0] && Math.abs(tags[i].length - tags[j].length) <= 1) {
        sims.push(tags[i] + '~' + tags[j]);
        pairs.push({ a: tags[i], b: tags[j], similarity: similarityOf(tags[i], tags[j]) });
      }
    }
    if (!sims.length) return { ...buildReceipt(m('skill-home.items-tag.c004')), detail: { pairs: [], total: 0 } };
    return { ...buildReceipt(m('skill-home.items-tag.c005', { p0: String(sims.slice(0, 10).join('、')) })), detail: { pairs: pairs.slice(0, 10), total: pairs.length } };
  }
  if (op === 'category') {
    const action = (params.action as string | undefined) ?? 'tree';
    if (action === 'add') {
      const name = String(params.name ?? '');
      if (!name.trim()) fail(2, m('skill-home.items-tag.c006'));
      const parent = params.parent_id !== undefined ? Number(params.parent_id) : null;
      handle.db.prepare('INSERT INTO categories (parent_id, name) VALUES (?,?)').run(parent, name.trim());
      return buildReceipt(m('skill-home.items-tag.c007', { p0: String(name.trim()) }));
    }
    if (action === 'rename') {
      const id = asInt(params.category_id ?? params.id, 'category_id');
      if (id === undefined || !params.name) fail(2, m('skill-home.items-tag.c008'));
      handle.db.prepare('UPDATE categories SET name=? WHERE id=?').run(String(params.name), id as number);
      return buildReceipt(m('skill-home.items-tag.c009', { p0: String(id) }));
    }
    if (action === 'merge') {
      const from = asInt(params.from_id ?? params.from, 'from');
      const to = asInt(params.to_id ?? params.to, 'to');
      if (from === undefined || to === undefined) fail(2, m('skill-home.items-tag.c010'));
      handle.db.prepare('UPDATE items SET category_id=? WHERE category_id=?').run(to as number, from as number);
      handle.db.prepare('UPDATE categories SET is_active=0 WHERE id=?').run(from as number);
      return buildReceipt(m('skill-home.items-tag.c011', { p0: String(from), p1: String(to) }));
    }
    const tree = categoryTreeOf(handle);
    return { ...buildReceipt(m('skill-home.items-tag.c012', { p0: String(tree.total) })), detail: { tree: tree.tree, total: tree.total } };
  }
  fail(2, m('skill-home.items-tag.c013', { p0: String(op) })); return null;
}
