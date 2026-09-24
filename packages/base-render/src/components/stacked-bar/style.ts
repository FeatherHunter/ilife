/** stacked-bar · **样式段**（本件唯一的样式来源）。
 *
 *  纪律（与本节其余件同一份）：
 *   · 只经 `skinVar()` 读皮肤 —— 组件里**不写** `var(--ilife-…)`（兜底链只许住在 `skin/contract.ts`）；
 *   · 全部规则 scope 在 `.<prefix>page-ui` 之下（不开本配方页零命中）；不写 `:root`／`!important`、不新增 token 名；
 *   · **宽度只许容器判**：布局靠 `@container` ＋ 内在尺寸 ＋ `flex-wrap`；本件不写任何 `@media`（视口宽 ≠ 组件宽）。
 *
 *  几何契约（判据钉住）：
 *   · 段宽之和恒为 100%（行内 `flex` 是千分比整数）⇒ 条永远填满整宽、根不留横向滚动；
 *   · 数据色**全部算出来**：`is-k1`…`is-k6` 从强调色往主文字（深端）／往卡面（浅端）混，
 *     强调色变黑时自动退化成灰阶（浅端仍与卡面分得开）；
 *   · 段里读数的可见性由**占比档**决定（`is-name`／`is-value`／`is-none`，渲染期定），
 *     窄容器再退一档：`is-value` 那批的段内字让位图例（**图例必带数值**，所以数字不丢）。
 */
import { skinVar } from '../skin/contract.js';
import { stackedBarSlot, type StackedBarSlot } from './attrs.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 构成条的高度（px）：宽容器一档、窄容器一档（窄档再高就把版面顶长了）。 */
export const STACKED_BAR_HEIGHT_PX = 46;
const NARROW_HEIGHT_PX = 38;

/** 窄容器阈值（px）：段内字退一档、条矮一档。**这是本件自己的宽度**（`@container` 判的）。 */
const NARROW_PX = 420;

