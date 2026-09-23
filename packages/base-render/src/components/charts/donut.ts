/** charts · donut
 *
 *  自 `src/charts.ts` 第 1619–1699 行原样切出。
 *
 *  **住址**：目录化批次④把 `src/charts.ts` 按段切成「族内一件一文件」，正文原样搬来；
 *  搬迁判据＝产物逐字节相同（八种图表产物 ＋ `chartsCss` ＋ helpers JS），
 *  见 `docs/base/base-render/组件目录架构.md`。
 */

import { DONUT_ZERO_HINT, GRID_COLOR, MUTED_COLOR, esc, fmtValue, isPlainObject, n1, normalizeItems, numOr, requireObject, round2 } from './shared.js';
import { actionAttrs, containerOpen, emptyOutput, resolveCommon, tipAttrs } from './options.js';
import { charts } from './dispatch.js';
import { STYLE_PREFIX } from '../../style.js';
import { CHART_PALETTE, ChartOutput, DonutChartInput, DonutChartOptions } from '../../spec/index.js';

/* ── donut ────────────────────────────────────────────────────────────── */

export function renderDonut(raw: DonutChartInput): ChartOutput {
  const input = requireObject(raw, 'charts.donut: input');
  const common = resolveCommon(input.options, { width: 150, height: 150, labels: 'none', showValues: false });
  const opts = isPlainObject(input.options) ? (input.options as DonutChartOptions) : undefined;
  const items = normalizeItems(input.items, 'donut', false);
  if (items.length === 0) return emptyOutput('donut', input.options);
  const total = items.reduce((sum, item) => sum + Math.max(0, item.value as number), 0);
  if (total <= 0) return emptyOutput('donut', input.options, DONUT_ZERO_HINT);

  const size = numOr(opts === undefined ? undefined : opts.size, 150);
  const ringWidth = numOr(opts === undefined ? undefined : opts.ringWidth, 16);
  const legendMode = opts !== undefined && (opts.legend === 'bottom' || opts.legend === 'none') ? opts.legend : 'right';
  const showPercent = opts === undefined || opts.showPercent !== false;
  const cx = size / 2;
  const r = Math.max(20, size / 2 - ringWidth / 2 - 2);
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  let arcs = '';
  items.forEach((item, i) => {
    const value = Math.max(0, item.value as number);
    if (value <= 0) return;
    const share = value / total;
    const color = common.color ?? (item.color ?? (common.colors !== undefined && common.colors.length > 0
      ? common.colors[i % common.colors.length]
      : CHART_PALETTE[i % CHART_PALETTE.length]));
    const dash = round2(share * circumference);
    arcs += '<circle class="' + STYLE_PREFIX + 'charts-arc" data-i="' + i + '" cx="' + n1(cx) + '" cy="' + n1(cx)
      + '" r="' + n1(r) + '" fill="none" stroke="' + esc(color) + '" stroke-width="' + ringWidth
      + '" stroke-dasharray="' + dash + ' ' + round2(circumference - dash) + '" stroke-dashoffset="' + round2(-offset)
      + '" transform="rotate(-90 ' + n1(cx) + ' ' + n1(cx) + ')" vector-effect="non-scaling-stroke"'
      + tipAttrs(common, () => item.label + ': ' + fmtValue(value, common.format))
      + actionAttrs(common, i) + '/>';
    offset += share * circumference;
  });

  const centerLabel = opts !== undefined && typeof opts.centerLabel === 'string' ? opts.centerLabel : '';
  const centerValue = opts !== undefined && typeof opts.centerValue === 'string' && opts.centerValue !== ''
    ? opts.centerValue
    : fmtValue(total, common.format);
  let center = '';
  if (centerLabel !== '') {
    center += '<text class="' + STYLE_PREFIX + 'charts-center-label" x="' + n1(cx) + '" y="' + n1(cx - 2)
      + '" text-anchor="middle" fill="' + MUTED_COLOR + '">' + esc(centerLabel) + '</text>';
  }
  if (centerValue !== '') {
    center += '<text class="' + STYLE_PREFIX + 'charts-center-value" x="' + n1(cx) + '" y="' + n1(cx + 12)
      + '" text-anchor="middle" fill="var(--fg,#1d1d1f)">' + esc(centerValue) + '</text>';
  }

  let legend = '';
  if (legendMode !== 'none') {
    legend = '<div class="' + STYLE_PREFIX + 'charts-legend ' + STYLE_PREFIX + 'charts-legend-' + legendMode + '">'
      + items.map((item, i) => {
        const value = Math.max(0, item.value as number);
        if (value <= 0) return '';
        const color = item.color ?? (common.colors !== undefined && common.colors.length > 0
          ? common.colors[i % common.colors.length]
          : CHART_PALETTE[i % CHART_PALETTE.length]);
        return '<span class="' + STYLE_PREFIX + 'charts-legend-item"><span class="' + STYLE_PREFIX
          + 'charts-legend-swatch" style="background:' + esc(color) + '"></span>' + esc(item.label)
          + '<span class="' + STYLE_PREFIX + 'charts-legend-value">' + esc(fmtValue(value, common.format)) + '</span>'
          + (showPercent ? '<span class="' + STYLE_PREFIX + 'charts-legend-pct">'
            + Math.round((value / total) * 100) + '%</span>' : '') + '</span>';
      }).join('') + '</div>';
  }

  const points = items.filter((item) => (item.value as number) > 0).length;
  const html = containerOpen('donut', common, STYLE_PREFIX + 'charts-donut')
    + '<svg class="' + STYLE_PREFIX + 'charts-svg" viewBox="0 0 ' + n1(size) + ' ' + n1(size)
    + '" preserveAspectRatio="xMidYMid meet" role="img" focusable="false">'
    + '<circle class="' + STYLE_PREFIX + 'charts-ring" cx="' + n1(cx) + '" cy="' + n1(cx) + '" r="' + n1(r)
    + '" fill="none" stroke="' + GRID_COLOR + '" stroke-width="' + ringWidth + '" vector-effect="non-scaling-stroke"/>'
    + arcs + center + '</svg>'
    + legend
    + '</div>';
  return { kind: 'donut', html, empty: points === 0, points };
}

