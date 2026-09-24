/** gantt-timeline · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不"描到最近的格线"：
 *      描歪了的条会让人按刻度数出一个错的时间。
 *   2. **归一化只做形状**：格数、刻度文字、时间跨度都在这里定完；**落位与图例在 `layout.ts`**。
 *   3. 落位的算术**只有一处**（`scale.ts`）：本件不自己再算一遍百分比，也不把数字塞进字符串再抠回来。
 *
 *  本件是**唯一入参入口**：`render.ts` 只吃这里产出的 `GanttTimelineModel`，不再自己碰 `any`。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  GANTT_TIMELINE_DEFAULT_CELL_MINUTES,
  GANTT_TIMELINE_FORMS,
  GANTT_TIMELINE_IDLE_MIN_CELLS,
  GANTT_TIMELINE_MAX_CELLS,
  GANTT_TIMELINE_MAX_KEY_STEPS,
  GANTT_TIMELINE_MAX_LANES,
  GANTT_TIMELINE_MAX_MILESTONES,
  GANTT_TIMELINE_MIN_KEY_STEPS,
  GANTT_TIMELINE_STATES,
  type GanttTimelineForm,
  type GanttTimelineState,
} from './attrs.js';
import {
  laneEndMinutes,
  layoutGanttTimeline,
  type GanttTimelineCursorView,
  type GanttTimelineKeyView,
  type GanttTimelineLaneView,
  type GanttTimelineLayout,
  type GanttTimelineMilestoneView,
  type GanttTimelineReadings,
  type GanttTimelineSegmentView,
} from './layout.js';
import { isOnGrid, scaleOf, tickCount, ticksOf } from './scale.js';

/** 内部类型：入参校验产出的读数 ＋ 装配产出的行与图例（每个字段都已校验、已归一）。 */
export interface GanttTimelineModel extends GanttTimelineReadings, GanttTimelineLayout {}

/** 本件的缺省口径句（**这一句是这一件的读数纪律，不是装饰**）。 */
const DEFAULT_NOTE = '口径：一行＝一条泳道（不是一道菜），问的是这条资源什么时候空。'
  + '关键路径单独一条，标 1 起的顺序号。空档段画成点线块并写分钟数，不装作占用。';

/* ── 入参小件（数字／状态／格线） ─────────────────────────────────── */

function num(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) badInput(field + ' 必须是有限数字');
  return value;
}

function optNum(value: unknown, field: string): number | undefined {
  return value === undefined ? undefined : num(value, field);
}

/** 落在格线上（段的起止必须踩格线：本件不许"描到最近的格线"）。 */
function onGrid(value: number, cellMinutes: number, field: string): number {
  if (!isOnGrid(value, cellMinutes)) {
    badInput(field + ' 必须落在格线上（每格 ' + String(cellMinutes) + ' 分钟）：' + String(value));
  }
  return value;
}

function reqState(value: unknown, field: string): GanttTimelineState {
  if (value === undefined) return 'plan';
  if (!(GANTT_TIMELINE_STATES as readonly unknown[]).includes(value)) {
    badInput(field + ' 必须是 ' + GANTT_TIMELINE_STATES.join('／') + ' 之一');
  }
  return value as GanttTimelineState;
}

/* ── 泳道 ─────────────────────────────────────────────────────────── */

function parseSegments(raw: unknown, laneLabel: string, cellMinutes: number): readonly GanttTimelineSegmentView[] {
  if (!Array.isArray(raw)) badInput('gantt-timeline: input.lanes[].segments 必须是数组（空数组＝整段时间都空着）');
  const out: GanttTimelineSegmentView[] = [];
  const taken: { readonly from: number; readonly to: number }[] = [];
  raw.forEach((item, i) => {
    const where = 'gantt-timeline: input.lanes(' + laneLabel + ').segments[' + String(i) + ']';
    assertPlainObject(item, where);
    const one = item as Record<string, unknown>;
    const state = reqState(one.state, where + '.state');
    const from = onGrid(num(one.from, where + '.from'), cellMinutes, where + '.from');
    if (from < 0) badInput(where + '.from 不能是负数（时间轴从 0 起）');
    const minutes = num(one.minutes, where + '.minutes');
    if (minutes <= 0) badInput(where + '.minutes 必须是正数');
    const to = from + minutes;
    onGrid(to, cellMinutes, where + '.from 与 minutes 之和');
    if (state === 'idle' && minutes / cellMinutes < GANTT_TIMELINE_IDLE_MIN_CELLS - 1e-6) {
      badInput(where + '.minutes 太短：空档段至少要占 ' + String(GANTT_TIMELINE_IDLE_MIN_CELLS)
        + ' 格（再短的块里那枚分钟数要拆成好几行才放得下）');
    }
    for (const span of taken) {
      if (from < span.to - 1e-6 && to > span.from + 1e-6) {
        badInput(where + ' 与同一条泳道里另一段压在了一起（' + String(span.from) + '–' + String(span.to)
          + ' 分钟）：一条资源同一时刻只做一件事');
      }
    }
    taken.push({ from, to });
    out.push({ from, minutes, state, label: optText(one.label, where + '.label') });
  });
  return out;
}

