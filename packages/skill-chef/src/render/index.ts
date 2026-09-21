export { ChefRenderError } from './errors.js';
export { CHEF_KEY_SHAPES, chefShapeFor, buildChefEnvelope, parseChefEnvelope } from './envelope.js';
export { CHEF_HTML_MAX_BYTES, escapeHtml, renderEnvelopeHtml, estimateBytes, assertHtmlSize, SHARED_CSS_MARKER, SHARED_HELPERS_MARKER, CONTENT_MARKER, SHARED_CSS, SHARED_HELPERS, fillTemplate } from './html.js';
export { CHEF_TEMPLATES, templateFor, loadTemplate } from './templates.js';
export type { ChefTemplate } from './templates.js';
export { toRecipeItem, recipeDetail, buildRecipeReceipt, buildHistoryQuery, buildHelpItems } from './views.js';
// #839 搬迁债务（到期＝收口票把测试改打域接口后删）：下五件的新家在域目录，
// 本 barrel 只转出、不断言内容（结构纪律铁律五：过渡期旧共用 barrel 对新家内部件的深路径直引用）。
export { buildRecipeSearch } from '../search/run.js';
export { buildCookingRun } from '../cook/run.js';
export { buildShopping } from '../shopping/run.js';
export { buildHistoryRecord } from '../history/run-record.js';
export { toHistoryItem } from '../history/run-query.js';
export type { RecipeItem, RecipeDetail, RecipeHistoryStats, CookingStep, HelpItem } from './views.js';
