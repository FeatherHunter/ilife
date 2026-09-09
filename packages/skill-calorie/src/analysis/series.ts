/** T5 #24 · 日序列 series 构建器（对照老家 scripts/analysis/series.py）。
 *
 * ADR-0013 唯一真相源：多表按天对齐；deficit = (TDEE + 运动) − 摄入（正=缺口）。
 * TDEE/目标全窗口静态值；无数据日字段为 null（不断言 0，不返空数组）。
 * 键名驼峰化（老家 snake → TS camel），T8 渲染以此为准。
 * today 可注入（默认 UTC 日，与 T3/T4 同口径）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { FetchError } from '../fetch/errors.js';
import { EX_ALIVE, calcTdee, shiftISODate, todayISO } from './utils.js';

export const WATER_NAME = '💧水';

export interface DaySeries {
  date: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  sodiumMg: number | null;
  sugarG: number | null;
  fiberG: number | null;
  waterMl: number | null;
  exerciseKcal: number | null;
  weightKg: number | null;
  bodyFatPct: number | null;
  waistCm: number | null;
  tdee: number;
  deficit: number | null;
  calorieGoal: number;
  waterGoal: number;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

/** 窗口选择器：Nd / 本周/上周/今年…（老家别名 week_cur 等一并支持）/ custom / 默认 30d。
 *
 * #103 G4 · window 白名单：Nd 仅收唤醒词契约的 7 档（7/15/30/60/90/180/365），
 * 具名仅收显式分支（week_cur/week_prev/month_cur/month_prev/year_cur/custom＋中文别名）；
 * 其余（`99d`、未知串）一律抛 FetchError（上层转 bad-input），不再静默生效/静默回退 30d。 */
export const COMBINED_WINDOW_DAYS = [7, 15, 30, 60, 90, 180, 365];
export const COMBINED_WINDOWS = [
  '7d', '15d', '30d', '60d', '90d', '180d', '365d',
  'week_cur', 'week_prev', 'month_cur', 'month_prev', 'year_cur', 'custom',
  '本周', '上周', '本月', '上月', '今年',
];
export function resolveWindow(window: string, start?: string | null, end?: string | null, today: string = todayISO()): [string, string] {
  const t = Date.parse(today + 'T12:00:00Z');
  if (Number.isNaN(t)) throw new FetchError('日期非法: ' + today);
  const weekday = Math.floor(((t / 86400000) + 3) % 7);
  const mondayOffset = -weekday;
  if (window === 'custom') {
    if (start && end) return [start, end];
    return [shiftISODate(today, -30), shiftISODate(today, -1)];
  }
  const m = /^([0-9]+)d$/.exec(window);
  if (m) {
    const n = Number(m[1]);
    if (!(COMBINED_WINDOW_DAYS as number[]).includes(n)) {
      throw new FetchError('window 非法（Nd 仅收 ' + COMBINED_WINDOW_DAYS.map((d) => d + 'd').join('/') + '）：' + window);
    }
    return [shiftISODate(today, -(n - 1)), today];
  }
  if (window === '本周' || window === 'week_cur') return [shiftISODate(today, mondayOffset), today];
  if (window === '上周' || window === 'week_prev') return [shiftISODate(today, mondayOffset - 7), shiftISODate(today, mondayOffset - 1)];
  if (window === '本月' || window === 'month_cur') return [today.slice(0, 8) + '01', today];
  if (window === '上月' || window === 'month_prev') {
    const firstThis = today.slice(0, 8) + '01';
    const lastLast = shiftISODate(firstThis, -1);
    return [lastLast.slice(0, 8) + '01', lastLast];
  }
  if (window === '今年' || window === 'year_cur') return [today.slice(0, 4) + '-01-01', today];
  // #103 G4 · 未知值不再静默回退 30d：显式拒绝，上层转 bad-input（exit 2）。
  throw new FetchError('window 非法，可选: ' + COMBINED_WINDOWS.join(', '));
}

interface ProfileRow {
  age: number | null;
  gender: string | null;
  height_cm: number | null;
  activity_level: string | null;
}

/** 档案 TDEE（体重恒 70.0 parity，见 utils 说明）。 */
export function loadProfileTdee(db: DatabaseSync): number {
  try {
    const prof = db.prepare('SELECT age, gender, height_cm, activity_level FROM user_profile WHERE id = 1').get() as ProfileRow | undefined;
    return calcTdee(70.0, prof?.height_cm ?? 170.0, prof?.age ?? 30, prof?.gender ?? 'male', prof?.activity_level ?? 'moderate');
  } catch {
    return 1800;
  }
}

interface DietAgg { date: string; c: number | null; p: number | null; cb: number | null; f: number | null; na: number | null; su: number | null; fi: number | null }
interface DateVal { date: string; v: number | null }
interface WaistRow { date: string; waist: number | null; hip: number | null }

