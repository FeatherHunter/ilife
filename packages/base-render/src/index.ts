/** base-paint 入口：ui+style+injector+渲染契约统一出口。装配唯一 owner。 */
export { createPageRegistry, pageOrReco, recoDescriptor } from './ui.js';
export type { PageDescriptor, PageKind, PageRegistry } from './ui.js';
export { STYLE_PREFIX, STYLE_TOKENS, STYLE_VERSION, buildStyleSheet, cx, token } from './style.js';
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
export { buildChartsHelpersJs, charts } from './components/charts/index.js';
/** #78 HELP模板（契约 §3.5.3／§6.5）：数据页分型，走 `fillTemplate`，`#88` 直接复用 `HelpShellInput`。
 *  `HelpSchemaError`／内置help模板 **不在此导出**（同口径；模板可经 `HelpShellInput.template` 覆盖）。 */
export { renderHelpShell } from './help.js';
/** #525 页面级两层（只追加，不动上面任何一条 export）：**移动端配方**（断点／触摸区／安全区／
 *  窄屏表格行为／页内定位）与**页面级形状件**（事实条／图片与 GIF 容器／时间轴条／媒体占位件）。
 *  与 `blocks.js` 的 12 区块样式区分住：这两层是「整页怎么摆」，不参与区块组合；
 *  是否启用由整页装配的 `pageUi` 位决定，不启用则产出物逐字节不变。 */
export { PAGE_COLUMNS, PAGE_COLUMN_WIDTH_PX, PAGE_UI_CLASS, PAGE_UI_VIEWPORT, pageUiCss } from './components/page-ui/index.js';
export type { PageColumn, PageUiCssInput } from './components/page-ui/index.js';
export {
  FACT_STRIP_MISSING_MARK,
  MEDIA_RATIOS,
  pageShapeCss,
  renderFactStrip,
  renderMediaFigure,
  renderMediaPlaceholder,
  renderTimelineRows,
} from './components/page/index.js';
export type {
  FactItemInput,
  FactStripInput,
  FactTone,
  MediaFigureInput,
  MediaPlaceholderInput,
  MediaRatio,
  TimelineRowInput,
  TimelineRowsInput,
} from './components/page/index.js';
/** #950 页面级导航与横条件（本批新立两族，出口经根）：
 *   · `src/components/page-nav/`：**分段导航**（`renderSegmentedNav`：页内导航的「动作」形状，与状态胶囊分得开）。
 *   · `src/components/page-bars/`：**时间格带**（`renderDayStrip`：把「哪几天有记录」画出来）、
 *     **等式条**（`renderEquationBar`：`A＋B＝C` 的最小形状）、**态声明条**（`renderStateBanner`：
 *     「这句话在什么前提下成立」，与「结论」分住）。
 *  两族的样式由 `pageShapeCss()` 汇总进页（调用方不必另接样式函数）；
 *  启用口径仍由整页装配的 `pageUi` 位决定，不启用则产出物逐字节不变。
 *  住址：目录化批次①把这两族从 `src/` 根平铺件搬进 `src/components/`（判据＝产物逐字节相同，
 *  见 `docs/base/base-render/组件目录架构.md`）；根出口的名字与签名一字未动。 */
export { SEG_NAV_ICONS, pageNavCss, renderSegmentedNav } from './components/page-nav/index.js';
export type { SegNavIcon, SegNavItemInput, SegmentedNavInput } from './components/page-nav/index.js';
/** #950 收口：**胶囊行不在上面那一族**。`renderChipRow` 与语气闭集 `CHIP_TONES` 原先在本批于根上
 *  另立过一件，收口时按「一个问题在公共面上只留一条路」并回区块层 `blocks.ts`——那里早有同名、
 *  同容器类、且已在产线上跑的一件（`#728`），两件入参不兼容、样式两层各定义一次会互相盖。
 *  这里只把**同一个实现**从根转出：根与 `base-paint/blocks` 拿到的是同一个函数，语气位见
 *  `ChipItemInput.tone`、无障碍角色见 `ChipRowInput.role`。 */
export { CHIP_TONES, renderChipRow } from './blocks.js';
export type { ChipItemInput, ChipRowInput, ChipTone } from './blocks.js';
export {
  CAPTION_TONES,
  DAY_STRIP_EMPTY_MARK,
  STATE_TONES,
  pageBarsCss,
  renderDayStrip,
  renderEquationBar,
  renderStateBanner,
} from './components/page-bars/index.js';
export type {
  CaptionTone,
  DayCellInput,
  DayStripCaptionInput,
  DayStripInput,
  EquationBarInput,
  EquationSegmentInput,
  StateBannerInput,
  StateTone,
} from './components/page-bars/index.js';
