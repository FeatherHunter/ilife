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
