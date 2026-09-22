export { buildHelpLookup, lookupHelp } from './lookup.js';
export type { HelpHit } from './lookup.js';
// #790 · 向导「复制初始化 prompt」与 HELP 取同一处（`first_use` 的 `prompt_template`），
// 由能力门出门：`admin` 侧只走这个门、不深引用 `scenes/` 内部件。
export { HELP_ASSETS } from './scenes/help-assets.js';
