/** 共用位·分类与金额口径（#689 结构搬迁第三批：从 `src/policy/category.ts` 来）。
 *  支出 L1 10 ＋ 收入 L1 6 ＋ 借贷／分期／转账隔离；`amount` 符号即分类依据（支出负／收入正），不单设 `type` 列。
 *  同一件拆出的另一半是 `./dateRange.ts`（日期与时间窗口），两件互不反向依赖。
 *
 *  谁在用（指名，路径随 #689 搬迁改成新家）：
 *    · `src/write/`——`collectBody.ts`／`photoEscape.ts`（三级分类候选与 `ALL_L1`）·
 *      `record.ts`（`validateCategory`／`validateAmount`／`validateRecord`）·
 *      `prefillNote.ts`／`recentPicks.ts`／`template-batch.ts`（`DEFAULTS`）· `summaryRow.ts`（`l1Of`）；
 *    · `src/query/read.ts`——「查分类」那条条件的 `validateCategory`；
 *    · `src/cli/cmd_read.ts`——导入 CSV 那一支的 `validateCategory`（外壳）；
 *    · `src/shared/kpi.ts`——总览的分档前缀取 `l1Of`。
 *  两域（write／query）＋外壳在用它 ⇒ 住共用位（归属律 2）。 */
import { BillPolicyError } from '../fetch/errors.js';
import { defaultTimeOn, validateTime } from './dateRange.js';

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

export interface BillRecordInput {
  category: string; amount: number; time: string;
  account: string; ledger: string; currency: string; note: string;
}

// 整单校验：7 字段（account/ledger/currency/note 可缺省）；坏输入阻断。时刻的补法引 `./dateRange.js`（真源一处）。
export function validateRecord(raw: Record<string, unknown>): BillRecordInput {
  const category = validateCategory(raw.category);
  const amount = validateAmount(raw.amount);
  const time = raw.time === undefined || raw.time === null || raw.time === ''
    ? defaultTimeOn(new Date().toISOString().slice(0, 10))
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
