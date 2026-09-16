/** base-paint/charts：#78 图表层运行时（契约 §3.5／§6.5）。
 *
 * 实施冻结面里 #78 的三条运行时出口：`charts`（8 方法）／`buildChartsHelpersJs`；
 * `ChartError` 与本文件**不**从 `src/index.ts` 导出（冻结面 44 条内无该运行时条目，
 * 与 `TemplateError`／`ControlsError` 同口径：调用方按 `name === 'ChartError'` ＋ `code` 判定）。
 *
 * 三条硬边界（逐条对齐 §3.5／§6.5，违反即红）：
 *  1. **纯 CSS + SVG 字符串**（§3.5.1「工程约束」）：无 `<canvas>`、无产出内联 `<script>`／`onclick=`、
 *     无 `node:`、零第三方；交互一律走 `actionId`（渲染期写入 `ACTION_ID_ATTR`）。
 *  2. **模块自身零 DOM**（R8）：本文件代码里不出现 `document.`／`window.`／`globalThis.`——
 *     DOM 只允许出现在 `buildChartsHelpersJs` **产出的 JS 文本**里（`SHARED_HELPERS_JS_RULE.domAllowed`）。
 *  3. **坐标唯一**（`CHART_COORD_RULE = 'viewBox-only'`）：容器零 padding（CSS 里 `.…-charts{padding:0}`），
 *     留白全部进 viewBox；描边元素带 `vector-effect="non-scaling-stroke"`。
 *     旧版「SVG viewBox ＋ HTML 百分比覆盖层」双层体系（`charts.js:560,572,583,604,618,645,649,870`）
 *     与 DOM 校准（`charts.js:779-795`）**不复刻**（R19）——新实现把数据点／数值／刻度／标注
 *     全部放进同一 viewBox，物理对齐由同一映射函数保证。
 *
 * 选项级语义（契约登记为「不冻结也不排除」，owner = #78）以 `docs/research/t92-old-v130-signatures.md:162-178`
 * 与 `.scratch/t78/old-baseline.md` §2 旧行为为准，逐字段在 `.scratch/t78/a1-evidence.md` 对照。
 *
 * 文档未规定处的取值（本文显式记账，不留暗猜）：
 *  - 各 kind 缺省 viewBox 尺寸（旧版桌面缺省高度：柱／组合 170、折线 210、donut 150、gauge 170×105、
 *    sparkline 90×30；`old-baseline.md` §3.2）与折线点直径 7、scatter 点直径 9（旧 `dotSize||9`）；
 *  - 空态默认文案 = 冻结 `STATUS_DEFAULT_TEXT.empty`（旧版「暂无数据」；不新造第二份文案常量），
 *    图标 📊 与提示「有记录后自动生成图表」沿用旧基线（纯 UI 文案，非契约常量）；
 *  - `dotStyle`／`line.dotSize`／`combo.tooltip` 旧版是死参数，按 R21 实现为**新能力**：
 *    `dotStyle` = 数据点内联 `style` 文本（逐点样式覆盖），`dotSize` = 点直径，`tooltip` = `data-tip` 数据属性；
 *  - `avgLine(n)` = 旧语义的**均线序列**（窗口统一为 `3..items.length`，`old-baseline.md` §2.2），
 *    不是水平线；`emptyText`／`compact`／`bar.grid` 旧版是死参数，按冻结类型补齐为有效选项；
 *  - `prefix` 覆盖只影响 `buildChartsHelpersJs` **产出的 CSS 文本**；`charts.*` 产出的 HTML 恒用
 *    `STYLE_PREFIX` 命名空间（与 `SharedHelpersInput.dataAttr` 覆盖口径同构，不一致由调用方自负）。
 */

import { escapeHtml } from './contract.js';
import { renderEmptyState } from './controls.js';
import { STYLE_PREFIX } from './style.js';
import { ACTION_ID_ATTR, CHART_BREAKPOINTS, CHART_PALETTE, CHARTS_STYLE_ID, STATUS_DEFAULT_TEXT } from './spec/index.js';
import type {
  BarChartInput,
  BarChartOptions,
  BuildChartsHelpersJs,
  ChartBand,
  ChartCommonOptions,
  ChartErrorCode,
  ChartFillBetween,
  ChartItem,
  ChartKind,
  ChartMarkLine,
  ChartMarkPoint,
  ChartOutput,
  ChartsApi,
  ChartsHelpersInput,
  ChartSeries,
  ComboChartInput,
  ComboChartOptions,
  DonutChartInput,
  DonutChartOptions,
  GaugeChartInput,
  GaugeChartOptions,
  LineChartInput,
  LineChartOptions,
  ProgressChartInput,
  ProgressChartOptions,
  ScatterChartInput,
  ScatterChartOptions,
  ScatterItem,
  SparklineChartInput,
  SparklineChartOptions,
} from './spec/index.js';

const LF = String.fromCharCode(10);

/* ── 错误形态（§3.5：与 `TemplateError`／`ControlsError` 并列、互不继承、一律抛出、不返空） ── */

/** 图表层错误。**不**从 `src/index.ts` 导出：调用方按 `name === 'ChartError'` ＋ `code` 判定。 */
export class ChartError extends Error {
  readonly code: ChartErrorCode;

  constructor(code: ChartErrorCode, message: string) {
    super(message);
    this.name = 'ChartError';
    this.code = code;
  }
}

function badStructure(message: string): never {
  throw new ChartError('structure-invalid', message);
}

function badPct(message: string): never {
  throw new ChartError('pct-invalid', message);
}

function badKind(kind: string): never {
  throw new ChartError('kind-unknown', 'charts: 未知图表 kind：' + kind);
}

