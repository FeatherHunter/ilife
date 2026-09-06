/** T5 #24 · 体重分析口径（对照老家 scripts/analysis/weight.py + weight_goal.py 取数段）。
 *
 * weightTrend / weightCompare / weightMilestone / weightVolatility /
 * weightVolatilityV2（Q8：detrended sigma，1.5σ 黄 / 2.0σ 红）。
 * 只取结构化形状；print 分支归 T11。stdev 为样本标准差（老家 statistics 同义）。
 * milestone 近 30 天窗用 UTC date('now') 口径（老家 SQLite 同义）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { FetchError } from '../fetch/errors.js';
import { parseDate, shiftISODate, todayISO } from './utils.js';
import { ok, rejection } from './result.js';
import type { AnalysisResult } from './result.js';

const round = (n: number): number => Math.round(n);
const round1 = (n: number): number => Math.round(n * 10) / 10;
const round2 = (n: number): number => Math.round(n * 100) / 100;

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

/** 样本标准差（statistics.stdev 同义；不足 2 个回 0）。 */
export function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (xs.length - 1));
}

/** %Y-W%W 周键（周一起，首周一前为 00 周）。 */
export function weekKey(iso: string): string {
  const d = new Date(iso + 'T12:00:00Z');
  const year = d.getUTCFullYear();
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const jan1Mon0 = (jan1.getUTCDay() + 6) % 7;
  const doy = Math.round((d.getTime() - jan1.getTime()) / 86400000) + 1;
  const w = Math.floor((doy - 1 - jan1Mon0 + 7) / 7);
  return year + '-W' + String(w).padStart(2, '0');
}

export interface WeightLog { date: string; weightKg: number; note: string }
export interface WeightTrend { recordCount: number; avgWeight: number; maxWeight: number; minWeight: number; firstDate: string; firstWeight: number; lastDate: string; lastWeight: number; changeKg: number; dailyChangeG: number; trend: 'stable' | 'up' | 'down'; trendCn: string; logs: WeightLog[] }

export function weightTrend(db: DatabaseSync, startDate: string, endDate?: string | null): AnalysisResult<WeightTrend> {
  const [start, end] = rangeOf(startDate, endDate);
  const rowsRaw = db.prepare(
    'SELECT date AS d, weight_kg AS w, note AS n FROM weight_log WHERE date >= ? AND date <= ? ORDER BY date ASC',
  ).all(start, end) as unknown as Array<{ d: string; w: number; n: string | null }>;
  const rows: Array<[string, number, string | null]> = rowsRaw.map((r) => [r.d, r.w, r.n]);
  if (rows.length === 0) return rejection('无体重记录（' + start + ' ~ ' + end + '）');
  const ws = rows.map((r) => r[1]);
  const avg = ws.reduce((a, b) => a + b, 0) / ws.length;
  const first = rows[0] as [string, number, string | null];
  const last = rows[rows.length - 1] as [string, number, string | null];
  const change = last[1] - first[1];
  const span = daysBetween(first[0], last[0]) + 1;
  const dailyRate = (change / span) * 1000;
  const trend = Math.abs(dailyRate) < 10 ? 'stable' : change > 0 ? 'up' : 'down';
  const trendCn = trend === 'stable' ? '平稳' : trend === 'up' ? '上升' : '下降';
  return ok({
    recordCount: rows.length,
    avgWeight: round1(avg),
    maxWeight: round1(Math.max(...ws)),
    minWeight: round1(Math.min(...ws)),
    firstDate: first[0],
    firstWeight: round1(first[1]),
    lastDate: last[0],
    lastWeight: round1(last[1]),
    changeKg: round1(change),
    dailyChangeG: round(dailyRate),
    trend,
    trendCn,
    logs: rows.map((r) => ({ date: r[0], weightKg: r[1], note: r[2] ?? '' })),
  }, '体重趋势 ' + rows.length + ' 条记录，趋势 ' + trendCn);
}

export interface CompareSide { start: string; end: string; avgWeight: number; firstWeight: number | null; firstDate: string | null; lastWeight: number | null; changeKg: number }
export interface WeightCompare { avgDiff: number; direction: 'up' | 'down'; speedLabel: string; currentPeriod: CompareSide; comparePeriod: CompareSide }

function periodAvg(db: DatabaseSync, s: string, e: string): number | null {
  const row = db.prepare('SELECT AVG(weight_kg) AS v FROM weight_log WHERE date >= ? AND date <= ?').get(s, e) as { v: number | null };
  return row.v;
}

