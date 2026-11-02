/** section-head · **样式段**（本件唯一的样式来源）。
 *
 *  纪律（与本节其余件同一份）：
 *   · 只经 `skinVar()` 读皮肤 —— 组件里**不写** `var(--ilife-…)`（兜底链只许住在 `skin/contract.ts`）；
 *     颜色／圆角／字面／字号一个都不写死在选择器里；
 *   · 全部规则 scope 在 `.<prefix>page-ui` 之下（不开本配方的页零命中）；不写 `:root`／`!important`、不新增 token 名；
 *   · **宽度只许容器判**：布局靠 `@container` ＋ 内在尺寸 ＋ `flex-wrap`；
 *     `@media` 只判设备能力（`hover:hover and pointer:fine` 与 `prefers-reduced-motion`），不判宽度。
 *
 *  几何契约（判据钉住）：标题行 `min-height` ＝ `SECTION_HEAD_SUM_MIN_PX`（触控命中盒地板）；
 *  计数恒 `flex:none`（窄档只换行、不掉字）；标题恒 `overflow-wrap:anywhere`（**永不 `…` 截断**）。
 */
import { skinVar } from '../skin/contract.js';
import {
  SECTION_HEAD_CARET_CODE,
  SECTION_HEAD_CLASS,
  SECTION_HEAD_MORE_TEXTS,
  sectionHeadSlot,
  type SectionHeadSlot,
} from './attrs.js';
import { m } from '../../entries/index.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 标题行的命中盒高度下限（px）：触控目标 ≥44×44 是全宽口径（视觉上是"一行标题"，可点的是整行）。 */
export const SECTION_HEAD_SUM_MIN_PX = 44;

/** 窄容器阈值（px）：计数与展开指示改走「另起一行」。
 *  **这是本件自己的宽度**（`@container` 判的），不是视口宽度。 */
