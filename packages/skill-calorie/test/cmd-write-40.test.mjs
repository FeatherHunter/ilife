/** #40 · 写链写键 parity（沿 T11 范式：tmp 隔离，真实 DB 零触碰）。
 * 35 写键逐键可执行 + receipt 回执（ok/message + T10 receipt）+ exit 契约
 * （缺参 2/未知键 3/缺失阻断 4/预检 1）+ --html 落盘 + skilllink 登记抽查。
 * 运行：先 pnpm build，再 node --test packages/skill-calorie/test/cmd-write-40.test.mjs
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { CALORIE_COMBOS, CALORIE_WRITE_COMBOS, calorieShapeFor, isCalorieWriteKey } from '../dist/cli/keys.js';
import { normalizeActivityLevel } from '../dist/fetch/profile.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const WRITE_KEYS = Object.keys(CALORIE_WRITE_COMBOS);

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
  const dir = mkdtempSync(join(tmpdir(), 'w40-cli-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  seedDb(db);
  db.close();
  return dir;
}

function mkEmpty() {
  const dir = mkdtempSync(join(tmpdir(), 'w40-empty-'));
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
  assert.equal(env.version, '0.1.0');
  assert.equal(env.skill, 'calorie');
  assert.equal(env.key, key);
  assert.equal(env.shape, 'receipt');
  assert.equal(env.shape, calorieShapeFor(key));
  assert.equal(env.data.ok, true);
  assert.ok(typeof env.data.message === 'string' && env.data.message.length > 0);
  const rc = env.data.receipt;
  assert.ok(rc && typeof rc.scene === 'string' && rc.scene.length > 0);
  assert.ok(['create', 'update', 'delete'].includes(rc.op));
  assert.ok(typeof rc.summary === 'string' && rc.summary.length > 0);
  assert.equal(rc.summary, env.data.message);
  return env;
}

test('写键表：35 键一律 receipt + registry 合法 + 全量 59', () => {
  assert.equal(WRITE_KEYS.length, 35);
  assert.equal(Object.keys(CALORIE_COMBOS).length, 59);
  for (const k of WRITE_KEYS) {
    assert.match(k, /^[a-z][a-z0-9-]*\.[a-z0-9][a-z0-9-.]*$/);
    assert.equal(CALORIE_WRITE_COMBOS[k].shape, 'receipt');
    assert.ok(isCalorieWriteKey(k));
  }
  assert.ok(!isCalorieWriteKey('calorie.today'));
  assert.equal(normalizeActivityLevel('久坐'), 'sedentary');
  assert.equal(normalizeActivityLevel('高度活跃'), 'very_active');
  assert.equal(normalizeActivityLevel('active'), 'active');
});

test('饮食记/改/删 + 幂等 + 缺失阻断', () => {
  const dir = mkEnv();
  const a = runWrite(dir, 'calorie.diet.add', { foodName: '鸡胸', calories: 200, protein: 35, date: '2026-09-06', time: '12:10:00' });
  assert.equal(a.data.receipt.op, 'create');
  const id = a.data.receipt.recordId;
  assert.ok(typeof id === 'number');
  const dup = runWrite(dir, 'calorie.diet.add', { foodName: '鸡胸', calories: 200, protein: 35, date: '2026-09-06', time: '12:10:00' });
  assert.equal(dup.data.receipt.noChange, true);
  const u = runWrite(dir, 'calorie.diet.update', { id, grams: 150 });
  assert.equal(u.data.receipt.op, 'update');
  assert.ok(u.data.message.includes('#' + id));
  const d = runWrite(dir, 'calorie.diet.remove', { id });
  assert.equal(d.data.receipt.op, 'delete');
  assert.equal(run('calorie.diet.remove', { id }, { SKILLS_DB_PATH: dir }).status, 4);
  assert.equal(run('calorie.diet.update', { id: 999999, grams: 1 }, { SKILLS_DB_PATH: dir }).status, 4);
  assert.equal(run('calorie.diet.add', { foodName: 'x' }, { SKILLS_DB_PATH: dir }).status, 2);
  assert.equal(run('calorie.diet.remove-by-type', { date: '2026-09-06', mealType: '宵夜' }, { SKILLS_DB_PATH: dir }).status, 2);
});

test('饮食批量/复制/按日改/按日删/按范围删/按餐别删', () => {
  const dir = mkEnv();
  const b = runWrite(dir, 'calorie.diet.batch', { items: [{ foodName: '粥', calories: 150, protein: 3, date: '2026-09-06', time: '08:00:00' }, { foodName: '', calories: 1, protein: 1 }] });
  assert.match(b.data.message, /新增 1/);
  const c = runWrite(dir, 'calorie.diet.copy', { from: '2026-09-05', to: '2026-09-06' });
  assert.match(c.data.message, /复制 1，跳过 1/);
  assert.equal(run('calorie.diet.copy', { from: '2026-01-01', to: '2026-01-02' }, { SKILLS_DB_PATH: dir }).status, 4);
  const u = runWrite(dir, 'calorie.diet.update-by-date', { date: '2026-09-06', note: '食堂' });
  assert.match(u.data.message, /2 条/);
  assert.equal(run('calorie.diet.update-by-date', { date: '2026-01-01', note: 'x' }, { SKILLS_DB_PATH: dir }).status, 4);
  const t = runWrite(dir, 'calorie.diet.remove-by-type', { date: '2026-09-05', mealType: '早餐' });
  assert.match(t.data.message, /1 条/);
  assert.equal(run('calorie.diet.remove-by-type', { date: '2026-09-05', mealType: '早餐' }, { SKILLS_DB_PATH: dir }).status, 4);
  const dd = runWrite(dir, 'calorie.diet.remove-by-date', { date: '2026-09-06' });
  assert.match(dd.data.message, /2 条/);
  assert.equal(run('calorie.diet.remove-by-date', { date: '2026-01-01' }, { SKILLS_DB_PATH: dir }).status, 4);
  const r = runWrite(dir, 'calorie.diet.remove-by-range', { start: '2026-09-05', end: '2026-09-05' });
  assert.match(r.data.message, /1 条/);
  assert.equal(run('calorie.diet.remove-by-range', { start: '2026-09-05', end: '2026-09-04' }, { SKILLS_DB_PATH: dir }).status, 2);
});

test('记喝水累计', () => {
  const dir = mkEnv();
  const w = runWrite(dir, 'calorie.water.log', { ml: 300, date: '2026-09-06', time: '09:00:00' });
  assert.match(w.data.message, /300 ml/);
  assert.match(w.data.message, /累计 300 ml/);
  assert.equal(run('calorie.water.log', { ml: -5 }, { SKILLS_DB_PATH: dir }).status, 2);
});

test('体重记/改/删/批量 + 无身高阻断', () => {
  const dir = mkEnv();
  const l = runWrite(dir, 'calorie.weight.log', { kg: 70.2, date: '2026-09-06', time: '07:00:00' });
  assert.equal(l.data.receipt.recordId, 2);
  assert.match(l.data.message, /70.2 kg/);
  const u = runWrite(dir, 'calorie.weight.update', { id: 2, kg: 70 });
  assert.match(u.data.message, /70.2→70 kg/);
  const ud = runWrite(dir, 'calorie.weight.update', { date: '2026-09-06', note: '晨起' });
  assert.match(ud.data.message, /1 条/);
  const bt = runWrite(dir, 'calorie.weight.batch', { items: [{ date: '2026-09-04', kg: 70.8 }, { date: '2026-09-05', kg: 70.5 }, { date: 'xx', kg: 1 }] });
  assert.match(bt.data.message, /写入 1，跳过 1，失败 1/);
  const del = runWrite(dir, 'calorie.weight.remove', { id: 2 });
  assert.equal(del.data.receipt.op, 'delete');
  runWrite(dir, 'calorie.weight.remove', { date: '2026-09-05' });
  const rg = runWrite(dir, 'calorie.weight.remove', { start: '2026-09-04', end: '2026-09-04' });
  assert.match(rg.data.message, /1 条/);
  assert.equal(run('calorie.weight.update', { note: 'x' }, { SKILLS_DB_PATH: dir }).status, 2);
  assert.equal(run('calorie.weight.remove', {}, { SKILLS_DB_PATH: dir }).status, 2);
  const bare = mkEmpty();
  assert.equal(run('calorie.weight.log', { kg: 70 }, { SKILLS_DB_PATH: bare }).status, 4);
});

test('运动记/改/删/批量/复制 + 字段白名单', () => {
  const dir = mkEnv();
  const a = runWrite(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30, date: '2026-09-06' });
  assert.equal(a.data.receipt.op, 'create');
  const id = a.data.receipt.recordId;
  const st = runWrite(dir, 'calorie.exercise.add', { type: '卧推', calories: 150, category: '力量', loadKg: 60, reps: 10, date: '2026-09-06' });
  assert.ok(st.data.receipt.recordId > id);
  const bt = runWrite(dir, 'calorie.exercise.add', { items: [{ type: '快走', calories: 100, date: '2026-09-06' }] });
  assert.match(bt.data.message, /新增 1 条/);
  const cp = runWrite(dir, 'calorie.exercise.add', { copyFrom: 'yesterday', date: '2026-09-06' });
  assert.match(cp.data.message, /复制/);
  assert.equal(run('calorie.exercise.add', { calories: 1 }, { SKILLS_DB_PATH: dir }).status, 2);
  assert.equal(run('calorie.exercise.update', { id, noSuch: 1 }, { SKILLS_DB_PATH: dir }).status, 2);
  const u = runWrite(dir, 'calorie.exercise.update', { id, minutes: 40 });
  assert.equal(u.data.receipt.op, 'update');
  runWrite(dir, 'calorie.exercise.update', { date: '2026-09-06', note: '补' });
  assert.equal(run('calorie.exercise.update', { date: '2026-01-01', note: 'x' }, { SKILLS_DB_PATH: dir }).status, 4);
  runWrite(dir, 'calorie.exercise.remove', { id });
  assert.equal(run('calorie.exercise.remove', { id }, { SKILLS_DB_PATH: dir }).status, 0);
  assert.equal(run('calorie.exercise.remove', { id: 999999 }, { SKILLS_DB_PATH: dir }).status, 4);
  const dd = runWrite(dir, 'calorie.exercise.remove', { date: '2026-09-06' });
  assert.match(dd.data.message, /3 条/);
  assert.equal(run('calorie.exercise.remove', { from: '2026-01-01', to: '2026-01-02' }, { SKILLS_DB_PATH: dir }).status, 4);
  assert.equal(run('calorie.exercise.remove', {}, { SKILLS_DB_PATH: dir }).status, 2);
});

test('身材照存/删/标签 + 源缺失阻断', () => {
  const dir = mkEnv();
  const srcDir = mkdtempSync(join(tmpdir(), 'w40-src-'));
  const photosDir = mkdtempSync(join(tmpdir(), 'w40-photos-'));
  const f1 = join(srcDir, 'a.jpg');
  const f2 = join(srcDir, 'b.jpg');
  writeFileSync(f1, 'fake-a');
  writeFileSync(f2, 'fake-b');
  const extra = { CALORIE_PHOTOS_DIR: photosDir };
  const a = runWrite(dir, 'calorie.photo.add', { srcPaths: [f1, f2], tag: '正面', date: '2026-09-06', time: '08:00:00' }, extra);
  assert.equal(a.data.receipt.op, 'create');
  const pid = a.data.receipt.recordId;
  assert.equal(run('calorie.photo.add', { srcPaths: [join(srcDir, 'nope.jpg')], tag: '正面' }, { SKILLS_DB_PATH: dir, ...extra }).status, 4);
  const tag = runWrite(dir, 'calorie.photo.tag', { id: pid, op: 'add', tag: '晨起' }, extra);
  assert.match(tag.data.message, /晨起/);
  const same = runWrite(dir, 'calorie.photo.tag', { id: pid, op: 'add', tag: '晨起' }, extra);
  assert.equal(same.data.receipt.noChange, true);
  runWrite(dir, 'calorie.photo.tag', { id: pid, op: 'set', tags: ['侧面'] }, extra);
  assert.equal(run('calorie.photo.tag', { id: pid, op: 'remove', tag: '侧面' }, { SKILLS_DB_PATH: dir, ...extra }).status, 4);
  runWrite(dir, 'calorie.photo.tag', { id: pid, op: 'remove', tag: '晨起' }, extra);
  const d = runWrite(dir, 'calorie.photo.remove', { id: pid }, extra);
  assert.equal(d.data.receipt.op, 'delete');
  assert.equal(run('calorie.photo.remove', { id: pid }, { SKILLS_DB_PATH: dir, ...extra }).status, 4);
  assert.equal(run('calorie.photo.tag', { id: pid, op: 'add', tag: 'x' }, { SKILLS_DB_PATH: dir, ...extra }).status, 4);
});

test('食品库存取改废 + 缺失阻断', () => {
  const dir = mkEnv();
  const a = runWrite(dir, 'calorie.product.add', { productName: '燕麦片', calories: 389, protein: 13, fat: 7, carbohydrates: 66, sodium: 5 });
  const id = a.data.receipt.recordId;
  const u = runWrite(dir, 'calorie.product.update', { id, note: '新版' });
  assert.equal(u.data.receipt.op, 'update');
  assert.equal(run('calorie.product.update', { id: 999999, note: 'x' }, { SKILLS_DB_PATH: dir }).status, 4);
  const dep = runWrite(dir, 'calorie.product.deprecate', { id });
  assert.match(dep.data.message, /已下架/);
  assert.equal(run('calorie.product.deprecate', { id: 999999 }, { SKILLS_DB_PATH: dir }).status, 4);
  assert.equal(run('calorie.product.add', { productName: 'x' }, { SKILLS_DB_PATH: dir }).status, 2);
});

test('档案设/活动量/改 + 白名单', () => {
  const dir = mkEmpty();
  const s = runWrite(dir, 'calorie.profile.set', { heightCm: 175, age: 30, gender: '男', activityLevel: '中度' });
  assert.match(s.data.message, /175/);
  const g = runWrite(dir, 'calorie.profile.activity', { activityLevel: '活跃' });
  assert.match(g.data.message, /moderate→active/);
  const u = runWrite(dir, 'calorie.profile.update', { field: 'note', value: '测试' });
  assert.equal(u.data.receipt.op, 'update');
  runWrite(dir, 'calorie.profile.update', { fields: { age: 31 } });
  assert.equal(run('calorie.profile.set', {}, { SKILLS_DB_PATH: dir }).status, 2);
  assert.equal(run('calorie.profile.activity', { activityLevel: '乱填' }, { SKILLS_DB_PATH: dir }).status, 4);
  assert.equal(run('calorie.profile.update', { field: 'nope', value: 1 }, { SKILLS_DB_PATH: dir }).status, 2);
});

test('目标定/改/暂停/重启 + 无行阻断', () => {
  const bare = mkEmpty();
  assert.equal(run('calorie.goal.water', { water: 2000 }, { SKILLS_DB_PATH: bare }).status, 4);
  const s = runWrite(bare, 'calorie.goal.set', { calorie: 1800, protein: 150, carbs: 200, fat: 50, water: 2000 });
  assert.equal(s.data.receipt.op, 'create');
  const s2 = runWrite(bare, 'calorie.goal.set', { calorie: 1900, protein: 150, carbs: 200, fat: 50 });
  assert.equal(s2.data.receipt.op, 'update');
  const w = runWrite(bare, 'calorie.goal.water', { water: 2200 });
  assert.match(w.data.message, /2200 ml/);
  const wg = runWrite(bare, 'calorie.goal.weight', { kg: 68, deadline: '2026-12-31' });
  assert.match(wg.data.message, /68 kg/);
  assert.equal(run('calorie.goal.weight', { kg: -1 }, { SKILLS_DB_PATH: bare }).status, 2);
  const p = runWrite(bare, 'calorie.goal.pause', {});
  assert.match(p.data.message, /暂停/);
  const rs = runWrite(bare, 'calorie.goal.resume', {});
  assert.match(rs.data.message, /重启/);
  assert.equal(run('calorie.goal.set', { calorie: 1800 }, { SKILLS_DB_PATH: bare }).status, 2);
});

test('体脂围度记/删 + 来源白名单', () => {
  const dir = mkEnv();
  const c = runWrite(dir, 'calorie.body.composition-add', { source: 'gym', bodyFatPct: 18.5, date: '2026-09-06' });
  assert.equal(c.data.receipt.op, 'create');
  assert.equal(run('calorie.body.composition-add', { source: '乱填', bodyFatPct: 1 }, { SKILLS_DB_PATH: dir }).status, 2);
  assert.equal(run('calorie.body.composition-add', { source: 'gym' }, { SKILLS_DB_PATH: dir }).status, 2);
  runWrite(dir, 'calorie.body.composition-remove', { id: c.data.receipt.recordId });
  assert.equal(run('calorie.body.composition-remove', { id: 999999 }, { SKILLS_DB_PATH: dir }).status, 4);
  const m = runWrite(dir, 'calorie.body.measure-add', { waistCm: 85, hipCm: 95, date: '2026-09-06' });
  assert.match(m.data.message, /waistCm 85/);
  assert.equal(run('calorie.body.measure-add', { date: '2026-09-06' }, { SKILLS_DB_PATH: dir }).status, 2);
  assert.equal(run('calorie.body.measure-add', { noSuch: 1 }, { SKILLS_DB_PATH: dir }).status, 2);
  runWrite(dir, 'calorie.body.measure-remove', { id: m.data.receipt.recordId });
});

test('skilllink 登记：write 键经 skilllink read 可执行', () => {
  const dir = mkEnv();
  const root = join(HERE, '..', '..', '..');
  const r = spawnSync(NODE_BIN, [join(root, 'tooling', 'skilllink.mjs'), 'read', 'calorie.weight.log', '--params', JSON.stringify({ kg: 71, date: '2026-09-06' })], { encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir } });
  assert.equal(r.status, 0, 'skilllink read exit ' + r.status + ' stderr=' + (r.stderr || '').slice(-400));
  const env = JSON.parse(r.stdout);
  assert.equal(env.key, 'calorie.weight.log');
  assert.equal(env.shape, 'receipt');
  assert.equal(env.data.ok, true);
});

test('写键 exit 契约 + --html 落盘', () => {
  const dir = mkEnv();
  assert.equal(run(undefined, undefined, { SKILLS_DB_PATH: dir }).status, 2);
  assert.equal(run('calorie.nope', undefined, { SKILLS_DB_PATH: dir }).status, 3);
  assert.equal(run('calorie.diet.add', '--params', { SKILLS_DB_PATH: dir }).status, 2);
  assert.equal(run('calorie.weight.log', undefined, { SKILLS_DB_PATH: '' }).status, 1);
  const p = join(dir, 'receipt.html');
  const r = spawnSync(NODE_BIN, [BIN, 'calorie.weight.log', '--params', JSON.stringify({ kg: 70, date: '2026-09-06' }), '--html', p], { encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir } });
  assert.equal(r.status, 0);
  const html = readFileSync(p, 'utf8');
  assert.match(html, /记体重/);
  assert.match(html, /ilife-page/);
});
