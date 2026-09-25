/** portion-gauge · **组件出口**（本组件对外的唯一名字面）。
 *
 *  出口：`renderPortionGauge(input)`（产标记，零 DOM）／`portionGaugeCss()`（样式段）／
 *  `PORTION_GAUGE_FORMS`（形态闭集：换算三栏）／`PORTION_GAUGE_CLASS` 与 `portionGaugeSlot()`（标记契约）／
 *  `PORTION_GAUGE_NARROW_PX`（几何常量：判据拿它对两档几何）／`normalizePortionGauge`（归一化入口）／
 *  行数上下限与缺值写法（判据拿它对非法入参）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export { renderPortionGauge } from './render.js';
export type {
  PortionGaugeForm,
  PortionGaugeInput,
  PortionGaugeRow,
  PortionGaugeSlot,
} from './attrs.js';
export {
  PORTION_GAUGE_CLASS,
  PORTION_GAUGE_FORMS,
  PORTION_GAUGE_MAX_ROWS,
  PORTION_GAUGE_MIN_ROWS,
  PORTION_GAUGE_MISSING,
  PORTION_GAUGE_NARROW_PX,
  PORTION_GAUGE_SLOTS,
  portionGaugeSlot,
} from './attrs.js';
export { PORTION_GAUGE_NOTE, normalizePortionGauge } from './model.js';
export type { PortionGaugeModel, PortionGaugeRowModel } from './model.js';
export { portionGaugeCss } from './style.js';
