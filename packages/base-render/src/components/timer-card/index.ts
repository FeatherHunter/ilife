/** timer-card · **组件出口**（本件对外的唯一名字面）。
 *
 *  —— 计时卡 ——
 *
 *  一句话：**剩余时间当卡上的主读数**（大数字 ＋ 进度条 ＋ 已过／还剩），底下开始／暂停／重置，
 *  并写明"这一锅在等什么"。等的那几分钟（私家大厨）与运动计时（卡路里）都用它。
 *
 *  什么时候用它（对照既有件想清楚再选）：
 *   · 要"等一会儿"并在到点时提醒（煸炒 3 分钟／平板支撑 1 分钟）⇒ 用本件；
 *   · 一步一步走、要看出现在该做哪一步 ⇒ 用 `step-flow`（步骤条）；
 *   · 一笔事走到哪个阶段（分期／保修）⇒ 用 `status-row`；
 *   · 还剩几天（不按分钟算）⇒ 用 `due-row`。
 *
 *  四件出口：
 *   · `renderTimerCard(input)` —— 产标记（纯函数，零 DOM）；
 *   · `timerCardCss()` —— 样式段（页面按需注入）；
 *   · `buildTimerCardJs()` —— 运行时（产出 JS 文本：真计时，一个心跳驱动全页计时卡）；
 *   · 契约常量与入参类型（`TIMER_KEY_ATTR`／`TIMER_STATE_ATTR`／`TIMER_EVENT_STATE` …）。
 *
 *  页面怎么接自己的逻辑（不引入任何全局）：
 *  ```js
 *  document.addEventListener('ilife:timer-state', (e) => {
 *    const { key, state, remainingMs, totalMs } = e.detail;   // 状态一变就来一条
 *  });
 *  document.addEventListener('ilife:timer-done', (e) => { /* 到点了 * / });
 *  ```
 *  完整用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  TIMER_ACT_ATTR,
  TIMER_ACTS,
  TIMER_BOUND_ATTR,
  TIMER_BUSY_ATTR,
  TIMER_CARD_CLASS,
  TIMER_CARD_EMPTY_LINE,
  TIMER_CARD_FORMS,
  TIMER_CARD_MISSING,
  TIMER_CARD_SLOTS,
  TIMER_CARD_TICK_MS,
  TIMER_DISABLED_ATTR,
  TIMER_DISPLAY_ATTR,
  TIMER_ELAPSED_ATTR,
  TIMER_EVENT_DONE,
  TIMER_EVENT_STATE,
  TIMER_KEY_ATTR,
  TIMER_LOADING_LABEL,
  TIMER_PRIMARY_LABELS,
  TIMER_REMAIN_ATTR,
  TIMER_RESET_LABEL,
  TIMER_REST_ATTR,
  TIMER_STATES,
  TIMER_STATE_ATTR,
  TIMER_STATE_WORDS,
  TIMER_TAG_ATTR,
  TIMER_TOTAL_ATTR,
  timerCardClass,
  timerCardSlot,
} from './attrs.js';
export type {
  TimerAct,
  TimerCardForm,
  TimerCardInput,
  TimerCardSlot,
  TimerState,
} from './attrs.js';
export { renderTimerCard, timerClockText } from './render.js';
export {
  TIMER_CARD_BUTTON_MIN_HEIGHT_PX,
  TIMER_CARD_BUTTON_MIN_WIDTH_PX,
  TIMER_CARD_CONTAINER,
  TIMER_CARD_NARROW_MAX_PX,
  TIMER_CARD_VALUE_PX,
  timerCardCss,
} from './style.js';
export { buildTimerCardJs } from './runtime.js';
