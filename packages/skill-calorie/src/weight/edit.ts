/** 改体重记录（HELP 场景 03「体重」下一级）：`calorie.weight.update`／`calorie.weight.remove` 写。
 *
 * 两条命令都收「按 id」与「按日期／范围」两套定位口径——参数形状与回执逐字沿用原分派层。
 */
import type { DatabaseSync } from 'node:sqlite';
import { assertISO, fail, optNum, optStr, wday } from '../shared/params.js';
import { F, HARD_INNER, HARD_WORDING, R, deleteStatus, out } from '../shared/writeParts.js';
import type { WriteOut } from '../shared/commandSpec.js';
import { deleteWeight, deleteWeightByDate, deleteWeightRange, updateWeight, updateWeightByDate } from './records.js';

/** `calorie.weight.update` · 改体重记录（id 或 date 二选一）。 */
export function writeWeightUpdate(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const id = optNum(params, 'id');
  const date = wday(params, 'date');
  const kg = optNum(params, 'kg');
  const note = optStr(params, 'note');
  if (kg !== undefined && (!(kg > 0) || kg > 500)) fail(2, 'kg 须为 0..500');
  if (id !== undefined) {
    if (!Number.isInteger(id) || id <= 0) fail(2, 'id 须为正整数');
    const r = updateWeight(db, id, kg, note);
    const bmiTextU = r.bmi === null ? 'BMI 待补身高（补档案：calorie-cmd-read calorie.profile.set)' : 'BMI ' + r.bmi;
    return out(R('改体重记录', 'update', '已更新体重 #' + id + '：' + r.oldWeight + '→' + r.newWeight + ' kg（' + bmiTextU + '）', '改体重记录', 'weight_log (写库回执)', {
      recordId: id, ids: [id], writtenFields: [...(kg !== undefined ? ['kg'] : []), ...(note !== undefined ? ['note'] : [])],
      items: [{ id, status: '已更新', reason: '' }],
    }));
  }
  if (date !== undefined) {
    assertISO(date, 'date');
    const r = updateWeightByDate(db, date, kg, note);
    return out(R('改某日体重', 'update', '已更新 ' + date + ' 体重 ' + r.hitCount + ' 条', '改某日体重', 'weight_log (写库回执)', {
      ids: [], idSource: 'condition', writtenFields: [...(kg !== undefined ? ['kg'] : []), ...(note !== undefined ? ['note'] : [])],
    }));
  }
  fail(2, '缺参数 id 或 date（二选一）');
  throw new Error('unreachable');
}

/** `calorie.weight.remove` · 删体重记录（id／date／start+end 三选一，硬删除不可恢复）。 */
export function writeWeightRemove(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const id = optNum(params, 'id');
  const date = wday(params, 'date');
  const start = wday(params, 'start');
  const end = wday(params, 'end');
  if (id !== undefined) {
    if (!Number.isInteger(id) || id <= 0) fail(2, 'id 须为正整数');
    const r = deleteWeight(db, id);
    return out(R('删体重记录', 'delete', '已删除体重 #' + id + '（' + r.date + ' ' + r.weight_kg + ' kg · ' + HARD_INNER + '）', '删体重记录', 'weight_log (写库回执)', {
      recordId: id, ids: [id], writtenFields: [], items: [{ id, status: deleteStatus('hard'), reason: '' }],
    }));
  }
  if (date !== undefined) {
    assertISO(date, 'date');
    const r = deleteWeightByDate(db, date);
    return out(R('删某日体重', 'delete', '已删除 ' + date + ' 体重 ' + r.deletedCount + ' 条' + HARD_WORDING, '删某日体重', 'weight_log (写库回执)', { ids: [], idSource: 'condition', writtenFields: [] }));
  }
  if (start !== undefined || end !== undefined) {
    if (start === undefined || end === undefined) fail(2, '按范围删须同时传 start/end');
    assertISO(start as string, 'start');
    assertISO(end as string, 'end');
    if ((start as string) > (end as string)) fail(2, 'start 不得晚于 end');
    const r = deleteWeightRange(db, start as string, end as string);
    return out(R('批量删体重', 'delete', '已删除 ' + start + '~' + end + ' 体重 ' + r.deletedCount + ' 条' + HARD_WORDING, '批量删体重', 'weight_log (写库回执)', { ids: [], idSource: 'condition', writtenFields: [] }));
  }
  fail(2, '缺参数 id/date/start+end（三选一）');
  throw new Error('unreachable');
}
