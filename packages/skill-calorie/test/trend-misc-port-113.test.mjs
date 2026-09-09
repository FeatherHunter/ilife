/** #113 趋势 2＋其他 6 移植 8 键：唤醒词命中＋HTML 移植＋无假数据＋命名底座可用。
 * 范围（t71「需移植」趋势 2＋其他 6，#111 6＋#112 4＝10 已关，本票 8 闭合 18）：
 * calorie.view.batch-import-preview／view.calorie-trend／view.lint-health／
 * view.long-trend／view.nutrition-analysis／view.process-progress／
 * view.review-template／view.six-factors。
 * 不碰：47 页已有（#108–#112 已关）／运动 6（#111）／营养 4（#112）。
 * 运行：先 pnpm --filter skill-calorie build，再 node --test packages/skill-calorie/test/trend-misc-port-113.test.mjs
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { dispatch } from '../dist/cli/cmd_read.js';
import { CALORIE_COMBOS, ENVELOPE_VERSION, CALORIE_SKILL } from '../dist/cli/keys.js';
import { routesFor } from '../dist/triggers/routing.js';

/** 全量 436 路由查词（#81 SoT）：取首个 exec 项。 */
function execRoute(word) {
  const hits = routesFor(word).filter((r) => r.kind === 'exec');
  return hits.length > 0 ? hits[0] : null;
}

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';

function seedPort(db) {
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal, goal_deadline, exercise_goal) VALUES (1, 1800, 150, 200, 50, 2000, 65, \'2026-10-01\', 300)').run();
  db.prepare("INSERT INTO nutrition_products (product_name, brand, calories, protein, fat, carbohydrates, sugar, dietary_fiber, sodium, category, source) VALUES ('米饭', '测试', 130, 2.7, 0.3, 28, 0.3, 1.2, 2, '主食', '自建')").run();
  db.prepare("INSERT INTO nutrition_products (product_name, brand, calories, protein, fat, carbohydrates, sugar, dietary_fiber, sodium, category, source) VALUES ('牛奶', '测试', 60, 3.2, 3.2, 4.8, 5, 0, 50, '饮品', '自建')").run();
  // date, time, name, grams, cal, protein, carbs, fat, fiber_g, sodium_mg, sugar_g
  const meals = [
    ['2026-09-05', '08:00:00', '米饭', 200, 260, 5.5, 56, 0.5, 1.0, 3, 0.5],
    ['2026-09-05', '12:30:00', '牛奶', 250, 150, 8, 12, 8, 0, 120, 12],
    ['2026-09-06', '12:00:00', '米饭', 200, 260, 5.5, 56, 0.5, 1.0, 3, 0.5],
    ['2026-09-06', '15:00:00', '未知餐', 100, 100, 1, 20, 2, 0.2, 200, 8],
    ['2026-09-06', '18:00:00', '米饭团', 100, 100, 1, 20, 2, 0.3, 150, 2],
    ['2026-09-07', '12:00:00', '米饭', 200, 500, 10, 80, 5, 1.0, 3, 0.5],
  ];
  for (const [d, t, name, g, cal, p, cb, f, fiber, na, sugar] of meals) {
    db.prepare('INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat, fiber_g, sodium_mg, sugar_g) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(d, t, name, g, cal, p, cb, f, fiber, na, sugar);
  }
  for (const [d, t, ml] of [
    ['2026-09-06', '08:00:00', 1000],
    ['2026-09-07', '08:00:00', 800],
  ]) {
    db.prepare("INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES (?, ?, '💧水', ?, 0, 0, 0, 0)").run(d, t, ml);
  }
  for (const [d, w] of [['2026-09-05', 75.0], ['2026-09-07', 74.6]]) {
    db.prepare('INSERT INTO weight_log (date, time, weight_kg, height_cm, bmi) VALUES (?, ?, ?, 175, 22.9)').run(d, '07:00:00', w);
  }
  db.prepare("INSERT INTO exercise_log (date, time, exercise_type, duration_minutes, calories_burned, category) VALUES ('2026-09-06', '07:00:00', '慢跑', 30, 320, '有氧')").run();
  db.prepare("INSERT OR REPLACE INTO workout_plan_config (id, title, version, description, total_weeks, start_date) VALUES (1, 't113计划', 'v1', 'desc', 4, '2026-09-01')").run();
  db.prepare("INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label, movements) VALUES (1, 1, 1, '上肢', '[]')").run();
  db.prepare("INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label, movements) VALUES (1, 3, 1, '下肢', '[]')").run();
}

