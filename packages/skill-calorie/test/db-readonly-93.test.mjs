/** #93 · openDbReadOnly 验收测试（tmp 隔离，真实 DB 零触碰；运行前需先构建）。
 *
 * 覆盖票面三条验收：
 *   ① 读键全部可用 —— 42 个读键在**只读句柄**上逐个 dispatch（子进程 sweep），无系统级错误；
 *   ② 不触发迁移 —— 空库只读打开后 sqlite_master 仍为空；老 schema 库只读打开不升级；
 *   ③ 写入被拒 —— CREATE/INSERT/DELETE 一律抛 readonly database，且库文件字节不变。
 * 另加「接线等价性」：只读句柄与可写句柄跑同一批读键，data/html 全等（证明接线行为不变），
 * 以及「openDb 原语义不变」「库文件缺失时 CLI 仍按原语义建库」两条回归。
 *
 * 变异自证（人工一步）：把 `src/db/readonly.ts` 的 `{ readOnly: true }` 改成无参打开并重建，
 * 本文件「写入被拒」用例必须红（见 docs/research/t93-readonly-baseline.md §8）。
 *
 * 运行：node --test packages/skill-calorie/test/db-readonly-93.test.mjs
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { DB_FILENAME, listUserTables, openDb } from '../dist/index.js';
import { openDbReadOnly } from '../dist/db/readonly.js';
import { CALORIE_COMBOS, isCalorieWriteKey } from '../dist/cli/keys.js';
import { dispatch } from '../dist/cli/cmd_read.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const READ_KEYS = Object.keys(CALORIE_COMBOS).filter((k) => !isCalorieWriteKey(k));
const WRITE_KEYS = Object.keys(CALORIE_COMBOS).filter((k) => isCalorieWriteKey(k));

const tmpDir = (tag) => mkdtempSync(join(tmpdir(), 't93-ro-' + tag + '-'));
const probe = (file) => {
  const st = statSync(file);
  return { sha256: createHash('sha256').update(readFileSync(file)).digest('hex'), size: st.size, mtimeMs: st.mtimeMs };
};
/** 本地日（与 CLI todayISO() 同口径）；种子按「相对今天」铺，跑在任何日期都稳定。 */
const localIso = (msAgo) => {
  const d = new Date(Date.now() - msAgo);
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
};
const D0 = localIso(0);
const D1 = localIso(86400000);
const D2 = localIso(2 * 86400000);
const D3 = localIso(3 * 86400000);
const RANGE = { start: D3, end: D0 };

