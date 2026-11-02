// 家庭协作能力·协作查询与协作登记（`home.care.query`／`home.care.write` 的处理函数，
// #800 从 cmd_read 逐字搬迁）。出参 list／receipt 形，行为与搬迁前一致。
//
// 说明：借用管理（SM7-1 操作含借出／借入／归还／催还）与家人档案（SM7-2）走本文件；
// 开始使用 4 场景（SM8-1 首次使用／SM8-2 查异常／SM8-3 备份导出／SM8-4 导入恢复）
// 同走这两键的 kind 预设（init／lint／backup／export／import），键的家定在 family，
// setup 目录只承载页族写集（见 `src/setup/commands.ts` 注释）。
// 备份四支（backup／export／import-preview／import）与 backup-list 由 cmd_read 在开库
// 之前分派（恢复要覆盖库文件），走到这里就是路由被改坏了（fail(1)，与搬迁前一致）。

import type { HomeDb } from '../fetch/db.js';
import {
  setLocationStatus, listMembers, addMember, listBorrows, addBorrow,
  statsOverview,
} from '../fetch/index.js';
import { parseCareKind, checkDate } from '../policy/index.js';
import { fail } from '../shared/fail.js';
import { buildCareList, buildReceipt } from '../render/index.js';
import { m } from '../entries/index.js';

export function runCareQuery(params: Record<string, unknown>, handle: HomeDb): unknown {
  const kind = parseCareKind(params, 'borrow');
  if (kind === 'borrow') {
    // 行里带上页族要显示的字段（物品名／对象／日期／是否已归还），页面据此渲染，不再印占位符。
    return buildCareList(listBorrows(handle).map((r) => {
      const itemName = String(r.item_name ?? m('skill-home.family-care.c001'));
      return {
        name: m('skill-home.family-care.c002', { p0: String(itemName), p1: String(String(r.member)) }),
        count: 1,
        item_name: String(r.item_name ?? ''),
        member: String(r.member),
        op: String(r.op ?? ''),
        date: String(r.date ?? ''),
        returned_at: String(r.returned_at ?? ''),
        due_date: String(r.due_date ?? ''),
        remark: String(r.remark ?? ''),
      };
    }));
  }
  if (kind === 'member') {
    const counts = new Map<string, number>();
    for (const row of handle.db.prepare('SELECT owner, count(*) AS c FROM items WHERE owner IS NOT NULL AND owner<>\'\' GROUP BY owner').all()) {
      counts.set(String(row.owner), Number(row.c));
    }
    return buildCareList(listMembers(handle).map((r) => ({
      name: String(r.name),
      count: 1,
      relation: String(r.relation ?? ''),
      note: String(r.note ?? ''),
      item_count: counts.has(String(r.name)) ? counts.get(String(r.name)) : 0,
    })));
  }
  if (kind === 'lint') {
    const issues: Record<string, unknown>[] = [];
    const noTag = (handle.db.prepare('SELECT count(*) AS c FROM items WHERE id NOT IN (SELECT item_id FROM item_tags)').get() as { c: number }).c;
    if (noTag) issues.push({ name: m('skill-home.family-care.c003', { p0: String(noTag) }), count: noTag });
    const noPhoto = (handle.db.prepare("SELECT count(*) AS c FROM items WHERE photo IS NULL OR photo=''").get() as { c: number }).c;
    if (noPhoto) issues.push({ name: m('skill-home.family-care.c004', { p0: String(noPhoto) }), count: noPhoto });
    const single = (handle.db.prepare("SELECT count(*) AS c FROM item_locations WHERE location NOT LIKE '%/%'").get() as { c: number }).c;
    if (single) issues.push({ name: m('skill-home.family-care.c005', { p0: String(single) }), count: single });
    if (!issues.length) issues.push({ name: m('skill-home.family-care.c006'), count: 0 });
    return buildCareList(issues);
  }
  if (kind === 'firstuse' || kind === 'first-use') {
    const st = statsOverview(handle);
    return buildCareList([{ name: m('skill-home.family-care.c007', { p0: String(st.items) }), count: st.items }]);
  }
  // #707：backup-list 归 dispatchBackup（在开库之前走）；这里走到就是路由被改坏了。
  fail(1, m('skill-home.family-care.c008'));
  return null;
}

export function runCareWrite(params: Record<string, unknown>, handle: HomeDb): unknown {
  const kind = parseCareKind(params, 'init');
  if (kind === 'borrow') {
    const op = String(params.op ?? 'borrow');
    const itemId = params.item_id ?? params.itemId ?? null;
    const member = String(params.member ?? m('skill-home.family-care.c009'));
    const date = checkDate(params.date ?? new Date().toISOString().slice(0, 10), 'date') as string;
    const id = addBorrow(handle, itemId as number | null, member, op, date);
    if (op === 'return') {
      if (typeof itemId === 'number') setLocationStatus(handle, itemId, m('skill-home.family-care.c010'));
      return buildReceipt(m('skill-home.family-care.c011', { p0: String(id) }));
    }
    if (typeof itemId === 'number') {
      try { setLocationStatus(handle, itemId, m('skill-home.family-care.c012')); } catch { /* 无位置不阻断借用登记 */ }
    }
    return buildReceipt(m('skill-home.family-care.c013', { p0: String(id) }));
  }
  if (kind === 'member') {
    const name = String(params.name ?? '');
    if (!name) fail(2, m('skill-home.family-care.c014'));
    const id = addMember(handle, name, (params.relation as string | undefined) ?? null);
    return buildReceipt(m('skill-home.family-care.c015', { p0: String(id), p1: String(name) }));
  }
  if (kind === 'init') return buildReceipt(m('skill-home.family-care.c016', { p0: String(statsOverview(handle).items) }));
  // #707：backup／export／import-preview／import 归 dispatchBackup（在开库之前走）。
  if (kind === 'backup' || kind === 'export' || kind === 'import-preview' || kind === 'import') {
    fail(1, m('skill-home.family-care.c017', { p0: String(kind) }));
  }
  fail(2, m('skill-home.family-care.c018', { p0: String(kind) })); return null;
}
