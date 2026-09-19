/** 账户域·命令参数校验（#689 结构搬迁第三批：从 `src/policy/accounts.ts` 来）。
 *  老家 `account/cli.py` 对应：add/update/transfer/summary。
 *  转账 = 两笔 #转账（转出支出 + 转入收入），分类 转账/转出 | 转账/转入，账本 转账，
 *  不入收支统计由 `src/shared/kpi.ts` 的 `isTransfer` 过滤。
 *
 *  谁在用（指名）：`src/cli/cmd_read.ts` 的 account 分支（两条未迁移命令的分派）——随命令搬进本域后
 *    由本域处理体经 `./index.js` 取。 */
import { BillPolicyError } from '../fetch/errors.js';

export type AccountOp = 'add' | 'update' | 'transfer' | 'summary';

export const TRANSFER_OUT_CATEGORY = '转账/转出';
export const TRANSFER_IN_CATEGORY = '转账/转入';
export const TRANSFER_LEDGER = '转账';

export function parseAccountOp(params: Record<string, unknown>): AccountOp {
  const op = params.op === undefined ? 'summary' : params.op;
  if (op === 'add' || op === 'update' || op === 'transfer' || op === 'summary') return op;
  throw new BillPolicyError('POLICY_BAD_INPUT', 'op 非法（期望 add/update/transfer/summary）：' + JSON.stringify(op));
}

export function needName(params: Record<string, unknown>, field = 'name'): string {
  const v = params[field];
  if (typeof v !== 'string' || !v.trim()) throw new BillPolicyError('POLICY_MISSING_SLOT', '缺槽位 ' + field);
  return v.trim();
}

export function validateTransfer(params: Record<string, unknown>): { amount: number; from: string; to: string; time: string | null } {
  const n = typeof params.amount === 'string' ? Number((params.amount as string).trim()) : params.amount;
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) {
    throw new BillPolicyError('POLICY_BAD_INPUT', 'transfer amount 须为正数：' + JSON.stringify(params.amount));
  }
  const from = needName(params, 'from');
  const to = needName(params, 'to');
  if (from === to) throw new BillPolicyError('POLICY_BAD_INPUT', 'transfer from/to 不得相同');
  const time = params.time === undefined || params.time === null || params.time === '' ? null : String(params.time);
  return { amount: Math.round(n * 100) / 100, from, to, time };
}
