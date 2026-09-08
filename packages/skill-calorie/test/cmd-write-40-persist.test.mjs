/** #101 · 写链**落库断言**（35 写键逐键「写后 SELECT 回读」）＋ 删除回执可恢复性口径。
 *
 * 与 `cmd-write-40.test.mjs` 的分工：那份只断言 stdout envelope／回执行字串与 exit 契约，
 * 本份**只认库内行**——每个写键跑完 CLI（独立进程，`SKILLS_DB_PATH` 指向 tmp 库）后，
 * 用 `openDbReadOnly`（只读句柄，不建表不迁移；库文件不存在直接抛）重新打开**磁盘上的库**，
 * 逐列比对写入值。回执里的 `recordId` 必须能定位到刚写的行（回执 ≠ 落库即红）。
 *
 * 覆盖门（#101 返修 H2）：**不再自报**。`withRead(dir, key, fn)` 必须声明所校验的写键，
 * 且内部用 Proxy 统计真实 `prepare()` 次数——某键的 SELECT 块被删空即 `reads = 0` 直接抛，
 * 覆盖门再断言 35 键**每键 ≥1 次真实只读查询**（删断言而保留登记不会变绿）。
 *
 * 运行：先 `pnpm build`，再 `node --test packages/skill-calorie/test/cmd-write-40-persist.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { openDbReadOnly } from '../dist/db/readonly.js';
import { CALORIE_WRITE_COMBOS } from '../dist/cli/keys.js';
import { WATER_NAME } from '../dist/fetch/diet.js';
import { buildSeries } from '../dist/analysis/series.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const WRITE_KEYS = Object.keys(CALORIE_WRITE_COMBOS);

/** 删除可恢复性口径（#101 返修 H1）：一律**不承诺可恢复**（全仓 0 个 restore/undo/recover 入口）。
 * - 软删·仍被统计（`exercise_log`：`analysis/**` 查询未过滤 `is_deleted`）；
 * - 软删·已排除（`body_composition`／`body_measurements`／`nutrition_products`：读层带 `is_deprecated = 0`）；
 * - 硬删（`DELETE FROM`）。
 * 断言口径取**词条**（不含外层括号）：`product.deprecate` 把词条嵌在自己的括号里。 */
const SOFT_TAG = '软删除：行保留，仍计入历史统计；暂无恢复入口';
const SOFT_EXCLUDED_TAG = '软删除：行保留，已从查询与统计中排除；暂无恢复入口';
const HARD_TAG = '硬删除，不可恢复';

/** 「承诺可恢复」检测：剔除「不可恢复」后仍出现「可恢复」即视为说谎。 */
function promisesRecovery(text) {
  return String(text).split('不可恢复').join('').includes('可恢复');
}

/** 每键**真实只读查询**次数（覆盖门据此断言 35/35；不是自报登记）。 */
const readsByKey = new Map();

function seedDb(db) {
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, 'male', 175, 'moderate')").run();
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal) VALUES (1, 1800, 150, 200, 50, 2000, 68.0)').run();
  db.prepare("INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES ('2026-09-05', '08:00:00', '粥', 300, 150, 3, 30, 2)").run();
  db.prepare("INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES ('2026-09-05', '12:30:00', '米饭', 200, 500, 10, 80, 5)").run();
  db.prepare("INSERT INTO exercise_log (date, time, exercise_type, duration_minutes, calories_burned, category) VALUES ('2026-09-05', '07:00:00', '户外跑', 30, 300, '有氧')").run();
  db.prepare("INSERT INTO weight_log (date, time, weight_kg, height_cm, bmi) VALUES ('2026-09-05', '07:00:00', 70.5, 175, 23.0)").run();
  db.prepare("INSERT INTO nutrition_products (product_name, brand, calories, protein, fat, carbohydrates, sodium, category, source) VALUES ('鸡胸肉', '测试', 165, 31, 3.6, 0, 70, '蛋白类', '测试')").run();
}

