/** tooltip · **组件出口**（该组件对外的唯一名字面）。
 *
 *  —— 气泡说明 · 形态 B「宽气泡（带『为什么重要』）」——
 *
 *  一句话：正文里那个**看不懂的词**后面补一句解释——点它／聚焦它／悬停它，弹出一条宽气泡：
 *  眉标（口径／字段说明）＋ 小标题 ＋ 解释 ＋ **「为什么重要」**。走原生 `popover`：
 *  `Esc` 关、点外面关、顶层都是浏览器给的，**脚本坏了也点得开**。
 *
 *  什么时候用它（对照既有件想清楚再选）：
 *   · 要「给一个词补一句口径解释」（周均摄入、均摊、缺值）→ 用它；
 *   · 要「一页统一交代口径」→ 用 `page-head` 的口径行；
 *   · 要「贴着一颗键弹几条动作」→ 用 `popover-menu`（那是动作，不是说明）。
 *
 *  两件出口：
 *   · `renderTooltip(input)` —— 产词 ＋ 气泡（纯函数，零 DOM；`popovertarget` 已接好）；
 *   · `tooltipCss()` —— 该组件样式段（页面按需注入；不进 12 区闭集）；
 *   · `buildTooltipJs()` —— 运行时（产出 JS 文本；DOM 只出现在文本里）。
 *
 *  完整用法与参数表见同目录 `README.md`。
 */
export {
  TOOLTIP_ANCHOR_PREFIX, TOOLTIP_ANCHOR_QUERY, TOOLTIP_ATTR, TOOLTIP_BADGES, TOOLTIP_BADGE_TEXT,
  TOOLTIP_BOUND_ATTR, TOOLTIP_BUBBLE_ATTR, TOOLTIP_CLASS, TOOLTIP_EDGE_PX, TOOLTIP_FORMS, TOOLTIP_HINT,
  TOOLTIP_HIT_INSET_Y_PX, TOOLTIP_HIT_PX, TOOLTIP_MARK, TOOLTIP_OFFSET_PX, TOOLTIP_SLOTS, TOOLTIP_WHY_LABEL,
  TOOLTIP_WIDTH_PX, TOOLTIP_WORD_ATTR, tooltipClass, tooltipSlot,
} from './attrs.js';
export type { TooltipBadge, TooltipForm, TooltipInput, TooltipSlot } from './attrs.js';
export { renderTooltip } from './render.js';
export { tooltipCss } from './style.js';
export type { TooltipCssInput } from './style.js';
export { buildTooltipJs } from './runtime.js';
