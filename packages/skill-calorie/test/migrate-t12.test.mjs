/** T12 #38 · 迁移测试：tmp 合成老库复制件 → 迁移 → 行数对账 + 口径抽查 + 幂等重跑。
 * 真实 DB 零触碰：src/dst 全在 tmp；src 只读打开，前后 stat 不变。
 * 运行：node --test packages/skill-calorie/test/migrate-t12.test.mjs（需先 tsc -b）。
 */
import { strict as assert } from 'node:assert';
import { mkdtempSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import {
  migrateCalorieDb, formatReportText, MigrateMissingError, MigrateVerifyError,
} from '../dist/index.js';

const tmpDb = (name) => join(mkdtempSync(join(tmpdir(), 't12-')), name);

function buildLegacyCopy(p) {
  const db = new DatabaseSync(p);
  // nutrition_products：故意缺 source/category 列，走 dst 默认值。
  db.exec("CREATE TABLE nutrition_products (id INTEGER PRIMARY KEY AUTOINCREMENT, product_name TEXT NOT NULL, brand TEXT, calories REAL NOT NULL, protein REAL NOT NULL, fat REAL NOT NULL, saturated_fat REAL, carbohydrates REAL NOT NULL, sugar REAL, dietary_fiber REAL, sodium REAL NOT NULL, is_deprecated INTEGER DEFAULT 0, note TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)");
  db.exec("INSERT INTO nutrition_products (product_name, calories, protein, fat, carbohydrates, sodium, sugar, dietary_fiber) VALUES ('燕麦', 389, 16.9, 6.9, 66.3, 2, 0.9, 10.6)");
  // food_log 老式：无钠糖纤维列。
  db.exec("CREATE TABLE food_log (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, time TEXT, food_name TEXT NOT NULL, grams INTEGER NOT NULL, calories INTEGER NOT NULL, protein INTEGER DEFAULT 0, carbs INTEGER DEFAULT 0, fat INTEGER DEFAULT 0, note TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP)");
  db.exec("INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES ('2026-08-01', '12:00:00', '燕麦', 50, 195, 8, 33, 3)");
  db.exec("INSERT INTO food_log (date, time, food_name, grams, calories) VALUES ('2026-08-01', '08:00:00', '💧水', 500, 0)");
  // entries 遗留 1 行。
  db.exec("CREATE TABLE entries (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, time TEXT, food_name TEXT NOT NULL, grams INTEGER NOT NULL, calories INTEGER NOT NULL, protein INTEGER DEFAULT 0, carbs INTEGER DEFAULT 0, fat INTEGER DEFAULT 0, note TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP)");
  db.exec("INSERT INTO entries (date, time, food_name, grams, calories) VALUES ('2026-08-02', '12:00:00', '米饭', 200, 232)");
  // exercise：intensity 残留 + difficulty 缺省/预填。
  db.exec("CREATE TABLE exercise_log (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, time TEXT, exercise_type TEXT NOT NULL, duration_minutes INTEGER, calories_burned INTEGER NOT NULL, intensity TEXT, difficulty TEXT, note TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP)");
  db.exec("INSERT INTO exercise_log (date, exercise_type, calories_burned, intensity, difficulty) VALUES ('2026-08-01', '跑步', 300, '中', NULL)");
  db.exec("INSERT INTO exercise_log (date, exercise_type, calories_burned, intensity, difficulty) VALUES ('2026-08-02', '深蹲', 100, '高', 'easy')");
  db.exec("CREATE TABLE weight_log (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, time TEXT, weight_kg REAL NOT NULL, height_cm REAL, bmi REAL, note TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP)");
  db.exec("INSERT INTO weight_log (date, weight_kg) VALUES ('2026-08-01', 70.5)");
  db.exec("INSERT INTO weight_log (date, weight_kg) VALUES ('2026-08-02', 70.0)");
  db.exec("CREATE TABLE daily_goal (id INTEGER PRIMARY KEY CHECK (id = 1), calorie_goal INTEGER NOT NULL DEFAULT 1800, protein_goal INTEGER DEFAULT 150, carbs_goal INTEGER DEFAULT 200, fat_goal INTEGER DEFAULT 60, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)");
  db.exec("INSERT INTO daily_goal (id, calorie_goal) VALUES (1, 2000)");
  db.exec("CREATE TABLE user_profile (id INTEGER PRIMARY KEY CHECK (id = 1), age INTEGER, gender TEXT, height_cm REAL, note TEXT DEFAULT '', activity_level TEXT DEFAULT 'moderate', created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)");
  db.exec("INSERT INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, 'male', 175, 'moderate')");
  db.exec("CREATE TABLE workout_plan_config (id INTEGER PRIMARY KEY CHECK (id = 1), title TEXT NOT NULL, version TEXT, description TEXT, total_weeks INTEGER NOT NULL, start_date TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)");
  db.exec("INSERT INTO workout_plan_config (id, title, total_weeks, start_date) VALUES (1, 'T', 4, '2026-08-01')");
  db.exec("CREATE TABLE workout_plans (id INTEGER PRIMARY KEY AUTOINCREMENT, week_number INTEGER NOT NULL, day_of_week INTEGER NOT NULL, session_index INTEGER NOT NULL DEFAULT 1, session_label TEXT NOT NULL, time_start TEXT, time_end TEXT, is_rest_day INTEGER DEFAULT 0, total_sets INTEGER, movements TEXT NOT NULL DEFAULT '[]', created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)");
  db.exec("INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label) VALUES (1, 1, 1, 'A')");
  db.exec("INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label) VALUES (1, 1, 1, 'B-冲突')");
  db.exec("INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label) VALUES (1, 2, 1, 'C')");
  // body 三代：基表 + _new + _mig（含跨世代同 id 碰撞）。
  db.exec("CREATE TABLE body_photos (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, time TEXT NOT NULL, photo_path TEXT NOT NULL, tag TEXT NOT NULL, note TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)");
  db.exec("INSERT INTO body_photos (id, date, time, photo_path, tag, note) VALUES (1, '2026-08-01', '08:00:00', 'a.jpg', '正面', '')");
  db.exec("CREATE TABLE body_photos_new (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, time TEXT NOT NULL, photo_path TEXT NOT NULL, tag TEXT NOT NULL, note TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)");
  db.exec("INSERT INTO body_photos_new (id, date, time, photo_path, tag, note) VALUES (1, '2026-08-02', '08:00:00', 'b.jpg', '侧面', '')");
  db.exec("CREATE TABLE body_photos_mig (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, time TEXT NOT NULL, photo_path TEXT NOT NULL, tag TEXT NOT NULL, note TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)");
  db.exec("INSERT INTO body_photos_mig (id, date, time, photo_path, tag, note) VALUES (5, '2026-08-03', '08:00:00', 'c.jpg', '背面', '')");
  db.exec("CREATE TABLE body_measurements (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, waist_cm REAL, note TEXT DEFAULT '', is_deprecated INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)");
  db.exec("INSERT INTO body_measurements (id, date, waist_cm) VALUES (1, '2026-08-01', 80)");
  db.exec("CREATE TABLE body_measurements_new (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, waist_cm REAL, note TEXT DEFAULT '', is_deprecated INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)");
  db.exec("INSERT INTO body_measurements_new (id, date, waist_cm) VALUES (1, '2026-08-02', 81)");
  db.exec("CREATE TABLE body_composition (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, source TEXT NOT NULL, body_fat_pct REAL NOT NULL, note TEXT DEFAULT '', is_deprecated INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)");
  db.exec("INSERT INTO body_composition (id, date, source, body_fat_pct) VALUES (1, '2026-08-01', 'hospital', 18.5)");
  db.exec("CREATE TABLE body_composition_new (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, source TEXT NOT NULL, body_fat_pct REAL NOT NULL, note TEXT DEFAULT '', is_deprecated INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)");
  db.exec("INSERT INTO body_composition_new (id, date, source, body_fat_pct) VALUES (1, '2026-08-02', 'gym', 19.0)");
  db.exec("CREATE TABLE body_composition_mig (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, source TEXT NOT NULL, body_fat_pct REAL NOT NULL, note TEXT DEFAULT '', is_deprecated INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)");
  db.exec("INSERT INTO body_composition_mig (id, date, source, body_fat_pct) VALUES (2, '2026-08-03', 'home_caliper', 20.0)");
  db.exec("CREATE TABLE sleep_records (id INTEGER PRIMARY KEY)");
  db.exec("CREATE TABLE fitness_goals (id INTEGER PRIMARY KEY)");
  db.close();
}

test('复制件迁移：行数对账 + 口径抽查 + 三代收敛', () => {
  const src = tmpDb('old-copy.db');
  const dst = tmpDb('new.db');
  buildLegacyCopy(src);
  const before = statSync(src);
  const report = migrateCalorieDb(src, dst);
  assert.equal(report.ok, true);
  assert.equal(report.srcReadOnly, true);
  const after = statSync(src);
  assert.equal(after.size, before.size);
  assert.equal(after.mtimeMs, before.mtimeMs);
  const by = new Map(report.tables.map((t) => [t.table, t]));
  assert.equal(by.get('nutrition_products').dst, 1);
  assert.equal(by.get('food_log').dst, 3);
  assert.equal(by.get('food_log').srcRaw.food_log, 2);
  assert.equal(by.get('food_log').srcRaw.entries, 1);
  assert.equal(by.get('exercise_log').dst, 2);
  assert.equal(by.get('weight_log').dst, 2);
  assert.equal(by.get('workout_plans').dst, 2);
  assert.equal(by.get('workout_plans').skippedUnique, 1);
  assert.equal(by.get('body_photos').dst, 3);
  assert.equal(by.get('body_measurements').dst, 2);
  assert.equal(by.get('body_composition').dst, 3);
  // 跨世代同 id 必须重映射（多记不丢）。
  assert.ok(report.remapped.length >= 3, '期望≥3组id重映射，实际' + report.remapped.length);
  assert.equal(report.uniqueConflicts.length, 1);
  // 口径：总热量去水 195+232=427；体重 2 行合计 140.5；照片 3。
  assert.equal(report.calibers.kcalExclWater.src, 427);
  assert.equal(report.calibers.kcalExclWater.dst, 427);
  assert.equal(report.calibers.weightCount.dst, 2);
  assert.equal(report.calibers.weightSum.src, 140.5);
  assert.equal(report.calibers.weightSum.dst, 140.5);
  assert.equal(report.calibers.photoCount.dst, 3);
  for (const t of report.tables) assert.equal(t.ok, true, t.table + ' 行数不一致');
  // 新库可用性：终态表 + 回填 + intensity 映射。
  const db = new DatabaseSync(dst);
  try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map((r) => r.name);
    assert.ok(!tables.includes('entries') && !tables.includes('sleep_records') && !tables.includes('fitness_goals'));
    assert.ok(!tables.includes('body_composition_new') && !tables.includes('body_composition_mig'));
    const ex = db.prepare('SELECT exercise_type, difficulty FROM exercise_log ORDER BY date').all();
    assert.equal(ex[0].difficulty, 'normal');
    assert.equal(ex[1].difficulty, 'easy');
    const prod = db.prepare('SELECT source, category FROM nutrition_products').get();
    assert.equal(prod.source, '未知');
    const sodium = db.prepare('SELECT sodium_mg FROM food_log WHERE food_name=?').get('燕麦');
    assert.equal(sodium.sodium_mg, 1);
    const wp = db.prepare('SELECT session_label FROM workout_plans ORDER BY day_of_week').all().map((r) => r.session_label);
    assert.deepEqual(wp, ['A', 'C']);
  } finally {
    db.close();
  }
  const text = formatReportText(report);
  assert.ok(text.includes('MIGRATE OK'));
});

