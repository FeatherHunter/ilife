/** bulk-bar · **样式段**（操作条与状态矩阵那一半；条目列住 `style-column.ts`、确认面住 `style-confirm.ts`，
 *  两个都由这里的 `bulkBarCss()` 汇总——搬走的是行数，不是取值）。
 *
 *  纪律（与本层其余件同一份）：
 *   · 只经 `skinVar()` 读皮肤 —— 组件里**不写** `var(--ilife-…)`（兜底链只许住在 `skin/contract.ts`）；
 *   · 全部规则 scope 在 `.<prefix>page-ui` 之下（不开本配方页零命中）；不写 `:root`／`!important`、不新增 token 名；
 *   · **宽度只许容器判**：本件自己 `container-type: inline-size`（在 `style-column.ts` 里声明），
 *     窄档走 `@container`；媒体查询只判设备能力（`hover:hover`／`pointer:fine`／`prefers-reduced-motion`），**不判宽度**。
 *
 *  几何契约（判据钉住）：
 *   · **操作条在流内 ＋ `position:sticky; bottom:0`**：条自己占一行 ⇒ 滚到宿主下沿时条顶不低于最后一行
 *     （条目与条不重叠）；长列表滚到中段时它仍粘在视口底部可达（不为看它去滚到底）。粘住时它盖在
 *     正滚过的几行上 ⇒ 它必须是**不透明的**：`surface` 实底 ＋ 一条 `border-top` ＋ 皮肤自己的 `shadow` 档
 *     （paper／broadsheet／ink 的 shadow 本就是 none ⇒ 那三套下不动，neutral 下才浮起来）。
 *   · **触控地板**：动作按钮与胶囊 ≥44×44、相邻触控目标间距 8px；**窄档不许挤出横向滚动**
 *     （长标签 `overflow-wrap:anywhere` 折行，不截断）。
 *   · **选中态照四档口径**：主动作按钮（有文字的选中面）走 `accent-soft` ＋ `accent-text` ＋ `accent` 描边；
 *     不可逆那一档走 `danger` 字 ＋ `danger` 描边。任何一处都不拿 `ink` 系当面。
 */
