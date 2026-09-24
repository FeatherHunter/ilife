/** scatter-fit · **样式段**（本件唯一的样式来源；分箱段与滞后段在 `style-forms.ts`，由这里汇总）。
 *
 *  纪律（与本节其余件同一份）：
 *   · 只经 `skinVar()` 读皮肤 —— 组件里**不写** `var(--ilife-…)`（兜底链只许住在 `skin/contract.ts`）；
 *   · 全部规则 scope 在 `.<prefix>page-ui` 之下（不开本配方页零命中）；不写 `:root`／`!important`、不新增 token 名；
 *   · **宽度只许容器判**：布局靠 `@container` ＋ 内在尺寸 ＋ 纯 CSS 等分；本件不写任何 `@media`（视口宽 ≠ 组件宽）。
 *
 *  几何契约（判据钉住）：
 *   · **点阵区不留横滑**：坐标框是「纵轴刻度列（`max-content`）＋ 图区（`minmax(0,1fr)`）」两列，
 *     点的坐标是**算出来的百分比**（`forms.ts` 把数据映射到 3%…97%，点的半径再大也不跑出框）；
 *   · **色都从强调色系出**：点与线是 `accent` 实底（无文字的图形），概率带是强调色的**淡洗**
 *     （`color-mix` 往卡面掺），离群点是"圈出"的环（形），**任何一处都不拿 `ink`／`ink-2`／`ink-3` 当面**
 *     （那三支只做字）。换皮只换取值，色序不写死。
 *   · 分箱段与滞后段见 `style-forms.ts`（同一份纪律；搬走的是行数，不是取值）。
 */
import { skinVar } from '../skin/contract.js';
import { SCATTER_FIT_NARROW_PX, scatterFitSlot, type ScatterFitSlot } from './attrs.js';
import { scatterFitFormsCss } from './style-forms.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 图区高度（px）：宽容器一档、窄容器一档（分箱那一档住 `style-forms.ts`）。 */
export const SCATTER_FIT_PLOT_PX = 170;
const NARROW_PLOT_PX = 150;

/* 分箱区高度在本件的名字面上只报一次（取值住 `style-forms.ts`，判据与调用方读这里）。 */
export { SCATTER_FIT_BIN_PX } from './style-forms.js';

