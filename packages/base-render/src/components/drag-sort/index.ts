/** drag-sort · **组件出口**（本组件对外的唯一名字面）。
 *
 *  三件运行名：`renderDragSort(input)`（产标记，零 DOM）／`dragSortCss()`（样式段）／
 *  `buildDragSortJs()`（运行时段：点选拿起放下取消 ＋ 拖拽同一份状态）。
 *  标记契约（别的件／页面要按名字找元素时读它）：`DRAG_SORT_CLASS`／`DRAG_SORT_SLOTS`／
 *  `dragSortSlot()`／`DRAG_SORT_ATTR`／`DRAG_SORT_KEY_ATTR`／`DRAG_SORT_HANDLE_ATTR`。
 *  闭集与几何：`DRAG_SORT_FORMS`（本件只落地 A 一档「拖拽中」，键名 `lift`）／
 *  `DRAG_SORT_TOUCH_PX`／`DRAG_SORT_ROW_MIN_PX`／`DRAG_SORT_GAP_PX`。
 *  三条事件：`DRAG_SORT_EVENT_PICK`（拿起）／`DRAG_SORT_EVENT_DROP`（放下）／
 *  `DRAG_SORT_EVENT_CANCEL`（取消）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  DRAG_SORT_AT_ATTR,
  DRAG_SORT_ATTR,
  DRAG_SORT_BOUND_ATTR,
  DRAG_SORT_CANCEL_ATTR,
  DRAG_SORT_CLASS,
  DRAG_SORT_CONTAINER,
  DRAG_SORT_EVENT_CANCEL,
  DRAG_SORT_EVENT_DROP,
  DRAG_SORT_EVENT_PICK,
  DRAG_SORT_FORMS,
  DRAG_SORT_GAP_PX,
  DRAG_SORT_HANDLE_ATTR,
  DRAG_SORT_HOVER_QUERY,
  DRAG_SORT_KEY_ATTR,
  DRAG_SORT_LIFT_ATTR,
  DRAG_SORT_LINE_ATTR,
  DRAG_SORT_LIST_ATTR,
  DRAG_SORT_MAX_ITEMS,
  DRAG_SORT_MIN_ITEMS,
  DRAG_SORT_NARROW_PX,
  DRAG_SORT_ROW_MIN_PX,
  DRAG_SORT_RUNTIME_ATTR,
  DRAG_SORT_SLOTS,
  DRAG_SORT_SLOT_ATTR,
  DRAG_SORT_STATUS_ATTR,
  DRAG_SORT_TEXT,
  DRAG_SORT_TOUCH_PX,
  dragSortSlot,
} from './attrs.js';
export type {
  DragSortForm,
  DragSortInput,
  DragSortItem,
  DragSortSlot,
} from './attrs.js';
export { renderDragSort } from './render.js';
export { dragSortCss } from './style.js';
export { buildDragSortJs } from './runtime.js';