function mkEnv() {
  const dir = mkdtempSync(join(tmpdir(), 'w40p-cli-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  seedDb(db);
  db.close();
  return dir;
}

function mkEmpty() {
  const dir = mkdtempSync(join(tmpdir(), 'w40p-empty-'));
  openDb(join(dir, 'calorie_data.db')).close();
  return dir;
}

function run(key, params, envExtra) {
  const a = key === undefined ? [] : (params === undefined ? [key] : [key, '--params', typeof params === 'string' ? params : JSON.stringify(params)]);
  return spawnSync(NODE_BIN, [BIN, ...a], { encoding: 'utf8', env: { ...process.env, ...(envExtra || {}) } });
}

function runWrite(dir, key, params, extra) {
  const r = run(key, params, { SKILLS_DB_PATH: dir, ...(extra || {}) });
  assert.equal(r.status, 0, key + ' exit ' + r.status + ' stderr=' + (r.stderr || '').slice(-600));
  const env = JSON.parse(r.stdout);
  assert.equal(env.data.ok, true, key + ' data.ok');
  return env;
}

/** 读键（`data.metrics` 形）——口径断言要拿 view 的实测值。 */
function runView(dir, key, params) {
  const r = run(key, params, { SKILLS_DB_PATH: dir });
  assert.equal(r.status, 0, key + ' exit ' + r.status + ' stderr=' + (r.stderr || '').slice(-600));
  return JSON.parse(r.stdout).data;
}

/** 只读打开磁盘库（不建表不迁移；文件缺失即抛 → 「没落库」不会伪装成空库）。
 * **必须声明所校验的写键**：内部统计真实 `prepare()` 次数，0 次即抛（H2：覆盖门不可自报）。 */
function withRead(dir, key, fn) {
  assert.ok(typeof key === 'string' && key.length > 0, 'withRead 必须声明所校验的写键');
  const db = openDbReadOnly(join(dir, 'calorie_data.db'));
  let reads = 0;
  const probe = new Proxy(db, {
    get(target, prop) {
      if (prop === 'prepare') {
        return (sql) => { reads += 1; return target.prepare(sql); };
      }
      const v = Reflect.get(target, prop, target);
      return typeof v === 'function' ? v.bind(target) : v;
    },
  });
  let out;
  try {
    out = fn(probe);
  } finally {
    db.close();
  }
  assert.ok(reads >= 1, key + '：withRead 内没有任何只读查询（落库断言被删空/空转，覆盖门不放行）');
  readsByKey.set(key, (readsByKey.get(key) ?? 0) + reads);
  return out;
}

function q1(db, sql, ...params) {
  const row = db.prepare(sql).get(...params);
  return row === undefined ? null : row;
}

function qn(db, sql, ...params) {
  return db.prepare(sql).all(...params);
}

// ---------------------------------------------------------------- 饮食（9 键）

test('落库 · 饮食 add/update/remove：回执 id 指向的行逐列回读', () => {
  const dir = mkEnv();
  const a = runWrite(dir, 'calorie.diet.add', { foodName: '鸡胸', calories: 200, protein: 35, date: '2026-09-06', time: '12:10:00' });
  const id = a.data.receipt.recordId;
  assert.ok(Number.isInteger(id) && id > 0, 'diet.add 回执须给正整数 recordId');
  withRead(dir, 'calorie.diet.add', (db) => {
    const row = q1(db, 'SELECT food_name, calories, protein, carbs, fat, grams, date, time FROM food_log WHERE id = ?', id);
    assert.ok(row, 'diet.add 落库行缺失（回执有 id 但库内无行）');
    assert.equal(row.food_name, '鸡胸');
    assert.equal(row.calories, 200);
    assert.equal(row.protein, 35);
    assert.equal(row.carbs, 0);
    assert.equal(row.fat, 0);
    assert.equal(row.grams, 100);
    assert.equal(row.date, '2026-09-06');
    assert.equal(row.time, '12:10:00');
  });

  const u = runWrite(dir, 'calorie.diet.update', { id, grams: 150, note: '夜宵加餐' });
  assert.equal(u.data.receipt.recordId, id);
  withRead(dir, 'calorie.diet.update', (db) => {
    const row = q1(db, 'SELECT grams, calories, note FROM food_log WHERE id = ?', id);
    assert.ok(row, 'diet.update 后行丢失');
    assert.equal(row.grams, 150, 'diet.update 的 grams 未落库');
    assert.equal(row.note, '夜宵加餐', 'diet.update 的 note 未落库');
    assert.equal(row.calories, 200, 'diet.update 不应改动未传字段');
  });

  const d = runWrite(dir, 'calorie.diet.remove', { id });
  assert.equal(d.data.receipt.op, 'delete');
  withRead(dir, 'calorie.diet.remove', (db) => {
    assert.equal(q1(db, 'SELECT COUNT(*) AS n FROM food_log WHERE id = ?', id).n, 0, 'diet.remove 应硬删（行须消失）');
  });
});

test('落库 · 饮食 batch/copy/update-by-date/remove-by-type/remove-by-date/remove-by-range', () => {
  const dir = mkEnv();
  runWrite(dir, 'calorie.diet.batch', { items: [{ foodName: '粥', calories: 150, protein: 3, date: '2026-09-06', time: '08:00:00' }, { foodName: '', calories: 1, protein: 1 }] });
  withRead(dir, 'calorie.diet.batch', (db) => {
    const rows = qn(db, 'SELECT food_name, calories, protein FROM food_log WHERE date = ? ORDER BY id', '2026-09-06');
    assert.equal(rows.length, 1, 'diet.batch 只应落 1 行（第二条非法）');
    assert.equal(rows[0].food_name, '粥');
    assert.equal(rows[0].calories, 150);
    assert.equal(rows[0].protein, 3);
  });

  runWrite(dir, 'calorie.diet.copy', { from: '2026-09-05', to: '2026-09-07' });
  withRead(dir, 'calorie.diet.copy', (db) => {
    const rows = qn(db, 'SELECT food_name, calories FROM food_log WHERE date = ? ORDER BY time', '2026-09-07');
    assert.deepEqual(rows.map((r) => r.food_name), ['粥', '米饭'], 'diet.copy 未按源日期落库');
    assert.deepEqual(rows.map((r) => r.calories), [150, 500]);
  });

  runWrite(dir, 'calorie.diet.update-by-date', { date: '2026-09-06', note: '食堂' });
  withRead(dir, 'calorie.diet.update-by-date', (db) => {
    const rows = qn(db, 'SELECT note FROM food_log WHERE date = ?', '2026-09-06');
    assert.ok(rows.length > 0);
    for (const r of rows) assert.equal(r.note, '食堂', 'diet.update-by-date 的 note 未落到该日每行');
  });

  runWrite(dir, 'calorie.diet.remove-by-type', { date: '2026-09-05', mealType: '早餐' });
  withRead(dir, 'calorie.diet.remove-by-type', (db) => {
    const n = q1(db, "SELECT COUNT(*) AS n FROM food_log WHERE date = ? AND time >= '06:00:00' AND time < '10:00:00'", '2026-09-05').n;
    assert.equal(n, 0, 'diet.remove-by-type 未删掉早餐窗口的行');
    const rest = q1(db, 'SELECT COUNT(*) AS n FROM food_log WHERE date = ?', '2026-09-05').n;
    assert.equal(rest, 1, 'diet.remove-by-type 误删窗口外行');
  });

  runWrite(dir, 'calorie.diet.remove-by-range', { start: '2026-09-05', end: '2026-09-05' });
  withRead(dir, 'calorie.diet.remove-by-range', (db) => {
    assert.equal(q1(db, 'SELECT COUNT(*) AS n FROM food_log WHERE date = ?', '2026-09-05').n, 0, 'diet.remove-by-range 未删掉范围内行');
    assert.equal(q1(db, 'SELECT COUNT(*) AS n FROM food_log WHERE date = ?', '2026-09-07').n, 2, 'diet.remove-by-range 越界删了范围外行');
  });

  runWrite(dir, 'calorie.diet.remove-by-date', { date: '2026-09-06' });
  withRead(dir, 'calorie.diet.remove-by-date', (db) => {
    assert.equal(q1(db, 'SELECT COUNT(*) AS n FROM food_log WHERE date = ?', '2026-09-06').n, 0, 'diet.remove-by-date 未删掉该日行');
  });
});

test('落库 · 喝水：food_log 落水行（名＝WATER_NAME，热量 0，克数＝毫升）', () => {
  const dir = mkEnv();
  const w = runWrite(dir, 'calorie.water.log', { ml: 300, date: '2026-09-06', time: '09:00:00' });
  const id = w.data.receipt.recordId;
  withRead(dir, 'calorie.water.log', (db) => {
    const row = q1(db, 'SELECT food_name, grams, calories, protein, date, time FROM food_log WHERE id = ?', id);
    assert.ok(row, 'water.log 落库行缺失');
    assert.equal(row.food_name, WATER_NAME);
    assert.equal(row.grams, 300);
    assert.equal(row.calories, 0);
    assert.equal(row.protein, 0);
    assert.equal(row.date, '2026-09-06');
    assert.equal(row.time, '09:00:00');
  });
});

// ---------------------------------------------------------------- 体重（4 键）

test('落库 · 体重 log/update/batch/remove：三删法各自真删', () => {
  const dir = mkEnv();
  const l = runWrite(dir, 'calorie.weight.log', { kg: 70.2, date: '2026-09-06', time: '07:00:00' });
  const id = l.data.receipt.recordId;
  withRead(dir, 'calorie.weight.log', (db) => {
    const row = q1(db, 'SELECT weight_kg, height_cm, bmi, date, time FROM weight_log WHERE id = ?', id);
    assert.ok(row, 'weight.log 落库行缺失');
    assert.equal(row.weight_kg, 70.2);
    assert.equal(row.height_cm, 175);
    assert.equal(Math.round(row.bmi * 10) / 10, 22.9, 'weight.log 的 bmi 未按身高落库');
    assert.equal(row.date, '2026-09-06');
    assert.equal(row.time, '07:00:00');
  });

  runWrite(dir, 'calorie.weight.update', { id, kg: 70 });
  withRead(dir, 'calorie.weight.update', (db) => {
    const row = q1(db, 'SELECT weight_kg, bmi FROM weight_log WHERE id = ?', id);
    assert.equal(row.weight_kg, 70, 'weight.update(id) 的 kg 未落库');
    assert.equal(Math.round(row.bmi * 10) / 10, 22.9);
  });
  runWrite(dir, 'calorie.weight.update', { date: '2026-09-06', note: '晨起' });
  withRead(dir, 'calorie.weight.update', (db) => {
    const row = q1(db, 'SELECT note FROM weight_log WHERE id = ?', id);
    assert.equal(row.note, '晨起', 'weight.update(date) 的 note 未落库');
  });

  runWrite(dir, 'calorie.weight.batch', { items: [{ date: '2026-09-04', kg: 70.8 }, { date: '2026-09-05', kg: 70.5 }, { date: 'xx', kg: 1 }] });
  withRead(dir, 'calorie.weight.batch', (db) => {
    assert.equal(q1(db, 'SELECT weight_kg FROM weight_log WHERE date = ?', '2026-09-04').weight_kg, 70.8, 'weight.batch 未落库');
    assert.equal(q1(db, "SELECT COUNT(*) AS n FROM weight_log WHERE date = 'xx'").n, 0, 'weight.batch 落了非法日期行');
  });

  runWrite(dir, 'calorie.weight.remove', { id });
  withRead(dir, 'calorie.weight.remove', (db) => {
    assert.equal(q1(db, 'SELECT COUNT(*) AS n FROM weight_log WHERE id = ?', id).n, 0, 'weight.remove(id) 应硬删');
  });
  runWrite(dir, 'calorie.weight.remove', { date: '2026-09-05' });
  withRead(dir, 'calorie.weight.remove', (db) => {
    assert.equal(q1(db, 'SELECT COUNT(*) AS n FROM weight_log WHERE date = ?', '2026-09-05').n, 0, 'weight.remove(date) 应硬删该日全部');
  });
  runWrite(dir, 'calorie.weight.remove', { start: '2026-09-04', end: '2026-09-04' });
  withRead(dir, 'calorie.weight.remove', (db) => {
    assert.equal(q1(db, 'SELECT COUNT(*) AS n FROM weight_log WHERE date = ?', '2026-09-04').n, 0, 'weight.remove(range) 应硬删范围内全部');
  });
});

// ---------------------------------------------------------------- 运动（3 键）

test('落库 · 运动 add（单条/批量/复制昨日）：逐列回读', () => {
  const dir = mkEnv();
  const a = runWrite(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30, date: '2026-09-06', note: '晨跑' });
  const id = a.data.receipt.recordId;
  withRead(dir, 'calorie.exercise.add', (db) => {
    const row = q1(db, 'SELECT exercise_type, calories_burned, duration_minutes, date, note, is_deleted FROM exercise_log WHERE id = ?', id);
    assert.ok(row, 'exercise.add 落库行缺失');
    assert.equal(row.exercise_type, '慢跑');
    assert.equal(row.calories_burned, 320);
    assert.equal(row.duration_minutes, 30);
    assert.equal(row.date, '2026-09-06');
    assert.equal(row.note, '晨跑');
    assert.equal(row.is_deleted, 0);
  });
  runWrite(dir, 'calorie.exercise.add', { items: [{ type: '快走', calories: 100, date: '2026-09-06' }] });
  withRead(dir, 'calorie.exercise.add', (db) => {
    const row = q1(db, "SELECT calories_burned FROM exercise_log WHERE date = ? AND exercise_type = '快走'", '2026-09-06');
    assert.ok(row, 'exercise.add(items) 落库行缺失');
    assert.equal(row.calories_burned, 100);
  });
  runWrite(dir, 'calorie.exercise.add', { copyFrom: 'yesterday', date: '2026-09-06' });
  withRead(dir, 'calorie.exercise.add', (db) => {
    const row = q1(db, "SELECT calories_burned, duration_minutes FROM exercise_log WHERE date = ? AND exercise_type = '户外跑'", '2026-09-06');
    assert.ok(row, 'exercise.add(copyFrom) 落库行缺失（copyFrom 以目标日前一天为源）');
    assert.equal(row.calories_burned, 300);
    assert.equal(row.duration_minutes, 30);
  });
});

test('落库 · 运动 update（id/date 两路）：改动落库、未传字段不动', () => {
  const dir = mkEnv();
  const a = runWrite(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30, date: '2026-09-06' });
  const id = a.data.receipt.recordId;
  runWrite(dir, 'calorie.exercise.update', { id, minutes: 40 });
  withRead(dir, 'calorie.exercise.update', (db) => {
    const row = q1(db, 'SELECT duration_minutes, calories_burned FROM exercise_log WHERE id = ?', id);
    assert.equal(row.duration_minutes, 40, 'exercise.update(id) 的 minutes 未落库');
    assert.equal(row.calories_burned, 320, 'exercise.update(id) 误改未传字段');
  });
  runWrite(dir, 'calorie.exercise.update', { date: '2026-09-06', category: '力量' });
  withRead(dir, 'calorie.exercise.update', (db) => {
    const rows = qn(db, 'SELECT category FROM exercise_log WHERE date = ? AND COALESCE(is_deleted, 0) = 0', '2026-09-06');
    assert.ok(rows.length > 0);
    for (const r of rows) assert.equal(r.category, '力量', 'exercise.update(date) 的 category 未落到该日每行');
  });
});

