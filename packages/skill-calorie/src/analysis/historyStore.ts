/** T6 #25 · 取数：近日每日摄入聚合 vs 目标（老家 calorie_history.py 同口径，纯取数不打印）。
 * 目标值经 T4 getNutritionGoal 单源读取。
 */
import type { DatabaseSync } from 'node:sqlite';
import { getNutritionGoal } from '../goal/nutritionGoal.js';
import { todayISO } from './utils.js';

export interface DayIntake {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  /** 剩余 = 目标 − 当日；目标未设时为 null */
  remaining: number | null;
  /** +N卡 / 达标 / 未设目标（老家同文案） */
  status: string;
}

export interface CalorieHistory {
  days: number;
  goal: number | null;
  rows: DayIntake[];
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 最近 N 天每日摄入（food_log 按 date 聚合倒序）；空库返回空 rows，调用方阻断提示，不返“正常空数据”。
 * #559：默认 `now` 经 `todayISO()` 派生（#250 唯一出处）；#718 起「今天」由真实时钟给（`CALORIE_TODAY` 已删，钉钟走测试基座）；
 * 按包内 UTC 日口径（与 T3/T4 同；与原来按机器本地日历在午夜边界可能差一天，口径以 UTC 日为准）。显式 `now` 照旧优先。 */
export function getCalorieHistory(db: DatabaseSync, days = 7, now = new Date(todayISO() + 'T12:00:00')): CalorieHistory {
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  const rows = db
    .prepare(
      `SELECT date, SUM(calories) AS calories, SUM(protein) AS protein, SUM(carbs) AS carbs, SUM(fat) AS fat
       FROM food_log WHERE date >= ? GROUP BY date ORDER BY date DESC`,
    )
    .all(fmtDate(start)) as { date: string; calories: number; protein: number; carbs: number; fat: number }[];
  const goal = getNutritionGoal(db)?.calorie_goal ?? null;
  return {
    days,
    goal,
    rows: rows.map((r) => {
      if (goal === null) return { ...r, remaining: null, status: '未设目标' };
      const remaining = Math.round(goal - r.calories);
      return { ...r, remaining, status: remaining !== 0 ? `${remaining >= 0 ? '+' : ''}${remaining}卡` : '达标' };
    }),
  };
}

/** 本地体重序列（跨技能合并的上游输入之一；food/weight 双序列对齐的 weight 侧）。 */
export function weightSeries(db: DatabaseSync): { date: string; weight_kg: number }[] {
  return db.prepare('SELECT date, weight_kg FROM weight_log ORDER BY date').all() as {
    date: string;
    weight_kg: number;
  }[];
}
