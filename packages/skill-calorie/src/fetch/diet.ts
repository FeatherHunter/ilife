/** T3 #22 · 饮食取数（对照老家 scripts/diet.py）。
 *
 * 偏离老家：失败抛 FetchError（缺失阻断不返空），不 print（打印归 T11 CLI）；
 * 目标值直接读 daily_goal id=1（等价 nutrition_goal.get_nutrition_goal 同表同行）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { sql } from './db.js';
import type { SQLInputValue } from './db.js';
import { FetchError } from './errors.js';

export const WATER_NAME = '💧水';
export const MEALS = ['早餐', '午餐', '下午茶', '晚餐', '夜宵'] as const;
export type MealName = (typeof MEALS)[number];

/** 餐别时间窗（deleteMealsByType 口径，与 inferMealType 同源）。加餐 = 下午茶 + 夜宵。 */
export const MEAL_WINDOWS: Record<string, [number, number] | [number, number, number, number]> = {
  早餐: [6, 10], 午餐: [10, 14], 下午茶: [14, 18], 晚餐: [18, 22], 夜宵: [0, 6],
  加餐: [14, 22, 0, 6],
};

export function inferMealType(timeStr: string): string {
  const hour = parseInt(String(timeStr).split(':')[0], 10);
  if (Number.isNaN(hour)) return '其他';
  if (hour >= 6 && hour < 10) return '早餐';
  if (hour >= 10 && hour < 14) return '午餐';
  if (hour >= 14 && hour < 18) return '下午茶';
  if (hour >= 18 && hour < 22) return '晚餐';
  return '夜宵';
}

export interface MealRow {
  id: number; date: string; time: string | null; food_name: string;
  grams: number; calories: number; protein: number; carbs: number; fat: number;
  note: string | null;
}

export interface MealInput {
  foodName: string; calories: number; protein: number;
  carbs?: number; fat?: number; grams?: number; note?: string;
  date?: string; time?: string; mealOverride?: string;
}

export interface DailyGoalRow {
  calorie_goal: number; protein_goal: number; carbs_goal: number; fat_goal: number;
  water_goal: number | null;
}

function todayStr(): string { return new Date().toISOString().slice(0, 10); }
function nowStr(): string { return new Date().toTimeString().slice(0, 8); }

function num(v: unknown, field: string): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  if (!Number.isFinite(n)) throw new FetchError(`${field} 必须是数字: ${String(v)}`);
  return n;
}

export function readGoal(db: DatabaseSync): DailyGoalRow | null {
  const row = db.prepare(
    'SELECT calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal FROM daily_goal WHERE id = 1',
  ).get() as DailyGoalRow | undefined;
  return row ?? null;
}

export interface AddMealResult {
  id: number | null; duplicate: boolean; dupId?: number;
  date: string; time: string; food_name: string; meal: string;
  dateLabel: string; rowsAffected: number; message?: string;
  todayTotals?: { cal: number; pro: number; carbs: number; fat: number; count: number };
  goals?: { cal: number | null; pro: number | null; carbs: number | null; fat: number | null };
  remainingCal?: number | null;
}

