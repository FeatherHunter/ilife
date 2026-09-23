/** charts · line
 *
 *  自 `src/charts.ts` 第 705–1385 行原样切出。
 *
 *  **住址**：目录化批次④把 `src/charts.ts` 按段切成「族内一件一文件」，正文原样搬来；
 *  搬迁判据＝产物逐字节相同（八种图表产物 ＋ `chartsCss` ＋ helpers JS），
 *  见 `docs/base/base-render/组件目录架构.md`。
 */

import { ANOMALY_COLOR, DEFAULT_MARK_COLOR, DEFAULT_SERIES_COLOR, DOT_DEFAULT_PX, DOT_FACE_COLOR, DOT_STRIDE_MAX, MUTED_COLOR, OWN_SCALE_NOTE, badStructure, esc, fmtValue, isNum, isPlainObject, n1, normalizeItems, numOr, requireObject, round2 } from './shared.js';
import { ResolvedCommon, actionAttrs, belowMinPoints, containerOpen, emptyOutput, minPointsHintOf, resolveCommon, svgOpen, tipAttrs } from './options.js';
import { LINE_BOTTOM_MIN, LINE_LABEL_GAP, LINE_LAST_LABEL_LIFT, LINE_TEXT_MOBILE, LINE_TICK_TOP_MIN, domainOf, insetsFor, lineDomainOf, makeFrame, textWidthUnits, tickCount, xAt, yAt } from './coords.js';
import { gridSvg, legendHtml, ticksSvg, valueIndexes, xLabelsSvg } from './svg.js';
import { charts } from './dispatch.js';
import { STYLE_PREFIX } from '../../style.js';
import { CHART_PALETTE, ChartBand, ChartFillBetween, ChartItem, ChartMarkLine, ChartMarkPoint, ChartOutput, ChartSeries, LineChartInput, LineChartOptions } from '../../spec/index.js';

/* ── line ─────────────────────────────────────────────────────────────── */

export type Pt = readonly [number, number, boolean];

interface ResolvedLineSeries {
  readonly name: string;
  readonly items: readonly ChartItem[];
  readonly color: string | undefined;
  readonly dashed: boolean;
  readonly smooth: boolean;
  readonly area: boolean;
  readonly ownScale: boolean;
  /** #424 返工：**引擎注入的均线序列**的显式标记。禁止再用「虚线 + 非独立刻度 + 末位」猜哪条是均线
   *  ——那会把调用方自己的虚线末位序列（配对页 cross 轴那条）误判成均线：既不进图例、不画点、
   *  不算 points，还错加 `charts-avg` 类。 */
  readonly avg: boolean;
}

function resolveLineSeries(raw: unknown, mainItems: readonly ChartItem[], line: ResolvedLineOptions): ResolvedLineSeries[] {
  const list = line.series;
  if (list === undefined || list.length === 0) {
    return [{
      name: '',
      items: mainItems,
      color: undefined,
      dashed: line.dashed,
      smooth: line.smooth,
      area: line.area,
      ownScale: false,
      avg: false,
    }];
  }
  return list.map((entry, i) => {
    const series = requireObject(entry, 'charts.line: series[' + i + ']');
    if (typeof series.name !== 'string') badStructure('charts.line: series[' + i + '].name 必须是字符串');
    const items = normalizeItems(series.items, 'line', true);
    return {
      name: series.name,
      items,
      color: typeof series.color === 'string' && series.color !== '' ? series.color : undefined,
      dashed: series.dashed === true,
      smooth: series.smooth === undefined ? line.smooth : series.smooth === true,
      area: series.area === true,
      ownScale: series.ownScale === true,
      avg: false,
    };
  });
}

/** 跨空档桥接段（#458）：相邻实测点之间隔着至少一个空档时，把两端点直连为一段
 *  （`M端点L端点`，只用实测点坐标，空档点不参与）；首末空档无对端可接，不出段。 */
function bridgePath(pts: readonly Pt[]): string {
  let d = '';
  let prev = -1;
  for (let i = 0; i < pts.length; i += 1) {
    if (pts[i][2]) continue;
    if (prev >= 0 && i - prev > 1) {
      d += 'M' + n1(pts[prev][0]) + ' ' + n1(pts[prev][1]) + 'L' + n1(pts[i][0]) + ' ' + n1(pts[i][1]);
    }
    prev = i;
  }
  return d;
}

export function polyPath(pts: readonly Pt[], connect: boolean): string {
  if (connect) {
    const valid = pts.filter((p) => !p[2]);
    if (valid.length === 0) return '';
    return valid.map((p, i) => (i === 0 ? 'M' : 'L') + n1(p[0]) + ' ' + n1(p[1])).join('');
  }
  const segments: Pt[][] = [];
  let cur: Pt[] = [];
  for (const p of pts) {
    if (p[2]) {
      if (cur.length > 0) segments.push(cur);
      cur = [];
    } else {
      cur.push(p);
    }
  }
  if (cur.length > 0) segments.push(cur);
  return segments.map((seg) => seg.map((p, i) => (i === 0 ? 'M' : 'L') + n1(p[0]) + ' ' + n1(p[1])).join('')).join('');
}

