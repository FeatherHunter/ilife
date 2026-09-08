/** base-paint 入口：ui+style+injector+渲染契约统一出口。装配唯一 owner。 */
export { createPageRegistry, pageOrReco, recoDescriptor } from './ui.js';
export type { PageDescriptor, PageKind, PageRegistry } from './ui.js';
export { STYLE_PREFIX, STYLE_TOKENS, STYLE_VERSION, cx, token } from './style.js';
export type { StyleTokenName } from './style.js';
export { RenderError, RENDER_CONTRACT_VERSION, RENDER_ENVELOPE_VERSION, escapeHtml, renderPage, renderReco } from './contract.js';
export type { RenderErrorCode, RenderOutput } from './contract.js';
export { INJECTOR_DEFAULT_MAX_RETRIES, INJECTOR_DEFAULT_RETRY_MS, mountInjector, openPage } from './injector.js';
export type { MountHandle, MountOptions, SlotsPort, TabEntry, TabScope, TabSeed } from './injector.js';
/** #92（79a）冻结的共享层契约面（spec/*：type-only 类型 ＋ 纯数据常量）。只追加，不动既有 export。 */
export * from './spec/index.js';
/** #74 统一占位符填充器（契约 §3.1／§6.1）。`TemplateError` **不在此导出**：
 *  冻结面 `SPEC_FROZEN_SURFACE` 无该运行时条目，调用方按 `name`／`code` 判定。 */
export { fillTemplate } from './template.js';
/** #76 控件层（契约 §3.3／§6.3）：六个控件的产出与复制编排。`ControlsError` **不在此导出**——
 *  与 `TemplateError` 同口径（冻结面 44 条内无该运行时条目，调用方按 `name`／`code` 判定）。 */
export {
  bindCopyAction,
  buildSharedHelpersJs,
  copyText,
  createCopyRuntime,
  createToastController,
  renderActionBar,
  renderEmptyState,
  renderErrorReceipt,
  renderStatusBadge,
  renderToast,
} from './controls.js';
/** #77 复制文本序列化（契约 §3.4／§6.4）：envelope 逐 shape 投影 → text／json／csv。
 *  `TextError` **不在此导出**——与 `TemplateError`／`ControlsError` 同口径（冻结面无该运行时条目，
 *  调用方按 `name`／`code` 判定）。 */
export { buildDataText, buildLogText } from './text.js';
/** #78 图表层（契约 §3.5／§6.5）：`charts`（8 接口，纯 CSS+SVG 字符串产出）＋
 *  `buildChartsHelpersJs`（图表 helpers JS 唯一产出者，自注入 `CHARTS_STYLE_ID` 样式）。
 *  `ChartError` **不在此导出**——与 `TemplateError`／`ControlsError` 同口径（冻结面无该运行时条目，
 *  调用方按 `name`／`code` 判定）。 */
export { buildChartsHelpersJs, charts } from './charts.js';
/** #78 HELP 壳（契约 §3.5.3／§6.5）：数据页分型，走 `fillTemplate`，`#88` 直接复用 `HelpShellInput`。
 *  `HelpSchemaError`／内置壳模板 **不在此导出**（同口径；模板可经 `HelpShellInput.template` 覆盖）。 */
export { renderHelpShell } from './help.js';
