/** base-paint/charts：#78 图表层运行时（契约 §3.5／§6.5）。
 *
 * 落地冻结面里 #78 的三条运行时出口：`charts`（8 方法）／`buildChartsHelpersJs`；
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
 *  - `avgLine(n)` = 旧语义的**均线序列**（窗口收敛 `3..items.length`，`old-baseline.md` §2.2），
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
/** scatter 缺省 Y 轴刻度条数（旧 `charts.js:854` `yTicks:4`；冻结 `ScatterChartOptions` 无该字段，
 *  故按**缺省行为**渲染 4 条、不新增可关闭开关——登记为契约缺口，归后续票，R2-G1 裁定）。 */
const SCATTER_Y_TICKS = 4;
const EMPTY_ICON = '📊';
const EMPTY_HINT = '有记录后自动生成图表';
const DONUT_ZERO_HINT = '合计为零, 无环形数据';
const OWN_SCALE_NOTE = '各指标独立刻度';
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

/** `pct` 非数 → `pct-invalid`；超界收敛 0~100（旧 §6.5 逐字行为）。 */
function normalizePct(raw: unknown, kind: ChartKind): number {
  if (!isNum(raw)) badPct('charts.' + kind + ': pct 无效: ' + String(raw));
  return Math.max(0, Math.min(100, raw));
}

/* ── 通用选项（`ChartCommonOptions`） ──────────────────────────────────── */

type LabelsMode = 'edge' | 'all' | 'none' | 'select';

