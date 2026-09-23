/** charts · coords
 *
 *  自 `src/charts.ts` 第 368–571 行原样切出。
 *
 *  **住址**：目录化批次④把 `src/charts.ts` 按段切成「族内一件一文件」，正文原样搬来；
 *  搬迁判据＝产物逐字节相同（八种图表产物 ＋ `chartsCss` ＋ helpers JS），
 *  见 `docs/base/base-render/组件目录架构.md`。
 */

import { isNum } from './shared.js';
import { ResolvedCommon } from './options.js';

/* ── 坐标（`CHART_COORD_RULE = 'viewBox-only'`） ───────────────────────── */

export interface Frame {
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
  readonly w: number;
  readonly h: number;
}

interface Insets {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

export function makeFrame(common: ResolvedCommon, insets: Insets): Frame {
  const x0 = insets.left;
  const x1 = Math.max(x0 + 1, common.width - insets.right);
  const y0 = insets.top;
  const y1 = Math.max(y0 + 1, common.height - insets.bottom);
  return { x0, x1, y0, y1, w: x1 - x0, h: y1 - y0 };
}

/** 留白进 viewBox（容器零 padding）：左留白含刻度文字宽度。
 *
 *  `minLeft`／`minBottom`（#424 返工）：折线的留白必须能容下**移动端**那一档字号——媒体查询把
 *  折线文字放大到 17–18 用户单位（见 `chartsCss` 的 ≤720px 段与 `LINE_TEXT_MOBILE`），留白却是
 *  双端共用的用户单位 → 只按桌面 9.5–10.5 估会让 390px 下的「70.5kg」顶出 viewBox 左沿。 */
export function insetsFor(common: ResolvedCommon, opts: {
  tickWidth: number;
  labelHeight: number;
  valueHeight: number;
  minLeft?: number;
  minTop?: number;
  minBottom?: number;
  minRight?: number;
}): Insets {
  const padX = common.compact ? 6 : 14;
  const padY = common.compact ? 4 : 8;
  return {
    left: Math.max(padX + opts.tickWidth, opts.minLeft ?? 0),
    /* t512 WaveC：右留白缺省只是 `padX`，横轴标签以 `text-anchor:middle` 居中落在绘图区左右沿上，
     *  首尾两条各有半个字宽探出绘图区 —— 左侧被 `minLeft`（按移动端字号估的刻度宽）顺带护住，
     *  右侧无此保护，390px 下 9 条标签的末条顶出 viewBox 右沿约 6px。调用方按需传 `minRight`。 */
    right: Math.max(padX, opts.minRight ?? 0),
    top: Math.max(padY + (common.showValues === false ? 0 : opts.valueHeight), opts.minTop ?? 0),
    bottom: Math.max(padY + opts.labelHeight, opts.minBottom ?? 0),
  };
}

/** #424 返工：移动端（≤720px）折线的字号（**用户单位**）。
 *  viewBox 580×260 在 390px 手机上按宽度缩到 scale≈0.57（`width:100%` + 按 viewBox 比例算高，
 *  见 `chartsCss` 的 ≤720px 段）——桌面档 9.5–10.5 单位实渲只剩 5.4px，肉眼不可读。
 *  这里按 1/0.57≈1.75 倍提字号，实渲回到 ≈11.3px（390px 档）。
 *
 *  t512 收尾（复审 P1）：这一档原取 20 单位（512 档盒宽 450 → 实渲 15.52px）。复审表里那句「512 档刻度
 *  **实渲** 20px ＝ 正文 1.6 倍」是**读错了量纲** —— 同一列里 820 档写 12.4、1000／1440 档写 10.8，逐值
 *  正是本文件的**用户单位**常量；实渲像素 ＝ 用户单位 × 盒宽 ÷ 580，20 单位在 512 档实渲 15.52px，
 *  约等于正文 12–13px 的 1.2 倍。复审要的实渲 14–15px 里只有 15.0px 这一点能落：往下压到 15 单位
 *  就只剩 11.64px，比正文还小，并破 #512 的「四档实渲 ≥15px」断言（`test/charts.test.mjs` 的 H.t512）。
 *  故取 15 ÷ (450/580) ＝ 19.33 → **19.4 单位**（512 档实渲 15.05px，留 0.4% 浮点余量，贴住那条下沿）。
 *  要真压到 14px，得先改 #512 的 15px 下沿（契约变更，另开票）。
 *  同一份数字既进 `chartsCss` 的媒体查询，也用来估留白（留白双端共用 → 取更大的这一档）。 */
export const LINE_TEXT_MOBILE = { tick: 19.4, xlabel: 19.4, value: 19.4, last: 19.4, mark: 19.4 } as const;

/** t512：折线族字号的**档位表**（用户单位）。
 *
 *  svg 文本的 `font-size` 写在**用户单位**上，会被 viewBox 等比缩放（`preserveAspectRatio="xMidYMid meet"`
 *  ＋ `width:100%;height:auto` → 两轴同倍），实渲像素 = 用户单位 × 缩放比，而缩放比 = svg 盒宽 ÷ 580
 *  （`LINE_DEFAULT_WIDTH`）——盒宽随视口变，所以**同一个用户单位在不同视口实渲出不同像素**。
 *  只留 ≤720px 移动档（当时 20 单位，t512 收尾收到 19.4）那一档、721px 起落回桌面档 9.5/10 单位，就会在这条断点上**非单调地跳**：
 *  720px 档盒宽 652 → 实渲 22.5px，721px 档盒宽 651 只剩 10.7px，再往宽走才慢慢回到 15px。
 *
 *  逐档补偿的算式：**用户单位 = 目标像素 ÷ 该档实测缩放比**。
 *  缩放比取自 `docs/base/base-render/` 下 t507 证据的 CDP 四档实测（盒宽 ÷ 580）：
 *  512px → 盒 450×201.72 → 0.7759；820px → 750×336.20 → 1.2931；1000px／1440px → 930×416.89 → 1.6034
 *  （930 是卡片宽度上限，故 1000px 与 1440px 同档、实渲同值）。
 *
 *  三档结果（`chartsCss` 的 ≤720px／721–875px／≥876px 三段逐字用这三个数）：
 *  19.4 单位 → 15.05px（512px，t512 收尾前是 20 单位 → 15.5px）；12.4 单位 → 16.0px（820px）；
 *  10.8 单位 → 17.3px（1000px／1440px）—— 四档**单调不降且 ≥15px**，不再随盒子宽度来回跳。
 *
 *  **不变式（别越）**：任何档位的用户单位都不得超过 `LINE_TEXT_MOBILE.tick`（19.4）。
 *  `insetsFor` 的左留白是按**移动档那一档（19.4 单位）**估的（`charts.ts:843`，留白是双端共用的用户单位），
 *  抬高它会让「70.5kg」这类刻度文字在**每个**视口都顶出 viewBox 左沿。故本表只抬中间档与宽档。
 *
 *  **已知余量（如实记账）**：媒体查询只能按**视口**分档，而缩放比按**盒宽**走，同一档内仍是变化的
 *  —— 721–875px 档的下沿（721px）实渲 14.0px、上沿（875px）17.2px；这是视口分档的固有锯齿，
 *  比改前同一段的 10.7–13.9px 已经抬高，要再抹平得按容器宽分档（另一票的事）。 */
export const LINE_TEXT_WIDE_UNITS = 12.4;
export const LINE_TEXT_FULL_UNITS = 10.8;
/** ≥876px 档的媒体查询下沿：由 `LINE_TEXT_FULL_UNITS` 的 ≥15px 要求**反解**得到——
 *  缩放比须 ≤ 15 ÷ 10.8 = 1.3889 → 盒宽 ≤ 1.3889 × 580 = 805.6 → 视口 ≤ 875.6，取下沿 876。 */
export const LINE_TEXT_WIDE_MAX_PX = 875;

/** 折线 X 标签行相对绘图区底边（`frame.y1`）的间距（用户单位）。最低那条刻度文字已抬到轴线上方
 *  （见 `ticksSvg` 的 `labelDy`），其文字盒下沿到 y1 附近；X 标签（19.4 单位）文字盒上沿顶在
 *  y1+gap−21 附近 —— gap ≥ 33 才不相撞（本条按 20 单位算出的下限，t512 收尾改小后仍富余；
 *  实测 gap 34 时 390px 下余 ≈4.5 用户单位）。 */
export const LINE_LABEL_GAP = 34;
/** 折线绘图区底留白下限：容下 `LINE_LABEL_GAP` + X 标签降部（19.4×0.25 = 4.9）。 */
export const LINE_BOTTOM_MIN = 40;
/** 末值标签相对末点的抬升（用户单位）：文字盒高随字号走（移动端 19.4 单位那一档），抬 6 单位时
 *  390px 下标签盒底与数据线只余 0.4px、15 个折线顶点落在盒内 —— 按 0.7×字号 抬开（0.7×19.4 = 13.6，
 *  取值 14 仍在 0.7× 之上，改字号后一字未动）。 */
export const LINE_LAST_LABEL_LIFT = 14;
/** t512（最后一公里）· 折线族顶上那两条硬账。
 *
 *  ① **顶端刻度标注得在框里**：刻度文字的落点是 `y = ty + labelDy`（基线），实渲文字盒高约 1.33em、
 *     基线以上约占 1.04em —— 顶端那条刻度（`i = count−1`，`ty = frame.y0`）的盒子因此探出 viewBox
 *     上沿被裁（复审实测 1000／1440 档 `relTop = −0.36px`、512 档 −7.47px）。留白旧口径只认
 *     `padY + valueHeight`（`showValues:false` 时仅 8 单位），而字号在 ≤720px 档是 19.4 单位（原 20）
 *     ⇒ 需要的上沿就是那 1.04em。留白是双端共用的**用户单位**，故按**最大那一档字号**
 *     （`LINE_TEXT_MOBILE.tick = 19.4`）算：ceil(1.04 × 19.4) = ceil(20.18) = 21 单位
 *     （20 单位时同为 21），四档一律够。
 *  ② **峰值与顶端刻度线的余量**：派生域旧口径两端各外扩 6%（`domainOf`）⇒ 峰值只离顶端刻度线
 *     5.36% 的绘图区高，顶端那条线读成「标题下划线」（复审 §三-2：图高 416.89px、顶线在 12.83px、
 *     512 档峰值墨顶离顶线只剩 6.13px）。`LINE_PEAK_HEADROOM` 把**上端**补到绘图区高的 10%
 *     （复审给的判据是 8–12%），下端 6% 不动。显式 `yMax` 是调用方的语义（「画到这儿」），不补。 */
export const LINE_TICK_TOP_MIN = 21;
const LINE_PEAK_HEADROOM = 0.1;

/** 文字宽度估值（用户单位）：ASCII ≈0.62em、CJK 全角 ≈1em。刻度留白按它算——留白必须容下
 *  **移动端那一档字号**，否则 390px 下「70.5kg」会顶出 viewBox 左沿（`overflow:visible` 也救不了，
 *  卡片会裁）。 */
export function textWidthUnits(text: string, size: number): number {
  let em = 0;
  for (const ch of text) em += (ch.codePointAt(0) ?? 0) > 0x2e7f ? 1 : 0.62;
  return em * size;
}

export function xAt(frame: Frame, index: number, count: number): number {
  return count <= 1 ? frame.x0 + frame.w / 2 : frame.x0 + (frame.w * index) / (count - 1);
}

export function yAt(frame: Frame, value: number, lo: number, hi: number): number {
  const span = hi - lo === 0 ? 1 : hi - lo;
  return frame.y1 - ((value - lo) / span) * frame.h;
}

/** 共享 Y 域：显式 `yMin`／`yMax` 优先，否则数据域各外扩 `padRatio`。
 *  折线／散点旧版外扩 6%（`charts.js:428-432`／`856-859`）；**柱族与 combo 旧版无外扩**
 *  （bar 域 = `min(v,0)..max(v)`，`charts.js:371-373`；combo 域 = `0..max(柱,线)`，`charts.js:742-753`）
 *  → 这两族传 `0`，否则零基线悬空、最高柱不满高（R2-N1）。 */
export function domainOf(
  values: readonly number[],
  yMin: number | undefined,
  yMax: number | undefined,
  includeZero: boolean,
  padRatio = 0.06,
): readonly [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of values) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (lo === Infinity) {
    lo = 0;
    hi = 1;
  }
  if (includeZero) {
    if (lo > 0) lo = 0;
    if (hi < 0) hi = 0;
  }
  if (hi === lo) hi = lo + 1;
  const pad = (hi - lo) * padRatio;
  if (yMin === undefined) lo -= pad;
  else lo = yMin;
  if (yMax === undefined) hi += pad;
  else hi = yMax;
  if (hi === lo) hi = lo + 1;
  return [lo, hi];
}

