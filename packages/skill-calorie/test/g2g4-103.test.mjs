/** #103 · G2–G4 口径修正批：tmp 隔离，真实 DB 零触碰。
 * G2：predict／goal-predict 缺省调用（文档默认、无 params）必须可达——默认窗 14 天（≥ SIM_MIN_DAYS）。
 * G3：view.anomaly 23 kind render 层参数化全覆盖（此前 CLI/render 层仅 diet_over 一例）。
 * G4：view.combined window 白名单——`99d`/未知值走 bad-input（exit 2），不再静默生效/回退 30d。
 * 运行：先 pnpm --filter skill-calorie build，再 node --test packages/skill-calorie/test/g2g4-103.test.mjs
 */
import { strict as assert } from 'node:assert';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { dispatch as dispatchRead } from '../dist/cli/cmd_read.js';
import { resolveWindow, COMBINED_WINDOWS } from '../dist/analysis/series.js';
import { DIAGNOSE_KINDS } from '../dist/analysis/anomaly/index.js';
import { buildAnomalyView } from '../dist/render/insightPlate.js';
import { CalorieRenderError } from '../dist/render/index.js';

const tmpDb = () => openDb(join(mkdtempSync(join(tmpdir(), 't103-')), 't.db'));

function seedFull(db) {
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, 'male', 175, 'moderate')").run();
  db.prepare("INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal, goal_deadline) VALUES (1, 1800, 150, 200, 50, 2000, 68.0, '2026-12-31')").run();
  for (let i = 1; i <= 20; i++) {
    const d = '2026-09-' + String(i).padStart(2, '0');
    db.prepare('INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat, sodium_mg) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(d, '12:00', '米饭', 200, 1800, 90, 200, 60, 3000);
  }
  for (let i = 0; i < 29; i++) {
    const d = new Date(Date.parse('2026-08-23T12:00:00Z') + i * 86400000).toISOString().slice(0, 10);
    db.prepare('INSERT INTO weight_log (date, time, weight_kg) VALUES (?, ?, ?)').run(d, '07:00:00', Math.round((71.5 - i * 0.1) * 10) / 10);
  }
  db.prepare("INSERT INTO exercise_log (date, exercise_type, duration_minutes, calories_burned, category) VALUES ('2026-09-10', '跑步', 30, 300, '有氧')").run();
  db.prepare("INSERT INTO exercise_log (date, exercise_type, duration_minutes, calories_burned, category) VALUES ('2026-09-12', '卧推', 40, 200, '力量')").run();
  for (const [d, pct, waist] of [['2026-09-05', 19.5, 85], ['2026-09-12', 19.2, 84.5], ['2026-09-19', 18.9, 84]]) {
    db.prepare('INSERT INTO body_composition (date, source, body_fat_pct) VALUES (?, ?, ?)').run(d, 'home_caliper', pct);
    db.prepare('INSERT INTO body_measurements (date, waist_cm, hip_cm) VALUES (?, ?, ?)').run(d, waist, 95);
  }
}

test('#103 G2：predict／goal-predict 缺省调用可达（默认 14 天窗）', () => {
  const db = tmpDb();
  seedFull(db);
  // 文档默认调用：无 params。latestFoodDate=2026-09-20 → 默认窗 2026-09-07~2026-09-20（14 天，14 条体重记录）。
  const pr = dispatchRead('calorie.view.predict', {}, db);
  assert.equal(pr.data.metrics.horizonDays, 30);
  assert.ok(typeof pr.data.metrics.forecastValue === 'number');
  const gp = dispatchRead('calorie.view.goal-predict', {}, db);
  assert.equal(gp.data.metrics.targetKg, 68);
  assert.ok(typeof gp.data.metrics.daysLeft === 'number');
  db.close();
});

test('#103 G3：view.anomaly 23 kind 参数化（render 层逐个可用）', () => {
  const db = tmpDb();
  seedFull(db);
  assert.equal(DIAGNOSE_KINDS.length, 23);
  for (const kind of DIAGNOSE_KINDS) {
    const v = buildAnomalyView(db, kind, '2026-09-01', '2026-09-20');
    assert.equal(v.kind, kind);
    assert.ok(Array.isArray(v.diagnosis.findings), kind + ' findings 非数组');
    assert.equal(v.findingCount, v.diagnosis.findings.length);
    const out = dispatchRead('calorie.view.anomaly', { kind, start: '2026-09-01', end: '2026-09-20' }, db);
    assert.equal(out.data.metrics.findingCount, v.findingCount);
  }
  assert.throws(() => buildAnomalyView(db, 'nope', '2026-09-01', '2026-09-20'), /未知诊断/);
  db.close();
});

test('#103 G4：view.combined window 白名单（拒 99d／未知值）', () => {
  const db = tmpDb();
  seedFull(db);
  assert.ok(COMBINED_WINDOWS.includes('7d') && COMBINED_WINDOWS.includes('custom'));
  for (const w of ['7d', '15d', '30d', '60d', '90d', '180d', '365d', 'week_cur', 'month_cur', 'custom']) {
    const [s, e] = resolveWindow(w, null, null, '2026-09-20');
    assert.ok(s <= e, w + ' 窗口倒置');
  }
  assert.throws(() => resolveWindow('99d', null, null, '2026-09-20'), /window 非法/);
  assert.throws(() => resolveWindow('45d', null, null, '2026-09-20'), /window 非法/);
  assert.throws(() => resolveWindow('bogus', null, null, '2026-09-20'), /window 非法/);
  const bad = (fn) => {
    try { fn(); } catch (e) { return e; }
    assert.fail('应抛 bad-input');
  };
  assert.equal(bad(() => dispatchRead('calorie.view.combined', { pair: 'weight_calorie', window: '99d' }, db)).code, 'bad-input');
  assert.equal(bad(() => dispatchRead('calorie.view.combined', { pair: 'weight_calorie', window: 'bogus' }, db)).code, 'bad-input');
  assert.ok(bad(() => dispatchRead('calorie.view.combined', { pair: 'weight_calorie', window: '99d' }, db)) instanceof CalorieRenderError);
  // 白名单内仍可用：默认 7d 与具名窗。
  const ok7 = dispatchRead('calorie.view.combined', { pair: 'weight_calorie', window: '7d' }, db);
  assert.ok(typeof ok7.data.metrics.aCount === 'number');
  const okm = dispatchRead('calorie.view.combined', { pair: 'weight_calorie', window: 'month_cur' }, db);
  assert.ok(typeof okm.data.metrics.aCount === 'number');
  db.close();
});
