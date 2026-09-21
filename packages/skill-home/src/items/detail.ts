// 物品能力·看物品（`home.item.detail` 的处理函数，#800 从 cmd_read 逐字搬迁）。
//
// 入参：id（必填）／view=detail|history|photos|wall；出参 detail 形，行为与搬迁前一致。

import type { HomeDb } from '../fetch/db.js';
import { getItemById, listLocationsByItem, listTagsByItem } from '../fetch/index.js';
import { fail } from '../shared/fail.js';
import { asInt } from '../shared/params.js';
import { toItemCard, buildDetail } from '../render/index.js';

export function runItemDetail(params: Record<string, unknown>, handle: HomeDb): unknown {
  const view = (params.view as string | undefined) ?? 'detail';
  const id = asInt(params.id, 'id');
  if (id === undefined) fail(2, '看物品须给 id');
  const item = getItemById(handle, id as number);
  const locs = listLocationsByItem(handle, id as number);
  const tags = listTagsByItem(handle, id as number);
  const card = toItemCard(item, locs, tags);
  if (view === 'history') {
    const evs = handle.db.prepare('SELECT event, detail, created_at FROM item_events WHERE item_id=? ORDER BY id DESC LIMIT 20').all(id) as Record<string, unknown>[];
    return buildDetail(card, { history: evs.map((e) => String(e.event) + ':' + String(e.detail)).join('；') || '(无历史)' });
  }
  if (view === 'photos' || view === 'wall') {
    return buildDetail({ ...card, photo: item.photo ?? '' } as unknown as typeof card);
  }
  // 访问计数已在 search 侧；detail 直读再 +1
  try { handle.db.prepare('UPDATE items SET access_count=access_count+1, last_accessed_at=CURRENT_TIMESTAMP WHERE id=?').run(id); } catch { /* 不阻断 */ }
  return buildDetail(card);
}
