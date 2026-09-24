/** range-bar · **组件出口**（本组件对外的唯一名字面）。
 *
 *  三件出口：`renderRangeBar(input)`（产标记，零 DOM）／`rangeBarCss()`（样式段）／
 *  标记契约常量（类名根、槽位闭集、形态闭集、深浅档闭集、两档栏宽与"段内时长字"的阈值）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 *  样式由页面按需注入 `rangeBarCss()`（**加法式**：不挂就零命中，别的页逐字节不变）。
 */
export {
  RANGE_BAR_CLASS,
  RANGE_BAR_DEFAULT_TONE,
  RANGE_BAR_FORMS,
  RANGE_BAR_NARROW_PX,
  RANGE_BAR_SLOTS,
  RANGE_BAR_TEXT_HIDE_BELOW_PX,
  RANGE_BAR_TEXT_MIN_FRACTION,
  RANGE_BAR_TONES,
  rangeBarSlot,
} from './attrs.js';
export type {
  RangeBarDomain,
  RangeBarForm,
  RangeBarInput,
  RangeBarIntervalInput,
  RangeBarLaneInput,
  RangeBarSlot,
  RangeBarSummary,
  RangeBarTone,
} from './attrs.js';
export { renderRangeBar } from './render.js';
export {
  RANGE_BAR_KEY_COLUMN_NARROW_PX,
  RANGE_BAR_KEY_COLUMN_PX,
  RANGE_BAR_RAIL_HEIGHT_PX,
  RANGE_BAR_TICK_GAP_PX,
  RANGE_BAR_TOTAL_COLUMN_NARROW_PX,
  RANGE_BAR_TOTAL_COLUMN_PX,
  rangeBarCss,
} from './style.js';
