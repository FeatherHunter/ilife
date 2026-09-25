/** spread-dist · **样式段**（本件唯一的样式来源）。
 *
 *  纪律（与本节其余件同一份）：
 *   · 只经 `skinVar()` 读皮肤 —— 组件里**不写** `var(--ilife-…)`（兜底链只许住在 `skin/contract.ts`）；
 *   · 全部规则 scope 在 `.<prefix>page-ui` 之下（不开本配方页零命中）；不写 `:root`／`!important`、
 *     不新增 token 名、零代码里写死的色值（面与条一律从强调色系出）；
 *   · **宽度只许容器判**：布局靠 `@container` ＋ 内在尺寸 ＋ 纯 CSS 等分；本件不写任何 `@media`。
 *
 *  两处几何契约（判据钉住）：
 *   · **刻度与柱子同一把尺**：纵轴刻度列与逐日柱区**同高**（都取 `SPREAD_DIST_DAYS_PX`），
 *     刻度的位置是行内算出来的 `bottom`（`forms.ts` 里由 `upPct()` 给，与柱子的 `bottom` 同一支函数）；
 *     首末两枚刻度各用 `translateY(50%)` 把**中心**对到轴顶与轴底，故读者按刻度量一根柱量得准。
 *   · **色不是唯一信息**：范围条是强调色的**淡洗**（面），中位块是强调色**实底**（条）——
 *     一深一浅两种形 ＋ 图例给字；分位尺那边正中那一档是「有文字的面」⇒ 软底＋主色字＋主色描边，
 *     而**无文字的图形**（条）才走 `accent` 实底。**没有一处拿正文墨色当"面"**。
 */
import { skinVar } from '../skin/contract.js';
import { SPREAD_DIST_NARROW_PX, spreadDistSlot, type SpreadDistSlot } from './attrs.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 逐日柱区高度（px）：宽容器一档、窄容器一档。两份取值都在本文件里，判据读这里。 */
export const SPREAD_DIST_DAYS_PX = 150;
export const SPREAD_DIST_NARROW_DAYS_PX = 128;

