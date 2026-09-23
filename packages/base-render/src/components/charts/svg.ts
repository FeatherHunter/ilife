/** charts · svg
 *
 *  自 `src/charts.ts` 第 572–704 行原样切出。
 *
 *  **住址**：目录化批次④把 `src/charts.ts` 按段切成「族内一件一文件」，正文原样搬来；
 *  搬迁判据＝产物逐字节相同（八种图表产物 ＋ `chartsCss` ＋ helpers JS），
 *  见 `docs/base/base-render/组件目录架构.md`。
 */

import { GRID_COLOR, GRID_LINES, MUTED_COLOR, esc, fmtValue, n1, round2 } from './shared.js';
import { LabelsMode, ResolvedCommon, ShowValuesMode } from './options.js';
import { Frame, xAt, yAt } from './coords.js';
import { charts } from './dispatch.js';
import { STYLE_PREFIX } from '../../style.js';
import { ChartItem } from '../../spec/index.js';

/* ── 共享 SVG 片段 ────────────────────────────────────────────────────── */

export function gridSvg(frame: Frame, count = 0): string {
  /** 对齐口径（#512）：线条数取**实际标注条数**，位置与 `ticksSvg` 同一条均匀标度公式
   *  （`y1 - h*i/(n-1)` ⇔ `i` 刻度值映射到 `yAt`），故每条线都压着自己那条刻度。
   *  `count < 2`（`yTicks:false`／非数 → `tickCount` 给 0）时回退旧口径 `GRID_LINES` 三条：
   *  bar／combo 与未开 `yTicks` 的 line 本就无标注，不得因此变成空白图。 */
  const lines = count >= 2 ? count : GRID_LINES;
  let out = '';
  for (let g = 0; g < lines; g += 1) {
    const gy = frame.y1 - (frame.h * g) / (lines - 1);
    out += '<line class="' + STYLE_PREFIX + 'charts-grid" x1="' + n1(frame.x0) + '" y1="' + n1(gy)
      + '" x2="' + n1(frame.x1) + '" y2="' + n1(gy) + '" stroke="' + GRID_COLOR
      + '" stroke-width="1" vector-effect="non-scaling-stroke"/>';
  }
  return out;
}

export function ticksSvg(frame: Frame, lo: number, hi: number, count: number, format: ((v: number) => string) | undefined): string {
  if (count === 0) return '';
  let out = '';
  for (let i = 0; i < count; i += 1) {
    const tv = lo + ((hi - lo) * i) / (count - 1);
    const ty = yAt(frame, tv, lo, hi);
    /* #424 返工：最低那条刻度与绘图区底边同高（`lo` 就是下界），它的文字盒会探进 X 标签那一行。
     *  移动端字号提到 20 单位（t512 收尾收到 19.4）后两者只余 0.3px（实测）——最低那条改到轴线上方 1 单位起基线，
     *  其余刻度保持旧口径 `ty + 3`（旧 `charts.js` 字面值不动）。 */
    const labelDy = i === 0 ? -1 : 3;
    out += '<line class="' + STYLE_PREFIX + 'charts-ytick" x1="' + n1(frame.x0 - 5) + '" y1="' + n1(ty)
      + '" x2="' + n1(frame.x0) + '" y2="' + n1(ty) + '" stroke="' + GRID_COLOR
      + '" stroke-width="1" vector-effect="non-scaling-stroke"/>'
      + '<text class="' + STYLE_PREFIX + 'charts-tick" x="' + n1(frame.x0 - 7) + '" y="' + n1(ty + labelDy)
      + '" text-anchor="end" fill="' + MUTED_COLOR + '">' + esc(fmtValue(round2(tv), format)) + '</text>';
  }
  return out;
}

/** X 轴标签集合：`'all'` 全量／`'edge'` 首尾／`'select'` 首＋峰值＋尾（line 口径）
 *  ／`'none'` 无。`select='edge'` 时 `'select'` 退化为首尾——**bar 口径**：
 *  旧 bar 的 `'select'` 只显示首尾（`charts.js:385-388`），与 line 的「首＋峰值＋尾」不同（R2-N7）。
 *
 *  #424 补一条下限（只对 line 的 `'select'`）：**峰值落在端点时首＋峰＋尾去重后只剩 2 个标签**
 *  （单调下降的体重曲线必然如此，峰值就是首日），横轴中段又变成没有时间参照。故去重后不足 3 个、
 *  且点数 ≥3 时，补一个**离首点最远的中间点**——仍满足「首＋峰＋尾」，顺带给出中段参照。
 *
 *  #567 追加 `every`（只对 `'all'`）：每 k 点取一枚（含末点），给「点全画、标签抽稀」用；
 *  非 `'all'` 或非法 k（非 ≥2 有限数）时忽略（默认行为不变）。 */
