/** T9 #28 · 目标分析盘渲染测试：tmp 隔离，真实 DB 零触碰。
 * 验收：目标五盘/组合分析/缺口复盘/健康盘/排行/食品库搜索 HTML 快照 + 三条死规矩：
 * 1）餐别窗口跟 diet.ts MEAL_WINDOWS（inferMealType 同源）；2）T4 五域 payload key 本票补；
 * 3）数列用 T5 series（buildSeries/resolveWindow，不自造）。
 */
import { strict as assert } from 'node:assert';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { MEAL_WINDOWS, inferMealType } from '../dist/fetch/diet.js';
import { buildSeries } from '../dist/analysis/series.js';
import { KEYS } from '../dist/fetch/shapes.js';
import {
  buildGoalConfig, buildGoalRecommend, buildGoalWeight, buildGoalProgress, buildGoalStatus,
  buildCombinedAnalysis, buildDeficitPlate, buildDietReview,
  buildHealthPlate, buildFoodRankingPlate, buildAllRankings,
  buildProductSearch, buildProductLibrary, buildProductStats,
  renderGoalConfigHtml, renderGoalRecommendHtml, renderGoalWeightHtml, renderGoalProgressHtml, renderGoalStatusHtml,
  renderCombinedHtml, renderDeficitHtml, renderDietReviewHtml, renderHealthHtml,
  renderRankingHtml, renderAllRankingsHtml, renderProductSearchHtml, renderProductLibraryHtml, renderProductStatsHtml,
  VIEW_KEYS, viewShapeFor, CalorieRenderError,
} from '../dist/render/index.js';

const tmpDb = () => openDb(join(mkdtempSync(join(tmpdir(), 't28-')), 't.db'));

function seedFull(db) {
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, 'male', 175, 'moderate')").run();
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal, goal_deadline) VALUES (1, 1800, 150, 200, 50, 2000, 68.0, \'2026-12-31\')').run();
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
  db.prepare("INSERT INTO nutrition_products (product_name, brand, calories, protein, fat, carbohydrates, sodium, category, source) VALUES ('鸡胸肉', '测试', 165, 31, 3.6, 0, 70, '蛋白类', '测试')").run();
  db.prepare("INSERT INTO nutrition_products (product_name, brand, calories, protein, fat, carbohydrates, sodium, category, source) VALUES ('米饭', '测试', 130, 2.7, 0.3, 28, 1, '主食', '测试')").run();
  db.prepare("INSERT INTO nutrition_products (product_name, brand, calories, protein, fat, carbohydrates, sodium, category, source) VALUES ('可乐', '测试', 43, 0, 0, 10.6, 5, '饮料', '测试')").run();
}

test('T4 五域 key 本票补：9 键命名空间 calorie.*', () => {
  for (const k of ['goalStatus', 'goalHistory', 'nutritionGoal', 'nutritionRecommend', 'planDetail', 'planList', 'productList', 'productDetail', 'photoList']) {
    assert.ok(KEYS[k], '缺 key: ' + k);
    assert.ok(KEYS[k].startsWith('calorie.'), KEYS[k]);
  }
  assert.equal(KEYS.nutritionGoal, 'calorie.nutrition_goal');
  assert.equal(KEYS.goalHistory, 'calorie.goal_history');
  assert.equal(KEYS.productList, 'calorie.product_list');
});

test('视图 key 表：十二盘 stat 形状', () => {
  assert.equal(VIEW_KEYS.goalConfig, 'calorie.view_goal_config');
  assert.equal(VIEW_KEYS.goalProgress, 'calorie.view_goal_progress');
  assert.equal(VIEW_KEYS.combined, 'calorie.view_combined');
  assert.equal(VIEW_KEYS.deficit, 'calorie.view_deficit');
  assert.equal(VIEW_KEYS.health, 'calorie.view_health');
  assert.equal(VIEW_KEYS.ranking, 'calorie.view_ranking');
  assert.equal(VIEW_KEYS.library, 'calorie.view_library');
  assert.equal(VIEW_KEYS.search, 'calorie.view_search');
  for (const k of Object.values(VIEW_KEYS)) assert.equal(viewShapeFor(k), 'stat');
  assert.throws(() => viewShapeFor('calorie.unknown'), /未知视图/);
});

