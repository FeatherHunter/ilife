/** #568 · 预测体重族 R-01~R-06 靶向断言（改前必红/改后必绿，变异自证打在本件）。
 *
 *  运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`，再 node --test 本件。
 *  不碰冻结 `analysis-*.test.mjs` 口径：本件只判页面侧形状/文案（CSS存在性/眉题chip distinct/壳不动/NBSP/去复述）。
 */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { shiftISODate } from '../dist/analysis/utils.js';
import { weightTarget } from '../dist/analysis/simulate.js';
import { weightSimCut } from '../dist/analysis/simulate2.js';
import {
  buildPredictDoc, buildPredictTargetDoc, buildSimCutDoc,
} from '../dist/render/trendPredictDocs.js';
import { configTestBase } from './helpers/config-test.mjs';

// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const START = '2026-06-18';
function mkSeries(n = 90) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const ex = i % 2 === 0 ? 300 : null;
    out.push({
      date: shiftISODate(START, i),
      calories: 1800 + (i % 5) * 40, protein: 90, carbs: 200, fat: 60,
      sodiumMg: null, sugarG: null, fiberG: null, waterMl: null,
      exerciseKcal: ex,
      weightKg: i === n - 1 ? 75.1 : Math.round((75.1 + (n - 1 - i) * 0.05) * 10) / 10,
      bodyFatPct: null, waistCm: null,
      tdee: 2635, deficit: 1800 + (ex ?? 0) - 1800, calorieGoal: 1800, waterGoal: 2000,
    });
  }
  return out;
}
const series90 = mkSeries(90);
const V20 = weightTarget(series90, 65, '预测体重');
const V01 = {
  start: series90[series90.length - 8].date, end: series90[series90.length - 1].date, horizonDays: 7,
  current: 75.1, ratePerWeek: -0.36, forecastValue: 74.74, forecastLo: 74.69, forecastHi: 74.8,
  insight: '按当前趋势,7 天后体重约 74.74 kg。',
};

