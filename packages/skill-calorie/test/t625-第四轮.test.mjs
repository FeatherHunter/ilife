/** #625 第四轮返修 A团：预测族结论去复述＋胶囊去重 —— 改坏必红，还原必绿。
 * 冻结红线（碰即红，别改）：383 词针（17 摄入/目标、18 目标/在轨、19 缺口/每周、20 稳定/波动）、
 * t569 SimTarget 结论前缀与 nth-child、无轨迹页导航三项（R-25）、R-15/R-16/R-17/R-20/R-21/R-26/R-27。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { calorieForecast, calorieGoalEta, calorieDeficitEta, calorieStability } from '../dist/analysis/simulate2.js';
import {
  buildCalorieForecastDoc, buildCalorieGoalDoc, buildCalorieDeficitDoc, buildCalorieStabilityDoc,
} from '../dist/render/trendPredictDocs.js';
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

function chipsOf(html) {
  return [...html.matchAll(/ilife-block-chip">([^<]*)</g)].map((m) => m[1]);
}

function conclOf(html) {
  return (html.match(/ilife-block-conclusion">([^<]*)</) ?? [])[1] ?? '';
}

test('#625-A 18/19/20 去第三枚胶囊（眉标留趋势分析）', () => {
  for (const [what, html] of [
    ['18', buildCalorieGoalDoc(calorieGoalEta(series90(), '摄入预测'))],
    ['19', buildCalorieDeficitDoc(calorieDeficitEta(series90(), '摄入预测'))],
    ['20', buildCalorieStabilityDoc(calorieStability(series90(), '摄入预测'))],
  ]) {
    assert.deepEqual(chipsOf(html), ['卡路里', '摄入预测'], what + ' 胶囊不是两枚：' + chipsOf(html).join('|'));
  }
});

test('#625-A 14页胶囊保持三枚（其余页逐字节不动）', () => {
  const html = buildCalorieForecastDoc(calorieForecast(series90(), 30, '摄入预测'));
  assert.deepEqual(chipsOf(html), ['卡路里', '摄入预测', '趋势分析'], '14页胶囊异动：' + chipsOf(html).join('|'));
});

test('#625-A 18结论不断复述三数但留词针', () => {
  const v = calorieGoalEta(series90(), '摄入预测');
  const c = conclOf(buildCalorieGoalDoc(v));
  assert.ok(c.includes('目标') && c.includes('在轨'), '383 词针丢失：' + c);
  assert.ok(!c.includes(String(v.avg)) && !c.includes(String(v.goal)), '结论仍在复述卡数：' + c);
});

test('#625-A 19结论不断复述两数但留词针', () => {
  const v = calorieDeficitEta(series90(), '摄入预测');
  const html = buildCalorieDeficitDoc(v);
  const c = conclOf(html);
  assert.ok(c.includes('缺口') && c.includes('每周'), '383 词针丢失：' + c);
  assert.ok(!c.includes('折算下来'), '旧复述句式仍在：' + c);
  assert.ok(!c.includes(String(Math.abs(v.avgDeficit))), '结论仍在复述缺口数：' + c);
});

test('#625-A 20结论不断复述两数但留词针', () => {
  const v = calorieStability(series90(), '摄入预测');
  const c = conclOf(buildCalorieStabilityDoc(v));
  assert.ok(c.includes('稳定') && c.includes('波动'), '383 词针丢失：' + c);
  assert.ok(!c.includes(String(v.avg)) && !c.includes(String(v.sigma)), '结论仍在复述卡数：' + c);
});

test('#625-A 17结论不含卡detail且留目标词', () => {
  const v = calorieForecast(series90(), 30, '摄入预测');
  const html = buildCalorieForecastDoc(v);
  const c = conclOf(html);
  assert.ok(c.includes('目标'), '383 词针丢失：' + c);
  assert.ok(!c.includes('比目标'), '结论吞了卡detail（R-27 回潮）：' + c);
  const lastV = v.forecast.points[v.forecast.points.length - 1].value;
  assert.ok(!c.includes(String(lastV)), '结论仍在复述末点值：' + c);
});

test('#625-A 18判定句成句', () => {
  const html = buildCalorieGoalDoc({ ...calorieGoalEta(series90(), '摄入预测'), onTarget: false });
  assert.ok(html.includes('日均摄入离目标偏开'), '判定句仍无主语');
});

test('#625-A 19口径错字已改且符号说明仍在', () => {
  const html = buildCalorieDeficitDoc(calorieDeficitEta(series90(), '摄入预测'));
  assert.ok(!html.includes('取正数表缺口') && !html.includes('为负表下降'), '错字仍在');
  assert.ok(html.includes('取正数表示缺口'), '改法走样');
  assert.ok(html.includes('符号＝') && html.includes('缺口取正数'), 't570 R-23 针丢失');
});

test('#625-A 20末格补齐规则只在本页', () => {
  const html = buildCalorieStabilityDoc(calorieStability(series90(), '摄入预测'));
  assert.ok(html.includes('#sec-overview .ilife-block-kpi-card-grid > :nth-child(odd):last-child{grid-column:1/-1}'),
    '补齐规则不在产物里');
  assert.ok(html.includes('div.ilife-block-kpi-card-grid{grid-template-columns:repeat(2,minmax(0,1fr))}'),
    'R-20 两列覆盖丢失');
  /* 规则须有作用对象：概览网格恰好 3 张顶格卡（末格奇数落单，规则命中它；探针实证）。 */
  const sec = html.split('id="sec-overview"')[1].split('</section>')[0];
  assert.equal(sec.split('class="ilife-block ilife-block-kpi-card"').length - 1, 3, '概览顶格卡不是 3 张');
});

