export { CalorieRenderError } from './errors.js';
export type { CalorieRenderErrorCode } from './errors.js';
export { buildGoalConfig, buildGoalRecommend, buildGoalProgress, buildGoalStatus, buildGoalWeight } from './goalPlate.js';
export type { GoalConfig, GoalProgress, GoalRecommend, GoalStatus, GoalWeight } from './goalPlate.js';
export { COMBINED_PAIRS, MEAL_BUCKETS, buildCombinedAnalysis, buildDeficitPlate, buildDietReview, buildTrendPlate } from './analysisPlate.js';
export type { CombinedAnalysis, DietReview, MealBucket, ReviewMealSlice } from './analysisPlate.js';
export { buildHealthPlate } from './health.js';
export type { HealthPlate } from './health.js';
export { RANK_CATEGORIES, buildAllRankings, buildFoodRankingPlate } from './ranking.js';
export type { AllRankings, RankCategory } from './ranking.js';
export { buildProductLibrary, buildProductSearch, buildProductStats } from './library.js';
export type { ProductLibrary, ProductSearch, ProductStats } from './library.js';
export {
  renderAllRankingsHtml,
  renderCombinedHtml,
  renderDeficitHtml,
  renderDietReviewHtml,
  renderGoalConfigHtml,
  renderGoalProgressHtml,
  renderGoalRecommendHtml,
  renderGoalStatusHtml,
  renderGoalWeightHtml,
  renderHealthHtml,
  renderProductLibraryHtml,
  renderProductSearchHtml,
  renderProductStatsHtml,
  renderRankingHtml,
} from './html.js';
export { VIEW_KEYS, VIEW_SHAPES, assertStatMetrics, viewShapeFor } from './envelope.js';
export type { ViewName } from './envelope.js';
