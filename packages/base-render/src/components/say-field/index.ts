/** say-field · **组件出口**（本组件对外的唯一名字面）。
 *
 *  四件出口：`renderSayField(input)`（产一格标记，零 DOM）／`sayFieldCss()`（样式段）／
 *  闭集 `SAY_FIELD_CONTROLS`、`SAY_FIELD_INPUT_TYPES`、`SAY_FIELD_SLOTS`（输入件／类型／槽位）／
 *  类名根 `SAY_FIELD_CLASS` 与槽助手 `sayFieldSlot()`（含外层容器那一格 `'form'`）。
 *  本件**没有运行时段**（字段不接事件）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  SAY_FIELD_CLASS,
  SAY_FIELD_CONTROLS,
  SAY_FIELD_INPUT_TYPES,
  SAY_FIELD_SLOTS,
  normalizeSayField,
  renderSayField,
  sayFieldSlot,
} from './render.js';
export type { SayFieldControl, SayFieldInput, SayFieldInputType, SayFieldModel, SayFieldOption, SayFieldSlot } from './render.js';
export { SAY_FIELD_CONTROL_RADIUS_PX, SAY_FIELD_LABEL_MIN_WIDTH_PX, SAY_FIELD_RADIUS_PX, SAY_FIELD_TOUCH_PX, sayFieldCss } from './style.js';
