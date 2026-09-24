/** entry-rows · **组件出口**（本组件对外的唯一名字面）。
 *
 *  四件出口：`renderEntryRows(input)`（产标记，零 DOM）／`entryRowsCss()`（样式段）／
 *  两枚几何读数（时间槽宽、备注缩进——调用方要在别处对齐同一列时读它们）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export { renderEntryRows } from './render.js';
export type { EntryRowInput, EntryRowsInput } from './render.js';
export { ENTRY_ROW_NOTE_INDENT_PX, ENTRY_ROW_TIME_MIN_WIDTH_PX, entryRowsCss } from './style.js';
