// 取数层·域表 helper（D1 9 域表直接 SQL；调用方缺失阻断，不返空冒充）。
import type { HomeDb } from './db.js';
import { HomeFetchError } from './errors.js';

function q(handle: HomeDb, sql: string, ...args: (string | number | null)[]): Record<string, unknown>[] {
  try { return handle.db.prepare(sql).all(...args) as unknown as Record<string, unknown>[]; }
  catch (e) { throw new HomeFetchError('HOME_DB_UNREADABLE', '域表读取失败', { cause: e }); }
}
function run(handle: HomeDb, sql: string, ...args: (string | number | null)[]): void {
  try { handle.db.prepare(sql).run(...args); }
  catch (e) { throw new HomeFetchError('HOME_DB_UNREADABLE', '域表写入失败', { cause: e }); }
}
function one(handle: HomeDb, sql: string, ...args: (string | number | null)[]): Record<string, unknown> | undefined {
  try { return handle.db.prepare(sql).get(...args) as unknown as Record<string, unknown> | undefined; }
  catch (e) { throw new HomeFetchError('HOME_DB_UNREADABLE', '域表读取失败', { cause: e }); }
}

// ---- 盘点 ----
export function addInventoryRecord(handle: HomeDb, scope: string, location: string | null, total: number): number {
  run(handle, 'INSERT INTO inventory_records (scope, location, total) VALUES (?,?,?)', scope, location, total);
  const r = one(handle, 'SELECT last_insert_rowid() AS id') as unknown as { id: number };
  return r.id;
}
export function listInventoryRecords(handle: HomeDb, limit = 20): Record<string, unknown>[] {
  return q(handle, 'SELECT * FROM inventory_records ORDER BY id DESC LIMIT ?', limit);
}

// ---- 位置节点 ----
export function listLocationNodes(handle: HomeDb): string[] {
  return q(handle, 'SELECT path FROM location_nodes ORDER BY path').map((r) => String(r.path));
}
export function ensureLocationNode(handle: HomeDb, path: string): void {
  run(handle, 'INSERT OR IGNORE INTO location_nodes (path) VALUES (?)', path);
}

// ---- 购物 ----
export function listShopping(handle: HomeDb): Record<string, unknown>[] {
  return q(handle, 'SELECT * FROM shopping_items ORDER BY id');
}
export function addShopping(handle: HomeDb, name: string, quantity: number, routine: string | null): number {
  if (!name.trim()) throw new HomeFetchError('HOME_BAD_QUERY', '购物项须给 name');
  run(handle, 'INSERT INTO shopping_items (name, quantity, routine) VALUES (?,?,?)', name.trim(), quantity, routine);
  return (one(handle, 'SELECT last_insert_rowid() AS id') as unknown as { id: number }).id;
}
export function checkShopping(handle: HomeDb, ids: number[]): number {
  let n = 0;
  for (const id of ids) {
    run(handle, 'UPDATE shopping_items SET checked=1 WHERE id=?', id);
    n++;
  }
  return n;
}
export function missingItems(handle: HomeDb): Record<string, unknown>[] {
  // 缺货：有阈值且总量 < 阈值
  return q(handle, `SELECT i.id, i.name, ifnull(sum(l.quantity),0) AS qty, s.threshold
    FROM items i JOIN stock_thresholds s ON s.item_id=i.id LEFT JOIN item_locations l ON l.item_id=i.id
    GROUP BY i.id HAVING qty < s.threshold`);
}
export function stockList(handle: HomeDb): Record<string, unknown>[] {
  return q(handle, `SELECT i.id, i.name, ifnull(sum(l.quantity),0) AS qty, s.threshold
    FROM items i LEFT JOIN item_locations l ON l.item_id=i.id LEFT JOIN stock_thresholds s ON s.item_id=i.id
    GROUP BY i.id ORDER BY i.name`);
}
export function setThreshold(handle: HomeDb, itemId: number, threshold: number): void {
  if (!Number.isInteger(threshold) || threshold < 0) throw new HomeFetchError('HOME_BAD_QUERY', 'threshold 须为非负整数');
  run(handle, 'INSERT INTO stock_thresholds (item_id, threshold) VALUES (?,?) ON CONFLICT(item_id) DO UPDATE SET threshold=excluded.threshold', itemId, threshold);
}

