/** #625 第四轮返修 A团：预测族结论去复述＋胶囊去重 —— 改坏必红，还原必绿。
 * 冻结红线（碰即红，别改）：383 词针（17 摄入/目标、18 目标/在轨、19 缺口/每周、20 稳定/波动）、
 * t569 SimTarget 结论前缀与 nth-child、无轨迹页导航三项（R-25）、R-15/R-16/R-17/R-20/R-21/R-26/R-27。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { calorieForecast, calorieGoalEta, calorieDeficitEta, calorieStability } from '../dist/analysis/simulate2.js';
import {
  buildCalorieForecastDoc, buildCalorieGoalDoc, buildCalorieDeficitDoc, buildCalorieStabilityDoc,
} from '../dist/render/trendPredictDocs.js';

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
