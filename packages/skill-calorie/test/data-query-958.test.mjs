/** #958 · 分页续取端到端（`calorie.data.query`＋`page`）：页大小截断＋`next` 不透明凭据续取。
 *
 * 覆盖票面五条验收（机器可判，tmp 隔离，真实 DB 与真实家目录零触碰）：
 *  ① 页大小生效：单次返回的行数不超过设定值；
 *  ② 用回传的凭据连续取到的行，拼起来与一次性取完不重不漏（含独立 SQL 对账）；
 *  ③ 取到末尾时不再回凭据（末页 `next` 缺席）；
 *  ④ 凭据对调用方不透明：篡改／乱填被拒，报文可读（含校验未通过、格式错误、跨查询复用）；
 *  ⑤ 行查询与聚合查询两种形态下，续取都成立（单表行＋连接行走游标，聚合走偏移）。
 *
 * 不碰的东西：单次响应的载荷形态（除新增 `next` 字段外一字不变：`fields` 与 `PRAGMA` 一致、
 * 行键集合一致、`total` 为全量命中数）；视图族与写族；库只读；不产文件。
 * 页大小默认值与上限为可调参数（公共层 `DEFAULT_PAGE_SIZE`／`MAX_PAGE_SIZE`，取值口径另议）。
 * 判据复用六家共用件 `test/helpers/data-query-harness.mjs`（断言住那边，本件只留卡路里夹具）。
 *
 * 运行：先 `pnpm build`（`tsc -b`），再 `node --test packages/skill-calorie/test/data-query-958.test.mjs`
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
  assertPageSize,
  assertHasNext,
  assertNoNext,
  assertTotalEquals,
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

/** 种子库：weight_log 5 行（日期 20–24，note 含 '晨起'／NULL／空串，覆盖 NULL 游标）＋ user_profile 1 行 ＋ food_log 5 行跨 3 天（供聚合分组）。 */
function mkSeededDir() {
  const dir = mkdtempSync(join(tmpdir(), 'd958-seed-'));
  const db = openDb(join(dir, DB_NAME));
  db.prepare("INSERT INTO weight_log (date, time, weight_kg, note) VALUES ('2026-09-20', '07:00:00', 70.5, '晨起')").run();
  db.prepare("INSERT INTO weight_log (date, time, weight_kg, note) VALUES ('2026-09-21', '07:05:00', 70.2, NULL)").run();
  db.prepare("INSERT INTO weight_log (date, time, weight_kg, note) VALUES ('2026-09-22', '07:00:00', 70.0, '')").run();
  db.prepare("INSERT INTO weight_log (date, time, weight_kg, note) VALUES ('2026-09-23', '07:00:00', 69.9, '夜跑')").run();
  db.prepare("INSERT INTO weight_log (date, time, weight_kg, note) VALUES ('2026-09-24', '07:00:00', 69.8, NULL)").run();
  db.prepare("INSERT INTO user_profile (id, age, gender, height_cm, note, activity_level) VALUES (1, NULL, 'female', NULL, NULL, 'moderate')").run();
  db.prepare("INSERT INTO food_log (date, time, food_name, grams, calories, note, sodium_mg) VALUES ('2026-09-25', '12:00:00', '米饭', 200, 260, '午餐', NULL)").run();
  db.prepare("INSERT INTO food_log (date, time, food_name, grams, calories, note, sodium_mg) VALUES ('2026-09-25', '18:30:00', '鸡蛋', 100, 155, NULL, 120.5)").run();
  db.prepare("INSERT INTO food_log (date, time, food_name, grams, calories, note, sodium_mg) VALUES ('2026-09-26', '12:00:00', '米饭', 150, 195, NULL, NULL)").run();
  db.prepare("INSERT INTO food_log (date, time, food_name, grams, calories, note, sodium_mg) VALUES ('2026-09-27', '08:00:00', '牛奶', 250, 150, '早餐', 100)").run();
  db.prepare("INSERT INTO food_log (date, time, food_name, grams, calories, note, sodium_mg) VALUES ('2026-09-27', '12:00:00', '米饭', 200, 260, NULL, NULL)").run();
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

/** 连续续取直到无 `next`：回 `{ pages, concatRows }`（每页已断页大小与 `total` 全量，调用方侧拼接）。 */
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
  const concatRows = pages.flatMap((p) => p.rows);
  return { pages, concatRows };
}

