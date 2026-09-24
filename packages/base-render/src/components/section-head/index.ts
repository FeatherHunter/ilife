/** section-head · **组件出口**（本组件对外的唯一名字面）。
 *
 *  三个运行名：`renderSectionHead(input)`（产标记，零 DOM）／`sectionHeadCss()`（样式段）／
 *  形态闭集 `SECTION_HEAD_FORMS`（本件只落地形态 C「可折叠小节」）＋类名根 `SECTION_HEAD_CLASS`
 *  ＋命中盒读数 `SECTION_HEAD_SUM_MIN_PX`（标题行 ≥44px）。加四个类型名（入参面）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  SECTION_HEAD_CLASS,
  SECTION_HEAD_FORMS,
  SECTION_HEAD_MORE_TEXTS,
  SECTION_HEAD_SEQ_MAX,
  SECTION_HEAD_SEQ_MIN,
  sectionHeadSlot,
} from './attrs.js';
export type { SectionHeadForm, SectionHeadInput, SectionHeadSlot } from './attrs.js';
export { normalizeSectionHead } from './model.js';
export { renderSectionHead, sectionHeadOrdinalText } from './render.js';
export { SECTION_HEAD_SUM_MIN_PX, sectionHeadCss } from './style.js';
