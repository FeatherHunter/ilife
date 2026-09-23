// #950 B4 事实条扩参判据（`renderFactStrip`：缺数 ＋ 单位位）。
//
// 逐字节兼容线：给了字符串值、不给单位的既有调用点产物**一字不差**（下面 ① 断的就是这条）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { renderFactStrip, FACT_STRIP_MISSING_MARK } from '../dist/index.js';

describe('#950 B4：事实条扩参', () => {
  it('① 逐字节兼容：字符串值 ＋ 不给单位 ＝ 改前那条路', () => {
    const html = renderFactStrip({ items: [{ label: '拍摄', value: '5 月 30 日' }] });
    assert.equal(
      html,
      '<div class="ilife-block-fact-strip">'
      + '<div class="ilife-block-fact-strip-item">'
      + '<span class="ilife-block-fact-strip-label">拍摄</span>'
      + '<span class="ilife-block-fact-strip-value">5 月 30 日</span>'
      + '</div></div>',
    );
  });

  it('② 单位位：紧跟值位一枚小号单位', () => {
    const html = renderFactStrip({ items: [{ label: '周均摄入', value: '860', unit: '卡' }] });
    assert.match(html, /<span class="ilife-block-fact-strip-value">860<span class="ilife-block-fact-strip-unit">卡<\/span><\/span>/);
  });

  it('③ 缺数：`value: null` 印占位字 ＋ 降调类；与「0」在产物上分得开', () => {
    const missing = renderFactStrip({ items: [{ label: '饮水', value: null, unit: '毫升' }] });
    assert.ok(missing.includes('>' + FACT_STRIP_MISSING_MARK + '<'), '占位字是 —');
    assert.match(missing, /ilife-block-fact-strip-value ilife-block-fact-strip-value-missing/);
    assert.ok(!missing.includes('fact-strip-unit'), '没有数时单位位不出（单位无意义）');
    const zero = renderFactStrip({ items: [{ label: '饮水', value: '0', unit: '毫升' }] });
    assert.ok(!zero.includes('value-missing'), '「0」不是缺数');
    assert.ok(zero.includes('fact-strip-unit'), '「0」带单位');
  });

  it('④ 语气三档仍工作；空数组仍空串；缺数可与语气共存（语气在前）', () => {
    const ok = renderFactStrip({ items: [{ label: '热量', value: '860', tone: 'ok' }] });
    assert.match(ok, /ilife-block-fact-strip-value ilife-block-fact-strip-value-ok/);
    const both = renderFactStrip({ items: [{ label: '热量', value: null, tone: 'warn' }] });
    assert.match(both, /ilife-block-fact-strip-value ilife-block-fact-strip-value-warn ilife-block-fact-strip-value-missing/);
    assert.equal(renderFactStrip({ items: [] }), '');
  });

  it('⑤ 样式面：缺数与单位两条规则在场', () => {
    // 样式经 `pageShapeCss()` 落页，调用方不必另接；这里从根出口取同一函数的产物。
    return import('../dist/index.js').then((m) => {
      const css = m.pageShapeCss();
      assert.ok(css.includes('block-fact-strip-value-missing {'), '缺数规则');
      assert.ok(css.includes('block-fact-strip-unit {'), '单位规则');
    });
  });
});
