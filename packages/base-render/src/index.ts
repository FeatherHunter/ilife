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
export { buildChartsHelpersJs, charts } from './charts.js';
/** #78 HELP模板（契约 §3.5.3／§6.5）：数据页分型，走 `fillTemplate`，`#88` 直接复用 `HelpShellInput`。
 *  `HelpSchemaError`／内置help模板 **不在此导出**（同口径；模板可经 `HelpShellInput.template` 覆盖）。 */
export { renderHelpShell } from './help.js';
/** #525 页面级两层（只追加，不动上面任何一条 export）：**移动端配方**（断点／触摸区／安全区／
 *  窄屏表格行为／页内定位）与**页面级形状件**（事实条／图片与 GIF 容器／时间轴条／媒体占位件）。
 *  与 `blocks.js` 的 12 区块样式区分住：这两层是「整页怎么摆」，不参与区块组合；
 *  是否启用由整页装配的 `pageUi` 位决定，不启用则产出物逐字节不变。 */
export { PAGE_COLUMNS, PAGE_COLUMN_WIDTH_PX, PAGE_UI_CLASS, PAGE_UI_VIEWPORT, pageUiCss } from './pageUi.js';
export type { PageColumn, PageUiCssInput } from './pageUi.js';
export {
  FACT_STRIP_MISSING_MARK,
  MEDIA_RATIOS,
  pageShapeCss,
  renderFactStrip,
  renderMediaFigure,
  renderMediaPlaceholder,
  renderTimelineRows,
} from './pageShapes.js';
export type {
  FactItemInput,
  FactStripInput,
  FactTone,
  MediaFigureInput,
  MediaPlaceholderInput,
  MediaRatio,
  TimelineRowInput,
  TimelineRowsInput,
} from './pageShapes.js';
/** #950 页面级导航与横条件（本批新立两族，与 `pageShapes.ts` 同层，出口经根）：
 *   · `pageNav.ts`：**分段导航**（`renderSegmentedNav`：页内导航的「动作」形状，与状态胶囊分得开）
 *     与**胶囊行**（`renderChipRow`：给裸 chip 一个容器，宽屏不再被网格提升成整行）。
 *   · `pageBars.ts`：**时间格带**（`renderDayStrip`：把「哪几天有记录」画出来）、
 *     **等式条**（`renderEquationBar`：`A＋B＝C` 的最小形状）、**态声明条**（`renderStateBanner`：
 *     「这句话在什么前提下成立」，与「结论」分住）。
 *  两族的样式由 `pageShapeCss()` 汇总进页（调用方不必另接样式函数）；
 *  启用口径仍由整页装配的 `pageUi` 位决定，不启用则产出物逐字节不变。 */
export {
  CHIP_TONES,
  SEG_NAV_ICONS,
  pageNavCss,
  renderChipRow,
  renderSegmentedNav,
} from './pageNav.js';
export type {
  ChipInput,
  ChipRowInput,
  ChipTone,
  SegNavIcon,
  SegNavItemInput,
  SegmentedNavInput,
} from './pageNav.js';
export {
  CAPTION_TONES,
  DAY_STRIP_EMPTY_MARK,
  STATE_TONES,
  pageBarsCss,
  renderDayStrip,
  renderEquationBar,
  renderStateBanner,
} from './pageBars.js';
export type {
  CaptionTone,
  DayCellInput,
  DayStripCaptionInput,
  DayStripInput,
  EquationBarInput,
  EquationSegmentInput,
  StateBannerInput,
  StateTone,
} from './pageBars.js';
