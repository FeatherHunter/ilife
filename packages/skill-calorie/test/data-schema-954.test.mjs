/** #954 · 目录命令端到端（`calorie.data.schema`）：表清单来自显式声明，列与类型运行时现读。
 *
 * 覆盖票面五条验收（机器可判，tmp 隔离，真实 DB 与真实家目录零触碰）：
 *  ① 跑目录命令得 `shape: resultset`，回的表清单与声明（`CALORIE_DATA_TABLES`）逐条一致；
 *  ② 回的列与类型与独立跑的 `PRAGMA table_info` 逐条一致（判据不手抄列名）；
 *  ③ 速查表与路由产物里查不到该命令（路由生成物／SKILL.md 说明面／构建脚本三标记块）；
 *  ④ 空表合法（新库零行：表在、列在、行数为 0，退出码 0）；
 *  ⑤ 不产任何文件（跑前后库目录条目逐字节一致，无 `calorie_html` 落点）。
 *
 * 运行：先 `pnpm build`（`tsc -b`），再 `node --test packages/skill-calorie/test/data-schema-954.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { CALORIE_DATA_TABLES } from '../dist/data/tables.js';
import { calorieConfigDir, configTestBase } from './helpers/config-test.mjs';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_NAME = 'calorie_data.db';

function mkSeededDir() {
  const dir = mkdtempSync(join(tmpdir(), 'd954-seed-'));
  const db = openDb(join(dir, DB_NAME));
  db.prepare("INSERT INTO food_log (date, time, food_name, grams, calories) VALUES ('2026-09-25', '12:00:00', '米饭', 200, 260)").run();
  db.prepare("INSERT INTO weight_log (date, time, weight_kg) VALUES ('2026-09-25', '07:00:00', 70.5)").run();
  db.close();
  return dir;
}

function mkEmptyDir() {
  const dir = mkdtempSync(join(tmpdir(), 'd954-empty-'));
  openDb(join(dir, DB_NAME)).close();
  return dir;
}

function runSchema(dir) {
  // 先布隔离现场（配置落 `<dir>/.ilife/calorie.yaml`），再对库目录快照：
  // 快照之后的新增才算命令的产物，布现场的写入不算。
  calorieConfigDir(dir);
  const before = readdirSync(dir).sort();
  const r = spawnSync(NODE_BIN, [BIN, 'calorie.data.schema'], {
    encoding: 'utf8', env: { ...process.env, ...homeEnvOf(dir) },
  });
  assert.equal(r.status, 0, 'exit ' + r.status + ' stderr=' + (r.stderr || '').slice(-500));
  return { r, before };
}

function runSchemaOk(dir) {
  const { r, before } = runSchema(dir);
  const lines = r.stdout.trimEnd().split('\n');
  assert.equal(lines.length, 1, 'stdout 须为一行 envelope JSON（实际 ' + lines.length + ' 行）');
  const env = JSON.parse(lines[0]);
  assert.equal(env.version, '0.1.0');
  assert.equal(env.skill, 'calorie');
  assert.equal(env.key, 'calorie.data.schema');
  assert.equal(env.shape, 'resultset');
  const after = readdirSync(dir).sort();
  assert.deepEqual(after, before, '跑完库目录不得新增产物（前后条目不一致）');
  assert.ok(!after.includes('calorie_html'), '目录命令不得落 HTML 产物目录');
  return env;
}

/** 独立读数：测试自己直连库跑 `PRAGMA table_info`（不经过被测实现），按 `cid` 排序回名与类型。 */
function pragmaFields(dbFile) {
  const db = new DatabaseSync(dbFile, { readOnly: true });
  try {
    const out = new Map();
    for (const table of CALORIE_DATA_TABLES) {
      const rows = db.prepare('PRAGMA table_info("' + table + '")').all();
      assert.ok(rows.length > 0, '独立读数：' + table + ' 表不存在');
      const cols = rows
        .map((r) => ({ cid: r.cid, name: r.name, type: r.type }))
        .sort((a, b) => a.cid - b.cid)
        .map(({ name, type }) => ({ name, type }));
      out.set(table, cols);
    }
    return out;
  } finally {
    db.close();
  }
}

