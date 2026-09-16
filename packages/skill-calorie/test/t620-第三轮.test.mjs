/** #620 增量1：10–13 判词方向——偏慢不再误判偏快。改坏必红，还原必绿。 */
/** #620 增量5：18–20 补可见小节标题（R-60同形，标题==导航）。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { weightSimTarget, calorieGoalEta, calorieDeficitEta, calorieStability } from '../dist/analysis/simulate2.js';
import { buildSimTargetDoc, buildCalorieGoalDoc, buildCalorieDeficitDoc, buildCalorieStabilityDoc } from '../dist/render/trendPredictDocs.js';
import { foldedTable, tableOf } from '../dist/analysis/reportDocParts.js';
import { buildReportDoc } from '../dist/analysis/reportDoc.js';

function series90() {
  const out = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(Date.UTC(2026, 5, 19 + (89 - i)));
    const iso = d.toISOString().slice(0, 10);
    out.push({ date: iso, weightKg: 75.1 - (89 - i) * 0.01, calories: 1800, deficit: 300, calorieGoal: 1800 });
  }
  return out;
}

function visible(html) {
  return html.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ').replace(/<[^>]*>/g, ' ');
}

test('#620-1 慢速 2kg/30d（0.47<0.5）：结论与徽标说偏慢，不说偏快/超出', () => {
  const v = weightSimTarget(series90(), 2, 30, '模拟减重');
  assert.equal(v.feasible, false);
  assert.ok(v.weeklyRate < 0.5, '夹具应为慢速：' + v.weeklyRate);
  assert.ok(String(v.insight).includes('偏慢'), 'insight未指慢：' + v.insight);
  const text = visible(buildSimTargetDoc(v));
  assert.ok(text.includes('偏慢'), '页上未见偏慢');
  assert.ok(!text.includes('赶得偏快'), '慢速页误判偏快');
  assert.ok(!text.includes('超出健康范围'), '慢速页误判超出');
});

test('#620-1 快速 6kg/30d（1.4>1.0）：结论与徽标说偏快/超出，不说偏慢', () => {
  const v = weightSimTarget(series90(), 6, 30, '模拟减重');
  assert.equal(v.feasible, false);
  assert.ok(v.weeklyRate > 1.0, '夹具应为快速：' + v.weeklyRate);
  const text = visible(buildSimTargetDoc(v));
  assert.ok(text.includes('赶得偏快') || text.includes('超出健康范围'), '快速页未见偏快/超出');
  assert.ok(!text.includes('偏慢'), '快速页误判偏慢');
});

test('#620-1 可行 4kg/60d（0.47？按实际算 feasible）：健康范围内且赶得上', () => {
  const v = weightSimTarget(series90(), 4, 60, '模拟减重');
  const text = visible(buildSimTargetDoc(v));
  if (v.feasible) {
    assert.ok(text.includes('在健康范围内'), '可行页未见健康范围内');
    assert.ok(text.includes('赶得上'), '可行页未见赶得上');
  } else {
    assert.ok(text.includes('偏慢') || text.includes('偏快') || text.includes('超出'), '不可行页方向不明');
  }
});

function secHeadings(html) {
  const secs = [...html.matchAll(/<section id="([^"]+)">(?:<h2 class="tpd-sec-title">([^<]*)<\/h2>)?/g)]
    .map((m) => ({ id: m[1], h2: m[2] ?? null }));
  const nav = [...html.matchAll(/href="#([^"]+)">([^<]*)</g)].map((m) => ({ id: m[1], text: m[2] }));
  return { secs: secs.filter((s) => s.id.startsWith('sec-')), nav };
}

function assertHeadingsEqNav(html, what) {
  const { secs, nav } = secHeadings(html);
  assert.ok(secs.length > 0 && nav.length > 0, what + ' 无区块或无导航');
  assert.deepEqual(secs.map((s) => s.id), nav.map((n) => n.id), what + ' 区块≠导航项');
  secs.forEach((s, i) => {
    assert.ok(s.h2 !== null, what + ' ' + s.id + ' 无可见小节标题');
    assert.equal(s.h2, nav[i].text, what + ' ' + s.id + ' 标题≠导航：' + s.h2 + ' vs ' + nav[i].text);
  });
}

test('#620-5 18营养目标达成：小节标题数==导航项数且逐字一致', () => {
  assertHeadingsEqNav(buildCalorieGoalDoc(calorieGoalEta(series90(), '摄入预测')), 'buildCalorieGoalDoc');
});

test('#620-5 19缺口预测：小节标题数==导航项数且逐字一致', () => {
  assertHeadingsEqNav(buildCalorieDeficitDoc(calorieDeficitEta(series90(), '摄入预测')), 'buildCalorieDeficitDoc');
});

test('#620-5 20稳定性：小节标题数==导航项数且逐字一致', () => {
  assertHeadingsEqNav(buildCalorieStabilityDoc(calorieStability(series90(), '摄入预测')), 'buildCalorieStabilityDoc');
});

/* ── #620 增量2：长表折叠（首屏 10 行＋其余折叠；短表原样，数据一条不少） ── */

