/** heat-grid · **组件出口**（本组件对外的唯一名字面）。
 *
 *  六件出口：`renderHeatGrid(input)`（产标记，零 DOM）／`heatGridCss()`（样式段）／
 *  `heatGridLevel(value, stops)`（**唯一的着色函数**：值 → 色档，色键与格子共用它）／
 *  `HEAT_GRID_FORMS`（形态闭集）／`HEAT_GRID_CLASS` 与 `heatGridSlot()`（标记契约）／
 *  `HEAT_GRID_LEVEL_STOPS`（缺省分档上界 —— 色键上那几段数字区间就从它算出来）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export { renderHeatGrid } from './render.js';
export type { HeatGridFact, HeatGridForm, HeatGridInput, HeatGridRow, HeatGridSlot } from './attrs.js';
export {
  HEAT_GRID_CLASS,
  HEAT_GRID_COLUMNS,
  HEAT_GRID_FORMS,
  HEAT_GRID_LEVEL_COUNT,
  HEAT_GRID_LEVEL_STOPS,
  HEAT_GRID_MISSING,
  HEAT_GRID_PEAK_MARK,
  HEAT_GRID_SLOTS,
  HEAT_GRID_WEEKDAYS,
  heatGridSlot,
} from './attrs.js';
export { HEAT_GRID_ROW_PX, heatGridCss } from './style.js';
export { heatGridLevel } from './model.js';