/* ── #625 B团（报告族尾巴） ── */

const R625_PROFILE = {
  heightCm: 175, age: 30, gender: 'male', genderLabel: '男',
  activityLevel: 'moderate', activityLabel: '中等', activityFactor: 1.55,
  bmr: 1700, tdee: 2635, missing: [],
};
function r625Plate(kind, over = {}) {
  return {
    base: {
      kind, start: '2026-09-01', end: '2026-09-03', days: 3,
      series: [
        { date: '2026-09-01', calories: 1700, weightKg: 74.0, protein: 120, waterMl: 1800, exerciseKcal: 300, deficit: 400 },
        { date: '2026-09-02', calories: 1800, weightKg: 73.8, protein: 150, waterMl: 2100, exerciseKcal: 0, deficit: 300 },
        { date: '2026-09-03', calories: 1600, weightKg: 73.6, protein: 90, waterMl: 1500, exerciseKcal: 250, deficit: 500 },
      ],
      profile: R625_PROFILE, ...over,
    },
    points: [], target: null, bandPoints: [], fourPiece: null, items: [], scores: [],
    trend: null, bmrDanger: null, compare: null,
  };
}
function visible625(html) {
  return html.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]*>/g, ' ');
}
const countSub625 = (hay, needle) => hay.split(needle).length - 1;