function mkPortDb() {
  const dir = mkdtempSync(join(tmpdir(), 't113-'));
  const db = openDb(join(dir, DB_FILENAME));
  seedPort(db);
  return { dir, db };
}

function run(bin, key, params, envExtra) {
  const a = params === undefined ? [key] : [key, '--params', JSON.stringify(params)];
  return spawnSync(NODE_BIN, [bin, ...a], { encoding: 'utf8', env: { ...process.env, ...(envExtra || {}) } });
}

function assertDoc(h, what) {
  assert.ok(h.startsWith('<!doctype html>'), what + ' 缺 doctype');
  assert.ok(!h.includes('<!--'), what + ' 有残留标记');
  assert.ok(h.includes('ilife-page'), what + ' 缺 page');
  assert.ok(h.includes('<style>'), what + ' 缺 style');
  assert.ok(h.includes('<script>'), what + ' 缺 helpers');
}

const WIN = { start: '2026-09-05', end: '2026-09-07' };

test('#113 域内唤醒词命中：12 词→趋势其他 8 键（促进 4＋新拟 8）', () => {
  const pairs = [
    ['看钠糖纤维趋势', 'calorie.view.nutrition-analysis'],
    ['看钠糖纤维综合', 'calorie.view.nutrition-analysis'],
    ['看每日 6 因素综合', 'calorie.view.six-factors'],
    ['查卡路里数据', 'calorie.view.lint-health'],
    ['看批量导入预览', 'calorie.view.batch-import-preview'],
    ['看热量趋势', 'calorie.view.calorie-trend'],
    ['查数据健康', 'calorie.view.lint-health'],
    ['看整体趋势', 'calorie.view.long-trend'],
    ['看营养分析', 'calorie.view.nutrition-analysis'],
    ['看落地训练进度', 'calorie.view.process-progress'],
    ['看复盘报告', 'calorie.view.review-template'],
    ['看每日六因素', 'calorie.view.six-factors'],
  ];
  for (const [word, key] of pairs) {
    const hit = execRoute(word);
    assert.ok(hit, '唤醒词未命中：' + word);
    assert.equal(hit.key, key, '唤醒词错键：' + word);
    assert.ok(String(hit.cli).startsWith('calorie-cmd-read ' + key), '唤醒词 cli 不同步：' + word);
    assert.ok(CALORIE_COMBOS[key], '键未登记：' + key);
  }
});

test('#113 热量趋势：T7 口径日均＋达标统计', () => {
  const { db } = mkPortDb();
  try {
    const out = dispatch('calorie.view.calorie-trend', WIN, db);
    assert.ok(out.data.metrics.avg > 0, '日均应>0');
    assert.equal(out.data.metrics.target, 1800);
    assert.ok(out.html.includes('热量趋势'), 'trend 缺标题');
    assert.ok(out.html.includes('达标'), 'trend 缺达标统计');
    assertDoc(out.html, 'calorie-trend 落盘');
  } finally {
    db.close();
  }
});

test('#113 整体趋势：30 天窗体重变化 −0.4kg', () => {
  const { db } = mkPortDb();
  try {
    const out = dispatch('calorie.view.long-trend', { group: 'weight_calorie', window: '30d' }, db);
    assert.equal(out.data.metrics.weightChange, -0.4);
    assert.equal(out.data.metrics.windowDays, 30);
    assert.ok(out.html.includes('体重轨迹'), 'long 缺体重轨迹');
    assertDoc(out.html, 'long-trend 落盘');
  } finally {
    db.close();
  }
});

