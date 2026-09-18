/** t573 跨族返修靶向（报告§7.6 R-59/R-60/R-61/R-62，只验读者看得见的页级症状，不碰口径与数据）。
 *
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`，再 `node --test packages/skill-calorie/test/t573-cross.test.mjs`。
 * 判据读 `dist/`（不编译则读数无效）。冻结 `analysis-*.test.mjs` 一行不动。
 * R-59 本票未做（冻结冲突，见证据§6 C1）：此处只锁冲突现状（缺口H1正則＋21/22同参同构），改H1即红，待编排者裁决解冻。
 */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  buildDeficitDoc, buildPredictDoc, buildPredictTargetDoc, buildSimCutDoc,
  buildSimTargetDoc, buildCalorieForecastDoc,
} from '../dist/render/trendPredictDocs.js';
import { buildReportDoc } from '../dist/analysis/reportDoc.js';
import { configTestBase } from './helpers/config-test.mjs';

// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

function navTexts(html) {
  const m = html.match(/<nav class="ilife-block-toc"[^>]*>([\s\S]*?)<\/nav>/);
  if (!m) return [];
  return [...m[1].matchAll(/<a [^>]*>([^<]*)</g)].map((x) => x[1]);
}
function secHeadings(html) {
  return [...html.matchAll(/<section id="([^"]+)">(?:\s*<h2[^>]*>([^<]*)<\/h2>)?/g)]
    .map((m) => ({ id: m[1], h2: m[2] === undefined ? null : m[2] }));
}
/* R-60验收：headings数==导航项数且逐项文本相等（只认区块首h2，不认块内件自带h2）。 */
function assertHeadingsEqNav(html, what) {
  const nav = navTexts(html);
  const secs = secHeadings(html).filter((s) => s.id.startsWith('sec-'));
  assert.ok(nav.length > 0, what + ' 无导航项');
  assert.equal(secs.length, nav.length, what + ' 区块数≠导航项数：' + secs.length + ' vs ' + nav.length);
  secs.forEach((s, i) => {
    assert.ok(s.h2 !== null, what + ' ' + s.id + ' 无可见小节标题');
    assert.equal(s.h2, nav[i], what + ' ' + s.id + ' 标题≠导航：' + s.h2 + ' vs ' + nav[i]);
  });
}

const V14 = { start: '2026-09-03', end: '2026-09-16' };
const predictView = { horizonDays: 7, current: 75.1, forecastValue: 74.8, ratePerWeek: -0.34, forecastLo: 74.7, forecastHi: 74.8, ...V14 };
const targetView = { current: 75.1, target: 65, eta: '2026-12-01', daysLeft: 76, ratePerWeek: -0.34, feasible: false, ...V14 };
const simCutNoTrack = { cutKcal: 300, weeklyLoss: 1.36, feasible: false, current: 75.1, newDeficit: 800, ...V14 };
const simCutTrack = { ...simCutNoTrack, forecast: { points: [{ date: '2026-09-23', value: 74.1 }, { date: '2026-09-30', value: 73.2 }] } };
const simTargetNoTrack = { daysTarget: 30, targetLoss: 2, neededDeficit: 513, weeklyRate: 0.47, feasible: true, current: 75.1, ...V14 };
const simTargetTrack = { ...simTargetNoTrack, forecast: { points: [{ date: '2026-10-01', value: 74.0 }] } };
const forecastTrack = {
  current: 1600, goal: 1800, dailyRate: 5, ...V14,
  forecast: { horizonDays: 7, points: [{ date: '2026-09-23', value: 1647, lo: 1647, hi: 1647 }, { date: '2026-09-30', value: 1652, lo: 1640, hi: 1664 }] },
};
const forecastEmpty = { current: 1600, goal: 1800, dailyRate: 5, ...V14, forecast: { horizonDays: 30, points: [] } };
function deficitData() {
  return {
    target: { weeklyDeficitPerDay: 300, intake: 1800, tdee: 2200 },
    summary: { avgIntake: 1600, avgBurn: 2400, avgExerciseBurn: 200, avgDeficit: 800, weeklyDeficit: 5600, predictedLossKg: 0.73, trend: 'loss' },
    series: [
      { date: '2026-09-15', weekday: '周一', intake: 1600, burn: 2400, deficit: 800 },
      { date: '2026-09-16', weekday: '周二', intake: 1500, burn: 2500, deficit: 1000 },
    ],
    meta: { start: '2026-09-10', end: '2026-09-16', days: 7, weekdayCount: 5, weekendCount: 2 },
  };
}
function bmiPlate() {
  return {
    base: { kind: 'bmi', start: '2026-06-19', end: '2026-09-16', days: 90, profile: { heightCm: 175 }, series: [] },
    bandPoints: [{ date: '2026-09-16', kg: 75.1, bmi: 24.5 }],
  };
}

