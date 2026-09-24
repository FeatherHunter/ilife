/** scatter-fit · **组件出口**（本组件对外的唯一名字面）。
 *
 *  五件出口：`renderScatterFit(input)`（产标记，零 DOM）／`scatterFitCss()`（样式段）／
 *  `SCATTER_FIT_FORMS`（形态闭集：散点／分箱／滞后）／`SCATTER_FIT_CLASS` 与 `scatterFitSlot()`（标记契约）／
 *  `SCATTER_FIT_PLOT_PX`／`SCATTER_FIT_BIN_PX`（图区高度：判据拿它对两档几何）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export { renderScatterFit } from './render.js';
export type {
  ScatterFitBin,
  ScatterFitForm,
  ScatterFitInput,
  ScatterFitLag,
  ScatterFitPoint,
  ScatterFitSlot,
} from './attrs.js';
export {
  SCATTER_FIT_AXIS_INSET,
  SCATTER_FIT_BIN_MAX,
  SCATTER_FIT_BIN_MIN,
  SCATTER_FIT_BIN_MIN_SAMPLE,
  SCATTER_FIT_CLASS,
  SCATTER_FIT_FORMS,
  SCATTER_FIT_LAG_MAX,
  SCATTER_FIT_LAG_MIN,
  SCATTER_FIT_MAX_LAG_DAYS,
  SCATTER_FIT_MAX_POINTS,
  SCATTER_FIT_MIN_POINTS,
  SCATTER_FIT_MISSING,
  SCATTER_FIT_SLOTS,
  SCATTER_FIT_X_TICKS,
  SCATTER_FIT_Y_TICKS,
  scatterFitSlot,
} from './attrs.js';
export { SCATTER_FIT_BIN_PX, SCATTER_FIT_PLOT_PX, scatterFitCss } from './style.js';
