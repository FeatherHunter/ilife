/** small-multiples · **组件出口**（本组件对外的唯一名字面）。
 *
 *  五件出口：`renderSmallMultiples(input)`（产标记，零 DOM）／`smallMultiplesCss()`（样式段）／
 *  `SMALL_MULTIPLES_FORMS`（形态闭集：本件只落地原型墙 no.68 的 C 档「期间并排迷你柱阵 ＋ 均值线」）／
 *  `SMALL_MULTIPLES_CLASS` 与 `smallMultiplesSlot()`（标记契约）；另有尺常量（期间数上下限、
 *  柱高的映射区间、柱阵区高度）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export { renderSmallMultiples } from './render.js';
export type {
  SmallMultiplesForm,
  SmallMultiplesInput,
  SmallMultiplesPeriod,
  SmallMultiplesSlot,
} from './attrs.js';
export {
  SMALL_MULTIPLES_BAR_CEIL_PCT,
  SMALL_MULTIPLES_BAR_FLOOR_PCT,
  SMALL_MULTIPLES_CLASS,
  SMALL_MULTIPLES_FORMS,
  SMALL_MULTIPLES_MAX_PERIODS,
  SMALL_MULTIPLES_MIN_PERIODS,
  SMALL_MULTIPLES_SLOTS,
  smallMultiplesSlot,
} from './attrs.js';
export { SMALL_MULTIPLES_PLOT_PX, smallMultiplesCss } from './style.js';
