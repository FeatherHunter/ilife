/** #97 · M5 写库回执契约回归（35 写键 × 四要素 ＋ 追加字段零回归 ＋ 库内独立复核）。
 *
 * 口径正本：`docs/research/t97-m5-contract.md`。与既有测试的分工：
 * - `cmd-write-40.test.mjs`：写键可执行性／exit 契约／回执行存在；
 * - `cmd-write-40-persist.test.mjs`（#101）：写链**落库**断言（只读句柄 SELECT 回读）；
 * - 本文件：M5 四要素（`id`／时间戳／影响行数／写入字段摘要）逐键断言 ＋
 *   `affectedRows` 与**库真实行数**独立对账 ＋ 既有 10 字段零增删（只追加）。
 *
 * 运行：先 `pnpm build`，再
 *   node --test packages/skill-calorie/test/m5-receipt-97.test.mjs
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
import { CALORIE_WRITE_COMBOS } from '../dist/cli/keys.js';
import { SCENARIOS, checkM5 } from '../../../docs/research/t97-probe-receipts.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const WRITE_KEYS = Object.keys(CALORIE_WRITE_COMBOS);

/** 既有字段（#97 前就在的 10 个）——只追加纪律：本清单一个都不能少，也不能改名。 */
const BASE_KEYS = ['scene', 'action', 'op', 'recordId', 'summary', 'items', 'tagDiff', 'distance', 'noChange', 'meta'];
/** M5 追加字段（v1 七个）。 */
const M5_KEYS = ['m5Contract', 'affectedRows', 'affectedRowsSource', 'ids', 'idSource', 'writtenFields', 'm5Line'];
const ID_SOURCES = ['record', 'singleton', 'condition', 'none'];
const STAMP_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

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
  const dir = mkdtempSync(join(tmpdir(), 'm5-97-'));
  const photosDir = mkdtempSync(join(tmpdir(), 'm5-97-photos-'));
  const srcDir = mkdtempSync(join(tmpdir(), 'm5-97-src-'));
  const src = join(srcDir, 'a.jpg');
  writeFileSync(src, 'fake-photo');
  const db = openDb(join(dir, 'calorie_data.db'));
  seedDb(db);
  db.close();
  return { dir, photosDir, src, env: { CALORIE_PHOTOS_DIR: photosDir } };
}

function run(key, params, env) {
  const a = params === undefined ? [key] : [key, '--params', JSON.stringify(params)];
  return spawnSync(NODE_BIN, [BIN, ...a], { encoding: 'utf8', env: { ...process.env, ...env } });
}

/** 跑一个探针场景（pre 前置写 → 被测键），返回被测键的 envelope 与上下文。 */
function runScenario(sc) {
  const ctx = mkEnv();
  const localEnv = { SKILLS_DB_PATH: ctx.dir, ...ctx.env };
  const ids = [];
  for (const [pkey, pparams] of sc.pre ?? []) {
    const r = run(pkey, typeof pparams === 'function' ? pparams(ctx) : pparams, localEnv);
    assert.equal(r.status, 0, '前置 ' + pkey + ' exit ' + r.status + ' stderr=' + (r.stderr || '').slice(-400));
    const rid = JSON.parse(r.stdout).data.receipt.recordId;
    if (typeof rid === 'number') ids.push(rid);
  }
  const params = typeof sc.params === 'function' ? sc.params(ids, ctx) : sc.params;
  const r = run(sc.key, params, localEnv);
  assert.equal(r.status, 0, sc.key + ' exit ' + r.status + ' stderr=' + (r.stderr || '').slice(-400));
  return { env: JSON.parse(r.stdout), ctx, ids };
}

/** 只读打开磁盘库（不建表不迁移）——affectedRows 的独立复核口。 */
function readOnly(dir, fn) {
  const db = openDbReadOnly(join(dir, 'calorie_data.db'));
  try {
    return fn(db);
  } finally {
    db.close();
  }
}

const countOf = (dir, table, where = '1=1') =>
  readOnly(dir, (db) => Number(db.prepare('SELECT COUNT(*) AS n FROM ' + table + ' WHERE ' + where).get().n));

// ------------------------------------------------------------------ 一、35 键逐键四要素

