export { HomeRenderError } from './errors.js';
export { HOME_KEY_SHAPES, homeShapeFor, buildHomeEnvelope, parseHomeEnvelope } from './envelope.js';
export {
  toItemCard, buildSearchList, buildDetail, buildReceipt, buildTagList,
  buildInventoryRecords, buildLocationList, buildOutfitList, buildStatsOverview,
  buildStatsAlert, buildShoppingList, buildTicketList, buildCareList, buildHelpItems,
} from './views.js';
export type { ItemCard, HelpItem } from './views.js';
export {
  HOME_HTML_MAX_BYTES, escapeHtml, latinFree, renderEnvelopeHtml, estimateBytes, assertHtmlSize,
  SHARED_CSS_MARKER, SHARED_HELPERS_MARKER, CONTENT_MARKER, SHARED_CSS, SHARED_HELPERS, fillTemplate,
} from './html.js';
export { homeCopyArea, homeCopyLog, homeNowStamp } from './copyArea.js';
export type { HomeCopyAreaInput, HomeCopyLogInput } from './copyArea.js';
export { HOME_TEMPLATES, templateFor, loadTemplate } from './templates.js';
export type { HomeTemplate } from './templates.js';
// #800 · 页族两层解析（票 2 契约 L1）：`(key, preset) → 页族`，旧 1:1 `templateFor` 原样保留。
export { UNKNOWN_FAMILY, resolvePageFamily } from './pageFamilies.js';
// #872 · 页族装配入口：`(key, params, env) → 整页 HTML 或 null`（交付链缺的那一段）。
export { domainsFor, familyModulePath, renderFamilyHtml, sceneNameOf, withSceneIdentity } from './familyPage.js';
// #801 · 场景命名（票 2 契约命名节的产出侧实施）：`(key, params) → 文件名主体`。
export { resolveSceneStem } from './sceneNaming.js';
export type { SceneNameRow } from './sceneNaming.js';
