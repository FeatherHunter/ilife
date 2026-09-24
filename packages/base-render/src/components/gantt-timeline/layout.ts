/** gantt-timeline · **装配面**（已校验的读数 → 逐行落位、图例、无障碍名）。
 *
 *  为什么与 `model.ts` 分开：一次要画的东西太多（关键路径 ＋ 泳道 ＋ 里程碑 ＋ 图例 ＋ 游标），
 *  校验与装配挤在一件里超本包告警线 350 行（`packages/base-render/AGENTS.md`）。
 *  切口按「入参面／装配面」分，依赖只有一个方向：`model.ts` → 本件 → `scale.ts`／`attrs.ts`。
 *
 *  三条口径：
 *   1. **落位只调 `scale.ts`**：本件不自己算百分比与格号；
 *   2. **占用分钟数与最晚一处由本件算**（空档段不算占用）——调用方不必先算一遍；
 *   3. 图例**只列真的出现过的档**（没出现的档写进图例就是噪音）。
 */
import type { GanttTimelineForm, GanttTimelineState } from './attrs.js';
import {
  atRatio,
  cellSpan,
  milestoneSpan,
  type GanttTimelineScale,
  type GanttTimelineTick,
} from './scale.js';

/** 一条段（已校验）：起止与状态。 */
export interface GanttTimelineSegmentView {
  readonly from: number;
  readonly minutes: number;
  readonly state: GanttTimelineState;
  readonly label?: string;
}

/** 一条泳道（已校验）。 */
export interface GanttTimelineLaneView {
  readonly label: string;
  readonly note?: string;
  readonly segments: readonly GanttTimelineSegmentView[];
}

/** 关键路径（已校验）。 */
export interface GanttTimelineKeyView {
  readonly label: string;
  readonly note: string;
  readonly steps: readonly { readonly name: string; readonly minutes: number }[];
}

/** 一个里程碑（已校验）。 */
export interface GanttTimelineMilestoneView {
  readonly at: number;
  readonly label: string;
  readonly note: string;
}

/** 「现在」游标（已校验）。 */
export interface GanttTimelineCursorView {
  readonly at: number;
  readonly label: string;
}

/** 装配面的输入：`model.ts` 校验并归一之后的那份读数（**唯一入口在 `model.ts`**）。 */
export interface GanttTimelineReadings {
  readonly form: GanttTimelineForm;
  readonly title: string;
  readonly stamp: string;
  readonly tail?: string;
  readonly axisName: string;
  readonly scale: GanttTimelineScale;
  readonly ticks: readonly GanttTimelineTick[];
  readonly keyPath?: GanttTimelineKeyView;
  readonly lanes: readonly GanttTimelineLaneView[];
  readonly milestones: readonly GanttTimelineMilestoneView[];
  readonly cursor?: GanttTimelineCursorView;
  readonly note: string;
  readonly extraClass?: string;
}

/** 一条段在标记里的样子（落位已在装配期算好，`render.ts` 只把它拼成 `grid-column`）。 */
export interface GanttTimelineMarkView {
  /** 段里那枚字形（`✓`／`▶`／`⋯`／`▷`／关键路径的顺序号）；空档段为空串（块里写分钟数）。 */
  readonly mark: string;
  /** 状态（`crit` 是关键路径那一档，不是段的状态）。 */
  readonly state: GanttTimelineState | 'crit';
  /** 段从第几分钟起（校验期就带上：**不许**从 `title` 里反推，那样两处必然走散）。 */
  readonly from: number;
  /** 段持续几分钟。 */
  readonly minutes: number;
  readonly column: number;
  readonly span: number;
  /** 段里的短字；空档段里放的是分钟数（`30′`）。 */
  readonly text?: string;
  /** 鼠标停上去那行读数（无障碍也读它）。 */
  readonly title: string;
  /** 里程碑落在右半区：元素从第 1 格铺到落点，内容右对齐。 */
  readonly atEnd: boolean;
}

