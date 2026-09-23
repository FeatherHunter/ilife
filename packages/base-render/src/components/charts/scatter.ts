/** charts · scatter
 *
 *  自 `src/charts.ts` 第 1927–2034 行原样切出。
 *
 *  **住址**：目录化批次④把 `src/charts.ts` 按段切成「族内一件一文件」，正文原样搬来；
 *  搬迁判据＝产物逐字节相同（八种图表产物 ＋ `chartsCss` ＋ helpers JS），
 *  见 `docs/base/base-render/组件目录架构.md`。
 */

import { DEFAULT_REGRESSION_COLOR, DEFAULT_SERIES_COLOR, DOT_FACE_COLOR, MUTED_COLOR, SCATTER_DOT_DEFAULT_PX, SCATTER_Y_TICKS, badStructure, esc, fmtValue, isNum, isPlainObject, n1, numOr, requireObject } from './shared.js';
import { actionAttrs, belowMinPoints, containerOpen, emptyOutput, minPointsHintOf, resolveCommon, svgOpen, tipAttrs } from './options.js';
import { domainOf, insetsFor, makeFrame, yAt } from './coords.js';
import { gridSvg, ticksSvg } from './svg.js';
import { charts } from './dispatch.js';
import { STYLE_PREFIX } from '../../style.js';
import { ChartOutput, ScatterChartInput, ScatterChartOptions, ScatterItem } from '../../spec/index.js';

/* ── scatter ──────────────────────────────────────────────────────────── */

function normalizeScatterItems(raw: unknown): ScatterItem[] {
  if (!Array.isArray(raw)) {
    badStructure('charts.scatter: items 必须是数组, 收到 ' + (raw === null ? 'null' : typeof raw));
  }
  return (raw as readonly unknown[]).map((entry, i) => {
    const field = 'charts.scatter: items[' + i + ']';
    const item = requireObject(entry, field);
    if (!isNum(item.x) || !isNum(item.y)) {
      badStructure(field + '.x/y 无效（缺省/非数字）: ' + JSON.stringify({ x: item.x === undefined ? null : item.x, y: item.y === undefined ? null : item.y }));
    }
    return {
      x: item.x,
      y: item.y,
      ...(typeof item.label === 'string' && item.label !== '' ? { label: item.label } : {}),
    };
  });
}

