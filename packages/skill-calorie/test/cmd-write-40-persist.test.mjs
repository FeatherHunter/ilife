/** #101 · 写链**落库断言**（全部写命令逐键「写后 SELECT 回读」）＋ 删除回执可恢复性口径。
 *
 * 与 `cmd-write-40.test.mjs` 的分工：那份只断言 stdout envelope／回执行字串与 exit 契约，
 * 本份**只认库内行**——每个写键跑完 CLI（独立进程，`SKILLS_DB_PATH` 指向 tmp 库）后，
 * 用 `openDbReadOnly`（只读句柄，不建表不迁移；库文件不存在直接抛）重新打开**磁盘上的库**，
 * 逐列比对写入值。回执里的 `recordId` 必须能定位到刚写的行（回执 ≠ 落库即红）。
 *
 * 覆盖门（#101 返修 H2）：**不再自报**。`withRead(dir, key, fn)` 必须声明所校验的写键，
 * 且内部用 Proxy 统计真实 `prepare()` 次数——某键的 SELECT 块被删空即 `reads = 0` 直接抛，
 * 覆盖门再断言全部写命令**每键 ≥1 次真实只读查询**（删断言而保留登记不会变绿）。
 *
 * 运行：先 `pnpm build`，再 `node --test packages/skill-calorie/test/cmd-write-40-persist.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, before, after } from 'node:test';
import { openDb } from '../dist/index.js';
import { openDbReadOnly } from '../dist/db/readonly.js';
import { CALORIE_WRITE_COMBOS } from '../dist/cli/keys.js';
import { WATER_NAME } from '../dist/fetch/diet.js';
import { buildSeries } from '../dist/analysis/series.js';
import { DECLARED_WRITE_KEYS } from './declared.mjs';
import { calorieConfigDir, configTestBase } from './helpers/config-test.mjs';
import { installInferredLandStub, uninstallInferredLandStub } from './helpers/land-inferred-stub.mjs';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();
// #757 · 文件缝（跨技能两出口删键后，见 helpers/land-inferred-stub.mjs 件头；落地训练族 5 条用）。
before(installInferredLandStub);
after(uninstallInferredLandStub);

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const WRITE_KEYS = Object.keys(CALORIE_WRITE_COMBOS);

/** 删除可恢复性口径（#101 返修 H1 → **#120 口径收敛**）：一律**不承诺可恢复**（全仓 0 个
 * restore/undo/recover 入口）。
 * - 软删·**已排除**（`exercise_log.is_deleted`：`analysis/utils.ts:EX_ALIVE` 11 处内联
 *   ＋ `body_composition`／`body_measurements`／`nutrition_products`：读层 `is_deprecated = 0`）；
 *   **supersedes #101 的「仍计入历史统计」口径**（见 `docs/research/t120-softdelete-filter.md`）；
 * - 硬删（`DELETE FROM`）不受影响。
 * 断言口径取**词条**（不含外层括号）：`product.deprecate` 把词条嵌在自己的括号里。 */
const SOFT_EXCLUDED_TAG = '软删除：行保留，已从查询与统计中排除；暂无恢复入口';
/** #120：软删运动与体脂/围度/下架食品同款措辞（口径收敛后二者同值）。 */
const SOFT_TAG = SOFT_EXCLUDED_TAG;
const HARD_TAG = '硬删除，不可恢复';
/** #650 · 产品下架当刻人话（饮食线文本波次起与共享词条分家）：回执摘要里的稳定括号段
 * （品名逐条变，不断言它）。牙齿：摘要改回旧词条即红（旧句不含本段）；本段亦不断言
 * 可恢复（`promisesRecovery` 另钉，全仓 0 个恢复入口）。 */
const PRODUCT_DEPRECATE_TAG = '（不再出现在搜索和统计里；暂时无法恢复）';

/** 「承诺可恢复」检测：剔除「不可恢复」后仍出现「可恢复」即视为说谎。 */
function promisesRecovery(text) {
  return String(text).split('不可恢复').join('').includes('可恢复');
}

