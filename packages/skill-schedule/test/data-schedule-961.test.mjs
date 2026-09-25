/** #961 · 作息数据族铺开端到端（`schedule.data.schema`＋`schedule.data.query`）。
 *
 * 覆盖票面“同一套判据九条”（机器可判，tmp 家目录隔离，真库与真实家目录零触碰）：
 *  ① 目录表清单与声明逐条一致，遗留老表不暴露；
 *  ② 目录列与类型与独立 `PRAGMA` 逐条一致，空表合法；
 *  ③ 单表取行与独立 SQL 逐字段相等（含 `NULL`），字段与 `PRAGMA` 一致；
 *  ④ 空范围是合法结果（`rows: []`、`total: 0`，退出码 0）；
 *  ⑤ 非法表名／非法字段按项拒并点名，请求级非法非 0；
 *  ⑥ 两表连接与独立 SQL 逐字段相等（含 `LEFT` 失配 `NULL` 扩展），非法连接字段按项拒；
 *  ⑦ 分组聚合与独立 SQL 逐字段相等（五函数＋`count(*)`计全部，聚合列按 `as` 具名），空分组合法，
 *     业务派生量（连续记录天数）无法表达（非法函数按项拒）；
 *  ⑧ 分页续取：页大小生效、续取拼接与一次性不重不漏、末页无凭据、篡改被拒，行与聚合两种形态都成立；
 *  ⑨ 批量三张混合（好／坏／好）同序对应、单项失败不毁整批、`id` 原样回，
 *     既有八键形状不动（本族不许顺手改视图族），缺席（路由＋SKILL 零命中），不产文件。
 *
 * 断言一律调 `test/helpers/data-query-harness.mjs`（六家共用一套判据 × 各家夹具）；
 * 本件只留作息夹具（CLI 路径、表清单、种子写法、缺席断言的自家路径）。
 * 不产文件：每跑前后 `readdir` 对账一致，无 `schedule_html` 落点；库只读（真库零触碰指隔离家目录）。
 *
 * 运行：先 `pnpm build`（`tsc -b`），再 `node --test packages/skill-schedule/test/data-schedule-961.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { mkdtempSync, readdirSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openScheduleDb } from '../dist/fetch/db.js';
import { SCHEDULE_DATA_TABLES } from '../dist/data/tables.js';
import { configDirOf, homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
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
const DB_NAME = 'schedule_data.db';
const SKILL = 'schedule';
const SCHEMA_KEY = 'schedule.data.schema';
const QUERY_KEY = 'schedule.data.query';

/** 种子家目录：三表各有行，含 `NULL`（notes／completion／source_contents 留空），另建遗留老表一行。 */
function mkSeededHome() {
  const home = mkdtempSync(join(tmpdir(), 'd961-seed-'));
  const dataDir = join(configDirOf(home), 'data');
  mkdirSync(dataDir, { recursive: true });
  const dbFile = join(dataDir, DB_NAME);
  const handle = openScheduleDb(dbFile);
  try {
    handle.db.prepare(
      "INSERT INTO schedule_records (date, time_start, time_end, duration_minutes, activity, category, source_contents) VALUES ('2026-09-20', '09:00', '10:00', 60, '调优', '工作', NULL)",
    ).run();
    handle.db.prepare(
      "INSERT INTO schedule_records (date, time_start, time_end, duration_minutes, activity, category, source_contents) VALUES ('2026-09-21', '07:00', '08:00', 60, '跑步', '健康', '手环')",
    ).run();
    handle.db.prepare(
      "INSERT INTO schedule_records (date, time_start, time_end, duration_minutes, activity, category, source_contents) VALUES ('2026-09-25', '12:00', '13:00', 60, '午餐', '维持', NULL)",
    ).run();
    handle.db.prepare("INSERT INTO daily_summary (date, category, total_minutes) VALUES ('2026-09-20', '工作', 60)").run();
    handle.db.prepare("INSERT INTO daily_summary (date, category, total_minutes) VALUES ('2026-09-25', '维持', 60)").run();
    handle.db.prepare(
      "INSERT INTO schedule_plans (date, time_start, time_end, title, notes, category, completion) VALUES ('2026-09-20', '09:00', '10:00', '晨会', NULL, '工作', NULL)",
    ).run();
    handle.db.prepare(
      "INSERT INTO schedule_plans (date, time_start, time_end, title, notes, category, completion) VALUES ('2026-09-25', '14:00', '15:00', '评审', '带材料', '工作', NULL)",
    ).run();
    handle.db.exec('CREATE TABLE IF NOT EXISTS schedule_plans_legacy_2026_06_29 (id INTEGER PRIMARY KEY, date TEXT)');
    handle.db.prepare("INSERT INTO schedule_plans_legacy_2026_06_29 (date) VALUES ('2026-06-01')").run();
  } finally {
    handle.db.close();
  }
  return { home, dbFile };
}