test('#97 · 场景表覆盖 35 写键（与 CALORIE_WRITE_COMBOS 一一对应）', () => {
  assert.equal(WRITE_KEYS.length, 35);
  assert.equal(SCENARIOS.length, 35);
  assert.deepEqual(SCENARIOS.map((s) => s.key).sort(), [...WRITE_KEYS].sort());
});

for (const sc of SCENARIOS) {
  test('#97 · M5 四要素：' + sc.key, () => {
    const { env } = runScenario(sc);
    const rc = env.data.receipt;

    // 既有 envelope／回执形状零回归（P9 一行 JSON + receipt 形）
    assert.equal(env.version, '0.1.0');
    assert.equal(env.skill, 'calorie');
    assert.equal(env.key, sc.key);
    assert.equal(env.shape, 'receipt');
    assert.equal(env.data.ok, true);
    assert.ok(typeof env.data.message === 'string' && env.data.message.length > 0);
    assert.equal(rc.summary, env.data.message);
    assert.ok(['create', 'update', 'delete'].includes(rc.op));
    for (const k of BASE_KEYS) assert.ok(k in rc, sc.key + ' 既有字段丢失：' + k);

    // 四要素（checkM5 与探针同源，避免两套判据）
    assert.deepEqual(checkM5(rc, rc.op), [], sc.key + ' 四要素缺失');

    // ① id
    assert.ok(ID_SOURCES.includes(rc.idSource));
    if (rc.idSource === 'record') assert.ok((rc.recordId ?? 0) > 0 || rc.ids.length > 0);
    if (rc.idSource === 'singleton') assert.equal(rc.recordId, 1);
    if (rc.idSource === 'condition') assert.equal(rc.recordId, null);
    assert.ok(Array.isArray(rc.ids));
    assert.ok(rc.ids.every((n) => Number.isInteger(n) && n > 0));
    // ② 时间戳（旧版 `日期 <YYYY-MM-DD> <HH:MM:SS>`）
    assert.match(rc.meta.actionAt, STAMP_RE);
    // ③ 影响行数（真实库行数）
    assert.ok(Number.isInteger(rc.affectedRows) && rc.affectedRows >= 0);
    assert.equal(rc.affectedRowsSource, 'sqlite:total_changes');
    // ④ 写入字段摘要
    assert.ok(Array.isArray(rc.writtenFields));
    assert.ok(rc.writtenFields.every((f) => typeof f === 'string' && f.length > 0));
    if (rc.op !== 'delete') assert.ok(rc.writtenFields.length > 0, sc.key + ' 写入字段摘要为空');
    // 旧版整行文本等价物：与结构化字段同源（逐段对账）
    assert.ok(rc.m5Line.startsWith('id=' + (rc.recordId !== null ? rc.recordId : (rc.ids.length ? rc.ids.join(',') : 'n/a')) + ' | 日期 '));
    assert.ok(rc.m5Line.includes(' | 日期 ' + rc.meta.actionAt + ' | 影响 ' + rc.affectedRows + ' 行 | 字段 '));
    assert.ok(rc.m5Line.includes(rc.writtenFields.length ? rc.writtenFields.join(',') : '字段 —'));
    // 追加字段之外无新键（冻结键集，防后续票随手加/删）
    assert.deepEqual(Object.keys(rc).sort(), [...BASE_KEYS, ...M5_KEYS].sort());
  });
}

// ------------------------------------------------------------------ 二、affectedRows 与库真实行数对账

