#!/usr/bin/env node
/** 种子数据：仓内种子脚本＋测试库（票 #802，70 场景所需）。
 *
 * 落点（写死，不接受路径参数——防手滑写生产库）：
 *   库     `.scratch/home-seed/home-seed.db`
 *   照片   `.scratch/home-seed/photos/*.png`（`lib/seed-png.mjs` 自造 64×64 纯色 PNG）
 *   主密钥 `.scratch/home-seed/.master.key`（测试口令，账号加密用；生产密钥不动）
 *
 * 幂等：按（名，位置）去重插入物品，其余表按自然键去重；`_seed_meta` 记版本，
 * 同版本且 `--check` 全绿即直接报 up-to-date，不复写。
 *   默认（无参）  ＝ 补齐到规格（可重跑）
 *   `--reset`     ＝ 删库＋删照片后重灌
 *   `--check`     ＝ 只验不写（验收命令走这条）
 *
 * 生产守卫：种子目录写死在仓内 `.scratch/` 下；启动即断言它不在
 * `D:\\2Study\\StudyNotes\\.db` 之下，也不断言之外的任何写盘。
 * 本脚本任何分支都不拼生产路径、不读生产库。
 *
 * 用法（仓根，经排队）：
 *   node tooling/run-locked.mjs --ticket 802 --max-wait-ms 600000 -- node packages/skill-home/scripts/seed-scenes.mjs [--reset|--check]
 */
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PHOTO_DEFS, writeSolidPng } from './lib/seed-png.mjs';
import { SEED_VERSION, LOCATIONS, FIXED_SPOTS, CATEGORIES_EXTRA, ITEMS, SHOPPING, MEMBERS, BORROWS } from './lib/seed-scenes-data.mjs';
import { runAllChecks } from './lib/seed-scenes-checks.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '..', '..', '..');
const SEED_DIR = join(ROOT, '.scratch', 'home-seed');
const DB_PATH = join(SEED_DIR, 'home-seed.db');
const PHOTOS_DIR = join(SEED_DIR, 'photos');
const KEY_PATH = join(SEED_DIR, '.master.key');
const PROD_PREFIX = 'd:\\2study\\studynotes\\.db';
const TEST_MASTER_KEY = 'seed-test-master-key-802';

function fail(code, msg) {
  console.log('RESULT: ABORT exit=' + code + ' :: ' + msg);
  process.exit(code);
}

function guardSeedDir() {
  const norm = resolve(SEED_DIR).toLowerCase();
  if (norm === PROD_PREFIX || norm.startsWith(PROD_PREFIX + '\\') || norm.startsWith(PROD_PREFIX + '/')) {
    fail(2, '种子目录落在生产目录之下，拒绝运行：' + SEED_DIR);
  }
  if (!norm.includes('.scratch')) fail(2, '种子目录必须在 .scratch/ 下：' + SEED_DIR);
}

