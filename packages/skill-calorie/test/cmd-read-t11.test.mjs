/** T11 #30 · 唯一出口 cmd_read 全票 parity 抽查（沿 T8/T9 范式：tmp 隔离，真实 DB 零触碰）。
 * 覆盖 T2（唤醒词 HELP 现找）+ T6（history）+ T8（四主视图）+ T9（目标分析盘 12 键抽查）
 * + T10（照片画廊/对比/单图/动图）+ CLI 契约（argv+JSON+exit：缺 key 2/未知 3/缺失 4/预检 1）+ envelope 全字段 + --html 落盘。
 * 运行：先 pnpm build，再 node --test packages/skill-calorie/test/cmd-read-t11.test.mjs
 */
import { DECLARED_KEYS, DECLARED_READ_KEYS, DECLARED_WRITE_KEYS } from './declared.mjs';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { CALORIE_COMBOS, calorieShapeFor } from '../dist/cli/keys.js';
import { TRIGGERS } from '../dist/triggers/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
/* #326 · `CALORIE_TODAY`（见 `analysis/utils.ts`）只钉 `todayISO()`，而 `calorie.history` 的窗口锚
 * 取的是 `analysis/historyStore.ts` 里的 `new Date()`——该键的「最近 N 天」因此与当刻日期绑定，
 * 种子锚一旦滑出窗口，这道门跨午夜即确定性变红（不是回归）。本文件用 `--require` 预载把「当刻」
 * 钉死（写法沿 `docs/research/t63-line1-review-dateshift.mjs`），只钉时钟、**断言一字不改**。
 * `freeze-clock.cjs` 不匹配 `test/*.test.mjs`，故不改变全量条数基线。 */
const CLOCK_PRELOAD = join(HERE, 'freeze-clock.cjs');
/** #326 · 整份用例的日期基准：种子数据与「当刻」同时按它平移，**默认 0 ＝ 逐字沿用原日期**。
 *  设成别的值（如 30）即把「种子 ＋ 当刻」整体挪到另一段时间轴，用来自证「换个日期照样绿」。 */
const OFFSET_DAYS = 0;
/** 按**本地日**平移（同 `analysis/historyStore.ts` 的 `fmtDate` 口径）：这里刻意不走 `toISOString()`，
 *  否则东八区会整体退一天，种子与「当刻」锚就对不上了。 */
const shiftDay = (iso) => {
  const parts = iso.split('-').map(Number);
  const t = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  t.setDate(t.getDate() + OFFSET_DAYS);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};
/** 日期助手：`d(7)` ＝ 本文件原字面量 `2026-09-07` 平移后的一天。 */
const d = (day) => shiftDay('2026-09-' + String(day).padStart(2, '0'));
const CLOCK_ANCHOR = d(7) + 'T00:00:00';
/** 钉钟环境（所有**相对窗口**的读命令共用）：`FAKE_NOW_ISO` 触发上面的预载。
 *  不钉它们的话，`window:'7d'`／不传日期的 `calorie.photo.list` 这类照样随真实当刻漂移。 */
const CLOCK = { FAKE_NOW_ISO: CLOCK_ANCHOR };
/** 原字面量 2026-12-31（目标截止日）同样随基准平移。 */
const dYearEnd = shiftDay('2026-12-31');

