/** confirm-strip · **组件出口**（本组件对外的唯一名字面）。
 *
 *  —— 二次确认条（删记录之前的最后一问）——
 *
 *  一句话：把「要删什么、删几条、能不能撤销」三件事摆在两个按钮上面；右边的按钮**自己写着动词与条数**
 *  （「删掉这 3 条」），左边的按钮永远是退路（「再想想」）。
 *
 *  什么时候用它（对照既有件想清楚再选）：
 *   · 删记录（记账删一笔／卡路里删一餐／备忘录删一条／私家大厨删一道菜）之前的那一问 → 用它；
 *   · 只是「提醒一下、不用表态」→ 用 `toast`（提示条）；
 *   · 出错了要用户重试 → 用 `error-receipt`（错态）；
 *   · 要一段带标题与主读数的页头 → 用 `page-head`。
 *
 *  四件出口：`renderConfirmStrip(input)`（产标记，纯函数零 DOM）／`confirmStripCss()`（样式段）／
 *  `buildConfirmStripJs()`（运行时，产出 JS 文本）／若干契约常量（形态与状态闭集、事件名、触控下限）。
 *
 *  页面怎么接自己的删除逻辑（不引入任何全局）：危险动作派发 `ilife:confirm`、退路派发
 *  `ilife:confirm-cancel`，两条都冒泡到 `document`，`detail = { action, count, unit, irreversible, backup }`：
 *  ```js
 *  document.addEventListener('ilife:confirm', (e) => {
 *    const { count, unit, irreversible, backup } = e.detail;   // 用户已按下危险按钮
 *    // 删记录；要出「正在删…」就在重渲染时给 state: 'busy'
 *  });
 *  ```
 *  完整用法与参数表见同目录 `README.md`。
 */
export {
  CONFIRM_STRIP_ACTS, CONFIRM_STRIP_BARE_WORDS, CONFIRM_STRIP_BACKUP_ATTR, CONFIRM_STRIP_BACKUP_DEFAULT,
  CONFIRM_STRIP_BOUND_ATTR, CONFIRM_STRIP_CLASS, CONFIRM_STRIP_COUNT_ATTR, CONFIRM_STRIP_EVENT_CANCEL,
  CONFIRM_STRIP_EVENT_COMMIT, CONFIRM_STRIP_FORM_ATTR, CONFIRM_STRIP_FORMS, CONFIRM_STRIP_IRREVERSIBLE_ATTR,
  CONFIRM_STRIP_KEEP_DEFAULT, CONFIRM_STRIP_LOSS_DEFAULT, CONFIRM_STRIP_SLOTS, CONFIRM_STRIP_STATES,
  CONFIRM_STRIP_STATE_ATTR, CONFIRM_STRIP_UNIT_ATTR, CONFIRM_STRIP_UNIT_DEFAULT, confirmStripSlot,
} from './attrs.js';
export type { ConfirmStripAct, ConfirmStripForm, ConfirmStripInput, ConfirmStripItem, ConfirmStripSlot, ConfirmStripState } from './attrs.js';
export { renderConfirmStrip } from './render.js';
export {
  CONFIRM_STRIP_ACTIVE_SCALE, CONFIRM_STRIP_NARROW_PX, CONFIRM_STRIP_TOUCH_MIN_PX, CONFIRM_STRIP_TRANSITION_MS,
  confirmStripCss,
} from './style.js';
export { buildConfirmStripJs } from './runtime.js';