// ---- 票据：purchase/warranty/cert/account ----
export function listPurchases(handle: HomeDb, f: { itemId?: number; year?: string; month?: string }): Record<string, unknown>[] {
  let sql = 'SELECT * FROM purchase_records WHERE 1=1';
  const args: (string | number | null)[] = [];
  if (f.itemId !== undefined) { sql += ' AND item_id=?'; args.push(f.itemId); }
  if (f.year !== undefined) { sql += ' AND substr(date,1,4)=?'; args.push(f.year); }
  if (f.month !== undefined) { sql += ' AND substr(date,6,2)=?'; args.push(f.month); }
  sql += ' ORDER BY date DESC LIMIT 100';
  return q(handle, sql, ...args);
}
export function addPurchase(handle: HomeDb, itemId: number, date: string, price: number | null, channel: string | null, scene: string | null): number {
  run(handle, 'INSERT INTO purchase_records (item_id, date, price, channel, scene) VALUES (?,?,?,?,?)', itemId, date, price, channel, scene);
  return (one(handle, 'SELECT last_insert_rowid() AS id') as unknown as { id: number }).id;
}
export function purchaseYearStats(handle: HomeDb, year: string): { count: number; total: number } {
  const r = one(handle, 'SELECT count(*) AS c, ifnull(sum(price),0) AS t FROM purchase_records WHERE substr(date,1,4)=?', year) as unknown as { c: number; t: number } | undefined;
  return { count: r?.c ?? 0, total: r?.t ?? 0 };
}
export function listWarranties(handle: HomeDb, status?: string): Record<string, unknown>[] {
  const rows = q(handle, 'SELECT * FROM warranties ORDER BY start_date DESC LIMIT 100');
  if (!status || status === '全部') return rows;
  const now = new Date().toISOString().slice(0, 10);
  return rows.filter((r) => {
    const start = String(r.start_date);
    const days = Number(r.duration_days);
    const end = new Date(start);
    end.setDate(end.getDate() + days);
    const endS = end.toISOString().slice(0, 10);
    const remain = (new Date(endS).getTime() - new Date(now).getTime()) / 86400000;
    const st = remain < 0 ? '已过' : remain <= 30 ? '即将到期' : '在保';
    return st === status;
  });
}
export function addWarranty(handle: HomeDb, itemId: number, kind: string, startDate: string, durationDays: number, scene: string | null): number {
  if (!['保修', '保养'].includes(kind)) throw new HomeFetchError('HOME_BAD_QUERY', 'kind 须 保修/保养');
  if (!Number.isInteger(durationDays) || durationDays <= 0) throw new HomeFetchError('HOME_BAD_QUERY', 'duration-days 须为正整数');
  run(handle, 'INSERT INTO warranties (item_id, kind, start_date, duration_days, scene) VALUES (?,?,?,?,?)', itemId, kind, startDate, durationDays, scene);
  return (one(handle, 'SELECT last_insert_rowid() AS id') as unknown as { id: number }).id;
}
export function addServiceEvent(handle: HomeDb, warrantyId: number, date: string, cost: number | null, scene: string | null): number {
  const hit = one(handle, 'SELECT id FROM warranties WHERE id=?', warrantyId);
  if (!hit) throw new HomeFetchError('HOME_BAD_QUERY', '无此保修：' + warrantyId);
  run(handle, 'INSERT INTO service_events (warranty_id, date, cost, scene) VALUES (?,?,?,?)', warrantyId, date, cost, scene);
  return (one(handle, 'SELECT last_insert_rowid() AS id') as unknown as { id: number }).id;
}
export function listCerts(handle: HomeDb): Record<string, unknown>[] {
  return q(handle, 'SELECT id, type, expires_at, holder FROM certificates ORDER BY expires_at LIMIT 100');
}
export function addCert(handle: HomeDb, type: string, expiresAt: string, holder: string | null, number: string | null, photo: string | null, scene: string | null): number {
  run(handle, 'INSERT INTO certificates (type, expires_at, holder, number, photo, scene) VALUES (?,?,?,?,?,?)', type, expiresAt, holder, number, photo, scene);
  return (one(handle, 'SELECT last_insert_rowid() AS id') as unknown as { id: number }).id;
}
export function listAccounts(handle: HomeDb): { platform: string; username: string; type: string }[] {
  return q(handle, 'SELECT platform, username, type FROM accounts ORDER BY platform').map((r) => ({
    platform: String(r.platform), username: String(r.username), type: String(r.type),
  }));
}

