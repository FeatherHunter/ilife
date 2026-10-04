/** entry-card · **组件出口**（本组件对外的唯一名字面）。
 *
 *  四件出口：`renderEntryCard(input)`（产一张纸内明细卡，零 DOM）／`entryCardCss()`（样式段）／
 *  闭集 `ENTRY_CARD_SLOTS`（槽位）与归一化出口 `normalizeEntryCard(input)`／
 *  类名根 `ENTRY_CARD_CLASS` 与槽助手 `entryCardSlot()`。
 *  本件**没有运行时段**（明细行不接事件：点哪一行、翻了第几页都由调用方管）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  ENTRY_CARD_CLASS,
  ENTRY_CARD_SLOTS,
  entryCardSlot,
  normalizeEntryCard,
  renderEntryCard,
} from './render.js';
export type {
  EntryCardBar,
  EntryCardEntry,
  EntryCardEntryModel,
  EntryCardInput,
  EntryCardModel,
  EntryCardSlot,
} from './render.js';
export {
  ENTRY_CARD_BAR_PX,
  ENTRY_CARD_IDX_BOX_PX,
  ENTRY_CARD_IDX_RADIUS_PX,
  ENTRY_CARD_MONO_STACK,
  ENTRY_CARD_PAY_RADIUS_PX,
  ENTRY_CARD_RADIUS_PX,
  ENTRY_CARD_TOUCH_PX,
  entryCardCss,
} from './style.js';
