/** page-head · **组件出口**（本组件对外的唯一名字面）。
 *
 *  五个运行名：`renderPageHead(input)`（产标记，零 DOM）／`pageHeadCss()`（样式段）／
 *  形态闭集 `PAGE_HEAD_FORMS`（本件只落地形态 B「读数当第二行」）／类名根 `PAGE_HEAD_CLASS`／
 *  尺寸事实 `PAGE_HEAD_READING_SCALE`（主读数 ＝ 页标题 × 它）。加三个类型名（入参面）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export { PAGE_HEAD_CLASS, PAGE_HEAD_FORMS } from './attrs.js';
export type { PageHeadForm, PageHeadInput, PageHeadReading } from './attrs.js';
export { renderPageHead } from './render.js';
export { PAGE_HEAD_READING_SCALE, pageHeadCss } from './style.js';
