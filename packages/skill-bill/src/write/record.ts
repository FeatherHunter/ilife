/** 写入域·记账命令 params 校验（#689 结构搬迁第三批：从 `src/policy/record.ts` 的写校验半来）。
 *  op 分流：add（单笔/批量逐笔）/ update / undo（软删）/ restore；拍账单图片识别以外置为准。
 *  日期与时间窗口那半另住 `src/shared/dateRange.ts`（查询／分析／目标三处也在用）；`id` 槽位守卫与
 *  `op` 取值集住 `src/shared/params.ts`（写域与查询域两边都在取，本件照本域门面转出这两件）。
 *
 *  谁在用（指名）：`src/write/write.ts`——两条写命令的处理体（`parseRecordOp`／`needId`／
 *    `validateAddInput`／`validateUpdateInput`）与回执事实里的 `RecordOp`。 */
import { BillPolicyError } from '../fetch/errors.js';
import { validateAmount, validateCategory, validateRecord } from '../shared/category.js';
import { validateTime } from '../shared/dateRange.js';
import { needId } from '../shared/params.js';
import type { RecordOp } from '../shared/params.js';

/** `id` 槽位与 `op` 取值集（口径住 `../shared/params.js`），本件照写域的门面转出。 */
export { needId };
export type { RecordOp };

export function parseRecordOp(params: Record<string, unknown>): RecordOp {
  const op = params.op === undefined ? 'add' : params.op;
  if (op === 'add' || op === 'update' || op === 'undo' || op === 'restore') return op;
  throw new BillPolicyError('POLICY_BAD_INPUT', 'op 非法（期望 add/update/undo/restore）：' + JSON.stringify(op));
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
