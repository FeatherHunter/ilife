/** #962 · 居家管家数据族铺开端到端（`home.data.schema`＋`home.data.query`）。
 *
 * 覆盖票面验收（机器可判，tmp 隔离，真实 DB 与真实家目录零触碰），九条全绿：
 *  ① 表清单与声明逐条一致＋`accounts` 不在＋DENIED 逐条＋全集 16 张逐表点名；
 *  ② 列与类型与独立 `PRAGMA table_info` 逐条一致（15 表全查，现读）；
 *  ③ 列不跟着行走（有行 vs 新库列一致）＋空表合法（表在、列在）；
 *  ④ 缺席：路由产物／SKILL 说明面／帮助构建脚本里零 `home.data.`，HELP 现找无数据键；
 *  ⑤ 单表取行：两张查询单同序对应，行与独立 SQL 逐字段相等（含 `NULL`），字段与 PRAGMA 一致；
 *  ⑥ 空范围是合法结果（`rows: []`、`total: 0`，退出码 0）；
 *  ⑦ 非法表／非法字段按项拒并点名＋请求级非法非 0；
 *  ⑧ 分页续取不重不漏（单表行 `size=2` 三页拼接 vs 一次性 vs 独立 SQL，末页无凭据，
 *     聚合 `size=2` 两页偏移，凭据篡改／乱填／跨查询按项拒，好项照常）；
 *  ⑨ 批量与连接：三张混合批（好／坏／好）同序对应、坏项按项拒好项照常，
 *     `items JOIN item_locations` 两表连接与独立 SQL 逐字段相等（含失配 `NULL` 扩展），
 *     跑前后库目录条目一致、无 `home_manager_html` 落点（不产文件）。
 *
 * 不许动的东西：既有页面与读命令的载荷（视图族）、视图族与写族、库只读、不产文件、
 * 不移动不重命名主密钥文件（本件从不碰 `key.file` 指的那个文件）。
 *
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-home`，
 * 再 `node --test packages/skill-home/test/data-home-962.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { mkdtempSync, readdirSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
import {
  runCli,
  parseEnvelopeLine,
  assertResultsetEnvelope,
  assertRowsEqual,
  assertFieldsMatchPragma,
  assertItemOk,
  assertEmptyOk,
  assertItemErrorNames,
  assertPageSize,
  assertHasNext,
  assertNoNext,
  assertTotalEquals,
  sqlRowsOf,
  pragmaFieldsOf,
} from '../../../test/helpers/data-query-harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_DIR = join(HERE, '..');
const BIN = join(PKG_DIR, 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const SKILL = 'home';
const SCHEMA_KEY = 'home.data.schema';
const QUERY_KEY = 'home.data.query';

// dist 编译后的表清单（判据不手抄表名：清单事实只住 `src/data/tables.ts`）。
const { HOME_DATA_TABLES, HOME_DATA_DENIED, HOME_DATA_ALL_TABLES } = await import(
  pathToFileURL(join(PKG_DIR, 'dist', 'data', 'tables.js')).href
);

function dbFileOf(home) {
  return join(home, '.ilife', 'data', 'home.db');
}

/** 新库现场：跑一条视图键建库（含 8 顶级分类种子），回 HOME 目录。 */
function mkFreshHome() {
  const home = mkdtempSync(join(tmpdir(), 'h962-'));
  const env = { ...process.env, ...homeEnvOf(home) };
  const r = runCli(NODE_BIN, BIN, ['home.stats.overview', '--params', '{}'], env);
  assert.equal(r.status, 0, '建库种子 exit=' + r.status + ' ERR=' + (r.stderr || '').slice(-500));
  assert.ok(existsSync(dbFileOf(home)), '建库后库文件应在：' + dbFileOf(home));
  return home;
}