function seedFull(db) {
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, 'male', 175, 'moderate')").run();
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal, goal_deadline) VALUES (1, 1800, 150, 200, 50, 2000, 68.0, ?)').run(dYearEnd);
  const meals = [
    [d(5), '08:00:00', '粥', 300, 150, 3, 30, 2],
    [d(5), '12:30:00', '米饭', 200, 500, 10, 80, 5],
    [d(6), '08:00:00', '包子', 150, 300, 8, 50, 5],
    [d(6), '12:00:00', '米饭', 200, 550, 12, 85, 6],
    [d(7), '08:10:00', '燕麦', 100, 389, 13, 66, 7],
    [d(7), '12:10:00', '鸡胸', 150, 200, 35, 2, 4],
    [d(7), '15:00:00', '苹果', 200, 100, 1, 25, 0],
    [d(7), '19:10:00', '米饭', 200, 500, 10, 90, 5],
  ];
  for (const [dt, t, name, g, cal, p, cb, f] of meals) {
    db.prepare('INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(dt, t, name, g, cal, p, cb, f);
  }
  db.prepare("INSERT INTO exercise_log (date, time, exercise_type, duration_minutes, calories_burned, category) VALUES (?, '07:00:00', '户外跑', 30, 300, '有氧')").run(d(6));
  db.prepare("INSERT INTO exercise_log (date, time, exercise_type, duration_minutes, calories_burned, category) VALUES (?, '07:00:00', '慢跑', 30, 320, '有氧')").run(d(7));
  for (const [dt, w] of [[d(5), 70.5], [d(6), 70.2], [d(7), 70.0]]) {
    db.prepare('INSERT INTO weight_log (date, time, weight_kg, height_cm, bmi) VALUES (?, ?, ?, 175, 22.9)').run(dt, '07:00:00', w);
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

function run(bin, key, params, envExtra, html) {
  const a = key === undefined ? [] : (params === undefined ? [key] : [key, '--params', typeof params === 'string' ? params : JSON.stringify(params)]);
  if (html !== undefined) a.push('--html', html);
  const env = { ...process.env, ...(envExtra || {}) };
  // 只在调用方给了 FAKE_NOW_ISO 时预载钉钟，其余调用面（含真实时钟依赖）一字不变。
  const argv = env['FAKE_NOW_ISO'] ? ['--require', CLOCK_PRELOAD, bin, ...a] : [bin, ...a];
  return spawnSync(NODE_BIN, argv, { encoding: 'utf8', env });
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

test('键表：全量组合（读／写合计 == 权威声明）registry 合法 + 形状对齐 envelope 全字段', () => {
  assert.deepEqual(Object.keys(CALORIE_COMBOS).sort(), DECLARED_KEYS, '组合键表 == 权威声明（未搬迁清单 ＋ 各能力），不再手写数字');
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
  const h = runOk(dir, 'calorie.view.home', { date: d(7) });
  assert.ok(typeof h.data.metrics.streakDays === 'number');
  assert.ok(typeof h.data.metrics.intakeCal === 'number');
  for (const v of Object.values(h.data.metrics)) assert.equal(typeof v, 'number');
  const diet = runOk(dir, 'calorie.view.diet', { start: d(5), end: d(7), date: d(7) });
  assert.ok(diet.data.metrics.totalCalories > 0);
  const e = runOk(dir, 'calorie.view.exercise', { start: d(6), end: d(7) });
  assert.equal(e.data.metrics.totalBurned, 620);
  const g = runOk(dir, 'calorie.view.goal', { start: d(5), end: d(7) });
  assert.equal(g.data.metrics.calorie_goal, 1800);
  const t = runOk(dir, 'calorie.today', { date: d(7) });
  assert.equal(t.shape, 'list');
  assert.ok(t.data.total >= 4);
  const p = join(dir, 'home.html');
  const r = spawnSync(NODE_BIN, [BIN, 'calorie.view.home', '--params', JSON.stringify({ date: d(7) }), '--html', p], { encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir } });
  assert.equal(r.status, 0);
  const html = readFileSync(p, 'utf8');
  // #492：标题按窗口词口径（多日窗「近 N 天总览」），日期区间改住副题——两处都断言，
  // 不用 includes('总览') 这类恒真判据（否则标题接不接窗口词都绿）。
  assert.ok(html.includes('近 7 天总览'), 'HTML 快照须带窗口词标题（默认窗 7 天 → 近 7 天总览）');
  assert.equal(html.includes('今日总览 ' + d(7)), false, '标题不再拼日期（区间归副题）');
  assert.ok(html.includes(d(1) + ' 至 ' + d(7)), '日期区间须住副题');
  assert.match(html, /ilife-page/);
});

test('T9 目标分析盘 parity：12 键抽查 stat + 缺失阻断', () => {
  const dir = mkEnv();
  const cfg = runOk(dir, 'calorie.view.goal-config');
  assert.equal(cfg.data.metrics.calorie_goal, 1800);
  const rec = runOk(dir, 'calorie.view.goal-recommend', { profile: 'cut' });
  assert.ok(rec.data.metrics.calorieGoal > 0);
  const w = runOk(dir, 'calorie.view.goal-weight', { start: d(1), end: d(7) });
  assert.equal(w.data.metrics.latestKg, 70);
  const pr = runOk(dir, 'calorie.view.goal-progress', { start: d(5), end: d(7) });
  assert.ok(typeof pr.data.metrics.completionPct === 'number' || pr.data.metrics.completionPct === undefined);
  const st = runOk(dir, 'calorie.view.goal-status');
  assert.equal(st.data.metrics.paused, 0);
  const cb = runOk(dir, 'calorie.view.combined', { pair: 'weight_calorie', window: '7d' }, CLOCK);
  assert.ok(typeof cb.data.metrics.aCount === 'number');
  const df = runOk(dir, 'calorie.view.deficit', { start: d(5), end: d(7) });
  assert.ok(typeof df.data.metrics.avgDeficit === 'number');
  const rv = runOk(dir, 'calorie.view.diet-review', { start: d(5), end: d(7) });
  assert.ok(rv.data.metrics.loggedDays >= 2);
  const hl = runOk(dir, 'calorie.view.health', { start: d(5), end: d(7) });
  assert.ok(hl.data.metrics.loggedDays >= 2);
  const rk = runOk(dir, 'calorie.view.ranking', { start: d(5), end: d(7) });
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
    ['calorie.view.deficit', { start: d(5), end: d(7) }],
    ['calorie.view.goal-recommend', { profile: 'cut' }],
    ['calorie.photo.gif', { tag: '正面' }],
  ]) {
    const r = run(BIN, k, p, { SKILLS_DB_PATH: emptyDir });
    assert.equal(r.status, 4, k + ' 空库未阻断');
    assert.equal(r.stdout, '', k + ' 空库 stdout 非空');
    assert.match(r.stderr, /缺失|取数/, k + ' 空库 stderr 无阻断文案');
  }
});

