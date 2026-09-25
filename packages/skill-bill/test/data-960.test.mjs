/** #960 · 饼干记账数据族端到端（`bill.data.schema`＋`bill.data.query`）：同一套判据的本家夹具。
 *
 * 覆盖票面验收（机器可判，tmp 隔离，真实库与真实家目录零触碰），九条：
 *  ① 目录：表清单与声明逐条一致，列与 `PRAGMA` 逐条一致，`goals.json` 明确不在本族；
 *  ② 空表合法（表在、列在、行数为 0）＋不产文件；
 *  ③ 单表取行：行与独立 SQL 逐字段相等（含 `NULL`），字段与 `PRAGMA` 一致，缺省即全列；
 *  ④ 空集是合法结果（`rows: []`、`total: 0`，退出码 0）；
 *  ⑤ 非法字段／非法表按项拒并点名，请求级非法非 0；
 *  ⑥ 分组聚合：五函数＋`count(列)` 计非空，与独立 SQL 相等，空分组合法；
 *  ⑦ 分页续取：`size=2` 拼接与一次性取完不重不漏，末页无凭据，`total` 为全量；
 *  ⑧ 凭据不透明：篡改／乱填／跨查询被拒，页大小非法被拒；
 *  ⑨ 批量：好／坏／好同序对应，坏项不毁整批，单张即长度为一的批；
 *  另带缺席：速查表与路由产物里 `bill.data.` 零命中，不产文件（每条跑前后目录条目一致）。
 *
 * 判据复用六家共用件 `test/helpers/data-query-harness.mjs`（断言住那边，本件只留本家夹具）。
 * 本家只有 1 张表：`join` 需两张表，在本家恒为非法表名按项拒（见⑤），不断言连接语义。
 *
 * 运行：先 `pnpm build`（`tsc -b`），再 `node --test packages/skill-bill/test/data-960.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openBillDb, closeBillDb, resolveDbPath } from '../dist/fetch/index.js';
import { BILL_DATA_TABLES } from '../dist/data/tables.js';
import { billConfigDir, configTestBase } from './helpers/config-base.mjs';
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
// 测试隔离基座：家目录指到临时目录，真库与真实家目录零接触。
configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const SKILL = 'bill';
const SCHEMA_KEY = 'bill.data.schema';
const QUERY_KEY = 'bill.data.query';

/** 种子库：5 行（`note` 含 '午饭'／NULL／空串／'地铁'／'晚餐'，覆盖逐字段相等含 `NULL`）。 */
function mkSeededDir() {
  const dir = mkdtempSync(join(tmpdir(), 'b960-seed-'));
  billConfigDir(dir);
  const handle = openBillDb(resolveDbPath());
  try {
    handle.db.prepare("INSERT INTO bills (category, time, amount, account, ledger, currency, note) VALUES ('餐饮', '2026-09-20 12:00:00', -35, '支付宝', '生活', '人民币', '午饭')").run();
    handle.db.prepare("INSERT INTO bills (category, time, amount, account, ledger, currency, note) VALUES ('餐饮', '2026-09-21 12:00:00', -20, '微信', '生活', '人民币', NULL)").run();
    handle.db.prepare("INSERT INTO bills (category, time, amount, account, ledger, currency, note) VALUES ('工资', '2026-09-22 18:00:00', 5000, '银行卡', '生活', '人民币', '')").run();
    handle.db.prepare("INSERT INTO bills (category, time, amount, account, ledger, currency, note) VALUES ('出行', '2026-09-23 09:00:00', -15.5, '支付宝', '生活', '人民币', '地铁')").run();
    handle.db.prepare("INSERT INTO bills (category, time, amount, account, ledger, currency, note) VALUES ('餐饮', '2026-09-24 20:00:00', -42, '支付宝', '生活', '人民币', '晚餐')").run();
  } finally {
    closeBillDb(handle);
  }
  return dir;
}

function mkEmptyDir() {
  const dir = mkdtempSync(join(tmpdir(), 'b960-empty-'));
  billConfigDir(dir);
  const handle = openBillDb(resolveDbPath());
  closeBillDb(handle);
  return dir;
}

