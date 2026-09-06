// 口径层·分类与金额（老家 references/categories.md + scripts/validators.py 对应）。
// 支出 L1 10 + 收入 L1 6 + 借贷/分期/转账隔离；amount 符号即分类依据（支出负/收入正），不单设 type 列。
import { BillPolicyError } from '../fetch/errors.js';

export const EXPENSE_L1 = ['餐饮', '居家', '穿着', '出行', '玩乐', '学习', '健康', '社交', '宠物', '其他'] as const;
export const INCOME_L1 = ['工资', '奖金', '兼职', '投资', '其他收入', '退款'] as const;
export const SPECIAL_L1 = ['借贷', '分期', '转账'] as const;
export const ALL_L1 = [...EXPENSE_L1, ...INCOME_L1, ...SPECIAL_L1] as const;
export type BillL1 = (typeof ALL_L1)[number];

export const DEFAULTS = { account: '', ledger: '生活', currency: '人民币', note: '' } as const;

export function l1Of(category: string): string {
  return category.split('/')[0].trim();
}

// 分类校验：须含 L1（允许 L1/L2/L3 三级 / 分隔）；旧数据无 / 视为 L1；未知 L1 阻断。
export function validateCategory(raw: unknown): string {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new BillPolicyError('POLICY_BAD_CATEGORY', 'category 不能为空');
  }
  const s = raw.trim();
  const l1 = l1Of(s);
  if (!(ALL_L1 as readonly string[]).includes(l1)) {
    throw new BillPolicyError('POLICY_BAD_CATEGORY', '未知 L1 分类：' + l1);
  }
  const parts = s.split('/').map((p) => p.trim());
  if (parts.some((p) => p.length === 0)) {
    throw new BillPolicyError('POLICY_BAD_CATEGORY', '分类层级含空段');
  }
  if (parts.length > 3) {
    throw new BillPolicyError('POLICY_BAD_CATEGORY', '分类至多 L1/L2/L3 三级');
  }
  return s;
}

// 金额：带符号浮点，支出负/收入正，零阻断（符号即分类依据）。
export function validateAmount(raw: unknown): number {
  const n = typeof raw === 'string' && raw.trim() !== '' ? Number(raw.trim()) : raw;
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    throw new BillPolicyError('POLICY_BAD_AMOUNT', 'amount 须为带符号数字');
  }
  if (n === 0) throw new BillPolicyError('POLICY_BAD_AMOUNT', 'amount 不得为 0');
  if (Math.abs(n) > 1e12) throw new BillPolicyError('POLICY_BAD_AMOUNT', 'amount 超界');
  return Math.round(n * 100) / 100;
}

export const DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}):(\d{2}))?$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function realDate(y: number, m: number, d: number): boolean {
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

// 时间：YYYY-MM-DD HH:mm:ss 或 YYYY-MM-DD（补 12:00:00）；非法阻断。
export function validateTime(raw: unknown): string {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new BillPolicyError('POLICY_BAD_TIME', 'time 不能为空');
  }
  const s = raw.trim().replace(/\//g, '-');
  const m = DATETIME_RE.exec(s);
  if (!m) throw new BillPolicyError('POLICY_BAD_TIME', 'time 格式非法');
  const y = Number(m[1]); const mo = Number(m[2]); const d = Number(m[3]);
  if (!realDate(y, mo, d)) throw new BillPolicyError('POLICY_BAD_TIME', 'time 非真实日期');
  if (m[4] === undefined) return s + ' 12:00:00';
  const hh = Number(m[4]); const mm = Number(m[5]); const ss = Number(m[6]);
  if (hh > 23 || mm > 59 || ss > 59) throw new BillPolicyError('POLICY_BAD_TIME', 'time 时分秒非法');
  return s;
}

export function normalizeDate(d: unknown, field = 'date'): string {
  if (typeof d !== 'string' || d.trim().length === 0) {
    throw new BillPolicyError('POLICY_BAD_TIME', field + ' 须为日期字符串');
  }
  let s = d.trim().replace(/\//g, '-').replace(/\./g, '-');
  if (/^\d{8}$/.test(s)) s = s.slice(0, 4) + '-' + s.slice(4, 6) + '-' + s.slice(6);
  if (!DATE_RE.test(s)) throw new BillPolicyError('POLICY_BAD_TIME', field + ' 格式非法');
  const parts2 = s.split('-').map(Number);
  if (!realDate(parts2[0], parts2[1], parts2[2])) throw new BillPolicyError('POLICY_BAD_TIME', field + ' 非真实日期');
  return s;
}

export function normalizeMonth(m: unknown, field = 'month'): string {
  if (typeof m !== 'string' || !MONTH_RE.test(m.trim())) {
    throw new BillPolicyError('POLICY_BAD_TIME', field + ' 格式非法');
  }
  return (m as string).trim();
}

export interface BillRecordInput {
  category: string; amount: number; time: string;
  account: string; ledger: string; currency: string; note: string;
}

// 整单校验：7 字段（account/ledger/currency/note 可缺省）；坏输入阻断。
export function validateRecord(raw: Record<string, unknown>): BillRecordInput {
  const category = validateCategory(raw.category);
  const amount = validateAmount(raw.amount);
  const time = raw.time === undefined || raw.time === null || raw.time === ''
    ? new Date().toISOString().slice(0, 10) + ' 12:00:00'
    : validateTime(raw.time);
  const str = (v: unknown, name: string): string => {
    if (v === undefined || v === null) return '';
    if (typeof v !== 'string') throw new BillPolicyError('POLICY_BAD_INPUT', name + ' 须为字符串');
    return v;
  };
  return {
    category, amount, time,
    account: raw.account === undefined || raw.account === '' ? DEFAULTS.account : str(raw.account, 'account'),
    ledger: raw.ledger === undefined || raw.ledger === '' ? DEFAULTS.ledger : str(raw.ledger, 'ledger'),
    currency: raw.currency === undefined || raw.currency === '' ? DEFAULTS.currency : str(raw.currency, 'currency'),
    note: str(raw.note ?? '', 'note'),
  };
}
