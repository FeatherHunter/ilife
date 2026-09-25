/** gap-band · **样式段**（本件唯一的样式入口；`gapBandCss()` 汇总）。
 *
 *  为什么有两份：本件一次落两档形态，样式段一度到 461 行（本包告警线 350，
 *  `packages/base-render/AGENTS.md`）。切口按形态分：
 *   · 本件：根与卡头 ＋ `band` 档的坐标（刻度列 ‖ 差值图区 ＋ 横轴日子行）；
 *   · `style-forms.ts`：`deviation` 档的坐标（偏差柱区 ＋ 横轴日子行）＋ 两档共用的
 *     净差行与图例与脚注（搬走的是行数，不是取值 —— 顺序即层叠顺序，改动前后产物逐字节相同）。
 *
 *  纪律（与本节其余件同一份）：
 *   · 只经 `skinVar()` 读皮肤 —— 组件里**不写** `var(--ilife-…)`（兜底链只许住在 `skin/contract.ts`）；
 *   · 全部规则 scope 在 `.<prefix>page-ui` 之下（不开本配方页零命中）；不写 `:root`／`!important`、
 *     不新增 token 名、零代码里写死的色值（面与线一律从强调色系与文字档出）；
 *   · **宽度只许容器判**：布局靠 `@container` ＋ 内在尺寸 ＋ 纯 CSS 等分；本件不写任何 `@media`。
 *
 *  几何契约（判据钉住）：
 *   · **刻度与线同一把尺**：纵轴刻度列与差值图区**同高**（都取 `GAP_BAND_PLOT_PX`），
 *     刻度等距 ⇒ 纵向均分就是值的位置；首末两枚刻度各用 `translateY(∓50%)` 把**中心**
 *     对到轴顶与轴底，故读者按刻度读线量得准；
 *   · **带子不断裂**：面积与折线是整块一张 SVG（`preserveAspectRatio="none"`），顶点横坐标
 *     与横轴日子是同一支等分 —— 窄档下不断、不错位；
 *   · **色不是唯一信息**：实际线是实线、计划线是虚线 ＋ 右端写着计划值；偏差柱朝上还是朝下
 *     （方向）＋ 柱上数字的正负号（字）＋ 图例给字 —— 三样同时在。
 */
import { skinVar } from '../skin/contract.js';
import { GAP_BAND_NARROW_PX, gapBandSlot, type GapBandSlot } from './attrs.js';
import { gapBandDeviationCss } from './style-forms.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 差值图区高度（px）：宽容器一档、窄容器一档。两份取值都在本文件里，判据读这里。 */
export const GAP_BAND_PLOT_PX = 160;
export const GAP_BAND_NARROW_PLOT_PX = 140;

/* 偏差柱区三档高度住 `style-forms.ts`（取值在那里，判据与调用方读这里 —— 只报一次）。 */
export {
  GAP_BAND_COLS_PX,
  GAP_BAND_NARROW_COLS_PX,
  GAP_BAND_WIDE_COLS_PX,
} from './style-forms.js';

