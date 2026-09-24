/** heat-grid · **样式段**（本件唯一的样式来源）。
 *
 *  纪律（与本节其余件同一份）：
 *   · 只经 `skinVar()` 读皮肤 —— 组件里**不写** `var(--ilife-…)`（兜底链只许住在 `skin/contract.ts`）；
 *   · 全部规则 scope 在 `.<prefix>page-ui` 之下（不开本配方页零命中）；不写 `:root`／`!important`、不新增 token 名；
 *   · **宽度只许容器判**：布局靠 `@container` ＋ 内在尺寸 ＋ `flex-wrap`；本件不写任何 `@media`（视口宽 ≠ 组件宽）。
 *
 *  几何契约（判据钉住）：
 *   · **列宽走 `minmax(0,1fr)`、行标签走 `max-content`**：七列在任何容器宽度下都摊在容器内，
 *     行标签按自己的字宽占位 ⇒ 根从不横向滚动，也**不靠** `overflow-x` 藏横滑；
 *   · 五档深浅**全部算出来**：`is-l0` 是"主文字 7% 的底"，`is-l1`…`is-l4` 是强调色往卡面混的四档，
 *     `is-l4` 直接用强调色；强调色变黑时自动退化成灰阶（浅端仍与卡面分得开）；
 *   · 峰值格的 ▲ 按该格深浅换字色（深格用强调底上的字色、浅格用主文字色）⇒ 两条信息都读得到。
 */
import { skinVar } from '../skin/contract.js';
import { heatGridSlot, type HeatGridSlot } from './attrs.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 行高（px）：宽容器一档、窄容器一档——格子是"宽扁"的（列宽由容器定、行高由这里定）。 */
export const HEAT_GRID_ROW_PX = 28;
const NARROW_ROW_PX = 22;

/** 窄容器阈值（px）：行矮一档、列距收一档。**这是本件自己的宽度**（`@container` 判的）。 */
const NARROW_PX = 460;

