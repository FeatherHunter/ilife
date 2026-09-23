/** charts · sparkline
 *
 *  自 `src/charts.ts` 第 1844–1886 行原样切出。
 *
 *  **住址**：目录化批次④把 `src/charts.ts` 按段切成「族内一件一文件」，正文原样搬来；
 *  搬迁判据＝产物逐字节相同（八种图表产物 ＋ `chartsCss` ＋ helpers JS），
 *  见 `docs/base/base-render/组件目录架构.md`。
 */

import { DOWN_COLOR, UP_COLOR, esc, fmtValue, isPlainObject, n1, normalizeItems, requireObject } from './shared.js';
import { belowMinPoints, containerOpen, emptyOutput, minPointsHintOf, resolveCommon, svgOpen } from './options.js';
import { makeFrame, xAt } from './coords.js';
import { Pt } from './line.js';
import { charts } from './dispatch.js';
import { STYLE_PREFIX } from '../../style.js';
import { ChartOutput, SparklineChartInput, SparklineChartOptions } from '../../spec/index.js';

/* ── sparkline ────────────────────────────────────────────────────────── */

export function renderSparkline(raw: SparklineChartInput): ChartOutput {
  const input = requireObject(raw, 'charts.sparkline: input');
  const common = resolveCommon(input.options, { width: 90, height: 30, labels: 'none', showValues: false });
  const opts = isPlainObject(input.options) ? (input.options as SparklineChartOptions) : undefined;
  const items = normalizeItems(input.items, 'sparkline', false);
  if (items.length === 0) return emptyOutput('sparkline', input.options);
  if (belowMinPoints(input.options, items.length)) return emptyOutput('sparkline', input.options, minPointsHintOf(input.options, items.length));

  const values = items.map((item) => item.value as number);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max === min ? 1 : max - min;
  const pad = 2;
  const frame = makeFrame(common, { left: pad, right: pad, top: pad, bottom: pad });
  const pts = items.map((item, i) => [
    xAt(frame, i, items.length),
    frame.y1 - (((item.value as number) - min) / span) * frame.h,
    false,
  ] as Pt);
  const rising = values[values.length - 1] >= values[0];
  const color = common.color ?? (rising ? UP_COLOR : DOWN_COLOR);
  const showValue = opts === undefined || opts.showValue !== false;

  let valueSvg = '';
  if (showValue) {
    valueSvg = '<text class="' + STYLE_PREFIX + 'charts-spark-value ' + STYLE_PREFIX + 'charts-' + (rising ? 'up' : 'down')
      + '" x="' + n1(frame.x1) + '" y="' + n1(frame.y0 + 4) + '" text-anchor="end" fill="' + esc(color) + '">'
      + esc(fmtValue(values[values.length - 1], common.format)) + '</text>';
  }

  const html = containerOpen('sparkline', common, STYLE_PREFIX + 'charts-spark')
    + svgOpen(common)
    + '<polyline class="' + STYLE_PREFIX + 'charts-sparkline" points="'
    + pts.map((p) => n1(p[0]) + ',' + n1(p[1])).join(' ')
    + '" fill="none" stroke="' + esc(color)
    + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>'
    + valueSvg
    + '</svg></div>';
  return { kind: 'sparkline', html, empty: false, points: items.length };
}

