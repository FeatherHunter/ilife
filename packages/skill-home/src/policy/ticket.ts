// 口径层·票据凭证校验（老家 scripts/票据凭证/cli.py 对应）。
// purchase/warranty/cert/account 四 kind；kind+op 分流；日期/金额/主密钥守卫。
import { HomePolicyError } from '../fetch/errors.js';

export const TICKET_KINDS = ['purchase', 'warranty', 'cert', 'account'] as const;
export type TicketKind = (typeof TICKET_KINDS)[number];

export function parseTicketKind(p: Record<string, unknown>): TicketKind {
  const k = (p.kind ?? p.domain ?? 'purchase') as string;
  if (!(TICKET_KINDS as readonly string[]).includes(k)) throw new HomePolicyError('POLICY_BAD_INPUT', '未知 ticket kind：' + String(k));
  return k as TicketKind;
}

export function checkDate(v: unknown, field: string): string | null {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new HomePolicyError('POLICY_BAD_DATE', field + ' 须 YYYY-MM-DD');
  return v;
}

export function checkMoney(v: unknown, field: string): number | null {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'number' || !(v >= 0)) throw new HomePolicyError('POLICY_BAD_INPUT', field + ' 须为非负数');
  return v;
}