/** 一行（关键路径／一条泳道／一个里程碑）。 */
export interface GanttTimelineRowView {
  readonly kind: 'key' | 'lane' | 'milestone';
  readonly kindClass: string;
  readonly label: string;
  readonly note: string;
  readonly marks: readonly GanttTimelineMarkView[];
}

/** 图例的一枚：形（`swatch` 里的字）＋ 字（这一档叫什么）。 */
export interface GanttTimelineLegendItem {
  readonly state: GanttTimelineState | 'crit';
  readonly mark: string;
  readonly word: string;
}

/** 装配面的产出。 */
export interface GanttTimelineLayout {
  readonly rows: readonly GanttTimelineRowView[];
  readonly legend: readonly GanttTimelineLegendItem[];
  readonly ariaLabel: string;
  /** 「现在」游标在轨迹里的位置（0…1）＋ 那枚字 ＋ 它靠不靠右——名字与入参那份 `cursor` 分开，免得两义。 */
  readonly cursorView?: { readonly ratio: number; readonly label: string; readonly atEnd: boolean };
}

/** 各档的字形（**形**那一档：色不是唯一信息，字形与图例字各给一遍）。 */
const GLYPH: Readonly<Record<GanttTimelineState | 'crit', string>> = {
  done: '✓', doing: '▶', wait: '⋯', plan: '▷', idle: '', crit: '',
};
/** 各档的读法（图例里的字）。 */
const WORD: Readonly<Record<GanttTimelineState | 'crit', string>> = {
  done: '已完成', doing: '进行中', wait: '等待', plan: '未开始',
  idle: '空闲（点线块里的数字是分钟）', crit: '关键路径',
};
/** 图例的次序：关键路径在最前，其余按"完成度"从后往前。 */
const LEGEND_ORDER: readonly (GanttTimelineState | 'crit')[] = ['crit', 'done', 'doing', 'wait', 'plan', 'idle'];

/** 这一条泳道被占用的分钟数（空档段不算占用）。 */
function busyMinutes(lane: GanttTimelineLaneView): number {
  let sum = 0;
  for (const seg of lane.segments) if (seg.state !== 'idle') sum += seg.minutes;
  return sum;
}

/** 这一条泳道最晚的一处（时间跨度的下界之一，`model.ts` 拿它定跨度）。 */
export function laneEndMinutes(lane: GanttTimelineLaneView): number {
  let end = 0;
  for (const seg of lane.segments) end = Math.max(end, seg.from + seg.minutes);
  return end;
}

/** 关键路径图例那一句（**逐段写清顺序与分钟数**，与原型同一套读法）。 */
function keyLegendWord(key: GanttTimelineKeyView, total: number): string {
  const chain = key.steps.map((s) => s.name + ' ' + String(s.minutes) + ' 分').join(' → ');
  return key.label + '（' + chain + ' ＝ ' + String(total) + ' 分）';
}

/** 无障碍名：这一张图在说什么（读屏只有这一句，所以它在、且写全）。 */
function ariaOf(r: GanttTimelineReadings, total: number): string {
  const parts: string[] = [];
  if (r.keyPath !== undefined) {
    const chain = r.keyPath.steps.map((s) => s.name + ' ' + String(s.minutes) + ' 分').join(' → ');
    parts.push(r.keyPath.label + '：' + chain + '，共 ' + String(total) + ' 分');
  }
  for (const lane of r.lanes) {
    if (lane.segments.length === 0) { parts.push(lane.label + ' 整段空闲'); continue; }
    const each = lane.segments.slice().sort((a, b) => a.from - b.from).map((m) => (m.state === 'idle'
      ? '空闲 ' + String(m.minutes)
      : WORD[m.state] + ' ' + String(m.from)) + ' 到 ' + String(m.from + m.minutes) + ' 分').join('，');
    parts.push(lane.label + '：' + each);
  }
  for (const m of r.milestones) parts.push(m.label + ' 是 ' + String(m.at) + ' 分的里程碑');
  if (r.cursor !== undefined) parts.push('游标在 ' + String(r.cursor.at) + ' 分：' + r.cursor.label);
  return r.title + '。' + (parts.length > 0 ? parts.join('。') + '。' : '')
    + '横轴 ' + String(r.scale.spanMinutes) + ' 分，缺记录的时间段留空，不补 0。';
}

