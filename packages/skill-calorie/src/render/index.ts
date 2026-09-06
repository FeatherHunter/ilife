/** T8 #27 + T10 #29 · 渲染出口：四主视图 + 身体照片（收据/画廊/对比/单图/动图规划/HELP/失败回执）。 */
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
export { renderHomeHtml, renderDietHtml, renderExerciseHtml, renderGoalHtml } from './html.js';
export {
  photoCardHtml, renderPhotoReceiptHtml, renderGalleryHtml, renderCompareHtml,
  renderViewerHtml, renderGifHtml, renderPhotoHelpHtml, renderErrorHtml,
} from './html.js';
export { VIEW_KEYS, VIEW_SHAPES, viewShapeFor, assertStatMetrics } from './envelope.js';
export type { ViewName } from './envelope.js';
export { PHOTO_VIEW_KEYS, PHOTO_VIEW_SHAPES, photoShapeFor } from './envelope.js';
export type { PhotoViewName } from './envelope.js';