function labelIndexes(mode: LabelsMode, items: readonly ChartItem[], select: 'peak' | 'edge' = 'peak', every?: number): readonly number[] {
  const n = items.length;
  if (mode === 'none' || n === 0) return [];
  if (mode === 'all') {
    if (every !== undefined && Number.isFinite(every) && Math.floor(every) >= 2) {
      const k = Math.floor(every);
      const picked: number[] = [];
      for (let i = 0; i < n; i += k) picked.push(i);
      if (picked[picked.length - 1] !== n - 1) picked.push(n - 1);
      return picked;
    }
    return items.map((_, i) => i);
  }
  if (mode === 'edge' || (mode === 'select' && select === 'edge')) return n === 1 ? [0] : [0, n - 1];
  let peak = 0;
  let peakValue = -Infinity;
  items.forEach((item, i) => {
    if (item.value !== null && item.value > peakValue) {
      peakValue = item.value;
      peak = i;
    }
  });
  const picked = Array.from(new Set<number>([0, peak, n - 1])).sort((a, b) => a - b);
  if (picked.length < 3 && n >= 3) {
    const mid = Math.round((n - 1) / 2);
    const extra = [mid, n - 1 - mid, 1, n - 2].find((i) => i > 0 && i < n - 1 && !picked.includes(i));
    if (extra !== undefined) picked.splice(1, 0, extra);
  }
  return picked;
}

/* t-chartfix：X 标签的 x 标度缺省与折线点同一 `xAt` 点标度；柱族（bar／combo）
 * 的柱列中心走 band 标度 `x0 + slot*(i+0.5)`——点标度会把首尾标签钉在绘图区
 * 左右边缘（3 柱时偏差 48.7 单位），与柱错位。调用方按自家几何传入。 */
export function xLabelsSvg(
  common: ResolvedCommon,
  frame: Frame,
  items: readonly ChartItem[],
  select: 'peak' | 'edge' = 'peak',
  xOf: (index: number, count: number) => number = (i, n) => xAt(frame, i, n),
  gap?: number,
  every?: number,
): string {
  if (common.labels === 'none') return '';
  const baseY = frame.y1 + (gap ?? (common.compact ? 9 : 12));
  return labelIndexes(common.labels, items, select, every).map((i) => {
    const x = xOf(i, items.length);
    const rotate = common.labelRotate === 0 ? '' : ' transform="rotate(' + common.labelRotate + ' ' + n1(x) + ' ' + n1(baseY) + ')"';
    return '<text class="' + STYLE_PREFIX + 'charts-xlabel" x="' + n1(x) + '" y="' + n1(baseY)
      + '" text-anchor="middle"' + rotate + ' fill="' + MUTED_COLOR + '">' + esc(items[i].label) + '</text>';
  }).join('');
}

/** `showValues` 标签集合：`true` 全量（相邻中心距 < 26 单位跳过）／`'edge'` 首尾有效点／
 *  `'last'` 只标最后一个有效点（#567）／`false` 无。 */
export function valueIndexes(mode: ShowValuesMode, frame: Frame, items: readonly ChartItem[]): readonly number[] {
  if (mode === false) return [];
  const valid: number[] = [];
  items.forEach((item, i) => {
    if (item.value !== null) valid.push(i);
  });
  if (valid.length === 0) return [];
  if (mode === 'last') return [valid[valid.length - 1]];
  if (mode === 'edge') return valid.length === 1 ? [valid[0]] : [valid[0], valid[valid.length - 1]];
  const out: number[] = [];
  let lastX = -Infinity;
  for (const i of valid) {
    const x = xAt(frame, i, items.length);
    if (x - lastX < 26) continue;
    out.push(i);
    lastX = x;
  }
  return out;
}

export function legendHtml(entries: readonly { readonly name: string; readonly color: string; readonly note?: string }[], placement?: string): string {
  if (entries.length === 0) return '';
  const cls = STYLE_PREFIX + 'charts-legend' + (placement === undefined ? '' : ' ' + STYLE_PREFIX + 'charts-legend-' + placement);
  return '<div class="' + cls + '">' + entries.map((entry) => {
    const swatch = entry.note === undefined
      ? '<span class="' + STYLE_PREFIX + 'charts-legend-swatch" style="background:' + esc(entry.color) + '"></span>'
      : '<span class="' + STYLE_PREFIX + 'charts-legend-swatch ' + STYLE_PREFIX + 'charts-legend-swatch-dashed"></span>';
    return '<span class="' + STYLE_PREFIX + 'charts-legend-item">' + swatch + esc(entry.name) + '</span>';
  }).join('') + '</div>';
}

