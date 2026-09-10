/** #127 · calorie.goal.set UPSERT 回归：只改传入列，其余目标列逐列不变。
 *
 * 根因：旧 `INSERT OR REPLACE` 整行替换，未传入的列被静默重置为列默认/NULL
 * （water_goal→2000、weight_goal／goal_deadline／goal_paused／start 列／exercise_goal→NULL／0）。
 * 修复：`fetch/nutritionGoal.ts` 改 UPSERT（INSERT … ON CONFLICT(id) DO UPDATE SET <仅传入列>）。
 *
 * 验收（与票面一一对应）：
 * - 只改营养目标后，其余目标列逐列不变（含 goal_paused／start_weight／start_date）；
 * - 回执 writtenFields 与实际 SET 的列逐字一致（与 #97 D-1 同源）；
 * - 覆盖「只传部分字段」的组合（不传 water／传 water）。
 *
 * 运行：先 `pnpm build`，再 node --test packages/skill-calorie/test/goal-upsert-127.test.mjs
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { openDbReadOnly } from '../dist/db/readonly.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';

function mkEnv() {
  const dir = mkdtempSync(join(tmpdir(), 't127-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal) VALUES (1, 1800, 150, 200, 50, 2000, 68.0)').run();
  db.close();
  return { dir };
}

function execOn(dir, fn) {
  const db = openDb(join(dir, 'calorie_data.db'));
  try {
    return fn(db);
  } finally {
    db.close();
  }
}

function readOnly(dir, fn) {
  const db = openDbReadOnly(join(dir, 'calorie_data.db'));
  try {
    return fn(db);
  } finally {
    db.close();
  }
}

function run(key, params, env) {
  const a = params === undefined ? [key] : [key, '--params', JSON.stringify(params)];
  return spawnSync(NODE_BIN, [BIN, ...a], { encoding: 'utf8', env: { ...process.env, ...env } });
}

const GOAL_COLS = 'calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal, goal_deadline, goal_paused, exercise_goal, start_weight, start_date';

test('#127 · 不传 water：营养列更新，其余 7 列逐列不变 + writtenFields 不含 water', () => {
  const ctx = mkEnv();
  const env = { SKILLS_DB_PATH: ctx.dir };
  execOn(ctx.dir, (db) => {
    db.prepare("UPDATE daily_goal SET water_goal = 2300, weight_goal = 68.0, goal_deadline = '2026-12-31', goal_paused = 1, exercise_goal = 300, start_weight = 72.0, start_date = '2026-09-01' WHERE id = 1").run();
  });
  const before = readOnly(ctx.dir, (db) => db.prepare('SELECT ' + GOAL_COLS + ' FROM daily_goal WHERE id = 1').get());

  const r = run('calorie.goal.set', { calorie: 1750, protein: 140, carbs: 180, fat: 50 }, env);
  assert.equal(r.status, 0, 'goal.set(no water) exit ' + r.status + ' stderr=' + (r.stderr || '').slice(-300));
  const rc = JSON.parse(r.stdout).data.receipt;
  assert.deepEqual(rc.writtenFields, ['calorie', 'protein', 'carbs', 'fat']);

  const after = readOnly(ctx.dir, (db) => db.prepare('SELECT ' + GOAL_COLS + ' FROM daily_goal WHERE id = 1').get());
  // 本次 SET 的列确已写入
  assert.equal(after.calorie_goal, 1750);
  assert.equal(after.protein_goal, 140);
  assert.equal(after.carbs_goal, 180);
  assert.equal(after.fat_goal, 50);
  // 未传列逐列不变
  assert.equal(after.water_goal, before.water_goal);
  assert.equal(after.water_goal, 2300);
  assert.equal(after.weight_goal, before.weight_goal);
  assert.equal(after.goal_deadline, before.goal_deadline);
  assert.equal(after.goal_paused, before.goal_paused);
  assert.equal(after.exercise_goal, before.exercise_goal);
  assert.equal(after.start_weight, before.start_weight);
  assert.equal(after.start_date, before.start_date);
});

test('#127 · 传 water：water 更新，体重侧 6 列逐列不变 + writtenFields 含 water', () => {
  const ctx = mkEnv();
  const env = { SKILLS_DB_PATH: ctx.dir };
  execOn(ctx.dir, (db) => {
    db.prepare("UPDATE daily_goal SET water_goal = 2300, weight_goal = 68.0, goal_deadline = '2026-12-31', goal_paused = 1, exercise_goal = 300, start_weight = 72.0, start_date = '2026-09-01' WHERE id = 1").run();
  });

  const r = run('calorie.goal.set', { calorie: 1750, protein: 140, carbs: 180, fat: 50, water: 2400 }, env);
  assert.equal(r.status, 0, 'goal.set(water) exit ' + r.status);
  const rc = JSON.parse(r.stdout).data.receipt;
  assert.deepEqual(rc.writtenFields, ['calorie', 'protein', 'carbs', 'fat', 'water']);

  const after = readOnly(ctx.dir, (db) => db.prepare('SELECT ' + GOAL_COLS + ' FROM daily_goal WHERE id = 1').get());
  assert.equal(after.water_goal, 2400);
  assert.equal(after.weight_goal, 68);
  assert.equal(after.goal_deadline, '2026-12-31');
  assert.equal(after.goal_paused, 1);
  assert.equal(after.exercise_goal, 300);
  assert.equal(after.start_weight, 72);
  assert.equal(after.start_date, '2026-09-01');
});

test('#127 · 首插不传 water：water 取列默认 2000（非 NULL），营养列落值', () => {
  const dir = mkdtempSync(join(tmpdir(), 't127-first-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  db.prepare('DELETE FROM daily_goal WHERE id = 1').run();
  db.close();
  const env = { SKILLS_DB_PATH: dir };
  const src = join(mkdtempSync(join(tmpdir(), 't127-src-')), 'x');
  writeFileSync(src, 'x');
  void src;
  const r = run('calorie.goal.set', { calorie: 1800, protein: 150, carbs: 200, fat: 50 }, env);
  assert.equal(r.status, 0, 'first insert exit ' + r.status + ' stderr=' + (r.stderr || '').slice(-300));
  const after = readOnly(dir, (db2) => db2.prepare('SELECT calorie_goal, water_goal FROM daily_goal WHERE id = 1').get());
  assert.equal(after.calorie_goal, 1800);
  assert.equal(after.water_goal, 2000);
});