/** 标准种子（列形参照 docs/research/t81-seed.mjs 的 canonical seed；本文件自持，不跨目录依赖）。 */
function seedDb(db) {
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level, note) VALUES (1, 30, 'male', 175, 'moderate', 't93')").run();
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal, goal_deadline, exercise_goal) VALUES (1, 1800, 150, 200, 50, 2000, 68.0, ?, 300)').run(localIso(-30 * 86400000));
  const meals = [
    [D0, '08:00:00', '燕麦', 100, 389, 13, 66, 7],
    [D0, '12:30:00', '米饭', 200, 500, 10, 80, 5],
    [D1, '08:00:00', '粥', 300, 150, 3, 30, 2],
    [D1, '12:30:00', '鸡胸', 150, 200, 35, 2, 4],
    [D2, '19:10:00', '米饭', 200, 550, 12, 85, 6],
    [D3, '12:00:00', '包子', 150, 300, 8, 50, 5],
  ];
  for (const [d, t, name, g, cal, p, cb, f] of meals) {
    db.prepare('INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(d, t, name, g, cal, p, cb, f);
  }
  for (const d of [D0, D1, D2, D3]) {
    db.prepare("INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES (?, '10:00:00', '💧水', 1500, 0, 0, 0, 0)").run(d);
  }
  for (let i = 0; i < 40; i++) {
    const d = localIso(i * 86400000);
    db.prepare('INSERT INTO weight_log (date, time, weight_kg, height_cm, bmi) VALUES (?, ?, ?, 175, 22.9)').run(d, '07:00:00', Math.round((75.0 - i * 0.05) * 10) / 10);
  }
  for (const [d, name, min, kcal] of [[D0, '慢跑', 30, 320], [D1, '户外跑', 30, 300], [D3, '卧推', 40, 180]]) {
    db.prepare("INSERT INTO exercise_log (date, time, exercise_type, duration_minutes, calories_burned, category) VALUES (?, '07:00:00', ?, ?, ?, '有氧')").run(d, name, min, kcal);
  }
  for (const [d, pct] of [[D0, 19.5], [D2, 18.9]]) {
    db.prepare('INSERT INTO body_composition (date, source, body_fat_pct, caliper_chest_mm, caliper_abdominal_mm, caliper_thigh_mm, caliper_tricep_mm, caliper_subscapular_mm, caliper_suprailiac_mm, caliper_midaxillary_mm) VALUES (?, ?, ?, 10, 12, 14, 11, 13, 12, 10)').run(d, 'home_caliper', pct);
  }
  for (const [d, waist, hip] of [[D0, 85, 95], [D2, 84, 94]]) {
    db.prepare('INSERT INTO body_measurements (date, waist_cm, hip_cm) VALUES (?, ?, ?)').run(d, waist, hip);
  }
  for (const [d, file] of [[D3, 't93_a.jpg'], [D1, 't93_b.jpg']]) {
    db.prepare("INSERT INTO body_photos (date, time, photo_path, tag, note) VALUES (?, '09:00:00', ?, '正面', 't93')").run(d, file);
  }
  for (const [name, cal, p, f, cb, na] of [['鸡胸肉', 165, 31, 3.6, 0, 70], ['鸡胸肉', 170, 30, 4, 0, 72], ['米饭', 130, 2.7, 0.3, 28, 1]]) {
    db.prepare("INSERT INTO nutrition_products (product_name, brand, calories, protein, fat, carbohydrates, sodium, category, source) VALUES (?, '测试', ?, ?, ?, ?, ?, '主食', '测试')").run(name, cal, p, f, cb, na);
  }
  db.prepare("INSERT OR REPLACE INTO workout_plan_config (id, title, version, description, total_weeks, start_date) VALUES (1, 't93计划', 'v1', 'desc', 4, ?)").run(D3);
  db.prepare('INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label, movements) VALUES (1, 1, 1, ?, ?)').run('上肢', JSON.stringify([{ name: '硬拉', part: '背', type: '力量', sets: [] }]));
  db.prepare('INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label, movements) VALUES (1, 3, 1, ?, ?)').run('下肢', JSON.stringify([{ name: '深蹲', part: '腿', type: '力量', sets: [] }]));
}

/** 造一个种子模板库目录（模板不可变；每个用例复制一份用）。 */
function makeTemplate() {
  const dir = tmpDir('tpl');
  const db = openDb(join(dir, DB_FILENAME));
  seedDb(db);
  db.close();
  return dir;
}
const copyTo = (srcDir, dstDir) => {
  mkdirSync(dstDir, { recursive: true });
  copyFileSync(join(srcDir, DB_FILENAME), join(dstDir, DB_FILENAME));
  return join(dstDir, DB_FILENAME);
};

/** 每个读键的合法参数（缺参数会走 fail(2) → 直接 process.exit，故必须给全）。 */
const READ_PARAMS = {
  'calorie.view.home': { date: D0 },
  'calorie.today': { date: D0 },
  'calorie.view.diet': RANGE,
  'calorie.view.exercise': RANGE,
  'calorie.view.goal': RANGE,
  'calorie.view.goal-weight': RANGE,
  'calorie.view.goal-progress': RANGE,
  'calorie.view.combined': { pair: 'weight_calorie', window: '7d' },
  'calorie.view.deficit': RANGE,
  'calorie.view.diet-review': RANGE,
  'calorie.view.health': RANGE,
  'calorie.view.ranking': RANGE,
  'calorie.view.search': { keyword: '米饭' },
  'calorie.view.weight': RANGE,
  'calorie.view.weight-history': RANGE,
  'calorie.view.weight-compare': { start: D3, end: D2, compareStart: D1, compareEnd: D0 },
  'calorie.view.goal-vs-actual': RANGE,
  'calorie.view.predict': RANGE,
  'calorie.view.anomaly': { kind: 'overall', ...RANGE },
  'calorie.view.plan-wizard': { plan: {} },
  'calorie.view.exercise-goal': RANGE,
  // #112 · 营养移植 4 键（只读句柄同跑；t93 种子有餐/水/库行，detail 缺数据盒明示）。
  'calorie.view.nutrition-ratio': RANGE,
  'calorie.view.nutrition-detail': RANGE,
  'calorie.view.source-stats': {},
  'calorie.view.today-water': { date: D0 },
  // #111 · 运动移植 6 键（只读句柄同跑；strength 在 t93 种子上无力量行，两侧同 missing-data）。
  'calorie.view.exercise-strength': RANGE,
  'calorie.view.exercise-cardio': RANGE,
  'calorie.view.exercise-distribution': RANGE,
  'calorie.view.exercise-recap': RANGE,
  'calorie.view.exercise-review': RANGE,
  'calorie.view.exercise-trend': RANGE,
  'calorie.photo.list': { dateFrom: D3, dateTo: D0 },
  'calorie.photo.detail': { id: 1 },
  'calorie.photo.compare': { id1: 1, id2: 2 },
  'calorie.photo.gif': { tag: '正面', dateFrom: D3, dateTo: D0 },
  'calorie.help.lookup': { q: '看今日主页' },
  'calorie.history': { days: 7 },
};