/** 装配：逐行落位（关键路径 → 泳道 → 里程碑）、图例、无障碍名、游标。 */
export function layoutGanttTimeline(r: GanttTimelineReadings): GanttTimelineLayout {
  const scale = r.scale;
  const rows: GanttTimelineRowView[] = [];
  const seen = new Set<GanttTimelineState | 'crit'>();
  let total = 0;

  if (r.keyPath !== undefined) {
    const key = r.keyPath;
    total = key.steps.reduce((sum, s) => sum + s.minutes, 0);
    let cursor = 0;
    const marks = key.steps.map((step, i) => {
      const start = cursor;
      cursor += step.minutes;
      const at = cellSpan(start, step.minutes, scale, 1);
      return {
        mark: String(i + 1), state: 'crit' as const, from: start, minutes: step.minutes,
        column: at.column, span: at.span, atEnd: false,
        title: key.label + ' 第 ' + String(i + 1) + ' 段 ' + step.name + '：' + String(start) + ' 分起 '
          + String(step.minutes) + ' 分（到 ' + String(cursor) + ' 分）',
      };
    });
    seen.add('crit');
    rows.push({ kind: 'key', kindClass: 'is-key', label: key.label, note: key.note, marks });
  }

  for (const lane of r.lanes) {
    const marks = lane.segments.slice().sort((a, b) => a.from - b.from).map((seg) => {
      const at = cellSpan(seg.from, seg.minutes, scale, 1);
      seen.add(seg.state);
      const to = seg.from + seg.minutes;
      return {
        mark: seg.state === 'idle' ? '' : GLYPH[seg.state],
        state: seg.state,
        from: seg.from,
        minutes: seg.minutes,
        column: at.column,
        span: at.span,
        text: seg.state === 'idle' ? String(seg.minutes) + '′' : seg.label,
        title: lane.label + '：' + String(seg.from) + ' 分起' + (seg.state === 'idle' ? '空闲 ' : '')
          + String(seg.minutes) + ' 分（到 ' + String(to) + ' 分）',
        atEnd: false,
      };
    });
    const busy = busyMinutes(lane);
    rows.push({
      kind: 'lane', kindClass: 'is-lane', label: lane.label,
      note: lane.note ?? (busy > 0 ? '占用 ' + String(busy) + ' 分' : '未占用'),
      marks,
    });
  }

  for (const m of r.milestones) {
    const at = milestoneSpan(m.at, scale);
    rows.push({
      kind: 'milestone', kindClass: 'is-milestone', label: m.label, note: m.note,
      marks: [{ mark: '◆', state: 'crit', from: m.at, minutes: 0, column: at.column, span: at.span,
        atEnd: at.atEnd, title: m.label + '：' + String(m.at) + ' 分' }],
    });
  }

  const legend: GanttTimelineLegendItem[] = [];
  for (const state of LEGEND_ORDER) {
    if (!seen.has(state)) continue;
    legend.push({
      state,
      mark: state === 'crit' ? '1-' + String(r.keyPath === undefined ? 0 : r.keyPath.steps.length) : GLYPH[state],
      word: state === 'crit' && r.keyPath !== undefined ? keyLegendWord(r.keyPath, total) : WORD[state],
    });
  }

  const cursorView = r.cursor === undefined ? undefined
    : { ratio: atRatio(r.cursor.at, scale), label: r.cursor.label, atEnd: atRatio(r.cursor.at, scale) > 0.5 };

  return { rows, legend, ariaLabel: ariaOf(r, total), cursorView };
}