test('落库 · 运动 remove：软删——行保留且 is_deleted=1（id/date/range 三路）', () => {
  const dir = mkEnv();
  const a = runWrite(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, date: '2026-09-06' });
  const id = a.data.receipt.recordId;
  runWrite(dir, 'calorie.exercise.remove', { id });
  withRead(dir, 'calorie.exercise.remove', (db) => {
    const row = q1(db, 'SELECT is_deleted FROM exercise_log WHERE id = ?', id);
    assert.ok(row, 'exercise.remove(id) 后行应保留（软删），实测已消失');
    assert.equal(row.is_deleted, 1, 'exercise.remove(id) 未把 is_deleted 置 1');
  });
  runWrite(dir, 'calorie.exercise.add', { type: '快走', calories: 100, date: '2026-09-06' });
  const before = withRead(dir, 'calorie.exercise.remove', (db) => q1(db, 'SELECT COUNT(*) AS n FROM exercise_log WHERE date = ?', '2026-09-06').n);
  runWrite(dir, 'calorie.exercise.remove', { date: '2026-09-06' });
  withRead(dir, 'calorie.exercise.remove', (db) => {
    const total = q1(db, 'SELECT COUNT(*) AS n FROM exercise_log WHERE date = ?', '2026-09-06').n;
    const alive = q1(db, 'SELECT COUNT(*) AS n FROM exercise_log WHERE date = ? AND COALESCE(is_deleted, 0) = 0', '2026-09-06').n;
    assert.equal(total, before, 'exercise.remove(date) 不该减少行数（软删）');
    assert.equal(alive, 0, 'exercise.remove(date) 未把该日行全部软删');
  });
  runWrite(dir, 'calorie.exercise.remove', { from: '2026-09-05', to: '2026-09-05' });
  withRead(dir, 'calorie.exercise.remove', (db) => {
    const row = q1(db, "SELECT is_deleted FROM exercise_log WHERE date = ? AND exercise_type = '户外跑'", '2026-09-05');
    assert.ok(row, 'exercise.remove(range) 后行应保留（软删）');
    assert.equal(row.is_deleted, 1, 'exercise.remove(range) 未把 is_deleted 置 1');
  });
});