function dbFileOf(dir) {
  return join(dir, 'biscuit_accountant.db');
}

/** 库目录条目快照：排除 SQLite 的伴生文件（`-shm`／`-wal`／`-journal`，WAL  checkpoint 后会消失，
 *  不是命令的产物；卡路里不用 WAL 故无此项，饼干用 WAL 须在这里过滤，否则前后对账恒红）。 */
function dirEntries(dir) {
  return readdirSync(dir).filter((e) => !e.endsWith('-shm') && !e.endsWith('-wal') && !e.endsWith('-journal')).sort();
}

function runSchemaOk(dir) {
  billConfigDir(dir);
  const before = dirEntries(dir);
  const { status, stdout, stderr } = runCli(NODE_BIN, BIN, [SCHEMA_KEY], {
    ...process.env,
    ...homeEnvOf(dir),
  });
  assert.equal(status, 0, 'exit ' + status + ' stderr=' + (stderr || '').slice(-800));
  const env = parseEnvelopeLine(stdout, SCHEMA_KEY);
  const results = assertResultsetEnvelope(env, { skill: SKILL, key: SCHEMA_KEY }, SCHEMA_KEY);
  const after = dirEntries(dir);
  assert.deepEqual(after, before, '跑完库目录不得新增产物（前后条目不一致）');
  assert.ok(!after.includes('biscuit_accountant_html'), '目录命令不得落 HTML 产物目录');
  return results;
}

function runQuery(dir, queries) {
  billConfigDir(dir);
  const before = dirEntries(dir);
  const { status, stdout, stderr } = runCli(NODE_BIN, BIN, [QUERY_KEY, '--params', JSON.stringify({ queries })], {
    ...process.env,
    ...homeEnvOf(dir),
  });
  assert.equal(status, 0, 'exit ' + status + ' stderr=' + (stderr || '').slice(-800));
  const env = parseEnvelopeLine(stdout, QUERY_KEY);
  const results = assertResultsetEnvelope(env, { skill: SKILL, key: QUERY_KEY }, QUERY_KEY);
  const after = dirEntries(dir);
  assert.deepEqual(after, before, '跑完库目录不得新增产物（前后条目不一致）');
  assert.ok(!after.includes('biscuit_accountant_html'), '数据查询不得落 HTML 产物目录');
  return results;
}