/** 一个百分比档：强调色往卡面掺 `weight`%（淡洗＝合法的面；不是"拿墨色当面"）。 */
const wash = (weight: number): string => 'color-mix(in srgb, ' + skinVar('accent') + ' ' + String(weight)
  + '%, ' + skinVar('surface') + ')';

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function spreadDistCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const box = root + ' .' + p + 'block-spread-dist';
  /* 槽类名（**不带 scope**）：只用在**已经落进本件某条选择器内部**的位置（前缀由外层那条选择器给）。
     拿 `s()` 去拼后代／兄弟选择器会拼出 `.page-ui .a .page-ui .b` —— 第二条 `.page-ui` 永远匹配不到，
     规则「看着在、其实不生效」。本文件只用 `s()`；要拼嵌在选择器内部的裸槽类时，才在那一处现加 `c()`。 */
  const s = (slot: SpreadDistSlot): string => root + ' .' + spreadDistSlot(slot, p);
  const c = (slot: SpreadDistSlot): string => '.' + spreadDistSlot(slot, p);

  return [
    '/* spread-dist（分布与分位 · 两个形态：逐日范围柱／分位尺）：一批读数摊开成形状。',
    '   色一律从强调色系出（淡洗给区间面、实底给中位条、软底给有文字的中位档）：换皮只换取值、',
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
    /* 内容撑宽是横溢的来源：调用方给一句长口径时，`flex: none` ＋ `nowrap` 会让这一项拒绝收窄
       ⇒ 父行跟着溢出。故 `flex: 0 1 auto`（可收窄）＋ `min-width: 0` ＋ 允许在词内断行。 */
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
    /* ── B 档：坐标框（纵轴刻度列 ‖ 逐日柱区）＋ 横轴日子行 ── */
    '/* `padding-top` 与 `row-gap` 是给两处「长出框外」的余量：首末两枚刻度各平移半个字高',
    '   （把中心对到轴顶与轴底）、中位块在极值处平移半个块高 —— 都只长进这两处留白里，不压到别的东西。 */',
    s('plotbox') + ' {',
    '  display: grid;',
    '  grid-template-columns: max-content minmax(0, 1fr);',
    '  column-gap: 8px;',
    '  row-gap: 12px;',
    '  min-width: 0;',
    '  padding-top: 8px;',
    '}',
    s('yticks') + ' {',
    '  grid-column: 1;',
    '  grid-row: 1;',
    '  position: relative;',
    /* 与柱区**同高**：刻度列的高度就是尺子本身（不是"看起来差不多"）。
       两档各自与 `.days` 取**同一个常量** —— 两处写死必然走散（窄档实测过：柱区 128px 而刻度列留 150px，
       轴底刻度整整低了 22px，读者按刻度读出来的值系统性偏小）。 */
    '  height: ' + String(SPREAD_DIST_DAYS_PX) + 'px;',
    '  min-width: 0;',
    '}',
    s('ytick') + ' {',
    '  position: absolute;',
    '  right: 0;',
    '  transform: translateY(50%);',
    '  min-width: 0;',
    /* 刻度列是 `max-content` 宽：**要给它一个上限**，否则一句很长的单位会把柱子挤没、把容器撑宽。
       到了上限就在词内断行（刻度是数字 ＋ 单位，断了照样读得出来），容器永不被撑宽。 */
    '  max-width: 7em;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  font-variant-numeric: tabular-nums;',
    '  line-height: 1.2;',
    '  overflow-wrap: anywhere;',
    '}',
    /* 隐形撑子：与刻度同字同限（字号／字重／7em 上限／词内断行照抄，列宽与在流时一致），只撑列宽不上屏。 */
    s('yticks-sizer') + ' {',
    '  display: block;',
    '  visibility: hidden;',
    '  min-width: 0;',
    '  max-width: 7em;',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  overflow-wrap: anywhere;',
    '}',
    s('days') + ' {',
    '  grid-column: 2;',
    '  grid-row: 1;',
    '  display: flex;',
    /* 列距 **8px**：与柱区同一份划分的横轴行也用它 ⇒ 日子永远对着它那一列；
       这个数同时是**触控地板**那一档（调用方把某一天做成入口时，相邻命中盒之间不许小于 8px）。 */
    '  gap: 8px;',
    '  align-items: stretch;',
    '  height: ' + String(SPREAD_DIST_DAYS_PX) + 'px;',
    '  min-width: 0;',
    '  border-bottom: 1px solid ' + skinVar('line') + ';',
    '}',
    s('day') + ' {',
    '  position: relative;',
    '  flex: 1 1 0;',
    '  min-width: 0;',
    '}',
    /* 区间条：强调色 22% 的淡洗（"当天落在这之间"是面，不是条）；
       **宽度按「列宽的 40%，但不超过 64px」**：只给百分比时，天数少（两三列）的图里一根条会摊成一大块；
       `min-height` 是**零高度也有形**的地板（最低与最高那天相同＝一根读数，画成一条 4px 的短条）。 */
    s('day-range') + ' {',
    '  position: absolute;',
    '  left: 50%;',
    '  width: min(40%, 64px);',
    '  transform: translateX(-50%);',
    '  min-height: 4px;',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + wash(22) + ';',
    '}',
    /* 中位块：**无文字的图形 ⇒ `accent` 实底**；`translate(-50%, 50%)` 把块中心对到中位数那个位置
       （横向居中、纵向半高）。宽度同样封顶，免得两三列时它拉成一根通栏横线。 */
    s('day-median') + ' {',
    '  position: absolute;',
    '  left: 50%;',
    '  width: min(76%, 96px);',
    '  height: 6px;',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('accent') + ';',
    '  transform: translate(-50%, 50%);',
    '}',
    s('xax') + ' {',
    '  grid-column: 2;',
    '  grid-row: 2;',
    '  display: flex;',
    /* 与柱区**同一份列划分**（同一个 `gap` ＋ `flex: 1 1 0`）：任何天数下日子都对着它那一列。 */
    '  gap: 8px;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '}',
    s('xlabel') + ' {',
    '  flex: 1 1 0;',
    '  min-width: 0;',
    '  text-align: center;',
    '  overflow-wrap: anywhere;',
    '}',
    /* ── C 档：结论一句话在上、读数在下 ── */
    s('lead') + ' {',
    '  margin: 0;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-display') + ';',
    '  font-size: ' + skinVar('fs-body') + ';',
    '  font-weight: 700;',
    '  line-height: 1.5;',
    '  overflow-wrap: anywhere;',
    '}',
    /* 一档一格：`auto-fit` ＋ `minmax` ⇒ 宽档并排、窄档自动折行（**一档不减**，减档＝删读数）。
       档间距走皮肤自己的 `space`（大字报刊那套更大 ⇒ 那一档下留白自动多一层，不用写皮肤名分支）。 */
    s('stops') + ' {',
    '  display: grid;',
    '  grid-template-columns: repeat(auto-fit, minmax(148px, 1fr));',
    '  gap: ' + skinVar('space') + ';',
    '  min-width: 0;',
    '}',
    s('stop') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 2px 6px;',
    '  min-width: 0;',
    '  padding: 10px 12px;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('surface-2') + ';',
    '}',
    s('stop-name') + ' {',
    '  flex: 0 1 auto;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    s('stop-label') + ' {',
    '  flex: 0 1 auto;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  line-height: 1.45;',
    '  overflow-wrap: anywhere;',
    '}',
    /* 那个数另起一行（`flex-basis: 100%`）：一格里两层——上面一行说这是哪一档，下面一行是数。 */
    s('stop-value') + ' {',
    '  flex-basis: 100%;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-h3') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    /* 正中那一档（中位）：**有文字的选中面** ⇒ 软底 ＋ 主色字 ＋ 主色描边（三样同时在）。 */
    s('stop') + '.is-median {',
    '  border-color: ' + skinVar('accent') + ';',
    '  background: ' + skinVar('accent-soft') + ';',
    '}',
    /* 三处字一起换成主色文本档（档名／说明句／那个数），**一条选择器写全**——
       拆成三行会让「一行即一条选择器」的源码级判据读不到另外两行。 */
    s('stop') + '.is-median ' + c('stop-name') + ', ' + s('stop') + '.is-median ' + c('stop-label')
      + ', ' + s('stop') + '.is-median ' + c('stop-value') + ' {',
    '  color: ' + skinVar('accent-text') + ';',
    '}',
    /* ── 两档共用 ── */
    s('legend') + ' {',
    '  list-style: none;',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: center;',
    '  gap: 5px 14px;',
    '  margin: 0;',
    '  padding: 9px 0 0;',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '}',
    s('legend-item') + ' {',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 5px;',
    '  min-width: 0;',
    '  list-style: none;',
    '  overflow-wrap: anywhere;',
    '}',
    s('legend-mark') + ' {',
    '  display: block;',
    '  flex: 0 0 auto;',
    '  width: 12px;',
    '  height: 12px;',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('accent') + ';',
    '}',
    s('legend-mark') + '.is-range {',
    '  background: ' + wash(22) + ';',
    '}',
    s('legend-mark') + '.is-median {',
    '  height: 3px;',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '}',
    s('note') + ' {',
    '  margin: 0;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  line-height: 1.6;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 本件自身不带可点元素。这一条是**地板**：调用方把某一天／某一档包成入口时焦点必须看得见。 */',
    box + ' :focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 2px;',
    '}',
    /* 窄容器（<阈值，阈值住 `attrs.ts`）：柱区矮一档、区间条加宽一档、列间距收一档 —— **一列不减**。
       宽度靠 `flex: 1 1 0`／`auto-fit` 自己变窄，不横滑、也不藏横滑。 */
    '@container (max-width: ' + String(SPREAD_DIST_NARROW_PX) + 'px) {',
    '  ' + s('days') + ' {',
    '    height: ' + String(SPREAD_DIST_NARROW_DAYS_PX) + 'px;',
    '  }',
    /* 刻度列跟着柱区一起矮：两处取同一个窄档常量（高矮不同＝刻度与柱子不是同一把尺）。 */
    '  ' + s('yticks') + ' {',
    '    height: ' + String(SPREAD_DIST_NARROW_DAYS_PX) + 'px;',
    '  }',
    '  ' + s('day-range') + ' {',
    '    width: min(52%, 64px);',
    '  }',
    '  ' + s('day-median') + ' {',
    '    width: min(88%, 96px);',
    '  }',
    '}',
  ].join(LF);
}
