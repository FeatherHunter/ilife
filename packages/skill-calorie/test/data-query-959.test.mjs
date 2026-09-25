/** #959 · 批量与单项失败端到端（`calorie.data.query`）：一组查询单同序对应，坏项不毁整批。
 *
 * 覆盖票面五条验收（机器可判，tmp 隔离，真实 DB 与真实家目录零触碰）：
 *  ① 一次交三张查询单（含一张故意写坏的），`results` 长度与顺序与请求一致，每项回显自己那张查询单；
 *  ② 坏项 `ok:false` ＋ 错误对象（码与报文可读，点名坏字段），好项照常回行，整批退出码为 0；
 *  ③ 请求级非法（顶层不是对象／`queries` 不是数组）→ 非 0 退出，报文指向请求本身；
 *  ④ 每项可带调用方标识（`id`），好项与坏项都原样回在结果里；
 *  ⑤ 批量与单张查询在同一份载荷形态下成立（单张＝长度为一的批，仍走 `{ queries: [...] }`）。
 *
 * 不碰的东西：视图族与写族；库只读；不产文件；单张查询路径的既有行为（本件只加判据，不改实现）。
 * 判据复用六家共用件 `test/helpers/data-query-harness.mjs`（断言住那边，本件只留卡路里夹具）。
 *
 * 运行：先 `pnpm build`（`tsc -b`），再 `node --test packages/skill-calorie/test/data-query-959.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { calorieConfigDir, configTestBase } from './helpers/config-test.mjs';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
import {
  runCli,
  parseEnvelopeLine,
  assertResultsetEnvelope,
  assertRowsEqual,
  assertItemOk,
  assertItemErrorNames,
  sqlRowsOf,
} from '../../../test/helpers/data-query-harness.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_NAME = 'calorie_data.db';
const SKILL = 'calorie';
const KEY = 'calorie.data.query';

/** 种子库：含 `NULL`（note 留空），覆盖好项逐字段相等含 NULL。 */
function mkSeededDir() {
  const dir = mkdtempSync(join(tmpdir(), 'd959-seed-'));
  const db = openDb(join(dir, DB_NAME));
  db.prepare("INSERT INTO weight_log (date, time, weight_kg, note) VALUES ('2026-09-20', '07:00:00', 70.5, '晨起')").run();
  db.prepare("INSERT INTO weight_log (date, time, weight_kg, note) VALUES ('2026-09-21', '07:05:00', 70.2, NULL)").run();
  db.prepare("INSERT INTO weight_log (date, time, weight_kg, note) VALUES ('2026-09-25', '07:00:00', 69.8, '')").run();
  db.prepare("INSERT INTO food_log (date, time, food_name, grams, calories, note, sodium_mg) VALUES ('2026-09-25', '12:00:00', '米饭', 200, 260, '午餐', NULL)").run();
  db.prepare("INSERT INTO food_log (date, time, food_name, grams, calories, note, sodium_mg) VALUES ('2026-09-25', '18:30:00', '鸡蛋', 100, 155, NULL, 120.5)").run();
  db.close();
  return dir;
}

