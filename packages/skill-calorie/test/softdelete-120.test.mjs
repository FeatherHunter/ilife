/** #120 · 软删记录不再计入统计 —— **用户可见面**口径回归（票面验收条）。

 * 背景（票面）：#101 实测软删一条运动后，回执说「已删除」，`view.exercise` 也 exit 4「无运动记录」，
 * 但 `view.home.deficitToday`／`view.deficit.avgExerciseBurn`／`buildSeries.exerciseKcal` 删前=删后
 * ——同一份数据一处说「没有」、另一处仍在算。根因＝`analysis/**` 11 处查询未过滤 `is_deleted`。
 *
 * 本票裁定（方向 1）：软删即不计入用户可见统计；11 处统一走 `analysis/utils.ts:EX_ALIVE`
 * （`COALESCE(is_deleted, 0) = 0`，与 fetch 层 `listWindow` 同口径）。
 *
 * 与既有测试的分工：`cmd-write-40-persist.test.mjs` 的 :640 断言的是**修复前**口径（删前=删后），
 * 本份补上「用户可见面」的**修复后**口径：
 *   ① 逐面断言（view.exercise／view.home／view.deficit／view.health／buildSeries）；
 *   ② 跨面一致（home.deficitToday ＝ buildSeries.deficit ＝ health.avgDeficit 等）；
 *   ③ 11 处查询逐处直调断言（每处唯一可观测面）；
 *   ④ 过度过滤护栏（`is_deleted IS NULL` 的活行必须仍被计入；硬删表不受影响）。
 *
 * 运行：先 `pnpm build`，再 `node --test packages/skill-calorie/test/softdelete-120.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { openDbReadOnly } from '../dist/db/readonly.js';
import { buildSeries, seriesAvg } from '../dist/analysis/series.js';
import { exerciseTrend, exerciseTypeBreakdown, exerciseDeficitContribution, exerciseReview } from '../dist/analysis/exercise.js';
import { query5dims } from '../dist/analysis/review.js';
import { dietDeficitAnalysis } from '../dist/analysis/diet.js';
import { analyzePair } from '../dist/analysis/cross.js';
import { exerciseRows } from '../dist/analysis/anomaly/common.js';
import { scenarioC5 } from '../dist/analysis/weightCompare3.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';

const DAY = '2026-09-05';
const PREV = '2026-08-05';
const DAY_ROWS = [
  { type: '跑步', calories: 250, minutes: 30, category: '有氧' },
  { type: '卧推', calories: 100, minutes: 20, category: '力量', reps: 10, loadKg: 60 },
];
const DAY_TOTAL = 350;

const run = (key, params, dir) =>
  spawnSync(NODE_BIN, [BIN, key, '--params', JSON.stringify(params)], { encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir } });

function runOk(dir, key, params) {
  const r = run(key, params, dir);
  assert.equal(r.status, 0, key + ' exit ' + r.status + ' stderr=' + (r.stderr || '').slice(-600));
  return JSON.parse(r.stdout).data;
}

function runView(dir, key, params) {
  const r = run(key, params, dir);
  assert.equal(r.status, 0, key + ' exit ' + r.status + ' stderr=' + (r.stderr || '').slice(-600));
  return JSON.parse(r.stdout).data;
}

const withRead = (dir, fn) => {
  const db = openDbReadOnly(join(dir, 'calorie_data.db'));
  try { return fn(db); } finally { db.close(); }
};

/** 播种子：当日两行运动（有氧 250 ＋ 力量 100）＋ 上个月 500（scenarioC5 需 ≥2 个月）＋ 体重。 */
function mkEnv() {
  const dir = mkdtempSync(join(tmpdir(), 'sd120-'));
  runOk(dir, 'calorie.profile.set', { heightCm: 175, age: 30, gender: '男', activityLevel: '中度' });
  runOk(dir, 'calorie.goal.set', { calorie: 1800, protein: 150, carbs: 200, fat: 50, water: 2000 });
  runOk(dir, 'calorie.diet.add', { foodName: '米饭', calories: 500, protein: 10, date: DAY });
  runOk(dir, 'calorie.diet.add', { foodName: '米饭', calories: 500, protein: 10, date: PREV });
  runOk(dir, 'calorie.exercise.add', { type: '椭圆机', calories: 500, minutes: 45, date: PREV });
  const ids = DAY_ROWS.map((r) => runOk(dir, 'calorie.exercise.add', { ...r, date: DAY }).receipt.recordId);
  for (const [d, kg] of [['2026-08-10', 70.5], ['2026-08-25', 70.2], ['2026-09-01', 69.9], ['2026-09-04', 69.6]]) {
    runOk(dir, 'calorie.weight.log', { kg, date: d });
  }
  return { dir, ids };
}

