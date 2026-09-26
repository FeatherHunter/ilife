// #897 图例字号下限守卫（node:test）。
// 缺陷：窄屏媒体查询把图例覆盖为 11.5px，低于 PAGE_LIMITS.textMinPx=12，
// 含图例页 minFontPxNoSvg=11.5、判分 D5 字号项扣 5 分。
// 断言只读冻结口径（PAGE_LIMITS.textMinPx）与 chartsCss() 产物，不硬编码第二份值之外的字面量比较除外。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { chartsCss } from '../dist/charts.js';
import { PAGE_LIMITS } from '../dist/pageUi.js';
import { STYLE_PREFIX } from '../dist/index.js';

function legendSizesOf(css) {
  return [...css.matchAll(/charts-legend[^}]*font-size:([0-9.]+)px/g)].map((m) => Number(m[1]));
}

describe('#897 图例字号不得低于正文类下限', () => {
  it('缺省前缀：所有图例字号 ≥ textMinPx，且无 11.5px', () => {
    const css = chartsCss(STYLE_PREFIX);
    const sizes = legendSizesOf(css);
    assert.ok(sizes.length >= 2, '应含基规则与窄屏段两处图例字号，实得 ' + sizes.length);
    for (const s of sizes) {
      assert.ok(s >= PAGE_LIMITS.textMinPx, '图例字号 ' + s + 'px 低于下限 ' + PAGE_LIMITS.textMinPx + 'px');
    }
    assert.ok(!css.includes('charts-legend{font-size:11.5px}'), '不得残留 11.5px 图例覆盖');
  });

  it('自定义前缀：同规则机械改写，不残留缺省前缀的旧值', () => {
    const css = chartsCss('x-');
    const sizes = legendSizesOf(css);
    assert.ok(sizes.length >= 2, '自定义前缀下亦应含两处图例字号');
    for (const s of sizes) {
      assert.ok(s >= PAGE_LIMITS.textMinPx, '自定义前缀图例字号 ' + s + 'px 低于下限');
    }
    assert.ok(!css.includes('charts-legend{font-size:11.5px}'), '自定义前缀下不得残留 11.5px');
  });

  it('变异自证：把任一图例字号改小即红（本用例的判式本身有效）', () => {
    const css = chartsCss(STYLE_PREFIX).replace('charts-legend{font-size:12px}', 'charts-legend{font-size:11.5px}');
    const sizes = legendSizesOf(css);
    assert.ok(sizes.some((s) => s < PAGE_LIMITS.textMinPx), '变异体应被判式抓到（改回 11.5 即低于下限）');
  });
});
