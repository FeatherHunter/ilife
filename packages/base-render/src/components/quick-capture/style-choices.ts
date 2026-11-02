/** quick-capture · **样式段（候选带 ＋ 记过的那一条带）**：一格摊开后的候选、「不改」、记过的每一条。
 *
 *  为什么单独立一份：`style.ts` 超了本包的行数告警线（350 行），按先例
 *  （`scatter-fit/style-forms.ts`、`relation-picker/style-list.ts`）把这一族拆出去——
 *  「能改成什么」与「记过的」两处都由调用方给数据、跟「写的那一行」「认出来的几格」各改各的。
 *  这一份**仍是本件样式段的一部分**：判据侧一律经 `test/_style-sources.mjs` 的 `styleSources()` 扫全。
 *
 *  只经 `skinVar()` 读皮肤、全部规则 scope 在 `.<prefix>page-ui` 之下、零 `:root`／`!important`／新 token、
 *  候选名**永不截断**（这一份里没有 `text-overflow`／`line-clamp`／`nowrap`）。
 */
import { skinVar } from '../skin/contract.js';
import {
  QUICK_CAPTURE_GAP_PX,
  QUICK_CAPTURE_TICK,
  QUICK_CAPTURE_TICK_PX,
  QUICK_CAPTURE_TOUCH_PX,
  quickCaptureSlot,
  type QuickCaptureSlot,
} from './attrs.js';
import { m } from '../../entries/index.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 候选带与「记过的」那一族的样式（由 `style.ts` 按前缀汇总）。 */
export function quickCaptureChoicesCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  /** **槽类名**（带点、不带 scope）：只许用在**同一条选择器的后半截**（如 `.a .b` 里的 `.b`）。 */
  const sc = (slot: QuickCaptureSlot): string => '.' + quickCaptureSlot(slot, p);
  /** **带 scope 的完整选择器**（一条规则打头用；逗号列表里每一段都用它）。 */
  const s = (slot: QuickCaptureSlot): string => root + ' ' + sc(slot);
  const touch = String(QUICK_CAPTURE_TOUCH_PX) + 'px';

  return [
    m('base-render.components-quick-capture-style-choices.c001'),
    m('base-render.components-quick-capture-style-choices.c002'),
    m('base-render.components-quick-capture-style-choices.c003'),
    s('tray') + ' {',
    '  flex: 1 1 100%;',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: center;',
    '  gap: ' + String(QUICK_CAPTURE_GAP_PX) + 'px;',
    '  min-width: 0;',
    '}',
    m('base-render.components-quick-capture-style-choices.c004'),
    m('base-render.components-quick-capture-style-choices.c005'),
    m('base-render.components-quick-capture-style-choices.c006'),
    s('tray') + '[hidden] {',
    '  display: none;',
    '}',
    m('base-render.components-quick-capture-style-choices.c007'),
    s('pick') + ' {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  gap: 4px;',
    '  min-height: ' + touch + ';',
    '  padding: 0 12px;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('surface') + ';',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  cursor: pointer;',
    '  transition: transform 80ms ease;',
    '  overflow-wrap: anywhere;',
    '}',
    m('base-render.components-quick-capture-style-choices.c008'),
    s('pick') + '::before {',
    '  content: "";',
    '  display: inline-block;',
    '  width: ' + String(QUICK_CAPTURE_TICK_PX) + 'px;',
    '  flex: 0 0 auto;',
    '  text-align: center;',
    '  color: ' + skinVar('accent') + ';',
    '}',
    s('pick') + '.is-on {',
    '  background: ' + skinVar('accent-soft') + ';',
    '  border-color: ' + skinVar('accent') + ';',
    '  color: ' + skinVar('accent-text') + ';',
    '  font-weight: 700;',
    '}',
    s('pick') + '.is-on::before {',
    '  content: "' + QUICK_CAPTURE_TICK + '";',
    '  font-weight: 700;',
    '}',
    m('base-render.components-quick-capture-style-choices.c009'),
    s('keep') + ' {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  min-height: ' + touch + ';',
    '  padding: 0 12px;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: none;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  cursor: pointer;',
    '  transition: transform 80ms ease;',
    '}',
    m('base-render.components-quick-capture-style-choices.c010'),
    s('recent') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: center;',
    '  gap: ' + String(QUICK_CAPTURE_GAP_PX) + 'px;',
    '  padding: 10px 14px;',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '  background: ' + skinVar('surface') + ';',
    '  min-width: 0;',
    '}',
    s('lb') + ' {',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '}',
    m('base-render.components-quick-capture-style-choices.c011'),
    s('recall') + ' {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  min-height: ' + touch + ';',
    '  padding: 0 12px;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '  background: ' + skinVar('surface') + ';',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  cursor: pointer;',
    '  transition: transform 80ms ease;',
    '  overflow-wrap: anywhere;',
    '}',
  ].join(LF);
}