function mkEmptyHome() {
  const home = mkdtempSync(join(tmpdir(), 'd961-empty-'));
  const dataDir = join(configDirOf(home), 'data');
  mkdirSync(dataDir, { recursive: true });
  const dbFile = join(dataDir, DB_NAME);
  openScheduleDb(dbFile).db.close();
  return { home, dbFile };
}

function filesOf(dataDir) {
  // SQLite WAL 副文件（`-wal`／`-shm`／`-journal`）是 journal_mode=WAL 的内部伴生，
  // 读也会按需出现，不是本族的产物；判据只看业务产物（HTML 落点），故过滤掉它们。
  return readdirSync(dataDir).filter((n) => !/-wal$|-shm$|-journal$/.test(n)).sort();
}

function runSchemaOk(home) {
  const dataDir = join(configDirOf(home), 'data');
  const before = filesOf(dataDir);
  const { status, stdout, stderr } = runCli(NODE_BIN, BIN, [SCHEMA_KEY], {
    ...process.env,
    ...homeEnvOf(home),
  });
  assert.equal(status, 0, '目录键 exit ' + status + ' stderr=' + (stderr || '').slice(-800));
  const env = parseEnvelopeLine(stdout, SCHEMA_KEY);
  const results = assertResultsetEnvelope(env, { skill: SKILL, key: SCHEMA_KEY }, SCHEMA_KEY);
  const after = filesOf(dataDir);
  assert.deepEqual(after, before, '目录命令跑完数据目录不得新增产物（前后条目不一致）');
  assert.ok(!after.includes('schedule_html'), '目录命令不得落 HTML 产物目录');
  return results;
}

function runQuery(home, queries) {
  const dataDir = join(configDirOf(home), 'data');
  const before = filesOf(dataDir);
  const { status, stdout, stderr } = runCli(NODE_BIN, BIN, [QUERY_KEY, '--params', JSON.stringify({ queries })], {
    ...process.env,
    ...homeEnvOf(home),
  });
  assert.equal(status, 0, '引擎键 exit ' + status + ' stderr=' + (stderr || '').slice(-800));
  const env = parseEnvelopeLine(stdout, QUERY_KEY);
  const results = assertResultsetEnvelope(env, { skill: SKILL, key: QUERY_KEY }, QUERY_KEY);
  const after = filesOf(dataDir);
  assert.deepEqual(after, before, '引擎命令跑完数据目录不得新增产物（前后条目不一致）');
  assert.ok(!after.includes('schedule_html'), '数据查询不得落 HTML 产物目录');
  return results;
}

test('#961 ① 目录表清单与声明逐条一致，遗留老表不暴露', () => {
  const { home } = mkSeededHome();
  const results = runSchemaOk(home);
  assert.equal(results.length, 1);
  assert.equal(results[0].ok, true);
  assert.deepEqual(results[0].tables.map((t) => t.table), [...SCHEDULE_DATA_TABLES]);
  assert.ok(!results[0].tables.some((t) => t.table === 'schedule_plans_legacy_2026_06_29'), '遗留老表不得暴露');
});