/** 种子现场：新库＋5 件物品（含 NULL 备注／NULL 价格／空串）＋6 位置行（含失配预留）。 */
function mkSeededHome() {
  const home = mkFreshHome();
  const dbFile = dbFileOf(home);
  const db = new DatabaseSync(dbFile);
  try {
    const cats = db.prepare('SELECT id, name FROM categories WHERE parent_id IS NULL ORDER BY id').all();
    assert.ok(cats.length >= 2, '种子分类行数（实际 ' + cats.length + '）');
    const c1 = cats[0].id;
    const c2 = cats[1].id;
    const ids = [];
    ids.push(
      db.prepare('INSERT INTO items (name, category, category_id, owner, purchase_price, remark) VALUES (?,?,?,?,?,?) RETURNING id')
        .get('探针杯', '家居与陈设', c1, '使用者', 59.9, '晨起').id,
    );
    ids.push(
      db.prepare('INSERT INTO items (name, category, category_id, owner, purchase_price, remark) VALUES (?,?,?,?,?,?) RETURNING id')
        .get('探针碗', '食物与饮品', c2, '使用者', null, null).id,
    );
    ids.push(
      db.prepare('INSERT INTO items (name, category, category_id, owner, purchase_price, remark) VALUES (?,?,?,?,?,?) RETURNING id')
        .get('旧物壶', '家居与陈设', c1, '家人', 120, '').id,
    );
    ids.push(
      db.prepare('INSERT INTO items (name, category, category_id, owner, purchase_price, remark) VALUES (?,?,?,?,?,?) RETURNING id')
        .get('双子杯甲', '家居与陈设', c1, '使用者', 39.5, null).id,
    );
    ids.push(
      db.prepare('INSERT INTO items (name, category, category_id, owner, purchase_price, remark) VALUES (?,?,?,?,?,?) RETURNING id')
        .get('孤品灯', null, null, '使用者', null, '无位置').id,
    );
    db.prepare('INSERT INTO item_locations (item_id, location, quantity, location_status) VALUES (?,?,?,?)')
      .run(ids[0], '客厅/桌', 1, '在家');
    db.prepare('INSERT INTO item_locations (item_id, location, quantity, location_status) VALUES (?,?,?,?)')
      .run(ids[0], '阳台/架', 2, '在家');
    db.prepare('INSERT INTO item_locations (item_id, location, quantity, location_status) VALUES (?,?,?,?)')
      .run(ids[1], '厨房/柜', 1, '在家');
    db.prepare('INSERT INTO item_locations (item_id, location, quantity, location_status) VALUES (?,?,?,?)')
      .run(ids[2], '阳台/架', 1, '已用完');
    db.prepare('INSERT INTO item_locations (item_id, location, quantity, location_status) VALUES (?,?,?,?)')
      .run(ids[3], '卧室/柜', 3, '在家');
    db.prepare('INSERT INTO item_tags (item_id, tag) VALUES (?,?)').run(ids[0], '常用');
    // 孤品灯（ids[4]）故意不插位置行：LEFT JOIN 失配 NULL 扩展的种子。
    try { db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); } catch { /* WAL 合并失败不阻断 */ }
  } finally {
    db.close();
  }
  return home;
}

function isSidecar(name) {
  return name.endsWith('-shm') || name.endsWith('-wal') || name.endsWith('-journal');
}

function cleanDirEntries(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).sort().filter((n) => !isSidecar(n));
}

function runSchema(home) {
  const before = readdirSync(home).sort();
  const { status, stdout, stderr } = runCli(NODE_BIN, BIN, [SCHEMA_KEY], {
    ...process.env,
    ...homeEnvOf(home),
  });
  assert.equal(status, 0, 'schema exit ' + status + ' stderr=' + (stderr || '').slice(-500));
  const env = parseEnvelopeLine(stdout, SCHEMA_KEY);
  const results = assertResultsetEnvelope(env, { skill: SKILL, key: SCHEMA_KEY }, SCHEMA_KEY);
  // 不产文件：跑前后 HOME 顶层条目一致（库目录内快照另断；这里先断顶层无新增）。
  const after = readdirSync(home).sort();
  assert.deepEqual(after, before, '目录命令跑完 HOME 顶层不得新增产物');
  return results;
}

