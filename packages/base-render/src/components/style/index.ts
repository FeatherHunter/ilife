/** style 组件族出口：6 个公开名字（与 `src/style.ts` 改前逐名相同）。
 *
 *  **为什么逐名列**：跨件共用的小件（`LF`／`sectionSlug`／`rootBlock`／`focusRing` 等）
 *  在搬家里必须补 `export`，`export *` 会把它们带出去、`dist/style.js` 的出口集合就变大了。
 */
export { STYLE_PREFIX, STYLE_TOKENS, STYLE_VERSION, cx, token } from './tokens.js';
export { buildStyleSheet } from './sheet.js';
export type { StyleTokenName } from './tokens.js';
/* #1135：序号位（判地 `.idx`）——行序方块的类名与样式段一件。只加行、不重排。 */
export { ENTRY_INDEX_BOX_PX, ENTRY_INDEX_RADIUS_PX, entryIndexCss, entryIndexSlot } from './entry-index.js';
/* #1124：票据纸族样式段从 skill 侧 docPage.ts 上移（按 #1082 §23）。只加行、不重排。 */
export { ticketFamilyCss, ticketFurnitureCss, TICKET_FURNITURE_CSS } from './ticket-family.js';
/* #1134：气泡卡片（长文本全文）的样式段**另立一件**——「ticket-family.ts 谁都不许改」的裁定照办。 */
export { popoverFullTextCss } from './popover.js';