test('#958 ①②③ 单表行查询：size=2 续取拼接与一次性取完不重不漏，末页无凭据，total 为全量', () => {
  const dir = mkSeededDir();
  const dbFile = join(dir, DB_NAME);
  const base = {
    from: 'weight_log',
    select: ['date', 'time', 'weight_kg', 'note'],
    orderBy: [{ field: 'date', dir: 'asc' }],
  };
  const { pages, concatRows } = collectAll(dir, base, 2);
  assert.equal(pages.length, 3, '5 行 size=2 须 3 页（2＋2＋1）');
  assertHasNext(pages[0], 'p0');
  assertHasNext(pages[1], 'p1');
  assertNoNext(pages[2], 'p2 末页');
  for (const [i, p] of pages.entries()) {
    assertTotalEquals(p, 5, 'p' + i + ' total 全量');
    assert.ok(!String(p.next ?? '').includes('weight_log'), 'p' + i + ' 凭据须不透明（不得明文含表名）');
  }
  const full = runQuery(dir, [{ ...base }]);
  assert.equal(full.length, 1);
  assertNoNext(full[0], '一次性取完（缺省页大小 100，5 行一页）');
  assertTotalEquals(full[0], 5, 'full total');
  assertRowsEqual(concatRows, full[0].rows, '拼接 vs 一次性');
  const want = sqlRowsOf(
    dbFile,
    'SELECT "date", "time", "weight_kg", "note" FROM "weight_log" ORDER BY "date" ASC',
    [],
  );
  assertRowsEqual(concatRows, want, '拼接 vs 独立 SQL');
  assertRowsEqual(full[0].rows, want, '一次性 vs 独立 SQL');
  const pragma = pragmaFieldsOf(dbFile, [...CALORIE_DATA_TABLES]);
  const fullFields = pragma.get('weight_log').filter((c) => ['date', 'time', 'weight_kg', 'note'].includes(c.name));
  for (const [i, p] of pages.entries()) {
    assertFieldsMatchPragma(p.fields, fullFields, 'p' + i + ' fields 与 PRAGMA');
    const keys = Object.keys(p.rows[0] ?? {}).sort();
    assert.deepEqual(keys, ['date', 'note', 'time', 'weight_kg'], 'p' + i + ' 行键集合');
    const itemKeys = new Set(Object.keys(p));
    for (const k of ['ok', 'query', 'fields', 'rows', 'total']) {
      assert.ok(itemKeys.has(k), 'p' + i + ' 载荷缺字段：' + k);
    }
    assert.ok(!itemKeys.has('html'), 'p' + i + ' 不得泄漏 html 字段');
  }
});

test('#958 ② NULL 安全：按可空列排序（asc 首见 NULL／desc 尾见 NULL），size=1 仍不重不漏', () => {
  const dir = mkSeededDir();
  const dbFile = join(dir, DB_NAME);
  for (const dirName of ['asc', 'desc']) {
    const base = {
      from: 'weight_log',
      select: ['date', 'note'],
      orderBy: [{ field: 'note', dir: dirName }],
    };
    const { pages, concatRows } = collectAll(dir, base, 1);
    assert.ok(pages.length >= 5, dirName + '：5 行 size=1 至少 5 页（实际 ' + pages.length + '）');
    assertNoNext(pages[pages.length - 1], dirName + ' 末页');
    const full = runQuery(dir, [{ ...base }]);
    assertRowsEqual(concatRows, full[0].rows, dirName + ' 拼接 vs 一次性');
    const want = sqlRowsOf(
      dbFile,
      'SELECT "date", "note" FROM "weight_log" ORDER BY "note" ' + dirName.toUpperCase(),
      [],
    );
    assertRowsEqual(concatRows, want, dirName + ' 拼接 vs 独立 SQL（含 NULL 序）');
  }
});

