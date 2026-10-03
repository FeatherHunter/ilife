/** chart-placeholder · **组件出口**（本组件对外的唯一名字面）。
 *
 *  四件出口：`renderChartPlaceholder(input)`（产标记，零 DOM）／`chartPlaceholderCss()`（样式段）／
 *  种类闭集 `CHART_PLACEHOLDER_KINDS`／类名根 `CHART_PLACEHOLDER_CLASS` 与槽助手 `chartPlaceholderSlot()`。
 *  本件**没有运行时段**（占位不接事件；真图由 `charts/` 直调回填）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  CHART_PLACEHOLDER_CLASS,
  CHART_PLACEHOLDER_DEFAULT_LINES,
  CHART_PLACEHOLDER_KINDS,
  CHART_PLACEHOLDER_SLOTS,
  chartPlaceholderSlot,
  normalizeChartPlaceholder,
} from './render.js';
export type {
  ChartPlaceholderInput,
  ChartPlaceholderKind,
  ChartPlaceholderModel,
  ChartPlaceholderSlot,
} from './render.js';
export { renderChartPlaceholder } from './render.js';
export { chartPlaceholderCss } from './style.js';