/* ── 小件 ─────────────────────────────────────────────────────────────── */

function esc(value: string): string {
  return escapeHtml(value);
}

function jsStr(value: string): string {
  return JSON.stringify(value);
}

function isPlainObject(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNum(value: unknown): value is number {
  return typeof value === 'number' && isFinite(value);
}

function numOr(value: unknown, fallback: number): number {
  return isNum(value) ? value : fallback;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** 数值文本（旧 `_fmt`：函数格式化器优先，否则 `String(值)`）。 */
function fmtValue(value: number, format: ((v: number) => string) | undefined): string {
  if (typeof format === 'function') return String(format(value));
  return String(round2(value));
}

/** 坐标文本（旧版 `toFixed(1)` 口径）。 */
function n1(value: number): string {
  return value.toFixed(1);
}

/** 缺省单序列色（旧版 `var(--blue,#007aff)` 带 fallback，§3.5 语义色）。 */
const DEFAULT_SERIES_COLOR = 'var(--blue,#007aff)';
const DEFAULT_MARK_COLOR = '#ff9500';
const DEFAULT_REGRESSION_COLOR = '#ff3b30';
const ANOMALY_COLOR = CHART_PALETTE[3];
const UP_COLOR = 'var(--ok,#34c759)';
const DOWN_COLOR = CHART_PALETTE[3];
const GRID_COLOR = 'var(--line,#d2d2d7)';
const MUTED_COLOR = 'var(--fg3,#86868b)';
const DOT_FACE_COLOR = 'var(--card,#ffffff)';
const DOT_DEFAULT_PX = 7;
const SCATTER_DOT_DEFAULT_PX = 9;
/** 折线数据点抽稀上限（#424）：`showDots` **未显式给**且点数超过它时不逐点画圆——
 *  逐点画必重叠成一团（90 点 / 580 单位宽 → 点距 6.1，圆径 7）。显式 `showDots` 一律照办。 */
const DOT_STRIDE_MAX = 30;
/** scatter 缺省 Y 轴刻度条数（旧 `charts.js:854` `yTicks:4`；冻结 `ScatterChartOptions` 无该字段，
 *  故按**缺省行为**渲染 4 条、不新增可关闭开关——登记为契约缺口，归后续票，R2-G1 裁定）。 */
const SCATTER_Y_TICKS = 4;
const EMPTY_ICON = '📊';
const EMPTY_HINT = '有记录后自动生成图表';
const DONUT_ZERO_HINT = '合计为零, 无环形数据';
const OWN_SCALE_NOTE = '各指标独立刻度';
/** 水平网格线**无 Y 轴标注时**的条数（#512：有标注时改按标注条数画，见 `gridSvg`）。 */
const GRID_LINES = 3;

/** 稳定 32 位散列（FNV-1a）——渐变 `<linearGradient id>` 由**渐变参数**派生，
 *  同一输入恒得同一 id、不同参数得不同 id，且**不跨调用共享可变状态**（R1-A1／FX-78-A1b-11）。 */
function hash32(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/* ── 输入校验（`CHART_STRUCTURE_RULE = 'throw'`） ──────────────────────── */

function requireObject(value: unknown, field: string): Record<string, unknown> {
  if (!isPlainObject(value)) badStructure(field + ' 必须是对象');
  return value as Record<string, unknown>;
}

/** 统一数据形状校验：`items` 非数组／缺 `label`／`value` 非法 → `structure-invalid`。
 *  `mode = 'values'` 用于 bar 的 stacked／grouped 多值路径：`values` 是多值真相源，
 *  但 `value` **不豁免**——冻结类型 `ChartItem.value` 必填，且 `docs/base-paint-contract.md:799`
 *  要求「`value` 非法（非数且非 null）→ 抛 `structure-invalid`」；旧 `_barMulti` 的宽松行为
 *  （静默置 0）不复刻（R1-A2／FX-78-A1b-12，记账见 a1-evidence.md）。 */
function normalizeItems(raw: unknown, kind: ChartKind, allowNull: boolean, mode: 'value' | 'values' = 'value'): ChartItem[] {
  if (!Array.isArray(raw)) {
    badStructure('charts.' + kind + ': items 必须是数组, 收到 ' + (raw === null ? 'null' : typeof raw));
  }
  const list = raw as readonly unknown[];
  return list.map((entry, i) => {
    const field = 'charts.' + kind + ': items[' + i + ']';
    const item = requireObject(entry, field);
    if (typeof item.label !== 'string' || item.label.trim() === '') badStructure(field + '.label 缺失');
    const value = item.value;
    let values: readonly number[] | undefined;
    if (mode === 'values') {
      if (!isNum(value)) {
        badStructure(field + '.value 无效（缺省/非数字）: ' + JSON.stringify(value === undefined ? null : value));
      }
      if (!Array.isArray(item.values) || item.values.length === 0) badStructure(field + '.values 必须是非空数组');
      values = (item.values as readonly unknown[]).map((v, j) => {
        if (!isNum(v)) badStructure(field + '.values[' + j + '] 无效（缺省/非数字）');
        return v;
      });
    } else {
      if (!(value === null && allowNull) && !isNum(value)) {
        badStructure(field + '.value 无效（缺省/非数字）: ' + JSON.stringify(value === undefined ? null : value));
      }
      if (item.values !== undefined) {
        if (!Array.isArray(item.values) || item.values.length === 0) badStructure(field + '.values 必须是非空数组');
        values = (item.values as readonly unknown[]).map((v, j) => {
          if (!isNum(v)) badStructure(field + '.values[' + j + '] 无效（缺省/非数字）');
          return v;
        });
      }
    }
    const color = typeof item.color === 'string' && item.color !== '' ? item.color : undefined;
    const out: ChartItem = {
      label: item.label,
      value: mode === 'values' ? (value as number) : value === null ? null : (value as number),
      ...(color === undefined ? {} : { color }),
      ...(values === undefined ? {} : { values }),
      ...(item.anomaly === true ? { anomaly: true } : {}),
    };
    return out;
  });
}

/** `pct` 非数 → `pct-invalid`；超界统一为 0~100（旧 §6.5 逐字行为）。 */
function normalizePct(raw: unknown, kind: ChartKind): number {
  if (!isNum(raw)) badPct('charts.' + kind + ': pct 无效: ' + String(raw));
  return Math.max(0, Math.min(100, raw));
}

/* ── 通用选项（`ChartCommonOptions`） ──────────────────────────────────── */

type LabelsMode = 'edge' | 'all' | 'none' | 'select';

/** 数值标签模式（#567 起含 `'last'`：只标最后一个有效点）。 */
type ShowValuesMode = boolean | 'edge' | 'last';

interface ResolvedCommon {
  readonly width: number;
  readonly height: number;
  readonly compact: boolean;
  readonly animation: boolean;
  readonly color: string | undefined;
  readonly colors: readonly string[] | undefined;
  readonly format: ((value: number) => string) | undefined;
  readonly labels: LabelsMode;
  readonly showValues: ShowValuesMode;
  readonly labelRotate: number;
  readonly yMin: number | undefined;
  readonly yMax: number | undefined;
  readonly grid: boolean;
  readonly actionId: string | undefined;
  readonly tooltip: boolean;
}

interface CommonDefaults {
  readonly width: number;
  readonly height: number;
  readonly labels: LabelsMode;
  readonly showValues: ShowValuesMode;
}

function resolveCommon(raw: unknown, def: CommonDefaults): ResolvedCommon {
  const o = isPlainObject(raw) ? (raw as ChartCommonOptions) : undefined;
  const labels = o === undefined ? undefined : o.labels;
  const showValues = o === undefined ? undefined : o.showValues;
  return {
    width: numOr(o === undefined ? undefined : o.width, def.width),
    height: numOr(o === undefined ? undefined : o.height, def.height),
    compact: o !== undefined && o.compact === true,
    animation: o === undefined || o.animation !== false,
    color: o !== undefined && typeof o.color === 'string' && o.color !== '' ? o.color : undefined,
    colors: o !== undefined && Array.isArray(o.colors)
      ? o.colors.filter((c): c is string => typeof c === 'string' && c !== '')
      : undefined,
    format: o !== undefined && typeof o.format === 'function' ? o.format : undefined,
    labels: labels === 'all' || labels === 'none' || labels === 'select' || labels === 'edge' ? labels : def.labels,
    showValues: showValues === true || showValues === false || showValues === 'edge' || showValues === 'last' ? showValues : def.showValues,
    labelRotate: numOr(o === undefined ? undefined : o.labelRotate, 0),
    yMin: o !== undefined && isNum(o.yMin) ? o.yMin : undefined,
    yMax: o !== undefined && isNum(o.yMax) ? o.yMax : undefined,
    grid: o === undefined || o.grid !== false,
    actionId: o !== undefined && typeof o.actionId === 'string' && o.actionId !== '' ? o.actionId : undefined,
    tooltip: o !== undefined && o.tooltip === true,
  };
}

function commonClasses(common: ResolvedCommon, extra?: string): string {
  const cls = [STYLE_PREFIX + 'charts'];
  if (extra !== undefined) cls.push(extra);
  if (common.animation) cls.push(STYLE_PREFIX + 'charts-anim');
  return cls.join(' ');
}

function containerOpen(kind: ChartKind, common: ResolvedCommon, extraClass?: string): string {
  let out = '<div class="' + commonClasses(common, extraClass) + '" data-chart-kind="' + kind + '"';
  if (common.actionId !== undefined) out += ' ' + ACTION_ID_ATTR + '="' + esc(common.actionId) + '"';
  return out + '>';
}

function actionAttrs(common: ResolvedCommon, index?: number): string {
  let out = '';
  if (common.actionId !== undefined) out += ' ' + ACTION_ID_ATTR + '="' + esc(common.actionId) + '"';
  if (index !== undefined) out += ' data-i="' + index + '"';
  return out;
}

/** `tooltip: true` 时写入 `data-tip`；文本**惰性**求值（未开 tooltip 不得白调 `format`）。 */
function tipAttrs(common: ResolvedCommon, makeText: () => string): string {
  return common.tooltip ? ' data-tip="' + esc(makeText()) + '"' : '';
}

/** 八个 kind **一律** `preserveAspectRatio="xMidYMid meet"`（等比，不拉伸文字）。
 *
 *  #507（2026-09-15 公共层视觉机制返工）撤掉了折线／组合／散点三族的 `none` 满宽拉伸：
 *  这三族当年取 `none` 的**唯一理由是**移动端 CSS 把 svg 盒高钉成 `lineHeightMobilePx`（150px），
 *  非等比压低后 `meet` 会等比缩到 228.6px 宽、左右各留 ~73px 空白（R2-N9）。那条钉高在
 *  #424 返工时就撤了（改成 `height:auto` 按 viewBox 长宽比派生高度，见 `chartsCss` 的 ≤720px 段），
 *  **盒宽高比自此恒等于 viewBox 长宽比** ⇒ `none` 与 `meet` 逐像素同解，`none` 只剩两个隐患：
 *  ① 将来任一处把盒高钉回固定 px，图内文字立刻被横向抻宽（1000px 宽容器下 1.6×，字脸变扁）；
 *  ② 读代码的人会以为本族真的在拉伸。
 *  **本条只改属性，不改任何坐标**：坐标唯一性走 `CHART_COORD_RULE = 'viewBox-only'`（映射函数
 *  按 `common.width/height` 算，`meet` 与 `none` 下同一份坐标同解）。描边的
 *  `vector-effect="non-scaling-stroke"` 照旧保留（等比缩放下同样有用：描边不随缩放变粗）。 */
function svgOpen(common: ResolvedCommon, extra?: string): string {
  return '<svg class="' + STYLE_PREFIX + 'charts-svg' + (extra === undefined ? '' : ' ' + extra) + '"'
    + ' viewBox="0 0 ' + n1(common.width) + ' ' + n1(common.height) + '"'
    + ' preserveAspectRatio="xMidYMid meet" role="img" focusable="false">';
}

/** 空态联动（`CHART_EMPTY_RULE = 'emptyState'`）：`empty:true`／`points:0`，不抛错。 */
function emptyOutput(kind: ChartKind, raw: unknown, hint?: string): ChartOutput {
  const o = isPlainObject(raw) ? (raw as ChartCommonOptions) : undefined;
  const text = o !== undefined && typeof o.emptyText === 'string' && o.emptyText !== ''
    ? o.emptyText
    : STATUS_DEFAULT_TEXT.empty;
  const common = resolveCommon(raw, { width: 1, height: 1, labels: 'none', showValues: false });
  const html = '<div class="' + commonClasses(common, STYLE_PREFIX + 'charts-' + kind + ' ' + STYLE_PREFIX + 'charts-empty')
    + '" data-chart-kind="' + kind + '" data-chart-empty="1">'
    + renderEmptyState({ icon: EMPTY_ICON, text, hint: hint === undefined ? EMPTY_HINT : hint })
    + '</div>';
  return { kind, html, empty: true, points: 0 };
}

/* ── 坐标（`CHART_COORD_RULE = 'viewBox-only'`） ───────────────────────── */

interface Frame {
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

function makeFrame(common: ResolvedCommon, insets: Insets): Frame {
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
function insetsFor(common: ResolvedCommon, opts: {
  tickWidth: number;
  labelHeight: number;
  valueHeight: number;
  minLeft?: number;
  minTop?: number;
  minBottom?: number;
}): Insets {
  const padX = common.compact ? 6 : 14;
  const padY = common.compact ? 4 : 8;
  return {
    left: Math.max(padX + opts.tickWidth, opts.minLeft ?? 0),
    right: padX,
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
const LINE_TEXT_MOBILE = { tick: 19.4, xlabel: 19.4, value: 19.4, last: 19.4, mark: 19.4 } as const;

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
const LINE_TEXT_WIDE_UNITS = 12.4;
const LINE_TEXT_FULL_UNITS = 10.8;
/** ≥876px 档的媒体查询下沿：由 `LINE_TEXT_FULL_UNITS` 的 ≥15px 要求**反解**得到——
 *  缩放比须 ≤ 15 ÷ 10.8 = 1.3889 → 盒宽 ≤ 1.3889 × 580 = 805.6 → 视口 ≤ 875.6，取下沿 876。 */
const LINE_TEXT_WIDE_MAX_PX = 875;

/** 折线 X 标签行相对绘图区底边（`frame.y1`）的间距（用户单位）。最低那条刻度文字已抬到轴线上方
 *  （见 `ticksSvg` 的 `labelDy`），其文字盒下沿到 y1 附近；X 标签（19.4 单位）文字盒上沿顶在
 *  y1+gap−21 附近 —— gap ≥ 33 才不相撞（本条按 20 单位算出的下限，t512 收尾改小后仍富余；
 *  实测 gap 34 时 390px 下余 ≈4.5 用户单位）。 */
const LINE_LABEL_GAP = 34;
/** 折线绘图区底留白下限：容下 `LINE_LABEL_GAP` + X 标签降部（19.4×0.25 = 4.9）。 */
const LINE_BOTTOM_MIN = 40;
/** 末值标签相对末点的抬升（用户单位）：文字盒高随字号走（移动端 19.4 单位那一档），抬 6 单位时
 *  390px 下标签盒底与数据线只余 0.4px、15 个折线顶点落在盒内 —— 按 0.7×字号 抬开（0.7×19.4 = 13.6，
 *  取值 14 仍在 0.7× 之上，改字号后一字未动）。 */
const LINE_LAST_LABEL_LIFT = 14;
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
const LINE_TICK_TOP_MIN = 21;
const LINE_PEAK_HEADROOM = 0.1;

/** 文字宽度估值（用户单位）：ASCII ≈0.62em、CJK 全角 ≈1em。刻度留白按它算——留白必须容下
 *  **移动端那一档字号**，否则 390px 下「70.5kg」会顶出 viewBox 左沿（`overflow:visible` 也救不了，
 *  卡片会裁）。 */
function textWidthUnits(text: string, size: number): number {
  let em = 0;
  for (const ch of text) em += (ch.codePointAt(0) ?? 0) > 0x2e7f ? 1 : 0.62;
  return em * size;
}

function xAt(frame: Frame, index: number, count: number): number {
  return count <= 1 ? frame.x0 + frame.w / 2 : frame.x0 + (frame.w * index) / (count - 1);
}

function yAt(frame: Frame, value: number, lo: number, hi: number): number {
  const span = hi - lo === 0 ? 1 : hi - lo;
  return frame.y1 - ((value - lo) / span) * frame.h;
}

/** 共享 Y 域：显式 `yMin`／`yMax` 优先，否则数据域各外扩 `padRatio`。
 *  折线／散点旧版外扩 6%（`charts.js:428-432`／`856-859`）；**柱族与 combo 旧版无外扩**
 *  （bar 域 = `min(v,0)..max(v)`，`charts.js:371-373`；combo 域 = `0..max(柱,线)`，`charts.js:742-753`）
 *  → 这两族传 `0`，否则零基线悬空、最高柱不满高（R2-N1）。 */
function domainOf(
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
function tickCount(value: number | false | undefined): number {
  if (!isNum(value)) return 0;
  return Math.max(2, Math.min(6, Math.round(value)));
}

/** t512：折线族的**共享派生域** —— `domainOf` 之上再保一条峰值余量（见 `LINE_PEAK_HEADROOM`）。
 *
 *  只动**派生**路径：显式 `yMin`／`yMax` 是调用方的语义（域的边界＝「画到这儿」），原样返回。
 *  上端的求法：解 `(hi′ − max) / (hi′ − lo) = r` → `hi′ = (max − r·lo) / (1 − r)`；取下端不动
 *  （`lo` 仍是 6% 外扩后的值），故上端比下端厚，峰值不会再压在顶端那条刻度线上。
 *  单值／全等数据（`domainOf` 内部已把 `hi` 抬到 `lo + 1`）时 `want` 不会超过原 `hi`，`Math.max` 兜住。 */
function lineDomainOf(
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

/* ── 共享 SVG 片段 ────────────────────────────────────────────────────── */

function gridSvg(frame: Frame, count = 0): string {
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

function ticksSvg(frame: Frame, lo: number, hi: number, count: number, format: ((v: number) => string) | undefined): string {
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
function xLabelsSvg(
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
function valueIndexes(mode: ShowValuesMode, frame: Frame, items: readonly ChartItem[]): readonly number[] {
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

function legendHtml(entries: readonly { readonly name: string; readonly color: string; readonly note?: string }[], placement?: string): string {
  if (entries.length === 0) return '';
  const cls = STYLE_PREFIX + 'charts-legend' + (placement === undefined ? '' : ' ' + STYLE_PREFIX + 'charts-legend-' + placement);
  return '<div class="' + cls + '">' + entries.map((entry) => {
    const swatch = entry.note === undefined
      ? '<span class="' + STYLE_PREFIX + 'charts-legend-swatch" style="background:' + esc(entry.color) + '"></span>'
      : '<span class="' + STYLE_PREFIX + 'charts-legend-swatch ' + STYLE_PREFIX + 'charts-legend-swatch-dashed"></span>';
    return '<span class="' + STYLE_PREFIX + 'charts-legend-item">' + swatch + esc(entry.name) + '</span>';
  }).join('') + '</div>';
}

/* ── line ─────────────────────────────────────────────────────────────── */

type Pt = readonly [number, number, boolean];

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

function polyPath(pts: readonly Pt[], connect: boolean): string {
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

function renderLine(raw: LineChartInput): ChartOutput {
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
  const frame = makeFrame(line, insetsFor(line, {
    tickWidth: tickN === 0 ? 0 : (line.compact ? 16 : 22),
    labelHeight: line.labels === 'none' ? 0 : (line.compact ? 10 : 14),
    valueHeight: line.compact ? 9 : 12,
    minLeft: tickN === 0 ? 0 : Math.ceil(tickTextW) + 9,
    minTop: tickN === 0 ? 0 : LINE_TICK_TOP_MIN,
    minBottom: line.labels === 'none' ? 0 : LINE_BOTTOM_MIN,
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

function renderBar(raw: BarChartInput): ChartOutput {
  const input = requireObject(raw, 'charts.bar: input');
  const common = resolveCommon(input.options, { width: 320, height: 170, labels: 'all', showValues: true });
  const opts = isPlainObject(input.options) ? (input.options as BarChartOptions) : undefined;
  const stacked = opts !== undefined && opts.stacked === true;
  const grouped = !stacked && opts !== undefined && opts.grouped === true;
  const multi = stacked || grouped;
  const items = normalizeItems(input.items, 'bar', false, multi ? 'values' : 'value');
  if (items.length === 0) return emptyOutput('bar', input.options);
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

/* ── donut ────────────────────────────────────────────────────────────── */

function renderDonut(raw: DonutChartInput): ChartOutput {
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

/* ── progress ─────────────────────────────────────────────────────────── */

function renderProgress(raw: ProgressChartInput): ChartOutput {
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

/* ── combo ────────────────────────────────────────────────────────────── */

function renderCombo(raw: ComboChartInput): ChartOutput {
  const input = requireObject(raw, 'charts.combo: input');
  const common = resolveCommon(input.options, { width: 320, height: 170, labels: 'all', showValues: true });
  const opts = isPlainObject(input.options) ? (input.options as ComboChartOptions) : undefined;
  const bars = normalizeItems(input.bars, 'combo', false);
  const lines = normalizeItems(input.lines, 'combo', false);
  if (bars.length === 0 && lines.length === 0) return emptyOutput('combo', input.options);
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

/* ── sparkline ────────────────────────────────────────────────────────── */

function renderSparkline(raw: SparklineChartInput): ChartOutput {
  const input = requireObject(raw, 'charts.sparkline: input');
  const common = resolveCommon(input.options, { width: 90, height: 30, labels: 'none', showValues: false });
  const opts = isPlainObject(input.options) ? (input.options as SparklineChartOptions) : undefined;
  const items = normalizeItems(input.items, 'sparkline', false);
  if (items.length === 0) return emptyOutput('sparkline', input.options);

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

/* ── gauge ────────────────────────────────────────────────────────────── */

function renderGauge(raw: GaugeChartInput): ChartOutput {
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

function renderScatter(raw: ScatterChartInput): ChartOutput {
  const input = requireObject(raw, 'charts.scatter: input');
  const common = resolveCommon(input.options, { width: 320, height: 180, labels: 'edge', showValues: false });
  const opts = isPlainObject(input.options) ? (input.options as ScatterChartOptions) : undefined;
  const items = normalizeScatterItems(input.items);
  if (items.length === 0) return emptyOutput('scatter', input.options);

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

/* ── 派发表（R15：未命中 → `kind-unknown`） ───────────────────────────── */

/** 派发表逐键绑定 `ChartsApi` 的**方法签名**（入参取 `Parameters<ChartsApi[K]>[0]`）：
 *  各渲染函数按冻结输入类型标注，键与函数错配／入参或返回类型写错都是**编译期**红，
 *  不再用 `as ChartsApi` 断言掩盖 8 方法各自的入参类型（R1-B3／FX-78-A1b-15）。 */
type ChartDispatch = { readonly [K in ChartKind]: (input: Parameters<ChartsApi[K]>[0]) => ChartOutput };

const CHART_DISPATCH = {
  bar: renderBar,
  line: renderLine,
  donut: renderDonut,
  progress: renderProgress,
  combo: renderCombo,
  sparkline: renderSparkline,
  gauge: renderGauge,
  scatter: renderScatter,
} satisfies ChartDispatch;

const PROXY_SAFE_KEYS = ['then', 'toJSON', 'inspect', 'constructor', 'toString', 'valueOf', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString'];

/** 冻结签名：`ChartsApi`（8 方法，去掉旧 `el` 参数，DOM 由调用方挂载）。
 *  派表按 `ChartKind` 键入（`satisfies ChartDispatch` 已在编译期校验 8 个键与签名）；
 *  **JS 调用方**访问表外 key（如 `charts['pie']`）→ 调用即抛 `ChartError` code `kind-unknown`
 *  （类型层不可达，R15）。导出类型 = 冻结 `ChartsApi`，**不用 `as` 断言**（FX-78-A1b-15）。 */
export const charts: ChartsApi = new Proxy(CHART_DISPATCH, {
  get(target, prop, receiver) {
    if (typeof prop === 'string' && !Object.prototype.hasOwnProperty.call(target, prop)
      && !PROXY_SAFE_KEYS.includes(prop)) {
      return (): never => badKind(prop);
    }
    return Reflect.get(target, prop, receiver);
  },
});

/* ── 图表 CSS 文本（R12：唯一产出者 = 本文件内部常量/函数；#75 复用同一份） ── */

/** t512：折线族六个文本类的一组字号规则（**用户单位**，逐档补偿后的值——算式见 `LINE_TEXT_WIDE_UNITS`）。
 *  类名与字形族与 ≤720px 段的六条逐字同款，只换数字；抽成一函数免得三档各抄一遍走散。 */
function lineFontRules(p: string, units: number): string {
  return '.' + p + 'charts-line .' + p + 'charts-tick{font-size:' + units + 'px}'
    + '.' + p + 'charts-line .' + p + 'charts-xlabel{font-size:' + units + 'px}'
    + '.' + p + 'charts-line .' + p + 'charts-value{font-size:' + units + 'px}'
    + '.' + p + 'charts-line .' + p + 'charts-value-last{font-size:' + units + 'px}'
    + '.' + p + 'charts-line .' + p + 'charts-marktext{font-size:' + units + 'px}'
    + '.' + p + 'charts-line .' + p + 'charts-marktext-v{font-size:' + units + 'px}';
}

/** 图表样式文本（**唯一一份**）：类名走 `prefix` 命名空间；容器零 padding；
 *  断点数值逐值取 `CHART_BREAKPOINTS`（`mobileMaxPx`／`dotSizeMobilePx`）。
 *  （`lineHeightMobilePx` 自 #424 返工起不再进 CSS：折线在移动端改按 viewBox 长宽比派生高度，
 *  见下方 ≤720px 段的注释；该常量仍留在冻结的 `CHART_BREAKPOINTS` 里不动。）
 *
 *  **#75 复用点**：`buildStyleSheet()` 的 `charts` 样式区直接引用本函数产出，
 *  **不得**在别处重述图表 CSS 文本（#78 结论，违反即 S1）。
 *  本函数**不从 `src/index.ts` 导出**——冻结面无该条目，导出会打破
 *  「新增运行时出口恰好等于清单 implemented 的运行时项」出口面锁（同 `ChartError` 口径）。 */
export function chartsCss(prefix: string): string {
  const p = prefix;
  const mobile = CHART_BREAKPOINTS.mobileMaxPx;
  const dotMobile = CHART_BREAKPOINTS.dotSizeMobilePx;
  return [
    '.' + p + 'charts{position:relative;margin:0;padding:0;box-sizing:border-box;font-family:inherit;color:var(--fg,#1d1d1f);--' + p + 'charts-dot:' + SCATTER_DOT_DEFAULT_PX + 'px}',
    '.' + p + 'charts *{box-sizing:border-box}',
    '.' + p + 'charts-svg{display:block;width:100%;height:auto;overflow:visible}',
    '.' + p + 'charts-empty{padding:0}',
    '.' + p + 'charts-anim .' + p + 'charts-line{transition:stroke-dashoffset .8s cubic-bezier(.22,1,.36,1)}',
    '.' + p + 'charts-anim .' + p + 'charts-bar{transition:height .5s cubic-bezier(.22,1,.36,1)}',
    '.' + p + 'charts-anim .' + p + 'charts-fillbar{transition:width .5s cubic-bezier(.22,1,.36,1)}',
    '.' + p + 'charts-anim .' + p + 'charts-dot{animation:' + p + 'charts-fade .5s ease both}',
    '@keyframes ' + p + 'charts-fade{from{opacity:0}to{opacity:1}}',
    '.' + p + 'charts-dot{pointer-events:none}',
    '.' + p + 'charts-dot-anomaly{filter:drop-shadow(0 0 3px rgba(255,59,48,.18))}',
    '.' + p + 'charts-markpoint{filter:drop-shadow(0 1px 2px rgba(0,0,0,.28))}',
    '.' + p + 'charts-scatter .' + p + 'charts-dot{r:calc(var(--' + p + 'charts-dot) / 2)}',
    '.' + p + 'charts-legend{display:flex;flex-wrap:wrap;gap:8px;font-size:12px;line-height:1.5;color:var(--fg2,#6e6e73)}',
    '.' + p + 'charts-legend-right{flex-direction:column;align-items:flex-start}',
    '.' + p + 'charts-legend-bottom{flex-direction:row;justify-content:center}',
    '.' + p + 'charts-legend-item{display:inline-flex;align-items:center;gap:6px}',
    '.' + p + 'charts-legend-swatch{display:inline-block;width:8px;height:8px;border-radius:2px}',
    '.' + p + 'charts-legend-swatch-dashed{background:repeating-linear-gradient(90deg,var(--fg3,#86868b) 0 4px,transparent 4px 8px)}',
    '.' + p + 'charts-legend-value{color:var(--fg,#1d1d1f)}',
    '.' + p + 'charts-legend-pct{color:var(--fg3,#86868b)}',
    '.' + p + 'charts-pct{display:block;font-size:12px;color:var(--fg2,#6e6e73);text-align:right}',
    /* t-chartfix：进度轨道最小可辨高度 12px。`height` 选项→内联 `height:Npx`／viewBox
     * 的映射由 `E.height` 钉死（缺省 8）不得改；此处只加样式层下限（不同属性，不与
     * 内联 height 冲突），缺省与过小的自定义高度渲染为 12px，65% 处可读。 */
    '.' + p + 'charts-progress .' + p + 'charts-svg{min-height:12px}',
    '.' + p + 'charts-spark-value{font-size:11px}',
    /* 文本字号（旧 `charts.js:55,67,70,79,87,90,92,96,102-103,113,122` 逐值）：
     * 缺了这些规则 SVG 文本会继承页面字号（14–16 用户单位），比旧版大 30%–60%（R2-N12）。 */
    '.' + p + 'charts-tick{font-size:9.5px}',
    '.' + p + 'charts-xlabel{font-size:10px}',
    '.' + p + 'charts-value{font-size:10px}',
    '.' + p + 'charts-value-last{font-size:10.5px;font-weight:700}',
    /* #424 返工：末值标签与末点同高、常与折线／均线交叠（390px 下实测线从标签盒里穿过）。
     *  给折线族的末值加白色描边（`paint-order:stroke` 先描边后填充），压在线上也读得清；
     *  不新增变量名——`--bg` 是本仓既有 token，缺省回退白。 */
    '.' + p + 'charts-line .' + p + 'charts-value-last{paint-order:stroke;stroke:var(--bg,#fff);stroke-width:3px;stroke-linejoin:round}',
    '.' + p + 'charts-marktext{font-size:10px}',
    '.' + p + 'charts-marktext-v{font-size:10px}',
    '.' + p + 'charts-mptext{font-size:10.5px;font-weight:700}',
    '.' + p + 'charts-bar .' + p + 'charts-xlabel{font-size:9.5px}',
    /* t-chartfix D1（2026-09-09 编排者裁定）：桌面端 bar 轴标签 10.5px＞数值 10px 系倒挂 bug 值
     * （测试快照，非契约冻结；契约正文零命中 10.5px）。改 9.5px＝移动端同选择器值，恢复层级
     * （9.5＜10）与双端一致；全局 xlabel 10px（相等非倒挂）不动，最小 scope。 */
    '.' + p + 'charts-bar .' + p + 'charts-value{font-size:10px}',
    '.' + p + 'charts-center-label{font-size:8px}',
    '.' + p + 'charts-center-value{font-size:13px;font-weight:700}',
    '.' + p + 'charts-gauge-value{font-size:26px;font-weight:800}',
    '.' + p + 'charts-gauge-label{font-size:11px}',
    /* t-chartfix #160 的桌面等比上限 `max-width:480px`（＝320×1.5）在 #424 撤销：
     *  折线 viewBox 已放大到 580×260（`LINE_DEFAULT_WIDTH/HEIGHT`），930px 卡片下 scale≈1.6
     *  ——图内 9.5–10px 文字渲染 15.2–16px，靠 viewBox 自身就压住了字号，不再需要砍宽度。
     *  留着它反而把图钉死在卡片中缝（930 里 480，左右各空 225px）。 */
    '@media (max-width:' + mobile + 'px){'
      + '.' + p + 'charts{--' + p + 'charts-dot:' + dotMobile + 'px}'
      /* #424 返工：原来这里把折线 svg 盒高钉成 `lineHeightMobilePx`（150px），而折线是
       *  `preserveAspectRatio="none"` 的满宽拉伸族 —— 580×260／580×300／580×180 三种 viewBox
       *  被压进同一个 150px 高，横向 0.57、纵向 0.50／0.83 → 圆点变椭圆、字被压扁（实测失真比
       *  1.13／0.68）。改成按 viewBox 长宽比派生高度（`height:auto`，与 `.charts-svg` 基规则同款），
       *  三种 viewBox 一律等比缩放；字号补偿见 `LINE_TEXT_MOBILE`。 */
      + '.' + p + 'charts-line .' + p + 'charts-svg{height:auto}'
      + '.' + p + 'charts-bar .' + p + 'charts-xlabel{font-size:9.5px}'
      + '.' + p + 'charts-legend{font-size:11.5px}'
      /* #424 返工（移动端折线文字不可读）：上面那条把折线 svg 盒高钉成 150px，580×260 的 viewBox
       *  在 390px 手机上被压到 scale≈0.58（`preserveAspectRatio="none"`）——图内 9.5/10 单位实测
       *  只有 5.4/5.7px。这里只对**折线族**按 1/0.58≈1.75 倍提字号，把实渲拉回 ~10px；字号常量与
       *  留白估算同源（`LINE_TEXT_MOBILE`），留白已按这一档放大，文字不会再顶出 viewBox。 */
      + '.' + p + 'charts-line .' + p + 'charts-tick{font-size:' + LINE_TEXT_MOBILE.tick + 'px}'
      + '.' + p + 'charts-line .' + p + 'charts-xlabel{font-size:' + LINE_TEXT_MOBILE.xlabel + 'px}'
      + '.' + p + 'charts-line .' + p + 'charts-value{font-size:' + LINE_TEXT_MOBILE.value + 'px}'
      + '.' + p + 'charts-line .' + p + 'charts-value-last{font-size:' + LINE_TEXT_MOBILE.last + 'px}'
      + '.' + p + 'charts-line .' + p + 'charts-marktext{font-size:' + LINE_TEXT_MOBILE.mark + 'px}'
      + '.' + p + 'charts-line .' + p + 'charts-marktext-v{font-size:' + LINE_TEXT_MOBILE.mark + 'px}'
      + '}',
    /* t512（字号随盒宽乱跳的根因）：上面那一段只按 ≤720px 给了一档（原 20 用户单位，t512 收尾收到 19.4），721px 起落回桌面档，
     *  断点两侧实渲 22.5px → 10.7px。这里补两档，用户单位 = 目标像素 ÷ 该档实测缩放比
     *  （算式与四档实测读数见 `LINE_TEXT_WIDE_UNITS` 的注释）——只给**折线族**六条文本类，
     *  杆／散点／环／量表各族沿用基规则 9.5/10 单位不动（它们没有被报「字号乱跳」）。 */
    '@media (min-width:' + (mobile + 1) + 'px) and (max-width:' + LINE_TEXT_WIDE_MAX_PX + 'px){'
      + lineFontRules(p, LINE_TEXT_WIDE_UNITS) + '}',
    '@media (min-width:' + (LINE_TEXT_WIDE_MAX_PX + 1) + 'px){'
      + lineFontRules(p, LINE_TEXT_FULL_UNITS) + '}',
  ].join(LF);
}

/* ── 图表 helpers JS（唯一产出者，FX-22；首步幂等自注入 `<style>`） ────── */

function helpersPrefix(input?: ChartsHelpersInput): string {
  const prefix = input === undefined || input === null ? undefined : input.prefix;
  return typeof prefix === 'string' && prefix !== '' ? prefix : STYLE_PREFIX;
}

function helpersStyleId(input?: ChartsHelpersInput): string {
  const styleId = input === undefined || input === null ? undefined : input.styleId;
  return typeof styleId === 'string' && styleId !== '' ? styleId : CHARTS_STYLE_ID;
}

/** 冻结签名：`buildChartsHelpersJs(input?: ChartsHelpersInput): string`。
 *
 *  产出恒为**非空**、**经典 script** 作用域可跑的 IIFE（无 `import`／`export`／顶层 `await`），
 *  逐项满足 `SHARED_HELPERS_JS_RULE`：自包含（不依赖其它脚本或既有全局）／幂等（判据**只落 DOM**：
 *  `getElementById(styleId)` 早退，**不**用全局哨兵）／允许页面侧 DOM（`document.*`）／
 *  不向 `window.<id>`／`globalThis.<id>` 赋值／不引 `node:`。
 *
 *  首步即幂等自注入 `<style id="{styleId ?? CHARTS_STYLE_ID}">`（R3／R12）；图表 CSS 文本
 *  **只此一处产出**（`chartsCss`），#75 实施时复用同一份文本，不得重述。 */
export const buildChartsHelpersJs: BuildChartsHelpersJs = (input) => {
  const prefix = helpersPrefix(input);
  const styleId = helpersStyleId(input);
  const css = chartsCss(prefix);
  const lines: string[] = [
    '(function () {',
    "  'use strict';",
    '  var STYLE_ID = ' + jsStr(styleId) + ';',
    '  var CSS = ' + jsStr(css) + ';',
    '',
    '  function boot() {',
    '    if (document.getElementById(STYLE_ID)) return;',
    '    var host = document.head || document.body;',
    '    if (!host) return;',
    '    var style = document.createElement("style");',
    '    style.id = STYLE_ID;',
    '    style.textContent = CSS;',
    '    host.appendChild(style);',
    '  }',
    '',
    '  if (document.head || document.body) boot();',
    '  else document.addEventListener("DOMContentLoaded", boot);',
    '}());',
  ];
  return lines.join(LF);
};

/* 记账：本文件产出的 HTML 恒用 `STYLE_PREFIX` 命名空间（`prefix` 覆盖只作用于 CSS 文本）；
 *  `CHART_STRUCTURE_RULE`／`CHART_EMPTY_RULE`／`CHART_COORD_RULE` 逐值由 `test/charts.test.mjs` 钉死。 */
