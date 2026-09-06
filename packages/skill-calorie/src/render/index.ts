/** T10 #29 · 身体照片渲染出口：收据/画廊/对比/单图/动图规划/HELP/失败回执。 */
export { CalorieRenderError } from './errors.js';
export type { CalorieRenderErrorCode } from './errors.js';
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
export { PHOTO_VIEW_KEYS, PHOTO_VIEW_SHAPES, photoShapeFor } from './envelope.js';
export type { PhotoViewName } from './envelope.js';
export {
  photoCardHtml, renderPhotoReceiptHtml, renderGalleryHtml, renderCompareHtml,
  renderViewerHtml, renderGifHtml, renderPhotoHelpHtml, renderErrorHtml,
} from './html.js';