test('#97 · affectedRows＝库真实行数（只读句柄独立复核，非自报）', () => {
  // 硬删：food_log 行数前后差 = affectedRows
  {
    const { ctx } = runScenario({ key: 'calorie.diet.add', params: { foodName: '核对', calories: 100, protein: 1, date: '2026-09-07', time: '10:00:00' } });
    const before = countOf(ctx.dir, 'food_log');
    const r = run('calorie.diet.add', { foodName: '核对2', calories: 100, protein: 1, date: '2026-09-07', time: '10:01:00' }, { SKILLS_DB_PATH: ctx.dir });
    const rc = JSON.parse(r.stdout).data.receipt;
    assert.equal(rc.affectedRows, 1);
    assert.equal(countOf(ctx.dir, 'food_log') - before, rc.affectedRows);
  }
  // 条件批量硬删：同日两条一起删 → affectedRows=2
  {
    const ctx = mkEnv();
    const env = { SKILLS_DB_PATH: ctx.dir };
    for (const t of ['08:00:00', '08:30:00']) {
      const a = run('calorie.diet.add', { foodName: 'a' + t, calories: 1, protein: 1, date: '2026-09-07', time: t }, env);
      assert.equal(a.status, 0, '前置 add exit ' + a.status);
    }
    const before = countOf(ctx.dir, 'food_log');
    const r = run('calorie.diet.remove-by-date', { date: '2026-09-07' }, env);
    assert.equal(r.status, 0, 'remove-by-date exit ' + r.status + ' stderr=' + (r.stderr || '').slice(-300));
    const rc = JSON.parse(r.stdout).data.receipt;
    assert.equal(rc.affectedRows, 2);
    assert.equal(before - countOf(ctx.dir, 'food_log'), rc.affectedRows);
    assert.equal(rc.idSource, 'condition');
    assert.deepEqual(rc.ids, []);
  }
  // 软删：行仍在库（行数不变），affectedRows 仍计被写行数
  {
    const ctx = mkEnv();
    const env = { SKILLS_DB_PATH: ctx.dir };
    const a = run('calorie.exercise.add', { type: '游泳', calories: 200, date: '2026-09-06' }, env);
    assert.equal(a.status, 0);
    const eid = JSON.parse(a.stdout).data.receipt.recordId;
    const before = countOf(ctx.dir, 'exercise_log');
    const r = run('calorie.exercise.remove', { id: eid }, env);
    assert.equal(r.status, 0);
    const rc = JSON.parse(r.stdout).data.receipt;
    assert.equal(rc.affectedRows, 1);
    assert.equal(countOf(ctx.dir, 'exercise_log'), before, '软删后行数不变（#101 口径）');
    assert.deepEqual(rc.writtenFields, ['is_deleted']);
    assert.equal(readOnly(ctx.dir, (db) => Number(db.prepare('SELECT is_deleted AS n FROM exercise_log WHERE id = ?').get(eid).n)), 1);
  }
  // 下架（软删标志）：1 行
  {
    const ctx = mkEnv();
    const env = { SKILLS_DB_PATH: ctx.dir };
    const a = run('calorie.product.add', { productName: '核对品', calories: 1, protein: 1, fat: 1, carbohydrates: 1, sodium: 1 }, env);
    assert.equal(a.status, 0);
    const pid = JSON.parse(a.stdout).data.receipt.recordId;
    const r = run('calorie.product.deprecate', { id: pid }, env);
    assert.equal(r.status, 0);
    const rc = JSON.parse(r.stdout).data.receipt;
    assert.equal(rc.affectedRows, 1);
    assert.deepEqual(rc.writtenFields, ['is_deprecated']);
    assert.equal(readOnly(ctx.dir, (db) => Number(db.prepare('SELECT is_deprecated AS n FROM nutrition_products WHERE id = ?').get(pid).n)), 1);
  }
  // 批量体重：写入 1 行
  {
    const { ctx } = runScenario({ key: 'calorie.weight.batch', params: { items: [{ date: '2026-09-04', kg: 70.8 }] } });
    assert.equal(countOf(ctx.dir, 'weight_log', "date = '2026-09-04'"), 1);
  }
});

// ------------------------------------------------------------------ 三、缺值／幂等语义

test('#97 · 重复跳过：affectedRows=0 且写入字段摘要为空（无写入不虚报）', () => {
  const { ctx } = runScenario({ key: 'calorie.diet.add', params: { foodName: '重复项', calories: 200, protein: 35, date: '2026-09-06', time: '12:10:00' } });
  const before = countOf(ctx.dir, 'food_log');
  const r = run('calorie.diet.add', { foodName: '重复项', calories: 200, protein: 35, date: '2026-09-06', time: '12:10:00' }, { SKILLS_DB_PATH: ctx.dir });
  assert.equal(r.status, 0);
  const rc = JSON.parse(r.stdout).data.receipt;
  assert.equal(rc.noChange, true);
  assert.equal(rc.affectedRows, 0, '重复跳过不得虚报影响行数');
  assert.deepEqual(rc.writtenFields, []);
  assert.equal(countOf(ctx.dir, 'food_log'), before, '重复跳过不得落库');
  assert.ok(rc.idSource === 'record' || rc.idSource === 'none');
});

