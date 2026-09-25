/** #955 · 引擎最小路径端到端（`calorie.data.query`）：单表取行，结果与独立 SQL 逐字段相等。
 *
 * 覆盖票面六条验收（机器可判，tmp 隔离，真实 DB 与真实家目录零触碰）：
 *  ① 同一张查询单拿到的行，与测试独立写的 SQL 直读结果逐字段相等（含 `NULL`）；
 *  ② 行的字段集合与 `PRAGMA table_info` 一致（不由测试手抄列名）；
 *  ③ 空范围 → `rows: []`、`total: 0`，退出码 0；
 *  ④ 非法字段 → 该项 `ok:false` 且报文点名该字段；非法表名同理；
 *  ⑤ 该键在说明面与路由产物里零命中；
 *  ⑥ 判据形态六家可复用（一套判据 × 各家夹具）：断言一律调
 *     `test/helpers/data-query-harness.mjs`，本件只留卡路里夹具
 *     （CLI 路径、表清单、种子写法、缺席断言的自家路径）——后续五家直接引用那件。
 *
 * 运行：先 `pnpm build`（`tsc -b`），再 `node --test packages/skill-calorie/test/data-query-955.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { CALORIE_DATA_TABLES } from '../dist/data/tables.js';
import { calorieConfigDir, configTestBase } from './helpers/config-test.mjs';
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
  sqlRowsOf,
  pragmaFieldsOf,
} from '../../../test/helpers/data-query-harness.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_NAME = 'calorie_data.db';
const SKILL = 'calorie';
const KEY = 'calorie.data.query';

/** 种子库：含 `NULL`（note／sodium_mg 留空）与空串，覆盖「逐字段相等含 NULL」。 */
function mkSeededDir() {
  const dir = mkdtempSync(join(tmpdir(), 'd955-seed-'));
  const db = openDb(join(dir, DB_NAME));
  db.prepare("INSERT INTO weight_log (date, time, weight_kg, note) VALUES ('2026-09-20', '07:00:00', 70.5, '晨起')").run();
  db.prepare("INSERT INTO weight_log (date, time, weight_kg, note) VALUES ('2026-09-21', '07:05:00', 70.2, NULL)").run();
  db.prepare("INSERT INTO weight_log (date, time, weight_kg, note) VALUES ('2026-09-25', '07:00:00', 69.8, '')").run();
  db.prepare("INSERT INTO food_log (date, time, food_name, grams, calories, note, sodium_mg) VALUES ('2026-09-25', '12:00:00', '米饭', 200, 260, '午餐', NULL)").run();
  db.prepare("INSERT INTO food_log (date, time, food_name, grams, calories, note, sodium_mg) VALUES ('2026-09-25', '18:30:00', '鸡蛋', 100, 155, NULL, 120.5)").run();
  db.close();
  return dir;
}

function runQuery(dir, queries) {
  calorieConfigDir(dir);
  const before = readdirSync(dir).sort();
  const { status, stdout, stderr } = runCli(NODE_BIN, BIN, [KEY, '--params', JSON.stringify({ queries })], {
    ...process.env,
    ...homeEnvOf(dir),
  });
  assert.equal(status, 0, 'exit ' + status + ' stderr=' + (stderr || '').slice(-800));
  const env = parseEnvelopeLine(stdout, KEY);
  const results = assertResultsetEnvelope(env, { skill: SKILL, key: KEY }, KEY);
  const after = readdirSync(dir).sort();
  assert.deepEqual(after, before, '跑完库目录不得新增产物（前后条目不一致）');
  assert.ok(!after.includes('calorie_html'), '数据查询不得落 HTML 产物目录');
  return results;
}

test('#955 ①② 单表取行：两张查询单同序对应，行与独立 SQL 逐字段相等（含 NULL），字段与 PRAGMA 一致', () => {
  const dir = mkSeededDir();
  const dbFile = join(dir, DB_NAME);
  const q1 = {
    from: 'weight_log',
    select: ['date', 'time', 'weight_kg', 'note'],
    where: { and: [{ field: 'date', op: 'gte', value: '2026-09-20' }] },
    orderBy: [{ field: 'date', dir: 'asc' }, { field: 'time', dir: 'asc' }],
  };
  const q2 = {
    id: '晚餐线',
    from: 'food_log',
    select: ['food_name', 'grams', 'calories', 'note', 'sodium_mg'],
    where: { field: 'date', op: 'eq', value: '2026-09-25' },
    orderBy: [{ field: 'time', dir: 'asc' }],
  };
  const results = runQuery(dir, [q1, q2]);
  assert.equal(results.length, 2, 'results 须与请求同序对应（长度 2）');
  assert.deepEqual(results[0].query, q1, '第 0 项须回显第 0 张查询单');
  assert.deepEqual(results[1].query, q2, '第 1 项须回显第 1 张查询单');
  assertItemOk(results[0], q1, 'q1');
  assertItemOk(results[1], q2, 'q2');
  assert.equal(results[1].id, '晚餐线', '调用方标识须原样回');
  const want1 = sqlRowsOf(
    dbFile,
    'SELECT "date", "time", "weight_kg", "note" FROM "weight_log" WHERE "date" >= ? ORDER BY "date" ASC, "time" ASC',
    ['2026-09-20'],
  );
  assertRowsEqual(results[0].rows, want1, 'q1');
  const want2 = sqlRowsOf(
    dbFile,
    'SELECT "food_name", "grams", "calories", "note", "sodium_mg" FROM "food_log" WHERE "date" = ? ORDER BY "time" ASC',
    ['2026-09-25'],
  );
  assertRowsEqual(results[1].rows, want2, 'q2');
  assert.ok(want1.some((r) => r.note === null), '种子须含 NULL 行（q1 独立读数里要有 null）');
  assert.ok(want2.some((r) => r.sodium_mg === null), '种子须含 NULL 行（q2 独立读数里要有 null）');
  const pragma = pragmaFieldsOf(dbFile, [...CALORIE_DATA_TABLES]);
  for (const [item, q] of [[results[0], q1], [results[1], q2]]) {
    const full = pragma.get(q.from);
    const wantFields = q.select.map((n) => full.find((c) => c.name === n));
    assertFieldsMatchPragma(item.fields, wantFields, q.from);
  }
});

