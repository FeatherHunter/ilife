/** switch-row · **组件出口**（本组件对外的唯一名字面）。**重做件**。
 *
 *  —— 开关行（设置页的一行：标签 ＋ 说明 ＋ 开关）——
 *
 *  一句话：一行里同时给**形**（轨道实心／空心 ＋ 滑块贴左／贴右）、**字**（旁边固定一枚 `已开`／`已关`）、
 *  **色**（`ok` 只是第三样）。说明句写清**打开会怎样**（`note` 必填），禁用态写清**为什么不能开**
 *  （`disabledReason` 必填）；零阴影皮肤下开关的边界靠**一圈发丝线**，不靠投影。
 *
 *  为什么重做：原型墙里这一件的三个形态在中性皮肤下 4 分、在纸面与报刊下都是 2 分——**唯一一处跨形态
 *  系统性缺陷**，病根是"开与关只靠一个颜色"（皮肤把强调色换成墨黑或暖红以后就读不出来了）。
 *
 *  三个运行名：`renderSwitchRow(input)`（产标记，零 DOM）／`switchRowCss()`（样式段）／
 *  `buildSwitchRowJs()`（运行时，产出 JS 文本）。加一组契约常量（形态闭集／事件名／触控目标／
 *  轨道与滑块的几何／状态字）与三个类型名（入参面）。
 *
 *  页面怎么接自己的重算逻辑（不引入任何全局）：
 *  ```js
 *  document.addEventListener('ilife:switch-change', (e) => {
 *    const { name, label, checked, prev } = e.detail;   // 状态已就地更新完毕
 *  });
 *  ```
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  SWITCH_ROW_CHECKED_ATTR,
  SWITCH_ROW_CLASS,
  SWITCH_ROW_EVENT_CHANGE,
  SWITCH_ROW_FORMS,
  SWITCH_ROW_HIT_ATTR,
  SWITCH_ROW_LOADING,
  SWITCH_ROW_NAME_ATTR,
  SWITCH_ROW_OFF,
  SWITCH_ROW_ON,
  SWITCH_ROW_STATE_ATTR,
  SWITCH_ROW_THUMB_INSET_PX,
  SWITCH_ROW_THUMB_PX,
  SWITCH_ROW_THUMB_TRAVEL_PX,
  SWITCH_ROW_TOUCH_PX,
  SWITCH_ROW_TRACK_ATTR,
  SWITCH_ROW_TRACK_H_PX,
  SWITCH_ROW_TRACK_W_PX,
  SWITCH_ROW_THUMB_ATTR,
} from './attrs.js';
export type { SwitchRowForm, SwitchRowInput } from './attrs.js';
export { renderSwitchRow } from './render.js';
export { switchRowCss } from './style.js';
export { buildSwitchRowJs } from './runtime.js';