test('#113 营养分析：配比＋微量＋规则建议', () => {
  const { db } = mkPortDb();
  try {
    const out = dispatch('calorie.view.nutrition-analysis', { start: '2026-09-05', end: '2026-09-06' }, db);
    assert.equal(out.data.metrics.days, 2);
    assert.equal(out.data.metrics.totalCalorie, 870);
    assert.ok(out.data.metrics.adviceCount >= 1, '建议不应为空');
    assert.ok(out.html.includes('分析建议'), 'analysis 缺建议区');
    assertDoc(out.html, 'nutrition-analysis 落盘');
  } finally {
    db.close();
  }
});

test('#113 每日六因素：09-06 得 3 分（热量/运动/三餐达标）', () => {
  const { db } = mkPortDb();
  try {
    const out = dispatch('calorie.view.six-factors', { date: '2026-09-06' }, db);
    assert.equal(out.data.metrics.score, 3);
    assert.equal(out.data.metrics.calorie, 1);
    assert.equal(out.data.metrics.protein, 0);
    assert.equal(out.data.metrics.exercise, 1);
    assert.ok(out.html.includes('3/6'), 'six 缺得分');
    assertDoc(out.html, 'six-factors 落盘');
  } finally {
    db.close();
  }
});

test('#113 数据健康检查：未匹配 2 种（未知餐/米饭团），余项为零', () => {
  const { db } = mkPortDb();
  try {
    const out = dispatch('calorie.view.lint-health', {}, db);
    assert.equal(out.data.metrics.issueCount, 2);
    assert.equal(out.data.metrics.unmatched, 2);
    assert.equal(out.data.metrics.badCalorie, 0);
    assert.equal(out.data.metrics.future, 0);
    assert.equal(out.data.metrics.duplicate, 0);
    assert.ok(out.html.includes('未知餐'), 'lint 缺未匹配明细');
    assertDoc(out.html, 'lint-health 落盘');
  } finally {
    db.close();
  }
});

test('#113 批量导入预览：2 条（匹配 1/缺库 1），只预览不写库', () => {
  const { db } = mkPortDb();
  try {
    const before = db.prepare('SELECT COUNT(*) AS n FROM food_log').get().n;
    const out = dispatch('calorie.view.batch-import-preview', { items: [{ foodName: '米饭', calories: 130 }, { foodName: '包子', calories: 300 }] }, db);
    assert.equal(out.data.metrics.total, 2);
    assert.equal(out.data.metrics.matched, 1);
    assert.equal(out.data.metrics.missing, 1);
    assert.equal(out.data.metrics.totalCalorie, 430);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM food_log').get().n, before, '预览不得写库');
    assert.ok(out.html.includes('包子'), 'preview 缺缺库明细');
    assertDoc(out.html, 'batch-import-preview 落盘');
  } finally {
    db.close();
  }
});

test('#113 落地训练进度：有计划＋近 7 天 1 次 30 分钟', () => {
  const { db } = mkPortDb();
  try {
    const out = dispatch('calorie.view.process-progress', {}, db);
    assert.equal(out.data.metrics.hasPlan, 1);
    assert.equal(out.data.metrics.plannedDays, 2);
    assert.equal(out.data.metrics.sessions7d, 1);
    assert.equal(out.data.metrics.minutes7d, 30);
    assert.ok(out.html.includes('t113计划'), 'process 缺计划标题');
    assertDoc(out.html, 'process-progress 落盘');
  } finally {
    db.close();
  }
});

test('#113 复盘报告：3 天 6 餐＋体重 −0.4kg＋要点', () => {
  const { db } = mkPortDb();
  try {
    const out = dispatch('calorie.view.review-template', WIN, db);
    assert.equal(out.data.metrics.days, 3);
    assert.equal(out.data.metrics.meals, 6);
    assert.equal(out.data.metrics.weightChange, -0.4);
    assert.ok(out.data.metrics.points >= 2, '要点不应少于 2 条');
    assert.ok(out.html.includes('复盘要点'), 'review 缺要点区');
    assertDoc(out.html, 'review-template 落盘');
  } finally {
    db.close();
  }
});

