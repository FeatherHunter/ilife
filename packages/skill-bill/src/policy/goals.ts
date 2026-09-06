// 口径层·目标 params 校验（老家 goal/cli.py 对应：set-budget/budget/set-saving/saving）。
// 覆盖语义：同月同分类预算已存在默认拒绝（conflict），AI 层提示用户确认后加 --force 重跑。
import { BillPolicyError } from '../fetch/errors.js';
import { normalizeMonth, normalizeDate } from './category.js';

export type GoalOp = 'set-budget' | 'budget' | 'set-saving' | 'saving';

export function parseGoalOp(params: Record<string, unknown>): GoalOp {
  const op = params.op === undefined ? 'budget' : params.op;
  if (op === 'set-budget' || op === 'budget' || op === 'set-saving' || op === 'saving') return op;
  throw new BillPolicyError('POLICY_BAD_INPUT', 'op 非法（期望 set-budget/budget/set-saving/saving）：' + JSON.stringify(op));
}

export function validateBudgetAmount(raw: unknown): number {
  const n = typeof raw === 'string' ? Number(raw.trim()) : raw;
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) {
    throw new BillPolicyError('POLICY_BAD_INPUT', '预算 amount 须为正数：' + JSON.stringify(raw));
  }
  return Math.round(n * 100) / 100;
}

export function validateSetBudget(params: Record<string, unknown>): { month: string; category: string; amount: number; force: boolean } {
  const amount = validateBudgetAmount(params.amount);
  const month = params.month === undefined ? new Date().toISOString().slice(0, 7) : normalizeMonth(params.month);
  const category = typeof params.category === 'string' && params.category ? params.category.trim() : '';
  return { month, category, amount, force: params.force === true };
}

export function validateSetSaving(params: Record<string, unknown>): { name: string; amount: number; deadline: string | null } {
  if (typeof params.name !== 'string' || !params.name.trim()) {
    throw new BillPolicyError('POLICY_MISSING_SLOT', '缺槽位 name（储蓄目标名）');
  }
  const amount = validateBudgetAmount(params.amount);
  const deadline = params.deadline === undefined || params.deadline === null || params.deadline === ''
    ? null : normalizeDate(params.deadline, 'deadline');
  return { name: params.name.trim(), amount, deadline };
}