export function renderScatter(raw: ScatterChartInput): ChartOutput {
  const input = requireObject(raw, 'charts.scatter: input');
  const common = resolveCommon(input.options, { width: 320, height: 180, labels: 'edge', showValues: false });
  const opts = isPlainObject(input.options) ? (input.options as ScatterChartOptions) : undefined;
  const items = normalizeScatterItems(input.items);
  if (items.length === 0) return emptyOutput('scatter', input.options);
  if (belowMinPoints(input.options, items.length)) return emptyOutput('scatter', input.options, minPointsHintOf(input.options, items.length));

  const xs = items.map((item) => item.x);
  const ys = items.map((item) => item.y);
  const [xlo, xhi] = domainOf(xs, undefined, undefined, false);
  const [ylo, yhi] = domainOf(ys, common.yMin, common.yMax, false);
  const frame = makeFrame(common, insetsFor(common, {
    tickWidth: common.compact ? 16 : 22,
    labelHeight: common.labels === 'none' ? 0 : (common.compact ? 10 : 14),
    valueHeight: common.compact ? 9 : 12,
  }));
  /* 显式 `dotSize` 必须走**内联样式**：CSS 几何属性 `r`（`.…-scatter .…-dot{r:calc(var(--…-dot)/2)}`）
   * 优先于 SVG 呈现属性，只写 `r="…"` 会被 CSS 覆盖成缺省半径（R2-N10／FX-78-A1b-02）。 */
  const dotSize = numOr(opts === undefined ? undefined : opts.dotSize, SCATTER_DOT_DEFAULT_PX);
  const dotSizeExplicit = opts !== undefined && isNum(opts.dotSize);
  const color = common.color ?? DEFAULT_SERIES_COLOR;
  let dotsSvg = '';
  items.forEach((item, i) => {
    const x = frame.x0 + ((item.x - xlo) / (xhi - xlo)) * frame.w;
    const y = yAt(frame, item.y, ylo, yhi);
    dotsSvg += '<circle class="' + STYLE_PREFIX + 'charts-dot" data-i="' + i + '" cx="' + n1(x) + '" cy="' + n1(y)
      + '" r="' + dotSize / 2 + '"' + (dotSizeExplicit ? ' style="r:' + dotSize / 2 + '"' : '')
      + ' fill="' + DOT_FACE_COLOR + '" stroke="' + esc(color)
      + '" stroke-width="1.5" vector-effect="non-scaling-stroke"'
      + tipAttrs(common, () => (item.label === undefined ? String(item.x) : item.label) + ': ' + fmtValue(item.y, common.format))
      + actionAttrs(common, i) + '/>';
  });

  /* 最小二乘回归线（`regression !== false` 且 n >= 2） */
  let regressionSvg = '';
  if ((opts === undefined || opts.regression !== false) && items.length >= 2) {
    const n = items.length;
    let sx = 0;
    let sy = 0;
    let sxy = 0;
    let sxx = 0;
    for (const item of items) {
      sx += item.x;
      sy += item.y;
      sxy += item.x * item.y;
      sxx += item.x * item.x;
    }
    const denom = n * sxx - sx * sx;
    const slope = denom === 0 ? 0 : (n * sxy - sx * sy) / denom;
    const intercept = (sy - slope * sx) / n;
    const yOf = (x: number): number => slope * x + intercept;
    const rx0 = frame.x0;
    const rx1 = frame.x1;
    const regressionColor = opts !== undefined && typeof opts.regressionColor === 'string' && opts.regressionColor !== ''
      ? opts.regressionColor
      : DEFAULT_REGRESSION_COLOR;
    regressionSvg = '<line class="' + STYLE_PREFIX + 'charts-regression" x1="' + n1(rx0) + '" y1="'
      + n1(yAt(frame, yOf(xlo), ylo, yhi)) + '" x2="' + n1(rx1) + '" y2="' + n1(yAt(frame, yOf(xhi), ylo, yhi))
      + '" stroke="' + esc(regressionColor) + '" stroke-width="1.5" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"/>';
  }

  const labels = common.labels;
  let xLabels = '';
  if (labels !== 'none') {
    const baseY = frame.y1 + (common.compact ? 9 : 12);
    const pick = labels === 'all' ? items.map((_, i) => i) : items.length === 1 ? [0] : [0, items.length - 1];
    xLabels = pick.map((i) => {
      const x = frame.x0 + ((items[i].x - xlo) / (xhi - xlo)) * frame.w;
      const rotate = common.labelRotate === 0 ? '' : ' transform="rotate(' + common.labelRotate + ' ' + n1(x) + ' ' + n1(baseY) + ')"';
      const text = items[i].label === undefined ? fmtValue(items[i].x, common.format) : items[i].label;
      return '<text class="' + STYLE_PREFIX + 'charts-xlabel" x="' + n1(x) + '" y="' + n1(baseY)
        + '" text-anchor="middle"' + rotate + ' fill="' + MUTED_COLOR + '">' + esc(text) + '</text>';
    }).join('');
  }

  const points = items.length;
  const html = containerOpen('scatter', common, STYLE_PREFIX + 'charts-scatter')
    + svgOpen(common)
    + (common.grid ? gridSvg(frame, SCATTER_Y_TICKS) : '')
    + ticksSvg(frame, ylo, yhi, SCATTER_Y_TICKS, common.format)
    + regressionSvg
    + dotsSvg
    + xLabels
    + '</svg></div>';
  return { kind: 'scatter', html, empty: points === 0, points };
}

