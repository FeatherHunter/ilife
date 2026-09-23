/** charts · progress
 *
 *  自 `src/charts.ts` 第 1700–1740 行原样切出。
 *
 *  **住址**：目录化批次④把 `src/charts.ts` 按段切成「族内一件一文件」，正文原样搬来；
 *  搬迁判据＝产物逐字节相同（八种图表产物 ＋ `chartsCss` ＋ helpers JS），
 *  见 `docs/base/base-render/组件目录架构.md`。
 */

import { DEFAULT_SERIES_COLOR, GRID_COLOR, esc, hash32, isPlainObject, n1, normalizePct, requireObject } from './shared.js';
import { containerOpen, resolveCommon } from './options.js';
import { charts } from './dispatch.js';
import { STYLE_PREFIX } from '../../style.js';
import { CHART_PALETTE, ChartOutput, ProgressChartInput, ProgressChartOptions } from '../../spec/index.js';

/* ── progress ─────────────────────────────────────────────────────────── */

export function renderProgress(raw: ProgressChartInput): ChartOutput {
  const input = requireObject(raw, 'charts.progress: input');
  const common = resolveCommon(input.options, { width: 100, height: 8, labels: 'none', showValues: false });
  const opts = isPlainObject(input.options) ? (input.options as ProgressChartOptions) : undefined;
  const pct = normalizePct(input.pct, 'progress');
  const color = common.color ?? DEFAULT_SERIES_COLOR;
  const fillW = (common.width * pct) / 100;
  const radius = common.height / 2;

  let fill = esc(color);
  let defs = '';
  if (opts !== undefined && opts.gradient === true) {
    const id = STYLE_PREFIX + 'charts-grad-' + hash32(color + '|' + CHART_PALETTE[5]);
    defs = '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="0">'
      + '<stop offset="0" stop-color="' + esc(color) + '"/>'
      + '<stop offset="1" stop-color="' + CHART_PALETTE[5] + '"/>'
      + '</linearGradient></defs>';
    fill = 'url(#' + id + ')';
  }
  const showPct = opts === undefined || opts.showPct !== false;

  /* `height` 的旧契约语义 = **轨道 px**（`docs/research/t92-old-v130-signatures.md:180`
   * 「`height(轨道px)`」；旧 `charts.js:370-372` 写成内联 `height:Npx`）——只进 viewBox 会让
   * 缺省 8 在 320px 容器渲染约 25.6px 高（3 倍厚，R2-N11），故 svg 内联 `style="height:Npx"`。 */
  const html = containerOpen('progress', common, STYLE_PREFIX + 'charts-progress')
    + '<svg class="' + STYLE_PREFIX + 'charts-svg" viewBox="0 0 ' + n1(common.width) + ' ' + n1(common.height)
    + '" style="height:' + common.height + 'px"'
    + ' preserveAspectRatio="none" role="img" focusable="false" data-pct="' + pct + '">'
    + defs
    + '<rect class="' + STYLE_PREFIX + 'charts-track" x="0" y="0" width="' + n1(common.width) + '" height="'
    + n1(common.height) + '" rx="' + n1(radius) + '" fill="' + GRID_COLOR + '"/>'
    + '<rect class="' + STYLE_PREFIX + 'charts-fillbar" x="0" y="0" width="' + n1(fillW) + '" height="'
    + n1(common.height) + '" rx="' + n1(radius) + '" fill="' + fill + '"/>'
    + '</svg>'
    + (showPct ? '<span class="' + STYLE_PREFIX + 'charts-pct">' + Math.round(pct) + '%</span>' : '')
    + '</div>';
  return { kind: 'progress', html, empty: false, points: 1 };
}

