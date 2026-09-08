// #78 图表层守卫测试（node:test；随 root `pnpm test` 跑）。
//
// 覆盖判据：`.scratch/t78/OPTION-MATRIX.md` A–H 的**每个字段一条断言**（机读覆盖清单见文末
// `describe('H 常量与规则')` 的「覆盖清单」用例）。断言只读冻结常量，不硬编码第二份值；
// 坐标断言用「显式 yMin/yMax ＋ labels:'none' ＋ showValues:false ＋ grid:false」把映射钉成
// 整数算式，改错实现（含 6% padding、收敛、优先级、断点、取色顺序）即红。
//
// 纪律：不删、不放宽、不恒真化任何断言；每条断言都能因实现改错而红（变异自证见
// `.scratch/t78/a1-evidence.md`）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  ACTION_ID_ATTR,
  CHART_BREAKPOINTS,
  CHART_COORD_RULE,
  CHART_EMPTY_RULE,
  CHART_ERROR_CODES,
  CHART_KINDS,
  CHART_PALETTE,
  CHART_STRUCTURE_RULE,
  CHARTS_STYLE_ID,
  SHARED_HELPERS_JS_RULE,
  STATUS_DEFAULT_TEXT,
  STYLE_PREFIX,
} from '../dist/index.js';
import { ChartError, buildChartsHelpersJs, charts } from '../dist/charts.js';

const P = STYLE_PREFIX;

/* ── 测试小件 ─────────────────────────────────────────────────────────── */

function tagsOf(html, tag) {
  return [...html.matchAll(new RegExp('<' + tag + '\\b[^>]*>', 'g'))].map((m) => m[0]);
}

function attrsOf(html, tag, cls) {
  return tagsOf(html, tag)
    .filter((t) => cls === undefined || new RegExp('class="[^"]*' + cls + '[^"]*"').test(t))
    .map((t) => Object.fromEntries([...t.matchAll(/([a-zA-Z0-9-:]+)="([^"]*)"/g)].map((m) => [m[1], m[2]])));
}

function textsOf(html, cls) {
  return [...html.matchAll(new RegExp('<text[^>]*class="[^"]*' + cls + '[^"]*"[^>]*>([^<]*)</text>', 'g'))]
    .map((m) => m[1]);
}

/** 任意元素（`<span>`／`<div>`／`<text>`）的纯文本内容。 */
function contentsOf(html, cls) {
  return [...html.matchAll(new RegExp('<(\\w+)[^>]*class="[^"]*' + cls + '[^"]*"[^>]*>([^<]*)</', 'g'))]
    .map((m) => m[2]);
}

/** 图例条目文本（旧口径：色块 + 名称，纯文本）。 */
function legendTextsOf(html) {
  const noSwatch = html.replace(new RegExp('<span class="[^"]*' + P + 'charts-legend-swatch[^"]*"[^>]*></span>', 'g'), '');
  return [...noSwatch.matchAll(new RegExp('<span class="[^"]*' + P + 'charts-legend-item[^"]*">([^<]*)</span>', 'g'))]
    .map((m) => m[1]);
}

function countOf(html, needle) {
  return html.split(needle).length - 1;
}

function viewBoxOf(html) {
  const m = html.match(/viewBox="([^"]+)"/);
  return m === null ? null : m[1];
}

const LF_CHAR = String.fromCharCode(10);
const LINE_COMMENT_RE = new RegExp('(^|[^:])//[^' + LF_CHAR + ']*', 'g');

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(LINE_COMMENT_RE, '$1');
}

/** 行内断言：`<path class="…-line" d="…">` 的 d。 */
function pathD(html, cls) {
  const tag = tagsOf(html, 'path').find((t) => new RegExp('class="[^"]*' + cls + '[^"]*"').test(t));
  assert.ok(tag !== undefined, '未找到 class 含 ' + cls + ' 的 path');
  return (tag.match(/ d="([^"]*)"/) ?? [])[1];
}

/** 取**被测元素本身**的开标签（FX-78-V3-03：属性断言必须落在被测标签上，不能被同名属性旁证满足）。 */
function tagOf(html, tag, cls) {
  return tagsOf(html, tag).find((t) => new RegExp('class="[^"]*' + cls + '[^"]*"').test(t));
}

const LINE3 = [
  { label: 'A', value: 0 },
  { label: 'B', value: 50 },
  { label: 'C', value: 100 },
];
/** 旧版缺省单序列色（`var(--blue,#007aff)` 带 fallback）。 */
const DEFAULT_BAR_COLOR = 'var(--blue,#007aff)';
/** 显式域 + 无标签/无值标签/无网格 → 折线映射 = y(v) = 202 - v/100*194（见 a1-evidence.md）。 */
const LINE_FIXED = { width: 320, height: 210, yMin: 0, yMax: 100, labels: 'none', showValues: false, grid: false };

function lineHtml(extra = {}, items = LINE3) {
  return charts.line({ items, options: { ...LINE_FIXED, ...extra } }).html;
}

/** 不传 yMin/yMax 的折线（用于验证数据域 + 6% padding）。 */
function lineAuto(extra = {}, items = LINE3) {
  return charts.line({
    items,
    options: { width: 320, height: 210, labels: 'none', showValues: false, grid: false, ...extra },
  }).html;
}

function dotsOf(html, cls = P + 'charts-dot') {
  return attrsOf(html, 'circle', cls);
}

/* ── A. 通用选项 ChartCommonOptions ───────────────────────────────────── */