test('#625-B 24结论不复述身高来源且口径指引分级表', () => {
  const plate = r625Plate('bmi', {});
  plate.bandPoints = [{ date: '2026-09-01', kg: 78, bmi: 25.5 }];
  const html = buildReportDoc(plate, '');
  const concl = (html.match(/ilife-block-conclusion">([^<]*)</) ?? [])[1] ?? '';
  assert.ok(concl.length > 0 && !concl.includes('身高'), '结论仍在复述身高来源：' + concl);
  assert.ok(concl.includes('落在'), '结论判词丢失：' + concl);
  assert.ok(html.includes('分级阈值见下方分级表'), '口径指引丢失');
  assert.ok(!html.includes('身高取档案里那一个值'), '页脚仍在重复卡说明');
});

test('#625-B 26口径统一四要素且表补体重行', () => {
  const plate = r625Plate('bmr', {});
  plate.points = ['2026-09-01', '2026-09-02', '2026-09-03'].map((date) => ({ date, value: 900 }));
  plate.bmrDanger = {
    underDays: ['2026-09-01', '2026-09-02', '2026-09-03'].map((date) => ({ date, calories: 900 })),
    threshold: 1700,
  };
  const html = buildReportDoc(plate, '');
  assert.ok(html.includes('四要素齐备'), '四要素未统一');
  assert.ok(!html.includes('四项齐备'), '四项残留');
  assert.ok(html.includes('>体重<'), '口径表缺体重行');
  assert.ok(html.includes('窗口内最后一次称重'), '体重行无来源');
});

test('#625-B 26公式行运算符统一汉字且差值单位进表头', () => {
  const plate = r625Plate('bmr', {});
  plate.points = ['2026-09-01', '2026-09-02', '2026-09-03'].map((date) => ({ date, value: 900 }));
  plate.bmrDanger = {
    underDays: [{ date: '2026-09-01', calories: 900 }],
    threshold: 1700,
  };
  const html = buildReportDoc(plate, '');
  assert.ok(!html.includes('10×体重'), '公式行仍混排×');
  assert.ok(html.includes('距基础代谢（卡）'), '差值列单位未进表头');
});

test('#625-B 27达标率统一1位', () => {
  const plate = r625Plate('protein', {});
  plate.points = ['2026-09-01', '2026-09-02', '2026-09-03'].map((date) => ({ date, value: 120 }));
  plate.target = 150;
  plate.fourPiece = { avg: 120, target: 150, hitDays: 3, loggedDays: 3, hitRate: 100 };
  const html = visible625(buildReportDoc(plate, ''));
  assert.ok(html.includes('100.0%'), '整数率没补位');
});

test('#625-B 29页脚后段同口径且拆两行', () => {
  const plate = r625Plate('score', {});
  plate.scores = ['2026-09-01', '2026-09-02'].map((date) => ({ date, hits: 3, score: 50, factors: [] }));
  plate.items = [{ key: 'a', label: '饮水达标', hits: 1, days: 2, rate: 50 }];
  plate.trend = { earlyAvg: 50, lateAvg: 52, turns: 0, direction: '平稳' };
  const html = buildReportDoc(plate, '');
  assert.ok(!html.includes('不另算第二套权重'), '内部口吻仍在');
  assert.ok(html.includes('后段六因素'), '页脚未同步后段口径');
  /* 两公式同一行（J1 影子要求 span 分段，单段行不产；行短可读，见源码注）。 */
  const calibers = [...html.matchAll(/<p class="ilife-block-caliber">/g)].length;
  assert.ok(calibers >= 2, '页脚行数不足（公式行＋来源行）：' + calibers);
  assert.ok(/ilife-block-caliber">\s*<span>/.test(html), '公式行没落成 span 分段');
});

test('#625-B 30结论只给方向不复印卡值', () => {
  const plate = r625Plate('trend', {});
  plate.scores = ['2026-09-01', '2026-09-02', '2026-09-03'].map((date, i) => ({ date, hits: 3, score: 50 + i, factors: [] }));
  plate.trend = { earlyAvg: 50, lateAvg: 52, turns: 1, direction: '平稳' };
  const html = buildReportDoc(plate, '');
  const concl = (html.match(/ilife-block-conclusion">([^<]*)</) ?? [])[1] ?? '';
  assert.ok(concl.includes('变化方向'), '结论方向词丢失：' + concl);
  assert.ok(!/\d/.test(concl), '结论仍在复印卡值：' + concl);
  assert.ok(!html.includes('（不另算一套权重）'), '趋势口径表内口吻仍在');
});

test('#625-B 31前3项表与Δ表同形且标签对位', () => {
  const plate = r625Plate('compare', {});
  plate.compare = {
    cur: { start: '2026-09-01', end: '2026-09-03' }, prev: { start: '2026-08-29', end: '2026-08-31' },
    rows: [{ label: '日均饮水', cur: 1800, prev: 1828.6, delta: -28.6, unit: 'ml' }],
    top: [{ label: '日均饮水', delta: -28.6, unit: 'ml' }],
  };
  const html = buildReportDoc(plate, '');
  const secTop = html.split('id="sec-top"')[1].split('</section>')[0];
  assert.ok(!secTop.includes('ml'), '前3项表仍带单位（与Δ表两样）：' + secTop.slice(0, 200));
  assert.ok(html.includes('>-28.6 ml<'), '卡值单位丢失');
  assert.ok(html.includes('>变化最大项<'), '卡标签未对位');
  assert.ok(html.includes('各画一张折线'), '五维走势行文未改');
  assert.ok(!html.includes('迷你折线'), '迷你旧称仍在');
  assert.ok(html.includes('身高，年龄，性别，活动量档位'), '四要素无定义行');
});
