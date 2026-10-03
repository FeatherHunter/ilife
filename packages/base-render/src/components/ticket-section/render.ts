/** ticket-section · **渲染**（纯函数产 HTML；零 DOM、零副作用）。
 *
 *  ——票据纸的一段（4px 主色条 ＋ 标题 ＋ 右对齐英文标 ＋ 段内容）——
 *  判地＝`proto/acct-goal/` 十三件的 `.sec`／`.sec-heading`／`.sec-heading .no`；
 *  同族先例＝`sheet-head`／`check-row`／`ticket-button`。
 *  它替掉哪几种错法：各页自己拼段头（标题／英文标／色条三处各写一份，段与段之间走散）；
 *  英文标当装饰随手换字（判据侧靠它认段）。
 */
import { esc } from '../shared/escape.js';
import { assertPlainObject, badInput } from '../shared/validate.js';

/** 本件的类名根（常量只住这里）。 */
export const TICKET_SECTION_CLASS = 'ilife-ticket-sec';
/** 形态闭集（当前只有默认一档：常色条；`danger` 走 `is-danger` 那一枚色）。 */
export const TICKET_SECTION_FORMS = ['plain', 'danger'] as const;
export type TicketSectionForm = (typeof TICKET_SECTION_FORMS)[number];
/** 槽位闭集。 */
export const TICKET_SECTION_SLOTS = ['heading', 'no'] as const;
export type TicketSectionSlot = (typeof TICKET_SECTION_SLOTS)[number];
/** 槽类名。 */
export function ticketSectionSlot(slot: TicketSectionSlot, prefix = 'ilife-'): string {
  return prefix + 'ticket-sec-' + slot;
}
/** 入参（五位）。 */
export interface TicketSectionInput {
  /** 段标题（转义后上屏；空串＝不出标题字，槽位仍在）。 */
  readonly title: string;
  /** 右对齐英文标（如 `LEDGER`；**空串＝不出标签**，照旧出空的 `.no` 槽）。 */
  readonly tag: string;
  /** 段内容（**受信 HTML**）。 */
  readonly content: string;
  /** 形态；缺省 `plain`。 */
  readonly form?: TicketSectionForm;
}
/** 归一化后的入参。 */
export interface TicketSectionModel {
  readonly title: string;
  readonly tag: string;
  readonly content: string;
  readonly form: TicketSectionForm;
}
const ROOT_KEYS: readonly string[] = ['title', 'tag', 'content', 'form'];
/** 入参归一化（唯一入口）。 */
export function normalizeTicketSection(input: unknown): TicketSectionModel {
  assertPlainObject(input, 'ticket-section');
  const raw = input as Record<string, unknown>;
  for (const k of Object.keys(raw)) if (!ROOT_KEYS.includes(k)) badInput('ticket-section 不认识这个键：' + k);
  const form = raw.form === undefined ? 'plain' : raw.form;
  if (!(TICKET_SECTION_FORMS as readonly unknown[]).includes(form)) {
    badInput('ticket-section.form 必须是 ' + TICKET_SECTION_FORMS.join('／') + ' 之一');
  }
  // **既有调用方零回归**（#1123 教训）：`tag` 收 `''`／`undefined` ⇒ 当作「不出标签」（照旧出空的 `.no` 槽），
  // `title`／`content` 同样收空串——本件落地前这三格都没有非空校验，新件不许把既有页判成非法。
  const str = (v: unknown): string => (typeof v === 'string' ? v : v === undefined || v === null ? '' : String(v));
  return {
    title: str(raw.title),
    tag: str(raw.tag),
    content: str(raw.content),
    form: form as TicketSectionForm,
  };
}
/** 产一段（默认档＝判地那一版；字节与 skill 侧 `ticketSection` 逐字相同）。 */
export function renderTicketSection(input: unknown): string {
  const m = normalizeTicketSection(input);
  return '<section class="' + TICKET_SECTION_CLASS + '"><div class="' + ticketSectionSlot('heading')
    + (m.form === 'danger' ? ' is-danger' : '') + '">' + esc(m.title)
    + '<span class="' + ticketSectionSlot('no') + '">' + esc(m.tag) + '</span></div>'
    + m.content + '</section>';
}
