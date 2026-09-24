/** date-range · **组件出口**（本组件对外的唯一名字面）。
 *
 *  —— 日期范围（形态 B「日历缩略」）——
 *
 *  一句话：**起止两格 ＋ 一排快捷档 ＋ 一个月的格子**，底下那句口径点名「当前按 哪一档、从哪天到哪天、共几天」
 *  （卡路里／记账／私家大厨／居家管家／备忘录／作息六个技能都在选"看哪一段"）。
 *  它替掉的是「快档点了没反应、不知道现在算的是哪一段」——本件把这一条做成三处同时给：
 *  命中的那一档带 ✓（形）、状态字写「当前按 本周」（字）、口径句里再点名一次（句）。
 *
 *  三个运行名：`renderDateRange(input)`（产标记，零 DOM）／`dateRangeCss()`（样式段）／
 *  `buildDateRangeJs()`（运行时，产出 JS 文本）。加一组契约常量（形态闭集／事件名／触控目标／
 *  间距／格数／缺值写法）与一组**日期算术**（纯函数，判据与调用方都能直接用）与三个类型名。
 *
 *  页面怎么接自己的重算逻辑（不引入任何全局）：
 *  ```js
 *  document.addEventListener('ilife:range-change', (e) => {
 *    const { name, label, from, to, days, preset } = e.detail;   // 数据已就地更新完毕
 *  });
 *  ```
 *  注意：**翻月不派发事件**（换的只是"看哪个月"，没有换窗口）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  DATE_RANGE_CELLS,
  DATE_RANGE_CLASS,
  DATE_RANGE_COLUMNS,
  DATE_RANGE_CUSTOM,
  DATE_RANGE_DAYS_ATTR,
  DATE_RANGE_EVENT_CHANGE,
  DATE_RANGE_FORMS,
  DATE_RANGE_FROM_ATTR,
  DATE_RANGE_GAP_PX,
  DATE_RANGE_HIT_ATTR,
  DATE_RANGE_MISSING,
  DATE_RANGE_NAME_ATTR,
  DATE_RANGE_PRESET_ATTR,
  DATE_RANGE_TO_ATTR,
  DATE_RANGE_TOUCH_PX,
  DATE_RANGE_UNSET,
  DATE_RANGE_WEEK_LABELS,
} from './attrs.js';
export type { DateRangeForm, DateRangeInput, DateRangePreset } from './attrs.js';
export { isIsoDate, monthCells, rangeDays, shiftMonth } from './model.js';
export { renderDateRange, sentenceOf } from './render.js';
export { dateRangeCss } from './style.js';
export { buildDateRangeJs } from './runtime.js';
