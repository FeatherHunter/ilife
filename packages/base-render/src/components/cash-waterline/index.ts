/** cash-waterline · **组件出口**（本组件对外的唯一名字面）。
 *
 *  四件出口：`renderCashWaterline(input)`（产标记，零 DOM）／`cashWaterlineCss()`（样式段）／
 *  `CASH_WATERLINE_FORMS`（形态闭集：水位柱／子弹图／进出水三栏）／`CASH_WATERLINE_CLASS` 与
 *  `cashWaterlineSlot()`（标记契约）；另有尺常量（画布高度、底线缺省、两处上限）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export { renderCashWaterline } from './render.js';
export type {
  CashWaterlineDay,
  CashWaterlineFlowLine,
  CashWaterlineForm,
  CashWaterlineInput,
  CashWaterlineSlot,
  CashWaterlineWeek,
} from './attrs.js';
export {
  CASH_WATERLINE_CLASS,
  CASH_WATERLINE_DEFAULT_THRESHOLD_PCT,
  CASH_WATERLINE_DEFAULT_UNIT,
  CASH_WATERLINE_FORMS,
  CASH_WATERLINE_HEIGHT_VAR,
  CASH_WATERLINE_MAX_AXIS_LABELS,
  CASH_WATERLINE_MAX_DAYS,
  CASH_WATERLINE_MAX_LINES,
  CASH_WATERLINE_MAX_WEEKS,
  CASH_WATERLINE_MISSING,
  CASH_WATERLINE_SLOTS,
  CASH_WATERLINE_THRESHOLD_VAR,
  CASH_WATERLINE_USED_THRESHOLD_VAR,
  CASH_WATERLINE_WIDTH_VAR,
  cashWaterlineSlot,
} from './attrs.js';
export { CASH_WATERLINE_PLOT_HEIGHT_PX, cashWaterlineCss } from './style.js';