// ---------------------------------------------------------------- 身材照（3 键）

test('落库 · 身材照 add/tag/remove：body_photos 行与文件同源', () => {
  const dir = mkEnv();
  const srcDir = mkdtempSync(join(tmpdir(), 'w40p-src-'));
  const photosDir = mkdtempSync(join(tmpdir(), 'w40p-photos-'));
  const f1 = join(srcDir, 'a.jpg');
  const f2 = join(srcDir, 'b.jpg');
  writeFileSync(f1, 'fake-a');
  writeFileSync(f2, 'fake-b');
  const extra = { CALORIE_PHOTOS_DIR: photosDir };

  const a = runWrite(dir, 'calorie.photo.add', { srcPaths: [f1, f2], tag: '正面', date: '2026-09-06', time: '08:00:00' }, extra);
  const pid = a.data.receipt.recordId;
  withRead(dir, 'calorie.photo.add', (db) => {
    const row = q1(db, 'SELECT photo_path, tag, date, time FROM body_photos WHERE id = ?', pid);
    assert.ok(row, 'photo.add 落库行缺失');
    assert.equal(row.tag, '正面');
    assert.equal(row.date, '2026-09-06');
    assert.equal(row.time, '08:00:00');
    assert.ok(existsSync(join(photosDir, row.photo_path)), 'photo.add 落库路径在 photosDir 下无文件');
    assert.equal(q1(db, 'SELECT COUNT(*) AS n FROM body_photos').n, 2, 'photo.add 应落 2 行');
  });

  runWrite(dir, 'calorie.photo.tag', { id: pid, op: 'add', tag: '晨起' }, extra);
  withRead(dir, 'calorie.photo.tag', (db) => {
    const row = q1(db, 'SELECT tag FROM body_photos WHERE id = ?', pid);
    assert.match(row.tag, /正面/, 'photo.tag(add) 丢了原有标签');
    assert.match(row.tag, /晨起/, 'photo.tag(add) 的新标签未落库');
  });
  runWrite(dir, 'calorie.photo.tag', { id: pid, op: 'set', tags: ['侧面', '晨起'] }, extra);
  withRead(dir, 'calorie.photo.tag', (db) => {
    const row = q1(db, 'SELECT tag FROM body_photos WHERE id = ?', pid);
    assert.match(row.tag, /侧面/);
    assert.ok(!/正面/.test(row.tag), 'photo.tag(set) 应整体覆盖旧标签');
  });
  runWrite(dir, 'calorie.photo.tag', { id: pid, op: 'remove', tag: '晨起' }, extra);
  withRead(dir, 'calorie.photo.tag', (db) => {
    const row = q1(db, 'SELECT tag FROM body_photos WHERE id = ?', pid);
    assert.ok(!/晨起/.test(row.tag), 'photo.tag(remove) 的标签仍在库里');
    assert.match(row.tag, /侧面/, 'photo.tag(remove) 误删其它标签');
  });

  const path = withRead(dir, 'calorie.photo.remove', (db) => q1(db, 'SELECT photo_path FROM body_photos WHERE id = ?', pid).photo_path);
  runWrite(dir, 'calorie.photo.remove', { id: pid }, extra);
  withRead(dir, 'calorie.photo.remove', (db) => {
    assert.equal(q1(db, 'SELECT COUNT(*) AS n FROM body_photos WHERE id = ?', pid).n, 0, 'photo.remove 应硬删行');
  });
  assert.ok(!existsSync(join(photosDir, path)), 'photo.remove 应同时删掉照片文件');
});

