/** sheet-frame · **组件出口**（本组件对外的唯一名字面）。
 *
 *  四件出口：
 *   · `renderSheetFrame(input)` —— 产标记（纯函数，零 DOM）；
 *   · `sheetFrameCss()` —— 纸这一件的样式段；
 *   · `sheetCss()` —— **本族样式汇总**（纸 ＋ 主数字头 ＋ 刻度条 ＋ 账目行 ＋ 明细行）；
 *   · `SHEET_VARIANTS` —— 纸的性格闭集（`plain`／`receipt`）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export { SHEET_VARIANTS, renderSheetFrame } from './render.js';
export type { SheetFrameInput, SheetVariant } from './render.js';
export { sheetCss, sheetFrameCss } from './style.js';
