/** lookup-index · **组件出口**（本组件对外的唯一名字面）。
 *
 *  五件出口：`renderLookupIndex(input)`（产标记，零 DOM）／`lookupIndexCss()`（样式段）／
 *  `buildLookupIndexJs()`（运行时：产出 JS 文本，锚点平滑滚动 ＋ 折叠档目标组展开）／
 *  别名规则 `LOOKUP_INDEX_ALIAS_MARK`／类名根 `LOOKUP_INDEX_CLASS` 与槽助手 `lookupIndexSlot()`。
 *
 *  **#1122 追加**：形态闭集 `LOOKUP_INDEX_FORMS`（`flat` 常显＝缺省档，形状与改动前逐字节同／`fold` 折叠档），
 *  与折叠档追加的两格槽 `count`／`rows`。既有常量与签名只加不改。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  LOOKUP_INDEX_ALIAS_MARK,
  LOOKUP_INDEX_ANCHOR_ATTR,
  LOOKUP_INDEX_BOUND_ATTR,
  LOOKUP_INDEX_CLASS,
  LOOKUP_INDEX_FORMS,
  LOOKUP_INDEX_GROUP_ATTR,
  LOOKUP_INDEX_RUNTIME_ATTR,
  LOOKUP_INDEX_SLOTS,
  lookupIndexSlot,
  normalizeLookupIndex,
} from './render.js';
export type {
  LookupAnchor,
  LookupGroup,
  LookupIndexForm,
  LookupIndexInput,
  LookupIndexModel,
  LookupIndexSlot,
  LookupRow,
} from './render.js';
export { renderLookupIndex } from './render.js';
export { LOOKUP_INDEX_MONO_STACK, lookupIndexCss } from './style.js';
export { buildLookupIndexJs } from './runtime.js';