// ---------------------------------------------------------------- 食品库（3 键）

test('落库 · 食品 add/update/deprecate：营养列逐列回读 + 软删标记', () => {
  const dir = mkEnv();
  const a = runWrite(dir, 'calorie.product.add', { productName: '燕麦片', brand: 'X牌', calories: 389, protein: 13, fat: 7, carbohydrates: 66, sodium: 5, note: '早餐' });
  const id = a.data.receipt.recordId;
  withRead(dir, 'calorie.product.add', (db) => {
    const row = q1(db, 'SELECT product_name, brand, calories, protein, fat, carbohydrates, sodium, note, is_deprecated FROM nutrition_products WHERE id = ?', id);
    assert.ok(row, 'product.add 落库行缺失');
    assert.equal(row.product_name, '燕麦片');
    assert.equal(row.brand, 'X牌');
    assert.equal(row.calories, 389);
    assert.equal(row.protein, 13);
    assert.equal(row.fat, 7);
    assert.equal(row.carbohydrates, 66);
    assert.equal(row.sodium, 5);
    assert.equal(row.note, '早餐');
    assert.equal(row.is_deprecated, 0);
  });

  runWrite(dir, 'calorie.product.update', { id, calories: 400, note: '新版' });
  withRead(dir, 'calorie.product.update', (db) => {
    const row = q1(db, 'SELECT calories, note, protein FROM nutrition_products WHERE id = ?', id);
    assert.equal(row.calories, 400, 'product.update 的 calories 未落库');
    assert.equal(row.note, '新版', 'product.update 的 note 未落库');
    assert.equal(row.protein, 13, 'product.update 误改未传字段');
  });

  runWrite(dir, 'calorie.product.deprecate', { id });
  withRead(dir, 'calorie.product.deprecate', (db) => {
    const row = q1(db, 'SELECT is_deprecated FROM nutrition_products WHERE id = ?', id);
    assert.ok(row, 'product.deprecate 后行应保留（软删），实测已消失');
    assert.equal(row.is_deprecated, 1, 'product.deprecate 未把 is_deprecated 置 1');
  });
});

// ---------------------------------------------------------------- 档案（3 键）

test('落库 · 档案 set/activity/update：user_profile#1 逐列回读', () => {
  const dir = mkEmpty();
  runWrite(dir, 'calorie.profile.set', { heightCm: 175, age: 30, gender: '男', activityLevel: '中度' });
  withRead(dir, 'calorie.profile.set', (db) => {
    const row = q1(db, 'SELECT age, gender, height_cm, activity_level FROM user_profile WHERE id = 1');
    assert.ok(row, 'profile.set 未落 user_profile#1');
    assert.equal(row.age, 30);
    assert.equal(row.gender, 'male');
    assert.equal(row.height_cm, 175);
    assert.equal(row.activity_level, 'moderate');
  });

  runWrite(dir, 'calorie.profile.activity', { activityLevel: '活跃' });
  withRead(dir, 'calorie.profile.activity', (db) => {
    assert.equal(q1(db, 'SELECT activity_level FROM user_profile WHERE id = 1').activity_level, 'active', 'profile.activity 未落库');
  });

  runWrite(dir, 'calorie.profile.update', { field: 'note', value: '测试' });
  withRead(dir, 'calorie.profile.update', (db) => {
    assert.equal(q1(db, 'SELECT note FROM user_profile WHERE id = 1').note, '测试', 'profile.update(field) 未落库');
  });
  runWrite(dir, 'calorie.profile.update', { fields: { age: 31 } });
  withRead(dir, 'calorie.profile.update', (db) => {
    const row = q1(db, 'SELECT age, height_cm FROM user_profile WHERE id = 1');
    assert.equal(row.age, 31, 'profile.update(fields) 未落库');
    assert.equal(row.height_cm, 175, 'profile.update(fields) 误改未传字段');
  });
});

// ---------------------------------------------------------------- 目标（5 键）

test('落库 · 目标 set/water/weight/pause/resume：daily_goal#1 逐列回读', () => {
  const dir = mkEmpty();
  runWrite(dir, 'calorie.goal.set', { calorie: 1800, protein: 150, carbs: 200, fat: 50, water: 2000 });
  withRead(dir, 'calorie.goal.set', (db) => {
    const row = q1(db, 'SELECT calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal FROM daily_goal WHERE id = 1');
    assert.ok(row, 'goal.set 未落 daily_goal#1');
    assert.equal(row.calorie_goal, 1800);
    assert.equal(row.protein_goal, 150);
    assert.equal(row.carbs_goal, 200);
    assert.equal(row.fat_goal, 50);
    assert.equal(row.water_goal, 2000);
  });

  runWrite(dir, 'calorie.goal.water', { water: 2200 });
  withRead(dir, 'calorie.goal.water', (db) => {
    assert.equal(q1(db, 'SELECT water_goal FROM daily_goal WHERE id = 1').water_goal, 2200, 'goal.water 未落库');
  });

  runWrite(dir, 'calorie.goal.weight', { kg: 68, deadline: '2026-12-31', startKg: 72, startDate: '2026-09-01' });
  withRead(dir, 'calorie.goal.weight', (db) => {
    const row = q1(db, 'SELECT weight_goal, goal_deadline, start_weight, start_date FROM daily_goal WHERE id = 1');
    assert.equal(row.weight_goal, 68, 'goal.weight 的 kg 未落库');
    assert.equal(row.goal_deadline, '2026-12-31');
    assert.equal(row.start_weight, 72);
    assert.equal(row.start_date, '2026-09-01');
  });

  runWrite(dir, 'calorie.goal.pause', {});
  withRead(dir, 'calorie.goal.pause', (db) => {
    assert.equal(q1(db, 'SELECT goal_paused FROM daily_goal WHERE id = 1').goal_paused, 1, 'goal.pause 未落库');
  });

  runWrite(dir, 'calorie.goal.resume', {});
  withRead(dir, 'calorie.goal.resume', (db) => {
    assert.equal(q1(db, 'SELECT goal_paused FROM daily_goal WHERE id = 1').goal_paused, 0, 'goal.resume 未落库');
  });
});