interface ResolvedCommon {
  readonly width: number;
  readonly height: number;
  readonly compact: boolean;
  readonly animation: boolean;
  readonly color: string | undefined;
  readonly colors: readonly string[] | undefined;
  readonly format: ((value: number) => string) | undefined;
  readonly labels: LabelsMode;
  readonly showValues: boolean | 'edge';
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
  readonly showValues: boolean | 'edge';
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
    showValues: showValues === true || showValues === false || showValues === 'edge' ? showValues : def.showValues,
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

/** `aspect='none'` 用于折线／组合／散点：旧版三者都是 `preserveAspectRatio="none"` 满宽拉伸
 *  （`charts.js:661,774,899`）——移动端 CSS 把 svg 高度钉成 `lineHeightMobilePx` 后，
 *  `meet` 会等比缩到 228.6px 宽并左右留白（R2-N9），`none` 才是满宽（描边有 `vector-effect` 防变形）。 */
function svgOpen(common: ResolvedCommon, extra?: string, aspect: 'meet' | 'none' = 'meet'): string {
  return '<svg class="' + STYLE_PREFIX + 'charts-svg' + (extra === undefined ? '' : ' ' + extra) + '"'
    + ' viewBox="0 0 ' + n1(common.width) + ' ' + n1(common.height) + '"'
    + ' preserveAspectRatio="' + (aspect === 'none' ? 'none' : 'xMidYMid meet') + '" role="img" focusable="false">';
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

/** 留白进 viewBox（容器零 padding）：左留白含刻度文字宽度。 */
function insetsFor(common: ResolvedCommon, opts: { tickWidth: number; labelHeight: number; valueHeight: number }): Insets {
  const padX = common.compact ? 6 : 14;
  const padY = common.compact ? 4 : 8;
  return {
    left: padX + opts.tickWidth,
    right: padX,
    top: padY + (common.showValues === false ? 0 : opts.valueHeight),
    bottom: padY + opts.labelHeight,
  };
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

/** `yTicks` 收敛 2-6（旧 `charts.js:498`）；`false`／非数 → 0 条。 */
function tickCount(value: number | false | undefined): number {
  if (!isNum(value)) return 0;
  return Math.max(2, Math.min(6, Math.round(value)));
}

/* ── 共享 SVG 片段 ────────────────────────────────────────────────────── */

function gridSvg(frame: Frame): string {
  let out = '';
  for (let g = 0; g < GRID_LINES; g += 1) {
    const gy = frame.y1 - (frame.h * g) / (GRID_LINES - 1);
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
    out += '<line class="' + STYLE_PREFIX + 'charts-ytick" x1="' + n1(frame.x0 - 5) + '" y1="' + n1(ty)
      + '" x2="' + n1(frame.x0) + '" y2="' + n1(ty) + '" stroke="' + GRID_COLOR
      + '" stroke-width="1" vector-effect="non-scaling-stroke"/>'
      + '<text class="' + STYLE_PREFIX + 'charts-tick" x="' + n1(frame.x0 - 7) + '" y="' + n1(ty + 3)
      + '" text-anchor="end" fill="' + MUTED_COLOR + '">' + esc(fmtValue(round2(tv), format)) + '</text>';
  }
  return out;
}

/** X 轴标签集合：`'all'` 全量／`'edge'` 首尾／`'select'` 首＋峰值＋尾（line 口径）
 *  ／`'none'` 无。`select='edge'` 时 `'select'` 退化为首尾——**bar 口径**：
 *  旧 bar 的 `'select'` 只显示首尾（`charts.js:385-388`），与 line 的「首＋峰值＋尾」不同（R2-N7）。 */
function labelIndexes(mode: LabelsMode, items: readonly ChartItem[], select: 'peak' | 'edge' = 'peak'): readonly number[] {
  const n = items.length;
  if (mode === 'none' || n === 0) return [];
  if (mode === 'all') return items.map((_, i) => i);
  if (mode === 'edge' || (mode === 'select' && select === 'edge')) return n === 1 ? [0] : [0, n - 1];
  let peak = 0;
  let peakValue = -Infinity;
  items.forEach((item, i) => {
    if (item.value !== null && item.value > peakValue) {
      peakValue = item.value;
      peak = i;
    }
  });
  return Array.from(new Set<number>([0, peak, n - 1])).sort((a, b) => a - b);
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
): string {
  if (common.labels === 'none') return '';
  const baseY = frame.y1 + (common.compact ? 9 : 12);
  return labelIndexes(common.labels, items, select).map((i) => {
    const x = xOf(i, items.length);
    const rotate = common.labelRotate === 0 ? '' : ' transform="rotate(' + common.labelRotate + ' ' + n1(x) + ' ' + n1(baseY) + ')"';
    return '<text class="' + STYLE_PREFIX + 'charts-xlabel" x="' + n1(x) + '" y="' + n1(baseY)
      + '" text-anchor="middle"' + rotate + ' fill="' + MUTED_COLOR + '">' + esc(items[i].label) + '</text>';
  }).join('');
}

/** `showValues` 标签集合：`true` 全量（相邻中心距 < 26 单位跳过）／`'edge'` 首尾有效点／`false` 无。 */
function valueIndexes(mode: boolean | 'edge', frame: Frame, items: readonly ChartItem[]): readonly number[] {
  if (mode === false) return [];
  const valid: number[] = [];
  items.forEach((item, i) => {
    if (item.value !== null) valid.push(i);
  });
  if (valid.length === 0) return [];
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
    };
  });
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

function renderLine(raw: LineChartInput): ChartOutput {
  const input = requireObject(raw, 'charts.line: input');
  const common = resolveCommon(input.options, { width: 320, height: 210, labels: 'edge', showValues: false });
  const opts = isPlainObject(input.options) ? (input.options as LineChartOptions) : undefined;
  const line: ResolvedLineOptions = {
    ...common,
    lineWidth: numOr(opts === undefined ? undefined : opts.lineWidth, 2.2),
    dashed: opts !== undefined && opts.dashed === true,
    smooth: opts !== undefined && opts.smooth === true,
    step: opts !== undefined && opts.step === true,
    showDots: opts === undefined || opts.showDots !== false,
    dotSize: numOr(opts === undefined ? undefined : opts.dotSize, DOT_DEFAULT_PX),
    dotStyle: opts !== undefined && typeof opts.dotStyle === 'string' && opts.dotStyle !== '' ? opts.dotStyle : undefined,
    area: opts !== undefined && opts.area === true,
    areaOpacity: numOr(opts === undefined ? undefined : opts.areaOpacity, 0.12),
    yTicks: opts === undefined || opts.yTicks === undefined ? false : opts.yTicks,
    connectNulls: opts !== undefined && opts.connectNulls === true,
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
  };
  const items = normalizeItems(input.items, 'line', true);
  if (items.length === 0) return emptyOutput('line', input.options);
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
  const [lo, hi] = domainOf(sharedValues, line.yMin, line.yMax, false);

  const tickN = tickCount(line.yTicks);
  const frame = makeFrame(line, insetsFor(line, {
    tickWidth: tickN === 0 ? 0 : (line.compact ? 16 : 22),
    labelHeight: line.labels === 'none' ? 0 : (line.compact ? 10 : 14),
    valueHeight: line.compact ? 9 : 12,
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

  /* avgLine：均线序列（窗口收敛 3..items.length）；**仅当调用方未传 `series`** 时叠加
   *  （旧 `charts.js:414` `if(opt.avgLine&&!opt.series)`；传了 `series` 就由调用方自己管序列，R2-N6）。 */
  const avgWindow = line.avgLine === undefined || line.series !== undefined
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
    series.push({ name: '均线', items: avgItems, color: MUTED_COLOR, dashed: true, smooth: line.smooth, area: false, ownScale: false });
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
    const isAvg = s.name === '均线' && avgWindow !== undefined && si === series.length - 1;
    const color = s.color ?? line.color ?? CHART_PALETTE[si % CHART_PALETTE.length];
    if (s.area && !isAvg) {
      const d = areaPath(pts, line.connectNulls, frame.y1, s.smooth && !line.step, line.step);
      if (d !== '') {
        pathsSvg += '<path class="' + STYLE_PREFIX + 'charts-area" d="' + d + '" fill="' + esc(color)
          + '" fill-opacity="' + line.areaOpacity + '" stroke="none"/>';
      }
    }
    const d = line.step ? stepPath(pts, line.connectNulls) : s.smooth ? smoothPath(pts, line.connectNulls) : polyPath(pts, line.connectNulls);
    if (d !== '') {
      pathsSvg += '<path class="' + STYLE_PREFIX + 'charts-line' + (isAvg ? ' ' + STYLE_PREFIX + 'charts-avg' : '')
        + '" d="' + d + '" fill="none" stroke="' + esc(color)
        + '" stroke-width="' + line.lineWidth + '" stroke-linejoin="round" stroke-linecap="round"'
        + (s.dashed ? ' stroke-dasharray="6 5"' : '') + ' vector-effect="non-scaling-stroke"/>';
    }
    if (line.legend && !isAvg && s.name !== '') legendEntries.push({ name: s.name, color });
    if (isAvg) return;
    if (line.showDots) {
      pts.forEach((p, i) => {
        if (p[2]) return;
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
      /* 末值文本受 `showValues`／`labels:'select'` 门控（旧 `charts.js:619-621`）；高亮圈无条件。 */
      if (line.showValues !== false || line.labels === 'select') {
        valuesSvg += '<text class="' + STYLE_PREFIX + 'charts-value ' + STYLE_PREFIX + 'charts-value-last" x="' + n1(p[0])
          + '" y="' + n1(p[1] - 6) + '" text-anchor="middle" fill="var(--fg,#1d1d1f)">'
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
        + '" text-anchor="end" fill="' + esc(color) + '">'
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
          + '" text-anchor="' + anchor + '" fill="' + esc(color) + '">'
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

  const points = series.reduce((sum, s, si) => {
    if (avgWindow !== undefined && si === series.length - 1) return sum;
    return sum + s.items.filter((item) => item.value !== null).length;
  }, 0);

  const html = containerOpen('line', line, STYLE_PREFIX + 'charts-line')
    + legendHtml(legendEntries)
    + svgOpen(line, undefined, 'none')
    + (line.grid ? gridSvg(frame) : '')
    + bandSvg
    + fillSvg
    + ticksSvg(frame, lo, hi, tickN, line.format)
    + markSvg
    + pathsSvg
    + marksSvg
    + valuesSvg
    + markPointSvg
    + xLabelsSvg(line, frame, items)
    + '</svg></div>';
  return { kind: 'line', html, empty: points === 0, points };
}

interface ResolvedLineOptions extends ResolvedCommon {
  readonly lineWidth: number;
  readonly dashed: boolean;
  readonly smooth: boolean;
  readonly step: boolean;
  readonly showDots: boolean;
  readonly dotSize: number;
  readonly dotStyle: string | undefined;
  readonly area: boolean;
  readonly areaOpacity: number;
  readonly yTicks: number | false;
  readonly connectNulls: boolean;
  readonly legend: boolean;
  readonly highlightLast: boolean;
  readonly avgLine: number | undefined;
  readonly markLine: ChartMarkLine | undefined;
  readonly markPoint: ChartMarkPoint | true | undefined;
  readonly band: ChartBand | undefined;
  readonly fillBetween: ChartFillBetween | undefined;
  readonly highlightPoints: 'turns' | 'crossings' | undefined;
  readonly series: readonly ChartSeries[] | undefined;
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

  const tickN = 0;
  const frame = makeFrame(common, insetsFor(common, {
    tickWidth: 0,
    labelHeight: common.labels === 'none' ? 0 : (common.compact ? 10 : 14),
    valueHeight: common.compact ? 9 : 12,
  }));

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

  /* 数值标签：单柱 = 值；stacked = 柱顶合计；grouped = 每子柱顶部 */
  let valuesSvg = '';
  if (common.showValues !== false) {
    items.forEach((item, i) => {
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
    + (common.grid ? gridSvg(frame) : '')
    + barsSvg
    + valuesSvg
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
    + svgOpen(common, undefined, 'none')
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
    + svgOpen(common, undefined, 'none')
    + (common.grid ? gridSvg(frame) : '')
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

/** 图表样式文本（**唯一一份**）：类名走 `prefix` 命名空间；容器零 padding；
 *  断点数值逐值取 `CHART_BREAKPOINTS`（`mobileMaxPx`／`dotSizeMobilePx`／`lineHeightMobilePx`）。
 *
 *  **#75 复用点**：`buildStyleSheet()` 的 `charts` 样式区直接引用本函数产出，
 *  **不得**在别处重述图表 CSS 文本（#78 结论，违反即 S1）。
 *  本函数**不从 `src/index.ts` 导出**——冻结面无该条目，导出会打破
 *  「新增运行时出口恰好等于清单 implemented 的运行时项」出口面锁（同 `ChartError` 口径）。 */
export function chartsCss(prefix: string): string {
  const p = prefix;
  const mobile = CHART_BREAKPOINTS.mobileMaxPx;
  const dotMobile = CHART_BREAKPOINTS.dotSizeMobilePx;
  const lineHeightMobile = CHART_BREAKPOINTS.lineHeightMobilePx;
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
    '@media (max-width:' + mobile + 'px){'
      + '.' + p + 'charts{--' + p + 'charts-dot:' + dotMobile + 'px}'
      + '.' + p + 'charts-line .' + p + 'charts-svg{height:' + lineHeightMobile + 'px}'
      + '.' + p + 'charts-bar .' + p + 'charts-xlabel{font-size:9.5px}'
      + '.' + p + 'charts-legend{font-size:11.5px}'
      + '}',
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
 *  **只此一处产出**（`chartsCss`），#75 落地时复用同一份文本，不得重述。 */
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
