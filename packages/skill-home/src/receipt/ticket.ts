// 票据凭证能力·票据查询与票据登记（`home.ticket.query`／`home.ticket.write` 的处理函数，
// #800 从 cmd_read 逐字搬迁）。出参 list／receipt 形，行为与搬迁前一致。
//
// 看密码脱敏：`home.ticket.write` kind=account op=show 的回执含明文（仅对话回显），
// HTML 快照占位（见 `src/render/html.ts`），JSON 真相不受影响——本函数只管回执。

import type { HomeDb } from '../fetch/db.js';
import { HomeFetchError } from '../fetch/index.js';
import {
  getItemById, encryptPassword, decryptPassword, loadMasterKey,
  retiredParamMessage, hasParamMasterKey, resolveKeyFile,
  listPurchases, addPurchase, purchaseYearStats, listWarranties, addWarranty,
  addServiceEvent, listCerts, addCert, listAccounts,
} from '../fetch/index.js';
import { parseTicketKind, checkDate, checkMoney } from '../policy/index.js';
import { fail } from '../shared/fail.js';
import { buildTicketList, buildReceipt } from '../render/index.js';

export function runTicketQuery(params: Record<string, unknown>, handle: HomeDb): unknown {
  const kind = parseTicketKind(params);
  if (kind === 'purchase') {
    const f: { itemId?: number; year?: string; month?: string } = {};
    if (params.item_id !== undefined || params.itemId !== undefined) f.itemId = Number(params.item_id ?? params.itemId);
    if (params.year !== undefined) f.year = String(params.year);
    if (params.month !== undefined) f.month = String(params.month).padStart(2, '0');
    if (params.range === 'last-month') {
      const d = new Date(); d.setMonth(d.getMonth() - 1);
      f.year = String(d.getFullYear()); f.month = String(d.getMonth() + 1).padStart(2, '0');
    }
    if (params.range === 'year') {
      const st = purchaseYearStats(handle, String(params.year ?? new Date().getFullYear()));
      return buildTicketList([{ name: '年度花费', count: st.total }]);
    }
    if (params.range === 'return') {
      const id = params.item_id ?? params.itemId;
      if (id === undefined) fail(2, '查退货窗口须给 item_id');
      const rows = listPurchases(handle, { itemId: Number(id) });
      return buildTicketList(rows.map((r) => ({ name: '购买' + String(r.date), count: 1 })));
    }
    return buildTicketList(listPurchases(handle, f).map((r) => ({ name: '购买' + String(r.date), count: 1 })));
  }
  if (kind === 'warranty') {
    const st = params.status !== undefined ? String(params.status) : undefined;
    return buildTicketList(listWarranties(handle, st).map((r) => ({ name: '保修#' + String(r.id), count: 1 })));
  }
  if (kind === 'cert') {
    return buildTicketList(listCerts(handle).map((r) => ({ name: String(r.type) + '到期' + String(r.expires_at), count: 1 })));
  }
  // account list（脱敏）
  return buildTicketList(listAccounts(handle).map((r) => ({ name: r.platform + '（' + r.username + '）', count: 1 })));
}