/** 一档深浅：从主文字/强调色往卡面混。`is-l4` 直接用强调色（最深那一档就是它）。 */
function levelBg(level: number): string {
  if (level === 0) return 'color-mix(in srgb, ' + skinVar('ink') + ' 7%, ' + skinVar('surface') + ')';
  if (level === 4) return skinVar('accent');
  return 'color-mix(in srgb, ' + skinVar('accent') + ' ' + String([0, 28, 52, 78][level]) + '%, '
    + skinVar('surface') + ')';
}

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function heatGridCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const box = root + ' .' + p + 'block-heat-grid';
  /* 槽类名（**不带 scope**）：只用在**已经落进本件某条选择器内部**的位置（前缀由外层那条选择器给）。
     拿 `s()` 去拼后代／兄弟选择器会拼出 `.page-ui .a .page-ui .b` —— 第二条 `.page-ui` 永远匹配不到，
     规则「看着在、其实不生效」（2026-09 样张页上抓到过一次：深格上那枚 ▲ 的字色没生效）。 */
  const c = (slot: HeatGridSlot): string => '.' + heatGridSlot(slot, p);
  const s = (slot: HeatGridSlot): string => root + ' .' + heatGridSlot(slot, p);

  return [
    '/* heat-grid（热力格 · 形态 A「行时段 × 列星期」）：每一格的深浅表示量，带一档色键。',
    '   五档深浅从强调色算出来（往卡面混）：换皮只换取值，色阶不写死；深浅不是唯一信息——',
    '   色键给数字区间、峰值格带 ▲、右侧读数给数字。 */',
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
    '  flex: none;',
    '  margin-left: auto;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  font-variant-numeric: tabular-nums;',
    '  white-space: nowrap;',
    '}',
    /* 网格与右侧读数：一排两格，`flex-wrap` 让它在窄容器里自己叠起来（不判视口宽度）。 */
    s('gridbox') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: flex-start;',
    '  gap: 12px 22px;',
    '  min-width: 0;',
    '}',
    '/* **这一条是关键**：第一列按行标签的字宽占位（max-content），其余七列等分剩余宽度（minmax(0,1fr)）。',
    '   七列在任何容器宽度下都摊在容器内 —— 不需要横滑、也不会有哪一列被挤出容器。 */',
    s('grid') + ' {',
    '  flex: 1 1 320px;',
    '  display: grid;',
    '  grid-template-columns: max-content repeat(7, minmax(0, 1fr));',
    '  grid-auto-rows: minmax(' + String(HEAT_GRID_ROW_PX) + 'px, auto);',
    '  gap: 2px;',
    '  min-width: 0;',
    '}',
    s('corner') + ' {',
    '  min-width: 0;',
    '}',
    s('col-head') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  text-align: center;',
    '  overflow-wrap: anywhere;',
    '}',
    /* 行标签：**永不换行、永不截断**（它是这一行的坐标）；宽度由它自己定（`max-content` 那一列）。 */
    s('row-label') + ' {',
    '  display: flex;',
    '  align-items: center;',
    '  padding-right: 6px;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  white-space: nowrap;',
    '}',
    s('cell') + ' {',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  min-width: 0;',
    '  overflow: hidden;',
    '  border-radius: 2px;',
    '}',
    /* 五档深浅：**全部算出来**（主文字往卡面 7% 是"空"那一档；四档强调色往卡面混）。 */
    s('cell') + '.is-l0, ' + s('swatch') + '.is-l0 {',
    '  background: ' + levelBg(0) + ';',
    '}',
    s('cell') + '.is-l1, ' + s('swatch') + '.is-l1 {',
    '  background: ' + levelBg(1) + ';',
    '}',
    s('cell') + '.is-l2, ' + s('swatch') + '.is-l2 {',
    '  background: ' + levelBg(2) + ';',
    '}',
    s('cell') + '.is-l3, ' + s('swatch') + '.is-l3 {',
    '  background: ' + levelBg(3) + ';',
    '}',
    s('cell') + '.is-l4, ' + s('swatch') + '.is-l4 {',
    '  background: ' + levelBg(4) + ';',
    '}',
    '/* 峰值格那枚 ▲：**形是深浅之外的第二条信息**。深格用强调底上的字色、浅格用主文字色。 */',
    s('peak-mark') + ' {',
    '  font-size: 10px;',
    '  line-height: 1;',
    '  color: ' + skinVar('ink') + ';',
    '}',
    s('cell') + '.is-peak.is-l3 ' + c('peak-mark') + ', ' + s('cell') + '.is-peak.is-l4 ' + c('peak-mark') + ' {',
    '  color: ' + skinVar('accent-ink') + ';',
    '}',
    /* 右侧读数：数字那一列永不换行、永不截断（合计数是读者要的那一个数）。 */
    s('rank') + ' {',
    '  flex: 1 1 210px;',
    '  list-style: none;',
    '  margin: 0;',
    '  padding: 0;',
    '  min-width: 0;',
    '}',
    s('rank-item') + ' {',
    '  display: grid;',
    '  grid-template-columns: minmax(0, 1fr) auto;',
    '  gap: 4px 10px;',
    '  align-items: baseline;',
    '  min-width: 0;',
    '  padding: 8px 0;',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '}',
    s('rank-item') + ':first-child {',
    '  border-top: 0;',
    '}',
    s('rank-label') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-weight: 600;',
    '  overflow-wrap: anywhere;',
    '}',
    s('rank-value') + ' {',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  white-space: nowrap;',
    '}',
    s('rank-sub') + ' {',
    '  grid-column: 1 / -1;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  overflow-wrap: anywhere;',
    '}',
    /* 色键：**必带**。五档色块 ＋ 逐档數字区间；两端「少／多」点明方向（深浅不是唯一信息）。 */
    s('key') + ' {',
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
    s('key') + ' > li {',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 5px;',
    '  min-width: 0;',
    '  list-style: none;',
    '  font-variant-numeric: tabular-nums;',
    '  white-space: nowrap;',
    '}',
    s('key-end') + ' {',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-weight: 600;',
    '}',
    s('swatch') + ' {',
    '  display: block;',
    '  flex: 0 0 auto;',
    '  width: 13px;',
    '  height: 13px;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: 3px;',
    '}',
    s('note') + ' {',
    '  margin: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  line-height: 1.6;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 本件自身不带可点元素。这一条是**地板**：调用方把格子做成链接（点开某一天）时焦点必须看得见。 */',
    box + ' :focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 2px;',
    '}',
    '/* 窄容器（<' + String(NARROW_PX) + 'px）：行矮一档、列距收一档 —— **七列照旧全在**',
    '   （列数不减：减列就是把一周砍成半周）；靠 `minmax(0,1fr)` 让每列自己变窄，不横滑、不藏横滑。 */',
    '@container (max-width: ' + String(NARROW_PX) + 'px) {',
    '  ' + s('grid') + ' {',
    '    grid-auto-rows: minmax(' + String(NARROW_ROW_PX) + 'px, auto);',
    '    gap: 1px;',
    '  }',
    '  ' + s('row-label') + ' {',
    '    padding-right: 4px;',
    '  }',
    '  ' + s('col-head') + ' {',
    '    font-size: 11px;',
    '  }',
    '}',
  ].join(LF);
}