/** Catmull-Rom → 三次贝塞尔（数据点严格落在曲线上，旧 `_smoothPath` 口径）。 */
function smoothPath(pts: readonly Pt[], connect: boolean): string {
  const segments: Pt[][] = [];
  if (connect) {
    segments.push(pts.filter((p) => !p[2]));
  } else {
    let cur: Pt[] = [];
    for (const p of pts) {
      if (p[2]) {
        if (cur.length > 0) segments.push(cur);
        cur = [];
      } else {
        cur.push(p);
      }
    }
    if (cur.length > 0) segments.push(cur);
  }
  return segments.map((seg) => {
    if (seg.length < 3) return seg.map((p, i) => (i === 0 ? 'M' : 'L') + n1(p[0]) + ' ' + n1(p[1])).join('');
    let d = 'M' + n1(seg[0][0]) + ' ' + n1(seg[0][1]);
    for (let i = 0; i < seg.length - 1; i += 1) {
      const p0 = seg[i - 1] ?? seg[i];
      const p1 = seg[i];
      const p2 = seg[i + 1];
      const p3 = seg[i + 2] ?? seg[i + 1];
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ' C' + n1(c1x) + ' ' + n1(c1y) + ' ' + n1(c2x) + ' ' + n1(c2y) + ' ' + n1(p2[0]) + ' ' + n1(p2[1]);
    }
    return d;
  }).join('');
}

/** 阶梯路径（水平段 + 垂直段，旧 `step` 口径）。 */
function stepPath(pts: readonly Pt[], connect: boolean): string {
  const valid = pts.filter((p) => !p[2]);
  if (valid.length === 0) return '';
  if (!connect) {
    const segments: Pt[][] = [];
    let cur: Pt[] = [];
    for (const p of pts) {
      if (p[2]) {
        if (cur.length > 0) segments.push(cur);
        cur = [];
      } else {
        cur.push(p);
      }
    }
    if (cur.length > 0) segments.push(cur);
    return segments.map((seg) => {
      let d = 'M' + n1(seg[0][0]) + ' ' + n1(seg[0][1]);
      for (let i = 1; i < seg.length; i += 1) {
        d += ' L' + n1(seg[i][0]) + ' ' + n1(seg[i - 1][1]) + ' L' + n1(seg[i][0]) + ' ' + n1(seg[i][1]);
      }
      return d;
    }).join('');
  }
  let d = 'M' + n1(valid[0][0]) + ' ' + n1(valid[0][1]);
  for (let i = 1; i < valid.length; i += 1) {
    d += ' L' + n1(valid[i][0]) + ' ' + n1(valid[i - 1][1]) + ' L' + n1(valid[i][0]) + ' ' + n1(valid[i][1]);
  }
  return d;
}

function areaPath(pts: readonly Pt[], connect: boolean, baseY: number, smooth: boolean, step: boolean): string {
  const valid = pts.filter((p) => !p[2]);
  if (valid.length === 0) return '';
  const body = smooth && !step ? smoothPath(pts, connect) : step ? stepPath(pts, connect) : polyPath(pts, connect);
  if (body === '') return '';
  const firstX = valid[0][0];
  const lastX = valid[valid.length - 1][0];
  return body + ' L' + n1(lastX) + ' ' + n1(baseY) + ' L' + n1(firstX) + ' ' + n1(baseY) + ' Z';
}

/** 两条序列之间的填充路径（null 断开，不随 `connectNulls` 跨空）。 */
function betweenPath(a: readonly Pt[], b: readonly Pt[]): string {
  const segments: { readonly top: Pt; readonly bottom: Pt }[][] = [];
  let cur: { readonly top: Pt; readonly bottom: Pt }[] = [];
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) {
    if (a[i][2] || b[i][2]) {
      if (cur.length > 0) segments.push(cur);
      cur = [];
    } else {
      cur.push({ top: a[i], bottom: b[i] });
    }
  }
  if (cur.length > 0) segments.push(cur);
  return segments.map((seg) => {
    let d = seg.map((p, i) => (i === 0 ? 'M' : 'L') + n1(p.top[0]) + ' ' + n1(p.top[1])).join('');
    for (let i = seg.length - 1; i >= 0; i -= 1) d += ' L' + n1(seg[i].bottom[0]) + ' ' + n1(seg[i].bottom[1]);
    return d + ' Z';
  }).join('');
}

function resolveMarkPoint(raw: unknown): ChartMarkPoint | true | undefined {
  if (raw === true) return true;
  if (isPlainObject(raw)) return raw as ChartMarkPoint;
  return undefined;
}

