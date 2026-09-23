/** charts · gauge
 *
 *  自 `src/charts.ts` 第 1887–1926 行原样切出。
 *
 *  **住址**：目录化批次④把 `src/charts.ts` 按段切成「族内一件一文件」，正文原样搬来；
 *  搬迁判据＝产物逐字节相同（八种图表产物 ＋ `chartsCss` ＋ helpers JS），
 *  见 `docs/base/base-render/组件目录架构.md`。
 */

import { DEFAULT_SERIES_COLOR, GRID_COLOR, MUTED_COLOR, esc, isPlainObject, n1, normalizePct, numOr, requireObject } from './shared.js';
import { containerOpen, resolveCommon } from './options.js';
import { charts } from './dispatch.js';
import { STYLE_PREFIX } from '../../style.js';
import { ChartOutput, GaugeChartInput, GaugeChartOptions } from '../../spec/index.js';

/* ── gauge ────────────────────────────────────────────────────────────── */

export function renderGauge(raw: GaugeChartInput): ChartOutput {
  const input = requireObject(raw, 'charts.gauge: input');
  const common = resolveCommon(input.options, { width: 170, height: 105, labels: 'none', showValues: false });
  const opts = isPlainObject(input.options) ? (input.options as GaugeChartOptions) : undefined;
  const pct = normalizePct(input.pct, 'gauge');
  const size = numOr(opts === undefined ? undefined : opts.size, 170);
  const height = Math.round(size * 0.62);
  const cx = size / 2;
  const r = Math.min(size / 2 - 4, height - 8);
  const cy = height - 4;
  const color = common.color ?? DEFAULT_SERIES_COLOR;
  const fraction = pct / 100;
  const endAngle = Math.PI * (1 - fraction);
  const x1 = cx + r * Math.cos(endAngle);
  const y1 = cy - r * Math.sin(endAngle);
  const startX = cx - r;
  const label = opts !== undefined && typeof opts.label === 'string' ? opts.label : '';
  const valueText = common.format !== undefined
    ? String(common.format(Math.round(pct)))
    : Math.round(pct) + '%';

  const html = containerOpen('gauge', common, STYLE_PREFIX + 'charts-gauge')
    + '<svg class="' + STYLE_PREFIX + 'charts-svg" viewBox="0 0 ' + n1(size) + ' ' + n1(height)
    + '" preserveAspectRatio="xMidYMid meet" role="img" focusable="false" data-pct="' + pct + '">'
    + '<path class="' + STYLE_PREFIX + 'charts-gauge-bg" d="M' + n1(startX) + ' ' + n1(cy) + ' A' + n1(r) + ' '
    + n1(r) + ' 0 0 1 ' + n1(cx + r) + ' ' + n1(cy) + '" fill="none" stroke="' + GRID_COLOR
    + '" stroke-width="12" stroke-linecap="round" vector-effect="non-scaling-stroke"/>'
    + '<path class="' + STYLE_PREFIX + 'charts-gauge-fg" d="M' + n1(startX) + ' ' + n1(cy) + ' A' + n1(r) + ' '
    + n1(r) + ' 0 0 1 ' + n1(x1) + ' ' + n1(y1) + '" fill="none" stroke="' + esc(color)
    + '" stroke-width="12" stroke-linecap="round" vector-effect="non-scaling-stroke"/>'
    + '<text class="' + STYLE_PREFIX + 'charts-gauge-value" x="' + n1(cx) + '" y="' + n1(cy - 14)
    + '" text-anchor="middle" fill="var(--fg,#1d1d1f)">' + esc(valueText) + '</text>'
    + (label === '' ? '' : '<text class="' + STYLE_PREFIX + 'charts-gauge-label" x="' + n1(cx) + '" y="'
      + n1(cy - 2) + '" text-anchor="middle" fill="' + MUTED_COLOR + '">' + esc(label) + '</text>')
    + '</svg></div>';
  return { kind: 'gauge', html, empty: false, points: 1 };
}