// ---------------------------------------------------------------- 体脂/围度（4 键）

test('落库 · 体脂 composition-add/remove：软删行保留', () => {
  const dir = mkEnv();
  const c = runWrite(dir, 'calorie.body.composition-add', { source: 'gym', bodyFatPct: 18.5, date: '2026-09-06', age: 30, sex: '男' });
  const id = c.data.receipt.recordId;
  withRead(dir, 'calorie.body.composition-add', (db) => {
    const row = q1(db, 'SELECT date, source, body_fat_pct, age, sex, is_deprecated FROM body_composition WHERE id = ?', id);
    assert.ok(row, 'body.composition-add 落库行缺失');
    assert.equal(row.date, '2026-09-06');
    assert.equal(row.source, 'gym');
    assert.equal(row.body_fat_pct, 18.5);
    assert.equal(row.age, 30);
    assert.equal(row.sex, 'male');
    assert.equal(row.is_deprecated, 0);
  });

  runWrite(dir, 'calorie.body.composition-remove', { id });
  withRead(dir, 'calorie.body.composition-remove', (db) => {
    const row = q1(db, 'SELECT is_deprecated FROM body_composition WHERE id = ?', id);
    assert.ok(row, 'body.composition-remove 后行应保留（软删），实测已消失');
    assert.equal(row.is_deprecated, 1, 'body.composition-remove 未把 is_deprecated 置 1');
  });
});

test('落库 · 围度 measure-add/remove：软删行保留', () => {
  const dir = mkEnv();
  const m = runWrite(dir, 'calorie.body.measure-add', { waistCm: 85, hipCm: 95, date: '2026-09-06' });
  const id = m.data.receipt.recordId;
  withRead(dir, 'calorie.body.measure-add', (db) => {
    const row = q1(db, 'SELECT date, waist_cm, hip_cm, chest_cm, is_deprecated FROM body_measurements WHERE id = ?', id);
    assert.ok(row, 'body.measure-add 落库行缺失');
    assert.equal(row.date, '2026-09-06');
    assert.equal(row.waist_cm, 85);
    assert.equal(row.hip_cm, 95);
    assert.equal(row.chest_cm, null, 'body.measure-add 落了未传字段');
    assert.equal(row.is_deprecated, 0);
  });

  runWrite(dir, 'calorie.body.measure-remove', { id });
  withRead(dir, 'calorie.body.measure-remove', (db) => {
    const row = q1(db, 'SELECT is_deprecated FROM body_measurements WHERE id = ?', id);
    assert.ok(row, 'body.measure-remove 后行应保留（软删），实测已消失');
    assert.equal(row.is_deprecated, 1, 'body.measure-remove 未把 is_deprecated 置 1');
  });
});

// ---------------------------------------------------------------- 删除文案口径

/** 软删键（行保留）→ 文案须含软删词条；硬删键（DELETE FROM）→ 须含 HARD_TAG。 */
const SOFT_DELETE_KEYS = new Set([
  'calorie.exercise.remove', 'calorie.body.composition-remove', 'calorie.body.measure-remove', 'calorie.product.deprecate',
]);
const HARD_DELETE_KEYS = new Set([
  'calorie.diet.remove', 'calorie.diet.remove-by-date', 'calorie.diet.remove-by-range', 'calorie.diet.remove-by-type',
  'calorie.weight.remove', 'calorie.photo.remove',
]);

/** 数据驱动：**可 id 定位**的删除键 → 建行 → 删除 → 三源一致（prose／items[].status／库内行）。
 * H7：回执 `recordId` 必须能定位被删行（软删＝行在且标志位 1；硬删＝查不到该行）。 */
const DELETE_CASES = [
  {
    key: 'calorie.exercise.remove', kind: 'soft', table: 'exercise_log', flag: 'is_deleted', statusBase: '已删除', tag: SOFT_TAG,
    seed: (dir) => runWrite(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, date: '2026-09-06' }).data.receipt.recordId,
  },
  {
    key: 'calorie.body.composition-remove', kind: 'soft', table: 'body_composition', flag: 'is_deprecated', statusBase: '已删除', tag: SOFT_EXCLUDED_TAG,
    seed: (dir) => runWrite(dir, 'calorie.body.composition-add', { source: 'gym', bodyFatPct: 18.5, date: '2026-09-06' }).data.receipt.recordId,
  },
  {
    key: 'calorie.body.measure-remove', kind: 'soft', table: 'body_measurements', flag: 'is_deprecated', statusBase: '已删除', tag: SOFT_EXCLUDED_TAG,
    seed: (dir) => runWrite(dir, 'calorie.body.measure-add', { waistCm: 85, date: '2026-09-06' }).data.receipt.recordId,
  },
  {
    key: 'calorie.product.deprecate', kind: 'soft', table: 'nutrition_products', flag: 'is_deprecated', statusBase: '已下架', tag: SOFT_EXCLUDED_TAG, op: 'update',
    seed: (dir) => runWrite(dir, 'calorie.product.add', { productName: '燕麦片', brand: 'X牌', calories: 389, protein: 13, fat: 7, carbohydrates: 66, sodium: 5 }).data.receipt.recordId,
  },
  {
    key: 'calorie.diet.remove', kind: 'hard', table: 'food_log', statusBase: '已删除', tag: HARD_TAG,
    seed: (dir) => runWrite(dir, 'calorie.diet.add', { foodName: '鸡胸', calories: 200, protein: 35, date: '2026-09-06' }).data.receipt.recordId,
  },
  {
    key: 'calorie.weight.remove', kind: 'hard', table: 'weight_log', statusBase: '已删除', tag: HARD_TAG,
    seed: (dir) => runWrite(dir, 'calorie.weight.log', { kg: 70.2, date: '2026-09-06' }).data.receipt.recordId,
  },
  {
    key: 'calorie.photo.remove', kind: 'hard', table: 'body_photos', statusBase: '已删除', tag: HARD_TAG, photos: true,
    seed: (dir, extra) => {
      const src = join(mkdtempSync(join(tmpdir(), 'w40p-dd-src-')), 'a.jpg');
      writeFileSync(src, 'fake');
      return runWrite(dir, 'calorie.photo.add', { srcPaths: [src], tag: '正面', date: '2026-09-06' }, extra).data.receipt.recordId;
    },
  },
];