test('#97 · idSource 三值（record／singleton／condition）在 35 键内全部出现', () => {
  const seen = new Set();
  for (const sc of SCENARIOS) seen.add(runScenario(sc).env.data.receipt.idSource);
  assert.deepEqual([...seen].sort(), ['condition', 'record', 'singleton']);
});

// ------------------------------------------------------------------ 四、P9 与既有形状

test('#97 · P9：stdout 恒为一行 JSON，M5 只落字段不改 stdout 形态', () => {
  const { env } = runScenario({ key: 'calorie.weight.log', params: { kg: 70.1, date: '2026-09-06', time: '07:00:00' } });
  assert.equal(env.shape, 'receipt');
  assert.equal(env.data.ok, true);
  const r = run('calorie.weight.log', { kg: 70.3, date: '2026-09-06', time: '07:05:00' }, { SKILLS_DB_PATH: mkEnv().dir });
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trimEnd().split('\n').length, 1, 'stdout 必须一行 JSON');
});

// ------------------------------------------------------------------ 五、返修轮独立判定（R-1／R-3）
// 本节**不经** `checkM5`／`SCENARIOS`（探针与回归同源判定的盲区，红队 D-5）：
// 期望值逐字手写，只走 CLI stdout ＋ 只读句柄回查，独立于探针脚本。

/** 可写句柄（openDb 会迁移）——只用于把种子改成可区分的值。 */
function execOn(dir, fn) {
  const db = openDb(join(dir, 'calorie_data.db'));
  try {
    return fn(db);
  } finally {
    db.close();
  }
}

test('#97 · R-1：goal.set 的 writtenFields ＝ 本次实际 SET 列（不传 water 不报 water）', () => {
  const ctx = mkEnv();
  const env = { SKILLS_DB_PATH: ctx.dir };
  // 种子 `water_goal` 恰为列默认 2000，先改成可区分的 2300，并给上 weight_goal／goal_deadline
  execOn(ctx.dir, (db) => {
    db.prepare("UPDATE daily_goal SET water_goal = 2300, weight_goal = 68.0, goal_deadline = '2026-12-31' WHERE id = 1").run();
  });

  // ① 不传 water：SQL 里没有 water_goal 列（fetch/nutritionGoal.ts:74-77）→ 摘要不得出现 water
  const r1 = run('calorie.goal.set', { calorie: 1750, protein: 140, carbs: 180, fat: 50 }, env);
  assert.equal(r1.status, 0, 'goal.set(no water) exit ' + r1.status + ' stderr=' + (r1.stderr || '').slice(-300));
  const rc1 = JSON.parse(r1.stdout).data.receipt;
  assert.equal(rc1.op, 'update');
  assert.deepEqual(rc1.writtenFields, ['calorie', 'protein', 'carbs', 'fat'], '不传 water → water 列未被 SET');
  assert.ok(!rc1.m5Line.includes('water'), 'm5Line 字段段不得含 water：' + rc1.m5Line);
  assert.ok(rc1.m5Line.endsWith('| 字段 calorie,protein,carbs,fat'), rc1.m5Line);
  assert.equal(rc1.affectedRows, 1);
  assert.equal(rc1.recordId, 1);
  assert.deepEqual(rc1.ids, [1]);
  assert.equal(rc1.idSource, 'singleton');
  const after1 = readOnly(ctx.dir, (db) => db.prepare('SELECT calorie_goal, water_goal, weight_goal, goal_deadline FROM daily_goal WHERE id = 1').get());
  assert.equal(after1.calorie_goal, 1750, '本次 SET 的列确已写入');
  // #127 已修为 UPSERT：未 SET 的列逐列保持原值（不再整行替换）。
  assert.equal(after1.water_goal, 2300, 'water 未传 → 保持原值 2300（#127 UPSERT）');
  assert.equal(after1.weight_goal, 68, 'weight_goal 保持原值（#127 UPSERT）');
  assert.equal(after1.goal_deadline, '2026-12-31', 'goal_deadline 保持原值（#127 UPSERT）');

  // ② 传 water：SQL 含 water_goal 列 → 摘要含 water（同一键的两条 SQL 分别对账）
  const r2 = run('calorie.goal.set', { calorie: 1750, protein: 140, carbs: 180, fat: 50, water: 2400 }, env);
  assert.equal(r2.status, 0, 'goal.set(water) exit ' + r2.status);
  const rc2 = JSON.parse(r2.stdout).data.receipt;
  assert.deepEqual(rc2.writtenFields, ['calorie', 'protein', 'carbs', 'fat', 'water']);
  assert.ok(rc2.m5Line.endsWith('| 字段 calorie,protein,carbs,fat,water'), rc2.m5Line);
  assert.equal(readOnly(ctx.dir, (db) => db.prepare('SELECT water_goal AS w FROM daily_goal WHERE id = 1').get().w), 2400);
});

