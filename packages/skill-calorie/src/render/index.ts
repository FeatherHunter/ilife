/** T8 #27 + T9 #28 + T10 #29 + #41 · 渲染出口：四主视图 + 目标分析盘 + 身体照片 + 读链补齐（体重/身体/计划/目标扩展/分析长尾/档案）。 */
export { CalorieRenderError } from './errors.js';
export type { CalorieRenderErrorCode } from './errors.js';
export { buildHomeData } from './home.js';
export type { HomeData } from './home.js';
export { MEAL_BUCKETS, buildMealDistribution, zeroMealDistribution, buildDietOverview } from './diet.js';
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
export { buildWeightDashboard, buildWeightHistoryView, buildWeightCompareView, buildWeightReviewView, buildVolatilityView } from './weightPlate.js';
export type { WeightDashboard, WeightHistoryView, WeightCompareView, WeightReviewView, VolatilityView } from './weightPlate.js';
export { buildBodyCompositionView, buildBodyCompositionCompare, buildBodyMeasureView, buildBodyMeasureCompare } from './bodyPlate.js';
export type { BodyCompositionView, BodyMeasureView } from './bodyPlate.js';
export { buildPlanView, buildPlanWizardView, buildExerciseGoalView } from './planPlate.js';
export type { PlanView, PlanWizardView, ExerciseGoalView } from './planPlate.js';
export { buildGoalExpiringView, buildGoalPredictView, buildGoalVsActualView } from './goalExtra.js';
export type { GoalExpiringView, GoalPredictView, GoalVsActualView } from './goalExtra.js';
export { buildPredictView, buildAnomalyView, buildContraView, buildDedupeView } from './insightPlate.js';
export type { PredictView, AnomalyView, ContraView, DedupeView } from './insightPlate.js';
export { buildProfileView } from './profilePlate.js';
export type { ProfileView } from './profilePlate.js';
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
  renderWeightHtml,
  renderWeightHistoryHtml,
  renderWeightCompareHtml,
  renderWeightReviewHtml,
  renderVolatilityHtml,
  renderBodyCompositionHtml,
  renderBodyMeasureHtml,
  renderPlanHtml,
  renderPlanWizardHtml,
  renderExerciseGoalHtml,
  renderGoalExpiringHtml,
  renderGoalPredictHtml,
  renderGoalVsActualHtml,
  renderPredictHtml,
  renderAnomalyHtml,
  renderContraHtml,
  renderDedupeHtml,
  renderProfileHtml,
} from './html.js';
export { CALORIE_TEMPLATES, loadTemplate } from './templates.js';
export type { CalorieTemplate } from './templates.js';
export { VIEW_KEYS, VIEW_SHAPES, viewShapeFor, assertStatMetrics } from './envelope.js';
export type { ViewName } from './envelope.js';
export {
  buildCrudReceipt, buildErrorReceipt, buildReceiptMeta,
} from './receipt.js';
export type {
  TagDiff, PhotoDistance, ReceiptItem, ReceiptMeta, CrudReceipt, ErrorReceipt,
} from './receipt.js';
export {
  toCard, buildGalleryData, buildCompareData, buildViewerData, buildGifTask,
  buildAddReceipt, buildDeleteReceipt, buildTagReceipt, GIF_PASSTHROUGH_NOTE,
} from './photo.js';
export type {
  PhotoCard, GalleryFilter, GalleryData, CompareData, ViewerData, GifTask, AddedPhoto,
} from './photo.js';
export { buildPhotoHelp, lookupPhotoHelp, PHOTO_HELP_MODULE } from './help.js';
export type { PhotoHelpHit } from './help.js';
export {
  photoCardHtml, renderPhotoReceiptHtml, renderGalleryHtml, renderCompareHtml,
  renderViewerHtml, renderGifHtml, renderPhotoHelpHtml, renderHelpLookupHtml, renderErrorHtml,
} from './html.js';
export type { HelpLookupHit } from './html.js';
export { CALORIE_COPY_ACTION, COPY_BUTTON_ATTRS, COPY_RUNTIME_JS, copyActionHtml, copyRuntimeScriptHtml } from './copy.js';
export { PHOTO_VIEW_KEYS, PHOTO_VIEW_SHAPES, photoShapeFor } from './envelope.js';
export type { PhotoViewName } from './envelope.js';