// ---- 家庭协作 ----
export function listMembers(handle: HomeDb): Record<string, unknown>[] {
  return q(handle, 'SELECT * FROM family_members ORDER BY name');
}
export function addMember(handle: HomeDb, name: string, relation: string | null): number {
  if (!name.trim()) throw new HomeFetchError('HOME_BAD_QUERY', '家人须给 name');
  run(handle, 'INSERT OR IGNORE INTO family_members (name, relation) VALUES (?,?)', name.trim(), relation);
  const hit = one(handle, 'SELECT id FROM family_members WHERE name=?', name.trim()) as unknown as { id: number } | undefined;
  if (!hit) throw new HomeFetchError('HOME_DB_UNREADABLE', '家人写入失败');
  return hit.id;
}
export function listBorrows(handle: HomeDb): Record<string, unknown>[] {
  return q(handle, 'SELECT * FROM borrow_records ORDER BY id DESC LIMIT 50');
}
export function addBorrow(handle: HomeDb, itemId: number | null, member: string, action: string, date: string): number {
  run(handle, 'INSERT INTO borrow_records (item_id, member, action, date) VALUES (?,?,?,?)', itemId, member, action, date);
  return (one(handle, 'SELECT last_insert_rowid() AS id') as unknown as { id: number }).id;
}

// ---- 统计 ----
export function statsOverview(handle: HomeDb): Record<string, number> {
  const items = (one(handle, 'SELECT count(*) AS c FROM items') as unknown as { c: number }).c;
  const locs = (one(handle, 'SELECT count(*) AS c, ifnull(sum(quantity),0) AS q FROM item_locations') as unknown as { c: number; q: number });
  const tags = (one(handle, 'SELECT count(DISTINCT tag) AS c FROM item_tags') as unknown as { c: number }).c;
  const cats = (one(handle, 'SELECT count(*) AS c FROM categories WHERE is_active=1') as unknown as { c: number }).c;
  return { items, locations: locs.c, quantity: locs.q, tags, categories: cats };
}
export function highFreq(handle: HomeDb, limit = 10): { id: number; name: string; count: number }[] {
  return handle.db.prepare('SELECT id, name, access_count AS count FROM items ORDER BY access_count DESC LIMIT ?').all(limit) as unknown as { id: number; name: string; count: number }[];
}
export function idleItems(handle: HomeDb, days: number): { id: number; name: string }[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cut = cutoff.toISOString();
  try {
    return handle.db.prepare(
      'SELECT id, name FROM items WHERE (last_accessed_at IS NULL OR last_accessed_at < ?) ORDER BY last_accessed_at LIMIT 50',
    ).all(cut) as unknown as { id: number; name: string }[];
  } catch (e) { throw new HomeFetchError('HOME_DB_UNREADABLE', '闲置查询失败', { cause: e }); }
}
export function expiringItems(handle: HomeDb, days: number, expiredOnly: boolean): { item_id: number; location: string; expiration_date: string }[] {
  const today = new Date().toISOString().slice(0, 10);
  const end = new Date();
  end.setDate(end.getDate() + days);
  const endS = end.toISOString().slice(0, 10);
  try {
    if (expiredOnly) {
      return handle.db.prepare(
        'SELECT item_id, location, expiration_date FROM item_locations WHERE expiration_date IS NOT NULL AND expiration_date < ? ORDER BY expiration_date LIMIT 50',
      ).all(today) as unknown as { item_id: number; location: string; expiration_date: string }[];
    }
    return handle.db.prepare(
      'SELECT item_id, location, expiration_date FROM item_locations WHERE expiration_date IS NOT NULL AND expiration_date <= ? ORDER BY expiration_date LIMIT 50',
    ).all(endS) as unknown as { item_id: number; location: string; expiration_date: string }[];
  } catch (e) { throw new HomeFetchError('HOME_DB_UNREADABLE', '过期查询失败', { cause: e }); }
}