/** 折线默认 viewBox：320×210 → 580×260（#424）。
 *
 *  （#507 起本族不再走 `preserveAspectRatio="none"`，见 `svgOpen`；下面的量级关系一字不变——
 *  真正决定实渲字号的是「盒宽 ÷ viewBox 宽」，与 `none`／`meet` 无关。）SVG 的**盒尺寸**仍按 viewBox 长宽比算
 *  （`width:100%` ＋ `height:auto`），所以 320×210 塞进 930px 卡片时会被拉到 2.91 倍
 *  ——10px 图内文字渲染 29px、点径 20px（t-chartfix #160 的实测）。#160 用
 *  `max-width:480px` 压回 1.5 倍，代价是图只占卡片一半宽（930 里居中的 480，左右各空 225）。
 *
 *  #424 改从源头修：viewBox 放到真实卡片量级（580×260 ≈ 930×417 的 0.62 相似形）。
 *  卡片越宽、图越大、字越大：930px 卡 → scale 1.6 → 图内 9.5–10px 文字渲染 15.2–16px。
 *  于是 `max-width` 上限不再需要（见 `chartsCss`，桌面规则已撤）。 */
const LINE_DEFAULT_WIDTH = 580;
const LINE_DEFAULT_HEIGHT = 260;

export function renderLine(raw: LineChartInput): ChartOutput {
  const input = requireObject(raw, 'charts.line: input');
  const common = resolveCommon(input.options, {
    width: LINE_DEFAULT_WIDTH,
    height: LINE_DEFAULT_HEIGHT,
    labels: 'edge',
    showValues: false,
  });
  const opts = isPlainObject(input.options) ? (input.options as LineChartOptions) : undefined;
  const line: ResolvedLineOptions = {
    ...common,
    lineWidth: numOr(opts === undefined ? undefined : opts.lineWidth, 2.2),
    dashed: opts !== undefined && opts.dashed === true,
    smooth: opts !== undefined && opts.smooth === true,
    step: opts !== undefined && opts.step === true,
    showDots: opts === undefined || opts.showDots !== false,
    showDotsExplicit: opts !== undefined && opts.showDots !== undefined,
    dotSize: numOr(opts === undefined ? undefined : opts.dotSize, DOT_DEFAULT_PX),
    dotStyle: opts !== undefined && typeof opts.dotStyle === 'string' && opts.dotStyle !== '' ? opts.dotStyle : undefined,
    area: opts !== undefined && opts.area === true,
    areaOpacity: numOr(opts === undefined ? undefined : opts.areaOpacity, 0.12),
    yTicks: opts === undefined || opts.yTicks === undefined ? false : opts.yTicks,
    connectNulls: opts !== undefined && opts.connectNulls === true,
    /* #458：显式 gapStyle 优先；未给时由 connectNulls 回落（true→connect，否则→break），
     *  缺省产出与改前逐字节相同。 */
    gapStyle: opts !== undefined && (opts.gapStyle === 'break' || opts.gapStyle === 'connect' || opts.gapStyle === 'dashed')
      ? opts.gapStyle
      : (opts !== undefined && opts.connectNulls === true ? 'connect' : 'break'),
    legend: opts !== undefined && opts.legend === true,
    highlightLast: opts !== undefined && opts.highlightLast === true,
    avgLine: opts !== undefined && isNum(opts.avgLine) ? opts.avgLine : undefined,
    markLine: opts !== undefined && isPlainObject(opts.markLine) ? (opts.markLine as ChartMarkLine) : undefined,
    markPoint: opts === undefined ? undefined : resolveMarkPoint(opts.markPoint),
    band: opts !== undefined && isPlainObject(opts.band) ? (opts.band as ChartBand) : undefined,
    fillBetween: opts !== undefined && isPlainObject(opts.fillBetween) ? (opts.fillBetween as ChartFillBetween) : undefined,
    highlightPoints: opts !== undefined && (opts.highlightPoints === 'turns' || opts.highlightPoints === 'crossings')
      ? opts.highlightPoints
      : undefined,
    series: opts !== undefined && Array.isArray(opts.series) ? (opts.series as readonly ChartSeries[]) : undefined,
    labelEvery: opts !== undefined && isNum(opts.labelEvery) && Math.floor(opts.labelEvery) >= 2
      ? Math.floor(opts.labelEvery)
      : undefined,
  };
  const items = normalizeItems(input.items, 'line', true);
  if (items.length === 0) return emptyOutput('line', input.options);
  if (belowMinPoints(input.options, items.length)) return emptyOutput('line', input.options, minPointsHintOf(input.options, items.length));
  /* 点密度（#424）：`showDots` 未显式给且点数超上限 → 隔 k 个画一个（n=90 → k=3 → 30 个）。
   *  末点**只按 stride 命中**时才画：`highlightLast` 会另外补一个实心末点圈（同 x，r 大 1），
   *  两条路都无条件画会叠出「双圈」——所以末点改由 `highlightLast` 单独负责（调用方开它）。 */
  const dotStride = line.showDotsExplicit || line.dotSize <= 0 || items.length <= DOT_STRIDE_MAX
    ? 1
    : Math.ceil(items.length / DOT_STRIDE_MAX);
  const series = resolveLineSeries(input.options, items, line);
  const main = series[0];

  /* band：与主序列 items 等长，否则抛错；hi/lo 值并入共享域 */
  let band: ChartBand | undefined;
  if (line.band !== undefined) {
    const hi = line.band.hi;
    const lo = line.band.lo;
    if (!Array.isArray(hi) || !Array.isArray(lo)) badStructure('charts.line: band.hi/lo 必须是数组');
    if (hi.length !== main.items.length || lo.length !== main.items.length) {
      badStructure('charts.line: band.hi/lo 长度必须与 items 等长 (' + main.items.length + '), 收到 hi='
        + hi.length + ' lo=' + lo.length);
    }
    band = line.band;
  }

  /* 共享 Y 域（非 ownScale 序列 + band；ownScale 序列独立归一化，不参与共享域） */
  const sharedValues: number[] = [];
  for (const s of series) {
    if (s.ownScale) continue;
    for (const item of s.items) if (item.value !== null) sharedValues.push(item.value);
  }
  if (band !== undefined) {
    for (const v of band.hi) if (v !== null) sharedValues.push(v);
    for (const v of band.lo) if (v !== null) sharedValues.push(v);
  }
  const [lo, hi] = lineDomainOf(sharedValues, line.yMin, line.yMax);

  const tickN = tickCount(line.yTicks);
  /* 刻度留白按**移动端字号**估（`LINE_TEXT_MOBILE.tick`）：留白是双端共用的用户单位，桌面档估算
   *  在 390px 下会漏 —— 见 `insetsFor` 的 `minLeft`。上沿同理（`LINE_TICK_TOP_MIN`）：顶端那条
   *  标注的基线以上要 1.04em，≤720px 档字号 19.4 单位最大（原 20），按它留才不会在四档里被裁。 */
  let tickTextW = 0;
  for (let i = 0; i < tickN; i += 1) {
    const tv = lo + ((hi - lo) * i) / (tickN - 1);
    tickTextW = Math.max(tickTextW, textWidthUnits(fmtValue(round2(tv), line.format), LINE_TEXT_MOBILE.tick));
  }
  /* t512 WaveC：右留白按**移动端字号**估横轴标签半宽（留白是双端共用的用户单位，取最大那一档
   *  `LINE_TEXT_MOBILE.xlabel`；`textWidthUnits` 的 0.62em 本已偏保守，+1 只收 `n1` 舍入）。
   *  横轴标签居中落在绘图区沿上，末条的半个字宽要收进 viewBox，右留白不得小于它。 */
  let xlabelHalfW = 0;
  if (line.labels !== 'none') {
    for (const item of items) {
      xlabelHalfW = Math.max(xlabelHalfW, textWidthUnits(item.label, LINE_TEXT_MOBILE.xlabel) / 2);
    }
  }
  const frame = makeFrame(line, insetsFor(line, {
    tickWidth: tickN === 0 ? 0 : (line.compact ? 16 : 22),
    labelHeight: line.labels === 'none' ? 0 : (line.compact ? 10 : 14),
    valueHeight: line.compact ? 9 : 12,
    minLeft: tickN === 0 ? 0 : Math.ceil(tickTextW) + 9,
    minTop: tickN === 0 ? 0 : LINE_TICK_TOP_MIN,
    minBottom: line.labels === 'none' ? 0 : LINE_BOTTOM_MIN,
    minRight: line.labels === 'none' ? 0 : Math.ceil(xlabelHalfW) + 1,
  }));

  const ownDoms = series.map((s) => {
    if (!s.ownScale) return undefined;
    const values: number[] = [];
    for (const item of s.items) if (item.value !== null) values.push(item.value);
    return domainOf(values, undefined, undefined, false);
  });

  const ptsOf = (s: ResolvedLineSeries, si: number): Pt[] => {
    const dom = ownDoms[si] ?? [lo, hi];
    return s.items.map((item, i) => [
      xAt(frame, i, s.items.length),
      item.value === null ? 0 : yAt(frame, item.value, dom[0], dom[1]),
      item.value === null,
    ] as Pt);
  };
  const seriesPts = series.map((s, si) => ptsOf(s, si));

  /* avgLine：均线序列（窗口统一为 3..items.length）。旧版 `charts.js:414` 是 `if(opt.avgLine&&!opt.series)`
   *  ——传了 `series` 就不叠加（R2-N6，调用方自己管序列）。#424 放开这条互斥：`series` 同时用于给**主序列**
   *  起图例名（旧help模板 `chart-multi-v2` 的图例写「每次称重／7 天均线」，均线是引擎现算的、调用方拿不到它的
   *  数据）——两种用法合并，叠加均线仍由 `avgLine` 决定。主序列恒 `series[0]`、均线恒追加在末尾，
   *  「只看第一条」的逻辑（`highlightLast`／`markPoint`）不受影响。 */
  const avgWindow = line.avgLine === undefined
    ? undefined
    : Math.max(3, Math.min(items.length, Math.round(line.avgLine || 7)));
  if (avgWindow !== undefined && items.length >= 2) {
    const avgItems: ChartItem[] = items.map((item, i) => {
      if (item.value === null) return { label: item.label, value: null };
      let sum = 0;
      let n = 0;
      for (let j = Math.max(0, i - avgWindow + 1); j <= i; j += 1) {
        const v = items[j].value;
        if (v !== null) {
          sum += v;
          n += 1;
        }
      }
      return { label: item.label, value: n === 0 ? null : round2(sum / n) };
    });
    series.push({
      /* #424 返工：条目名按**实际窗口**生成（调用点传的是变量窗口，如 `reviewDocs.ts:52` 的
       *  `avgLine: win`）——写死「7 天均线」在窗口 ≠7 时是错的。 */
      name: avgWindow + ' 天均线',
      items: avgItems,
      color: MUTED_COLOR,
      dashed: true,
      smooth: line.smooth,
      area: false,
      ownScale: false,
      avg: true,
    });
    seriesPts.push(avgItems.map((item, i) => [
      xAt(frame, i, avgItems.length),
      item.value === null ? 0 : yAt(frame, item.value, lo, hi),
      item.value === null,
    ] as Pt));
  }

  /* fillBetween：a/b = 系列索引（越界／相同／非数／长度不一致 → 抛错） */
  let fillSvg = '';
  if (line.fillBetween !== undefined) {
    const fb = line.fillBetween;
    if (!isNum(fb.a) || !isNum(fb.b)) badStructure('charts.line: fillBetween.a/b 必须为系列索引数字');
    const ia = Math.round(fb.a);
    const ib = Math.round(fb.b);
    if (ia < 0 || ia >= seriesPts.length || ib < 0 || ib >= seriesPts.length) {
      badStructure('charts.line: fillBetween.a/b 越界 (系列数 ' + seriesPts.length + ', a=' + ia + ' b=' + ib + ')');
    }
    if (ia === ib) badStructure('charts.line: fillBetween.a/b 不能相同');
    if (seriesPts[ia].length !== seriesPts[ib].length) badStructure('charts.line: fillBetween 两系列 items 长度不一致');
    const d = betweenPath(seriesPts[ia], seriesPts[ib]);
    if (d !== '') {
      const color = typeof fb.color === 'string' && fb.color !== '' ? fb.color : DEFAULT_SERIES_COLOR;
      fillSvg = '<path class="' + STYLE_PREFIX + 'charts-fill" d="' + d + '" fill="' + esc(color)
        + '" fill-opacity="' + line.areaOpacity + '" stroke="none"/>';
    }
  }

  /* band：绘制在折线之前，fill-opacity 0.15 */
  let bandSvg = '';
  if (band !== undefined) {
    const dom = ownDoms[0] ?? [lo, hi];
    const n = main.items.length;
    const hiPts: Pt[] = [];
    const loPts: Pt[] = [];
    for (let i = 0; i < n; i += 1) {
      const x = xAt(frame, i, n);
      const hv = band.hi[i];
      const lv = band.lo[i];
      hiPts.push([x, hv === null || hv === undefined ? 0 : yAt(frame, hv, dom[0], dom[1]), hv === null || hv === undefined]);
      loPts.push([x, lv === null || lv === undefined ? 0 : yAt(frame, lv, dom[0], dom[1]), lv === null || lv === undefined]);
    }
    const d = betweenPath(hiPts, loPts);
    if (d !== '') {
      bandSvg = '<path class="' + STYLE_PREFIX + 'charts-band" d="' + d + '" fill="'
        + esc(main.color ?? line.color ?? DEFAULT_SERIES_COLOR) + '" fill-opacity="0.15" stroke="none"/>';
    }
  }

  /* 各序列路径 + 数据点 + 数值标签 */
  let pathsSvg = '';
  let marksSvg = '';
  let valuesSvg = '';
  const legendEntries: { readonly name: string; readonly color: string; readonly note?: string }[] = [];
  let anyOwnScale = false;
  series.forEach((s, si) => {
    if (s.ownScale) anyOwnScale = true;
    const pts = seriesPts[si];
    /* #424 返工：均线身份**只看显式标记**（注入时置 `avg: true`），不再靠「虚线＋非独立刻度＋末位」
     *  猜——调用方自己的虚线末位序列从此不再被误判。 */
    const isAvg = s.avg;
    const color = s.color ?? line.color ?? CHART_PALETTE[si % CHART_PALETTE.length];
    /* #458：连通标志由 gapStyle 统一给（connect 档等价旧 connectNulls:true，其余断开）；
     *  dashed 档实线走断开，桥接段另出一条同色虚线（均线序列不参与桥接）。 */
    const connect = line.gapStyle === 'connect';
    if (s.area && !isAvg) {
      const d = areaPath(pts, connect, frame.y1, s.smooth && !line.step, line.step);
      if (d !== '') {
        pathsSvg += '<path class="' + STYLE_PREFIX + 'charts-area" d="' + d + '" fill="' + esc(color)
          + '" fill-opacity="' + line.areaOpacity + '" stroke="none"/>';
      }
    }
    const d = line.step ? stepPath(pts, connect) : s.smooth ? smoothPath(pts, connect) : polyPath(pts, connect);
    if (d !== '') {
      pathsSvg += '<path class="' + STYLE_PREFIX + 'charts-line' + (isAvg ? ' ' + STYLE_PREFIX + 'charts-avg' : '')
        + '" d="' + d + '" fill="none" stroke="' + esc(color)
        + '" stroke-width="' + line.lineWidth + '" stroke-linejoin="round" stroke-linecap="round"'
        + (s.dashed ? ' stroke-dasharray="6 5"' : '') + ' vector-effect="non-scaling-stroke"/>';
    }
    if (line.gapStyle === 'dashed' && !isAvg) {
      const b = bridgePath(pts);
      if (b !== '') {
        pathsSvg += '<path class="' + STYLE_PREFIX + 'charts-line ' + STYLE_PREFIX + 'charts-line-bridge'
          + '" d="' + b + '" fill="none" stroke="' + esc(color)
          + '" stroke-width="' + line.lineWidth + '" stroke-linejoin="round" stroke-linecap="round"'
          + ' stroke-dasharray="5 4" vector-effect="non-scaling-stroke"/>';
      }
    }
    /* 图例条目（#424 起均线条目也算一条）：均线是引擎注入的序列（`avg: true`），名字按窗口生成、
     *  进图例；调用方自己的**虚线序列**（配对页 cross 轴那条）不进图例——那是调用方图例的事。 */
    if (line.legend && s.name !== '' && (s.avg || !(avgWindow !== undefined && s.dashed))) {
      legendEntries.push({ name: s.name, color });
    }
    if (isAvg) return;
    if (line.showDots) {
      pts.forEach((p, i) => {
        if (p[2]) return;
        if (dotStride > 1 && (i % dotStride) !== 0) return;
        const item = s.items[i];
        const anomaly = item.anomaly === true;
        const dotClass = STYLE_PREFIX + 'charts-dot' + (anomaly ? ' ' + STYLE_PREFIX + 'charts-dot-anomaly' : '')
          + (line.dotStyle === undefined ? '' : ' ' + STYLE_PREFIX + 'charts-dot-custom');
        marksSvg += '<circle class="' + dotClass + '" data-s="' + si + '" data-i="' + i + '" cx="' + n1(p[0])
          + '" cy="' + n1(p[1]) + '" r="' + line.dotSize / 2 + '" fill="'
          + (anomaly ? ANOMALY_COLOR : DOT_FACE_COLOR) + '" stroke="' + esc(anomaly ? ANOMALY_COLOR : color)
          + '" stroke-width="1.5" vector-effect="non-scaling-stroke"'
          + (line.dotStyle === undefined ? '' : ' style="' + esc(line.dotStyle) + '"')
          + tipAttrs(line, () => item.label + ': ' + fmtValue(item.value as number, line.format))
          + actionAttrs(line, i) + '/>';
      });
    }
    if (line.showValues !== false) {
      for (const i of valueIndexes(line.showValues, frame, s.items)) {
        const item = s.items[i];
        const p = pts[i];
        valuesSvg += '<text class="' + STYLE_PREFIX + 'charts-value" x="' + n1(p[0]) + '" y="' + n1(p[1] - 4)
          + '" text-anchor="middle" fill="' + MUTED_COLOR + '">' + esc(fmtValue(item.value as number, line.format)) + '</text>';
      }
    }
    /* highlightPoints：拐点（方向反转，两端点不判）／交点（多序列相交段右端点） */
    if (line.highlightPoints === 'turns') {
      for (let i = 1; i < pts.length - 1; i += 1) {
        if (pts[i][2] || pts[i - 1][2] || pts[i + 1][2]) continue;
        const dy1 = pts[i][1] - pts[i - 1][1];
        const dy2 = pts[i + 1][1] - pts[i][1];
        if (dy1 * dy2 < 0) {
          marksSvg += '<circle class="' + STYLE_PREFIX + 'charts-dot-hl" data-s="' + si + '" data-i="' + i
            + '" cx="' + n1(pts[i][0]) + '" cy="' + n1(pts[i][1]) + '" r="' + (line.dotSize / 2 + 2.5)
            + '" fill="none" stroke="' + esc(color) + '" stroke-width="2" vector-effect="non-scaling-stroke"/>';
        }
      }
    }
  });
  if (line.highlightPoints === 'crossings') {
    for (let a = 0; a < seriesPts.length; a += 1) {
      for (let b = a + 1; b < seriesPts.length; b += 1) {
        const pa = seriesPts[a];
        const pb = seriesPts[b];
        const n = Math.min(pa.length, pb.length);
        for (let k = 0; k < n - 1; k += 1) {
          if (pa[k][2] || pb[k][2] || pa[k + 1][2] || pb[k + 1][2]) continue;
          const d0 = pa[k][1] - pb[k][1];
          const d1 = pa[k + 1][1] - pb[k + 1][1];
          const hit = d0 === 0 ? k : d0 * d1 < 0 ? k + 1 : -1;
          if (hit < 0) continue;
          const color = series[a].color ?? line.color ?? CHART_PALETTE[a % CHART_PALETTE.length];
          marksSvg += '<circle class="' + STYLE_PREFIX + 'charts-dot-hl" data-s="' + a + '" data-i="' + hit
            + '" cx="' + n1(pa[hit][0]) + '" cy="' + n1(pa[hit][1]) + '" r="' + (line.dotSize / 2 + 2.5)
            + '" fill="none" stroke="' + esc(color) + '" stroke-width="2" vector-effect="non-scaling-stroke"/>';
        }
      }
    }
  }
  if (line.legend && anyOwnScale) legendEntries.push({ name: OWN_SCALE_NOTE, color: MUTED_COLOR, note: 'dashed' });

  /* highlightLast：最后一个有效点高亮 + 数值标签 */
  if (line.highlightLast) {
    let last = -1;
    for (let i = main.items.length - 1; i >= 0; i -= 1) {
      if (main.items[i].value !== null) {
        last = i;
        break;
      }
    }
    if (last >= 0) {
      const p = seriesPts[0][last];
      const color = line.color ?? main.color ?? DEFAULT_SERIES_COLOR;
      marksSvg += '<circle class="' + STYLE_PREFIX + 'charts-dot-last" data-i="' + last + '" cx="' + n1(p[0])
        + '" cy="' + n1(p[1]) + '" r="' + (line.dotSize / 2 + 1) + '" fill="' + esc(color) + '" stroke="' + esc(color)
        + '" stroke-width="1.5" vector-effect="non-scaling-stroke"/>';
      /* 末值文本受 `showValues`／`labels:'select'` 门控（旧 `charts.js:619-621`）；高亮圈无条件。
       * #424：末值常落在绘图区**右边缘**（末点就在 `frame.x1` 上），`middle` 锚会让文字一半探出图外
       *  （实测「70.6kg」右半截贴到卡片边）。距边不足 6% 宽时改 `end`／`start` 锚并收进 4 单位。
       * #567：`showValues:'last'` 时末值已由上面的数值标签画出（恰一枚），此处只留圈、不再追加文本
       * （否则同一末值印两遍）。 */
      if ((line.showValues !== false && line.showValues !== 'last') || line.labels === 'select') {
        const edgeRatio = (p[0] - frame.x0) / frame.w;
        const lastAnchor = edgeRatio > 0.94 ? 'end' : edgeRatio < 0.06 ? 'start' : 'middle';
        const lastX = edgeRatio > 0.94 ? p[0] - 4 : edgeRatio < 0.06 ? p[0] + 4 : p[0];
        valuesSvg += '<text class="' + STYLE_PREFIX + 'charts-value ' + STYLE_PREFIX + 'charts-value-last" x="' + n1(lastX)
          + '" y="' + n1(p[1] - LINE_LAST_LABEL_LIFT) + '" text-anchor="' + lastAnchor + '" fill="var(--fg,#1d1d1f)">'
          + esc(fmtValue(main.items[last].value as number, line.format)) + '</text>';
      }
    }
  }

  /* markLine：水平阈值（{value}）／垂直里程碑（{xValue}），按字段区分可同传 */
  let markSvg = '';
  if (line.markLine !== undefined) {
    const mark = line.markLine;
    if (isNum(mark.value)) {
      const my = yAt(frame, mark.value, lo, hi);
      const color = typeof mark.color === 'string' && mark.color !== '' ? mark.color : DEFAULT_MARK_COLOR;
      markSvg += '<line class="' + STYLE_PREFIX + 'charts-markline" x1="' + n1(frame.x0) + '" y1="' + n1(my)
        + '" x2="' + n1(frame.x1) + '" y2="' + n1(my) + '" stroke="' + esc(color)
        + '" stroke-width="1.5" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"/>'
        + '<text class="' + STYLE_PREFIX + 'charts-marktext" x="' + n1(frame.x1 - 2) + '" y="' + n1(my - 4)
        /* t-chartfix #160：标签恒用静音灰 `--fg3,#86868b`（老help模板 `公共组件/assets/charts.js:87`
         * 同款），**线**仍跟序列色／`mark.color`——线色由 3 条测试锁，标签色不锁。 */
        + '" text-anchor="end" fill="' + MUTED_COLOR + '">'
        + esc(mark.label !== undefined && mark.label !== null ? String(mark.label) : String(mark.value)) + '</text>';
    }
    if (mark.xValue !== undefined && mark.xValue !== null) {
      let idx = -1;
      if (isNum(mark.xValue)) {
        const candidate = Math.round(mark.xValue);
        if (candidate >= 0 && candidate < items.length) idx = candidate;
      } else {
        const wanted = String(mark.xValue);
        for (let i = 0; i < items.length; i += 1) {
          if (items[i].label === wanted) {
            idx = i;
            break;
          }
        }
      }
      if (idx >= 0) {
        const mx = xAt(frame, idx, items.length);
        const color = typeof mark.color === 'string' && mark.color !== '' ? mark.color : DEFAULT_MARK_COLOR;
        const ratio = (mx - frame.x0) / frame.w;
        const anchor = ratio < 0.18 ? 'start' : ratio > 0.82 ? 'end' : 'middle';
        const labelX = anchor === 'start' ? mx + 2 : anchor === 'end' ? mx - 2 : mx;
        markSvg += '<line class="' + STYLE_PREFIX + 'charts-markline-v" x1="' + n1(mx) + '" y1="' + n1(frame.y0 - 2)
          + '" x2="' + n1(mx) + '" y2="' + n1(frame.y1) + '" stroke="' + esc(color)
          + '" stroke-width="1.5" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"/>'
          + '<text class="' + STYLE_PREFIX + 'charts-marktext-v" x="' + n1(labelX) + '" y="' + n1(frame.y0 - 4)
          /* t-chartfix #160：同上——垂直线标签也走 `MUTED_COLOR`，线 stroke 不变。 */
          + '" text-anchor="' + anchor + '" fill="' + MUTED_COLOR + '">'
          + esc(mark.label !== undefined && mark.label !== null ? String(mark.label) : items[idx].label) + '</text>';
      }
    }
  }

  /* markPoint：true = 主序列最大值点；{index} 越界忽略；{value} 首个匹配 */
  let markPointSvg = '';
  if (line.markPoint !== undefined) {
    const mp: ChartMarkPoint = line.markPoint === true ? {} : line.markPoint;
    let idx = -1;
    if (mp.index !== undefined && mp.index !== null && isNum(mp.index)) {
      const candidate = Math.round(mp.index);
      if (candidate >= 0 && candidate < main.items.length) idx = candidate;
    } else if (mp.value !== undefined && mp.value !== null && isNum(mp.value)) {
      for (let i = 0; i < main.items.length; i += 1) {
        if (main.items[i].value === mp.value) {
          idx = i;
          break;
        }
      }
    } else {
      let best: number | null = null;
      main.items.forEach((item, i) => {
        if (item.value !== null && (best === null || item.value > best)) {
          best = item.value;
          idx = i;
        }
      });
    }
    if (idx >= 0 && !seriesPts[0][idx][2]) {
      const p = seriesPts[0][idx];
      const color = typeof mp.color === 'string' && mp.color !== '' ? mp.color : (main.color ?? line.color ?? DEFAULT_SERIES_COLOR);
      const ratio = (p[0] - frame.x0) / frame.w;
      const anchor = ratio < 0.18 ? 'start' : ratio > 0.82 ? 'end' : 'middle';
      const labelX = anchor === 'start' ? p[0] + 4 : anchor === 'end' ? p[0] - 4 : p[0];
      markPointSvg += '<circle class="' + STYLE_PREFIX + 'charts-markpoint" cx="' + n1(p[0]) + '" cy="' + n1(p[1])
        + '" r="4" fill="' + esc(color) + '" stroke="' + DOT_FACE_COLOR + '" stroke-width="2" vector-effect="non-scaling-stroke"/>'
        + '<text class="' + STYLE_PREFIX + 'charts-mptext" x="' + n1(labelX) + '" y="' + n1(Math.max(6, p[1] - 8))
        + '" text-anchor="' + anchor + '" fill="' + esc(color) + '">'
        + esc(mp.label !== undefined && mp.label !== null ? String(mp.label) : fmtValue(main.items[idx].value as number, line.format))
        + '</text>';
    }
  }

  const points = series.reduce((sum, s) => (
    s.avg ? sum : sum + s.items.filter((item) => item.value !== null).length
  ), 0);

  const html = containerOpen('line', line, STYLE_PREFIX + 'charts-line')
    + legendHtml(legendEntries)
    + svgOpen(line)
    + (line.grid ? gridSvg(frame, tickN) : '')
    + bandSvg
    + fillSvg
    + ticksSvg(frame, lo, hi, tickN, line.format)
    + markSvg
    + pathsSvg
    + marksSvg
    + valuesSvg
    + markPointSvg
    + xLabelsSvg(line, frame, items, 'peak', undefined, LINE_LABEL_GAP, line.labelEvery)
    + '</svg></div>';
  return { kind: 'line', html, empty: points === 0, points };
}

