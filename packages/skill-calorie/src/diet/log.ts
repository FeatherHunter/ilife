/** 饮食能力的子功能「记饮食」（HELP 场景 02「饮食」下一级 diet_1）：记一餐／批量补记饮食／复制昨日饮食／记喝水。
 *
 * #315 纯搬迁：四个处理体**逐字搬自** `src/cli/write.ts` 的对应 `case`（语义不动，只换住处）。
 * 取数走 `fetch/diet.ts` 的公开接口，参数与窗口口径走共用位 `shared/params.ts`，
 * 回执底座走 `shared/writeParts.ts`——本件不重写任何别人的算式。
 * 四条声明住 `./commands.ts`；对外只经 `./index.ts`。
 */
import type { DatabaseSync } from 'node:sqlite';
import { shiftISODate, todayISO } from '../analysis/utils.js';
import { MEALS, WATER_NAME, addMeal, addMealsBatch, copyMeals, getDailySummary } from '../fetch/diet.js';
import { CalorieRenderError } from '../render/errors.js';
import type { WriteOut } from '../shared/commandSpec.js';
import { assertISO, fail, needArr, needNum, optNum, optStr, wday } from '../shared/params.js';
import { F, R, out } from '../shared/writeParts.js';

/** `calorie.diet.add` · 记一餐（唤醒词 记一餐）。 */
export function writeDietAdd(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
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
  const date = wday(params, 'date');
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
      ids: r.dupId ? [r.dupId] : [], idSource: r.dupId ? 'record' : 'none', writtenFields: [],
    }));
  }
  const remain = r.remainingCal === null || r.remainingCal === undefined ? '' : ' · 今日剩 ' + r.remainingCal + ' 卡';
  return out(R('记一餐', 'create', '已记一餐：' + r.food_name + ' ' + r.date + ' ' + r.time + '（' + r.meal + '）' + remain, '记一餐', 'food_log (写库回执)', {
    recordId: r.id, ids: r.id === null ? [] : [r.id], writtenFields: [...F.diet],
    items: [{ id: r.id ?? undefined, date: r.date, status: '成功', reason: '', detail: r.food_name }],
  }));
}

/** `calorie.diet.batch` · 批量补记饮食。 */
export function writeDietBatch(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
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
    noChange: r.added === 0, ids: [], idSource: 'condition',
    writtenFields: r.added > 0 ? [...F.diet] : [],
    items: r.failures.slice(0, 20).map(([idx, reason]) => ({ status: '失败', reason, detail: '第' + idx + '条' })),
  }));
}

/** `calorie.diet.copy` · 复制昨日饮食。 */
export function writeDietCopy(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const today = todayISO();
  const from = wday(params, 'from') ?? wday(params, 'fromDate') ?? shiftISODate(today, -1);
  const to = wday(params, 'to') ?? wday(params, 'toDate') ?? today;
  assertISO(from, 'from');
  assertISO(to, 'to');
  const r = copyMeals(db, from, to);
  if (r.copied + r.skipped === 0) throw new CalorieRenderError('missing-data', '来源无饮食记录（' + from + '）');
  return out(R('复制昨日饮食', 'create', '已复制饮食 ' + from + '→' + to + '：复制 ' + r.copied + '，跳过 ' + r.skipped, '复制昨日饮食', 'food_log (写库回执)', {
    noChange: r.copied === 0, ids: [], idSource: 'condition',
    writtenFields: r.copied > 0 ? [...F.diet] : [],
  }));
}

/** `calorie.water.log` · 记喝水。 */
export function writeWaterLog(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const ml = needNum(params, 'ml');
  if (!(ml > 0) || ml > 10000) fail(2, 'ml 须为 0..10000 毫升');
  const date = wday(params, 'date');
  if (date) assertISO(date, 'date');
  const r = addMeal(db, {
    foodName: WATER_NAME, calories: 0, protein: 0, grams: ml,
    note: optStr(params, 'note'), date, time: optStr(params, 'time'),
  });
  if (r.duplicate) {
    // 与 `calorie.diet.add` 同口径（§3.3 `record`）：重复跳过的原 id 由 fetch 回传（`fetch/diet.ts:96`），
    // 拿得到就报 `record`＋`ids=[dupId]`，拿不到才退 `none`（返修 R-3／蓝队 D-3 统一）。
    return out(R('记喝水', 'create', String(r.message ?? '重复记录已跳过'), '记喝水', 'food_log (写库回执)', {
      recordId: r.dupId ?? null, noChange: true,
      ids: r.dupId ? [r.dupId] : [], idSource: r.dupId ? 'record' : 'none', writtenFields: [],
    }));
  }
  const day = date ?? todayISO();
  const sum = getDailySummary(db, day);
  return out(R('记喝水', 'create', '已记喝水 ' + ml + ' ml（' + day + ' 累计 ' + sum.waterMl + ' ml）', '记喝水', 'food_log (写库回执)', {
    recordId: r.id, ids: r.id === null ? [] : [r.id], writtenFields: [...F.water],
    items: [{ id: r.id ?? undefined, date: r.date, status: '成功', reason: '', detail: ml + 'ml' }],
  }));
}
