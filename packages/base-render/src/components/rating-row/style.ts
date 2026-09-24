/** rating-row · **样式段**（本件唯一的样式来源）。
 *
 *  纪律（与本节其余件同一份）：
 *   · 只经 `skinVar()` 读皮肤——组件里**不写**手写的 CSS 变量（兜底链只许住在 `skin/contract.ts`）；
 *   · 全部规则 scope 在 `.<prefix>page-ui` 之下；不写 `:root`／`!important`、不新增 token 名；
 *   · **宽度只许容器判**：本件自己是容器（`container-type: inline-size`），窄档调整走 `@container`；
 *     `@media` 只判设备能力，不判宽度。
 *
 *  几何契约（判据钉住）：
 *   · 每颗星是**可聚焦的按钮**，命中盒 44×44（`RATING_ROW_STAR_PX`）；
 *   · 那枚数字读数是**大字号**：＝ 正文档 × `RATING_ROW_NUM_SCALE`（皮肤只给 `fs-body` 一档 ⇒
 *     三套皮肤下都成立「读数 ≥ 正文 1.5 倍」），且走等宽数字（数位一变宽就跳版）；
 *   · 选中态**至少两重标记**：空心星 `☆` → 实心星 `★`（字形换了）＋ 那枚大数字（字）；
 *     颜色只是第三重。皮肤「大字报刊」下强调色＝墨黑 ⇒ 前两重必须自己扛。
 */