function toDate(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

async function loadApi() {
  const url = new URL('../dist/index.js', import.meta.url).href;
  return import(url);
}

function ensureMeta(db) {
  db.exec('CREATE TABLE IF NOT EXISTS _seed_meta (key TEXT PRIMARY KEY, value TEXT)');
}

function metaGet(db, key) {
  try {
    const r = db.prepare('SELECT value FROM _seed_meta WHERE key=?').get(key);
    return r ? String(r.value) : '';
  } catch { return ''; }
}

function metaSet(db, key, value) {
  db.prepare('INSERT INTO _seed_meta (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, value);
}

function seedPhotos() {
  mkdirSync(PHOTOS_DIR, { recursive: true });
  for (const p of PHOTO_DEFS) writeSolidPng(join(PHOTOS_DIR, p.name), p.r, p.g, p.b, 64);
}

function seedKeyFile() {
  mkdirSync(SEED_DIR, { recursive: true });
  if (!existsSync(KEY_PATH)) writeFileSync(KEY_PATH, TEST_MASTER_KEY + '\n', 'utf8');
}

function catIdByName(db, name) {
  const r = db.prepare('SELECT id FROM categories WHERE name=? AND is_active=1 ORDER BY id LIMIT 1').get(name);
  return r ? Number(r.id) : null;
}

function itemExists(db, name, location) {
  const r = db.prepare(
    'SELECT i.id FROM items i JOIN item_locations l ON l.item_id=i.id WHERE i.name=? AND l.location=? LIMIT 1',
  ).get(name, location);
  return r ? Number(r.id) : null;
}

function itemIdByName(db, name) {
  const r = db.prepare('SELECT id FROM items WHERE name=? ORDER BY id LIMIT 1').get(name);
  return r ? Number(r.id) : null;
}

async function seedAll(api) {
  seedPhotos();
  seedKeyFile();
  const { openHomeDb, closeHomeDb } = api;
  const handle = openHomeDb(DB_PATH);
  const db = handle.db;
  try {
    ensureMeta(db);
    // 分类 children（按名去重）
    for (const c of CATEGORIES_EXTRA) {
      const parent = db.prepare('SELECT id FROM categories WHERE parent_id IS NULL AND name=?').get(c.parent);
      if (!parent) continue;
      const hit = db.prepare('SELECT id FROM categories WHERE parent_id=? AND name=?').get(Number(parent.id), c.name);
      if (!hit) db.prepare('INSERT INTO categories (parent_id, name) VALUES (?,?)').run(Number(parent.id), c.name);
    }
    // 位置节点
    for (const p of LOCATIONS) db.prepare('INSERT OR IGNORE INTO location_nodes (path) VALUES (?)').run(p);
    // 物品（按 名＋位置 去重；重名多位置是刻意的 2-6／3-5 数据）
    for (const it of ITEMS) {
      if (itemExists(db, it.name, it.location)) continue;
      const cid = catIdByName(db, it.category);
      const purchaseDate = toDate(it.purchaseOffset);
      const expireDate = it.expireInDays === null || it.expireInDays === undefined
        ? null
        : toDate(it.expireInDays);
      api.addItem(handle, {
        name: it.name,
        category: it.category,
        category_id: cid,
        owner: '使用者',
        purchase_price: it.price ?? null,
        remark: null,
        photo: it.photo || null,
        location: it.location,
        quantity: it.qty ?? 1,
        location_status: it.status ?? '在家',
        purchase_date: purchaseDate,
        expiration_date: expireDate,
        reason: null,
        tags: it.tags ?? [],
      });
    }
    // 固定位（FIXED_SPOTS 按名找第一件）
    for (const f of FIXED_SPOTS) {
      const id = itemIdByName(db, f.item);
      if (id) db.prepare('UPDATE items SET fixed_location=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(f.fixed, id);
    }
    // ITEMS 自带 fixed 列（钥匙等四件，FIXED_SPOTS 之外不再重复也无妨）
    for (const it of ITEMS) {
      if (!it.fixed) continue;
      const id = db.prepare('SELECT i.id FROM items i JOIN item_locations l ON l.item_id=i.id WHERE i.name=? AND l.location=? LIMIT 1').get(it.name, it.location);
      if (id) db.prepare('UPDATE items SET fixed_location=? WHERE id=?').run(it.fixed, Number(id.id));
    }
    // 高频（access_count 模拟使用）＋ 闲置（last_accessed_at 回拨）
    for (const it of ITEMS) {
      if (it.hotCount) {
        const id = itemIdByName(db, it.name);
        if (id) db.prepare('UPDATE items SET access_count=?, last_accessed_at=CURRENT_TIMESTAMP WHERE id=?').run(it.hotCount, id);
      }
      if (it.idleDays) {
        const id = itemIdByName(db, it.name);
        if (id) {
          const d = new Date();
          d.setDate(d.getDate() - it.idleDays);
          db.prepare('UPDATE items SET last_accessed_at=? WHERE id=?').run(d.toISOString(), id);
        }
      }
    }
    // 阈值（名→阈值；qty 失衡的三件进 missing）
    const thresholds = [['大米', 5], ['抽纸', 5], ['洗衣液', 3], ['电池5号', 4], ['垃圾袋', 5]];
    for (const [name, th] of thresholds) {
      const id = itemIdByName(db, name);
      if (id) api.setThreshold(handle, id, th);
    }
    // 购物清单（按名去重）
    for (const s of SHOPPING) {
      const hit = db.prepare('SELECT id FROM shopping_items WHERE name=?').get(s.name);
      if (!hit) api.addShopping(handle, s.name, s.quantity, s.routine);
    }
    // 家人（addMember 自带 OR IGNORE）
    for (const m of MEMBERS) api.addMember(handle, m.name, m.relation);
    // 借用（按 item＋member＋action＋date 去重）
    for (const b of BORROWS) {
      const itemId = itemIdByName(db, b.item);
      const date = toDate(b.dateOffset);
      const hit = db.prepare('SELECT id FROM borrow_records WHERE member=? AND action=? AND date=? AND (item_id IS ? OR item_id=?)').get(b.member, b.action, date, itemId, itemId);
      if (!hit) api.addBorrow(handle, itemId, b.member, b.action, date);
    }
    // 购买记录 8 条（日期随“今天”走：上月 2／今年 3／近 30 天 2／旧 1）
    const purchaseSeeds = [
      { item: '空气炸锅', offset: -6, price: 399, channel: '京东' },
      { item: '儿童水杯', offset: -3, price: 59, channel: '淘宝' },
      { item: '冲锋衣-衣', offset: -35, price: 799, channel: '品牌店' },
      { item: '实木书架', offset: -100, price: 899, channel: '拼多多' },
      { item: '跑步机', offset: -250, price: 2299, channel: '京东' },
      { item: '白色棉T恤-衣', offset: -40, price: 59, channel: '优衣库' },
      { item: '坚果礼盒', offset: -10, price: 88, channel: '超市' },
      { item: '挂面', offset: -20, price: 12, channel: '超市' },
    ];
    // 上月补两条（若本月即上月数据不足，强制按上月 15 日挂两条）
    const lm = new Date();
    lm.setMonth(lm.getMonth() - 1);
    const lmDate = lm.toISOString().slice(0, 7) + '-15';
    purchaseSeeds.push({ item: '大米', offset: 0, date: lmDate, price: 68, channel: '超市' });
    purchaseSeeds.push({ item: '抽纸', offset: 0, date: lmDate, price: 30, channel: '超市' });
    for (const p of purchaseSeeds) {
      const itemId = itemIdByName(db, p.item);
      if (!itemId) continue;
      const date = p.date ?? toDate(p.offset);
      const hit = db.prepare('SELECT id FROM purchase_records WHERE item_id=? AND date=? AND price IS ?').get(itemId, date, p.price);
      if (!hit) api.addPurchase(handle, itemId, date, p.price, p.channel, 'seed-802');
    }
    // 保修 4＋保养 3（start 分散：在保／将到期／已过全覆盖）
    const warrantySeeds = [
      { item: '变频空调', kind: '保修', startOffset: -30, days: 365 },
      { item: '滚筒洗衣机', kind: '保修', startOffset: -340, days: 365 },
      { item: '笔记本电脑', kind: '保修', startOffset: -400, days: 365 },
      { item: '扫地机器人', kind: '保修', startOffset: -200, days: 365 },
      { item: '净水器', kind: '保养', startOffset: -80, days: 90 },
      { item: '油烟机', kind: '保养', startOffset: -170, days: 180 },
      { item: '变频空调', kind: '保养', startOffset: -350, days: 365 },
    ];
    const warrantyIds = [];
    for (const w of warrantySeeds) {
      const itemId = itemIdByName(db, w.item);
      if (!itemId) continue;
      const start = toDate(w.startOffset);
      const hit = db.prepare('SELECT id FROM warranties WHERE item_id=? AND kind=? AND start_date=?').get(itemId, w.kind, start);
      if (hit) { warrantyIds.push(Number(hit.id)); continue; }
      warrantyIds.push(api.addWarranty(handle, itemId, w.kind, start, w.days, 'seed-802'));
    }
    // 服务事件 4 条（2 维修＋2 保养执行，挂前两条 warranty）
    const serviceSeeds = [
      { w: 0, offset: -10, cost: 120 },
      { w: 1, offset: -20, cost: 0 },
      { w: 4, offset: -5, cost: 80 },
      { w: 5, offset: -8, cost: 60 },
    ];
    for (const s of serviceSeeds) {
      const wid = warrantyIds[s.w];
      if (!wid) continue;
      const date = toDate(s.offset);
      const hit = db.prepare('SELECT id FROM service_events WHERE warranty_id=? AND date=?').get(wid, date);
      if (!hit) api.addServiceEvent(handle, wid, date, s.cost, 'seed-802');
    }
    // 证件 6 条（过期／今天／将到期／有效全覆盖；2 条带照片供 SM6-13）
    const certSeeds = [
      { type: '身份证', expiresOffset: 900, holder: '使用者', number: '110101199001011234', photo: '' },
      { type: '护照', expiresOffset: 15, holder: '使用者', number: 'E12345678', photo: '' },
      { type: '驾驶证', expiresOffset: -10, holder: '使用者', number: 'D87654321', photo: '' },
      { type: '社保卡', expiresOffset: 600, holder: '使用者', number: 'S11223344', photo: '' },
      { type: '房产证', expiresOffset: 3650, holder: '爸爸', number: 'F99887766', photo: 'seed-cert-id.png' },
      { type: '结婚证', expiresOffset: 3650, holder: '爸爸', number: 'M55667788', photo: 'seed-cert-passport.png' },
    ];
    for (const c of certSeeds) {
      const exp = toDate(c.expiresOffset);
      const hit = db.prepare('SELECT id FROM certificates WHERE type=? AND holder=?').get(c.type, c.holder);
      if (!hit) api.addCert(handle, c.type, exp, c.holder, c.number, c.photo || null, 'seed-802');
    }
    // 账号 4 条（测试主密钥加密；平台唯一，去重）
    const { encryptPassword } = api;
    const accountSeeds = [
      { platform: '淘宝', user: 'home-user', pass: 'seed-pass-taobao-01', type: '购物' },
      { platform: '工商银行', user: 'home-user', pass: 'seed-pass-bank-02', type: '银行' },
      { platform: '微信', user: 'home-user', pass: 'seed-pass-social-03', type: '社交' },
      { platform: 'GitHub', user: 'home-user', pass: 'seed-pass-other-04', type: '其他' },
    ];
    for (const a of accountSeeds) {
      const hit = db.prepare('SELECT platform FROM accounts WHERE platform=?').get(a.platform);
      if (!hit) {
        const enc = encryptPassword(TEST_MASTER_KEY, a.pass);
        db.prepare('INSERT INTO accounts (platform, username, encrypted_password, type) VALUES (?,?,?,?)').run(a.platform, a.user, enc, a.type);
      }
    }
    // 盘点 3 条（all／客厅／卧室；第一条 Cohen missing/extra 模拟差异供 6-2）
    const invCount = Number(db.prepare('SELECT count(*) AS c FROM inventory_records').get().c);
    if (invCount < 3) {
      const totalAll = Number(db.prepare('SELECT count(*) AS c FROM item_locations').get().c);
      const totalLiving = Number(db.prepare("SELECT count(*) AS c FROM item_locations WHERE location LIKE '客厅/%'").get().c);
      const totalBed = Number(db.prepare("SELECT count(*) AS c FROM item_locations WHERE location LIKE '卧室/%'").get().c);
      const id1 = api.addInventoryRecord(handle, 'all', null, totalAll);
      api.addInventoryRecord(handle, 'location', '客厅', totalLiving);
      api.addInventoryRecord(handle, 'location', '卧室', totalBed);
      db.prepare('UPDATE inventory_records SET missing=2, extra=1 WHERE id=?').run(id1);
    }
    // 关联事件 3 条（3-7 落 `item_events.event='relate'`，detail 带关系类型；不断言之外的迁移）
    const relatePairs = [['手机充电器', '充电线', '配件'], ['电视遥控器', '电池5号', '配套'], ['白色运动鞋-鞋', '速干T恤-衣', '常用搭配']];
    for (const [a, b, rel] of relatePairs) {
      const ida = itemIdByName(db, a);
      const idb = itemIdByName(db, b);
      if (!ida || !idb) continue;
      const hit = db.prepare("SELECT id FROM item_events WHERE item_id=? AND event='relate' AND detail=?").get(ida, idb + ':' + rel);
      if (!hit) db.prepare('INSERT INTO item_events (item_id, event, detail) VALUES (?,?,?)').run(ida, 'relate', idb + ':' + rel);
    }
    metaSet(db, 'version', SEED_VERSION);
    metaSet(db, 'seeded_at', new Date().toISOString());
  } finally {
    closeHomeDb(handle);
  }
}

async function main() {
  guardSeedDir();
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log('用法: node packages/skill-home/scripts/seed-scenes.mjs [--reset|--check]');
    console.log('落点: .scratch/home-seed/home-seed.db ＋ photos/ ＋ .master.key（写死，不接受路径参数）');
    process.exit(0);
  }
  const wantReset = args.includes('--reset');
  const wantCheck = args.includes('--check');
  if (wantReset && wantCheck) fail(2, '--reset 与 --check 互斥');
  mkdirSync(SEED_DIR, { recursive: true });
  const api = await loadApi();
  if (wantReset) {
    for (const suffix of ['', '-wal', '-shm', '-journal']) {
      const p = DB_PATH + suffix;
      try { if (existsSync(p)) rmSync(p); } catch (e) { fail(2, '删库失败 ' + p + ' :: ' + e.message); }
    }
    try { if (existsSync(PHOTOS_DIR)) rmSync(PHOTOS_DIR, { recursive: true }); } catch (e) { fail(2, '删照片失败 :: ' + e.message); }
    console.log('RESET: 已清空 ' + SEED_DIR);
  }
  if (!wantCheck) {
    // 同版本且已全绿＝幂等直返
    if (!wantReset && existsSync(DB_PATH)) {
      try {
        const { openHomeDb, closeHomeDb } = api;
        const probe = openHomeDb(DB_PATH);
        try {
          ensureMeta(probe.db);
          const ver = metaGet(probe.db, 'version');
          if (ver === SEED_VERSION) {
            const r = await runAllChecks(probe, api, SEED_DIR);
            if (r.failed === 0) {
              console.log('RESULT: PASS 70/' + r.total + ' :: up-to-date ' + SEED_VERSION);
              closeHomeDb(probe);
              return;
            }
          }
        } finally {
          closeHomeDb(probe);
        }
      } catch { /* 探针失败即往下重灌，不静默当绿 */ }
    }
    await seedAll(api);
    console.log('SEED: 已灌入 ' + DB_PATH);
  }
  if (!existsSync(DB_PATH)) fail(1, '种子库不存在（--check 前须先跑一次灌库）：' + DB_PATH);
  const { openHomeDb, closeHomeDb } = api;
  const handle = openHomeDb(DB_PATH);
  try {
    const r = await runAllChecks(handle, api, SEED_DIR);
    console.log('RESULT: ' + (r.total - r.failed) + '/' + r.total);
    console.log(r.failed === 0 ? 'PASS' : 'FAIL');
    if (r.failed !== 0) {
      console.log('HINT: 跑一次不带参补齐：node packages/skill-home/scripts/seed-scenes.mjs');
      process.exit(1);
    }
  } finally {
    closeHomeDb(handle);
  }
}

main().catch((e) => fail(2, '未捕获异常 :: ' + (e?.stack ?? e)));
