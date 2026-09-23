// #950 B3（图表点数闸）＋ C1（正文列宽四档）判据（node:test）。
//
// 两条兼容线：① **不给新参数 ⇒ 旧行为一字不差**（B3 的闸缺省不启用；C1 的 `centered` 档选择器与值逐条不变，
// 基线取自真实产物页那段 CSS：`minmax(0, 1fr) 880px minmax(0, 1fr)`）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { charts, PAGE_COLUMNS, PAGE_COLUMN_WIDTH_PX, pageUiCss } from '../dist/index.js';

const onePoint = [{ label: '09-23', value: 860 }];
const twoPoints = [{ label: '09-22', value: 800 }, { label: '09-23', value: 860 }];

describe('#950 B3：ilife-charts 点数闸（minPoints）', () => {
  it('① 不给 `minPoints`：一个点照样出图（旧行为逐字节不变）', () => {
    const out = charts.line({ items: onePoint });
    assert.equal(out.empty, false, '缺省不启用闸 ⇒ 不是空态');
    assert.equal(out.points, 1);
    assert.ok(!out.html.includes('data-chart-empty'), '不出空态标记');
    assert.equal(
      charts.line({ items: onePoint }).html,
      charts.line({ items: onePoint, options: { minPoints: undefined } }).html,
      '显式给 undefined 与不给同结果',
    );
  });

  it('② 给了闸且点不足：走空态（`CHART_EMPTY_RULE = emptyState`），小字带数字', () => {
    const out = charts.line({ items: onePoint, options: { minPoints: 2 } });
    assert.equal(out.empty, true);
    assert.equal(out.points, 0);
    assert.ok(out.html.includes('data-chart-empty="1"'), '空态标记');
    assert.ok(out.html.includes('本窗只有 1 个点，画不出趋势（至少 2 个）'), '缺省小字带真数字：' + out.html.slice(0, 200));
  });

  it('③ 点够就照画；`emptyText` 仍是空态正文、`minPointsHint` 换那行小字', () => {
    assert.equal(charts.line({ items: twoPoints, options: { minPoints: 2 } }).empty, false);
    const out = charts.line({
      items: onePoint,
      options: { minPoints: 2, emptyText: '本窗只有 1 天有记录', minPointsHint: '有两天以上记录时这里出折线' },
    });
    assert.ok(out.html.includes('本窗只有 1 天有记录'), '正文取 emptyText');
    assert.ok(out.html.includes('有两天以上记录时这里出折线'), '小字取 minPointsHint');
  });

  it('④ 非法 `minPoints` 点名抛 `structure-invalid`（不新增错误码）', () => {
    for (const bad of [0, -1, 1.5, Number.NaN]) {
      assert.throws(
        () => charts.line({ items: onePoint, options: { minPoints: bad } }),
        (e) => e.code === 'structure-invalid' && /minPoints 必须是 ≥1 的整数/.test(e.message),
        '非法值：' + String(bad),
      );
    }
  });

  it('⑤ 柱／迷你线／散点／组合四支同吃这个闸', () => {
    assert.equal(charts.bar({ items: onePoint, options: { minPoints: 2 } }).empty, true, 'bar');
    assert.equal(charts.sparkline({ items: onePoint, options: { minPoints: 2 } }).empty, true, 'sparkline');
    assert.equal(charts.scatter({ items: [{ x: 0, y: 860 }], options: { minPoints: 2 } }).empty, true, 'scatter');
    assert.equal(charts.combo({ bars: onePoint, lines: [], options: { minPoints: 2 } }).empty, true, 'combo');
    assert.equal(charts.combo({ bars: twoPoints, lines: [], options: { minPoints: 2 } }).empty, false, 'combo 够点');
  });
});

describe('#950 C1：正文列宽四档（pageUiCss 的 column）', () => {
  it('① 缺省 `centered` ＝ 改前行为（880 居中 ＋ 满铺白名单 ＋ C2 守卫）', () => {
    const css = pageUiCss();
    // 真基线：真实产物页里那段 CSS 逐字（`今日总览_20260924_002519.html`）。
    assert.ok(css.includes('grid-template-columns: minmax(0, 1fr) 880px minmax(0, 1fr)'));
    assert.ok(css.includes('max-width: 880px'), '页头三级同宽');
    assert.equal((css.match(/> :where\(/g) || []).length, 2, '满铺白名单 ＋ C2 守卫两条 `:where()`');
    assert.equal(pageUiCss(), pageUiCss({}), '不给与给空对象同结果');
    assert.equal(pageUiCss(), pageUiCss({ column: 'centered' }), '显式 centered 与缺省同结果');
  });

  it('② `wide`：1120 居中（正文与页头同步）', () => {
    const css = pageUiCss({ column: 'wide' });
    assert.ok(css.includes('grid-template-columns: minmax(0, 1fr) 1120px minmax(0, 1fr)'));
    assert.ok(css.includes('max-width: 1120px'));
    assert.equal((css.match(/> :where\(/g) || []).length, 2, '满铺白名单仍在');
  });

  it('③ `full`：不收窄（无三列网格、无页头收窄）', () => {
    const css = pageUiCss({ column: 'full' });
    assert.ok(!css.includes('grid-template-columns: minmax(0, 1fr)'), '不出三列网格');
    assert.ok(!css.includes('block-page-shell-body > * {'), '不出「进中列」那条');
    assert.equal((css.match(/> :where\(/g) || []).length, 0);
  });

  it('④ `locked`：880 居中但满铺白名单失效（替两个包各写的垫片）', () => {
    const css = pageUiCss({ column: 'locked' });
    assert.ok(css.includes('grid-template-columns: minmax(0, 1fr) 880px minmax(0, 1fr)'));
    assert.ok(css.includes('block-page-shell-body > * {'), '所有子件进中列');
    assert.equal((css.match(/> :where\(/g) || []).length, 1, '只剩 C2 守卫那条（白名单已撤）');
  });

  it('⑤ 四档闭集 + 两档宽度常量；清单外点名拒', () => {
    assert.deepEqual([...PAGE_COLUMNS], ['centered', 'wide', 'full', 'locked']);
    assert.equal(PAGE_COLUMN_WIDTH_PX.centered, 880);
    assert.equal(PAGE_COLUMN_WIDTH_PX.wide, 1120);
    assert.throws(() => pageUiCss({ column: 'narrow' }), /input\.column 必须是 centered／wide／full／locked 之一/);
  });
});
