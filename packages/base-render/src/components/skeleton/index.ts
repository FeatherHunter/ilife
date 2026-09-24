/** skeleton · **组件出口**（本组件对外的唯一名字面）。
 *
 *  —— 加载骨架（等数据那一两秒）——
 *
 *  一句话：照**真版式**排的一片占位（一条主读数大字位 ＋ 若干条明细行），加载完真数据进来**不跳版**；
 *  上面那句人话说明「正在读什么、还要多久」。
 *
 *  什么时候用它（对照既有件想清楚再选）：
 *   · 页面已经知道**将要出现什么版式**，只差数据（读库那一两秒）→ 用它；
 *   · 不知道会出什么、或者要用户表态 → 用 `empty-state`（空态）／`error-receipt`（错态）；
 *   · 只是告知（「已保存」）→ 用 `toast`（提示条）。
 *
 *  三件出口：`renderSkeleton(input)`（产标记，纯函数零 DOM）／`skeletonCss()`（样式段）／
 *  若干几何与动效常量（行距／主读数尺度／动效名与周期——**动效常量的家就在这里**，用户裁定）。
 *
 *  本件**没有运行时段**：骨架不接事件、不点不动（它是「正在读」的样子，不是控件）；
 *  数据到手后由调用方**整块换成真件**（本件不负责换，也不该负责）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  SKELETON_CLASS, SKELETON_FORM_ATTR, SKELETON_FORMS, SKELETON_MAX_ROWS, SKELETON_ROWS_ATTR,
  SKELETON_SLOTS, skeletonSlot,
} from './attrs.js';
export type { SkeletonForm, SkeletonInput, SkeletonSlot } from './attrs.js';
export { renderSkeleton } from './render.js';
export {
  SKELETON_NARROW_PX, SKELETON_PLACEHOLDER_MIX_PERCENT, SKELETON_PULSE_DURATION_MS, SKELETON_PULSE_MIN_OPACITY,
  SKELETON_PULSE_NAME, SKELETON_READING_SCALE, SKELETON_ROW_HEIGHT_PX, SKELETON_ROW_SEPARATOR_PX,
  SKELETON_STILL_OPACITY, SKELETON_VALUE_SLOT_PX, skeletonCss,
} from './style.js';
