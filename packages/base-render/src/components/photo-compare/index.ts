/** photo-compare · **组件出口**（本组件对外的唯一名字面）。
 *
 *  七个运行名：`renderPhotoCompare(input)`（产标记，零 DOM）／`buildPhotoCompareJs()`（运行时段）／
 *  `photoCompareCss()`（样式段）／形态闭集 `PHOTO_COMPARE_FORMS`／方向闭集 `PHOTO_COMPARE_TONES`
 *  与记号表 `PHOTO_COMPARE_TONE_MARKS`／类名根 `PHOTO_COMPARE_CLASS`／
 *  两个几何事实（`PHOTO_COMPARE_MIN_HIT_PX` 命中盒下限、`PHOTO_COMPARE_NARROW_PX` 窄档阈值）。
 *  另出拖动位置那个局部自定义属性的名字与四个类型名（入参面）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  PHOTO_COMPARE_CLASS,
  PHOTO_COMPARE_FORMS,
  PHOTO_COMPARE_MIN_HIT_PX,
  PHOTO_COMPARE_MISSING,
  PHOTO_COMPARE_SPLIT_VAR,
  PHOTO_COMPARE_STEP,
  PHOTO_COMPARE_TONES,
  PHOTO_COMPARE_TONE_MARKS,
} from './attrs.js';
export type {
  PhotoCompareDelta,
  PhotoCompareForm,
  PhotoCompareInput,
  PhotoCompareSide,
  PhotoCompareTone,
} from './attrs.js';
export { renderPhotoCompare } from './render.js';
export { buildPhotoCompareJs } from './runtime.js';
export {
  PHOTO_COMPARE_MARK_ARM_PX,
  PHOTO_COMPARE_NARROW_PX,
  PHOTO_COMPARE_STAGE_MAX_PX,
  photoCompareCss,
} from './style.js';