test('口径 · 删除键数据驱动：prose／items[].status／库内行三源一致（回执 id 定位被删行）', () => {
  for (const c of DELETE_CASES) {
    const dir = mkEnv();
    const extra = c.photos ? { CALORIE_PHOTOS_DIR: mkdtempSync(join(tmpdir(), 'w40p-dd-photos-')) } : undefined;
    const id = c.seed(dir, extra);
    assert.ok(Number.isInteger(id) && id > 0, c.key + ' 建行未取到正整数 id');

    const d = runWrite(dir, c.key, { id }, extra);
    assert.equal(d.data.receipt.recordId, id, c.key + ' 回执 recordId 未指向被删行');
    assert.equal(d.data.receipt.op, c.op ?? 'delete', c.key + ' 回执 op 与操作语义不符');

    // ① prose：含对应词条，且**不承诺可恢复**
    assert.ok(d.data.message.includes(c.tag), c.key + ' 文案缺「' + c.tag + '」：' + d.data.message);
    assert.ok(!promisesRecovery(d.data.message), c.key + ' 文案承诺了可恢复（全仓无 restore/undo/recover 入口）：' + d.data.message);

    // ② 结构化字段：items[].status 与 prose 同源
    const items = d.data.receipt.items;
    assert.equal(items.length, 1, c.key + ' 回执应有 1 条 items');
    assert.equal(items[0].id, id, c.key + ' items[0].id 未指向被删行');
    assert.equal(items[0].status, c.statusBase + (c.kind === 'soft' ? '（软，不可恢复）' : '（硬，不可恢复）'),
      c.key + ' items[].status 与 prose 口径不同源：' + items[0].status);
    assert.ok(!promisesRecovery(items[0].status), c.key + ' items[].status 承诺了可恢复');

    // ③ 库内行：回执 id 必须定位到被删行
    withRead(dir, c.key, (db) => {
      if (c.kind === 'soft') {
        const row = q1(db, 'SELECT ' + c.flag + ' AS f FROM ' + c.table + ' WHERE id = ?', id);
        assert.ok(row, c.key + ' 软删后行应保留（回执 id 查不到行）');
        assert.equal(row.f, 1, c.key + ' 未把 ' + c.flag + ' 置 1');
      } else {
        assert.equal(q1(db, 'SELECT COUNT(*) AS n FROM ' + c.table + ' WHERE id = ?', id).n, 0,
          c.key + ' 硬删后回执 id 不应查到行');
      }
    });
  }
});

test('口径 · 软删运动「仍计入历史统计」与实测同源（删前=删后，且列表侧已不可见）', () => {
  const dir = mkEnv();
  const date = '2026-09-05'; // mkEnv 已播 户外跑 300 卡
  const metrics = () => ({
    deficitToday: runView(dir, 'calorie.view.home', { date }).metrics.deficitToday,
    avgExerciseBurn: runView(dir, 'calorie.view.deficit', { start: '2026-09-01', end: date }).metrics.avgExerciseBurn,
    exerciseKcal: withRead(dir, 'calorie.exercise.remove', (db) => buildSeries(db, date, date)[0].exerciseKcal),
  });
  const before = metrics();
  assert.ok(before.exerciseKcal > 0, '前置：该日应有运动消耗');

  const row = withRead(dir, 'calorie.exercise.remove', (db) => q1(db, "SELECT id FROM exercise_log WHERE date = ? AND exercise_type = '户外跑'", date));
  const d = runWrite(dir, 'calorie.exercise.remove', { id: row.id });
  assert.ok(d.data.message.includes(SOFT_TAG), 'exercise.remove 文案缺「' + SOFT_TAG + '」：' + d.data.message);

  assert.deepEqual(metrics(), before,
    '文案「仍计入历史统计」必须与实测同源：analysis/** 11 处查询未过滤 is_deleted → 删后统计不变');
  const ve = run('calorie.view.exercise', { start: date, end: date }, { SKILLS_DB_PATH: dir });
  assert.equal(ve.status, 4, '列表侧（fetch listWindow 过滤 is_deleted）应看不到软删行：exit=' + ve.status);
  assert.match(ve.stderr || '', /无运动记录/, '列表侧应报「无运动记录」');
});

