/** small-multiples · **样式段**（本件唯一的样式来源）。
 *
 *  纪律（与本节其余件同一份）：
 *   · 只经 `skinVar()` 读皮肤 —— 组件里**不写** `var(--ilife-…)`（兜底链只许住在 `skin/contract.ts`）；
 *   · 全部规则 scope 在 `.<prefix>page-ui` 之下（不开本配方页零命中）；不写 `:root`／`!important`、不新增 token 名；
 *   · **宽度只许容器判**：布局靠 `@container` ＋ 内在尺寸 ＋ 纯 CSS 等分；本件不写任何 `@media`
 *     （视口宽 ≠ 组件宽——这张卡会被嵌进侧栏／面板／卡片）。
 *
 *  几何契约（判据钉住）：
 *   · **柱阵与横轴标签行是同一份列划分**：两个都是 `display:flex` ＋ 同一个 `gap` ＋ 子项 `flex: 1 1 0`，
 *     列数由标记给（不写死 6）⇒ 标签永远对着它那一根柱，窄档也不会错位；
 *   · **一根柱都不减**：这一档的「列」就是数据里的期间本身，减列＝删掉一个期间（那是改结构）。
 *     窄容器里只收紧间距与图高、并让期间名与读数换行；
 *   · **柱与均值线不靠颜色区分**：线的线型是虚线（`border-top: 2px dashed`）＋ 线上那枚标注写着「均值 …」，
 *     卡头那句再说一遍「虚线＝N 期均值」——两样非色信息同时在；
 *   · **本期那一列有三样**：贯穿柱阵的竖标（形）＋ 轴上写着「本期」（字）＋ 强调色（色）。
 */
import { skinVar } from '../skin/contract.js';
import { smallMultiplesSlot, type SmallMultiplesSlot } from './attrs.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 柱阵区高度（px）：宽容器一档、窄容器一档。**判据拿它对两档几何**（本件自己的宽度，不是视口）。 */
export const SMALL_MULTIPLES_PLOT_PX = 130;
const NARROW_PLOT_PX = 118;

/** 柱与柱之间的间距（px）：宽容器一档、窄容器一档（窄档收紧间距＝把宽度还给柱子）。 */
const COL_GAP_PX = 6;
const NARROW_COL_GAP_PX = 4;

/** 窄容器阈值（px）：**这是本件自己的宽度**（`@container` 判的），不是视口宽。 */
const NARROW_PX = 460;

