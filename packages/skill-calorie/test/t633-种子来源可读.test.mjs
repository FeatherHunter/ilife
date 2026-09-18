/** #633 · 种子食品来源名用户可读化（终审D5）。
 *
 * 口径（票面二选一取「来源行映射」）：种子条目内部来源名「测试」在食品卡片来源行改印
 * 「内置食品」；缺来源仍归「未知」（`UNKNOWN_SOURCE` 语义不变）；其余来源原样透传。
 * 不碰：来源统计口径（`sourceStatsDocs`）、来源脚注（#560）、种子值本身。
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie --force`（持锁），再
 *   `node --test packages/skill-calorie/test/t633-种子来源可读.test.mjs`（持锁）。
 */
import { strict as assert } from 'node:assert';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { openDb } from '../dist/index.js';
import { seedFull } from '../../../docs/research/t81-seed.mjs';
import { calorieConfigDir, configTestBase } from './helpers/config-test.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';

function runCli(dir, key, params) {
  const args = params === undefined ? [key] : [key, '--params', JSON.stringify(params)];
  const r = spawnSync(NODE_BIN, [BIN, ...args], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, ILIFE_CONFIG_DIR: calorieConfigDir(dir) },
  });
  let env = null;
  try { env = JSON.parse(String(r.stdout)); } catch { env = null; }
  return { status: r.status, stderr: String(r.stderr), env };
}

function htmlOf(dir, key, params, what) {
  const r = runCli(dir, key, params);
  assert.equal(r.status, 0, what + ' exit 0（stderr：' + r.stderr.slice(0, 200) + '）');
  assert.ok(r.env && r.env.data && r.env.data.output, what + ' 须回落盘路径');
  const out = r.env.data.output;
  assert.ok(existsSync(out), what + ' 产物须真实落盘：' + out);
  return readFileSync(out, 'utf8');
}

function count(h, s) {
  return h.split(s).length - 1;
}

test('#633 种子全量扫：查食品库页无「来源：测试」，种子行印「内置食品」', () => {
  const dir = mkdtempSync(join(tmpdir(), 't633-seed-'));
  const db = openDb(join(dir, DB_FILENAME));
  seedFull(db);
  db.close();
  const h = htmlOf(dir, 'calorie.view.library', undefined, '种子全量库 calorie.view.library');
  assert.equal(count(h, '来源：测试'), 0, '种子全量页不得出现「来源：测试」');
  assert.ok(count(h, '来源：内置食品') >= 3, '三条种子食品须印「来源：内置食品」（实得 ' + count(h, '来源：内置食品') + '）');
});

test('#633 三态：种子映射／缺来源回退未知／他源透传', () => {
  const dir = mkdtempSync(join(tmpdir(), 't633-tri-'));
  const db = openDb(join(dir, DB_FILENAME));
  const rows = [
    ['鸡胸肉', '测试', 165, 31, 3.6, 0, 70, '蛋白类', '测试'],
    ['米饭', '测试', 130, 2.7, 0.3, 28, 1, '主食', ''],
    ['苹果', '果园', 52, 0.3, 0.2, 14, 1, '水果', '自制'],
  ];
  for (const r of rows) {
    db.prepare('INSERT INTO nutrition_products (product_name, brand, calories, protein, fat, carbohydrates, sodium, category, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(...r);
  }
  db.close();
  const h = htmlOf(dir, 'calorie.view.search', { keyword: '鸡胸' }, '搜鸡胸');
  assert.equal(count(h, '来源：测试'), 0, '来源行不得印内部名「测试」');
  assert.equal(count(h, '来源：内置食品'), 1, '种子行须印「来源：内置食品」');
  const hall = htmlOf(dir, 'calorie.view.library', undefined, '看全库');
  assert.equal(count(hall, '来源：测试'), 0, '全库页来源行不得印内部名「测试」');
  assert.equal(count(hall, '来源：内置食品'), 1, '全库页种子行须印「来源：内置食品」');
  assert.equal(count(hall, '来源：未知'), 1, '缺来源行须回退「来源：未知」（UNKNOWN_SOURCE 语义不变）');
  assert.equal(count(hall, '来源：自制'), 1, '他源须原样透传');
});
