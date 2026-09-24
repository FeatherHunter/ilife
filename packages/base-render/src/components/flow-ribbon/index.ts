/** flow-ribbon · **组件出口**（本组件对外的唯一名字面）。
 *
 *  四件出口：`renderFlowRibbon(input)`（产标记，零 DOM）／`flowRibbonCss()`（样式段）／
 *  `FLOW_RIBBON_FORMS`（形态闭集：桑基带／交叉矩阵／两条构成轨）／`FLOW_RIBBON_CLASS` 与
 *  `flowRibbonSlot()`（标记契约）；另有尺常量（两列节点宽、节点框放得下读数的最小高、
 * 画布高的上下限、构成轨上放得下百分数的最小格宽、窄档阈值）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export { renderFlowRibbon } from './render.js';
export type {
  FlowRibbonForm,
  FlowRibbonInput,
  FlowRibbonLink,
  FlowRibbonNode,
  FlowRibbonSlot,
} from './attrs.js';
export {
  FLOW_RIBBON_CLASS,
  FLOW_RIBBON_DEFAULT_UNIT,
  FLOW_RIBBON_FONT_PX,
  FLOW_RIBBON_FORMS,
  FLOW_RIBBON_GAP_PCT,
  FLOW_RIBBON_HEIGHT_VAR,
  FLOW_RIBBON_LABEL_MIN_PX,
  FLOW_RIBBON_LANE_L1_VAR,
  FLOW_RIBBON_LANE_L2_VAR,
  FLOW_RIBBON_LANE_R1_VAR,
  FLOW_RIBBON_LANE_R2_VAR,
  FLOW_RIBBON_MAX_LINKS,
  FLOW_RIBBON_MAX_NAME_CHARS,
  FLOW_RIBBON_MAX_SOURCES,
  FLOW_RIBBON_MAX_USES,
  FLOW_RIBBON_MISSING,
  FLOW_RIBBON_MIX_VAR,
  FLOW_RIBBON_NARROW_PX,
  FLOW_RIBBON_NODE_COL_PX,
  FLOW_RIBBON_NODE_INNER_PX,
  FLOW_RIBBON_PLOT_MAX_PX,
  FLOW_RIBBON_PLOT_MIN_PX,
  FLOW_RIBBON_PLOT_VAR,
  FLOW_RIBBON_SEG_MIN_PCT,
  FLOW_RIBBON_SLOTS,
  FLOW_RIBBON_TOP_VAR,
  FLOW_RIBBON_USE_ATTR,
  FLOW_RIBBON_WIDTH_VAR,
  flowRibbonSlot,
} from './attrs.js';
export { flowRibbonCss } from './style.js';
