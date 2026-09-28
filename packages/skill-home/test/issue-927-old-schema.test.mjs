import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// #927 回归：老库 items 表没有 category 列，只有 category_id；
// 取数层一律走 categories JOIN，4 条唤醒词链路在老结构上不许再报 no such column。
const {
  listPurchases, listBorrows, idleItems, expiringItems,
} = await import('../dist/fetch/domains.js');
const { runShoppingQuery } = await import('../dist/express/shopping.js');
const { runOutfitPick } = await import('../dist/outfit/outfit.js');

let db;
function handle() { return { db, path: ':memory:', initialized: false }; }

before(() => {
  const dir = mkdtempSync(join(tmpdir(), 'home927-'));
  db = new DatabaseSync(join(dir, 'old.db'));
  db.exec(`CREATE TABLE categories (id INTEGER PRIMARY KEY AUTOINCREMENT, parent_id INTEGER, name TEXT NOT NULL)`);
  // 注意：故意不建 category 列，复刻线上老库结构
  db.exec(`CREATE TABLE items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category_id INTEGER REFERENCES categories(id), owner TEXT, purchase_price REAL, remark TEXT, photo TEXT, access_count INTEGER DEFAULT 0, last_accessed_at TEXT, fixed_location TEXT, created_at TEXT DEFAULT (datetime('now','localtime')), updated_at TEXT)`);
  db.exec(`CREATE TABLE purchase_records (id INTEGER PRIMARY KEY AUTOINCREMENT, item_id INTEGER, date TEXT NOT NULL, price REAL, channel TEXT, scene TEXT)`);
  db.exec(`CREATE TABLE borrow_records (id INTEGER PRIMARY KEY AUTOINCREMENT, item_id INTEGER, member TEXT NOT NULL, action TEXT, date TEXT NOT NULL)`);
  db.exec(`CREATE TABLE item_locations (id INTEGER PRIMARY KEY AUTOINCREMENT, item_id INTEGER NOT NULL, location TEXT NOT NULL, quantity INTEGER DEFAULT 1, location_status TEXT DEFAULT '在家', purchase_date TEXT, expiration_date TEXT, created_at TEXT, updated_at TEXT)`);
  db.exec(`CREATE TABLE item_tags (id INTEGER PRIMARY KEY AUTOINCREMENT, item_id INTEGER NOT NULL, tag TEXT NOT NULL)`);
  db.exec(`CREATE TABLE stock_thresholds (id INTEGER PRIMARY KEY AUTOINCREMENT, item_id INTEGER UNIQUE NOT NULL, threshold INTEGER NOT NULL)`);
  db.prepare(`INSERT INTO categories (id, name) VALUES (1, '衣物与穿戴')`).run();
  db.prepare(`INSERT INTO items (id, name, category_id, last_accessed_at, created_at) VALUES (1, '羽绒服', 1, NULL, '2025-01-01')`).run();
  db.prepare(`INSERT INTO purchase_records (item_id, date, price, channel) VALUES (1, '2026-01-01', 100, '商场')`).run();
  db.prepare(`INSERT INTO borrow_records (item_id, member, action, date) VALUES (1, '家人', '借出', '2026-01-02')`).run();
  db.prepare(`INSERT INTO item_locations (item_id, location, quantity, location_status, purchase_date, expiration_date) VALUES (1, '阳台', 1, '快递中', '2026-09-20', '2026-10-20')`).run();
});

describe('#927 老库无 category 列时 4 条链路可用', () => {
  it('listPurchases 带出分类名', () => {
    const rows = listPurchases(handle(), {});
    assert.equal(rows.length, 1);
    assert.equal(rows[0].item_name, '羽绒服');
    assert.equal(rows[0].item_category, '衣物与穿戴');
  });
  it('listBorrows 带出分类名', () => {
    const rows = listBorrows(handle());
    assert.equal(rows.length, 1);
    assert.equal(rows[0].item_name, '羽绒服');
    assert.equal(rows[0].item_category, '衣物与穿戴');
  });
  it('shopping express 不再 no such column', () => {
    const out = runShoppingQuery({ kind: 'express' }, handle());
    assert.ok(out.items.length >= 1);
    assert.equal(out.items[0].category_name, '衣物与穿戴');
  });
  it('outfit pick 按名命中衣物', () => {
    const out = runOutfitPick({ kind: 'pick' }, handle());
    assert.ok(out.items.length >= 1 || out.total >= 1 || (out.outfit && out.outfit.gap));
  });
  it('idleItems/expiringItems 走 JOIN', () => {
    const idle = idleItems(handle(), 1);
    assert.ok(idle.length >= 1);
    assert.equal(idle[0].category, '衣物与穿戴');
    const exp = expiringItems(handle(), 60, false);
    assert.ok(exp.length >= 1);
    assert.equal(exp[0].category, '衣物与穿戴');
  });
});