const FOLD_COLS = [{ key: 'date', label: '日期' }, { key: 'value', label: '值', align: 'right' }];
const foldRows = (n) => Array.from({ length: n }, (_, i) => ({ date: '2026-09-' + String(i + 1).padStart(2, '0'), value: i }));

test('#620-2 短表12行原样直出无折叠', () => {
  const html = foldedTable({ columns: FOLD_COLS, rows: foldRows(12), caption: '逐日明细' });
  assert.ok(!html.includes('<details'), '12行短表不应折叠');
});

test('#620-2 长表13行首屏10行其余3行折叠', () => {
  const html = foldedTable({ columns: FOLD_COLS, rows: foldRows(13), caption: '逐日明细' });
  assert.ok(html.includes('<details'), '13行应折叠');
  assert.ok(html.includes('其余 3 行（共 13 行）'), '折叠标题不明：' + html.slice(html.indexOf('<summary'), html.indexOf('<summary') + 120));
  for (const r of foldRows(13)) assert.ok(html.includes(r.date), '折叠丢数据：' + r.date);
});

test('#620-2 长表60行数据一条不少', () => {
  const html = foldedTable({ columns: FOLD_COLS, rows: foldRows(60), caption: '逐日体重与 BMI', emptyText: '无记录' });
  assert.ok(html.includes('其余 50 行（共 60 行）'), '折叠标题不明');
  for (const r of foldRows(60)) assert.ok(html.includes(r.date), '折叠丢数据：' + r.date);
  assert.ok(html.includes('逐日体重与 BMI（续）'), '续表题不明');
});

test('#620-2 空表走空态无折叠', () => {
  const html = foldedTable({ columns: FOLD_COLS, rows: [], caption: '逐日明细', emptyText: '无记录' });
  assert.ok(!html.includes('<details'), '空表不应折叠');
  assert.ok(html.includes('无记录'), '空态文案丢失');
});

test('#620-2 tableOf长表30行折叠且短表不折', () => {
  const pts = (n) => Array.from({ length: n }, (_, i) => ({ date: '2026-09-' + String(i + 1).padStart(2, '0'), value: 68 }));
  const longHtml = tableOf(pts(30), '蛋白（g）', '每日蛋白量');
  assert.ok(longHtml.includes('<details'), '30行应折叠');
  assert.ok(longHtml.includes('其余 20 行（共 30 行）'), '折叠标题不明');
  const shortHtml = tableOf(pts(5), '蛋白（g）', '每日蛋白量');
  assert.ok(!shortHtml.includes('<details'), '5行不应折叠');
});

/* ── #620 增量3a：口径层去重（口径表与口径行同一事实只讲一次） ── */

const R3A_PROFILE = {
  heightCm: 175, age: 30, gender: 'male', genderLabel: '男',
  activityLevel: 'moderate', activityLabel: '中等', activityFactor: 1.55,
  bmr: 1700, tdee: 2635, missing: [],
};
function r3aPlate(kind, over = {}) {
  return {
    base: { kind, start: '2026-09-01', end: '2026-09-03', days: 3, series: [], profile: R3A_PROFILE, ...over },
    points: [], target: null, bandPoints: [], fourPiece: null, items: [], scores: [],
    trend: null, bmrDanger: null, compare: null,
  };
}
const countSub = (hay, needle) => hay.split(needle).length - 1;

