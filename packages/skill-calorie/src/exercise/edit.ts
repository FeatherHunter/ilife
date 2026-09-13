/** 改运动（HELP 场景 04「运动」下一级 · 改运动）：`calorie.exercise.update` ＋ `calorie.exercise.remove`。
 *
 * #316 搬迁：两个处理函数逐字取自 `src/cli/write.ts` 的 `case 'calorie.exercise.update'`／
 * `case 'calorie.exercise.remove'` 分支（含文件内的 `EX_CAMEL` 字段表）——**纯搬迁，行为不变**。
 * 删除仍是**软删**（`exercise_log.is_deleted`，见 `src/cli/write.ts` 文件头那份口径）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { deleteDay, deleteRange, deleteRecord, updateDay, updateRecord } from '../fetch/exercise.js';
import { CalorieRenderError } from '../render/errors.js';
import { assertISO, fail, optNum, optStr, wday } from '../shared/params.js';
import { R, SOFT_EXCLUDED, cliNames, deleteStatus, out } from '../shared/writeParts.js';
import type { WriteOut } from '../shared/commandSpec.js';

const EX_CAMEL: Record<string, string> = {
  type: 'exercise_type', exerciseType: 'exercise_type', calories: 'calories_burned', caloriesBurned: 'calories_burned',
  minutes: 'duration_minutes', durationMinutes: 'duration_minutes', note: 'note', category: 'category', difficulty: 'difficulty',
  distance: 'distance_km', distanceKm: 'distance_km', heartRate: 'avg_heart_rate', avgHeartRate: 'avg_heart_rate',
  maxHeartRate: 'max_heart_rate', steps: 'steps', reps: 'reps', loadKg: 'load_kg', setIndex: 'set_index',
  date: 'date', time: 'time', backfill: 'is_backfill', isBackfill: 'is_backfill',
};

/** `calorie.exercise.update` · 改运动：按 `id` 改一条，或按 `date` 改某日（二选一）。 */
export function writeExerciseUpdate(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const id = optNum(params, 'id');
  const date = wday(params, 'date');
  const fields: Record<string, unknown> = {};
  for (const [camel, col] of Object.entries(EX_CAMEL)) {
    if (camel === 'type' || camel === 'exerciseType' || camel === 'calories' || camel === 'caloriesBurned') continue;
    if (params[camel] !== undefined) fields[col] = params[camel];
  }
  const t = optStr(params, 'type') ?? optStr(params, 'exerciseType');
  if (t !== undefined) {
    if (!t.trim()) fail(2, 'type 不得为空');
    fields['exercise_type'] = t.trim();
  }
  const cal = optNum(params, 'calories') ?? optNum(params, 'caloriesBurned');
  if (cal !== undefined) {
    if (cal < 0) fail(2, 'calories 不得为负');
    fields['calories_burned'] = cal;
  }
  for (const k of Object.keys(params)) {
    if (!(k in EX_CAMEL) && k !== 'id' && k !== 'key') fail(2, '不支持字段: ' + k);
  }
  if (Object.keys(fields).length === 0) fail(2, '至少传 1 个待改字段');
  if (typeof fields['date'] === 'string') assertISO(fields['date'] as string, 'date');
  if (id !== undefined) {
    if (!Number.isInteger(id) || id <= 0) fail(2, 'id 须为正整数');
    updateRecord(db, id, fields);
    return out(R('改运动记录', 'update', '已更新运动 #' + id + '（' + Object.keys(fields).join('、') + '）', '改运动记录', 'exercise_log (写库回执)', {
      recordId: id, ids: [id], writtenFields: cliNames(Object.keys(fields)),
      items: [{ id, status: '已更新', reason: '' }],
    }));
  }
  if (date !== undefined) {
    assertISO(date, 'date');
    const r = updateDay(db, date, fields);
    if (r.matched === 0) throw new CalorieRenderError('missing-data', '无运动记录（' + date + '）');
    return out(R('改某日运动', 'update', '已更新 ' + date + ' 运动 ' + r.matched + ' 条', '改某日运动', 'exercise_log (写库回执)', {
      ids: [], idSource: 'condition', writtenFields: cliNames(Object.keys(fields)),
    }));
  }
  fail(2, '缺参数 id 或 date（二选一）');
  throw new Error('unreachable');
}

/** `calorie.exercise.remove` · 删运动：按 `id`／`date`／`from`＋`to` 三选一，一律软删。 */
export function writeExerciseRemove(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const id = optNum(params, 'id');
  const date = wday(params, 'date');
  const from = wday(params, 'from');
  const to = wday(params, 'to');
  if (id !== undefined) {
    if (!Number.isInteger(id) || id <= 0) fail(2, 'id 须为正整数');
    deleteRecord(db, id);
    return out(R('删运动记录', 'delete', '已删除运动 #' + id + SOFT_EXCLUDED, '删运动记录', 'exercise_log (写库回执)', {
      recordId: id, ids: [id], writtenFields: ['is_deleted'], items: [{ id, status: deleteStatus('soft'), reason: '' }],
    }));
  }
  if (date !== undefined) {
    assertISO(date, 'date');
    const n = deleteDay(db, date);
    if (n === 0) throw new CalorieRenderError('missing-data', '无运动记录（' + date + '）');
    return out(R('删某日运动', 'delete', '已删除 ' + date + ' 运动 ' + n + ' 条' + SOFT_EXCLUDED, '删某日运动', 'exercise_log (写库回执)', { ids: [], idSource: 'condition', writtenFields: ['is_deleted'] }));
  }
  if (from !== undefined || to !== undefined) {
    if (from === undefined || to === undefined) fail(2, '按范围删须同时传 from/to');
    assertISO(from as string, 'from');
    assertISO(to as string, 'to');
    if ((from as string) > (to as string)) fail(2, 'from 不得晚于 to');
    const n = deleteRange(db, from as string, to as string);
    if (n === 0) throw new CalorieRenderError('missing-data', '无运动记录（' + from + '~' + to + '）');
    return out(R('批量删运动', 'delete', '已删除 ' + from + '~' + to + ' 运动 ' + n + ' 条' + SOFT_EXCLUDED, '批量删运动', 'exercise_log (写库回执)', { ids: [], idSource: 'condition', writtenFields: ['is_deleted'] }));
  }
  fail(2, '缺参数 id/date/from+to（三选一）');
  throw new Error('unreachable');
}