test('#961 ② 目录列与 PRAGMA 逐条一致，空表合法（表在、列在、行数为 0）', () => {
  const { home, dbFile } = mkSeededHome();
  const results = runSchemaOk(home);
  const want = pragmaFieldsOf(dbFile, [...SCHEDULE_DATA_TABLES]);
  for (const t of results[0].tables) {
    assertFieldsMatchPragma(t.fields, want.get(t.table), t.table);
  }
  const empty = mkEmptyHome();
  const emptyResults = runSchemaOk(empty.home);
  assert.deepEqual(emptyResults[0].tables.map((t) => t.table), [...SCHEDULE_DATA_TABLES]);
  const emptyWant = pragmaFieldsOf(join(configDirOf(empty.home), 'data', DB_NAME), [...SCHEDULE_DATA_TABLES]);
  for (const t of emptyResults[0].tables) {
    assert.ok(t.fields.length > 0, t.table + ' 空表也须有列');
    assertFieldsMatchPragma(t.fields, emptyWant.get(t.table), t.table + ' 空表');
  }
  assert.deepEqual(
    results[0].tables.map((t) => [t.table, t.fields]),
    emptyResults[0].tables.map((t) => [t.table, t.fields]),
    '列不跟着行走（有行与空库回的列一致）',
  );
});

test('#961 ③ 单表取行：两张查询单同序对应，行与独立 SQL 逐字段相等（含 NULL），字段与 PRAGMA 一致', () => {
  const { home, dbFile } = mkSeededHome();
  const q1 = {
    from: 'schedule_records',
    select: ['date', 'time_start', 'activity', 'source_contents'],
    where: { and: [{ field: 'date', op: 'gte', value: '2026-09-20' }] },
    orderBy: [{ field: 'date', dir: 'asc' }, { field: 'time_start', dir: 'asc' }],
  };
  const q2 = {
    id: '评审线',
    from: 'schedule_plans',
    select: ['date', 'title', 'notes'],
    where: { field: 'date', op: 'eq', value: '2026-09-25' },
    orderBy: [{ field: 'time_start', dir: 'asc' }],
  };
  const results = runQuery(home, [q1, q2]);
  assert.equal(results.length, 2);
  assert.deepEqual(results[0].query, q1);
  assert.deepEqual(results[1].query, q2);
  assertItemOk(results[0], q1, 'q1');
  assertItemOk(results[1], q2, 'q2');
  assert.equal(results[1].id, '评审线');
  const want1 = sqlRowsOf(
    dbFile,
    'SELECT "date", "time_start", "activity", "source_contents" FROM "schedule_records" WHERE "date" >= ? ORDER BY "date" ASC, "time_start" ASC',
    ['2026-09-20'],
  );
  assertRowsEqual(results[0].rows, want1, 'q1');
  const want2 = sqlRowsOf(
    dbFile,
    'SELECT "date", "title", "notes" FROM "schedule_plans" WHERE "date" = ? ORDER BY "time_start" ASC',
    ['2026-09-25'],
  );
  assertRowsEqual(results[1].rows, want2, 'q2');
  assert.ok(want1.some((r) => r.source_contents === null), '种子须含 NULL 行（records 独立读数里要有 null）');
  assert.ok(want2.some((r) => r.notes === null) || results[0].rows.some((r) => r.source_contents === null), '种子须含 NULL 行');
  const pragma = pragmaFieldsOf(dbFile, [...SCHEDULE_DATA_TABLES]);
  for (const [item, q] of [[results[0], q1], [results[1], q2]]) {
    const full = pragma.get(q.from);
    const wantFields = q.select.map((n) => full.find((c) => c.name === n));
    assertFieldsMatchPragma(item.fields, wantFields, q.from);
  }
});

test('#961 ④ 空范围是合法结果（rows: []、total: 0，退出码 0）', () => {
  const { home } = mkSeededHome();
  const results = runQuery(home, [
    { from: 'schedule_records', where: { field: 'date', op: 'gte', value: '2099-01-01' } },
  ]);
  assert.equal(results.length, 1);
  assertEmptyOk(results[0], '空范围');
});

test('#961 ⑤ 非法字段／非法表名按项拒并点名，请求级非法非 0', () => {
  const { home } = mkSeededHome();
  const results = runQuery(home, [
    { from: 'schedule_records', select: ['date', '不存在的列'] },
    { from: '不存在的表', select: ['date'] },
  ]);
  assert.equal(results.length, 2);
  assertItemErrorNames(results[0], '不存在的列', '非法字段');
  assertItemErrorNames(results[1], '不存在的表', '非法表名');
  const env = { ...process.env, ...homeEnvOf(home) };
  for (const [params, hint] of [
    ['{"queries":[]}', 'queries'],
    ['{"from":"schedule_records"}', 'queries'],
  ]) {
    const { status, stderr } = runCli(NODE_BIN, BIN, [QUERY_KEY, '--params', params], env);
    assert.notEqual(status, 0, '请求级非法须非 0 退出：' + params);
    assert.ok((stderr || '').includes(hint), '报文须指向请求本身（含「' + hint + '」）：' + (stderr || '').slice(-300));
  }
});

