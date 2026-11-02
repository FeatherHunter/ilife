/** quick-capture · **样式段（形态 `drawer` 的抽屉那一族）**：推开的抽屉、它的标题、那几格的网格。
 *
 *  为什么单独立一份：`style.ts` 已接近本包的行数告警线（350 行），按先例
 *  （`style-cells.ts`／`style-choices.ts`）把**只管第二档骨架**的那一族拆出去——形态 `oneline`
 *  一个字都不碰（那一档的规则全在 `style.ts`／`style-cells.ts`／`style-choices.ts` 里原样住着）。
 *  这一份**仍是本件样式段的一部分**：判据侧一律经 `test/_style-sources.mjs` 的 `styleSources()` 扫全。
 *
 *  纪律（与本节其余件同一份）：
 *   · 只经 `skinVar()` 读皮肤、全部规则 scope 在 `.<prefix>page-ui` 之下、零 `:root`／`!important`／新 token；
 *   · **宽度只许容器判**：两列 → 本件自己窄于 `QUICK_CAPTURE_DRAWER_NARROW_PX` 时走一列（`@container`）；
 *   · 每一格的读数**永不截断**（这一份里没有 `text-overflow`／`line-clamp`／`nowrap`）。
 */
import { skinVar } from '../skin/contract.js';
import {
  QUICK_CAPTURE_CONTAINER,
  QUICK_CAPTURE_DRAWER_NARROW_PX,
  QUICK_CAPTURE_GAP_PX,
  QUICK_CAPTURE_TOUCH_PX,
  quickCaptureSlot,
  type QuickCaptureSlot,
} from './attrs.js';
import { m } from '../../entries/index.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 形态 `drawer` 的抽屉那一族（由 `style.ts` 按前缀汇总）。 */
export function quickCaptureDrawerCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  /** **槽类名**（带点、不带 scope）：只许用在**同一条选择器的后半截**（如 `.a .b` 里的 `.b`）。 */
  const sc = (slot: QuickCaptureSlot): string => '.' + quickCaptureSlot(slot, p);
  /** **带 scope 的完整选择器**（一条规则打头用；逗号列表里每一段都用它）。 */
  const s = (slot: QuickCaptureSlot): string => root + ' ' + sc(slot);
  const touch = String(QUICK_CAPTURE_TOUCH_PX) + 'px';
  const gap = String(QUICK_CAPTURE_GAP_PX) + 'px';

  return [
    m('base-render.components-quick-capture-style-drawer.c001'),
    s('drawer') + ' {',
    '  display: block;',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '  background: ' + skinVar('surface-2') + ';',
    '  min-width: 0;',
    '}',
    m('base-render.components-quick-capture-style-drawer.c002'),
    m('base-render.components-quick-capture-style-drawer.c003'),
    m('base-render.components-quick-capture-style-drawer.c004'),
    s('drawer') + '[hidden] {',
    '  display: none;',
    '}',
    m('base-render.components-quick-capture-style-drawer.c005'),
    s('hd') + ' {',
    '  padding: 10px 14px 0;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  overflow-wrap: anywhere;',
    '}',
    m('base-render.components-quick-capture-style-drawer.c006'),
    s('grid') + ' {',
    '  display: grid;',
    '  grid-template-columns: repeat(2, minmax(0, 1fr));',
    '  gap: ' + gap + ';',
    '  padding: 10px 14px 14px;',
    '  min-width: 0;',
    '}',
    m('base-render.components-quick-capture-style-drawer.c007'),
    s('unit') + ' {',
    '  display: flex;',
    '  flex-direction: column;',
    '  align-items: stretch;',
    '  gap: ' + gap + ';',
    '  min-width: 0;',
    '}',
    m('base-render.components-quick-capture-style-drawer.c008'),
    s('unit') + ' ' + sc('chip') + ' {',
    '  width: 100%;',
    '  min-height: ' + touch + ';',
    '  justify-content: flex-start;',
    '}',
    m('base-render.components-quick-capture-style-drawer.c009'),
    s('unit') + ' ' + sc('tray') + ' {',
    '  flex-direction: column;',
    '  align-items: stretch;',
    '}',
    s('unit') + ' ' + sc('pick') + ', ' + s('unit') + ' ' + sc('keep') + ' {',
    '  justify-content: flex-start;',
    '}',
    m('base-render.components-quick-capture-style-drawer.c010'),
    '@container ' + QUICK_CAPTURE_CONTAINER + ' (max-width: ' + String(QUICK_CAPTURE_DRAWER_NARROW_PX) + 'px) {',
    '  ' + s('grid') + ' {',
    '    grid-template-columns: minmax(0, 1fr);',
    '  }',
    '}',
  ].join(LF);
}
