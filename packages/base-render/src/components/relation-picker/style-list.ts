/** relation-picker · **列表段样式**（行容器、一行选项、选中态、命中词；由 `style.ts` 汇总）。
 *
 *  拆分只为行数（本包告警线 350；与 `scatter-fit/style-forms.ts` 同一处手法）：
 *  同一份纪律、同一个前缀，搬走的是行数，不是取值；`relationPickerCss()` 的产物逐字节不变。
 */
import { skinVar } from '../skin/contract.js';
import {
  RELATION_PICKER_GAP_PX,
  RELATION_PICKER_ROW_MIN_PX,
  relationPickerSlot,
  type RelationPickerSlot,
} from './attrs.js';
import { m } from '../../entries/index.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 列表段：行容器、一行选项、选中态、命中词。由 `style.ts` 按前缀汇总。 */
export function relationPickerListCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  /** 带 scope 的完整选择器（一条规则打头用）。 */
  const s = (slot: RelationPickerSlot): string => root + ' ' + sc(slot);
  /** **槽类名**（不带 scope）：只许用它写子件，不许把带 scope 的选择器再拼一次。 */
  function sc(slot: RelationPickerSlot): string {
    return '.' + relationPickerSlot(slot, p);
  }
  /** 行这一格的子件（`.…-row > .…-name` 这种）。**结构层级必须与 `render.ts` 的标记逐层对齐**。 */
  const rowChild = (slot: RelationPickerSlot): string => s('row') + ' > ' + sc(slot);
  /** 文字格里的子件（名字／副语住在 `-tx` 这一格里）。 */
  const txChild = (slot: RelationPickerSlot): string => s('tx') + ' > ' + sc(slot);

  return [
    m('base-render.components-relation-picker-style-list.c001'),
    m('base-render.components-relation-picker-style-list.c002'),
    s('rows') + ' {',
    '  display: grid;',
    '  gap: ' + String(RELATION_PICKER_GAP_PX) + 'px;',
    '  padding: 0 14px 10px;',
    '  min-width: 0;',
    '}',
    m('base-render.components-relation-picker-style-list.c003'),
    m('base-render.components-relation-picker-style-list.c004'),
    s('row') + ' {',
    '  display: grid;',
    '  grid-template-columns: auto minmax(0, 1fr) auto auto;',
    '  gap: 10px;',
    '  align-items: center;',
    '  min-height: ' + String(RELATION_PICKER_ROW_MIN_PX) + 'px;',
    '  padding: 7px 14px;',
    '  border: 1px solid transparent;',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: none;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-body') + ';',
    '  text-align: left;',
    '  cursor: pointer;',
    '}',
    s('row') + '[hidden] { display: none; }',
    m('base-render.components-relation-picker-style-list.c005'),
    s('row') + ':not(:has(' + sc('reading') + ')) { grid-template-columns: auto minmax(0, 1fr) auto; }',
    rowChild('mk') + ' {',
    '  display: grid;',
    '  place-items: center;',
    '  width: 22px;',
    '  height: 22px;',
    '  flex: none;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('surface-2') + ';',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: 11px;',
    '  font-weight: 700;',
    '  line-height: 1;',
    '}',
    rowChild('tx') + ' { min-width: 0; overflow-wrap: anywhere; }',
    txChild('name') + ' {',
    '  display: block;',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 600;',
    '  overflow-wrap: anywhere;',
    '}',
    txChild('note') + ' {',
    '  display: block;',
    '  font-style: normal;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  line-height: 1.45;',
    '  overflow-wrap: anywhere;',
    '}',
    rowChild('reading') + ' {',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  line-height: 1;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '  max-width: 12em;',
    '}',
    m('base-render.components-relation-picker-style-list.c006'),
    rowChild('pick') + ' {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  min-height: 32px;',
    '  padding: 0 9px;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('surface') + ';',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  line-height: 1;',
    '  overflow-wrap: anywhere;',
    '}',
    m('base-render.components-relation-picker-style-list.c007'),
    m('base-render.components-relation-picker-style-list.c008'),
    s('row') + '.is-on {',
    '  background: ' + skinVar('surface-2') + ';',
    '  border-color: ' + skinVar('accent') + ';',
    '  box-shadow: inset 2px 0 0 ' + skinVar('accent') + ';',
    '}',
    s('row') + '.is-on > ' + sc('mk') + ' {',
    '  background: ' + skinVar('accent') + ';',
    '  border-color: ' + skinVar('accent') + ';',
    '  color: ' + skinVar('accent-ink') + ';',
    '}',
    s('row') + '.is-on > ' + sc('pick') + ' {',
    '  background: ' + skinVar('accent-soft') + ';',
    '  border-color: ' + skinVar('accent') + ';',
    '  color: ' + skinVar('accent-text') + ';',
    '}',
    s('row') + ':active {',
    '  background: ' + skinVar('surface-2') + ';',
    '  box-shadow: inset 2px 0 0 ' + skinVar('accent') + ';',
    '}',
    m('base-render.components-relation-picker-style-list.c009'),
    s('hit') + ' {',
    '  background: color-mix(in srgb, ' + skinVar('accent') + ' 24%, transparent);',
    '  border-bottom: 2px solid ' + skinVar('accent') + ';',
    '  color: inherit;',
    '  font-weight: 700;',
    '}',
    m('base-render.components-relation-picker-style-list.c010'),
    s('row') + ':focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 2px;',
    '}',
  ].join(LF);
}
