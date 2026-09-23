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
  // 带上物品名（#817 收口：借用页要显示「借的什么」，不给就得印占位符）
  return q(handle, 'SELECT b.*, i.name AS item_name, i.category AS item_category FROM borrow_records b LEFT JOIN items i ON i.id = b.item_id ORDER BY b.id DESC LIMIT 50');
}
export function addBorrow(handle: HomeDb, itemId: number | null, member: string, action: string, date: string): number {
  run(handle, 'INSERT INTO borrow_records (item_id, member, action, date) VALUES (?,?,?,?)', itemId, member, action, date);
  return (one(handle, 'SELECT last_insert_rowid() AS id') as unknown as { id: number }).id;
}

// ---- 统计 ----
/** 活跃物品判据（老 `stats/__init__.py` 的 `_active_condition` 口径：至少一个位置的状态不在「已废弃／已用完」）。 */
const ACTIVE_ITEM = "EXISTS (SELECT 1 FROM item_locations il WHERE il.item_id = i.id AND il.location_status NOT IN ('已废弃','已用完'))";
/** 顶级分类递归表（子分类物品归并到顶级祖先；老 `top_category_rows` 的 `cat_path` 口径）。 */
const CAT_PATH = `WITH RECURSIVE cat_path AS (
    SELECT id, parent_id, name, id AS top_id, name AS top_name FROM categories WHERE parent_id IS NULL
    UNION ALL
    SELECT c.id, c.parent_id, c.name, cp.top_id, cp.top_name FROM categories c JOIN cat_path cp ON c.parent_id = cp.id
  )`;

