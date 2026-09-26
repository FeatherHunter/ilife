/** quick-capture · **样式段（解析预览那一格族）**：那一条带与一格里的一枚。
 *
 *  为什么单独立一份：`style.ts` 超了本包的行数告警线（350 行），按先例
 *  （`scatter-fit/style-forms.ts`、`relation-picker/style-list.ts`）把**改得最少的那一族**拆出去——
 *  「认出来的几格」这一族与「写的那一行」「候选／记过的」两族各改各的，住一起只是互相拖累。
 *  这一份**仍是本件样式段的一部分**：判据侧一律经 `test/_style-sources.mjs` 的 `styleSources()` 扫全。
 *
 *  只经 `skinVar()` 读皮肤、全部规则 scope 在 `.<prefix>page-ui` 之下、零 `:root`／`!important`／新 token、
 *  读数与格名**永不截断**（这一份里没有 `text-overflow`／`line-clamp`／`nowrap`）。
 */
import { skinVar } from '../skin/contract.js';
import {
  QUICK_CAPTURE_GAP_PX,
  QUICK_CAPTURE_PEN_PX,
  QUICK_CAPTURE_TOUCH_PX,
  quickCaptureSlot,
  type QuickCaptureSlot,
} from './attrs.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 解析预览那一格族的样式（由 `style.ts` 按前缀汇总）。 */
export function quickCaptureCellsCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  /** **槽类名**（带点、不带 scope）：只许用在**同一条选择器的后半截**（如 `.a .b` 里的 `.b`）。 */
  const sc = (slot: QuickCaptureSlot): string => '.' + quickCaptureSlot(slot, p);
  /** **带 scope 的完整选择器**（一条规则打头用；逗号列表里每一段都用它）。 */
  const s = (slot: QuickCaptureSlot): string => root + ' ' + sc(slot);
  const touch = String(QUICK_CAPTURE_TOUCH_PX) + 'px';

  return [
    '/* quick-capture 解析预览那一格族（`style-cells.ts`）：一条带 ＋ 一格里的一枚。 */',
    s('parse') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: center;',
    '  gap: ' + String(QUICK_CAPTURE_GAP_PX) + 'px;',
    '  padding: 12px 14px;',
    '  background: ' + skinVar('surface-2') + ';',
    '  min-width: 0;',
    '}',
    '/* 一格里的一枚：**整枚就是那颗按钮**（命中盒＝整枚）；读数长了换行，绝不截断。 */',
    s('chip') + ' {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  gap: 6px;',
    '  min-height: ' + touch + ';',
    '  padding: 0 8px 0 12px;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '  background: ' + skinVar('surface') + ';',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  cursor: pointer;',
    '  transition: transform 80ms ease;',
    '  overflow-wrap: anywhere;',
    '  text-align: left;',
    '}',
    '/* 左边那一截（「午饭」＝）：它是**别人写的那句话**，弱一档。 */',
    s('src') + ' {',
    '  color: ' + skinVar('ink-2') + ';',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 补出来的那一格的名字（日期＝）：与原文那一截同一个位置，但它是**这一格叫什么**，弱一档。 */',
    s('field') + ' {',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-weight: 600;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 认成的值：这一格真正的读数（等宽数字，永不截断）。 */',
    s('to') + ' {',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 格尾那枚「改」：**这枚记号就是「点它会改这一格」**（整枚按钮的可点性由它说出口）。 */',
    s('pen') + ' {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  min-height: ' + String(QUICK_CAPTURE_PEN_PX) + 'px;',
    '  padding: 0 10px;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '  background: ' + skinVar('surface-2') + ';',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '}',
    '/* **补出来的那一格**：无底 ＋ 虚线边（形自己说得出「这一格不是从这句话里认出来的」）。 */',
    s('chip') + '.is-added {',
    '  border-style: dashed;',
    '  background: none;',
    '}',
    /* 这一格是补出来的，格尾那枚记号也不带底：虚线边 ＋ 空底两处一起读得出「这一格是补的」。 */
    s('chip') + '.is-added ' + sc('pen') + ' {',
    '  background: none;',
    '}',
    '/* **正在改的那一格**（法条「有文字的选中面」那一档）：软底 ＋ 主色字 ＋ 主色描边。',
    '   描边走 `inset` 阴影而不是加粗边框：加粗会把整排挤动，`inset` 不动布局。 */',
    s('chip') + '.is-open {',
    '  background: ' + skinVar('accent-soft') + ';',
    '  border-color: ' + skinVar('accent') + ';',
    '  box-shadow: inset 0 0 0 1px ' + skinVar('accent') + ';',
    '}',
    s('chip') + '.is-open ' + sc('to') + ' {',
    '  color: ' + skinVar('accent-text') + ';',
    '}',
  ].join(LF);
}
