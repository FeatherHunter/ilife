/** gantt-timeline · **组件出口**（本组件对外的唯一名字面）。
 *
 *  五件出口：`renderGanttTimeline(input)`（产标记，零 DOM）／`ganttTimelineCss()`（样式段）／
 *  `GANTT_TIMELINE_FORMS`（形态闭集：本件只落地原型形态 C）＋`GANTT_TIMELINE_STATES`（段的状态闭集）／
 *  `GANTT_TIMELINE_CLASS` 与 `ganttTimelineSlot()`（标记契约）／
 *  `GANTT_TIMELINE_WIDE_MIN_PX` 与几枚尺常量（判据拿它们对两档几何）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export { renderGanttTimeline } from './render.js';
export type {
  GanttTimelineCursor,
  GanttTimelineForm,
  GanttTimelineInput,
  GanttTimelineKeyPath,
  GanttTimelineLane,
  GanttTimelineMilestone,
  GanttTimelineSegment,
  GanttTimelineSlot,
  GanttTimelineState,
  GanttTimelineStep,
} from './attrs.js';
export {
  GANTT_TIMELINE_AT_VAR,
  GANTT_TIMELINE_CLASS,
  GANTT_TIMELINE_DEFAULT_CELL_MINUTES,
  GANTT_TIMELINE_FORMS,
  GANTT_TIMELINE_IDLE_MIN_CELLS,
  GANTT_TIMELINE_MAX_CELLS,
  GANTT_TIMELINE_MAX_KEY_STEPS,
  GANTT_TIMELINE_MAX_LANES,
  GANTT_TIMELINE_MAX_MILESTONES,
  GANTT_TIMELINE_MAX_TICK_LABELS,
  GANTT_TIMELINE_MIN_CELLS,
  GANTT_TIMELINE_MIN_KEY_STEPS,
  GANTT_TIMELINE_SLOTS,
  GANTT_TIMELINE_STATES,
  ganttTimelineSlot,
  ganttTimelineStateClass,
} from './attrs.js';
export {
  GANTT_TIMELINE_BAR_PX,
  GANTT_TIMELINE_GAP_PX,
  GANTT_TIMELINE_LABEL_PX,
  GANTT_TIMELINE_NOW_BAND_PX,
  GANTT_TIMELINE_TRACK_MIN_PX,
  GANTT_TIMELINE_WIDE_MIN_PX,
  ganttTimelineCss,
} from './style.js';