test('#620-3a 趋势页三等分只讲一次', () => {
  const plate = r3aPlate('trend', {});
  plate.trend = { earlyAvg: 50, lateAvg: 52, turns: 1, direction: '平稳' };
  const html2 = visible(buildReportDoc(plate, ''));
  assert.equal(countSub(html2, '三等分'), 1, '三等分讲了不止一次');
});

test('#620-3a 对比页最后一次称重只讲一次', () => {
  const plate = r3aPlate('compare', {});
  plate.compare = {
    cur: { start: '2026-09-01', end: '2026-09-03' }, prev: { start: '2026-08-29', end: '2026-08-31' },
    rows: [], top: [],
  };
  const html = visible(buildReportDoc(plate, ''));
  assert.equal(countSub(html, '最后一次称重'), 1, '最后一次称重讲了不止一次');
});

test('#620-3a TDEE页通用定义只在口径行讲', () => {
  const html = visible(buildReportDoc(r3aPlate('tdee', {}), ''));
  assert.ok(!html.includes('缺口口径'), '口径表仍在重复静态缺口定义');
  assert.equal(countSub(html, 'Mifflin-St Jeor'), 1, 'Mifflin-St Jeor 讲了不止一次');
  assert.ok(html.includes('系数取档案里的活动量档位'), '口径行被删空');
});

/* ── #620 增量3b：卡面徽标去重（说明不重复徽标读数） ── */

test('#620-3b TDEE静态缺口卡说明不重复在缺口', () => {
  const plate = r3aPlate('tdee', {});
  plate.base.series = [{ date: '2026-09-01', calories: 1600, weightKg: 74.0, protein: null, waterMl: null, exerciseKcal: 0, deficit: null }];
  const html = visible(buildReportDoc(plate, ''));
  assert.ok(html.includes('消耗大于摄入'), '事实半句丢失');
  assert.ok(!html.includes('（在缺口）'), '说明仍在重复徽标词');
  assert.ok(html.includes('在缺口'), '徽标词丢失');
});

test('#620-3b BMR概览无徽标行且三天规则只住口径表', () => {
  const plate = r3aPlate('bmr', {});
  plate.points = ['2026-09-01', '2026-09-02', '2026-09-03'].map((date) => ({ date, value: 900 }));
  plate.bmrDanger = {
    underDays: ['2026-09-01', '2026-09-02', '2026-09-03'].map((date) => ({ date, calories: 900 })),
    threshold: 1700,
  };
  const raw = buildReportDoc(plate, '');
  const overview = raw.split('id="sec-overview"')[1].split('</section>')[0];
  assert.ok(!overview.includes('ilife-block-chip'), '概览仍有与徽标同字的徽标行');
  const html = visible(raw);
  assert.equal(countSub(html, '达到 3 天即告警'), 1, '三天规则不止一处');
  assert.ok(!html.includes('3 天及以上即告警'), '表题仍在重复规则');
});

test('#620-3b 评分分项卡说明不重复徽标读数', () => {
  const plate = r3aPlate('score', {});
  plate.scores = ['2026-09-01', '2026-09-02', '2026-09-03'].map((date, i) => ({ date, hits: 3, score: 50 + i, factors: [] }));
  plate.items = [
    { key: 'a', label: '蛋白达标', hits: 0, days: 3, rate: 0 },
    { key: 'b', label: '三餐齐备', hits: 3, days: 3, rate: 100 },
  ];
  plate.trend = { earlyAvg: 50, lateAvg: 52, turns: 1, direction: '平稳' };
  const html = visible(buildReportDoc(plate, ''));
  assert.ok(html.includes('优先改它'), '最低分项指引丢失');
  assert.ok(html.includes('继续保持'), '最高分项指引丢失');
  /* 卡说明不再复述徽标读数（表头／表题的结构词不计在内）。 */
  assert.ok(!html.includes('命中率 0%'), '最低分项卡仍在重复徽标读数');
  assert.ok(!html.includes('命中率 100%'), '最高分项卡仍在重复徽标读数');
});