/** 每键**真实只读查询**次数（覆盖门据此断言 40/40；不是自报登记）。 */
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

/** 跑一条写命令。`extra.photosDir` 给了就写进**配置**（配置文件是唯一真相），其余键原样进 env。 */
function runWrite(dir, key, params, extra) {
  const { photosDir, ...rest } = extra || {};
  const cfg = photosDir ? calorieConfigDir(dir, { photos: { dir: photosDir } }) : calorieConfigDir(dir);
  const r = run(key, params, { ...homeEnvOf(cfg), ...rest });
  assert.equal(r.status, 0, key + ' exit ' + r.status + ' stderr=' + (r.stderr || '').slice(-600));
  const env = JSON.parse(r.stdout);
  assert.equal(env.data.ok, true, key + ' data.ok');
  return env;
}

/** 读键（`data.metrics` 形）——口径断言要拿 view 的实测值。 */
function runView(dir, key, params) {
  const r = run(key, params, { ...homeEnvOf(calorieConfigDir(dir))});
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
  const extra = { photosDir };

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

test('落库 · 食品 product.import（批量导入）：逐列回读 ＋ 重复项跳过不落第二行', () => {
  const dir = mkEnv();
  const items = [{ productName: '测试导入燕麦', calories: 389, protein: 13, fat: 7, carbohydrates: 66, sodium: 5 }];
  const w = runWrite(dir, 'calorie.product.import', { items });
  const id = w.data.receipt.recordId;
  assert.ok(Number.isInteger(id) && id > 0, 'product.import 回执须给正整数 recordId');
  withRead(dir, 'calorie.product.import', (db) => {
    const row = q1(db, 'SELECT product_name, calories, protein, fat, carbohydrates, sodium, is_deprecated FROM nutrition_products WHERE id = ?', id);
    assert.ok(row, 'product.import 落库行缺失');
    assert.equal(row.product_name, '测试导入燕麦');
    assert.equal(row.calories, 389);
    assert.equal(row.protein, 13);
    assert.equal(row.fat, 7);
    assert.equal(row.carbohydrates, 66);
    assert.equal(row.sodium, 5);
    assert.equal(row.is_deprecated, 0);
    assert.equal(qn(db, "SELECT id FROM nutrition_products WHERE product_name = '测试导入燕麦'").length, 1, '同一条导入落了多行');
  });
  // 复跑同一条：按 product_name ＋ brand 去重，`onDuplicate` 缺省 skip → 不落第二行
  const again = runWrite(dir, 'calorie.product.import', { items });
  assert.match(again.data.message, /跳过 1/, '重复项应跳过：' + again.data.message);
  withRead(dir, 'calorie.product.import', (db) => {
    assert.equal(q1(db, "SELECT COUNT(*) AS n FROM nutrition_products WHERE product_name = '测试导入燕麦'").n, 1, '重复导入落了第二行');
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

// ---------------------------------------------------------------- 定运动目标（1 条会改数据库的命令，#650 补）

test('落库 · 定运动目标 exercise：daily_goal#1 exercise_goal 单列回读', () => {
  const dir = mkEmpty();
  runWrite(dir, 'calorie.goal.exercise', { goal: 300 });
  withRead(dir, 'calorie.goal.exercise', (db) => {
    const row = q1(db, 'SELECT exercise_goal FROM daily_goal WHERE id = 1');
    assert.ok(row, 'goal.exercise 未落 daily_goal#1');
    assert.equal(row.exercise_goal, 300, 'goal.exercise 的 goal 未落库');
  });

  runWrite(dir, 'calorie.goal.exercise', { goal: 500 });
  withRead(dir, 'calorie.goal.exercise', (db) => {
    assert.equal(q1(db, 'SELECT exercise_goal FROM daily_goal WHERE id = 1').exercise_goal, 500, 'goal.exercise 改值未落库');
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
    key: 'calorie.product.deprecate', kind: 'soft', table: 'nutrition_products', flag: 'is_deprecated', statusBase: '已下架', tag: PRODUCT_DEPRECATE_TAG, op: 'update',
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
    const extra = c.photos ? { photosDir: mkdtempSync(join(tmpdir(), 'w40p-dd-photos-')) } : undefined;
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

test('口径 · 软删运动后逐面排除（#120 口径收敛，supersedes #101 的「仍计入」口径）', () => {
  const dir = mkEnv();
  const date = '2026-09-05'; // mkEnv 已播 户外跑 300 卡
  const metrics = () => ({
    deficitToday: runView(dir, 'calorie.view.home', { date }).metrics.deficitToday,
    avgExerciseBurn: runView(dir, 'calorie.view.deficit', { start: '2026-09-01', end: date }).metrics.avgExerciseBurn,
    exerciseKcal: withRead(dir, 'calorie.exercise.remove', (db) => buildSeries(db, date, date)[0].exerciseKcal),
  });
  const before = metrics();
  assert.equal(before.exerciseKcal, 300, '前置：该日应有 300 卡运动消耗');

  const row = withRead(dir, 'calorie.exercise.remove', (db) => q1(db, "SELECT id FROM exercise_log WHERE date = ? AND exercise_type = '户外跑'", date));
  const d = runWrite(dir, 'calorie.exercise.remove', { id: row.id });
  assert.ok(d.data.message.includes(SOFT_TAG), 'exercise.remove 文案缺「' + SOFT_TAG + '」：' + d.data.message);

  // #120 · 软删即不计入用户可见统计（analysis/** 11 处查询统一走 EX_ALIVE）
  const after = metrics();
  assert.equal(after.exerciseKcal, null, '软删后 buildSeries.exerciseKcal 应排除该行');
  assert.equal(after.avgExerciseBurn, 0, '软删后 view.deficit.avgExerciseBurn 应排除该行');
  assert.equal(after.deficitToday, before.deficitToday - 300, '软删后 view.home.deficitToday 应减少该日运动消耗');
  const ve = run('calorie.view.exercise', { start: date, end: date }, { ...homeEnvOf(calorieConfigDir(dir))});
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
    assert.ok(p.data.message.includes(PRODUCT_DEPRECATE_TAG), 'product.deprecate 文案缺 ' + PRODUCT_DEPRECATE_TAG + '：' + p.data.message);
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
    const extra = { photosDir };
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

// ---------------------------------------------------------------- 训练计划（5 写键）

const T2_PLAN = {
  config: { title: '落库计划', start_date: '2026-09-07', user_level: '中手', available_equipment: ['瑜伽垫', '杠铃'] },
  weeks: [{ week_number: 1, days: [
    { day_of_week: 1, sessions: [{ session_label: '上肢', movements: [{ name: '俯卧撑', part: '胸', type: '力量', sets: [] }] }] },
    { day_of_week: 3, sessions: [{ session_label: '下肢', movements: [{ name: '深蹲', part: '腿', type: '力量', sets: [] }] }] },
  ] }],
};

function seedPlan(dir) {
  runWrite(dir, 'calorie.workout.plan-set', { plan: T2_PLAN });
}

test('落库 · 训练计划 set/copy/set-week/add-movement/set-rest：回执与库内行', () => {
  // set：整份替换逐列回读
  {
    const dir = mkEmpty();
    runWrite(dir, 'calorie.workout.plan-set', { plan: T2_PLAN });
    withRead(dir, 'calorie.workout.plan-set', (db) => {
      const cfg = q1(db, 'SELECT title, total_weeks, start_date FROM workout_plan_config WHERE id = 1');
      assert.ok(cfg, 'plan-set 未落 config 行');
      assert.equal(cfg.title, '落库计划');
      assert.equal(cfg.total_weeks, 1);
      assert.equal(cfg.start_date, '2026-09-07');
      const rows = qn(db, 'SELECT week_number, day_of_week, session_label, movements FROM workout_plans ORDER BY day_of_week');
      assert.equal(rows.length, 2, 'plan-set 会话行数不符');
      assert.equal(rows[0].session_label, '上肢');
      assert.ok(String(rows[0].movements).includes('俯卧撑'), 'plan-set 动作未落库');
    });
  }
  // copy：整份复制换标题、行数一致
  {
    const dir = mkEmpty();
    seedPlan(dir);
    runWrite(dir, 'calorie.workout.plan-copy', { newTitle: '副本' });
    withRead(dir, 'calorie.workout.plan-copy', (db) => {
      assert.equal(q1(db, 'SELECT title FROM workout_plan_config WHERE id = 1').title, '副本', 'plan-copy 未换标题');
      assert.equal(q1(db, 'SELECT COUNT(*) AS n FROM workout_plans').n, 2, 'plan-copy 行数不符');
    });
  }
  // copy：单周复制到新周
  {
    const dir = mkEmpty();
    seedPlan(dir);
    runWrite(dir, 'calorie.workout.plan-copy', { week: 1, toWeek: 3 });
    withRead(dir, 'calorie.workout.plan-copy', (db) => {
      assert.equal(q1(db, 'SELECT COUNT(*) AS n FROM workout_plans WHERE week_number = 3').n, 2, 'plan-copy 单周未落目标周');
    });
  }
  // set-week：该周先清后写
  {
    const dir = mkEmpty();
    seedPlan(dir);
    runWrite(dir, 'calorie.workout.plan-set-week', { week: 1, days: [{ dayOfWeek: 2, sessionLabel: '背', movements: [{ name: '硬拉' }] }] });
    withRead(dir, 'calorie.workout.plan-set-week', (db) => {
      const rows = qn(db, 'SELECT day_of_week, session_label FROM workout_plans WHERE week_number = 1');
      assert.equal(rows.length, 1, 'plan-set-week 未先清后写');
      assert.equal(rows[0].day_of_week, 2);
      assert.equal(rows[0].session_label, '背');
    });
  }
  // add-movement：时段追加动作
  {
    const dir = mkEmpty();
    seedPlan(dir);
    runWrite(dir, 'calorie.workout.plan-add-movement', { week: 1, dayOfWeek: 1, movement: { name: '深蹲' } });
    withRead(dir, 'calorie.workout.plan-add-movement', (db) => {
      const row = q1(db, 'SELECT movements FROM workout_plans WHERE week_number = 1 AND day_of_week = 1');
      assert.ok(String(row.movements).includes('俯卧撑') && String(row.movements).includes('深蹲'), 'plan-add-movement 未追加落库');
    });
  }
  // set-rest：休息标记落库
  {
    const dir = mkEmpty();
    seedPlan(dir);
    runWrite(dir, 'calorie.workout.plan-set-rest', { week: 1, dayOfWeek: 3 });
    withRead(dir, 'calorie.workout.plan-set-rest', (db) => {
      assert.equal(q1(db, 'SELECT is_rest_day FROM workout_plans WHERE week_number = 1 AND day_of_week = 3').is_rest_day, 1, 'plan-set-rest 未落标记');
    });
    runWrite(dir, 'calorie.workout.plan-set-rest', { week: 1, dayOfWeek: 3, rest: false });
    withRead(dir, 'calorie.workout.plan-set-rest', (db) => {
      assert.equal(q1(db, 'SELECT is_rest_day FROM workout_plans WHERE week_number = 1 AND day_of_week = 3').is_rest_day, 0, 'plan-set-rest 取消未落库');
    });
  }
});

test('落库 · 训练计划 update/update-day/delete-day/update-movement/delete：回执与库内行', () => {
  // update：配置字段改前改后落库
  {
    const dir = mkEmpty();
    seedPlan(dir);
    runWrite(dir, 'calorie.workout.plan-update', { title: '新标题' });
    withRead(dir, 'calorie.workout.plan-update', (db) => {
      assert.equal(q1(db, 'SELECT title FROM workout_plan_config WHERE id = 1').title, '新标题', 'plan-update 未落库');
    });
    const bad = run('calorie.workout.plan-update', { totalWeeks: 9 }, { ...homeEnvOf(calorieConfigDir(dir))});
    assert.equal(bad.status, 2, 'plan-update 改总周数应 exit 2，实测 ' + bad.status);
  }
  // update-day：时段改名落库
  {
    const dir = mkEmpty();
    seedPlan(dir);
    runWrite(dir, 'calorie.workout.plan-update-day', { week: 1, dayOfWeek: 3, newLabel: '腿部日' });
    withRead(dir, 'calorie.workout.plan-update-day', (db) => {
      assert.equal(q1(db, 'SELECT session_label FROM workout_plans WHERE week_number = 1 AND day_of_week = 3').session_label, '腿部日', 'plan-update-day 未落库');
    });
  }
  // delete-day：整天硬删，行消失
  {
    const dir = mkEmpty();
    seedPlan(dir);
    runWrite(dir, 'calorie.workout.plan-delete-day', { week: 1, dayOfWeek: 3 });
    withRead(dir, 'calorie.workout.plan-delete-day', (db) => {
      assert.equal(q1(db, 'SELECT COUNT(*) AS n FROM workout_plans WHERE week_number = 1 AND day_of_week = 3').n, 0, 'plan-delete-day 未删行');
      assert.equal(q1(db, 'SELECT COUNT(*) AS n FROM workout_plans').n, 1, 'plan-delete-day 多删了别天的行');
    });
  }
  // update-movement：动作名替换落库
  {
    const dir = mkEmpty();
    seedPlan(dir);
    runWrite(dir, 'calorie.workout.plan-update-movement', { oldMovement: '俯卧撑', newMovement: { name: '钻石俯卧撑' } });
    withRead(dir, 'calorie.workout.plan-update-movement', (db) => {
      const row = q1(db, 'SELECT movements FROM workout_plans WHERE week_number = 1 AND day_of_week = 1');
      assert.ok(String(row.movements).includes('钻石俯卧撑'), 'plan-update-movement 新名未落库');
      assert.ok(!String(row.movements).includes('"俯卧撑"'), 'plan-update-movement 旧名残留');
    });
  }
  // delete：整份硬删（须 confirm；无 confirm 即 exit 2）
  {
    const dir = mkEmpty();
    seedPlan(dir);
    const bare = run('calorie.workout.plan-delete', {}, { ...homeEnvOf(calorieConfigDir(dir))});
    assert.equal(bare.status, 2, 'plan-delete 无确认应 exit 2，实测 ' + bare.status);
    withRead(dir, 'calorie.workout.plan-delete', (db) => {
      assert.equal(q1(db, 'SELECT COUNT(*) AS n FROM workout_plan_config').n, 1, 'plan-delete 裸调不应写库');
    });
    runWrite(dir, 'calorie.workout.plan-delete', { confirm: true });
    withRead(dir, 'calorie.workout.plan-delete', (db) => {
      assert.equal(q1(db, 'SELECT COUNT(*) AS n FROM workout_plan_config').n, 0, 'plan-delete 未删配置');
      assert.equal(q1(db, 'SELECT COUNT(*) AS n FROM workout_plans').n, 0, 'plan-delete 未删会话行');
    });
  }
});

// ---------------------------------------------------------------- 落地训练族（5 条会改数据库的命令，#650 补）
//
// 零本地写：五条命令的跨技能／远端那几步一律**不在父进程写本地库**——补计划／记心愿走文件缝
// （#757 起两出口删键，`helpers/land-inferred-stub.mjs` 把 fixture 暂放到推断位置），训记两步走配置里的
// 训记入口（`xunji.cli`），三处都指向 `helpers/land-fixture.mjs`（见 #676）。故回查断言钉「这些路径零本地写」：
// 跑前快照三张表行数，跑后逐行比对；日后若给任一条加本地写，本断言即红（改断言须写明新增了哪一列，不得删块）。
const LAND_FIXTURE = join(HERE, 'helpers', 'land-fixture.mjs');

/** 一份「库目录 ＋ 训记入口指向 fixture（跨技能两步走文件缝）」的配置目录。 */
function cfgLand(dir) {
  return calorieConfigDir(dir, {
    xunji: { cli: LAND_FIXTURE },
  });
}

/** 本地库快照（JSON 定序）：三张相关表逐行（改值／增删都看得见）＋其余表行数（表外写也看得见）。
 * 跑前直读、跑后经 `withRead` 重算比对。 */
function snapJson(db) {
  const all = (sql) => db.prepare(sql).all();
  return JSON.stringify({
    cfg: all('SELECT * FROM workout_plan_config ORDER BY id'),
    plans: all('SELECT * FROM workout_plans ORDER BY week_number, day_of_week, session_index'),
    ex: all('SELECT * FROM exercise_log ORDER BY id'),
    rest: {
      food: q1(db, 'SELECT COUNT(*) AS n FROM food_log').n,
      weight: q1(db, 'SELECT COUNT(*) AS n FROM weight_log').n,
      products: q1(db, 'SELECT COUNT(*) AS n FROM nutrition_products').n,
      comp: q1(db, 'SELECT COUNT(*) AS n FROM body_composition').n,
      measure: q1(db, 'SELECT COUNT(*) AS n FROM body_measurements').n,
      photos: q1(db, 'SELECT COUNT(*) AS n FROM body_photos').n,
      goal: q1(db, 'SELECT COUNT(*) AS n FROM daily_goal').n,
      profile: q1(db, 'SELECT COUNT(*) AS n FROM user_profile').n,
    },
  });
}

/** 跑前快照（直读，不经 `withRead`：经它会计入覆盖门读数，掏空跑后块即不红，自毁 S4(3)。#650 规格评审注记）。 */
function snapLocal(dir) {
  const db = openDbReadOnly(join(dir, 'calorie_data.db'));
  try {
    return snapJson(db);
  } finally {
    db.close();
  }
}

test('落库 · 落地训练族 5 条命令：跨技能走文件缝、训记走 fixture 且零本地写', () => {
  // land：单日四步（非预演，三处外调全绿）
  {
    const dir = mkEmpty();
    seedPlan(dir);
    const before = snapLocal(dir);
    const r = run('calorie.workout.land', { date: '2026-09-07' }, { ...homeEnvOf(cfgLand(dir))});
    assert.equal(r.status, 0, 'land 应成功：' + String(r.stderr).slice(-300));
    assert.match(JSON.parse(r.stdout).data.message, /已落地 2026-09-07/);
    withRead(dir, 'calorie.workout.land', (db) => {
      assert.deepEqual(snapJson(db), before, 'land 路径改了本地库');
    });
  }
  // land-weekend：周一锚点 → 周一至周日逐天复用单日链（子进程透传配置，逐天同一份真相）
  {
    const dir = mkEmpty();
    seedPlan(dir);
    const before = snapLocal(dir);
    const r = run('calorie.workout.land-weekend', { date: '2026-09-07' }, { ...homeEnvOf(cfgLand(dir))});
    assert.equal(r.status, 0, 'land-weekend 应成功：' + String(r.stderr).slice(-300));
    assert.match(JSON.parse(r.stdout).data.message, /已批量/);
    withRead(dir, 'calorie.workout.land-weekend', (db) => {
      assert.deepEqual(snapJson(db), before, 'land-weekend 路径改了本地库');
    });
  }
  // land-monthend：月末锚点 → 只跑 1 天（`t613` 同形，避免整月子进程拖慢本门）
  {
    const dir = mkEmpty();
    seedPlan(dir);
    const before = snapLocal(dir);
    const r = run('calorie.workout.land-monthend', { date: '2026-09-30' }, { ...homeEnvOf(cfgLand(dir))});
    assert.equal(r.status, 0, 'land-monthend 应成功：' + String(r.stderr).slice(-300));
    assert.match(JSON.parse(r.stdout).data.message, /已批量/);
    withRead(dir, 'calorie.workout.land-monthend', (db) => {
      assert.deepEqual(snapJson(db), before, 'land-monthend 路径改了本地库');
    });
  }
  // xunji-push：训记推送薄包装（训记入口走 fixture，不起真网路）
  {
    const dir = mkEmpty();
    seedPlan(dir);
    const before = snapLocal(dir);
    const r = run('calorie.workout.xunji-push', { date: '2026-09-07' }, { ...homeEnvOf(cfgLand(dir))});
    assert.equal(r.status, 0, 'xunji-push 应成功：' + String(r.stderr).slice(-300));
    assert.match(JSON.parse(r.stdout).data.message, /已同步 2026-09-07/);
    withRead(dir, 'calorie.workout.xunji-push', (db) => {
      assert.deepEqual(snapJson(db), before, 'xunji-push 路径改了本地库');
    });
  }
  // xunji-backfill：拉取回写薄包装（训记入口走 fixture，真回写发生在外部子进程）
  {
    const dir = mkEmpty();
    seedPlan(dir);
    const before = snapLocal(dir);
    const r = run('calorie.workout.xunji-backfill', { date: '2026-09-07', days: 1 }, { ...homeEnvOf(cfgLand(dir))});
    assert.equal(r.status, 0, 'xunji-backfill 应成功：' + String(r.stderr).slice(-300));
    assert.match(JSON.parse(r.stdout).data.message, /已拉训记实绩并回写/);
    withRead(dir, 'calorie.workout.xunji-backfill', (db) => {
      assert.deepEqual(snapJson(db), before, 'xunji-backfill 路径改了本地库');
    });
  }
  // xunji-key-set：设训记 KEY 只写配置文件（真训记入口，不走 fixture），本地库零写
  {
    const dir = mkEmpty();
    seedPlan(dir);
    const before = snapLocal(dir);
    const r = run('calorie.workout.xunji-key-set', { xunjiKey: 'PERSIST-ONLY-KEY' }, { ...homeEnvOf(calorieConfigDir(dir))});
    assert.equal(r.status, 0, 'xunji-key-set 应成功：' + String(r.stderr).slice(-300));
    assert.match(JSON.parse(r.stdout).data.message, /已写入/);
    withRead(dir, 'calorie.workout.xunji-key-set', (db) => {
      assert.deepEqual(snapJson(db), before, 'xunji-key-set 路径改了本地库');
    });
  }
  // xunji-key-clear：清训记 KEY 只写配置文件，本地库零写（先设后清，不断言配置内容只断库）
  {
    const dir = mkEmpty();
    seedPlan(dir);
    const env = { ...homeEnvOf(calorieConfigDir(dir)) };
    assert.equal(run('calorie.workout.xunji-key-set', { xunjiKey: 'PERSIST-ONLY-KEY' }, env).status, 0);
    const before = snapLocal(dir);
    const r = run('calorie.workout.xunji-key-clear', { confirm: true }, env);
    assert.equal(r.status, 0, 'xunji-key-clear 应成功：' + String(r.stderr).slice(-300));
    assert.match(JSON.parse(r.stdout).data.message, /已清除/);
    withRead(dir, 'calorie.workout.xunji-key-clear', (db) => {
      assert.deepEqual(snapJson(db), before, 'xunji-key-clear 路径改了本地库');
    });
  }
});

// ---------------------------------------------------------------- 覆盖门

test('覆盖门 · 全部写键逐键落库断言（每键 ≥1 次真实只读查询，缺键/空转即红）', () => {
  // 写键表 == 权威声明（未搬迁清单 ＋ 各能力）：加／删一条写命令时这条断言不用改数字（见 test/declared.mjs）。
  assert.deepEqual([...WRITE_KEYS].sort(), DECLARED_WRITE_KEYS, '写键表 == 权威声明（未搬迁清单 ＋ 各能力），不再手写数字');
  const missing = WRITE_KEYS.filter((k) => !(readsByKey.get(k) >= 1));
  assert.deepEqual(missing, [], '以下写键没有「写后 SELECT 回读」断言（或断言被掏空）：' + missing.join('、'));
  assert.equal(readsByKey.size, WRITE_KEYS.length, '落库断言覆盖键数 ' + readsByKey.size + '/' + WRITE_KEYS.length);
  const total = [...readsByKey.values()].reduce((a, b) => a + b, 0);
  assert.ok(total >= WRITE_KEYS.length, '真实只读查询总次数 ' + total + ' 少于键数');
});