function collectAll(dir, baseQuery, size) {
  const pages = [];
  let next = null;
  let guard = 0;
  for (;;) {
    guard += 1;
    assert.ok(guard <= 20, '续取轮数异常（疑似死循环，next=' + JSON.stringify(next) + '）');
    const q = next === null ? { ...baseQuery, page: { size } } : { ...baseQuery, page: { size, next } };
    const results = runQuery(dir, [q]);
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

test('#960 ① 目录：表清单与声明逐条一致，列与 PRAGMA 逐条一致，goals.json 不在本族', () => {
  const dir = mkSeededDir();
  const results = runSchemaOk(dir);
  assert.equal(results.length, 1);
  assert.equal(results[0].ok, true);
  assert.deepEqual(results[0].tables.map((t) => t.table), [...BILL_DATA_TABLES]);
  assert.deepEqual([...BILL_DATA_TABLES], ['bills'], '本家只暴露 bills 一张表');
  const pragma = pragmaFieldsOf(dbFileOf(dir), [...BILL_DATA_TABLES]);
  for (const t of results[0].tables) {
    assertFieldsMatchPragma(t.fields, pragma.get(t.table), t.table);
  }
  const names = results[0].tables.map((t) => t.table);
  assert.ok(!names.includes('goals'), 'goals.json 不是 SQLite 表，不得在本族');
  assert.ok(!names.includes('goals.json'), 'goals.json 明确不在本族');
});

test('#960 ② 空表合法：表在、列在、行数为 0，退出码 0，不产文件', () => {
  const dir = mkEmptyDir();
  const results = runSchemaOk(dir);
  assert.equal(results[0].tables.length, 1);
  assert.ok(results[0].tables[0].fields.length > 0, '空表也须有列');
  const pragma = pragmaFieldsOf(dbFileOf(dir), [...BILL_DATA_TABLES]);
  assertFieldsMatchPragma(results[0].tables[0].fields, pragma.get('bills'), 'bills 空表列');
  const qResults = runQuery(dir, [{ from: 'bills' }]);
  assertEmptyOk(qResults[0], '空表行查询');
});

test('#960 ③ 单表取行：行与独立 SQL 逐字段相等（含 NULL），字段与 PRAGMA 一致，缺省即全列', () => {
  const dir = mkSeededDir();
  const dbFile = dbFileOf(dir);
  const q1 = {
    from: 'bills',
    select: ['time', 'category', 'amount', 'note'],
    where: { and: [{ field: 'time', op: 'gte', value: '2026-09-20 00:00:00' }] },
    orderBy: [{ field: 'time', dir: 'asc' }],
  };
  const results = runQuery(dir, [q1]);
  assert.equal(results.length, 1);
  assertItemOk(results[0], q1, 'q1');
  const want1 = sqlRowsOf(
    dbFile,
    'SELECT "time", "category", "amount", "note" FROM "bills" WHERE "time" >= ? ORDER BY "time" ASC',
    ['2026-09-20 00:00:00'],
  );
  assertRowsEqual(results[0].rows, want1, 'q1');
  assert.ok(want1.some((r) => r.note === null), '种子须含 NULL 行（独立读数里要有 null）');
  const pragma = pragmaFieldsOf(dbFile, [...BILL_DATA_TABLES]);
  const full = pragma.get('bills');
  assertFieldsMatchPragma(results[0].fields, q1.select.map((n) => full.find((c) => c.name === n)), 'q1 fields');
  const qFull = { from: 'bills', where: { field: 'time', op: 'eq', value: '2026-09-21 12:00:00' } };
  const fullResults = runQuery(dir, [qFull]);
  assertItemOk(fullResults[0], qFull, '缺省 select');
  assertFieldsMatchPragma(fullResults[0].fields, full, '缺省 select 即全列');
  const wantFull = sqlRowsOf(dbFile, 'SELECT * FROM "bills" WHERE "time" = ?', ['2026-09-21 12:00:00']);
  assertRowsEqual(fullResults[0].rows, wantFull, '缺省 select 行');
});

test('#960 ④ 空范围是合法结果（rows: []、total: 0，退出码 0）', () => {
  const dir = mkSeededDir();
  const results = runQuery(dir, [
    { from: 'bills', where: { field: 'time', op: 'gte', value: '2099-01-01 00:00:00' } },
  ]);
  assert.equal(results.length, 1);
  assertEmptyOk(results[0], '空范围');
});

test('#960 ⑤ 非法字段／非法表按项拒并点名，连接在本家恒为非法表，请求级非法非 0', () => {
  const dir = mkSeededDir();
  const results = runQuery(dir, [
    { from: 'bills', select: ['time', '不存在的列'] },
    { from: '不存在的表', select: ['time'] },
    { from: 'bills', join: [{ table: 'user_profile', type: 'left', on: [{ left: 'user_profile.id', right: 'bills.id' }] }] },
  ]);
  assert.equal(results.length, 3);
  assertItemErrorNames(results[0], '不存在的列', '非法字段');
  assertItemErrorNames(results[1], '不存在的表', '非法表名');
  assertItemErrorNames(results[2], 'user_profile', '本家单表：连接第二张表即非法表');
  billConfigDir(dir);
  const env = { ...process.env, ...homeEnvOf(dir) };
  for (const [params, hint] of [
    ['{"queries":[]}', 'queries'],
    ['{"from":"bills"}', 'queries'],
    ['[]', '--params'],
  ]) {
    const { status, stderr } = runCli(NODE_BIN, BIN, [QUERY_KEY, '--params', params], env);
    assert.notEqual(status, 0, '请求级非法须非 0 退出：' + params);
    assert.ok((stderr || '').includes(hint), '报文须指向请求本身（含「' + hint + '」）：' + (stderr || '').slice(-300));
  }
});

test('#960 ⑥ 分组聚合：五函数＋count(列)计非空，与独立 SQL 相等，空分组合法', () => {
  const dir = mkSeededDir();
  const dbFile = dbFileOf(dir);
  const aggQ = {
    from: 'bills',
    groupBy: ['category'],
    agg: [
      { fn: 'sum', field: 'amount', as: 'total_amt' },
      { fn: 'avg', field: 'amount', as: 'avg_amt' },
      { fn: 'count', field: '*', as: 'n' },
      { fn: 'min', field: 'amount', as: 'min_amt' },
      { fn: 'max', field: 'amount', as: 'max_amt' },
      { fn: 'count', field: 'note', as: 'note_n' },
    ],
    orderBy: [{ field: 'category', dir: 'asc' }],
  };
  const results = runQuery(dir, [aggQ]);
  assert.equal(results.length, 1);
  assertItemOk(results[0], aggQ, '分组聚合');
  const want = sqlRowsOf(
    dbFile,
    'SELECT "category", SUM("amount") AS "total_amt", AVG("amount") AS "avg_amt", COUNT(*) AS "n", MIN("amount") AS "min_amt", MAX("amount") AS "max_amt", COUNT("note") AS "note_n" FROM "bills" GROUP BY "category" ORDER BY "category" ASC',
  );
  assertRowsEqual(results[0].rows, want, '分组聚合行');
  const empty = runQuery(dir, [
    {
      from: 'bills',
      where: { field: 'time', op: 'gte', value: '2099-01-01 00:00:00' },
      groupBy: ['category'],
      agg: [{ fn: 'sum', field: 'amount', as: 'total_amt' }],
    },
  ]);
  assertEmptyOk(empty[0], '空分组');
});

test('#960 ⑦ 分页续取：size=2 拼接与一次性取完不重不漏，末页无凭据，total 为全量', () => {
  const dir = mkSeededDir();
  const dbFile = dbFileOf(dir);
  const base = {
    from: 'bills',
    select: ['time', 'category', 'amount', 'note'],
    orderBy: [{ field: 'time', dir: 'asc' }],
  };
  const { pages, concatRows } = collectAll(dir, base, 2);
  assert.equal(pages.length, 3, '5 行 size=2 须 3 页（2＋2＋1）');
  assertHasNext(pages[0], 'p0');
  assertHasNext(pages[1], 'p1');
  assertNoNext(pages[2], 'p2 末页');
  for (const [i, p] of pages.entries()) {
    assertTotalEquals(p, 5, 'p' + i + ' total 全量');
    assert.ok(!String(p.next ?? '').includes('bills'), 'p' + i + ' 凭据须不透明（不得明文含表名）');
  }
  const full = runQuery(dir, [{ ...base }]);
  assertNoNext(full[0], '一次性取完（缺省页大小 100，5 行一页）');
  assertRowsEqual(concatRows, full[0].rows, '拼接 vs 一次性');
  const want = sqlRowsOf(
    dbFile,
    'SELECT "time", "category", "amount", "note" FROM "bills" ORDER BY "time" ASC',
    [],
  );
  assertRowsEqual(concatRows, want, '拼接 vs 独立 SQL');
});

test('#960 ⑧ 凭据不透明：篡改／乱填／跨查询被拒，页大小非法被拒，好项照常', () => {
  const dir = mkSeededDir();
  const base = {
    from: 'bills',
    select: ['time', 'amount'],
    orderBy: [{ field: 'time', dir: 'asc' }],
  };
  const first = runQuery(dir, [{ ...base, page: { size: 2 } }]);
  assertHasNext(first[0], '首批');
  const goodNext = first[0].next;
  const badNext = goodNext.slice(0, -1) + (goodNext.slice(-1) === '0' ? '1' : '0');
  const other = {
    from: 'bills',
    select: ['time', 'amount'],
    where: { field: 'category', op: 'eq', value: '餐饮' },
    orderBy: [{ field: 'time', dir: 'asc' }],
  };
  const otherFirst = runQuery(dir, [{ ...other, page: { size: 2 } }]);
  const results = runQuery(dir, [
    { ...base, page: { size: 2, next: '乱填的凭据' } },
    { ...base, page: { size: 2, next: badNext } },
    { ...base, page: { size: 2, next: '' } },
    { ...other, page: { size: 2, next: goodNext } },
    { ...base, page: { size: 0 } },
    { ...base, page: { size: 1001 } },
    { ...base, page: { size: 2, next: goodNext } },
  ]);
  assert.equal(results.length, 7);
  assertItemErrorNames(results[0], '续取凭据', '乱填');
  assertItemErrorNames(results[1], '续取凭据', '篡改');
  assertItemErrorNames(results[2], 'page.next', '空串');
  assertItemErrorNames(results[3], '续取凭据', '跨查询复用');
  assertItemErrorNames(results[4], 'page.size', 'size=0');
  assertItemErrorNames(results[5], 'page.size', 'size=1001');
  assert.equal(results[6].ok, true, '好项照常（坏凭据不毁整批）');
  assert.ok(otherFirst[0].next === undefined || typeof otherFirst[0].next === 'string', '对照查询首批形态');
});

test('#960 ⑨ 批量：好／坏／好同序对应，坏项不毁整批，单张即长度为一的批；缺席零命中', () => {
  const dir = mkSeededDir();
  const dbFile = dbFileOf(dir);
  const q1 = {
    id: '支出线',
    from: 'bills',
    select: ['time', 'category', 'amount', 'note'],
    where: { field: 'category', op: 'eq', value: '餐饮' },
    orderBy: [{ field: 'time', dir: 'asc' }],
  };
  const qBad = { id: '坏的那张', from: 'bills', select: ['time', '不存在的列'] };
  const q3 = {
    id: '收入线',
    from: 'bills',
    select: ['time', 'amount'],
    where: { field: 'amount', op: 'gte', value: 0 },
    orderBy: [{ field: 'time', dir: 'asc' }],
  };
  const results = runQuery(dir, [q1, qBad, q3]);
  assert.equal(results.length, 3);
  assert.deepEqual(results[0].query, q1);
  assert.deepEqual(results[1].query, qBad);
  assert.deepEqual(results[2].query, q3);
  assert.equal(results[0].id, '支出线');
  assert.equal(results[1].id, '坏的那张');
  assert.equal(results[2].id, '收入线');
  assertItemOk(results[0], q1, 'q1');
  assertItemOk(results[2], q3, 'q3');
  const want1 = sqlRowsOf(
    dbFile,
    'SELECT "time", "category", "amount", "note" FROM "bills" WHERE "category" = ? ORDER BY "time" ASC',
    ['餐饮'],
  );
  assertRowsEqual(results[0].rows, want1, 'q1');
  assertItemErrorNames(results[1], '不存在的列', '坏项');
  const single = runQuery(dir, [{ id: '单张', from: 'bills', select: ['time', 'amount'], where: { field: 'time', op: 'eq', value: '2026-09-21 12:00:00' } }]);
  assert.equal(single.length, 1);
  assert.equal(single[0].id, '单张');
  const pkgDir = join(HERE, '..');
  const skill = readFileSync(join(pkgDir, 'SKILL.md'), 'utf8');
  const autoStart = '<!-- HELP-AUTO-START -->';
  const autoEnd = '<!-- HELP-AUTO-END -->';
  const auto = skill.slice(skill.indexOf(autoStart), skill.indexOf(autoEnd) + autoEnd.length);
  assert.ok(skill.indexOf(autoStart) >= 0 && skill.indexOf(autoEnd) > skill.indexOf(autoStart), 'SKILL.md 缺 HELP-AUTO 块');
  assert.equal(auto.includes('bill.data.'), false, 'SKILL.md 说明面泄漏了数据族命令');
  const wake = readFileSync(join(pkgDir, 'src', 'triggers', 'wakeTable.ts'), 'utf8');
  assert.equal(wake.includes('bill.data.'), false, '唤醒词表泄漏了数据族命令');
  const helpBuild = readFileSync(join(pkgDir, 'scripts', 'build-help.mjs'), 'utf8');
  assert.ok(!helpBuild.includes('bill.data.'), 'HELP 构建脚本不得硬编码数据族命令');
});