test('#958 ⑤ 连接行查询：LEFT JOIN 分页（size=2）拼接与独立 SQL 不重不漏', () => {
  const dir = mkSeededDir();
  const dbFile = join(dir, DB_NAME);
  const base = {
    from: 'weight_log',
    join: [{ table: 'user_profile', type: 'left', on: [{ left: 'user_profile.id', right: 'weight_log.id' }] }],
    select: ['weight_log.date', 'weight_kg', 'user_profile.gender'],
    orderBy: [{ field: 'weight_log.date', dir: 'asc' }],
  };
  const { pages, concatRows } = collectAll(dir, base, 2);
  assert.equal(pages.length, 3, 'JOIN 5 行 size=2 须 3 页');
  assertNoNext(pages[2], 'join 末页');
  for (const [i, p] of pages.entries()) assertTotalEquals(p, 5, 'join p' + i);
  const full = runQuery(dir, [{ ...base }]);
  assertRowsEqual(concatRows, full[0].rows, 'join 拼接 vs 一次性');
  const want = sqlRowsOf(
    dbFile,
    'SELECT "weight_log"."date" AS "date", "weight_log"."weight_kg" AS "weight_kg", "user_profile"."gender" AS "gender" FROM "weight_log" LEFT JOIN "user_profile" ON "user_profile"."id" = "weight_log"."id" ORDER BY "weight_log"."date" ASC',
    [],
  );
  assertRowsEqual(concatRows, want, 'join 拼接 vs 独立 SQL');
});

test('#958 ⑤ 聚合查询：按日分组＋sum／count（size=2）偏移续取不重不漏', () => {
  const dir = mkSeededDir();
  const dbFile = join(dir, DB_NAME);
  const base = {
    from: 'food_log',
    groupBy: ['date'],
    agg: [
      { fn: 'sum', field: 'calories', as: 'total_cal' },
      { fn: 'count', field: '*', as: 'meals' },
    ],
    orderBy: [{ field: 'date', dir: 'asc' }],
  };
  const { pages, concatRows } = collectAll(dir, base, 2);
  assert.equal(pages.length, 2, '3 组 size=2 须 2 页（2＋1）');
  assertHasNext(pages[0], 'agg p0');
  assertNoNext(pages[1], 'agg p1 末页');
  for (const [i, p] of pages.entries()) {
    assertTotalEquals(p, 3, 'agg p' + i);
    assert.deepEqual(
      p.fields.map((f) => f.name),
      ['date', 'total_cal', 'meals'],
      'agg p' + i + ' 聚合列按 as 出现在 fields',
    );
  }
  const full = runQuery(dir, [{ ...base }]);
  assertRowsEqual(concatRows, full[0].rows, 'agg 拼接 vs 一次性');
  const want = sqlRowsOf(
    dbFile,
    'SELECT "date", SUM("calories") AS "total_cal", COUNT(*) AS "meals" FROM "food_log" GROUP BY "date" ORDER BY "date" ASC',
    [],
  );
  assertRowsEqual(concatRows, want, 'agg 拼接 vs 独立 SQL');
  assertRowsEqual(full[0].rows, want, 'agg 一次性 vs 独立 SQL');
});

test('#958 ④ 凭据不透明与页大小校验：篡改／乱填／跨查询复用按项拒，好项照常', () => {
  const dir = mkSeededDir();
  const base = {
    from: 'weight_log',
    select: ['date'],
    orderBy: [{ field: 'date', dir: 'asc' }],
  };
  const first = runQuery(dir, [{ ...base, page: { size: 2 } }]);
  assertHasNext(first[0], '取首凭据');
  const goodToken = first[0].next;
  const tampered = goodToken.slice(0, -1) + (goodToken.slice(-1) === '0' ? '1' : '0');
  const results = runQuery(dir, [
    { ...base, page: { size: 2, next: '乱填的凭据' } },
    { ...base, page: { size: 2, next: tampered } },
    { ...base, page: { size: 2, next: '' } },
    { from: 'food_log', select: ['date'], page: { size: 2, next: goodToken } },
    { ...base, page: { size: 0 } },
    { ...base, page: { size: 1001 } },
    { ...base, select: ['date'], where: { field: 'date', op: 'eq', value: '2026-09-21' } },
  ]);
  assert.equal(results.length, 7);
  assertItemErrorNames(results[0], '续取凭据', '乱填');
  assertItemErrorNames(results[1], '续取凭据', '篡改（校验未通过）');
  assertItemErrorNames(results[2], 'page.next', '空串');
  assertItemErrorNames(results[3], '续取凭据', '跨查询复用（凭据与查询单不匹配）');
  assertItemErrorNames(results[4], 'page.size', 'size=0');
  assertItemErrorNames(results[5], 'page.size', 'size 超上限');
  assertItemOk(results[6], results[6].query, '好项照常（坏凭据不毁整批）');
});

test('#958 ⑤ 缺席：速查表与路由产物里查不到 calorie.data.query（分页不泄漏说明面）', () => {
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
