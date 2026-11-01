// 物品能力·录物品（`home.item.add` 的处理函数，#800 从 cmd_read 逐字搬迁）。
//
// 入参：op=single|batch|backfill；出参 receipt 形，行为与搬迁前一致。

import type { HomeDb } from '../fetch/db.js';
import { addItem, getCategoryById } from '../fetch/index.js';
import { validateAddInput } from '../policy/index.js';
import { checkDate } from '../policy/index.js';
import { fail } from '../shared/fail.js';
import { buildReceipt } from '../render/index.js';
import { m } from '../entries/index.js';

export function runItemAdd(params: Record<string, unknown>, handle: HomeDb): unknown {
  const op = (params.op as string | undefined) ?? 'single';
  if (op === 'batch') {
    const list = params.items;
    if (!Array.isArray(list) || !list.length) fail(2, m('skill-home.items-add.c001'));
    let n = 0;
    for (const it of list as Record<string, unknown>[]) {
      const v = validateAddInput(it);
      const cat = getCategoryById(handle, v.category_id);
      addItem(handle, { ...v, category: cat.name });
      n++;
    }
    return buildReceipt(m('skill-home.items-add.c002', { p0: String(n) }));
  }
  const v = validateAddInput(params);
  const cat = getCategoryById(handle, v.category_id);
  // 批量/补录日期守卫
  if (op === 'backfill' && params.backfill_date !== undefined) checkDate(params.backfill_date, 'backfill_date');
  const item = addItem(handle, { ...v, category: cat.name });
  if (params.preview === true) return buildReceipt(m('skill-home.items-add.c003', { p0: String(item.name), p1: String(v.location) }));
  return buildReceipt(m('skill-home.items-add.c004', { p0: String(item.id), p1: String(item.name) }));
}
