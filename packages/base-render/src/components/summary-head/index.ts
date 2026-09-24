/** summary-head · **组件出口**（本组件对外的唯一名字面）。
 *
 *  四件出口：`renderSummaryHead(input)`（产标记，零 DOM）／`summaryHeadCss()`（样式段）／
 *  两个闭集常量（`SUMMARY_HEAD_SIZES`／`SUMMARY_HEAD_FACES`）与第三种语气闭集
 *  （`SUMMARY_HEAD_STAMP_TONES`），加三档字号读数 `SUMMARY_HEAD_VALUE_PX`。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  SUMMARY_HEAD_FACES,
  SUMMARY_HEAD_SIZES,
  SUMMARY_HEAD_STAMP_TONES,
  renderSummaryHead,
} from './render.js';
export type {
  SummaryHeadFace,
  SummaryHeadInput,
  SummaryHeadSize,
  SummaryHeadStampTone,
} from './render.js';
export { SUMMARY_HEAD_VALUE_PX, summaryHeadCss } from './style.js';
