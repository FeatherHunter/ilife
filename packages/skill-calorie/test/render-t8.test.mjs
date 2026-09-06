/** T8 #27 · 主视图四块渲染测试：tmp 隔离，真实 DB 零触碰。
 * 验收：四主视图 HTML 快照（总览/饮食/运动/目标分析）+ 三条死规矩：
 * 1）餐别窗口跟 diet.ts MEAL_WINDOWS；2）T4 缺 payload key 本票补；3）数列用 T5 series。
 */
import { strict as assert } from 'node:assert';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { MEAL_WINDOWS } from '../dist/fetch/diet.js';
import { buildSeries, seriesSum } from '../dist/analysis/series.js';
import { KEYS } from '../dist/fetch/shapes.js';
import {
  buildHomeData, buildDietOverview, buildMealDistribution,
  buildExerciseView, buildGoalView,
  renderHomeHtml, renderDietHtml, renderExerciseHtml, renderGoalHtml,
  VIEW_KEYS, viewShapeFor, CalorieRenderError,
} from '../dist/render/index.js';

const tmpDb = () => openDb(join(mkdtempSync(join(tmpdir(), 't27-')), 't.db'));

function seedFull(db) {
  db.prepare('INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, \'male\', 175, \'moderate\')').run();
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal) VALUES (1, 1800, 150, 200, 50, 2000, 70)').run();
  const meals = [
    ['2026-09-05', '08:00:00', '粥', 300, 150, 3, 30, 2],
    ['2026-09-05', '12:30:00', '米饭', 200, 500, 10, 80, 5],
    ['2026-09-05', '15:30:00', '酸奶', 100, 80, 5, 10, 2],
    ['2026-09-05', '19:00:00', '面条', 200, 600, 15, 90, 8],
    ['2026-09-06', '08:00:00', '包子', 150, 300, 8, 50, 5],
    ['2026-09-06', '12:00:00', '米饭', 200, 550, 12, 85, 6],
    ['2026-09-06', '19:30:00', '饺子', 200, 650, 18, 70, 15],
    ['2026-09-07', '08:10:00', '燕麦', 100, 389, 13, 66, 7],
    ['2026-09-07', '12:10:00', '鸡胸', 150, 200, 35, 2, 4],
    ['2026-09-07', '15:00:00', '苹果', 200, 100, 1, 25, 0],
    ['2026-09-07', '19:10:00', '米饭', 200, 500, 10, 90, 5],
    ['2026-09-07', '23:30:00', '牛奶', 250, 150, 8, 12, 8],
  ];
  for (const [d, t, name, g, cal, p, cb, f] of meals) {
    db.prepare('INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(d, t, name, g, cal, p, cb, f);
  }
  db.prepare("INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES ('2026-09-07', '09:00:00', '💧水', 500, 0, 0, 0, 0)").run();
  db.prepare("INSERT INTO exercise_log (date, time, exercise_type, duration_minutes, calories_burned, category) VALUES ('2026-09-06', '07:00:00', '户外跑', 30, 300, '有氧')").run();
  db.prepare("INSERT INTO exercise_log (date, time, exercise_type, duration_minutes, calories_burned, category) VALUES ('2026-09-07', '07:00:00', '慢跑', 30, 320, '有氧')").run();
  const ws = [71.0, 70.8, 70.6, 70.5, 70.3, 70.1, 70.0];
  ws.forEach((w, i) => {
    const d = '2026-09-0' + (i + 1);
    db.prepare('INSERT INTO weight_log (date, time, weight_kg, height_cm, bmi) VALUES (?, ?, ?, 175, 22.9)').run(d, '07:00:00', w);
  });
}

test('T4 缺 key 本票补：9 键命名空间 calorie.*', () => {
  for (const k of ['goalStatus', 'goalHistory', 'nutritionGoal', 'nutritionRecommend', 'planDetail', 'planList', 'productList', 'productDetail', 'photoList']) {
    assert.ok(KEYS[k], '缺 key: ' + k);
    assert.ok(KEYS[k].startsWith('calorie.'), KEYS[k]);
  }
  assert.equal(KEYS.nutritionGoal, 'calorie.nutrition_goal');
  assert.equal(KEYS.goalHistory, 'calorie.goal_history');
});

test('视图 key 表：四视图 stat 形状', () => {
  assert.equal(VIEW_KEYS.home, 'calorie.view_home');
  assert.equal(VIEW_KEYS.diet, 'calorie.view_diet');
  assert.equal(VIEW_KEYS.exercise, 'calorie.view_exercise');
  assert.equal(VIEW_KEYS.goal, 'calorie.view_goal');
  assert.equal(viewShapeFor(VIEW_KEYS.home), 'stat');
  assert.throws(() => viewShapeFor('calorie.unknown'), /未知视图/);
});