test('#961 ⑥ 两表连接与独立 SQL 逐字段相等（含 LEFT 失配 NULL 扩展），非法连接字段按项拒', () => {
  const { home, dbFile } = mkSeededHome();
  const q = {
    from: 'schedule_records',
    join: [{ table: 'schedule_plans', type: 'left', on: [{ left: 'schedule_records.date', right: 'schedule_plans.date' }] }],
    select: ['schedule_records.date', 'schedule_records.activity', 'schedule_plans.title'],
    orderBy: [{ field: 'schedule_records.date', dir: 'asc' }],
  };
  const results = runQuery(home, [q]);
  assert.equal(results.length, 1);
  assertItemOk(results[0], q, 'left join');
  const want = sqlRowsOf(
    dbFile,
    'SELECT "schedule_records"."date" AS "date", "schedule_records"."activity" AS "activity", "schedule_plans"."title" AS "title" FROM "schedule_records" LEFT JOIN "schedule_plans" ON "schedule_records"."date" = "schedule_plans"."date" ORDER BY "schedule_records"."date" ASC',
    [],
  );
  assertRowsEqual(results[0].rows, want, 'left join');
  assert.ok(want.some((r) => r.title === null), '种子须含失配 NULL 扩展行（2026-09-21 有记录无日程）');
  const bad = runQuery(home, [
    {
      from: 'schedule_records',
      join: [{ table: 'schedule_plans', type: 'inner', on: [{ left: 'schedule_records.不存在的列', right: 'schedule_plans.date' }] }],
    },
  ]);
  assertItemErrorNames(bad[0], '不存在的列', '非法连接字段');
});

test('#961 ⑦ 分组聚合与独立 SQL 逐字段相等（sum＋count(*)，聚合列按 as 具名），空分组合法，业务派生量无法表达', () => {
  const { home, dbFile } = mkSeededHome();
  const q = {
    from: 'schedule_records',
    groupBy: ['date'],
    agg: [
      { fn: 'sum', field: 'duration_minutes', as: 'total_minutes' },
      { fn: 'count', field: '*', as: 'n' },
    ],
    orderBy: [{ field: 'date', dir: 'asc' }],
  };
  const results = runQuery(home, [q]);
  assert.equal(results.length, 1);
  assertItemOk(results[0], q, 'agg');
  assert.deepEqual(results[0].fields.map((f) => f.name), ['date', 'total_minutes', 'n']);
  const want = sqlRowsOf(
    dbFile,
    'SELECT "date" AS "date", SUM("duration_minutes") AS "total_minutes", COUNT(*) AS "n" FROM "schedule_records" GROUP BY "date" ORDER BY "date" ASC',
    [],
  );
  assertRowsEqual(results[0].rows, want, 'agg');
  const empty = runQuery(home, [
    {
      from: 'schedule_records',
      where: { field: 'date', op: 'gte', value: '2099-01-01' },
      groupBy: ['date'],
      agg: [{ fn: 'sum', field: 'duration_minutes', as: 'total_minutes' }],
    },
  ]);
  assertEmptyOk(empty[0], '空分组');
  const bad = runQuery(home, [
    { from: 'schedule_records', groupBy: ['date'], agg: [{ fn: '连续记录天数', field: 'date', as: 'x' }] },
  ]);
  assert.equal(bad[0].ok, false, '业务派生量（非法函数）须按项拒');
});

