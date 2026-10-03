/** negative-bar · **组件出口**（本组件对外的唯一名字面）。
 *
 *  四件出口：`renderNegativeBar(input)`（产标记，零 DOM）／`negativeBarCss()`（样式段）／
 *  形态闭集 `NEGATIVE_BAR_MODES`（只落地 `hollow`：虚线空框 ＋ 注）／
 *  类名根 `NEGATIVE_BAR_CLASS` 与槽助手 `negativeBarSlot()`。
 *  本件**没有运行时段**（负值行不接事件、不点不动）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  NEGATIVE_BAR_CLASS,
  NEGATIVE_BAR_DEFAULT_NOTE,
  NEGATIVE_BAR_MODES,
  NEGATIVE_BAR_SLOTS,
  NEGATIVE_BAR_TONES,
  negativeBarSlot,
  normalizeNegativeBar,
} from './render.js';
export type { NegativeBarInput, NegativeBarMode, NegativeBarModel, NegativeBarSlot, NegativeBarTone } from './render.js';
export { renderNegativeBar } from './render.js';
export { negativeBarCss } from './style.js';