// ---------------------------------------------------------------- sweep 子进程
// 单进程跑完 52 个读键（#112 +4）：某个键若因缺参走到 fail(2) 会 process.exit，父进程靠「少了一行」发现。
if (process.argv[2] === '--sweep') {
  const tpl = process.argv[3];
  const work = tmpDir('sweep');
  const roDb = copyTo(tpl, join(work, 'ro'));
  const wrDb = copyTo(tpl, join(work, 'wr'));
  const ro = openDbReadOnly(roDb);
  const wr = openDb(wrDb);
  const norm = (out) => JSON.stringify({ data: out.data, html: out.html });
  for (const key of READ_KEYS) {
    process.stdout.write('START ' + key + '\n');
    const params = READ_PARAMS[key] ?? {};
    const run = (db) => {
      try { return { ok: true, out: norm(dispatch(key, params, db)) }; } catch (e) { return { ok: false, err: (e && e.message) || String(e) }; }
    };
    const a = run(ro);
    const b = run(wr);
    process.stdout.write(JSON.stringify({
      key,
      roOk: a.ok,
      wrOk: b.ok,
      equal: a.ok === b.ok && (a.ok ? a.out === b.out : a.err === b.err),
      roErr: a.ok ? null : a.err,
      wrErr: b.ok ? null : b.err,
      bytes: a.ok ? a.out.length : 0,
    }) + '\n');
  }
  ro.close();
  wr.close();
  rmSync(work, { recursive: true, force: true });
  process.exit(0);
}

// ---------------------------------------------------------------- 验收 ②：不触发迁移
test('#93 ② 空库只读打开：不建表（sqlite_master 仍为空）', () => {
  const dir = tmpDir('empty');
  const p = join(dir, DB_FILENAME);
  new DatabaseSync(p).close(); // 只造一个空库文件
  const db = openDbReadOnly(p);
  assert.deepEqual(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all(), []);
  db.close();
  assert.deepEqual(statSync(p).size, 0, '空库文件仍为 0 字节');
});

test('#93 ② 老 schema 库只读打开：不升级、不建表（迁移只在 openDb 里）', () => {
  const dir = tmpDir('legacy');
  const p = join(dir, DB_FILENAME);
  const raw = new DatabaseSync(p);
  raw.exec(`CREATE TABLE entries (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL,
    time TEXT, food_name TEXT NOT NULL, grams INTEGER NOT NULL, calories INTEGER NOT NULL,
    protein INTEGER DEFAULT 0, carbs INTEGER DEFAULT 0, fat INTEGER DEFAULT 0,
    note TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`);
  raw.close();
  const before = probe(p);
  const db = openDbReadOnly(p);
  assert.deepEqual(listUserTables(db), ['entries'], '只读打开不得跑迁移');
  db.close();
  assert.deepEqual(probe(p), before, '只读打开后老库字节不变');
  // 对照：openDb 仍按原语义把老库升级成终态 11 表（本票不改 openDb）
  const w = openDb(p);
  assert.equal(listUserTables(w).length, 11);
  w.close();
});

// ---------------------------------------------------------------- 验收 ③：写入被拒
test('#93 ③ 只读句柄写入被拒（CREATE/INSERT/DELETE 均抛 readonly database）', () => {
  const tpl = makeTemplate();
  const p = copyTo(tpl, tmpDir('write'));
  const before = probe(p);
  const db = openDbReadOnly(p);
  assert.throws(() => db.exec('CREATE TABLE __t93_probe__ (a INTEGER)'), /readonly database/i);
  assert.throws(() => db.prepare("INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES (?, '12:00:00', 'x', 100, 1, 0, 0, 0)").run(D0), /readonly database/i);
  assert.throws(() => db.exec('DELETE FROM food_log'), /readonly database/i);
  assert.throws(() => db.exec("UPDATE daily_goal SET calorie_goal = 1"), /readonly database/i);
  db.close();
  assert.deepEqual(probe(p), before, '被拒的写入不得改动库文件');
});

