/** #41 · 读链补齐测试：tmp 隔离，真实 DB 零触碰。
 * 覆盖 18 新读键 render 数据 + HTML 字段断言 + 缺失阻断 + 分发直调 stat。
 * 取数层复用既有（fetch/body/plan/volatility/anomaly/contraindications），本票只验 render 出口与键。
 * 说明：真 CLI spawn 覆盖见 test/cli-smoke-t41.test.mjs（18 新键串行 spawn：Windows 并行
 * spawn 配额抖动，故严格串行；B 已验证串行 20/20 可行）；本文件保留同 dispatch 直调断言。
 */
import { strict as assert } from 'node:assert';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { DIAGNOSE_KINDS } from '../dist/analysis/anomaly/index.js';
import { CALORIE_COMBOS, calorieShapeFor } from '../dist/cli/keys.js';
import { dispatch as dispatchRead } from '../dist/cli/cmd_read.js';
import {
  buildWeightDashboard, buildWeightHistoryView, buildWeightCompareView, buildWeightReviewView, buildVolatilityView,
  buildBodyCompositionView, buildBodyMeasureView,
  buildPlanView, buildPlanWizardView, buildExerciseGoalView,
  buildGoalExpiringView, buildGoalPredictView, buildGoalVsActualView,
  buildPredictView, buildAnomalyView, buildContraView, buildDedupeView,
  buildProfileView,
  renderWeightHtml, renderWeightHistoryHtml, renderWeightCompareHtml, renderWeightReviewHtml,
  renderVolatilityHtml, renderBodyCompositionHtml, renderBodyMeasureHtml, renderPlanHtml,
  renderPlanWizardHtml, renderExerciseGoalHtml, renderGoalExpiringHtml, renderGoalPredictHtml,
  renderGoalVsActualHtml, renderPredictHtml, renderAnomalyHtml, renderContraHtml,
  renderDedupeHtml, renderProfileHtml,
  VIEW_KEYS, viewShapeFor, CalorieRenderError,
} from '../dist/render/index.js';

const tmpDb = () => openDb(join(mkdtempSync(join(tmpdir(), 't41-')), 't.db'));

function seedFull(db) {
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level, note) VALUES (1, 30, 'male', 175, 'moderate', 'test')").run();
  db.prepare("INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal, goal_deadline, exercise_goal) VALUES (1, 1800, 150, 200, 50, 2000, 68.0, '2026-12-31', 300)").run();
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
  for (let i = 0; i < 16; i++) {
    const d = new Date(Date.parse('2026-08-23T12:00:00Z') + i * 86400000).toISOString().slice(0, 10);
    const w = Math.round((71.5 - i * 0.1) * 10) / 10;
    db.prepare('INSERT INTO weight_log (date, time, weight_kg, height_cm, bmi) VALUES (?, ?, ?, 175, 22.9)').run(d, '07:00:00', w);
  }
  for (const [d, pct] of [['2026-09-05', 19.5], ['2026-09-06', 19.2], ['2026-09-07', 18.9]]) {
    db.prepare('INSERT INTO body_composition (date, source, body_fat_pct, caliper_chest_mm, caliper_abdominal_mm, caliper_thigh_mm, caliper_tricep_mm, caliper_subscapular_mm, caliper_suprailiac_mm, caliper_midaxillary_mm) VALUES (?, ?, ?, 10, 12, 14, 11, 13, 12, 10)').run(d, 'home_caliper', pct);
  }
  for (const [d, waist, hip] of [['2026-09-05', 85, 95], ['2026-09-06', 84.5, 94.5], ['2026-09-07', 84, 94]]) {
    db.prepare('INSERT INTO body_measurements (date, waist_cm, hip_cm) VALUES (?, ?, ?)').run(d, waist, hip);
  }
  db.prepare("INSERT OR REPLACE INTO workout_plan_config (id, title, version, description, total_weeks, start_date) VALUES (1, 'test计划', 'v1', 'desc', 4, '2026-09-01')").run();
  db.prepare('INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label, movements) VALUES (1, 1, 1, ?, ?)').run('上肢', JSON.stringify([{ name: '硬拉', part: '背', type: '力量', sets: [] }]));
  db.prepare('INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label, movements) VALUES (1, 3, 1, ?, ?)').run('下肢', JSON.stringify([{ name: '深蹲', part: '腿', type: '力量', sets: [] }]));
  db.prepare("INSERT INTO nutrition_products (product_name, brand, calories, protein, fat, carbohydrates, sodium, category, source) VALUES ('鸡胸肉', '测试', 165, 31, 3.6, 0, 70, '蛋白类', '测试')").run();
  db.prepare("INSERT INTO nutrition_products (product_name, brand, calories, protein, fat, carbohydrates, sodium, category, source) VALUES ('鸡胸肉', '测试', 170, 30, 4, 0, 72, '蛋白类', '测试')").run();
  db.prepare("INSERT INTO nutrition_products (product_name, brand, calories, protein, fat, carbohydrates, sodium, category, source) VALUES ('米饭', '测试', 130, 2.7, 0.3, 28, 1, '主食', '测试')").run();
}

