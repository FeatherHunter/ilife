/** T11 #30 · 唯一出口 cmd_read 全票 parity 抽查（沿 T8/T9 范式：tmp 隔离，真实 DB 零触碰）。
 * 覆盖 T2（唤醒词 HELP 现找）+ T6（history）+ T8（四主视图）+ T9（目标分析盘 12 键抽查）
 * + T10（照片画廊/对比/单图/动图/HELP）+ CLI 契约（argv+JSON+exit：缺 key 2/未知 3/缺失 4/预检 1）+ envelope 全字段 + --html 落盘。
 * 运行：先 pnpm build，再 node --test packages/skill-calorie/test/cmd-read-t11.test.mjs
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { CALORIE_COMBOS, calorieShapeFor } from '../dist/cli/keys.js';
import { buildPhotoHelp, lookupPhotoHelp } from '../dist/render/index.js';
import { TRIGGERS } from '../dist/triggers/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';

function seedFull(db) {
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, 'male', 175, 'moderate')").run();
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal, goal_deadline) VALUES (1, 1800, 150, 200, 50, 2000, 68.0, \'2026-12-31\')').run();
  const meals = [
    ['2026-09-05', '08:00:00', '粥', 300, 150, 3, 30, 2],
    ['2026-09-05', '12:30:00', '米饭', 200, 500, 10, 80, 5],
    ['2026-09-06', '08:00:00', '包子', 150, 300, 8, 50, 5],
    ['2026-09-06', '12:00:00', '米饭', 200, 550, 12, 85, 6],
    ['2026-09-07', '08:10:00', '燕麦', 100, 389, 13, 66, 7],
    ['2026-09-07', '12:10:00', '鸡胸', 150, 200, 35, 2, 4],
    ['2026-09-07', '15:00:00', '苹果', 200, 100, 1, 25, 0],
    ['2026-09-07', '19:10:00', '米饭', 200, 500, 10, 90, 5],
  ];
  for (const [d, t, name, g, cal, p, cb, f] of meals) {
    db.prepare('INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(d, t, name, g, cal, p, cb, f);
  }
  db.prepare("INSERT INTO exercise_log (date, time, exercise_type, duration_minutes, calories_burned, category) VALUES ('2026-09-06', '07:00:00', '户外跑', 30, 300, '有氧')").run();
  db.prepare("INSERT INTO exercise_log (date, time, exercise_type, duration_minutes, calories_burned, category) VALUES ('2026-09-07', '07:00:00', '慢跑', 30, 320, '有氧')").run();
  for (const [d, w] of [['2026-09-05', 70.5], ['2026-09-06', 70.2], ['2026-09-07', 70.0]]) {
    db.prepare('INSERT INTO weight_log (date, time, weight_kg, height_cm, bmi) VALUES (?, ?, ?, 175, 22.9)').run(d, '07:00:00', w);
  }
  db.prepare("INSERT INTO nutrition_products (product_name, brand, calories, protein, fat, carbohydrates, sodium, category, source) VALUES ('鸡胸肉', '测试', 165, 31, 3.6, 0, 70, '蛋白类', '测试')").run();
  db.prepare("INSERT INTO nutrition_products (product_name, brand, calories, protein, fat, carbohydrates, sodium, category, source) VALUES ('米饭', '测试', 130, 2.7, 0.3, 28, 1, '主食', '测试')").run();
}

function seedPhotos(db) {
  const srcDir = mkdtempSync(join(tmpdir(), 't11-src-'));
  const photosDir = mkdtempSync(join(tmpdir(), 't11-photos-'));
  const src = (n) => { const p = join(srcDir, n); writeFileSync(p, 'fake-' + n); return p; };
  return { srcDir, photosDir, src };
}

function mkEnv() {
  const dir = mkdtempSync(join(tmpdir(), 't11-cli-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  seedFull(db);
  db.close();
  return dir;
}

function run(bin, key, params, envExtra) {
  const a = key === undefined ? [] : (params === undefined ? [key] : [key, '--params', typeof params === 'string' ? params : JSON.stringify(params)]);
  return spawnSync(NODE_BIN, [bin, ...a], { encoding: 'utf8', env: { ...process.env, ...(envExtra || {}) } });
}

function runOk(dir, key, params, extra) {
  const r = run(BIN, key, params, { SKILLS_DB_PATH: dir, ...(extra || {}) });
  assert.equal(r.status, 0, key + ' exit ' + r.status + ' stderr=' + (r.stderr || '').slice(-500));
  const env = JSON.parse(r.stdout);
  assert.equal(env.version, '0.1.0');
  assert.equal(env.skill, 'calorie');
  assert.equal(env.key, key);
  assert.equal(env.shape, CALORIE_COMBOS[key].shape);
  assert.equal(env.shape, calorieShapeFor(key));
  return env;
}

test('键表：95 组合（读 60 + 写 35，#113 趋势2+其他6移植 +8）registry 合法 + 形状对齐 envelope 全字段', () => {
  assert.equal(Object.keys(CALORIE_COMBOS).length, 95);
  for (const [k, v] of Object.entries(CALORIE_COMBOS)) {
    assert.match(k, /^[a-z][a-z0-9-]*\.[a-z0-9][a-z0-9-.]*$/);
    assert.ok(['list', 'detail', 'stat', 'receipt', 'analysis', 'fallback'].includes(v.shape));
    assert.ok(v.title.length > 0);
  }
  assert.equal(CALORIE_COMBOS['calorie.view.home'].shape, 'stat');
  assert.equal(CALORIE_COMBOS['calorie.photo.list'].shape, 'list');
  assert.equal(CALORIE_COMBOS['calorie.photo.detail'].shape, 'detail');
  assert.equal(CALORIE_COMBOS['calorie.photo.gif'].shape, 'analysis');
  assert.throws(() => calorieShapeFor('calorie.nope'), /未知 calorie/);
  assert.throws(() => calorieShapeFor('calorie.view_home'), /非法 registry/);
});

test('T8 四主视图 parity：envelope stat + metrics 全 number + HTML 快照', () => {
  const dir = mkEnv();
  const h = runOk(dir, 'calorie.view.home', { date: '2026-09-07' });
  assert.ok(typeof h.data.metrics.streakDays === 'number');
  assert.ok(typeof h.data.metrics.intakeCal === 'number');
  for (const v of Object.values(h.data.metrics)) assert.equal(typeof v, 'number');
  const d = runOk(dir, 'calorie.view.diet', { start: '2026-09-05', end: '2026-09-07', date: '2026-09-07' });
  assert.ok(d.data.metrics.totalCalories > 0);
  const e = runOk(dir, 'calorie.view.exercise', { start: '2026-09-06', end: '2026-09-07' });
  assert.equal(e.data.metrics.totalBurned, 620);
  const g = runOk(dir, 'calorie.view.goal', { start: '2026-09-05', end: '2026-09-07' });
  assert.equal(g.data.metrics.calorie_goal, 1800);
  const t = runOk(dir, 'calorie.today', { date: '2026-09-07' });
  assert.equal(t.shape, 'list');
  assert.ok(t.data.total >= 4);
  const p = join(dir, 'home.html');
  const r = spawnSync(NODE_BIN, [BIN, 'calorie.view.home', '--params', JSON.stringify({ date: '2026-09-07' }), '--html', p], { encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir } });
  assert.equal(r.status, 0);
  const html = readFileSync(p, 'utf8');
  assert.match(html, /今日总览 2026-09-07/);
  assert.match(html, /ilife-page/);
});

test('T9 目标分析盘 parity：12 键抽查 stat + 缺失阻断', () => {
  const dir = mkEnv();
  const cfg = runOk(dir, 'calorie.view.goal-config');
  assert.equal(cfg.data.metrics.calorie_goal, 1800);
  const rec = runOk(dir, 'calorie.view.goal-recommend', { profile: 'cut' });
  assert.ok(rec.data.metrics.calorieGoal > 0);
  const w = runOk(dir, 'calorie.view.goal-weight', { start: '2026-09-01', end: '2026-09-07' });
  assert.equal(w.data.metrics.latestKg, 70);
  const pr = runOk(dir, 'calorie.view.goal-progress', { start: '2026-09-05', end: '2026-09-07' });
  assert.ok(typeof pr.data.metrics.completionPct === 'number' || pr.data.metrics.completionPct === undefined);
  const st = runOk(dir, 'calorie.view.goal-status');
  assert.equal(st.data.metrics.paused, 0);
  const cb = runOk(dir, 'calorie.view.combined', { pair: 'weight_calorie', window: '7d' });
  assert.ok(typeof cb.data.metrics.aCount === 'number');
  const df = runOk(dir, 'calorie.view.deficit', { start: '2026-09-05', end: '2026-09-07' });
  assert.ok(typeof df.data.metrics.avgDeficit === 'number');
  const rv = runOk(dir, 'calorie.view.diet-review', { start: '2026-09-05', end: '2026-09-07' });
  assert.ok(rv.data.metrics.loggedDays >= 2);
  const hl = runOk(dir, 'calorie.view.health', { start: '2026-09-05', end: '2026-09-07' });
  assert.ok(hl.data.metrics.loggedDays >= 2);
  const rk = runOk(dir, 'calorie.view.ranking', { start: '2026-09-05', end: '2026-09-07' });
  assert.equal(rk.data.metrics.okCount, 5);
  const lb = runOk(dir, 'calorie.view.library');
  assert.equal(lb.data.metrics.total, 2);
  const sc = runOk(dir, 'calorie.view.search', { keyword: '鸡胸' });
  assert.equal(sc.data.metrics.total, 1);
  const emptyDir = mkdtempSync(join(tmpdir(), 't11-empty-'));
  openDb(join(emptyDir, 'calorie_data.db')).close();
  const miss = run(BIN, 'calorie.view.goal-config', undefined, { SKILLS_DB_PATH: emptyDir });
  assert.equal(miss.status, 4);
  assert.equal(miss.stdout, '');
  assert.match(miss.stderr, /缺失|取数/);
  // #100 · G5 三键空库一律 exit 4（missing-data），stdout 纯净无合成数字。
  for (const [k, p] of [
    ['calorie.view.deficit', { start: '2026-09-05', end: '2026-09-07' }],
    ['calorie.view.goal-recommend', { profile: 'cut' }],
    ['calorie.photo.gif', { tag: '正面' }],
  ]) {
    const r = run(BIN, k, p, { SKILLS_DB_PATH: emptyDir });
    assert.equal(r.status, 4, k + ' 空库未阻断');
    assert.equal(r.stdout, '', k + ' 空库 stdout 非空');
    assert.match(r.stderr, /缺失|取数/, k + ' 空库 stderr 无阻断文案');
  }
});

test('T10 照片 parity：画廊/单图/对比/动图/HELP + 二进制不内嵌', async () => {
  const dir = mkEnv();
  const { photosDir, src } = seedPhotos(dbOpen(dir));
  function dbOpen(d) { return openDb(join(d, 'calorie_data.db')); }
  const { addPhotos } = await import('../dist/fetch/photos.js');
  const db = dbOpen(dir);
  const added = addPhotos(db, photosDir, { srcPaths: [src('a.jpg'), src('b.jpg')], tag: '正面', today: '2026-09-06', nowTime: '08:00:00' });
  db.close();
  assert.equal(added.length, 2);
  const envExtra = { SKILLS_DB_PATH: dir, CALORIE_PHOTOS_DIR: photosDir };
  const g = runOk(dir, 'calorie.photo.list', { tag: '正面' }, envExtra);
  assert.equal(g.data.total, 2);
  const v = runOk(dir, 'calorie.photo.detail', { id: added[0].id }, envExtra);
  assert.equal(v.shape, 'detail');
  assert.ok(v.data.item.photoPath.endsWith('.jpg'));
  const c = runOk(dir, 'calorie.photo.compare', { id1: added[0].id, id2: added[1].id }, envExtra);
  assert.equal(c.data.total, 2);
  const gif = runOk(dir, 'calorie.photo.gif', { tag: '正面' }, envExtra);
  assert.equal(gif.shape, 'analysis');
  assert.match(gif.data.summary, /GIF/);
  const help = runOk(dir, 'calorie.help.center', { q: '记身材照' }, envExtra);
  assert.ok(help.data.total >= 3);
  const p = join(dir, 'gallery.html');
  const r = spawnSync(NODE_BIN, [BIN, 'calorie.photo.list', '--params', JSON.stringify({ tag: '正面' }), '--html', p], { encoding: 'utf8', env: { ...process.env, ...envExtra } });
  assert.equal(r.status, 0);
  const html = readFileSync(p, 'utf8');
  assert.match(html, /看身材照/);
  assert.doesNotMatch(html, /base64/);
  assert.throws(() => lookupPhotoHelp(''), /必填/);
  assert.equal(buildPhotoHelp().length, 10);
});

test('T2+T6 parity：唤醒词 HELP 现找 + 热量历史 + CLI 契约', () => {
  const dir = mkEnv();
  assert.ok(TRIGGERS.length >= 436);
  const h = runOk(dir, 'calorie.help.lookup', { q: '看今日主页' });
  assert.ok(h.data.total >= 1);
  assert.ok(String(h.data.items[0].wake_word).includes('看今日主页'));
  const hist = runOk(dir, 'calorie.history', { days: 7 });
  assert.ok(hist.data.total >= 2);
  assert.equal(run(BIN, 'calorie.help.lookup', {}, { SKILLS_DB_PATH: dir }).status, 2);
  assert.equal(run(BIN, 'calorie.nope', undefined, { SKILLS_DB_PATH: dir }).status, 3);
  assert.equal(run(BIN, 'calorie.view.home', undefined, { SKILLS_DB_PATH: '' }).status, 1);
  assert.equal(run(BIN, undefined, undefined, { SKILLS_DB_PATH: dir }).status, 2);
  const bad = run(BIN, 'calorie.view.home', '--params', { SKILLS_DB_PATH: dir });
  assert.notEqual(bad.status, 0);
});
