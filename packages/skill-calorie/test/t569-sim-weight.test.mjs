/** #569 · 模拟减重族 R-07~R-14 靶向断言（改前必红/改后必绿，变异自证打在本件）。
 *
 *  运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`，再 node --test 本件。
 *  不碰冻结 `analysis-*.test.mjs` 口径：本件只判页面侧形状/文案（CSS存在性/H1/chip/detail/元素侧label）。
 *  R-08/R-14元素侧当刻已成立，本件为加锁（改坏即红）；R-14字面（公共层CSS选择器）归#567，不在本件断言。
 */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { shiftISODate } from '../dist/analysis/utils.js';
import { weightSimCut, weightSimTarget, calorieForecast } from '../dist/analysis/simulate2.js';
import {
  buildSimCutDoc, buildSimTargetDoc, buildCalorieForecastDoc,
} from '../dist/render/trendPredictDocs.js';

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
const CUT300 = weightSimCut(series90, 300, '模拟减重');
const CUT700 = weightSimCut(series90, 700, '模拟减重');
const TGT30 = weightSimTarget(series90, 2, 30, '模拟减重');
const FC30 = calorieForecast(series90, 30, '摄入预测');

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

test('#569 R-07 两列表窄档恢复表头＋列式对齐（撤标记即红）', () => {
  for (const [what, html] of [
    ['07 cut300', buildSimCutDoc(CUT300)],
    ['10 tgt30', buildSimTargetDoc(TGT30)],
  ]) {
    // 内层字面逐字保留（W6-②守卫），外层另套纯标记
    assert.ok(html.includes('<div class="tpd-track-table">'), what + ' 内层标记类丢了（W6-②）');
    assert.ok(html.includes('<div class="tpd-track-table--cols2">'), what + ' 缺窄档恢复标记（改坏即红）');
    // 恢复规则三件套：表头回来＋伪元素标签清零＋数值列回右对齐
    assert.ok(html.includes('.tpd-track-table--cols2 .ilife-block-data-table thead{display:table-header-group}'),
      what + ' 表头恢复规则丢了');
    assert.ok(html.includes('.tpd-track-table--cols2 .ilife-block-data-table td::before{content:none}'),
      what + ' 标签清零规则丢了（390档::before命中须≤1）');
    assert.ok(html.includes('td.ilife-block-data-table-cell-right{text-align:right'),
      what + ' 数值列右对齐丢了（右缘须共线）');
  }
  // 三列表（摄入预测）不套恢复标记（R-16归#570）
  assert.ok(!buildCalorieForecastDoc(FC30).includes('tpd-track-table--cols2'), '三列表误套了两列恢复标记');
});