import { skinVar } from '../skin/contract.js';
import { RATING_ROW_HALF_ATTR, ratingRowSlot } from './attrs.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 一颗星的命中盒（px）：**触控目标的地板**，全宽口径（视觉上的星形可以小，盒子必须够）。 */
export const RATING_ROW_STAR_PX = 44;
/** 星字形的字号（px）：盒子 44 里放 26 的字形，指头按下去有富余。 */
export const RATING_ROW_STAR_FONT_PX = 26;
/** 那枚数字读数的倍数（相对皮肤 `fs-body`）：三套皮肤下都 ≥ 正文的 1.5 倍。 */
export const RATING_ROW_NUM_SCALE = 2.2;
/** 窄容器阈值（px）：读数改走「另起一行、左对齐」。**判的是本件自己的宽度**。 */
export const RATING_ROW_NARROW_PX = 420;

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function ratingRowCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const box = root + ' .' + p + 'block-rating-row';
  const s = (slot: Parameters<typeof ratingRowSlot>[0]): string => root + ' .' + ratingRowSlot(slot, p);
  /** **裸类名**：用在复合选择器的中段（`X > .槽`）。
   *  `s()` 自带作用域前缀，只许当选择器的**开头**——把它接在 `>` 后面会拼出
   *  `.ilife-page-ui X > .ilife-page-ui .槽`，那种规则永远匹配不到
   *  （2026-09 实拍：实心星一个都没画出来，就是这一处拼错）。 */
  const c = (slot: Parameters<typeof ratingRowSlot>[0]): string => '.' + ratingRowSlot(slot, p);
  const star = s('star');

  return [
    '/* rating-row（评分行 · 形态 A「星级 ＋ 数字读数」）：星星读"大约几颗"，那枚大数字读"到底几分"。',
    '   层次不靠阴影与大圆角（小票纸零阴影、大字报刊零圆角）：靠发丝线、字重与尺度差 ⇒ 换皮只换取值。 */',
    box + ' {',
    /* 宽度判据的落点：本件是**自己的容器**——嵌进侧栏／面板／卡片时照样按自己的宽度折行。 */
    '  container-type: inline-size;',
    '  display: grid;',
    '  gap: 8px;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-body') + ';',
    '  line-height: 1.5;',
    '}',
    '/* 标题行：给什么打分（主段）＋ 上次对照（次段）。两段都能换行——**不许 `…` 截断**。 */',
    s('label') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 4px 10px;',
    '  margin: 0;',
    '  min-width: 0;',
    '}',
    s('label-title') + ' {',
    '  color: ' + skinVar('ink') + ';',
    '  font-weight: 700;',
    '  overflow-wrap: anywhere;',
    '}',
    s('prev') + ' {',
    '  margin-left: auto;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 星与读数并成的那一排：容器一窄，读数自己折到下一行（不压星星、不掉字）。 */',
    s('body') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: center;',
    '  gap: 4px 14px;',
    '  min-width: 0;',
    '}',
    s('stars') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  gap: 0;',
    '  min-width: 0;',
    '}',
    '/* 一颗星：命中盒 44×44（可聚焦的按钮），字形比盒小一圈。 */',
    star + ' {',
    '  position: relative;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  box-sizing: border-box;',
    '  width: ' + String(RATING_ROW_STAR_PX) + 'px;',
    '  height: ' + String(RATING_ROW_STAR_PX) + 'px;',
    '  margin: 0;',
    '  padding: 0;',
    '  border: 0;',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: transparent;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font: inherit;',
    '  font-size: ' + String(RATING_ROW_STAR_FONT_PX) + 'px;',
    '  line-height: 1;',
    '  cursor: pointer;',
    '  transition: transform 80ms cubic-bezier(.22, 1, .36, 1);',
    '}',
    '/* 星字形：空的是空心星 `☆`，实心的是实心星 `★`——**形状换了**，不只是颜色换了。',
    '   判"填满了"走 `aria-checked="true"`（这一件每颗星本来就带它），不另挂 `is-on` 这类修饰类。 */',
    s('glyph') + '::before {',
    '  content: "\\2606";',
    '}',
    star + '[aria-checked="true"] {',
    '  color: ' + skinVar('accent') + ';',
    '}',
    star + '[aria-checked="true"] > ' + c('glyph') + '::before {',
    '  content: "\\2605";',
    '}',
    '/* 半颗（小数分值的显示）：左半实心、右半仍是空心——形状上看得出来"4.5 不是 4"。',
    '   半颗只由 `data-*` 标记（挂在这颗星上），因为"左半边"这件事没有对应的原生状态。 */',
    star + '[' + RATING_ROW_HALF_ATTR + '="1"] {',
    '  color: ' + skinVar('ink-3') + ';',
    '}',
    star + '[' + RATING_ROW_HALF_ATTR + '="1"] > ' + c('glyph') + ' {',
    '  position: relative;',
    '  display: block;',
    '}',
    star + '[' + RATING_ROW_HALF_ATTR + '="1"] > ' + c('glyph') + '::after {',
    '  content: "\\2605";',
    '  position: absolute;',
    '  left: 0;',
    '  top: 0;',
    '  width: 50%;',
    '  overflow: hidden;',
    '  color: ' + skinVar('accent') + ';',
    '}',
    '/* 鼠标悬停只是**提示**，不是唯一通路（选中态与焦点各有自己的标记）。 */',
    '@media (hover: hover) and (pointer: fine) {',
    '  ' + star + ':not([disabled]):hover {',
    '    color: ' + skinVar('ink-2') + ';',
    '  }',
    '}',
    '/* 真按下：缩一格（≤80ms 内回弹；只动 transform，不触发布局）。 */',
    star + ':active {',
    '  transform: scale(.98);',
    '}',
    '/* 焦点：**可见焦点**（≥2px），键盘走到哪一颗就看得见哪一颗。 */',
    star + ':focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: -2px;',
    '}',
    '/* 不可评：`cursor: not-allowed` ＋ 说明为什么（原因那句由标记渲染在 `why` 槽里）。 */',
    star + '[disabled] {',
    '  cursor: not-allowed;',
    '}',
    '/* 数字读数：星星之外的**那一重**（读得出 4 与 4.5 的差别）。等宽数字 ＋ 大字号。 */',
    s('score') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 2px 6px;',
    '  margin: 0 0 0 auto;',
    '  min-width: 0;',
    '}',
    s('num') + ' {',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: calc(' + skinVar('fs-body') + ' * ' + String(RATING_ROW_NUM_SCALE) + ');',
    '  font-weight: 700;',
    /* `line-height` 必须比 1 宽一点：数字字形（衬线皮肤下更明显）会顶出行盒，
       实拍 35.2px 字号 `line-height:1` 时 content 盒只有 35px、字形 37px ⇒ 被裁。 */
    '  line-height: 1.15;',
    '  letter-spacing: -.02em;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    s('den') + ' {',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 600;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    s('hint') + ' {',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 禁用原因：写在控件旁边（不只 `cursor: not-allowed`）。 */',
    s('why') + ' {',
    '  margin: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 错态：写在控件旁边（不是只染色），并带一枚记号字。 */',
    s('error') + ' {',
    '  display: flex;',
    '  gap: 6px;',
    '  margin: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 600;',
    '  overflow-wrap: anywhere;',
    '}',
    s('error') + '::before {',
    '  content: "\\26A0";',
    '  flex: none;',
    '  color: ' + skinVar('ink-2') + ';',
    '}',
    '/* 窄容器（<' + String(RATING_ROW_NARROW_PX) + 'px）：读数另起一行、左对齐（不再与星星挤一排）。',
    '   判的是**本件自己的宽度**：本件会被嵌进侧栏／面板／卡片，视口宽 ≠ 组件宽（所以这里不用 `@media`）。 */',
    '@container (max-width: ' + String(RATING_ROW_NARROW_PX) + 'px) {',
    '  ' + s('score') + ' {',
    '    margin-left: 0;',
    '  }',
    '}',
    '/* 动效偏好：只关过渡，不关状态（状态不许卡在半路 ⇒ 不用 `transitionend` 驱动任何东西）。 */',
    '@media (prefers-reduced-motion: reduce) {',
    '  ' + star + ' {',
    '    transition: none;',
    '  }',
    '}',
  ].join(LF);
}
