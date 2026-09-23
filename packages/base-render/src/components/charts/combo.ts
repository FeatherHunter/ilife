/** charts · combo
 *
 *  自 `src/charts.ts` 第 1741–1843 行原样切出。
 *
 *  **住址**：目录化批次④把 `src/charts.ts` 按段切成「族内一件一文件」，正文原样搬来；
 *  搬迁判据＝产物逐字节相同（八种图表产物 ＋ `chartsCss` ＋ helpers JS），
 *  见 `docs/base/base-render/组件目录架构.md`。
 */

import { DEFAULT_MARK_COLOR, DEFAULT_SERIES_COLOR, DOT_FACE_COLOR, MUTED_COLOR, badStructure, esc, fmtValue, isPlainObject, n1, normalizeItems, requireObject } from './shared.js';
import { actionAttrs, belowMinPoints, containerOpen, emptyOutput, minPointsHintOf, resolveCommon, svgOpen, tipAttrs } from './options.js';
import { domainOf, insetsFor, makeFrame, yAt } from './coords.js';
import { gridSvg, legendHtml, xLabelsSvg } from './svg.js';
import { Pt, polyPath } from './line.js';
import { charts } from './dispatch.js';
import { STYLE_PREFIX } from '../../style.js';
import { ChartOutput, ComboChartInput, ComboChartOptions } from '../../spec/index.js';

/* ── combo ────────────────────────────────────────────────────────────── */

