/** style 组件族出口：6 个公开名字（与 `src/style.ts` 改前逐名相同）。
 *
 *  **为什么逐名列**：跨件共用的小件（`LF`／`sectionSlug`／`rootBlock`／`focusRing` 等）
 *  在搬家里必须补 `export`，`export *` 会把它们带出去、`dist/style.js` 的出口集合就变大了。
 */
export { STYLE_PREFIX, STYLE_TOKENS, STYLE_VERSION, cx, token } from './tokens.js';
export { buildStyleSheet } from './sheet.js';
export type { StyleTokenName } from './tokens.js';
