/** base-paint/spec/charts：图表层契约（#78 冻结面）。
 *
 * B4：**去掉**「技能自营 canvas」白名单例外——唯一实现住 base-paint。
 * 纯 CSS + SVG 字符串产出（无 `<canvas>`、无第三方、无 `node:`），
 * 结构违规**直接抛错**，空数组走 `emptyState` 联动（不静默空图）。
 */

export const CHART_KINDS = ['bar', 'line', 'donut', 'progress', 'combo', 'sparkline', 'gauge', 'scatter'] as const;

export type ChartKind = (typeof CHART_KINDS)[number];

/** 统一数据形状（旧 §6.5）：`value: null` **仅 line** 视为缺失断点
 *  （scatter 走 `ScatterItem` 的 `x`／`y`，无 `value`；非法即抛）。 */
export interface ChartItem {
  readonly label: string;
  readonly value: number | null;
  readonly color?: string;
  /** bar 多值（stacked／grouped）唯一真相源，长度须一致。 */
  readonly values?: readonly number[];
  /** 异常点染警示红（v1.22）。 */
  readonly anomaly?: boolean;
}

export interface ScatterItem {
  readonly x: number;
  readonly y: number;
  readonly label?: string;
}

export interface ChartSeries {
  readonly name: string;
  readonly items: readonly ChartItem[];
  readonly color?: string;
  readonly dashed?: boolean;
  readonly smooth?: boolean;
  readonly area?: boolean;
  /** 独立归一化（v1.17）。 */
  readonly ownScale?: boolean;
}

export interface ChartMarkLine {
  /** 水平阈值（v1.16）。 */
  readonly value?: number;
  /** 竖线锚点：items 索引或 label（v1.20）。 */
  readonly xValue?: number | string;
  readonly label?: string;
  readonly color?: string;
}

export interface ChartMarkPoint {
  readonly index?: number;
  readonly value?: number;
  readonly label?: string;
  readonly color?: string;
}

export interface ChartBand {
  readonly hi: readonly (number | null)[];
  readonly lo: readonly (number | null)[];
}

export interface ChartFillBetween {
  readonly a: number;
  readonly b: number;
  readonly color?: string;
}

export interface ChartCommonOptions {
  readonly height?: number;
  readonly width?: number;
  readonly compact?: boolean;
  readonly color?: string;
  readonly colors?: readonly string[];
  readonly format?: (value: number) => string;
  readonly animation?: boolean;
  readonly emptyText?: string;
  readonly tooltip?: boolean;
  readonly labels?: 'edge' | 'all' | 'none' | 'select';
  readonly showValues?: boolean | 'edge';
  readonly labelRotate?: number;
  readonly yMin?: number;
  readonly yMax?: number;
  readonly grid?: boolean;
  /** 交互以 actionId 传递（HTML 零内联脚本）。 */
  readonly actionId?: string;
}

export interface LineChartOptions extends ChartCommonOptions {
  readonly lineWidth?: number;
  readonly dashed?: boolean;
  readonly smooth?: boolean;
  readonly step?: boolean;
  readonly showDots?: boolean;
  readonly dotSize?: number;
  readonly dotStyle?: string;
  readonly area?: boolean;
  readonly areaOpacity?: number;
  readonly yTicks?: number | false;
  readonly connectNulls?: boolean;
  readonly legend?: boolean;
  readonly highlightLast?: boolean;
  readonly avgLine?: number;
  readonly markLine?: ChartMarkLine;
  readonly markPoint?: boolean | ChartMarkPoint;
  readonly band?: ChartBand;
  readonly fillBetween?: ChartFillBetween;
  readonly highlightPoints?: 'turns' | 'crossings';
  readonly series?: readonly ChartSeries[];
}

export interface BarChartOptions extends ChartCommonOptions {
  readonly singleColor?: boolean;
  readonly stacked?: boolean;
  readonly grouped?: boolean;
  readonly stackMode?: 'percent' | 'absolute';
  readonly segNames?: readonly string[];
}

export interface DonutChartOptions extends ChartCommonOptions {
  readonly size?: number;
  readonly ringWidth?: number;
  readonly legend?: 'right' | 'bottom' | 'none';
  readonly showPercent?: boolean;
  readonly centerLabel?: string;
  readonly centerValue?: string;
}

export interface ProgressChartOptions extends ChartCommonOptions {
  readonly gradient?: boolean;
  readonly showPct?: boolean;
}

export interface ComboChartOptions extends ChartCommonOptions {
  readonly barColor?: string;
  readonly lineColor?: string;
  readonly legend?: boolean;
}

export interface SparklineChartOptions extends ChartCommonOptions {
  readonly showValue?: boolean;
}

export interface GaugeChartOptions extends ChartCommonOptions {
  readonly size?: number;
  readonly label?: string;
}

