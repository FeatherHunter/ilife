/** slider-row · **组件出口**（本组件对外的唯一名字面）。
 *
 *  —— 滑块行（形态 A「滑块＋常用档＋加减」）——
 *
 *  一句话：一条轨道 ＋ 两端各一枚走一档的键 ＋ 一排常用档，**右侧永远同步一个大数字**；
 *  用来在**连续区间**里挑一个数（卡路里热量目标／记账预算／居家管家库存下限）。
 *  它替掉的是「只能填一个数、不知道这个数在区间里偏哪头」——轨道底下「底 ＋ 已填」两段给的就是"偏哪头"。
 *
 *  三个运行名：`renderSliderRow(input)`（产标记，零 DOM）／`sliderRowCss()`（样式段）／
 *  `buildSliderRowJs()`（运行时，产出 JS 文本）。加六个常量（形态闭集／事件名／触控目标／间距／
 *  轨道几何／缺值写法）与三个类型名（入参面）。
 *
 *  页面怎么接自己的重算逻辑（不引入任何全局）：
 *  ```js
 *  document.addEventListener('ilife:slider-change', (e) => {
 *    const { name, value, prev, unit, label } = e.detail;   // 值已就地更新完毕
 *  });
 *  ```
 *  注意：**拖动过程不派发事件**（只同步读数），松手（`change`）与按档／按键才派发。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  SLIDER_ROW_AT_MAX,
  SLIDER_ROW_AT_MIN,
  SLIDER_ROW_CLASS,
  SLIDER_ROW_EVENT_CHANGE,
  SLIDER_ROW_FORMS,
  SLIDER_ROW_GAP_PX,
  SLIDER_ROW_HIT_ATTR,
  SLIDER_ROW_LINE_PX,
  SLIDER_ROW_MISSING,
  SLIDER_ROW_NAME_ATTR,
  SLIDER_ROW_THUMB_PX,
  SLIDER_ROW_TOUCH_PX,
  SLIDER_ROW_TRACK_PX,
  SLIDER_ROW_UNSET,
  SLIDER_ROW_VALUE_ATTR,
} from './attrs.js';
export type { SliderRowForm, SliderRowInput } from './attrs.js';
export { fillPercent, formatSliderValue, renderSliderRow } from './render.js';
export { sliderRowCss } from './style.js';
export { buildSliderRowJs } from './runtime.js';
