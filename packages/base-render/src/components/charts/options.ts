/** charts · options
 *
 *  自 `src/charts.ts` 第 233–367 行原样切出。
 *
 *  **住址**：目录化批次④把 `src/charts.ts` 按段切成「族内一件一文件」，正文原样搬来；
 *  搬迁判据＝产物逐字节相同（八种图表产物 ＋ `chartsCss` ＋ helpers JS），
 *  见 `docs/base/base-render/组件目录架构.md`。
 */

import { ChartError, EMPTY_HINT, EMPTY_ICON, esc, isNum, isPlainObject, n1, numOr } from './shared.js';
import { charts } from './dispatch.js';
import { renderEmptyState } from '../../controls.js';
import { STYLE_PREFIX } from '../../style.js';
import { ACTION_ID_ATTR, ChartCommonOptions, ChartKind, ChartOutput, STATUS_DEFAULT_TEXT } from '../../spec/index.js';

/* ── 通用选项（`ChartCommonOptions`） ──────────────────────────────────── */

export type LabelsMode = 'edge' | 'all' | 'none' | 'select';

/** 数值标签模式（#567 起含 `'last'`：只标最后一个有效点）。 */
export type ShowValuesMode = boolean | 'edge' | 'last';

export interface ResolvedCommon {
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

export function resolveCommon(raw: unknown, def: CommonDefaults): ResolvedCommon {
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

export function containerOpen(kind: ChartKind, common: ResolvedCommon, extraClass?: string): string {
  let out = '<div class="' + commonClasses(common, extraClass) + '" data-chart-kind="' + kind + '"';
  if (common.actionId !== undefined) out += ' ' + ACTION_ID_ATTR + '="' + esc(common.actionId) + '"';
  return out + '>';
}

export function actionAttrs(common: ResolvedCommon, index?: number): string {
  let out = '';
  if (common.actionId !== undefined) out += ' ' + ACTION_ID_ATTR + '="' + esc(common.actionId) + '"';
  if (index !== undefined) out += ' data-i="' + index + '"';
  return out;
}

/** `tooltip: true` 时写入 `data-tip`；文本**惰性**求值（未开 tooltip 不得白调 `format`）。 */
export function tipAttrs(common: ResolvedCommon, makeText: () => string): string {
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
export function svgOpen(common: ResolvedCommon, extra?: string): string {
  return '<svg class="' + STYLE_PREFIX + 'charts-svg' + (extra === undefined ? '' : ' ' + extra) + '"'
    + ' viewBox="0 0 ' + n1(common.width) + ' ' + n1(common.height) + '"'
    + ' preserveAspectRatio="xMidYMid meet" role="img" focusable="false">';
}

/** 空态联动（`CHART_EMPTY_RULE = 'emptyState'`）：`empty:true`／`points:0`，不抛错。 */
export function emptyOutput(kind: ChartKind, raw: unknown, hint?: string): ChartOutput {
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

/** #950 B3：`minPoints` 闸（**缺省不启用** ⇒ 恒 `false`，旧调用点产物逐字节不变）。
 *  给了且有效点少于它 ⇒ 该支走空态。非法值点名抛 `structure-invalid`（不新增错误码：本批不加宽冻结面）。 */
export function belowMinPoints(raw: unknown, count: number): boolean {
  const o = isPlainObject(raw) ? (raw as ChartCommonOptions) : undefined;
  const min = o === undefined ? undefined : o.minPoints;
  if (min === undefined) return false;
  if (!isNum(min) || !Number.isInteger(min) || min < 1) {
    throw new ChartError('structure-invalid', 'charts: minPoints 必须是 ≥1 的整数');
  }
  return count < min;
}

/** 点数闸触发时那行小字：调用方给了 `minPointsHint` 就用它，否则用一句带数字的缺省（正文仍走 `emptyText`）。 */
export function minPointsHintOf(raw: unknown, count: number): string {
  const o = isPlainObject(raw) ? (raw as ChartCommonOptions) : undefined;
  const custom = o === undefined ? undefined : o.minPointsHint;
  if (typeof custom === 'string' && custom !== '') return custom;
  const min = o === undefined ? undefined : o.minPoints;
  return '本窗只有 ' + String(count) + ' 个点，画不出趋势（至少 ' + String(min) + ' 个）';
}

