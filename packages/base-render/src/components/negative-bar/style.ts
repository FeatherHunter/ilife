/** negative-bar · **样式段**（本件唯一的样式来源）。
 *
 *  M5 落定形态＝**虚线空框**：框是 `1px dashed` 描边、底透明（无填充条、无实底）；
 *  数值原文照常印（字）；注走弱文字。语气只改描边与数字色，框的虚线形状不变。
 *
 *  纪律：只经 `skinVar()` 读皮肤；scope 在 `.<prefix>page-ui` 之下；
 *  零 `:root`／零 `!important`；不设宽度分档（行内三段，窄容器自动换行）。
 */
import { skinVar } from '../skin/contract.js';
import { negativeBarSlot, type NegativeBarSlot } from './render.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function negativeBarCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const box = root + ' .' + p + 'block-negative-bar';
  const s = (slot: NegativeBarSlot): string => root + ' .' + negativeBarSlot(slot, p);

  return [
    box + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 4px 10px;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  line-height: 1.7;',
    '}',
    s('label') + ' {',
    '  flex: none;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-weight: 600;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 虚线空框：描边虚线 ＋ 底透明 —— 负值**不画实条**（长度语义只属于正值）。 */',
    s('box') + ' {',
    '  flex: 1 1 auto;',
    '  min-width: 0;',
    '  box-sizing: border-box;',
    '  padding: 6px 10px;',
    '  border: 1px dashed ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: transparent;',
    '  overflow-wrap: anywhere;',
    '}',
    s('value') + ' {',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-variant-numeric: tabular-nums;',
    '  font-weight: 700;',
    '}',
    box + '.is-danger ' + '.' + negativeBarSlot('box', p) + ' {',
    '  border-color: ' + skinVar('danger') + ';',
    '}',
    box + '.is-danger ' + '.' + negativeBarSlot('value', p) + ' {',
    '  color: ' + skinVar('danger') + ';',
    '}',
    s('note') + ' {',
    '  flex: 1 1 100%;',
    '  margin: 0;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  overflow-wrap: anywhere;',
    '}',
  ].join(LF);
}
