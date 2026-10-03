/** missing-badge · **样式段**（本件唯一的样式来源）。
 *
 *  缺项徽章＝发丝线小牌 ＋ 缺项名（粗）＋ 状态字（色字 ＋ 描边）：
 *  状态除色之外还有“字”这一样（`缺`／`待补`必出）。
 *
 *  纪律：只经 `skinVar()` 读皮肤；scope 在 `.<prefix>page-ui` 之下；
 *  零 `:root`／零 `!important`；行内小牌，不设宽度分档。
 */
import { skinVar } from '../skin/contract.js';
import { missingBadgeSlot, type MissingBadgeSlot } from './render.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function missingBadgeCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const box = root + ' .' + p + 'block-missing-badge';
  const s = (slot: MissingBadgeSlot): string => root + ' .' + missingBadgeSlot(slot, p);

  return [
    box + ' {',
    '  display: inline-flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 2px 8px;',
    '  min-width: 0;',
    '  max-width: 100%;',
    '  box-sizing: border-box;',
    '  padding: 4px 10px;',
    '  border: 1px solid ' + skinVar('danger') + ';',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '  background: ' + skinVar('danger-soft') + ';',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  line-height: 1.6;',
    '  overflow-wrap: anywhere;',
    '}',
    s('label') + ' {',
    '  color: ' + skinVar('ink') + ';',
    '  font-weight: 700;',
    '}',
    s('state') + ' {',
    '  color: ' + skinVar('danger') + ';',
    '  font-style: normal;',
    '  font-weight: 700;',
    '}',
    box + '.is-pending {',
    '  border-color: ' + skinVar('warn') + ';',
    '  background: ' + skinVar('warn-soft') + ';',
    '}',
    box + '.is-pending ' + '.' + missingBadgeSlot('state', p) + ' {',
    '  color: ' + skinVar('warn') + ';',
    '}',
    s('reason') + ' {',
    '  flex-basis: 100%;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  overflow-wrap: anywhere;',
    '}',
  ].join(LF);
}