test('#41 键表：77 组合（读 42 + 写 35）registry 合法 + 新增 18 stat', () => {
  assert.equal(Object.keys(CALORIE_COMBOS).length, 77);
  const added = ['calorie.view.weight', 'calorie.view.weight-history', 'calorie.view.weight-compare', 'calorie.view.weight-review', 'calorie.view.volatility', 'calorie.view.body-composition', 'calorie.view.body-measure', 'calorie.view.plan', 'calorie.view.plan-wizard', 'calorie.view.exercise-goal', 'calorie.view.goal-expiring', 'calorie.view.goal-predict', 'calorie.view.goal-vs-actual', 'calorie.view.predict', 'calorie.view.anomaly', 'calorie.view.contraindication', 'calorie.view.dedupe', 'calorie.view.profile'];
  for (const k of added) {
    assert.ok(CALORIE_COMBOS[k], '缺新键 ' + k);
    assert.equal(CALORIE_COMBOS[k].shape, 'stat');
    assert.equal(calorieShapeFor(k), 'stat');
  }
  assert.equal(VIEW_KEYS.weight, 'calorie.view_weight');
  assert.equal(VIEW_KEYS.profile, 'calorie.view_profile');
  for (const k of Object.values(VIEW_KEYS)) assert.equal(viewShapeFor(k), 'stat');
});

test('#41 体重系五盘 + HTML 字段断言', () => {
  const db = tmpDb();
  seedFull(db);
  const dash = buildWeightDashboard(db, '2026-09-01', '2026-09-07');
  assert.ok(dash.trend.recordCount >= 7);
  assert.equal(dash.weightGoal, 68);
  let html = renderWeightHtml(dash);
  assert.match(html, /体重盘/);
  assert.match(html, /ilife:calorie:weight/);
  assert.match(html, /目标体重/);
  const hist = buildWeightHistoryView(db, { days: 7 });
  assert.ok(hist.rows.length >= 7);
  html = renderWeightHistoryHtml(hist);
  assert.match(html, /体重历史/);
  assert.match(html, /ilife:calorie:weight-history/);
  const cmp = buildWeightCompareView(db, '2026-09-01', '2026-09-07', '2026-08-23', '2026-08-29');
  assert.ok(typeof cmp.compare.avgDiff === 'number');
  html = renderWeightCompareHtml(cmp);
  assert.match(html, /体重对比/);
  assert.match(html, /对比期/);
  const rev = buildWeightReviewView(db, '2026-09-07');
  assert.equal(rev.milestone.weightGoal, 68);
  html = renderWeightReviewHtml(rev);
  assert.match(html, /体重复核/);
  assert.match(html, /差距/);
  const vol = buildVolatilityView(db, '2026-08-23', '2026-09-07', 'rolling');
  assert.ok(typeof vol.volatility.baselineValue === 'number');
  html = renderVolatilityHtml(vol);
  assert.match(html, /波动分析/);
  assert.match(html, /基线/);
  assert.match(html, /预警/);
  db.close();
});

