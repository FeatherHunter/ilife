export { MemoRenderError } from './errors.js';
export { MEMO_KEY_SHAPES, memoShapeFor, buildMemoEnvelope, parseMemoEnvelope } from './envelope.js';
export { MEMO_HTML_MAX_BYTES, escapeHtml, renderEnvelopeHtml, estimateBytes, assertHtmlSize } from './html.js';
export { MEMO_TEMPLATES, loadTemplate } from './templates.js';
export type { MemoTemplate } from './templates.js';
// #665 D-28：整页填充走共享 filler（`base-paint/fillTemplate`），资产走窄兼容对（`pageAssets.ts`）。
// 自持的两标记填充器（`fillSharedMarkers`）已退役——机制归共享层，不在技能侧另立第二份。
export { MEMO_PAGE_CSS, MEMO_PAGE_RUNTIME } from './pageAssets.js';
export {
  pageEnvelope,
  querySnapshot,
  syncSnapshot,
  wishPlanSnapshot,
  wishCompleteSnapshot,
  changeCategorySnapshot,
  fillMemoPage,
  fillTemplate,
} from './pages.js';
export type { PageSnapshot, PageCopyLog } from './pages.js';
