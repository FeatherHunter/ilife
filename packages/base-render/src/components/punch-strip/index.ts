/** punch-strip · **组件出口**（本组件对外的唯一名字面）。
 *
 *  四件出口：`renderPunchStrip(input)`（产标记，零 DOM）／`punchStripCss()`（样式段）／
 *  两个常量（`PUNCH_STRIP_MAX_CELLS`／`PUNCH_STRIP_EMPTY_MARK`）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 *  样式由本族汇总入口 `sheetCss()` 一并挂上（与另四件同一条口径）。
 */
export { PUNCH_STRIP_EMPTY_MARK, PUNCH_STRIP_MAX_CELLS, renderPunchStrip } from './render.js';
export type { PunchCellInput, PunchStripInput } from './render.js';
export { PUNCH_STRIP_BOX_HEIGHT_PX, PUNCH_STRIP_BOX_RADIUS_PX, punchStripCss } from './style.js';