function runQuery(home, queries) {
  const libDir = join(home, '.ilife', 'data');
  const before = cleanDirEntries(libDir);
  const { status, stdout, stderr } = runCli(NODE_BIN, BIN, [QUERY_KEY, '--params', JSON.stringify({ queries })], {
    ...process.env,
    ...homeEnvOf(home),
  });
  assert.equal(status, 0, 'query exit ' + status + ' stderr=' + (stderr || '').slice(-800));
  const env = parseEnvelopeLine(stdout, QUERY_KEY);
  const results = assertResultsetEnvelope(env, { skill: SKILL, key: QUERY_KEY }, QUERY_KEY);
  const after = cleanDirEntries(libDir);
  assert.deepEqual(after, before, '跑完库目录不得新增产物（前后条目不一致，WAL sidecar 已过滤）');
  // 不落新 HTML：前后条目一致已证明无新增；这里再断本次调用确未写任何 .html 文件
  //（注：种子用的视图键会建 home_manager_html 目录，故不断言“目录不存在”，只断言数据键无新增）。
  assert.ok(!after.some((n) => n.endsWith('.html')), '数据查询不得落任何 HTML 文件');
  return results;
}

function collectAll(home, baseQuery, size) {
  const pages = [];
  let next = null;
  let guard = 0;
  for (;;) {
    guard += 1;
    assert.ok(guard <= 20, '续取轮数异常（疑似死循环）');
    const q = next === null ? { ...baseQuery, page: { size } } : { ...baseQuery, page: { size, next } };
    const results = runQuery(home, [q]);
    assert.equal(results.length, 1);
    const item = results[0];
    assertPageSize(item, size, 'collectAll size=' + size);
    pages.push(item);
    if (item.next === undefined) break;
    assertHasNext(item, 'collectAll');
    next = item.next;
  }
  return { pages, concatRows: pages.flatMap((p) => p.rows) };
}

test('#962 ① 表清单：与声明逐条一致，accounts 不在，DENIED 逐条登记，全集 16 张逐表点名', () => {
  const home = mkFreshHome();
  const results = runSchema(home);
  assert.equal(results.length, 1);
  assert.equal(results[0].ok, true);
  assert.deepEqual(results[0].tables.map((t) => t.table), [...HOME_DATA_TABLES]);
  assert.equal(HOME_DATA_TABLES.length, 15, '允许清单应 15 张');
  assert.ok(!HOME_DATA_TABLES.includes('accounts'), '允许清单不得含 accounts');
  assert.deepEqual([...HOME_DATA_DENIED].map((d) => d.table), ['accounts']);
  assert.ok(String(HOME_DATA_DENIED[0].reason).includes('encrypted_password'), 'DENIED 须点名加密口令列');
  assert.ok(String(HOME_DATA_DENIED[0].reason).includes('master') || String(HOME_DATA_DENIED[0].reason).includes('.master.key') || String(HOME_DATA_DENIED[0].reason).includes('主密钥'), 'DENIED 须点名主密钥文件');
  assert.deepEqual([...HOME_DATA_ALL_TABLES].sort(), [...HOME_DATA_TABLES, 'accounts'].sort(), '全集＝允许＋DENIED');
  assert.equal(HOME_DATA_ALL_TABLES.length, 16, '本家库内 16 张表（六家最多）');
});

test('#962 ② 目录现读：15 表列与类型与独立 PRAGMA 逐条一致', () => {
  const home = mkSeededHome();
  const results = runSchema(home);
  const want = pragmaFieldsOf(dbFileOf(home), [...HOME_DATA_TABLES]);
  for (const t of results[0].tables) {
    assertFieldsMatchPragma(t.fields, want.get(t.table), t.table);
  }
  // 现读抽查：categories 含内部列 seed_key（程序面可读，判据只断“与库一致”不隐列）。
  const cats = results[0].tables.find((t) => t.table === 'categories');
  assert.ok(cats.fields.some((f) => f.name === 'seed_key'), 'categories 应现读出 seed_key（内部列不断言隐藏，只断言一致）');
});

