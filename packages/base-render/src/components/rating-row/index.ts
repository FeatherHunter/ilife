/** rating-row · **组件出口**（本组件对外的唯一名字面）。
 *
 *  五个运行名：`renderRatingRow(input)`（产标记，零 DOM）／`ratingRowCss()`（样式段）／
 *  `buildRatingRowJs()`（运行时，产出 JS 文本）／形态闭集 `RATING_ROW_FORMS`（本件只落地形态 A「星级＋分数」）／
 *  类名根 `RATING_ROW_CLASS`。加入参面类型与三条几何事实。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  RATING_ROW_BOUND_ATTR,
  RATING_ROW_CLASS,
  RATING_ROW_DEFAULT_MAX,
  RATING_ROW_DISABLED_ATTR,
  RATING_ROW_EVENT_CHANGE,
  RATING_ROW_FORMS,
  RATING_ROW_FORM_ATTR,
  RATING_ROW_HALF_ATTR,
  RATING_ROW_LOADING_ATTR,
  RATING_ROW_LOADING_TEXT,
  RATING_ROW_MAX_ATTR,
  RATING_ROW_MAX_MAX,
  RATING_ROW_MISSING,
  RATING_ROW_NAME_ATTR,
  RATING_ROW_SLOTS,
  RATING_ROW_STAR_ATTR,
  RATING_ROW_STAR_LABEL_SUFFIX,
  RATING_ROW_VALUE_ATTR,
  ratingRowSlot,
} from './attrs.js';
export type { RatingRowForm, RatingRowInput, RatingRowSlot } from './attrs.js';
export { renderRatingRow } from './render.js';
export {
  RATING_ROW_NARROW_PX,
  RATING_ROW_NUM_SCALE,
  RATING_ROW_STAR_FONT_PX,
  RATING_ROW_STAR_PX,
  ratingRowCss,
} from './style.js';
export { buildRatingRowJs } from './runtime.js';
