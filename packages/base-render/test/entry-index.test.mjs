/** entry-index（明细序号位）· **判据件**（#1135）。
 *
 *  断言对象：`dist/blocks.js` 的 `index` 位（renderDistributionRows／renderListRows）＋
 *  `dist/components/style/entry-index.js` 的槽类名与样式段。
 *  三组：① 加法式（不给 index＝与 #1135 之前逐字节相同）② 有序号（判地 .idx 同型：22px 方块＋序号 1..n）
 *  ③ 负向（坏取值一律 bad-input）。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { renderDistributionRows, renderListRows } from '../dist/blocks.js';
import { ENTRY_INDEX_BOX_PX, ENTRY_INDEX_RADIUS_PX, entryIndexCss, entryIndexSlot } from '../dist/components/style/entry-index.js';

const BARS = {
  layout: 'stacked',
  rows: [
    { label: '旅行/机票', value: '1880.00 元 · 1 笔 · 33.3%', pct: 100 },
    { label: '餐饮/外卖', value: '900.00 元 · 2 笔 · 16.0%', pct: 48 },
  ],
};
const LIST = { items: [{ main: '2026-02 · 100.00', right: '＋10.0%' }, { main: '2026-03 · 200.00', right: '＋20.0%' }] };

describe('entryIndex ① 加法式', () => {
  it('条卡行不给 index：没有序号位（与 #1135 之前逐字节相同）', () => {
    const html = renderDistributionRows(BARS);
    assert.ok(!html.includes('entry-index'), '不给 index 就不该有序号位');
    assert.ok(!html.includes('is-indexed'), '不给 index 就不该有 indexed 修饰类');
  });
  it('列表行不给 index：没有序号位', () => {
    const html = renderListRows(LIST);
    assert.ok(!html.includes('entry-index'), '不给 index 就不该有序号位');
  });
});

describe('entryIndex ② 有序号', () => {
  it('条卡行给了 index：每行左侧一枚 1..n，行带 indexed 修饰', () => {
    const html = renderDistributionRows({ ...BARS, rows: BARS.rows.map((r, i) => ({ ...r, index: i + 1 })) });
    const hits = [...html.matchAll(new RegExp('<span class="' + entryIndexSlot() + '">(\\d+)</span>', 'g'))].map((m) => m[1]);
    assert.deepEqual(hits, ['1', '2'], '序号 1..n 连续，取值照抄（本件只计数、不推断）');
    assert.ok(html.includes('is-indexed'), '行带 indexed 修饰类');
  });
  it('列表行给了 index：行最左侧出序号，标记类不变', () => {
    const html = renderListRows({ items: LIST.items.map((r, i) => ({ ...r, index: i + 1 })) });
    assert.ok(html.includes('<span class="' + entryIndexSlot() + '">1</span>'), '首行序号 1 在最左侧');
    assert.ok(html.includes('row-indexed'), '行带 row-indexed 修饰类');
  });
  it('序号也认字符串（判地那版是行序数字，但口径允许调用方传串）', () => {
    const html = renderListRows({ items: [{ main: 'm', index: '07' }] });
    assert.ok(html.includes('>' + '07' + '<'), '字符串照抄');
  });
  it('槽类名与几何常量：22px 见方、圆角 7px（判地 .idx 逐字）', () => {
    assert.equal(entryIndexSlot(), 'ilife-block-entry-index', '仓规前缀＋唯一拼法');
    assert.equal(ENTRY_INDEX_BOX_PX, 22, '见方边长 22px');
    assert.equal(ENTRY_INDEX_RADIUS_PX, 7, '圆角 7px');
    const css = entryIndexCss();
    assert.ok(css.includes('.ilife-block-entry-index'), '样式段认同一个槽类名（各写一份就会走散）');
    assert.ok(!css.includes('!important'), '序号样式零 !important');
  });
});

describe('entryIndex ③ 负向', () => {
  it('0／负数／非整数／NaN 一律 bad-input', () => {
    for (const bad of [0, -1, 1.5, NaN]) {
      assert.throws(() => renderListRows({ items: [{ main: 'm', index: bad }] }), /index/, 'index=' + String(bad) + ' 未抛错');
      assert.throws(() => renderDistributionRows({ layout: 'stacked', rows: [{ label: 'l', value: 'v', pct: 50, index: bad }] }), /index/, 'bars index=' + String(bad) + ' 未抛错');
    }
  });
  it('空串／对象／数组一律 bad-input', () => {
    for (const bad of ['', {}, []]) {
      assert.throws(() => renderListRows({ items: [{ main: 'm', index: bad }] }), /index/, 'index=' + JSON.stringify(bad) + ' 未抛错');
    }
  });
});
