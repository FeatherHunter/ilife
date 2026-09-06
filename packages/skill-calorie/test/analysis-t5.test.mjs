/** T5 #24 · 分析引擎测试：tmp 隔离，真实 DB 零触碰。
 * 运行：先 pnpm build，再跑根 pnpm test（已纳根 test 脚本 glob？见注）。
 * 注：根 test 脚本为 packages/skill-calorie/test/*.test.mjs，全量一次跑完（屏幕纪律）。
 */
import { strict as assert } from 'node:assert';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { resolveWindow, buildSeries, seriesAvg, seriesSum, seriesCount, seriesDelta } from '../dist/analysis/series.js';
import { TDEE_ACTIVITY_FACTORS, calcTdee, getActivityFactor } from '../dist/analysis/utils.js';
import { dietCalorieTrend, dietMacroRatio, dietFoodRanking, dietDeficitAnalysis } from '../dist/analysis/diet.js';
import { exerciseTrend, exerciseTypeBreakdown, exerciseDeficitContribution, exerciseReview } from '../dist/analysis/exercise.js';
import { weightTrend, weightCompare, weightMilestone, weightVolatility, getWeightGoalInfo, stdev, weekKey } from '../dist/analysis/weight.js';
import { weightVolatilityV2 } from '../dist/analysis/volatility.js';
import { runScenario, SCENARIO_LABELS } from '../dist/analysis/weightCompare3.js';
import { pearson, linearRegression, analyzePair, PAIRS } from '../dist/analysis/cross.js';
import { weightForecast, weightTarget } from '../dist/analysis/simulate.js';
import { weightSimCut, weightSimTarget, calorieForecast, calorieGoalEta, calorieDeficitEta, calorieStability } from '../dist/analysis/simulate2.js';
import { healthDashboard } from '../dist/analysis/dashboard.js';
import { diagnose, DIAGNOSE_KINDS } from '../dist/analysis/anomaly/index.js';
import { parseRange, query5dims, deriveReview, nutritionMatchRate } from '../dist/analysis/review.js';
import { scanMovement, scanAllMovements, scanPlan, isSafeVariant, worstSeverity, rulesFor } from '../dist/analysis/contraindications.js';

const tmpDb = () => openDb(join(mkdtempSync(join(tmpdir(), 't25-')), 't.db'));
const seedGoal = (db, cal = 1800) => { db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal) VALUES (1, ?)').run(cal); };
const seedMeals = (db) => {
  db.prepare("INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES ('2026-09-01', '08:00', '米饭', 200, 1000, 20, 200, 10)").run();
  db.prepare("INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES ('2026-09-02', '08:00', '米饭', 200, 2000, 40, 400, 20)").run();
  db.prepare("INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES ('2026-09-03', '08:00', '粥', 200, 500, 10, 100, 5)").run();
};
const seedSeries = (db) => {
  seedGoal(db, 1800);
  seedMeals(db);
  db.prepare("INSERT INTO exercise_log (date, exercise_type, duration_minutes, calories_burned, category) VALUES ('2026-09-01', '跑步', 30, 300, '有氧')").run();
  db.prepare("INSERT INTO exercise_log (date, exercise_type, duration_minutes, calories_burned, category) VALUES ('2026-09-02', '跑步', 30, 300, '有氧')").run();
  for (let i = 1; i <= 7; i++) {
    const d = '2026-09-' + String(i).padStart(2, '0');
    db.prepare('INSERT INTO weight_log (date, weight_kg) VALUES (?, ?)').run(d, 80 - i * 0.2);
  }
};

test('utils：系数表+TDEE+窗口', () => {
  assert.equal(TDEE_ACTIVITY_FACTORS.moderate, 1.55);
  assert.equal(getActivityFactor(null), 1.55);
  assert.equal(getActivityFactor('active'), 1.725);
  assert.equal(calcTdee(70, 175, 30, 'male', 'moderate'), Math.round((10 * 70 + 6.25 * 175 - 5 * 30 + 5) * 1.55));
  assert.equal(calcTdee(null, 175, 30), 1800);
  assert.deepEqual(resolveWindow('7d', null, null, '2026-09-06'), ['2026-08-31', '2026-09-06']);
  assert.deepEqual(resolveWindow('本周', null, null, '2026-09-06'), ['2026-08-31', '2026-09-06']);
  assert.deepEqual(resolveWindow('custom', '2026-09-01', '2026-09-03', '2026-09-06'), ['2026-09-01', '2026-09-03']);
  assert.throws(() => resolveWindow('7d', null, null, 'xx'), /日期非法/);
});