/** `yTicks` 统一为 2-6（旧 `charts.js:498`）；`false`／非数 → 0 条。 */
export function tickCount(value: number | false | undefined): number {
  if (!isNum(value)) return 0;
  return Math.max(2, Math.min(6, Math.round(value)));
}

/** t512：折线族的**共享派生域** —— `domainOf` 之上再保一条峰值余量（见 `LINE_PEAK_HEADROOM`）。
 *
 *  只动**派生**路径：显式 `yMin`／`yMax` 是调用方的语义（域的边界＝「画到这儿」），原样返回。
 *  上端的求法：解 `(hi′ − max) / (hi′ − lo) = r` → `hi′ = (max − r·lo) / (1 − r)`；取下端不动
 *  （`lo` 仍是 6% 外扩后的值），故上端比下端厚，峰值不会再压在顶端那条刻度线上。
 *  单值／全等数据（`domainOf` 内部已把 `hi` 抬到 `lo + 1`）时 `want` 不会超过原 `hi`，`Math.max` 兜住。 */
export function lineDomainOf(
  values: readonly number[],
  yMin: number | undefined,
  yMax: number | undefined,
): readonly [number, number] {
  const range = domainOf(values, yMin, yMax, false);
  if (yMax !== undefined) return range;
  let max = -Infinity;
  for (const v of values) if (v > max) max = v;
  if (max === -Infinity) return range;
  const want = (max - LINE_PEAK_HEADROOM * range[0]) / (1 - LINE_PEAK_HEADROOM);
  return [range[0], Math.max(range[1], want)];
}

