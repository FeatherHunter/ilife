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
  /** 槽位的**类名**（不带 scope）——要拼组合选择器时用它，别拿已带 scope 的 `s()` 再拼（会拼出双前缀的假选择器）。 */
  const slot = (name: SectionHeadSlot): string => '.' + sectionHeadSlot(name, p);
  const s = (name: SectionHeadSlot): string => root + ' ' + slot(name);
  const more = s('more');

  return [
    '/* section-head（小节头 · 形态 C「可折叠小节（原生 details，零脚本）」）：',
    '   序号 ＋ 小节标题 ＋ 计数 ＋ 展开指示；正文原生开合，标记里没有一行脚本。',
    '   折行全走内在尺寸（`flex-basis:max-content` ＋ `flex-wrap`），不吃视口媒体查询。 */',
    box + ' {',
    /* 宽度判据的落点：本件是**自己的容器**——嵌进侧栏／面板／卡片时照样按自己的宽度折行。 */
    '  container-type: inline-size;',
    '  display: block;',
    '  min-width: 0;',
    '}',
    '/* 标题行：标题的内在宽度撑到 12ch，计数与展开指示自己折到下一行——',
    '   标题不被挤成一列孤字、也不掉字（不用 `…`）。整行是命中盒（`cursor:pointer` 走原生开合）。 */',
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
    '/* 序号：多小节文档里的一、二、三。等宽数字 ＋ 恒不换行（只换行、不掉字）。',
    '   窄档下它可能独占一行（标题的内在宽度撑满整行）：序号是**顺序信息**、不是与标题同级的一块，',
    '   独占一行仍读得出"这是第几节"，故不为它单独开一档布局（换了会让标题掉字）。 */',
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
    '/* 计数：恒不换行、恒不被压没（`flex:none` 是它在窄档的保命符）。 */',
    s('count') + ' {',
    '  flex: none;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  white-space: nowrap;',
    '}',
    '/* 展开指示：`::before` 出字（按 `[open]` 换「展开／收起」）、`::after` 只出旋转的箭头 ——',
    '   换字不跳版（两枚字宽度不同，但箭头那一段恒宽）。文本是**呈现事实**，不住在标记里。 */',
    more + ' {',
    '  flex: none;',
    '  margin-left: auto;',
    '  color: ' + skinVar('accent-text') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  white-space: nowrap;',
    '}',
    more + '::before {',
    '  content: "' + SECTION_HEAD_MORE_TEXTS.folded + '";',
    '}',
    more + '::after {',
    '  content: "' + SECTION_HEAD_CARET_CODE + '";',
    '  display: inline-block;',
    '  margin-left: 2px;',
    '  transition: transform 120ms ease;',
    '}',
    box + '[open] ' + more + '::before {',
    '  content: "' + SECTION_HEAD_MORE_TEXTS.open + '";',
    '}',
    box + '[open] ' + more + '::after {',
    '  transform: rotate(90deg);',
    '}',
    '/* 正文：受信透传的标记落这里，只给分组间距与换行——本件不再给它加壳。 */',
    s('body') + ' {',
    '  display: grid;',
    '  gap: ' + skinVar('space') + ';',
    '  min-width: 0;',
    '  padding: 4px 0 8px;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 折叠时必须真的看不见：UA 给 details 的闭合内容上的是 `content-visibility: hidden`，',
    '   而上面那条 `display: grid` 会把它顶掉（实测：折叠后正文仍占 26px 高）⇒ 这一条按闭合态显式收口。',
    '   只收本件自己的正文槽（`>` 限直系），不碰调用方塞进来的任何东西。 */',
    box + ':not([open]) > ' + slot('body') + ' {',
    '  display: none;',
    '}',
    '/* 焦点地板：本件自身不带可点元素；调用方若把标题或正文里的东西包成链接，焦点必须看得见',
    '   ——不许只写 `outline:none` 而不给替代。 */',
    box + ' :focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 2px;',
    '}',
    '/* 悬停反馈只在细指针 ＋ 有悬停时给（触屏不靠它——它**不是**唯一通路）。 */',
    '@media (hover:hover) and (pointer:fine) {',
    '  ' + s('sum') + ':hover {',
    '    background-color: ' + skinVar('accent-soft') + ';',
    '  }',
    '}',
    '@media (prefers-reduced-motion:reduce) {',
    '  ' + s('sum') + ',',
    '  ' + more + '::after {',
    '    transition-duration: 0.01ms;',
    '  }',
    '}',
    '/* 窄容器（<' + String(NARROW_PX) + 'px）：计数与展开指示整行掉到第二行——',
    '   标题占满整行（不被挤成一列孤字），计数与指示各自成段。判的是**本件自己的宽度**。 */',
    '@container (max-width: ' + String(NARROW_PX) + 'px) {',
    '  ' + s('sum') + ' {',
    '    align-items: baseline;',
    '  }',
    '  ' + more + ' {',
    '    margin-left: 0;',
    '  }',
    '}',
  ].join(LF);
}
