/** kanban-columns · **组件出口**（本组件对外的唯一名字面）。
 *
 *  三件运行名：`renderKanbanColumns(input)`（产标记，零 DOM）／`kanbanColumnsCss()`（样式段）／
 *  `buildKanbanColumnsJs()`（运行时段：点卡选中 → 点目标列的收纳键挪过去 → 取消）。
 *  标记契约（别的件／页面要按名字找元素时读它）：`KANBAN_COLUMNS_CLASS`／`KANBAN_COLUMNS_SLOTS`／
 *  `kanbanColumnsSlot()`／`KANBAN_COLUMNS_ATTR`／`KANBAN_COLUMNS_COL_ATTR`／`KANBAN_COLUMNS_CARD_ATTR`。
 *  闭集与几何：`KANBAN_COLUMNS_FORMS`（本件只落地 A 一档「按状态分列」，键名 `status`）／
 *  `KANBAN_COLUMNS_TOUCH_PX`／`KANBAN_COLUMNS_CARD_MIN_PX`／`KANBAN_COLUMNS_GAP_PX`。
 *  四条事件：`KANBAN_COLUMNS_EVENT_PICK`（选中）／`KANBAN_COLUMNS_EVENT_MOVE`（挪到另一列）／
 *  `KANBAN_COLUMNS_EVENT_CANCEL`（取消选中）／`KANBAN_COLUMNS_EVENT_ADD`（往一列加一张）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  KANBAN_COLUMNS_ADD_ATTR,
  KANBAN_COLUMNS_ATTR,
  KANBAN_COLUMNS_BOUND_ATTR,
  KANBAN_COLUMNS_CANCEL_ATTR,
  KANBAN_COLUMNS_CARD_ATTR,
  KANBAN_COLUMNS_CARD_MIN_PX,
  KANBAN_COLUMNS_CLASS,
  KANBAN_COLUMNS_COL_ATTR,
  KANBAN_COLUMNS_CONTAINER,
  KANBAN_COLUMNS_EVENT_ADD,
  KANBAN_COLUMNS_EVENT_CANCEL,
  KANBAN_COLUMNS_EVENT_MOVE,
  KANBAN_COLUMNS_EVENT_PICK,
  KANBAN_COLUMNS_FORMS,
  KANBAN_COLUMNS_GAP_PX,
  KANBAN_COLUMNS_HOVER_QUERY,
  KANBAN_COLUMNS_MARKS,
  KANBAN_COLUMNS_MAX_CARDS,
  KANBAN_COLUMNS_MAX_COLS,
  KANBAN_COLUMNS_MIN_COLS,
  KANBAN_COLUMNS_NARROW_PX,
  KANBAN_COLUMNS_PICK_ATTR,
  KANBAN_COLUMNS_RECEIVE_ATTR,
  KANBAN_COLUMNS_RUNTIME_ATTR,
  KANBAN_COLUMNS_SEG_ATTR,
  KANBAN_COLUMNS_SHOW_ATTR,
  KANBAN_COLUMNS_SLOTS,
  KANBAN_COLUMNS_STATE_ATTR,
  KANBAN_COLUMNS_STATUS_ATTR,
  KANBAN_COLUMNS_TEXT,
  KANBAN_COLUMNS_TOUCH_PX,
  kanbanAddLabel,
  kanbanColumnsSlot,
  kanbanCountText,
  kanbanDropText,
  kanbanReceiveText,
  kanbanStatusText,
} from './attrs.js';
export type {
  KanbanCard,
  KanbanColumn,
  KanbanColumnsForm,
  KanbanColumnsInput,
  KanbanColumnsSlot,
} from './attrs.js';
export { renderKanbanColumns } from './render.js';
export { kanbanColumnsCss } from './style.js';
export { buildKanbanColumnsJs } from './runtime.js';
