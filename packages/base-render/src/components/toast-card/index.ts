/** toast-card · **组件出口**（本组件对外的唯一名字面）。
 *
 *  三个运行名：`renderToastCard(input)`（产一条提示的标记，零 DOM）／
 *  `renderToastCardStack(input?)`（产堆栈宿主：一条都还没有的空容器）／
 *  `toastCardCss()`（样式段）／`buildToastCardJs()`（运行时段，产 JS 文本）。
 *
 *  另出：槽位与类名面（`TOAST_CARD_CLASS`／`TOAST_CARD_SLOTS`／`toastCardSlot`／`toastCardName`）／
 *  语气闭集与三张语气表（`TOAST_CARD_TONES`／`_TONE_WORDS`／`_TONE_GLYPHS`／`_TONE_RULES`）／
 *  无障碍口径（`TOAST_CARD_TONE_ROLES`／`_TONE_LIVE`）／`data-*` 锚（`TOAST_CARD_*_ATTR`）／
 *  事件名 `TOAST_CARD_EVENT_ACTION`／时长与容量（`TOAST_CARD_DEFAULT_MS`／`_MIN_MS`／`_MAX_MS`／`_MAX_STACK`／
 *  `_FADE_MS`／`TOAST_CARD_NARROW_PX`／`TOAST_CARD_TOUCH_PX`），以及五个类型名（入参面）。
 *
 *  **与冻结面那件 `toast` 的关系**：两者**并存**，不是替代——冻结的 `renderToast` 是「以前那种形态」，
 *  本件是另一种样式（纸面底 ＋ 发丝线 ＋ 左竖条），由开发者按场景选用。本件的每个导出名都与
 *  `renderToast`／`ToastInput`／`TOAST_ICONS`／`TOAST_DEFAULTS`／`createToastController`／`ToastController`／
 *  `ToastHostPort`／`ToastAction`／`ToastBadge`／`TOAST_ICON_GLYPHS`／`TOAST_ICON_LABELS` 无一重名。
 *
 *  调用时序：页面挂 `toastCardCss()` ＋ 把 `buildToastCardJs()` 拼进共享 helpers 槽；
 *  页面用 `renderToastCardStack()` 放一个宿主（位置自定），把 `renderToastCard()` 的产出往里 append；
 *  监听 `TOAST_CARD_EVENT_ACTION` 去真的执行那个动作。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  TOAST_CARD_ACTION_ATTR,
  TOAST_CARD_ACTION_ID_RE,
  TOAST_CARD_BOUND_ATTR,
  TOAST_CARD_CLASS,
  TOAST_CARD_CLOSE_ATTR,
  TOAST_CARD_CLOSE_GLYPH,
  TOAST_CARD_CLOSE_LABEL,
  TOAST_CARD_DEFAULT_MS,
  TOAST_CARD_DURATION_ATTR,
  TOAST_CARD_EVENT_ACTION,
  TOAST_CARD_ITEM_ATTR,
  TOAST_CARD_LEAVING_CLASS,
  TOAST_CARD_MAX_ATTR,
  TOAST_CARD_MAX_MS,
  TOAST_CARD_MAX_STACK,
  TOAST_CARD_MIN_MS,
  TOAST_CARD_PAUSED_ATTR,
  TOAST_CARD_RUNTIME_ATTR,
  TOAST_CARD_SLOTS,
  TOAST_CARD_STACK_ATTR,
  TOAST_CARD_TONES,
  TOAST_CARD_TONE_ATTR,
  TOAST_CARD_TONE_GLYPHS,
  TOAST_CARD_TONE_LIVE,
  TOAST_CARD_TONE_ROLES,
  TOAST_CARD_TONE_RULES,
  TOAST_CARD_TONE_WORDS,
  toastCardName,
  toastCardSlot,
} from './attrs.js';
export type {
  ToastCardAction,
  ToastCardInput,
  ToastCardSlot,
  ToastCardStackInput,
  ToastCardTone,
} from './attrs.js';
export { renderToastCard, renderToastCardStack } from './render.js';
export { TOAST_CARD_FADE_MS, buildToastCardJs } from './runtime.js';
export { TOAST_CARD_NARROW_PX, TOAST_CARD_TOUCH_PX, toastCardCss } from './style.js';
