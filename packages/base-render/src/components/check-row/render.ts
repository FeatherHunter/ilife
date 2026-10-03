/** check-row · **渲染**（纯函数产 HTML；零 DOM、零副作用）。
 *
 *  ——票据纸的对账行（浅绿卡 ＋ 圆点 ＋ 一句）——
 *  判地＝`proto/acct-goal/` 十三件的 `.check-mini`；同族先例＝`status-row`／`ledger-rows`／`ticket-section`。
 *  它替掉哪几种错法：各页自己拼对账卡（卡底／圆点／文字三处各写一份，四条样式散在各域）；
 *  对账那句只写「没有异常」而漏了编号与笔数（形状在、信息不在）。
 */
import { esc } from '../shared/escape.js';
import { assertPlainObject, badInput, reqText } from '../shared/validate.js';

/** 本件的类名根（常量只住这里）。 */
export const CHECK_ROW_CLASS = 'ilife-ticket-check';
/** 语气闭集（只换描边与圆点那两枚色；形状不变）。 */
export const CHECK_ROW_TONES = ['ok', 'warn', 'danger'] as const;
export type CheckRowTone = (typeof CHECK_ROW_TONES)[number];
/** 槽位闭集。 */
export const CHECK_ROW_SLOTS = ['dot'] as const;
export type CheckRowSlot = (typeof CHECK_ROW_SLOTS)[number];
/** 槽类名。 */
export function checkRowSlot(slot: CheckRowSlot, prefix = 'ilife-'): string {
  return prefix + 'ticket-check-' + slot;
}
/** 入参（三位）。 */
export interface CheckRowInput {
  /** 对账那一句（转义后上屏，如「编号 7、9 / 共 2 笔 / 异常：无」）。 */
  readonly text: string;
  /** 语气；缺省 `ok`。 */
  readonly tone?: CheckRowTone;
  /** 圆点那枚的开关；缺省 `true`。 */
  readonly dot?: boolean;
}
/** 归一化后的入参。 */
export interface CheckRowModel {
  readonly text: string;
  readonly tone: CheckRowTone;
  readonly dot: boolean;
}
const ROOT_KEYS: readonly string[] = ['text', 'tone', 'dot'];
/** 入参归一化（唯一入口）。 */
export function normalizeCheckRow(input: unknown): CheckRowModel {
  assertPlainObject(input, 'check-row');
  const raw = input as Record<string, unknown>;
  for (const k of Object.keys(raw)) if (!ROOT_KEYS.includes(k)) badInput('check-row 不认识这个键：' + k);
  const tone = raw.tone === undefined ? 'ok' : raw.tone;
  if (!(CHECK_ROW_TONES as readonly unknown[]).includes(tone)) {
    badInput('check-row.tone 必须是 ' + CHECK_ROW_TONES.join('／') + ' 之一');
  }
  if (raw.dot !== undefined && typeof raw.dot !== 'boolean') badInput('check-row.dot 只吃布尔');
  return { text: reqText(raw.text, 'check-row.text'), tone: tone as CheckRowTone, dot: raw.dot !== false };
}
/** 产一条对账行（默认档＝判地那一版；字节与 skill 侧 `checkHtmlOf` 逐字相同）。 */
export function renderCheckRow(input: unknown): string {
  const m = normalizeCheckRow(input);
  return '<div class="' + CHECK_ROW_CLASS + (m.tone === 'ok' ? '' : ' is-' + m.tone) + '">'
    + (m.dot ? '<span class="' + checkRowSlot('dot') + '" aria-hidden="true"></span>' : '')
    + '<span>' + esc(m.text) + '</span></div>';
}