test('死规矩：餐别窗口跟 diet.ts（15 点=下午茶，老家旧口径作废）', () => {
  for (const k of ['早餐', '午餐', '下午茶', '晚餐', '夜宵', '加餐']) assert.ok(MEAL_WINDOWS[k], '缺餐别 ' + k);
  assert.equal(inferMealType('15:00:00'), '下午茶');
  assert.equal(inferMealType('23:30:00'), '夜宵');
  assert.equal(inferMealType('08:10:00'), '早餐');
});

test('目标五盘 + HTML 快照', () => {
  const db = tmpDb();
  seedFull(db);
  const cfg = buildGoalConfig(db);
  assert.equal(cfg.nutrition.calorie_goal, 1800);
  assert.equal(cfg.paused, false);
  assert.ok(typeof cfg.diffKcal === 'number');
  let html = renderGoalConfigHtml(cfg);
  assert.match(html, /目标配置/);
  assert.match(html, /ilife-page/);
  assert.match(html, /data-slot="ilife:calorie:goal-config"/);
  assert.match(html, /#16181d/);
  const rec = buildGoalRecommend(db, 'cut');
  assert.equal(rec.profile, 'cut');
  assert.ok(rec.recommend.calorieGoal > 0);
  html = renderGoalRecommendHtml(rec);
  assert.match(html, /目标推荐/);
  assert.match(html, /ilife:calorie:goal-recommend/);
  const w = buildGoalWeight(db, '2026-09-01', '2026-09-07');
  assert.equal(w.weightGoal, 68.0);
  assert.equal(w.latestKg, 70.0);
  assert.ok(typeof w.deltaKg === 'number' && w.deltaKg < 0);
  html = renderGoalWeightHtml(w);
  assert.match(html, /体重目标/);
  const p = buildGoalProgress(db, '2026-09-05', '2026-09-07');
  assert.equal(p.nutrition.calorie_goal, 1800);
  assert.ok(p.history.goalHistory.length > 0);
  assert.ok(typeof p.deficit.summary.avgDeficit === 'number');
  html = renderGoalProgressHtml(p);
  assert.match(html, /目标进度/);
  assert.match(html, /目标完成率/);
  const st = buildGoalStatus(db);
  assert.equal(st.paused, false);
  html = renderGoalStatusHtml(st);
  assert.match(html, /目标状态/);
  assert.match(html, /#e6edf3/);
  db.close();
});

test('组合分析：T5 series 源 + pair 相关 + HTML 快照', () => {
  const db = tmpDb();
  seedFull(db);
  const c = buildCombinedAnalysis(db, 'weight_calorie', '7d', null, null, '2026-09-07');
  assert.equal(c.pair, 'weight_calorie');
  assert.equal(c.start, '2026-09-01');
  assert.equal(c.end, '2026-09-07');
  assert.equal(c.series.length, 7);
  const s = buildSeries(db, c.start, c.end);
  assert.deepEqual(c.series.map((x) => x.date), s.map((x) => x.date));
  assert.ok(c.analysis.aCount > 0 && c.analysis.bCount > 0);
  const html = renderCombinedHtml(c);
  assert.match(html, /组合分析 weight_calorie/);
  assert.match(html, /相关系数/);
  assert.match(html, /ilife-page/);
  assert.throws(() => buildCombinedAnalysis(db, 'nope', '7d', null, null, '2026-09-07'), /未知配对/);
  db.close();
});

test('缺口复盘健康三盘 + HTML 快照', () => {
  const db = tmpDb();
  seedFull(db);
  const d = buildDeficitPlate(db, '2026-09-05', '2026-09-07');
  assert.ok(typeof d.summary.avgDeficit === 'number');
  let html = renderDeficitHtml(d);
  assert.match(html, /缺口/);
  assert.match(html, /ilife:calorie:deficit/);
  const r = buildDietReview(db, '2026-09-05', '2026-09-07');
  assert.equal(r.trend.status, 'ok');
  assert.equal(r.macro.status, 'ok');
  const snack = r.byMeal.find((x) => x.meal === '加餐');
  assert.ok(snack.days >= 2, JSON.stringify(r.byMeal));
  html = renderDietReviewHtml(r);
  assert.match(html, /饮食复盘/);
  assert.match(html, /MEAL_WINDOWS/);
  assert.match(html, /加餐=下午茶\+夜宵/);
  const h = buildHealthPlate(db, '2026-09-05', '2026-09-07');
  assert.equal(h.dashboard.status, 'ok');
  assert.equal(h.loggedDays, 3);
  html = renderHealthHtml(h);
  assert.match(html, /健康盘/);
  assert.match(html, /ilife:calorie:health/);
  db.close();
});

test('排行单榜全榜 + HTML 快照', () => {
  const db = tmpDb();
  seedFull(db);
  const one = buildFoodRankingPlate(db, '2026-09-05', '2026-09-07', 'high_calorie', 5);
  assert.ok(one.items.length > 0);
  assert.equal(one.items[0].rank, 1);
  let html = renderRankingHtml(one);
  assert.match(html, /排行 high_calorie/);
  assert.match(html, /ilife:calorie:ranking/);
  const all = buildAllRankings(db, '2026-09-05', '2026-09-07', 3);
  assert.equal(all.okCount, 5);
  html = renderAllRankingsHtml(all);
  assert.match(html, /全部排行/);
  assert.match(html, /5\/5/);
  assert.throws(() => buildFoodRankingPlate(db, '2026-09-05', '2026-09-07', 'nope', 5), /category 非法/);
  db.close();
});

test('食品库搜索 + HTML 快照', () => {
  const db = tmpDb();
  seedFull(db);
  const q = buildProductSearch(db, '鸡胸', 10);
  assert.equal(q.total, 1);
  assert.match(q.items[0].product_name, /鸡胸/);
  let html = renderProductSearchHtml(q);
  assert.match(html, /查食品/);
  assert.match(html, /ilife:calorie:search/);
  const lib = buildProductLibrary(db, null, 50);
  assert.equal(lib.total, 3);
  html = renderProductLibraryHtml(lib);
  assert.match(html, /食品库/);
  const cat = buildProductLibrary(db, '主食', 50);
  assert.equal(cat.total, 1);
  const stats = buildProductStats(db);
  assert.equal(stats.total, 3);
  html = renderProductStatsHtml(stats);
  assert.match(html, /库统计/);
  assert.throws(() => buildProductSearch(db, '   '), /关键词必填/);
  assert.throws(() => buildProductSearch(db, '不存在的食品xyz'), /无命中/);
  db.close();
});

test('缺失阻断：空库各盘一律 missing-data 不返空', () => {
  const db = tmpDb();
  assert.throws(() => buildGoalConfig(db), (e) => e instanceof CalorieRenderError && e.code === 'missing-data');
  assert.throws(() => buildGoalStatus(db), /未设营养目标/);
  assert.throws(() => buildGoalWeight(db, '2026-09-01', '2026-09-07'), /无体重目标/);
  // #100 · G5 三键之二：空库 deficit / goal-recommend 一律 missing-data，不返合成数字。
  assert.throws(() => buildDeficitPlate(db, '2026-09-05', '2026-09-07'),
    (e) => e instanceof CalorieRenderError && e.code === 'missing-data');
  assert.throws(() => buildGoalRecommend(db, 'cut'),
    (e) => e instanceof CalorieRenderError && e.code === 'missing-data');
  assert.throws(() => buildDietReview(db, '2026-09-05', '2026-09-07'), /无饮食记录/);
  assert.throws(() => buildFoodRankingPlate(db, '2026-09-05', '2026-09-07'), /无饮食记录/);
  assert.throws(() => buildProductLibrary(db), /食品库空/);
  assert.throws(() => buildGoalProgress(db, '2026-09-07', '2026-09-05'), /不得晚于/);
  db.close();
});
