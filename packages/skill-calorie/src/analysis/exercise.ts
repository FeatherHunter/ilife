/** T5 #24 · 运动分析口径（对照老家 scripts/analysis/exercise.py）。
 *
 * exerciseTrend / exerciseTypeBreakdown / exerciseDeficitContribution /
 * exerciseReview（计划 vs 实绩：完成率=实做组数/计划组数，B-305；容量聚合
 * #257：plan 仅 unit 缺省或 kg 且 weight>0，actual 仅 load_kg>0；TOP4 按
 * 计划+实绩合计；by_severity 计数）。只取结构化形状，不 print。
 * BMR 口径：体重×24×系数（老家原样）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { FetchError } from '../fetch/errors.js';
import { EX_ALIVE, getActivityFactor, parseDate, shiftISODate } from './utils.js';
import { ok, rejection } from './result.js';
import type { AnalysisResult } from './result.js';

const round = (n: number): number => Math.round(n);

function rangeOf(start: string, end?: string | null): [string, string] {
  const s = parseDate(start);
  if (!s) throw new FetchError('起始日期非法: ' + String(start));
  return [s, parseDate(end ?? undefined) ?? s];
}

function daysBetween(d1: string, d2: string): number {
  const a = Date.parse(d1 + 'T12:00:00Z');
  const b = Date.parse(d2 + 'T12:00:00Z');
  if (Number.isNaN(a) || Number.isNaN(b)) throw new FetchError('日期非法: ' + d1 + ' ~ ' + d2);
  return Math.round((b - a) / 86400000);
}

function latestWeightKg(db: DatabaseSync): number {
  const row = db.prepare('SELECT weight_kg FROM weight_log ORDER BY date DESC LIMIT 1').get() as { weight_kg: number | null } | undefined;
  return row?.weight_kg ?? 70;
}

function profileActivityLevel(db: DatabaseSync): string {
  const row = db.prepare('SELECT activity_level FROM user_profile WHERE id = 1').get() as { activity_level: string | null } | undefined;
  return row?.activity_level ?? 'moderate';
}

export interface ExerciseTrend { daysWithExercise: number; totalDays: number; coveragePct: number; totalCalories: number; totalMinutes: number; avgCaloriesPerDay: number; avgMinutesPerDay: number | null; longestStreakDays: number; longestRestDays: number; alert: string | null; durationMissing: boolean }

export function exerciseTrend(db: DatabaseSync, startDate: string, endDate?: string | null): AnalysisResult<ExerciseTrend> {
  const [start, end] = rangeOf(startDate, endDate);
  const raw = db.prepare(
    'SELECT date AS d, exercise_type AS t, duration_minutes AS dur, calories_burned AS k FROM exercise_log WHERE date >= ? AND date <= ? AND ' + EX_ALIVE + ' ORDER BY date ASC',
  ).all(start, end) as unknown as Array<{ d: string; t: string; dur: number | null; k: number | null }>;
  const rows: Array<[string, string, number | null, number | null]> = raw.map((r) => [r.d, r.t, r.dur, r.k]);
  if (rows.length === 0) return rejection('无运动记录（' + start + ' ~ ' + end + '）');
  const span = daysBetween(start, end) + 1;
  const dates = [...new Set(rows.map((r) => r[0]))].sort();
  const totalCal = rows.reduce((a, r) => a + (r[3] ?? 0), 0);
  const totalDur = rows.reduce((a, r) => a + (r[2] ?? 0), 0);
  const durationMissing = rows.every((r) => r[2] === null || r[2] === undefined);
  let longestStreak = 1;
  let cur = 1;
  for (let i = 1; i < dates.length; i++) {
    if (daysBetween(dates[i - 1] as string, dates[i] as string) === 1) { cur += 1; longestStreak = Math.max(longestStreak, cur); }
    else cur = 1;
  }
  let maxGap: number;
  if (dates.length >= 2) {
    maxGap = 0;
    for (let i = 1; i < dates.length; i++) maxGap = Math.max(maxGap, daysBetween(dates[i - 1] as string, dates[i] as string) - 1);
  } else maxGap = span - 1;
  return ok({
    daysWithExercise: dates.length,
    totalDays: span,
    coveragePct: round((dates.length / span) * 100),
    totalCalories: totalCal,
    totalMinutes: totalDur,
    avgCaloriesPerDay: round(totalCal / span),
    avgMinutesPerDay: durationMissing ? null : round(totalDur / span),
    longestStreakDays: longestStreak,
    longestRestDays: maxGap,
    alert: maxGap >= 7 ? '建议动起来' : null,
    durationMissing,
  }, '运动 ' + dates.length + '/' + span + ' 天，总消耗 ' + totalCal + ' 卡');
}

export interface ExerciseTypeStat { type: string; calories: number; count: number; minutes: number; calPct: number; countPct: number; minutesPct: number }
export interface ExerciseBreakdown { totalCalories: number; totalCount: number; totalMinutes: number; types: ExerciseTypeStat[] }

export function exerciseTypeBreakdown(db: DatabaseSync, startDate: string, endDate?: string | null): AnalysisResult<ExerciseBreakdown> {
  const [start, end] = rangeOf(startDate, endDate);
  const raw = db.prepare(
    'SELECT exercise_type AS t, SUM(calories_burned) AS k, COUNT(*) AS n, SUM(duration_minutes) AS dur FROM exercise_log WHERE date >= ? AND date <= ? AND ' + EX_ALIVE + ' GROUP BY exercise_type ORDER BY SUM(calories_burned) DESC',
  ).all(start, end) as unknown as Array<{ t: string; k: number | null; n: number; dur: number | null }>;
  const rows: Array<[string, number | null, number, number | null]> = raw.map((r) => [r.t, r.k, r.n, r.dur]);
  if (rows.length === 0) return rejection('无运动记录（' + start + ' ~ ' + end + '）');
  const totalCal = rows.reduce((a, r) => a + (r[1] ?? 0), 0);
  const totalCnt = rows.reduce((a, r) => a + r[2], 0);
  const totalDur = rows.reduce((a, r) => a + (r[3] ?? 0), 0);
  const types: ExerciseTypeStat[] = rows.map((r) => ({
    type: r[0],
    calories: r[1] ?? 0,
    count: r[2],
    minutes: r[3] ?? 0,
    calPct: totalCal === 0 ? 0 : round(((r[1] ?? 0) / totalCal) * 100),
    countPct: totalCnt === 0 ? 0 : round((r[2] / totalCnt) * 100),
    minutesPct: totalDur === 0 ? 0 : round(((r[3] ?? 0) / totalDur) * 100),
  }));
  return ok({ totalCalories: totalCal, totalCount: totalCnt, totalMinutes: totalDur, types }, types.length + ' 种运动类型');
}

export interface DeficitContribution { dietDeficit: number; dietContribPct: number; exerciseDeficit: number; exerciseContribPct: number; evaluation: string; bmr: number; currentWeight: number }

export function exerciseDeficitContribution(db: DatabaseSync, startDate: string, endDate?: string | null): AnalysisResult<DeficitContribution> {
  const [start, end] = rangeOf(startDate, endDate);
  const exRow = db.prepare('SELECT SUM(calories_burned) AS v FROM exercise_log WHERE date >= ? AND date <= ? AND ' + EX_ALIVE).get(start, end) as { v: number | null };
  const inRow = db.prepare('SELECT SUM(calories) AS v FROM food_log WHERE date >= ? AND date <= ?').get(start, end) as { v: number | null };
  const totalEx = exRow.v ?? 0;
  const totalIntake = inRow.v ?? 0;
  const span = daysBetween(start, end) + 1;
  const currentWeight = latestWeightKg(db);
  const bmr = currentWeight * 24 * getActivityFactor(profileActivityLevel(db));
  const dietDeficit = bmr * span - totalIntake;
  const totalDeficit = bmr * span - totalIntake + totalEx;
  let dietPct: number;
  let exPct: number;
  if (totalDeficit === 0) { dietPct = 50; exPct = 50; }
  else { dietPct = (Math.abs(dietDeficit) / Math.abs(totalDeficit)) * 100; exPct = (totalEx / Math.abs(totalDeficit)) * 100; }
  const evaluation = exPct < 15 ? '运动贡献偏低，建议增加运动比例' : exPct > 25 ? '运动贡献较高' : '运动贡献适中';
  return ok({
    dietDeficit: round(dietDeficit),
    dietContribPct: round(dietPct),
    exerciseDeficit: round(totalEx),
    exerciseContribPct: round(exPct),
    evaluation,
    bmr: round(bmr),
    currentWeight: Math.round(currentWeight * 10) / 10,
  }, '运动贡献 ' + round(exPct) + '% — ' + evaluation);
}

export interface ReviewAnomaly { type: 'low_completion' | 'over_completion' | 'no_actual' | 'rest_but_done'; msg: string }
export interface ReviewDay { date: string; planWeek: number | null; sessions: string[]; planTotalSets: number; actualTotalSets: number; caloriesBurned: number; completionRate: number | null; anomalies: ReviewAnomaly[]; note: string | null; isRestDay: boolean }
export interface ReviewMeta { bySeverityCount: Record<string, number>; totalDays: number; trainDays: number; restDays: number; totalCalories: number; volume: { weeks: Array<{ week: string; label: string; plan: number; actual: number; actualSets: number }>; movements: Array<{ name: string; planTotal: number; actualTotal: number; weeks: Array<{ week: string; label: string; plan: number; actual: number }> }>; totalPlan: number; totalActual: number; hasActual: boolean } }

interface PlanSessionLite { session_label: string; total_sets: number | null; movements: Array<{ name?: string; sets?: Array<{ weight?: unknown; reps?: unknown; unit?: string }> }> }
interface DayPlanLite { plan_week: number | null; config: { start_date: string } | null; sessions: PlanSessionLite[]; unstarted?: boolean }

function calcPlanWeek(targetISO: string, config: { total_weeks: number; start_date: string } | null): number | null {
  if (!config) return null;
  const diff = daysBetween(config.start_date, targetISO);
  if (diff < 0) return null;
  const realWeek = Math.floor(diff / 7) + 1;
  return ((realWeek - 1) % config.total_weeks) + 1;
}

function getDayPlan(db: DatabaseSync, targetISO: string): DayPlanLite {
  const cfg = db.prepare('SELECT total_weeks, start_date FROM workout_plan_config WHERE id = 1').get() as
    | { total_weeks: number; start_date: string }
    | undefined;
  const config = cfg ? { total_weeks: cfg.total_weeks, start_date: cfg.start_date } : null;
  const week = calcPlanWeek(targetISO, config);
  const dow = new Date(targetISO + 'T12:00:00Z').getUTCDay();
  const isoDow = dow === 0 ? 7 : dow;
  if (week === null && config !== null) {
    return { plan_week: null, config, sessions: [], unstarted: true };
  }
  const rows = db.prepare(
    'SELECT session_label, time_start, time_end, is_rest_day, total_sets, movements FROM workout_plans WHERE week_number = ? AND day_of_week = ? ORDER BY session_index',
  ).all(week, isoDow) as unknown as Array<[string, string | null, string | null, number, number | null, string | null]>;
  return {
    plan_week: week,
    config,
    sessions: rows.map((r) => ({ session_label: r[0], total_sets: r[4], movements: JSON.parse(r[5] || '[]') as PlanSessionLite['movements'] })),
  };
}

function isoWeekKey(iso: string): string {
  const d = new Date(iso + 'T12:00:00Z');
  const day = (d.getUTCDay() + 6) % 7;
  const thursday = new Date(d.getTime() + (3 - day) * 86400000);
  const year = thursday.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const week = 1 + Math.round(((thursday.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return year + '-W' + String(week).padStart(2, '0');
}

function weekLabel(mondayISO: string): string {
  const mon = new Date(mondayISO + 'T12:00:00Z');
  const sun = new Date(mon.getTime() + 6 * 86400000);
  const m1 = mon.getUTCMonth() + 1;
  const d1 = mon.getUTCDate();
  const m2 = sun.getUTCMonth() + 1;
  const d2 = sun.getUTCDate();
  return m1 === m2 ? m1 + '/' + d1 + '~' + d2 : m1 + '/' + d1 + '~' + m2 + '/' + d2;
}

export function exerciseReview(db: DatabaseSync, startDate: string, endDate?: string | null): AnalysisResult<Record<string, ReviewDay>> {
  const [start, end] = rangeOf(startDate, endDate);
  const results = new Map<string, ReviewDay>();
  const volPlanWeek = new Map<string, number>();
  const volActualWeek = new Map<string, number>();
  const volPlanMov = new Map<string, number>();
  const volActualMov = new Map<string, number>();
  const volMovTotal = new Map<string, { plan: number; actual: number }>();
  const volWeeks: string[] = [];
  const weekMonday = new Map<string, string>();
  const addVol = (m: Map<string, number>, k: string, v: number): void => { m.set(k, (m.get(k) ?? 0) + v); };
  for (let d = start; d <= end; d = shiftISODate(d, 1)) {
    const wk = isoWeekKey(d);
    if (volWeeks[volWeeks.length - 1] !== wk) { volWeeks.push(wk); weekMonday.set(wk, shiftISODate(d, -(((new Date(d + 'T12:00:00Z').getUTCDay() + 6) % 7)))); }
    const plan = getDayPlan(db, d);
    const planSessions = plan.sessions;
    const planTotalSets = planSessions.reduce((a, s) => a + (s.total_sets ?? 0), 0);
    const sessionLabels = planSessions.map((s) => s.session_label ?? '');
    for (const s of planSessions) {
      for (const m of s.movements ?? []) {
        const name = m.name ?? '';
        for (const st of m.sets ?? []) {
          const w = Number(st.weight ?? 0);
          const reps = Math.trunc(Number(st.reps ?? 0));
          if (!(w > 0) || !(reps > 0)) continue;
          const unit = st.unit ?? '';
          if (unit && unit !== 'kg') continue;
          const ton = w * reps;
          addVol(volPlanWeek, wk, ton);
          addVol(volPlanMov, wk + '\u0000' + name, ton);
          const t = volMovTotal.get(name) ?? { plan: 0, actual: 0 };
          t.plan += ton;
          volMovTotal.set(name, t);
        }
      }
    }
    const exRaw = db.prepare(
      'SELECT exercise_type AS t, duration_minutes AS dur, calories_burned AS k, reps AS r, load_kg AS l FROM exercise_log WHERE date = ? AND ' + EX_ALIVE + ' ORDER BY exercise_type',
    ).all(d) as unknown as Array<{ t: string; dur: number | null; k: number | null; r: number | null; l: number | null }>;
    const exRows: Array<[string, number | null, number | null, number | null, number | null]> = exRaw.map((r) => [r.t, r.dur, r.k, r.r, r.l]);
    const actual = new Map<string, { sets: number; calories: number; minutes: number }>();
    for (const r of exRows) {
      const etype = r[0];
      const a = actual.get(etype) ?? { sets: 0, calories: 0, minutes: 0 };
      a.sets += 1;
      a.calories += r[2] ?? 0;
      a.minutes += r[1] ?? 0;
      actual.set(etype, a);
      const load = r[4] ?? 0;
      const reps = r[3] ?? 0;
      if (load > 0 && reps > 0) {
        const ton = load * reps;
        addVol(volActualWeek, wk, ton);
        addVol(volActualMov, wk + '\u0000' + etype, ton);
        const t = volMovTotal.get(etype) ?? { plan: 0, actual: 0 };
        t.actual += ton;
        volMovTotal.set(etype, t);
      }
    }
    const actualTotalSets = [...actual.values()].reduce((a, v) => a + v.sets, 0);
    const anomalies: ReviewAnomaly[] = [];
    let note: string | null = null;
    let completionRate: number | null = null;
    if (plan.unstarted) {
      note = '计划尚未开始(起始 ' + (plan.config as { start_date: string }).start_date + ')';
    } else if (planTotalSets === 0 && actualTotalSets === 0) {
      note = '休息日 / 无计划无实绩';
    } else if (planTotalSets === 0 && actualTotalSets > 0) {
      note = '计划休息但实做了 ' + actualTotalSets + ' 组';
      anomalies.push({ type: 'rest_but_done', msg: '⚠️ ' + note });
    } else if (planTotalSets > 0 && actualTotalSets === 0) {
      note = '计划有训练但完全未做';
      completionRate = 0.0;
      anomalies.push({ type: 'no_actual', msg: '❌ ' + note });
    } else {
      completionRate = (actualTotalSets / planTotalSets) * 100;
      if (completionRate < 50) anomalies.push({ type: 'low_completion', msg: '⚠️ 完成率仅 ' + Math.round(completionRate) + '%（实做 ' + actualTotalSets + '/' + planTotalSets + ' 组数）' });
      else if (completionRate > 130) anomalies.push({ type: 'over_completion', msg: '⚠️ 超额完成 (' + Math.round(completionRate) + '%)（' + actualTotalSets + '/' + planTotalSets + ' 组数）' });
    }
    results.set(d, {
      date: d,
      planWeek: plan.plan_week,
      sessions: sessionLabels,
      planTotalSets,
      actualTotalSets,
      caloriesBurned: [...actual.values()].reduce((a, v) => a + v.calories, 0),
      completionRate,
      anomalies,
      note,
      isRestDay: planTotalSets === 0 && actualTotalSets === 0,
    });
  }
  const bySeverityCount: Record<string, number> = { low_completion: 0, over_completion: 0, no_actual: 0, rest_but_done: 0 };
  for (const r of results.values()) {
    for (const a of r.anomalies) {
      if (a.type in bySeverityCount) bySeverityCount[a.type] = (bySeverityCount[a.type] as number) + 1;
    }
  }
  const wlabel = (wk: string): string => weekLabel(weekMonday.get(wk) as string);
  const volumeWeeks = volWeeks.map((wk) => ({ week: wk, label: wlabel(wk), plan: round(volPlanWeek.get(wk) ?? 0), actual: round(volActualWeek.get(wk) ?? 0), actualSets: 0 }));
  const topNames = [...volMovTotal.keys()].sort((a, b) => {
    const ta = volMovTotal.get(a) as { plan: number; actual: number };
    const tb = volMovTotal.get(b) as { plan: number; actual: number };
    return tb.plan + tb.actual - (ta.plan + ta.actual);
  }).slice(0, 4);
  const volumeMovements = topNames.map((name) => {
    const t = volMovTotal.get(name) as { plan: number; actual: number };
    return { name, planTotal: round(t.plan), actualTotal: round(t.actual), weeks: volWeeks.map((wk) => ({ week: wk, label: wlabel(wk), plan: round(volPlanMov.get(wk + '\u0000' + name) ?? 0), actual: round(volActualMov.get(wk + '\u0000' + name) ?? 0) })) };
  });
  const totalActualTon = [...volActualWeek.values()].reduce((a, b) => a + b, 0);
  const days = [...results.values()];
  const data: Record<string, ReviewDay> & { __meta__?: unknown } = {};
  for (const [k, v] of results) data[k] = v;
  (data as Record<string, unknown>).__meta__ = {
    bySeverityCount,
    totalDays: days.length,
    trainDays: days.filter((r) => !r.isRestDay).length,
    restDays: days.filter((r) => r.isRestDay).length,
    totalCalories: days.reduce((a, r) => a + (r.caloriesBurned ?? 0), 0),
    volume: { weeks: volumeWeeks, movements: volumeMovements, totalPlan: round([...volPlanWeek.values()].reduce((a, b) => a + b, 0)), totalActual: round(totalActualTon), hasActual: totalActualTon > 0 },
  };
  return ok(data, '训练复盘 ' + days.length + ' 天');
}
