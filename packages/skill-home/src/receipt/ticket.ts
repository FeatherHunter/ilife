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
  addServiceEvent, listCerts, addCert, listAccounts, maskCertNumber,
} from '../fetch/index.js';
import { parseTicketKind, checkDate, checkMoney } from '../policy/index.js';
import { fail } from '../shared/fail.js';
import { buildTicketList, buildReceipt } from '../render/index.js';
import { m } from '../entries/index.js';

/** 金额格式化（回执行与逐笔行同一把尺）：数字才带「 元」，空值交调用方写「—」。 */
function moneyOf(v: unknown): string {
  return typeof v === 'number' ? m('skill-home.receipt-ticket.c001', { p0: String(String(v)) }) : '';
}

/** 按物品分类把购买记录聚成「分类／笔数／金额」三列（49 的年分类统计，47／48 的行下分类块）。
 *  分类名取自物品（`listPurchases` 的 JOIN 带出），拿不到就并进「未分类」——不猜、不编。 */
function purchaseCategories(rows: Record<string, unknown>[]): { category: string; count: number; amount: number }[] {
  const bag = new Map<string, { category: string; count: number; amount: number }>();
  for (const r of rows) {
    const name = r.item_category === null || r.item_category === undefined || String(r.item_category).trim() === ''
      ? m('skill-home.receipt-ticket.c002') : String(r.item_category);
    const cur = bag.get(name) ?? { category: name, count: 0, amount: 0 };
    cur.count += 1;
    cur.amount += typeof r.price === 'number' ? r.price : 0;
    bag.set(name, cur);
  }
  return [...bag.values()];
}

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
      const year = String(params.year ?? new Date().getFullYear());
      const st = purchaseYearStats(handle, year);
      const rows = listPurchases(handle, { year });
      return buildTicketList([{ name: m('skill-home.receipt-ticket.c003'), count: st.total, year, categories: purchaseCategories(rows) }]);
    }
    // #890 取数层：逐笔行原先只有 `{name:'购买X', count:1}`——页面的九列里八列只能写「—」。
    // 现在把这一行真有的字段原样带出去（物品名／编号／购买日／价格／渠道，来自 `listPurchases` 的 JOIN），
    // 分类统计挂在第一行（页面按 `items[].categories` 取，一份挂在多处会重复渲染）。
    let rows: Record<string, unknown>[];
    // #890：按物品查（退货窗口）时把「这一次查的是谁」一起带回——0 命中时页面原先只说
    // 「没有命中购买记录」，认不出查的是哪一件。物品名从库里取；id 非法时不阻断查询本身。
    let query: { item_id: number; item_name: string } | undefined;
    if (params.range === 'return') {
      const id = params.item_id ?? params.itemId;
      if (id === undefined) fail(2, m('skill-home.receipt-ticket.c004'));
      rows = listPurchases(handle, { itemId: Number(id) });
      let name = '';
      try { name = String(getItemById(handle, Number(id)).name); } catch { name = ''; }
      query = { item_id: Number(id), item_name: name };
    } else {
      rows = listPurchases(handle, f);
    }
    const categories = purchaseCategories(rows);
    return buildTicketList(rows.map((r, i) => ({
      name: m('skill-home.receipt-ticket.c005', { p0: String(String(r.date)) }),
      count: 1,
      item_id: r.item_id ?? null,
      item_name: r.item_name ?? null,
      date: r.date ?? null,
      price: r.price ?? null,
      channel: r.channel ?? null,
      ...(i === 0 && categories.length ? { categories } : {}),
    })), query);
  }
  if (kind === 'warranty') {
    const st = params.status !== undefined ? String(params.status) : undefined;
    // 卡头读 `name`（「保修#N」），卡体七格读 `listWarranties` 带出来的派生字段——两者拼在一行上。
    return buildTicketList(listWarranties(handle, st).map((r) => ({ ...r, name: m('skill-home.receipt-ticket.c006', { p0: String(String(r.id)) }), count: 1 })));
  }
  if (kind === 'cert') {
    return buildTicketList(listCerts(handle));
  }
  // account list（列表脱敏：只出平台／用户名／类型，不出密码）
  return buildTicketList(listAccounts(handle).map((r) => ({
    name: r.platform + '（' + r.username + '）',
    count: 1,
    platform: r.platform,
    username: r.username,
    type: r.type,
  })));
}

