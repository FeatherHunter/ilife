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
import { m } from '../../entries/index.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 动作按钮的左右内距（px）。**忙碌那枚字也读它**：它靠这个数把自己撑到按钮的整幅宽度
 *  （负外扩 = 内距），于是「忙碌字比标签长」这件事只在按钮内部消化——两侧都不越出按钮，
 *  也就不会给动作排或页面添出横向溢出。两处必须同源，改一个就得改另一个。 */
const ACT_PAD_X_PX = 14;

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
    m('base-render.components-bulk-bar-style.c001'),
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
    m('base-render.components-bulk-bar-style.c002'),
    m('base-render.components-bulk-bar-style.c003'),
    m('base-render.components-bulk-bar-style.c004'),
    '  background: ' + skinVar('surface') + ';',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-top-color: ' + skinVar('accent') + ';',
    '  border-radius: ' + skinVar('radius') + ';',
    /* 皮肤自己的投影档：paper／broadsheet／ink 是 `none` ⇒ 那三套下不动，neutral 下才浮起来。 */
    '  box-shadow: ' + skinVar('shadow') + ';',
    '}',
    m('base-render.components-bulk-bar-style.c005'),
    m('base-render.components-bulk-bar-style.c006'),
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
    m('base-render.components-bulk-bar-style.c007'),
    m('base-render.components-bulk-bar-style.c008'),
    m('base-render.components-bulk-bar-style.c009'),
    m('base-render.components-bulk-bar-style.c010'),
    s('act') + ' {',
    '  position: relative;',
    '  display: inline-grid;',
    '  place-items: center;',
    '  min-width: ' + String(BULK_BAR_MIN_TARGET_PX) + 'px;',
    '  min-height: ' + String(BULK_BAR_MIN_TARGET_PX) + 'px;',
    '  max-width: 100%;',
    '  padding: 6px ' + String(ACT_PAD_X_PX) + 'px;',
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
    m('base-render.components-bulk-bar-style.c011'),
    m('base-render.components-bulk-bar-style.c012'),
    s('act') + ' > ' + c('label') + ' {',
    '  position: relative;',
    '  grid-area: 1 / 1;',
    '  overflow-wrap: anywhere;',
    '}',
    m('base-render.components-bulk-bar-style.c013'),
    m('base-render.components-bulk-bar-style.c014'),
    m('base-render.components-bulk-bar-style.c015'),
    m('base-render.components-bulk-bar-style.c016'),
    m('base-render.components-bulk-bar-style.c017'),
    s('busy') + ' {',
    '  position: absolute;',
    '  left: -' + String(ACT_PAD_X_PX) + 'px;',
    '  right: -' + String(ACT_PAD_X_PX) + 'px;',
    '  top: 50%;',
    '  transform: translateY(-50%);',
    '  display: grid;',
    '  place-items: center;',
    '  visibility: hidden;',
    '}',
    s('act') + '[' + BULK_BAR_BUSY_ATTR + '="1"] > ' + c('label') + ' {',
    '  visibility: hidden;',
    '}',
    s('act') + '[' + BULK_BAR_BUSY_ATTR + '="1"] ' + c('busy') + ' {',
    '  visibility: visible;',
    '}',
    m('base-render.components-bulk-bar-style.c018'),
    m('base-render.components-bulk-bar-style.c019'),
    s('act') + '.is-primary {',
    '  background: ' + skinVar('accent-soft') + ';',
    '  border-color: ' + skinVar('accent') + ';',
    '  color: ' + skinVar('accent-text') + ';',
    '  font-weight: 700;',
    '}',
    m('base-render.components-bulk-bar-style.c020'),
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
    m('base-render.components-bulk-bar-style.c021'),
    '@media (hover:hover) and (pointer:fine) {',
    '  ' + s('act') + ':not([disabled]):hover {',
    '    border-color: ' + skinVar('accent') + ';',
    '    color: ' + skinVar('accent-text') + ';',
    '  }',
    '  ' + s('row') + ':not(.is-on):hover {',
    '    background: ' + skinVar('surface-2') + ';',
    '  }',
    '}',
    m('base-render.components-bulk-bar-style.c022'),
    s('act') + ':not([disabled]):active {',
    '  transform: scale(.98);',
    '}',
    m('base-render.components-bulk-bar-style.c023'),
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
    m('base-render.components-bulk-bar-style.c024'),
    s('error') + ' {',
    '  flex: 1 1 100%;',
    '  margin: 0;',
    '  min-width: 0;',
    '  color: ' + skinVar('danger') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  overflow-wrap: anywhere;',
    '}',
    m('base-render.components-bulk-bar-style.c025', { p0: String(String(BULK_BAR_NARROW_PX)) }),
    m('base-render.components-bulk-bar-style.c026'),
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
    m('base-render.components-bulk-bar-style.c027'),
    '@media (prefers-reduced-motion: reduce) {',
    '  ' + s('act') + ' {',
    '    transition: none;',
    '  }',
    '}',
    bulkBarConfirmCss(input),
  ].join(LF);
}
