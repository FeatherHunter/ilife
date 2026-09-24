/** due-row · **组件出口**（本件对外的唯一名字面）。
 *
 *  —— 到期行 ——
 *
 *  一句话：**"还剩多少天"放大成读数，每行配一个动作**。三档（正常／临近／已过期）各有自己的
 *  左竖条与档位字形状；动作是真 `<button>`，点一下派发一条冒泡事件。
 *  保修／证件（居家管家）· 还款日（记账）· 提醒（备忘录）都用它。
 *
 *  什么时候用它（对照既有件想清楚再选）：
 *   · 单看"还剩几天"、并要能当场办掉（打电话／设提醒）⇒ 用本件；
 *   · 一笔事有多个阶段、要看走到哪了 ⇒ 用 `status-row`；
 *   · 一行一条、可勾选 ⇒ 用 `task-list`；
 *   · 时间落在哪一周（日历缩略）⇒ 用 `calendar-month`。
 *
 *  四件出口：
 *   · `renderDueRows(input)` —— 产标记（纯函数，零 DOM）；
 *   · `dueRowCss()` —— 样式段（页面按需注入）；
 *   · `buildDueRowJs()` —— 运行时（产出 JS 文本：把点击翻译成 `ilife:due-action`）；
 *   · 契约常量与入参类型（`DUE_KEY_ATTR`／`DUE_ACT_ATTR`／`DUE_EVENT_ACTION` …）。
 *
 *  页面怎么接自己的动作逻辑（不引入任何全局）：
 *  ```js
 *  document.addEventListener('ilife:due-action', (e) => {
 *    const { key, name, tone, action, actionLabel } = e.detail;   // 点了哪一行的哪个动作
 *    // 打电话／设提醒／跳去办…
 *  });
 *  ```
 *  完整用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  DUE_ACT_ATTR,
  DUE_ACT_LABEL_ATTR,
  DUE_BOUND_ATTR,
  DUE_DISABLED_ATTR,
  DUE_EVENT_ACTION,
  DUE_KEY_ATTR,
  DUE_LABEL_ATTR,
  DUE_LOADING_ATTR,
  DUE_LOADING_LABEL,
  DUE_ROW_CLASS,
  DUE_ROW_FORMS,
  DUE_ROW_MISSING,
  DUE_ROW_SLOTS,
  DUE_ROW_TONES,
  DUE_TONE_ATTR,
  dueRowClass,
  dueRowSlot,
} from './attrs.js';
export type {
  DueRowAction,
  DueRowForm,
  DueRowInput,
  DueRowItem,
  DueRowSlot,
  DueRowTone,
} from './attrs.js';
export { renderDueRows } from './render.js';
export {
  DUE_ROW_BUTTON_MIN_HEIGHT_PX,
  DUE_ROW_BUTTON_MIN_WIDTH_PX,
  DUE_ROW_CONTAINER,
  DUE_ROW_COUNT_PX,
  DUE_ROW_NARROW_MAX_PX,
  dueRowCss,
} from './style.js';
export { buildDueRowJs } from './runtime.js';
