/** #463 · 档案 TDEE 恒用 70.0 kg 常量（并入 #518 兑现）：按候选 A——**档案给最近体重，缺则回退 70.0**。
 *
 * 判据（编排者 2026-09-15 裁定逐字）：
 *   ① 无体重记录时数值与改前**逐字相同**（回退行为不变）；
 *   ② 有体重记录（如 75.1 kg）时 TDEE 用真实体重（`2556 → 2635` 量级，允许 ±2 舍入）；
 *   ③ 缺口页「日均消耗 ＝ 静态 TDEE ＋ 运动」这条口径式**恒成立**。
 *
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`，再 node --test 本件。
 */
import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { loadProfileTdee } from '../dist/analysis/series.js';
import { calcTdee } from '../dist/analysis/utils.js';
import { buildDeficitPlate } from '../dist/render/analysisPlate.js';
import { configTestBase } from './helpers/config-test.mjs';

// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

/** 与地图 #161 的种子库同形：30 岁／男／175 cm／moderate；`withWeight` 决定有没有称重记录。 */
function mkDb(withWeight, lastWeight = 75.1) {
  const dir = mkdtempSync(join(tmpdir(), 't463-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, 'male', 175, 'moderate')").run();
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal, goal_deadline) VALUES (1, 1800, 150, 200, 50, 2000, 68.0, NULL)').run();
  for (let i = 0; i < 30; i++) {
    const d = new Date(Date.parse('2026-08-17T12:00:00Z') + i * 86400000).toISOString().slice(0, 10);
    db.prepare('INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(d, '12:00:00', '米饭', 300, 1800, 90, 200, 60);
    if (withWeight) {
      const w = i === 29 ? lastWeight : Math.round((78.0 - (29 - i) * 0.05) * 10) / 10;
      db.prepare('INSERT INTO weight_log (date, time, weight_kg) VALUES (?, ?, ?)').run(d, '07:00:00', w);
    }
  }
  db.prepare("INSERT INTO exercise_log (date, time, exercise_type, duration_minutes, calories_burned, category) VALUES ('2026-09-10', '07:30:00', '慢跑', 30, 300, '有氧')").run();
  return { db, dir };
}

test('#463 ① 档案没有体重记录 ⇒ 逐字回退 70.0（改前行为不变）', () => {
  const { db, dir } = mkDb(false);
  try {
    const want = calcTdee(70.0, 175, 30, 'male', 'moderate');
    assert.equal(loadProfileTdee(db), want, '回退值必须与改前逐字相同');
    assert.equal(want, 2556, '70.0 kg 档的 TDEE 基准值（票面写 2555／2556 同一量级）');
  } finally { db.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('#463 ② 档案有 75.1 kg 称重 ⇒ TDEE 走真实体重（2556 → 2635 量级，±2）', () => {
  const { db, dir } = mkDb(true, 75.1);
  try {
    const got = loadProfileTdee(db);
    assert.equal(got, calcTdee(75.1, 175, 30, 'male', 'moderate'), 'TDEE 必须用最近一次称重的体重');
    assert.ok(Math.abs(got - 2635) <= 2, '75.1 kg 档应落在 2635 量级（±2），实得 ' + got);
    assert.notEqual(got, 2556, '有体重记录时不许还走 70.0 常量');
  } finally { db.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('#463 ②b 「最近称重」取的是最后一条，不是第一条／最大值', () => {
  const { db, dir } = mkDb(true, 75.1);
  try {
    db.prepare("INSERT INTO weight_log (date, time, weight_kg) VALUES ('2026-09-16', '07:00:00', 74.4)").run();
    assert.equal(loadProfileTdee(db), calcTdee(74.4, 175, 30, 'male', 'moderate'), '后补的最新一条必须生效');
  } finally { db.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('#463 ③ 缺口页口径式恒成立：日均消耗 ＝ 静态 TDEE ＋ 运动', () => {
  const { db, dir } = mkDb(true, 75.1);
  try {
    const d = buildDeficitPlate(db, '2026-08-17', '2026-09-15');
    const left = d.summary.avgBurn;
    const right = d.target.tdee + d.summary.avgExerciseBurn;
    assert.ok(Math.abs(left - right) <= 1,
      '日均消耗（' + left + '）必须等于静态 TDEE（' + d.target.tdee + '）加运动（' + d.summary.avgExerciseBurn + '）±1 舍入');
    assert.equal(d.target.tdee, loadProfileTdee(db), '缺口页的 TDEE 与档案 TDEE 必须同一个数');
  } finally { db.close(); rmSync(dir, { recursive: true, force: true }); }
});
