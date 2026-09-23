/** charts · bar
 *
 *  自 `src/charts.ts` 第 1386–1618 行原样切出。
 *
 *  **住址**：目录化批次④把 `src/charts.ts` 按段切成「族内一件一文件」，正文原样搬来；
 *  搬迁判据＝产物逐字节相同（八种图表产物 ＋ `chartsCss` ＋ helpers JS），
 *  见 `docs/base/base-render/组件目录架构.md`。
 */

import { DEFAULT_SERIES_COLOR, MUTED_COLOR, badStructure, esc, fmtValue, isNum, isPlainObject, n1, normalizeItems, requireObject, round2 } from './shared.js';
import { ResolvedCommon, actionAttrs, belowMinPoints, containerOpen, emptyOutput, minPointsHintOf, resolveCommon, svgOpen, tipAttrs } from './options.js';
import { LINE_TEXT_MOBILE, LINE_TICK_TOP_MIN, domainOf, insetsFor, makeFrame, textWidthUnits, tickCount, yAt } from './coords.js';
import { gridSvg, legendHtml, ticksSvg, valueIndexes, xLabelsSvg } from './svg.js';
import { charts } from './dispatch.js';
import { STYLE_PREFIX } from '../../style.js';
import { BarChartInput, BarChartOptions, CHART_BREAKPOINTS, CHART_PALETTE, ChartItem, ChartOutput } from '../../spec/index.js';

/* ── bar ──────────────────────────────────────────────────────────────── */

function barColorFor(index: number, item: ChartItem, opts: BarChartOptions, common: ResolvedCommon): string {
  if (common.color !== undefined) return common.color;
  if (item.color !== undefined) return item.color;
  if (opts.singleColor === true) return common.colors?.[0] ?? CHART_PALETTE[0];
  if (common.colors !== undefined && common.colors.length > 0) return common.colors[index % common.colors.length];
  return DEFAULT_SERIES_COLOR;
}

function segColorFor(index: number, item: ChartItem, opts: BarChartOptions, common: ResolvedCommon): string {
  if (item.color !== undefined) return item.color;
  if (common.colors !== undefined && common.colors.length > 0) return common.colors[index % common.colors.length];
  return CHART_PALETTE[index % CHART_PALETTE.length];
}

