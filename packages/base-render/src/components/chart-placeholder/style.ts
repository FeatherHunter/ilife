/** chart-placeholder · **样式段**（本件唯一的样式来源）。
 *
 *  占位＝虚线框 ＋ 弱文字三行（等真图，不抢戏）：框描边虚线、底透明；
 *  “需真图”那一句走弱文字 ＋ 前导符号由标记写出。
 *
 *  纪律：只经 `skinVar()` 读皮肤；scope 在 `.<prefix>page-ui` 之下；
 *  零 `:root`／零 `!important`；不设宽度分档（纵排，窄容器天然成立）。
 */
import { skinVar } from '../skin/contract.js';
import { chartPlaceholderSlot, type ChartPlaceholderSlot } from './render.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function chartPlaceholderCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const box = root + ' .' + p + 'block-chart-placeholder';
  const s = (slot: ChartPlaceholderSlot): string => root + ' .' + chartPlaceholderSlot(slot, p);

  return [
    box + ' {',
    '  display: grid;',
    '  gap: 8px;',
    '  min-width: 0;',
    '  box-sizing: border-box;',
    '  padding: 12px;',
    '  border: 1px dashed ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: transparent;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  line-height: 1.7;',
    '}',
    s('title') + ' {',
    '  margin: 0;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-weight: 700;',
    '  letter-spacing: .12em;',
    '  overflow-wrap: anywhere;',
    '}',
    s('lines') + ' {',
    '  display: grid;',
    '  gap: 2px;',
    '  margin: 0;',
    '  min-width: 0;',
    '  padding: 0;',
    '  list-style: none;',
    '}',
    s('line') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  overflow-wrap: anywhere;',
    '}',
    s('need') + ' {',
    '  margin: 0;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  overflow-wrap: anywhere;',
    '}',
  ].join(LF);
}
