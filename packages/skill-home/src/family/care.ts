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

export function runCareQuery(params: Record<string, unknown>, handle: HomeDb): unknown {
  const kind = parseCareKind(params, 'borrow');
  if (kind === 'borrow') return buildCareList(listBorrows(handle).map((r) => ({ name: '借用' + String(r.member), count: 1 })));
  if (kind === 'member') return buildCareList(listMembers(handle).map((r) => ({ name: String(r.name), count: 1 })));
  if (kind === 'lint') {
    const issues: Record<string, unknown>[] = [];
    const noTag = (handle.db.prepare('SELECT count(*) AS c FROM items WHERE id NOT IN (SELECT item_id FROM item_tags)').get() as { c: number }).c;
    if (noTag) issues.push({ name: '无标签物品 ' + noTag + ' 件', count: noTag });
    const noPhoto = (handle.db.prepare("SELECT count(*) AS c FROM items WHERE photo IS NULL OR photo=''").get() as { c: number }).c;
    if (noPhoto) issues.push({ name: '无照片物品 ' + noPhoto + ' 件', count: noPhoto });
    const single = (handle.db.prepare("SELECT count(*) AS c FROM item_locations WHERE location NOT LIKE '%/%'").get() as { c: number }).c;
    if (single) issues.push({ name: '单级位置 ' + single + ' 条', count: single });
    if (!issues.length) issues.push({ name: '健康：无异常', count: 0 });
    return buildCareList(issues);
  }
  if (kind === 'firstuse' || kind === 'first-use') {
    const st = statsOverview(handle);
    return buildCareList([{ name: '首次使用：' + st.items + ' 件已录', count: st.items }]);
  }
  // #707：backup-list 归 dispatchBackup（在开库之前走）；这里走到就是路由被改坏了。
  fail(1, '内部错误：care kind=backup-list 须走 dispatchBackup（开库之前）');
  return null;
}

export function runCareWrite(params: Record<string, unknown>, handle: HomeDb): unknown {
  const kind = parseCareKind(params, 'init');
  if (kind === 'borrow') {
    const op = String(params.op ?? 'borrow');
    const itemId = params.item_id ?? params.itemId ?? null;
    const member = String(params.member ?? '家人');
    const date = checkDate(params.date ?? new Date().toISOString().slice(0, 10), 'date') as string;
    const id = addBorrow(handle, itemId as number | null, member, op, date);
    if (op === 'return') {
      if (typeof itemId === 'number') setLocationStatus(handle, itemId, '在家');
      return buildReceipt('已归还：#' + id);
    }
    if (typeof itemId === 'number') {
      try { setLocationStatus(handle, itemId, '借用中'); } catch { /* 无位置不阻断借用登记 */ }
    }
    return buildReceipt('已借用登记：#' + id);
  }
  if (kind === 'member') {
    const name = String(params.name ?? '');
    if (!name) fail(2, '家人档案须给 name');
    const id = addMember(handle, name, (params.relation as string | undefined) ?? null);
    return buildReceipt('已登记家人：#' + id + ' ' + name);
  }
  if (kind === 'init') return buildReceipt('已初始化：home.db 幂等（' + statsOverview(handle).items + ' 件）');
  // #707：backup／export／import-preview／import 归 dispatchBackup（在开库之前走）。
  if (kind === 'backup' || kind === 'export' || kind === 'import-preview' || kind === 'import') {
    fail(1, '内部错误：care kind=' + kind + ' 须走 dispatchBackup（开库之前）');
  }
  fail(2, '未知 care kind：' + kind); return null;
}
