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
import { m } from '../entries/index.js';

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
  if (Object.keys(fields).length === 0) fail(2, m('skill-calorie.diet-edit.c001'));
  if (typeof fields['date'] === 'string') assertISO(fields['date'] as string, 'date');
  const r = updateMeal(db, id, fields);
  const changedPhrase = r.changed.length ? r.changed.join('、') : m('skill-calorie.diet-edit.c002');
  return out(R(m('skill-calorie.diet-edit.c003'), 'update', m('skill-calorie.diet-edit.c004', { p0: String(id), p1: String(changedPhrase) }), m('skill-calorie.diet-edit.c005'), m('skill-calorie.diet-edit.c006'), {
    recordId: id, ids: [id], writtenFields: cliNames(Object.keys(fields)), noChange: r.changed.length === 0,
    items: [{ id, status: m('skill-calorie.diet-edit.c007'), reason: '', detail: r.changed.join(',') || m('skill-calorie.diet-edit.c008') }],
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
  if (Object.keys(fields).length === 0) fail(2, m('skill-calorie.diet-edit.c009'));
  const r = updateMealsByDate(db, date, fields);
  if (r.matched === 0) throw new CalorieRenderError('missing-data', '无饮食记录（' + date + '）');
  return out(R(m('skill-calorie.diet-edit.c010'), 'update', m('skill-calorie.diet-edit.c011', {
    p0: String(date),
    p1: String(r.updated),
    p2: String(r.changedFields.join('、')),
  }), m('skill-calorie.diet-edit.c012'), m('skill-calorie.diet-edit.c013'), {
    ids: [], idSource: 'condition', writtenFields: cliNames(r.changedFields),
  }));
}

/** `calorie.diet.remove` · 删饮食记录。 */
export function writeDietRemove(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const id = needId(params);
  const r = deleteMeal(db, id);
  return out(R(m('skill-calorie.diet-edit.c014'), 'delete', m('skill-calorie.diet-edit.c015', {
    p0: String(id),
    p1: String(r.food_name),
    p2: String(r.calories),
    p3: String(HARD_INNER),
  }), m('skill-calorie.diet-edit.c016'), m('skill-calorie.diet-edit.c017'), {
    recordId: id, ids: [id], writtenFields: [], items: [{ id, status: deleteStatus('hard'), reason: '', detail: r.food_name }],
  }));
}

/** `calorie.diet.remove-by-date` · 删某日饮食。 */
export function writeDietRemoveByDate(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const date = needWday(params, 'date');
  assertISO(date, 'date');
  const r = deleteMealsByDate(db, date);
  if (r.deleted === 0) throw new CalorieRenderError('missing-data', '无饮食记录（' + date + '）');
  return out(R(m('skill-calorie.diet-edit.c018'), 'delete', m('skill-calorie.diet-edit.c019', { p0: String(date), p1: String(r.deleted), p2: String(HARD_WORDING) }), m('skill-calorie.diet-edit.c020'), m('skill-calorie.diet-edit.c021'), { ids: [], idSource: 'condition', writtenFields: [] }));
}

/** `calorie.diet.remove-by-range` · 批量删饮食。 */
export function writeDietRemoveByRange(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const start = needWday(params, 'start');
  const end = needWday(params, 'end');
  assertISO(start, 'start');
  assertISO(end, 'end');
  if (start > end) fail(2, m('skill-calorie.diet-edit.c022'));
  const r = deleteMealsByRange(db, start, end);
  if (r.deleted === 0) throw new CalorieRenderError('missing-data', '无饮食记录（' + start + '~' + end + '）');
  return out(R(m('skill-calorie.diet-edit.c023'), 'delete', m('skill-calorie.diet-edit.c024', {
    p0: String(start),
    p1: String(end),
    p2: String(r.deleted),
    p3: String(HARD_WORDING),
  }), m('skill-calorie.diet-edit.c025'), m('skill-calorie.diet-edit.c026'), { ids: [], idSource: 'condition', writtenFields: [] }));
}

/** `calorie.diet.remove-by-type` · 删一餐。 */
export function writeDietRemoveByType(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const date = needWday(params, 'date');
  assertISO(date, 'date');
  const mealType = needStr(params, 'mealType');
  if (!Object.prototype.hasOwnProperty.call(MEAL_WINDOWS, mealType)) fail(2, m('skill-calorie.diet-edit.c027', { p0: String(Object.keys(MEAL_WINDOWS).join('/')), p1: String(mealType) }));
  const r = deleteMealsByType(db, date, mealType);
  if (r.deleted === 0) throw new CalorieRenderError('missing-data', date + ' 无' + mealType + '记录');
  return out(R(m('skill-calorie.diet-edit.c028'), 'delete', m('skill-calorie.diet-edit.c029', {
    p0: String(date),
    p1: String(mealType),
    p2: String(r.deleted),
    p3: String(HARD_WORDING),
  }), m('skill-calorie.diet-edit.c030'), m('skill-calorie.diet-edit.c031'), { ids: [], idSource: 'condition', writtenFields: [] }));
}
