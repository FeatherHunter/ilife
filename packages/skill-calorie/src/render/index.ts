export { CalorieRenderError } from './errors.js';
export type { CalorieRenderErrorCode } from './errors.js';
export { buildHomeData } from './home.js';
export type { HomeData } from './home.js';
export { MEAL_BUCKETS, buildMealDistribution, buildDietOverview } from './diet.js';
export type { MealBucket, MealSlice, MealDistribution, DietOverview } from './diet.js';
export { buildExerciseView } from './exercise.js';
export type { ExerciseView } from './exercise.js';
export { buildGoalView } from './goal.js';
export type { GoalView } from './goal.js';
export { buildGoalConfig, buildGoalRecommend, buildGoalProgress, buildGoalStatus, buildGoalWeight } from './goalPlate.js';
export type { GoalConfig, GoalProgress, GoalRecommend, GoalStatus, GoalWeight } from './goalPlate.js';
export { COMBINED_PAIRS, buildCombinedAnalysis, buildDeficitPlate, buildDietReview, buildTrendPlate } from './analysisPlate.js';
export type { CombinedAnalysis, DietReview, ReviewMealSlice } from './analysisPlate.js';
export { buildHealthPlate } from './health.js';
export type { HealthPlate } from './health.js';
export { RANK_CATEGORIES, buildAllRankings, buildFoodRankingPlate } from './ranking.js';
export type { AllRankings, RankCategory } from './ranking.js';
export { buildProductLibrary, buildProductSearch, buildProductStats } from './library.js';
export type { ProductLibrary, ProductSearch, ProductStats } from './library.js';
export { renderHomeHtml, renderDietHtml, renderExerciseHtml, renderGoalHtml } from './html.js';
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
export { VIEW_KEYS, VIEW_SHAPES, viewShapeFor, assertStatMetrics } from './envelope.js';
export type { ViewName } from './envelope.js';
