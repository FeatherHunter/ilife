/** T1 #20 · schema 收敛测试：tmp 隔离，真实 DB 零触碰。
 * 运行：node --test packages/skill-calorie/test/db.test.mjs（需先 pnpm build）。
 */
import { strict as assert } from 'node:assert';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import {
  TABLE_DDLS, initDb, openDb, listUserTables, applyMigrations,
  resolveDbDir, assertWritablePath, round2, isClean,
} from '../dist/index.js';

const tmpDb = (name) => join(mkdtempSync(join(tmpdir(), 't20-')), name);
const EXPECTED_TABLES = Object.keys(TABLE_DDLS).sort();

test('新库建出 11 张终态表（13 老家表 − 2 历史临时表）', () => {
  const db = openDb(tmpDb('fresh.db'));
  assert.deepEqual(listUserTables(db), EXPECTED_TABLES);
  assert.equal(EXPECTED_TABLES.length, 11);
  db.close();
});

test('initDb 幂等：重入无报错、无副表', () => {
  const p = tmpDb('idem.db');
  const db = openDb(p);
  db.close();
  const db2 = openDb(p);
  assert.deepEqual(listUserTables(db2), EXPECTED_TABLES);
  db2.close();
});

test('老库升级：entries 合并 + intensity 回填 + 皮褶去 NOT NULL + gym 可写', () => {
  const p = tmpDb('legacy.db');
  const raw = new DatabaseSync(p);
  raw.exec(`CREATE TABLE entries (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL,
    time TEXT, food_name TEXT NOT NULL, grams INTEGER NOT NULL, calories INTEGER NOT NULL,
    protein INTEGER DEFAULT 0, carbs INTEGER DEFAULT 0, fat INTEGER DEFAULT 0,
    note TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`);
  raw.exec(`INSERT INTO entries (date, food_name, grams, calories) VALUES ('2026-08-01', '米饭', 200, 232)`);
  raw.exec(`CREATE TABLE exercise_log (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL,
    time TEXT, exercise_type TEXT NOT NULL, duration_minutes INTEGER, calories_burned INTEGER NOT NULL,
    intensity TEXT, note TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`);
  raw.exec(`INSERT INTO exercise_log (date, exercise_type, calories_burned, intensity)
    VALUES ('2026-08-01', '跑步', 300, '中')`);
  // 旧 body_composition：CHECK 无 gym + 皮褶 NOT NULL。
  raw.exec(TABLE_DDLS.body_composition
    .replace(`'gym'`, `'__none__'`)
    .replace(/caliper_(\w+)_mm REAL CHECK/g, 'caliper_$1_mm REAL NOT NULL CHECK'));
  raw.exec(`INSERT INTO body_composition (date, source, caliper_chest_mm, caliper_abdominal_mm,
    caliper_thigh_mm, caliper_tricep_mm, caliper_subscapular_mm, caliper_suprailiac_mm,
    caliper_midaxillary_mm, body_fat_pct) VALUES ('2026-08-01', 'hospital',
    10, 12, 14, 8, 11, 13, 9, 18.5)`);
  raw.exec(`CREATE TABLE sleep_records (id INTEGER PRIMARY KEY)`);
  raw.exec(`CREATE TABLE body_composition_mig (id INTEGER PRIMARY KEY)`);
  raw.close();

  const db = openDb(p);
  const tables = listUserTables(db);
  assert.ok(!tables.includes('entries') && !tables.includes('sleep_records'));
  assert.ok(!tables.includes('body_composition_mig'));
  const meal = db.prepare('SELECT * FROM food_log').get();
  assert.equal(meal.food_name, '米饭');
  assert.ok('sodium_mg' in meal);
  const ex = db.prepare('SELECT difficulty FROM exercise_log').get();
  assert.equal(ex.difficulty, 'normal');
  // 重建后 gym 可写、皮褶可 NULL。
  db.prepare(`INSERT INTO body_composition (date, source, body_fat_pct)
    VALUES ('2026-08-02', 'gym', 20.0)`);
  const kept = db.prepare('SELECT body_fat_pct FROM body_composition WHERE date=?').get('2026-08-01');
  assert.equal(kept.body_fat_pct, 18.5);
  db.close();
});

test('钠糖纤维回填：按食品库每100g值 × 克数/100，ROUND(2→1)', () => {
  const db = openDb(tmpDb('sodium.db'));
  db.prepare(`INSERT INTO nutrition_products
    (product_name, calories, protein, fat, carbohydrates, sodium, sugar, dietary_fiber)
    VALUES ('燕麦', 389, 16.9, 6.9, 66.3, 2, 0.9, 10.6)`).run();
  db.prepare(`INSERT INTO food_log (date, food_name, grams, calories)
    VALUES ('2026-08-01', '燕麦', 50, 195)`).run();
  applyMigrations(db);
  const row = db.prepare('SELECT sodium_mg, sugar_g, fiber_g FROM food_log').get();
  assert.equal(row.sodium_mg, 1);
  assert.equal(row.sugar_g, 0.5);
  assert.equal(row.fiber_g, 5.3);
  db.close();
});

test('触发器：非法 activity_level 与空围度被阻断', () => {
  const db = openDb(tmpDb('trig.db'));
  assert.throws(() => db.prepare(`INSERT INTO user_profile (id, activity_level)
    VALUES (1, '躺平')`).run());
  db.prepare(`INSERT INTO user_profile (id, activity_level) VALUES (1, 'moderate')`).run();
  assert.throws(() => db.prepare(`UPDATE user_profile SET activity_level='乱填' WHERE id=1`).run());
  assert.throws(() => db.prepare(`INSERT INTO body_measurements (date) VALUES ('2026-08-01')`).run());
  const ok = db.prepare(`INSERT INTO body_measurements (date, waist_cm) VALUES ('2026-08-01', 80.5)`).run();
  assert.equal(ok.changes, 1);
  db.close();
});

test('路径守卫：缺 env 抛错；非 tmp 无 opt-in 拒绝；tmp 放行', () => {
  delete process.env.SKILLS_DB_PATH;
  assert.throws(() => resolveDbDir(), /SKILLS_DB_PATH/);
  delete process.env.CALORIE_FORCE_PROD;
  assert.throws(() => assertWritablePath('D:/.db/calorie_data.db'), /CALORIE_FORCE_PROD/);
  const p = tmpDb('ok.db');
  assertWritablePath(p); // 不抛
  const db = openDb(p);
  assert.deepEqual(listUserTables(db), EXPECTED_TABLES);
  db.close();
});

test('kcal 公约：round(2) 与泄漏判定复刻老家规则', () => {
  assert.equal(round2(-141.6550000000002), -141.66);
  assert.equal(isClean(-141.6550000000002), false);
  assert.equal(isClean(2905.26), true);
  assert.equal(isClean(0.1 + 0.2), true); // 5.5e-17 浮尘按 1e-9 规则属干净（老家规则同样放过）
  assert.equal(isClean(2905.255), false); // 小数第三位显著：|2905.26-2905.255|=0.005，判脏
});