describe('A 通用选项 ChartCommonOptions', () => {
  it('A.height / A.width：viewBox 宽高逐值生效，缺省按 kind', () => {
    assert.equal(viewBoxOf(lineHtml({ width: 400, height: 240 })), '0 0 400.0 240.0');
    const defaults = {
      bar: charts.bar({ items: [{ label: 'A', value: 1 }] }).html,
      line: charts.line({ items: [{ label: 'A', value: 1 }] }).html,
      donut: charts.donut({ items: [{ label: 'A', value: 1 }] }).html,
      progress: charts.progress({ pct: 1 }).html,
      combo: charts.combo({ bars: [{ label: 'A', value: 1 }], lines: [{ label: 'A', value: 2 }] }).html,
      sparkline: charts.sparkline({ items: [{ label: 'A', value: 1 }] }).html,
      gauge: charts.gauge({ pct: 1 }).html,
      scatter: charts.scatter({ items: [{ x: 1, y: 1 }] }).html,
    };
    assert.deepEqual(
      Object.fromEntries(Object.entries(defaults).map(([k, html]) => [k, viewBoxOf(html)])),
      {
        bar: '0 0 320.0 170.0',
        line: '0 0 320.0 210.0',
        donut: '0 0 150.0 150.0',
        progress: '0 0 100.0 8.0',
        combo: '0 0 320.0 170.0',
        sparkline: '0 0 90.0 30.0',
        gauge: '0 0 170.0 105.0',
        scatter: '0 0 320.0 180.0',
      },
      '缺省尺寸必须按 kind 区分（旧版桌面缺省高度逐值）',
    );
  });

  it('A.compact：内边距收紧 → 首点 x 由 14.0 收到 6.0', () => {
    const wide = dotsOf(lineHtml());
    const tight = dotsOf(lineHtml({ compact: true }));
    assert.equal(wide[0].cx, '14.0');
    assert.equal(tight[0].cx, '6.0');
    assert.notEqual(lineHtml(), lineHtml({ compact: true }), 'compact 必须改变产出串');
  });

  it('A.color：单序列描边/填充 = 该值', () => {
    assert.equal((tagsOf(lineHtml({ color: '#123456' }), 'path')[0].match(/stroke="([^"]*)"/) ?? [])[1], '#123456');
    const bar = charts.bar({ items: [{ label: 'A', value: 1 }], options: { color: '#123456' } }).html;
    assert.equal(attrsOf(bar, 'rect', P + 'charts-bar')[0].fill, '#123456');
    const donut = charts.donut({ items: [{ label: 'A', value: 1 }], options: { color: '#123456' } }).html;
    assert.equal(attrsOf(donut, 'circle', P + 'charts-arc')[0].stroke, '#123456');
  });

  it('A.colors：逐点/逐段按色板顺序覆盖', () => {
    const bar = charts.bar({
      items: [{ label: 'A', value: 1 }, { label: 'B', value: 2 }, { label: 'C', value: 3 }],
      options: { colors: ['#111111', '#222222', '#333333'] },
    }).html;
    assert.deepEqual(attrsOf(bar, 'rect', P + 'charts-bar').map((r) => r.fill), ['#111111', '#222222', '#333333']);
    const donut = charts.donut({
      items: [{ label: 'A', value: 1 }, { label: 'B', value: 2 }],
      options: { colors: ['#111111', '#222222'] },
    }).html;
    assert.deepEqual(attrsOf(donut, 'circle', P + 'charts-arc').map((r) => r.stroke), ['#111111', '#222222']);
  });

  it('A.format：数值文本经 format(v) 输出（哨兵函数被调用）', () => {
    const calls = [];
    const html = lineHtml({ showValues: true, format: (v) => { calls.push(v); return '«' + v + '»'; } });
    assert.deepEqual(calls, [0, 50, 100], 'format 必须按数据值逐点调用');
    assert.deepEqual(textsOf(html, P + 'charts-value'), ['«0»', '«50»', '«100»']);
    assert.deepEqual(textsOf(lineHtml({ showValues: true }), P + 'charts-value'), ['0', '50', '100']);
  });

  it('A.animation：缺省含动画类，false 时不含', () => {
    assert.ok(lineHtml().includes(P + 'charts-anim'));
    assert.ok(!lineHtml({ animation: false }).includes(P + 'charts-anim'));
  });

  it('A.emptyText：空态文本 = 该值；缺省取冻结 STATUS_DEFAULT_TEXT.empty', () => {
    const custom = charts.bar({ items: [], options: { emptyText: '无记录' } });
    assert.equal(custom.empty, true);
    assert.equal(custom.points, 0);
    assert.equal(countOf(custom.html, '无记录'), 1);
    assert.ok(custom.html.includes('data-chart-empty="1"'));
    const fallback = charts.bar({ items: [] });
    assert.equal(countOf(fallback.html, STATUS_DEFAULT_TEXT.empty), 1);
    assert.ok(!fallback.html.includes('无记录'));
  });

  it('A.tooltip：产出 tooltip 数据属性（零内联脚本）', () => {
    const on = charts.bar({ items: [{ label: 'A', value: 1 }], options: { tooltip: true } }).html;
    assert.deepEqual(attrsOf(on, 'rect', P + 'charts-bar').map((r) => r['data-tip']), ['A: 1']);
    assert.ok(!on.includes('onclick='));
    const off = charts.bar({ items: [{ label: 'A', value: 1 }] }).html;
    assert.equal(countOf(off, 'data-tip'), 0);
  });

  it('A.labels：edge/all/none/select 改变 X 轴标签集合', () => {
    const items = [
      { label: 'A', value: 1 }, { label: 'B', value: 2 }, { label: 'C', value: 9 },
      { label: 'D', value: 3 }, { label: 'E', value: 4 },
    ];
    const labels = (mode) => textsOf(lineHtml({ labels: mode }, items), P + 'charts-xlabel');
    assert.deepEqual(labels('all'), ['A', 'B', 'C', 'D', 'E']);
    assert.deepEqual(labels('edge'), ['A', 'E']);
    assert.deepEqual(labels('none'), []);
    assert.deepEqual(labels('select'), ['A', 'C', 'E'], 'select = 首 + 峰值 + 尾（旧 charts.js:655）');
  });

  it('A.showValues：true / edge / false 改变数值标签集合', () => {
    const items = [{ label: 'A', value: 1 }, { label: 'B', value: 2 }, { label: 'C', value: 3 }];
    const values = (mode) => textsOf(lineHtml({ showValues: mode, yMax: 3, yMin: 1 }, items), P + 'charts-value');
    assert.deepEqual(values(true), ['1', '2', '3']);
    assert.deepEqual(values('edge'), ['1', '3'], "edge 只标首尾有效点");
    assert.deepEqual(values(false), []);
    /* FX-78-V2a-4.1 / V3-06：`showValues:true` 的**相邻中心距 < 26 单位跳过**（`charts.ts:490`）必须被钉死
     * ——删掉该阈值后 40 点场景标签数 10 → 40，原三条断言全绿。
     * 40 点 / width:320 / labels:'none' → frame x0 14 / x1 306（w=292）、点距 292/39 = 7.487 →
     * 每 4 点落一个标签 = 10 条（首点 14.0、末个标签是第 37 点 283.5）。 */
    const dense = (n) => Array.from({ length: n }, (_, i) => ({ label: 'P' + i, value: (i % 7) + 1 }));
    const labelXs = (n, width = 320) => attrsOf(
      charts.line({ items: dense(n), options: { width, height: 210, labels: 'none', showValues: true, grid: false } }).html,
      'text',
      'ilife-charts-value',
    ).map((t) => Number(t.x));
    const gapsOf = (xs) => xs.slice(1).map((x, i) => x - xs[i]);
    assert.equal(labelXs(40).length, 10, '40 点密集数据只标 10 个值（26 单位避让）');
    assert.equal(labelXs(40)[0], 14, '首个标签落在首个数据点');
    assert.equal(labelXs(40)[labelXs(40).length - 1], 283.5, '末个标签是第 37 点（不是末点）');
    assert.ok(gapsOf(labelXs(40)).every((g) => g >= 26), '相邻标签中心距必须 ≥ 26 单位');
    /* 阈值临界（w = width - 28）：把点距压到 26 两侧，把阈值**恰好钉在 26**。
     * n=12 → 292/11 = 26.545（≥26 全留 12 条）；n=13 → 292/12 = 24.333（<26 → 隔点跳过 7 条）；
     * width 334 → 306/12 = 25.5（阈值若是 25 会全留 13 条）；width 346 → 318/12 = 26.5（阈值若是 27 会只剩 7 条）。 */
    assert.equal(labelXs(12).length, 12, '点距 26.5 ≥ 26 → 全标');
    assert.equal(labelXs(13).length, 7, '点距 24.3 < 26 → 隔点跳过');
    assert.equal(labelXs(13, 334).length, 7, '点距 25.5 < 26 → 跳过（证明阈值不是 25）');
    assert.equal(labelXs(13, 346).length, 13, '点距 26.5 ≥ 26 → 全标（证明阈值不是 27）');
  });

  it('A.labelRotate：X 标签带 rotate 变换', () => {
    const html = lineHtml({ labels: 'all', labelRotate: 45 });
    const first = attrsOf(html, 'text', P + 'charts-xlabel')[0];
    assert.match(first.transform, /^rotate\(45 [\d.]+ [\d.]+\)$/);
    assert.equal(countOf(lineHtml({ labels: 'all' }), 'rotate('), 0);
  });

  it('A.yMin / A.yMax：显式域优先于数据域', () => {
    const items = [{ label: 'A', value: 0 }, { label: 'B', value: 5 }, { label: 'C', value: 10 }];
    const mid = (extra) => dotsOf(lineHtml({ yMin: 0, ...extra }, items))[1].cy;
    assert.equal(mid({ yMax: 10 }), '105.0');
    assert.equal(mid({ yMax: 100 }), '192.3');
    assert.notEqual(mid({ yMax: 10 }), mid({}));
  });

  it('A.grid：false 时无网格线，缺省 3 条', () => {
    assert.equal(countOf(lineHtml(), P + 'charts-grid'), 0);
    assert.equal(countOf(lineHtml({ grid: true }), P + 'charts-grid'), 3);
    assert.equal(countOf(charts.bar({ items: [{ label: 'A', value: 1 }] }).html, P + 'charts-grid'), 3);
  });

  it('A.actionId：交互元素带 ACTION_ID_ATTR = 该值', () => {
    const html = lineHtml({ actionId: 'open-detail' });
    const container = tagsOf(html, 'div')[0];
    assert.equal((container.match(new RegExp(ACTION_ID_ATTR + '="([^"]*)"')) ?? [])[1], 'open-detail');
    assert.deepEqual(dotsOf(html).map((d) => d[ACTION_ID_ATTR]), ['open-detail', 'open-detail', 'open-detail']);
    assert.equal(countOf(lineHtml(), ACTION_ID_ATTR), 0);
  });
});

/* ── B. LineChartOptions ──────────────────────────────────────────────── */

describe('B LineChartOptions', () => {
  it('B.lineWidth / B.dashed：stroke-width 与 stroke-dasharray', () => {
    const path = tagsOf(lineHtml({ lineWidth: 4, dashed: true }), 'path')[0];
    assert.equal((path.match(/stroke-width="([^"]*)"/) ?? [])[1], '4');
    assert.equal((path.match(/stroke-dasharray="([^"]*)"/) ?? [])[1], '6 5');
    assert.equal(countOf(lineHtml({ lineWidth: 4 }), 'stroke-dasharray'), 0);
  });

  it('B.smooth：Catmull-Rom 路径，点仍在线上，d 与直线不同', () => {
    const straight = pathD(lineHtml(), P + 'charts-line');
    const smooth = pathD(lineHtml({ smooth: true }), P + 'charts-line');
    assert.ok(smooth.includes(' C'), '平滑路径必须含三次贝塞尔段');
    assert.notEqual(smooth, straight);
    assert.equal(straight, 'M14.0 202.0L160.0 105.0L306.0 8.0');
    /* FX-78-V3-05 / W2 / V2a-4.2：控制点**逐值**钉死（Catmull-Rom 系数 /6 → /5 时上面几条全绿）。
     * 3 点 → 2 段 C：c1 = p1 + (p2-p0)/6、c2 = p2 - (p3-p1)/6（首尾点用端点自身夹取）。 */
    assert.equal(smooth, 'M14.0 202.0 C38.3 185.8 111.3 137.3 160.0 105.0 C208.7 72.7 281.7 24.2 306.0 8.0', 'smooth 路径 d 逐值');
    const five = [1, 3, 2, 5, 4].map((v, i) => ({ label: String(i), value: v }));
    assert.equal(
      pathD(charts.line({ items: five, options: { ...LINE_FIXED, smooth: true } }).html, 'ilife-charts-line'),
      'M14.0 200.1 C26.2 199.4 62.7 196.5 87.0 196.2 C111.3 195.9 135.7 198.8 160.0 198.1 C184.3 197.5 208.7 192.9 233.0 192.3 C257.3 191.7 293.8 193.9 306.0 194.2',
      '5 点曲线逐值（覆盖 p0 ?? seg[i] 与 p3 ?? seg[i+1] 两端夹取）',
    );
    assert.equal(
      pathD(charts.line({ items: [{ label: 'A', value: 0 }, { label: 'B', value: 100 }], options: { ...LINE_FIXED, smooth: true } }).html, 'ilife-charts-line'),
      'M14.0 202.0L306.0 8.0',
      '不足 3 点退化为直线段（smoothPath 的 seg.length < 3 分支）',
    );
  });

  it('B.step：阶梯路径（水平段 + 垂直段）', () => {
    assert.equal(
      pathD(lineHtml({ step: true }), P + 'charts-line'),
      'M14.0 202.0 L160.0 202.0 L160.0 105.0 L306.0 105.0 L306.0 8.0',
    );
  });

  it('B.showDots / B.dotSize / B.dotStyle：点开关 / 半径 / 样式', () => {
    assert.equal(dotsOf(lineHtml()).length, 3);
    assert.equal(dotsOf(lineHtml({ showDots: false })).length, 0);
    assert.deepEqual(dotsOf(lineHtml({ dotSize: 12 })).map((d) => d.r), ['6', '6', '6']);
    assert.equal(dotsOf(lineHtml({ dotSize: 12 }))[0].r, '6');
    const styled = dotsOf(lineHtml({ dotStyle: 'opacity:.4' }))[0];
    assert.equal(styled.style, 'opacity:.4');
    assert.equal(dotsOf(lineHtml())[0].style, undefined);
  });

  it('B.area / B.areaOpacity：面积填充与透明度', () => {
    const html = lineHtml({ area: true, areaOpacity: 0.2 });
    const area = attrsOf(html, 'path', P + 'charts-area')[0];
    assert.equal(area['fill-opacity'], '0.2');
    assert.equal(area.fill, '#007aff');
    /* FX-78-V3-04 / W1：只断 `endsWith('Z')` 时，基线 y 由 `frame.y1` 改成 `frame.y0`（面积翻到顶部）
     * 仍绿 → 断精确 d（与 :271／:383 的直线/均线同口径）。 */
    assert.equal(area.d, 'M14.0 202.0L160.0 105.0L306.0 8.0 L306.0 202.0 L14.0 202.0 Z', '面积路径逐值（基线 = frame.y1 = 202）');
    assert.equal(
      pathD(lineHtml({ area: true, yMin: -100, yMax: 100 }), 'ilife-charts-area'),
      'M14.0 105.0L160.0 56.5L306.0 8.0 L306.0 202.0 L14.0 202.0 Z',
      '换域后基线仍贴绘图区底',
    );
    assert.equal(
      pathD(lineHtml({ area: true }, [{ label: 'A', value: 0 }, { label: 'B', value: null }, { label: 'C', value: 100 }]), 'ilife-charts-area'),
      'M14.0 202.0M306.0 8.0 L306.0 202.0 L14.0 202.0 Z',
      'null 断点：两段各自闭合，基线仍 y1',
    );
    assert.equal(countOf(lineHtml({ area: true }), P + 'charts-area'), 1);
    assert.equal(countOf(lineHtml(), P + 'charts-area'), 0);
  });

  it('B.yTicks：false 无刻度；数字收敛 2-6；刻度值 = 共享域（含 6% padding，尊重 yMin/yMax）', () => {
    const items = [{ label: 'A', value: 0 }, { label: 'B', value: 10 }];
    const tickTexts = (extra) => textsOf(lineAuto(extra, items), P + 'charts-tick');
    assert.deepEqual(tickTexts({}), [], 'yTicks 缺省 false → 无刻度');
    assert.deepEqual(tickTexts({ yTicks: 2 }), ['-0.6', '10.6'], '6% padding：span 10 → pad 0.6');
    assert.deepEqual(tickTexts({ yTicks: 1 }), ['-0.6', '10.6'], '下界收敛到 2');
    assert.equal(tickTexts({ yTicks: 9 }).length, 6, '上界收敛到 6');
    assert.deepEqual(tickTexts({ yTicks: 2, yMin: 0, yMax: 100 }), ['0', '100'], '显式域优先');
    assert.equal(countOf(lineAuto({ yTicks: 2 }), P + 'charts-ytick'), 2, '刻度短线与文字同数');
    /* FX-78-V2a-4.4：`yTicks` 非整数取 `Math.round`（`charts.ts:416`）——改 `Math.floor` 时
     * 2.6/3.6/5.6 会分别掉到 2/3/5 条，原四条断言（1／2／9／false）全绿。 */
    assert.deepEqual(tickTexts({ yTicks: 2.6 }), ['-0.6', '5', '10.6'], '2.6 → 3 条（round；floor 得 2 条）');
    assert.deepEqual(tickTexts({ yTicks: 3.6 }), ['-0.6', '3.13', '6.87', '10.6'], '3.6 → 4 条（round；floor 得 3 条）');
    assert.equal(tickTexts({ yTicks: 5.6 }).length, 6, '5.6 → 6 条（round；floor 得 5 条）');
    assert.equal(tickTexts({ yTicks: 2.4 }).length, 2, '2.4 → 2 条');
  });

  it('B.connectNulls：跨空连线；点只在有值处；首尾 null 不外延；全 null 仍空', () => {
    const withGap = [
      { label: 'A', value: 0 },
      { label: 'B', value: null },
      { label: 'C', value: 100 },
    ];
    const broken = pathD(lineHtml({}, withGap), P + 'charts-line');
    const joined = pathD(lineHtml({ connectNulls: true }, withGap), P + 'charts-line');
    assert.equal(countOf(broken, 'M'), 2, 'null 断点必须切段');
    assert.equal(countOf(joined, 'M'), 1, 'connectNulls 必须跨空直连');
    assert.equal(dotsOf(lineHtml({}, withGap)).length, 2, '数据点只在有值处渲染');
    const leading = pathD(lineHtml({ connectNulls: true }, [
      { label: 'A', value: null }, { label: 'B', value: 0 }, { label: 'C', value: 100 },
    ]), P + 'charts-line');
    assert.equal(leading, 'M160.0 202.0L306.0 8.0', '首部 null 不得向图外延伸（逐值）');
    const trailing = pathD(lineHtml({ connectNulls: true }, [
      { label: 'A', value: 0 }, { label: 'B', value: 100 }, { label: 'C', value: null },
    ]), P + 'charts-line');
    assert.equal(trailing, 'M14.0 202.0L160.0 8.0', '尾部 null 不得向图外延伸（逐值）');
    const allNull = charts.line({ items: [{ label: 'A', value: null }], options: LINE_FIXED });
    assert.equal(allNull.empty, true);
    assert.equal(allNull.points, 0);
    /* 非自证：全 null 不只是 `empty/points`，产出里**不能有任何路径**（R2-M5）。 */
    assert.deepEqual(attrsOf(allNull.html, 'path', P + 'charts-line'), [], '全 null 不得产出折线路径');
    assert.equal(countOf(allNull.html, '<path'), 0, '全 null 产出里一个 path 都没有');
    assert.equal(countOf(allNull.html, ' d="'), 0, '无 d 属性（NaN 坐标也会在这里露头）');
  });

  it('B.legend / B.series[].ownScale：图例块 + ownScale 注记', () => {
    const html = charts.line({
      items: [{ label: 'A', value: 0 }, { label: 'B', value: 10 }],
      options: {
        ...LINE_FIXED,
        yMin: 0,
        yMax: 10,
        legend: true,
        series: [{ name: '主指标', items: [{ label: 'A', value: 0 }, { label: 'B', value: 1 }], ownScale: true }],
      },
    }).html;
    assert.equal(attrsOf(html, 'div', P + 'charts-legend').length, 1, 'legend 必须出现图例块');
    assert.deepEqual(legendTextsOf(html), ['主指标', '各指标独立刻度']);
    const named = charts.line({
      items: LINE3,
      options: { ...LINE_FIXED, legend: true, series: [{ name: '甲', items: LINE3 }] },
    }).html;
    assert.deepEqual(legendTextsOf(named), ['甲'], '无 ownScale 系列时不得追加注记');
    const off = charts.line({
      items: LINE3,
      options: { ...LINE_FIXED, series: [{ name: '甲', items: LINE3 }] },
    }).html;
    assert.equal(countOf(off, P + 'charts-legend'), 0, 'legend=false 不渲染图例');
    /* FX-78-V2a-5.2：`series[].name === ''` 被图例排除（`charts.ts:850` `s.name !== ''`）——
     * 原用例无空名序列，该分支不可达。 */
    const blank = charts.line({
      items: LINE3,
      options: { ...LINE_FIXED, legend: true, series: [{ name: '', items: LINE3 }] },
    }).html;
    assert.equal(attrsOf(blank, 'div', 'ilife-charts-legend').length, 0, "name === '' 的序列不进图例（空图例块也不渲染）");
    assert.equal(attrsOf(blank, 'path', 'ilife-charts-line').length, 1, '序列本身仍渲染');
  });

  it('B.highlightLast：最后一个有效点高亮 + 数值（受 showValues/labels 门控）', () => {
    const html = lineHtml({ highlightLast: true, showValues: false });
    const last = attrsOf(html, 'circle', P + 'charts-dot-last');
    assert.equal(last.length, 1);
    assert.equal(last[0].cy, '8.0');
    assert.equal(last[0].cx, '306.0');
    /* 末值文本受 `showValues`／`labels:'select'` 门控（旧 `charts.js:619-621`）：
     * `showValues:false` 且 `labels!=='select'` → 只留高亮圈，不追加数值标签（R2-N5）。 */
    assert.deepEqual(textsOf(html, P + 'charts-value-last'), [], 'showValues:false 时不得追加末值标签');
    assert.deepEqual(textsOf(lineHtml({ highlightLast: true, showValues: true }), P + 'charts-value-last'), ['100']);
    assert.deepEqual(textsOf(lineHtml({ highlightLast: true, showValues: false, labels: 'select' }), P + 'charts-value-last'), ['100'], "labels:'select' 单独也放行");
    assert.equal(countOf(lineHtml(), P + 'charts-dot-last'), 0);
  });

  it('B.avgLine：均线序列（窗口收敛 3..items.length）', () => {
    const items = [1, 2, 3, 4, 5].map((v, i) => ({ label: String(i), value: v }));
    const fixed = { ...LINE_FIXED, yMin: 1, yMax: 5, avgLine: 3 };
    const d = pathD(charts.line({ items, options: fixed }).html, P + 'charts-avg');
    assert.equal(d, 'M14.0 202.0L87.0 177.8L160.0 153.5L233.0 105.0L306.0 56.5');
    const wide = pathD(charts.line({ items, options: { ...fixed, avgLine: 100 } }).html, P + 'charts-avg');
    assert.equal(wide, 'M14.0 202.0L87.0 177.8L160.0 153.5L233.0 129.3L306.0 105.0', '窗口上限收敛到 items.length');
    const html = charts.line({ items, options: fixed }).html;
    const avg = attrsOf(html, 'path', P + 'charts-avg')[0];
    assert.equal(avg['stroke-dasharray'], '6 5');
    assert.equal(avg.stroke, 'var(--fg3,#86868b)');
    assert.equal(countOf(lineHtml(), P + 'charts-avg'), 0);
    /* 传了 `series` 就不叠加均线（旧 `charts.js:414` `if(opt.avgLine&&!opt.series)`）：判据是
     * 「调用方是否传 series」，不是「series 长度是否为 1」——单条 series 同样不叠加（R2-N6）。 */
    const withOneSeries = charts.line({ items, options: { ...fixed, series: [{ name: '甲', items }] } }).html;
    assert.equal(countOf(withOneSeries, P + 'charts-avg'), 0, 'series 存在（哪怕只有 1 条）不得叠加均线');
    assert.equal(attrsOf(withOneSeries, 'path', P + 'charts-line').length, 1, '只剩主序列一条折线路径');
    assert.equal(charts.line({ items, options: { ...fixed, series: [{ name: '甲', items }] } }).points, 5);
  });

  it('B.markLine.value：水平阈值虚线 + 文字', () => {
    const html = lineHtml({ markLine: { value: 50 } });
    const line = attrsOf(html, 'line', P + 'charts-markline')[0];
    assert.equal(line.y1, '105.0');
    assert.equal(line.stroke, '#ff9500', '缺省线色 #ff9500');
    assert.equal(line['stroke-dasharray'], '5 4');
    assert.deepEqual(textsOf(html, P + 'charts-marktext'), ['50']);
    assert.deepEqual(textsOf(lineHtml({ markLine: { value: 50, label: '目标' } }), P + 'charts-marktext'), ['目标']);
    assert.deepEqual(textsOf(lineHtml({ markLine: { value: 50, color: '#abcdef' } }), P + 'charts-marktext'), ['50']);
    assert.equal(attrsOf(lineHtml({ markLine: { value: 50, color: '#abcdef' } }), 'line', P + 'charts-markline')[0].stroke, '#abcdef');
  });

  it('B.markLine.xValue：垂直虚线（索引或 label）+ 顶部标注 + 贴边锚定', () => {
    const byIndex = lineHtml({ markLine: { xValue: 1 } });
    const vline = attrsOf(byIndex, 'line', P + 'charts-markline-v')[0];
    assert.equal(vline.x1, '160.0');
    assert.equal(vline.stroke, '#ff9500');
    assert.deepEqual(textsOf(byIndex, P + 'charts-marktext-v'), ['B']);
    const byLabel = lineHtml({ markLine: { xValue: 'C' } });
    assert.equal(attrsOf(byLabel, 'line', P + 'charts-markline-v')[0].x1, '306.0');
    assert.deepEqual(textsOf(byLabel, P + 'charts-marktext-v'), ['C']);
    assert.deepEqual(textsOf(lineHtml({ markLine: { xValue: 'C', label: '拐点' } }), P + 'charts-marktext-v'), ['拐点']);
    assert.equal(attrsOf(lineHtml({ markLine: { xValue: 0 } }), 'text', P + 'charts-marktext-v')[0]['text-anchor'], 'start');
    assert.equal(attrsOf(lineHtml({ markLine: { xValue: 2 } }), 'text', P + 'charts-marktext-v')[0]['text-anchor'], 'end');
    assert.equal(attrsOf(byIndex, 'text', P + 'charts-marktext-v')[0]['text-anchor'], 'middle');
    assert.equal(countOf(lineHtml({ markLine: { xValue: 99 } }), P + 'charts-markline-v'), 0, '越界索引忽略不报错');
    assert.equal(countOf(lineHtml({ markLine: { xValue: '不存在' } }), P + 'charts-markline-v'), 0);
  });

  it('B.markPoint：true = 主序列最大值点；{index} 越界忽略；{value} 首个匹配', () => {
    const items = [{ label: 'A', value: 1 }, { label: 'B', value: 9 }, { label: 'C', value: 3 }];
    const mark = (mp) => attrsOf(lineHtml({ markPoint: mp, yMin: 0, yMax: 10 }, items), 'circle', P + 'charts-markpoint');
    assert.deepEqual(mark(true).map((m) => m.cx), ['160.0'], 'true → 最大值点（index 1）');
    assert.deepEqual(textsOf(lineHtml({ markPoint: true, yMin: 0, yMax: 10 }, items), P + 'charts-mptext'), ['9']);
    assert.deepEqual(mark({ index: 0 }).map((m) => m.cx), ['14.0']);
    assert.deepEqual(mark({ index: 99 }), [], '越界 index 忽略不报错');
    assert.deepEqual(mark({ value: 3 }).map((m) => m.cx), ['306.0']);
    assert.deepEqual(textsOf(lineHtml({ markPoint: { index: 0, label: '谷' }, yMin: 0, yMax: 10 }, items), P + 'charts-mptext'), ['谷']);
    assert.equal(mark({ index: 0 })[0].stroke, 'var(--card,#ffffff)', '白边');
    assert.equal(mark({ index: 0 })[0].fill, 'var(--blue,#007aff)', '缺省标注色 = 序列色');
    assert.equal(mark({ index: 0, color: '#abcdef' })[0].fill, '#abcdef', 'markPoint.color 覆盖标注色');
    assert.equal(countOf(lineHtml({}, items), P + 'charts-markpoint'), 0);
  });

  it('B.band：等长校验 / 任一侧 null 断开 / fill-opacity 0.15 / 值并入共享域', () => {
    const items = [{ label: 'A', value: 0 }, { label: 'B', value: 10 }];
    const band = { hi: [5, 100], lo: [0, 5] };
    const html = lineAuto({ band, yTicks: 2 }, items);
    assert.equal(attrsOf(html, 'path', P + 'charts-band')[0]['fill-opacity'], '0.15');
    assert.deepEqual(textsOf(html, P + 'charts-tick'), ['-6', '106'], 'hi=100 必须并入共享域');
    assert.throws(
      () => lineHtml({ band: { hi: [1], lo: [0, 1] } }, items),
      (err) => err.name === 'ChartError' && err.code === 'structure-invalid',
    );
    const broken = pathD(lineAuto({ band: { hi: [5, null, 7], lo: [0, 1, 2] } }, [
      { label: 'A', value: 1 }, { label: 'B', value: 2 }, { label: 'C', value: 3 },
    ]), P + 'charts-band');
    assert.equal(countOf(broken, 'M'), 2, '任一侧 null → 该段断开');
    assert.equal(countOf(lineHtml({}, items), P + 'charts-band'), 0);
    /* FX-78-V2a-5.1：band 的 y 域跟随**主序列 ownScale 域**（`charts.ts:807` `ownDoms[0] ?? [lo, hi]`），
     * 而不是共享域——原用例无 `series`，该分支不可达。显式 yMin/yMax 让共享域恒为 [0,10]，
     * ownScale 主序列 [0,100] +6% → [-6,106]，两组 band 坐标必然不同。 */
    const ownBand = pathD(charts.line({
      items,
      options: {
        ...LINE_FIXED, yMin: 0, yMax: 10, band,
        series: [
          { name: '甲', items: [{ label: 'A', value: 0 }, { label: 'B', value: 100 }], ownScale: true },
          { name: '乙', items: [{ label: 'A', value: 0 }, { label: 'B', value: 1 }] },
        ],
      },
    }).html, 'ilife-charts-band');
    const sharedBand = pathD(charts.line({
      items,
      options: {
        ...LINE_FIXED, yMin: 0, yMax: 10, band,
        series: [
          { name: '甲', items: [{ label: 'A', value: 0 }, { label: 'B', value: 100 }] },
          { name: '乙', items: [{ label: 'A', value: 0 }, { label: 'B', value: 1 }] },
        ],
      },
    }).html, 'ilife-charts-band');
    assert.equal(ownBand, 'M14.0 182.9L306.0 18.4 L306.0 182.9 L14.0 191.6 Z', 'ownScale 主序列 → band 走自身域 [0,100]+6%');
    assert.equal(sharedBand, 'M14.0 105.0L306.0 -1738.0 L306.0 105.0 L14.0 202.0 Z', 'ownScale:false → band 走共享域 [0,10]');
    assert.notEqual(ownBand, sharedBand, '两个域必须产出不同几何（证明该断言有鉴别力）');
  });

  it('B.fillBetween：a/b 系列索引；4 类违规抛错；绘制在折线之前；null 断开且不随 connectNulls 跨空', () => {
    const series = [
      { name: 'a', items: [{ label: 'A', value: 0 }, { label: 'B', value: null }, { label: 'C', value: 8 }] },
      { name: 'b', items: [{ label: 'A', value: 4 }, { label: 'B', value: 5 }, { label: 'C', value: 2 }] },
    ];
    const base = { ...LINE_FIXED, series, yMin: 0, yMax: 10, connectNulls: true };
    const html = charts.line({ items: LINE3, options: { ...base, fillBetween: { a: 0, b: 1, color: '#abcdef' } } }).html;
    const fill = attrsOf(html, 'path', P + 'charts-fill')[0];
    assert.equal(fill.fill, '#abcdef');
    assert.equal(countOf(fill.d, 'M'), 2, 'a 序列 null 处断开，且不随 connectNulls 跨空');
    assert.ok(
      html.indexOf('class="' + P + 'charts-fill"') < html.indexOf('class="' + P + 'charts-line"'),
      '填充必须绘制在折线之前',
    );
    const bad = (fb) => () => charts.line({ items: LINE3, options: { ...base, fillBetween: fb } });
    assert.throws(bad({ a: 'x', b: 1 }), (e) => e.code === 'structure-invalid');
    assert.throws(bad({ a: 0, b: 9 }), (e) => e.code === 'structure-invalid');
    assert.throws(bad({ a: 1, b: 1 }), (e) => e.code === 'structure-invalid');
    assert.throws(() => charts.line({
      items: LINE3,
      options: {
        ...LINE_FIXED,
        fillBetween: { a: 0, b: 1 },
        series: [
          { name: 'a', items: [{ label: 'A', value: 1 }] },
          { name: 'b', items: [{ label: 'A', value: 2 }, { label: 'B', value: 3 }] },
        ],
      },
    }), (e) => e.code === 'structure-invalid', '两系列长度不一致必须抛错');
  });

  it('B.highlightPoints：turns 拐点 / crossings 交点右端点', () => {
    const turn = lineHtml({ highlightPoints: 'turns' }, [
      { label: 'A', value: 1 }, { label: 'B', value: 3 }, { label: 'C', value: 2 },
    ]);
    assert.deepEqual(attrsOf(turn, 'circle', P + 'charts-dot-hl').map((c) => c['data-i']), ['1']);
    const flat = lineHtml({ highlightPoints: 'turns' }, [
      { label: 'A', value: 1 }, { label: 'B', value: 2 }, { label: 'C', value: 3 },
    ]);
    assert.equal(countOf(flat, P + 'charts-dot-hl'), 0, '单调序列无拐点');
    const cross = charts.line({
      items: LINE3,
      options: {
        ...LINE_FIXED,
        highlightPoints: 'crossings',
        yMin: 0,
        yMax: 3,
        series: [
          { name: 'a', items: [0, 1, 2, 3].map((v, i) => ({ label: String(i), value: v })) },
          { name: 'b', items: [3, 2, 1, 0].map((v, i) => ({ label: String(i), value: v })) },
        ],
      },
    }).html;
    assert.deepEqual(attrsOf(cross, 'circle', P + 'charts-dot-hl').map((c) => c['data-i']), ['2']);
  });

  it('B.series：多序列逐项生效（name/items/color/dashed/smooth/area/ownScale）', () => {
    const html = charts.line({
      items: LINE3,
      options: {
        ...LINE_FIXED,
        yMin: 0,
        yMax: 10,
        series: [
          { name: '甲', items: [{ label: 'A', value: 0 }, { label: 'B', value: 5 }, { label: 'C', value: 10 }], color: '#111111' },
          { name: '乙', items: [{ label: 'A', value: 10 }, { label: 'B', value: 5 }, { label: 'C', value: 0 }], color: '#222222', dashed: true, smooth: true, area: true },
        ],
      },
    }).html;
    const paths = attrsOf(html, 'path', P + 'charts-line');
    assert.equal(paths.length, 2);
    assert.deepEqual(paths.map((p) => p.stroke), ['#111111', '#222222']);
    assert.equal(paths[0]['stroke-dasharray'], undefined);
    assert.equal(paths[1]['stroke-dasharray'], '6 5');
    assert.ok(!paths[0].d.includes(' C'), 'series[].smooth 缺省继承外层 smooth=false');
    assert.ok(paths[1].d.includes(' C'), 'series[].smooth:true 只作用于该序列');
    assert.equal(countOf(html, P + 'charts-area'), 1, 'area 逐系列生效');
    assert.equal(dotsOf(html).filter((d) => d['data-s'] === '1').length, 3);
  });

  it('B.series[].ownScale：自身 min-max +6% padding，忽略 yMin/yMax，铺满图高，不参与共享域', () => {
    const html = charts.line({
      items: [{ label: 'A', value: 0 }, { label: 'B', value: 10 }],
      options: {
        ...LINE_FIXED,
        yMin: 0,
        yMax: 10,
        series: [{ name: 'S', items: [{ label: 'A', value: 0 }, { label: 'B', value: 1 }], ownScale: true }],
      },
    }).html;
    assert.deepEqual(dotsOf(html).map((d) => d.cy), ['191.6', '18.4']);
    const shared = charts.line({
      items: [{ label: 'A', value: 0 }, { label: 'B', value: 10 }],
      options: {
        ...LINE_FIXED,
        yMin: 0,
        yMax: 10,
        series: [{ name: 'S', items: [{ label: 'A', value: 0 }, { label: 'B', value: 1 }] }],
      },
    }).html;
    assert.deepEqual(dotsOf(shared).map((d) => d.cy), ['202.0', '182.6'], 'ownScale=false 时用共享域');
    /* ownScale 序列**不参与共享域**：否则共享域会被 1000 污染，刻度随之改变 */
    const polluted = charts.line({
      items: [{ label: 'A', value: 0 }, { label: 'B', value: 10 }],
      options: {
        width: 320,
        height: 210,
        labels: 'none',
        showValues: false,
        grid: false,
        yTicks: 2,
        series: [
          { name: '甲', items: [{ label: 'A', value: 0 }, { label: 'B', value: 10 }] },
          { name: '乙', items: [{ label: 'A', value: 0 }, { label: 'B', value: 1000 }], ownScale: true },
        ],
      },
    }).html;
    assert.deepEqual(textsOf(polluted, P + 'charts-tick'), ['-0.6', '10.6'], '共享域只看非 ownScale 序列');
  });

  it('B.ChartItem.value === null：仅 line 合法，其余 kind 抛 structure-invalid', () => {
    const items = [{ label: 'A', value: null }];
    const isStructure = (err) => err.name === 'ChartError' && err.code === 'structure-invalid';
    assert.throws(() => charts.bar({ items }), isStructure);
    assert.throws(() => charts.donut({ items }), isStructure);
    assert.throws(() => charts.sparkline({ items }), isStructure);
    assert.throws(() => charts.combo({ bars: items, lines: [{ label: 'A', value: 1 }] }), isStructure);
    assert.equal(charts.line({ items: [{ label: 'A', value: null }], options: LINE_FIXED }).empty, true);
  });

  it('B.ChartItem.anomaly：该点染警示红（缺省 #ff3b30，含光晕）', () => {
    const html = lineHtml({}, [
      { label: 'A', value: 0 }, { label: 'B', value: 50, anomaly: true }, { label: 'C', value: 100 },
    ]);
    const anomaly = attrsOf(html, 'circle', P + 'charts-dot-anomaly');
    assert.equal(anomaly.length, 1);
    assert.equal(anomaly[0]['data-i'], '1');
    assert.equal(anomaly[0].fill, '#ff3b30');
    assert.equal(anomaly[0].stroke, '#ff3b30');
    assert.ok(buildChartsHelpersJs().includes(P + 'charts-dot-anomaly{filter:drop-shadow'), '光晕走 CSS 规则');
  });
});

/* ── C. BarChartOptions ───────────────────────────────────────────────── */

describe('C BarChartOptions', () => {
  const MULTI = [
    { label: 'A', values: [1, 1], value: 2 },
    { label: 'B', values: [3, 1], value: 4 },
  ];
  const BAR_FIXED = { width: 320, height: 170, labels: 'none', showValues: false, grid: false };

  it('C.singleColor：全部柱同色（覆盖 colors）', () => {
    const opts = { ...BAR_FIXED, colors: ['#111111', '#222222'] };
    const perBar = charts.bar({ items: [{ label: 'A', value: 1 }, { label: 'B', value: 2 }], options: opts }).html;
    assert.deepEqual(attrsOf(perBar, 'rect', P + 'charts-bar').map((r) => r.fill), ['#111111', '#222222']);
    const single = charts.bar({
      items: [{ label: 'A', value: 1 }, { label: 'B', value: 2 }],
      options: { ...opts, singleColor: true },
    }).html;
    assert.deepEqual(attrsOf(single, 'rect', P + 'charts-bar').map((r) => r.fill), ['#111111', '#111111']);
    const bare = charts.bar({ items: [{ label: 'A', value: 1 }], options: { singleColor: true } }).html;
    assert.equal(attrsOf(bare, 'rect', P + 'charts-bar')[0].fill, CHART_PALETTE[0]);
    /* ChartItem.color 优先级：item.color > colors 色板 */
    const itemColor = charts.bar({
      items: [{ label: 'A', value: 1, color: '#abcdef' }, { label: 'B', value: 2 }],
      options: { ...BAR_FIXED, colors: ['#111111', '#222222'] },
    }).html;
    assert.deepEqual(attrsOf(itemColor, 'rect', P + 'charts-bar').map((r) => r.fill), ['#abcdef', '#222222']);
    const donutColor = charts.donut({
      items: [{ label: 'A', value: 1, color: '#abcdef' }, { label: 'B', value: 1 }],
    }).html;
    assert.deepEqual(attrsOf(donutColor, 'circle', P + 'charts-arc').map((a) => a.stroke), ['#abcdef', CHART_PALETTE[1]]);
  });

  it('C.values[]：长度一致 + 值必须为数字，违规抛 structure-invalid', () => {
    const isStructure = (err) => err.name === 'ChartError' && err.code === 'structure-invalid';
    assert.throws(() => charts.bar({ items: [{ label: 'A', value: 3, values: [1, 2] }, { label: 'B', value: 1, values: [1] }], options: { stacked: true } }), isStructure);
    assert.throws(() => charts.bar({ items: [{ label: 'A', value: 1, values: [1, 'x'] }], options: { stacked: true } }), isStructure);
    assert.throws(() => charts.bar({ items: [{ label: 'A', value: 1 }], options: { grouped: true } }), isStructure);
    assert.throws(() => charts.bar({ items: [{ label: 'A', value: 1, values: [] }], options: { grouped: true } }), isStructure);
    /* `value` 在 multi 模式**不豁免**（冻结 `ChartItem.value` 必填 + `docs/base-paint-contract.md:799`）：
     * 缺 value／value 非数／value:null 一律 `structure-invalid`（旧 `_barMulti` 静默置 0 不复刻，R1-A2）。 */
    assert.throws(() => charts.bar({ items: [{ label: 'A', values: [1, 2] }], options: { stacked: true } }), isStructure, 'multi 缺 value 必须抛错');
    assert.throws(() => charts.bar({ items: [{ label: 'A', values: [1, 2] }], options: { grouped: true } }), isStructure);
    assert.throws(() => charts.bar({ items: [{ label: 'A', value: null, values: [1, 2] }], options: { stacked: true } }), isStructure, 'value:null 仅 line 合法');
    assert.throws(() => charts.bar({ items: [{ label: 'A', value: '2', values: [1, 2] }], options: { stacked: true } }), isStructure);
    assert.equal(countOf(charts.bar({ items: MULTI, options: { ...BAR_FIXED, stacked: true } }).html, P + 'charts-seg'), 4);
  });

  it('C.stacked：纵向堆叠 + 柱顶合计（percent 缺省 = 柱内 100%）', () => {
    const html = charts.bar({ items: MULTI, options: { ...BAR_FIXED, stacked: true, showValues: true } }).html;
    const segs = attrsOf(html, 'rect', P + 'charts-seg');
    assert.deepEqual(segs.map((s) => s.y), ['91.0', '23.0', '55.5', '23.0']);
    assert.deepEqual(segs.map((s) => s.height), ['71.0', '68.0', '106.5', '32.5']);
    assert.deepEqual(textsOf(html, P + 'charts-value-total'), ['2', '4'], '柱顶显示合计');
    const custom = charts.bar({
      items: MULTI,
      options: { ...BAR_FIXED, stacked: true, showValues: true, format: (v) => '¥' + v },
    }).html;
    assert.deepEqual(textsOf(custom, P + 'charts-value-total'), ['¥2', '¥4'], '合计走 format');
  });

  it("C.stackMode：percent（缺省，柱内 100%，不参与 yMin/yMax）/ absolute（相对全局最大合计）", () => {
    const percent = charts.bar({ items: MULTI, options: { ...BAR_FIXED, stacked: true, yMin: 0, yMax: 1000 } }).html;
    assert.equal(attrsOf(percent, 'rect', P + 'charts-seg')[0].y, '85.0', 'percent 忽略 yMin/yMax');
    const absolute = charts.bar({ items: MULTI, options: { ...BAR_FIXED, stacked: true, stackMode: 'absolute' } }).html;
    assert.deepEqual(attrsOf(absolute, 'rect', P + 'charts-seg').map((s) => s.y), ['123.5', '88.0', '46.5', '11.0']);
    assert.notEqual(absolute, percent);
    /* 柱顶合计标签必须与**段高同尺度**（`frame.h / maxTotal`），不是带 padding 的 `yAt(domain)`（R2-N2）。
     * 数据合计 3 / 4，maxTotal=4，showValues:true → frame y0=20 / y1=162（h=142）→ unit=35.5：
     * A 柱顶 = 162-3*35.5 = 55.5 → 标签 y=52.5；B 柱顶 = 162-4*35.5 = 20 → 标签 y=17.0。
     * 用 yAt(带 6% padding 的 [−0.24, 4.24]) 会得 56.3 / 24.6。 */
    const totals = charts.bar({
      items: [{ label: 'A', values: [1, 2], value: 3 }, { label: 'B', values: [3, 1], value: 4 }],
      options: { ...BAR_FIXED, stacked: true, stackMode: 'absolute', showValues: true },
    }).html;
    assert.deepEqual(attrsOf(totals, 'text', P + 'charts-value-total').map((t) => t.y), ['52.5', '17.0']);
    const percentTotals = charts.bar({ items: MULTI, options: { ...BAR_FIXED, stacked: true, showValues: true } }).html;
    assert.deepEqual(attrsOf(percentTotals, 'text', P + 'charts-value-total').map((t) => t.y), ['17.0', '17.0'], 'percent 恒贴绘图区顶');
    /* `absolute` 的段高分母是 maxTotal，**不参与 yMin/yMax**；合计标签若走 `yAt(lo,hi)` 会被
     * yMin/yMax 拉走（yMax:10 → 116.4，而非同尺度的 52.5）→ 本条把「同尺度」钉死，
     * 与 01 的 padding 是否为零无关（两者在 padding=0 时数值恰好重合）。 */
    const bounded = charts.bar({
      items: [{ label: 'A', values: [1, 2], value: 3 }, { label: 'B', values: [3, 1], value: 4 }],
      options: { ...BAR_FIXED, stacked: true, stackMode: 'absolute', showValues: true, yMin: 0, yMax: 10 },
    }).html;
    assert.deepEqual(attrsOf(bounded, 'text', P + 'charts-value-total').map((t) => t.y), ['52.5', '17.0'], 'yMin/yMax 不得影响合计标签');
    assert.deepEqual(attrsOf(bounded, 'rect', P + 'charts-seg').map((s) => s.y), ['126.5', '58.5', '55.5', '23.0'], '段高同样忽略 yMin/yMax');
  });

  it('C.grouped：每列 N 根并排子柱（宽度均分，gap = CHART_BREAKPOINTS.stackedGapPx）', () => {
    const html = charts.bar({ items: MULTI, options: { ...BAR_FIXED, grouped: true } }).html;
    const groups = attrsOf(html, 'g', P + 'charts-group');
    assert.equal(groups.length, 2);
    assert.deepEqual(groups.map((g) => g['data-gap']), ['3', '3'], 'data-gap 逐值字面量（W8：不用同源常量自证）');
    const first = attrsOf(html, 'rect', P + 'charts-bar').slice(0, 2);
    assert.deepEqual(first.map((r) => r.x), ['70.0', '88.5']);
    assert.deepEqual(first.map((r) => r.width), ['15.5', '15.5']);
    assert.equal(
      Number(first[1].x) - (Number(first[0].x) + Number(first[0].width)),
      CHART_BREAKPOINTS.stackedGapPx,
      '子柱间距必须逐值等于冻结常量',
    );
    assert.deepEqual(first.map((r) => r.fill), [CHART_PALETTE[0], CHART_PALETTE[1]], '每子柱独立取色');
  });

  it('C.stacked × C.grouped：互斥，同传时 stacked 优先', () => {
    const both = charts.bar({ items: MULTI, options: { ...BAR_FIXED, stacked: true, grouped: true } }).html;
    const stackedOnly = charts.bar({ items: MULTI, options: { ...BAR_FIXED, stacked: true } }).html;
    assert.equal(both, stackedOnly);
    assert.equal(countOf(both, P + 'charts-group'), 0);
    assert.equal(attrsOf(both, 'rect', P + 'charts-seg').length, 4, '同传时必须是堆叠段而非并排子柱');
    assert.equal(attrsOf(both, 'g', P + 'charts-group').length, 0);
  });

  it('C.segNames：段名图例；缺省「段1/段2…」', () => {
    const custom = charts.bar({ items: MULTI, options: { ...BAR_FIXED, stacked: true, segNames: ['蛋白', '脂肪'] } }).html;
    assert.deepEqual(legendTextsOf(custom), ['蛋白', '脂肪']);
    const fallback = charts.bar({ items: MULTI, options: { ...BAR_FIXED, stacked: true } }).html;
    assert.deepEqual(legendTextsOf(fallback), ['段1', '段2']);
  });

  it('C.labels：bar 的 select 只标首尾（旧 charts.js:385-388，与 line 的首+峰值+尾不同）', () => {
    const items = [
      { label: 'A', value: 1 }, { label: 'B', value: 2 }, { label: 'C', value: 9 },
      { label: 'D', value: 3 }, { label: 'E', value: 4 },
    ];
    const labels = (mode) => textsOf(charts.bar({ items, options: { ...BAR_FIXED, labels: mode } }).html, P + 'charts-xlabel');
    assert.deepEqual(labels('all'), ['A', 'B', 'C', 'D', 'E']);
    assert.deepEqual(labels('select'), ['A', 'E'], 'bar 的 select = 首尾（不得含峰值 C）');
    assert.deepEqual(labels('edge'), ['A', 'E']);
    assert.deepEqual(labels('none'), []);
    const single = textsOf(charts.bar({ items: [{ label: 'A', value: 1 }], options: { ...BAR_FIXED, labels: 'select' } }).html, P + 'charts-xlabel');
    assert.deepEqual(single, ['A'], '单柱 select 只标 1 个');
  });

  it('C.缺省（都不传）：单柱渲染路径', () => {
    const html = charts.bar({ items: [{ label: 'A', value: 1 }, { label: 'B', value: 2 }], options: BAR_FIXED }).html;
    const bars = attrsOf(html, 'rect', P + 'charts-bar');
    assert.equal(bars.length, 2);
    assert.equal(countOf(html, P + 'charts-seg'), 0);
    assert.equal(countOf(html, P + 'charts-group'), 0);
    assert.equal(countOf(html, P + 'charts-legend'), 0);
    assert.equal(bars[0].fill, DEFAULT_BAR_COLOR);
    assert.deepEqual(bars.map((b) => b.x), ['70.0', '216.0']);
    /* 柱族域**无 padding**（旧 `charts.js:371-373` 域 = min(v,0)..max(v)）：
     * BAR_FIXED 的 frame = x0 14 / x1 306 / y0 8 / y1 162（h=154）→ 柱底贴底、最高柱满高、柱高比 = 值比。 */
    assert.deepEqual(bars.map((b) => Number(b.y) + Number(b.height)), [162, 162], '柱底必须贴绘图区底（y1=162）');
    assert.equal(Number(bars[1].height), 154, '最高柱高必须等于绘图区高（h=154）');
    assert.equal(Number(bars[1].height) / Number(bars[0].height), 2 / 1, '柱高比 == 值比');
    assert.deepEqual(bars.map((b) => b.y), ['85.0', '8.0'], '柱顶坐标逐值（6% padding 会变成 85.0/16.3 一类悬空值）');
  });
});

describe('D DonutChartOptions', () => {
  const TWO = [{ label: 'A', value: 50 }, { label: 'B', value: 50 }];

  it('D.size / D.ringWidth：直径 / 环宽（半径自适应）', () => {
    const html = charts.donut({ items: TWO, options: { size: 200, ringWidth: 20 } }).html;
    assert.equal(viewBoxOf(html), '0 0 200.0 200.0');
    const ring = attrsOf(html, 'circle', P + 'charts-ring')[0];
    assert.equal(ring.r, '88.0');
    assert.equal(ring['stroke-width'], '20');
    assert.equal(attrsOf(html, 'circle', P + 'charts-arc')[0]['stroke-width'], '20');
    assert.equal(viewBoxOf(charts.donut({ items: TWO }).html), '0 0 150.0 150.0');
    assert.equal(attrsOf(charts.donut({ items: TWO }).html, 'circle', P + 'charts-ring')[0]['stroke-width'], '16');
  });

  it("D.legend：'right'/'bottom'/'none' 三态", () => {
    const cls = (mode) => tagsOf(charts.donut({ items: TWO, options: { legend: mode } }).html, 'div')
      .filter((t) => t.includes(P + 'charts-legend'))[0];
    assert.ok(cls('right').includes(P + 'charts-legend-right'));
    assert.ok(cls('bottom').includes(P + 'charts-legend-bottom'));
    assert.equal(cls('none'), undefined, "'none' 不渲染图例块");
    assert.ok(cls(undefined).includes(P + 'charts-legend-right'), '缺省 right');
  });

  it('D.showPercent：图例百分比（缺省 true）', () => {
    assert.deepEqual(contentsOf(charts.donut({ items: TWO }).html, P + 'charts-legend-pct'), ['50%', '50%']);
    assert.deepEqual(contentsOf(charts.donut({ items: TWO, options: { showPercent: true } }).html, P + 'charts-legend-pct'), ['50%', '50%']);
    assert.equal(countOf(charts.donut({ items: TWO, options: { showPercent: false } }).html, P + 'charts-legend-pct'), 0);
    assert.deepEqual(
      contentsOf(charts.donut({ items: [{ label: 'A', value: 1 }, { label: 'B', value: 3 }] }).html, P + 'charts-legend-pct'),
      ['25%', '75%'],
    );
    /* 百分比取整（旧 `charts.js:712` `Math.round(value/total*100)`）：1/3 是 33% 不是 33.33%（R2-N4）。 */
    assert.deepEqual(
      contentsOf(charts.donut({ items: [{ label: 'A', value: 1 }, { label: 'B', value: 2 }] }).html, P + 'charts-legend-pct'),
      ['33%', '67%'],
    );
    assert.deepEqual(
      contentsOf(charts.donut({ items: [{ label: 'A', value: 1 }, { label: 'B', value: 1 }, { label: 'C', value: 1 }] }).html, P + 'charts-legend-pct'),
      ['33%', '33%', '33%'],
    );
  });

  it('D.centerLabel / D.centerValue：中心两行文本（centerValue 字面渲染）', () => {
    const html = charts.donut({
      items: TWO,
      options: { centerLabel: '合计', centerValue: '定制', format: (v) => 'F' + v },
    }).html;
    assert.deepEqual(textsOf(html, P + 'charts-center-label'), ['合计']);
    assert.deepEqual(textsOf(html, P + 'charts-center-value'), ['定制'], 'R26-1：centerValue 不过 format');
    assert.ok(!html.includes('F定制'));
    const fallback = charts.donut({ items: TWO, options: { format: (v) => 'F' + v } }).html;
    assert.deepEqual(textsOf(fallback, P + 'charts-center-value'), ['F100'], '缺省 centerValue = 合计走 format');
    assert.equal(countOf(charts.donut({ items: TWO }).html, P + 'charts-center-label'), 0);
  });

  it('D.合计为零：走空态（empty:true / points:0）', () => {
    const out = charts.donut({ items: [{ label: 'A', value: 0 }, { label: 'B', value: 0 }] });
    assert.equal(out.empty, true);
    assert.equal(out.points, 0);
    assert.ok(out.html.includes('data-chart-empty="1"'));
    assert.equal(countOf(out.html, '无环形数据'), 1);
    assert.equal(charts.donut({ items: TWO }).empty, false);
  });
});

/* ── E. progress / gauge ──────────────────────────────────────────────── */

describe('E ProgressChartOptions / GaugeChartOptions', () => {
  it('E.gradient：渐变填充（id 由渐变参数派生 → 同输入同输出）', () => {
    const html = charts.progress({ pct: 40, options: { gradient: true } }).html;
    assert.equal(countOf(html, '<linearGradient'), 1);
    assert.equal(countOf(html, 'stop-color="' + CHART_PALETTE[5] + '"'), 1);
    const plain = charts.progress({ pct: 40 }).html;
    assert.equal(countOf(plain, '<linearGradient'), 0);
    assert.equal(attrsOf(plain, 'rect', P + 'charts-fillbar')[0].fill, DEFAULT_BAR_COLOR);
    /* 确定性（R1-A1）：同一输入两次调用必须**逐字节相同**（模块级计数器会让 id 从 grad-1 漂到 grad-2）。 */
    assert.equal(html, charts.progress({ pct: 40, options: { gradient: true } }).html, '同一输入必须产出同一字符串');
    const idOf = (source) => (source.match(/<linearGradient id="([^"]*)"/) ?? [])[1];
    /* FX-78-V2a-2：只做 `startsWith(P + 'charts-grad-')` 时，换 hash32 实现（换散列/截断）仍绿
     * → 对固定输入断**完整字面量 id**（缺省色 = `var(--blue,#007aff)|#5ac8fa` 的 FNV-1a）。 */
    assert.equal(idOf(html), 'ilife-charts-grad-xxs8uh', '缺省渐变参数的 id 逐字');
    assert.equal(
      idOf(charts.progress({ pct: 40, options: { gradient: true, color: '#123456' } }).html),
      'ilife-charts-grad-cxwaxw',
      '#123456 的 id 逐字（换色 → 换 id）',
    );
    const other = charts.progress({ pct: 40, options: { gradient: true, color: '#123456' } }).html;
    assert.notEqual(idOf(other), idOf(html), '不同渐变参数必须得不同 id（同页不撞 id）');
    assert.equal(countOf(other, 'stop-color="#123456"'), 1);
    assert.equal(other, charts.progress({ pct: 40, options: { gradient: true, color: '#123456' } }).html);
  });

  it('E.showPct：百分比文字开关（缺省 true）', () => {
    assert.deepEqual(contentsOf(charts.progress({ pct: 40 }).html, P + 'charts-pct'), ['40%']);
    assert.equal(countOf(charts.progress({ pct: 40, options: { showPct: false } }).html, P + 'charts-pct'), 0);
    assert.deepEqual(contentsOf(charts.progress({ pct: 40.4 }).html, P + 'charts-pct'), ['40%'], 'Math.round 口径');
  });

  it('E.pct 取整：分数输入按 Math.round（progress／gauge／donut 百分比逐字）', () => {
    /* 编排者独立变异（存活）：把**全部** `Math.round(pct)` 改成 `Math.floor(pct)` 后本文件仍 86/86 绿
     * ——原用例的 pct 全是整数，或 `40.4` 这类 `round === floor` 的值，取整口径无鉴别力。
     * 取 `round !== floor` 的输入钉死：66.67→67/66、66.5→67/66、33.5→34/33、0.5→1/0、99.5→100/99。 */
    const pctText = (pct) => contentsOf(charts.progress({ pct }).html, 'ilife-charts-pct');
    assert.deepEqual(pctText(66.67), ['67%'], 'progress 66.67 → 67%（floor 会得 66%）');
    assert.deepEqual(pctText(66.5), ['67%'], 'progress 66.5 → 67%（round 半值进位；floor 会得 66%）');
    assert.deepEqual(pctText(33.5), ['34%'], 'progress 33.5 → 34%（floor 会得 33%）');
    assert.deepEqual(pctText(0.5), ['1%'], 'progress 0.5 → 1%（floor 会得 0%）');
    assert.deepEqual(pctText(99.5), ['100%'], 'progress 99.5 → 100%（floor 会得 99%）');
    /* `data-pct` 是**未取整**的原始值：文本取整口径与数据属性分离（取整不得回写 data-pct）。 */
    assert.equal(attrsOf(charts.progress({ pct: 66.67 }).html, 'svg')[0]['data-pct'], '66.67');
    assert.deepEqual(textsOf(charts.gauge({ pct: 66.67 }).html, 'ilife-charts-gauge-value'), ['67%'], 'gauge 66.67 → 67%（floor 会得 66%）');
    assert.deepEqual(textsOf(charts.gauge({ pct: 33.5 }).html, 'ilife-charts-gauge-value'), ['34%'], 'gauge 33.5 → 34%（floor 会得 33%）');
    assert.deepEqual(
      textsOf(charts.gauge({ pct: 66.67, options: { format: (v) => v + ' 分' } }).html, 'ilife-charts-gauge-value'),
      ['67 分'],
      'format 收到的是**取整后**的整数（67，不是 66.67）',
    );
    assert.equal(attrsOf(charts.gauge({ pct: 66.67 }).html, 'svg')[0]['data-pct'], '66.67');
    /* donut 百分比走同一 `Math.round` 口径（2/3 → 67%、1/6 → 17%；floor 会得 66%／16%）。 */
    assert.deepEqual(
      contentsOf(charts.donut({ items: [{ label: 'A', value: 1 }, { label: 'B', value: 2 }] }).html, 'ilife-charts-legend-pct'),
      ['33%', '67%'],
    );
    assert.deepEqual(
      contentsOf(charts.donut({ items: [{ label: 'A', value: 1 }, { label: 'B', value: 5 }] }).html, 'ilife-charts-legend-pct'),
      ['17%', '83%'],
      '1/6 → 17%（floor 会得 16%）',
    );
  });

  it('E.gauge.label / E.gauge.size：标签 / 尺寸', () => {
    const html = charts.gauge({ pct: 50, options: { label: '今日目标', size: 200 } }).html;
    assert.equal(viewBoxOf(html), '0 0 200.0 124.0');
    assert.deepEqual(textsOf(html, P + 'charts-gauge-label'), ['今日目标']);
    assert.equal(countOf(charts.gauge({ pct: 50 }).html, P + 'charts-gauge-label'), 0);
    assert.equal(viewBoxOf(charts.gauge({ pct: 50 }).html), '0 0 170.0 105.0');
    assert.deepEqual(textsOf(charts.gauge({ pct: 50 }).html, P + 'charts-gauge-value'), ['50%']);
    assert.deepEqual(textsOf(charts.gauge({ pct: 50, options: { format: (v) => v + ' 分' } }).html, P + 'charts-gauge-value'), ['50 分']);
  });

  it('E.gauge 弧几何：非对称 pct 的端点坐标逐值（pct=50 是两式同值的盲点）', () => {
    /* FX-78-V3-02：`endAngle = π(1-fraction)` 反向成 `π·fraction` 后旧断言全绿
     * （E.gauge.* 只断 viewBox／label／value 文本／data-pct，且 pct=50 为对称盲点）。
     * size 缺省 170×105 → r = min(170/2-4, 105-8) = 81、cx = 85、cy = 101、起点 x = 4.0。 */
    const fg = (pct) => pathD(charts.gauge({ pct }).html, 'ilife-charts-gauge-fg');
    const bg = (pct) => pathD(charts.gauge({ pct }).html, 'ilife-charts-gauge-bg');
    assert.equal(fg(0), 'M4.0 101.0 A81.0 81.0 0 0 1 4.0 101.0', 'pct=0 → 零长弧');
    assert.equal(fg(25), 'M4.0 101.0 A81.0 81.0 0 0 1 27.7 43.7', 'pct=25 端点必须在**左上**（反向式会得 142.3 43.7）');
    assert.equal(fg(50), 'M4.0 101.0 A81.0 81.0 0 0 1 85.0 20.0', 'pct=50 端点在正上方（对称点）');
    assert.equal(fg(75), 'M4.0 101.0 A81.0 81.0 0 0 1 142.3 43.7', 'pct=75 端点必须在**右上**');
    assert.equal(fg(100), 'M4.0 101.0 A81.0 81.0 0 0 1 166.0 101.0', 'pct=100 → 整条半弧');
    assert.equal(bg(25), 'M4.0 101.0 A81.0 81.0 0 0 1 166.0 101.0', '背景恒为整条半弧（不随 pct 变）');
    assert.equal(bg(75), 'M4.0 101.0 A81.0 81.0 0 0 1 166.0 101.0');
    assert.equal(
      pathD(charts.gauge({ pct: 25, options: { size: 200 } }).html, 'ilife-charts-gauge-fg'),
      'M4.0 120.0 A96.0 96.0 0 0 1 32.1 52.1',
      'size 变化时半径/圆心/端点同步',
    );
  });

  it('E.height：进度条渲染高度 == height px（旧契约「轨道 px」，缺省 8）', () => {
    const svgOf = (html) => tagsOf(html, 'svg')[0];
    const styleOf = (html) => (svgOf(html).match(/style="([^"]*)"/) ?? [])[1];
    /* 只进 viewBox 会让缺省 8 在 320px 容器渲染约 25.6px 高（3 倍厚，R2-N11）→ svg 内联 px 高度。 */
    assert.equal(styleOf(charts.progress({ pct: 40 }).html), 'height:8px', '缺省轨道 8px');
    assert.equal(styleOf(charts.progress({ pct: 40, options: { height: 20 } }).html), 'height:20px');
    assert.equal(viewBoxOf(charts.progress({ pct: 40, options: { height: 20 } }).html), '0 0 100.0 20.0', 'viewBox 同步（坐标唯一）');
    assert.equal((svgOf(charts.progress({ pct: 40 }).html).match(/preserveAspectRatio="([^"]*)"/) ?? [])[1], 'none', '宽度仍满宽拉伸');
  });

  it('E.pct 非数：抛 pct-invalid', () => {
    const isPct = (err) => err.name === 'ChartError' && err.code === 'pct-invalid';
    assert.throws(() => charts.progress({ pct: '50' }), isPct);
    assert.throws(() => charts.progress({ pct: NaN }), isPct);
    assert.throws(() => charts.progress({}), isPct);
    assert.throws(() => charts.gauge({ pct: null }), isPct);
    assert.throws(() => charts.gauge({ pct: Infinity }), isPct);
  });

  it('E.pct 超界：收敛 0~100（不抛错）', () => {
    const high = charts.progress({ pct: 150 }).html;
    assert.equal(attrsOf(high, 'svg')[0]['data-pct'], '100');
    assert.equal(attrsOf(high, 'rect', P + 'charts-fillbar')[0].width, '100.0');
    assert.deepEqual(contentsOf(high, P + 'charts-pct'), ['100%']);
    const low = charts.progress({ pct: -20 }).html;
    assert.equal(attrsOf(low, 'svg')[0]['data-pct'], '0');
    assert.equal(attrsOf(low, 'rect', P + 'charts-fillbar')[0].width, '0.0');
    assert.equal(attrsOf(charts.gauge({ pct: 300 }).html, 'svg')[0]['data-pct'], '100');
  });

  it('E.points：pct 型接口恒 1；pct === 0 时 empty === false', () => {
    for (const out of [charts.progress({ pct: 0 }), charts.gauge({ pct: 0 })]) {
      assert.equal(out.points, 1);
      assert.equal(out.empty, false, '0% 是合法值，不是空态');
      assert.ok(out.html.includes('data-pct="0"'), '0% 必须真的渲染（不是空态短路）');
    }
    assert.equal(charts.progress({ pct: 100 }).points, 1);
    assert.equal(charts.gauge({ pct: 100 }).points, 1);
  });
});

/* ── F. combo / sparkline ─────────────────────────────────────────────── */

describe('F ComboChartOptions / SparklineChartOptions', () => {
  const COMBO_FIXED = { width: 320, height: 170, labels: 'none', showValues: false, grid: false };

  it('F.bars / F.lines：同长同 label（违规抛错）', () => {
    const isStructure = (err) => err.name === 'ChartError' && err.code === 'structure-invalid';
    assert.throws(
      () => charts.combo({ bars: [{ label: 'A', value: 1 }, { label: 'B', value: 2 }], lines: [{ label: 'A', value: 3 }] }),
      isStructure,
    );
    assert.throws(
      () => charts.combo({ bars: [{ label: 'A', value: 1 }], lines: [{ label: 'X', value: 3 }] }),
      isStructure,
      'label 不一致必须抛错',
    );
    const both = charts.combo({
      bars: [{ label: 'A', value: 1 }, { label: 'B', value: 2 }],
      lines: [{ label: 'A', value: 3 }, { label: 'B', value: 4 }],
      options: COMBO_FIXED,
    });
    assert.equal(both.points, 4, 'bars + lines 同长时逐点计入');
    assert.equal(countOf(both.html, P + 'charts-bar'), 2);
    assert.equal(countOf(both.html, P + 'charts-dot'), 2);
    const empty = charts.combo({ bars: [], lines: [] });
    assert.equal(empty.empty, true);
    assert.equal(empty.points, 0);
    /* FX-A1c-01（编排者改判 R9 为缺陷）：线点 x 必须取**柱列中心**（与柱同一 band 标度）。
     * 4 列 / width:320 / labels:'none' → frame x0 14 / x1 306、slot 73 → 柱心 50.5/123.5/196.5/269.5
     * （旧实现是点标度 14.0/111.3/208.7/306.0，即 V2a 实测的错位值）。 */
    const aligned = charts.combo({
      bars: [{ label: 'A', value: 10 }, { label: 'B', value: 20 }, { label: 'C', value: 30 }, { label: 'D', value: 40 }],
      lines: [{ label: 'A', value: 5 }, { label: 'B', value: 15 }, { label: 'C', value: 25 }, { label: 'D', value: 35 }],
      options: COMBO_FIXED,
    });
    const barCenters = attrsOf(aligned.html, 'rect', 'ilife-charts-bar')
      .map((r) => (Number(r.x) + Number(r.width) / 2).toFixed(1));
    const lineXs = attrsOf(aligned.html, 'circle', 'ilife-charts-dot').map((d) => d.cx);
    assert.deepEqual(barCenters, ['50.5', '123.5', '196.5', '269.5'], '柱列中心逐值');
    assert.deepEqual(lineXs, barCenters, '线点 x 必须 == 柱列中心 x（FX-A1c-01）');
    assert.equal(lineXs.length, attrsOf(aligned.html, 'rect', 'ilife-charts-bar').length, '线点数 == 柱数');
    assert.equal(pathD(aligned.html, 'ilife-charts-combo-line'), 'M50.5 142.8L123.5 104.3L196.5 65.8L269.5 27.3', '折线路径端点同样落在柱心');
    const two = charts.combo({
      bars: [{ label: 'A', value: 1 }, { label: 'B', value: 2 }],
      lines: [{ label: 'A', value: 3 }, { label: 'B', value: 4 }],
      options: COMBO_FIXED,
    });
    assert.deepEqual(attrsOf(two.html, 'circle', 'ilife-charts-dot').map((d) => d.cx), ['87.0', '233.0'], '2 列时线点同样落在柱心');
    /* FX-78-V2a-4.5：只传其一的两条非空路径（`n = bars.length > 0 ? bars.length : lines.length`）。 */
    const barsOnly = charts.combo({
      bars: [{ label: 'A', value: 10 }, { label: 'B', value: 20 }, { label: 'C', value: 30 }, { label: 'D', value: 40 }],
      lines: [],
      options: COMBO_FIXED,
    });
    assert.equal(barsOnly.points, 4);
    assert.equal(barsOnly.empty, false);
    assert.equal(attrsOf(barsOnly.html, 'rect', 'ilife-charts-bar').length, 4);
    assert.equal(countOf(barsOnly.html, 'ilife-charts-dot'), 0, '只传 bars 不得产线点');
    assert.equal(countOf(barsOnly.html, '<path'), 0, '只传 bars 不得产折线路径');
    const linesOnly = charts.combo({
      bars: [],
      lines: [{ label: 'A', value: 10 }, { label: 'B', value: 20 }, { label: 'C', value: 30 }, { label: 'D', value: 40 }],
      options: COMBO_FIXED,
    });
    assert.equal(linesOnly.points, 4);
    assert.equal(linesOnly.empty, false);
    assert.equal(attrsOf(linesOnly.html, 'rect', 'ilife-charts-bar').length, 0);
    assert.deepEqual(attrsOf(linesOnly.html, 'circle', 'ilife-charts-dot').map((d) => d.cx), ['50.5', '123.5', '196.5', '269.5'], '只传 lines 仍走同一 band 标度（旧版线点落在柱列容器内 left:50%）');
    assert.equal(pathD(linesOnly.html, 'ilife-charts-combo-line'), 'M50.5 123.5L123.5 85.0L196.5 46.5L269.5 8.0');
  });

  it('F.combo 共享域：0..max(柱,线) 无 padding（柱底贴底，旧 charts.js:742-753）', () => {
    const html = charts.combo({
      bars: [{ label: 'A', value: 10 }], lines: [{ label: 'A', value: 100 }], options: COMBO_FIXED,
    }).html;
    const bar = attrsOf(html, 'rect', P + 'charts-bar')[0];
    /* COMBO_FIXED frame：x0 14 / x1 306 / y0 8 / y1 162（h=154）→ 柱高 = 10/100*154 = 15.4、柱底 162。
     * 6% padding 会得 13.8 与柱底 153.8（R2-N1 的 combo 同因）。 */
    assert.equal(bar.height, '15.4');
    assert.equal(Number(bar.y) + Number(bar.height), 162, '柱底必须贴绘图区底');
    assert.equal(attrsOf(html, 'circle', P + 'charts-dot')[0].cy, '8.0', '线点落在域顶（与柱顶同基准）');
    assert.equal(attrsOf(html, 'path', P + 'charts-line')[0].d, 'M160.0 8.0', '单点线路径落在域顶');
  });

  it('F.barColor / F.lineColor：两族颜色', () => {
    const html = charts.combo({
      bars: [{ label: 'A', value: 10 }],
      lines: [{ label: 'A', value: 100 }],
      options: { ...COMBO_FIXED, barColor: '#112233', lineColor: '#445566' },
    }).html;
    assert.equal(attrsOf(html, 'rect', P + 'charts-bar')[0].fill, '#112233');
    assert.equal(attrsOf(html, 'path', P + 'charts-line')[0].stroke, '#445566');
    assert.equal(attrsOf(html, 'circle', P + 'charts-dot')[0].stroke, '#445566');
    const defaults = charts.combo({ bars: [{ label: 'A', value: 1 }], lines: [{ label: 'A', value: 2 }], options: COMBO_FIXED }).html;
    assert.equal(attrsOf(defaults, 'path', P + 'charts-line')[0].stroke, '#ff9500', '缺省线色 #ff9500');
    assert.equal(attrsOf(defaults, 'rect', P + 'charts-bar')[0].fill, DEFAULT_BAR_COLOR, '缺省柱色');
  });

  it('F.legend：图例（量 / 趋势）', () => {
    const html = charts.combo({
      bars: [{ label: 'A', value: 1 }],
      lines: [{ label: 'A', value: 2 }],
      options: { ...COMBO_FIXED, legend: true },
    }).html;
    assert.deepEqual(legendTextsOf(html), ['量', '趋势']);
    assert.equal(countOf(charts.combo({ bars: [{ label: 'A', value: 1 }], lines: [{ label: 'A', value: 2 }], options: COMBO_FIXED }).html, P + 'charts-legend'), 0);
  });

  it('F.showValue（sparkline）：末尾数值；涨绿跌红', () => {
    const rising = charts.sparkline({ items: [{ label: 'A', value: 1 }, { label: 'B', value: 3 }], options: { width: 90, height: 30 } }).html;
    assert.equal(attrsOf(rising, 'polyline')[0].stroke, 'var(--ok,#34c759)');
    assert.deepEqual(textsOf(rising, P + 'charts-spark-value'), ['3']);
    assert.ok(rising.includes(P + 'charts-up'));
    const falling = charts.sparkline({ items: [{ label: 'A', value: 3 }, { label: 'B', value: 1 }], options: { width: 90, height: 30 } }).html;
    assert.equal(attrsOf(falling, 'polyline')[0].stroke, '#ff3b30');
    assert.ok(falling.includes(P + 'charts-down'));
    assert.equal(countOf(charts.sparkline({ items: [{ label: 'A', value: 1 }, { label: 'B', value: 3 }], options: { showValue: false } }).html, P + 'charts-spark-value'), 0);
    /* FX-78-V2a-4.3：`last >= first` 的**相等边界**（`charts.ts:1483`）——`>=` 改 `>` 时相等翻红，
     * 原用例只有 1→3（涨）与 3→1（跌），该边界不可达。旧语义：相等按「涨」处理。 */
    const flat = charts.sparkline({ items: [{ label: 'A', value: 5 }, { label: 'B', value: 5 }] }).html;
    assert.equal(attrsOf(flat, 'polyline')[0].stroke, 'var(--ok,#34c759)', '首尾相等 → 按涨处理');
    assert.equal(countOf(flat, 'ilife-charts-up'), 1);
    assert.equal(countOf(flat, 'ilife-charts-down'), 0);
    assert.deepEqual(textsOf(flat, 'ilife-charts-spark-value'), ['5']);
    assert.equal(attrsOf(flat, 'polyline')[0].points, '2.0,28.0 88.0,28.0', '相等数据 → 水平线');
  });
});

/* ── G. ScatterChartOptions ───────────────────────────────────────────── */

describe('G ScatterChartOptions', () => {
  const SCATTER_FIXED = { width: 320, height: 180, labels: 'none', grid: false };
  const LINE_PTS = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }];

  it('G.regression：最小二乘回归线；false 关闭', () => {
    const html = charts.scatter({ items: LINE_PTS, options: SCATTER_FIXED }).html;
    const line = attrsOf(html, 'line', P + 'charts-regression')[0];
    assert.equal(line['stroke-dasharray'], '5 4');
    assert.equal(countOf(charts.scatter({ items: LINE_PTS, options: { ...SCATTER_FIXED, regression: false } }).html, P + 'charts-regression'), 0);
    assert.equal(countOf(charts.scatter({ items: [{ x: 1, y: 1 }], options: SCATTER_FIXED }).html, P + 'charts-regression'), 0, '单点不画回归线');
    /* 端点必须随**域**变化（R2-M4）：恒等数据 y=x 的回归端点恒等于域上下界（加不加 padding 都得
     * 172.0/8.0，无鉴别力）→ 改用非共线数据 y=1,3,4（回归 y=1.5x+7/6）。
     * x 域 = [0,2] 各外扩 6% → [-0.12, 2.12]；y 域 = [1,4] 各外扩 6% → [0.82, 4.18]；
     * frame y0=8 / y1=172（h=164）→ 端点 yAt(yOf(域边界)) = 163.9 / -0.1。
     * 若 padding 变 0 → 162.9 / -1.1；变 10% → 164.4 / 0.6。 */
    const skew = [{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 4 }];
    const skewed = attrsOf(charts.scatter({ items: skew, options: SCATTER_FIXED }).html, 'line', P + 'charts-regression')[0];
    assert.equal(skewed.y1, '163.9', '回归线端点随 6% 域外扩变化');
    assert.equal(skewed.y2, '-0.1');
    assert.notEqual(skewed.y1, line.y1, '非共线数据的端点不得与恒等数据重合（证明该断言有鉴别力）');
    assert.notEqual(skewed.y2, line.y2);
  });

  it('G.regressionColor：缺省 #ff3b30', () => {
    assert.equal(attrsOf(charts.scatter({ items: LINE_PTS, options: SCATTER_FIXED }).html, 'line', P + 'charts-regression')[0].stroke, '#ff3b30');
    assert.equal(
      attrsOf(charts.scatter({ items: LINE_PTS, options: { ...SCATTER_FIXED, regressionColor: '#00ff00' } }).html, 'line', P + 'charts-regression')[0].stroke,
      '#00ff00',
    );
  });

  it('G.dotSize：缺省 9px（r=4.5）；显式值走内联样式；≤720px 走 CHART_BREAKPOINTS.dotSizeMobilePx', () => {
    assert.deepEqual(attrsOf(charts.scatter({ items: LINE_PTS, options: SCATTER_FIXED }).html, 'circle', P + 'charts-dot').map((d) => d.r), ['4.5', '4.5', '4.5']);
    const explicit = attrsOf(charts.scatter({ items: LINE_PTS, options: { ...SCATTER_FIXED, dotSize: 20 } }).html, 'circle', P + 'charts-dot');
    assert.equal(explicit[0].r, '10');
    /* 显式 dotSize 必须走**内联样式**：CSS 几何属性 `r:calc(var(--…-dot)/2)` 优先于 SVG 呈现属性，
     * 只写 `r="10"` 时浏览器实际按 4.5px 渲染（R2-N10）→ 断言内联值 = dotSize/2，缺省不带内联 r。 */
    assert.deepEqual(explicit.map((d) => d.style), ['r:10', 'r:10', 'r:10'], '显式 dotSize 必须产出内联 r 样式');
    assert.deepEqual(attrsOf(charts.scatter({ items: LINE_PTS, options: SCATTER_FIXED }).html, 'circle', P + 'charts-dot').map((d) => d.style), [undefined, undefined, undefined], '缺省 dotSize 不带内联 r（走 CSS 变量）');
    assert.ok(buildChartsHelpersJs().includes('.ilife-charts-scatter .ilife-charts-dot{r:calc(var(--ilife-charts-dot) / 2)}'), '覆盖源（CSS 几何属性）必须仍在，否则本断言失去意义');
    const css = buildChartsHelpersJs();
    assert.ok(css.includes('--ilife-charts-dot:8px'), '移动端点直径取冻结常量');
    assert.ok(css.includes('@media (max-width:720px)'), '断点用**字面量** needle（常量自证无鉴别力，R2-M7）');
    assert.ok(css.includes('height:150px'), '移动端折线高度用**字面量** needle');
  });

  it('G.yTicks 缺省：scatter 渲染 4 条 Y 轴刻度（旧 charts.js:854,884-893）', () => {
    const html = charts.scatter({ items: LINE_PTS, options: SCATTER_FIXED }).html;
    assert.equal(attrsOf(html, 'text', P + 'charts-tick').length, 4, 'scatter 缺省 4 条 Y 刻度');
    assert.equal(countOf(html, P + 'charts-ytick'), 4, '刻度短线与文字同数');
    /* 刻度值 = Y 域（[0,2] 各外扩 6% → [-0.12, 2.12]）均分 4 点，文字走 round2。 */
    assert.deepEqual(textsOf(html, P + 'charts-tick'), ['-0.12', '0.63', '1.37', '2.12']);
    assert.deepEqual(textsOf(charts.scatter({ items: [{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }], options: SCATTER_FIXED }).html, P + 'charts-tick'), ['0.76', '2.25', '3.75', '5.24'], '刻度随 Y 域变化');
    assert.deepEqual(textsOf(charts.scatter({ items: LINE_PTS, options: { ...SCATTER_FIXED, yMin: 0, yMax: 3 } }).html, P + 'charts-tick'), ['0', '1', '2', '3'], '显式 yMin/yMax 优先');
    assert.equal(countOf(lineHtml(), P + 'charts-tick'), 0, 'line 的 yTicks 缺省仍 false（不受影响）');
  });

  it('G.ScatterItem.x/y 非法：抛 structure-invalid', () => {
    const isStructure = (err) => err.name === 'ChartError' && err.code === 'structure-invalid';
    assert.throws(() => charts.scatter({ items: [{ x: 'a', y: 1 }] }), isStructure);
    assert.throws(() => charts.scatter({ items: [{ x: 1 }] }), isStructure);
    assert.throws(() => charts.scatter({ items: [{ y: 1 }] }), isStructure);
    assert.throws(() => charts.scatter({ items: [null] }), isStructure);
    assert.throws(() => charts.scatter({ items: 'x' }), isStructure);
  });

  it('G.空数组：走空态', () => {
    const out = charts.scatter({ items: [] });
    assert.equal(out.empty, true);
    assert.equal(out.points, 0);
    assert.ok(out.html.includes('data-chart-empty="1"'));
  });

  it('G.ScatterItem.label：X 标签与 tooltip 用该 label（缺省回退 x 值）', () => {
    const items = [{ x: 1, y: 2, label: '一月' }, { x: 2, y: 3 }];
    const html = charts.scatter({ items, options: { ...SCATTER_FIXED, labels: 'all', tooltip: true } }).html;
    assert.deepEqual(textsOf(html, P + 'charts-xlabel'), ['一月', '2'], '缺 label 回退 x 值');
    assert.deepEqual(attrsOf(html, 'circle', P + 'charts-dot').map((d) => d['data-tip']), ['一月: 2', '2: 3']);
  });
});

/* ── H. 常量与规则 ────────────────────────────────────────────────────── */

describe('H 常量与规则', () => {
  it('H.CHART_KINDS：8 成员闭集；charts 只暴露这 8 个方法', () => {
    assert.deepEqual([...CHART_KINDS], ['bar', 'line', 'donut', 'progress', 'combo', 'sparkline', 'gauge', 'scatter']);
    assert.deepEqual(Object.keys(charts), [...CHART_KINDS]);
    for (const kind of CHART_KINDS) assert.equal(typeof charts[kind], 'function', kind + ' 必须是函数');
    /* W11：`typeof === 'function'` 单看恒真（任何函数都过）→ 每 kind 做一次最小调用并断 kind 与容器。 */
    const MIN_INPUT = {
      bar: { items: [{ label: 'A', value: 1 }] },
      line: { items: [{ label: 'A', value: 1 }] },
      donut: { items: [{ label: 'A', value: 1 }] },
      progress: { pct: 1 },
      combo: { bars: [{ label: 'A', value: 1 }], lines: [{ label: 'A', value: 2 }] },
      sparkline: { items: [{ label: 'A', value: 1 }] },
      gauge: { pct: 1 },
      scatter: { items: [{ x: 1, y: 1 }] },
    };
    for (const kind of CHART_KINDS) {
      const out = charts[kind](MIN_INPUT[kind]);
      assert.equal(out.kind, kind, kind + ' 必须返回自己的 kind');
      assert.equal(countOf(out.html, 'data-chart-kind="' + kind + '"'), 1, kind + ' 容器必须带自己的 data-chart-kind');
    }
  });

  it('H.kind-unknown：派表未命中（JS 调用方可达）抛 ChartError', () => {
    /* 非自证（R2-M6）：断言的落点是**实现产出**——错误码必须取自冻结码表，文案必须带未知 kind 名。 */
    assert.throws(
      () => charts['pie']({ items: [] }),
      (err) => err instanceof ChartError && err.name === 'ChartError'
        && err.code === 'kind-unknown' && CHART_ERROR_CODES.includes(err.code)
        && err.message === 'charts: 未知图表 kind：pie',
    );
    assert.throws(
      () => charts['']({}),
      (err) => err.code === 'kind-unknown' && err.message === 'charts: 未知图表 kind：',
    );
    assert.equal(countOf(charts.bar({ items: [{ label: 'A', value: 1 }] }).html, 'kind-unknown'), 0, '正常 kind 不产生错误码文本');
  });

  it('H.CHART_ERROR_CODES：三码逐值 + 三码皆可达', () => {
    assert.deepEqual([...CHART_ERROR_CODES], ['structure-invalid', 'pct-invalid', 'kind-unknown']);
    assert.throws(() => charts.bar({ items: 1 }), (e) => e.code === 'structure-invalid');
    assert.throws(() => charts.progress({ pct: 'x' }), (e) => e.code === 'pct-invalid');
    assert.throws(() => charts['pie']({}), (e) => e.code === 'kind-unknown');
  });

  it('H.CHART_STRUCTURE_RULE / CHART_EMPTY_RULE / CHART_COORD_RULE：逐值 + 可观察效果', () => {
    assert.equal(CHART_STRUCTURE_RULE, 'throw');
    assert.equal(CHART_EMPTY_RULE, 'emptyState');
    assert.equal(CHART_COORD_RULE, 'viewBox-only');
    assert.throws(() => charts.bar({ items: [{ value: 1 }] }), (e) => e.code === 'structure-invalid');
    const empty = charts.bar({ items: [] });
    assert.ok(empty.html.includes('class="ilife-empty-text"'), '空态必须走 renderEmptyState（CHART_EMPTY_RULE=emptyState）');
    assert.ok(empty.html.includes('class="ilife-empty-icon"'), '空态图标来自 renderEmptyState 的 icon 入参');
    const css = buildChartsHelpersJs();
    assert.ok(css.includes('.ilife-charts{position:relative;margin:0;padding:0;'), '容器零 padding（字面量 needle）');
    /* FX-78-V3-03 / W3：只断 `includes('vector-effect=…')` 会被**数据点 circle**满足
     * （折线 path 自身去掉该属性仍绿）→ 在**被测标签本身**上逐元素断言（契约 §3.5.1：描边元素）。 */
    const hasVe = (tag) => tag !== undefined && tag.includes('vector-effect="non-scaling-stroke"');
    assert.ok(hasVe(tagOf(lineHtml({ showDots: false }), 'path', 'ilife-charts-line')), '折线 path 自身必须带 vector-effect');
    assert.ok(hasVe(tagOf(lineHtml({ markLine: { value: 50 } }), 'line', 'ilife-charts-markline')), 'markLine 水平线自身');
    assert.ok(hasVe(tagOf(lineHtml({ markLine: { xValue: 1 } }), 'line', 'ilife-charts-markline-v')), 'markLine 垂直线自身');
    assert.ok(hasVe(tagOf(lineHtml({ grid: true }), 'line', 'ilife-charts-grid')), '网格线自身');
    assert.ok(hasVe(tagOf(lineHtml({ yTicks: 2 }), 'line', 'ilife-charts-ytick')), 'Y 刻度短线自身');
    assert.ok(hasVe(tagOf(charts.sparkline({ items: [{ label: 'A', value: 1 }, { label: 'B', value: 2 }] }).html, 'polyline', 'ilife-charts-sparkline')), 'sparkline polyline 自身');
    assert.ok(hasVe(tagOf(charts.combo({ bars: [{ label: 'A', value: 1 }], lines: [{ label: 'A', value: 2 }] }).html, 'path', 'ilife-charts-combo-line')), 'combo 折线自身');
    assert.ok(hasVe(tagOf(charts.scatter({ items: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }] }).html, 'line', 'ilife-charts-regression')), '回归线自身');
    /* 纯填充元素（`stroke="none"`）按契约只要求**描边**元素带 vector-effect → 断其 fill 语义。 */
    assert.equal(attrsOf(lineHtml({ area: true }), 'path', 'ilife-charts-area')[0].stroke, 'none', 'area 是纯填充路径（无描边，不要求 vector-effect）');
    assert.equal(countOf(lineHtml(), 'padding:'), 0, '留白进 viewBox，不落容器');
  });

  it('H.CHARTS_STYLE_ID：helpers JS 注入的 <style> id 缺省值', () => {
    assert.equal(CHARTS_STYLE_ID, 'ilife-charts');
    const js = buildChartsHelpersJs();
    /* W6：needle 不用 CHARTS_STYLE_ID 自身拼（同源自证）→ 字面量。 */
    assert.ok(js.includes('var STYLE_ID = "ilife-charts";'), 'helpers JS 注入的 id 逐字');
    assert.ok(js.includes('document.getElementById(STYLE_ID)'));
  });

  it('H.CHART_BREAKPOINTS：四值逐值 + 在产出中生效', () => {
    assert.deepEqual({ ...CHART_BREAKPOINTS }, { mobileMaxPx: 720, dotSizeMobilePx: 8, lineHeightMobilePx: 150, stackedGapPx: 3 });
    const css = buildChartsHelpersJs();
    assert.ok(css.includes('max-width:720px'));
    assert.ok(css.includes('--' + P + 'charts-dot:8px'));
    assert.ok(css.includes('height:150px'));
    const grouped = charts.bar({
      items: [{ label: 'A', values: [1, 2], value: 3 }],
      options: { grouped: true, labels: 'none', showValues: false, grid: false },
    }).html;
    assert.ok(grouped.includes('data-gap="3"'));
  });

  it('H.CHART_PALETTE：10 色逐值 + 取色顺序', () => {
    assert.deepEqual([...CHART_PALETTE], [
      '#007aff', '#34c759', '#ff9500', '#ff3b30', '#af52de', '#5ac8fa', '#ffcc00', '#8e8e93', '#ff2d55', '#00c7be',
    ]);
    const items = CHART_PALETTE.map((_, i) => ({ label: 'S' + i, value: 1 }));
    const arcs = attrsOf(charts.donut({ items }).html, 'circle', P + 'charts-arc').map((a) => a.stroke);
    assert.deepEqual(arcs, [...CHART_PALETTE]);
    const segs = attrsOf(charts.bar({
      items: [{ label: 'A', values: CHART_PALETTE.map((_, i) => i + 1), value: CHART_PALETTE.length }],
      options: { stacked: true, labels: 'none', showValues: false, grid: false },
    }).html, 'rect', P + 'charts-seg').map((s) => s.fill);
    assert.deepEqual(segs, [...CHART_PALETTE]);
  });

  it('H.移动端满宽：line/combo/scatter 用 preserveAspectRatio="none"（旧 charts.js:661,774,899）', () => {
    const aspectOf = (html) => (tagsOf(html, 'svg')[0].match(/preserveAspectRatio="([^"]*)"/) ?? [])[1];
    const FIXED = { width: 320, height: 170, labels: 'none', showValues: false, grid: false };
    /* ≤720px 时 CSS 把折线 svg 高度钉成 150px；`xMidYMid meet` 会等比缩到 228.6px 宽并左右各留
     * ~73px 空白（R2-N9）→ 三个 kind 必须用 `none` 满宽拉伸（描边有 vector-effect 防变形）。 */
    assert.equal(aspectOf(lineHtml()), 'none');
    assert.equal(aspectOf(charts.combo({ bars: [{ label: 'A', value: 1 }], lines: [{ label: 'A', value: 2 }], options: FIXED }).html), 'none');
    assert.equal(aspectOf(charts.scatter({ items: [{ x: 1, y: 1 }], options: { ...FIXED, height: 180 } }).html), 'none');
    assert.equal(aspectOf(charts.bar({ items: [{ label: 'A', value: 1 }] }).html), 'xMidYMid meet', 'bar 等比缩放');
    assert.equal(aspectOf(charts.donut({ items: [{ label: 'A', value: 1 }] }).html), 'xMidYMid meet', 'donut 等比缩放');
    assert.equal(aspectOf(charts.gauge({ pct: 50 }).html), 'xMidYMid meet', 'gauge 等比缩放');
    assert.equal(aspectOf(charts.sparkline({ items: [{ label: 'A', value: 1 }, { label: 'B', value: 2 }] }).html), 'xMidYMid meet', 'sparkline 等比缩放');
    assert.ok(buildChartsHelpersJs().includes('.ilife-charts-line .ilife-charts-svg{height:150px}'), '移动端固定高度规则仍在（字面量 needle，W7）');
    /* FX-78-V3-07：`role="img" focusable="false"` 删掉后旧断言全绿 → 逐 kind 断 `<svg>` 开标签。 */
    const svgTags = {
      bar: charts.bar({ items: [{ label: 'A', value: 1 }] }).html,
      line: lineHtml(),
      donut: charts.donut({ items: [{ label: 'A', value: 1 }] }).html,
      progress: charts.progress({ pct: 1 }).html,
      combo: charts.combo({ bars: [{ label: 'A', value: 1 }], lines: [{ label: 'A', value: 2 }] }).html,
      sparkline: charts.sparkline({ items: [{ label: 'A', value: 1 }] }).html,
      gauge: charts.gauge({ pct: 50 }).html,
      scatter: charts.scatter({ items: [{ x: 1, y: 1 }] }).html,
    };
    for (const [kind, html] of Object.entries(svgTags)) {
      const svg = tagsOf(html, 'svg')[0];
      assert.equal((svg.match(/role="([^"]*)"/) ?? [])[1], 'img', kind + ' 的 <svg> 必须 role="img"');
      assert.equal((svg.match(/focusable="([^"]*)"/) ?? [])[1], 'false', kind + ' 的 <svg> 必须 focusable="false"');
      assert.ok(svg.includes('role="img" focusable="false"'), kind + ' 的两个属性必须相邻出现（无障碍契约）');
    }
  });

  it('H.类名命名空间：ilife-charts*（STYLE_PREFIX + 区名 charts，R1-A3／R3）', () => {
    /* 一票一口径：`CONTROL_STYLE_SECTIONS` 的 `charts` 区按「STYLE_PREFIX + 区名」= `ilife-charts`，
     * 与同票 `help.ts` 的 `ilife-help-shell` 一致（旧实现发 `ilife-chart*` 会让 #75 落空）。 */
    const all = [
      lineHtml(),
      charts.bar({ items: [{ label: 'A', value: 1 }] }).html,
      charts.bar({ items: [{ label: 'A', values: [1, 2], value: 3 }], options: { stacked: true } }).html,
      charts.bar({ items: [{ label: 'A', values: [1, 2], value: 3 }], options: { grouped: true } }).html,
      charts.donut({ items: [{ label: 'A', value: 1 }] }).html,
      charts.progress({ pct: 50, options: { gradient: true } }).html,
      charts.combo({ bars: [{ label: 'A', value: 1 }], lines: [{ label: 'A', value: 2 }] }).html,
      charts.sparkline({ items: [{ label: 'A', value: 1 }] }).html,
      charts.gauge({ pct: 50 }).html,
      charts.scatter({ items: [{ x: 1, y: 1 }] }).html,
      charts.bar({ items: [] }).html,
    ].join('');
    const css = buildChartsHelpersJs();
    assert.ok(countOf(all, 'class="' + P + 'charts') > 0, '产出必须用 ' + P + 'charts* 命名空间');
    assert.ok(countOf(all, 'class="' + P + 'charts ') > 0, '容器根类必须是 ' + P + 'charts');
    assert.equal(countOf(all, 'class="' + P + 'chart '), 0, '不得残留根类 ' + P + 'chart');
    assert.ok(countOf(css, '.' + P + 'charts') > 0, 'CSS 必须用 .' + P + 'charts* 命名空间');
    assert.equal(countOf(all, 'class="' + P + 'chart"'), 0, '不得残留 class="' + P + 'chart" 精确形态');
    assert.equal(countOf(all, P + 'chart-'), 0, '不得残留 ' + P + 'chart- 精确形态');
    assert.equal(countOf(css, P + 'chart-'), 0, 'CSS 不得残留 ' + P + 'chart-');
    assert.equal(countOf(css, '.' + P + 'chart{'), 0, 'CSS 根类不得残留 .' + P + 'chart{');
    assert.equal(countOf(css, P + 'chartss'), 0, '严禁把 CHARTS_STYLE_ID 值改成 ' + P + 'chartss');
    assert.equal(CHARTS_STYLE_ID, 'ilife-charts', '样式 id 仍是 ilife-charts（未被类名改名波及）');
    assert.ok(css.includes('var STYLE_ID = "ilife-charts";'), 'helpers JS 注入的 id 逐字不变');
    assert.ok(css.includes('.' + P + 'charts{position:relative;margin:0;padding:0;'), '根类规则同步改名');
    /* FX-78-V2a-1 / W12：上面所有 needle 都由 `P = STYLE_PREFIX` 拼成（同源自证）——
     * 本文件补**字面量**断言，`STYLE_PREFIX` 一旦漂移（如改成 'x-'）这里必红。 */
    assert.equal(STYLE_PREFIX, 'ilife-', '类名前缀冻结值（V2a-1：全仓此前无任何断言）');
    assert.ok(all.includes('<div class="ilife-charts ilife-charts-line ilife-charts-anim"'), 'line 容器根类逐字');
    assert.ok(all.includes('<svg class="ilife-charts-svg"'), 'svg 类逐字');
    assert.ok(all.includes('class="ilife-charts-bar"'), 'bar 子类逐字');
    assert.ok(all.includes('class="ilife-charts-arc"'), 'donut 弧子类逐字');
    assert.ok(all.includes('class="ilife-charts-fillbar"'), 'progress 填充子类逐字');
    assert.ok(all.includes('class="ilife-charts-line ilife-charts-combo-line"'), 'combo 折线子类逐字');
    assert.ok(all.includes('class="ilife-charts-sparkline"'), 'sparkline 子类逐字');
    assert.ok(all.includes('class="ilife-charts-gauge-fg"'), 'gauge 前景弧子类逐字');
    assert.ok(all.includes('class="ilife-charts-dot"'), '数据点子类逐字');
    assert.ok(all.includes('ilife-charts-empty'), '空态子类逐字');
    assert.ok(css.includes('.ilife-charts{position:relative;margin:0;padding:0;'), 'CSS 根类规则逐字');
    assert.ok(css.includes('.ilife-charts-scatter .ilife-charts-dot{r:calc(var(--ilife-charts-dot) / 2)}'), 'CSS scatter 点半径规则逐字');
    assert.ok(css.includes('.ilife-charts-line .ilife-charts-svg{height:150px}'), 'CSS 移动端折线高度规则逐字');
    assert.ok(css.includes('--ilife-charts-dot:8px'), 'CSS 变量逐字');
  });

  it('H.ChartOutput：4 字段齐备；empty ⇔ points === 0（pct 型例外）', () => {
    const outputs = [
      charts.bar({ items: [{ label: 'A', value: 1 }] }),
      charts.line({ items: [{ label: 'A', value: 1 }] }),
      charts.donut({ items: [{ label: 'A', value: 1 }] }),
      charts.progress({ pct: 1 }),
      charts.combo({ bars: [{ label: 'A', value: 1 }], lines: [{ label: 'A', value: 2 }] }),
      charts.sparkline({ items: [{ label: 'A', value: 1 }] }),
      charts.gauge({ pct: 1 }),
      charts.scatter({ items: [{ x: 1, y: 1 }] }),
    ];
    assert.deepEqual(outputs.map((o) => o.kind), [...CHART_KINDS]);
    for (const out of outputs) {
      assert.deepEqual(Object.keys(out), ['kind', 'html', 'empty', 'points']);
      assert.equal(typeof out.html, 'string');
      /* 非自证：不只断「非空」，而是断产出的**具体结构**（R2-M2）。 */
      assert.ok(out.html.startsWith('<div class="ilife-charts '), '容器根类 = ilife-charts（字面量，W12）');
      assert.ok(out.html.endsWith('</div>'), '产出是自闭合的容器片段');
      assert.equal(countOf(out.html, '<svg'), 1, '非空图表恰 1 个 svg');
      assert.equal(countOf(out.html, '</svg>'), 1);
      assert.equal(countOf(out.html, 'data-chart-kind="' + out.kind + '"'), 1, '容器必须带 data-chart-kind');
      assert.equal(out.empty, out.points === 0);
      assert.ok(out.points > 0);
      assert.equal(out.empty, false, '非空产出的 empty 必须为 false（W9：不只断自洽）');
    }
    /* W9：`empty ⇔ points === 0` 是实现两个字段的**自洽**（同时错则同过）→ 另钉每 kind 的 points 具体值。 */
    assert.deepEqual(
      Object.fromEntries(outputs.map((out) => [out.kind, out.points])),
      { bar: 1, line: 1, donut: 1, progress: 1, combo: 2, sparkline: 1, gauge: 1, scatter: 1 },
      '每 kind 的 points 具体值（combo = bars + lines）',
    );
    for (const out of [
      charts.bar({ items: [] }), charts.line({ items: [] }), charts.donut({ items: [] }),
      charts.combo({ bars: [], lines: [] }), charts.sparkline({ items: [] }), charts.scatter({ items: [] }),
    ]) {
      assert.equal(out.empty, true);
      assert.equal(out.points, 0);
    }
    for (const out of [charts.progress({ pct: 0 }), charts.gauge({ pct: 0 })]) {
      assert.equal(out.empty, false);
      assert.equal(out.points, 1);
    }
  });

  it('H.纯度：产出无 canvas / 内联 script / onclick / node: / 第三方 URL', () => {
    const outputs = [
      lineHtml(),
      lineHtml({ area: true, smooth: true, step: true, tooltip: true, actionId: 'a' }),
      charts.bar({ items: [{ label: 'A', value: 1 }], options: { tooltip: true } }),
      charts.bar({ items: [{ label: 'A', values: [1, 2], value: 3 }], options: { stacked: true } }),
      charts.bar({ items: [{ label: 'A', values: [1, 2], value: 3 }], options: { grouped: true } }),
      charts.donut({ items: [{ label: 'A', value: 1 }] }),
      charts.progress({ pct: 50, options: { gradient: true } }),
      charts.combo({ bars: [{ label: 'A', value: 1 }], lines: [{ label: 'A', value: 2 }] }),
      charts.sparkline({ items: [{ label: 'A', value: 1 }] }),
      charts.gauge({ pct: 50 }),
      charts.scatter({ items: [{ x: 1, y: 1 }] }),
      charts.bar({ items: [] }),
    ].map((out) => (typeof out === 'string' ? out : out.html));
    for (const html of outputs) {
      for (const bad of ['<canvas', '<script', 'onclick=', 'onload=', 'node:', 'http://', 'https://']) {
        assert.equal(countOf(html, bad), 0, '产出不得含 ' + bad);
      }
      assert.equal(countOf(html, '<style'), 0, 'CSS 只由 buildChartsHelpersJs 注入');
    }
  });

  it('H.转义：文本/属性出口全部经 escapeHtml（注入 script 标签与引号）', () => {
    /* FX-78-V3-01 / W4：`esc` 退化为恒等（`charts.ts:100-102` → `return value;`）后旧 82 条全绿
     * ——全文既无 `&lt;`／`&amp;`，也无任何含 HTML 特殊字符的输入。逐字段注入取证。 */
    const RAW = '<script>"\'&';
    const ESCAPED = '&lt;script&gt;&quot;&#39;&amp;';
    const cases = {
      'items[].label': charts.bar({ items: [{ label: RAW, value: 1 }], options: { tooltip: true } }).html,
      'options.color': lineHtml({ color: RAW }),
      'format 返回值': lineHtml({ showValues: true, format: () => RAW }),
      'options.emptyText': charts.bar({ items: [], options: { emptyText: RAW } }).html,
      'donut.centerLabel': charts.donut({ items: [{ label: 'A', value: 1 }], options: { centerLabel: RAW } }).html,
      'donut.centerValue': charts.donut({ items: [{ label: 'A', value: 1 }], options: { centerValue: RAW } }).html,
      'bar.segNames': charts.bar({ items: [{ label: 'A', values: [1, 2], value: 3 }], options: { stacked: true, segNames: [RAW, 'B'] } }).html,
      'line.series[].name': charts.line({ items: LINE3, options: { ...LINE_FIXED, legend: true, series: [{ name: RAW, items: LINE3 }] } }).html,
      'markLine.label': lineHtml({ markLine: { value: 50, label: RAW } }),
      'markLine.xValue 标注': lineHtml({ markLine: { xValue: 1, label: RAW } }),
      'markPoint.label': lineHtml({ markPoint: { index: 0, label: RAW } }),
      'options.actionId': lineHtml({ actionId: RAW }),
      'options.dotStyle': lineHtml({ dotStyle: RAW }),
      'gauge.label': charts.gauge({ pct: 50, options: { label: RAW } }).html,
      'scatter.label': charts.scatter({ items: [{ x: 1, y: 2, label: RAW }], options: { labels: 'all', tooltip: true } }).html,
    };
    for (const [field, html] of Object.entries(cases)) {
      assert.ok(html.includes(ESCAPED), field + ' 必须产出转义实体 ' + ESCAPED);
      assert.equal(countOf(html, RAW), 0, field + ' 不得出现原文');
      assert.equal(countOf(html, '<script'), 0, field + ' 不得产出 <script');
      assert.equal(countOf(html, '&lt;script&gt;'), countOf(html, ESCAPED), field + ' 转义实体必须成组出现');
    }
    /* 属性位：引号必须已被转义，否则属性闭合被击穿（XSS 入口）。 */
    assert.ok(lineHtml({ actionId: RAW }).includes('data-action-id="' + ESCAPED + '"'), 'actionId 属性逐字转义');
    assert.ok(lineHtml({ color: RAW }).includes('stroke="' + ESCAPED + '"'), '颜色进 stroke 属性时逐字转义');
    assert.ok(lineHtml({ dotStyle: RAW }).includes('style="' + ESCAPED + '"'), 'dotStyle 进 style 属性时逐字转义');
    /* 对照：正常输入不得被双重转义。 */
    assert.ok(lineHtml({ actionId: 'open-detail' }).includes('data-action-id="open-detail"'));
  });

  it('H.空态文案与图标：EMPTY_HINT 逐字 ＋ 📊 图标（8 接口共用）', () => {
    /* FX-78-V3-08 / W5：`A.emptyText`／`H.CHART_STRUCTURE_RULE` 只断 CSS 类名锚点，
     * 改 `EMPTY_HINT`（`charts.ts:151`）或 `EMPTY_ICON` 文案仍绿。 */
    const empty = charts.bar({ items: [] });
    assert.equal(countOf(empty.html, '有记录后自动生成图表'), 1, '空态提示文案逐字');
    assert.equal(countOf(empty.html, '📊'), 1, '空态图标逐字');
    assert.ok(empty.html.includes('class="ilife-empty-icon">📊</div>'), '图标落在 ilife-empty-icon 内');
    assert.ok(empty.html.includes('class="ilife-empty-hint">有记录后自动生成图表</div>'), '提示落在 ilife-empty-hint 内');
    assert.equal(countOf(empty.html, STATUS_DEFAULT_TEXT.empty), 1, '缺省文案仍取冻结常量');
    for (const html of [
      charts.line({ items: [] }).html,
      charts.donut({ items: [] }).html,
      charts.combo({ bars: [], lines: [] }).html,
      charts.sparkline({ items: [] }).html,
      charts.scatter({ items: [] }).html,
    ]) {
      assert.equal(countOf(html, '有记录后自动生成图表'), 1, '8 接口空态共用同一份提示');
      assert.equal(countOf(html, '📊'), 1, '8 接口空态共用同一份图标');
    }
    assert.equal(countOf(charts.donut({ items: [{ label: 'A', value: 0 }] }).html, '合计为零, 无环形数据'), 1, 'donut 合计为零的专属 hint');
  });

  it('H.纯度（src 侧）：src/charts.ts 模块代码零 DOM 全局／node:', () => {
    /* W17：产出侧纯度已有 `H.纯度`，但 `src/charts.ts` 自身从无仓内断言
     * （R8：模块代码零 `document.`／`window.`／`globalThis.`，DOM 只允许出现在 helpers JS 模板串里）。 */
    const src = readFileSync(fileURLToPath(new URL('../src/charts.ts', import.meta.url)), 'utf8');
    const lineComment = new RegExp('(^|[^:])//[^' + LF_CHAR + ']*', 'g');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(lineComment, '$1')
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""');
    /* 防剥空后恒真：剥完必须还是模块代码。 */
    assert.ok(code.includes('function smoothPath'), '剥注释/字面量后仍含模块代码');
    assert.ok(code.includes('export const charts'), '导出语句仍在');
    assert.ok(code.length > 2000, '剥完的源码不得被清空（实读 ' + code.length + ' 字符）');
    assert.equal(countOf(code, 'document.'), 0, '模块代码不得含 document.');
    assert.equal(countOf(code, 'window.'), 0, '模块代码不得含 window.');
    assert.equal(countOf(code, 'globalThis.'), 0, '模块代码不得含 globalThis.');
    assert.equal(countOf(code, 'node:'), 0, '模块代码不得含 node:');
    assert.equal(countOf(code, 'require('), 0, '模块代码不得含 require(');
    /* 反向对照：DOM 允许出现在 helpers JS 的**产出文本**里（否则上面的零命中可能是假象）。 */
    assert.ok(buildChartsHelpersJs().includes('document.getElementById(STYLE_ID)'), '产出文本里必须有 document.*');
  });

  it('H.buildChartsHelpersJs：IIFE 结构逐行固定 + 幂等自注入 + styleId/prefix 覆盖', () => {
    const js = buildChartsHelpersJs();
    /* 非自证：断产出的**具体结构**（行数/首行/末行/函数数/DOM 调用数），不断「非空」（R2-M1）。 */
    const lines = js.split(LF_CHAR);
    assert.equal(lines.length, 18, 'IIFE 结构逐行固定（18 行）');
    assert.equal(lines[0], '(function () {');
    assert.equal(lines[1], "  'use strict';");
    assert.equal(lines[lines.length - 1], '}());');
    assert.equal(countOf(js, 'function '), 2, 'IIFE 与 boot 两个函数');
    assert.equal(countOf(js, 'document.'), 7, 'DOM 只出现在产出文本里（7 处 document.*）');
    const code = stripComments(js);
    assert.ok(!/(?:from|import\s*\(|require\s*\(|import)\s*['"]node:/.test(code), '禁 node:');
    assert.ok(!/\b(?:window|globalThis)\s*\.\s*[\w$]+\s*=(?!=)/.test(code), '禁隐式全局赋值');
    assert.ok(!/\b(?:import|export)\b/.test(code), '经典 script：无 import/export');
    assert.ok(!/\bawait\b/.test(code), '禁顶层 await');
    assert.ok(code.includes('document.'), '允许 DOM 读取');
    assert.equal(countOf(code, '(function ()'), 1);
    assert.ok(js.trimEnd().endsWith('}());'));
    /* 非自证（R2-M3）：每条 `SHARED_HELPERS_JS_RULE` flag 都对应产出 JS 的**一条可观察性质**——
     * 断的是「实现满足了规则」，不是「冻结常量自身等于 true」。 */
    const RULE_PROBES = {
      selfContained: (src) => !/(?:^|[^\w.])(?:require|import)\s*\(/.test(src) && !/\bwindow\s*\./.test(src),
      idempotent: (src) => src.includes('if (document.getElementById(STYLE_ID)) return;'),
      domAllowed: (src) => src.includes('document.'),
      forbidGlobalAssignment: (src) => !/\b(?:window|globalThis)\s*\.\s*[\w$]+\s*=(?!=)/.test(src),
      forbidNodeBuiltins: (src) => !/['"]node:/.test(src),
    };
    for (const [flag, probe] of Object.entries(RULE_PROBES)) {
      assert.equal(SHARED_HELPERS_JS_RULE[flag], true, 'SHARED_HELPERS_JS_RULE.' + flag + ' 必须为 true');
      assert.ok(probe(code), '实现必须满足 SHARED_HELPERS_JS_RULE.' + flag);
    }
    /* W10：probe 恒真就白断 → 每条 flag 配一个**负样本**，断言 probe 能判假。 */
    const RULE_NEGATIVES = {
      selfContained: 'var x = require("fs");',
      idempotent: '(function () { var a = 1; }());',
      domAllowed: '(function () { var a = 1; }());',
      forbidGlobalAssignment: 'window.__leak = 1;',
      forbidNodeBuiltins: 'var fs = require("node:fs");',
    };
    for (const [flag, probe] of Object.entries(RULE_PROBES)) {
      assert.equal(probe(RULE_NEGATIVES[flag]), false, 'probe ' + flag + ' 必须能判假（负样本 ' + RULE_NEGATIVES[flag] + '）');
    }
    // 幂等：同一份 JS 连跑三次 → 只有一个 <style>（假 DOM，不依赖浏览器）
    const fake = () => {
      const store = new Map();
      const head = { children: [], appendChild(node) { this.children.push(node); store.set(node.id, node); return node; } };
      return {
        head,
        getElementById: (id) => (store.has(id) ? store.get(id) : null),
        createElement: (tag) => ({ tagName: tag, id: '', textContent: '' }),
        addEventListener: () => {},
      };
    };
    const doc = fake();
    const run = new Function('document', js);
    run(doc); run(doc); run(doc);
    assert.equal(doc.head.children.length, 1, '重复注入必须幂等');
    assert.equal(doc.head.children[0].id, CHARTS_STYLE_ID);
    assert.ok(doc.head.children[0].textContent.includes('.ilife-charts{'), '注入的 CSS 走 ilife- 命名空间（字面量）');
    const custom = fake();
    new Function('document', buildChartsHelpersJs({ styleId: 'my-charts' }))(custom);
    assert.equal(custom.head.children[0].id, 'my-charts', 'styleId 覆盖生效');
    const prefixed = fake();
    new Function('document', buildChartsHelpersJs({ prefix: 'x-' }))(prefixed);
    assert.ok(prefixed.head.children[0].textContent.includes('.x-charts{'), 'prefix 覆盖生效');
    assert.ok(!prefixed.head.children[0].textContent.includes('.ilife-charts{'), 'prefix 覆盖后不得残留 ilife- 命名空间');
  });

  it('H.图表文本字号：CSS 补齐各文本类 font-size（旧 charts.js:55,67,70,79,87,90,92,96,102-103,113,122）', () => {
    const css = buildChartsHelpersJs();
    /* 缺了这些规则 SVG 文本会继承页面字号（14–16 用户单位），比旧版大 30%–60%（R2-N12）。 */
    const rules = [
      '.ilife-charts-tick{font-size:9.5px}',
      '.ilife-charts-xlabel{font-size:10px}',
      '.ilife-charts-value{font-size:10px}',
      '.ilife-charts-value-last{font-size:10.5px;font-weight:700}',
      '.ilife-charts-marktext{font-size:10px}',
      '.ilife-charts-marktext-v{font-size:10px}',
      '.ilife-charts-mptext{font-size:10.5px;font-weight:700}',
      '.ilife-charts-bar .ilife-charts-xlabel{font-size:10.5px}',
      '.ilife-charts-center-label{font-size:8px}',
      '.ilife-charts-center-value{font-size:13px;font-weight:700}',
      '.ilife-charts-gauge-value{font-size:26px;font-weight:800}',
      '.ilife-charts-gauge-label{font-size:11px}',
      '.ilife-charts-bar .ilife-charts-xlabel{font-size:9.5px}',
    ];
    for (const rule of rules) assert.ok(css.includes(rule), 'CSS 必须含 ' + rule);
    assert.ok(
      css.indexOf('.ilife-charts-bar .ilife-charts-xlabel{font-size:9.5px}') > css.indexOf('@media (max-width:720px)'),
      'bar 的 9.5px 字号必须在 ≤720px 媒体查询内（旧 charts.js:127）',
    );
  });

  it('H.chartsCss 经 jsStr 嵌入：CSS 以 JSON 字符串字面量出现（转义正确）', () => {
    const js = buildChartsHelpersJs();
    const literal = (js.match(/^  var CSS = (.*);$/m) ?? [])[1];
    assert.ok(typeof literal === 'string' && literal.startsWith('"'), 'CSS 必须以 JSON 字符串字面量嵌入（R1-A5）');
    const css = JSON.parse(literal);
    assert.ok(css.includes('.ilife-charts{position:relative;margin:0;padding:0;'), '解析回来的是图表样式文本');
    assert.equal(literal, JSON.stringify(css), '必须逐字节是 JSON.stringify 的结果');
    assert.ok(!literal.includes(LF_CHAR), 'JSON 字面量里不得有真实换行');
    /* 敌意 prefix：引号必须转义，否则产出 JS 语法被破坏（#76 同类入参走 jsStr 的口径）。 */
    const hostile = buildChartsHelpersJs({ prefix: 'x";y' });
    const hostileLiteral = (hostile.match(/^  var CSS = (.*);$/m) ?? [])[1];
    assert.ok(hostileLiteral.includes('\\"'), '引号必须转义');
    assert.ok(JSON.parse(hostileLiteral).includes('.x";ycharts{'), 'prefix 原样进入 CSS 文本');
    assert.equal(hostile.split(LF_CHAR).length, 18, '敌意 prefix 不得改变 IIFE 行数');
  });

  it('H.覆盖清单（机读）：每个矩阵字段都绑定到一条真实存在的用例标题', () => {
    /* 非恒真口径：字段 → 承载它的 `it(...)` 标题 token；token 必须在本文件**磁盘上的源码**里
     * 真实存在于某条 `it(...)` 标题中。删掉／改名任何一条对应用例 → 该字段的 token 失配 → 本用例红。 */
    const FIELD_TITLES = {
      A: {
        height: 'A.height', width: 'A.width', compact: 'A.compact', color: 'A.color', colors: 'A.colors',
        format: 'A.format', animation: 'A.animation', emptyText: 'A.emptyText', tooltip: 'A.tooltip',
        labels: 'A.labels', showValues: 'A.showValues', labelRotate: 'A.labelRotate', yMin: 'A.yMin',
        yMax: 'A.yMax', grid: 'A.grid', actionId: 'A.actionId',
      },
      B: {
        lineWidth: 'B.lineWidth', dashed: 'B.dashed', smooth: 'B.smooth', step: 'B.step', showDots: 'B.showDots',
        dotSize: 'B.dotSize', dotStyle: 'B.dotStyle', area: 'B.area', areaOpacity: 'B.areaOpacity',
        yTicks: 'B.yTicks', connectNulls: 'B.connectNulls', legend: 'B.legend', highlightLast: 'B.highlightLast',
        avgLine: 'B.avgLine', 'markLine.value': 'B.markLine.value', 'markLine.xValue': 'B.markLine.xValue',
        markPoint: 'B.markPoint', band: 'B.band', fillBetween: 'B.fillBetween', highlightPoints: 'B.highlightPoints',
        series: 'B.series：', 'series[].ownScale': 'B.series[].ownScale', 'ChartItem.value===null': 'B.ChartItem.value === null',
        'ChartItem.anomaly': 'B.ChartItem.anomaly',
      },
      C: {
        singleColor: 'C.singleColor', 'values[]': 'C.values[]', stacked: 'C.stacked：', stackMode: 'C.stackMode',
        grouped: 'C.grouped：', 'stacked×grouped': 'C.stacked × C.grouped', segNames: 'C.segNames', 缺省: 'C.缺省',
      },
      D: {
        size: 'D.size', ringWidth: 'D.ringWidth', legend: 'D.legend', showPercent: 'D.showPercent',
        centerLabel: 'D.centerLabel', centerValue: 'D.centerValue', 合计为零: 'D.合计为零',
      },
      E: {
        gradient: 'E.gradient', showPct: 'E.showPct', 'gauge.label': 'E.gauge.label', 'gauge.size': 'E.gauge.size',
        'pct 非数': 'E.pct 非数', 'pct 超界': 'E.pct 超界', points: 'E.points',
      },
      F: { 'bars/lines': 'F.bars / F.lines', 'barColor/lineColor': 'F.barColor / F.lineColor', legend: 'F.legend', showValue: 'F.showValue' },
      G: {
        regression: 'G.regression：', regressionColor: 'G.regressionColor', dotSize: 'G.dotSize',
        'ScatterItem.x/y': 'G.ScatterItem.x/y', 空数组: 'G.空数组', 'ScatterItem.label': 'G.ScatterItem.label',
      },
      H: {
        CHART_KINDS: 'H.CHART_KINDS', 'kind-unknown': 'H.kind-unknown', CHARTS_STYLE_ID: 'H.CHARTS_STYLE_ID',
        CHART_STRUCTURE_RULE: 'H.CHART_STRUCTURE_RULE', CHART_EMPTY_RULE: 'CHART_EMPTY_RULE /',
        CHART_COORD_RULE: 'CHART_COORD_RULE：', CHART_BREAKPOINTS: 'H.CHART_BREAKPOINTS',
        CHART_PALETTE: 'H.CHART_PALETTE', CHART_ERROR_CODES: 'H.CHART_ERROR_CODES', ChartOutput: 'H.ChartOutput',
        纯度: 'H.纯度', buildChartsHelpersJs: 'H.buildChartsHelpersJs',
      },
    };
    const source = readFileSync(fileURLToPath(new URL('./charts.test.mjs', import.meta.url)), 'utf8');
    const titles = [...source.matchAll(/^[ \t]*it\((["'])(.*?)\1/gm)].map((m) => m[2]);
    /* FX-78-V2a-3：`>= 60` 是宽松下界（删掉若干用例仍可绿）→ 精确条数。
     * 口径：本文件磁盘上的 `it(...)` 标题条数。**改实现/改矩阵（增删用例）须同步此值**。 */
    assert.equal(titles.length, 87, '用例条数精确值（实读 ' + titles.length + ' 条）');
    const tokens = Object.values(FIELD_TITLES).flatMap((fields) => Object.values(fields));
    assert.equal(new Set(tokens).size, tokens.length, '每个字段必须绑定互不相同的用例标题 token');
    const hitTitles = [...new Set(titles.filter((title) => tokens.some((token) => title.includes(token))))];
    /* 命中条数同样精确：改标题／删用例／让两条用例共用 token 都会红。 */
    assert.equal(hitTitles.length, 74, '覆盖清单命中的用例条数精确值（实读 ' + hitTitles.length + ' 条）');
    for (const [group, fields] of Object.entries(FIELD_TITLES)) {
      for (const [field, token] of Object.entries(fields)) {
        assert.ok(
          titles.some((title) => title.includes(token)),
          group + '.' + field + ' 无对应用例标题（token=' + token + '）',
        );
      }
    }
    console.log('OPTION-MATRIX 覆盖清单：' + JSON.stringify(
      Object.fromEntries(Object.entries(FIELD_TITLES).map(([group, fields]) => [group, Object.keys(fields)])),
    ) + ' / 命中用例 ' + hitTitles.length + ' 条');
  });
});
