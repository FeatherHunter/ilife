/** #957 · 分组聚合端到端（`calorie.data.query`＋`groupBy`／`agg`）：分组聚合结果与独立 SQL 逐字段相等。
 *
 * 覆盖票面四条验收（机器可判，tmp 隔离，真实 DB 与真实家目录零触碰）：
 *  ① 分组聚合的结果，与测试独立写的等价 SQL 逐字段相等（含 `NULL`：`count(列)` 计非空，`sodium_mg` 含 NULL 行）；
 *  ② 聚合列按查询单里的名字（`as`）出现在 `fields` 里（分组列在前、聚合列按声明序，类型按映射：`count`→INTEGER、`avg`→REAL、其余沿用被聚合列类型）；
 *  ③ 空分组 → `rows: []`、`total: 0`，退出码 0（空集合法）；
 *  ④ 用聚合表达业务派生量（例如“连续记录天数”）时本族无法表达——非法函数／表达式字段按项拒，
 *     且说明书面（SKILL.md 说明面＋路由产物零 `calorie.data.query`）与目录键（`calorie.data.schema` 无派生列）都不引导它；
 *  另锁本票语法边界（实现自选、此处书面锁定）：`groupBy` 与 `agg` 须成对出现／`select` 与 `agg` 不可同存／
 *  `join` 与 `agg` 组合另票（出现即拒）／`agg.as` 非空唯一且不得与表列同名（防遮蔽）／
 *  聚合查询的 `orderBy` 只许分组列或聚合别名／`count` 唯它允许 `field: "*"`。
 *  老路径不回归：#955 形状的单表行查询逐条一致（整份 955 件仍绿由回归门覆盖）。
 *
 * 运行：先 `pnpm build`（`tsc -b`），再 `node --test packages/skill-calorie/test/data-query-957.test.mjs`
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

/** 种子库：`food_log` 两天各 2 行（`note` 含 NULL 行，覆盖 `count(列)` 计非空；`sodium_mg` 含 NULL 行）。 */
function mkSeededDir() {
  const dir = mkdtempSync(join(tmpdir(), 'd957-seed-'));
  const db = openDb(join(dir, DB_NAME));
  db.prepare("INSERT INTO food_log (date, time, food_name, grams, calories, note, sodium_mg) VALUES ('2026-09-25', '12:00:00', '米饭', 200, 260, '午餐', NULL)").run();
  db.prepare("INSERT INTO food_log (date, time, food_name, grams, calories, note, sodium_mg) VALUES ('2026-09-25', '18:30:00', '鸡蛋', 100, 155, NULL, 120.5)").run();
  db.prepare("INSERT INTO food_log (date, time, food_name, grams, calories, note, sodium_mg) VALUES ('2026-09-26', '12:00:00', '面条', 150, 300, '午餐', 200.0)").run();
  db.prepare("INSERT INTO food_log (date, time, food_name, grams, calories, note, sodium_mg) VALUES ('2026-09-26', '19:00:00', '牛奶', 250, 150, '晚餐', NULL)").run();
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

const AGG_Q = {
  from: 'food_log',
  groupBy: ['date'],
  agg: [
    { fn: 'sum', field: 'calories', as: 'total_cal' },
    { fn: 'avg', field: 'grams', as: 'avg_g' },
    { fn: 'count', field: '*', as: 'meals' },
    { fn: 'min', field: 'calories', as: 'min_cal' },
    { fn: 'max', field: 'calories', as: 'max_cal' },
    { fn: 'count', field: 'note', as: 'note_n' },
  ],
  orderBy: [{ field: 'date', dir: 'asc' }],
};

const AGG_SQL =
  'SELECT "date", SUM("calories") AS "total_cal", AVG("grams") AS "avg_g", COUNT(*) AS "meals", ' +
  'MIN("calories") AS "min_cal", MAX("calories") AS "max_cal", COUNT("note") AS "note_n" ' +
  'FROM "food_log" GROUP BY "date" ORDER BY "date" ASC';

test('#957 ① 分组聚合：五种函数＋count(列)计非空，与独立 SQL 逐字段相等（含 NULL 种子）', () => {
  const dir = mkSeededDir();
  const dbFile = join(dir, DB_NAME);
  const results = runQuery(dir, [AGG_Q]);
  assert.equal(results.length, 1);
  assertItemOk(results[0], AGG_Q, '分组聚合');
  const want = sqlRowsOf(dbFile, AGG_SQL);
  assert.equal(want.length, 2, '独立读数须为 2 组（两天各一组）');
  assertRowsEqual(results[0].rows, want, '分组聚合行');
  const noteN = new Map(results[0].rows.map((r) => [r.date, r.note_n]));
  assert.equal(noteN.get('2026-09-25'), 1, '2026-09-25 的 note 非空计 1（含 NULL 行）');
  assert.equal(noteN.get('2026-09-26'), 2, '2026-09-26 的 note 非空计 2');
});

test('#957 ② 聚合列按查询单里的名字出现在 fields 里（分组列在前＋聚合列按声明序，类型按映射）', () => {
  const dir = mkSeededDir();
  const dbFile = join(dir, DB_NAME);
  const results = runQuery(dir, [AGG_Q]);
  const pragma = pragmaFieldsOf(dbFile, [...CALORIE_DATA_TABLES]);
  const foodCols = pragma.get('food_log');
  const typeOf = (n) => foodCols.find((c) => c.name === n).type;
  const wantFields = [
    { name: 'date', type: typeOf('date') },
    { name: 'total_cal', type: typeOf('calories') },
    { name: 'avg_g', type: 'REAL' },
    { name: 'meals', type: 'INTEGER' },
    { name: 'min_cal', type: typeOf('calories') },
    { name: 'max_cal', type: typeOf('calories') },
    { name: 'note_n', type: 'INTEGER' },
  ];
  assert.deepEqual(results[0].fields, wantFields, 'fields 须为分组列＋聚合别名（名与类型逐条一致）');
});

test('#957 ① WHERE 先过滤再分组：带条件的聚合与独立 SQL 相等，且按聚合别名排序', () => {
  const dir = mkSeededDir();
  const dbFile = join(dir, DB_NAME);
  const q = {
    from: 'food_log',
    where: { field: 'date', op: 'gte', value: '2026-09-26' },
    groupBy: ['date'],
    agg: [{ fn: 'sum', field: 'calories', as: 'total_cal' }],
    orderBy: [{ field: 'total_cal', dir: 'desc' }],
  };
  const results = runQuery(dir, [q]);
  assertItemOk(results[0], q, '条件聚合');
  const want = sqlRowsOf(
    dbFile,
    'SELECT "date", SUM("calories") AS "total_cal" FROM "food_log" WHERE "date" >= ? GROUP BY "date" ORDER BY "total_cal" DESC',
    ['2026-09-26'],
  );
  assertRowsEqual(results[0].rows, want, '条件聚合行');
});

test('#957 ③ 空分组是合法结果（rows: []、total: 0，退出码 0）', () => {
  const dir = mkSeededDir();
  const results = runQuery(dir, [
    {
      from: 'food_log',
      where: { field: 'date', op: 'gte', value: '2099-01-01' },
      groupBy: ['date'],
      agg: [{ fn: 'sum', field: 'calories', as: 'total_cal' }],
    },
  ]);
  assert.equal(results.length, 1);
  assertEmptyOk(results[0], '空分组');
});

test('#957 ④ 业务派生量无法表达：非法函数／表达式字段按项拒并点名', () => {
  const dir = mkSeededDir();
  const results = runQuery(dir, [
    { from: 'weight_log', groupBy: ['date'], agg: [{ fn: 'streak', field: 'date', as: 'days' }] },
    { from: 'weight_log', groupBy: ['date'], agg: [{ fn: 'sum', field: 'weight_kg+1', as: 'x' }] },
  ]);
  assert.equal(results.length, 2);
  assertItemErrorNames(results[0], 'streak', '连续天数式函数');
  assertItemErrorNames(results[1], 'weight_kg+1', '表达式字段');
});

test('#957 ④ 说明书面与目录键都不引导派生量：说明面零命中＋目录无派生列', () => {
  const dir = mkSeededDir();
  calorieConfigDir(dir);
  const env = { ...process.env, ...homeEnvOf(dir) };
  const r = runCli(NODE_BIN, BIN, ['calorie.data.schema'], env);
  assert.equal(r.status, 0, '目录键 exit ' + r.status);
  const schemaEnv = parseEnvelopeLine(r.stdout, 'calorie.data.schema');
  const tables = schemaEnv.data.results[0].tables;
  const allCols = tables.flatMap((t) => t.fields.map((f) => f.name));
  for (const bad of ['streak', 'gap', 'tdee', 'consecutive', 'days_in_a_row']) {
    assert.ok(!allCols.includes(bad), '目录键不得含派生列：' + bad);
  }
  const pkgDir = join(HERE, '..');
  const routes = readFileSync(join(pkgDir, 'src', 'triggers', 'routes.generated.ts'), 'utf8');
  assert.equal(routes.includes(KEY), false, '路由产物泄漏了引擎命令');
  const skill = readFileSync(join(pkgDir, 'SKILL.md'), 'utf8');
  const autoStart = '<!-- HELP-AUTO-START -->';
  const autoEnd = '<!-- HELP-AUTO-END -->';
  const auto = skill.slice(skill.indexOf(autoStart), skill.indexOf(autoEnd) + autoEnd.length);
  assert.ok(skill.indexOf(autoStart) >= 0 && skill.indexOf(autoEnd) > skill.indexOf(autoStart), 'SKILL.md 缺 HELP-AUTO 块');
  assert.equal(auto.includes(KEY), false, 'SKILL.md 说明面泄漏了引擎命令');
});

test('#957 语法边界：成对／互斥／别名／排序／连接组合各按项拒并指明', () => {
  const dir = mkSeededDir();
  const base = { from: 'food_log', groupBy: ['date'], agg: [{ fn: 'sum', field: 'calories', as: 'total_cal' }] };
  const results = runQuery(dir, [
    { from: 'food_log', agg: [{ fn: 'sum', field: 'calories', as: 'total_cal' }] },
    { from: 'food_log', groupBy: ['date'] },
    { ...base, select: ['date'] },
    { ...base, agg: [{ fn: 'sum', field: 'calories', as: 'date' }] },
    { ...base, orderBy: [{ field: 'calories', dir: 'asc' }] },
    {
      ...base,
      join: [{ table: 'user_profile', type: 'left', on: [{ left: 'user_profile.id', right: 'food_log.id' }] }],
    },
  ]);
  assert.equal(results.length, 6);
  assertItemErrorNames(results[0], '成对', 'agg 缺 groupBy');
  assertItemErrorNames(results[1], '成对', 'groupBy 缺 agg');
  assertItemErrorNames(results[2], 'select', 'select 与 agg 同存');
  assertItemErrorNames(results[3], 'date', 'as 遮蔽表列');
  assertItemErrorNames(results[4], 'calories', 'orderBy 须为分组列或聚合别名');
  assertItemErrorNames(results[5], '连接', 'join＋agg 组合');
});

test('#957 老路径不回归：#955 形状的单表行查询逐条一致', () => {
  const dir = mkSeededDir();
  const dbFile = join(dir, DB_NAME);
  const q = {
    from: 'food_log',
    select: ['date', 'food_name', 'calories'],
    where: { field: 'date', op: 'eq', value: '2026-09-25' },
    orderBy: [{ field: 'food_name', dir: 'asc' }],
  };
  const results = runQuery(dir, [q]);
  assertItemOk(results[0], q, '单表行查询');
  const want = sqlRowsOf(
    dbFile,
    'SELECT "date", "food_name", "calories" FROM "food_log" WHERE "date" = ? ORDER BY "food_name" ASC',
    ['2026-09-25'],
  );
  assertRowsEqual(results[0].rows, want, '单表行查询行');
});