export function runTicketWrite(params: Record<string, unknown>, handle: HomeDb): unknown {
  const kind = parseTicketKind(params);
  if (kind === 'purchase') {
    const op = String(params.op ?? 'add');
    if (op !== 'add') fail(2, m('skill-home.receipt-ticket.c007'));
    const itemId = params.item_id ?? params.itemId;
    if (!Number.isInteger(itemId)) fail(2, m('skill-home.receipt-ticket.c008'));
    const item = getItemById(handle, Number(itemId));
    const date = checkDate(params.date, 'date');
    if (!date) fail(2, m('skill-home.receipt-ticket.c009'));
    const price = checkMoney(params.price, 'price');
    const channel = (params.channel as string | undefined) ?? null;
    const id = addPurchase(handle, Number(itemId), date as string, price, channel, (params.scene as string | undefined) ?? null);
    // #890：回执不再只有一句「已登记购买：#N」——把本次真写进去的字段逐行带回（页面按 `detail.fields` 印）。
    return buildReceipt(m('skill-home.receipt-ticket.c010', { p0: String(id) }), [
      { k: m('skill-home.receipt-ticket.c011'), v: '#' + String(id) },
      { k: m('skill-home.receipt-ticket.c012'), v: String(item.name) },
      { k: m('skill-home.receipt-ticket.c013'), v: String(date) },
      { k: m('skill-home.receipt-ticket.c014'), v: moneyOf(price) === '' ? '—' : moneyOf(price) },
      { k: m('skill-home.receipt-ticket.c015'), v: channel === null || channel === '' ? '—' : channel },
    ]);
  }
  if (kind === 'warranty') {
    const op = String(params.op ?? 'register');
    if (op === 'register' || op === 'cycle') {
      const itemId = params.item_id ?? params.itemId;
      if (!Number.isInteger(itemId)) fail(2, m('skill-home.receipt-ticket.c016'));
      const item = getItemById(handle, Number(itemId));
      const start = checkDate(params.start_date ?? params.startDate, 'start-date');
      if (!start) fail(2, m('skill-home.receipt-ticket.c017'));
      const dur = params.duration_days ?? params.durationDays;
      if (!Number.isInteger(dur)) fail(2, m('skill-home.receipt-ticket.c018'));
      const kindCn = op === 'cycle' ? m('skill-home.receipt-ticket.c019') : m('skill-home.receipt-ticket.c020');
      const id = addWarranty(handle, Number(itemId), kindCn, start as string, dur as number, (params.scene as string | undefined) ?? null);
      // 到期日＝起始日 ＋ 时长（与 `listWarranties` 同一算式，页面读到的就是这两个字段）。
      const end = new Date(start as string);
      end.setDate(end.getDate() + (dur as number));
      return buildReceipt(op === 'cycle' ? m('skill-home.receipt-ticket.c021', { p0: String(id) }) : m('skill-home.receipt-ticket.c022', { p0: String(id) }), [
        { k: m('skill-home.receipt-ticket.c023'), v: '#' + String(id) },
        { k: m('skill-home.receipt-ticket.c024'), v: String(item.name) },
        { k: m('skill-home.receipt-ticket.c025'), v: kindCn },
        { k: m('skill-home.receipt-ticket.c026'), v: String(start) },
        { k: m('skill-home.receipt-ticket.c027'), v: m('skill-home.receipt-ticket.c028', { p0: String(String(dur)) }) },
        { k: m('skill-home.receipt-ticket.c029'), v: end.toISOString().slice(0, 10) },
      ]);
    }
    if (op === 'repair' || op === 'maintain') {
      const wid = params.warranty_id ?? params.warrantyId;
      if (!Number.isInteger(wid)) fail(2, m('skill-home.receipt-ticket.c030'));
      const date = checkDate(params.date, 'date');
      if (!date) fail(2, m('skill-home.receipt-ticket.c031'));
      const cost = checkMoney(params.cost, 'cost');
      const id = addServiceEvent(handle, Number(wid), date as string, cost, (params.scene as string | undefined) ?? null);
      return buildReceipt(op === 'repair' ? m('skill-home.receipt-ticket.c032', { p0: String(id) }) : m('skill-home.receipt-ticket.c033', { p0: String(id) }), [
        { k: m('skill-home.receipt-ticket.c034'), v: '#' + String(id) },
        { k: m('skill-home.receipt-ticket.c035'), v: '#' + String(wid) },
        { k: m('skill-home.receipt-ticket.c036'), v: String(date) },
        { k: m('skill-home.receipt-ticket.c037'), v: moneyOf(cost) === '' ? '—' : moneyOf(cost) },
      ]);
    }
    fail(2, m('skill-home.receipt-ticket.c038', { p0: String(op) })); return null;
  }
  if (kind === 'cert') {
    const op = String(params.op ?? 'add');
    if (op === 'add' || op === 'archive' || op === 'update') {
      const type = params.type as string | undefined;
      const exp = checkDate(params.expires_at ?? params.expiresAt, 'expires-at');
      if (op === 'add' && (!type || !exp)) fail(2, m('skill-home.receipt-ticket.c039'));
      if (op === 'archive' && !params.photo) fail(2, m('skill-home.receipt-ticket.c040'));
      const holder = (params.holder as string | undefined) ?? null;
      const number = (params.number as string | undefined) ?? null;
      const id = addCert(handle, type ?? m('skill-home.receipt-ticket.c041'), (exp ?? '2099-01-01') as string, holder, number, (params.photo as string | undefined) ?? null, (params.scene as string | undefined) ?? null);
      const head = op === 'add' ? m('skill-home.receipt-ticket.c042', { p0: String(id) }) : op === 'archive' ? m('skill-home.receipt-ticket.c043', { p0: String(id) }) : m('skill-home.receipt-ticket.c044', { p0: String(id) });
      return buildReceipt(head, [
        { k: m('skill-home.receipt-ticket.c045'), v: '#' + String(id) },
        { k: m('skill-home.receipt-ticket.c046'), v: type ?? m('skill-home.receipt-ticket.c047') },
        { k: m('skill-home.receipt-ticket.c048'), v: holder === null || holder === '' ? '—' : holder },
        { k: m('skill-home.receipt-ticket.c049'), v: String(exp ?? '2099-01-01') },
        // 号码一律只出脱敏值：明文不出库这一层（`maskCertNumber` 是唯一那处规则）。
        { k: m('skill-home.receipt-ticket.c050'), v: maskCertNumber(number) },
      ]);
    }
    fail(2, m('skill-home.receipt-ticket.c051', { p0: String(op) })); return null;
  }
  // account（主密钥文件门：#794 起口令只从 `key.file` 指的文件读，调用参数退场）
  const op = String(params.op ?? 'add');
  const keyFile = resolveKeyFile();
  if (hasParamMasterKey(params)) fail(2, retiredParamMessage(keyFile));
  const master = loadMasterKey(keyFile);
  if (op === 'add') {
    const platform = params.platform as string | undefined;
    const user = params.user as string | undefined, pass = params.pass as string | undefined;
    if (!platform || !user || !pass) fail(2, m('skill-home.receipt-ticket.c052', { p0: String(keyFile) }));
    const enc = encryptPassword(master, pass as string);
    const typeCn = String(params.type ?? m('skill-home.receipt-ticket.c053'));
    try { handle.db.prepare('INSERT INTO accounts (platform, username, encrypted_password, type) VALUES (?,?,?,?)').run(platform, user, enc, typeCn); }
    catch (e) { throw new HomeFetchError('HOME_DB_UNREADABLE', '存账号失败（平台已存在？）', { cause: e }); }
    // #890：回执逐行回显本次落库的平台／用户名／类型（口令只走对话 JSON，页上不出）。
    return buildReceipt(m('skill-home.receipt-ticket.c054', { p0: String(platform) }), [
      { k: m('skill-home.receipt-ticket.c055'), v: platform },
      { k: m('skill-home.receipt-ticket.c056'), v: user },
      { k: m('skill-home.receipt-ticket.c057'), v: typeCn },
      { k: m('skill-home.receipt-ticket.c058'), v: m('skill-home.receipt-ticket.c059') },
    ]);
  }
  if (op === 'update') {
    const platform = params.platform as string | undefined;
    if (!platform) fail(2, m('skill-home.receipt-ticket.c060', { p0: String(keyFile) }));
    const hit = handle.db.prepare('SELECT * FROM accounts WHERE platform=?').get(platform) as Record<string, unknown> | undefined;
    if (!hit) throw new HomeFetchError('HOME_ACCOUNT_MISSING', '无此账号：' + platform);
    // 主密钥校验（解密一次）
    decryptPassword(master, String(hit.encrypted_password));
    const sets: string[] = [];
    const vals: (string | null)[] = [];
    if (params.user !== undefined) { sets.push('username=?'); vals.push(String(params.user)); }
    if (params.pass !== undefined) { sets.push('encrypted_password=?'); vals.push(encryptPassword(master, String(params.pass))); }
    if (params.type !== undefined) { sets.push('type=?'); vals.push(String(params.type)); }
    if (!sets.length) fail(2, m('skill-home.receipt-ticket.c061'));
    handle.db.prepare('UPDATE accounts SET ' + sets.join(',') + ' WHERE platform=?').run(...vals, platform);
    // #890：只回显这次真改了的字段（改了几项说几项），没给的一律不进回执——「留空即保持原值」。
    const changed: { readonly k: string; readonly v: string }[] = [{ k: m('skill-home.receipt-ticket.c062'), v: platform }];
    if (params.user !== undefined) changed.push({ k: m('skill-home.receipt-ticket.c063'), v: String(params.user) });
    if (params.pass !== undefined) changed.push({ k: m('skill-home.receipt-ticket.c064'), v: m('skill-home.receipt-ticket.c065') });
    if (params.type !== undefined) changed.push({ k: m('skill-home.receipt-ticket.c066'), v: String(params.type) });
    return buildReceipt(m('skill-home.receipt-ticket.c067', { p0: String(platform) }), changed);
  }
  if (op === 'show') {
    const platform = params.platform as string | undefined;
    if (!platform) fail(2, m('skill-home.receipt-ticket.c068', { p0: String(keyFile) }));
    const hit = handle.db.prepare('SELECT * FROM accounts WHERE platform=?').get(platform) as Record<string, unknown> | undefined;
    if (!hit) throw new HomeFetchError('HOME_ACCOUNT_MISSING', '无此账号：' + platform);
    const plain = decryptPassword(master, String(hit.encrypted_password));
    // #890：回执里点名是哪个平台的密码（原先只有一句「密码：…」，页上认不出这一条属于谁）。
    // 值位只写「已在对话里回显」，明文不进 `fields`（页面、复制载荷、数据原文三处都不落）。
    return buildReceipt(m('skill-home.receipt-ticket.c069', { p0: String(plain) }), [
      { k: m('skill-home.receipt-ticket.c070'), v: platform },
      { k: m('skill-home.receipt-ticket.c071'), v: String(hit.username ?? '—') },
      { k: m('skill-home.receipt-ticket.c072'), v: m('skill-home.receipt-ticket.c073') },
    ]);
  }
  fail(2, m('skill-home.receipt-ticket.c074', { p0: String(op) })); return null;
}
