/** compare-columns · **组件出口**（本组件对外的唯一名字面）。
 *
 *  三个运行名：`renderCompareColumns(input)`（产标记，零 DOM）／`compareColumnsCss()`（样式段）／
 *  形态闭集 `COMPARE_COLUMNS_FORMS`（本件只落地形态 A「背靠背条形」）。
 *  标记契约也一并转出（类名根 ＋ 槽位拼法 ＋ 方向字形 ＋ 正负号 ＋ 语气闭集 ＋ 差额与口径两枚标签）：
 *  判据与调用方都从这一份事实派生，不各抄一份字面量。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  COMPARE_COLUMNS_CALIBER_LABEL,
  COMPARE_COLUMNS_CLASS,
  COMPARE_COLUMNS_DIFF_LABEL,
  COMPARE_COLUMNS_DIRECTIONS,
  COMPARE_COLUMNS_DOWN,
  COMPARE_COLUMNS_FLAT,
  COMPARE_COLUMNS_FORMS,
  COMPARE_COLUMNS_MINUS,
  COMPARE_COLUMNS_PLUS,
  COMPARE_COLUMNS_SENSES,
  COMPARE_COLUMNS_SLOTS,
  COMPARE_COLUMNS_UP,
  compareColumnsDirectionClass,
  compareColumnsSideClass,
  compareColumnsSlot,
  compareColumnsToneClass,
} from './attrs.js';
export type {
  CompareColumnsDirection,
  CompareColumnsForm,
  CompareColumnsInput,
  CompareColumnsRow,
  CompareColumnsSense,
  CompareColumnsSlot,
} from './attrs.js';
export { renderCompareColumns } from './render.js';
export {
  COMPARE_COLUMNS_BAR_MIN_PX,
  COMPARE_COLUMNS_BAR_THICKNESS_PX,
  COMPARE_COLUMNS_LABEL_BAND_EM,
  COMPARE_COLUMNS_NARROW_PX,
  compareColumnsCss,
} from './style.js';