export function buildSeries(db: DatabaseSync, start: string, end: string): DaySeries[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    throw new FetchError('起止日期非法: ' + start + ' ~ ' + end);
  }
  if (start > end) throw new FetchError('start 不得晚于 end');
  const tdee = loadProfileTdee(db);
  const diet = db.prepare(
    'SELECT date, SUM(calories) AS c, SUM(protein) AS p, SUM(carbs) AS cb, SUM(fat) AS f,' +
    ' SUM(sodium_mg) AS na, SUM(sugar_g) AS su, SUM(fiber_g) AS fi' +
    ' FROM food_log WHERE date BETWEEN ? AND ? AND food_name != ? GROUP BY date',
  ).all(start, end, WATER_NAME) as unknown as DietAgg[];
  const water = db.prepare(
    'SELECT date, SUM(grams) AS v FROM food_log WHERE date BETWEEN ? AND ? AND food_name = ? GROUP BY date',
  ).all(start, end, WATER_NAME) as unknown as DateVal[];
  const ex = db.prepare(
    'SELECT date, SUM(calories_burned) AS v FROM exercise_log WHERE date BETWEEN ? AND ? AND ' + EX_ALIVE + ' GROUP BY date',
  ).all(start, end) as unknown as DateVal[];
  const wrows = db.prepare(
    'SELECT date, weight_kg AS v FROM weight_log WHERE date BETWEEN ? AND ? ORDER BY date, time ASC, id ASC',
  ).all(start, end) as unknown as DateVal[];
  const bfrows = db.prepare(
    'SELECT date, body_fat_pct AS v FROM body_composition WHERE date BETWEEN ? AND ? AND is_deprecated = 0 ORDER BY date, id ASC',
  ).all(start, end) as unknown as DateVal[];
  const bmrows = db.prepare(
    'SELECT date, waist_cm AS waist, hip_cm AS hip FROM body_measurements WHERE date BETWEEN ? AND ? AND is_deprecated = 0 ORDER BY date, id ASC',
  ).all(start, end) as unknown as WaistRow[];
  const goal = db.prepare('SELECT calorie_goal, water_goal FROM daily_goal WHERE id = 1').get() as
    | { calorie_goal: number | null; water_goal: number | null }
    | undefined;
  const dietBy = new Map(diet.map((r) => [r.date, r]));
  const waterBy = new Map(water.map((r) => [r.date, r.v]));
  const exBy = new Map(ex.map((r) => [r.date, r.v]));
  const weightFirst = new Map<string, number | null>();
  for (const r of wrows) if (!weightFirst.has(r.date)) weightFirst.set(r.date, r.v);
  const bfFirst = new Map<string, number | null>();
  for (const r of bfrows) if (!bfFirst.has(r.date)) bfFirst.set(r.date, r.v);
  const waistFirst = new Map<string, number | null>();
  for (const r of bmrows) {
    if (!waistFirst.has(r.date)) waistFirst.set(r.date, r.waist ?? r.hip);
  }
  const out: DaySeries[] = [];
  for (let d = start; d <= end; d = shiftISODate(d, 1)) {
    const dr = dietBy.get(d);
    const calories = dr ? dr.c : null;
    const exerciseKcal = exBy.get(d) ?? null;
    const deficit = calories === null || calories === undefined ? null : round1(tdee + (exerciseKcal ?? 0) - calories);
    out.push({
      date: d,
      calories,
      protein: dr ? dr.p : null,
      carbs: dr ? dr.cb : null,
      fat: dr ? dr.f : null,
      sodiumMg: dr ? dr.na : null,
      sugarG: dr ? dr.su : null,
      fiberG: dr ? dr.fi : null,
      waterMl: waterBy.get(d) ?? null,
      exerciseKcal,
      weightKg: weightFirst.get(d) ?? null,
      bodyFatPct: bfFirst.get(d) ?? null,
      waistCm: waistFirst.get(d) ?? null,
      tdee,
      deficit,
      calorieGoal: goal?.calorie_goal ?? 1800,
      waterGoal: goal?.water_goal ?? 2000,
    });
  }
  return out;
}

/** 序列均值（null 跳过；全空回 null）。 */
export function seriesAvg(series: DaySeries[], field: keyof DaySeries): number | null {
  const vals = series.map((s) => s[field]).filter((v): v is number => typeof v === 'number');
  if (vals.length === 0) return null;
  return round1(vals.reduce((a, b) => a + b, 0) / vals.length);
}

/** 序列求和（null 按 0）。 */
export function seriesSum(series: DaySeries[], field: keyof DaySeries): number {
  return round1(series.reduce((a, s) => a + (typeof s[field] === 'number' ? (s[field] as number) : 0), 0));
}

/** 序列非空计数。 */
export function seriesCount(series: DaySeries[], field: keyof DaySeries): number {
  return series.filter((s) => s[field] !== null && s[field] !== undefined).length;
}

/** 序列净变化 = 最后非空 − 最前非空（不足 2 个回 null）。 */
export function seriesDelta(series: DaySeries[], field: keyof DaySeries): number | null {
  const vals = series.map((s) => s[field]).filter((v): v is number => typeof v === 'number');
  if (vals.length < 2) return null;
  return round1((vals[vals.length - 1] as number) - (vals[0] as number));
}