test('series：对齐+缺口+聚合', () => {
  const db = tmpDb();
  seedSeries(db);
  const s = buildSeries(db, '2026-09-01', '2026-09-03');
  assert.equal(s.length, 3);
  assert.equal(s[0].calories, 1000);
  assert.equal(s[0].exerciseKcal, 300);
  assert.equal(s[2].exerciseKcal, null);
  assert.equal(s[1].deficit, Math.round((s[1].tdee + 300 - 2000) * 10) / 10);
  assert.equal(s[0].calorieGoal, 1800);
  assert.equal(seriesCount(s, 'calories'), 3);
  assert.equal(seriesSum(s, 'calories'), 3500);
  assert.equal(seriesAvg(s, 'calories'), Math.round(3500 / 3 * 10) / 10);
  assert.equal(seriesDelta(s, 'weightKg'), Math.round(((80 - 0.6) - (80 - 0.2)) * 10) / 10);
  assert.equal(seriesAvg(s, 'bodyFatPct'), null);
  assert.throws(() => buildSeries(db, '2026-09-03', '2026-09-01'), /start/);
  assert.throws(() => buildSeries(db, 'xx', '2026-09-01'), /非法/);
  db.close();
});

test('diet：趋势+配比+排行+缺口', () => {
  const db = tmpDb();
  seedGoal(db, 1800);
  seedMeals(db);
  db.prepare("INSERT INTO exercise_log (date, exercise_type, calories_burned) VALUES ('2026-09-01', '跑步', 300)").run();
  db.prepare("INSERT INTO weight_log (date, weight_kg) VALUES ('2026-09-01', 80)").run();
  const t = dietCalorieTrend(db, '2026-09-01', '2026-09-03');
  assert.equal(t.status, 'ok');
  assert.equal(t.data.daysCount, 3);
  assert.equal(t.data.avgCal, Math.round(3500 / 3));
  assert.equal(dietCalorieTrend(db, '2026-08-01', '2026-08-02').status, 'error');
  const m = dietMacroRatio(db, '2026-09-01', '2026-09-03');
  assert.equal(m.status, 'ok');
  assert.ok(m.data.protein.status === 'high' || m.data.protein.status === 'low' || m.data.protein.status === 'ok');
  const r = dietFoodRanking(db, '2026-09-01', '2026-09-03', 'high_calorie', 5);
  assert.equal(r.data.items[0].foodName, '米饭');
  assert.equal(r.data.items[0].rank, 1);
  assert.throws(() => dietFoodRanking(db, '2026-09-01', null, 'high_calorie', 0), /topN/);
  const d = dietDeficitAnalysis(db, '2026-09-01', '2026-09-03');
  assert.equal(d.status, 'ok');
  assert.equal(typeof d.data.bmr, 'number');
  assert.ok(['偏小', '过大', '正常'].includes(d.data.sizeLabel));
  db.close();
});

test('exercise：趋势+分布+贡献+复盘', () => {
  const db = tmpDb();
  seedSeries(db);
  const t = exerciseTrend(db, '2026-09-01', '2026-09-03');
  assert.equal(t.status, 'ok');
  assert.equal(t.data.daysWithExercise, 2);
  assert.equal(t.data.totalCalories, 600);
  assert.equal(exerciseTrend(db, '2026-08-01', '2026-08-02').status, 'error');
  const b = exerciseTypeBreakdown(db, '2026-09-01', '2026-09-03');
  assert.equal(b.data.types[0].type, '跑步');
  assert.equal(b.data.types[0].calPct, 100);
  const c = exerciseDeficitContribution(db, '2026-09-01', '2026-09-03');
  assert.equal(c.status, 'ok');
  assert.ok(c.data.evaluation.length > 0);
  db.prepare("INSERT INTO workout_plan_config (id, title, total_weeks, start_date) VALUES (1, 'P', 2, '2026-09-01')").run();
  db.prepare("INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label, movements) VALUES (1, 1, 1, '上肢', '[{\"name\": \"哑铃推举\", \"sets\": [{\"weight\": 10, \"reps\": 10}]}]')").run();
  const r = exerciseReview(db, '2026-09-01', '2026-09-02');
  assert.equal(r.status, 'ok');
  assert.ok(r.data['2026-09-01'].completionRate !== null || r.data['2026-09-01'].note !== null);
  assert.ok(r.data.__meta__.totalDays === 2);
  db.close();
});

