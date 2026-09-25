/** gap-band · **组件出口**（本组件对外的唯一名字面）。
 *
 *  五件出口：`renderGapBand(input)`（产标记，零 DOM）／`gapBandCss()`（样式段）／
 *  `GAP_BAND_FORMS`（形态闭集：连续差值带／每日偏差柱）／`GAP_BAND_CLASS` 与 `gapBandSlot()`（标记契约）／
 *  `GAP_BAND_PLOT_PX`／`GAP_BAND_NARROW_PLOT_PX`／`GAP_BAND_COLS_PX`／`GAP_BAND_NARROW_COLS_PX`／
 *  `GAP_BAND_WIDE_COLS_PX`／`GAP_BAND_NARROW_PX`／`GAP_BAND_AXIS_TICKS`／`GAP_BAND_MAX_TICKS`／
 *  `GAP_BAND_DEV_MAX_PCT`／`GAP_BAND_MIN_DAYS`／`GAP_BAND_MAX_DAYS`／`GAP_BAND_SLOTS`／
 *  `GAP_BAND_MISSING`（常量面：判据拿它对两档几何与轴域）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export { renderGapBand } from './render.js';
export type {
  GapBandDay,
  GapBandForm,
  GapBandInput,
  GapBandSlot,
} from './attrs.js';
export {
  GAP_BAND_AXIS_TICKS,
  GAP_BAND_CLASS,
  GAP_BAND_DEV_MAX_PCT,
  GAP_BAND_FORMS,
  GAP_BAND_MAX_DAYS,
  GAP_BAND_MAX_TICKS,
  GAP_BAND_MIN_DAYS,
  GAP_BAND_MISSING,
  GAP_BAND_NARROW_PX,
  GAP_BAND_SLOTS,
  gapBandSlot,
} from './attrs.js';
export {
  GAP_BAND_COLS_PX,
  GAP_BAND_NARROW_COLS_PX,
  GAP_BAND_NARROW_PLOT_PX,
  GAP_BAND_PLOT_PX,
  GAP_BAND_WIDE_COLS_PX,
  gapBandCss,
} from './style.js';