test('#569 R-08 加锁：模拟族轨迹列全1位（改回即红）', () => {
  for (const [what, html] of [
    ['07 cut300', buildSimCutDoc(CUT300)],
    ['10 tgt30', buildSimTargetDoc(TGT30)],
  ]) {
    const rows = (html.match(/<tbody>([\s\S]*?)<\/tbody>/) ?? [])[1] ?? '';
    const vals = [...rows.matchAll(/data-label="[^"]*">([^<]*)</g)].map((m) => m[1]).filter((_, i) => i % 2 === 1);
    assert.ok(vals.length >= 5, what + ' 轨迹表行数异常：' + vals.length);
    for (const s of vals) assert.match(s, /^\d+\.\d$/, what + ' 非1位字面：' + s);
  }
});

test('#569 R-09 07/08去复述：判断只留徽标一处（改回三处即红）', () => {
  for (const [what, v, badge] of [['cut300', CUT300, '超范围'], ['cut700', CUT700, '可行']]) {
    const html = buildSimCutDoc(v);
    const x = visible(html);
    // 判断词计数：超出健康范围0/超出安全区间0/超范围1（徽标一处）
    assert.equal(x.split('超出健康范围').length - 1, 0, what + ' 结论还有超出健康范围（须只留徽标）');
    assert.equal(x.split('超出安全区间').length - 1, 0, what + ' detail还有超出安全区间（须只留徽标）');
    assert.equal(x.split('超范围').length - 1, what === 'cut300' ? 1 : 0,
      what + ' 超范围计数异常：' + (x.split('超范围').length - 1));
    // 结论前半句式冻结（W5-②）：一周大约掉＋2位
    const concl = (html.match(/ilife-block-conclusion">([^<]*)</) ?? [])[1] ?? '';
    assert.match(concl, /一周大约掉 \d+\.\d+ kg/, what + ' 结论主数句式丢了（冻结W5-②）：' + concl);
    // detail为总缺口互补事实，不与徽标同词（W5-①），无—（W6-①-c）
    const card = cardsOf(html).find((c) => c.label === '可行性');
    assert.ok(card, what + ' 可行性卡不见了');
    assert.equal(card.badge, badge, what + ' 徽标异常：' + card.badge);
    assert.ok(card.detail.includes('每天总缺口约') && card.detail.includes('卡'), what + ' detail不是总缺口事实：' + card.detail);
    assert.ok(!card.detail.includes(card.badge), what + ' 同卡重复（W5-①）：' + JSON.stringify(card));
    assert.ok(!card.detail.includes('—') && !concl.includes('—'), what + ' 出现了—（W6-①-c）');
    // 三处两两不互为子串
    const trio = [concl, card.detail, card.badge];
    for (let i = 0; i < trio.length; i++) {
      for (let j = 0; j < trio.length; j++) {
        if (i === j) continue;
        assert.ok(!trio[i].includes(trio[j]) || trio[j].length === 0, what + ' 三处互为子串：' + JSON.stringify(trio));
      }
    }
  }
});

test('#569 R-10 主标/chip数字单位留空格（09–13五页，紧贴即红）', () => {
  const pages = [
    ['09 cut700', buildSimCutDoc(CUT700)],
    ['10 tgt30', buildSimTargetDoc(TGT30)],
    ['11 tgt60', buildSimTargetDoc(weightSimTarget(series90, 4, 60, '模拟减重'))],
    ['12 tgt90', buildSimTargetDoc(weightSimTarget(series90, 6, 90, '模拟减重'))],
    ['13 tgt45', buildSimTargetDoc(weightSimTarget(series90, 3, 45, '模拟减重'))],
  ];
  assert.equal(pages.length, 5, '须正好5页');
  for (const [what, html] of pages) {
    const h1 = h1Of(html);
    const chips = chipsOf(html).join('|');
    for (const [name, s] of [['H1', h1], ['chip', chips]]) {
      assert.ok(!/0卡/.test(s), what + name + '还有数字贴卡：' + s);
      assert.ok(!/减\d/.test(s), what + name + '还有减贴数字：' + s);
      assert.ok(!/0天/.test(s), what + name + '还有数字贴天：' + s);
    }
    assert.ok(!h1.includes('(') && !h1.includes(')'), what + ' H1半角括号（W5-③）：' + h1);
  }
  assert.equal(h1Of(pages[0][1]), '模拟减重（每天 -700 卡）', '09主标形态：' + h1Of(pages[0][1]));
  assert.equal(h1Of(pages[1][1]), '模拟减重（30 天减 2 kg）', '10主标形态：' + h1Of(pages[1][1]));
});

test('#569 R-11 detail改总量互补：不是结论前缀（改回即红）', () => {
  const html = buildSimTargetDoc(TGT30);
  const concl = (html.match(/ilife-block-conclusion">([^<]*)</) ?? [])[1] ?? '';
  assert.ok(concl.startsWith('要在 30 天里减掉 2 kg'), '结论首句形态变了：' + concl);
  const card = cardsOf(html).find((c) => c.label === '所需缺口');
  assert.ok(card, '所需缺口卡不见了');
  assert.ok(card.detail.includes('合计约') && card.detail.includes('卡'), 'detail不是总量事实：' + card.detail);
  let lcp = 0;
  while (lcp < card.detail.length && lcp < concl.length && card.detail[lcp] === concl[lcp]) lcp++;
  assert.ok(lcp < 8, 'detail仍是结论前缀（LCP=' + lcp + '）：' + card.detail + ' vs ' + concl);
});

test('#569 R-12 结论卡升档：hero规则存在且结论格为最大值位（撤即红）', () => {
  const sim = buildSimCutDoc(CUT700);
  assert.ok(sim.includes('.ilife-block-kpi-card-grid > .ilife-block-kpi-card:nth-child(3) .ilife-block-kpi-card-value{font-size:28px;font-weight:800}'),
    '模拟页hero规则丢了（第3格每周掉重）');
  const fc = buildCalorieForecastDoc(FC30);
  assert.ok(fc.includes('.ilife-block-kpi-card-grid > .ilife-block-kpi-card:nth-child(4) .ilife-block-kpi-card-value{font-size:28px;font-weight:800}'),
    '预测页hero规则丢了（第4格摄入预测）');
});

test('#569 R-13 卡内距页侧16px覆盖（撤即红）', () => {
  for (const [what, html] of [
    ['09 cut700', buildSimCutDoc(CUT700)],
    ['10 tgt30', buildSimTargetDoc(TGT30)],
    ['14 fc30', buildCalorieForecastDoc(FC30)],
  ]) {
    assert.ok(html.includes('.ilife-block-kpi-card{padding:16px}'), what + ' 缺16px页侧覆盖（公共层14px归#567）');
  }
});

test('#569 R-14元素侧锁：可见层零空串label（元素侧出空即红）', () => {
  // 注意：标签属性住tag内，故只剥style/script/注释、保留tag（visible()会把tag一起剥掉，此处不能用它）
  const noStyle = (html) => html.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  for (const [what, html] of [
    ['07 cut300', buildSimCutDoc(CUT300)],
    ['10 tgt30', buildSimTargetDoc(TGT30)],
    ['14 fc30', buildCalorieForecastDoc(FC30)],
  ]) {
    const bare = noStyle(html);
    assert.equal(bare.split('data-label=""').length - 1, 0, what + ' 元素侧出现空label（字面两处归公共层CSS，见证据§6）');
    assert.ok(bare.includes('data-label="日期"'), what + ' 日期label丢了');
  }
  assert.ok(noStyle(buildSimCutDoc(CUT300)).includes('data-label="模拟体重（kg）"'), '模拟体重label丢了');
});

test('#569 R-03同形延伸：10–13眉题≠chip（改回趋势分析即红）', () => {
  for (const [what, html] of [
    ['10 tgt30', buildSimTargetDoc(TGT30)],
    ['13 tgt45', buildSimTargetDoc(weightSimTarget(series90, 3, 45, '模拟减重'))],
  ]) {
    const eb = eyebrowOf(html);
    assert.equal(eb, '模拟减重', what + ' 眉题不是族名：' + eb);
    assert.ok(!chipsOf(html).includes(eb), what + ' 眉题与chip同字：' + chipsOf(html).join('|'));
  }
});
