/** number-stepper · **组件出口**（本组件对外的唯一名字面）。
 *
 *  —— 数量步进（形态 A「标准：加减＋常用值排」）——
 *
 *  一句话：「− n ＋」三个可点区 ＋ 一排常用值，用来填一个**有上下限、按档走**的数量
 *  （卡路里份数／私家大厨份量／记账数量）。两边各 ≥44×44，三枚**不做连体**（留 8px 缝防误点）。
 *
 *  三个运行名：`renderNumberStepper(input)`（产标记，零 DOM）／`numberStepperCss()`（样式段）／
 *  `buildNumberStepperJs()`（运行时，产出 JS 文本）。加四个常量（形态闭集／事件名／触控目标／缺值写法）
 *  与三个类型名（入参面）。
 *
 *  页面怎么接自己的重算逻辑（不引入任何全局）：
 *  ```js
 *  document.addEventListener('ilife:stepper-change', (e) => {
 *    const { name, value, prev, unit, label } = e.detail;   // 值已就地更新完毕
 *  });
 *  ```
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  NUMBER_STEPPER_AT_MAX,
  NUMBER_STEPPER_AT_MIN,
  NUMBER_STEPPER_CLASS,
  NUMBER_STEPPER_EVENT_CHANGE,
  NUMBER_STEPPER_FORMS,
  NUMBER_STEPPER_GAP_PX,
  NUMBER_STEPPER_HIT_ATTR,
  NUMBER_STEPPER_MISSING,
  NUMBER_STEPPER_NAME_ATTR,
  NUMBER_STEPPER_TOUCH_PX,
  NUMBER_STEPPER_UNSET,
  NUMBER_STEPPER_VALUE_ATTR,
  NUMBER_STEPPER_VALUE_MIN_PX,
} from './attrs.js';
export type { NumberStepperForm, NumberStepperInput } from './attrs.js';
export { formatStepperValue, renderNumberStepper } from './render.js';
export { numberStepperCss } from './style.js';
export { buildNumberStepperJs } from './runtime.js';
