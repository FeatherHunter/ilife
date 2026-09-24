/** stacked-bar · **组件出口**（本组件对外的唯一名字面）。
 *
 *  五件出口：`renderStackedBar(input)`（产标记，零 DOM）／`stackedBarCss()`（样式段）／
 *  `STACKED_BAR_FORMS`（形态闭集）／`STACKED_BAR_CLASS` 与 `stackedBarSlot()`（标记契约）／
 *  三个尺常量（段数上限、段内读数的两档占比阈值）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export { renderStackedBar } from './render.js';
export type { StackedBarForm, StackedBarInput, StackedBarSegment, StackedBarSlot } from './attrs.js';
export {
  STACKED_BAR_CLASS,
  STACKED_BAR_FORMS,
  STACKED_BAR_MAX_SEGMENTS,
  STACKED_BAR_MISSING,
  STACKED_BAR_NAME_MIN_PCT,
  STACKED_BAR_SERIES,
  STACKED_BAR_SLOTS,
  STACKED_BAR_VALUE_MIN_PCT,
  stackedBarSlot,
} from './attrs.js';
export { STACKED_BAR_HEIGHT_PX, stackedBarCss } from './style.js';
