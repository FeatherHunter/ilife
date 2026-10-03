/** ticket-button · **渲染**（纯函数产 HTML；零 DOM、零副作用）。
 *
 *  —— 票据纸主按钮（原型 `.btn.btn-primary`）——
 *
 *  它是什么：纸面动作区那**一颗**整行实心主按钮——带复制载荷（`data-t`）与动作号（`data-action-id`），
 *  点击后由公共层 helpers 的委派把载荷复制走（`[data-action-id]` 那两条属性与它逐字对齐）。
 *  判地＝`docs/skills/skill-bill/proto/acct-goal/b01-新增账户-采集-v2.2.html` 的 `.btn`／`.btn-primary`／
 *  `.btn-primary:disabled` 三处（形状住同目录 `style.ts`）。
 *
 *  **#1113 新增的公开形状位：`disabled`。** 判地那 5 张采集页的主按钮在「还没填完」时是**禁用态**
 *  （原型就是 `<button class="btn btn-primary" … disabled>`），而公共层此前只有「可点」这一档
 *  ⇒ 页面侧要么自造禁用样式、要么这个态根本出不来（#1118 收官轮报的 base 缺槽位）。
 *  传 `true` ⇒ 出**裸 `disabled`** ＋ `aria-disabled="true"`（读屏也读得出"现在按不动"）；
 *  形状由 `ticketButtonCss()` 的 `[disabled]`／`:disabled` 那一档给（判地逐条照抄）。
 *  **页面侧不许自造禁用样式**：要禁用就传这个位。
 *
 *  它不管什么：不管点击行为（不绑事件、不写库、不复制——那是 helpers 的运行时）、不管动作号与载荷
 *  从哪来、不管这颗按钮摆在页面的哪一格（住 `ticket-actions` 那一行是调用方的事）。
 */
import { esc } from '../shared/escape.js';
import { assertPlainObject, badInput, reqText } from '../shared/validate.js';

/** 本件的类名根（**常量只住这里**：样式从这里取，不各写一份）。 */
export const TICKET_BUTTON_CLASS = 'ilife-block-ticket-button';
/** 主按钮那一档的修饰类（判地 `.btn-primary`；本件当前只有这一档）。 */
export const TICKET_BUTTON_PRIMARY = 'is-primary';
/** 形态闭集（**当前只有实心主按钮这一档**；判地那 5 张采集页的主按钮就是它）。 */
export const TICKET_BUTTON_FORMS = ['primary'] as const;

/** ticket-button 入参（四位）。 */
export interface TicketButtonInput {
  /** 按钮上的字（**非空**；判地逐字是「填好后复制这句话去跟助手说」那一类，由调用方给）。 */
  readonly label: string;
  /** 动作号（**非空**；落 `data-action-id`，公共层 helpers 按它委派）。 */
  readonly actionId: string;
  /** 复制载荷（**非空**；落 `data-t`，点一下就把这段字复制走）。 */
  readonly copyText: string;
  /** **#1113 新增的公开形状位**：`true` ⇒ 出裸 `disabled` ＋ `aria-disabled="true"`（不给＝可点）。 */
  readonly disabled?: boolean;
}

/** 根对象只许带的键（未知键一律拒：静默吞掉＝调用方拼错字段名还绿）。 */
const ROOT_KEYS: readonly string[] = ['label', 'actionId', 'copyText', 'disabled'];

function assertKeys(value: object, allowed: readonly string[], field: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) badInput(field + ' 不认识这个键：' + key);
  }
}

/** 产一颗票据纸主按钮。恒返回非空 HTML 文本；入参不合法一律 `BlocksError`。 */
export function renderTicketButton(input: TicketButtonInput): string {
  assertPlainObject(input, 'ticket-button');
  assertKeys(input, ROOT_KEYS, 'ticket-button');
  const label = reqText(input.label, 'label');
  const actionId = reqText(input.actionId, 'actionId');
  const copyText = reqText(input.copyText, 'copyText');
  if (input.disabled !== undefined && typeof input.disabled !== 'boolean') {
    badInput('ticket-button：`disabled` 只吃布尔（不给＝可点；给字符串会静默变成"永远禁用"）');
  }
  const off = input.disabled === true;
  return '<button type="button" class="' + TICKET_BUTTON_CLASS + ' ' + TICKET_BUTTON_PRIMARY + '"'
    + ' data-action-id="' + esc(actionId) + '"'
    + ' data-t="' + esc(copyText) + '"'
    + (off ? ' disabled aria-disabled="true"' : '')
    + '>' + esc(label) + '</button>';
}