import { skinVar } from '../skin/contract.js';
import { BULK_BAR_BUSY_ATTR, bulkBarSlot, type BulkBarSlot } from './attrs.js';
import { bulkBarColumnCss } from './style-column.js';
import { bulkBarConfirmCss } from './style-confirm.js';
import { BULK_BAR_MIN_TARGET_PX, BULK_BAR_NARROW_PX } from './style-sizes.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/* 尺寸事实只住 `style-sizes.ts` 一处；从本件的名字面（`index.ts`）转发出去，取值不改。 */
export { BULK_BAR_BOX_PX, BULK_BAR_MIN_TARGET_PX, BULK_BAR_NARROW_PX, BULK_BAR_ROW_MIN_HEIGHT_PX } from './style-sizes.js';

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function bulkBarCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const box = root + ' .' + p + 'block-bulk-bar';
  /** **槽类名**（不带 scope）：写「某槽下的子件」时只许用它——把带 scope 的完整选择器再拼一次，
   *  会拼出 `.…-row .ilife-page-ui .…-name` 这种**永远不命中**的死规则（语法合法、编译不报错）。 */
  const c = (slot: BulkBarSlot): string => '.' + bulkBarSlot(slot, p);
  /** **带 scope 的完整选择器**（一条规则打头用）：`.<page-ui> .<件>-<槽>`。
   *  坑（**本件真踩过**）：`s()` 里漏掉那个点，拼出来的是 `.ilife-page-ui ilife-block-bulk-bar-count`——
   *  那是「找一个名叫 `ilife-block-bulk-bar-count` 的**元素**」，永远命中不了；语法合法、编译不报错、
   *  屏幕上「看着也还行」，只有真机上量几何才会发现整段样式没生效（判据已加一条「选择器必须带点」钉住）。 */
  const s = (slot: BulkBarSlot): string => root + ' ' + c(slot);

  return [
    /* 条目列（宿主／列表／行／勾选框／读数／空态）住 `style-column.ts`。 */
    bulkBarColumnCss(input),
    '/* ── 那条浮出来的操作条 ─────────────────────────────────────────── */',
    s('bar') + ' {',
    /* 在流内（自己占一行）＋ 粘在视口底部。 */
    '  position: sticky;',
    '  bottom: 0;',
    '  z-index: 2;',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: center;',
    '  gap: 8px 10px;',
    '  min-width: 0;',
    '  margin-top: 10px;',
    '  padding: 10px 12px;',
    '  /* **不透明**：粘住时它盖在条目上，用实底 ＋ 一条上边线 ＋ 皮肤自己的投影档，',
    '     不用半透明（那会把底下的读数糊成一层灰）。 */',
    '  background: ' + skinVar('surface') + ';',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-top-color: ' + skinVar('accent') + ';',
    '  border-radius: ' + skinVar('radius') + ';',
    /* 皮肤自己的投影档：paper／broadsheet／ink 是 `none` ⇒ 那三套下不动，neutral 下才浮起来。 */
    '  box-shadow: ' + skinVar('shadow') + ';',
    '}',
    '/* `hidden` 必须显式重写：`display:flex` 的优先级高于 UA 那条 `[hidden]{display:none}`',
    '   ⇒ 不写这一条，「选中 0 条整条移出可点范围」当场失效（条还在、还能点）。 */',
    s('bar') + '[hidden] {',
    '  display: none;',
    '}',
    s('count') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 4px 6px;',
    '  margin: 0;',
    '  min-width: 0;',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 700;',
    '}',
    s('num') + ' {',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-h3') + ';',
    '  font-variant-numeric: tabular-nums;',
    '  line-height: 1;',
    '}',
    s('tail') + ' {',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-variant-numeric: tabular-nums;',
    '  font-weight: 600;',
    '  overflow-wrap: anywhere;',
    '}',
    s('acts') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: center;',
    '  gap: 8px;',
    '  margin-left: auto;',
    '  min-width: 0;',
    '}',
    '/* 一枚动作按钮：命中盒 ≥44×44，窄档长字**折行不截断**（`max-width:100%` 兜住）。',
    '   两枚字（正常态／忙碌态）叠在同一个格子里 ⇒ 换成忙碌态时宽度不跳版。 */',
    s('act') + ' {',
    '  display: inline-grid;',
    '  place-items: center;',
    '  min-width: ' + String(BULK_BAR_MIN_TARGET_PX) + 'px;',
    '  min-height: ' + String(BULK_BAR_MIN_TARGET_PX) + 'px;',
    '  max-width: 100%;',
    '  padding: 6px 14px;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '  background: ' + skinVar('surface') + ';',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  cursor: pointer;',
    '  transition: transform 80ms linear;',
    '}',
    s('act') + ' > ' + c('label') + ',',
    s('act') + ' > ' + c('busy') + ' {',
    '  grid-area: 1 / 1;',
    '  overflow-wrap: anywhere;',
    '}',
    s('busy') + ' {',
    '  visibility: hidden;',
    '}',
    s('act') + '[' + BULK_BAR_BUSY_ATTR + '="1"] > ' + c('label') + ' {',
    '  visibility: hidden;',
    '}',
    s('act') + '[' + BULK_BAR_BUSY_ATTR + '="1"] > ' + c('busy') + ' {',
    '  visibility: visible;',
    '}',
    '/* `primary`＝有文字的选中面那一档：**软底 ＋ 强调字 ＋ 强调描边**（不是强调实底：',
    '   正文级字压在 `accent` 实底上，neutral 那套只有 4.02，过不了 4.5 的文本地板）。 */',
    s('act') + '.is-primary {',
    '  background: ' + skinVar('accent-soft') + ';',
    '  border-color: ' + skinVar('accent') + ';',
    '  color: ' + skinVar('accent-text') + ';',
    '  font-weight: 700;',
    '}',
    '/* `danger`＝不可逆那一档：危险色字 ＋ 危险色描边，**不出实底**（语义档不与强调档混）。 */',
    s('act') + '.is-danger {',
    '  border-color: color-mix(in srgb, ' + skinVar('danger') + ' 45%, ' + skinVar('line') + ');',
    '  color: ' + skinVar('danger') + ';',
    '}',
    s('act') + '[disabled] {',
    '  cursor: not-allowed;',
    '  background: ' + skinVar('surface-2') + ';',
    '  border-color: ' + skinVar('line') + ';',
    '  color: ' + skinVar('ink-3') + ';',
    '}',
    '/* `hover` 只许是增强、不许是唯一通路 ⇒ 包在设备能力查询里（触屏上没有 hover 这回事）。 */',
    '@media (hover:hover) and (pointer:fine) {',
    '  ' + s('act') + ':not([disabled]):hover {',
    '    border-color: ' + skinVar('accent') + ';',
    '    color: ' + skinVar('accent-text') + ';',
    '  }',
    '  ' + s('row') + ':not(.is-on):hover {',
    '    background: ' + skinVar('surface-2') + ';',
    '  }',
    '}',
    '/* 真按下：80ms 的一次缩放（只碰 `transform`，不碰布局）。 */',
    s('act') + ':not([disabled]):active {',
    '  transform: scale(.98);',
    '}',
    '/* 可见焦点：本件不带键盘通路，`focus-visible` 只留给真实键盘用户（无障碍地板，别删）。 */',
    box + ' :focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 2px;',
    '}',
    s('hint') + ' {',
    '  flex: 1 1 100%;',
    '  margin: 0;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  line-height: 1.55;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 错态那句字写在按钮旁边（按钮的 `aria-describedby` 指它）——不只染色。 */',
    s('error') + ' {',
    '  flex: 1 1 100%;',
    '  margin: 0;',
    '  min-width: 0;',
    '  color: ' + skinVar('danger') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 窄容器（<' + String(BULK_BAR_NARROW_PX) + 'px）：动作排铺满整行、每枚等分（手指好按），',
    '   条的内距与圆角收一档。判的是**本件自己的宽度**：本件会被嵌进侧栏／面板／卡片，视口宽 ≠ 组件宽。 */',
    '@container (max-width: ' + String(BULK_BAR_NARROW_PX) + 'px) {',
    '  ' + s('acts') + ' {',
    '    width: 100%;',
    '    margin-left: 0;',
    '  }',
    '  ' + s('acts') + ' > ' + c('act') + ' {',
    '    flex: 1 1 auto;',
    '  }',
    '  ' + s('bar') + ' {',
    '    padding: 10px;',
    '    border-radius: ' + skinVar('radius-sm') + ';',
    '  }',
    '}',
    '/* 减少动态：把过渡直接关掉（**不为动效设状态**，所以不会卡在半路）。 */',
    '@media (prefers-reduced-motion: reduce) {',
    '  ' + s('act') + ' {',
    '    transition: none;',
    '  }',
    '}',
    bulkBarConfirmCss(input),
  ].join(LF);
}
