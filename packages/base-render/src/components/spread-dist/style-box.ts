/** spread-dist · **A 档（`box` 箱线）那一段样式**（同目录第三份样式来源；由 `style.ts` 的
 *  `spreadDistCss()` 接在最后汇总）。
 *
 *  为什么有这一件：本件一次落三档骨架，`style.ts` 一度到 349 行（本包告警线 350，
 *  `packages/base-render/AGENTS.md`）——A 档那一段加不进去。A 档那几样（贯穿的网格线与尺子／
 *  一行一组／须／箱体／中位粗线／离群圈／单笔点）边界干净，独立成件；**旧两档那两段一个字节都不改**。
 *
 *  原型＝`.scratch/ui-组件墙/新件/parts-数据与仪表.mjs` 第 65 件 A 档的**砍过文字那一版**
 *  （用户打 4 分的就是那一版）。三处口径照它落地：
 *   · **单位只印一次**（卡头右端），故刻度值逐枚不带单位（`tick-value` 的字由 `scale.ts` 给，不带 `unitPart`）；
 *   · 图例只有三项（`P25–P75`／`离群`／`单笔`）：**没有「中位数」那一条**（行头已各印一次「中位 NN」）；
 *   · 行头**一行一档字号**（组名／笔数／中位同号），中位不再另起一行放大。
 *
 *  几何契约（判据钉住，与 B 档同一条）：**一把尺子只有一份** —— 贯穿行区的网格线、尺子上那几枚刻度、
 *  每一行的须／箱体／中位粗线／点，全部读同一个算出来的百分比（`forms.ts` 的 `upPct()`）；
 *  刻度是 `absolute ＋ left: X% ＋ translateX(-50%)`（**中心**落在值的位置上），不是靠 `space-between` 平分。
 *
 *  纪律同 `style.ts`：只经 `skinVar()` 读皮肤／全部规则 scope 在 `.<prefix>page-ui` 之下／
 *  零 `:root`／零 `!important`／零颜色字面量／零省略手段（读数永不截断）／宽度只许容器判。
 */
