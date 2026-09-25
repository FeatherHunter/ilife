/** #964 · 数据族·备忘录铺开端到端（`memo.data.schema`＋`memo.data.query`）。
 *
 * 覆盖票面四条验收（机器可判，tmp 隔离，真实 DB 与真实家目录零触碰），
 * 复用卡路里样板的同一套判据（`test/helpers/data-query-harness.mjs` 只判不布）——本件只留备忘录夹具：
 *  ① 表清单与声明逐条一致（`MEMO_DATA_TABLES`＝notes／reminders）；
 *  ② 列与类型与独立 `PRAGMA table_info` 逐条一致（含空库列不跟行走）；
 *  ③ 单表取行与独立 SQL 逐字段相等（含 `NULL`），字段与 `PRAGMA` 一致；
 *  ④ 空集是合法结果（`rows: []`、`total: 0`，退出码 0）；
 *  ⑤ 非法表名／非法字段按项拒并点名，请求级非法非 0；
 *  ⑥ 两表连接（显式 `on`）与独立 SQL 逐字段相等（含失配 `NULL` 扩展）；
 *  ⑦ 分组聚合（`groupBy`＋`count`／`min`／`max`）与独立 SQL 逐字段相等，聚合列按 `as` 具名；
 *  ⑧ 分页续取：行查询与聚合查询两种形态下拼接与一次性取完不重不漏，末页无 `next`，篡改被拒；
 *  ⑨ 缺席＋不产文件＋库缺席：路由／SKILL 说明面零 `memo.data.*`，跑前后目录条目一致、无 `memo_html`，
 *     库文件缺席时 exit 4 且不新建空库（与既有 `openMemoDb` 约定一致）。
 *
 * 运行：先 `tsc -b packages/skill-memo-ilife`，再 `node --test packages/skill-memo-ilife/test/data-964.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { existsSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { initMemoTestDb } from '../../../tooling/contract-seam.mjs';
import { MEMO_DATA_TABLES } from '../dist/data/tables.js';
import { mkMemoConfig, noLarkPathEnv } from './helpers/config-base.mjs';
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
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const SKILL = 'memo';
const SCHEMA_KEY = 'memo.data.schema';
const QUERY_KEY = 'memo.data.query';

/** 建一个空备忘库（只建表，不写行）：布景，不是被测行为。 */
function mkEmptyDir() {
  const dir = mkdtempSync(join(tmpdir(), 'm964-empty-'));
  initMemoTestDb(join(dir, 'memo.db'));
  return dir;
}

/** 种子库：notes 5 行（summary／sub_category 含 NULL，覆盖逐字段相等含 NULL）＋ reminders 3 行（1 失配 NULL 扩展用）。 */
function mkSeededDir() {
  const dir = mkdtempSync(join(tmpdir(), 'm964-seed-'));
  initMemoTestDb(join(dir, 'memo.db'));
  const db = new DatabaseSync(join(dir, 'memo.db'));
  try {
    db.prepare("INSERT INTO notes (content, summary, category, sub_category, due) VALUES ('买牛奶', '短摘', '备忘', NULL, NULL)").run();
    db.prepare("INSERT INTO notes (content, summary, category, sub_category, due) VALUES ('跑步', NULL, '备忘', '运动', '2026-10-01')").run();
    db.prepare("INSERT INTO notes (content, summary, category, sub_category, due) VALUES ('心愿单', '短摘2', '心愿', NULL, NULL)").run();
    db.prepare("INSERT INTO notes (content, summary, category, sub_category, due) VALUES ('打卡', NULL, '打卡', NULL, NULL)").run();
    db.prepare("INSERT INTO notes (content, summary, category, sub_category, due) VALUES ('读书记', '短摘3', '备忘', '阅读', NULL)").run();
    db.prepare("INSERT INTO reminders (note_id, remind_at, repeat_type, content, status) VALUES (1, '2026-10-01 09:00', '一次性', '别忘牛奶', 'active')").run();
    db.prepare("INSERT INTO reminders (note_id, remind_at, repeat_type, content, status) VALUES (2, '2026-10-02 09:00', '每天', NULL, 'active')").run();
    db.prepare("INSERT INTO reminders (note_id, remind_at, repeat_type, content, status) VALUES (3, NULL, '一次性', '心愿提醒', 'dismissed')").run();
  } finally {
    db.close();
  }
  return dir;
}

