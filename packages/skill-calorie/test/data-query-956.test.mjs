/** #956 · 两表连接端到端（`calorie.data.query`＋`join`）：显式 `on` 跨两表取数，结果与独立 SQL 逐字段相等。
 *
 * 覆盖票面四条验收（机器可判，tmp 隔离，真实 DB 与真实家目录零触碰）：
 *  ① 两表连接的结果，与测试独立写的等价 SQL 逐字段相等（含 `NULL`：种子 NULL＋LEFT JOIN 失配扩展 NULL）；
 *  ② 连接条件引用非法字段 → 该项 `ok:false` 且报文点名该字段；
 *  ③ 单表查询的行为与 #955 交付时逐条一致（老路径不回归：重跑 #955 形状的单表用例＋整份 955 件仍绿）；
 *  ④ 该键在说明面与路由产物里零命中；
 *  另锁本票语法边界（实现自选、此处书面锁定）：`join` 长度只许 1／`type` 须显式 inner／left／
 *  `on` 须跨两表的 `表.列` 等值对／`via` 只留语法位（出现即拒）／裸列名歧义即拒／双表同名列双选即拒
 *  （输出键为裸列名，同名双选留给后续别名票）／缺省 select 即 from 全列。
 *
 * 运行：先 `pnpm build`（`tsc -b`），再 `node --test packages/skill-calorie/test/data-query-956.test.mjs`
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

/** 种子库：weight_log 3 行（id 1／2／3；note 含 '晨起'／NULL／空串）＋ user_profile 1 行（id=1；age／height_cm／note 留 NULL）。 */
function mkSeededDir() {
  const dir = mkdtempSync(join(tmpdir(), 'd956-seed-'));
  const db = openDb(join(dir, DB_NAME));
  db.prepare("INSERT INTO weight_log (date, time, weight_kg, note) VALUES ('2026-09-20', '07:00:00', 70.5, '晨起')").run();
  db.prepare("INSERT INTO weight_log (date, time, weight_kg, note) VALUES ('2026-09-21', '07:05:00', 70.2, NULL)").run();
  db.prepare("INSERT INTO weight_log (date, time, weight_kg, note) VALUES ('2026-09-25', '07:00:00', 69.8, '')").run();
  db.prepare("INSERT INTO user_profile (id, age, gender, height_cm, note, activity_level) VALUES (1, NULL, 'female', NULL, NULL, 'moderate')").run();
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

test('#956 ① LEFT JOIN：两表字段混选＋失配行 NULL 扩展，与独立 SQL 逐字段相等（含 NULL）', () => {
  const dir = mkSeededDir();
  const dbFile = join(dir, DB_NAME);
  const q = {
    from: 'weight_log',
    join: [{ table: 'user_profile', type: 'left', on: [{ left: 'user_profile.id', right: 'weight_log.id' }] }],
    select: ['weight_log.date', 'weight_kg', 'weight_log.note', 'user_profile.gender', 'user_profile.age'],
    where: { and: [{ field: 'weight_log.date', op: 'gte', value: '2026-09-20' }, { field: 'weight_kg', op: 'gte', value: 69 }] },
    orderBy: [{ field: 'weight_log.date', dir: 'asc' }],
  };
  const results = runQuery(dir, [q]);
  assert.equal(results.length, 1);
  assertItemOk(results[0], q, 'left join');
  const want = sqlRowsOf(
    dbFile,
    'SELECT "weight_log"."date" AS "date", "weight_log"."weight_kg" AS "weight_kg", "weight_log"."note" AS "note", "user_profile"."gender" AS "gender", "user_profile"."age" AS "age" FROM "weight_log" LEFT JOIN "user_profile" ON "user_profile"."id" = "weight_log"."id" WHERE ("weight_log"."date" >= ?) AND ("weight_log"."weight_kg" >= ?) ORDER BY "weight_log"."date" ASC',
    ['2026-09-20', 69],
  );
  assert.equal(want.length, 3, '独立读数：LEFT JOIN 须 3 行（1 命中＋2 失配扩展）');
  assertRowsEqual(results[0].rows, want, 'left join 行');
  assert.ok(want.some((r) => r.note === null), '种子须含 NULL 行（weight_log.note NULL）');
  assert.ok(want.some((r) => r.gender === null), '失配行须有 NULL 扩展（gender null）');
  assert.ok(want.some((r) => r.age === null), '种子＋扩展须有 NULL（age 全 null）');
  const pragma = pragmaFieldsOf(dbFile, [...CALORIE_DATA_TABLES]);
  const colTypeOf = (table, col) => pragma.get(table).find((c) => c.name === col);
  assertFieldsMatchPragma(
    results[0].fields,
    [
      { name: 'date', type: colTypeOf('weight_log', 'date').type },
      { name: 'weight_kg', type: colTypeOf('weight_log', 'weight_kg').type },
      { name: 'note', type: colTypeOf('weight_log', 'note').type },
      { name: 'gender', type: colTypeOf('user_profile', 'gender').type },
      { name: 'age', type: colTypeOf('user_profile', 'age').type },
    ],
    'join fields（各列类型取自所属表 PRAGMA）',
  );
});

test('#956 ① INNER JOIN：仅命中行，与独立 SQL 逐字段相等', () => {
  const dir = mkSeededDir();
  const dbFile = join(dir, DB_NAME);
  const q = {
    id: '命中行',
    from: 'weight_log',
    join: [{ table: 'user_profile', type: 'INNER', on: [{ left: 'weight_log.id', right: 'user_profile.id' }] }],
    select: ['date', 'weight_kg', 'user_profile.gender'],
    where: { field: 'user_profile.gender', op: 'eq', value: 'female' },
    orderBy: [{ field: 'date', dir: 'asc' }],
  };
  const results = runQuery(dir, [q]);
  assert.equal(results.length, 1);
  assertItemOk(results[0], q, 'inner join');
  assert.equal(results[0].id, '命中行', '调用方标识须原样回');
  const want = sqlRowsOf(
    dbFile,
    'SELECT "weight_log"."date" AS "date", "weight_log"."weight_kg" AS "weight_kg", "user_profile"."gender" AS "gender" FROM "weight_log" INNER JOIN "user_profile" ON "weight_log"."id" = "user_profile"."id" WHERE "user_profile"."gender" = ? ORDER BY "weight_log"."date" ASC',
    ['female'],
  );
  assert.equal(want.length, 1, '独立读数：INNER JOIN 须恰 1 行（id=1 命中）');
  assertRowsEqual(results[0].rows, want, 'inner join 行');
});

test('#956 ① 缺省 select＋join：即 from 全列（字段与 PRAGMA 全列一致）', () => {
  const dir = mkSeededDir();
  const dbFile = join(dir, DB_NAME);
  const q = {
    from: 'weight_log',
    join: [{ table: 'user_profile', type: 'left', on: [{ left: 'user_profile.id', right: 'weight_log.id' }] }],
    where: { field: 'weight_log.date', op: 'eq', value: '2026-09-21' },
  };
  const results = runQuery(dir, [q]);
  assert.equal(results.length, 1);
  assertItemOk(results[0], q, '缺省 select＋join');
  const pragma = pragmaFieldsOf(dbFile, [...CALORIE_DATA_TABLES]);
  assertFieldsMatchPragma(results[0].fields, pragma.get('weight_log'), '缺省即 from 全列');
  const want = sqlRowsOf(
    dbFile,
    'SELECT "weight_log"."id" AS "id", "weight_log"."date" AS "date", "weight_log"."time" AS "time", "weight_log"."weight_kg" AS "weight_kg", "weight_log"."height_cm" AS "height_cm", "weight_log"."bmi" AS "bmi", "weight_log"."note" AS "note", "weight_log"."created_at" AS "created_at" FROM "weight_log" LEFT JOIN "user_profile" ON "user_profile"."id" = "weight_log"."id" WHERE "weight_log"."date" = ?',
    ['2026-09-21'],
  );
  assertRowsEqual(results[0].rows, want, '缺省 select 行');
});

test('#956 ② 连接条件引用非法字段 → 按项拒并点名（好项照常，整批退出码 0）', () => {
  const dir = mkSeededDir();
  const badOn = {
    from: 'weight_log',
    join: [{ table: 'user_profile', type: 'left', on: [{ left: 'user_profile.id', right: 'weight_log.不存在的列' }] }],
    select: ['date'],
  };
  const badSelect = {
    from: 'weight_log',
    join: [{ table: 'user_profile', type: 'left', on: [{ left: 'user_profile.id', right: 'weight_log.id' }] }],
    select: ['user_profile.不存在的列'],
  };
  const good = { from: 'weight_log', select: ['date'], where: { field: 'date', op: 'eq', value: '2026-09-21' } };
  const results = runQuery(dir, [badOn, badSelect, good]);
  assert.equal(results.length, 3);
  assertItemErrorNames(results[0], '不存在的列', '非法连接字段（on）');
  assertItemErrorNames(results[1], '不存在的列', '非法连接字段（select）');
  assertItemOk(results[2], good, '好项照常');
});

test('#956 ② 语法边界：via／多连接／歧义裸名／同名双选一律按项拒并点名', () => {
  const dir = mkSeededDir();
  const base = { from: 'weight_log', select: ['date'] };
  const via = {
    from: 'weight_log',
    join: [{ table: 'user_profile', type: 'left', via: '体重→档案', on: [{ left: 'user_profile.id', right: 'weight_log.id' }] }],
    select: ['date'],
  };
  const two = {
    from: 'weight_log',
    join: [
      { table: 'user_profile', type: 'left', on: [{ left: 'user_profile.id', right: 'weight_log.id' }] },
      { table: 'food_log', type: 'left', on: [{ left: 'food_log.date', right: 'weight_log.date' }] },
    ],
    select: ['date'],
  };
  const ambiguous = {
    from: 'weight_log',
    join: [{ table: 'user_profile', type: 'left', on: [{ left: 'user_profile.id', right: 'weight_log.id' }] }],
    select: ['note'],
  };
  const dupOut = {
    from: 'weight_log',
    join: [{ table: 'user_profile', type: 'left', on: [{ left: 'user_profile.id', right: 'weight_log.id' }] }],
    select: ['weight_log.note', 'user_profile.note'],
  };
  const results = runQuery(dir, [via, two, ambiguous, dupOut, base]);
  assert.equal(results.length, 5);
  assertItemErrorNames(results[0], 'via', 'via 预留位');
  assertItemErrorNames(results[1], '长度 1', '多连接');
  assertItemErrorNames(results[2], 'note', '歧义裸名');
  assertItemErrorNames(results[3], 'note', '同名双选');
  assertItemOk(results[4], base, '单表好项照常');
});

test('#956 ③ 单表老路径不回归：#955 形状的单表用例逐条一致', () => {
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
    select: ['food_name', 'grams', 'calories'],
    where: { field: 'date', op: 'eq', value: '2026-09-25' },
    orderBy: [{ field: 'time', dir: 'asc' }],
  };
  const results = runQuery(dir, [q1, q2]);
  assert.equal(results.length, 2);
  assertItemOk(results[0], q1, '单表 q1');
  assertItemOk(results[1], q2, '单表 q2');
  const want1 = sqlRowsOf(
    dbFile,
    'SELECT "date", "time", "weight_kg", "note" FROM "weight_log" WHERE "date" >= ? ORDER BY "date" ASC, "time" ASC',
    ['2026-09-20'],
  );
  assertRowsEqual(results[0].rows, want1, '单表 q1 行');
  const want2 = sqlRowsOf(
    dbFile,
    'SELECT "food_name", "grams", "calories" FROM "food_log" WHERE "date" = ? ORDER BY "time" ASC',
    ['2026-09-25'],
  );
  assertRowsEqual(results[1].rows, want2, '单表 q2 行');
});

test('#956 ④ 缺席：速查表与路由产物里查不到 calorie.data.query', () => {
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
