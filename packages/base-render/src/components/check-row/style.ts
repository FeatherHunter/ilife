/** check-row · **样式段**（本件唯一的样式来源）。取值＝判地 `.check-mini` 一族（三条语气）。
 *  纪律：scope 全在 `.<prefix>page-ui` 之下；颜色只有判地授权的那几处字面（**逐处带出处**），
 *  其余走 `skinVar()`；零 `:root`／零 `!important`。
 *  **#1123 只立件**：与 `docPage.ts` 的 `TICKET_CSS`／`TICKET_FURNITURE_CSS` 同值并存，由 #1124 切换。 */
import { skinVar } from '../skin/contract.js';
import { m } from '../../entries/index.js';

/** 换行（仓库口径）。 */
const LF = String.fromCharCode(10);

/** 本组件的样式段。 */
export function checkRowCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const on = '.' + p + 'page-ui .' + p + 'ticket-check';
  return [
    m('base-render.components-check-row-style.c001'),
    m('base-render.components-check-row-style.c002', { p0: String(on), p1: String(skinVar('radius-sm')) }),
    m('base-render.components-check-row-style.c003', { p0: String(on), p1: String(skinVar('radius-pill')) }),
    m('base-render.components-check-row-style.c004', { p0: String(on), p1: String(skinVar('danger-soft')) }),
    on + '.is-danger .' + p + 'ticket-check-dot { background: ' + skinVar('danger') + '; }',
    m('base-render.components-check-row-style.c005', { p0: String(on), p1: String(skinVar('warn-soft')) }),
    m('base-render.components-check-row-style.c006', { p0: String(on), p1: String(p) }),
  ].join(LF);
}
