/** lookup-index · **样式段**（本件唯一的样式来源）。
 *
 *  纪律（与组件层其余件同一份）：
 *   · 只经 `skinVar()` 读皮肤（锚点现行色走 `accent`，别名标黄底走 `warn-soft`）；
 *   · 全部规则 scope 在 `.<prefix>page-ui` 之下；零 `:root`／零 `!important`；
 *   · 不设宽度分档（纵排＋自动换行，窄容器天然成立，故无 `@container`）。
 */
import { skinVar } from '../skin/contract.js';
import { lookupIndexSlot, type LookupIndexSlot } from './render.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function lookupIndexCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const box = root + ' .' + p + 'block-lookup-index';
  const s = (slot: LookupIndexSlot): string => root + ' .' + lookupIndexSlot(slot, p);

  return [
    box + ' {',
    '  display: grid;',
    '  gap: 12px;',
    '  min-width: 0;',
    '  box-sizing: border-box;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  line-height: 1.7;',
    '}',
    s('nav') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  gap: 8px;',
    '  min-width: 0;',
    '}',
    s('anchor') + ' {',
    '  display: inline-block;',
    '  min-height: 44px;',
    '  box-sizing: border-box;',
    '  padding: 10px 14px;',
    '  border: 1px solid ' + skinVar('accent') + ';',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '  background: ' + skinVar('surface') + ';',
    '  color: ' + skinVar('accent-text') + ';',
    '  font-weight: 700;',
    '  text-decoration: none;',
    '}',
    s('anchor') + ':focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 2px;',
    '}',
    '@media (hover:hover) and (pointer:fine) {',
    '  ' + s('anchor') + ':hover { background: ' + skinVar('accent-soft') + '; }',
    '}',
    s('group') + ' {',
    '  display: grid;',
    '  gap: 4px;',
    '  min-width: 0;',
    '  margin: 0;',
    '  padding-top: 4px;',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '}',
    s('head') + ' {',
    '  margin: 0;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-size: ' + skinVar('fs-h3') + ';',
    '  font-weight: 700;',
    '  overflow-wrap: anywhere;',
    '}',
    s('row') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 2px 8px;',
    '  margin: 0;',
    '  min-width: 0;',
    '  overflow-wrap: anywhere;',
    '}',
    s('wake') + ' {',
    '  flex: none;',
    '  color: ' + skinVar('ink') + ';',
    '  font-weight: 700;',
    '}',
    s('goto') + ' {',
    '  flex: 1 1 auto;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 别名行：标黄底（形）＋ 前导“别名”由标记写出（字），色不是唯一信息。 */',
    box + ' ' + '.' + lookupIndexSlot('row', p) + '.is-alias {',
    '  background: ' + skinVar('warn-soft') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '}',
    s('note') + ' {',
    '  margin: 0;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  overflow-wrap: anywhere;',
    '}',
  ].join(LF);
}