test('#97 · R-3：water.log 重复跳过回传原 id（与 diet.add 同口径，§3.3 record）', () => {
  const ctx = mkEnv();
  const env = { SKILLS_DB_PATH: ctx.dir };
  const p = { ml: 300, date: '2026-09-07', time: '09:00:00' };
  const a = run('calorie.water.log', p, env);
  assert.equal(a.status, 0, 'water.log exit ' + a.status + ' stderr=' + (a.stderr || '').slice(-300));
  const rid = JSON.parse(a.stdout).data.receipt.recordId;
  assert.ok(Number.isInteger(rid) && rid > 0);
  const b = run('calorie.water.log', p, env);
  assert.equal(b.status, 0);
  const rc = JSON.parse(b.stdout).data.receipt;
  assert.equal(rc.noChange, true);
  assert.equal(rc.affectedRows, 0, '重复跳过不得虚报影响行数');
  assert.deepEqual(rc.writtenFields, []);
  assert.equal(rc.idSource, 'record', '拿得到原 id 时报 record（返修 R-3 与 diet.add 统一）');
  assert.deepEqual(rc.ids, [rid]);
  assert.equal(rc.recordId, rid);
  assert.ok(rc.m5Line.startsWith('id=' + rid + ' | 日期 '), rc.m5Line);
  assert.equal(countOf(ctx.dir, 'food_log'), 3, '重复跳过不得落库（种子 2 条 ＋ 首写 1 条）');
});

test('#97 · R-3：同值 UPDATE 实测 noChange=false／affectedRows=1（契约 §3.6 措辞锚）', () => {
  const ctx = mkEnv();
  const env = { SKILLS_DB_PATH: ctx.dir };
  const a = run('calorie.weight.log', { kg: 70.4, date: '2026-09-07', time: '07:00:00' }, env);
  assert.equal(a.status, 0);
  const id = JSON.parse(a.stdout).data.receipt.recordId;
  const b = run('calorie.weight.update', { id, kg: 70.4 }, env);
  assert.equal(b.status, 0);
  const rc = JSON.parse(b.stdout).data.receipt;
  assert.equal(rc.noChange, false, 'weight.update 不设 noChange（#101 语义保持，本票不改）');
  assert.equal(rc.affectedRows, 1, 'SQLite 同值 UPDATE 仍计 1 行变更');
  assert.deepEqual(rc.writtenFields, ['kg']);
  assert.equal(readOnly(ctx.dir, (db) => Number(db.prepare('SELECT weight_kg AS n FROM weight_log WHERE id = ?').get(id).n)), 70.4);
});