test('#41 身体系两盘 + HTML 字段断言', () => {
  const db = tmpDb();
  seedFull(db);
  const comp = buildBodyCompositionView(db, { days: 90 });
  assert.equal(comp.total, 3);
  assert.equal(comp.latestPct, 18.9);
  let html = renderBodyCompositionHtml(comp);
  assert.match(html, /体成分看/);
  assert.match(html, /最新体脂/);
  const meas = buildBodyMeasureView(db, { metric: 'waist_cm', days: 90 });
  assert.equal(meas.total, 3);
  assert.equal(meas.latestVal, 84);
  html = renderBodyMeasureHtml(meas);
  assert.match(html, /围度看/);
  assert.match(html, /最新/);
  db.close();
});

test('#41 计划三盘 + HTML 字段断言', () => {
  const db = tmpDb();
  seedFull(db);
  const plan = buildPlanView(db);
  assert.equal(plan.totalSessions, 2);
  assert.equal(plan.totalMovements, 2);
  let html = renderPlanHtml(plan);
  assert.match(html, /训练计划看/);
  assert.match(html, /test计划/);
  const wiz = buildPlanWizardView({ config: { title: 't', start_date: '2026-09-01', user_level: '中手', available_equipment: ['瑜伽垫'] }, weeks: [{ week_number: 1, days: [{ day_of_week: 1, sessions: [{ session_label: 'a', movements: [{ name: '俯卧撑', part: '胸', type: '力量', sets: [] }] }] }] }] });
  assert.equal(wiz.errorCount, 0);
  assert.equal(wiz.checkedSessions, 1); // #102 G15：已检查计数（输入 1 会话，未写库；≠通过数）
  assert.ok(!('insertedCount' in wiz) && !('validatedCount' in wiz)); // #102 G15：改名后旧键均不再返
  html = renderPlanWizardHtml(wiz);
  assert.match(html, /构建向导/);
  assert.match(html, /可落地/);
  assert.match(html, /已检查 1 个会话/);
  const bad = buildPlanWizardView({ config: {}, weeks: [{ week_number: 1, days: [{ day_of_week: 1, sessions: [{ session_label: 'a', movements: [{ name: '硬拉', part: '背', type: '力量', sets: [] }] }] }] }] }, ['深蹲']);
  assert.ok(bad.errorCount >= 1);
  assert.equal(bad.checkedSessions, 1); // #102 G15：坏计划也计 N（已检查≠已通过）
  const badHtml = renderPlanWizardHtml(bad);
  assert.match(badHtml, /有硬止/);
  assert.match(badHtml, /已检查 1 个会话（\d+硬止）/);
  const goal = buildExerciseGoalView(db, '2026-09-06', '2026-09-07');
  assert.equal(goal.dailyGoal, 300);
  assert.equal(goal.actual, 620);
  assert.equal(goal.achieved, true);
  html = renderExerciseGoalHtml(goal);
  assert.match(html, /运动目标视图/);
  assert.match(html, /完成度/);
  db.close();
});

test('#41 目标扩展三盘 + HTML 字段断言', () => {
  const db = tmpDb();
  seedFull(db);
  const exp = buildGoalExpiringView(db, 14, '2026-09-07');
  assert.equal(exp.deadline, '2026-12-31');
  assert.ok(exp.daysLeft > 14 && exp.expiring === false);
  let html = renderGoalExpiringHtml(exp);
  assert.match(html, /即将到期目标/);
  assert.match(html, /2026-12-31/);
  const pred = buildGoalPredictView(db, '2026-08-23', '2026-09-07');
  assert.equal(pred.targetKg, 68);
  assert.ok(pred.eta.length === 10);
  html = renderGoalPredictHtml(pred);
  assert.match(html, /目标预测达成/);
  assert.match(html, /预计达成/);
  const vs = buildGoalVsActualView(db, '2026-09-05', '2026-09-07', 30);
  assert.ok(vs.completedCount + vs.incompleteCount > 0);
  html = renderGoalVsActualHtml(vs);
  assert.match(html, /目标对比实际/);
  assert.match(html, /完成率/);
  db.close();
});

