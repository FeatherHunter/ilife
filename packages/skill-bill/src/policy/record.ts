// 口径层·记账 params 校验（老家 record_bill.py + write/cli.py 对应）。
// op 分流：add（单笔/批量逐笔）/ update / undo（软删）/ restore；拍账单图片识别以外置为准。
import { BillPolicyError } from '../fetch/errors.js';
import { validateAmount, validateCategory, validateTime, validateRecord, normalizeDate } from './category.js';

export type RecordOp = 'add' | 'update' | 'undo' | 'restore';

export function parseRecordOp(params: Record<string, unknown>): RecordOp {
  const op = params.op === undefined ? 'add' : params.op;
  if (op === 'add' || op === 'update' || op === 'undo' || op === 'restore') return op;
  throw new BillPolicyError('POLICY_BAD_INPUT', 'op 非法（期望 add/update/undo/restore）：' + JSON.stringify(op));
}

export function needId(params: Record<string, unknown>): number {
  const id = params.id;
  if (!Number.isInteger(id) || (id as number) <= 0) {
    throw new BillPolicyError('POLICY_BAD_INPUT', '须给正整数 id');
  }
  return id as number;
}

// add：7 字段强校验（批量由调用方逐笔调本函数，不在此展开数组）。
export function validateAddInput(params: Record<string, unknown>): ReturnType<typeof validateRecord> {
  return validateRecord(params);
}

// update：id 必填 + 至少改一个字段（amount/category/time 分项校验）。
export function validateUpdateInput(params: Record<string, unknown>): { id: number; patch: Record<string, unknown> } {
  const id = needId(params);
  const patch: Record<string, unknown> = {};
  if (params.category !== undefined) patch.category = validateCategory(params.category);
  if (params.amount !== undefined) patch.amount = validateAmount(params.amount);
  if (params.time !== undefined) patch.time = validateTime(params.time);
  for (const k of ['account', 'ledger', 'currency', 'note']) {
    if (params[k] !== undefined) {
      if (typeof params[k] !== 'string') throw new BillPolicyError('POLICY_BAD_INPUT', k + ' 须为字符串');
      patch[k] = params[k];
    }
  }
  if (!Object.keys(patch).length) {
    throw new BillPolicyError('POLICY_BAD_INPUT', 'update 至少改一个字段（category/amount/time/account/ledger/currency/note）');
  }
  return { id, patch };
}

export function resolveQueryDate(params: Record<string, unknown>): string {
  if (params.date === undefined || params.date === null || params.date === '') {
    return new Date().toISOString().slice(0, 10);
  }
  if (typeof params.date !== 'string') throw new BillPolicyError('POLICY_BAD_TIME', 'date 须为字符串');
  return normalizeDate(params.date);
}

export function resolveRange(params: Record<string, unknown>): { start: string; end: string } {
  if (params.start === undefined || params.end === undefined) {
    throw new BillPolicyError('POLICY_MISSING_SLOT', '缺槽位 start/end（期望 YYYY-MM-DD）');
  }
  const start = normalizeDate(params.start, 'start');
  const end = normalizeDate(params.end, 'end');
  if (start > end) throw new BillPolicyError('POLICY_BAD_INPUT', 'start 不得晚于 end：' + start + '~' + end);
  return { start, end };
}
