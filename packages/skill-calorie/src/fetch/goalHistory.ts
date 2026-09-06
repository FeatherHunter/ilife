/** T4 #23 · goal_history 取数（对照老家 scripts/goal_history.py）。
 *
 * 无独立历史表：food_log 按日聚合 vs daily_goal 单行目标，80%-120% 判定带。
 * today 可注入（默认 UTC 日，与 T3 todayStr 同口径，便于单测钉死）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { FetchError } from './errors.js';

export type DayStatus = '完成' | '未完成' | '无记录';

export interface DayGoalStatus {
  date: string;
  calorieActual: number;
  calorieGoal: number | null;
  pct: number | null;
  status: DayStatus;
}

export interface GoalHistory {
  goalHistory: DayGoalStatus[];
  completedCount: number;
  incompleteCount: number;
  calorieGoal: number | null;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function shiftISODate(iso: string, deltaDays: number): string {
  const t = Date.parse(iso + 'T12:00:00Z');
  if (Number.isNaN(t)) throw new FetchError('日期非法: ' + iso);
  return new Date(t + deltaDays * 86400000).toISOString().slice(0, 10);
}

export function listCompletedGoals(db: DatabaseSync, days = 30, today: string = todayISO()): GoalHistory {
  if (!Number.isInteger(days) || days < 1) throw new FetchError('days 须为正整数: ' + String(days));
  const end = today;
  const start = shiftISODate(today, -(days - 1));
  const goal = db
    .prepare('SELECT calorie_goal FROM daily_goal WHERE id = 1')
    .get() as { calorie_goal: number | null } | undefined;
  const calGoal = goal?.calorie_goal ?? null;
  const rows = db
    .prepare(
      'SELECT date, COALESCE(SUM(calories), 0) AS cal FROM food_log WHERE date BETWEEN ? AND ? GROUP BY date',
    )
    .all(start, end) as { date: string; cal: number }[];
  const actual = new Map(rows.map((r) => [r.date, round1(r.cal)]));
  const history: DayGoalStatus[] = [];
  let completed = 0;
  let incomplete = 0;
  for (let i = days - 1; i >= 0; i--) {
    const d = shiftISODate(today, -i);
    const cal = actual.get(d);
    if (cal === undefined) {
      history.push({ date: d, calorieActual: 0, calorieGoal: calGoal, pct: 0, status: '无记录' });
      continue;
    }
    if (calGoal) {
      const pct = round1((cal / calGoal) * 100);
      const status: DayStatus = pct >= 80 && pct <= 120 ? '完成' : '未完成';
      if (status === '完成') completed += 1;
      else incomplete += 1;
      history.push({ date: d, calorieActual: cal, calorieGoal: calGoal, pct, status });
    } else {
      incomplete += 1;
      history.push({ date: d, calorieActual: cal, calorieGoal: calGoal, pct: null, status: '未完成' });
    }
  }
  return { goalHistory: history, completedCount: completed, incompleteCount: incomplete, calorieGoal: calGoal };
}