function envOf(dbDir) {
  const home = mkMemoConfig({ db: { dir: dbDir } }, 'm964-cfg-');
  return noLarkPathEnv(home);
}

function runSchema(dir) {
  const env = envOf(dir);
  const before = readdirSync(dir).sort();
  const { status, stdout, stderr } = runCli(NODE_BIN, BIN, [SCHEMA_KEY], env);
  assert.equal(status, 0, 'exit ' + status + ' stderr=' + (stderr || '').slice(-800));
  const envOut = parseEnvelopeLine(stdout, SCHEMA_KEY);
  const results = assertResultsetEnvelope(envOut, { skill: SKILL, key: SCHEMA_KEY }, SCHEMA_KEY);
  const after = readdirSync(dir).sort();
  assert.deepEqual(after, before, '跑完库目录不得新增产物（前后条目不一致）');
  assert.ok(!after.includes('memo_html'), '目录命令不得落 HTML 产物目录');
  return results;
}

function runQuery(dir, queries) {
  const env = envOf(dir);
  const before = readdirSync(dir).sort();
  const { status, stdout, stderr } = runCli(NODE_BIN, BIN, [QUERY_KEY, '--params', JSON.stringify({ queries })], env);
  assert.equal(status, 0, 'exit ' + status + ' stderr=' + (stderr || '').slice(-800));
  const envOut = parseEnvelopeLine(stdout, QUERY_KEY);
  const results = assertResultsetEnvelope(envOut, { skill: SKILL, key: QUERY_KEY }, QUERY_KEY);
  const after = readdirSync(dir).sort();
  assert.deepEqual(after, before, '跑完库目录不得新增产物（前后条目不一致）');
  assert.ok(!after.includes('memo_html'), '数据查询不得落 HTML 产物目录');
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

test('#964 ① 目录键：shape 为 resultset，表清单与声明逐条一致（notes／reminders）', () => {
  const dir = mkSeededDir();
  const results = runSchema(dir);
  assert.equal(results.length, 1);
  assert.equal(results[0].ok, true);
  assert.deepEqual(results[0].tables.map((t) => t.table), [...MEMO_DATA_TABLES]);
  assert.deepEqual([...MEMO_DATA_TABLES], ['notes', 'reminders']);
});

test('#964 ② 列现读：回的列与类型与独立 PRAGMA 逐条一致，有行与空库一致（列不跟行走）', () => {
  const seeded = mkSeededDir();
  const empty = mkEmptyDir();
  const sTables = runSchema(seeded)[0].tables;
  const eTables = runSchema(empty)[0].tables;
  const wantSeeded = pragmaFieldsOf(join(seeded, 'memo.db'), [...MEMO_DATA_TABLES]);
  for (const t of sTables) assertFieldsMatchPragma(t.fields, wantSeeded.get(t.table), t.table);
  const wantEmpty = pragmaFieldsOf(join(empty, 'memo.db'), [...MEMO_DATA_TABLES]);
  for (const t of eTables) assertFieldsMatchPragma(t.fields, wantEmpty.get(t.table), t.table + ' 空表');
  assert.deepEqual(
    sTables.map((t) => [t.table, t.fields]),
    eTables.map((t) => [t.table, t.fields]),
  );
  assert.ok(sTables.every((t) => t.fields.length > 0), '空表也须有列');
});

test('#964 ③ 单表取行：两张查询单同序对应，行与独立 SQL 逐字段相等（含 NULL），字段与 PRAGMA 一致', () => {
  const dir = mkSeededDir();
  const dbFile = join(dir, 'memo.db');
  const q1 = {
    from: 'notes',
    select: ['id', 'content', 'summary', 'category'],
    where: { and: [{ field: 'category', op: 'eq', value: '备忘' }] },
    orderBy: [{ field: 'id', dir: 'asc' }],
  };
  const q2 = {
    id: '提醒线',
    from: 'reminders',
    select: ['note_id', 'remind_at', 'content', 'status'],
    where: { field: 'status', op: 'eq', value: 'active' },
    orderBy: [{ field: 'id', dir: 'asc' }],
  };
  const results = runQuery(dir, [q1, q2]);
  assert.equal(results.length, 2);
  assert.deepEqual(results[0].query, q1);
  assert.deepEqual(results[1].query, q2);
  assertItemOk(results[0], q1, 'q1');
  assertItemOk(results[1], q2, 'q2');
  assert.equal(results[1].id, '提醒线');
  const want1 = sqlRowsOf(dbFile, 'SELECT "id", "content", "summary", "category" FROM "notes" WHERE "category" = ? ORDER BY "id" ASC', ['备忘']);
  assertRowsEqual(results[0].rows, want1, 'q1');
  const want2 = sqlRowsOf(dbFile, 'SELECT "note_id", "remind_at", "content", "status" FROM "reminders" WHERE "status" = ? ORDER BY "id" ASC', ['active']);
  assertRowsEqual(results[1].rows, want2, 'q2');
  assert.ok(want1.some((r) => r.summary === null), '种子须含 NULL 行（notes.summary NULL）');
  assert.ok(want2.some((r) => r.content === null), '种子须含 NULL 行（reminders.content NULL）');
  const pragma = pragmaFieldsOf(dbFile, [...MEMO_DATA_TABLES]);
  assertFieldsMatchPragma(results[0].fields, q1.select.map((n) => pragma.get('notes').find((c) => c.name === n)), 'notes 选中列');
  assertFieldsMatchPragma(results[1].fields, q2.select.map((n) => pragma.get('reminders').find((c) => c.name === n)), 'reminders 选中列');
});

test('#964 ④ 空集是合法结果（rows: []、total: 0，退出码 0）', () => {
  const dir = mkSeededDir();
  const results = runQuery(dir, [{ from: 'notes', where: { field: 'category', op: 'eq', value: '不存在的分类' } }]);
  assert.equal(results.length, 1);
  assertEmptyOk(results[0], '空范围');
});

test('#964 ⑤ 非法按项拒并点名（整批 exit 0），请求级非法非 0', () => {
  const dir = mkSeededDir();
  const results = runQuery(dir, [
    { from: 'notes', select: ['id', '不存在的列'] },
    { from: '不存在的表', select: ['id'] },
  ]);
  assert.equal(results.length, 2);
  assertItemErrorNames(results[0], '不存在的列', '非法字段');
  assertItemErrorNames(results[1], '不存在的表', '非法表名');
  const env = envOf(dir);
  for (const [params, hint] of [['{"queries":[]}', 'queries'], ['{"from":"notes"}', 'queries']]) {
    const { status, stderr } = runCli(NODE_BIN, BIN, [QUERY_KEY, '--params', params], env);
    assert.notEqual(status, 0, '请求级非法须非 0 退出：' + params);
    assert.ok((stderr || '').includes(hint), '报文须指向请求本身（含「' + hint + '」）：' + (stderr || '').slice(-300));
  }
});

test('#964 ⑥ LEFT JOIN：两表字段混选＋失配行 NULL 扩展，与独立 SQL 逐字段相等', () => {
  const dir = mkSeededDir();
  const dbFile = join(dir, 'memo.db');
  const q = {
    from: 'notes',
    join: [{ table: 'reminders', type: 'left', on: [{ left: 'reminders.note_id', right: 'notes.id' }] }],
    select: ['notes.id', 'notes.content', 'category', 'remind_at', 'reminders.status'],
    orderBy: [{ field: 'notes.id', dir: 'asc' }],
  };
  const results = runQuery(dir, [q]);
  assert.equal(results.length, 1);
  assertItemOk(results[0], q, 'left join');
  const want = sqlRowsOf(
    dbFile,
    'SELECT "notes"."id" AS "id", "notes"."content" AS "content", "notes"."category" AS "category", "reminders"."remind_at" AS "remind_at", "reminders"."status" AS "status" FROM "notes" LEFT JOIN "reminders" ON "reminders"."note_id" = "notes"."id" ORDER BY "notes"."id" ASC',
    [],
  );
  assertRowsEqual(results[0].rows, want, 'left join 行');
  assert.ok(want.some((r) => r.remind_at === null), '失配行须有 NULL 扩展（无提醒的笔记）');
});

test('#964 ⑦ 分组聚合：按分类计数＋最值，与独立 SQL 逐字段相等，聚合列按 as 具名', () => {
  const dir = mkSeededDir();
  const dbFile = join(dir, 'memo.db');
  const q = {
    from: 'notes',
    groupBy: ['category'],
    agg: [
      { fn: 'count', field: '*', as: 'n' },
      { fn: 'count', field: 'summary', as: 'summary_n' },
      { fn: 'min', field: 'id', as: 'min_id' },
      { fn: 'max', field: 'id', as: 'max_id' },
    ],
    orderBy: [{ field: 'category', dir: 'asc' }],
  };
  const results = runQuery(dir, [q]);
  assert.equal(results.length, 1);
  assertItemOk(results[0], q, '分组聚合');
  const want = sqlRowsOf(
    dbFile,
    'SELECT "category", COUNT(*) AS "n", COUNT("summary") AS "summary_n", MIN("id") AS "min_id", MAX("id") AS "max_id" FROM "notes" GROUP BY "category" ORDER BY "category" ASC',
    [],
  );
  assertRowsEqual(results[0].rows, want, '分组聚合行');
  assert.deepEqual(results[0].fields.map((f) => f.name), ['category', 'n', 'summary_n', 'min_id', 'max_id']);
});

test('#964 ⑧ 分页续取：行与聚合两种形态拼接与一次性取完不重不漏，末页无凭据，篡改被拒', () => {
  const dir = mkSeededDir();
  const dbFile = join(dir, 'memo.db');
  const rowBase = { from: 'notes', select: ['id', 'content'], orderBy: [{ field: 'id', dir: 'asc' }] };
  const { pages, concatRows } = collectAll(dir, rowBase, 2);
  assert.equal(pages.length, 3, '5 行 size=2 须 3 页（2＋2＋1）');
  assertHasNext(pages[0], 'p0');
  assertHasNext(pages[1], 'p1');
  assertNoNext(pages[2], 'p2');
  const once = runQuery(dir, [rowBase])[0];
  assertTotalEquals(pages[0], once.total, 'total 为全量');
  assertRowsEqual(concatRows, once.rows, '续取拼接与一次性取完一致');
  const wantAll = sqlRowsOf(dbFile, 'SELECT "id", "content" FROM "notes" ORDER BY "id" ASC', []);
  assertRowsEqual(concatRows, wantAll, '续取拼接与独立 SQL 一致');
  const aggBase = { from: 'notes', groupBy: ['category'], agg: [{ fn: 'count', field: '*', as: 'n' }], orderBy: [{ field: 'category', dir: 'asc' }] };
  const aggPages = collectAll(dir, aggBase, 1);
  assert.ok(aggPages.pages.length >= 2, '聚合分组须多页');
  const aggOnce = runQuery(dir, [aggBase])[0];
  assertRowsEqual(aggPages.concatRows, aggOnce.rows, '聚合续取拼接与一次性一致');
  assertNoNext(aggPages.pages[aggPages.pages.length - 1], '聚合末页');
  const bad = runQuery(dir, [
    { ...rowBase, page: { size: 2, next: '乱填的凭据' } },
    { ...rowBase, page: { size: 0 } },
    rowBase,
  ]);
  assertItemErrorNames(bad[0], '续取凭据', '乱凭据');
  assertItemErrorNames(bad[1], 'page.size', '非法页大小');
  assert.equal(bad[2].ok, true);
});

test('#964 ⑨ 缺席＋不产文件＋库缺席：生成物零 memo.data.*，目录无新增，缺库不新建', () => {
  const pkgDir = join(HERE, '..');
  const routes = readFileSync(join(pkgDir, 'src', 'triggers', 'routes.generated.ts'), 'utf8');
  assert.equal(routes.includes('memo.data.'), false, '路由产物泄漏了数据族键');
  const skill = readFileSync(join(pkgDir, 'SKILL.md'), 'utf8');
  const autoStart = '<!-- HELP-AUTO-START -->';
  const autoEnd = '<!-- HELP-AUTO-END -->';
  const auto = skill.slice(skill.indexOf(autoStart), skill.indexOf(autoEnd) + autoEnd.length);
  assert.ok(skill.indexOf(autoStart) >= 0 && skill.indexOf(autoEnd) > skill.indexOf(autoStart), 'SKILL.md 缺 HELP-AUTO 块');
  assert.equal(auto.includes('memo.data.'), false, 'SKILL.md 说明面泄漏了数据族键');
  const emptyDir = mkdtempSync(join(tmpdir(), 'm964-nodb-'));
  const home = mkMemoConfig({ db: { dir: emptyDir } }, 'm964-nodb-cfg-');
  const { status, stderr } = runCli(NODE_BIN, BIN, [SCHEMA_KEY], noLarkPathEnv(home));
  assert.notEqual(status, 0, '库缺席须非 0 退出');
  assert.ok((stderr || '').length > 0, '库缺席须有报文');
  assert.equal(existsSync(join(emptyDir, 'memo.db')), false, '库缺席时不许新建空库冒充有数据');
});
