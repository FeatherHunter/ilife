/** key-value-list · **组件出口**（本组件对外的唯一名字面）。
 *
 *  四个运行名：`renderKeyValueList(input)`（产标记，零 DOM）／`keyValueListCss()`（样式段）／
 *  形态闭集 `KEY_VALUE_FORMS`（本件只落地形态 A「档案行」）／类名根 `KEY_VALUE_CLASS`
 *  ＋行高地板 `KEY_VALUE_MIN_ROW_PX`（44px）＋缺值写法 `KEY_VALUE_MISSING`（`—`）。加四个类型名（入参面）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  KEY_VALUE_CLASS,
  KEY_VALUE_FORMS,
  KEY_VALUE_MIN_ROW_PX,
  KEY_VALUE_MISSING,
  keyValueSlot,
} from './attrs.js';
export type { KeyValueForm, KeyValueListInput, KeyValueRow, KeyValueSlot } from './attrs.js';
export { normalizeKeyValueList } from './model.js';
export { renderKeyValueList } from './render.js';
export { keyValueListCss } from './style.js';
