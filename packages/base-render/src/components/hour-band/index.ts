/** hour-band · **组件出口**（本组件对外的唯一名字面）。
 *
 *  三件出口：`renderHourBand(input)`（产标记，零 DOM）／`hourBandCss()`（样式段）／
 *  标记契约常量（类名根、槽位闭集、形态闭集、深浅档闭集、轴长与"段内时长字"的阈值）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 *  样式由页面按需注入 `hourBandCss()`（**加法式**：不挂就零命中，别的页逐字节不变）。
 *
 *  **与 `packages/skill-schedule` 的本地件 `renderHourBand` 不是同一个东西**：那个画 24 根柱子
 *  （每小时记了多少分钟），本件画一条带上的若干区间（几段时间在做什么）；两者都在，互不替代。
 */
export {
  HOUR_BAND_CLASS,
  HOUR_BAND_DEFAULT_TONE,
  HOUR_BAND_FORMS,
  HOUR_BAND_HOURS,
  HOUR_BAND_MINUTES_PER_DAY,
  HOUR_BAND_MISSING,
  HOUR_BAND_RULER_NARROW_PX,
  HOUR_BAND_SLOTS,
  HOUR_BAND_TEXT_MIN_FRACTION,
  HOUR_BAND_TONES,
  HOUR_BAND_UNRECORDED_LABEL,
  hourBandSlot,
} from './attrs.js';
export type {
  HourBandForm,
  HourBandInput,
  HourBandIntervalInput,
  HourBandLegendItem,
  HourBandSlot,
  HourBandSummary,
  HourBandTone,
} from './attrs.js';
export { renderHourBand } from './render.js';
export {
  HOUR_BAND_HEIGHT_PX,
  HOUR_BAND_RULER_FONT_PX,
  hourBandCss,
} from './style.js';
export { hourBandClock, hourBandDuration, hourBandPercent } from './model.js';
