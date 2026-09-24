/** calendar-month · **组件出口**（本组件对外的唯一名字面）。
 *
 *  三件出口：`renderCalendarMonth(input)`（产标记，零 DOM）／`calendarMonthCss()`（样式段）／
 *  标记契约常量（类名根、槽位闭集、形态闭集、缺值字、五档闭集、格盘口径）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 *  样式由页面按需注入 `calendarMonthCss()`（**加法式**：不挂就零命中，别的页逐字节不变）。
 */
export {
  CALENDAR_MONTH_CLASS,
  CALENDAR_MONTH_FORMS,
  CALENDAR_MONTH_LEVELS,
  CALENDAR_MONTH_MAX_WEEKS,
  CALENDAR_MONTH_MISSING,
  CALENDAR_MONTH_SLOTS,
  CALENDAR_MONTH_TODAY_MARK,
  CALENDAR_MONTH_WEEKDAYS,
  CALENDAR_MONTH_WEEK_LENGTH,
  calendarMonthSlot,
} from './attrs.js';
export type {
  CalendarMonthDayInput,
  CalendarMonthForm,
  CalendarMonthInput,
  CalendarMonthLegendItem,
  CalendarMonthLevel,
  CalendarMonthSlot,
  CalendarMonthSummary,
} from './attrs.js';
export { renderCalendarMonth } from './render.js';
export {
  CALENDAR_MONTH_BAR_HEIGHT_PX,
  CALENDAR_MONTH_CELL_MIN_HEIGHT_PX,
  CALENDAR_MONTH_LEVEL_HEIGHTS_PX,
  CALENDAR_MONTH_NARROW_PX,
  calendarMonthCss,
} from './style.js';
