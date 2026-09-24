/** gantt-timeline · **分钟 → 格**（本件第三份源码件：`model.ts` 用它把读数落成格，`render.ts` 只读结果）。
 *
 *  为什么有这一件：坐标只有一处算。**段的起止、空档块的起止、里程碑落哪一格、游标画在哪个百分比、
 *  刻度数字写在哪几格**——全部从这里的同一个轴域（`scale`）出来。两处各写一套必然走散，
 *  而甘特这种图一旦格线对不上，「读者按刻度数条」就会数错。
 *
 *  三条口径：
 *   1. **格是这一张图的精度**：所有落在格线上的读数（段／里程碑）必须是 `cellMinutes` 的整数倍，
 *      不是整数倍的由 `model.ts` 当场拒收——本件不许"描到最近的格线"，那是把读数画歪。
 *   2. **格数由轴域算**（时间跨度 ÷ 每格分钟数），不由调用方数；刻度数字也只写其中
 *      `GANTT_TIMELINE_MAX_TICK_LABELS` 枚以内，其余格子只有格线。
 *   3. 本件不认形态、不碰标记：输入是数与轴域，输出还是数（或数拼成的字）。
 */
import {
  GANTT_TIMELINE_MAX_CELLS,
  GANTT_TIMELINE_MAX_TICK_LABELS,
  GANTT_TIMELINE_MIN_CELLS,
} from './attrs.js';

/** 轴域：这一张图的格宽、格数、时间跨度（三者只在这里成组出现）。 */
export interface GanttTimelineScale {
  /** 一格几分钟。 */
  readonly cellMinutes: number;
  /** 时间跨度（分钟；**恒是 `cellMinutes` 的整数倍**）。 */
  readonly spanMinutes: number;
  /** 格数（＝ `spanMinutes ÷ cellMinutes`）。 */
  readonly cells: number;
}

/** 一段在格网上的落位（`grid-column: column / span span`）。 */
export interface GanttTimelineCellSpan {
  readonly column: number;
  readonly span: number;
}

/** 浮点容差：分钟数允许 0.5 这类小刻度，判"落在格线上"用得上。 */
const EPS = 1e-6;
/** 百分比保留几位（行内样式里不许出现 0.30000000000000004）。 */
const round4 = (v: number): number => Math.round(v * 1e4) / 1e4;

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : (v > hi ? hi : v));

/** 一个分钟数落不落在格线上。 */
export function isOnGrid(minute: number, cellMinutes: number): boolean {
  const k = minute / cellMinutes;
  return Math.abs(k - Math.round(k)) < EPS;
}

/** 一个时长是几格（**至少一格**：小于一格的段画不出来，调用方该把格调细）。 */
export function cellCount(minutes: number, cellMinutes: number): number {
  return Math.max(1, Math.round(minutes / cellMinutes));
}

/** 分钟数 → 第几格（1 起，与 CSS 的 `grid-column` 同口径）。 */
export function cellColumn(minute: number, scale: GanttTimelineScale): number {
  return clamp(Math.round(minute / scale.cellMinutes) + 1, 1, scale.cells);
}

/** **本件唯一的落位函数**：一段（起 ＋ 时长）→ 占哪几格；`minCells` 兜住"至少要占一格"。 */
export function cellSpan(from: number, minutes: number, scale: GanttTimelineScale,
  minCells = 1): GanttTimelineCellSpan {
  const column = cellColumn(from, scale);
  const span = Math.max(minCells, cellCount(minutes, scale.cellMinutes), 1);
  return { column, span: Math.max(1, Math.min(span, scale.cells - column + 1)) };
}

/** 里程碑的落位：元素**从落点铺到轨迹末端**（文字长在点的右边），落点落在右半区时反过来
 *  （从第 1 格铺到落点**前**那一格 ＋ 内容右对齐 ⇒ 文字长在点的左边）。
 *  这样那枚 `◆` 的**左缘／右缘恒压在格线上**（读者按刻度数得对），文字又总有半条轨迹可换行。
 *  落点正好在跨度末端时它落在第 `格数 + 1` 条格线上（那正是轨迹的右缘），故这一步**不夹到格数**。 */
export function milestoneSpan(at: number, scale: GanttTimelineScale):
{ readonly column: number; readonly span: number; readonly atEnd: boolean } {
  const raw = Math.round(at / scale.cellMinutes) + 1;
  const atEnd = raw > Math.ceil(scale.cells / 2);
  if (atEnd) return { column: 1, span: clamp(raw - 1, 1, scale.cells), atEnd };
  const column = clamp(raw, 1, scale.cells);
  return { column, span: Math.max(1, scale.cells - column + 1), atEnd };
}

/** 一个分钟数在轨迹里占的百分比（0…1，四位小数）：「现在」游标用它定位。 */
export function atRatio(at: number, scale: GanttTimelineScale): number {
  return round4(clamp(at / scale.spanMinutes, 0, 1));
}

/** 格数 → 轴域（**跨度先补满整格**，再夹进上下限：少到 6 格以下刻度字比格还密）。 */
export function scaleOf(spanMinutes: number, cellMinutes: number): GanttTimelineScale {
  const spanCells = Math.max(1, Math.ceil(spanMinutes / cellMinutes - EPS));
  const cells = clamp(spanCells, GANTT_TIMELINE_MIN_CELLS, GANTT_TIMELINE_MAX_CELLS);
  return { cellMinutes, spanMinutes: round4(cells * cellMinutes), cells };
}

/** 每几格写一枚刻度数字（**算出来的**：枚数不超过 `GANTT_TIMELINE_MAX_TICK_LABELS`）。 */
export function tickStep(cells: number): number {
  return Math.max(1, Math.ceil(cells / GANTT_TIMELINE_MAX_TICK_LABELS));
}

/** 一枚刻度：落在第几格（0 起）＋ 写什么 ＋ 要不要右对齐（最后一格上的字往左长，免得跑出刻度区）。 */
export interface GanttTimelineTick {
  readonly index: number;
  readonly text: string;
  readonly atEnd: boolean;
}

/** 千分位（`1440` → `1,440`；负号留在最前）。 */
function groupInt(s: string): string {
  const neg = s.startsWith('-');
  const body = neg ? s.slice(1) : s;
  let out = '';
  for (let i = 0; i < body.length; i += 1) {
    if (i > 0 && (body.length - i) % 3 === 0) out += ',';
    out += body[i];
  }
  return (neg ? '-' : '') + out;
}

/** 分钟数 → 给人看的字（整数不带小数点）。 */
export function minuteText(value: number): string {
  const n = Math.round(value * 1000) / 1000;
  return Number.isInteger(n) ? groupInt(String(n)) : groupInt(String(n).replace(/\.?0+$/, ''));
}

/** 刻度逐枚（**唯一的刻度算法**）：`labels` 给了就整枚替换文字，枚数不符由 `model.ts` 拦。 */
export function ticksOf(scale: GanttTimelineScale, labels?: readonly string[]): readonly GanttTimelineTick[] {
  const step = tickStep(scale.cells);
  const out: GanttTimelineTick[] = [];
  for (let i = 0; i < scale.cells; i += step) {
    const k = out.length;
    out.push({
      index: i,
      text: labels === undefined ? minuteText(i * scale.cellMinutes) : (labels[k] as string),
      atEnd: i === scale.cells - 1,
    });
  }
  return out;
}

/** 刻度枚数（`model.ts` 拿它对 `tickText` 的枚数，判据拿它断"刻度只有一处算"）。 */
export function tickCount(cells: number): number {
  return Math.ceil(cells / tickStep(cells));
}
