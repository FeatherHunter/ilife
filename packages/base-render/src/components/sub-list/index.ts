/** sub-list · **组件出口**（本组件对外的唯一名字面）。
 *
 *  三件出口：`renderSubList(input)`（产标记，零 DOM）／`subListCss()`（样式段）／
 *  标记契约常量（类名根、槽位闭集、形态闭集、计数与进度的读数单位、折页头命中区下限）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 *  样式由页面按需注入 `subListCss()`（**加法式**：不挂就零命中，别的页逐字节不变）。
 *  **本件没有运行时段**：开合走浏览器原生的 `<details>`／`<summary>`（零脚本）。
 */
export {
  SUB_LIST_CLASS,
  SUB_LIST_COUNT_UNIT,
  SUB_LIST_DONE_LABEL,
  SUB_LIST_FORMS,
  SUB_LIST_SLOTS,
  subListSlot,
} from './attrs.js';
export type {
  SubListForm,
  SubListGroupInput,
  SubListInput,
  SubListItemInput,
  SubListSlot,
  SubListSummary,
} from './attrs.js';
export { renderSubList } from './render.js';
export {
  SUB_LIST_HEAD_MIN_HEIGHT_PX,
  SUB_LIST_NARROW_PX,
  SUB_LIST_PRESS_MS,
  subListCss,
} from './style.js';
