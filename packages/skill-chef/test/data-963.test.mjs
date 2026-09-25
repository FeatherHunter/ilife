/** #963 · 私家大厨数据族端到端（`chef.data.schema`＋`chef.data.query`）：同一套判据的本家夹具。
 *
 * 覆盖票面验收（机器可判，tmp 隔离，真实库与真实家目录零触碰），九条：
 *  ① 目录：表清单与声明逐条一致（17 张全量），列与 `PRAGMA` 逐条一致；
 *  ② 空表合法（表在、列在、行数为 0）＋不产文件；
 *  ③ 单表取行：行与独立 SQL 逐字段相等（含 `NULL`），字段与 `PRAGMA` 一致，缺省即全列；
 *  ④ 空集是合法结果（`rows: []`、`total: 0`，退出码 0）；
 *  ⑤ 非法字段／非法表按项拒并点名，请求级非法非 0；
 *  ⑥ 分组聚合：五函数＋`count(列)` 计非空，与独立 SQL 相等，空分组合法；
 *  ⑦ 分页续取：单表／连接／聚合三形态下 `size=2` 拼接与一次性取完不重不漏，末页无凭据，`total` 为全量；
 *  ⑧ 凭据不透明：篡改／乱填／跨查询被拒，页大小非法被拒，好项照常；
 *  ⑨ 批量：好／坏／好同序对应，坏项不毁整批，单张即长度为一的批；
 *  另带缺席：模型可见面里 `chef.data.query`／`chef.data.schema` 零命中
 *  （祖父条款 `chef.data.batch` 除外），不产文件（每条跑前后目录条目一致）。
 *
 * 判据复用六家共用件 `test/helpers/data-query-harness.mjs`（断言住那边，本件只留本家夹具）。
 * 跨表连接在本家最有用：③⑦含主表 `recipes` 与从表 `ingredients` 的显式 `on` 连接（含失配 NULL 扩展）。
 *
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-chef`，再
 *   `node --test packages/skill-chef/test/data-963.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openChefDb, closeChefDb } from '../dist/fetch/index.js';
import { CHEF_DATA_TABLES } from '../dist/data/tables.js';
import { configDirOf, homeEnvOf, requireIsolatedHome, useHome } from '../../../test/helpers/home-test-base.mjs';
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
useHome(mkdtempSync(join(tmpdir(), 'c963-base-')));
requireIsolatedHome();

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const SKILL = 'chef';
const SCHEMA_KEY = 'chef.data.schema';
const QUERY_KEY = 'chef.data.query';

/** 把 `dir` 布成隔离现场：家目录＝`dir`，配置落 `<dir>/.ilife/chef.yaml`（`db.dir = dir`）。 */
function chefConfigDir(dir) {
  const cfgDir = configDirOf(dir);
  mkdirSync(cfgDir, { recursive: true });
  writeFileSync(join(cfgDir, 'chef.yaml'), 'db:\n  dir: ' + JSON.stringify(dir) + '\n', 'utf8');
  useHome(dir);
  requireIsolatedHome();
  return dir;
}

function dbFileOf(dir) {
  return join(dir, 'chef_data.db');
}

/** 种子库：5 菜（r5 无食材，LEFT JOIN 失配 NULL 扩展）＋配料 5 行（含 NULL 用量）＋
 * 步骤 5 行（含 NULL 时长）＋历史 4 行（含 NULL 评分）＋营养 2 行（含 NULL 热量）。 */