function periodFirstLast(db: DatabaseSync, s: string, e: string): { first: { w: number; d: string } | null; lastW: number | null } {
  const r1 = db.prepare('SELECT weight_kg, date FROM weight_log WHERE date >= ? AND date <= ? ORDER BY date ASC LIMIT 1').get(s, e) as { weight_kg: number; date: string } | undefined;
  const r2 = db.prepare('SELECT weight_kg FROM weight_log WHERE date >= ? AND date <= ? ORDER BY date DESC LIMIT 1').get(s, e) as { weight_kg: number } | undefined;
  return { first: r1 ? { w: r1.weight_kg, d: r1.date } : null, lastW: r2 ? r2.weight_kg : null };
}

export function weightCompare(db: DatabaseSync, startDate: string, endDate: string, compareStart: string, compareEnd: string): AnalysisResult<WeightCompare> {
  const s1 = parseDate(startDate);
  const e1 = parseDate(endDate);
  const s2 = parseDate(compareStart);
  const e2 = parseDate(compareEnd);
  if (!s1 || !e1 || !s2 || !e2) throw new FetchError('对比日期非法');
  const avg1 = periodAvg(db, s1, e1);
  const avg2 = periodAvg(db, s2, e2);
  const fl1 = periodFirstLast(db, s1, e1);
  const fl2 = periodFirstLast(db, s2, e2);
  if (avg1 === null || avg1 === undefined || avg2 === null || avg2 === undefined) return rejection('对比时间段内无体重记录，无法对比');
  const avgDiff = avg1 - avg2;
  const change1 = fl1.first && fl1.lastW !== null && fl1.lastW !== undefined ? fl1.lastW - fl1.first.w : 0;
  const change2 = fl2.first && fl2.lastW !== null && fl2.lastW !== undefined ? fl2.lastW - fl2.first.w : 0;
  const changeDiff = change1 - change2;
  const speedLabel = changeDiff > 0 ? (change1 < 0 ? '较上期加速下降' : '较上期加速上升') : changeDiff < 0 ? (change1 < 0 ? '较上期减速下降' : '较上期减速上升') : '节奏与上期相同';
  const side = (s: string, e: string, avg: number, fl: { first: { w: number; d: string } | null; lastW: number | null }, ch: number): CompareSide => ({
    start: s,
    end: e,
    avgWeight: round1(avg),
    firstWeight: fl.first ? round1(fl.first.w) : null,
    firstDate: fl.first ? fl.first.d : null,
    lastWeight: fl.lastW !== null && fl.lastW !== undefined ? round1(fl.lastW) : null,
    changeKg: round1(ch),
  });
  return ok({
    avgDiff: round1(avgDiff),
    direction: avgDiff < 0 ? 'down' : 'up',
    speedLabel,
    currentPeriod: side(s1, e1, avg1, fl1, change1),
    comparePeriod: side(s2, e2, avg2, fl2, change2),
  }, '本期 vs 对比期: ' + (avgDiff >= 0 ? '+' : '') + round1(avgDiff) + 'kg');
}

export interface WeightGoalInfo { weightGoal: number; deadline: string | null; daysLeft: number | null; calorieAdjustment: number | null }

/** 体重目标取数（老家 weight_goal.get_weight_goal 取数段；无目标回 null）。 */
export function getWeightGoalInfo(db: DatabaseSync, today: string = todayISO()): WeightGoalInfo | null {
  const row = db.prepare('SELECT weight_goal, goal_deadline FROM daily_goal WHERE id = 1').get() as
    | { weight_goal: number | null; goal_deadline: string | null }
    | undefined;
  if (!row || !row.weight_goal) return null;
  const wrow = db.prepare('SELECT weight_kg, date FROM weight_log ORDER BY date DESC LIMIT 1').get() as
    | { weight_kg: number; date: string }
    | undefined;
  if (!wrow) return { weightGoal: row.weight_goal, deadline: row.goal_deadline, daysLeft: null, calorieAdjustment: null };
  let daysLeft: number | null = null;
  let calorieAdjustment: number | null = null;
  if (row.goal_deadline) {
    try {
      daysLeft = daysBetween(wrow.date, row.goal_deadline);
    } catch { daysLeft = null; }
  }
  void today;
  if (daysLeft !== null && daysLeft > 0) {
    const gap = wrow.weight_kg - row.weight_goal;
    calorieAdjustment = Math.trunc((gap / daysLeft) * 7700);
  }
  return { weightGoal: row.weight_goal, deadline: row.goal_deadline, daysLeft, calorieAdjustment };
}

export interface WeightMilestone { currentWeight: number; currentDate: string; weightGoal: number; deadline: string | null; gapKg: number; actualDailyChangeKg: number | null; estDate: string | null; estDays: number | null; status: string; calorieAdjustment: number | null }

