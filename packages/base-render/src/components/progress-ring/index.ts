/** progress-ring · **组件出口**（本组件对外的唯一名字面）。
 *
 *  六件出口：`renderProgressRing(input)`（产标记，零 DOM）／`progressRingCss()`（样式段）／
 *  `PROGRESS_RING_FORMS`（形态闭集）／`PROGRESS_RING_CLASS` 与 `progressRingSlot()`（标记契约）／
 *  `PROGRESS_RING_ARC_LEN`（半环弧长真值，调用方要跟弧长对齐时读它）／`PROGRESS_RING_MISSING`（缺值写法）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export { renderProgressRing } from './render.js';
export type { ProgressRingForm, ProgressRingInput, ProgressRingRow, ProgressRingSlot } from './attrs.js';
export {
  PROGRESS_RING_ARC_LEN,
  PROGRESS_RING_CLASS,
  PROGRESS_RING_FORMS,
  PROGRESS_RING_MISSING,
  PROGRESS_RING_RADIUS_PX,
  PROGRESS_RING_SLOTS,
  PROGRESS_RING_STROKE_PX,
  progressRingSlot,
} from './attrs.js';
export { PROGRESS_RING_MAX_DIAMETER_PX, PROGRESS_RING_VALUE_PX, progressRingCss } from './style.js';
