/** T7 #26 · 口径快照锁定：赤字/趋势/复核 + 精度守卫（tmp 隔离）。
 * 固定窗口 2026-08-31..09-06（周一..周日），档案 30/male/177/moderate → TDEE 2575。
 */
import { strict as assert } from 'node:assert';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  openDb, buildDeficitData, buildTrendData, buildExerciseReview,
  assertNoLeak, findLeaks, KCAL_PER_KG,
} from '../dist/index.js';

const WINDOW = ['2026-08-31', '2026-09-06'];

function seedDb() {
  const db = openDb(join(mkdtempSync(join(tmpdir(), 't26-')), 't.db'));
  db.prepare("INSERT INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, 'male', 177, 'moderate')").run();
  db.prepare('INSERT INTO daily_goal (id, calorie_goal, water_goal) VALUES (1, 1800, 2000)').run();
  return db;
}

function dayISO(i) {
  return new Date(Date.UTC(2026, 7, 31) + i * 86400000).toISOString().slice(0, 10);
}

function seedDeficitUser(db) {
  for (let i = 0; i < 7; i++) {
    const d = dayISO(i);
    db.prepare('INSERT INTO food_log (date, food_name, grams, calories) VALUES (?, \'测试餐\', 100, 2000)').run(d);
    if (i % 2 === 0) db.prepare("INSERT INTO exercise_log (date, exercise_type, calories_burned) VALUES (?, '跑步', 100)").run(d);
  }
}

test('赤字快照：正=缺口，summary/series 自洽', () => {
  const db = seedDb();
  seedDeficitUser(db);
  const data = buildDeficitData(db, ...WINDOW);
  assert.deepEqual(data.summary, {
    avgIntake: 2000,
    avgBurn: 2632,
    avgExerciseBurn: 57,
    avgDeficit: 632,
    weeklyDeficit: 4425,
    predictedLossKg: 0.57,
    trend: 'loss',
  });
  assert.deepEqual(data.target, { intake: 1800, tdee: 2575, weeklyDeficitPerDay: 300 });
  assert.equal(data.series.length, 7);
  assert.deepEqual(data.series[0], { date: '2026-08-31', intake: 2000, burn: 2675, deficit: 675, weekday: '周一' });
  assert.deepEqual(data.series[1], { date: '2026-09-01', intake: 2000, burn: 2575, deficit: 575, weekday: '周二' });
  // 自洽：weekly == series 缺口和；predicted == weekly/7700 round2。
  const sum = data.series.reduce((a, d) => a + d.deficit, 0);
  assert.equal(data.summary.weeklyDeficit, sum);
  assert.equal(data.summary.predictedLossKg, Math.round((sum / KCAL_PER_KG) * 100) / 100);
  assert.ok(data.summary.avgDeficit > 0, '真实缺口用户缺口为正');
  assert.deepEqual([data.meta.weekdayCount, data.meta.weekendCount], [5, 2]);
  db.close();
});

test('趋势快照：7dim + 精度字段 round(2)', () => {
  const db = seedDb();
  const cals = [1900, 1850, 1800, 1750, 1700, 1650, 1600];
  cals.forEach((c, i) => {
    db.prepare('INSERT INTO food_log (date, food_name, grams, calories) VALUES (?, \'餐\', 100, ?)').run(dayISO(i), c);
  });
  const data = buildTrendData(db, ...WINDOW);
  assert.deepEqual(data.summary, {
    avg: 1750, target: 1800, trend: 'down', trendValue: -300,
    startAvg: 1900, endAvg: 1600,
    weekdayAvg: 1800, weekendAvg: 1625, weekendDiff: -175,
    complianceRate: 0.86, compliantDays: 6,
  });
  assert.equal(data.series.length, 7);
  assert.deepEqual(data.series[0], { date: '2026-08-31', weekday: '周一', type: '工作日', calorie: 1900 });
  assert.deepEqual(data.series[6], { date: '2026-09-06', weekday: '周日', type: '周末', calorie: 1600 });
  assertNoLeak({ summary: data.summary, series: data.series });
  db.close();
});

test('运动复核快照：总量/分类/估算校验', () => {
  const db = seedDb();
  db.prepare("INSERT INTO exercise_log (date, time, exercise_type, duration_minutes, calories_burned) VALUES ('2026-08-31', '07:00:00', '户外跑', 30, 300)").run();
  db.prepare("INSERT INTO exercise_log (date, time, exercise_type, duration_minutes, calories_burned) VALUES ('2026-09-01', '07:00:00', '户外跑', 30, 300)").run();
  db.prepare("INSERT INTO exercise_log (date, time, exercise_type, calories_burned) VALUES ('2026-09-02', '18:00:00', '哑铃弯举', 100)").run();
  const r = buildExerciseReview(db, ...WINDOW);
  assert.equal(r.sessions, 3);
  assert.equal(r.activeDays, 3);
  assert.equal(r.totalBurned, 700);
  assert.equal(r.totalMinutes, 60);
  assert.deepEqual(r.byCategory['有氧'], { sessions: 2, burned: 600 });
  assert.deepEqual(r.byCategory['力量'], { sessions: 1, burned: 100 });
  assert.equal(r.byType[0].type, '户外跑');
  // 估算校验：跑 8MET×70×0.5=280×2 + 弯举 5×70×3×0.05=52.5 → 612.5，偏差 |700-612.5|/612.5=0.14。
  assert.deepEqual(r.estimatedCheck, { reported: 700, estimated: 612.5, deviationPct: 0.14 });
  db.close();
});

test('运动复核：空窗抛错', () => {
  const db = seedDb();
  assert.throws(() => buildExerciseReview(db, ...WINDOW), /无运动记录/);
  db.close();
});

test('精度守卫：检出泄漏并抛错', () => {
  assertNoLeak({ summary: { trendValue: 1.5, avg: 2000 }, series: [{ calorie: 100 }] });
  assert.equal(findLeaks({ summary: { trendValue: 2905.255 }, series: [{ calorie: 0.30000000000000004 }] }).length, 1);
  assert.throws(() => assertNoLeak({ summary: { avg: -141.6550000000002 }, series: [] }), /精度泄漏/);
});
