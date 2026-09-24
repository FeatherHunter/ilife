/** progress-list · **组件出口**（本组件对外的唯一名字面）。
 *
 *  六个运行名：`renderProgressList(input)`（产标记，零 DOM）／`progressListCss()`（样式段）／
 *  形态闭集 `PROGRESS_LIST_FORMS`（本件只落地形态 A「四行清单」）／状态闭集 `PROGRESS_LIST_STATES`
 *  与状态字表 `PROGRESS_LIST_STATE_WORDS`／类名根 `PROGRESS_LIST_CLASS`／
 *  两个几何事实（`PROGRESS_LIST_TRACK_HEIGHT_PX`／`PROGRESS_LIST_NARROW_PX`）。
 *  另出 `formatProgressNumber`（本件排数字的那条唯一算法）与四个类型名（入参面）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  PROGRESS_LIST_CLASS,
  PROGRESS_LIST_FORMS,
  PROGRESS_LIST_MISSING,
  PROGRESS_LIST_STATES,
  PROGRESS_LIST_STATE_WORDS,
  PROGRESS_LIST_TONES,
} from './attrs.js';
export type {
  ProgressListForm,
  ProgressListInput,
  ProgressListRow,
  ProgressListState,
  ProgressListTone,
} from './attrs.js';
export { formatProgressNumber } from './model.js';
export { renderProgressList } from './render.js';
export { PROGRESS_LIST_NARROW_PX, PROGRESS_LIST_TRACK_HEIGHT_PX, progressListCss } from './style.js';