function parseLanes(raw: unknown, cellMinutes: number): readonly GanttTimelineLaneView[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    badInput('gantt-timeline: input.lanes 必须是非空数组（一条泳道＝一条资源）');
  }
  if (raw.length > GANTT_TIMELINE_MAX_LANES) {
    badInput('gantt-timeline: input.lanes 最多 ' + String(GANTT_TIMELINE_MAX_LANES)
      + ' 条（一屏再多就读不出哪条空着）');
  }
  return raw.map((item, i) => {
    const where = 'gantt-timeline: input.lanes[' + String(i) + ']';
    assertPlainObject(item, where);
    const one = item as Record<string, unknown>;
    const label = reqText(one.label, where + '.label');
    return {
      label,
      note: optText(one.note, where + '.note'),
      segments: parseSegments(one.segments, label, cellMinutes),
    };
  });
}

/* ── 三块可选的读数（关键路径／里程碑／游标） ─────────────────────── */

function parseKeyPath(raw: unknown, cellMinutes: number): GanttTimelineKeyView {
  assertPlainObject(raw, 'gantt-timeline: input.keyPath');
  const one = raw as Record<string, unknown>;
  if (!Array.isArray(one.steps)) badInput('gantt-timeline: input.keyPath.steps 必须是数组');
  const n = one.steps.length;
  if (n < GANTT_TIMELINE_MIN_KEY_STEPS || n > GANTT_TIMELINE_MAX_KEY_STEPS) {
    badInput('gantt-timeline: input.keyPath.steps 要有 ' + String(GANTT_TIMELINE_MIN_KEY_STEPS) + '–'
      + String(GANTT_TIMELINE_MAX_KEY_STEPS) + ' 段（一段不是路径）');
  }
  const steps: { name: string; minutes: number }[] = [];
  one.steps.forEach((item, i) => {
    const where = 'gantt-timeline: input.keyPath.steps[' + String(i) + ']';
    assertPlainObject(item, where);
    const step = item as Record<string, unknown>;
    const minutes = num(step.minutes, where + '.minutes');
    if (minutes <= 0) badInput(where + '.minutes 必须是正数');
    onGrid(minutes, cellMinutes, where + '.minutes');
    steps.push({ name: reqText(step.name, where + '.name'), minutes });
  });
  return {
    label: optText(one.label, 'gantt-timeline: input.keyPath.label') ?? '关键路径',
    note: optText(one.note, 'gantt-timeline: input.keyPath.note') ?? '不能并行的 ' + String(n) + ' 段',
    steps,
  };
}

function parseMilestones(raw: unknown, cellMinutes: number): readonly GanttTimelineMilestoneView[] {
  if (!Array.isArray(raw)) badInput('gantt-timeline: input.milestones 必须是数组');
  if (raw.length > GANTT_TIMELINE_MAX_MILESTONES) {
    badInput('gantt-timeline: input.milestones 最多 ' + String(GANTT_TIMELINE_MAX_MILESTONES) + ' 个');
  }
  return raw.map((item, i) => {
    const where = 'gantt-timeline: input.milestones[' + String(i) + ']';
    assertPlainObject(item, where);
    const one = item as Record<string, unknown>;
    const at = onGrid(num(one.at, where + '.at'), cellMinutes, where + '.at');
    return {
      at,
      label: reqText(one.label, where + '.label'),
      note: optText(one.note, where + '.note') ?? String(at) + ' 分 里程碑',
    };
  });
}

function parseCursor(raw: unknown): GanttTimelineCursorView {
  assertPlainObject(raw, 'gantt-timeline: input.cursor');
  const one = raw as Record<string, unknown>;
  const at = num(one.at, 'gantt-timeline: input.cursor.at');
  if (at < 0) badInput('gantt-timeline: input.cursor.at 不能是负数');
  return { at, label: reqText(one.label, 'gantt-timeline: input.cursor.label') };
}