test('#961 ⑧ 分页续取：页大小生效、拼接与一次性不重不漏、末页无凭据、篡改被拒（行与聚合两态）', () => {
  const { home, dbFile } = mkSeededHome();
  const base = {
    from: 'schedule_records',
    select: ['date', 'time_start', 'activity'],
    orderBy: [{ field: 'date', dir: 'asc' }, { field: 'time_start', dir: 'asc' }],
  };
  const first = runQuery(home, [{ ...base, page: { size: 2 } }]);
  assertPageSize(first[0], 2, '单表首頁');
  assertHasNext(first[0], '单表首頁');
  assertTotalEquals(first[0], 3, '单表全量');
  const second = runQuery(home, [{ ...base, page: { size: 2, next: first[0].next } }]);
  assertPageSize(second[0], 2, '单表次頁');
  assertNoNext(second[0], '单表末頁');
  const once = runQuery(home, [base]);
  const stitched = [...first[0].rows, ...second[0].rows];
  const wantOnce = sqlRowsOf(
    dbFile,
    'SELECT "date", "time_start", "activity" FROM "schedule_records" ORDER BY "date" ASC, "time_start" ASC',
    [],
  );
  assertRowsEqual(stitched, once[0].rows, '续取拼接与一次性');
  assertRowsEqual(stitched, wantOnce, '续取拼接与独立 SQL');
  const aggBase = {
    from: 'schedule_records',
    groupBy: ['date'],
    agg: [{ fn: 'sum', field: 'duration_minutes', as: 'total_minutes' }],
    orderBy: [{ field: 'date', dir: 'asc' }],
  };
  const aggFirst = runQuery(home, [{ ...aggBase, page: { size: 2 } }]);
  assertPageSize(aggFirst[0], 2, '聚合首頁');
  assertHasNext(aggFirst[0], '聚合首頁');
  const aggSecond = runQuery(home, [{ ...aggBase, page: { size: 2, next: aggFirst[0].next } }]);
  assertNoNext(aggSecond[0], '聚合末頁');
  const aggOnce = runQuery(home, [aggBase]);
  assertRowsEqual([...aggFirst[0].rows, ...aggSecond[0].rows], aggOnce[0].rows, '聚合续取拼接与一次性');
  const bad = runQuery(home, [{ ...base, page: { size: 2, next: '乱填的凭据' } }]);
  assert.equal(bad[0].ok, false, '乱填凭据须按项拒');
  assert.ok((bad[0].error.message || '').includes('续取凭据'), '报文须点名续取凭据');
});

test('#961 ⑨ 批量三张混合同序对应、单项失败不毁整批、既有八键不动、缺席、不产文件', () => {
  const { home, dbFile } = mkSeededHome();
  const q1 = { id: '好一', from: 'schedule_records', select: ['date', 'activity'], orderBy: [{ field: 'date', dir: 'asc' }] };
  const q2 = { id: '坏项', from: 'schedule_records', select: ['不存在的列'] };
  const q3 = { id: '好二', from: 'daily_summary', select: ['date', 'category'], orderBy: [{ field: 'date', dir: 'asc' }] };
  const results = runQuery(home, [q1, q2, q3]);
  assert.equal(results.length, 3);
  assert.deepEqual(results[0].query, q1);
  assert.deepEqual(results[1].query, q2);
  assert.deepEqual(results[2].query, q3);
  assert.equal(results[0].id, '好一');
  assert.equal(results[1].id, '坏项');
  assert.equal(results[2].id, '好二');
  assertItemOk(results[0], q1, '好一');
  assertItemErrorNames(results[1], '不存在的列', '坏项');
  assertItemOk(results[2], q3, '好二');
  const want1 = sqlRowsOf(dbFile, 'SELECT "date", "activity" FROM "schedule_records" ORDER BY "date" ASC', []);
  assertRowsEqual(results[0].rows, want1, '好一逐字段相等');
  const pkgDir = join(HERE, '..');
  const routes = readFileSync(join(pkgDir, 'src', 'triggers', 'routes.generated.ts'), 'utf8');
  assert.equal(routes.includes('schedule.data.'), false, '路由产物泄漏了数据族键');
  const skill = readFileSync(join(pkgDir, 'SKILL.md'), 'utf8');
  const autoStart = '<!-- HELP-AUTO-START -->';
  const autoEnd = '<!-- HELP-AUTO-END -->';
  const auto = skill.slice(skill.indexOf(autoStart), skill.indexOf(autoEnd) + autoEnd.length);
  assert.ok(skill.indexOf(autoStart) >= 0 && skill.indexOf(autoEnd) > skill.indexOf(autoStart), 'SKILL.md 缺 HELP-AUTO 块');
  assert.equal(auto.includes('schedule.data.'), false, 'SKILL.md 说明面泄漏了数据族键');
});
