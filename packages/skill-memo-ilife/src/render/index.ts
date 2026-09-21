export { MemoRenderError } from './errors.js';
export { MEMO_KEY_SHAPES, memoShapeFor, buildMemoEnvelope, parseMemoEnvelope } from './envelope.js';
export { MEMO_HTML_MAX_BYTES, escapeHtml, renderEnvelopeHtml, estimateBytes, assertHtmlSize } from './html.js';
export { MEMO_TEMPLATES, loadTemplate } from './templates.js';
export type { MemoTemplate } from './templates.js';
// #665 D-28：整页填充走共享 filler（`base-paint/fillTemplate`）；#870 起资产走公共层产出
// （`memoPageAssets.ts`），自持窄镜像 `pageAssets.ts` 已退役。
export { memoPageAssets, memoRuntimeJs } from './memoPageAssets.js';
export type { MemoPageAssets } from './memoPageAssets.js';
export {
  pageEnvelope,
  querySnapshot,
  syncSnapshot,
  wishPlanSnapshot,
  wishCompleteSnapshot,
  changeCategorySnapshot,
  initSnapshot,
  fillMemoPage,
  fillTemplate,
} from './pages.js';
export type { PageSnapshot, PageCopyLog } from './pages.js';
// #831：「通用回执」页族（34 格里 19 格那一族）的唯一定义地；各域只填槽位。
export { buildReceiptPage, RECEIPT_SCENES } from './receipt.js';
export type { ReceiptPageInput, ReceiptRows, ReceiptBadges, ReceiptScene } from './receipt.js';
// #828：「列表查询」页族（34 格里 9 格那一族）的唯一定义地；各域只填槽位。
export { buildListPage, listSectionsOf } from './listPage.js';
export type { ListPageInput, ListPageScene, PageRow } from './listPage.js';