/** 用户可见面快照（票面点名的四键 ＋ buildSeries）。 */
function faces(dir) {
  return {
    home: runView(dir, 'calorie.view.home', { date: DAY }).metrics.deficitToday,
    deficit: runView(dir, 'calorie.view.deficit', { start: DAY, end: DAY }).metrics.avgExerciseBurn,
    health: runView(dir, 'calorie.view.health', { start: DAY, end: DAY }).metrics.avgDeficit,
    seriesEx: withRead(dir, (db) => buildSeries(db, DAY, DAY)[0].exerciseKcal),
    seriesDeficit: withRead(dir, (db) => buildSeries(db, DAY, DAY)[0].deficit),
    viewExerciseExit: run('calorie.view.exercise', { start: DAY, end: DAY }, dir).status,
  };
}

test('120 · 软删运动后 view.exercise／view.home／view.deficit／view.health／buildSeries 口径一致（全排除）', () => {
  const { dir, ids } = mkEnv();
  const before = faces(dir);
  assert.equal(before.seriesEx, DAY_TOTAL, '前置：当日运动应为 ' + DAY_TOTAL + ' 卡');
  assert.equal(before.viewExerciseExit, 0, '前置：未软删时 view.exercise 应 exit 0');

  const msg = runOk(dir, 'calorie.exercise.remove', { id: ids[0] }).message;
  assert.ok(typeof msg === 'string' && msg.length > 0, '删除应返回回执文案');
  runOk(dir, 'calorie.exercise.remove', { id: ids[1] });
  const after = faces(dir);

  // ① 用户可见面：软删即不计入
  assert.equal(after.seriesEx, null, 'buildSeries.exerciseKcal 应排除软删行');
  assert.equal(after.deficit, 0, 'view.deficit.avgExerciseBurn 应排除软删行');
  assert.equal(after.home, before.home - DAY_TOTAL, 'view.home.deficitToday 应减少当日运动消耗');
  assert.equal(after.health, after.home, 'view.health.avgDeficit 应与 view.home.deficitToday 同口径');
  assert.equal(after.seriesDeficit, after.home, 'buildSeries.deficit 应与 view.home.deficitToday 同口径');
  assert.equal(after.deficit, seriesAvgAfter(dir), 'view.deficit.avgExerciseBurn 应等于 seriesAvg(exerciseKcal)');

  // ② 列表侧口径不变（fetch listWindow 早已过滤）
  assert.equal(after.viewExerciseExit, 4, 'view.exercise 应仍报缺失（列表侧口径未变）');
});

function seriesAvgAfter(dir) {
  return withRead(dir, (db) => seriesAvg(buildSeries(db, DAY, DAY), 'exerciseKcal') ?? 0);
}