test('#113 无假数据：6 键空库一律 exit 4 且 stdout 纯净；lint/batch 空库 exit 0', () => {
  const dir = mkdtempSync(join(tmpdir(), 't113-empty-'));
  openDb(join(dir, DB_FILENAME)).close();
  const missing = [
    ['calorie.view.calorie-trend', WIN],
    ['calorie.view.long-trend', { group: 'weight_calorie', window: '30d' }],
    ['calorie.view.nutrition-analysis', WIN],
    ['calorie.view.six-factors', { date: '2026-09-07' }],
    ['calorie.view.process-progress', {}],
    ['calorie.view.review-template', WIN],
  ];
  for (const [k, p] of missing) {
    const r = run(BIN, k, p, { SKILLS_DB_PATH: dir });
    assert.equal(r.status, 4, k + ' 空库未阻断（status=' + r.status + ' stderr=' + (r.stderr || '').slice(0, 200) + '）');
    assert.equal(r.stdout, '', k + ' 空库 stdout 非空');
    assert.match(r.stderr, /缺失|取数/, k + ' 空库 stderr 无阻断文案');
  }
  const r1 = run(BIN, 'calorie.view.lint-health', {}, { SKILLS_DB_PATH: dir });
  assert.equal(r1.status, 0, 'lint 空库应 exit 0：' + (r1.stderr || '').slice(0, 200));
  const r2 = run(BIN, 'calorie.view.batch-import-preview', { items: [{ foodName: '米饭', calories: 130 }] }, { SKILLS_DB_PATH: dir });
  assert.equal(r2.status, 0, 'preview 空库应 exit 0：' + (r2.stderr || '').slice(0, 200));
});

test('#113 非法输入：window/group/items/date 非法即 exit 2', () => {
  const { dir } = mkPortDb();
  const bad = [
    ['calorie.view.long-trend', { window: 'abc' }],
    ['calorie.view.long-trend', { group: 'g9', window: '30d' }],
    ['calorie.view.batch-import-preview', { items: [] }],
    ['calorie.view.batch-import-preview', {}],
    ['calorie.view.six-factors', { date: '昨天' }],
    ['calorie.view.nutrition-analysis', { start: '2026-09-06', end: '2026-09-05' }],
  ];
  for (const [k, p] of bad) {
    const r = run(BIN, k, p, { SKILLS_DB_PATH: dir });
    assert.equal(r.status, 2, k + ' 非法输入未拒收（status=' + r.status + '）');
  }
});

test('#113 命名底座可用：热量趋势落盘＋回传一致＋产物为全文档', () => {
  const { dir } = mkPortDb();
  const r = run(BIN, 'calorie.view.calorie-trend', WIN, { SKILLS_DB_PATH: dir });
  assert.equal(r.status, 0, 'stderr=' + (r.stderr || '').slice(0, 300));
  const env = JSON.parse(r.stdout);
  const n = basename(env.data.output);
  assert.match(n, /^热量趋势_.+\.html$/, '实际落点：' + n);
  assert.ok(existsSync(env.data.output), '回传路径必须真实存在');
  assertDoc(readFileSync(env.data.output, 'utf8'), 'trend 落盘');
});

test('#113 复制头与冻结 envelope 版本对齐（防漂移）', () => {
  assert.equal(ENVELOPE_VERSION, '0.1.0');
  assert.equal(CALORIE_SKILL, 'calorie');
  const { db } = mkPortDb();
  try {
    const out = dispatch('calorie.view.lint-health', {}, db);
    assert.ok(out.html.includes('【calorie · calorie.view.lint-health】'), '复制头与 envelope key 不一致');
  } finally {
    db.close();
  }
});
