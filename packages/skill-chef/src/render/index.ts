export { ChefRenderError } from './errors.js';
export { CHEF_KEY_SHAPES, chefShapeFor, buildChefEnvelope, parseChefEnvelope } from './envelope.js';
export { CHEF_HTML_MAX_BYTES, escapeHtml, renderEnvelopeHtml, estimateBytes, assertHtmlSize, SHARED_CSS_MARKER, SHARED_HELPERS_MARKER, CONTENT_MARKER, SHARED_CSS, SHARED_HELPERS, fillTemplate } from './html.js';
export { CHEF_TEMPLATES, templateFor, loadTemplate } from './templates.js';
export type { ChefTemplate } from './templates.js';
export { toRecipeItem, buildRecipeReceipt, buildHistoryQuery, buildHelpItems } from './views.js';
// #873 公共层席：私家大厨视觉皮肤（页面样式层的单一入口 `chefSceneCss`）。域页壳与
// `docs/skills/skill-chef/t77*-run-*.mjs` 两个驱动器都只从这一处取样式入口。
export { CHEF_SKIN_CSS, chefSkinCss, chefSceneCss } from './skin.js';
export type { ChefSkinCssInput } from './skin.js';
// #839 搬迁债务（到期＝收口票把测试改打域接口后删）：下六件的新家在域目录，
// 本 barrel 只转出、不断言内容（结构纪律铁律五：过渡期旧共用 barrel 对新家内部件的深路径直引用）。
export { recipeDetail } from '../view/run.js';
export { buildRecipeSearch } from '../search/run.js';
export { buildCookingRun } from '../cook/run.js';
export { buildShopping } from '../shopping/run.js';
export { buildHistoryRecord } from '../history/run-record.js';
export { toHistoryItem } from '../history/run-query.js';
export type { RecipeItem, RecipeDetail, RecipeHistoryStats, CookingStep, HelpItem } from './views.js';
