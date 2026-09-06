/** T5 #24 · 周复盘引擎取数+衍生（对照老家 scripts/review_engine.py 数据段）。
 *
 * parseRange / query5dims / derive（含 complete_days 今日污染隔离、缺口、
 * 营养达标率、异常天规则）。_render_weight_trend_svg 与 extract_summary 属
 * 渲染/HTML 层，归 T8-T10，本票 weightTrendSvg 回 null 并在 meta 注明（待裁决）。
 * today 可注入（默认 UTC 日）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { FetchError } from '../fetch/errors.js';
import { getActivityFactor, shiftISODate, todayISO } from './utils.js';

const round = (n: number): number => Math.round(n);
const round1 = (n: number): number => Math.round(n * 10) / 10;

export type RangeType = 'day' | 'week' | 'month' | 'year';

function normalizeDate(s: string, refISO: string): string {
  const t = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    if (Number.isNaN(Date.parse(t + 'T12:00:00Z'))) throw new FetchError('日期格式错误: ' + s);
    return t;
  }
  if (t.includes('/')) {
    const parts = t.split('/');
    const m = Number(parts[0]);
    const d = Number(parts[1]);
    if (!Number.isInteger(m) || !Number.isInteger(d)) throw new FetchError('日期格式错误: ' + s);
    return refISO.slice(0, 4) + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  }
  if (/^\d{1,2}$/.test(t)) return refISO.slice(0, 8) + t.padStart(2, '0');
  throw new FetchError('无法解析日期: ' + s);
}

export function parseRange(rangeArg?: string | null, rangeType: RangeType = 'week', today: string = todayISO()): [string, string] {
  if (rangeArg) {
    if (rangeArg.includes(':')) {
      const parts = rangeArg.split(':');
      return [normalizeDate(parts[0] as string, today), normalizeDate(parts[1] as string, today)];
    }
    const d = normalizeDate(rangeArg, today);
    return [d, d];
  }
  if (rangeType === 'day') return [today, today];
  if (rangeType === 'week') return [shiftISODate(today, -6), today];
  if (rangeType === 'month') return [today.slice(0, 8) + '01', today];
  if (rangeType === 'year') return [today.slice(0, 4) + '-01-01', today];
  throw new FetchError('未知 range_type: ' + rangeType);
}

export interface DayIntake { date: string; totalCalorie: number; totalProtein: number; totalCarbs: number; totalFat: number; mealCount: number }
export interface DayBurn { date: string; totalBurned: number; totalMinutes: number | null; types: string | null; categories: string | null }
export interface WeightLogPoint { date: string; weightKg: number }
export interface FitnessSession { date: string; weekNumber: number; dayOfWeek: number; sessionLabel: string; isRestDay: number; totalSets: number | null; movements: unknown[] }
export interface TopFood { name: string; totalCal: number; cnt: number; avgCalPerMeal: number }
export interface FiveDims { range: { start: string; end: string; days: number }; dailyIntake: DayIntake[]; dailyBurn: DayBurn[]; weightLogs: WeightLogPoint[]; fitnessPlan: FitnessSession[] | null; userProfile: { heightCm: number | null; age: number; gender: string; activityLevel: string }; nutritionTargets: Record<string, unknown>; topFoods: TopFood[] }

function daysBetween(d1: string, d2: string): number {
  return Math.round((Date.parse(d2 + 'T12:00:00Z') - Date.parse(d1 + 'T12:00:00Z')) / 86400000);
}

export function query5dims(db: DatabaseSync, start: string, end: string): FiveDims {
  const dailyIntake = db.prepare(
    "SELECT date, SUM(calories) AS totalCalorie, SUM(protein) AS totalProtein, SUM(carbs) AS totalCarbs, SUM(fat) AS totalFat, COUNT(*) AS mealCount" +
    " FROM food_log WHERE food_name != '💧水' AND date BETWEEN ? AND ? GROUP BY date ORDER BY date",
  ).all(start, end) as unknown as DayIntake[];
  const dailyBurn = db.prepare(
    'SELECT date, SUM(calories_burned) AS totalBurned, SUM(duration_minutes) AS totalMinutes,' +
    ' GROUP_CONCAT(DISTINCT exercise_type) AS types, GROUP_CONCAT(DISTINCT category) AS categories' +
    ' FROM exercise_log WHERE date BETWEEN ? AND ? GROUP BY date ORDER BY date',
  ).all(start, end) as unknown as DayBurn[];
  const weightLogs = db.prepare(
    'SELECT date, weight_kg AS weightKg FROM weight_log WHERE date BETWEEN ? AND ? ORDER BY date',
  ).all(start, end) as unknown as WeightLogPoint[];
  const cfg = db.prepare('SELECT * FROM workout_plan_config WHERE id = 1').get() as
    | { total_weeks: number; start_date: string }
    | undefined;
  let fitnessPlan: FitnessSession[] | null = null;
  if (cfg) {
    const plans = db.prepare('SELECT * FROM workout_plans ORDER BY week_number, day_of_week, session_index').all() as unknown as Array<{
      week_number: number; day_of_week: number; session_label: string; is_rest_day: number; total_sets: number | null; movements: string | null;
    }>;
    const index = new Map<string, typeof plans>();
    for (const p of plans) {
      const k = p.week_number + ':' + p.day_of_week;
      if (!index.has(k)) index.set(k, []);
      (index.get(k) as typeof plans).push(p);
    }
    fitnessPlan = [];
    for (let d = start; d <= end; d = shiftISODate(d, 1)) {
      const realWeek = Math.floor(dayDiff(cfg.start_date, d) / 7) + 1;
      const planWeek = ((realWeek - 1) % cfg.total_weeks) + 1;
      const dow = new Date(d + 'T12:00:00Z').getUTCDay();
      const isoDow = dow === 0 ? 7 : dow;
      for (const p of index.get(planWeek + ':' + isoDow) ?? []) {
        (fitnessPlan as FitnessSession[]).push({
          date: d, weekNumber: planWeek, dayOfWeek: isoDow, sessionLabel: p.session_label,
          isRestDay: p.is_rest_day, totalSets: p.total_sets,
          movements: p.movements ? JSON.parse(p.movements) as unknown[] : [],
        });
      }
    }
  }
  const prof = db.prepare('SELECT height_cm, age, gender, activity_level FROM user_profile WHERE id = 1').get() as
    | { height_cm: number | null; age: number | null; gender: string | null; activity_level: string | null }
    | undefined;
  const goalRow = db.prepare('SELECT * FROM daily_goal WHERE id = 1').get() as Record<string, unknown> | undefined;
  const topRows = db.prepare(
    "SELECT food_name AS n, SUM(calories) AS totalCal, COUNT(*) AS cnt FROM food_log WHERE food_name != '💧水' AND date BETWEEN ? AND ? GROUP BY food_name ORDER BY cnt DESC, totalCal DESC LIMIT 5",
  ).all(start, end) as unknown as Array<{ n: string; totalCal: number; cnt: number }>;
  return {
    range: { start, end, days: daysBetween(start, end) + 1 },
    dailyIntake,
    dailyBurn,
    weightLogs,
    fitnessPlan,
    userProfile: { heightCm: prof?.height_cm ?? null, age: prof?.age ?? 30, gender: prof?.gender ?? 'male', activityLevel: prof?.activity_level ?? 'moderate' },
    nutritionTargets: goalRow ? { ...goalRow } : {},
    topFoods: topRows.map((r) => ({ name: r.n, totalCal: r.totalCal, cnt: r.cnt, avgCalPerMeal: round(r.totalCal / Math.max(r.cnt, 1)) })),
  };

  function dayDiff(a: string, b: string): number {
    return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000);
  }
}

export interface NutritionMatch { daysCount: number; matchedDays: number; matchRatePct: number; summary: string }

export function nutritionMatchRate(dailyIntake: DayIntake[], targets: Record<string, unknown>): NutritionMatch {
  if (dailyIntake.length === 0) return { daysCount: 0, matchedDays: 0, matchRatePct: 0, summary: '无数据' };
  const calGoal = targets['calorie_goal'];
  const proGoal = targets['protein_goal'];
  if (typeof calGoal !== 'number' || typeof proGoal !== 'number' || !calGoal || !proGoal) {
    return { daysCount: dailyIntake.length, matchedDays: 0, matchRatePct: 0, summary: '无营养目标' };
  }
  let matched = 0;
  for (const day of dailyIntake) {
    if (Math.abs(day.totalCalorie - calGoal) <= calGoal * 0.1 && day.totalProtein >= proGoal * 0.8) matched += 1;
  }
  const pct = round((matched / dailyIntake.length) * 100);
  return { daysCount: dailyIntake.length, matchedDays: matched, matchRatePct: pct, summary: pct + '%(' + matched + '/' + dailyIntake.length + ' 天 配比达标)' };
}

export interface AnomalyDay { date: string | null; type: string; value: number; target: number; diff: string; severity: string }
export interface DerivedReview extends FiveDims {
  todayPartial: { intake: DayIntake | null; burn: DayBurn | null };
  completeDaysCount: number;
  tdee: number;
  intakeSummary: { daysCount: number; isPartial?: boolean; avgCalorie: number; avgProtein: number; avgCarbs: number; avgFat: number };
  burnSummary: { daysCount: number; isPartial?: boolean; totalBurned: number; avgBurned: number; totalMinutes: number };
  macroRatio: { proteinPct: number; carbsPct: number; fatPct: number };
  weeklyDeficit: number;
  avgDailyDeficit: number;
  theoreticalWeightLoss: number;
  nutritionMatch: NutritionMatch;
  weightTrendSvg: null;
  weightTrendMeta: { deferred: string };
  anomalyDays: AnomalyDay[];
}

export function deriveReview(db: DatabaseSync, dims: FiveDims, today: string = todayISO()): DerivedReview {
  void db;
  const completeIntake = dims.dailyIntake.filter((d) => d.date < today);
  const todayIntake = dims.dailyIntake.find((d) => d.date === today) ?? null;
  const completeBurn = dims.dailyBurn.filter((d) => d.date < today);
  const todayBurn = dims.dailyBurn.find((d) => d.date === today) ?? null;
  const latestWeight = dims.weightLogs.length > 0 ? (dims.weightLogs[dims.weightLogs.length - 1] as WeightLogPoint).weightKg : null;
  const prof = dims.userProfile;
  const tdee = latestWeight && prof.heightCm
    ? round((10 * latestWeight + 6.25 * (prof.heightCm as number) - 5 * prof.age + (prof.gender === 'male' ? 5 : -161)) * getActivityFactor(prof.activityLevel))
    : 1800;
  const intakeSummary = completeIntake.length > 0
    ? {
      daysCount: completeIntake.length,
      avgCalorie: round1(completeIntake.reduce((a, d) => a + d.totalCalorie, 0) / completeIntake.length),
      avgProtein: round1(completeIntake.reduce((a, d) => a + d.totalProtein, 0) / completeIntake.length),
      avgCarbs: round1(completeIntake.reduce((a, d) => a + d.totalCarbs, 0) / completeIntake.length),
      avgFat: round1(completeIntake.reduce((a, d) => a + d.totalFat, 0) / completeIntake.length),
    }
    : todayIntake
      ? { daysCount: 1, isPartial: true as const, avgCalorie: todayIntake.totalCalorie, avgProtein: todayIntake.totalProtein, avgCarbs: todayIntake.totalCarbs, avgFat: todayIntake.totalFat }
      : { daysCount: 0, avgCalorie: 0, avgProtein: 0, avgCarbs: 0, avgFat: 0 };
  const burnSummary = completeBurn.length > 0
    ? {
      daysCount: completeBurn.length,
      totalBurned: completeBurn.reduce((a, d) => a + d.totalBurned, 0),
      avgBurned: round1(completeBurn.reduce((a, d) => a + d.totalBurned, 0) / completeBurn.length),
      totalMinutes: completeBurn.reduce((a, d) => a + (d.totalMinutes ?? 0), 0),
    }
    : todayBurn
      ? { daysCount: 1, isPartial: true as const, totalBurned: todayBurn.totalBurned, avgBurned: todayBurn.totalBurned, totalMinutes: todayBurn.totalMinutes ?? 0 }
      : { daysCount: 0, totalBurned: 0, avgBurned: 0, totalMinutes: 0 };
  const totalKcal = intakeSummary.avgProtein * 4 + intakeSummary.avgCarbs * 4 + intakeSummary.avgFat * 9;
  const macroRatio = totalKcal > 0
    ? { proteinPct: round((intakeSummary.avgProtein * 4) / totalKcal * 100), carbsPct: round((intakeSummary.avgCarbs * 4) / totalKcal * 100), fatPct: round((intakeSummary.avgFat * 9) / totalKcal * 100) }
    : { proteinPct: 0, carbsPct: 0, fatPct: 0 };
  const days = completeIntake.length > 0 ? completeIntake.length : (dims.range.days ?? 7);
  const totalIntake = intakeSummary.avgCalorie * days;
  const totalBurnedAll = burnSummary.totalBurned + tdee * days;
  const weeklyDeficit = totalBurnedAll - totalIntake;
  const nutritionMatch = nutritionMatchRate(completeIntake, dims.nutritionTargets);
  const targets = dims.nutritionTargets;
  const calGoal = typeof targets['calorie_goal'] === 'number' ? (targets['calorie_goal'] as number) : 1850;
  const fatGoal = typeof targets['fat_goal'] === 'number' ? (targets['fat_goal'] as number) : 60;
  const anomalyDays: AnomalyDay[] = [];
  for (const d of completeIntake) {
    if (d.totalCalorie > calGoal + 300) anomalyDays.push({ date: d.date, type: 'intake_excess', value: d.totalCalorie, target: calGoal, diff: '+' + (d.totalCalorie - calGoal) + ' 卡', severity: 'warn' });
    else if (d.totalCalorie < calGoal - 500) anomalyDays.push({ date: d.date, type: 'intake_deficit', value: d.totalCalorie, target: calGoal, diff: (d.totalCalorie - calGoal) + ' 卡', severity: 'warn' });
    if (d.totalFat > fatGoal * 1.5) anomalyDays.push({ date: d.date, type: 'fat_excess', value: d.totalFat, target: fatGoal, diff: '+' + (d.totalFat - fatGoal) + 'g 脂肪', severity: 'info' });
  }
  const sortedBurn = [...completeBurn].sort((a, b) => (a.date < b.date ? -1 : 1));
  let consec = 0;
  let maxConsec = 0;
  for (const d of sortedBurn) {
    if ((d.totalBurned ?? 0) === 0) { consec += 1; maxConsec = Math.max(maxConsec, consec); }
    else consec = 0;
  }
  if (maxConsec >= 3) anomalyDays.push({ date: null, type: 'exercise_streak_miss', value: maxConsec, target: 1, diff: '连续 ' + maxConsec + ' 天未运动', severity: 'warn' });
  return {
    ...dims,
    todayPartial: { intake: todayIntake, burn: todayBurn },
    completeDaysCount: completeIntake.length,
    tdee,
    intakeSummary,
    burnSummary,
    macroRatio,
    weeklyDeficit: round(weeklyDeficit),
    avgDailyDeficit: days > 0 ? round(weeklyDeficit / days) : 0,
    theoreticalWeightLoss: round1(weeklyDeficit / 7700),
    nutritionMatch,
    weightTrendSvg: null,
    weightTrendMeta: { deferred: 'SVG 属渲染层，归 T8-T10（待裁决）' },
    anomalyDays,
  };
}