test('#97 · 独立判定：四要素逐字对账（不经 checkM5／SCENARIOS，红队 D-5）', () => {
  // ① create：diet.add（种子 2 条 food_log → 新 id=3）
  {
    const ctx = mkEnv();
    const env = { SKILLS_DB_PATH: ctx.dir };
    const r = run('calorie.diet.add', { foodName: '独立判定', calories: 210, protein: 12, date: '2026-09-08', time: '12:00:00' }, env);
    assert.equal(r.status, 0, 'diet.add exit ' + r.status + ' stderr=' + (r.stderr || '').slice(-300));
    const e = JSON.parse(r.stdout);
    const rc = e.data.receipt;
    assert.equal(e.shape, 'receipt');
    assert.deepEqual(Object.keys(rc).sort(), [...BASE_KEYS, ...M5_KEYS].sort());
    assert.equal(rc.m5Contract, '1');
    assert.equal(rc.affectedRowsSource, 'sqlite:total_changes');
    assert.equal(rc.affectedRows, 1);
    assert.equal(rc.recordId, 3);
    assert.deepEqual(rc.ids, [3]);
    assert.equal(rc.idSource, 'record');
    assert.match(rc.meta.actionAt, STAMP_RE);
    assert.deepEqual(rc.writtenFields, ['foodName', 'calories', 'protein', 'carbs', 'fat', 'grams', 'note', 'date', 'time']);
    assert.equal(rc.m5Line, 'id=3 | 日期 ' + rc.meta.actionAt + ' | 影响 1 行 | 字段 foodName,calories,protein,carbs,fat,grams,note,date,time');
  }
  // ② create（体重）：种子 1 条 weight_log → 新 id=2；bmi／height_cm 为派生列，不入 CLI 摘要（§3.4）
  {
    const ctx = mkEnv();
    const env = { SKILLS_DB_PATH: ctx.dir };
    const r = run('calorie.weight.log', { kg: 71.2, date: '2026-09-08', time: '07:00:00' }, env);
    assert.equal(r.status, 0);
    const rc = JSON.parse(r.stdout).data.receipt;
    assert.equal(rc.affectedRows, 1);
    assert.equal(rc.recordId, 2);
    assert.deepEqual(rc.writtenFields, ['kg', 'note', 'date', 'time']);
    assert.equal(rc.m5Line, 'id=2 | 日期 ' + rc.meta.actionAt + ' | 影响 1 行 | 字段 kg,note,date,time');
    // 库内实写 6 列（含派生 height_cm／bmi）——摘要按 CLI 口径只列 4 项，落差在证据 §7 登记
    assert.equal(readOnly(ctx.dir, (db) => db.prepare('SELECT height_cm, bmi FROM weight_log WHERE id = 2').get()).height_cm, 175);
  }
  // ③ 条件批量硬删：种子 2 条 → affectedRows=2，id 不适用（旧版 id=n/a）
  {
    const ctx = mkEnv();
    const env = { SKILLS_DB_PATH: ctx.dir };
    const r = run('calorie.diet.remove-by-date', { date: '2026-09-05' }, env);
    assert.equal(r.status, 0);
    const rc = JSON.parse(r.stdout).data.receipt;
    assert.equal(rc.op, 'delete');
    assert.equal(rc.affectedRows, 2);
    assert.equal(rc.recordId, null);
    assert.deepEqual(rc.ids, []);
    assert.equal(rc.idSource, 'condition');
    assert.deepEqual(rc.writtenFields, []);
    assert.equal(rc.m5Line, 'id=n/a | 日期 ' + rc.meta.actionAt + ' | 影响 2 行 | 字段 —');
    assert.equal(countOf(ctx.dir, 'food_log'), 0);
  }
  // ④ 软删：行仍在库，affectedRows 计被写行数，摘要用库列名（无 CLI 参数）
  {
    const ctx = mkEnv();
    const env = { SKILLS_DB_PATH: ctx.dir };
    const a = run('calorie.exercise.add', { type: '独立判定跑', calories: 150, date: '2026-09-08' }, env);
    assert.equal(a.status, 0);
    const eid = JSON.parse(a.stdout).data.receipt.recordId;
    const r = run('calorie.exercise.remove', { id: eid }, env);
    assert.equal(r.status, 0);
    const rc = JSON.parse(r.stdout).data.receipt;
    assert.equal(rc.affectedRows, 1);
    assert.deepEqual(rc.writtenFields, ['is_deleted']);
    assert.equal(rc.m5Line, 'id=' + eid + ' | 日期 ' + rc.meta.actionAt + ' | 影响 1 行 | 字段 is_deleted');
    assert.equal(countOf(ctx.dir, 'exercise_log'), 2, '软删不删行');
    assert.equal(readOnly(ctx.dir, (db) => Number(db.prepare('SELECT is_deleted AS n FROM exercise_log WHERE id = ?').get(eid).n)), 1);
  }
});