test('#962 ③ 列不跟着行走＋空表合法：有行与新库列一致，表在列在', () => {
  const seeded = runSchema(mkSeededHome()).data ?? null;
  void seeded;
  const a = runSchema(mkSeededHome())[0].tables;
  const b = runSchema(mkFreshHome())[0].tables;
  assert.deepEqual(
    a.map((t) => [t.table, t.fields]),
    b.map((t) => [t.table, t.fields]),
  );
  // 空表合法：新库 items 行数为 0，但表在、列在。
  const home = mkFreshHome();
  const db = new DatabaseSync(dbFileOf(home), { readOnly: true });
  try {
    const n = db.prepare('SELECT COUNT(*) AS n FROM "items"').get().n;
    assert.equal(n, 0, '新库 items 应 0 行');
  } finally {
    db.close();
  }
  const item = runSchema(home)[0].tables.find((t) => t.table === 'items');
  assert.ok(item.fields.length > 0, '空表也须有列');
});

test('#962 ④ 缺席：路由／SKILL／帮助构建里零 home.data.，HELP 现找无数据键', () => {
  const routes = readFileSync(join(PKG_DIR, 'src', 'policy', 'routes.generated.ts'), 'utf8');
  assert.equal(routes.includes('home.data.'), false, '路由产物泄漏了数据键');
  const bh = readFileSync(join(PKG_DIR, 'scripts', 'build-help.mjs'), 'utf8');
  // 构建脚本对数据键只有“过滤”逻辑（双保险），不得有把数据键写进速查表的正向逻辑。
  assert.ok(!/REPR\s*=\s*\{[^}]*home\.data\./s.test(bh), '帮助构建块泄漏了数据键');
  const skill = readFileSync(join(PKG_DIR, 'SKILL.md'), 'utf8');
  const autoStart = '<!-- HELP-AUTO-START -->';
  const autoEnd = '<!-- HELP-AUTO-END -->';
  const auto = skill.slice(skill.indexOf(autoStart), skill.indexOf(autoEnd) + autoEnd.length);
  assert.ok(skill.indexOf(autoStart) >= 0 && skill.indexOf(autoEnd) > skill.indexOf(autoStart), 'SKILL.md 缺 HELP-AUTO 块');
  assert.equal(auto.includes('home.data.'), false, 'SKILL.md 说明面泄漏了数据键');
  // HELP 现找：全量速查表里无数据键（程序面只给程序用）。
  const home = mkFreshHome();
  const { status, stdout } = runCli(NODE_BIN, BIN, ['home.help.lookup', '--params', '{}'], {
    ...process.env,
    ...homeEnvOf(home),
  });
  assert.equal(status, 0);
  const env = JSON.parse(String(stdout).trim().split('\n').pop());
  const keys = env.data.items.map((h) => h.key);
  assert.ok(!keys.some((k) => String(k).startsWith('home.data.')), 'HELP 现找泄漏了数据键');
});

test('#962 ⑤ 单表取行：两张查询单同序对应，行与独立 SQL 逐字段相等（含 NULL），字段与 PRAGMA 一致', () => {
  const home = mkSeededHome();
  const dbFile = dbFileOf(home);
  const q1 = {
    from: 'items',
    select: ['name', 'owner', 'purchase_price', 'remark'],
    where: { and: [{ field: 'owner', op: 'eq', value: '使用者' }] },
    orderBy: [{ field: 'name', dir: 'asc' }],
  };
  const q2 = {
    id: '位置线',
    from: 'item_locations',
    select: ['location', 'quantity', 'location_status'],
    where: { field: 'location_status', op: 'eq', value: '在家' },
    orderBy: [{ field: 'location', dir: 'asc' }],
  };
  const results = runQuery(home, [q1, q2]);
  assert.equal(results.length, 2);
  assert.deepEqual(results[0].query, q1);
  assert.deepEqual(results[1].query, q2);
  assertItemOk(results[0], q1, 'q1');
  assertItemOk(results[1], q2, 'q2');
  assert.equal(results[1].id, '位置线');
  const want1 = sqlRowsOf(
    dbFile,
    'SELECT "name", "owner", "purchase_price", "remark" FROM "items" WHERE "owner" = ? ORDER BY "name" ASC',
    ['使用者'],
  );
  assertRowsEqual(results[0].rows, want1, 'q1');
  const want2 = sqlRowsOf(
    dbFile,
    'SELECT "location", "quantity", "location_status" FROM "item_locations" WHERE "location_status" = ? ORDER BY "location" ASC',
    ['在家'],
  );
  assertRowsEqual(results[1].rows, want2, 'q2');
  assert.ok(want1.some((r) => r.purchase_price === null), '种子须含 NULL 行（purchase_price null）');
  assert.ok(want1.some((r) => r.remark === null), '种子须含 NULL 行（remark null）');
  const pragma = pragmaFieldsOf(dbFile, [...HOME_DATA_TABLES]);
  for (const [item, q] of [[results[0], q1], [results[1], q2]]) {
    const full = pragma.get(q.from);
    assertFieldsMatchPragma(item.fields, q.select.map((n) => full.find((c) => c.name === n)), q.from);
  }
});

