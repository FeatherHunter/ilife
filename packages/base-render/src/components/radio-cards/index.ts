/** radio-cards · **组件出口**（本组件对外的唯一名字面）。
 *
 *  五个运行名：`renderRadioCards(input)`（产标记，零 DOM）／`radioCardsCss()`（样式段）／
 *  `buildRadioCardsJs()`（运行时，产出 JS 文本）／形态闭集 `RADIO_CARDS_FORMS`（本件只落地形态 A「竖排卡」）／
 *  类名根 `RADIO_CARDS_CLASS`。加四个类型名（入参面）与两条几何事实。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  RADIO_CARDS_BOUND_ATTR,
  RADIO_CARDS_CLASS,
  RADIO_CARDS_EMPTY_TEXT,
  RADIO_CARDS_EVENT_CHANGE,
  RADIO_CARDS_FORMS,
  RADIO_CARDS_FORM_ATTR,
  RADIO_CARDS_LEAD_MAX,
  RADIO_CARDS_LOADING_ATTR,
  RADIO_CARDS_LOADING_TEXT,
  RADIO_CARDS_NAME_ATTR,
  RADIO_CARDS_OPTION_ATTR,
  RADIO_CARDS_REQUIRED_ATTR,
  RADIO_CARDS_SLOTS,
  RADIO_CARDS_VALUE_ATTR,
  radioCardsSlot,
} from './attrs.js';
export type { RadioCardsForm, RadioCardsInput, RadioCardsOption, RadioCardsSlot } from './attrs.js';
export { renderRadioCards } from './render.js';
export {
  RADIO_CARDS_BAR_PX,
  RADIO_CARDS_CARD_MIN_HEIGHT_PX,
  RADIO_CARDS_MIN_TARGET_PX,
  RADIO_CARDS_NARROW_PX,
  radioCardsCss,
} from './style.js';
export { buildRadioCardsJs } from './runtime.js';
