/** #455 · 轨迹末点口径（并入 #518 兑现）：**非整周 horizon 补第 horizon 天末点** ＋ 修日期／值错位。
 *
 * 判据（编排者 2026-09-15 裁定逐字）：
 *   ① `horizon=90` 的模拟轨迹必须出现第 90 天那一行（末点存在）；
 *   ② 末行日期与值同轴（`75.1 − 6 = 69.1` 落在第 90 天那一行，第 84 天那一行是诚实值 `69.5`）；
 *   ③ 整周 horizon（如 84）的行为不变——不产生重复日期、不多出行。
 * 另加一条同源回归：`forecastSeries`（体重预测族 01–05 的采样器）同样补末点，
 * 否则结论句里的「`<N> 天后体重约 X kg`」拿的是第 `N−余数` 天的值（30 天页给的是第 28 天的值）。
 *
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`，再 node --test 本件。
 */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { shiftISODate } from '../dist/analysis/utils.js';
import { weightForecast } from '../dist/analysis/simulate.js';
import { weightSimCut, weightSimTarget } from '../dist/analysis/simulate2.js';
import { buildSimTargetDoc } from '../dist/render/trendPredictDocs.js';
import { configTestBase } from './helpers/config-test.mjs';

// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const START = '2026-06-18';
const LAST_WEIGHT = 75.1;

/** 90 天合成日序列：**体重逐日下降**，末条 75.1 kg（与票面实例同值），隔日一次运动。 */
function mkSeries(n = 90) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const ex = i % 2 === 0 ? 300 : null;
    out.push({
      date: shiftISODate(START, i),
      calories: 1800, protein: 90, carbs: 200, fat: 60,
      sodiumMg: null, sugarG: null, fiberG: null, waterMl: null,
      exerciseKcal: ex,
      weightKg: i === n - 1 ? LAST_WEIGHT : Math.round((LAST_WEIGHT + (n - 1 - i) * 0.05) * 10) / 10,
      bodyFatPct: null, waistCm: null,
      tdee: 2635, deficit: 1800 + (ex ?? 0) - 1800, calorieGoal: 1800, waterGoal: 2000,
    });
  }
  return out;
}

const series = mkSeries();
/** 轨迹锚点＝`forecast.points[0].date`＝数据窗口最后一个有记录的日子（票面「口径认口」段逐字）。 */
const ANCHOR = series[series.length - 1].date;

test('#455 ① 非整周 horizon 补第 horizon 天末点（weightSimCut／weightSimTarget）', () => {
  const cut = weightSimCut(series, 500, '模拟减重');
  const cutPts = cut.forecast.points;
  assert.equal(cutPts[cutPts.length - 1].date, shiftISODate(ANCHOR, 90),
    '90 天模拟减重缺第 90 天那一行（末点日期=' + cutPts[cutPts.length - 1].date + '）');
  assert.equal(cutPts.length, 14, '90 天轨迹应为 1 起点 ＋ 12 整周点 ＋ 1 末点 ＝ 14 行');
  assert.equal(new Set(cutPts.map((p) => p.date)).size, cutPts.length, '末点不许与整周点重日期');

  const sim = weightSimTarget(series, 6, 90, '模拟减重');
  const pts = sim.forecast.points;
  assert.equal(pts[pts.length - 1].date, shiftISODate(ANCHOR, 90), '90 天减 Xkg 缺第 90 天那一行');
  assert.equal(pts.length, 14, '90 天轨迹应为 14 行');
});

test('#455 ② 末行日期与值同轴（69.1 在第 90 天，第 84 天是 69.5）', () => {
  const sim = weightSimTarget(series, 6, 90, '模拟减重');
  const pts = sim.forecast.points;
  const last = pts[pts.length - 1];
  const row84 = pts.find((p) => p.date === shiftISODate(ANCHOR, 84));
  assert.equal(last.value, 69.1, '第 90 天那一行应是 75.1 − 6 ＝ 69.1，实得 ' + last.value);
  assert.ok(row84, '缺第 84 天那一行');
  assert.equal(row84.value, 69.5, '第 84 天那一行的诚实值是 75.1 − 6×84/90 ＝ 69.5，实得 ' + row84.value);
});

test('#455 ③ 整周 horizon 行为不变（84 天：13 行、末点第 84 天、日期不重复）', () => {
  const r = weightSimTarget(series, 2.8, 84, '模拟减重');
  const pts = r.forecast.points;
  assert.equal(pts.length, 13, '84 天＝1 起点 ＋ 12 整周点，实得 ' + pts.length);
  assert.equal(pts[pts.length - 1].date, shiftISODate(ANCHOR, 84), '末点应是第 84 天');
  assert.equal(pts[pts.length - 1].value, 72.3, '末点值＝75.1 − 2.8 ＝ 72.3');
  assert.equal(new Set(pts.map((p) => p.date)).size, pts.length, '整周 horizon 不许补出重复点');
});

test('#455 ④ 同源回归：体重预测族采样器（forecastSeries）末点落在第 horizonDays 天', () => {
  for (const h of [7, 30, 60, 90, 180]) {
    const fc = weightForecast(series, h, '体重预测');
    const pts = fc.forecast.points;
    assert.equal(pts[pts.length - 1].date, shiftISODate(ANCHOR, h),
      h + ' 天页的末点日期应是第 ' + h + ' 天，实得 ' + pts[pts.length - 1].date);
    assert.equal(new Set(pts.map((p) => p.date)).size, pts.length, h + ' 天页出现重复日期（整周 horizon 不该补点）');
  }
  const w7 = weightForecast(series, 7, '体重预测');
  assert.equal(w7.forecast.points.length, 2, '整周 7 天页＝起点 ＋ 1 个整周点，不许多出行');
});

test('#455 ⑤ 页面级：90 天减 Xkg 页的表按实际覆盖天数写实，且末行日期与值同轴', () => {
  const html = buildSimTargetDoc(weightSimTarget(series, 6, 90, '模拟减重'));
  assert.ok(html.includes('共 90 天'), '表题没按实际覆盖天数写实（缺「共 90 天」）');
  assert.ok(html.includes(shiftISODate(ANCHOR, 90)), '表里没有第 90 天那一行的日期');
  assert.ok(html.includes('>' + 69.1 + '<'), '表里没有第 90 天那一行的值 69.1');
  assert.ok(html.includes('>' + 69.5 + '<'), '表里没有第 84 天那一行的诚实值 69.5');
});