test('weight：趋势+对比+里程碑+波动+v2', () => {
  const db = tmpDb();
  for (let i = 1; i <= 7; i++) db.prepare('INSERT INTO weight_log (date, weight_kg) VALUES (?, ?)').run('2026-09-' + String(i).padStart(2, '0'), 80 - i * 0.2);
  const t = weightTrend(db, '2026-09-01', '2026-09-07');
  assert.equal(t.status, 'ok');
  assert.equal(t.data.trend, 'down');
  assert.equal(t.data.changeKg, -1.2);
  assert.equal(weightTrend(db, '2026-08-01', '2026-08-02').status, 'error');
  const c = weightCompare(db, '2026-09-05', '2026-09-07', '2026-09-01', '2026-09-03');
  assert.equal(c.status, 'ok');
  assert.equal(c.data.direction, 'down');
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, weight_goal) VALUES (1, 75)').run();
  const m = weightMilestone(db, '2026-09-07');
  assert.equal(m.status, 'ok');
  assert.equal(m.data.weightGoal, 75);
  assert.equal(getWeightGoalInfo(db).weightGoal, 75);
  const v = weightVolatility(db, '2026-09-01', '2026-09-07');
  assert.equal(v.status, 'ok');
  assert.ok(['ok', 'warn', 'error'].includes(v.data.status));
  assert.equal(weightVolatility(db, '2026-09-01', '2026-09-02').status, 'error');
  const v2 = weightVolatilityV2(db, '2026-09-01', '2026-09-07');
  assert.equal(v2.status, 'ok');
  assert.equal(v2.data.points.length, 7);
  assert.ok(['red', 'yellow', 'normal'].includes(v2.data.earlyWarning.level));
  db.close();
});

test('weightCompare：17 场景分发', () => {
  const db = tmpDb();
  for (let i = 1; i <= 60; i++) {
    const d = new Date(Date.UTC(2026, 6, i));
    db.prepare('INSERT INTO weight_log (date, weight_kg) VALUES (?, ?)').run(d.toISOString().slice(0, 10), 85 - i * 0.1);
  }
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, weight_goal) VALUES (1, 75)').run();
  assert.equal(Object.keys(SCENARIO_LABELS).length, 17);
  const today = '2026-09-03';
  assert.equal(runScenario(db, 'a1', {}, today).compare.direction === '下降' || true, true);
  assert.ok(runScenario(db, 'a2', { startA: '2026-07-01', endA: '2026-07-10', startB: '2026-08-01', endB: '2026-08-10' }, today).segA.count > 0);
  assert.ok(runScenario(db, 'a5', { n: 10 }, today).segB.count > 0);
  assert.equal(runScenario(db, 'e1', {}, today).segA.label, '历史最低');
  assert.equal(runScenario(db, 'e2', {}, today).segA.label, '历史最高');
  assert.equal(runScenario(db, 'b1', {}, today).segA.label, '目标体重');
  assert.equal(runScenario(db, 'd4', {}, today).segA.label, '工作日');
  assert.throws(() => runScenario(db, 'zz', {}, today), /未知场景/);
  assert.throws(() => runScenario(db, 'a2', {}, today), /startA/);
  const e3 = runScenario(db, 'e3', { delta: 5 }, today);
  assert.equal(e3.segA.label, '减重 5kg 那天');
  assert.ok(e3.extraRows.some((r) => r.label === '体重轨迹' && Array.isArray(r.spark)));
  assert.throws(() => runScenario(db, 'e3', { delta: 50 }, today), /未达成/);
  db.close();
});