/** 一个百分比档：强调色往卡面掺 `weight`%（淡洗＝合法的面；不是"拿墨色当面"）。 */
const wash = (weight: number): string => 'color-mix(in srgb, ' + skinVar('accent') + ' ' + String(weight)
  + '%, ' + skinVar('surface') + ')';

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function scatterFitCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const box = root + ' .' + p + 'block-scatter-fit';
  /* 槽类名（**不带 scope**）：只用在**已经落进本件某条选择器内部**的位置（前缀由外层那条选择器给）。
     拿 `s()` 去拼后代／兄弟选择器会拼出 `.page-ui .a .page-ui .b` —— 第二条 `.page-ui` 永远匹配不到，
     规则「看着在、其实不生效」（样张页上抓到过一次真事：段内字色没生效）。本文件只用 `s()`；
     要拼嵌在选择器内部的裸槽类时，才在那一处现加一个 `c()`（`style-forms.ts` 有两处这样用）。 */
  const s = (slot: ScatterFitSlot): string => root + ' .' + scatterFitSlot(slot, p);

  return [
    '/* scatter-fit（相关性散点 · 三个形态：散点／分箱／滞后）：两个读数放在一张图上，',
    '   点是一片云、趋势是一条线、带子是大概率的范围。色一律从强调色系出',
    '   （实底给无文字的条与点、淡洗给概率带）：换皮只换取值、不换结构；任何一档都不拿文字墨色当面。 */',
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
    /* 内容撑宽是横溢的来源：调用方给一句长口径（时间窗可以很长）时，`flex: none` ＋ `nowrap`
       会让这一项拒绝收窄 ⇒ 父行跟着溢出（320 档实测 384 > 320）。故 `flex: 0 1 auto`（可收窄）＋
       `min-width: 0`（收窄到零也允许）＋ 允许在词内断行（`overflow-wrap`）。 */
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
    /* 坐标框：第一列按纵轴刻度文字占位（`max-content`），第二列是图区（`minmax(0,1fr)`）⇒
       图区在任何容器宽度下都摊在容器内，纵轴刻度长一点也不会把图挤出框。 */
    s('plotbox') + ' {',
    '  display: grid;',
    '  grid-template-columns: max-content minmax(0, 1fr);',
    '  column-gap: 8px;',
    '  row-gap: 4px;',
    '  min-width: 0;',
    '}',
    s('yticks') + ' {',
    '  grid-column: 1;',
    '  grid-row: 1;',
    '  display: flex;',
    '  flex-direction: column;',
    '  justify-content: space-between;',
    '  align-items: flex-end;',
    '  min-width: 0;',
    '}',
    s('ytick') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  font-variant-numeric: tabular-nums;',
    '  white-space: nowrap;',
    '}',
    s('plot') + ' {',
    '  grid-column: 2;',
    '  grid-row: 1;',
    '  position: relative;',
    '  height: ' + String(SCATTER_FIT_PLOT_PX) + 'px;',
    '  min-width: 0;',
    '  border-left: 1px solid ' + skinVar('line') + ';',
    '  border-bottom: 1px solid ' + skinVar('line') + ';',
    '}',
    /* 概率带：强调色 16% 的淡洗（"大概率的范围"是面，不是条）；形状由行内 `clip-path` 的多边形给。 */
    s('band') + ' {',
    '  position: absolute;',
    '  inset: 0;',
    '  background: ' + wash(16) + ';',
    '}',
    s('fitline') + ' {',
    '  position: absolute;',
    '  inset: 0;',
    '  background: ' + skinVar('accent') + ';',
    '}',
    /* 一个读数：**无文字的图形 ⇒ `accent` 实底**；坐标取 3%…97% 的轴内距，半径再大也不跑出框。 */
    s('dot') + ' {',
    '  position: absolute;',
    '  width: 10px;',
    '  height: 10px;',
    '  border-radius: 50%;',
    '  background: ' + skinVar('accent') + ';',
    '  transform: translate(-50%, 50%);',
    '}',
    /* 被点名的离群点：**形**（圈出来，比别的点大一圈）＋**字**（图例里写清原因）——
       不靠颜色，也不静默丢掉。 */
    s('dot') + '.is-outlier {',
    '  width: 14px;',
    '  height: 14px;',
    '  background: ' + skinVar('surface') + ';',
    '  border: 3px solid ' + skinVar('accent') + ';',
    '}',
    s('xticks') + ' {',
    '  grid-column: 2;',
    '  grid-row: 2;',
    '  display: flex;',
    /* 一排塞不下就**换行**（不是把每一枚压成一列竖字）：`flex-wrap` 先按各枚的自然宽度分行，
       只有"单独一枚比容器还宽"时才收窄——那时它自己换行，容器照旧不横滑。 */
    '  flex-wrap: wrap;',
    '  gap: 6px;',
    '  justify-content: space-between;',
    '  min-width: 0;',
    '}',
    s('xtick') + ' {',
    '  flex: 0 1 auto;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    /* 图例：每一项是「形 ＋ 字」——形由四档 `is-*` 给，字说清那是什么（形不是唯一信息）。 */
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
    s('legend-mark') + '.is-dot {',
    '  width: 10px;',
    '  height: 10px;',
    '  border-radius: 50%;',
    '}',
    s('legend-mark') + '.is-ring {',
    '  width: 13px;',
    '  height: 13px;',
    '  border: 3px solid ' + skinVar('accent') + ';',
    '  border-radius: 50%;',
    '  background: ' + skinVar('surface') + ';',
    '}',
    s('legend-mark') + '.is-median {',
    '  height: 3px;',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '}',
    s('legend-mark') + '.is-range {',
    '  background: ' + wash(24) + ';',
    '}',
    s('note') + ' {',
    '  margin: 0;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  line-height: 1.6;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 本件自身不带可点元素。这一条是**地板**：调用方把某一点包成入口（点开那一天）时焦点必须看得见。 */',
    box + ' :focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 2px;',
    '}',
    '/* 分箱段与滞后段（`style-forms.ts`）：同一份纪律、同一个前缀，插在这里——',
    '   顺序即层叠顺序，改动前后产物逐字节相同。 */',
    scatterFitFormsCss({ prefix: p }),
    '/* 窄容器（<' + String(SCATTER_FIT_NARROW_PX) + 'px，阈值住 `attrs.ts`，两份样式文件共用同一份）：',
    '   图区矮一档、点小一档、刻度距收一档 —— **一列不减**；宽度靠 `minmax(0,1fr)`／`flex: 1 1 0` 自己变窄，',
    '   不横滑、不藏横滑。 */',
    '@container (max-width: ' + String(SCATTER_FIT_NARROW_PX) + 'px) {',
    '  ' + s('plot') + ' {',
    '    height: ' + String(NARROW_PLOT_PX) + 'px;',
    '  }',
    '  ' + s('dot') + ' {',
    '    width: 9px;',
    '    height: 9px;',
    '  }',
    '  ' + s('dot') + '.is-outlier {',
    '    width: 12px;',
    '    height: 12px;',
    '  }',
    '  ' + s('xticks') + ' {',
    '    gap: 4px;',
    '  }',
    '}',
  ].join(LF);
}
