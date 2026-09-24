/** windowPicker · **组件出口**（该组件对外的唯一名字面）。
 *
 *  —— 窗口选择器（形态 A：一行工具条：段 ＋ 起止 ＋ 天数）——
 *
 *  一句话：**看哪一段**由页上的一行说得清清楚楚——档（今日／本周／近 30 天／自定义）＋
 *  起止两个日期 ＋「共 N 天」；N 是按两个日期算出来的，起止被手改就自动落到「自定义」档。
 *
 *  什么时候用它（对照既有件想清楚再选）：
 *   · 整页读数要按一段时间重算（六个技能的每一页都有这一件）→ 用它；
 *   · 只是「起止两个日期」的输入（与页面读数无关）→ 用 `date-range`；
 *   · 要「按属性取子集」→ 用 `filter-chips`；按词找 → `search-field`。
 *
 *  三件出口：
 *   · `renderWindowPicker(input)` —— 产标记（纯函数，零 DOM；给了 `today` 或起止时窗口在渲染期就算好）；
 *   · `windowPickerCss()` —— 该组件的样式段（住 `.<prefix>page-ui` 之下）；
 *   · `buildWindowPickerJs()` —— 运行时（产出 JS 文本；DOM 只出现在文本里）。
 *
 *  页面怎么接自己的重算：
 *  ```js
 *  document.addEventListener('ilife:window-change', (e) => {
 *    const { name, preset, from, to, days } = e.detail;   // days 是算出来的
 *  });
 *  ```
 *  完整用法与参数表见同目录 `README.md`。
 */
export {
  WINDOW_BOUND_ATTR, WINDOW_CUSTOM, WINDOW_DAYS_ATTR, WINDOW_DEFAULTS, WINDOW_DISABLED_ATTR,
  WINDOW_EMPTY_ATTR, WINDOW_ERROR_ATTR, WINDOW_EVENT_CHANGE, WINDOW_EVENT_LOADING, WINDOW_FORM_ATTR,
  WINDOW_FORMS, WINDOW_FROM_ATTR, WINDOW_INVALID_ATTR, WINDOW_LAST_ATTR, WINDOW_LOADING_ATTR,
  WINDOW_NAME_ATTR, WINDOW_PRESET_ATTR, WINDOW_PRESET_DAYS_ATTR, WINDOW_ROOT_CLASS,
  WINDOW_RUNTIME_ATTR, WINDOW_STATUS_ATTR, WINDOW_TODAY_ATTR, WINDOW_TO_ATTR,
} from './attrs.js';
export type { WindowPickerForm, WindowPickerInput, WindowPresetInput } from './attrs.js';
export { DAY_TEMPLATE, renderWindowPicker, windowErrorId } from './render.js';
export { isoDayCount, normalizeWindowPicker, shiftIso } from './model.js';
export type { WindowPickerModel, WindowPreset } from './model.js';
export {
  windowPickerCss, WINDOW_DATE_BASIS_PX, WINDOW_DATE_MAX_PX, WINDOW_MAX_WIDTH_PX, WINDOW_TOUCH_MIN_PX,
} from './style.js';
export { buildWindowPickerJs } from './runtime.js';
