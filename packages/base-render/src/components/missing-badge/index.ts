/** missing-badge · **组件出口**（本组件对外的唯一名字面）。
 *
 *  四件出口：`renderMissingBadge(input)`（产标记，零 DOM）／`missingBadgeCss()`（样式段）／
 *  状态闭集 `MISSING_BADGE_STATES`（缺／待补，全拼）／
 *  类名根 `MISSING_BADGE_CLASS` 与槽助手 `missingBadgeSlot()`。
 *  本件**没有运行时段**（缺项行不接事件）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  MISSING_BADGE_CLASS,
  MISSING_BADGE_SLOTS,
  MISSING_BADGE_STATES,
  MISSING_BADGE_STATE_WORDS,
  missingBadgeSlot,
  normalizeMissingBadge,
} from './render.js';
export type { MissingBadgeInput, MissingBadgeModel, MissingBadgeSlot, MissingBadgeState } from './render.js';
export { renderMissingBadge } from './render.js';
export { missingBadgeCss } from './style.js';
