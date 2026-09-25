/** spread-dist · **组件出口**（本组件对外的唯一名字面）。
 *
 *  五件出口：`renderSpreadDist(input)`（产标记，零 DOM）／`spreadDistCss()`（样式段）／
 *  `SPREAD_DIST_FORMS`（形态闭集：逐日范围柱／分位尺）／`SPREAD_DIST_CLASS` 与 `spreadDistSlot()`（标记契约）／
 *  `SPREAD_DIST_DAYS_PX`／`SPREAD_DIST_NARROW_DAYS_PX`／`SPREAD_DIST_NARROW_PX`（几何常量：判据拿它对两档几何）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export { renderSpreadDist } from './render.js';
export type {
  SpreadDistDay,
  SpreadDistForm,
  SpreadDistInput,
  SpreadDistSlot,
  SpreadDistStop,
} from './attrs.js';
export {
  SPREAD_DIST_AXIS_TICKS,
  SPREAD_DIST_CLASS,
  SPREAD_DIST_FORMS,
  SPREAD_DIST_MAX_DAYS,
  SPREAD_DIST_MAX_STOPS,
  SPREAD_DIST_MAX_TICKS,
  SPREAD_DIST_MIN_DAYS,
  SPREAD_DIST_MIN_STOPS,
  SPREAD_DIST_MISSING,
  SPREAD_DIST_NARROW_PX,
  SPREAD_DIST_SLOTS,
  spreadDistSlot,
} from './attrs.js';
export { SPREAD_DIST_DAYS_PX, SPREAD_DIST_NARROW_DAYS_PX, spreadDistCss } from './style.js';
