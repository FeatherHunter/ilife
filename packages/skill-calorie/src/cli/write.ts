/** #40 · 卡路里写键分发（单条 CRUD 可执行链）：唯一出口 cmd_read 的写分支（memo.create/update/remove 范式）。
 *
 * 35 写键一律 receipt 形：先调现行 fetch 层库函数写库，再用 render/receipt.ts（T10）
 * buildCrudReceipt（照片键用 render/photo.ts 三回执）组装回执；envelope 数据为
 * { ok: true, message, receipt }（ok/message 过 envelope 全字段，receipt carry T10 形状）。
 * 本文件不写 render/ 新视图、不碰 envelope 键表（#41 边界）；HTML 为 dispatch 内联
 * receipt 小节（沿 cmd_read history/help 内联先例，不新增模板）。
 * 退出码沿 T11 冻结：缺参/坏参 fail(2)；未知键上游拦（exit 3）；缺失阻断 fail(4)；
 * envelope/落盘 fail(5)。库函数 FetchError 透传（main 映射 exit 4）；body.ts
 * ValidationError 在此转 bad-input（exit 2）。
 *
 * #101 · 删除可恢复性口径（逐条删除回执必须自曝可恢复性，不得只写「已删除」）：
 * - 软删除（行保留、可恢复）：`exercise_log.is_deleted`／`body_composition.is_deprecated`／
 *   `body_measurements.is_deprecated`／`nutrition_products.is_deprecated` → 「（软删除，可恢复）」
 * - 硬删除（行删除、不可恢复）：`food_log`／`weight_log`／`body_photos`（`DELETE FROM`）→ 「（硬删除，不可恢复）」
 * 依据：fetch 层 delete* 实测（`fetch/exercise.ts:216-238` 软删／`fetch/diet.ts:153-161` 硬删／
 * `fetch/weight.ts:148-178` 硬删／`fetch/body.ts:144-148,207-211` 软删）＋ 审计
 * `docs/research/t67-key-audit.md:246`。照片键文案在 `render/photo.ts:buildDeleteReceipt`。
 */
import type { DatabaseSync } from 'node:sqlite';
import {
  WATER_NAME, MEALS, MEAL_WINDOWS, addMeal, updateMeal, deleteMeal, copyMeals, addMealsBatch,
  updateMealsByDate, deleteMealsByDate, deleteMealsByRange, deleteMealsByType, getDailySummary,
} from '../fetch/diet.js';
import {
  logWeight, updateWeight, updateWeightByDate, deleteWeight, deleteWeightByDate, deleteWeightRange, batchLogWeight,
} from '../fetch/weight.js';
import { addRecord, updateRecord, updateDay, deleteRecord, deleteDay, deleteRange, batchAdd, copyYesterday } from '../fetch/exercise.js';
import type { ExerciseRecordInput } from '../fetch/exercise.js';
import {
  addPhotos, deletePhoto, updateTag, tagAdd, tagRemove, getPhotoRow, resolvePhotosDir, daysSinceTagPhoto,
  parseTags, serializeTags,
} from '../fetch/photos.js';
import { buildAddReceipt, buildDeleteReceipt, buildTagReceipt } from '../render/photo.js';
import { addProduct, updateProduct, deprecateProduct } from '../fetch/products.js';
import { getProfile, setActivityLevel, updateProfile } from '../fetch/profile.js';
import { getNutritionGoal, setNutritionGoal, updateWaterGoal } from '../fetch/nutritionGoal.js';
import { pauseAllGoals, resumeAllGoals, setWeightGoal } from '../fetch/goal.js';
import {
  CALIPER_FIELDS, MEASUREMENT_FIELDS, ValidationError, addComposition, addMeasurement,
  deleteComposition, deleteMeasurement,
} from '../fetch/body.js';
import { SOURCE_CHOICES, SOURCE_LABELS } from '../kcal.js';
import type { SourceChoice } from '../kcal.js';
import { buildCrudReceipt } from '../render/receipt.js';
import type { CrudReceipt } from '../render/receipt.js';
import { CalorieRenderError } from '../render/errors.js';
import { shiftISODate, todayISO } from '../analysis/utils.js';
import { isCalorieWriteKey } from './keys.js';

export type WriteOut = { data: { ok: boolean; message: string; receipt: CrudReceipt }; html: string };

function fail(code: number, msg: string): never {
  console.error('ERR ' + code + ': ' + msg);
  process.exit(code);
}

function needStr(params: Record<string, unknown>, name: string): string {
  const v = params[name];
  if (typeof v !== 'string' || v.length === 0) fail(2, '缺参数 ' + name);
  return v as string;
}

function optStr(params: Record<string, unknown>, name: string): string | undefined {
  const v = params[name];
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'string') fail(2, '参数 ' + name + ' 须为字符串');
  return v as string;
}

function needNum(params: Record<string, unknown>, name: string): number {
  const v = params[name];
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(2, '缺参数 ' + name + '（须为有限 number）');
  return v as number;
}

function optNum(params: Record<string, unknown>, name: string): number | undefined {
  const v = params[name];
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(2, '参数 ' + name + ' 须为有限 number');
  return v as number;
}

function optInt(params: Record<string, unknown>, name: string): number | undefined {
  const v = optNum(params, name);
  if (v === undefined) return undefined;
  if (!Number.isInteger(v)) fail(2, '参数 ' + name + ' 须为整数');
  return v as number;
}

function needId(params: Record<string, unknown>, name = 'id'): number {
  const v = params[name];
  if (typeof v !== 'number' || !Number.isInteger(v) || (v as number) <= 0) fail(2, '缺参数 ' + name + '（正整数记录 id）');
  return v as number;
}

