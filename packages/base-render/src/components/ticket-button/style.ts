/** ticket-button · **样式段**（本件唯一的样式来源）。
 *
 *  几何逐字照判地（`docs/skills/skill-bill/proto/acct-goal/b01-新增账户-采集-v2.2.html` 的内嵌 <style>）：
 *  基础档 `.btn`（整行 48px／圆角 13px／16px w800／字距 .5／内距 12px 14px／无边框）、
 *  实心档 `.btn-primary`（暖红渐变 ＋ 字面投影 ＋ 内高光）、
 *  以及 **#1113 新增的公开形状位**「禁用档」`.btn-primary:disabled`（底 #c9c2b4／白字／零投影／.9／not-allowed）。
 *
 *  纪律：scope 全在 `.<prefix>page-ui` 之下；零 `:root`／零 `!important`／零新 token 名；
 *  颜色与圆角只有判地授权的那几处字面——**每一处都写在带出处那句话的同一行上**
 *  （`规格 §x 授权照抄`／`判地字面 · 授权照抄`）。
 *
 *  记账（**与 #525 的读法冲突，留给裁定**）：判地禁用档是「白字压浅灰底」，对比度约 1.7:1，
 *  过不了 #525 立的「禁用态也要看得清」那条文本地板；本票（#1113）判据是**像素**、口径是「形状照判地」
 *  ⇒ 照抄不改值，冲突写进 #1113 证据与票面遗留出口（要改就是改判地＝另开原型票）。
 */
import { skinVar } from '../skin/contract.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 主按钮最小高度（px）：判地 `.btn{min-height:48px}`。 */
export const TICKET_BUTTON_MIN_HEIGHT_PX = 48;
/** 主按钮圆角（px）：判地 `.btn{border-radius:13px}`（规格 §6 授权照抄：主/次按钮同档 13px）。 */
export const TICKET_BUTTON_RADIUS_PX = 13;
/** 主按钮字号（px）：判地 `.btn{font-size:16px;font-weight:800}`。 */
export const TICKET_BUTTON_FONT_PX = 16;

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function ticketButtonCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const piece = '.' + p + 'block-ticket-button';
  const on = '.' + p + 'page-ui ' + piece;
  return [
    '/* ticket-button（票据纸主按钮）：整行实心钮；末档是 **#1113 新增的禁用态公开形状位**。 */',
    on + ' {',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  width: 100%;',
    '  min-height: ' + String(TICKET_BUTTON_MIN_HEIGHT_PX) + 'px;',
    '  padding: 12px 14px;',
    '  border: 0;',
    '  border-radius: ' + String(TICKET_BUTTON_RADIUS_PX) + 'px; /* 规格 §6 授权照抄：13px（主/次按钮同档） */',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + String(TICKET_BUTTON_FONT_PX) + 'px;',
    '  font-weight: 800;',
    '  letter-spacing: .5px;',
    '  line-height: normal;',
    '  cursor: pointer;',
    '  -webkit-tap-highlight-color: transparent;',
    '  touch-action: manipulation;',
    '}',
    on + '.is-primary {',
    '  background: linear-gradient(180deg, #d34a35, #b93222); /* 规格 §6 授权照抄：主按钮渐变 #d34a35→#b93222 */',
    '  color: #fff; /* 判地字面 · 授权照抄：#fff（主按钮字色） */',
    '  box-shadow: 0 8px 20px rgba(185,50,34,.28), inset 0 1px 0 rgba(255,255,255,.25); /* 规格 §6 授权照抄：0 8px 20px rgba(185,50,34,.28) ＋ 内高光 inset 0 1px 0 rgba(255,255,255,.25) */',
    '}',
    '/* **#1113 新增的公开形状位：禁用态**（判地 `.btn-primary:disabled` 五条逐条照抄）。',
    '   页面侧要禁用就传 `renderTicketButton({disabled:true})`，不许自造这一档样式。 */',
    on + '[disabled],',
    on + ':disabled {',
    '  background: #c9c2b4; /* 判地字面 · 授权照抄：#c9c2b4（主按钮禁用底） */',
    '  color: #fff; /* 判地字面 · 授权照抄：#fff（禁用态字色） */',
    '  box-shadow: none;',
    '  opacity: .9;',
    '  cursor: not-allowed;',
    '}',
  ].join(LF);
}
