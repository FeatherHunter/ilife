/** goal-stairs · **组件出口**（本组件对外的唯一名字面）。
 *
 *  四个运行名是本件的主面：`renderGoalStairs(input)`（产标记，零 DOM）／`goalStairsCss()`（样式段）／
 *  形态闭集 `GOAL_STAIRS_FORMS`（本件只落地形态 C「倒推日程」）／状态闭集 `GOAL_STAIRS_STATES`
 *  ＋ `GOAL_STAIRS_STATE_WORDS`（三档状态的字与形）。
 *  其余是标记契约（类名／槽位／段数上下限／过期那枚字／缺省口径句）与几何事实
 *  （轨道高／宽档阈值与窄档上界／行头那一列的宽／竖线的粗）——判据与调用方都从这一份取，不另抄字面量。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  GOAL_STAIRS_CLASS,
  GOAL_STAIRS_FORMS,
  GOAL_STAIRS_LATE_WORD,
  GOAL_STAIRS_MAX_STEPS,
  GOAL_STAIRS_MIN_STEPS,
  GOAL_STAIRS_SLOTS,
  GOAL_STAIRS_STATES,
  GOAL_STAIRS_STATE_WORDS,
  goalStairsSlot,
} from './attrs.js';
export type { GoalStairsForm, GoalStairsInput, GoalStairsState, GoalStairsStep } from './attrs.js';
export { GOAL_STAIRS_DEFAULT_NOTE } from './model.js';
export { renderGoalStairs } from './render.js';
export {
  GOAL_STAIRS_HEAD_COLUMN_PX,
  GOAL_STAIRS_MARK_PX,
  GOAL_STAIRS_NARROW_MAX_PX,
  GOAL_STAIRS_TRACK_PX,
  GOAL_STAIRS_WIDE_PX,
  goalStairsCss,
} from './style.js';