export function renderCombo(raw: ComboChartInput): ChartOutput {
  const input = requireObject(raw, 'charts.combo: input');
  const common = resolveCommon(input.options, { width: 320, height: 170, labels: 'all', showValues: true });
  const opts = isPlainObject(input.options) ? (input.options as ComboChartOptions) : undefined;
  const bars = normalizeItems(input.bars, 'combo', false);
  const lines = normalizeItems(input.lines, 'combo', false);
  if (bars.length === 0 && lines.length === 0) return emptyOutput('combo', input.options);
  // #950 B3：组合图的有效点取两支里多的那一支（「几处有数据」是读者关心的事）。
  const comboPoints = Math.max(bars.length, lines.length);
  if (belowMinPoints(input.options, comboPoints)) return emptyOutput('combo', input.options, minPointsHintOf(input.options, comboPoints));
  if (bars.length > 0 && lines.length > 0) {
    if (bars.length !== lines.length) {
      badStructure('charts.combo: bars 与 lines 长度不一致 (' + bars.length + ' vs ' + lines.length + ')');
    }
    bars.forEach((item, i) => {
      if (item.label !== lines[i].label) {
        badStructure('charts.combo: bars 与 lines 的 label 必须一致 (items[' + i + ']: ' + item.label + ' vs ' + lines[i].label + ')');
      }
    });
  }
  const n = bars.length > 0 ? bars.length : lines.length;
  const barColor = opts !== undefined && typeof opts.barColor === 'string' && opts.barColor !== ''
    ? opts.barColor
    : (common.color ?? DEFAULT_SERIES_COLOR);
  const lineColor = opts !== undefined && typeof opts.lineColor === 'string' && opts.lineColor !== ''
    ? opts.lineColor
    : DEFAULT_MARK_COLOR;

  const values: number[] = [];
  for (const item of bars) values.push(item.value as number);
  for (const item of lines) values.push(item.value as number);
  /* combo 共享域 = 0..max(柱值, 线值)，**无外扩**（旧 `charts.js:742-753`：柱高 = 值/maxV，柱顶即域顶）。 */
  const [lo, hi] = domainOf(values, common.yMin, common.yMax, true, 0);
  const frame = makeFrame(common, insetsFor(common, {
    tickWidth: 0,
    labelHeight: common.labels === 'none' ? 0 : (common.compact ? 10 : 14),
    valueHeight: common.compact ? 9 : 12,
  }));
  const yZero = yAt(frame, 0, lo, hi);
  const slot = frame.w / n;
  const barW = Math.min(slot * (common.compact ? 0.82 : 0.62), 34);

  let barsSvg = '';
  bars.forEach((item, i) => {
    const cx = frame.x0 + slot * (i + 0.5);
    const value = item.value as number;
    const top = Math.min(yZero, yAt(frame, value, lo, hi));
    const height = Math.max(2, Math.abs(yZero - yAt(frame, value, lo, hi)));
    barsSvg += '<rect class="' + STYLE_PREFIX + 'charts-bar" data-i="' + i + '" x="' + n1(cx - barW / 2) + '" y="'
      + n1(top) + '" width="' + n1(barW) + '" height="' + n1(height) + '" rx="2" fill="' + esc(barColor) + '"'
      + tipAttrs(common, () => item.label + ': ' + fmtValue(value, common.format)) + actionAttrs(common, i) + '/>';
  });

  let lineSvg = '';
  if (lines.length > 0) {
    /* FX-A1c-01（编排者改判：缺陷）：线点 x 取**柱列中心**，与柱共用同一 band 标度
     * `frame.x0 + slot*(i+0.5)`（`slot = frame.w / n`，`n = bars.length || lines.length`）。
     * 旧版把线点 `<i>` 放进柱列容器内 `left:50%`（`old-baseline.md:442`／`charts.js:429`），
     * 再由 DOM 校准对齐列心（`charts.js:779-795`）；R19 豁免的只是 `getBoundingClientRect` 测量，
     * **不含 x 对齐**——同一 band 标度就是「同一坐标系」的可断言等价物（R9「线点=柱顶」）。 */
    const pts = lines.map((item, i) => [frame.x0 + slot * (i + 0.5), yAt(frame, item.value as number, lo, hi), false] as Pt);
    lineSvg += '<path class="' + STYLE_PREFIX + 'charts-line ' + STYLE_PREFIX + 'charts-combo-line" d="'
      + polyPath(pts, true) + '" fill="none" stroke="' + esc(lineColor)
      + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>';
    pts.forEach((p, i) => {
      lineSvg += '<circle class="' + STYLE_PREFIX + 'charts-dot" data-i="' + i + '" cx="' + n1(p[0]) + '" cy="'
        + n1(p[1]) + '" r="3" fill="' + DOT_FACE_COLOR + '" stroke="' + esc(lineColor)
        + '" stroke-width="1.5" vector-effect="non-scaling-stroke"'
        + tipAttrs(common, () => lines[i].label + ': ' + fmtValue(lines[i].value as number, common.format))
        + actionAttrs(common, i) + '/>';
    });
  }

  let valuesSvg = '';
  if (common.showValues !== false) {
    bars.forEach((item, i) => {
      const cx = frame.x0 + slot * (i + 0.5);
      const top = Math.min(yZero, yAt(frame, item.value as number, lo, hi));
      valuesSvg += '<text class="' + STYLE_PREFIX + 'charts-value" x="' + n1(cx) + '" y="' + n1(top - 3)
        + '" text-anchor="middle" fill="' + MUTED_COLOR + '">' + esc(fmtValue(item.value as number, common.format)) + '</text>';
    });
  }

  const legend = opts !== undefined && opts.legend === true
    ? legendHtml([{ name: '量', color: barColor }, { name: '趋势', color: lineColor }])
    : '';

  const points = bars.length + lines.length;
  const html = containerOpen('combo', common, STYLE_PREFIX + 'charts-combo')
    + legend
    + svgOpen(common)
    + (common.grid ? gridSvg(frame) : '')
    + barsSvg
    + lineSvg
    + valuesSvg
    /* t-chartfix：与 bar 同因——combo 柱列／线点同走 band 标度，标签亦然。 */
    + xLabelsSvg(common, frame, bars.length > 0 ? bars : lines, 'peak', (i, n) => frame.x0 + (frame.w / n) * (i + 0.5))
    + '</svg></div>';
  return { kind: 'combo', html, empty: points === 0, points };
}

