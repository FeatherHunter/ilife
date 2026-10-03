/** say-opt · **组件出口**（本组件对外的唯一名字面）。
 *
 *  四件出口：`renderSayOpt(input)`（产一折标记，零 DOM）／`sayOptCss()`（样式段）／
 *  闭集 `SAY_OPT_SLOTS` 与字表 `SAY_OPT_TEXT`（表头那一枚全角加号）／
 *  类名根 `SAY_OPT_CLASS` 与槽助手 `sayOptSlot()`。
 *  本件**没有运行时段**（展开／收起是原生 <details> 的行为，不接事件）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  SAY_OPT_CLASS,
  SAY_OPT_SLOTS,
  SAY_OPT_TEXT,
  normalizeSayOpt,
  renderSayOpt,
  sayOptSlot,
} from './render.js';
export type { SayOptInput, SayOptModel, SayOptSlot } from './render.js';
export { SAY_OPT_GUTTER_X_PX, SAY_OPT_RADIUS_PX, SAY_OPT_TOUCH_PX, sayOptCss } from './style.js';
