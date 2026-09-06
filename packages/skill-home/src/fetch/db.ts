// 取数层·sqlite DB：老家 scripts/home_manager/db.py 对应。
// 基础 5 表 + D1 9 域表，幂等建表 + 8 顶级种子；缺失/损坏大声失败，不返空。
// 真实数据禁迁：仅 fresh DB（测试 tmp 隔离由 paths.ts 守卫）。
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { HomeFetchError } from './errors.js';

export const SCHEMA_VERSION = 1;

export interface HomeItem {
  id: number;
  name: string;
  category: string | null;
  category_id: number | null;
  owner: string;
  purchase_price: number | null;
  remark: string | null;
  photo: string | null;
  access_count: number;
  last_accessed_at: string | null;
  fixed_location: string | null;
  created_at: string;
  updated_at: string;
}

export interface HomeLocation {
  id: number;
  item_id: number;
  location: string;
  quantity: number;
  reason: string | null;
  location_status: string;
  purchase_date: string | null;
  expiration_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface HomeDb {
  db: DatabaseSync;
  path: string;
  initialized: boolean;
}

const TOPS: string[] = [
  '食物与饮品', '衣物与穿戴', '家居与陈设', '工具与器材',
  '数码与电子', '健康与医药', '文体与娱乐', '资产与凭证',
];

function exec(db: DatabaseSync, sql: string): void {
  db.exec(sql);
}

export function openHomeDb(dbPath: string): HomeDb {
  if (typeof dbPath !== 'string' || dbPath.length === 0) {
    throw new HomeFetchError('HOME_DB_MISSING', '居家 DB 路径未指定');
  }
  let db: DatabaseSync;
  try {
    db = new DatabaseSync(dbPath);
  } catch (e) {
    throw new HomeFetchError('HOME_DB_UNREADABLE', '居家 DB 打不开：' + dbPath, { cause: e });
  }
  let initialized = false;
  try {
    db.exec('PRAGMA journal_mode=WAL');
    db.exec('PRAGMA busy_timeout=5000');
    db.exec('PRAGMA foreign_keys=ON');
    const before = (db.prepare("SELECT count(*) AS c FROM sqlite_master WHERE type='table'").get() as { c: number }).c;
    exec(db, `CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, category TEXT, category_id INTEGER REFERENCES categories(id),
      owner TEXT DEFAULT '使用者', purchase_price REAL, remark TEXT, photo TEXT,
      access_count INTEGER NOT NULL DEFAULT 0, last_accessed_at TEXT,
      fixed_location TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    exec(db, `CREATE TABLE IF NOT EXISTS item_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT, item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      location TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 1, reason TEXT,
      location_status TEXT NOT NULL DEFAULT '在家', purchase_date TEXT, expiration_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    exec(db, `CREATE TABLE IF NOT EXISTS item_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT, item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      tag TEXT NOT NULL, UNIQUE(item_id, tag)
    )`);
    exec(db, `CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT, parent_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
      name TEXT NOT NULL, description TEXT, sort_order INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1,
      seed_key TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    exec(db, `CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, platform TEXT UNIQUE NOT NULL,
      username TEXT NOT NULL DEFAULT '', encrypted_password TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT '其他', created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    exec(db, `CREATE TABLE IF NOT EXISTS purchase_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT, item_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
      date TEXT NOT NULL, price REAL, channel TEXT, scene TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    exec(db, `CREATE TABLE IF NOT EXISTS warranties (
      id INTEGER PRIMARY KEY AUTOINCREMENT, item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
      kind TEXT NOT NULL DEFAULT '保修', start_date TEXT NOT NULL, duration_days INTEGER NOT NULL,
      scene TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    exec(db, `CREATE TABLE IF NOT EXISTS service_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT, warranty_id INTEGER NOT NULL REFERENCES warranties(id) ON DELETE CASCADE,
      date TEXT NOT NULL, cost REAL, scene TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    exec(db, `CREATE TABLE IF NOT EXISTS certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, expires_at TEXT NOT NULL,
      holder TEXT, number TEXT, photo TEXT, scene TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    exec(db, `CREATE TABLE IF NOT EXISTS family_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, relation TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    exec(db, `CREATE TABLE IF NOT EXISTS borrow_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT, item_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
      member TEXT NOT NULL, action TEXT NOT NULL DEFAULT '借出', date TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    exec(db, `CREATE TABLE IF NOT EXISTS shopping_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 1,
      routine TEXT, checked INTEGER NOT NULL DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    exec(db, `CREATE TABLE IF NOT EXISTS stock_thresholds (
      id INTEGER PRIMARY KEY AUTOINCREMENT, item_id INTEGER UNIQUE NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      threshold INTEGER NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    exec(db, `CREATE TABLE IF NOT EXISTS item_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT, item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
      event TEXT NOT NULL, detail TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    exec(db, `CREATE TABLE IF NOT EXISTS inventory_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT, scope TEXT NOT NULL DEFAULT 'all', location TEXT,
      total INTEGER NOT NULL DEFAULT 0, missing INTEGER NOT NULL DEFAULT 0, extra INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    exec(db, `CREATE TABLE IF NOT EXISTS location_nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT, path TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    exec(db, 'CREATE INDEX IF NOT EXISTS idx_items_name ON items(name)');
    exec(db, 'CREATE INDEX IF NOT EXISTS idx_items_category_id ON items(category_id)');
    exec(db, 'CREATE INDEX IF NOT EXISTS idx_locs_item ON item_locations(item_id)');
    exec(db, 'CREATE INDEX IF NOT EXISTS idx_locs_location ON item_locations(location)');
    exec(db, 'CREATE INDEX IF NOT EXISTS idx_tags_item ON item_tags(item_id)');
    exec(db, 'CREATE INDEX IF NOT EXISTS idx_tags_tag ON item_tags(tag)');
    exec(db, 'CREATE INDEX IF NOT EXISTS idx_cats_parent ON categories(parent_id)');
    const after = (db.prepare("SELECT count(*) AS c FROM sqlite_master WHERE type='table'").get() as { c: number }).c;
    initialized = before === 0 && after > 0;
    // 8 顶级种子（幂等按 name 去重；余按需增，不做 277 全量）。
    for (const n of TOPS) {
      const hit = db.prepare('SELECT id FROM categories WHERE parent_id IS NULL AND name=?').get(n) as { id: number } | undefined;
      if (!hit) db.prepare('INSERT INTO categories (parent_id, name) VALUES (NULL, ?)').run(n);
    }
  } catch (e) {
    if (e instanceof HomeFetchError) throw e;
    throw new HomeFetchError('HOME_DB_UNREADABLE', '居家 DB 初始化失败：' + dbPath, { cause: e });
  }
  return { db, path: dbPath, initialized };
}

export function closeHomeDb(handle: HomeDb): void {
  try { handle.db.close(); } catch { /* 关闭失败不谎报 */ }
}

function rowItem(r: Record<string, unknown>): HomeItem { return r as unknown as HomeItem; }

// ---- 物品 ----
export function addItem(handle: HomeDb, input: {
  name: string; category: string | null; category_id: number | null; owner?: string;
  purchase_price?: number | null; remark?: string | null; photo?: string | null;
  location: string; quantity?: number; location_status?: string;
  purchase_date?: string | null; expiration_date?: string | null; reason?: string | null; tags?: string[];
}): HomeItem {
  const db = handle.db;
  let id = 0;
  try {
    const r = db.prepare(
      'INSERT INTO items (name, category, category_id, owner, purchase_price, remark, photo) VALUES (?,?,?,?,?,?,?) RETURNING id',
    ).get(input.name, input.category, input.category_id, input.owner ?? '使用者', input.purchase_price ?? null, input.remark ?? null, input.photo ?? null) as { id: number };
    id = r.id;
    db.prepare(
      'INSERT INTO item_locations (item_id, location, quantity, reason, location_status, purchase_date, expiration_date) VALUES (?,?,?,?,?,?,?)',
    ).run(id, input.location, input.quantity ?? 1, input.reason ?? null, input.location_status ?? '在家', input.purchase_date ?? null, input.expiration_date ?? null);
    for (const t of input.tags ?? []) {
      const tag = t.trim();
      if (tag) db.prepare('INSERT OR IGNORE INTO item_tags (item_id, tag) VALUES (?,?)').run(id, tag);
    }
    db.prepare('INSERT INTO item_events (item_id, event, detail) VALUES (?,?,?)').run(id, 'create', input.location);
    db.prepare('INSERT OR IGNORE INTO location_nodes (path) VALUES (?)').run(input.location);
  } catch (e) {
    throw new HomeFetchError('HOME_DB_UNREADABLE', '物品写盘失败', { cause: e });
  }
  return getItemById(handle, id);
}

export function getItemById(handle: HomeDb, id: number): HomeItem {
  if (!Number.isInteger(id) || id <= 0) throw new HomeFetchError('HOME_ITEM_NOT_FOUND', '物品 id 非法：' + String(id));
  let row: unknown = null;
  try { row = handle.db.prepare('SELECT * FROM items WHERE id=?').get(id); }
  catch (e) { throw new HomeFetchError('HOME_DB_UNREADABLE', '物品读取失败：' + id, { cause: e }); }
  if (!row) throw new HomeFetchError('HOME_ITEM_NOT_FOUND', '无此物品：' + id);
  return rowItem(row as Record<string, unknown>);
}

export function listLocationsByItem(handle: HomeDb, itemId: number): HomeLocation[] {
  try {
    return handle.db.prepare('SELECT * FROM item_locations WHERE item_id=? ORDER BY id').all(itemId) as unknown as HomeLocation[];
  } catch (e) { throw new HomeFetchError('HOME_DB_UNREADABLE', '位置读取失败：' + itemId, { cause: e }); }
}

export function listTagsByItem(handle: HomeDb, itemId: number): string[] {
  try {
    const rows = handle.db.prepare('SELECT tag FROM item_tags WHERE item_id=? ORDER BY tag').all(itemId) as { tag: string }[];
    return rows.map((r) => r.tag);
  } catch (e) { throw new HomeFetchError('HOME_DB_UNREADABLE', '标签读取失败：' + itemId, { cause: e }); }
}

export interface SearchFilter {
  name?: string; location?: string; tag?: string; categoryId?: number;
  status?: string; limit?: number; exact?: boolean;
}

export function searchItems(handle: HomeDb, f: SearchFilter): { item: HomeItem; locations: HomeLocation[]; tags: string[] }[] {
  const limit = f.limit ?? 20;
  if (!Number.isInteger(limit) || limit <= 0 || limit > 200) throw new HomeFetchError('HOME_BAD_QUERY', 'limit 须为 1~200 正整数');
  let rows: HomeItem[] = [];
  try {
    if (f.tag !== undefined) {
      rows = handle.db.prepare(
        'SELECT i.* FROM items i JOIN item_tags t ON t.item_id=i.id WHERE t.tag=? ORDER BY i.name LIMIT ?',
      ).all(f.tag, limit) as unknown as HomeItem[];
    } else if (f.categoryId !== undefined) {
      rows = handle.db.prepare('SELECT * FROM items WHERE category_id=? ORDER BY name LIMIT ?').all(f.categoryId, limit) as unknown as HomeItem[];
    } else if (f.name !== undefined && f.exact === true) {
      rows = handle.db.prepare('SELECT * FROM items WHERE name=? ORDER BY name LIMIT ?').all(f.name, limit) as unknown as HomeItem[];
    } else if (f.name !== undefined) {
      rows = handle.db.prepare('SELECT * FROM items WHERE name LIKE ? ORDER BY name LIMIT ?').all('%' + f.name + '%', limit) as unknown as HomeItem[];
    } else {
      rows = handle.db.prepare('SELECT * FROM items ORDER BY name LIMIT ?').all(limit) as unknown as HomeItem[];
    }
  } catch (e) {
    if (e instanceof HomeFetchError) throw e;
    throw new HomeFetchError('HOME_DB_UNREADABLE', '物品搜索失败', { cause: e });
  }
  let out = rows.map((item) => ({ item, locations: listLocationsByItem(handle, item.id), tags: listTagsByItem(handle, item.id) }));
  if (f.location !== undefined) {
    const needle = f.location;
    out = out.filter((r) => r.locations.some((l) => l.location.includes(needle)));
  }
  if (f.status !== undefined) {
    out = out.filter((r) => r.locations.some((l) => l.location_status === f.status));
  }
  // 访问计数：搜索命中即 +1（老家 access_count 语义简化版）。
  try {
    for (const r of out) {
      handle.db.prepare("UPDATE items SET access_count=access_count+1, last_accessed_at=CURRENT_TIMESTAMP WHERE id=?").run(r.item.id);
      r.item.access_count += 1;
    }
  } catch { /* 计数失败不阻断取数 */ }
  return out;
}

export function updateItem(handle: HomeDb, id: number, patch: {
  name?: string; category?: string | null; category_id?: number | null; owner?: string;
  purchase_price?: number | null; remark?: string | null; photo?: string | null; fixed_location?: string | null;
}): HomeItem {
  getItemById(handle, id);
  const sets: string[] = [];
  const vals: (string | number | null)[] = [];
  const allow: (keyof HomeItem)[] = ['name', 'category', 'category_id', 'owner', 'purchase_price', 'remark', 'photo', 'fixed_location'];
  for (const k of allow) {
    const v = (patch as Record<string, unknown>)[k];
    if (v !== undefined) { sets.push(k + '=?'); vals.push(v as string | number | null); }
  }
  if (sets.length) {
    sets.push('updated_at=CURRENT_TIMESTAMP');
    try { handle.db.prepare('UPDATE items SET ' + sets.join(',') + ' WHERE id=?').run(...vals, id); }
    catch (e) { throw new HomeFetchError('HOME_DB_UNREADABLE', '物品更新失败：' + id, { cause: e }); }
    try { handle.db.prepare('INSERT INTO item_events (item_id, event, detail) VALUES (?,?,?)').run(id, 'update', sets.join(',')); } catch { /* 审计失败不阻断 */ }
  }
  return getItemById(handle, id);
}

export function adjustQuantity(handle: HomeDb, id: number, opts: { plus?: number; minus?: number; set?: number; location?: string }): HomeLocation[] {
  const locs = listLocationsByItem(handle, id);
  if (!locs.length) throw new HomeFetchError('HOME_ITEM_NOT_FOUND', '物品无位置记录：' + id);
  let target = locs[0];
  if (opts.location !== undefined) {
    const hit = locs.find((l) => l.location === opts.location);
    if (!hit) throw new HomeFetchError('HOME_ITEM_NOT_FOUND', '指定位置无记录：' + opts.location);
    target = hit;
  }
  let next = target.quantity;
  if (opts.set !== undefined) next = opts.set;
  else if (opts.plus !== undefined) next = target.quantity + opts.plus;
  else if (opts.minus !== undefined) next = target.quantity - opts.minus;
  if (!Number.isInteger(next) || next < 0) throw new HomeFetchError('HOME_BAD_QUERY', '数量须为非负整数');
  try {
    if (next === 0) {
      handle.db.prepare('DELETE FROM item_locations WHERE id=?').run(target.id);
      handle.db.prepare('UPDATE item_locations SET location_status=? WHERE item_id=? AND location_status=?').run('已用完', id, '已用完');
    } else {
      handle.db.prepare('UPDATE item_locations SET quantity=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(next, target.id);
    }
    handle.db.prepare('INSERT INTO item_events (item_id, event, detail) VALUES (?,?,?)').run(id, 'qty', String(target.quantity) + '->' + next);
  } catch (e) {
    if (e instanceof HomeFetchError) throw e;
    throw new HomeFetchError('HOME_DB_UNREADABLE', '数量变更失败：' + id, { cause: e });
  }
  return listLocationsByItem(handle, id);
}

export function setLocationStatus(handle: HomeDb, id: number, status: string, location?: string): HomeLocation[] {
  const locs = listLocationsByItem(handle, id);
  if (!locs.length) throw new HomeFetchError('HOME_ITEM_NOT_FOUND', '物品无位置记录：' + id);
  try {
    if (location !== undefined) {
      const hit = locs.find((l) => l.location === location);
      if (!hit) throw new HomeFetchError('HOME_ITEM_NOT_FOUND', '指定位置无记录：' + location);
      handle.db.prepare('UPDATE item_locations SET location_status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(status, hit.id);
    } else {
      handle.db.prepare('UPDATE item_locations SET location_status=?, updated_at=CURRENT_TIMESTAMP WHERE item_id=?').run(status, id);
    }
    handle.db.prepare('INSERT INTO item_events (item_id, event, detail) VALUES (?,?,?)').run(id, 'status', status);
  } catch (e) {
    if (e instanceof HomeFetchError) throw e;
    throw new HomeFetchError('HOME_DB_UNREADABLE', '状态变更失败：' + id, { cause: e });
  }
  return listLocationsByItem(handle, id);
}

export function moveLocation(handle: HomeDb, id: number, from: string | undefined, to: string): HomeLocation[] {
  const locs = listLocationsByItem(handle, id);
  if (!locs.length) throw new HomeFetchError('HOME_ITEM_NOT_FOUND', '物品无位置记录：' + id);
  let target = locs[0];
  if (from !== undefined) {
    const hit = locs.find((l) => l.location === from);
    if (!hit) throw new HomeFetchError('HOME_ITEM_NOT_FOUND', '原位置无记录：' + from);
    target = hit;
  }
  try {
    handle.db.prepare('UPDATE item_locations SET location=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(to, target.id);
    handle.db.prepare('INSERT OR IGNORE INTO location_nodes (path) VALUES (?)').run(to);
    handle.db.prepare('INSERT INTO item_events (item_id, event, detail) VALUES (?,?,?)').run(id, 'move', target.location + '->' + to);
  } catch (e) {
    if (e instanceof HomeFetchError) throw e;
    throw new HomeFetchError('HOME_DB_UNREADABLE', '位置移动失败：' + id, { cause: e });
  }
  return listLocationsByItem(handle, id);
}

export function setItemTags(handle: HomeDb, id: number, tags: string[]): string[] {
  getItemById(handle, id);
  try {
    handle.db.prepare('DELETE FROM item_tags WHERE item_id=?').run(id);
    for (const t of tags) {
      const tag = t.trim();
      if (tag) handle.db.prepare('INSERT OR IGNORE INTO item_tags (item_id, tag) VALUES (?,?)').run(id, tag);
    }
  } catch (e) { throw new HomeFetchError('HOME_DB_UNREADABLE', '标签更新失败：' + id, { cause: e }); }
  return listTagsByItem(handle, id);
}

// ---- 标签/分类 ----
export function listAllTags(handle: HomeDb): { tag: string; count: number }[] {
  try {
    return handle.db.prepare('SELECT tag, count(*) AS count FROM item_tags GROUP BY tag ORDER BY count DESC').all() as unknown as { tag: string; count: number }[];
  } catch (e) { throw new HomeFetchError('HOME_DB_UNREADABLE', '标签总览失败', { cause: e }); }
}

export function mergeTags(handle: HomeDb, from: string, to: string): number {
  if (!from || !to || from === to) throw new HomeFetchError('HOME_BAD_QUERY', '合标签须给不同 from/to');
  try {
    const rows = handle.db.prepare('SELECT item_id FROM item_tags WHERE tag=?').all(from) as { item_id: number }[];
    let n = 0;
    for (const r of rows) {
      handle.db.prepare('INSERT OR IGNORE INTO item_tags (item_id, tag) VALUES (?,?)').run(r.item_id, to);
      n++;
    }
    handle.db.prepare('DELETE FROM item_tags WHERE tag=?').run(from);
    return n;
  } catch (e) {
    if (e instanceof HomeFetchError) throw e;
    throw new HomeFetchError('HOME_DB_UNREADABLE', '合标签失败', { cause: e });
  }
}

export function listCategories(handle: HomeDb): { id: number; parent_id: number | null; name: string }[] {
  try {
    return handle.db.prepare('SELECT id, parent_id, name FROM categories WHERE is_active=1 ORDER BY parent_id, sort_order, id').all() as unknown as { id: number; parent_id: number | null; name: string }[];
  } catch (e) { throw new HomeFetchError('HOME_DB_UNREADABLE', '分类读取失败', { cause: e }); }
}

export function getCategoryById(handle: HomeDb, id: number): { id: number; parent_id: number | null; name: string } {
  if (!Number.isInteger(id) || id <= 0) throw new HomeFetchError('HOME_BAD_QUERY', '分类 id 非法：' + String(id));
  const row = handle.db.prepare('SELECT id, parent_id, name FROM categories WHERE id=?').get(id) as { id: number; parent_id: number | null; name: string } | undefined;
  if (!row) throw new HomeFetchError('HOME_BAD_QUERY', '无此分类：' + id);
  return row;
}

// ---- 账号（AES-256-CBC + master-key 门） ----
function deriveKey(masterKey: string): Buffer {
  return scryptSync(masterKey, 'home-salt', 32);
}

export function encryptPassword(masterKey: string, plain: string): string {
  const key = deriveKey(masterKey);
  const iv = randomBytes(16);
  const c = createCipheriv('aes-256-cbc', key, iv);
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return iv.toString('hex') + ':' + enc.toString('hex');
}

export function decryptPassword(masterKey: string, stored: string): string {
  const parts = stored.split(':');
  if (parts.length !== 2) throw new HomeFetchError('HOME_ACCOUNT_MISSING', '账号密文损坏');
  const key = deriveKey(masterKey);
  try {
    const d = createDecipheriv('aes-256-cbc', key, Buffer.from(parts[0], 'hex'));
    return Buffer.concat([d.update(Buffer.from(parts[1], 'hex')), d.final()]).toString('utf8');
  } catch (e) { throw new HomeFetchError('HOME_ACCOUNT_BAD_KEY', '主密钥不对或密文损坏', { cause: e }); }
}

export function assertMasterKey(masterKey: unknown): string {
  if (typeof masterKey !== 'string' || masterKey.length < 8) {
    throw new HomeFetchError('HOME_ACCOUNT_BAD_KEY', 'master-key 须 ≥8 位（缺失阻断，不返空）');
  }
  return masterKey;
}
