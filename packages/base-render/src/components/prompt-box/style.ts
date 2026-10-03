/** prompt-box · **样式段**（本件唯一的样式来源）。
 *
 *  三条纪律（与组件层其余件同一份）：
 *   1. 颜色／圆角／字面／字号一律经 `skinVar()` 读；等宽字面是例外（`skinVar` 名单里没有等宽栈，
 *      既有 `note-block` 同口径，不算颜色）；
 *   2. 全部规则 scope 在 `.<prefix>page-ui` 之下；
 *   3. 零 `:root`／零 `!important`；宽度不分档（单列纵排，窄容器天然成立）。
 */
import { skinVar } from '../skin/contract.js';
import { promptBoxSlot, type PromptBoxSlot } from './render.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 正文的最小高度（px）：一行字也撑得住，不塌成一条线。 */
export const PROMPT_BOX_MIN_HEIGHT_PX = 88;
/** 复制按钮的命中高下限（px）：全仓触控地板 44。 */
export const PROMPT_BOX_BUTTON_MIN_HEIGHT_PX = 44;

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function promptBoxCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const box = root + ' .' + p + 'block-prompt-box';
  const s = (slot: PromptBoxSlot): string => root + ' .' + promptBoxSlot(slot, p);

  return [
    box + ' {',
    '  display: grid;',
    '  gap: 10px;',
    '  min-width: 0;',
    '  box-sizing: border-box;',
    '  margin: 16px 0;',
    '  padding: 14px;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius') + ';',
    '  background: ' + skinVar('surface') + ';',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  line-height: 1.7;',
    '}',
    s('head') + ' {',
    '  margin: 0;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-size: ' + skinVar('fs-h3') + ';',
    '  font-weight: 700;',
    '  overflow-wrap: anywhere;',
    '}',
    s('body') + ' {',
    '  margin: 0;',
    '  min-width: 0;',
    '  min-height: ' + String(PROMPT_BOX_MIN_HEIGHT_PX) + 'px;',
    '  box-sizing: border-box;',
    '  padding: 10px 12px;',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('surface-2') + ';',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-family: "SF Mono", monospace;',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  line-height: 1.65;',
    '  white-space: pre-wrap;',
    '  overflow-wrap: anywhere;',
    '}',
    s('action') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: center;',
    '  gap: 4px 10px;',
    '  min-width: 0;',
    '}',
    s('copy') + ' {',
    '  flex: none;',
    '  min-height: ' + String(PROMPT_BOX_BUTTON_MIN_HEIGHT_PX) + 'px;',
    '  box-sizing: border-box;',
    '  padding: 0 16px;',
    '  border: 1px solid ' + skinVar('accent') + ';',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '  background: ' + skinVar('accent') + ';',
    '  color: ' + skinVar('accent-ink') + ';',
    '  font-family: inherit;',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 700;',
    '  cursor: pointer;',
    '}',
    s('copy') + ':active { opacity: .9; }',
    s('copy') + ':focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 2px;',
    '}',
    '@media (hover:hover) and (pointer:fine) {',
    '  ' + s('copy') + ':hover { opacity: .92; }',
    '}',
    s('hint') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  overflow-wrap: anywhere;',
    '}',
  ].join(LF);
}