/** 今天（本地日期，YYYY-MM-DD；与老 `_today()` 的本地时间约定一致）。 */
export function localToday(): string {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
/** 本地日期偏移（负数为过去）：`localDayAt(-7)` ＝ 七天前。 */
function localDayAt(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

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
/** 高频 TOP（活跃物品；#865 补最后访问日与完整名称，值排行同形）。 */
export function frequentTopItems(handle: HomeDb, limit = 5): { id: number; name: string; count: number; lastAccessedAt: string }[] {
  const rows = q(handle, `SELECT i.id, i.name, i.access_count AS count, ifnull(i.last_accessed_at,'') AS last_accessed_at
    FROM items i WHERE ${ACTIVE_ITEM} ORDER BY i.access_count DESC, i.id LIMIT ?`, limit);
  return rows.map((r) => ({ id: Number(r.id), name: String(r.name), count: Number(r.count), lastAccessedAt: String(r.last_accessed_at) }));
}
/** 价值 TOP（#865）：价格 > 0 的活跃物品，单价降序，带分类名（老 `_value_top` 口径）。 */
export function valueTopItems(handle: HomeDb, limit = 5): { id: number; name: string; price: number; category: string }[] {
  const rows = q(handle, `SELECT i.id, i.name, i.purchase_price AS price, ifnull(c.name,'(未分类)') AS category
    FROM items i LEFT JOIN categories c ON c.id = i.category_id
    WHERE i.purchase_price IS NOT NULL AND i.purchase_price > 0 AND ${ACTIVE_ITEM}
    ORDER BY i.purchase_price DESC, i.id LIMIT ?`, limit);
  return rows.map((r) => ({ id: Number(r.id), name: String(r.name), price: Number(r.price), category: String(r.category) }));
}
/** 分类分布（#865）：顶级分类逐项件数＋该类合计价值；无 category_id 归「(未分类)」。 */
export function categoryDistribution(handle: HomeDb): { name: string; count: number; totalValue: number }[] {
  const rows = q(handle, CAT_PATH + `, item_top AS (
      SELECT i.id AS id, ifnull(cp.top_name,'(未分类)') AS name, ifnull(i.purchase_price,0) AS price
      FROM items i LEFT JOIN cat_path cp ON cp.id = i.category_id
      WHERE ${ACTIVE_ITEM}
    )
    SELECT name, count(*) AS count, round(sum(price),2) AS total_value FROM item_top GROUP BY name ORDER BY count DESC, name`);
  return rows.map((r) => ({ name: String(r.name), count: Number(r.count), totalValue: Number(r.total_value) }));
}
/** 位置分布（#865）：位置路径第一段归并（老 `_location_distribution` 口径）。 */
export function locationDistribution(handle: HomeDb): { name: string; count: number }[] {
  const rows = q(handle, `SELECT CASE WHEN instr(location,'/')>0 THEN substr(location,1,instr(location,'/')-1) ELSE location END AS name,
      count(DISTINCT item_id) AS count FROM item_locations WHERE ifnull(location,'')<>'' GROUP BY name ORDER BY count DESC, name`);
  return rows.map((r) => ({ name: String(r.name), count: Number(r.count) }));
}
/** 状态分布（#865）：位置状态逐项件数＋占比（老 `_status_distribution` 口径）。 */
export function statusDistribution(handle: HomeDb): { name: string; count: number; pct: number }[] {
  const rows = q(handle, `SELECT ifnull(location_status,'(未设置)') AS name, count(DISTINCT item_id) AS count
    FROM item_locations GROUP BY name ORDER BY count DESC, name`);
  const total = rows.reduce((a, r) => a + Number(r.count), 0) || 1;
  return rows.map((r) => ({ name: String(r.name), count: Number(r.count), pct: Math.round((Number(r.count) * 1000) / total) / 10 }));
}
/** 归属分布（#865）：items.owner 分组（老 `_owner_distribution` 口径）。 */
export function ownerDistribution(handle: HomeDb): { name: string; count: number }[] {
  const rows = q(handle, `SELECT owner AS name, count(*) AS count FROM items
    WHERE ifnull(owner,'')<>'' GROUP BY owner ORDER BY count DESC, name`);
  return rows.map((r) => ({ name: String(r.name), count: Number(r.count) }));
}
/** 近 N 天变动趋势（#865）：四桶（近7天／8-14天／15-21天／22-30天，老 `_trend_buckets` 分档）。 */
export function recordTrend(handle: HomeDb, days = 30): { days: number; note: string; buckets: { label: string; added: number; discarded: number }[] } {
  const spans: [string, number, number][] = [
    ['近7天', -7, 0], ['8-14天', -14, -7], ['15-21天', -21, -14], ['22-' + Math.max(days, 22) + '天', -Math.max(days, 22), -21],
  ];
  const buckets = spans.map(([label, from, to]) => {
    const a = (one(handle, 'SELECT count(*) AS c FROM items WHERE date(created_at) BETWEEN ? AND ?', localDayAt(from), localDayAt(to)) as unknown as { c: number }).c;
    const d = (one(handle, `SELECT count(DISTINCT i.id) AS c FROM items i JOIN item_locations il ON il.item_id = i.id
      WHERE il.location_status='已废弃' AND date(il.updated_at) BETWEEN ? AND ?`, localDayAt(from), localDayAt(to)) as unknown as { c: number }).c;
    return { label, added: a, discarded: d };
  });
  return { days, note: '录入按物品创建时间；废弃按位置状态改为已废弃的时间', buckets };
}
/** 闲置物品（#865）：逐件闲置天数与来源（访问记录／估算）＋位置、件数、状态。
 *  筛选与排序保持搬迁前口径不变（`last_accessed_at` 空或早于阈值；按 `last_accessed_at` 排序）——
 *  衣物域的「久未穿」把「从未使用」也算在内，消费方各自过滤；`days_idle` 按
 *  `coalesce(last_accessed_at, created_at)` 算（老 `stats/idle.py` 口径，无使用记录按录入日估算）。 */
export function idleItems(handle: HomeDb, days: number): {
  id: number; name: string; category: string; days_idle: number; source: string;
  location: string; quantity: number; status: string;
}[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cut = cutoff.toISOString();
  const rows = q(handle, `SELECT i.id, i.name, ifnull(i.category,'') AS category,
      CAST(julianday(date('now','localtime')) - julianday(date(coalesce(i.last_accessed_at, i.created_at))) AS INTEGER) AS days_idle,
      CASE WHEN i.last_accessed_at IS NULL THEN '估算' ELSE '访问记录' END AS source,
      ifnull((SELECT l.location FROM item_locations l WHERE l.item_id=i.id ORDER BY l.id LIMIT 1),'') AS location,
      ifnull((SELECT sum(l.quantity) FROM item_locations l WHERE l.item_id=i.id),0) AS quantity,
      ifnull((SELECT l.location_status FROM item_locations l WHERE l.item_id=i.id ORDER BY l.id LIMIT 1),'在家') AS status
    FROM items i WHERE (i.last_accessed_at IS NULL OR i.last_accessed_at < ?)
    ORDER BY i.last_accessed_at LIMIT 50`, cut);
  return rows.map((r) => ({
    id: Number(r.id), name: String(r.name), category: String(r.category), days_idle: Number(r.days_idle) || 0,
    source: String(r.source), location: String(r.location), quantity: Number(r.quantity) || 0, status: String(r.status),
  }));
}
/** 过期与预告（#865）：逐条剩余天数（到期日缺为空）＋所在位置与状态。 */
export function expiringItems(handle: HomeDb, days: number, expiredOnly: boolean): {
  item_id: number; location: string; expiration_date: string; item_name: string; category: string;
  days_left: number | null; quantity: number; location_status: string;
}[] { // #817：行标题要物品名（位置不是身份），分类同给。
  const endS = localDayAt(days);
  try {
    const where = expiredOnly
      ? 'l.expiration_date IS NOT NULL AND l.expiration_date < ?'
      : 'l.expiration_date IS NOT NULL AND l.expiration_date <= ?';
    return q(handle, `SELECT l.item_id, l.location, l.expiration_date, ifnull(i.name,'') AS item_name, ifnull(i.category,'') AS category,
        l.quantity AS quantity, ifnull(l.location_status,'在家') AS location_status,
        CAST(julianday(date(l.expiration_date)) - julianday(date('now','localtime')) AS INTEGER) AS days_left
      FROM item_locations l LEFT JOIN items i ON i.id=l.item_id
      WHERE ${where} ORDER BY l.expiration_date, l.id LIMIT 50`, expiredOnly ? localToday() : endS) as unknown as {
      item_id: number; location: string; expiration_date: string; item_name: string; category: string;
      days_left: number | null; quantity: number; location_status: string;
    }[];
  } catch (e) { throw new HomeFetchError('HOME_DB_UNREADABLE', '过期查询失败', { cause: e }); }
}

/** 盘点明细（#865）：表形状自适应——新库读 `missing/extra`，老库（权威 DDL）读 `missing_cnt/extra_cnt/diff_cnt` 等。 */
export function inventoryDetail(handle: HomeDb, limit = 20): {
  rows: { id: number; date: string; scope: string; location: string; missing: number; extra: number; diff: number | null; status: string | null }[];
  total: number;
  diffTotal: number;
} {
  const cols = new Set(q(handle, 'PRAGMA table_info(inventory_records)').map((r) => String(r.name)));
  const pick = (...names: string[]): string => names.find((n) => cols.has(n)) ?? '';
  const sel = (n: string, alias: string): string => (n ? ', ' + n + ' AS ' + alias : ', null AS ' + alias);
  const rows = q(handle, 'SELECT id' + sel(pick('occurred_at', 'created_at'), 'rec_date')
    + sel(pick('scope'), 'rec_scope') + sel(pick('location'), 'rec_loc')
    + sel(pick('missing', 'missing_cnt'), 'rec_missing') + sel(pick('extra', 'extra_cnt'), 'rec_extra')
    + sel(pick('diff_cnt'), 'rec_diff') + sel(pick('status'), 'rec_status')
    + ' FROM inventory_records ORDER BY id DESC');
  const mapped = rows.map((r) => ({
    id: Number(r.id), date: String(r.rec_date ?? ''), scope: String(r.rec_scope ?? ''), location: String(r.rec_loc ?? ''),
    missing: Number(r.rec_missing ?? 0) || 0, extra: Number(r.rec_extra ?? 0) || 0,
    diff: r.rec_diff === null || r.rec_diff === undefined ? null : Number(r.rec_diff),
    status: r.rec_status === null || r.rec_status === undefined ? null : String(r.rec_status),
  }));
  const diffTotal = mapped.reduce((a, r) => a + r.missing + r.extra + (r.diff ?? 0), 0);
  return { rows: mapped.slice(0, limit), total: mapped.length, diffTotal };
}