const NARROW_PX = 420;

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function sectionHeadCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const box = root + ' .' + p + 'block-section-head';
  /** 槽位的**裸类名**（不带 scope）：**只用在组合器的右边**（`+`／`>`／后代那一段），
   *  左边（选择器开头）一律走 `s()`——开头那次 scope 不能省，省了整条就裸着（与别件串味）。 */
  const slot = (name: SectionHeadSlot): string => '.' + sectionHeadSlot(name, p);
  /** 带 scope 的完整选择器：**每条规则的左端**都用它（含伪元素那条，如 `s('more') + '::before'`）。 */
  const s = (name: SectionHeadSlot): string => root + ' ' + slot(name);
  const more = s('more');
  /** 展开态的元素级前缀：`<scope> <box>[open] `（后半截的内容由调用处拼**裸类名**）。 */
  const boxOpen = box + '[open] ';

  return [
    m('base-render.components-section-head-style.c001'),
    m('base-render.components-section-head-style.c002'),
    m('base-render.components-section-head-style.c003'),
    box + ' {',
    /* 宽度判据的落点：本件是**自己的容器**——嵌进侧栏／面板／卡片时照样按自己的宽度折行。 */
    '  container-type: inline-size;',
    '  display: block;',
    '  min-width: 0;',
    '}',
    m('base-render.components-section-head-style.c004'),
    m('base-render.components-section-head-style.c005'),
    s('sum') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: center;',
    '  gap: 4px 8px;',
    '  box-sizing: border-box;',
    '  min-width: 0;',
    '  min-height: ' + String(SECTION_HEAD_SUM_MIN_PX) + 'px;',
    '  padding: 4px 0;',
    '  cursor: pointer;',
    '  touch-action: manipulation;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    /* 去掉 UA 的三角标（另给一枚自绘的展开指示：随开合换字 ＋ 箭头旋转，比三角标多一样信息通道）。 */
    '  list-style: none;',
    '  transition: background-color 120ms ease;',
    '}',
    s('sum') + '::-webkit-details-marker {',
    '  display: none;',
    '}',
    m('base-render.components-section-head-style.c006'),
    m('base-render.components-section-head-style.c007'),
    m('base-render.components-section-head-style.c008'),
    s('ordinal') + ' {',
    '  flex: none;',
    '  color: ' + skinVar('accent-text') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 800;',
    '  font-variant-numeric: tabular-nums;',
    '  white-space: nowrap;',
    '}',
    s('title') + ' {',
    '  flex: 1 1 max-content;',
    '  min-width: min(100%, 12ch);',
    '  margin: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-h3') + ';',
    '  font-weight: 700;',
    '  line-height: 1.35;',
    '  overflow-wrap: anywhere;',
    '}',
    m('base-render.components-section-head-style.c009'),
    s('count') + ' {',
    '  flex: none;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  white-space: nowrap;',
    '}',
    m('base-render.components-section-head-style.c010'),
    m('base-render.components-section-head-style.c011'),
    more + ' {',
    '  flex: none;',
    '  margin-left: auto;',
    /* **给「展开／收起」留一格地板**：两枚字与箭头都由 `::before`／`::after` 出，而**伪元素的内容宽
       不进入 flex 的自动下限**（实测：`min-width:max-content`／`width:max-content` 三档都压成 30px，
       内容要 36px ⇒ 整件横向溢出 6px）。这一格里最长的一枚是「展开」（2 个 `fs-xs` 汉字 ≈ 24px）
       加箭头那一段（≈ 8px）⇒ 右侧留出 2 个 `fs-xs` 的空。 */
    '  padding-right: calc(2 * ' + skinVar('fs-xs') + ');',
    '  color: ' + skinVar('accent-text') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  white-space: nowrap;',
    '}',
    s('more') + '::before {',
    '  content: "' + SECTION_HEAD_MORE_TEXTS.folded + '";',
    '}',
    s('more') + '::after {',
    '  content: "' + SECTION_HEAD_CARET_CODE + '";',
    '  display: inline-block;',
    '  margin-left: 2px;',
    '  transition: transform 120ms ease;',
    '}',
    boxOpen + slot('more') + '::before {',
    '  content: "' + SECTION_HEAD_MORE_TEXTS.open + '";',
    '}',
    boxOpen + slot('more') + '::after {',
    '  transform: rotate(90deg);',
    '}',
    m('base-render.components-section-head-style.c012'),
    s('body') + ' {',
    '  display: grid;',
    '  gap: ' + skinVar('space') + ';',
    '  min-width: 0;',
    '  padding: 4px 0 8px;',
    '  overflow-wrap: anywhere;',
    '}',
    m('base-render.components-section-head-style.c013'),
    m('base-render.components-section-head-style.c014'),
    m('base-render.components-section-head-style.c015'),
    box + ':not([open]) > ' + slot('body') + ' {',
    '  display: none;',
    '}',
    m('base-render.components-section-head-style.c016'),
    m('base-render.components-section-head-style.c017'),
    box + ' :focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 2px;',
    '}',
    m('base-render.components-section-head-style.c018'),
    '@media (hover:hover) and (pointer:fine) {',
    '  ' + s('sum') + ':hover {',
    '    background-color: ' + skinVar('accent-soft') + ';',
    '  }',
    '}',
    '@media (prefers-reduced-motion:reduce) {',
    '  ' + s('sum') + ',',
    '  ' + s('more') + '::after {',
    '    transition-duration: 0.01ms;',
    '  }',
    '}',
    m('base-render.components-section-head-style.c019', { p0: String(String(NARROW_PX)) }),
    m('base-render.components-section-head-style.c020'),
    '@container (max-width: ' + String(NARROW_PX) + 'px) {',
    '  ' + s('sum') + ' {',
    '    align-items: baseline;',
    '  }',
    '  ' + s('more') + ' {',
    '    margin-left: 0;',
    '  }',
    '}',
  ].join(LF);
}
