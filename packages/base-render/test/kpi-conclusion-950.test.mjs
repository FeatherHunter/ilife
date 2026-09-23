// #950 B1／B2 扩参判据（node:test；随 `node --test "packages/base-render/test/*.test.mjs"` 跑）。
//
// 三条主线：① **逐字节兼容**（旧调用点产物一字不差）② **新槽位**（判定卡／还差／未记录／语气／徽标）
// ③ **硬止**（一个槽两个来源即点名拒）。兼容基线取自**真实产物页**
//（`D:\2Study\StudyNotes\.db\calorie_html\今日总览_20260924_002519.html` 里由旧版 base-paint 渲染的
//  KPI 卡与结论条逐字片段），不是自撰的快照。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { renderKpiCard } from '../dist/blocks.js';
/** 根出口（命名空间取，用来断言「区块件**不**进根出口」这条归属口径）。 */
import * as rootModule from '../dist/index.js';
import { renderConclusionBar } from '../dist/blocks.js';
import { blocksCss } from '../dist/blocks.js';

describe('#950 B1：KPI 卡扩参', () => {
  it('① 逐字节兼容：旧入参的产物＝真实产物页里那一张卡（蛋白 0 克）', () => {
    const html = renderKpiCard({
      label: '蛋白', value: '0', unit: '克', detail: '目标 135', status: 'danger', statusText: '偏少 0%',
    });
    const baseline = '<div class="ilife-block ilife-block-kpi-card">'
      + '<div class="ilife-block-kpi-card-label">蛋白</div>'
      + '<div class="ilife-block-kpi-card-value-row"><span class="ilife-block-kpi-card-value">0</span>'
      + '<span class="ilife-block-kpi-card-unit">克</span></div>'
      + '<div class="ilife-block-kpi-card-detail">目标 135</div>'
      + '<div class="ilife-block-kpi-card-badge">'
      + '<span class="ilife-status-badge ilife-status-badge-danger">偏少 0%</span></div>'
      + '</div>';
    assert.equal(html, baseline);
  });

  it('② 判定卡：不给 value 就**整格不出值位**（#518 W6 缺的正是这条）', () => {
    const html = renderKpiCard({ label: '本窗判定', status: 'ok', statusText: '达标', detail: '日均 1843 卡贴着目标' });
    assert.ok(!html.includes('kpi-card-value-row'), '值位整格不出');
    assert.match(html, /ilife-status-badge-ok">达标</);
    assert.match(html, /<div class="ilife-block-kpi-card-detail">日均 1843 卡贴着目标<\/div>/);
  });

  it('③ 还差 N：gap 出货徽章（带单位），与状态徽章同槽', () => {
    const html = renderKpiCard({ label: '热量', value: '860', unit: '卡', bar: { pct: 46 }, gap: { value: '990', unit: '卡' } });
    assert.match(html, /<span class="ilife-block-kpi-card-gap">还差 990 卡<\/span>/);
    const noUnit = renderKpiCard({ label: '饮水', value: '0', unit: '毫升', gap: { value: '4000' } });
    assert.match(noUnit, /<span class="ilife-block-kpi-card-gap">还差 4000<\/span>/);
  });

  it('④ 未记录：值位印 —、条归零、徽章「未记录」', () => {
    const html = renderKpiCard({ label: '饮水', unit: '毫升', detail: '目标 4000', pending: true, bar: { pct: 88 } });
    assert.match(html, /class="ilife-block ilife-block-kpi-card ilife-block-kpi-card-pending"/);
    assert.match(html, /<span class="ilife-block-kpi-card-value">—<\/span><span class="ilife-block-kpi-card-unit">毫升<\/span>/);
    assert.match(html, /bar-fill ilife-block-kpi-card-bar-low" style="width:0%"/, '未记录时进度归零，不显示假进度');
    assert.match(html, /<span class="ilife-block-kpi-card-gap">未记录<\/span>/);
  });

  it('⑤ 硬止：一个槽两个来源即点名拒（gap×status、pending×value）', () => {
    assert.throws(
      () => renderKpiCard({ label: 'x', value: '1', gap: { value: '2' }, status: 'ok' }),
      /gap 与 input\.status 只能给一个/,
    );
    assert.throws(
      () => renderKpiCard({ label: 'x', value: '1', pending: true }),
      /pending 与 input\.value 只能给一个/,
    );
  });

  it('⑥ 出口归属：KPI 卡只在**子路径**出口（`base-paint/blocks` 的 12 区块闭集），不进根出口', () => {
    assert.equal(typeof renderKpiCard, 'function');
    assert.equal(Object.prototype.hasOwnProperty.call(rootModule, 'renderKpiCard'), false,
      '区块件不进根出口——本判据同时钉住「新增扩参没有顺手改出口归属」');
    assert.equal(Object.prototype.hasOwnProperty.call(rootModule, 'renderConclusionBar'), false);
  });

  it('⑦ 样式面：gap 与 pending 两条规则在场', () => {
    const css = blocksCss();
    assert.ok(css.includes('.ilife-block-kpi-card-gap {'));
    assert.ok(css.includes('.ilife-block-kpi-card-pending .ilife-block-kpi-card-value {'));
  });
});

describe('#950 B2：结论条扩参', () => {
  it('① 逐字节兼容：串形态的产物＝真实产物页里那一条结论', () => {
    assert.equal(
      renderConclusionBar('热量在目标内，距目标还差 990 卡。'),
      '<p class="ilife-block-conclusion">热量在目标内，距目标还差 990 卡。</p>',
    );
  });

  it('② 对象形态：语气 ＋ 态徽标', () => {
    const html = renderConclusionBar({ text: '按暂停前的目标：热量在目标内，还差 990 卡。', tone: 'warn', badge: '目标暂停中' });
    assert.match(html, /^<p class="ilife-block-conclusion ilife-block-conclusion-tone-warn">/);
    assert.match(html, /<span class="ilife-block-conclusion-badge">目标暂停中<\/span>按暂停前的目标/);
  });

  it('③ 语气四档各出对应类；清单外点名拒', () => {
    for (const tone of ['ok', 'warn', 'danger', 'info']) {
      assert.match(renderConclusionBar({ text: 'x', tone }), new RegExp('ilife-block-conclusion-tone-' + tone));
    }
    assert.throws(() => renderConclusionBar({ text: 'x', tone: 'loud' }), /tone 必须是/);
  });

  it('④ 去月牙：强调条改由 ::before 承载，`border-left` 不再落在这条规则上', () => {
    const css = blocksCss();
    assert.ok(css.includes('.ilife-block-conclusion::before {'), '伪元素承载在场');
    const start = css.indexOf('.ilife-block-conclusion {');
    const rule = css.slice(start, css.indexOf('}', start));
    assert.ok(!rule.includes('border-left'), '旧 `border-left` 已撤（圆角不再裁它）');
    assert.ok(rule.includes('position: relative'), '伪元素的定位锚点在场');
    for (const tone of ['ok', 'warn', 'danger', 'info']) {
      assert.ok(css.includes('.ilife-block-conclusion-tone-' + tone + '::before {'), tone + ' 档的强调条色在位');
    }
    assert.ok(css.includes('.ilife-block-conclusion-badge {'), '态徽标样式在位');
  });
});