export function renderBar(raw: BarChartInput): ChartOutput {
  const input = requireObject(raw, 'charts.bar: input');
  const common = resolveCommon(input.options, { width: 320, height: 170, labels: 'all', showValues: true });
  const opts = isPlainObject(input.options) ? (input.options as BarChartOptions) : undefined;
  const stacked = opts !== undefined && opts.stacked === true;
  const grouped = !stacked && opts !== undefined && opts.grouped === true;
  const multi = stacked || grouped;
  const items = normalizeItems(input.items, 'bar', false, multi ? 'values' : 'value');
  if (items.length === 0) return emptyOutput('bar', input.options);
  if (belowMinPoints(input.options, items.length)) return emptyOutput('bar', input.options, minPointsHintOf(input.options, items.length));
  const stackMode = opts !== undefined && opts.stackMode === 'absolute' ? 'absolute' : 'percent';
  const gap = CHART_BREAKPOINTS.stackedGapPx;

  let segCount = 0;
  if (multi) {
    segCount = (items[0].values as readonly number[]).length;
    items.forEach((item, i) => {
      if (item.values === undefined) badStructure('charts.bar: stacked/grouped 模式下 items[' + i + '] 必须含 values 数组');
      if (item.values.length !== segCount) {
        badStructure('charts.bar: 各 item values 长度必须一致 (' + segCount + '), items[' + i + ']=' + item.values.length);
      }
    });
  }
  const segNames = opts !== undefined && Array.isArray(opts.segNames)
    ? opts.segNames.map((name, i) => (typeof name === 'string' && name !== '' ? name : '段' + (i + 1)))
    : Array.from({ length: segCount }, (_, i) => '段' + (i + 1));
  /** 全局最大合计（`stackMode: 'absolute'` 的分母）；仅多值模式读 `values`。 */
  const maxTotal = multi
    ? items.reduce((best, item) => {
      const total = (item.values as readonly number[]).reduce((a, b) => a + b, 0);
      return total > best ? total : best;
    }, 0)
    : 0;

  /* #567 柱状 Y 轴刻度（默认不开：`yTicks` 缺省 → 0 条，行为与改前逐字同）；
   *  数值标签抽稀步长（`valueThin`，用户单位；非法值＝全标）。 */
  const barTicks = tickCount(opts === undefined ? undefined : opts.yTicks);
  const valueThin = opts !== undefined && isNum(opts.valueThin) && (opts.valueThin as number) > 0
    ? (opts.valueThin as number)
    : undefined;

  let lo = 0;
  let hi = 1;
  if (stacked && stackMode === 'percent') {
    lo = 0;
    hi = 100;
  } else if (stacked) {
    const totals = items.map((item) => (item.values as readonly number[]).reduce((a, b) => a + b, 0));
    const [dlo, dhi] = domainOf(totals, common.yMin, common.yMax, true, 0);
    lo = dlo;
    hi = dhi;
  } else if (grouped) {
    const values: number[] = [];
    for (const item of items) for (const v of item.values as readonly number[]) values.push(v);
    const [dlo, dhi] = domainOf(values, common.yMin, common.yMax, true, 0);
    lo = dlo;
    hi = dhi;
  } else {
    const values = items.map((item) => item.value as number);
    const [dlo, dhi] = domainOf(values, common.yMin, common.yMax, true, 0);
    lo = dlo;
    hi = dhi;
  }
  /* 刻度留白按移动端字号估（与折线同口径 `LINE_TEXT_MOBILE.tick`）；不开刻度时三项全 0，
   * 绘图区几何与改前逐字同（`tickN = 0` 旧口径）。 */
  let tickTextW = 0;
  if (barTicks >= 2) {
    for (let i = 0; i < barTicks; i += 1) {
      const tv = lo + ((hi - lo) * i) / (barTicks - 1);
      tickTextW = Math.max(tickTextW, textWidthUnits(fmtValue(round2(tv), common.format), LINE_TEXT_MOBILE.tick));
    }
  }
  const frame = makeFrame(common, insetsFor(common, {
    tickWidth: barTicks === 0 ? 0 : (common.compact ? 16 : 22),
    labelHeight: common.labels === 'none' ? 0 : (common.compact ? 10 : 14),
    valueHeight: common.compact ? 9 : 12,
    minLeft: barTicks === 0 ? 0 : Math.ceil(tickTextW) + 9,
    minTop: barTicks === 0 ? 0 : LINE_TICK_TOP_MIN,
  }));

  const yZero = yAt(frame, 0, lo, hi);
  const slot = frame.w / items.length;
  const barW = Math.min(slot * (common.compact ? 0.82 : 0.62), 34);

  let barsSvg = '';
  items.forEach((item, i) => {
    const cx = frame.x0 + slot * (i + 0.5);
    const tip = tipAttrs(common, () => item.label + ': ' + fmtValue(item.value as number, common.format));
    if (!multi) {
      const value = item.value as number;
      const yv = yAt(frame, value, lo, hi);
      const top = Math.min(yZero, yv);
      const height = Math.max(2, Math.abs(yZero - yv));
      barsSvg += '<rect class="' + STYLE_PREFIX + 'charts-bar" data-i="' + i + '" x="' + n1(cx - barW / 2)
        + '" y="' + n1(top) + '" width="' + n1(barW) + '" height="' + n1(height) + '" rx="2" fill="'
        + esc(barColorFor(i, item, opts ?? {}, common)) + '"' + tip + actionAttrs(common, i) + '/>';
      return;
    }
    const values = item.values as readonly number[];
    const total = values.reduce((a, b) => a + b, 0);
    if (stacked) {
      /* 段纵向堆叠：percent = 柱内合计 100%（恒 0-100，不参与 yMin/yMax）；absolute = 相对全局最大合计。
       * 段间距取 `CHART_BREAKPOINTS.stackedGapPx`（R20：子元素间距唯一常量，stacked 段与 grouped 子柱同用）。 */
      const unit = stackMode === 'percent'
        ? (total > 0 ? frame.h / total : 0)
        : (maxTotal > 0 ? frame.h / maxTotal : 0);
      let cursor = frame.y1;
      values.forEach((value, j) => {
        const segH = value * unit;
        const carve = j === 0 ? 0 : gap;
        barsSvg += '<rect class="' + STYLE_PREFIX + 'charts-seg" data-i="' + i + '" data-seg="' + j + '" x="'
          + n1(cx - barW / 2) + '" y="' + n1(cursor - segH + carve) + '" width="' + n1(barW)
          + '" height="' + n1(Math.max(1, segH - carve)) + '" rx="2" fill="'
          + esc(segColorFor(j, item, opts ?? {}, common)) + '"'
          + tipAttrs(common, () => segNames[j] + ': ' + fmtValue(value, common.format)) + actionAttrs(common, i) + '/>';
        cursor -= segH;
      });
      return;
    }
    /* grouped：每列 N 根并排子柱（宽度均分，间距 = CHART_BREAKPOINTS.stackedGapPx） */
    const subW = (barW - gap * (segCount - 1)) / segCount;
    let group = '<g class="' + STYLE_PREFIX + 'charts-group" data-i="' + i + '" data-gap="' + gap + '">';
    values.forEach((value, j) => {
      const x = cx - barW / 2 + j * (subW + gap);
      const yv = yAt(frame, value, lo, hi);
      const top = Math.min(yZero, yv);
      const height = Math.max(2, Math.abs(yZero - yv));
      group += '<rect class="' + STYLE_PREFIX + 'charts-bar" data-i="' + i + '" data-seg="' + j + '" x="' + n1(x)
        + '" y="' + n1(top) + '" width="' + n1(subW) + '" height="' + n1(height) + '" rx="2" fill="'
        + esc(segColorFor(j, item, opts ?? {}, common)) + '"'
        + tipAttrs(common, () => segNames[j] + ': ' + fmtValue(value, common.format))
        + actionAttrs(common, i) + '/>';
    });
    barsSvg += group + '</g>';
  });

  /* 数值标签：单柱 = 值；stacked = 柱顶合计；grouped = 每子柱顶部。
   *  #567：`false` 无；`true` 全量（`valueThin` 给正数时按柱中心距抽稀，默认不变）；
   *  `'edge'` 只标首尾有效点（改前落进全开那支——59 柱 59 枚压字即此 bug）；
   *  `'last'` 只标末值。抽稀只作用于柱组一级（grouped 整组取舍，不拆组内子柱）。 */
  const labelSet: ReadonlySet<number> = (() => {
    if (common.showValues === false) return new Set<number>();
    if (common.showValues === true && valueThin !== undefined) {
      const keep = new Set<number>();
      let lastX = -Infinity;
      items.forEach((item, i) => {
        if (item.value === null && !multi) return;
        const cx = frame.x0 + slot * (i + 0.5);
        if (cx - lastX < valueThin) return;
        keep.add(i);
        lastX = cx;
      });
      return keep;
    }
    if (common.showValues === true) return new Set(items.map((_, i) => i));
    /* 多值模式（stacked／grouped）的 `item.value` 为空，`valueIndexes` 按值取会落空——
     * 按柱组取首末（`'edge'` 首尾组、`'last'` 末组），标签内容仍走各组既有口径（合计／子柱值）。 */
    if (multi) {
      if (items.length === 0) return new Set<number>();
      if (common.showValues === 'last') return new Set([items.length - 1]);
      return new Set(items.length === 1 ? [0] : [0, items.length - 1]);
    }
    return new Set(valueIndexes(common.showValues, frame, items));
  })();
  let valuesSvg = '';
  if (labelSet.size > 0) {
    items.forEach((item, i) => {
      if (!labelSet.has(i)) return;
      const cx = frame.x0 + slot * (i + 0.5);
      if (!multi) {
        const value = item.value as number;
        const top = Math.min(yZero, yAt(frame, value, lo, hi));
        valuesSvg += '<text class="' + STYLE_PREFIX + 'charts-value" x="' + n1(cx) + '" y="' + n1(top - 3)
          + '" text-anchor="middle" fill="' + MUTED_COLOR + '">' + esc(fmtValue(value, common.format)) + '</text>';
        return;
      }
      if (stacked) {
        const total = (item.values as readonly number[]).reduce((a, b) => a + b, 0);
        /* 合计标签与段高**同尺度**：段高单位 = frame.h / (percent ? 柱内合计 : 全局最大合计)，
         * 故柱顶 = frame.y1 - total*unit（percent 恒 frame.y0）。旧版标签贴柱顶（`charts.js:277`），
         * 用带 padding 的 `yAt(domain)` 会落到柱顶下方约 5%（R2-N2）。 */
        const unit = stackMode === 'percent'
          ? (total > 0 ? frame.h / total : 0)
          : (maxTotal > 0 ? frame.h / maxTotal : 0);
        const top = stackMode === 'percent' ? frame.y0 : frame.y1 - total * unit;
        valuesSvg += '<text class="' + STYLE_PREFIX + 'charts-value ' + STYLE_PREFIX + 'charts-value-total" x="' + n1(cx)
          + '" y="' + n1(top - 3) + '" text-anchor="middle" fill="' + MUTED_COLOR + '">'
          + esc(fmtValue(total, common.format)) + '</text>';
        return;
      }
      const subW = (barW - gap * (segCount - 1)) / segCount;
      (item.values as readonly number[]).forEach((value, j) => {
        const x = cx - barW / 2 + j * (subW + gap) + subW / 2;
        const top = Math.min(yZero, yAt(frame, value, lo, hi));
        valuesSvg += '<text class="' + STYLE_PREFIX + 'charts-value" x="' + n1(x) + '" y="' + n1(top - 3)
          + '" text-anchor="middle" fill="' + MUTED_COLOR + '">' + esc(fmtValue(value, common.format)) + '</text>';
      });
    });
  }

  const legendEntries = multi ? segNames.map((name, j) => ({ name, color: segColorFor(j, items[0], opts ?? {}, common) })) : [];
  const points = items.length;
  const html = containerOpen('bar', common, STYLE_PREFIX + 'charts-bar')
    + legendHtml(legendEntries)
    + svgOpen(common)
    /* #567：开 `yTicks` 时网格线与刻度线同条数同位置（折线 #512 口径）；不开时 `tickN = 0`
     * 回退旧三线口径，几何与改前逐字同。 */
    + (common.grid ? gridSvg(frame, barTicks) : '')
    + barsSvg
    + valuesSvg
    + ticksSvg(frame, lo, hi, barTicks, common.format)
    /* t-chartfix：柱标签取柱列中心（与 `barsSvg` 同一 band 标度），不得用点标度。 */
    + xLabelsSvg(common, frame, items, 'edge', (i, n) => frame.x0 + (frame.w / n) * (i + 0.5))
    + '</svg></div>';
  return { kind: 'bar', html, empty: points === 0, points };
}

