/** check-row · **样式段**（本件唯一的样式来源）。取值＝判地 `.check-mini` 一族（三条语气）。
 *  纪律：scope 全在 `.<prefix>page-ui` 之下；颜色只有判地授权的那几处字面（**逐处带出处**），
 *  其余走 `skinVar()`；零 `:root`／零 `!important`。
 *  **#1123 只立件**：与 `docPage.ts` 的 `TICKET_CSS`／`TICKET_FURNITURE_CSS` 同值并存，由 #1124 切换。 */
import { skinVar } from '../skin/contract.js';

/** 换行（仓库口径）。 */
const LF = String.fromCharCode(10);

/** 本组件的样式段。 */
export function checkRowCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const on = '.' + p + 'page-ui .' + p + 'ticket-check';
  return [
    '/* check-row（票据纸对账行）：浅绿卡 ＋ 圆点 ＋ 一句。 */',
    on + ' { display: flex; align-items: flex-start; gap: 8px; margin-top: 10px; padding: 10px 12px; border: 1px solid #cfe6d6; /* 判地字面 · 授权照抄：.check-mini 边 #cfe6d6 */ border-radius: ' + skinVar('radius-sm') + '; background: #f4fbf6; /* 判地字面 · 授权照抄：底 #f4fbf6 */ color: #3e5a4a; /* 判地字面 · 授权照抄：字 #3e5a4a */ font-size: 12.8px; line-height: 1.6; overflow-wrap: anywhere; }',
    on + '-dot { flex: none; width: 8px; height: 8px; margin-top: 6px; border-radius: ' + skinVar('radius-pill') + '; background: #2f9e5f; /* 判地字面 · 授权照抄：圆点 #2f9e5f */ }',
    on + '.is-danger { border-color: #ecc9c2; /* 判地字面 · 授权照抄 */ background: ' + skinVar('danger-soft') + '; color: #6d2118; /* 判地字面 · 授权照抄 */ }',
    on + '.is-danger .' + p + 'ticket-check-dot { background: ' + skinVar('danger') + '; }',
    on + '.is-warn { background: ' + skinVar('warn-soft') + '; border-color: #e8d3a8; /* 判地字面 · 授权照抄 */ color: #5f4413; /* 判地字面 · 授权照抄 */ }',
    on + '.is-warn .' + p + 'ticket-check-dot { background: #b97a1a; /* 判地字面 · 授权照抄 */ }',
  ].join(LF);
}