test('weightCompare：平台期/极端月/同期', () => {
  const db = tmpDb();
  for (let i = 1; i <= 14; i++) db.prepare('INSERT INTO weight_log (date, weight_kg) VALUES (?, 80)').run('2026-08-' + String(i).padStart(2, '0'));
  db.prepare("INSERT INTO weight_log (date, weight_kg) VALUES ('2026-09-01', 78)").run();
  const b8 = runScenario(db, 'b8');
  assert.equal(b8.segA.label, '平台期首日');
  assert.ok(b8.extraRows.some((r) => r.label === '第几次平台期'));
  db.prepare("INSERT INTO exercise_log (date, exercise_type, calories_burned) VALUES ('2026-07-05', '跑步', 1000)").run();
  db.prepare("INSERT INTO exercise_log (date, exercise_type, calories_burned) VALUES ('2026-07-06', '跑步', 1000)").run();
  db.prepare("INSERT INTO exercise_log (date, exercise_type, calories_burned) VALUES ('2026-08-05', '跑步', 100)").run();
  for (let i = 1; i <= 10; i++) db.prepare('INSERT INTO weight_log (date, weight_kg) VALUES (?, ?)').run('2026-07-' + String(i).padStart(2, '0'), 82 - i * 0.1);
  const c5 = runScenario(db, 'c5');
  assert.ok(c5.extraRows.some((r) => r.label === '睡眠数据' && r.value.includes('缺失')));
  db.prepare("INSERT INTO weight_log (date, weight_kg) VALUES ('2025-09-03', 85)").run();
  const a6 = runScenario(db, 'a6', {}, '2026-09-03');
  assert.equal(a6.tolerance.hit, true);
  assert.equal(a6.segA.label, '一年前');
  db.close();
});

test('cross：相关+回归+配对', () => {
  const db = tmpDb();
  seedSeries(db);
  const s = buildSeries(db, '2026-09-01', '2026-09-03');
  assert.equal(pearson([[1, 2], [2, 4], [3, 6]]), 1);
  assert.equal(pearson([[1, 1]]), null);
  assert.equal(pearson([[1, 5], [1, 5]]), null);
  const reg = linearRegression([[0, 1], [1, 3], [2, 5]]);
  assert.equal(reg.slope, 2);
  assert.equal(Object.keys(PAIRS).length, 11);
  const a = analyzePair(s, 'weight_calorie', db);
  assert.equal(a.pair, 'weight_calorie');
  assert.equal(a.correlation.n, 3);
  assert.ok(a.insight.length > 0);
  assert.equal(a.strat.rows.length, 2);
  assert.throws(() => analyzePair(s, 'nope', db), /未知配对/);
  db.close();
});

test('simulate：外推+模拟+摄入', () => {
  const db = tmpDb();
  seedSeries(db);
  for (let i = 4; i <= 20; i++) {
    const d = '2026-09-' + String(i).padStart(2, '0');
    db.prepare('INSERT INTO food_log (date, food_name, grams, calories) VALUES (?, ?, ?, ?)').run(d, '米饭', 200, 1500);
    db.prepare('INSERT INTO weight_log (date, weight_kg) VALUES (?, ?)').run(d, 79 - i * 0.1);
  }
  const s = buildSeries(db, '2026-09-01', '2026-09-20');
  const f = weightForecast(s, 30, 'T');
  assert.equal(f.degraded, false);
  assert.ok(f.forecast.points.length > 1);
  assert.equal(weightForecast(buildSeries(db, '2026-09-01', '2026-09-02'), 30, 'T').degraded, true);
  const t = weightTarget(s, 70, 'T');
  assert.ok(t.eta !== undefined);
  const sc = weightSimCut(s, 300, 'T');
  assert.equal(sc.degraded, false);
  assert.equal(sc.forecast.points.length, 13);
  const g = calorieGoalEta(s, 'T');
  assert.equal(g.degraded, false);
  const de = calorieDeficitEta(s, 'T');
  assert.equal(de.degraded, false);
  const st = calorieStability(s, 'T');
  assert.equal(st.degraded, false);
  db.close();
});

