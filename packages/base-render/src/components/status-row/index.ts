/** status-row · **组件出口**（本件对外的唯一名字面）。
 *
 *  —— 状态台账行 ——
 *
 *  一句话：**一笔还没走完的事，一行**。左轨的点给位置（形），徽标给阶段（字），右侧给金额，
 *  第二行给补充与到期日。诸行连起来就是一本"在途的事"的台账（分期／报销／借出／借入／保修／证件）。
 *
 *  什么时候用它（对照既有件想清楚再选）：
 *   · 一笔事有**阶段**（已还 3 期 → 本期待扣 → 未开始）⇒ 用本件；
 *   · 一串"时间 ＋ 做了什么"、按时间轴连起来 ⇒ 用 `renderTimelineRows`（页面级形状件）；
 *   · 只要"金额 ＋ 标签"两个字段、没有阶段 ⇒ 用 `renderLedgerRows`（账目行）；
 *   · 单看"还剩几天"并把倒计时放大 ⇒ 用 `due-row`。
 *
 *  三件出口：`renderStatusRows(input)`（产标记，零 DOM）／`statusRowCss()`（样式段）／
 *  两枚几何读数与内容容器名（窄档断点、行高下限、轨道几何——调用方要在别处对齐同一列时读它们）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  STATUS_ROW_CLASS,
  STATUS_ROW_FORMS,
  STATUS_ROW_MISSING,
  STATUS_ROW_SLOTS,
  STATUS_ROW_TONES,
  statusRowClass,
  statusRowSlot,
} from './attrs.js';
export type {
  StatusRowForm,
  StatusRowInput,
  StatusRowItem,
  StatusRowSlot,
  StatusRowTone,
} from './attrs.js';
export { renderStatusRows } from './render.js';
export {
  STATUS_ROW_CONTAINER,
  STATUS_ROW_ITEM_MIN_HEIGHT_PX,
  STATUS_ROW_NARROW_MAX_PX,
  STATUS_ROW_NODE_SIZE_PX,
  STATUS_ROW_RAIL_WIDTH_PX,
  statusRowCss,
} from './style.js';
