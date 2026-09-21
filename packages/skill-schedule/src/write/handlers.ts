/** 写入与同步的处理函数（命令事实的执行一半；声明在 `./commands.ts`）。
 *
 * 逐字搬自 `src/cli/cmd_read.ts` 的 switch 一臂（行为零改动）。
 */
import {
  addRecord, amendRecord, addSummary,
} from '../fetch/index.js';
import { parseRecordOp, validateAddInput, validateAmendInput, validateSummaryInput } from '../policy/index.js';
import { buildRecordReceipt } from '../render/index.js';
import type { ScheduleRecord, ScheduleDb } from '../fetch/db.js';
import type { WriteHandler } from '../shared/commandSpec.js';

export const writeRecord: WriteHandler = (params, handle: ScheduleDb) => {
  const op = parseRecordOp(params);
  if (op === 'add') {
    const input = validateAddInput(params);
    const r = addRecord(handle, input);
    return { data: buildRecordReceipt('已记一条：' + r.id + '（' + r.date + ' ' + r.time_start + '~' + r.time_end + ' ' + r.category + '）'), html: '' };
  }
  if (op === 'amend') {
    const { id, patch } = validateAmendInput(params);
    const r = amendRecord(handle, id, patch as Partial<ScheduleRecord>);
    return { data: buildRecordReceipt('已修正：' + r.id + '（edit_count=' + r.edit_count + '）'), html: '' };
  }
  const s = validateSummaryInput(params);
  addSummary(handle, s.date, s.category, s.totalMinutes);
  return { data: buildRecordReceipt('已写摘要：' + s.date + ' ' + s.category + '=' + s.totalMinutes + '分钟'), html: '' };
};
