/** stat-inline · **组件出口**（本组件对外的唯一名字面）。
 *
 *  四个运行名：`renderStatInline(input)`（产标记，零 DOM）／`statInlineCss()`（样式段）／
 *  形态闭集 `STAT_INLINE_FORMS`（本件只落地形态 A「分隔点行内串」）／类名根 `STAT_INLINE_CLASS`
 *  ＋分隔点字形 `STAT_INLINE_SEP`（`·`）＋缺值写法 `STAT_INLINE_MISSING`（`—`）。加四个类型名（入参面）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  STAT_INLINE_CLASS,
  STAT_INLINE_FORMS,
  STAT_INLINE_MISSING,
  STAT_INLINE_SEP,
  statInlineSlot,
} from './attrs.js';
export type { StatInlineForm, StatInlineInput, StatInlineItem, StatInlineSlot } from './attrs.js';
export { normalizeStatInline } from './model.js';
export { renderStatInline } from './render.js';
export { statInlineCss } from './style.js';
