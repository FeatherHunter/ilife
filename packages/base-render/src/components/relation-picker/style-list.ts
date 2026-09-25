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
    '/* relation-picker 列表段（`style-list.ts`）：行容器、一行选项、选中态、命中词。 */',
    '/* 行与行之间那道缝：相邻触控目标的让手位（8px）。 */',
    s('rows') + ' {',
    '  display: grid;',
    '  gap: ' + String(RELATION_PICKER_GAP_PX) + 'px;',
    '  padding: 0 14px 10px;',
    '  min-width: 0;',
    '}',
    '/* 一行＝一颗按钮（整行都是命中区）；四条轨：记号 ＋ 名字（吃剩余宽）＋ 读数 ＋ 行尾那一枚。',
    '   名字与读数都**换行、不 `…` 截断**（超长换行，不断对比）。 */',
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
    '/* **没有读数的那一行**排三列：读数那条 `auto` 轨空着会让名字落到窄轨上 ⇒ 没读数就不留那条轨。 */',
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
    '/* 行尾那一枚：选中的写「已选」、其余写「选它」——状态除颜色外还有字。 */',
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
    '/* 选中态：**整行／整块选中**那一档（次要面底 ＋ 左侧 2px 主色侧标）＋ 实心 ✓（无文字的点＝主色实底）',
    '   ＋ 行尾那枚抬到强调软底（强调实底上不写正文级小字——对比地板）。行内主字仍主墨色。 */',
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
    '/* 命中词：底是主色的淡洗、形是下划线、字加粗——形与字重两样，不只靠颜色。 */',
    s('hit') + ' {',
    '  background: color-mix(in srgb, ' + skinVar('accent') + ' 24%, transparent);',
    '  border-bottom: 2px solid ' + skinVar('accent') + ';',
    '  color: inherit;',
    '  font-weight: 700;',
    '}',
    '/* 无障碍地板（列表段这一枚）：焦点是**增强**，不是通路。 */',
    s('row') + ':focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 2px;',
    '}',
  ].join(LF);
}
