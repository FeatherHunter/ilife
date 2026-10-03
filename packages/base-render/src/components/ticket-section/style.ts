/** ticket-section · **样式段**（本件唯一的样式来源）。取值＝判地 `.sec` 一族。
 *  纪律：scope 全在 `.<prefix>page-ui` 之下；颜色一律经 `skinVar()`；零 `:root`／零 `!important`。
 *  **#1123 只立件**：与 `docPage.ts` 的 `TICKET_CSS` 同值并存，由 #1124 切换。 */
import { skinVar } from '../skin/contract.js';

/** 换行（仓库口径）。 */
const LF = String.fromCharCode(10);

/** 本组件的样式段。 */
export function ticketSectionCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const on = '.' + p + 'page-ui .' + p + 'ticket-sec';
  return [
    '/* ticket-section（票据纸的一段）：段头 4px 主色条 ＋ 标题 ＋ 右对齐英文标。 */',
    on + ' { padding: 2px 0 6px; }',
    on + '-heading { display: flex; align-items: center; gap: 8px; margin: 4px 0 10px; font-size: 13px; font-weight: 800; letter-spacing: 1.5px; color: ' + skinVar('ink-2') + '; }',
    on + '-heading::before { content: ""; width: 4px; height: 14px; border-radius: 4px; background: ' + skinVar('accent') + '; }',
    on + '-no { margin-left: auto; font-weight: 700; color: ' + skinVar('ink-3') + '; letter-spacing: 0; }',
    on + '-heading.is-danger::before { background: ' + skinVar('danger') + '; }',
  ].join(LF);
}
