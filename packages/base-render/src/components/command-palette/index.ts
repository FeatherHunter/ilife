/** command-palette · **组件出口**（本组件对外的唯一名字面）。
 *
 *  三件运行名：`renderCommandPalette(input)`（产标记，零 DOM）／`commandPaletteCss()`（样式段）／
 *  `buildCommandPaletteJs()`（运行时段：输入即筛 ＋ 整行可点 ＋ 命中词重画）。
 *  标记契约（别的件／页面要按名字找元素时读它）：`COMMAND_PALETTE_CLASS`／`COMMAND_PALETTE_SLOTS`／
 *  `commandPaletteSlot()`／`COMMAND_PALETTE_PANEL_ATTR`／`COMMAND_PALETTE_ITEM_ATTR`／`COMMAND_PALETTE_QUERY_ATTR`。
 *  闭集与几何：`COMMAND_PALETTE_FORMS`（本件只落地形态 A「单栏分组结果」）／`COMMAND_PALETTE_KINDS`
 *  （动作在前、页面在后）／`COMMAND_PALETTE_TOUCH_PX`／`COMMAND_PALETTE_ROW_MIN_PX`／`COMMAND_PALETTE_GAP_PX`。
 *  两条事件：`COMMAND_PALETTE_EVENT_RUN`（点了一行）／`COMMAND_PALETTE_EVENT_QUERY`（筛完的真读数）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  COMMAND_PALETTE_ATTR,
  COMMAND_PALETTE_CLASS,
  COMMAND_PALETTE_CONTAINER,
  COMMAND_PALETTE_EDGE_PX,
  COMMAND_PALETTE_EVENT_QUERY,
  COMMAND_PALETTE_EVENT_RUN,
  COMMAND_PALETTE_FORMS,
  COMMAND_PALETTE_GAP_PX,
  COMMAND_PALETTE_HOVER_QUERY,
  COMMAND_PALETTE_ITEM_ATTR,
  COMMAND_PALETTE_KINDS,
  COMMAND_PALETTE_NARROW_PX,
  COMMAND_PALETTE_PANEL_ATTR,
  COMMAND_PALETTE_PANEL_MAX_PX,
  COMMAND_PALETTE_QUERY_ATTR,
  COMMAND_PALETTE_ROW_MIN_PX,
  COMMAND_PALETTE_SLOTS,
  COMMAND_PALETTE_TEXT,
  COMMAND_PALETTE_TOUCH_PX,
  commandPaletteSlot,
} from './attrs.js';
export type {
  CommandPaletteForm,
  CommandPaletteInput,
  CommandPaletteItem,
  CommandPaletteKind,
  CommandPaletteSlot,
} from './attrs.js';
export { renderCommandPalette } from './render.js';
export { commandPaletteCss } from './style.js';
export { buildCommandPaletteJs } from './runtime.js';