/* ── 归一化入口 ───────────────────────────────────────────────────── */

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `GanttTimelineModel`。 */
export function normalizeGanttTimeline(input: unknown): GanttTimelineModel {
  assertPlainObject(input, 'renderGanttTimeline: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? GANTT_TIMELINE_FORMS[0] : raw.form;
  if (!(GANTT_TIMELINE_FORMS as readonly unknown[]).includes(form)) {
    badInput('gantt-timeline: input.form 必须是 ' + GANTT_TIMELINE_FORMS.join('／')
      + ' 之一（本件只落地形态 C「资源泳道（灶位）× 关键路径带」）');
  }

  const cellMinutes = optNum(raw.cellMinutes, 'gantt-timeline: input.cellMinutes')
    ?? GANTT_TIMELINE_DEFAULT_CELL_MINUTES;
  if (!(cellMinutes > 0)) badInput('gantt-timeline: input.cellMinutes 必须是正数');

  const title = reqText(raw.title, 'gantt-timeline: input.title');
  const lanes = parseLanes(raw.lanes, cellMinutes);
  const keyPath = raw.keyPath === undefined ? undefined : parseKeyPath(raw.keyPath, cellMinutes);
  const milestones = raw.milestones === undefined ? [] : parseMilestones(raw.milestones, cellMinutes);
  const cursor = raw.cursor === undefined ? undefined : parseCursor(raw.cursor);

  /* 时间跨度：**按数据算**（最晚的一处），调用方给的那一档只当"至少到这儿"。 */
  let end = Math.max(cursor === undefined ? 0 : cursor.at, cellMinutes);
  for (const lane of lanes) end = Math.max(end, laneEndMinutes(lane));
  if (keyPath !== undefined) end = Math.max(end, keyPath.steps.reduce((sum, s) => sum + s.minutes, 0));
  for (const m of milestones) end = Math.max(end, m.at);
  const asked = optNum(raw.spanMinutes, 'gantt-timeline: input.spanMinutes');
  if (asked !== undefined && !(asked > 0)) badInput('gantt-timeline: input.spanMinutes 必须是正数');
  if (Math.ceil(Math.max(asked ?? 0, end) / cellMinutes - 1e-6) > GANTT_TIMELINE_MAX_CELLS) {
    badInput('gantt-timeline: 时间跨度 ' + String(Math.max(asked ?? 0, end)) + ' 分钟 ÷ 每格 '
      + String(cellMinutes) + ' 分钟 超过 ' + String(GANTT_TIMELINE_MAX_CELLS)
      + ' 格：请把 input.cellMinutes 调大（刻度放粗）');
  }
  const scale = scaleOf(Math.max(asked ?? 0, end), cellMinutes);

  /* 刻度文字：枚数必须与算出来的刻度数一致（刻度只有一处算）。 */
  let tickText: readonly string[] | undefined;
  if (raw.tickText !== undefined) {
    if (!Array.isArray(raw.tickText)) badInput('gantt-timeline: input.tickText 必须是字符串数组');
    const want = tickCount(scale.cells);
    if (raw.tickText.length !== want) {
      const every = want <= 1 ? scale.cells : scale.cells / want;
      badInput('gantt-timeline: input.tickText 要有 ' + String(want) + ' 枚（这个跨度下每 '
        + String(every) + ' 格一枚刻度）');
    }
    tickText = raw.tickText.map((t, i) => reqText(t, 'gantt-timeline: input.tickText[' + String(i) + ']'));
  }

  const readings: GanttTimelineReadings = {
    form: form as GanttTimelineForm,
    title,
    stamp: optText(raw.stamp, 'gantt-timeline: input.stamp') ?? String(lanes.length) + ' 条泳道',
    tail: optText(raw.tail, 'gantt-timeline: input.tail'),
    axisName: optText(raw.axisName, 'gantt-timeline: input.axisName') ?? '分钟',
    scale,
    ticks: ticksOf(scale, tickText),
    keyPath,
    lanes,
    milestones,
    cursor,
    note: optText(raw.note, 'gantt-timeline: input.note') ?? DEFAULT_NOTE,
    extraClass: optExtraClass(raw.extraClass, 'gantt-timeline: input.extraClass'),
  };
  return { ...readings, ...layoutGanttTimeline(readings) };
}