test('#41 分析长尾四盘 + HTML 字段断言', () => {
  const db = tmpDb();
  seedFull(db);
  const p = buildPredictView(db, '2026-08-23', '2026-09-07', 30);
  assert.ok(typeof p.forecastValue === 'number');
  let html = renderPredictHtml(p);
  assert.match(html, /体重预测/);
  assert.match(html, /速率/);
  const a = buildAnomalyView(db, 'diet_over', '2026-09-01', '2026-09-07');
  assert.ok(typeof a.findingCount === 'number');
  html = renderAnomalyHtml(a);
  assert.match(html, /异常诊断/);
  assert.match(html, /diet_over/);
  const c = buildContraView(db, 'all');
  assert.equal(c.scannedSessions, 2);
  assert.ok(c.errorCount + c.warnCount + c.infoCount >= 1);
  html = renderContraHtml(c);
  assert.match(html, /禁忌扫描/);
  assert.match(html, /会话/);
  const d = buildDedupeView(db);
  assert.equal(d.groupCount, 1);
  assert.equal(d.totalProducts, 3);
  html = renderDedupeHtml(d);
  assert.match(html, /去重报告/);
  assert.match(html, /鸡胸肉/);
  db.close();
});

test('#41 档案视图 + HTML 字段断言', () => {
  const db = tmpDb();
  seedFull(db);
  const v = buildProfileView(db);
  assert.equal(v.profile.age, 30);
  assert.equal(v.hasGoal, true);
  const html = renderProfileHtml(v);
  assert.match(html, /档案视图/);
  assert.match(html, /活动量/);
  assert.match(html, /moderate/);
  db.close();
});

test('#41 缺失阻断：空库 18 键一律 missing-data（wizard 走 bad-input）不返空', () => {
  const db = tmpDb();
  assert.throws(() => buildWeightDashboard(db, '2026-09-01', '2026-09-07'), (e) => e instanceof CalorieRenderError && e.code === 'missing-data');
  assert.throws(() => buildWeightHistoryView(db, { days: 7 }), /无体重记录/);
  assert.throws(() => buildWeightCompareView(db, '2026-09-01', '2026-09-07', '2026-08-01', '2026-08-07'), /无体重记录|无法对比/);
  assert.throws(() => buildWeightReviewView(db, '2026-09-07'), /目标|记录/);
  assert.throws(() => buildVolatilityView(db, '2026-09-01', '2026-09-07'), /记录不足|无体重/);
  assert.throws(() => buildBodyCompositionView(db), /无体成分/);
  assert.throws(() => buildBodyMeasureView(db), /无围度/);
  assert.throws(() => buildPlanView(db), /无训练计划/);
  assert.throws(() => buildPlanWizardView(null), /plan 必填/);
  assert.throws(() => buildExerciseGoalView(db, '2026-09-06', '2026-09-07'), /未设运动目标/);
  assert.throws(() => buildGoalExpiringView(db), /无到期目标/);
  assert.throws(() => buildGoalPredictView(db, '2026-09-01', '2026-09-07'), /无体重目标|数据不足/);
  assert.throws(() => buildGoalVsActualView(db, '2026-09-05', '2026-09-07'), /未设营养目标|无饮食|无健康/);
  assert.throws(() => buildPredictView(db, '2026-09-05', '2026-09-07'), /数据不足/);
  assert.throws(() => buildAnomalyView(db, 'nope', '2026-09-01', '2026-09-07'), /未知诊断/);
  assert.throws(() => buildContraView(db), /无训练计划/);
  assert.throws(() => buildDedupeView(db), /食品库空/);
  assert.throws(() => buildProfileView(db), /未设档案/);
  db.close();
});

test('#41 M1：空库全部有效诊断 kind 一律 missing-data 阻断（零观测 series，不返假健康）', () => {
  const db = tmpDb();
  assert.equal(DIAGNOSE_KINDS.length, 23);
  for (const kind of DIAGNOSE_KINDS) {
    assert.throws(
      () => buildAnomalyView(db, kind, '2026-09-01', '2026-09-07'),
      (e) => e instanceof CalorieRenderError && e.code === 'missing-data',
      '空库未阻断 ' + kind,
    );
  }
  db.close();
});

