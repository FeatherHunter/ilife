// 穿搭出行能力·穿搭推荐（`home.outfit.pick` 的处理函数，#800 从 cmd_read 逐字搬迁）。
//
// 出参 list 形，行为与搬迁前一致。

import type { HomeDb, HomeItem } from '../fetch/db.js';
import { listLocationsByItem, listTagsByItem } from '../fetch/index.js';
import { fail, note } from '../shared/fail.js';
import { toItemCard, buildOutfitList } from '../render/index.js';

export function runOutfitPick(params: Record<string, unknown>, handle: HomeDb): unknown {
  const kind = (params.kind as string | undefined) ?? 'pick';
  const limit = params.limit !== undefined ? Number(params.limit) : 5;
  if (!Number.isInteger(limit) || limit <= 0 || limit > 20) fail(2, 'limit 须为 1~20 正整数');
  // 穿搭候选：在家衣物类（分类名含衣/鞋/帽/穿戴）+ 状态在家
  const rows = handle.db.prepare(
    "SELECT i.* FROM items i WHERE (i.category LIKE '%衣%' OR i.category LIKE '%穿%' OR i.name LIKE '%衣%' OR i.name LIKE '%鞋%') ORDER BY i.access_count DESC LIMIT ?",
  ).all(limit) as unknown as HomeItem[];
  const cards = rows.map((it) => {
    const locs = listLocationsByItem(handle, it.id);
    const tags = listTagsByItem(handle, it.id);
    return toItemCard(it, locs, tags);
  });
  void kind;
  if (!cards.length) note('衣橱空：真实无候选（非故障）');
  return buildOutfitList(cards, kind);
}
