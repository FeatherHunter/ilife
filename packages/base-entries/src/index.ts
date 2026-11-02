// 包门：本包对外只有下面这些名字（窄接口，ADR-0004 §2）。里面的实现不出这个目录，
// 包外只经 `base-entries` 这一个入口取用（package.json 的 exports 只有 "."）。
//
// 不在门里的两样，故意不给外面：
//   · 可用语言清单——唯一权威是 base-link-core/src/config/language.ts（本包零依赖，不复制）；
//   · 回退链的构造与终站——外界只需要「取词 + 端口」这一件事，链序写在契约文档里。
export { BASE_LANGUAGE, defineCatalog } from './catalog.js';
// 渲染语言上下文（#1197 迁移期接线件）：CLI 入口进入语言，取词侧读同一个值。
export { currentRenderLanguage, runWithLanguage } from './language-context.js';
export type { Catalog, MessageId, MessageTable } from './catalog.js';
export { resolve } from './resolve.js';
export type { ResolveOptions } from './resolve.js';
export { evaluate } from './evaluate.js';
export type { Evaluate, EvaluateRequest, MessageParams } from './evaluate.js';
export { formatDate, formatNumber } from './format.js';
// 显示面列表连接符按语言（#1311）：zh「、」「＋」逐字节，en 走英文惯用（内建 Intl.ListFormat）。
export { listJoin, plusJoin, plusSign } from './list.js';
export { EntriesError, MissingMessageError, MissingParamError } from './errors.js';