export function runTicketWrite(params: Record<string, unknown>, handle: HomeDb): unknown {
  const kind = parseTicketKind(params);
  if (kind === 'purchase') {
    const op = String(params.op ?? 'add');
    if (op !== 'add') fail(2, 'purchase 仅支持 op=add');
    const itemId = params.item_id ?? params.itemId;
    if (!Number.isInteger(itemId)) fail(2, '登记购买须给 item_id');
    getItemById(handle, Number(itemId));
    const date = checkDate(params.date, 'date');
    if (!date) fail(2, '登记购买须给 date');
    const price = checkMoney(params.price, 'price');
    const id = addPurchase(handle, Number(itemId), date as string, price, (params.channel as string | undefined) ?? null, (params.scene as string | undefined) ?? null);
    return buildReceipt('已登记购买：#' + id);
  }
  if (kind === 'warranty') {
    const op = String(params.op ?? 'register');
    if (op === 'register' || op === 'cycle') {
      const itemId = params.item_id ?? params.itemId;
      if (!Number.isInteger(itemId)) fail(2, '登记保修须给 item_id');
      getItemById(handle, Number(itemId));
      const start = checkDate(params.start_date ?? params.startDate, 'start-date');
      if (!start) fail(2, '须给 start-date');
      const dur = params.duration_days ?? params.durationDays;
      if (!Number.isInteger(dur)) fail(2, '须给 duration-days 正整数');
      const id = addWarranty(handle, Number(itemId), op === 'cycle' ? '保养' : '保修', start as string, dur as number, (params.scene as string | undefined) ?? null);
      return buildReceipt(op === 'cycle' ? '已设置保养周期：#' + id : '已登记保修：#' + id);
    }
    if (op === 'repair' || op === 'maintain') {
      const wid = params.warranty_id ?? params.warrantyId;
      if (!Number.isInteger(wid)) fail(2, '须给 warranty_id');
      const date = checkDate(params.date, 'date');
      if (!date) fail(2, '须给 date');
      const cost = checkMoney(params.cost, 'cost');
      const id = addServiceEvent(handle, Number(wid), date as string, cost, (params.scene as string | undefined) ?? null);
      return buildReceipt(op === 'repair' ? '已记录维修：#' + id : '已执行保养：#' + id);
    }
    fail(2, '未知 warranty op：' + op); return null;
  }
  if (kind === 'cert') {
    const op = String(params.op ?? 'add');
    if (op === 'add' || op === 'archive' || op === 'update') {
      const type = params.type as string | undefined;
      const exp = checkDate(params.expires_at ?? params.expiresAt, 'expires-at');
      if (op === 'add' && (!type || !exp)) fail(2, '登记证件须给 type+expires-at');
      if (op === 'archive' && !params.photo) fail(2, '证件归档须附 photo');
      const id = addCert(handle, type ?? '其他', (exp ?? '2099-01-01') as string, (params.holder as string | undefined) ?? null, (params.number as string | undefined) ?? null, (params.photo as string | undefined) ?? null, (params.scene as string | undefined) ?? null);
      return buildReceipt(op === 'add' ? '已登记证件：#' + id : op === 'archive' ? '已归档证件：#' + id : '已更新证件：#' + id);
    }
    fail(2, '未知 cert op：' + op); return null;
  }
  // account（主密钥文件门：#794 起口令只从 `key.file` 指的文件读，调用参数退场）
  const op = String(params.op ?? 'add');
  const keyFile = resolveKeyFile();
  if (hasParamMasterKey(params)) fail(2, retiredParamMessage(keyFile));
  const master = loadMasterKey(keyFile);
  if (op === 'add') {
    const platform = params.platform as string | undefined;
    const user = params.user as string | undefined, pass = params.pass as string | undefined;
    if (!platform || !user || !pass) fail(2, '存账号须给 platform+user+pass（主密钥从文件读：' + keyFile + '）');
    const enc = encryptPassword(master, pass as string);
    try { handle.db.prepare('INSERT INTO accounts (platform, username, encrypted_password, type) VALUES (?,?,?,?)').run(platform, user, enc, String(params.type ?? '其他')); }
    catch (e) { throw new HomeFetchError('HOME_DB_UNREADABLE', '存账号失败（平台已存在？）', { cause: e }); }
    return buildReceipt('已存账号：' + platform);
  }
  if (op === 'update') {
    const platform = params.platform as string | undefined;
    if (!platform) fail(2, '改账号须给 platform（主密钥从文件读：' + keyFile + '）');
    const hit = handle.db.prepare('SELECT * FROM accounts WHERE platform=?').get(platform) as Record<string, unknown> | undefined;
    if (!hit) throw new HomeFetchError('HOME_ACCOUNT_MISSING', '无此账号：' + platform);
    // 主密钥校验（解密一次）
    decryptPassword(master, String(hit.encrypted_password));
    const sets: string[] = [];
    const vals: (string | null)[] = [];
    if (params.user !== undefined) { sets.push('username=?'); vals.push(String(params.user)); }
    if (params.pass !== undefined) { sets.push('encrypted_password=?'); vals.push(encryptPassword(master, String(params.pass))); }
    if (params.type !== undefined) { sets.push('type=?'); vals.push(String(params.type)); }
    if (!sets.length) fail(2, '改账号须给 user/pass/type 其一');
    handle.db.prepare('UPDATE accounts SET ' + sets.join(',') + ' WHERE platform=?').run(...vals, platform);
    return buildReceipt('已改账号：' + platform);
  }
  if (op === 'show') {
    const platform = params.platform as string | undefined;
    if (!platform) fail(2, '看密码须给 platform（主密钥从文件读：' + keyFile + '）');
    const hit = handle.db.prepare('SELECT * FROM accounts WHERE platform=?').get(platform) as Record<string, unknown> | undefined;
    if (!hit) throw new HomeFetchError('HOME_ACCOUNT_MISSING', '无此账号：' + platform);
    const plain = decryptPassword(master, String(hit.encrypted_password));
    return buildReceipt('密码：' + plain + '（仅对话回显，不进 HTML 明文）');
  }
  fail(2, '未知 account op：' + op); return null;
}