test('幂等可重跑：同 src/dst 再跑行数口径一致', () => {
  const src = tmpDb('old-copy2.db');
  const dst = tmpDb('new2.db');
  buildLegacyCopy(src);
  const r1 = migrateCalorieDb(src, dst);
  const r2 = migrateCalorieDb(src, dst);
  assert.equal(r2.ok, true);
  for (const t of r1.tables) {
    const t2 = r2.tables.find((x) => x.table === t.table);
    assert.equal(t2.dst, t.dst, t.table + ' 重跑行数漂移');
  }
  assert.deepEqual(r2.calibers, r1.calibers);
  assert.deepEqual(r2.remapped, r1.remapped);
});

test('缺失阻断不返空：src 缺/空库/同文件一律抛', () => {
  const dst = tmpDb('x.db');
  assert.throws(() => migrateCalorieDb(join(tmpdir(), 't12-不存在-' + Date.now() + '.db'), dst), MigrateMissingError);
  const empty = tmpDb('empty.db');
  new DatabaseSync(empty).close();
  assert.throws(() => migrateCalorieDb(empty, tmpDb('e2.db')), MigrateMissingError);
  const src = tmpDb('s.db');
  buildLegacyCopy(src);
  assert.throws(() => migrateCalorieDb(src, src), MigrateMissingError);
});

test('失败回滚：CHECK 违反整库回滚、dst 无部分行', () => {
  const src = tmpDb('bad-copy.db');
  buildLegacyCopy(src);
  const bad = new DatabaseSync(src);
  try {
    bad.exec("INSERT INTO body_composition (date, source, body_fat_pct) VALUES ('2026-08-09', '火星测', 18.0)");
  } finally {
    bad.close();
  }
  const dst = tmpDb('bad-new.db');
  assert.throws(() => migrateCalorieDb(src, dst), (e) => e instanceof Error);
  const db = new DatabaseSync(dst);
  try {
    const n = db.prepare('SELECT COUNT(*) AS n FROM food_log').get().n;
    assert.equal(n, 0, '回滚后 dst 应无数据行（事务原子性），实际 food=' + n);
  } finally {
    db.close();
  }
});
