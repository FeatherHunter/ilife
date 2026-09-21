// 物品能力·查物品（`home.item.search` 的处理函数，#800 从 cmd_read 逐字搬迁）。
//
// 入参：name／location／tag／category_id／status／limit／exact／dupes／wall／locate／
// browse／photo；出参 list 形（`buildSearchList`），行为与搬迁前一致。

import type { HomeDb } from '../fetch/db.js';
import { searchItems } from '../fetch/index.js';
import { fail, note } from '../shared/fail.js';
import { toItemCard, buildSearchList } from '../render/index.js';

export function runItemSearch(params: Record<string, unknown>, handle: HomeDb): unknown {
  if (params.dupes === true) {
    const rows = handle.db.prepare('SELECT name, count(*) AS c FROM items GROUP BY name HAVING c>1 ORDER BY c DESC LIMIT 20').all() as { name: string; c: number }[];
    return buildSearchList(rows.map((r) => ({ id: 0, name: r.name + '×' + r.c, location: '', quantity: r.c, status: '', category: '', tags: '' })));
  }
  const f: Record<string, unknown> = {};
  if (params.name !== undefined) f.name = String(params.name);
  if (params.location !== undefined) f.location = String(params.location);
  if (params.tag !== undefined) f.tag = String(params.tag);
  const cid = params.category_id ?? params.categoryId;
  if (cid !== undefined) {
    if (!Number.isInteger(cid)) fail(2, 'category_id 须为正整数');
    f.categoryId = cid as number;
  }
  if (params.status !== undefined) f.status = String(params.status);
  if (params.limit !== undefined) {
    if (!Number.isInteger(params.limit)) fail(2, 'limit 须为正整数');
    f.limit = params.limit as number;
  }
  if (params.exact === true) f.exact = true;
  const hits = searchItems(handle, f);
  // 照片墙：仅留有照片件
  let cards = hits.map((h) => toItemCard(h.item, h.locations, h.tags));
  if (params.wall === true) cards = cards.filter((c) => {
    const it = hits.find((h) => h.item.id === c.id)?.item;
    return !!(it?.photo);
  });
  if (!hits.length) note('库空或无命中：真实无记录（非故障）');
  return buildSearchList(cards);
}