test('120 · analysis 11 处查询逐处排除软删行（每处唯一可观测面）', () => {
  const { dir, ids } = mkEnv();
  const snap = () => withRead(dir, (db) => {
    const series = buildSeries(db, DAY, DAY);
    const trend = exerciseTrend(db, DAY, DAY);
    const breakdown = exerciseTypeBreakdown(db, DAY, DAY);
    const contrib = exerciseDeficitContribution(db, DAY, DAY);
    const review = exerciseReview(db, DAY, DAY);
    const dims = query5dims(db, DAY, DAY);
    const dietDef = dietDeficitAnalysis(db, DAY, DAY);
    const pair = analyzePair(series, 'weight_exercise', db, '30d');
    let c5;
    try { c5 = scenarioC5(db).segA.label; } catch (e) { c5 = String(e.message); }
    return {
      seriesEx: series[0].exerciseKcal,
      trend: trend.status,
      breakdown: breakdown.status,
      contrib: contrib.data ? contrib.data.exerciseDeficit : null,
      reviewKcal: review.data && review.data.__meta__ ? review.data.__meta__.totalCalories : null,
      reviewSets: review.data ? Object.values(review.data).filter((v) => v && v.date === DAY).reduce((a, v) => a + v.actualTotalSets, 0) : null,
      dailyBurn: dims.dailyBurn.length,
      dietDef: dietDef.data ? dietDef.data.avgExerciseBurn : null,
      cross: String(pair.strat.extra.find((x) => String(x).indexOf('力量消耗合计') === 0)),
      rows: exerciseRows(db, DAY, DAY).length,
      c5,
    };
  });
  const before = snap();
  assert.equal(before.seriesEx, DAY_TOTAL, '前置 series');
  assert.equal(before.rows, 2, '前置 exerciseRows');
  assert.equal(before.cross, '力量消耗合计 100 卡 vs 有氧 250 卡', '前置 力量/有氧 分层');

  for (const id of ids) runOk(dir, 'calorie.exercise.remove', { id });
  const after = snap();

  assert.equal(after.seriesEx, null, 'series.ts:113 · buildSeries.exerciseKcal');
  assert.equal(after.trend, 'error', 'exercise.ts:45 · exerciseTrend 应转明确缺失阻断');
  assert.equal(after.breakdown, 'error', 'exercise.ts:86 · exerciseTypeBreakdown 应转明确缺失阻断');
  assert.equal(after.contrib, 0, 'exercise.ts:109 · exerciseDeficitContribution.exerciseDeficit');
  assert.equal(after.reviewKcal, 0, 'exercise.ts:227 · exerciseReview.__meta__.totalCalories');
  assert.equal(after.reviewSets, 0, 'exercise.ts:227 · exerciseReview 当日 actualTotalSets');
  assert.equal(after.dailyBurn, 0, 'review.ts:69 · query5dims.dailyBurn');
  assert.equal(after.dietDef, 0, 'diet.ts:162 · dietDeficitAnalysis.avgExerciseBurn');
  assert.equal(after.cross, '力量消耗合计 0 卡 vs 有氧 0 卡', 'cross.ts:107-108 · 力量/有氧分层');
  assert.equal(after.rows, 0, 'anomaly/common.ts:84 · exerciseRows');
  assert.equal(after.c5, '数据不足(需至少 2 个月有运动记录)', 'weightCompare3.ts:68 · scenarioC5 只剩 1 个月');
});

test('120 · 过度过滤护栏：is_deleted 为 NULL 的活行仍计入（谓词必须 COALESCE）', () => {
  const { dir } = mkEnv();
  const db = openDb(join(dir, 'calorie_data.db'));
  try {
    db.prepare("INSERT INTO exercise_log (date, time, exercise_type, calories_burned, is_deleted) VALUES ('2026-09-06', '07:00:00', '游泳', 120, NULL)").run();
    db.prepare("INSERT INTO exercise_log (date, time, exercise_type, calories_burned, is_deleted) VALUES ('2026-09-06', '08:00:00', '划船', 30, 0)").run();
  } finally { db.close(); }
  const kcal = withRead(dir, (b) => buildSeries(b, '2026-09-06', '2026-09-06')[0].exerciseKcal);
  assert.equal(kcal, 150, 'is_deleted IS NULL / =0 的活行都应计入（写死 is_deleted = 0 会漏 NULL）');
  const rows = withRead(dir, (b) => exerciseRows(b, '2026-09-06', '2026-09-06').length);
  assert.equal(rows, 2, 'anomaly/common.ts 同样不得漏 NULL 活行');
});

test('120 · 硬删表不受影响（回归护栏）：food_log／weight_log 删后口径不变', () => {
  const { dir } = mkEnv();
  const intake = () => withRead(dir, (db) => buildSeries(db, DAY, DAY)[0].calories);
  const weight = () => withRead(dir, (db) => buildSeries(db, DAY, DAY)[0].weightKg);
  assert.equal(intake(), 500, '前置：当日摄入');
  assert.equal(weight(), null, '前置：当日无体重');
  const foodId = withRead(dir, (db) => db.prepare("SELECT id FROM food_log WHERE date = ?").get(DAY).id);
  runOk(dir, 'calorie.diet.remove', { id: foodId });
  runOk(dir, 'calorie.weight.log', { kg: 69.0, date: DAY });
  assert.equal(intake(), null, '硬删 food_log 后当日摄入应为空');
  assert.equal(weight(), 69.0, '新记体重应可见（软删谓词不得误伤硬删表）');
});