/** 一个百分比档：强调色往卡面掺 `weight`%（淡洗＝合法的面；不是"拿墨色当面"）。 */
const wash = (weight: number): string => 'color-mix(in srgb, ' + skinVar('accent') + ' ' + String(weight)
  + '%, ' + skinVar('surface') + ')';

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function gapBandCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const box = root + ' .' + p + 'block-gap-band';
  /* 槽类名（**不带 scope**）：只用在**已经落进本件某条选择器内部**的位置（前缀由外层那条选择器给）。
     拿 `s()` 去拼后代／兄弟选择器会拼出 `.page-ui .a .page-ui .b` —— 第二条 `.page-ui` 永远匹配不到，
     规则「看着在、其实不生效」。本文件只用 `s()`；要拼嵌在选择器内部的裸槽类时，才在那一处现加 `c()`。 */
  const s = (slot: GapBandSlot): string => root + ' .' + gapBandSlot(slot, p);
  const c = (slot: GapBandSlot): string => '.' + gapBandSlot(slot, p);

  return [
    '/* gap-band（差值带 · 两个形态：连续差值带／每日偏差柱）：计划和实际之间差多少、差在哪几天。',
    '   色一律从强调色系与文字档出（淡洗给带子面、实线给实际线、虚线给计划线）：换皮只换取值、',
    '   不换结构；任何一档都不拿文字墨色当面。 */',
    box + ' {',
    /* 宽度判据的落点：本件是**自己的容器**——嵌进侧栏／面板／卡片时照样按自己的宽度排。 */
    '  container-type: inline-size;',
    /* 宿主页不保证是 `border-box`（真页面默认 content-box）：本件带边框／内距的位子
       在那种页里会比容器宽出边框那几像素 ⇒ 在本件**自己的子树里**把 `box-sizing` 钉成 `border-box`。 */
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
    /* ── 卡头 ── */
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
    s('stamp') + ' {',
    /* 内容撑宽是横溢的来源：调用方给一句长口径时，`nowrap` 会让这一项拒绝收窄
       ⇒ 父行跟着溢出。故可收窄 ＋ 允许在词内断行。 */
    '  flex: 0 1 auto;',
    '  min-width: 0;',
    '  margin-left: auto;',
    '  padding: 1px 8px;',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '  background: ' + skinVar('surface-2') + ';',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  overflow-wrap: anywhere;',
    '}',
    s('tail') + ' {',
    '  flex: 0 1 auto;',
    '  min-width: 0;',
    '  margin-left: auto;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    /* ── band 档：坐标框（纵轴刻度列 ‖ 差值图区）＋ 横轴日子行 ── */
    '/* `padding-top` 与 `row-gap` 是给两处「长出框外」的余量：首末两枚刻度各平移半个字高',
    '   （把中心对到轴顶与轴底）—— 都只长进这两处留白里，不压到别的东西。 */',
    s('plotbox') + ' {',
    '  display: grid;',
    '  grid-template-columns: max-content minmax(0, 1fr);',
    '  column-gap: 8px;',
    '  row-gap: 12px;',
    '  min-width: 0;',
    '  padding-top: 10px;',
    '}',
    s('yticks') + ' {',
    '  grid-column: 1;',
    '  grid-row: 1;',
    /* 与差值图区**同高**：刻度列的高度就是尺子本身（不是"看起来差不多"）。
       两档各自与图区取**同一个常量** —— 两处写死必然走散。 */
    '  height: ' + String(GAP_BAND_PLOT_PX) + 'px;',
    '  display: flex;',
    '  flex-direction: column;',
    '  justify-content: space-between;',
    '  align-items: flex-end;',
    '  min-width: 0;',
    '}',
    s('ytick') + ' {',
    '  min-width: 0;',
    /* 刻度列是 `max-content` 宽：**要给它一个上限**，否则一句很长的单位会把图区挤没。
       到了上限就在词内断行（刻度是数字 ＋ 单位，断了照样读得出来），容器永不被撑宽。 */
    '  max-width: 7em;',
    '  padding-right: 6px;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  font-variant-numeric: tabular-nums;',
    '  line-height: 1.2;',
    '  text-align: right;',
    '  overflow-wrap: anywhere;',
    '}',
    /* 首末两枚把**中心**对到轴顶与轴底（平移不改布局，只改观感）：读者按刻度量的位置就是线的位置。 */
    s('ytick') + ':first-child {',
    '  transform: translateY(-50%);',
    '}',
    s('ytick') + ':last-child {',
    '  transform: translateY(50%);',
    '}',
    s('plot') + ' {',
    '  grid-column: 2;',
    '  grid-row: 1;',
    '  position: relative;',
    '  height: ' + String(GAP_BAND_PLOT_PX) + 'px;',
    '  min-width: 0;',
    '  border-bottom: 1px solid ' + skinVar('line') + ';',
    '  border-left: 1px solid ' + skinVar('line') + ';',
    '}',
    s('plot') + ' svg {',
    '  position: absolute;',
    '  left: 0;',
    '  top: 0;',
    '  width: 100%;',
    '  height: 100%;',
    '  display: block;',
    '}',
    /* 带子：强调色 30% 的淡洗（"两线之间差多少"是面，不是线）；折线去、计划线回，两端连成一片。 */
    s('band') + ' {',
    '  fill: ' + wash(30) + ';',
    '}',
    /* 实际线：2px 真折线（`non-scaling-stroke` ⇒ 容器再窄线也不被压扁）；实线 ＋ 图例给字。 */
    s('line') + ' {',
    '  fill: none;',
    '  stroke: ' + skinVar('accent') + ';',
    '  stroke-width: 2px;',
    '  vector-effect: non-scaling-stroke;',
    '  stroke-linejoin: round;',
    '  stroke-linecap: round;',
    '}',
    /* 计划线：穿通整块的 2px 虚线（线型与实线区分）＋ 右端那枚计划值（标注与虚线同时在）。 */
    s('plan') + ' {',
    '  position: absolute;',
    '  left: 0;',
    '  right: 0;',
    '  z-index: 2;',
    '  border-top: 2px dashed ' + skinVar('ink-2') + ';',
    '}',
    s('planlabel') + ' {',
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
    '}',
    /* 图内锚点：最深与最高两处各一枚，两级字（哪天一档、差多少一档等宽数字），不外挂徽章。 */
    s('anchor') + ' {',
    '  position: absolute;',
    '  z-index: 3;',
    /* 横坐标是行内 `--ax` 给的精确列心；`clamp` 把中心收进 70px…(全宽 − 70px) ——
       首末两列的锚点半枚标签会出框，收进来仍压在它那一列附近。 */
    '  left: clamp(70px, var(--ax), calc(100% - 70px));',
    '  display: inline-flex;',
    '  align-items: baseline;',
    '  gap: 5px;',
    '  max-width: calc(100% - 8px);',
    '  padding: 1px 6px;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('surface') + ';',
    '  transform: translateX(-50%);',
    '}',
    s('anchor') + ' b {',
    '  color: ' + skinVar('ink') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 700;',
    '}',
    s('anchor') + ' em {',
    '  color: ' + skinVar('accent-text') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-style: normal;',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '}',
    /* 高处那枚朝图里往下长一截，低处那枚朝图里往上长一截 —— 两枚都不出图区。 */
    s('anchor') + '.is-hi {',
    '  margin-top: 5px;',
    '}',
    s('anchor') + '.is-lo, ' + s('anchor') + '.is-flat {',
    '  margin-bottom: 5px;',
    '}',
    /* 横轴日子行：与差值图区**同一份等分**（`flex: 1 1 0` ＋ 零间距）⇒ 每枚日子对着折线上它那个点。 */
    box + '.is-band ' + c('xax') + ' {',
    '  grid-column: 2;',
    '  grid-row: 2;',
    '  display: flex;',
    '  gap: 0;',
    '  min-width: 0;',
    '}',
    s('xlabel') + ' {',
    '  flex: 1 1 0;',
    '  min-width: 0;',
    '  text-align: center;',
    '}',
    s('xday') + ' {',
    '  display: block;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  overflow-wrap: anywhere;',
    '}',
    s('xvalue') + ' {',
    '  display: block;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-style: normal;',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* deviation 档与两档共用段（`style-forms.ts`）：同一份纪律、同一个前缀，插在这里——',
    '   顺序即层叠顺序，改动前后产物逐字节相同。 */',
    gapBandDeviationCss({ prefix: p }),
    '/* 窄容器（<阈值，阈值住 `attrs.ts`）：图区与刻度列一起矮一档 —— **一列不减**。',
    '   宽度靠 `flex: 1 1 0` 自己变窄，不横滑、也不藏横滑（柱区那一档住 `style-forms.ts`）。 */',
    '@container (max-width: ' + String(GAP_BAND_NARROW_PX) + 'px) {',
    '  ' + s('plot') + ' {',
    '    height: ' + String(GAP_BAND_NARROW_PLOT_PX) + 'px;',
    '  }',
    /* 刻度列跟着图区一起矮：两处取同一个窄档常量（高矮不同＝刻度与线不是同一把尺）。 */
    '  ' + s('yticks') + ' {',
    '    height: ' + String(GAP_BAND_NARROW_PLOT_PX) + 'px;',
    '  }',
    '}',
  ].join(LF);
}