function needArr(params: Record<string, unknown>, name: string): unknown[] {
  const v = params[name];
  if (!Array.isArray(v) || v.length === 0) fail(2, '缺参数 ' + name + '（非空数组）');
  return v as unknown[];
}

function assertISO(v: string, field: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) fail(2, field + ' 非法（须 YYYY-MM-DD）：' + v);
}

function esc(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** C6 #43 · 写收据 HTML 结构化分项：摘要 + 操作元 + items 逐条（id/日期/状态/原因/明细）。 */
function receiptHtml(scene: string, summary: string, op: string, recordId: number | null, items?: CrudReceipt['items']): string {
  const list = (items ?? []).length > 0
    ? '<ul>' + (items ?? []).map((it) => '<li>#' + esc(it.id ?? '') + (it.date ? ' ' + esc(it.date) : '') + ' ' + esc(it.status) + (it.reason ? '（' + esc(it.reason) + '）' : '') + (it.detail ? ' · ' + esc(it.detail) : '') + '</li>').join('') + '</ul>'
    : '';
  return '<section class="ilife-page" data-skill="calorie" data-slot="ilife:calorie:receipt"><h1>' + esc(scene) + '</h1>' +
    '<div class="ilife-item"><b>' + esc(summary) + '</b><div>op=' + esc(op) + (recordId === null ? '' : ' · id=' + esc(recordId)) + '</div>' + list + '</div></section>';
}

function out(receipt: CrudReceipt): WriteOut {
  return {
    data: { ok: true, message: receipt.summary, receipt },
    html: receiptHtml(receipt.scene, receipt.summary, receipt.op, receipt.recordId, receipt.items),
  };
}

const R = (
  scene: string, op: CrudReceipt['op'], summary: string, wakeWord: string, source: string,
  extra?: Partial<Pick<CrudReceipt, 'recordId' | 'items' | 'tagDiff' | 'distance' | 'noChange' | 'action'>>,
): CrudReceipt =>
  buildCrudReceipt({
    scene, action: scene, op, recordId: null, summary, items: [], wakeWord, source,
    ...(extra ?? {}),
  });

function photosDirOf(params: Record<string, unknown>): string {
  return resolvePhotosDir(optStr(params, 'photosDir') ?? null);
}

const SOURCE_ALIASES: Record<string, SourceChoice> = { '家测皮褶钳': 'home_caliper', '医院测': 'hospital', '健身房测': 'gym', '健身房': 'gym', '医院': 'hospital', '皮褶钳': 'home_caliper' };

function normSource(v: unknown): SourceChoice {
  const s = String(v ?? '').trim();
  if ((SOURCE_CHOICES as readonly string[]).includes(s)) return s as SourceChoice;
  const hit = SOURCE_ALIASES[s];
  if (hit) return hit;
  fail(2, '缺参数 source（' + SOURCE_CHOICES.join('/') + ' 或中文 ' + Object.keys(SOURCE_ALIASES).join('/') + '）');
  throw new Error('unreachable');
}

function normSex(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  if (s === 'male' || s === 'female') return s;
  if (s === '男') return 'male';
  if (s === '女') return 'female';
  fail(2, '参数 sex 非法（male/female 或 男/女）：' + s);
  throw new Error('unreachable');
}

const MEASURE_CAMEL: Record<string, string> = {
  chestCm: 'chest_cm', waistCm: 'waist_cm', abdomenCm: 'abdomen_cm', hipCm: 'hip_cm', shoulderCm: 'shoulder_cm',
  leftThighCm: 'left_thigh_cm', rightThighCm: 'right_thigh_cm', leftCalfCm: 'left_calf_cm', rightCalfCm: 'right_calf_cm',
  leftArmCm: 'left_arm_cm', rightArmCm: 'right_arm_cm', leftForearmCm: 'left_forearm_cm', rightForearmCm: 'right_forearm_cm',
};

const EX_CAMEL: Record<string, string> = {
  type: 'exercise_type', exerciseType: 'exercise_type', calories: 'calories_burned', caloriesBurned: 'calories_burned',
  minutes: 'duration_minutes', durationMinutes: 'duration_minutes', note: 'note', category: 'category', difficulty: 'difficulty',
  distance: 'distance_km', distanceKm: 'distance_km', heartRate: 'avg_heart_rate', avgHeartRate: 'avg_heart_rate',
  maxHeartRate: 'max_heart_rate', steps: 'steps', reps: 'reps', loadKg: 'load_kg', setIndex: 'set_index',
  date: 'date', time: 'time', backfill: 'is_backfill', isBackfill: 'is_backfill',
};

function oneExercise(item: Record<string, unknown>, i: string): ExerciseRecordInput {
  const g = (k: string): unknown => item[k];
  const type = g('type') ?? g('exerciseType');
  if (typeof type !== 'string' || !type.trim()) fail(2, '运动 type 必填' + i);
  const cal = g('calories') ?? g('caloriesBurned');
  if (typeof cal !== 'number' || !Number.isFinite(cal) || cal < 0) fail(2, '运动 calories 必填（≥0 number）' + i);
  const date = (g('date') as string | undefined) ?? todayISO();
  assertISO(date, 'date');
  const numOrNull = (k: string): number | null | undefined => {
    const v = g(k);
    if (v === undefined || v === null) return undefined;
    if (typeof v !== 'number' || !Number.isFinite(v)) fail(2, '运动参数 ' + k + ' 须为 number' + i);
    return v as number;
  };
  const strOrUndef = (k: string): string | undefined => {
    const v = g(k);
    if (v === undefined || v === null) return undefined;
    if (typeof v !== 'string') fail(2, '运动参数 ' + k + ' 须为字符串' + i);
    return v as string;
  };
  return {
    date, exerciseType: (type as string).trim(), caloriesBurned: cal as number,
    minutes: numOrNull('minutes') ?? null, timeStr: strOrUndef('time'), note: strOrUndef('note'),
    reps: numOrNull('reps') ?? null, category: strOrUndef('category') ?? null,
    difficulty: strOrUndef('difficulty') ?? null, distance: numOrNull('distance') ?? numOrNull('distanceKm') ?? null,
    heartRate: numOrNull('heartRate') ?? numOrNull('avgHeartRate') ?? null,
    maxHeartRate: numOrNull('maxHeartRate') ?? null, steps: numOrNull('steps') ?? null,
    setIndex: numOrNull('setIndex') ?? null, loadKg: numOrNull('loadKg') ?? null,
    isBackfill: (g('backfill') ?? g('isBackfill')) === true,
  };
}

/** 写分发（唯一出口 cmd_read 内调用；未知键上游已拦，此处再拦一道）。 */
export function dispatchWrite(key: string, params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  if (!isCalorieWriteKey(key)) fail(3, '未知 calorie 写键：' + key);
  try {
    return dispatchInner(key, params, db);
  } catch (e) {
    if (e instanceof ValidationError) throw new CalorieRenderError('bad-input', e.message);
    throw e;
  }
}

function dispatchInner(key: string, params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  switch (key) {
    case 'calorie.diet.add': {
      const foodName = (optStr(params, 'foodName') ?? optStr(params, 'food_name') ?? '');
      if (!foodName.trim()) fail(2, '缺参数 foodName');
      const calories = needNum(params, 'calories');
      const protein = needNum(params, 'protein');
      for (const [k, v] of [['calories', calories], ['protein', protein]] as const) {
        if (v < 0) fail(2, k + ' 不能为负');
      }
      for (const k of ['carbs', 'fat'] as const) {
        const v = optNum(params, k);
        if (v !== undefined && v < 0) fail(2, k + ' 不能为负');
      }
      const grams0 = optNum(params, 'grams');
      if (grams0 !== undefined && grams0 <= 0) fail(2, 'grams 必须为正');
      const date = optStr(params, 'date');
      if (date) assertISO(date, 'date');
      const meal = optStr(params, 'meal') ?? optStr(params, 'mealOverride');
      if (meal !== undefined && !(MEALS as readonly string[]).includes(meal)) fail(2, '--meal 须为 ' + MEALS.join('、'));
      const r = addMeal(db, {
        foodName: foodName.trim(), calories, protein,
        carbs: optNum(params, 'carbs') ?? 0, fat: optNum(params, 'fat') ?? 0,
        grams: optNum(params, 'grams') ?? 100, note: optStr(params, 'note'),
        date, time: optStr(params, 'time'), mealOverride: meal,
      });
      if (r.duplicate) {
        return out(R('记一餐', 'create', String(r.message ?? '重复记录已跳过'), '记一餐', 'food_log (写库回执)', {
          recordId: r.dupId ?? null, noChange: true,
        }));
      }
      const remain = r.remainingCal === null || r.remainingCal === undefined ? '' : ' · 今日剩 ' + r.remainingCal + ' 卡';
      return out(R('记一餐', 'create', '已记一餐：' + r.food_name + ' ' + r.date + ' ' + r.time + '（' + r.meal + '）' + remain, '记一餐', 'food_log (写库回执)', {
        recordId: r.id, items: [{ id: r.id ?? undefined, date: r.date, status: '成功', reason: '', detail: r.food_name }],
      }));
    }
    case 'calorie.diet.update': {
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
        recordId: id, noChange: r.changed.length === 0,
        items: [{ id, status: '已更新', reason: '', detail: r.changed.join(',') || '无变化' }],
      }));
    }
    case 'calorie.diet.remove': {
      const id = needId(params);
      const r = deleteMeal(db, id);
      return out(R('删饮食记录', 'delete', '已删除饮食 #' + id + '（' + r.food_name + ' ' + r.calories + ' 卡 · 硬删除，不可恢复）', '删饮食记录', 'food_log (写库回执)', {
        recordId: id, items: [{ id, status: '已删除', reason: '', detail: r.food_name }],
      }));
    }
    case 'calorie.diet.batch': {
      const items = needArr(params, 'items');
      if (items.length > 200) fail(2, 'items 至多 200 条');
      const r = addMealsBatch(db, items.map((e) => {
        const o = (e ?? {}) as Record<string, unknown>;
        const food = o['foodName'] ?? o['food_name'];
        return {
          date: o['date'] === undefined ? undefined : String(o['date']),
          time: o['time'] === undefined ? undefined : String(o['time']),
          food_name: food === undefined ? undefined : String(food),
          grams: o['grams'] as number | undefined, calories: o['calories'] as number | undefined,
          protein: o['protein'] as number | undefined, carbs: o['carbs'] as number | undefined,
          fat: o['fat'] as number | undefined, note: o['note'] === undefined ? undefined : String(o['note']),
        };
      }));
      return out(R('批量补记饮食', 'create', '批量记饮食：新增 ' + r.added + '，跳过 ' + r.skipped + '，失败 ' + r.failed, '批量补记饮食', 'food_log (写库回执)', {
        noChange: r.added === 0,
        items: r.failures.slice(0, 20).map(([idx, reason]) => ({ status: '失败', reason, detail: '第' + idx + '条' })),
      }));
    }
    case 'calorie.diet.copy': {
      const today = todayISO();
      const from = optStr(params, 'from') ?? optStr(params, 'fromDate') ?? shiftISODate(today, -1);
      const to = optStr(params, 'to') ?? optStr(params, 'toDate') ?? today;
      assertISO(from, 'from');
      assertISO(to, 'to');
      const r = copyMeals(db, from, to);
      if (r.copied + r.skipped === 0) throw new CalorieRenderError('missing-data', '来源无饮食记录（' + from + '）');
      return out(R('复制昨日饮食', 'create', '已复制饮食 ' + from + '→' + to + '：复制 ' + r.copied + '，跳过 ' + r.skipped, '复制昨日饮食', 'food_log (写库回执)', {
        noChange: r.copied === 0,
      }));
    }
    case 'calorie.diet.update-by-date': {
      const date = needStr(params, 'date');
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
      return out(R('改某日饮食', 'update', '已更新 ' + date + ' 饮食 ' + r.updated + ' 条（' + r.changedFields.join('、') + '）', '改某日饮食', 'food_log (写库回执)', {}));
    }
    case 'calorie.diet.remove-by-date': {
      const date = needStr(params, 'date');
      assertISO(date, 'date');
      const r = deleteMealsByDate(db, date);
      if (r.deleted === 0) throw new CalorieRenderError('missing-data', '无饮食记录（' + date + '）');
      return out(R('删某日饮食', 'delete', '已删除 ' + date + ' 饮食 ' + r.deleted + ' 条（硬删除，不可恢复）', '删某日饮食', 'food_log (写库回执)', {}));
    }
    case 'calorie.diet.remove-by-range': {
      const start = needStr(params, 'start');
      const end = needStr(params, 'end');
      assertISO(start, 'start');
      assertISO(end, 'end');
      if (start > end) fail(2, 'start 不得晚于 end');
      const r = deleteMealsByRange(db, start, end);
      if (r.deleted === 0) throw new CalorieRenderError('missing-data', '无饮食记录（' + start + '~' + end + '）');
      return out(R('批量删饮食', 'delete', '已删除 ' + start + '~' + end + ' 饮食 ' + r.deleted + ' 条（硬删除，不可恢复）', '批量删饮食', 'food_log (写库回执)', {}));
    }
    case 'calorie.diet.remove-by-type': {
      const date = needStr(params, 'date');
      assertISO(date, 'date');
      const mealType = needStr(params, 'mealType');
      if (!Object.prototype.hasOwnProperty.call(MEAL_WINDOWS, mealType)) fail(2, 'mealType 须为 ' + Object.keys(MEAL_WINDOWS).join('/') + '：' + mealType);
      const r = deleteMealsByType(db, date, mealType);
      if (r.deleted === 0) throw new CalorieRenderError('missing-data', date + ' 无' + mealType + '记录');
      return out(R('删一餐', 'delete', '已删除 ' + date + ' ' + mealType + ' ' + r.deleted + ' 条（硬删除，不可恢复）', '删一餐', 'food_log (写库回执)', {}));
    }
    case 'calorie.water.log': {
      const ml = needNum(params, 'ml');
      if (!(ml > 0) || ml > 10000) fail(2, 'ml 须为 0..10000 毫升');
      const date = optStr(params, 'date');
      if (date) assertISO(date, 'date');
      const r = addMeal(db, {
        foodName: WATER_NAME, calories: 0, protein: 0, grams: ml,
        note: optStr(params, 'note'), date, time: optStr(params, 'time'),
      });
      if (r.duplicate) {
        return out(R('记喝水', 'create', String(r.message ?? '重复记录已跳过'), '记喝水', 'food_log (写库回执)', { noChange: true }));
      }
      const day = date ?? todayISO();
      const sum = getDailySummary(db, day);
      return out(R('记喝水', 'create', '已记喝水 ' + ml + ' ml（' + day + ' 累计 ' + sum.waterMl + ' ml）', '记喝水', 'food_log (写库回执)', {
        recordId: r.id,
        items: [{ id: r.id ?? undefined, date: r.date, status: '成功', reason: '', detail: ml + 'ml' }],
      }));
    }
    case 'calorie.weight.log': {
      const kg = needNum(params, 'kg');
      if (!(kg > 0) || kg > 500) fail(2, 'kg 须为 0..500');
      const date = optStr(params, 'date');
      if (date) assertISO(date, 'date');
      const r = logWeight(db, kg, optStr(params, 'note') ?? '', date, optStr(params, 'time'));
      const bmiText = r.bmi === null ? 'BMI 待补身高（补档案：calorie-cmd-read calorie.profile.set)' : 'BMI ' + r.bmi;
      return out(R('记体重', 'create', '已记体重 ' + r.kg + ' kg（' + bmiText + ' · ' + r.date + ' ' + r.time + '）', '记体重', 'weight_log (写库回执)', {
        recordId: r.id, items: [{ id: r.id, date: r.date, status: '成功', reason: '', detail: r.kg + 'kg' }],
      }));
    }
    case 'calorie.weight.update': {
      const id = optNum(params, 'id');
      const date = optStr(params, 'date');
      const kg = optNum(params, 'kg');
      const note = optStr(params, 'note');
      if (kg !== undefined && (!(kg > 0) || kg > 500)) fail(2, 'kg 须为 0..500');
      if (id !== undefined) {
        if (!Number.isInteger(id) || id <= 0) fail(2, 'id 须为正整数');
        const r = updateWeight(db, id, kg, note);
        const bmiTextU = r.bmi === null ? 'BMI 待补身高（补档案：calorie-cmd-read calorie.profile.set)' : 'BMI ' + r.bmi;
        return out(R('改体重记录', 'update', '已更新体重 #' + id + '：' + r.oldWeight + '→' + r.newWeight + ' kg（' + bmiTextU + '）', '改体重记录', 'weight_log (写库回执)', {
          recordId: id, items: [{ id, status: '已更新', reason: '' }],
        }));
      }
      if (date !== undefined) {
        assertISO(date, 'date');
        const r = updateWeightByDate(db, date, kg, note);
        return out(R('改某日体重', 'update', '已更新 ' + date + ' 体重 ' + r.hitCount + ' 条', '改某日体重', 'weight_log (写库回执)', {}));
      }
      fail(2, '缺参数 id 或 date（二选一）');
      throw new Error('unreachable');
    }
    case 'calorie.weight.remove': {
      const id = optNum(params, 'id');
      const date = optStr(params, 'date');
      const start = optStr(params, 'start');
      const end = optStr(params, 'end');
      if (id !== undefined) {
        if (!Number.isInteger(id) || id <= 0) fail(2, 'id 须为正整数');
        const r = deleteWeight(db, id);
        return out(R('删体重记录', 'delete', '已删除体重 #' + id + '（' + r.date + ' ' + r.weight_kg + ' kg · 硬删除，不可恢复）', '删体重记录', 'weight_log (写库回执)', {
          recordId: id, items: [{ id, status: '已删除', reason: '' }],
        }));
      }
      if (date !== undefined) {
        assertISO(date, 'date');
        const r = deleteWeightByDate(db, date);
        return out(R('删某日体重', 'delete', '已删除 ' + date + ' 体重 ' + r.deletedCount + ' 条（硬删除，不可恢复）', '删某日体重', 'weight_log (写库回执)', {}));
      }
      if (start !== undefined || end !== undefined) {
        if (start === undefined || end === undefined) fail(2, '按范围删须同时传 start/end');
        assertISO(start as string, 'start');
        assertISO(end as string, 'end');
        if ((start as string) > (end as string)) fail(2, 'start 不得晚于 end');
        const r = deleteWeightRange(db, start as string, end as string);
        return out(R('批量删体重', 'delete', '已删除 ' + start + '~' + end + ' 体重 ' + r.deletedCount + ' 条（硬删除，不可恢复）', '批量删体重', 'weight_log (写库回执)', {}));
      }
      fail(2, '缺参数 id/date/start+end（三选一）');
      throw new Error('unreachable');
    }
    case 'calorie.weight.batch': {
      const items = needArr(params, 'items');
      if (items.length > 365) fail(2, 'items 至多 365 条');
      const r = batchLogWeight(db, items.map((e) => {
        const o = (e ?? {}) as Record<string, unknown>;
        return { date: o['date'] === undefined ? undefined : String(o['date']), kg: o['kg'] as number | undefined };
      }));
      return out(R('批量补录体重', 'create', '批量记体重：写入 ' + r.wrote + '，跳过 ' + r.skipped + '，失败 ' + r.failed, '批量补录体重', 'weight_log (写库回执)', {
        noChange: r.wrote === 0,
        items: r.items.filter((x) => x.status === '失败').slice(0, 20).map((x) => ({ status: '失败', reason: x.reason, detail: String(x.date) })),
      }));
    }
    case 'calorie.exercise.add': {
      if (params['copyFrom'] !== undefined) {
        if (params['copyFrom'] !== 'yesterday') fail(2, 'copyFrom 只支持 yesterday');
        const target = optStr(params, 'date') ?? optStr(params, 'targetDate') ?? todayISO();
        assertISO(target, 'date');
        const r = copyYesterday(db, target);
        if (r.copied + r.skipped === 0) throw new CalorieRenderError('missing-data', '昨日无运动记录可复制');
        return out(R('复制昨日运动', 'create', '已复制昨日运动→' + target + '：复制 ' + r.copied + '，跳过 ' + r.skipped, '复制昨日运动', 'exercise_log (写库回执)', {
          noChange: r.copied === 0,
        }));
      }
      if (params['items'] !== undefined) {
        const items = needArr(params, 'items');
        if (items.length > 200) fail(2, 'items 至多 200 条');
        const r = batchAdd(db, items.map((e, i) => oneExercise((e ?? {}) as Record<string, unknown>, '（第' + i + '条）')));
        return out(R('记运动', 'create', '批量记运动：新增 ' + r.added + ' 条', '批量补记运动', 'exercise_log (写库回执)', {
          recordId: r.ids[0] ?? null,
        }));
      }
      const input = oneExercise(params, '');
      const r = addRecord(db, input);
      return out(R('记运动', 'create', '已记运动：' + input.exerciseType + ' ' + input.caloriesBurned + ' 卡' + (input.minutes ? ' · ' + input.minutes + ' 分钟' : '') + '（' + input.date + '）', '记运动', 'exercise_log (写库回执)', {
        recordId: r.id, items: [{ id: r.id, date: input.date, status: '成功', reason: '', detail: input.exerciseType }],
      }));
    }
    case 'calorie.exercise.update': {
      const id = optNum(params, 'id');
      const date = optStr(params, 'date');
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
          recordId: id, items: [{ id, status: '已更新', reason: '' }],
        }));
      }
      if (date !== undefined) {
        assertISO(date, 'date');
        const r = updateDay(db, date, fields);
        if (r.matched === 0) throw new CalorieRenderError('missing-data', '无运动记录（' + date + '）');
        return out(R('改某日运动', 'update', '已更新 ' + date + ' 运动 ' + r.matched + ' 条', '改某日运动', 'exercise_log (写库回执)', {}));
      }
      fail(2, '缺参数 id 或 date（二选一）');
      throw new Error('unreachable');
    }
    case 'calorie.exercise.remove': {
      const id = optNum(params, 'id');
      const date = optStr(params, 'date');
      const from = optStr(params, 'from');
      const to = optStr(params, 'to');
      if (id !== undefined) {
        if (!Number.isInteger(id) || id <= 0) fail(2, 'id 须为正整数');
        deleteRecord(db, id);
        return out(R('删运动记录', 'delete', '已删除运动 #' + id + '（软删除，可恢复）', '删运动记录', 'exercise_log (写库回执)', {
          recordId: id, items: [{ id, status: '已删除', reason: '' }],
        }));
      }
      if (date !== undefined) {
        assertISO(date, 'date');
        const n = deleteDay(db, date);
        if (n === 0) throw new CalorieRenderError('missing-data', '无运动记录（' + date + '）');
        return out(R('删某日运动', 'delete', '已删除 ' + date + ' 运动 ' + n + ' 条（软删除，可恢复）', '删某日运动', 'exercise_log (写库回执)', {}));
      }
      if (from !== undefined || to !== undefined) {
        if (from === undefined || to === undefined) fail(2, '按范围删须同时传 from/to');
        assertISO(from as string, 'from');
        assertISO(to as string, 'to');
        if ((from as string) > (to as string)) fail(2, 'from 不得晚于 to');
        const n = deleteRange(db, from as string, to as string);
        if (n === 0) throw new CalorieRenderError('missing-data', '无运动记录（' + from + '~' + to + '）');
        return out(R('批量删运动', 'delete', '已删除 ' + from + '~' + to + ' 运动 ' + n + ' 条（软删除，可恢复）', '批量删运动', 'exercise_log (写库回执)', {}));
      }
      fail(2, '缺参数 id/date/from+to（三选一）');
      throw new Error('unreachable');
    }
    case 'calorie.photo.add': {
      const raw = params['srcPaths'] ?? params['srcPath'];
      const srcPaths = (Array.isArray(raw) ? raw : [raw]).filter((s) => typeof s === 'string' && (s as string).length > 0) as string[];
      if (srcPaths.length === 0) fail(2, '缺参数 srcPaths（照片源文件路径数组）');
      if (srcPaths.length > 20) fail(2, 'srcPaths 至多 20 张');
      const tag = needStr(params, 'tag');
      const dir = photosDirOf(params);
      const today = optStr(params, 'date') ?? todayISO();
      assertISO(today, 'date');
      const added = addPhotos(db, dir, { srcPaths, tag, note: optStr(params, 'note'), today, nowTime: optStr(params, 'time') });
      if (added.length === 0) throw new CalorieRenderError('missing-data', '照片源文件均不存在，未存入');
      let distance = null;
      try {
        const days = daysSinceTagPhoto(db, tag, today);
        distance = days === null ? null : { tag, days };
      } catch {
        distance = null;
      }
      const receipt = buildAddReceipt(added, { tag, note: optStr(params, 'note'), distance, failedCount: srcPaths.length - added.length || undefined });
      return { data: { ok: true, message: receipt.summary, receipt }, html: receiptHtml(receipt.scene, receipt.summary, receipt.op, receipt.recordId, receipt.items) };
    }
    case 'calorie.photo.remove': {
      const id = needId(params);
      const dir = photosDirOf(params);
      const snap = getPhotoRow(db, id);
      if (!snap) throw new CalorieRenderError('missing-data', '身材照 #' + id + ' 不存在');
      deletePhoto(db, dir, id);
      const receipt = buildDeleteReceipt(snap);
      return { data: { ok: true, message: receipt.summary, receipt }, html: receiptHtml(receipt.scene, receipt.summary, receipt.op, receipt.recordId, receipt.items) };
    }
    case 'calorie.photo.tag': {
      const id = needId(params);
      const op = needStr(params, 'op');
      if (op !== 'set' && op !== 'add' && op !== 'remove') fail(2, 'op 须为 set/add/remove：' + op);
      const row = getPhotoRow(db, id);
      if (!row) throw new CalorieRenderError('missing-data', '身材照 #' + id + ' 不存在');
      const before = [...row.tag_list];
      let scene: '改照片标签' | '加照片标签' | '删照片标签';
      if (op === 'set') {
        const raw = params['tags'] ?? params['tag'];
        const tags = Array.isArray(raw) ? (raw as unknown[]).map(String) : parseTags(typeof raw === 'string' ? raw : '');
        if (tags.length === 0) fail(2, '缺参数 tags（新标签全量）');
        updateTag(db, id, serializeTags(tags));
        scene = '改照片标签';
      } else if (op === 'add') {
        const tag = needStr(params, 'tag');
        tagAdd(db, id, tag);
        scene = '加照片标签';
      } else {
        const tag = needStr(params, 'tag');
        if (parseTags(tag).length !== 1) fail(2, '删标签一次只删 1 个');
        tagRemove(db, id, tag);
        scene = '删照片标签';
      }
      const after = getPhotoRow(db, id)?.tag_list ?? before;
      const receipt = buildTagReceipt(id, before, after, scene);
      return { data: { ok: true, message: receipt.summary, receipt }, html: receiptHtml(receipt.scene, receipt.summary, receipt.op, receipt.recordId, receipt.items) };
    }
    case 'calorie.product.add': {
      const productName = (optStr(params, 'productName') ?? optStr(params, 'product_name') ?? '');
      if (!productName.trim()) fail(2, '缺参数 productName');
      const r = addProduct(db, {
        productName: productName.trim(), brand: optStr(params, 'brand'),
        calories: needNum(params, 'calories'), protein: needNum(params, 'protein'), fat: needNum(params, 'fat'),
        saturatedFat: optNum(params, 'saturatedFat'), carbohydrates: needNum(params, 'carbohydrates'),
        sugar: optNum(params, 'sugar'), dietaryFiber: optNum(params, 'dietaryFiber'),
        sodium: needNum(params, 'sodium'), note: optStr(params, 'note'),
      });
      return out(R('存食品', 'create', '已存食品 #' + r.id + '（' + productName.trim() + '）', '存食品', 'nutrition_products (写库回执)', {
        recordId: r.id, items: [{ id: r.id, status: '成功', reason: '', detail: productName.trim() }],
      }));
    }
    case 'calorie.product.update': {
      const id = needId(params);
      const map: Record<string, string> = {
        productName: 'product_name', brand: 'brand', calories: 'calories', protein: 'protein', fat: 'fat',
        saturatedFat: 'saturated_fat', carbohydrates: 'carbohydrates', sugar: 'sugar',
        dietaryFiber: 'dietary_fiber', sodium: 'sodium', note: 'note', category: 'category',
      };
      const fields: Record<string, string | number | null> = {};
      for (const [camel, col] of Object.entries(map)) {
        if (params[camel] !== undefined) fields[col] = params[camel] as string | number | null;
      }
      for (const k of Object.keys(params)) {
        if (!(k in map) && k !== 'id' && k !== 'key') fail(2, '不支持字段: ' + k);
      }
      if (Object.keys(fields).length === 0) fail(2, '至少传 1 个待改字段');
      const r = updateProduct(db, id, fields);
      if (!r.updated) throw new CalorieRenderError('missing-data', '食品 #' + id + ' 不存在');
      return out(R('改食品', 'update', '已更新食品 #' + id + '（' + Object.keys(fields).join('、') + '）', '改食品', 'nutrition_products (写库回执)', {
        recordId: id, items: [{ id, status: '已更新', reason: '' }],
      }));
    }
    case 'calorie.product.deprecate': {
      const id = needId(params);
      const r = deprecateProduct(db, id);
      if (!r.ok) {
        if (/not found/.test(String(r.error ?? ''))) throw new CalorieRenderError('missing-data', '食品 #' + id + ' 不存在');
        fail(2, String(r.error ?? '废弃失败'));
      }
      return out(R('下架食品', 'update', '已下架食品 #' + id + '（' + (r.name ?? '') + ' · 软删除，可恢复）', '下架食品', 'nutrition_products (写库回执)', {
        recordId: id, items: [{ id, status: '已下架', reason: '' }],
      }));
    }
    case 'calorie.profile.set':
    case 'calorie.profile.update': {
      const isSet = key === 'calorie.profile.set';
      const scene = isSet ? '设置档案' : '改档案';
      const wake = isSet ? '设置档案' : '改档案';
      const picked: Record<string, unknown> = {};
      if (params['fields'] !== undefined) {
        const f = params['fields'];
        if (typeof f !== 'object' || f === null || Array.isArray(f)) fail(2, 'fields 须为对象');
        Object.assign(picked, f);
      } else if (params['field'] !== undefined) {
        picked[String(needStr(params, 'field'))] = params['value'];
      } else {
        for (const k of ['age', 'gender', 'heightCm', 'activityLevel', 'note'] as const) {
          if (params[k] !== undefined) picked[k] = params[k];
        }
      }
      for (const k of Object.keys(picked)) {
        if (!['age', 'gender', 'heightCm', 'activityLevel', 'note'].includes(k)) fail(2, '不支持字段: ' + k);
      }
      if (Object.keys(picked).length === 0) fail(2, '至少传 1 个档案字段');
      const r = updateProfile(db, picked);
      const after = r.after;
      return out(R(scene, 'update', '已' + scene + '（身高 ' + (after.height_cm ?? '—') + ' · 年龄 ' + (after.age ?? '—') + ' · 活动量 ' + (after.activity_level ?? '—') + '）', wake, 'user_profile (写库回执)', {
        recordId: 1, noChange: r.changed.length === 0,
      }));
    }
    case 'calorie.profile.activity': {
      const level = optStr(params, 'activityLevel') ?? optStr(params, 'level') ?? '';
      if (!level.trim()) fail(2, '缺参数 activityLevel');
      const r = setActivityLevel(db, level);
      return out(R('设活动量', 'update', '已设活动量：' + (r.before ?? '—') + '→' + r.after, '设活动量', 'user_profile (写库回执)', {
        recordId: 1, noChange: r.before === r.after,
      }));
    }
    case 'calorie.goal.set': {
      const calorie = needNum(params, 'calorie');
      const protein = needNum(params, 'protein');
      const carbs = needNum(params, 'carbs');
      const fat = needNum(params, 'fat');
      const water = optNum(params, 'water');
      if (!(calorie > 0)) fail(2, '热量目标必须为正数');
      for (const [k, v] of [['protein', protein], ['carbs', carbs], ['fat', fat]] as const) {
        if (v < 0) fail(2, k + ' 不能为负');
      }
      if (water !== undefined && water < 0) fail(2, 'water 不能为负');
      const had = getNutritionGoal(db) !== null;
      const r = setNutritionGoal(db, { calorie, protein, carbs, fat, water });
      const tail = r.consistent ? ' · 宏量自洽' : ' · ⚠宏量换算差 ' + r.diffKcal + ' 卡（>50 建议复核）';
      return out(R('定营养目标', had ? 'update' : 'create', '已定营养目标：' + r.calorieGoal + ' 卡·蛋白 ' + r.proteinGoal + '·碳水 ' + r.carbsGoal + '·脂肪 ' + r.fatGoal + (r.waterGoal === null ? '' : '·饮水 ' + r.waterGoal) + tail, '定营养目标', 'daily_goal (写库回执)', {
        recordId: 1,
      }));
    }
    case 'calorie.goal.water': {
      const water = needNum(params, 'water');
      if (getNutritionGoal(db) === null) throw new CalorieRenderError('missing-data', '尚无营养目标行（先定营养目标）');
      const r = updateWaterGoal(db, water);
      return out(R('定饮水目标', 'update', '已定饮水目标：' + (r.oldWaterGoal ?? '—') + '→' + r.newWaterGoal + ' ml', '定饮水目标', 'daily_goal (写库回执)', {
        recordId: 1, noChange: r.oldWaterGoal === r.newWaterGoal,
      }));
    }
    case 'calorie.goal.weight': {
      const kg = needNum(params, 'kg');
      if (!(kg > 0) || kg > 500) fail(2, 'kg 须为 0..500');
      const r = setWeightGoal(db, {
        kg, deadline: params['deadline'], startKg: params['startKg'], startDate: params['startDate'],
      });
      return out(R('定体重目标', 'update', '已定体重目标 ' + r.weightGoal + ' kg' + (r.deadline ? '（截止 ' + r.deadline + '）' : '') + (r.startKg !== null ? ' · 起点 ' + r.startKg + ' kg' : ''), '定体重目标', 'daily_goal (写库回执)', {
        recordId: 1,
      }));
    }
    case 'calorie.goal.pause': {
      const r = pauseAllGoals(db);
      return out(R('暂停所有目标', 'update', '已暂停所有目标（记录照常，仅目标暂停）', '暂停所有目标', 'daily_goal (写库回执)', {
        recordId: r.id,
      }));
    }
    case 'calorie.goal.resume': {
      const r = resumeAllGoals(db);
      return out(R('重启所有目标', 'update', '已重启所有目标（恢复正常）', '重启所有目标', 'daily_goal (写库回执)', {
        recordId: r.id,
      }));
    }
    case 'calorie.body.composition-add': {
      const date = optStr(params, 'date') ?? todayISO();
      assertISO(date, 'date');
      const source = normSource(params['source']);
      const input: Record<string, unknown> = {
        date, source, bodyFatPct: params['bodyFatPct'], note: optStr(params, 'note'),
        age: optInt(params, 'age'), sex: normSex(params['sex']),
      };
      for (const f of CALIPER_FIELDS) {
        const v = optNum(params, f);
        if (v !== undefined) input[f] = v;
      }
      if (input['bodyFatPct'] === undefined) fail(2, '缺参数 bodyFatPct（皮褶→体脂自动换算未移植，直传实测值）');
      const r = addComposition(db, input as unknown as Parameters<typeof addComposition>[1]);
      const label = SOURCE_LABELS[source] ?? source;
      return out(R('记体脂', 'create', '已记体脂：' + date + ' ' + label + ' ' + r.bodyFatPct + '%', '记体脂', 'body_composition (写库回执)', {
        recordId: r.id, items: [{ id: r.id, date, status: '成功', reason: '', detail: r.bodyFatPct + '%' }],
      }));
    }
    case 'calorie.body.composition-remove': {
      const id = needId(params);
      deleteComposition(db, id);
      return out(R('删体脂', 'delete', '已删除体脂记录 #' + id + '（软删除，可恢复）', '删体脂', 'body_composition (写库回执)', {
        recordId: id, items: [{ id, status: '已删除', reason: '' }],
      }));
    }
    case 'calorie.body.measure-add': {
      const date = optStr(params, 'date') ?? todayISO();
      assertISO(date, 'date');
      const input: Record<string, unknown> = { date, note: optStr(params, 'note') };
      for (const [camel, col] of Object.entries(MEASURE_CAMEL)) {
        const v = optNum(params, camel);
        if (v !== undefined) input[col] = v;
      }
      for (const k of Object.keys(params)) {
        if (!(k in MEASURE_CAMEL) && k !== 'date' && k !== 'note' && k !== 'key') fail(2, '不支持字段: ' + k);
      }
      const r = addMeasurement(db, input as unknown as Parameters<typeof addMeasurement>[1]);
      const filledCn = r.filled.map((f) => {
        const camel = Object.keys(MEASURE_CAMEL).find((c) => MEASURE_CAMEL[c] === f) ?? f;
        return camel + ' ' + String((input as Record<string, unknown>)[f]);
      }).join('、');
      return out(R('记围度', 'create', '已记围度：' + date + '（' + filledCn + '）', '记围度', 'body_measurements (写库回执)', {
        recordId: r.id, items: [{ id: r.id, date, status: '成功', reason: '', detail: filledCn }],
      }));
    }
    case 'calorie.body.measure-remove': {
      const id = needId(params);
      deleteMeasurement(db, id);
      return out(R('删围度', 'delete', '已删除围度记录 #' + id + '（软删除，可恢复）', '删围度', 'body_measurements (写库回执)', {
        recordId: id, items: [{ id, status: '已删除', reason: '' }],
      }));
    }
    default:
      fail(3, '未知 calorie 写键：' + key);
      throw new Error('unreachable');
  }
}
