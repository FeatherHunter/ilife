#!/usr/bin/env node
/** #120 · 软删记录仍计入统计 —— analysis 层 11 处查询逐处复算探针（断言式，可复跑）。
 *
 * 票面 11 处（全部未过滤 `exercise_log.is_deleted`）：
 *   series.ts:113 · exercise.ts:45,86,109,227 · review.ts:69 · diet.ts:162 ·
 *   cross.ts:107-108 · anomaly/common.ts:84 · weightCompare3.ts:68。
 * 口径（编排者裁定 · 方向 1）：软删即不计入用户可见统计（软删表 `exercise_log.is_deleted`）。
 *
 * 做法：临时库播固定种子 → 快照各面 → 逐条软删当日运动（走 CLI 写键，与用户操作同路径）→
 *   再快照 → 断言「软删后逐面一致排除」：
 *   ① 逐处断言（11 条）：每处查询各自的**唯一可观测面**在软删后必须排除该行；
 *   ② 用户可见面断言（7 条）：view.exercise／view.home／view.deficit／view.health／
 *      view.combined／view.anomaly 与 buildSeries 口径一致（票面验收条）；
 *   ③ 一致性锚点：home.deficitToday ＝ buildSeries.deficit ＝ health.avgDeficit，
 *      deficit.avgExerciseBurn ＝ seriesAvg(exerciseKcal)。
 *
 * 用法（先 `pnpm build`；本脚本只读写自己 mkdtemp 出来的临时库，不碰工作区数据，不写仓内文件）：
 *   node docs/research/t120-probe-softdelete.mjs
 * 退出码：0 = RESULT: 11/11（且用户可见面一致）；1 = 仍有未过滤处（逐条打印 expected/actual）。
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDbReadOnly } from '../../packages/skill-calorie/dist/db/readonly.js';
import { buildSeries, seriesAvg } from '../../packages/skill-calorie/dist/analysis/series.js';
import { exerciseTrend, exerciseTypeBreakdown, exerciseDeficitContribution, exerciseReview } from '../../packages/skill-calorie/dist/analysis/exercise.js';
import { query5dims } from '../../packages/skill-calorie/dist/analysis/review.js';
import { dietDeficitAnalysis } from '../../packages/skill-calorie/dist/analysis/diet.js';
import { analyzePair } from '../../packages/skill-calorie/dist/analysis/cross.js';
import { exerciseRows } from '../../packages/skill-calorie/dist/analysis/anomaly/common.js';
import { scenarioC5 } from '../../packages/skill-calorie/dist/analysis/weightCompare3.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BIN = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');

// ---- 固定种子（日期全部显式，不依赖系统当前日） ----
const DAY = '2026-09-05';        // 被软删的当天
const PREV = '2026-08-05';       // 另一个月的运动（scenarioC5 需 ≥2 个月）
const DAY_ROWS = [               // 当天两行：有氧 250 ＋ 力量 100 ＝ 350 卡
  { type: '跑步', calories: 250, minutes: 30, category: '有氧' },
  { type: '卧推', calories: 100, minutes: 20, category: '力量', reps: 10, loadKg: 60 },
];
const DAY_TOTAL = 350;
const PREV_TOTAL = 500;
const C5_NO_DATA = '数据不足(需至少 2 个月有运动记录)';

const dir = mkdtempSync(join(tmpdir(), 't120-probe-'));
const env = { ...process.env, SKILLS_DB_PATH: dir };

const cli = (key, params) => spawnSync(process.execPath, [BIN, key, '--params', JSON.stringify(params)], { encoding: 'utf8', env });
function ok(key, params) {
  const r = cli(key, params);
  if (r.status !== 0) throw new Error(key + ' exit ' + r.status + ' stderr=' + (r.stderr || '').slice(-400));
  return JSON.parse(r.stdout).data;
}
const withDb = (fn) => {
  const db = openDbReadOnly(join(dir, 'calorie_data.db'));
  try { return fn(db); } finally { db.close(); }
};

// ---- 播种 ----
ok('calorie.profile.set', { heightCm: 175, age: 30, gender: '男', activityLevel: '中度' });
ok('calorie.goal.set', { calorie: 1800, protein: 150, carbs: 200, fat: 50, water: 2000 });
ok('calorie.diet.add', { foodName: '米饭', calories: 500, protein: 10, date: DAY });
ok('calorie.diet.add', { foodName: '米饭', calories: 500, protein: 10, date: PREV });
ok('calorie.exercise.add', { type: '椭圆机', calories: PREV_TOTAL, minutes: 45, date: PREV });
const dayIds = DAY_ROWS.map((r) => ok('calorie.exercise.add', { ...r, date: DAY }).receipt.recordId);
for (const [d, kg] of [['2026-08-10', 70.5], ['2026-08-25', 70.2], ['2026-09-01', 69.9], ['2026-09-04', 69.6]]) {
  ok('calorie.weight.log', { kg, date: d });
}

// ---- 快照：11 处逐处唯一可观测面 ＋ 用户可见面 ----
function snapshot() {
  return withDb((db) => {
    const daySeries = buildSeries(db, DAY, DAY);
    const trend = exerciseTrend(db, DAY, DAY);
    const breakdown = exerciseTypeBreakdown(db, DAY, DAY);
    const contrib = exerciseDeficitContribution(db, DAY, DAY);
    const review = exerciseReview(db, DAY, DAY);
    const dims = query5dims(db, DAY, DAY);
    const dietDef = dietDeficitAnalysis(db, DAY, DAY);
    const pair = analyzePair(daySeries, 'weight_exercise', db, '30d');
    const exRows = exerciseRows(db, DAY, DAY);
    let c5;
    try { c5 = scenarioC5(db).segA.label; } catch (e) { c5 = String(e.message); }
    const strengthLine = pair.strat.extra.find((x) => String(x).indexOf('力量消耗合计') === 0);
    const anomaly = cli('calorie.view.anomaly', { kind: 'exercise_type_imbalance', start: DAY, end: DAY });
    return {
      s_series: daySeries[0].exerciseKcal,
      s_deficit: daySeries[0].deficit,
      s_trend: trend.status,
      s_breakdown: breakdown.status,
      s_contrib: contrib.data ? contrib.data.exerciseDeficit : null,
      s_review: review.data && review.data.__meta__ ? review.data.__meta__.totalCalories : null,
      s_review_sets: review.data ? Object.values(review.data).filter((v) => v && v.date === DAY).reduce((a, v) => a + v.actualTotalSets, 0) : null,
      s_5dims: dims.dailyBurn.length,
      s_dietdef: dietDef.data ? dietDef.data.avgExerciseBurn : null,
      s_cross: strengthLine ? String(strengthLine) : null,
      s_rows: exRows.length,
      s_c5: c5,
      c_home: ok('calorie.view.home', { date: DAY }).metrics.deficitToday,
      c_deficit: ok('calorie.view.deficit', { start: DAY, end: DAY }).metrics.avgExerciseBurn,
      c_health: ok('calorie.view.health', { start: DAY, end: DAY }).metrics.avgDeficit,
      c_combined: ok('calorie.view.combined', { pair: 'weight_exercise', window: '30d', today: DAY }).metrics.bCount,
      c_anomaly: anomaly.status,
      c_anomaly_msg: anomaly.status === 0 ? 'exit 0' : (anomaly.stderr || '').trim().split('\n')[0],
      c_view_exercise: cli('calorie.view.exercise', { start: DAY, end: DAY }).status,
      c_series_avg: seriesAvg(daySeries, 'exerciseKcal'),
    };
  });
}

const before = snapshot();

// ---- 逐条软删当天运动（CLI 写键，与用户操作同路径） ----
const delMsgs = dayIds.map((id) => ok('calorie.exercise.remove', { id }).message);
const after = snapshot();

// ---- 断言表 ----
const T = [];
const add = (site, key, probe, expect, okFlag) => T.push({ site, key, probe, expect, before: before[key], got: after[key], ok: okFlag });
const eq = (site, key, probe, expect) => add(site, key, probe, expect, after[key] === expect);

// ① 11 处逐处
eq('series.ts:113', 's_series', 'buildSeries(DAY,DAY)[0].exerciseKcal', null);
eq('exercise.ts:45', 's_trend', 'exerciseTrend(DAY,DAY).status', 'error');
eq('exercise.ts:86', 's_breakdown', 'exerciseTypeBreakdown(DAY,DAY).status', 'error');
eq('exercise.ts:109', 's_contrib', 'exerciseDeficitContribution(DAY,DAY).data.exerciseDeficit', 0);
eq('exercise.ts:227', 's_review', 'exerciseReview(DAY,DAY).__meta__.totalCalories', 0);
eq('exercise.ts:227', 's_review_sets', 'exerciseReview(DAY,DAY) 当日 actualTotalSets', 0);
eq('review.ts:69', 's_5dims', 'query5dims(DAY,DAY).dailyBurn.length', 0);
eq('diet.ts:162', 's_dietdef', 'dietDeficitAnalysis(DAY,DAY).data.avgExerciseBurn', 0);
eq('cross.ts:107-108', 's_cross', "analyzePair(weight_exercise).strat.extra 力量/有氧行", '力量消耗合计 0 卡 vs 有氧 0 卡');
eq('anomaly/common.ts:84', 's_rows', 'exerciseRows(DAY,DAY).length', 0);
eq('weightCompare3.ts:68', 's_c5', 'scenarioC5(db) 只剩 1 个月 → 明确缺失阻断', C5_NO_DATA);

// ② 用户可见面（票面验收条）
eq('CLI · view.exercise', 'c_view_exercise', 'exit（列表侧已排除，前后同值）', 4);
eq('CLI · view.deficit', 'c_deficit', 'metrics.avgExerciseBurn', 0);
eq('CLI · view.combined', 'c_combined', 'metrics.bCount（weight_exercise）', 0);
eq('CLI · view.anomaly', 'c_anomaly', 'exit（exercise_type_imbalance 无运动即缺失阻断）', 4);
add('CLI · view.anomaly', 'c_anomaly_msg', '缺失阻断文案含「无运动记录」', '含', after.c_anomaly_msg.indexOf('无运动记录') >= 0);
add('CLI · view.home', 'c_home', 'deficitToday ＝ 软删前 − ' + DAY_TOTAL + '（＝buildSeries.deficit）', before.c_home - DAY_TOTAL, after.c_home === before.c_home - DAY_TOTAL);
add('CLI · 跨面一致', 'c_health', 'health.avgDeficit ＝ home.deficitToday', after.c_home, after.c_health === after.c_home);
add('CLI · 跨面一致', 'c_deficit', 'deficit.avgExerciseBurn ＝ seriesAvg(exerciseKcal)（全空时 CLI 归 0）', after.c_series_avg ?? 0, after.c_deficit === (after.c_series_avg ?? 0));
add('CLI · 跨面一致', 'c_home', 'home.deficitToday ＝ buildSeries.deficit', after.s_deficit, after.c_home === after.s_deficit);

// ---- 报告 ----
console.log('软删回执：' + delMsgs.join(' | '));
console.log('');
console.log('| 处 | 观测点 | 软删前 | 软删后 | 期望 | 达标 |');
console.log('| --- | --- | --- | --- | --- | --- |');
for (const t of T) {
  console.log('| ' + t.site + ' | ' + t.probe + ' | ' + String(t.before) + ' | ' + String(t.got) + ' | ' + String(t.expect) + ' | ' + (t.ok ? '是' : '否') + ' |');
}
const sites = T.filter((t) => t.site.indexOf('CLI') !== 0);
const badSites = sites.filter((t) => !t.ok);
const badAll = T.filter((t) => !t.ok);
console.log('');
console.log('软删前后：series.exerciseKcal ' + before.s_series + ' → ' + after.s_series +
  '；home.deficitToday ' + before.c_home + ' → ' + after.c_home +
  '；deficit.avgExerciseBurn ' + before.c_deficit + ' → ' + after.c_deficit +
  '；exerciseRows ' + before.s_rows + ' → ' + after.s_rows +
  '；scenarioC5 ' + before.s_c5 + ' → ' + after.s_c5);
console.log('RESULT: ' + (sites.length - badSites.length) + '/' + sites.length);
console.log('RESULT-ALL: ' + (T.length - badAll.length) + '/' + T.length);
if (badAll.length) {
  console.error('未过滤/不一致明细：');
  for (const t of badAll) console.error('  ✖ ' + t.site + ' · ' + t.probe + ' 期望=' + String(t.expect) + ' 实际=' + String(t.got));
  process.exit(1);
}
