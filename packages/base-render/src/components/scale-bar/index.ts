/** scale-bar · **组件出口**（本组件对外的唯一名字面）。
 *
 *  四件出口：`renderScaleBar(input)`（产标记，零 DOM）／`scaleBarCss()`（样式段）／
 *  `SCALE_BAR_VARIANTS`（两形态闭集）／`SCALE_BAR_DEFAULT_CELLS`（条形码缺省格数，调用方要跟它对齐时读它）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export { SCALE_BAR_DEFAULT_CELLS, SCALE_BAR_VARIANTS, renderScaleBar } from './render.js';
export type { ScaleBarInput, ScaleBarVariant } from './render.js';
export { SCALE_BAR_CELL_HEIGHT_PX, SCALE_BAR_LINE_HEIGHT_PX, scaleBarCss } from './style.js';
