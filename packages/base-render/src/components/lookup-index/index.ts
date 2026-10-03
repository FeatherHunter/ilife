/** lookup-index · **组件出口**（本组件对外的唯一名字面）。
 *
 *  五件出口：`renderLookupIndex(input)`（产标记，零 DOM）／`lookupIndexCss()`（样式段）／
 *  `buildLookupIndexJs()`（运行时：产出 JS 文本，锚点平滑滚动）／
 *  别名规则 `LOOKUP_INDEX_ALIAS_MARK`／类名根 `LOOKUP_INDEX_CLASS` 与槽助手 `lookupIndexSlot()`。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  LOOKUP_INDEX_ALIAS_MARK,
  LOOKUP_INDEX_ANCHOR_ATTR,
  LOOKUP_INDEX_BOUND_ATTR,
  LOOKUP_INDEX_CLASS,
  LOOKUP_INDEX_GROUP_ATTR,
  LOOKUP_INDEX_RUNTIME_ATTR,
  LOOKUP_INDEX_SLOTS,
  lookupIndexSlot,
  normalizeLookupIndex,
} from './render.js';
export type {
  LookupAnchor,
  LookupGroup,
  LookupIndexInput,
  LookupIndexModel,
  LookupIndexSlot,
  LookupRow,
} from './render.js';
export { renderLookupIndex } from './render.js';
export { lookupIndexCss } from './style.js';
export { buildLookupIndexJs } from './runtime.js';