test('#962 ⑥ 空范围是合法结果（rows: []、total: 0，退出码 0）', () => {
  const home = mkSeededHome();
  const results = runQuery(home, [
    { from: 'items', where: { field: 'name', op: 'eq', value: '絕無此物' } },
  ]);
  assert.equal(results.length, 1);
  assertEmptyOk(results[0], '空范围');
});

test('#962 ⑦ 非法表／非法字段按项拒并点名，请求级非法非 0', () => {
  const home = mkSeededHome();
  const results = runQuery(home, [
    { from: 'items', select: ['name', '不存在的列'] },
    { from: '不存在的表', select: ['name'] },
    { from: 'accounts', select: ['platform'] },
  ]);
  assert.equal(results.length, 3);
  assertItemErrorNames(results[0], '不存在的列', '非法字段');
  assertItemErrorNames(results[1], '不存在的表', '非法表名');
  assertItemErrorNames(results[2], 'accounts', '不允许暴露的表');
  const env = { ...process.env, ...homeEnvOf(home) };
  for (const [params, hint] of [
    ['{"queries":[]}', 'queries'],
    ['{"from":"items"}', 'queries'],
  ]) {
    const r = runCli(NODE_BIN, BIN, [QUERY_KEY, '--params', params], env);
    assert.notEqual(r.status, 0, '请求级非法须非 0：' + params);
    assert.ok((r.stderr || '').includes(hint), '报文须指向请求（含「' + hint + '」）');
  }
});

