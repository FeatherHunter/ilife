/** undo-timeline · **组件出口**（本组件对外的唯一名字面）。
 *
 *  四个运行名：`renderUndoTimeline(input)`（产标记，零 DOM）／`undoTimelineCss()`（样式段，
 *  含一条轨那半与回滚单那半）／`buildUndoTimelineJs()`（运行时，产出 JS 文本）／
 *  槽位助手 `undoTimelineSlot()`。加四个闭集与常量（形态 `track`／`impact`、三态
 *  `undoable`／`undone`／`locked`、触控地板与窄档阈值、四个上限）、四个行内 `id` 拼法
 *  （判据要按同一函数反查 `aria-controls`／`aria-describedby` 指到了谁）与入参面类型。
 *
 *  页面怎么接自己的逻辑（不引入任何全局；本件不写库）：
 *  ```js
 *  document.addEventListener('ilife:undo-timeline-undo', (e) => {
 *    const { name, key, items } = e.detail;   // items＝这次要撤的影响面那几项
 *    undoChange(key, items).then(() => rerender());
 *  });
 *  document.addEventListener('ilife:undo-timeline-restore', (e) => restoreChange(e.detail.key));
 *  document.addEventListener('ilife:undo-timeline-rollback', (e) => askThenRollback(e.detail.label));
 *  ```
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  UNDO_TIMELINE_CLASS,
  UNDO_TIMELINE_EVENT_CANCEL,
  UNDO_TIMELINE_EVENT_PICK,
  UNDO_TIMELINE_EVENT_RESTORE,
  UNDO_TIMELINE_EVENT_ROLLBACK,
  UNDO_TIMELINE_EVENT_UNDO,
  UNDO_TIMELINE_FORMS,
  UNDO_TIMELINE_GAP_PX,
  UNDO_TIMELINE_GO_TEXT,
  UNDO_TIMELINE_MISSING,
  UNDO_TIMELINE_NARROW_PX,
  UNDO_TIMELINE_ROW_MIN_PX,
  UNDO_TIMELINE_SLOTS,
  UNDO_TIMELINE_STATES,
  UNDO_TIMELINE_STATE_TAG,
  UNDO_TIMELINE_TOUCH_PX,
  undoTimelineSlot,
} from './attrs.js';
export type {
  UndoTimelineEntry,
  UndoTimelineForm,
  UndoTimelineImpact,
  UndoTimelineImpactRow,
  UndoTimelineInput,
  UndoTimelineReading,
  UndoTimelineRollback,
  UndoTimelineSlot,
  UndoTimelineState,
} from './attrs.js';
export { renderUndoTimeline } from './render.js';
export {
  UNDO_TIMELINE_CHANGE_KEY,
  UNDO_TIMELINE_ENTRY_MAX,
  UNDO_TIMELINE_IMPACT_MAX,
  UNDO_TIMELINE_READING_MAX,
} from './model.js';
export {
  undoTimelineErrorId,
  undoTimelineHintId,
  undoTimelinePickId,
  undoTimelineSumId,
  undoTimelineTagId,
} from './ids.js';
export { undoTimelineCss } from './style.js';
export { buildUndoTimelineJs } from './runtime.js';