test('T573-R60 预测体重族有轨无轨两态：小节标题数==导航项数且逐字一致', () => {
  assertHeadingsEqNav(buildPredictDoc(predictView), 'buildPredictDoc');
  assertHeadingsEqNav(buildPredictTargetDoc(targetView), 'buildPredictTargetDoc');
});
test('T573-R60 模拟减重族有轨无轨两态：轨迹标题取模拟轨迹与导航同字', () => {
  assertHeadingsEqNav(buildSimCutDoc(simCutNoTrack), 'buildSimCut(no-track)');
  assertHeadingsEqNav(buildSimCutDoc(simCutTrack), 'buildSimCut(track)');
  assertHeadingsEqNav(buildSimTargetDoc(simTargetNoTrack), 'buildSimTarget(no-track)');
  assertHeadingsEqNav(buildSimTargetDoc(simTargetTrack), 'buildSimTarget(track)');
});
test('T573-R60 摄入预测族：轨迹标题取摄入预测轨迹与导航同字，空轨迹不留孤儿标题', () => {
  assertHeadingsEqNav(buildCalorieForecastDoc(forecastTrack), 'buildCalorieForecast(track)');
  assertHeadingsEqNav(buildCalorieForecastDoc(forecastEmpty), 'buildCalorieForecast(empty)');
});
test('T573-R60 边界：缺口族不在本票范围，不加小节标题（结构保持）', () => {
  const secs = secHeadings(buildDeficitDoc(deficitData())).filter((s) => s.id.startsWith('sec-'));
  assert.ok(secs.length > 0, '缺口页无区块');
  assert.ok(secs.every((s) => s.h2 === null), '缺口页不应有本票小节标题：' + JSON.stringify(secs));
});

test('T573-R61 表卡左缘：墙内页表卡居中归位，680上限不动', () => {
  for (const [name, html] of [['deficit', buildDeficitDoc(deficitData())], ['forecast', buildCalorieForecastDoc(forecastTrack)], ['predict', buildPredictDoc(predictView)]]) {
    assert.ok(html.includes('.ilife-block-page-shell .ilife-block-data-table{margin-left:0;margin-right:auto}'), name + ' 缺表左缘归位规则');
  }
  assert.ok(buildDeficitDoc(deficitData()).includes('.t571-deficit-detail .ilife-block-data-table{margin-left:-16px}'), 'deficit 缺表明细表缺折叠内边距对冲规则');
  assert.ok(!/680/.test((buildDeficitDoc(deficitData()).match(/#573 跨族[\s\S]*?<\/style>/) ?? [''])[0]), '表宽680归#567：本票CSS块不重写上限');
});
test('T573-R61 内表同步归位：cols3内表不居中', () => {
  const html = buildCalorieForecastDoc(forecastTrack);
  assert.ok(html.includes('.tpd-track-table--cols3 .ilife-block-data-table-table{margin-left:0;margin-right:auto}'), 'cols3内表缺左缘归位规则');
});
test('T573-R61 报告底座：8形态表卡同左缘归位', () => {
  const html = buildReportDoc(bmiPlate(), 'calorie-cmd-read calorie.report.bmi');
  assert.ok(html.includes('.ilife-block-page-shell .ilife-block-data-table{margin-left:0;margin-right:auto}'), '报告底座缺表左缘归位规则');
});

test('T573-R62 按钮行：桌面档铺满内容列，窄档沿旧行为', () => {
  for (const [name, html] of [['predict', buildPredictDoc(predictView)], ['deficit', buildDeficitDoc(deficitData())], ['forecast', buildCalorieForecastDoc(forecastTrack)]]) {
    assert.ok(html.includes('@media (min-width:821px){.ilife-block-page-shell .ilife-action-bar{max-width:none;margin:12px 0}}'), name + ' 缺按钮行桌面铺满规则');
  }
});

test('T573-R59 冲突锁：缺口H1冻结正則（386:377），入口身份待裁决', () => {
  const h1 = (buildDeficitDoc(deficitData()).match(/ilife-block-page-shell-title">([^<]*)/) ?? [])[1];
  assert.ok(/^热量缺口 \d{4}-\d{2}-\d{2} 至 \d{4}-\d{2}-\d{2}$/.test(h1 ?? ''), '缺口H1冻结形变了：H1=' + h1);
});