interface ResolvedLineOptions extends ResolvedCommon {
  readonly lineWidth: number;
  readonly dashed: boolean;
  readonly smooth: boolean;
  readonly step: boolean;
  readonly showDots: boolean;
  /** `showDots` 是否由调用方**显式**给出（缺省 `undefined` 才算未给：#424 抽稀只作用于未给时）。 */
  readonly showDotsExplicit: boolean;
  readonly dotSize: number;
  readonly dotStyle: string | undefined;
  readonly area: boolean;
  readonly areaOpacity: number;
  readonly yTicks: number | false;
  readonly connectNulls: boolean;
  /** 跨空档形态（#458，解析后恒有值，缺省 'break'）。 */
  readonly gapStyle: 'break' | 'connect' | 'dashed';
  readonly legend: boolean;
  readonly highlightLast: boolean;
  readonly avgLine: number | undefined;
  readonly markLine: ChartMarkLine | undefined;
  readonly markPoint: ChartMarkPoint | true | undefined;
  readonly band: ChartBand | undefined;
  readonly fillBetween: ChartFillBetween | undefined;
  readonly highlightPoints: 'turns' | 'crossings' | undefined;
  readonly series: readonly ChartSeries[] | undefined;
  /** X 轴标签抽稀步长（#567）：`labels:'all'` 时每 k 点标一枚（含末点）；非法值＝全标。 */
  readonly labelEvery: number | undefined;
}

