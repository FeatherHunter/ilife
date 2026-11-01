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
import type { GanttTimelineForm, GanttTimelineState, GanttTimelineStateKey } from './attrs.js';
import {
  atRatio,
  cellSpan,
  milestoneSpan,
  type GanttTimelineScale,
  type GanttTimelineTick,
} from './scale.js';
import { m } from '../../entries/index.js';

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
  readonly state: GanttTimelineStateKey;
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
/** 各档的读法（图例里的字）。**里程碑也在里面**：只给 `milestones` 不给 `keyPath` 时，
 *  没有这一档图例就整段不出，那枚 `◆` 在图上没有任何字面解释（README 把「◆ 里程碑」列入三样之义）。 */
const WORD: Readonly<Record<GanttTimelineStateKey, string>> = {
  get done() { return m('base-render.components-gantt-timeline-layout.c001'); }, get doing() { return m('base-render.components-gantt-timeline-layout.c002'); }, get wait() { return m('base-render.components-gantt-timeline-layout.c003'); }, get plan() { return m('base-render.components-gantt-timeline-layout.c004'); },
  get idle() { return m('base-render.components-gantt-timeline-layout.c005'); }, get crit() { return m('base-render.components-gantt-timeline-layout.c006'); }, get milestone() { return m('base-render.components-gantt-timeline-layout.c007'); },
};
/** 图例的次序：关键路径在最前，其余按"完成度"从后往前，里程碑收尾。 */
const LEGEND_ORDER: readonly GanttTimelineStateKey[] = ['crit', 'done', 'doing', 'wait', 'plan', 'idle', 'milestone'];

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
  const chain = key.steps.map((s) => m('base-render.components-gantt-timeline-layout.c008', {
    p0: String(s.name),
    p1: String(String(s.minutes)),
  })).join(' → ');
  return m('base-render.components-gantt-timeline-layout.c009', {
    p0: String(key.label),
    p1: String(chain),
    p2: String(String(total)),
  });
}

/** 无障碍名：这一张图在说什么（读屏只有这一句，所以它在、且写全）。 */
function ariaOf(r: GanttTimelineReadings, total: number): string {
  const parts: string[] = [];
  if (r.keyPath !== undefined) {
    const chain = r.keyPath.steps.map((s) => m('base-render.components-gantt-timeline-layout.c010', {
      p0: String(s.name),
      p1: String(String(s.minutes)),
    })).join(' → ');
    parts.push(m('base-render.components-gantt-timeline-layout.c011', {
      p0: String(r.keyPath.label),
      p1: String(chain),
      p2: String(String(total)),
    }));
  }
  for (const lane of r.lanes) {
    if (lane.segments.length === 0) { parts.push(m('base-render.components-gantt-timeline-layout.c012', { p0: String(lane.label) })); continue; }
    /* 空档段那一段同样的写法：起点写 `from`（曾写成 `minutes`，读出来是「空闲 30 到 90 分」——
       60 分起的那段空档被读成 30 分起）。 */
    const segParts: string[] = [];
    for (const seg of lane.segments.slice().sort((a, b) => a.from - b.from)) {
      const head = seg.state === 'idle' ? m('base-render.components-gantt-timeline-layout.c013', { p0: String(String(seg.from)) }) : WORD[seg.state] + ' ' + String(seg.from);
      segParts.push(m('base-render.components-gantt-timeline-layout.c014', {
        p0: String(head),
        p1: String(String(seg.from + seg.minutes)),
      }));
    }
    const each = segParts.join('，');
    parts.push(lane.label + '：' + each);
  }
  for (const ms of r.milestones) parts.push(m('base-render.components-gantt-timeline-layout.c015', { p0: String(ms.label), p1: String(String(ms.at)) }));
  if (r.cursor !== undefined) parts.push(m('base-render.components-gantt-timeline-layout.c016', {
    p0: String(String(r.cursor.at)),
    p1: String(r.cursor.label),
  }));
  return m('base-render.components-gantt-timeline-layout.c017', {
    p0: String(r.title),
    p1: String(parts.length > 0 ? parts.join('。') + '。' : ''),
    p2: String(String(r.scale.spanMinutes)),
  });
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
        title: m('base-render.components-gantt-timeline-layout.c018', {
          p0: String(key.label),
          p1: String(String(i + 1)),
          p2: String(step.name),
          p3: String(String(start)),
          p4: String(String(step.minutes)),
          p5: String(String(cursor)),
        }),
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
      const idleWord = seg.state === 'idle' ? m('base-render.components-gantt-timeline-layout.c019') : '';
      return {
        mark: seg.state === 'idle' ? '' : GLYPH[seg.state],
        state: seg.state,
        from: seg.from,
        minutes: seg.minutes,
        column: at.column,
        span: at.span,
        text: seg.state === 'idle' ? String(seg.minutes) + '′' : seg.label,
        title: m('base-render.components-gantt-timeline-layout.c020', {
          p0: String(lane.label),
          p1: String(String(seg.from)),
          p2: String(idleWord),
          p3: String(String(seg.minutes)),
          p4: String(String(to)),
        }),
        atEnd: false,
      };
    });
    const busy = busyMinutes(lane);
    rows.push({
      kind: 'lane', kindClass: 'is-lane', label: lane.label,
      note: lane.note ?? (busy > 0 ? m('base-render.components-gantt-timeline-layout.c021', { p0: String(String(busy)) }) : m('base-render.components-gantt-timeline-layout.c022')),
      marks,
    });
  }

  for (const ms of r.milestones) {
    const at = milestoneSpan(ms.at, scale);
    rows.push({
      kind: 'milestone', kindClass: 'is-milestone', label: ms.label, note: ms.note,
      marks: [{ mark: '◆', state: 'crit', from: ms.at, minutes: 0, column: at.column, span: at.span,
        atEnd: at.atEnd, title: m('base-render.components-gantt-timeline-layout.c023', {
          p0: String(ms.label),
          p1: String(String(ms.at)),
        }) }],
    });
  }

  const legend: GanttTimelineLegendItem[] = [];
  for (const state of LEGEND_ORDER) {
    /* 里程碑那一档不看 `seen`（它数的是段的状态）：有没有那枚 `◆` 由 `milestones` 定。 */
    if (state === 'milestone') {
      if (r.milestones.length > 0) legend.push({ state, mark: '◆', word: WORD.milestone });
      continue;
    }
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
