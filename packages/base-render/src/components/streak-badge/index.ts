/** streak-badge · **组件出口**（本件对外的唯一名字面）。
 *
 *  —— 连记徽标 ——
 *
 *  一句话：**"你已经连着做了 N 天"那一句话**，一行几个、强弱三档——前词 ＋ 数（放大）＋ 量词。
 *
 *  什么时候用它（对照既有件想清楚再选）：
 *   · 一句话的连记战绩／本月覆盖／上次断点 ⇒ 用本件；
 *   · 一整排"这 7 天记了没记"的格子 ⇒ 用 `punch-strip`（打孔格带）；
 *   · 一个比例形状（吃了几成）⇒ 用 `scale-bar`（刻度条）／`progress-ring`（进度环）；
 *   · 一笔在途的事走到哪了 ⇒ 用 `status-row`。
 *
 *  两件出口：`renderStreakBadges(input)`（产标记，零 DOM）／`streakBadgeCss()`（样式段）。
 *  本件**零 DOM、零动效、零可点元素**（静态读数件）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  STREAK_BADGE_CLASS,
  STREAK_BADGE_FORMS,
  STREAK_BADGE_MISSING,
  STREAK_BADGE_SLOTS,
  STREAK_STRENGTHS,
  streakBadgeClass,
  streakBadgeSlot,
} from './attrs.js';
export type {
  StreakBadgeForm,
  StreakBadgeInput,
  StreakBadgeItem,
  StreakBadgeSlot,
  StreakStrength,
} from './attrs.js';
export { renderStreakBadges } from './render.js';
export {
  STREAK_BADGE_CONTAINER,
  STREAK_BADGE_MIN_HEIGHT_PX,
  STREAK_BADGE_NARROW_MAX_PX,
  STREAK_BADGE_VALUE_PX,
  streakBadgeCss,
} from './style.js';