/** 一个百分比档：强调色往纸面掺 `weight`%（淡洗＝合法的面；不是"拿墨色当面"）。 */
const wash = (weight: number): string => 'color-mix(in srgb, ' + skinVar('accent') + ' ' + String(weight)
  + '%, ' + skinVar('surface') + ')';

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function smallMultiplesCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const box = root + ' .' + p + 'block-small-multiples';
  /* 槽类名（**不带 scope**）：只用在**已经落进本件某条选择器内部**的位置（前缀由外层那条选择器给）。
     拿带 scope 的选择器去拼后代（`.page-ui .a .page-ui .b`）会拼出一条**永不命中**的死规则
     （层的横切判据 ⑥ 会判红：一条选择器里作用域只许出现一次）。 */
  const c = (slot: SmallMultiplesSlot): string => '.' + smallMultiplesSlot(slot, p);
  const s = (slot: SmallMultiplesSlot): string => root + ' .' + smallMultiplesSlot(slot, p);

  return [
    '/* small-multiples（小倍数面板 · 期间并排迷你柱阵 ＋ 均值线）：同一个读数的几期并排成柱，',
    '   共用一套归一化刻度横着比高低；虚线是这几期的均值。',
    '   色一律从强调色系出（柱＝无文字的条走 accent 实底、本期竖标走 accent 的淡洗），',
    '   任何一处都不拿文字墨色当面；换皮只换取值、不换结构。 */',
    box + ' {',
    /* 宽度判据的落点：本件是**自己的容器**——嵌进侧栏／面板／卡片时照样按自己的宽度排。 */
    '  container-type: inline-size;',
    /* 宿主页不保证是 `border-box`（真页面默认 content-box）：本件带内距与边框的位子
       在那种页里会比容器宽出那几像素 ⇒ 在本件**自己的子树里**把 `box-sizing` 钉成 `border-box`。 */
    '  box-sizing: border-box;',
    '  display: grid;',
    '  gap: 10px;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-body') + ';',
    '  line-height: 1.5;',
    '}',
    box + ' * {',
    '  box-sizing: border-box;',
    '}',
    s('hd') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 3px 10px;',
    '  min-width: 0;',
    '}',
    s('title') + ' {',
    '  margin: 0;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-display') + ';',
    '  font-size: ' + skinVar('fs-h3') + ';',
    '  font-weight: 700;',
    '  line-height: 1.35;',
    '  overflow-wrap: anywhere;',
    '}',
    /* 期间范围与尾注：**都不许 `nowrap`**——长串会把卡撑出容器（零横向溢出是硬判据），
       窄档没地方就换行（`flex: 0 1 auto` ＋ `min-width: 0` 允许缩到内容宽度以下）。
       **`margin-left: auto` 只给尾注**：它把尾注顶到卡头右端，期间范围紧跟在标题后面
       （两枚都写 auto 会把空白对半分，范围被甩到卡头正中——原型那一档不是那个样子）。 */
    s('stamp') + ' {',
    '  flex: 0 1 auto;',
    '  min-width: 0;',
    '  padding: 1px 8px;',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '  background: ' + skinVar('surface-2') + ';',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    s('tail') + ' {',
    '  flex: 0 1 auto;',
    '  margin-left: auto;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    /* 柱阵：一行并排的期间列（列数由标记给，不写死在样式里）。底边那道发丝线就是基线。 */
    s('cols') + ' {',
    '  position: relative;',
    '  display: flex;',
    '  gap: ' + String(COL_GAP_PX) + 'px;',
    '  height: ' + String(SMALL_MULTIPLES_PLOT_PX) + 'px;',
    '  min-width: 0;',
    '  border-bottom: 1px solid ' + skinVar('line') + ';',
    '}',
    /* 一列：宽度由 `flex: 1 1 0` ＋ `min-width: 0` 摊（与横轴标签行同一份口径）⇒ 永远对得上。 */
    s('col') + ' {',
    '  position: relative;',
    '  display: block;',
    '  flex: 1 1 0;',
    '  min-width: 0;',
    '}',
    /* 本期那一列的**竖标**（形）：贯穿柱阵的一条淡洗竖线，柱子画在它上面 ⇒ 柱顶以上那一段露出来。
       淡洗从 `accent` 算出来（不新增 token、也不写死色值）。 */
    s('col') + '.is-now::before {',
    '  content: "";',
    '  position: absolute;',
    '  top: 0;',
    '  bottom: 0;',
    '  left: 50%;',
    '  width: 2px;',
    '  margin-left: -1px;',
    '  background: ' + wash(55) + ';',
    '}',
    /* 一根柱：**无文字的条 ⇒ `accent` 实底**；高度是行内那一个算出来的百分比。 */
    s('bar') + ' {',
    '  position: absolute;',
    '  left: 0;',
    '  right: 0;',
    '  bottom: 0;',
    '  display: block;',
    '  min-height: 4px;',
    '  border-radius: ' + skinVar('radius-sm') + ' ' + skinVar('radius-sm') + ' 0 0;',
    '  background: ' + skinVar('accent') + ';',
    '}',
    /* 均值线：位置＝把均值当读数喂进**同一个映射**算出来的百分比。线型是虚线（不是靠颜色认线），
       `z-index` 让线压在柱子上（读数等于均值的那一期，线正好穿过它的柱顶）。 */
    s('mean') + ' {',
    '  position: absolute;',
    '  left: 0;',
    '  right: 0;',
    '  z-index: 2;',
    '  border-top: 2px dashed ' + skinVar('ink-2') + ';',
    '}',
    /* 均值那一枚标注（**有字**）：贴着线右端浮在上面，底下垫纸面 ⇒ 压住柱子也读得清。
       `max-width: 100%` ＋ `overflow-wrap: anywhere`：再长的读数也换行，不截断、不撑出容器。 */
    s('mean-label') + ' {',
    '  position: absolute;',
    '  right: 0;',
    '  bottom: 4px;',
    '  max-width: 100%;',
    '  padding: 1px 6px;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('surface') + ';',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    /* 横轴标签行：**与柱阵同一份列划分**（同一个 gap ＋ 子项 `flex: 1 1 0`）。 */
    s('xax') + ' {',
    '  list-style: none;',
    '  display: flex;',
    '  gap: ' + String(COL_GAP_PX) + 'px;',
    '  margin: 0;',
    '  padding: 0;',
    '  min-width: 0;',
    '}',
    s('xlabel') + ' {',
    '  display: grid;',
    '  gap: 1px;',
    '  justify-items: center;',
    '  flex: 1 1 0;',
    '  min-width: 0;',
    '  text-align: center;',
    '}',
    /* 期间名与读数：**永不 `…` 截断**（长了换行），数字走等宽数字位。 */
    s('xperiod') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  overflow-wrap: anywhere;',
    '}',
    s('xvalue') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-style: normal;',
    '  font-weight: 600;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    /* 本期那枚字：强调色的**文本档**（对纸面 ≥4.5:1）；它是状态的字，不是装饰。
       不写 `nowrap`（全件不许 `…` 截断，也不许拿 `nowrap` 把字挤出容器）。 */
    s('nowmark') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('accent-text') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-style: normal;',
    '  font-weight: 700;',
    '  overflow-wrap: anywhere;',
    '}',
    s('note') + ' {',
    '  margin: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  line-height: 1.6;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 本件自身不带可点元素（纯静态图）。这一条是**地板**：调用方把某一列包成入口时，焦点必须看得见。 */',
    box + ' :focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 2px;',
    '}',
    /* 窄容器（<460px）：**一根柱都不减**（列就是数据本身），只把间距收紧、图区矮一档，
       宽度还给柱子；期间名与读数换行，不压字、不藏横滑。 */
    '@container (max-width: ' + String(NARROW_PX) + 'px) {',
    '  ' + s('cols') + ' {',
    '    gap: ' + String(NARROW_COL_GAP_PX) + 'px;',
    '    height: ' + String(NARROW_PLOT_PX) + 'px;',
    '  }',
    '  ' + s('xax') + ' {',
    '    gap: ' + String(NARROW_COL_GAP_PX) + 'px;',
    '  }',
    '}',
  ].join(LF);
}