test('总览：今日 KPI + 周数列 + 缺口 + HTML 快照', () => {
  const db = tmpDb();
  seedFull(db);
  const h = buildHomeData(db, '2026-09-07');
  assert.equal(h.date, '2026-09-07');
  assert.equal(h.daily.totals.cal, 389 + 200 + 100 + 500 + 150);
  assert.equal(h.calorieGoal, 1800);
  assert.ok(typeof h.deficitToday === 'number');
  assert.equal(h.week.series.length, 7);
  assert.ok(h.streakDays >= 3);
  const html = renderHomeHtml(h);
  assert.match(html, /今日总览 2026-09-07/);
  assert.match(html, /ilife-page/);
  assert.match(html, /data-slot="ilife:calorie"/);
  assert.match(html, /今日摄入/);
  assert.match(html, /连续记录/);
  // 风格 tokens：bg/fg 同时出现，证明只引 tokens
  assert.match(html, /#16181d/);
  assert.match(html, /#e6edf3/);
  db.close();
});

test('饮食：总览数列=series 和 + 餐别窗口跟 MEAL_WINDOWS + HTML 快照', () => {
  const db = tmpDb();
  seedFull(db);
  assert.ok(MEAL_WINDOWS['早餐'] && MEAL_WINDOWS['加餐']);
  const o = buildDietOverview(db, '2026-09-05', '2026-09-07');
  const s = buildSeries(db, '2026-09-05', '2026-09-07');
  assert.equal(o.totalCalories, seriesSum(s, 'calories'));
  assert.equal(o.loggedDays, 3);
  const dist = buildMealDistribution(db, '2026-09-07');
  // 15:00 苹果 + 23:30 牛奶必须进加餐（老家旧口径作废：15 点不再算午餐）
  const snack = dist.slices.find((x) => x.meal === '加餐');
  assert.equal(snack.count, 2);
  assert.equal(snack.calories, 250);
  assert.equal(dist.slices.find((x) => x.meal === '早餐').count, 1);
  assert.equal(dist.slices.find((x) => x.meal === '午餐').count, 1);
  assert.equal(dist.slices.find((x) => x.meal === '晚餐').count, 1);
  const pctSum = dist.slices.reduce((a, x) => a + x.pct, 0);
  assert.ok(Math.abs(pctSum - 100) < 0.05, 'pct 求和 ' + pctSum);
  // 水行不计入分布
  assert.equal(dist.totalCalories, 389 + 200 + 100 + 500 + 150);
  const html = renderDietHtml(o, dist);
  assert.match(html, /饮食总览/);
  assert.match(html, /餐别分布/);
  assert.match(html, /MEAL_WINDOWS/);
  assert.match(html, /加餐=下午茶\+夜宵/);
  db.close();
});

test('运动：T7 复核 + T5 数列 + HTML 快照', () => {
  const db = tmpDb();
  seedFull(db);
  const v = buildExerciseView(db, '2026-09-06', '2026-09-07');
  assert.equal(v.review.totalBurned, 620);
  assert.equal(v.review.sessions, 2);
  assert.equal(v.totalBurnedSeries, 620);
  assert.equal(v.activeDays, 2);
  const html = renderExerciseHtml(v);
  assert.match(html, /运动 2026-09-06 ~ 2026-09-07/);
  assert.match(html, /总消耗/);
  assert.match(html, /ilife-page/);
  db.close();
});

test('目标分析：T4 目标 + T7 缺口趋势 + HTML 快照', () => {
  const db = tmpDb();
  seedFull(db);
  const v = buildGoalView(db, '2026-09-05', '2026-09-07');
  assert.equal(v.nutrition.calorie_goal, 1800);
  assert.ok(v.history.goalHistory.length > 0);
  assert.ok(typeof v.deficit.summary.avgDeficit === 'number');
  assert.ok(typeof v.trend.summary.avg === 'number');
  const html = renderGoalHtml(v);
  assert.match(html, /目标分析/);
  assert.match(html, /热量目标/);
  assert.match(html, /周缺口/);
  db.close();
});

test('缺失阻断：空库四视图一律 missing-data 不返空', () => {
  const db = tmpDb();
  assert.throws(() => buildHomeData(db, '2026-09-07'), (e) => e instanceof CalorieRenderError && e.code === 'missing-data');
  assert.throws(() => buildDietOverview(db, '2026-09-05', '2026-09-07'), /无饮食记录/);
  assert.throws(() => buildMealDistribution(db, '2026-09-07'), /无饮食记录/);
  assert.throws(() => buildExerciseView(db, '2026-09-06', '2026-09-07'), (e) => e instanceof CalorieRenderError && e.code === 'missing-data');
  assert.throws(() => buildGoalView(db, '2026-09-05', '2026-09-07'), (e) => e instanceof CalorieRenderError && e.code === 'missing-data');
  assert.throws(() => buildDietOverview(db, '2026-09-07', '2026-09-05'), /start/);
  db.close();
});