function runBatch(dir, queries) {
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

test('#959 ①②④ 三张混合批：好／坏／好同序对应，坏项带错误对象，好项照常回行，标识原样回', () => {
  const dir = mkSeededDir();
  const dbFile = join(dir, DB_NAME);
  const q1 = {
    id: '体重线',
    from: 'weight_log',
    select: ['date', 'time', 'weight_kg', 'note'],
    where: { and: [{ field: 'date', op: 'gte', value: '2026-09-20' }] },
    orderBy: [{ field: 'date', dir: 'asc' }, { field: 'time', dir: 'asc' }],
  };
  const qBad = {
    id: '坏的那张',
    from: 'weight_log',
    select: ['date', '不存在的列'],
  };
  const q3 = {
    id: '晚餐线',
    from: 'food_log',
    select: ['food_name', 'grams', 'calories', 'note', 'sodium_mg'],
    where: { field: 'date', op: 'eq', value: '2026-09-25' },
    orderBy: [{ field: 'time', dir: 'asc' }],
  };
  const results = runBatch(dir, [q1, qBad, q3]);
  assert.equal(results.length, 3, 'results 长度须与请求一致（3）');
  assert.deepEqual(results[0].query, q1, '第 0 项须回显第 0 张查询单');
  assert.deepEqual(results[1].query, qBad, '第 1 项须回显第 1 张查询单');
  assert.deepEqual(results[2].query, q3, '第 2 项须回显第 2 张查询单');
  // 调用方标识：好项与坏项都原样回。
  assert.equal(results[0].id, '体重线', '好项标识须原样回');
  assert.equal(results[1].id, '坏的那张', '坏项标识须原样回');
  assert.equal(results[2].id, '晚餐线', '好项标识须原样回');
  // 好项照常。
  assertItemOk(results[0], q1, 'q1');
  assertItemOk(results[2], q3, 'q3');
  const want1 = sqlRowsOf(
    dbFile,
    'SELECT "date", "time", "weight_kg", "note" FROM "weight_log" WHERE "date" >= ? ORDER BY "date" ASC, "time" ASC',
    ['2026-09-20'],
  );
  assertRowsEqual(results[0].rows, want1, 'q1');
  const want3 = sqlRowsOf(
    dbFile,
    'SELECT "food_name", "grams", "calories", "note", "sodium_mg" FROM "food_log" WHERE "date" = ? ORDER BY "time" ASC',
    ['2026-09-25'],
  );
  assertRowsEqual(results[2].rows, want3, 'q3');
  // 坏项：ok:false ＋ 错误对象（码与报文可读，点名坏字段）。
  assertItemErrorNames(results[1], '不存在的列', '坏项');
  assert.equal(typeof results[1].error.code, 'string', '坏项错误码须为字符串');
  assert.ok(results[1].error.code.length > 0, '坏项错误码须可读（非空）');
  assert.equal(typeof results[1].error.message, 'string', '坏项报文须为字符串');
  assert.ok(results[1].error.message.length > 0, '坏项报文须可读（非空）');
});

test('#959 ③ 请求级非法 → 非 0 退出，报文指向请求本身（顶层不是对象／queries 不是数组）', () => {
  const dir = mkSeededDir();
  calorieConfigDir(dir);
  const env = { ...process.env, ...homeEnvOf(dir) };
  for (const [params, hint] of [
    ['[]', '--params'],
    ['"只是一段字符串"', '--params'],
    ['{"queries":"不是数组"}', 'queries'],
    ['{"queries":[]}', 'queries'],
  ]) {
    const { status, stderr } = runCli(NODE_BIN, BIN, [KEY, '--params', params], env);
    assert.notEqual(status, 0, '请求级非法须非 0 退出：' + params);
    assert.ok((stderr || '').includes(hint), '报文须指向请求本身（含「' + hint + '」）：' + (stderr || '').slice(-300));
  }
});

test('#959 ⑤ 单张＝长度为一的批：同一份 `{ queries: [...] }` 载荷形态下成立', () => {
  const dir = mkSeededDir();
  const dbFile = join(dir, DB_NAME);
  const q = {
    id: '单张',
    from: 'weight_log',
    select: ['date', 'weight_kg'],
    where: { field: 'date', op: 'eq', value: '2026-09-21' },
    orderBy: [{ field: 'date', dir: 'asc' }],
  };
  const results = runBatch(dir, [q]);
  assert.equal(results.length, 1, '单张批 results 长度须为 1');
  assert.deepEqual(results[0].query, q, '单张批须回显自己那张查询单');
  assert.equal(results[0].id, '单张', '单张批标识须原样回');
  assertItemOk(results[0], q, '单张批');
  const want = sqlRowsOf(dbFile, 'SELECT "date", "weight_kg" FROM "weight_log" WHERE "date" = ?', ['2026-09-21']);
  assertRowsEqual(results[0].rows, want, '单张批行');
});