test('口径 · 删除回执可恢复性：文案与库内语义一致（软删行留／硬删行无）', () => {
  // 软删：exercise.remove（id）
  {
    const dir = mkEnv();
    const a = runWrite(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, date: '2026-09-06' });
    const d = runWrite(dir, 'calorie.exercise.remove', { id: a.data.receipt.recordId });
    assert.ok(d.data.message.includes(SOFT_TAG), 'exercise.remove(id) 文案缺 ' + SOFT_TAG + '：' + d.data.message);
    withRead(dir, 'calorie.exercise.remove', (db) => assert.equal(q1(db, 'SELECT is_deleted FROM exercise_log WHERE id = ?', a.data.receipt.recordId).is_deleted, 1));
  }
  // 软删：exercise.remove（date / range）
  {
    const dir = mkEnv();
    const d1 = runWrite(dir, 'calorie.exercise.remove', { date: '2026-09-05' });
    assert.ok(d1.data.message.includes(SOFT_TAG), 'exercise.remove(date) 文案缺 ' + SOFT_TAG + '：' + d1.data.message);
    assert.equal(d1.data.receipt.recordId, null, 'date 路无单条 id，recordId 应为 null');
    runWrite(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, date: '2026-09-08' });
    const d2 = runWrite(dir, 'calorie.exercise.remove', { from: '2026-09-08', to: '2026-09-08' });
    assert.ok(d2.data.message.includes(SOFT_TAG), 'exercise.remove(range) 文案缺 ' + SOFT_TAG + '：' + d2.data.message);
    withRead(dir, 'calorie.exercise.remove', (db) => {
      assert.equal(q1(db, "SELECT is_deleted FROM exercise_log WHERE date = '2026-09-08'").is_deleted, 1);
    });
  }
  // 软删：体脂 / 围度 / 下架食品（读层排除 → 词条为「已从查询与统计中排除」）
  {
    const dir = mkEnv();
    const c = runWrite(dir, 'calorie.body.composition-add', { source: 'gym', bodyFatPct: 18.5, date: '2026-09-06' });
    const dc = runWrite(dir, 'calorie.body.composition-remove', { id: c.data.receipt.recordId });
    assert.ok(dc.data.message.includes(SOFT_EXCLUDED_TAG), 'body.composition-remove 文案缺 ' + SOFT_EXCLUDED_TAG + '：' + dc.data.message);
    const m = runWrite(dir, 'calorie.body.measure-add', { waistCm: 85, date: '2026-09-06' });
    const dm = runWrite(dir, 'calorie.body.measure-remove', { id: m.data.receipt.recordId });
    assert.ok(dm.data.message.includes(SOFT_EXCLUDED_TAG), 'body.measure-remove 文案缺 ' + SOFT_EXCLUDED_TAG + '：' + dm.data.message);
    const p = runWrite(dir, 'calorie.product.deprecate', { id: 1 });
    assert.ok(p.data.message.includes(SOFT_EXCLUDED_TAG), 'product.deprecate 文案缺 ' + SOFT_EXCLUDED_TAG + '：' + p.data.message);
    withRead(dir, 'calorie.product.deprecate', (db) => assert.equal(q1(db, 'SELECT is_deprecated FROM nutrition_products WHERE id = 1').is_deprecated, 1));
  }
  // 硬删：饮食四路
  {
    const dir = mkEnv();
    const a = runWrite(dir, 'calorie.diet.add', { foodName: '鸡胸', calories: 200, protein: 35, date: '2026-09-06', time: '12:10:00' });
    const d = runWrite(dir, 'calorie.diet.remove', { id: a.data.receipt.recordId });
    assert.ok(d.data.message.includes(HARD_TAG), 'diet.remove 文案缺 ' + HARD_TAG + '：' + d.data.message);
    const d2 = runWrite(dir, 'calorie.diet.remove-by-type', { date: '2026-09-05', mealType: '早餐' });
    assert.ok(d2.data.message.includes(HARD_TAG), 'diet.remove-by-type 文案缺 ' + HARD_TAG + '：' + d2.data.message);
    const d3 = runWrite(dir, 'calorie.diet.remove-by-range', { start: '2026-09-05', end: '2026-09-05' });
    assert.ok(d3.data.message.includes(HARD_TAG), 'diet.remove-by-range 文案缺 ' + HARD_TAG + '：' + d3.data.message);
    runWrite(dir, 'calorie.diet.add', { foodName: '酸奶', calories: 90, protein: 5, date: '2026-09-09', time: '15:00:00' });
    const d4 = runWrite(dir, 'calorie.diet.remove-by-date', { date: '2026-09-09' });
    assert.ok(d4.data.message.includes(HARD_TAG), 'diet.remove-by-date 文案缺 ' + HARD_TAG + '：' + d4.data.message);
  }
  // 硬删：体重三路 + 身材照
  {
    const dir = mkEnv();
    const l = runWrite(dir, 'calorie.weight.log', { kg: 70.2, date: '2026-09-06', time: '07:00:00' });
    runWrite(dir, 'calorie.weight.log', { kg: 70.9, date: '2026-09-04', time: '07:00:00' });
    const d = runWrite(dir, 'calorie.weight.remove', { id: l.data.receipt.recordId });
    assert.ok(d.data.message.includes(HARD_TAG), 'weight.remove(id) 文案缺 ' + HARD_TAG + '：' + d.data.message);
    const d2 = runWrite(dir, 'calorie.weight.remove', { date: '2026-09-05' });
    assert.ok(d2.data.message.includes(HARD_TAG), 'weight.remove(date) 文案缺 ' + HARD_TAG + '：' + d2.data.message);
    const d3 = runWrite(dir, 'calorie.weight.remove', { start: '2026-09-04', end: '2026-09-04' });
    assert.ok(d3.data.message.includes(HARD_TAG), 'weight.remove(range) 文案缺 ' + HARD_TAG + '：' + d3.data.message);

    const srcDir = mkdtempSync(join(tmpdir(), 'w40p-src2-'));
    const photosDir = mkdtempSync(join(tmpdir(), 'w40p-photos2-'));
    const f1 = join(srcDir, 'a.jpg');
    writeFileSync(f1, 'fake-a');
    const extra = { CALORIE_PHOTOS_DIR: photosDir };
    const pa = runWrite(dir, 'calorie.photo.add', { srcPaths: [f1], tag: '正面', date: '2026-09-06' }, extra);
    const pd = runWrite(dir, 'calorie.photo.remove', { id: pa.data.receipt.recordId }, extra);
    assert.ok(pd.data.message.includes(HARD_TAG), 'photo.remove 文案缺 ' + HARD_TAG + '：' + pd.data.message);
    assert.match(pd.data.message, /已删除身材照 #/, 'photo.remove 文案须保留「已删除身材照 #id」前缀（render-t10 契约）');
  }
  // 全部删除键都在两个集合里（防漏网）
  const deleteKeys = WRITE_KEYS.filter((k) => /remove|deprecate/.test(k));
  for (const k of deleteKeys) {
    assert.ok(SOFT_DELETE_KEYS.has(k) || HARD_DELETE_KEYS.has(k), '删除键未归类可恢复性：' + k);
  }
  assert.equal(SOFT_DELETE_KEYS.size + HARD_DELETE_KEYS.size, deleteKeys.length, '删除键归类数量与注册表不符');
});

// ---------------------------------------------------------------- 覆盖门

test('覆盖门 · 35 写键逐键落库断言（每键 ≥1 次真实只读查询，缺键/空转即红）', () => {
  assert.equal(WRITE_KEYS.length, 35);
  const missing = WRITE_KEYS.filter((k) => !(readsByKey.get(k) >= 1));
  assert.deepEqual(missing, [], '以下写键没有「写后 SELECT 回读」断言（或断言被掏空）：' + missing.join('、'));
  assert.equal(readsByKey.size, 35, '落库断言覆盖键数 ' + readsByKey.size + '/35');
  const total = [...readsByKey.values()].reduce((a, b) => a + b, 0);
  assert.ok(total >= 35, '真实只读查询总次数 ' + total + ' 少于键数');
});
