/** sheet-head · **样式段**（本件唯一的样式来源）。
 *
 *  取值＝判地（`proto/acct-goal/` 十三件的 `.shop-head`／`.shop-brand`／`.shop-head h2`／`.shop-sub`）。
 *  纪律：scope 全在 `.<prefix>page-ui` 之下；颜色一律经 `skinVar()`（不手写 `var(--ilife-…)`）；
 *  零 `:root`／零 `!important`；字号与内距是判地字面（授权照抄，逐条带出处）。
 *  **#1123 只立件**：与 `packages/skill-bill/src/shared/docPage.ts` 的 `TICKET_CSS` 同值并存，
 *  由 #1124（家具带上移）切换成「页面拼 `sheetHeadCss()`、docPage 删旧段」。
 */
import { skinVar } from '../skin/contract.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 本组件的样式段。 */
export function sheetHeadCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const on = '.' + p + 'page-ui .' + p + 'sheet-head';
  return [
    '/* sheet-head（票据纸页头）：店头三行；取值照判地 `.shop-head` 一族。 */',
    on + ' { text-align: center; padding: 2px 0 0; }',
    on + ' .' + p + 'sheet-eyebrow { margin: 0; font-size: 11.5px; letter-spacing: 2px; color: ' + skinVar('ink-2') + '; font-weight: 700; }',
    on + ' .' + p + 'sheet-title { margin: 8px 0 0; font-size: 19px; line-height: 1.4; letter-spacing: .2px; font-weight: 800; color: ' + skinVar('ink') + '; }',
    on + ' .' + p + 'sheet-title .hl { color: ' + skinVar('danger') + '; }',
    on + ' .' + p + 'sheet-sub { margin: 8px 0 0; font-size: 12.5px; line-height: 1.6; color: ' + skinVar('ink-2') + '; text-align: center; }',
  ].join(LF);
}
