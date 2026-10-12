export { buildHelpLookup, lookupWake, type HelpHit } from './lookup.js';
export { buildHelpItems, type HelpItem } from './items.js';
export { buildLookupGroups, buildLookupIndexInput, renderLookupPageHtml } from './lookupPage.js';
// #1270（条目 10）：生成期来源读取（库在不在 ＋ 标签候选）——只读、fail-open，出口只调这一处。
export { readHelpSources, type HelpGenerationSources } from './helpSources.js';
export { WRITE_WORDS, buildWriteWire } from '../write/writeWire.js';
