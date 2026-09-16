// #458 折线跨空档虚线桥接（node:test）。
//
// 口径：缺省/'break' 与今天逐字节相同；'connect' 等价 connectNulls:true；
// 'dashed' 实线只连两侧都有记录的相邻点，跨空档段另出一条同色虚线桥接路径。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { STYLE_PREFIX } from '../dist/index.js';
import { charts } from '../dist/charts.js';

const P = STYLE_PREFIX;

function tagsOf(html, tag) {
  return [...html.matchAll(new RegExp('<' + tag + '\\b[^>]*>', 'g'))].map((m) => m[0]);
}

function attrsOf(html, tag, cls) {
  return tagsOf(html, tag)
    .filter((t) => cls === undefined || new RegExp('class="[^"]*' + cls + '[^"]*"').test(t))
    .map((t) => Object.fromEntries([...t.matchAll(/([a-zA-Z0-9-:]+)="([^"]*)"/g)].map((m) => [m[1], m[2]])));
}

function countOf(html, needle) {
  return html.split(needle).length - 1;
}

function pathD(html, cls) {
  const tag = tagsOf(html, 'path').find((t) => new RegExp('class="[^"]*' + cls + '[^"]*"').test(t));
  assert.ok(tag !== undefined, '未找到 class 含 ' + cls + ' 的 path');
  return (tag.match(/ d="([^"]*)"/) ?? [])[1];
}

const LINE_FIXED = { width: 320, height: 210, yMin: 0, yMax: 100, labels: 'none', showValues: false, grid: false };
const GAP = [
  { label: 'A', value: 0 },
  { label: 'B', value: null },
  { label: 'C', value: 100 },
];

function lineHtml(extra = {}, items = GAP) {
  return charts.line({ items, options: { ...LINE_FIXED, ...extra } }).html;
}

function dotsOf(html) {
  return attrsOf(html, 'circle', P + 'charts-dot');
}

describe('#458 gapStyle 跨空档虚线桥接', () => {
  it('缺省与 break 逐字节相同（null 处切段，2 个 M）', () => {
    const def = lineHtml();
    const brk = lineHtml({ gapStyle: 'break' });
    assert.equal(brk, def, 'break 必须与缺省逐字节相同');
    assert.equal(countOf(pathD(def, P + 'charts-line'), 'M'), 2, 'null 断点必须切段');
    assert.equal(countOf(def, P + 'charts-line-bridge'), 0, '缺省不得出桥接路径');
  });

  it('connect 等价 connectNulls:true（1 段直连）', () => {
    const viaGap = lineHtml({ gapStyle: 'connect' });
    const viaLegacy = lineHtml({ connectNulls: true });
    assert.equal(viaGap, viaLegacy, 'connect 必须等价 connectNulls:true');
    assert.equal(countOf(pathD(viaGap, P + 'charts-line'), 'M'), 1, 'connect 必须跨空直连');
    assert.equal(countOf(viaGap, P + 'charts-line-bridge'), 0, 'connect 不得出桥接路径');
  });

  it('dashed：实线只连实测相邻点，桥接段另出同色虚线', () => {
    const html = lineHtml({ gapStyle: 'dashed' });
    const solid = pathD(html, P + 'charts-line');
    assert.equal(countOf(solid, 'M'), 2, '实线只连两侧都有记录的相邻点');
    assert.equal(solid, pathD(lineHtml(), P + 'charts-line'), '实线几何与缺省断开档一致');
    const bridges = attrsOf(html, 'path', P + 'charts-line-bridge');
    assert.equal(bridges.length, 1, '跨空档段恰出一桥接路径');
    assert.equal(bridges[0]['stroke-dasharray'], '5 4', '桥接段虚线纹样');
    const solidStroke = attrsOf(html, 'path', P + 'charts-line')[0].stroke;
    assert.equal(bridges[0].stroke, solidStroke, '桥接段与数据线同色');
    assert.equal(countOf(bridges[0].d, 'M'), 1, '单空档桥接为一段');
    assert.ok(bridges[0].d.includes('L'), '桥接段连起空档两端点');
    // 桥接两端点即实线两段的端点（同坐标系直连，不补 0 不造点）。
    assert.ok(solid.includes(bridges[0].d.slice(1).split('L')[0]), '桥接起点落在实测点上');
  });

  it('dashed：首末空档不出桥接；点只画实测点、不补 0', () => {
    const leading = lineHtml({ gapStyle: 'dashed' }, [
      { label: 'A', value: null }, { label: 'B', value: 0 }, { label: 'C', value: 100 },
    ]);
    const trailing = lineHtml({ gapStyle: 'dashed' }, [
      { label: 'A', value: 0 }, { label: 'B', value: 100 }, { label: 'C', value: null },
    ]);
    assert.equal(countOf(leading, P + 'charts-line-bridge'), 0, '首日空档无下一段可接，不出桥接');
    assert.equal(countOf(trailing, P + 'charts-line-bridge'), 0, '末日空档无下一段可接，不出桥接');
    assert.equal(dotsOf(lineHtml({ gapStyle: 'dashed' })).length, 2, '点只画实测点');
    assert.deepEqual(dotsOf(lineHtml({ gapStyle: 'dashed' })).map((d) => d['data-i']), ['0', '2'], '空档日不画点');
    assert.deepEqual(dotsOf(leading).map((d) => d['data-i']), ['1', '2'], '首空档不补点');
    const allNull = charts.line({ items: [{ label: 'A', value: null }], options: { ...LINE_FIXED, gapStyle: 'dashed' } });
    assert.equal(allNull.empty, true);
    assert.equal(countOf(allNull.html, '<path'), 0, '全 null 不产出任何路径');
  });

  it('既有 dashed 仍是整线虚线（非逐段桥接，无等价实现）', () => {
    const html = lineHtml({ dashed: true });
    assert.equal(attrsOf(html, 'path', P + 'charts-line')[0]['stroke-dasharray'], '6 5', '整线虚线纹样保持 6 5');
    assert.equal(countOf(html, P + 'charts-line-bridge'), 0, '整线 dashed 不得产出桥接路径');
  });
});