function rowCounts(dbFile) {
  const db = new DatabaseSync(dbFile, { readOnly: true });
  try {
    const out = new Map();
    for (const table of CALORIE_DATA_TABLES) {
      out.set(table, db.prepare('SELECT COUNT(*) AS n FROM "' + table + '"').get().n);
    }
    return out;
  } finally {
    db.close();
  }
}

test('#954 ①② 有行库：shape 为 resultset，表清单与声明逐条一致，列与类型与 PRAGMA 逐条一致', () => {
  const dir = mkSeededDir();
  const env = runSchemaOk(dir);
  assert.ok(Array.isArray(env.data.results));
  assert.equal(env.data.results.length, 1);
  const item = env.data.results[0];
  assert.equal(item.ok, true);
  assert.deepEqual(item.tables.map((t) => t.table), [...CALORIE_DATA_TABLES]);
  const want = pragmaFields(join(dir, DB_NAME));
  for (const t of item.tables) {
    assert.deepEqual(t.fields, want.get(t.table), t.table + ' 的列与类型与 PRAGMA 不一致');
  }
});

test('#954 ④ 空库：表在、列在、行数为 0，退出码 0', () => {
  const dir = mkEmptyDir();
  const counts = rowCounts(join(dir, DB_NAME));
  for (const table of CALORIE_DATA_TABLES) {
    assert.equal(counts.get(table), 0, table + ' 应为空表');
  }
  const env = runSchemaOk(dir);
  const item = env.data.results[0];
  assert.deepEqual(item.tables.map((t) => t.table), [...CALORIE_DATA_TABLES]);
  const want = pragmaFields(join(dir, DB_NAME));
  for (const t of item.tables) {
    assert.ok(t.fields.length > 0, t.table + ' 空表也须有列');
    assert.deepEqual(t.fields, want.get(t.table), t.table + ' 空表的列与 PRAGMA 不一致');
  }
});

test('#954 ② 列现读：有行与空库回的列一致（列不跟着行走）', () => {
  const seeded = runSchemaOk(mkSeededDir()).data.results[0].tables;
  const empty = runSchemaOk(mkEmptyDir()).data.results[0].tables;
  assert.deepEqual(
    seeded.map((t) => [t.table, t.fields]),
    empty.map((t) => [t.table, t.fields]),
  );
});

test('#954 ③ 缺席：速查表与路由产物里查不到 calorie.data.schema', () => {
  const pkgDir = join(HERE, '..');
  const routes = readFileSync(join(pkgDir, 'src', 'triggers', 'routes.generated.ts'), 'utf8');
  assert.equal(routes.includes('calorie.data.schema'), false, '路由产物泄漏了目录命令');
  const bh = readFileSync(join(pkgDir, 'scripts', 'build-help.mjs'), 'utf8');
  for (const [start, end] of [
    ['// -- GEN-CLI-START REPR 表', '// -- GEN-CLI-END REPR 表'],
    ['// -- GEN-CLI-START EXAMPLE 表', '// -- GEN-CLI-END EXAMPLE 表'],
    ['// -- GEN-CLI-START FLOW 表', '// -- GEN-CLI-END FLOW 表'],
  ]) {
    const block = bh.slice(bh.indexOf(start), bh.indexOf(end) + end.length);
    assert.ok(bh.indexOf(start) >= 0 && bh.indexOf(end) > bh.indexOf(start), '标记块缺失：' + start);
    assert.equal(block.includes('calorie.data.schema'), false, '速查表构建块泄漏了目录命令：' + start);
  }
  const skill = readFileSync(join(pkgDir, 'SKILL.md'), 'utf8');
  const autoStart = '<!-- HELP-AUTO-START -->';
  const autoEnd = '<!-- HELP-AUTO-END -->';
  const auto = skill.slice(skill.indexOf(autoStart), skill.indexOf(autoEnd) + autoEnd.length);
  assert.ok(skill.indexOf(autoStart) >= 0 && skill.indexOf(autoEnd) > skill.indexOf(autoStart), 'SKILL.md 缺 HELP-AUTO 块');
  assert.equal(auto.includes('calorie.data.schema'), false, 'SKILL.md 说明面泄漏了目录命令');
});
