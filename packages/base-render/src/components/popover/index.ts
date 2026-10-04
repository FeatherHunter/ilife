/** popover · **组件出口**（该组件对外的唯一名字面）。
 *
 * —— 气泡卡片 · 承载长文本全文 ——
 *
 * 一句话：**长详情被单行省略号裁掉时，点／聚焦／悬停它，弹一张卡片看全文**；
 * **没有那段 JS 时整行可见、一个字都不丢**（安全底线），**有 JS 时观感与接线前逐字一致**。
 *
 * 什么时候用它（对照既有件想清楚再选）：
 *   · 「一行放不下、但一个字都不能少」的那段文本（明细行的副行、条卡行的主列、占比行的名称列）→ 用它；
 *   · 「给一个词补一句口径解释」→ 用 `tooltip`；
 *   · 「贴着按钮弹一排动作」→ 用 `popover-menu`；
 *   · 「确认一件破坏性的事」→ 用 `dialog`。
 *
 * 四个出口：
 *   · `renderPopoverFullText(input)` —— 产触发处 ＋ 卡片（纯函数，零 DOM；`popovertarget` 已接好）；
 *   · `popoverFullTextCss()` —— 该组件样式段（页面按需注入；不在 12 区闭集里）；
 *   · `buildPopoverFullTextJs()` —— 运行时（产出 JS 文本；DOM 只出现在文本里）；
 *   · `popoverNoScriptHtml()` —— 无 JS 降级段（**只在 `<noscript>` 里生效**，见 `noscript.ts` 的口径）；
 *   · 标记与常量 —— 页面自己拼标记时按同一份字面来（`POPOVER_*`）。
 *
 * 完整用法与参数表见同目录 `README.md`。
 */
export {
  POPOVER_ANCHOR_PREFIX, POPOVER_ANCHOR_QUERY, POPOVER_AREA_QUERY, POPOVER_ATTR, POPOVER_BOUND_ATTR,
  POPOVER_CARD_ATTR, POPOVER_CARD_CLASS, POPOVER_CARD_WIDTH_PX, POPOVER_CLASS, POPOVER_DEFAULT_SELECTORS,
  POPOVER_EDGE_PX, POPOVER_GAP_PX, POPOVER_MEASURE_ATTR, POPOVER_PREFIX, POPOVER_READY_ATTR, POPOVER_SCOPE,
  POPOVER_TRIGGER_ATTR, POPOVER_TRIGGER_CLASS,
} from './attrs.js';
export { renderPopoverFullText } from './render.js';
export { POPOVER_TEXT_SELECTORS, buildPopoverFullTextJs } from './runtime.js';
export { popoverFullTextCss } from '../style/popover.js';
export { popoverNoScriptCss, popoverNoScriptHtml } from './noscript.js';
export type {
  PopoverFullTextCssInput, PopoverFullTextInput, PopoverFullTextJsInput,
} from './model.js';