export interface ScatterChartOptions extends ChartCommonOptions {
  readonly regression?: boolean;
  readonly regressionColor?: string;
  readonly dotSize?: number;
}

export interface BarChartInput {
  readonly items: readonly ChartItem[];
  readonly options?: BarChartOptions;
}

export interface LineChartInput {
  readonly items: readonly ChartItem[];
  readonly options?: LineChartOptions;
}

export interface DonutChartInput {
  readonly items: readonly ChartItem[];
  readonly options?: DonutChartOptions;
}

/** `pct` 非数报错，超界收敛 0~100（旧 §6.5 逐字行为）。 */
export interface ProgressChartInput {
  readonly pct: number;
  readonly options?: ProgressChartOptions;
}

export interface ComboChartInput {
  readonly bars: readonly ChartItem[];
  readonly lines: readonly ChartItem[];
  readonly options?: ComboChartOptions;
}

export interface SparklineChartInput {
  readonly items: readonly ChartItem[];
  readonly options?: SparklineChartOptions;
}

export interface GaugeChartInput {
  readonly pct: number;
  readonly options?: GaugeChartOptions;
}

export interface ScatterChartInput {
  readonly items: readonly ScatterItem[];
  readonly options?: ScatterChartOptions;
}

/** 输出：纯 CSS+SVG 字符串；`empty` 为真表示走了空态联动。 */
export interface ChartOutput {
  readonly kind: ChartKind;
  readonly html: string;
  readonly empty: boolean;
  readonly points: number;
}

/** 8 个接口逐条对齐旧 `charts.<name>(el, ...)`，去掉 `el`（DOM 由调用方挂载）。 */
export interface ChartsApi {
  bar(input: BarChartInput): ChartOutput;
  line(input: LineChartInput): ChartOutput;
  donut(input: DonutChartInput): ChartOutput;
  progress(input: ProgressChartInput): ChartOutput;
  combo(input: ComboChartInput): ChartOutput;
  sparkline(input: SparklineChartInput): ChartOutput;
  gauge(input: GaugeChartInput): ChartOutput;
  scatter(input: ScatterChartInput): ChartOutput;
}

export const CHARTS_STYLE_ID = 'ilife-charts';

/** 结构违规直接抛错（对齐旧 §6.5「违规直接抛错」）。 */
export const CHART_STRUCTURE_RULE = 'throw' as const;

/** 空数组 → emptyState 联动（合法场景，不抛错）。 */
export const CHART_EMPTY_RULE = 'emptyState' as const;

/** 坐标唯一性：容器零 padding，留白进 viewBox。 */
export const CHART_COORD_RULE = 'viewBox-only' as const;

export const CHART_BREAKPOINTS = Object.freeze({
  mobileMaxPx: 720,
  dotSizeMobilePx: 8,
  lineHeightMobilePx: 150,
  stackedGapPx: 3,
} as const);

/** donut／series 取色板（旧 charts.js:44 逐值）。 */
export const CHART_PALETTE = [
  '#007aff',
  '#34c759',
  '#ff9500',
  '#ff3b30',
  '#af52de',
  '#5ac8fa',
  '#ffcc00',
  '#8e8e93',
  '#ff2d55',
  '#00c7be',
] as const;

export const CHART_ERROR_CODES = ['structure-invalid', 'pct-invalid', 'kind-unknown'] as const;

export type ChartErrorCode = (typeof CHART_ERROR_CODES)[number];

export interface ChartErrorShape {
  readonly name: 'ChartError';
  readonly code: ChartErrorCode;
  readonly message: string;
}

/* ── 共享图表 JS 文本的唯一产出者（FX-22，归 #78；#74 只消费） ── */

/** `TemplateAssets.chartsHelpersJs` 的**唯一产出者**入参。
 *  该资产仅在模板含 `<!--CHARTS-HELPERS-->` 时使用（`MARKER_RULES.chartsHelpers.rule = 'zero-or-one'`）。 */
export interface ChartsHelpersInput {
  /** 类名前缀；缺省既有 `STYLE_PREFIX`（`ilife-`）。 */
  readonly prefix?: string;
  /** 图表样式表 id；缺省 `CHARTS_STYLE_ID`（`ilife-charts`）。 */
  readonly styleId?: string;
}

/** 冻结签名：`buildChartsHelpersJs(input?: ChartsHelpersInput): string`（归 #78；#74 只消费，技能侧禁自产，B3）。
 *  恒返回非空 JS 文本，产出内容受 `SHARED_HELPERS_JS_RULE`（§3.3，FX-18）约束：
 *  自包含／可重复注入（幂等）／允许页面侧 DOM 读取／**禁止**向 `window`／`globalThis` 赋值／禁 `node:`。
 *  空串视为实现缺陷 → `fillTemplate` 抛 `asset-missing`。 */
export type BuildChartsHelpersJs = (input?: ChartsHelpersInput) => string;
