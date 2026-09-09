/** #42 · combos 补登记 #41 的 18 新读键：CALORIE_COMBOS 全量 ⊆ combos.yaml 注册 + skilllink read 逐键 exit 0。
 * 纯配置票回归门：实现侧新增读键而登记漏了就地挂；只读 combos.yaml 与生成物，不碰技能实现。
 * tmp 隔离（SKILLS_DB_PATH 指临时目录种子库），真实 DB 零触碰；严格串行 spawn（沿 #41 调查结论，
 * Windows 并行 spawn 配额抖动）。种子与 packages/skill-calorie/test/cli-smoke-t41.test.mjs seedFull 同构
 * （测试文件间不互 import，避免重复注册用例）。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CALORIE_COMBOS } from '../packages/skill-calorie/dist/cli/keys.js';
import { PRESENT_KEYS } from '../packages/base-combos/dist/index.js';
import { openDb } from '../packages/skill-calorie/dist/index.js';
import { DB_FILENAME } from '../packages/skill-calorie/dist/paths.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const skilllink = join(root, 'tooling/skilllink.mjs');
const yamlPath = join(root, 'packages/base-combos/combos.yaml');

// P9 冻结子集解析（与 tooling/skilllink.mjs loadCombosTable 同构，只读 combos 段）。
function loadCombos() {
  const text = readFileSync(yamlPath, 'utf8');
  const rows = [];
  let cur = null;
  let sec = '';
  for (const ln of text.replace(/\r\n/g, '\n').split('\n')) {
    if (/^\s*#/.test(ln) || /^\s*$/.test(ln)) continue;
    const m = ln.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*$/);
    if (m) { sec = m[1]; cur = null; continue; }
    if (sec !== 'combos') continue;
    let e = ln.match(/^  - key: (\S+)\s*$/);
    if (e) { cur = { key: e[1] }; rows.push(cur); continue; }
    e = ln.match(/^    (skill|shape|title|cmd): (.+?)\s*$/);
    if (e && cur) { cur[e[1]] = e[2]; continue; }
    throw new Error('冻结格式外行：' + JSON.stringify(ln));
  }
  return rows;
}

// 真 node 定位（沿 test/skilllink.test.mjs 范式）：npm_node_execpath（pnpm 下）→ PATH 之 node →
// execPath；逐个 --version 探测，防 Electron 冒充。
function nodeBin() {
  const cands = [process.env.npm_node_execpath, 'node', process.execPath].filter(Boolean);
  for (const c of cands) {
    try {
      const p = spawnSync(c, ['--version'], { encoding: 'utf8' });
      if (p.status === 0 && /^v\d+/.test((p.stdout || '').trim())) return c;
    } catch { /* 试下一个 */ }
  }
  return process.execPath;
}
const NODE = nodeBin();

const READ18 = [
  'calorie.view.weight',
  'calorie.view.weight-history',
  'calorie.view.weight-compare',
  'calorie.view.weight-review',
  'calorie.view.volatility',
  'calorie.view.body-composition',
  'calorie.view.body-measure',
  'calorie.view.plan',
  'calorie.view.plan-wizard',
  'calorie.view.exercise-goal',
  'calorie.view.goal-expiring',
  'calorie.view.goal-predict',
  'calorie.view.goal-vs-actual',
  'calorie.view.predict',
  'calorie.view.anomaly',
  'calorie.view.contraindication',
  'calorie.view.dedupe',
  'calorie.view.profile',
];

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

const WIZARD_PLAN = {
  config: { title: 't', start_date: '2026-09-01', user_level: '中手', available_equipment: ['瑜伽垫'] },
  weeks: [{ week_number: 1, days: [{ day_of_week: 1, sessions: [{ session_label: 'a', movements: [{ name: '俯卧撑', part: '胸', type: '力量', sets: [] }] }] }] }],
};

const CASES = new Map([
  ['calorie.view.weight', { start: '2026-09-01', end: '2026-09-07' }],
  ['calorie.view.weight-history', { days: 7 }],
  ['calorie.view.weight-compare', { start: '2026-09-01', end: '2026-09-07', compareStart: '2026-08-23', compareEnd: '2026-08-29' }],
  ['calorie.view.weight-review', { today: '2026-09-07' }],
  ['calorie.view.volatility', { start: '2026-08-23', end: '2026-09-07' }],
  ['calorie.view.body-composition', {}],
  ['calorie.view.body-measure', { metric: 'waist_cm' }],
  ['calorie.view.plan', {}],
  ['calorie.view.plan-wizard', { plan: WIZARD_PLAN }],
  ['calorie.view.exercise-goal', { start: '2026-09-06', end: '2026-09-07' }],
  ['calorie.view.goal-expiring', { withinDays: 150, today: '2026-09-07' }],
  ['calorie.view.goal-predict', { start: '2026-08-23', end: '2026-09-07' }],
  ['calorie.view.goal-vs-actual', { start: '2026-09-05', end: '2026-09-07' }],
  ['calorie.view.predict', { start: '2026-08-23', end: '2026-09-07', horizonDays: 30 }],
  ['calorie.view.anomaly', { kind: 'diet_over', start: '2026-09-01', end: '2026-09-07' }],
  ['calorie.view.contraindication', { part: 'all' }],
  ['calorie.view.dedupe', {}],
  ['calorie.view.profile', {}],
]);

describe('#42 combos 补登记 18 新读键（skilllink 可读）', () => {
  it('CALORIE_COMBOS 全量 ⊆ combos.yaml（形状/标题/出口逐键对齐，漏登记即挂）', () => {
    const rows = loadCombos();
    const byKey = new Map(rows.map((r) => [r.key, r]));
    assert.equal(Object.keys(CALORIE_COMBOS).length, 83);
    assert.equal(READ18.length, 18);
    for (const [key, meta] of Object.entries(CALORIE_COMBOS)) {
      const hit = byKey.get(key);
      assert.ok(hit, 'combos.yaml 漏登记：' + key);
      assert.equal(hit.skill, 'calorie', key);
      assert.equal(hit.shape, meta.shape, key + ' 形状与键表不一致');
      assert.equal(hit.title, meta.title, key + ' 标题与键表不一致');
      assert.equal(hit.cmd, 'skill-calorie', key + ' 出口须为 skill-calorie');
    }
    for (const k of READ18) assert.ok(PRESENT_KEYS.includes(k), 'present.ts 缺键：' + k);
  });
  it('skilllink read 18 新键逐键 exit 0（tmp 隔离种子库，真实 DB 零触碰）', () => {
    const dir = mkdtempSync(join(tmpdir(), 'c42-'));
    const db = openDb(join(dir, DB_FILENAME));
    seedFull(db);
    db.close();
    let pass = 0;
    for (const key of READ18) {
      const r = spawnSync(NODE, [skilllink, 'read', key, '--params', JSON.stringify(CASES.get(key))], {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, SKILLS_DB_PATH: dir },
      });
      assert.equal(r.status, 0, key + ' exit=' + r.status + ' stderr=' + String(r.stderr || '').slice(0, 300));
      const env = JSON.parse(String(r.stdout));
      assert.equal(env.key, key);
      assert.equal(env.shape, 'stat', key + ' 非 stat');
      pass += 1;
    }
    assert.equal(pass, 18);
  });
});
