/** photo-grid · **组件出口**（本组件对外的唯一名字面）。
 *
 *  六个运行名：`renderPhotoGrid(input)`（产标记，零 DOM）／`photoGridCss()`（样式段）／
 *  形态闭集 `PHOTO_GRID_FORMS`（只落地形态 A「网格 ＋ 加一张」）／比例闭集 `PHOTO_GRID_RATIOS`／
 *  类名根 `PHOTO_GRID_CLASS`／末尾那格的加号与字。另出四个几何事实与五个类型名（入参面）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  PHOTO_GRID_ADD_LABEL,
  PHOTO_GRID_ADD_MARK,
  PHOTO_GRID_CLASS,
  PHOTO_GRID_EMPTY_TEXT,
  PHOTO_GRID_FORMS,
  PHOTO_GRID_MIN_STACK,
  PHOTO_GRID_MISSING,
  PHOTO_GRID_RATIOS,
} from './attrs.js';
export type { PhotoGridForm, PhotoGridGroup, PhotoGridInput, PhotoGridItem, PhotoGridRatio } from './attrs.js';
export { renderPhotoGrid } from './render.js';
export {
  PHOTO_GRID_MARK_ARM_PX,
  PHOTO_GRID_MARK_INSET_PX,
  PHOTO_GRID_MARK_THICK_PX,
  PHOTO_GRID_THREE_COL_PX,
  PHOTO_GRID_TOUCH_PX,
  photoGridCss,
} from './style.js';
