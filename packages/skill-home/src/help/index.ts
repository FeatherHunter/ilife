export { buildHelpLookup, lookupHelp } from './lookup.js';
export type { HelpHit } from './lookup.js';
// #189 渲染接线：两个函数（造数据／出 HTML）。名字带 Home 前缀，与 `src/render/index.ts` 的
// 导出零重名（包入口 `src/index.ts` 是 `export *`，重名会被 ESM 静默丢掉）。
export { buildHomeHelpFileData, renderHomeHelpHtml } from './helpFile.js';
// #190 落盘接线：唯一落盘点（薄封装，机制在共用件 `base-paint/save-html`）。落点值住 `manifest.ts`，
// 出口层直接取用；这里只转发落盘那一件，不转发常量（导出面按铁律五收小）。
export { deliverHomeHelp } from './output.js';
export type { HomeHtmlDelivery } from './output.js';