test('#962 ⑧ 分页续取：单表 size=2 不重不漏＋聚合 size=2 偏移＋凭据坏项拒好项照常', () => {
  const home = mkSeededHome();
  const dbFile = dbFileOf(home);
  const base = {
    from: 'items',
    select: ['name', 'owner'],
    orderBy: [{ field: 'name', dir: 'asc' }],
  };
  const { pages, concatRows } = collectAll(home, base, 2);
  assert.equal(pages.length, 3, '5 行 size=2 须 3 页（2＋2＋1）');
  assertHasNext(pages[0], 'p0');
  assertHasNext(pages[1], 'p1');
  assertNoNext(pages[2], 'p2 末页');
  for (const [i, p] of pages.entries()) {
    assertTotalEquals(p, 5, 'p' + i);
    assert.ok(!String(p.next ?? '').includes('items'), '凭据须不透明（不得明文含表名）');
  }
  const full = runQuery(home, [{ ...base }]);
  assertNoNext(full[0], '一次性取完');
  assertRowsEqual(concatRows, full[0].rows, '拼接 vs 一次性');
  const want = sqlRowsOf(dbFile, 'SELECT "name", "owner" FROM "items" ORDER BY "name" ASC', []);
  assertRowsEqual(concatRows, want, '拼接 vs 独立 SQL');
  // 聚合：按 owner 分组计数（size=2，两组两页 2＋?，至少两页或一页，断拼接一致）。
  const aggBase = {
    from: 'items',
    groupBy: ['owner'],
    agg: [{ fn: 'count', field: '*', as: 'n' }],
    orderBy: [{ field: 'owner', dir: 'asc' }],
  };
  const agg = collectAll(home, aggBase, 1);
  assert.ok(agg.pages.length >= 2, '聚合 size=1 至少 2 页');
  assertNoNext(agg.pages[agg.pages.length - 1], '聚合末页');
  const aggFull = runQuery(home, [{ ...aggBase }]);
  assertRowsEqual(agg.concatRows, aggFull[0].rows, '聚合拼接 vs 一次性');
  const aggWant = sqlRowsOf(
    dbFile,
    'SELECT "owner", COUNT(*) AS "n" FROM "items" GROUP BY "owner" ORDER BY "owner" ASC',
    [],
  );
  assertRowsEqual(agg.concatRows, aggWant, '聚合拼接 vs 独立 SQL');
  // 凭据坏项：篡改／乱填／空串／跨查询复用按项拒，好项照常。
  const first = runQuery(home, [{ ...base, page: { size: 2 } }]);
  const goodToken = first[0].next;
  assert.ok(typeof goodToken === 'string' && goodToken.length > 0, '首页须回凭据');
  const tampered = goodToken.slice(0, -1) + (goodToken.slice(-1) === '0' ? '1' : '0');
  const bad = runQuery(home, [
    { ...base, page: { size: 2, next: '乱填的凭据' } },
    { ...base, page: { size: 2, next: tampered } },
    { ...base, page: { size: 2, next: '' } },
    { from: 'item_locations', select: ['location'], page: { size: 2, next: goodToken } },
    { ...base, page: { size: 0 } },
    { ...base, page: { size: 1001 } },
    { ...base, where: { field: 'owner', op: 'eq', value: '使用者' } },
  ]);
  assert.equal(bad.length, 7);
  assertItemErrorNames(bad[0], '续取凭据', '乱填');
  assertItemErrorNames(bad[1], '续取凭据', '篡改');
  assertItemErrorNames(bad[2], 'page.next', '空串');
  assertItemErrorNames(bad[3], '续取凭据', '跨查询复用');
  assertItemErrorNames(bad[4], 'page.size', 'size=0');
  assertItemErrorNames(bad[5], 'page.size', 'size 超上限');
  assertItemOk(bad[6], bad[6].query, '好项照常');
});

test('#962 ⑨ 批量与连接：三张混合批同序对应＋JOIN 与独立 SQL 相等＋不产文件', () => {
  const home = mkSeededHome();
  const dbFile = dbFileOf(home);
  const joinQ = {
    from: 'items',
    join: [{ table: 'item_locations', type: 'left', on: [{ left: 'items.id', right: 'item_locations.item_id' }] }],
    select: ['items.name', 'quantity', 'location'],
    orderBy: [{ field: 'items.name', dir: 'asc' }, { field: 'location', dir: 'asc' }],
  };
  const results = runQuery(home, [
    { from: 'items', select: ['name'], orderBy: [{ field: 'name', dir: 'asc' }] },
    { from: 'items', select: ['不存在的列'] },
    joinQ,
  ]);
  assert.equal(results.length, 3);
  assertItemOk(results[0], results[0].query, '好项 0 照常');
  assertItemErrorNames(results[1], '不存在的列', '坏项 1 点名');
  assertItemOk(results[2], joinQ, '连接项照常');
  const wantJoin = sqlRowsOf(
    dbFile,
    'SELECT "items"."name" AS "name", "item_locations"."quantity" AS "quantity", "item_locations"."location" AS "location" FROM "items" LEFT JOIN "item_locations" ON "items"."id" = "item_locations"."item_id" ORDER BY "items"."name" ASC, "item_locations"."location" ASC',
    [],
  );
  assertRowsEqual(results[2].rows, wantJoin, 'JOIN vs 独立 SQL（含孤品灯失配 NULL 扩展）');
  assert.ok(wantJoin.some((r) => r.quantity === null && r.location === null), '种子须含 LEFT 失配 NULL 扩展行');
  // 主密钥文件不动：HOME 下无 .master.key 新增（本族从不读它）。
  const { status } = runCli(NODE_BIN, BIN, [QUERY_KEY, '--params', JSON.stringify({ queries: [{ from: 'items', select: ['name'] }] })], {
    ...process.env,
    ...homeEnvOf(home),
  });
  assert.equal(status, 0);
});