test('T10 照片 parity：画廊/单图/对比/动图/HELP + 只内嵌图片', async () => {
  const dir = mkEnv();
  const { photosDir, src } = seedPhotos(dbOpen(dir));
  function dbOpen(d) { return openDb(join(d, 'calorie_data.db')); }
  const { addPhotos } = await import('../dist/photo/photos.js');
  const db = dbOpen(dir);
  const added = addPhotos(db, photosDir, { srcPaths: [src('a.jpg'), src('b.jpg')], tag: '正面', today: d(6), nowTime: '08:00:00' });
  db.close();
  assert.equal(added.length, 2);
  const envExtra = { SKILLS_DB_PATH: dir, CALORIE_PHOTOS_DIR: photosDir, ...CLOCK };
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
  const p = join(dir, 'gallery.html');
  const r = run(BIN, 'calorie.photo.list', { tag: '正面' }, envExtra, p);
  assert.equal(r.status, 0);
  const html = readFileSync(p, 'utf8');
  assert.match(html, /看身材照/);
  /* #439 · 内嵌口径已改，旧断言作废：看身材照页按 #341（老技能已核准决定 D1）内嵌照片，
   * 字节形如 `data:image/…;base64,`，故 T10 时代的「整页不含 base64」与之互斥——该断言
   * 在 HEAD 上即红（页面已由 `viewPhotoList` 传目录进整页装配），非本票回归。
   * 这里保留原用意的**牙齿**，只把口径收窄成「只许内嵌图片」：
   *   ① 页面必须真内嵌了照片（缺 `data:image/…` 即红，防「退让成不嵌」）；
   *   ② 页面里除图片外不许出现别的二进制 `data:` URI（夹带 `data:application/…` 即红）。 */
  const dataUris = [...html.matchAll(/data:([^;,)"'\s]*)/gi)].map((m) => m[1].toLowerCase());
  assert.ok(dataUris.some((m) => m.startsWith('image/')), '画廊页应内嵌照片，缺 data:image/…');
  assert.deepEqual(dataUris.filter((m) => !m.startsWith('image/')), [], '页面只许内嵌图片，发现非图片 data URI');
});

test('T2+T6 parity：唤醒词 HELP 现找 + 热量历史 + CLI 契约', () => {
  const dir = mkEnv();
  assert.ok(TRIGGERS.length >= 436);
  const h = runOk(dir, 'calorie.help.lookup', { q: '看今日主页' });
  assert.ok(h.data.total >= 1);
  assert.ok(String(h.data.items[0].wake_word).includes('看今日主页'));
  // 钉住时钟（见文件头 CLOCK_ANCHOR）：断言与窗口跨度**一字不改**，
  // 只把「当刻」钉到种子锚，使 `calorie.history` 的「最近 N 天」不再随真实日期漂移。
  const hist = runOk(dir, 'calorie.history', { days: 7 }, CLOCK);
  assert.ok(hist.data.total >= 2);
  // `days` 参数确有效：同一当刻下更小窗口的结果严格更小（只剩锚当日一条），非「只要不抛错」。
  const narrow = runOk(dir, 'calorie.history', { days: 1 }, CLOCK);
  assert.ok(narrow.data.total < hist.data.total, 'days 参数须实际收窄窗口');
  assert.equal(run(BIN, 'calorie.help.lookup', {}, { SKILLS_DB_PATH: dir }).status, 2);
  assert.equal(run(BIN, 'calorie.nope', undefined, { SKILLS_DB_PATH: dir }).status, 3);
  assert.equal(run(BIN, 'calorie.view.home', undefined, { SKILLS_DB_PATH: '' }).status, 1);
  assert.equal(run(BIN, undefined, undefined, { SKILLS_DB_PATH: dir }).status, 2);
  const bad = run(BIN, 'calorie.view.home', '--params', { SKILLS_DB_PATH: dir });
  assert.notEqual(bad.status, 0);
});
