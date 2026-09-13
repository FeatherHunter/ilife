/** 饮食能力的子功能「改饮食」（HELP 场景 02「饮食」下一级 diet_2）：改饮食／改某日饮食／删饮食／删一餐／批量删饮食。
 *
 * #315 纯搬迁：六个处理体**逐字搬自** `src/cli/write.ts` 的对应 `case`（语义不动，只换住处）。
 * 取数走 `fetch/diet.ts` 的公开接口，删除措辞与回执底座走共用位 `shared/writeParts.ts`
 * （**不得承诺可恢复**的口径只住那一处）。
 * 六条声明住 `./commands.ts`；对外只经 `./index.ts`。
 */
import type { DatabaseSync } from 'node:sqlite';
import {
  MEAL_WINDOWS, deleteMeal, deleteMealsByDate, deleteMealsByRange, deleteMealsByType,
  updateMeal, updateMealsByDate,
} from '../fetch/diet.js';
import { CalorieRenderError } from '../render/errors.js';
import type { WriteOut } from '../shared/commandSpec.js';
import { assertISO, fail, needId, needStr, needWday, optNum, optStr } from '../shared/params.js';
import { HARD_INNER, HARD_WORDING, R, cliNames, deleteStatus, out } from '../shared/writeParts.js';

/** `calorie.diet.update` · 改饮食。 */
export function writeDietUpdate(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const id = needId(params);
  const fields: Record<string, unknown> = {};
  const name = optStr(params, 'foodName') ?? optStr(params, 'food_name');
  if (name !== undefined) fields['food_name'] = name;
  for (const k of ['grams', 'calories', 'protein', 'carbs', 'fat'] as const) {
    const v = optNum(params, k);
    if (v !== undefined) fields[k] = v;
  }
  for (const k of ['note', 'date', 'time'] as const) {
    const v = optStr(params, k);
    if (v !== undefined) fields[k] = v;
  }
  if (Object.keys(fields).length === 0) fail(2, '至少传 1 个待改字段');
  if (typeof fields['date'] === 'string') assertISO(fields['date'] as string, 'date');
  const r = updateMeal(db, id, fields);
  return out(R('改饮食记录', 'update', '已更新饮食 #' + id + '（' + (r.changed.length ? r.changed.join('、') : '无实际变化') + '）', '改饮食记录', 'food_log (写库回执)', {
    recordId: id, ids: [id], writtenFields: cliNames(Object.keys(fields)), noChange: r.changed.length === 0,
    items: [{ id, status: '已更新', reason: '', detail: r.changed.join(',') || '无变化' }],
  }));
}

/** `calorie.diet.update-by-date` · 改某日饮食。 */
export function writeDietUpdateByDate(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const date = needWday(params, 'date');
  assertISO(date, 'date');
  const fields: Record<string, unknown> = {};
  const name = optStr(params, 'foodName') ?? optStr(params, 'food_name');
  if (name !== undefined) fields['food_name'] = name;
  for (const k of ['grams', 'calories', 'protein', 'carbs', 'fat', 'note', 'time'] as const) {
    const v = k === 'note' || k === 'time' ? optStr(params, k) : optNum(params, k);
    if (v !== undefined) fields[k] = v;
  }
  if (Object.keys(fields).length === 0) fail(2, '至少传 1 个待改字段');
  const r = updateMealsByDate(db, date, fields);
  if (r.matched === 0) throw new CalorieRenderError('missing-data', '无饮食记录（' + date + '）');
  return out(R('改某日饮食', 'update', '已更新 ' + date + ' 饮食 ' + r.updated + ' 条（' + r.changedFields.join('、') + '）', '改某日饮食', 'food_log (写库回执)', {
    ids: [], idSource: 'condition', writtenFields: cliNames(r.changedFields),
  }));
}

/** `calorie.diet.remove` · 删饮食记录。 */
export function writeDietRemove(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const id = needId(params);
  const r = deleteMeal(db, id);
  return out(R('删饮食记录', 'delete', '已删除饮食 #' + id + '（' + r.food_name + ' ' + r.calories + ' 卡 · ' + HARD_INNER + '）', '删饮食记录', 'food_log (写库回执)', {
    recordId: id, ids: [id], writtenFields: [], items: [{ id, status: deleteStatus('hard'), reason: '', detail: r.food_name }],
  }));
}

/** `calorie.diet.remove-by-date` · 删某日饮食。 */
export function writeDietRemoveByDate(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const date = needWday(params, 'date');
  assertISO(date, 'date');
  const r = deleteMealsByDate(db, date);
  if (r.deleted === 0) throw new CalorieRenderError('missing-data', '无饮食记录（' + date + '）');
  return out(R('删某日饮食', 'delete', '已删除 ' + date + ' 饮食 ' + r.deleted + ' 条' + HARD_WORDING, '删某日饮食', 'food_log (写库回执)', { ids: [], idSource: 'condition', writtenFields: [] }));
}

/** `calorie.diet.remove-by-range` · 批量删饮食。 */
export function writeDietRemoveByRange(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const start = needWday(params, 'start');
  const end = needWday(params, 'end');
  assertISO(start, 'start');
  assertISO(end, 'end');
  if (start > end) fail(2, 'start 不得晚于 end');
  const r = deleteMealsByRange(db, start, end);
  if (r.deleted === 0) throw new CalorieRenderError('missing-data', '无饮食记录（' + start + '~' + end + '）');
  return out(R('批量删饮食', 'delete', '已删除 ' + start + '~' + end + ' 饮食 ' + r.deleted + ' 条' + HARD_WORDING, '批量删饮食', 'food_log (写库回执)', { ids: [], idSource: 'condition', writtenFields: [] }));
}

/** `calorie.diet.remove-by-type` · 删一餐。 */
export function writeDietRemoveByType(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const date = needWday(params, 'date');
  assertISO(date, 'date');
  const mealType = needStr(params, 'mealType');
  if (!Object.prototype.hasOwnProperty.call(MEAL_WINDOWS, mealType)) fail(2, 'mealType 须为 ' + Object.keys(MEAL_WINDOWS).join('/') + '：' + mealType);
  const r = deleteMealsByType(db, date, mealType);
  if (r.deleted === 0) throw new CalorieRenderError('missing-data', date + ' 无' + mealType + '记录');
  return out(R('删一餐', 'delete', '已删除 ' + date + ' ' + mealType + ' ' + r.deleted + ' 条' + HARD_WORDING, '删一餐', 'food_log (写库回执)', { ids: [], idSource: 'condition', writtenFields: [] }));
}