function mkSeededDir() {
  const dir = mkdtempSync(join(tmpdir(), 'c963-seed-'));
  chefConfigDir(dir);
  const handle = openChefDb(dbFileOf(dir));
  try {
    const run = (sql, params = []) => handle.db.prepare(sql).run(...params);
    run("INSERT INTO recipes (id, name, difficulty, servings, total_time_minutes, status) VALUES ('r1', '宫保鸡丁', '中等', 2, 30, '已做')");
    run("INSERT INTO recipes (id, name, difficulty, servings, total_time_minutes, status) VALUES ('r2', '麻婆豆腐', '简单', 2, 20, '已做')");
    run("INSERT INTO recipes (id, name, difficulty, servings, total_time_minutes, status) VALUES ('r3', '白灼虾', '简单', 2, 15, '已做')");
    run("INSERT INTO recipes (id, name, difficulty, servings, total_time_minutes, status) VALUES ('r4', '红烧肉', '困难', 4, 90, '已做')");
    run("INSERT INTO recipes (id, name, difficulty, servings, total_time_minutes, status) VALUES ('r5', '凉拌黄瓜', '简单', 2, 10, '已做')");
    run("INSERT INTO ingredients (id, recipe_id, sequence, name, category, quantity, unit, quantity_text) VALUES ('i1', 'r1', 1, '鸡腿肉', '肉类', 300, '克', '300克')");
    run("INSERT INTO ingredients (id, recipe_id, sequence, name, category, quantity, unit, quantity_text) VALUES ('i2', 'r1', 2, '花生米', '坚果', NULL, '克', '适量')");
    run("INSERT INTO ingredients (id, recipe_id, sequence, name, category, quantity, unit, quantity_text) VALUES ('i3', 'r2', 1, '嫩豆腐', '豆制品', 400, '克', '400克')");
    run("INSERT INTO ingredients (id, recipe_id, sequence, name, category, quantity, unit, quantity_text) VALUES ('i4', 'r3', 1, '基围虾', '海鲜', 500, '克', '500克')");
    run("INSERT INTO ingredients (id, recipe_id, sequence, name, category, quantity, unit, quantity_text) VALUES ('i5', 'r4', 1, '五花肉', '肉类', NULL, '克', '')");
    run("INSERT INTO cooking_steps (id, recipe_id, sequence, action, duration_minutes, heat_level) VALUES ('s1', 'r1', 1, '炒鸡丁', 5, '大火')");
    run("INSERT INTO cooking_steps (id, recipe_id, sequence, action, duration_minutes, heat_level) VALUES ('s2', 'r1', 2, '收汁', NULL, '大火')");
    run("INSERT INTO cooking_steps (id, recipe_id, sequence, action, duration_minutes, heat_level) VALUES ('s3', 'r2', 1, '焯水', 2, '中火')");
    run("INSERT INTO cooking_steps (id, recipe_id, sequence, action, duration_minutes, heat_level) VALUES ('s4', 'r3', 1, '白灼', 3, '大火')");
    run("INSERT INTO cooking_steps (id, recipe_id, sequence, action, duration_minutes, heat_level) VALUES ('s5', 'r4', 1, '炖肉', 60, '小火')");
    run("INSERT INTO recipe_history (id, recipe_id, cook_date, cook_sequence, rating, feedback) VALUES ('h1', 'r1', '2026-09-20', 1, 5, '很香')");
    run("INSERT INTO recipe_history (id, recipe_id, cook_date, cook_sequence, rating, feedback) VALUES ('h2', 'r1', '2026-09-21', 1, NULL, '忘评')");
    run("INSERT INTO recipe_history (id, recipe_id, cook_date, cook_sequence, rating, feedback) VALUES ('h3', 'r2', '2026-09-22', 1, 4, '下饭')");
    run("INSERT INTO recipe_history (id, recipe_id, cook_date, cook_sequence, rating, feedback) VALUES ('h4', 'r3', '2026-09-23', 1, 3, '')");
    run("INSERT INTO nutrition_info (id, recipe_id, calories, protein) VALUES ('n1', 'r1', 650, 30)");
    run("INSERT INTO nutrition_info (id, recipe_id, calories, protein) VALUES ('n2', 'r2', NULL, 12)");
  } finally {
    closeChefDb(handle);
  }
  return dir;
}

function mkEmptyDir() {
  const dir = mkdtempSync(join(tmpdir(), 'c963-empty-'));
  chefConfigDir(dir);
  const handle = openChefDb(dbFileOf(dir));
  closeChefDb(handle);
  return dir;
}

/** 库目录条目快照：排除 SQLite 的伴生文件（`-shm`／`-wal`／`-journal`，WAL checkpoint 后会消失，
 * 不是命令的产物；饼干记账同口径，见 `data-960.test.mjs`）。 */
function dirEntries(dir) {
  return readdirSync(dir).filter((e) => !e.endsWith('-shm') && !e.endsWith('-wal') && !e.endsWith('-journal')).sort();
}

function runSchemaOk(dir) {
  chefConfigDir(dir);
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
  assert.ok(!after.includes('cook_html'), '目录命令不得落 HTML 产物目录');
  return results;
}

