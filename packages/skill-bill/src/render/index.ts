export { BillRenderError } from './errors.js';
export { BILL_KEY_SHAPES, billShapeFor, buildBillEnvelope, parseBillEnvelope } from './envelope.js';
export { BILL_HTML_MAX_BYTES, escapeHtml, renderEnvelopeHtml, estimateBytes, assertHtmlSize, SHARED_CSS_MARKER, SHARED_HELPERS_MARKER, CONTENT_MARKER, SHARED_CSS, SHARED_HELPERS, fillTemplate } from './html.js';
export { BILL_TEMPLATES, templateFor, loadTemplate } from './templates.js';
export type { BillTemplate } from './templates.js';
export { toBillItem, calcKpi, calcCategories, buildRecordToday, buildRecordRange, buildRecordSearch, buildRecordDetail, buildRecordReceipt, buildOverview, buildCompare, buildTrend, buildGoalQuery, buildAccountQuery, buildHelpItems } from './views.js';
export type { BillItem, HelpItem } from './views.js';
export {
  HELP_FILE_STEM, HELP_FILE_SKILL_NAME, HELP_FILE_TITLE, HELP_FILE_VERSION, HELP_INIT_SCENE_ID, HELP_CONTACT,
  formatHelpMinute, deriveSummaryLine, buildMetaBlocks, buildInitBanner, buildHelpFileData, renderHelpFileHtml,
  buildHelpIndex,
} from './helpFile.js';
export type { HelpContact, HelpContactItem, HelpMetaBlock, HelpInitBanner, HelpFileData, HelpFileOptions, HelpIndex, HelpIndexItem } from './helpFile.js';
/** #237：时间戳／通式／初候选已收进共用件 `base-paint/save-html`（本模块只剩本技能自己的落点值）。 */
export { HELP_HTML_DIR_NAME, LOOKUP_FILE_STEM } from './helpPaths.js';