export function addMeal(db: DatabaseSync, input: MealInput): AddMealResult {
  const foodName = String(input.foodName ?? '').trim();
  if (!foodName) throw new FetchError('食物名必填');
  const calories = num(input.calories, 'calories');
  const protein = num(input.protein, 'protein');
  const carbs = input.carbs === undefined ? 0 : num(input.carbs, 'carbs');
  const fat = input.fat === undefined ? 0 : num(input.fat, 'fat');
  const grams = input.grams === undefined ? 100 : num(input.grams, 'grams');
  if (calories < 0 || protein < 0 || carbs < 0 || fat < 0 || grams <= 0) {
    throw new FetchError('营养值不能为负，克数必须为正');
  }
  if (input.mealOverride !== undefined && !(MEALS as readonly string[]).includes(input.mealOverride)) {
    throw new FetchError(`--meal 必须是以下值之一：${MEALS.join('、')}`);
  }
  const today = input.date ?? todayStr();
  const now = input.time ?? nowStr();
  // 幂等防重（老家 2026-08-11 #262）：同 date+time+food_name+grams+calories 跳过。
  const dup = db.prepare(
    'SELECT id FROM food_log WHERE date=? AND time=? AND food_name=? AND grams=? AND calories=? LIMIT 1',
  ).get(today, now, foodName, grams, calories) as { id: number } | undefined;
  const meal = input.mealOverride ?? inferMealType(now);
  if (dup) {
    return {
      id: null, duplicate: true, dupId: dup.id, date: today, time: now,
      food_name: foodName, meal, dateLabel: input.date ? today : '今日', rowsAffected: 0,
      message: `重复记录已跳过(同日期/时间/食物名/克数/热量已存在: ${today} ${now} ${foodName} ${grams}g ${calories}kcal)`,
    };
  }
  const info = db.prepare(
    'INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(today, now, foodName, grams, calories, protein, carbs, fat, input.note ?? '');
  const totals = db.prepare(
    'SELECT SUM(calories), SUM(protein), SUM(carbs), SUM(fat), COUNT(*) FROM food_log WHERE date = ?',
  ).get(today) as { 'SUM(calories)': number; 'SUM(protein)': number; 'SUM(carbs)': number; 'SUM(fat)': number; 'COUNT(*)': number };
  const goal = readGoal(db);
  return {
    id: Number(info.lastInsertRowid), duplicate: false, date: today, time: now,
    food_name: foodName, meal, dateLabel: input.date ? today : '今日', rowsAffected: 1,
    todayTotals: {
      cal: totals['SUM(calories)'] ?? 0, pro: totals['SUM(protein)'] ?? 0,
      carbs: totals['SUM(carbs)'] ?? 0, fat: totals['SUM(fat)'] ?? 0, count: totals['COUNT(*)'] ?? 0,
    },
    goals: goal ? { cal: goal.calorie_goal, pro: goal.protein_goal, carbs: goal.carbs_goal, fat: goal.fat_goal } : undefined,
    remainingCal: goal ? goal.calorie_goal - (totals['SUM(calories)'] ?? 0) : null,
  };
}

export const MEAL_UPDATABLE = new Set([
  'food_name', 'grams', 'note', 'date', 'time', 'calories', 'protein', 'carbs', 'fat',
]);

export interface UpdateMealResult { ok: true; before: MealRow; after: MealRow; changed: string[] }

export function updateMeal(db: DatabaseSync, entryId: number, fields: Record<string, unknown>): UpdateMealResult {
  const id = Number(entryId);
  if (!Number.isInteger(id)) throw new FetchError('Entry ID 必须是数字');
  const bad = Object.keys(fields).filter((k) => !MEAL_UPDATABLE.has(k));
  if (bad.length) throw new FetchError(`不支持字段: ${bad.join(', ')}; 支持: ${[...MEAL_UPDATABLE].join(', ')}`);
  if (!Object.keys(fields).length) throw new FetchError('至少传 1 个字段');
  const before = db.prepare(
    'SELECT id, date, time, food_name, grams, calories, protein, carbs, fat, note FROM food_log WHERE id = ?',
  ).get(id) as MealRow | undefined;
  if (!before) throw new FetchError(`Entry ID ${id} 不存在`);
  const typed: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (['grams', 'calories', 'protein', 'carbs', 'fat'].includes(k)) {
      const n = num(v, k);
      if (n < 0) throw new FetchError(`${k} 不能为负: ${String(v)}`);
      typed[k] = n;
    } else typed[k] = v;
  }
  const sets = Object.keys(typed).map((k) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE food_log SET ${sets} WHERE id = ?`).run(...Object.values(typed).map(sql), id);
  const after = db.prepare(
    'SELECT id, date, time, food_name, grams, calories, protein, carbs, fat, note FROM food_log WHERE id = ?',
  ).get(id) as unknown as MealRow;
  const changed = Object.keys(typed).filter((k) => (before as unknown as Record<string, unknown>)[k] !== (after as unknown as Record<string, unknown>)[k]);
  return { ok: true, before, after, changed };
}

export function deleteMeal(db: DatabaseSync, entryId: number): { id: number; food_name: string; calories: number; deleted: number } {
  const id = Number(entryId);
  if (!Number.isInteger(id)) throw new FetchError('Entry ID 必须是数字');
  const row = db.prepare('SELECT food_name, calories FROM food_log WHERE id = ?').get(id) as
    | { food_name: string; calories: number } | undefined;
  if (!row) throw new FetchError(`Entry ID ${id} 不存在`);
  db.prepare('DELETE FROM food_log WHERE id = ?').run(id);
  return { id, food_name: row.food_name, calories: row.calories, deleted: 1 };
}

export interface CopyMealsResult {
  ok: true; copied: number; skipped: number; fromDate: string; toDate: string;
  copiedItems: { time: string | null; food_name: string; grams: number; calories: number }[];
  skippedItems: { time: string | null; food_name: string; grams: number; calories: number }[];
}

export function copyMeals(db: DatabaseSync, fromDate: string, toDate?: string): CopyMealsResult {
  const target = toDate ?? todayStr();
  const rows = db.prepare(
    `SELECT time, food_name, grams, calories, protein, carbs, fat, note FROM food_log
     WHERE date = ? AND food_name != ? ORDER BY time`,
  ).all(fromDate, WATER_NAME) as { time: string | null; food_name: string; grams: number; calories: number; protein: number; carbs: number; fat: number; note: string | null }[];
  let copied = 0, skipped = 0;
  const copiedItems: CopyMealsResult['copiedItems'] = [];
  const skippedItems: CopyMealsResult['skippedItems'] = [];
  for (const r of rows) {
    const hit = db.prepare(
      'SELECT COUNT(*) AS n FROM food_log WHERE date = ? AND time = ? AND food_name = ?',
    ).get(target, r.time, r.food_name) as { n: number };
    if (hit.n > 0) {
      skipped++;
      skippedItems.push({ time: r.time, food_name: r.food_name, grams: r.grams, calories: r.calories });
      continue;
    }
    db.prepare(
      'INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(target, r.time, r.food_name, r.grams, r.calories, r.protein, r.carbs, r.fat, r.note ?? '');
    copied++;
    copiedItems.push({ time: r.time, food_name: r.food_name, grams: r.grams, calories: r.calories });
  }
  return { ok: true, copied, skipped, fromDate, toDate: target, copiedItems, skippedItems };
}

export interface BatchMealItem {
  date?: string; time?: string; food_name?: string; grams?: number;
  calories?: number; protein?: number; carbs?: number; fat?: number; note?: string;
}

export function addMealsBatch(db: DatabaseSync, entries: BatchMealItem[]): {
  ok: true; added: number; skipped: number; failed: number; failures: [number, string][];
} {
  let added = 0, skipped = 0;
  const failures: [number, string][] = [];
  entries.forEach((e, i) => {
    try {
      const food = String(e.food_name ?? '').trim();
      const cal = num(e.calories ?? NaN, 'calories');
      const pro = num(e.protein ?? NaN, 'protein');
      if (!food || cal < 0 || pro < 0) { skipped++; failures.push([i, '食物名必填，营养值不能为负']); return; }
      const d = String(e.date ?? todayStr());
      const t = String(e.time ?? nowStr());
      const g = e.grams === undefined || e.grams === null ? 100 : num(e.grams, 'grams');
      const dup = db.prepare(
        'SELECT id FROM food_log WHERE date=? AND time=? AND food_name=? AND grams=? AND calories=? LIMIT 1',
      ).get(d, t, food, g, cal);
      if (dup) { skipped++; failures.push([i, `重复记录已跳过: ${d} ${t} ${food} ${g}g ${cal}kcal`]); return; }
      db.prepare(
        'INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(d, t, food, g, cal, pro,
        e.carbs === undefined || e.carbs === null ? 0 : num(e.carbs, 'carbs'),
        e.fat === undefined || e.fat === null ? 0 : num(e.fat, 'fat'),
        String(e.note ?? ''));
      added++;
    } catch (err) {
      skipped++;
      failures.push([i, `数值非法: ${err instanceof Error ? err.message : String(err)}`]);
    }
  });
  return { ok: true, added, skipped, failed: failures.length, failures };
}

export function updateMealsByDate(db: DatabaseSync, targetDate: string, fields: Record<string, unknown>): {
  ok: true; matched: number; updated: number; before: Record<string, unknown>[]; after: Record<string, unknown>[]; changedFields: string[];
} {
  const bad = Object.keys(fields).filter((k) => !MEAL_UPDATABLE.has(k));
  if (bad.length) throw new FetchError(`不支持字段: ${bad.join(', ')}`);
  if (!Object.keys(fields).length) throw new FetchError('至少传 1 个字段');
  const ids = (db.prepare('SELECT id FROM food_log WHERE date = ? AND food_name != ?').all(targetDate, WATER_NAME) as { id: number }[])
    .map((r) => r.id);
  const snap = (id: number) => db.prepare(
    'SELECT food_name, grams, calories, protein, carbs, fat, note, time FROM food_log WHERE id = ?',
  ).get(id) as Record<string, unknown>;
  const before = ids.map(snap);
  const typed: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    typed[k] = ['grams', 'calories', 'protein', 'carbs', 'fat'].includes(k) ? num(v, k) : v;
    if (typeof typed[k] === 'number' && (typed[k] as number) < 0) throw new FetchError(`${k} 不能为负`);
  }
  if (ids.length) {
    const sets = Object.keys(typed).map((k) => `${k} = ?`).join(', ');
    db.prepare(`UPDATE food_log SET ${sets} WHERE date = ? AND food_name != ?`).run(...Object.values(typed).map(sql), targetDate, WATER_NAME);
  }
  return { ok: true, matched: ids.length, updated: ids.length, before, after: ids.map(snap), changedFields: Object.keys(typed).sort() };
}

function deleteMealsWhere(db: DatabaseSync, where: string, params: SQLInputValue[]): {
  ok: true; deleted: number; before: Record<string, unknown>[];
} {
  const before = db.prepare(
    `SELECT date, time, food_name, grams, calories, note FROM food_log WHERE ${where}`,
  ).all(...params) as Record<string, unknown>[];
  db.prepare(`DELETE FROM food_log WHERE ${where}`).run(...params);
  return { ok: true, deleted: before.length, before };
}

export function deleteMealsByDate(db: DatabaseSync, targetDate: string) {
  return { ...deleteMealsWhere(db, 'date = ? AND food_name != ?', [targetDate, WATER_NAME]), date: targetDate };
}

export function deleteMealsByRange(db: DatabaseSync, startDate: string, endDate: string) {
  return { ...deleteMealsWhere(db, 'date BETWEEN ? AND ? AND food_name != ?', [startDate, endDate, WATER_NAME]), start: startDate, end: endDate };
}

export function deleteMealsByType(db: DatabaseSync, targetDate: string, mealType: string) {
  const w = MEAL_WINDOWS[mealType];
  if (!w) throw new FetchError(`餐别必须是 ${Object.keys(MEAL_WINDOWS).join('/')} 之一`);
  const hourExpr = "CAST(strftime('%H', time) AS INT)";
  const where = w.length === 4
    ? `date = ? AND food_name != ? AND ((${hourExpr} >= ? AND ${hourExpr} < ?) OR (${hourExpr} >= ? AND ${hourExpr} < ?))`
    : `date = ? AND food_name != ? AND (${hourExpr} >= ? AND ${hourExpr} < ?)`;
  return { ...deleteMealsWhere(db, where, [targetDate, WATER_NAME, ...w]), date: targetDate, meal: mealType };
}

export function listMeals(db: DatabaseSync, targetDate?: string): MealRow[] {
  const date = targetDate ?? todayStr();
  return db.prepare(
    'SELECT id, date, time, food_name, grams, calories, protein, carbs, fat, note FROM food_log WHERE date = ? ORDER BY time',
  ).all(date) as unknown as MealRow[];
}

export interface DailySummary {
  date: string; entryCount: number;
  totals: { cal: number; pro: number; carbs: number; fat: number };
  waterMl: number; goal: DailyGoalRow | null;
  remaining: { cal: number; pro: number; carbs: number; fat: number; water: number } | null;
  overCal: boolean;
}

export function getDailySummary(db: DatabaseSync, targetDate?: string): DailySummary {
  const date = targetDate ?? todayStr();
  const t = db.prepare(
    `SELECT SUM(calories), SUM(protein), SUM(carbs), SUM(fat), COUNT(*) FROM food_log WHERE date = ? AND food_name != ?`,
  ).get(date, WATER_NAME) as { 'SUM(calories)': number | null; 'SUM(protein)': number | null; 'SUM(carbs)': number | null; 'SUM(fat)': number | null; 'COUNT(*)': number };
  const w = db.prepare(
    'SELECT COALESCE(SUM(grams), 0) AS w FROM food_log WHERE date = ? AND food_name = ?',
  ).get(date, WATER_NAME) as { w: number };
  const totals = {
    cal: t['SUM(calories)'] ?? 0, pro: t['SUM(protein)'] ?? 0,
    carbs: t['SUM(carbs)'] ?? 0, fat: t['SUM(fat)'] ?? 0,
  };
  const goal = readGoal(db);
  const waterGoal = goal?.water_goal ?? 2000;
  return {
    date, entryCount: t['COUNT(*)'] ?? 0, totals, waterMl: w.w,
    goal,
    remaining: goal ? {
      cal: goal.calorie_goal - totals.cal, pro: goal.protein_goal - totals.pro,
      carbs: goal.carbs_goal - totals.carbs, fat: goal.fat_goal - totals.fat,
      water: waterGoal - w.w,
    } : null,
    overCal: goal ? goal.calorie_goal - totals.cal < 0 : false,
  };
}
