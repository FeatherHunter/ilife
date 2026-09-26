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
    '/* quick-capture 抽屉族（`style-drawer.ts` · 形态 `drawer`）：常驻一行 ＋ 推开的几格。 */',
    s('drawer') + ' {',
    '  display: block;',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '  background: ' + skinVar('surface-2') + ';',
    '  min-width: 0;',
    '}',
    '/* **收起必须真的收起**：作者层的 `display: block` 会盖掉浏览器默认那条 `[hidden] { display: none }`',
    '   （作者规则赢过 UA 规则）——不补这一条，抽屉常驻摊在屏上，「点开才推开」就不成立',
    '   （同一处口径见 `style-choices.ts` 的候选带：2026-09-25 由变异自证读出过一次）。 */',
    s('drawer') + '[hidden] {',
    '  display: none;',
    '}',
    '/* 抽屉标题（「分开填 · 6 格」）：说的是这一屉是什么、里面几格，不是又一遍读数。 */',
    s('hd') + ' {',
    '  padding: 10px 14px 0;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 那几格的网格：两列（宽档）；一格一项，每一项自己管自己那条候选带。 */',
    s('grid') + ' {',
    '  display: grid;',
    '  grid-template-columns: repeat(2, minmax(0, 1fr));',
    '  gap: ' + gap + ';',
    '  padding: 10px 14px 14px;',
    '  min-width: 0;',
    '}',
    '/* 一项＝一格 ＋ 它自己的候选带（**带子留在这一项里**，不横跨整行：哪一格的候选就贴着哪一格）。 */',
    s('unit') + ' {',
    '  display: flex;',
    '  flex-direction: column;',
    '  align-items: stretch;',
    '  gap: ' + gap + ';',
    '  min-width: 0;',
    '}',
    '/* 抽屉里那一格：**整格仍是那颗按钮**（命中盒 ≥44，读数长了换行），只是占满网格的一项。 */',
    s('unit') + ' ' + sc('chip') + ' {',
    '  width: 100%;',
    '  min-height: ' + touch + ';',
    '  justify-content: flex-start;',
    '}',
    '/* 抽屉里那条候选带：一列往下排（窄项里横着排会挤成一道缝），每一枚仍是 ≥44 的整枚。 */',
    s('unit') + ' ' + sc('tray') + ' {',
    '  flex-direction: column;',
    '  align-items: stretch;',
    '}',
    s('unit') + ' ' + sc('pick') + ', ' + s('unit') + ' ' + sc('keep') + ' {',
    '  justify-content: flex-start;',
    '}',
    '/* 窄容器（本件自己窄于常量那一个宽度）：那几格改一列往下排（两列在一格里放不下读数时，宁可往下排）。 */',
    '@container ' + QUICK_CAPTURE_CONTAINER + ' (max-width: ' + String(QUICK_CAPTURE_DRAWER_NARROW_PX) + 'px) {',
    '  ' + s('grid') + ' {',
    '    grid-template-columns: minmax(0, 1fr);',
    '  }',
    '}',
  ].join(LF);
}