import { skinVar } from '../skin/contract.js';
import { SPREAD_DIST_TRACK_PX, spreadDistSlot, type SpreadDistSlot } from './attrs.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** A 档的样式（由 `spreadDistCss()` 接在最后）。恒返回非空 CSS 文本。 */
export function spreadDistBoxCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const s = (slot: SpreadDistSlot): string => root + ' .' + spreadDistSlot(slot, p);
  /* 一个百分比档：强调色往卡面掺 `weight`%（淡洗＝合法的面；不是"拿墨色当面"）。 */
  const wash = (weight: number): string => 'color-mix(in srgb, ' + skinVar('accent') + ' ' + String(weight)
    + '%, ' + skinVar('surface') + ')';

  return [
    /* ── A 档：箱线（一行一组，同一把尺子横着量） ── */
    '/* A 档（`box`）：卡头 → 行区（贯穿的网格线 ＋ 一行一组：行头 ＋ 轨道）→ 尺子 → 图例 → 脚注。',
    '   四种形把四种读数分开（不靠颜色）：箱体是面、中位是粗线、离群是空心圈、单笔是实心点。 */',
    s('groups') + ' {',
    '  position: relative;',
    '  display: grid;',
    '  gap: 0;',
    '  min-width: 0;',
    '}',
    /* 贯穿整个行区的竖向网格线：**每一枚刻度一根**（行内 `left` 是算出来的百分比）。
       只做定位与贯穿，不接指针（免得挡住调用方给某一行包的可点入口）。 */
    s('grid') + ' {',
    '  position: absolute;',
    '  inset: 0;',
    '  pointer-events: none;',
    '}',
    s('grid-line') + ' {',
    '  position: absolute;',
    '  top: 0;',
    '  bottom: 0;',
    '  width: 1px;',
    '  transform: translateX(-50%);',
    '  background: ' + skinVar('line') + ';',
    '}',
    /* 首末两根**贴端**（与尺子上首末两枚同一个落法）：行内 `left` 是锚点，整块挪半个／一个自身宽度，
       于是它**不越出行区** —— 读起来还是落在值的位置上（差 0.5px），容器却一根毫毛都不多长。 */
    s('grid-line') + '.is-first { transform: none; }',
    s('grid-line') + '.is-last { transform: translateX(-100%); }',
    /* 一行一组：行头在上、轨道在下（轨道通栏，故四行的百分比与尺子那一条是同一份划分）。 */
    s('group') + ' {',
    '  display: grid;',
    '  grid-template-columns: minmax(0, 1fr);',
    '  gap: 4px;',
    '  min-width: 0;',
    '  padding: 9px 0;',
    '}',
    /* 行头**一行一档字号**：组名／笔数／中位同行同号，只差字重与色（不再有"大号中位"那一层）。 */
    s('group-hd') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 0 8px;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 600;',
    '}',
    s('group-name') + ' {',
    '  flex: 0 1 auto;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 700;',
    '  overflow-wrap: anywhere;',
    '}',
    s('group-count') + ' {',
    '  flex: 0 1 auto;',
    '  min-width: 0;',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  overflow-wrap: anywhere;',
    '}',
    /* 与组名同字号：中位是**同一行里的第三个读数**，不是第二层文字（原型砍掉的就是那一层）。 */
    s('group-median') + ' {',
    '  flex: 0 1 auto;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    /* 轨道：一行的那把尺子（内容全部绝对定位，位置是算出来的百分比）。 */
    s('track') + ' {',
    '  position: relative;',
    '  display: block;',
    '  height: ' + String(SPREAD_DIST_TRACK_PX) + 'px;',
    '  min-width: 0;',
    '}',
    /* 贯穿的底线（每行一条通栏发丝线：四行叠起来读成一把尺子，不是每行一根断开的短段）。 */
    s('rail') + ' {',
    '  position: absolute;',
    '  left: 0;',
    '  right: 0;',
    '  top: 50%;',
    '  height: 0;',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '}',
    /* 须（最低到最高）：**最轻的 1px 线**压在底线上，两端各一个封口——
       三级重量里它最轻、箱子居中、中位最重（原型的 1／发丝／3px 递进）。 */
    s('whisker') + ' {',
    '  position: absolute;',
    '  top: 50%;',
    '  height: 1px;',
    '  background: ' + skinVar('accent') + ';',
    '}',
    s('whisker') + '::before, ' + s('whisker') + '::after {',
    '  content: "";',
    '  position: absolute;',
    '  top: -5px;',
    '  width: 1px;',
    '  height: 11px;',
    '  background: ' + skinVar('accent') + ';',
    '}',
    s('whisker') + '::before { left: 0; }',
    s('whisker') + '::after { right: 0; }',
    /* 箱体（P25 到 P75）：发丝描边 ＋ 一档淡洗的面（是"面"，不是"条"）。
       **不设最小宽度**：P25 与 P75 相等时箱体宽度就是 0 —— 留在那儿的还有中位那条粗线与须的封口，
       拿一个 2px 的下限把"这一组四分位距为零"这件事盖掉，比看不见更坏。 */
    s('box') + ' {',
    '  position: absolute;',
    '  top: 4px;',
    '  height: 22px;',
    '  border: 1px solid ' + wash(62) + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + wash(14) + ';',
    '}',
    /* 中位：全图**唯一的重焦点**（3px 实底，穿透箱体；无文字的图形才走 `accent` 实底）。 */
    s('median') + ' {',
    '  position: absolute;',
    '  top: 2px;',
    '  height: 26px;',
    '  width: 3px;',
    '  transform: translateX(-50%);',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('accent') + ';',
    '}',
    /* 离群点：**空心圈**（须之外的读数；实心是单笔那一档的形，两档不混）。 */
    s('outlier') + ' {',
    '  position: absolute;',
    '  top: 50%;',
    '  width: 8px;',
    '  height: 8px;',
    '  transform: translate(-50%, -50%);',
    '  border: 2px solid ' + skinVar('danger') + ';',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '  background: ' + skinVar('surface') + ';',
    '}',
    /* 单笔读数（样本不足的组）：**实心点**，落在同一把尺子上。 */
    s('point') + ' {',
    '  position: absolute;',
    '  top: 50%;',
    '  width: 8px;',
    '  height: 8px;',
    '  transform: translate(-50%, -50%);',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '  background: ' + skinVar('accent') + ';',
    '}',
    /* 尺子（四行下面只画这一把）：一根通栏线（＝轴）＋ 每枚刻度一根竖线 ＋ 贴在它位置上的值。
       高度只按**一行刻度值**留（值长了会折行，折出来的那一行落在图例上方的留白里）。 */
    s('ruler') + ' {',
    '  position: relative;',
    '  height: 26px;',
    '  min-width: 0;',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '}',
    /* 一枚刻度：1px 竖线，**中心**落在它那个值的位置上（`left` ＋ `translateX(-50%)`）。 */
    s('tick') + ' {',
    '  position: absolute;',
    '  top: 0;',
    '  width: 1px;',
    '  height: 6px;',
    '  transform: translateX(-50%);',
    '  background: ' + skinVar('line') + ';',
    '}',
    /* 首末两枚同上：贴端（中心差 0.5px，容器零横溢）。 */
    s('tick') + '.is-first { transform: none; }',
    s('tick') + '.is-last { transform: translateX(-100%); }',
    /* 刻度值贴着刻度；`max-width` 给它一个上限（长数字在词内折行，不许顶宽容器）。 */
    s('tick-value') + ' {',
    '  position: absolute;',
    '  top: 8px;',
    '  min-width: 0;',
    '  max-width: 7em;',
    '  transform: translateX(-50%);',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  font-variant-numeric: tabular-nums;',
    '  line-height: 1.35;',
    '  text-align: center;',
    '  overflow-wrap: anywhere;',
    '}',
    /* 首末两枚**贴端**（把值摆进尺子里，不许为了"居中对齐"顶出容器）：整块按自身宽度挪，
       于是右端那一枚的**右缘**正好落在尺子右缘上（行内那个 `left` 是锚点，不是位移）；
       `max-content` 是必需的——绝对定位的右端那一枚可用宽度是 0（左缘就贴在容器右缘上），
       不写宽就会一个字一行地竖着折下来，压到图例上。 */
    s('tick-value') + '.is-first {',
    '  left: 0;',
    '  width: max-content;',
    '  transform: none;',
    '  text-align: left;',
    '}',
    s('tick-value') + '.is-last {',
    '  width: max-content;',
    '  transform: translateX(-100%);',
    '  text-align: right;',
    '}',
    /* 图例那三枚形（与图上的形一一对应：箱体的面／离群的圈／单笔的点）。 */
    s('legend-mark') + '.is-box {',
    '  border: 1px solid ' + wash(62) + ';',
    '  background: ' + wash(14) + ';',
    '}',
    s('legend-mark') + '.is-outlier {',
    '  width: 10px;',
    '  height: 10px;',
    '  border: 2px solid ' + skinVar('danger') + ';',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '  background: ' + skinVar('surface') + ';',
    '}',
    s('legend-mark') + '.is-point {',
    '  width: 8px;',
    '  height: 8px;',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '}',
  ].join(LF);
}