function runQuery(dir, queries) {
  chefConfigDir(dir);
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
  assert.ok(!after.includes('cook_html'), '数据查询不得落 HTML 产物目录');
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

test('#963 ① 目录：表清单与声明逐条一致（17 张全量），列与 PRAGMA 逐条一致', () => {
  const dir = mkSeededDir();
  const results = runSchemaOk(dir);
  assert.equal(results.length, 1);
  assert.equal(results[0].ok, true);
  assert.deepEqual(results[0].tables.map((t) => t.table), [...CHEF_DATA_TABLES]);
  assert.deepEqual([...CHEF_DATA_TABLES], [
    'recipes', 'recipe_categories', 'recipe_seasons', 'recipe_cooking_methods', 'recipe_flavors',
    'recipe_diet_tags', 'recipe_meal_types', 'ingredients', 'cooking_steps', 'step_ingredients',
    'step_techniques', 'tips', 'recipe_history', 'background_knowledge', 'recipe_relations',
    'cookware', 'nutrition_info',
  ], '本家暴露 17 张用户表（主表＋从表）');
  const pragma = pragmaFieldsOf(dbFileOf(dir), [...CHEF_DATA_TABLES]);
  for (const t of results[0].tables) {
    assertFieldsMatchPragma(t.fields, pragma.get(t.table), t.table);
  }
});

test('#963 ② 空表合法：表在、列在、行数为 0，退出码 0，不产文件', () => {
  const dir = mkEmptyDir();
  const results = runSchemaOk(dir);
  assert.equal(results[0].tables.length, 17);
  for (const t of results[0].tables) {
    assert.ok(t.fields.length > 0, '空表也须有列：' + t.table);
  }
  const pragma = pragmaFieldsOf(dbFileOf(dir), [...CHEF_DATA_TABLES]);
  assertFieldsMatchPragma(results[0].tables[0].fields, pragma.get('recipes'), 'recipes 空表列');
  const qResults = runQuery(dir, [{ from: 'recipes' }]);
  assertEmptyOk(qResults[0], '空表行查询');
});

test('#963 ③ 单表取行＋跨表连接：行与独立 SQL 逐字段相等（含 NULL），字段与 PRAGMA 一致，缺省即全列', () => {
  const dir = mkSeededDir();
  const dbFile = dbFileOf(dir);
  const q1 = {
    from: 'ingredients',
    select: ['name', 'category', 'quantity', 'quantity_text'],
    where: { and: [{ field: 'category', op: 'eq', value: '肉类' }] },
    orderBy: [{ field: 'name', dir: 'asc' }],
  };
  const results = runQuery(dir, [q1]);
  assert.equal(results.length, 1);
  assertItemOk(results[0], q1, 'q1');
  const want1 = sqlRowsOf(
    dbFile,
    'SELECT "name", "category", "quantity", "quantity_text" FROM "ingredients" WHERE "category" = ? ORDER BY "name" ASC',
    ['肉类'],
  );
  assertRowsEqual(results[0].rows, want1, 'q1');
  assert.ok(want1.some((r) => r.quantity === null), '种子须含 NULL 行（独立读数里要有 null）');
  const pragma = pragmaFieldsOf(dbFile, [...CHEF_DATA_TABLES]);
  const full = pragma.get('ingredients');
  assertFieldsMatchPragma(results[0].fields, q1.select.map((n) => full.find((c) => c.name === n)), 'q1 fields');
  // 跨表连接：主表＋从表显式 on（含 r5 失配 NULL 扩展），输出键无碰撞。
  const qJoin = {
    from: 'recipes',
    join: [{ table: 'ingredients', type: 'left', on: [{ left: 'recipes.id', right: 'ingredients.recipe_id' }] }],
    select: ['recipes.name', 'difficulty', 'quantity'],
    orderBy: [{ field: 'recipes.name', dir: 'asc' }],
  };
  const joinResults = runQuery(dir, [qJoin]);
  assert.equal(joinResults.length, 1);
  assertItemOk(joinResults[0], qJoin, 'qJoin');
  const wantJoin = sqlRowsOf(
    dbFile,
    'SELECT "recipes"."name" AS "name", "recipes"."difficulty" AS "difficulty", "ingredients"."quantity" AS "quantity" FROM "recipes" LEFT JOIN "ingredients" ON "recipes"."id" = "ingredients"."recipe_id" ORDER BY "recipes"."name" ASC',
    [],
  );
  assertRowsEqual(joinResults[0].rows, wantJoin, 'qJoin');
  assert.ok(wantJoin.some((r) => r.quantity === null), 'LEFT JOIN 须含失配 NULL 扩展行（含 r5 与 NULL 用量）');
  // 缺省 select 即 from 全列。
  const qFull = { from: 'recipes', where: { field: 'name', op: 'eq', value: '麻婆豆腐' } };
  const fullResults = runQuery(dir, [qFull]);
  assertItemOk(fullResults[0], qFull, '缺省 select');
  assertFieldsMatchPragma(fullResults[0].fields, pragma.get('recipes'), '缺省 select 即全列');
  const wantFull = sqlRowsOf(dbFile, 'SELECT * FROM "recipes" WHERE "name" = ?', ['麻婆豆腐']);
  assertRowsEqual(fullResults[0].rows, wantFull, '缺省 select 行');
});

test('#963 ④ 空范围是合法结果（rows: []、total: 0，退出码 0）', () => {
  const dir = mkSeededDir();
  const results = runQuery(dir, [
    { from: 'recipes', where: { field: 'name', op: 'eq', value: '不存在的菜xxx' } },
  ]);
  assert.equal(results.length, 1);
  assertEmptyOk(results[0], '空范围');
});

test('#963 ⑤ 非法字段／非法表按项拒并点名，请求级非法非 0', () => {
  const dir = mkSeededDir();
  const results = runQuery(dir, [
    { from: 'recipes', select: ['name', '不存在的列'] },
    { from: '不存在的表', select: ['name'] },
    { from: 'recipes', join: [{ table: '不存在的表', type: 'left', on: [{ left: 'recipes.id', right: '不存在的表.recipe_id' }] }] },
  ]);
  assert.equal(results.length, 3);
  assertItemErrorNames(results[0], '不存在的列', '非法字段');
  assertItemErrorNames(results[1], '不存在的表', '非法表名');
  assertItemErrorNames(results[2], '不存在的表', '连接第二张非法表');
  chefConfigDir(dir);
  const env = { ...process.env, ...homeEnvOf(dir) };
  for (const [params, hint] of [
    ['{"queries":[]}', 'queries'],
    ['{"from":"recipes"}', 'queries'],
    ['[]', '--params'],
  ]) {
    const { status, stderr } = runCli(NODE_BIN, BIN, [QUERY_KEY, '--params', params], env);
    assert.notEqual(status, 0, '请求级非法须非 0 退出：' + params);
    assert.ok((stderr || '').includes(hint), '报文须指向请求本身（含「' + hint + '」）：' + (stderr || '').slice(-300));
  }
});

test('#963 ⑥ 分组聚合：五函数＋count(列)计非空，与独立 SQL 相等，空分组合法', () => {
  const dir = mkSeededDir();
  const dbFile = dbFileOf(dir);
  const aggQ = {
    from: 'ingredients',
    groupBy: ['category'],
    agg: [
      { fn: 'sum', field: 'quantity', as: 'total_qty' },
      { fn: 'avg', field: 'quantity', as: 'avg_qty' },
      { fn: 'count', field: '*', as: 'n' },
      { fn: 'min', field: 'quantity', as: 'min_qty' },
      { fn: 'max', field: 'quantity', as: 'max_qty' },
      { fn: 'count', field: 'quantity', as: 'qty_n' },
    ],
    orderBy: [{ field: 'category', dir: 'asc' }],
  };
  const results = runQuery(dir, [aggQ]);
  assert.equal(results.length, 1);
  assertItemOk(results[0], aggQ, '分组聚合');
  const want = sqlRowsOf(
    dbFile,
    'SELECT "category", SUM("quantity") AS "total_qty", AVG("quantity") AS "avg_qty", COUNT(*) AS "n", MIN("quantity") AS "min_qty", MAX("quantity") AS "max_qty", COUNT("quantity") AS "qty_n" FROM "ingredients" GROUP BY "category" ORDER BY "category" ASC',
  );
  assertRowsEqual(results[0].rows, want, '分组聚合行');
  const empty = runQuery(dir, [
    {
      from: 'ingredients',
      where: { field: 'category', op: 'eq', value: '不存在的分类xxx' },
      groupBy: ['category'],
      agg: [{ fn: 'sum', field: 'quantity', as: 'total_qty' }],
    },
  ]);
  assertEmptyOk(empty[0], '空分组');
});

test('#963 ⑦ 分页续取：单表／连接／聚合三形态 size=2 拼接与一次性取完不重不漏，末页无凭据，total 为全量', () => {
  const dir = mkSeededDir();
  const dbFile = dbFileOf(dir);
  // 单表：5 菜 size=2 → 3 页（2＋2＋1）。
  const base = {
    from: 'recipes',
    select: ['name', 'difficulty'],
    orderBy: [{ field: 'name', dir: 'asc' }],
  };
  const { pages, concatRows } = collectAll(dir, base, 2);
  assert.equal(pages.length, 3, '5 行 size=2 须 3 页（2＋2＋1）');
  assertHasNext(pages[0], 'p0');
  assertHasNext(pages[1], 'p1');
  assertNoNext(pages[2], 'p2 末页');
  for (const [i, p] of pages.entries()) {
    assertTotalEquals(p, 5, 'p' + i + ' total 全量');
    assert.ok(!String(p.next ?? '').includes('recipes'), 'p' + i + ' 凭据须不透明（不得明文含表名）');
  }
  const full = runQuery(dir, [{ ...base }]);
  assertNoNext(full[0], '一次性取完（缺省页大小 100，5 行一页）');
  assertRowsEqual(concatRows, full[0].rows, '拼接 vs 一次性');
  const want = sqlRowsOf(
    dbFile,
    'SELECT "name", "difficulty" FROM "recipes" ORDER BY "name" ASC',
    [],
  );
  assertRowsEqual(concatRows, want, '拼接 vs 独立 SQL');
  // 连接：LEFT JOIN 6 行（含 r5 失配 NULL）size=2 → 3 页。
  const joinBase = {
    from: 'recipes',
    join: [{ table: 'ingredients', type: 'left', on: [{ left: 'recipes.id', right: 'ingredients.recipe_id' }] }],
    select: ['recipes.name', 'difficulty', 'quantity'],
    orderBy: [{ field: 'recipes.name', dir: 'asc' }],
  };
  const joinAll = collectAll(dir, joinBase, 2);
  assert.equal(joinAll.pages.length, 3, 'JOIN 6 行 size=2 须 3 页');
  assertNoNext(joinAll.pages[2], 'JOIN 末页');
  const wantJoin = sqlRowsOf(
    dbFile,
    'SELECT "recipes"."name" AS "name", "recipes"."difficulty" AS "difficulty", "ingredients"."quantity" AS "quantity" FROM "recipes" LEFT JOIN "ingredients" ON "recipes"."id" = "ingredients"."recipe_id" ORDER BY "recipes"."name" ASC',
    [],
  );
  assertRowsEqual(joinAll.concatRows, wantJoin, 'JOIN 拼接 vs 独立 SQL');
  // 聚合：4 组 size=2 → 2 页。
  const aggBase = {
    from: 'ingredients',
    groupBy: ['category'],
    agg: [{ fn: 'count', field: '*', as: 'n' }],
    orderBy: [{ field: 'category', dir: 'asc' }],
  };
  const aggAll = collectAll(dir, aggBase, 2);
  assert.equal(aggAll.pages.length, 2, '聚合 4 组 size=2 须 2 页');
  assertNoNext(aggAll.pages[1], '聚合末页');
  const wantAgg = sqlRowsOf(
    dbFile,
    'SELECT "category", COUNT(*) AS "n" FROM "ingredients" GROUP BY "category" ORDER BY "category" ASC',
    [],
  );
  assertRowsEqual(aggAll.concatRows, wantAgg, '聚合拼接 vs 独立 SQL');
});

test('#963 ⑧ 凭据不透明：篡改／乱填／跨查询被拒，页大小非法被拒，好项照常', () => {
  const dir = mkSeededDir();
  const base = {
    from: 'recipes',
    select: ['name', 'difficulty'],
    orderBy: [{ field: 'name', dir: 'asc' }],
  };
  const first = runQuery(dir, [{ ...base, page: { size: 2 } }]);
  assertHasNext(first[0], '首批');
  const goodNext = first[0].next;
  const badNext = goodNext.slice(0, -1) + (goodNext.slice(-1) === '0' ? '1' : '0');
  const other = {
    from: 'recipes',
    select: ['name'],
    where: { field: 'difficulty', op: 'eq', value: '简单' },
    orderBy: [{ field: 'name', dir: 'asc' }],
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

test('#963 ⑨ 批量：好／坏／好同序对应，坏项不毁整批，单张即长度为一的批；新键缺席零命中', () => {
  const dir = mkSeededDir();
  const dbFile = dbFileOf(dir);
  const q1 = {
    id: '川菜线',
    from: 'recipes',
    select: ['name', 'difficulty'],
    where: { field: 'difficulty', op: 'eq', value: '简单' },
    orderBy: [{ field: 'name', dir: 'asc' }],
  };
  const qBad = { id: '坏的那张', from: 'recipes', select: ['name', '不存在的列'] };
  const q3 = {
    id: '配料线',
    from: 'ingredients',
    select: ['name', 'quantity'],
    where: { field: 'category', op: 'eq', value: '肉类' },
    orderBy: [{ field: 'name', dir: 'asc' }],
  };
  const results = runQuery(dir, [q1, qBad, q3]);
  assert.equal(results.length, 3);
  assert.deepEqual(results[0].query, q1);
  assert.deepEqual(results[1].query, qBad);
  assert.deepEqual(results[2].query, q3);
  assert.equal(results[0].id, '川菜线');
  assert.equal(results[1].id, '坏的那张');
  assert.equal(results[2].id, '配料线');
  assertItemOk(results[0], q1, 'q1');
  assertItemOk(results[2], q3, 'q3');
  const want1 = sqlRowsOf(
    dbFile,
    'SELECT "name", "difficulty" FROM "recipes" WHERE "difficulty" = ? ORDER BY "name" ASC',
    ['简单'],
  );
  assertRowsEqual(results[0].rows, want1, 'q1');
  assertItemErrorNames(results[1], '不存在的列', '坏项');
  const single = runQuery(dir, [{ id: '单张', from: 'recipes', select: ['name'], where: { field: 'name', op: 'eq', value: '麻婆豆腐' } }]);
  assert.equal(single.length, 1);
  assert.equal(single[0].id, '单张');
  // 缺席：新两键在模型可见面零命中；祖父条款 `chef.data.batch` 除外。
  const pkgDir = join(HERE, '..');
  const skill = readFileSync(join(pkgDir, 'SKILL.md'), 'utf8');
  const autoStart = '<!-- HELP-AUTO-START -->';
  const autoEnd = '<!-- HELP-AUTO-END -->';
  const auto = skill.slice(skill.indexOf(autoStart), skill.indexOf(autoEnd) + autoEnd.length);
  assert.ok(skill.indexOf(autoStart) >= 0 && skill.indexOf(autoEnd) > skill.indexOf(autoStart), 'SKILL.md 缺 HELP-AUTO 块');
  assert.equal(auto.includes('chef.data.query'), false, 'SKILL.md 说明面泄漏了引擎命令');
  assert.equal(auto.includes('chef.data.schema'), false, 'SKILL.md 说明面泄漏了目录命令');
  const wake = readFileSync(join(pkgDir, 'src', 'policy', 'wakewords.ts'), 'utf8');
  assert.equal(wake.includes('chef.data.query'), false, '唤醒词表泄漏了引擎命令');
  assert.equal(wake.includes('chef.data.schema'), false, '唤醒词表泄漏了目录命令');
  const scenes = readFileSync(join(pkgDir, 'src', 'triggers', 'chef-scenes.ts'), 'utf8');
  assert.equal(scenes.includes('chef.data.query'), false, '场景资产泄漏了引擎命令');
  assert.equal(scenes.includes('chef.data.schema'), false, '场景资产泄漏了目录命令');
  const helpBuild = readFileSync(join(pkgDir, 'scripts', 'build-help.mjs'), 'utf8');
  assert.ok(!helpBuild.includes('chef.data.query') && !helpBuild.includes('chef.data.schema'), 'HELP 构建脚本不得硬编码数据族新键');
});