function eyebrowOf(html) {
  return (/<p class="[^"]*page-shell-eyebrow">([^<]*)<\/p>/.exec(html) ?? [])[1] ?? '';
}
function chipsOf(html) {
  return [...html.matchAll(/ilife-block-chip[^>]*>([^<]*)</g)].map((m) => m[1]);
}
function h1Of(html) {
  return (html.match(/ilife-block-page-shell-title">([^<]*)</) ?? [])[1] ?? '';
}
function visible(html) {
  return html.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]*>/g, ' ');
}
function cardsOf(html) {
  const seg = html.slice(html.indexOf('<div class="ilife-block-kpi-card-grid">'));
  const body = seg.slice(0, seg.indexOf('</section>'));
  return body.split('<div class="ilife-block ilife-block-kpi-card">').slice(1).map((c) => ({
    label: (c.match(/kpi-card-label">([^<]*)</) ?? [])[1] ?? '',
    value: (c.match(/kpi-card-value">([^<]*)</) ?? [])[1] ?? '',
    detail: (c.match(/kpi-card-detail">([^<]*)</) ?? [])[1] ?? '',
    badge: (c.match(/ilife-status-badge[^>]*>([^<]*)</) ?? [])[1] ?? '',
  }));
}

test('#568 R-01/R-02 区间卡窄档单行：值仍写至＋页面侧nowrap（改掉即红）', () => {
  const html = buildPredictDoc(V01);
  const lo = cardsOf(html).find((c) => c.label === '预计区间');
  assert.ok(lo, '预计区间卡不见了');
  assert.ok(lo.value.includes('至'), '区间须仍写至（冻结W6-③）：' + lo.value);
  assert.ok(html.includes('.ilife-block-kpi-card-value{white-space:nowrap'), '缺R-01页面侧nowrap（改坏即红）');
  assert.ok(html.includes('.ilife-block-kpi-card-value-row{flex-wrap:nowrap'), '缺R-01行级nowrap');
  assert.ok(html.includes('.ilife-block-kpi-card-unit{flex-shrink:0}'), '缺单位不压缩');
});

test('#568 R-03 眉题≠chip（01–08共8页，改回趋势分析即红）', () => {
  const pages = [
    ['01 7天', buildPredictDoc({ ...V01, horizonDays: 7 })],
    ['02 30天', buildPredictDoc({ ...V01, horizonDays: 30 })],
    ['03 90天', buildPredictDoc({ ...V01, horizonDays: 90 })],
    ['04 180天', buildPredictDoc({ ...V01, horizonDays: 180 })],
    ['05 60天', buildPredictDoc({ ...V01, horizonDays: 60 })],
    ['06 自定义目标', buildPredictTargetDoc(V20)],
    ['07 300卡', buildSimCutDoc(weightSimCut(series90, 300, '模拟减重'))],
    ['08 500卡', buildSimCutDoc(weightSimCut(series90, 500, '模拟减重'))],
  ];
  assert.equal(pages.length, 8, '须正好8页');
  for (const [what, html] of pages) {
    const eb = eyebrowOf(html);
    const chips = chipsOf(html);
    assert.ok(eb.length > 0, what + ' 眉题空');
    assert.ok(chips.length >= 2, what + ' chip数异常：' + chips.join('|'));
    assert.ok(!chips.includes(eb), what + ' 眉题与chip同字（改前：趋势分析两遍）：眉题=' + eb + ' chips=' + chips.join('|'));
  }
  // 族名落点：预测体重族眉题须为预测体重，模拟减重族为模拟减重
  assert.equal(eyebrowOf(pages[0][1]), '预测体重', '01眉题不是族名');
  assert.equal(eyebrowOf(pages[5][1]), '预测体重', '06眉题不是族名');
  assert.equal(eyebrowOf(pages[6][1]), '模拟减重', '07眉题不是族名');
});

test('#568 R-04 只做页内一半：壳仍1120＋桌面参数三列（改壳或撤网格即红）', () => {
  for (const [what, html] of [
    ['01', buildPredictDoc(V01)],
    ['06', buildPredictTargetDoc(V20)],
    ['07', buildSimCutDoc(weightSimCut(series90, 300, '模拟减重'))],
  ]) {
    assert.ok(html.includes('max-width:1120px'), what + ' 壳宽被动了（本票不许动壳，归#567）');
    assert.ok(html.includes('grid-template-columns:repeat(3'), what + ' 缺桌面三列重排（R-04页内一半）');
    assert.ok(html.includes('gap:12px'), what + ' 间距不是4/8倍数档');
  }
});

test('#568 R-05 H1不可断：65与kg间为U+00A0（改回常规空格即红）', () => {
  const html = buildPredictTargetDoc(V20);
  const h1 = h1Of(html);
  assert.ok(h1.length > 0, 'H1空');
  assert.ok(!h1.includes('(') && !h1.includes(')'), 'H1还有半角括号：' + h1);
  assert.ok(h1.includes('（') && h1.includes('）'), 'H1全角括号不成对：' + h1);
  assert.ok(h1.includes('65'), 'H1丢了目标值：' + h1);
  // NBSP断言：源码H1段内须含U+00A0（常规空格即红）
  const h1raw = (html.match(/<h1[^>]*>[\s\S]*?<\/h1>/) ?? [])[0] ?? '';
  assert.ok(h1raw.includes('\u00A0kg') || h1raw.includes('\u00A0'), 'H1内65与kg不是不可断空格（须U+00A0）：' + JSON.stringify(h1raw.slice(-30)));
  assert.ok(!h1raw.includes('65 kg'), 'H1内还有常规空格可断行（须U+00A0）：' + JSON.stringify(h1raw.slice(-30)));
});

test('#568 R-06 去同义复述：超范围类计数==1＋三处两两不互为子串（改回即红）', () => {
  const html = buildPredictTargetDoc(V20);
  const v = visible(html);
  const countChao = v.split('超范围').length - 1;
  const countChaoJian = v.split('超出健康范围').length - 1;
  // 可见文本里超出健康范围须0（只留徽标超范围一处），超范围须1
  assert.equal(countChaoJian, 0, '结论条还有超出健康范围（须只留徽标一处）：' + v.slice(v.indexOf('超出') - 20, v.indexOf('超出') + 20));
  assert.equal(countChao, 1, '超范围类计数须==1（徽标一处），实得' + countChao);
  const concl = (html.match(/ilife-block-conclusion">([^<]*)</) ?? [])[1] ?? '';
  assert.ok(concl.includes('65 kg'), '结论丢了目标：' + concl);
  assert.ok(concl.includes(V20.eta), '结论丢了预计达成日：' + concl);
  assert.ok(concl.includes('还差') && concl.includes('剩余'), '结论第二句须为互补信息（差异量/期限）：' + concl);
  const card = cardsOf(html).find((c) => c.label === '可行性');
  assert.ok(card, '可行性卡不见了');
  assert.equal(card.badge, '超范围', '徽标须为超范围（唯一判断）：' + card.badge);
  assert.ok(card.detail.includes('当前速率'), 'detail须为速率事实（互补信息）：' + card.detail);
  assert.ok(!card.detail.includes(card.badge) && !card.value.includes(card.badge), '同卡重复（W5-①）：' + JSON.stringify(card));
  // 三处两两不互为子串
  const trio = [concl, card.detail, card.badge];
  for (let i = 0; i < trio.length; i++) {
    for (let j = 0; j < trio.length; j++) {
      if (i === j) continue;
      assert.ok(!trio[i].includes(trio[j]) || trio[j].length === 0, '三处互为子串：' + JSON.stringify(trio));
    }
  }
});