export function weightMilestone(db: DatabaseSync, today: string = todayISO()): AnalysisResult<WeightMilestone> {
  const info = getWeightGoalInfo(db, today);
  if (!info) return rejection('未设定体重目标，请说「设定体重目标 XXkg」');
  const cur = db.prepare('SELECT weight_kg, date FROM weight_log ORDER BY date DESC LIMIT 1').get() as
    | { weight_kg: number; date: string }
    | undefined;
  if (!cur) return rejection('未记录体重');
  const gap = cur.weight_kg - info.weightGoal;
  const cutoff = shiftISODate(today, -30);
  const raw30 = db.prepare('SELECT weight_kg AS w, date AS d FROM weight_log WHERE date >= ? ORDER BY date ASC').all(cutoff) as unknown as Array<{ w: number; d: string }>;
  const rows: Array<[number, string]> = raw30.map((r) => [r.w, r.d]);
  let actualDaily: number | null = null;
  if (rows.length >= 2) {
    const first = rows[0] as [number, string];
    const last = rows[rows.length - 1] as [number, string];
    const span = daysBetween(first[1], last[1]) + 1;
    if (span > 0) actualDaily = (last[0] - first[0]) / span;
  }
  let estDays: number | null = null;
  if (info.daysLeft !== null && info.daysLeft !== undefined) estDays = info.daysLeft;
  else if (actualDaily && actualDaily !== 0) estDays = Math.abs(gap / actualDaily);
  let estDate: string | null = null;
  if (estDays && estDays > 0) {
    try { estDate = shiftISODate(cur.date, Math.round(estDays)); } catch { estDate = null; }
  }
  let status = '无法评估';
  if (info.daysLeft !== null && info.daysLeft !== undefined && actualDaily) {
    const required = info.daysLeft > 0 ? gap / info.daysLeft : 0;
    const actualPace = gap > 0 ? -actualDaily : actualDaily;
    const diff = actualPace - required;
    status = Math.abs(diff) < 0.02 ? '进度正常' : diff > 0 ? '进度超前' : '进度偏慢';
  }
  return ok({
    currentWeight: round1(cur.weight_kg),
    currentDate: cur.date,
    weightGoal: round1(info.weightGoal),
    deadline: info.deadline,
    gapKg: round1(gap),
    actualDailyChangeKg: actualDaily === null || actualDaily === undefined ? null : round2(actualDaily),
    estDate,
    estDays: estDays ? round(estDays) : null,
    status,
    calorieAdjustment: info.calorieAdjustment,
  }, '目标进度: ' + status);
}

export interface WeightVolatility { recordCount: number; dailyStdKg: number; weeklyStdKg: number; label: string; status: 'ok' | 'warn' | 'error'; anomalies: Array<{ date: string; diffKg: number; note: string }> }

export function weightVolatility(db: DatabaseSync, startDate: string, endDate?: string | null): AnalysisResult<WeightVolatility> {
  const [start, end] = rangeOf(startDate, endDate);
  const rowsRaw = db.prepare(
    'SELECT date AS d, weight_kg AS w, note AS n FROM weight_log WHERE date >= ? AND date <= ? ORDER BY date ASC',
  ).all(start, end) as unknown as Array<{ d: string; w: number; n: string | null }>;
  const rows: Array<[string, number, string | null]> = rowsRaw.map((r) => [r.d, r.w, r.n]);
  if (rows.length < 3) return rejection('记录不足（' + start + ' ~ ' + end + '），需要至少3条记录');
  const ws = rows.map((r) => r[1]);
  const stdDev = stdev(ws);
  const byWeek = new Map<string, number[]>();
  for (const r of rows) {
    const k = weekKey(r[0]);
    if (!byWeek.has(k)) byWeek.set(k, []);
    (byWeek.get(k) as number[]).push(r[1]);
  }
  const weekAvgs = [...byWeek.values()].map((v) => v.reduce((a, b) => a + b, 0) / v.length);
  const weekStd = stdev(weekAvgs);
  const anomalies: WeightVolatility['anomalies'] = [];
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1] as [string, number, string | null];
    const cur = rows[i] as [string, number, string | null];
    const diff = cur[1] - prev[1];
    if (Math.abs(diff) > 0.5) anomalies.push({ date: cur[0], diffKg: round1(diff), note: cur[2] ?? '' });
  }
  const label = stdDev < 0.3 ? '波动正常' : stdDev < 0.6 ? '波动中等' : '波动较大';
  const status = stdDev < 0.3 ? 'ok' : stdDev < 0.6 ? 'warn' : 'error';
  return ok({ recordCount: rows.length, dailyStdKg: round2(stdDev), weeklyStdKg: round2(weekStd), label, status, anomalies }, '波动: ' + label);
}