test('#955 ② 缺省 select 即该表全部可暴露列（与 PRAGMA 全列一致）', () => {
  const dir = mkSeededDir();
  const dbFile = join(dir, DB_NAME);
  const q = { from: 'weight_log', where: { field: 'date', op: 'eq', value: '2026-09-21' } };
  const results = runQuery(dir, [q]);
  assert.equal(results.length, 1);
  assertItemOk(results[0], q, '缺省 select');
  const pragma = pragmaFieldsOf(dbFile, [...CALORIE_DATA_TABLES]);
  assertFieldsMatchPragma(results[0].fields, pragma.get('weight_log'), 'weight_log 全列');
  const want = sqlRowsOf(dbFile, 'SELECT * FROM "weight_log" WHERE "date" = ?', ['2026-09-21']);
  assertRowsEqual(results[0].rows, want, '缺省 select 行');
});

test('#955 ③ 空范围是合法结果（rows: []、total: 0，退出码 0）', () => {
  const dir = mkSeededDir();
  const results = runQuery(dir, [
    { from: 'weight_log', where: { field: 'date', op: 'gte', value: '2099-01-01' } },
  ]);
  assert.equal(results.length, 1);
  assertEmptyOk(results[0], '空范围');
});

test('#955 ④ 非法字段／非法表名按项拒并点名（整批退出码仍为 0）', () => {
  const dir = mkSeededDir();
  const results = runQuery(dir, [
    { from: 'weight_log', select: ['date', '不存在的列'] },
    { from: '不存在的表', select: ['date'] },
  ]);
  assert.equal(results.length, 2);
  assertItemErrorNames(results[0], '不存在的列', '非法字段');
  assertItemErrorNames(results[1], '不存在的表', '非法表名');
});

test('#955 ④ 请求级非法 → 非 0 退出（空 queries／缺 queries）', () => {
  const dir = mkSeededDir();
  calorieConfigDir(dir);
  const env = { ...process.env, ...homeEnvOf(dir) };
  for (const [params, hint] of [
    ['{"queries":[]}', 'queries'],
    ['{"from":"weight_log"}', 'queries'],
  ]) {
    const { status, stderr } = runCli(NODE_BIN, BIN, [KEY, '--params', params], env);
    assert.notEqual(status, 0, '请求级非法须非 0 退出：' + params);
    assert.ok((stderr || '').includes(hint), '报文须指向请求本身（含「' + hint + '」）：' + (stderr || '').slice(-300));
  }
});

test('#955 ⑤ 缺席：速查表与路由产物里查不到 calorie.data.query', () => {
  const pkgDir = join(HERE, '..');
  const routes = readFileSync(join(pkgDir, 'src', 'triggers', 'routes.generated.ts'), 'utf8');
  assert.equal(routes.includes(KEY), false, '路由产物泄漏了引擎命令');
  const bh = readFileSync(join(pkgDir, 'scripts', 'build-help.mjs'), 'utf8');
  for (const [start, end] of [
    ['// -- GEN-CLI-START REPR 表', '// -- GEN-CLI-END REPR 表'],
    ['// -- GEN-CLI-START EXAMPLE 表', '// -- GEN-CLI-END EXAMPLE 表'],
    ['// -- GEN-CLI-START FLOW 表', '// -- GEN-CLI-END FLOW 表'],
  ]) {
    const block = bh.slice(bh.indexOf(start), bh.indexOf(end) + end.length);
    assert.ok(bh.indexOf(start) >= 0 && bh.indexOf(end) > bh.indexOf(start), '标记块缺失：' + start);
    assert.equal(block.includes(KEY), false, '速查表构建块泄漏了引擎命令：' + start);
  }
  const skill = readFileSync(join(pkgDir, 'SKILL.md'), 'utf8');
  const autoStart = '<!-- HELP-AUTO-START -->';
  const autoEnd = '<!-- HELP-AUTO-END -->';
  const auto = skill.slice(skill.indexOf(autoStart), skill.indexOf(autoEnd) + autoEnd.length);
  assert.ok(skill.indexOf(autoStart) >= 0 && skill.indexOf(autoEnd) > skill.indexOf(autoStart), 'SKILL.md 缺 HELP-AUTO 块');
  assert.equal(auto.includes(KEY), false, 'SKILL.md 说明面泄漏了引擎命令');
});