/** 一档数据色：从 `accent` 往 `mixWith` 混 `weight`%。**全在样式段里算，源码里没有色值**。 */
function series(weight: number, mixWith: string): string {
  return 'color-mix(in srgb, ' + skinVar('accent') + ' ' + String(weight) + '%, ' + mixWith + ')';
}

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function stackedBarCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const box = root + ' .' + p + 'block-stacked-bar';
  const s = (slot: StackedBarSlot): string => root + ' .' + stackedBarSlot(slot, p);
  /* 槽类名（**不带 scope**）：只用在**已经落进本件某条选择器内部**的位置（前缀由外层那条选择器给）。
     拿 `s()` 去拼后代／兄弟选择器会拼出 `.page-ui .a .page-ui .b` —— 第二条 `.page-ui` 永远匹配不到，
     规则「看着在、其实不生效」（2026-09 样张页上抓到过一次：段内字让位与深端字色都没生效）。 */
  const c = (slot: StackedBarSlot): string => '.' + stackedBarSlot(slot, p);

  return [
    '/* stacked-bar（构成条 · 形态 A「100% 堆叠 ＋ 图例」）：一整块按占比切成几段，图例必带数值。',
    '   六档数据色从强调色算出来（往主文字混＝深端、往卡面混＝浅端）：换皮只换取值，色序不写死。 */',
    box + ' {',
    /* 宽度判据的落点：本件是**自己的容器**——嵌进侧栏／面板／卡片时照样按自己的宽度折行。 */
    '  container-type: inline-size;',
    /* 宿主页不保证是 `border-box`：本件有「`width:100%` ＋ 1px 边框」那一根条，
       在默认的 content-box 下它会比容器宽出两像素 ⇒ 390 档实测 392 > 390（皮肤矩阵判据抓到的）。
       所以本件在**自己的子树里**把 `box-sizing` 钉成 `border-box`（只碰本件的元素，不改宿主页）。 */
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
    /* 六档数据色：`is-k1` 最深 → `is-k6` 最浅。强调色本身是**非文本**档，正合用在这里。 */
    s('seg') + '.is-k1, ' + s('swatch') + '.is-k1 {',
    '  background: ' + series(82, skinVar('ink')) + ';',
    '}',
    s('seg') + '.is-k2, ' + s('swatch') + '.is-k2 {',
    '  background: ' + series(55, skinVar('surface')) + ';',
    '}',
    s('seg') + '.is-k3, ' + s('swatch') + '.is-k3 {',
    '  background: ' + series(36, skinVar('surface')) + ';',
    '}',
    s('seg') + '.is-k4, ' + s('swatch') + '.is-k4 {',
    '  background: ' + series(22, skinVar('surface')) + ';',
    '}',
    s('seg') + '.is-k5, ' + s('swatch') + '.is-k5 {',
    '  background: ' + series(12, skinVar('surface')) + ';',
    '}',
    '/* 第六档不是"更浅的强调色"而是"主文字 10% 的底"：尾巴那一段（其他）与强调色序分得开。 */',
    s('seg') + '.is-k6, ' + s('swatch') + '.is-k6 {',
    '  background: color-mix(in srgb, ' + skinVar('ink') + ' 10%, ' + skinVar('surface') + ');',
    '}',
    /* 那一根条：段宽由行内 `flex` 给（千分比整数，之和恰好 1000）⇒ 永远填满整宽。 */
    s('bar') + ' {',
    '  display: flex;',
    '  width: 100%;',
    '  height: ' + String(STACKED_BAR_HEIGHT_PX) + 'px;',
    '  min-width: 0;',
    '  overflow: hidden;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('surface') + ';',
    '}',
    s('seg') + ' {',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  min-width: 0;',
    '  overflow: hidden;',
    '}',
    '/* 段与段之间那道缝：用卡面色画，等于"把条切开"（不写边框，免得相邻两段各画一条）。 */',
    s('seg') + ' + ' + c('seg') + ' {',
    '  border-left: 1px solid ' + skinVar('surface') + ';',
    '}',
    '/* 段内读数：**深端两档用强调底上的字色，浅端四档用主文字色**——两档都过对比地板。 */',
    s('seg-text') + ' {',
    '  padding: 0 6px;',
    '  color: ' + skinVar('ink') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  white-space: nowrap;',
    '}',
    s('seg') + '.is-k1 ' + c('seg-text') + ', ' + s('seg') + '.is-k2 ' + c('seg-text') + ' {',
    '  color: ' + skinVar('accent-ink') + ';',
    '}',
    '/* 图例：色块 ｜ 名字 ｜ 百分数 ｜ 数量。名字列可换行，**两列数字右对齐、永不换行**。 */',
    s('legend') + ' {',
    '  list-style: none;',
    '  display: grid;',
    '  grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr));',
    '  gap: 0 20px;',
    '  margin: 0;',
    '  padding: 0;',
    '  min-width: 0;',
    '}',
    s('legend-item') + ' {',
    '  display: grid;',
    '  grid-template-columns: 12px minmax(0, 1fr) 3.4em minmax(4.6em, auto);',
    '  gap: 8px;',
    '  align-items: baseline;',
    '  min-width: 0;',
    '  padding: 7px 0;',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '}',
    s('swatch') + ' {',
    '  display: block;',
    '  width: 12px;',
    '  height: 12px;',
    '  align-self: center;',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '}',
    s('name') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  overflow-wrap: anywhere;',
    '}',
    s('pct') + ' {',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  text-align: right;',
    '  white-space: nowrap;',
    '}',
    s('amount') + ' {',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  text-align: right;',
    '  white-space: nowrap;',
    '}',
    s('note') + ' {',
    '  margin: 0;',
    '  padding-top: 10px;',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  line-height: 1.6;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 本件自身不带可点元素。这一条是**地板**：调用方把图例包成筛选入口时，焦点必须看得见。 */',
    box + ' :focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 2px;',
    '}',
    '/* 窄容器（<' + String(NARROW_PX) + 'px）：条矮一档；「只写百分数」那批段的段内字**让位图例**',
    '   ——14% 的段在更窄的容器里塞不下那两个字，硬塞就是压字或 `…`；数字在图例里一个字不少。 */',
    '@container (max-width: ' + String(NARROW_PX) + 'px) {',
    '  ' + s('bar') + ' {',
    '    height: ' + String(NARROW_HEIGHT_PX) + 'px;',
    '  }',
    '  ' + s('seg') + '.is-value ' + c('seg-text') + ' {',
    '    display: none;',
    '  }',
    '  ' + s('legend') + ' {',
    '    grid-template-columns: minmax(0, 1fr);',
    '  }',
    '}',
  ].join(LF);
}
