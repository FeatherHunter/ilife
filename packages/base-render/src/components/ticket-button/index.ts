/** ticket-button · **组件出口**（本组件对外的唯一名字面）。
 *
 *  三件出口：`renderTicketButton(input)`（产一颗票据纸主按钮，零 DOM）／`ticketButtonCss()`（样式段）／
 *  类名根 `TICKET_BUTTON_CLASS` 与主按钮修饰类 `TICKET_BUTTON_PRIMARY`。
 *  本件**没有运行时段**（点击与复制由公共层 helpers 的委派管）。
 *
 *  用法与参数表见同目录 `README.md`。消费方走 `base-paint/blocks`（组件层出口），不走根出口。
 */
export {
  TICKET_BUTTON_CLASS,
  TICKET_BUTTON_PRIMARY,
  renderTicketButton,
} from './render.js';
export type { TicketButtonInput } from './render.js';
export {
  TICKET_BUTTON_FONT_PX,
  TICKET_BUTTON_MIN_HEIGHT_PX,
  TICKET_BUTTON_RADIUS_PX,
  ticketButtonCss,
} from './style.js';
