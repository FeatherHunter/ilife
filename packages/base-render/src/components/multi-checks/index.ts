/** multi-checks · **组件出口**（本组件对外的唯一名字面）。
 *
 *  五个运行名：`renderMultiChecks(input)`（产标记，零 DOM）／`multiChecksCss()`（样式段）／
 *  `buildMultiChecksJs()`（运行时，产出 JS 文本）／形态闭集 `MULTI_CHECKS_FORMS`（本件只落地形态 A）／
 *  类名根 `MULTI_CHECKS_CLASS`。加入参面类型与两条几何事实。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  MULTI_CHECKS_ACTION_ATTR,
  MULTI_CHECKS_ALL_ATTR,
  MULTI_CHECKS_ALL_TEXT,
  MULTI_CHECKS_AMOUNT_ATTR,
  MULTI_CHECKS_BOUND_ATTR,
  MULTI_CHECKS_CLASS,
  MULTI_CHECKS_EMPTY_TEXT,
  MULTI_CHECKS_EVENT_ACTION,
  MULTI_CHECKS_EVENT_CHANGE,
  MULTI_CHECKS_FORMS,
  MULTI_CHECKS_FORM_ATTR,
  MULTI_CHECKS_GROUP_ATTR,
  MULTI_CHECKS_ITEM_ATTR,
  MULTI_CHECKS_LOADING_ATTR,
  MULTI_CHECKS_LOADING_TEXT,
  MULTI_CHECKS_MONEY_ATTR,
  MULTI_CHECKS_NAME_ATTR,
  MULTI_CHECKS_NONE_TEXT,
  MULTI_CHECKS_PARTIAL_ATTR,
  MULTI_CHECKS_PRIMARY_ATTR,
  MULTI_CHECKS_SLOTS,
  MULTI_CHECKS_UNIT_ATTR,
  multiChecksSlot,
} from './attrs.js';
export type {
  MultiChecksAction,
  MultiChecksForm,
  MultiChecksInput,
  MultiChecksRow,
  MultiChecksSlot,
} from './attrs.js';
export { renderMultiChecks } from './render.js';
export {
  MULTI_CHECKS_BAR_PX,
  MULTI_CHECKS_BOX_PX,
  MULTI_CHECKS_MIN_TARGET_PX,
  MULTI_CHECKS_NARROW_PX,
  MULTI_CHECKS_ROW_MIN_HEIGHT_PX,
  multiChecksCss,
} from './style.js';
export { buildMultiChecksJs } from './runtime.js';