test('#93 只读打开 + 读键：库文件 sha256/size/mtime 不变', () => {
  const tpl = makeTemplate();
  const p = copyTo(tpl, tmpDir('read'));
  const before = probe(p);
  const db = openDbReadOnly(p);
  const out = dispatch('calorie.view.home', { date: D0 }, db);
  assert.equal(out.data.metrics.calorieGoal, 1800);
  assert.ok(dispatch('calorie.today', { date: D0 }, db).data.items.length > 0);
  db.close();
  assert.deepEqual(probe(p), before, '只读读键不得改动库文件');
});

test('#93 库文件缺失时只读打开直接抛（只读路径不隐式建库）', () => {
  const p = join(tmpDir('missing'), DB_FILENAME);
  assert.equal(existsSync(p), false);
  assert.throws(() => openDbReadOnly(p), /只读开库失败：文件不存在/);
  assert.equal(existsSync(p), false, '抛错不得留下空库');
});

// ---------------------------------------------------------------- 回归：openDb 语义不变
test('#93 回归 · openDb 原语义不变：空库仍建出 11 张终态表', () => {
  const p = join(tmpDir('opendb'), DB_FILENAME);
  const db = openDb(p);
  assert.equal(listUserTables(db).length, 11);
  db.close();
});

test('#93 回归 · CLI 读键在库文件缺失时仍按原语义建库（接线保留 openDb 分支）', () => {
  const dir = tmpDir('cli-missing');
  const r = spawnSync(process.execPath, [CLI, 'calorie.view.home', '--params', JSON.stringify({ date: D0 })], {
    encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir },
  });
  assert.equal(r.status, 4, '缺数据仍是 exit 4（缺失阻断不返空）');
  assert.equal(existsSync(join(dir, DB_FILENAME)), true, '当前 CLI 对缺失库仍建库（接线时该分支保留）');
});

// ---------------------------------------------------------------- 验收 ①：读键全部可用 ＋ 接线等价
test('#93 ① 52 读键在只读句柄上逐个可用，且与可写句柄 data/html 全等（#112 +4）', () => {
  const tpl = makeTemplate();
  const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--sweep', tpl], { encoding: 'utf8' });
  assert.equal(r.status, 0, 'sweep 子进程必须正常退出：' + String(r.stderr).slice(0, 400));
  const lines = String(r.stdout).split('\n').filter((s) => s.startsWith('{')).map((s) => JSON.parse(s));
  const started = String(r.stdout).split('\n').filter((s) => s.startsWith('START ')).map((s) => s.slice(6));
  assert.equal(READ_KEYS.length, 52, '读键应为 52 个（87 组合键 − 35 写键）');
  assert.equal(WRITE_KEYS.length, 35);
  assert.deepEqual(started, READ_KEYS, '每个读键都跑到（缺失＝该键把进程 exit 掉了，参数不全）');
  assert.equal(lines.length, READ_KEYS.length);

  const systemErr = lines.filter((l) => l.roErr && /readonly|no such table|SQLITE|attempt to write/i.test(l.roErr));
  assert.deepEqual(systemErr, [], '只读句柄上不得出现系统级取数错误');
  const mismatch = lines.filter((l) => !l.equal);
  assert.deepEqual(mismatch.map((m) => m.key), [], '只读与可写句柄的读键结果必须全等');

  const core = [
    'calorie.view.home', 'calorie.today', 'calorie.view.diet', 'calorie.view.weight',
    'calorie.photo.list', 'calorie.photo.detail', 'calorie.photo.gif',
    'calorie.help.lookup', 'calorie.history', 'calorie.view.library', 'calorie.view.profile',
  ];
  const coreOk = lines.filter((l) => core.includes(l.key) && l.roOk).map((l) => l.key).sort();
  assert.deepEqual(coreOk, [...core].sort(), '核心读键必须全部在只读句柄上成功');
  const okCount = lines.filter((l) => l.roOk).length;
  console.log('[sweep] 只读句柄成功 ' + okCount + '/' + lines.length + ' 键；'
    + '仅域内错误（missing-data 等）的键：' + lines.filter((l) => !l.roOk).map((l) => l.key + '=' + l.roErr).join(' | '));
  assert.ok(okCount >= 30, '只读句柄成功键数应 ≥30，实际 ' + okCount + '：' + lines.filter((l) => !l.roOk).map((l) => l.key + '=' + l.roErr).join(' | '));
});