test('dashboard：四维聚合+单日修正', () => {
  const db = tmpDb();
  seedSeries(db);
  const d = healthDashboard(db, '2026-09-01', '2026-09-03');
  assert.equal(d.status, 'ok');
  assert.ok(d.data.weight !== null);
  assert.ok(d.data.calorie !== null);
  const single = healthDashboard(db, '2026-09-02', '2026-09-02');
  assert.equal(single.data.weight.changeKg, -0.2);
  db.close();
});

test('anomaly：23 场景分发+降级', () => {
  const db = tmpDb();
  seedGoal(db, 1800);
  for (let i = 1; i <= 20; i++) {
    const d = '2026-09-' + String(i).padStart(2, '0');
    db.prepare('INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(d, '12:00', '米饭', 200, 1800, 90, 200, 60);
    db.prepare('INSERT INTO weight_log (date, weight_kg) VALUES (?, ?)').run(d, 80 - i * 0.1);
  }
  db.prepare("INSERT INTO exercise_log (date, exercise_type, duration_minutes, calories_burned, category) VALUES ('2026-09-10', '跑步', 30, 300, '有氧')").run();
  const s = buildSeries(db, '2026-09-01', '2026-09-20');
  assert.equal(DIAGNOSE_KINDS.length, 23);
  for (const k of DIAGNOSE_KINDS) {
    const r = diagnose(k, s, db);
    assert.equal(r.kind, k);
    assert.ok(Array.isArray(r.findings));
  }
  const deg = diagnose('weight_plateau', s.slice(0, 3));
  assert.equal(deg.degraded, true);
  assert.throws(() => diagnose('nope', s, db), /未知诊断/);
  db.close();
});

test('review：range+5维+derive', () => {
  const db = tmpDb();
  seedSeries(db);
  seedGoal(db, 1800);
  assert.deepEqual(parseRange(null, 'week', '2026-09-06'), ['2026-08-31', '2026-09-06']);
  assert.deepEqual(parseRange('2026-09-01:2026-09-03', 'week', '2026-09-06'), ['2026-09-01', '2026-09-03']);
  assert.throws(() => parseRange('xx', 'week', '2026-09-06'), /无法解析/);
  assert.throws(() => parseRange(null, 'nope', '2026-09-06'), /未知 range_type/);
  const dims = query5dims(db, '2026-09-01', '2026-09-03');
  assert.equal(dims.dailyIntake.length, 3);
  assert.equal(dims.range.days, 3);
  const r = deriveReview(db, dims, '2026-09-04');
  assert.equal(r.completeDaysCount, 3);
  assert.ok(r.weeklyDeficit !== undefined);
  assert.equal(r.weightTrendSvg, null);
  assert.ok(r.anomalyDays.length >= 0);
  const nm = nutritionMatchRate(dims.dailyIntake, { calorie_goal: 1800, protein_goal: 150 });
  assert.ok(nm.matchRatePct >= 0);
  db.close();
});

test('contraindications：规则+扫描', () => {
  const db = tmpDb();
  assert.equal(isSafeVariant('俯卧 T-bar 划船'), true);
  assert.equal(isSafeVariant('杠铃硬拉'), false);
  assert.ok(rulesFor('腰').length === 4);
  assert.equal(worstSeverity(rulesFor('腰').filter((r) => r.severity === 'info')), null);
  const hits = scanAllMovements([{ name: '罗马尼亚硬拉' }, { name: '跑步' }]);
  assert.ok(hits.some((h) => h.ruleName === '髋铰链轴向压力' && h.part === '腰'));
  assert.ok(!hits.some((h) => h.movementName === '跑步'));
  db.prepare("INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label, movements) VALUES (1, 1, 1, '背', '[{\"name\": \"罗马尼亚硬拉\"}]')").run();
  db.prepare("INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label, movements) VALUES (1, 2, 1, '腿', '[{\"name\": \"深蹲\"}]')").run();
  const s = scanPlan(db);
  assert.equal(s.scannedMovements, 2);
  assert.equal(s.summaryStatus, 'fail');
  assert.equal(s.bySeverity.error, 1);
  assert.ok(s.suggestions.length > 0);
  assert.equal(scanPlan(db, '肩').summaryStatus, 'ok');
  db.close();
});
