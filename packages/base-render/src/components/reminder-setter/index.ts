/** reminder-setter · **组件出口**（本组件对外的唯一名字面）。
 *
 *  三件运行名：`renderReminderSetter(input)`（产标记，零 DOM）／`reminderSetterCss()`（样式段）／
 *  `buildReminderSetterJs()`（运行时段：换档／勾选／步进 → 重写读数与复述 → 派发一条事件）。
 *  标记契约（别的件／页面要按名字找元素时读它）：`REMINDER_SETTER_CLASS`／`REMINDER_SETTER_SLOTS`／
 *  `reminderSetterSlot()`／`REMINDER_SETTER_ATTR`／`REMINDER_SETTER_PART_ATTR`／
 *  `REMINDER_SETTER_VALUE_ATTR`／`REMINDER_SETTER_STEP_ATTR`。
 *  闭集与几何：`REMINDER_SETTER_FORMS`（本件只落地 A 一档「一行一个决定」，键名 `decisions`）／
 *  `REMINDER_SETTER_PARTS`／`REMINDER_SETTER_STEPS`／`REMINDER_SETTER_TOUCH_PX`／`REMINDER_SETTER_GAP_PX`／
 *  `REMINDER_SETTER_TICK_PX`／`REMINDER_SETTER_TIME_STEP_MIN`。
 *  一条事件：`REMINDER_SETTER_EVENT_CHANGE`（`detail={id,part,value,state}`）。
 *  三个纯函数：`reminderSetterStepTime`／`reminderSetterStepDate`／`reminderSetterRecap`
 *  （渲染期与运行时段**同一份源码**：运行时段的 JS 文本里嵌的就是它们）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  REMINDER_SETTER_AT_ATTR,
  REMINDER_SETTER_ATTR,
  REMINDER_SETTER_BOUND_ATTR,
  REMINDER_SETTER_BOX_PX,
  REMINDER_SETTER_CHOSEN_ATTR,
  REMINDER_SETTER_CLASS,
  REMINDER_SETTER_CONTAINER,
  REMINDER_SETTER_DATE_STEP_DAYS,
  REMINDER_SETTER_DAY_MIN,
  REMINDER_SETTER_DEC,
  REMINDER_SETTER_DELTA_ATTR,
  REMINDER_SETTER_EVENT_CHANGE,
  REMINDER_SETTER_FORM_ATTR,
  REMINDER_SETTER_FORMS,
  REMINDER_SETTER_GAP_PX,
  REMINDER_SETTER_HOURS,
  REMINDER_SETTER_HOVER_QUERY,
  REMINDER_SETTER_INC,
  REMINDER_SETTER_LABEL_PX,
  REMINDER_SETTER_LEAD_ATTR,
  REMINDER_SETTER_MAX_CHOICES,
  REMINDER_SETTER_MAX_ITEMS,
  REMINDER_SETTER_MAX_ROUTES,
  REMINDER_SETTER_MIN_CHOICES,
  REMINDER_SETTER_MIN_ITEMS,
  REMINDER_SETTER_MIN_ROUTES,
  REMINDER_SETTER_NARROW_PX,
  REMINDER_SETTER_PART_ATTR,
  REMINDER_SETTER_PARTS,
  REMINDER_SETTER_PICKED_ATTR,
  REMINDER_SETTER_READ_ATTR,
  REMINDER_SETTER_REPEAT_ATTR,
  REMINDER_SETTER_ROW_ATTR,
  REMINDER_SETTER_RUNTIME_ATTR,
  REMINDER_SETTER_SLOTS,
  REMINDER_SETTER_START_ATTR,
  REMINDER_SETTER_STEP_ATTR,
  REMINDER_SETTER_STEPS,
  REMINDER_SETTER_TEXT,
  REMINDER_SETTER_TICK,
  REMINDER_SETTER_TICK_PX,
  REMINDER_SETTER_TIME_ATTR,
  REMINDER_SETTER_TIME_STEP_MIN,
  REMINDER_SETTER_TOUCH_PX,
  REMINDER_SETTER_VALUE_ATTR,
  pad2,
  reminderSetterClock,
  reminderSetterHead,
  reminderSetterPlace,
  reminderSetterRecap,
  reminderSetterSlot,
  reminderSetterStepAt,
  reminderSetterStepDate,
  reminderSetterStepTime,
  reminderSetterTrackTail,
} from './attrs.js';
export type {
  ReminderSetterForm,
  ReminderSetterInput,
  ReminderSetterOption,
  ReminderSetterPart,
  ReminderSetterSlot,
  ReminderSetterStep,
  ReminderSetterTrackItem,
} from './attrs.js';
export { renderReminderSetter } from './render.js';
export { reminderSetterCss } from './style.js';
export { buildReminderSetterJs } from './runtime.js';