function directOk(db, key, params) {
  const out = dispatchRead(key, params ?? {}, db);
  const shape = calorieShapeFor(key);
  assert.equal(shape, 'stat', key + ' shape');
  const metrics = out.data.metrics;
  assert.ok(metrics && typeof metrics === 'object', key + ' 缺 metrics');
  for (const v of Object.values(metrics)) assert.equal(typeof v, 'number', key + ' metrics 非 number');
  assert.ok(typeof out.html === 'string' && out.html.includes('ilife-page'), key + ' HTML 缺 ilife-page');
  return out;
}

test('#41 分发直调：18 新键 stat metrics 全 number + HTML 同源（与 CLI 同 dispatch）', () => {
  const db = tmpDb();
  seedFull(db);
  const w = directOk(db, 'calorie.view.weight', { start: '2026-09-01', end: '2026-09-07' });
  assert.ok(w.data.metrics.recordCount >= 7);
  const wh = directOk(db, 'calorie.view.weight-history', { days: 7 });
  assert.ok(wh.data.metrics.rows >= 7);
  const wc = directOk(db, 'calorie.view.weight-compare', { start: '2026-09-01', end: '2026-09-07', compareStart: '2026-08-23', compareEnd: '2026-08-29' });
  assert.ok(typeof wc.data.metrics.avgDiff === 'number');
  const wr = directOk(db, 'calorie.view.weight-review', { today: '2026-09-07' });
  assert.equal(wr.data.metrics.weightGoal, 68);
  const vol = directOk(db, 'calorie.view.volatility', { start: '2026-08-23', end: '2026-09-07' });
  assert.ok(typeof vol.data.metrics.baselineValue === 'number');
  const bc = directOk(db, 'calorie.view.body-composition', {});
  assert.equal(bc.data.metrics.total, 3);
  const bm = directOk(db, 'calorie.view.body-measure', { metric: 'waist_cm' });
  assert.equal(bm.data.metrics.total, 3);
  const pl = directOk(db, 'calorie.view.plan', {});
  assert.equal(pl.data.metrics.totalSessions, 2);
  const wiz = directOk(db, 'calorie.view.plan-wizard', { plan: { config: { title: 't', start_date: '2026-09-01', user_level: '中手', available_equipment: ['瑜伽垫'] }, weeks: [{ week_number: 1, days: [{ day_of_week: 1, sessions: [{ session_label: 'a', movements: [{ name: '俯卧撑', part: '胸', type: '力量', sets: [] }] }] }] }] } });
  assert.equal(wiz.data.metrics.errorCount, 0);
  const eg = directOk(db, 'calorie.view.exercise-goal', { start: '2026-09-06', end: '2026-09-07' });
  assert.equal(eg.data.metrics.dailyGoal, 300);
  const ex = directOk(db, 'calorie.view.goal-expiring', { withinDays: 150, today: '2026-09-07' });
  assert.equal(ex.data.metrics.daysLeft, 115);
  const gp = directOk(db, 'calorie.view.goal-predict', { start: '2026-08-23', end: '2026-09-07' });
  assert.equal(gp.data.metrics.targetKg, 68);
  const vs = directOk(db, 'calorie.view.goal-vs-actual', { start: '2026-09-05', end: '2026-09-07' });
  assert.ok(typeof vs.data.metrics.trendAvg === 'number');
  const pr = directOk(db, 'calorie.view.predict', { start: '2026-08-23', end: '2026-09-07', horizonDays: 30 });
  assert.ok(typeof pr.data.metrics.forecastValue === 'number');
  const an = directOk(db, 'calorie.view.anomaly', { kind: 'diet_over', start: '2026-09-01', end: '2026-09-07' });
  assert.ok(typeof an.data.metrics.findingCount === 'number');
  const ct = directOk(db, 'calorie.view.contraindication', { part: 'all' });
  assert.equal(ct.data.metrics.scannedSessions, 2);
  const dd = directOk(db, 'calorie.view.dedupe', {});
  assert.equal(dd.data.metrics.groupCount, 1);
  const pf = directOk(db, 'calorie.view.profile', {});
  assert.equal(pf.data.metrics.hasGoal, 1);
  db.close();
});
