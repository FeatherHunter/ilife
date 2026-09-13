/** T5 #24 · 日序列 series 构建器（对照老家 scripts/analysis/series.py）。
 *
 * ADR-0013 唯一真相源：多表按天对齐；deficit = (TDEE + 运动) − 摄入（正=缺口）。
 * TDEE/目标全窗口静态值；无数据日字段为 null（不断言 0，不返空数组）。
 * 键名驼峰化（老家 snake → TS camel），T8 渲染以此为准。
 * today 可注入（默认 UTC 日，与 T3/T4 同口径）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { FetchError } from '../fetch/errors.js';
import { BODY_ALIVE, EX_ALIVE, calcTdee, shiftISODate, todayISO } from './utils.js';

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

/** 窗口词汇与解析的**唯一定义地**（#250 重做）。
 *
 * #250 · 按用户 2026-09-13 的两条要求重做：
 *   ① **语义正确**——「今日／本周／本月／今年」一律按**自然周期**解析（本周＝本周一..锚点日，
 *      与老技能 `--week current` 同义）；锚点缺省＝真实今天，可由调用方显式传入（演示与测试用它复现固定日）。
 *   ② **接口全面**——`Nd` 不再限于 #103 G4 的 7 档白名单（那条契约是当时「只做组合分析」留下的限制），
 *      改收任意正整数（上限 `MAX_WINDOW_DAYS`，只挡笔误）；另加两件正交能力：
 *      `offset`（窗口整体平移 ±Nd／±Nw／±Nm／±Ny，用来表达「一年前今天」这类）与
 *      `compareWindow`（对比侧窗口，同一套词表，另收 `prev`＝紧邻主窗口之前的等长窗口）。
 *
 * 未知值一律抛 FetchError（上层转 bad-input），不静默回退。 */
export const WINDOW_WORDS = [
  '今日', '昨日', '本周', '上周', '下周', '本月', '上月', '今年', '去年', '工作日', '周末', 'custom',
] as const;
/** 可接受的窗口写法（说明性清单：词表 ＋ Nd 族 ＋ 老家别名），报错文本与文档引用它。 */
export const COMBINED_WINDOWS = [
  ...WINDOW_WORDS,
  'Nd', '7d', '15d', '30d', '60d', '90d', '180d', '365d',
  'week_cur', 'week_prev', 'week_next', 'month_cur', 'month_prev', 'year_cur', 'year_prev',
  'today', 'yesterday', 'prev',
];
/** Nd 的跨度上限（约十年）：只挡笔误，不挡真实用法。 */
export const MAX_WINDOW_DAYS = 3650;
const DAY_MS = 86400000;

/** 相对词与 Nd 的解析：返回 [start, end]（闭区间，ISO 日）。
 *  `today` ＝锚点（缺省真实今天）；`custom` 走调用方给的 start/end，缺省＝近 30 天。 */
export function resolveWindow(window: string, start?: string | null, end?: string | null, today: string = todayISO()): [string, string] {
  const t = Date.parse(today + 'T12:00:00Z');
  if (Number.isNaN(t)) throw new FetchError('日期非法: ' + today);
  const weekday = Math.floor(((t / DAY_MS) + 3) % 7);
  const mondayOffset = -weekday;
  const w = String(window ?? '').trim();
  if (w === 'custom') {
    if (start && end) return [start, end];
    return [shiftISODate(today, -30), shiftISODate(today, -1)];
  }
  const md = /^([0-9]+)d$/.exec(w);
  if (md) {
    const n = Number(md[1]);
    if (!(n >= 1 && n <= MAX_WINDOW_DAYS)) {
      throw new FetchError('window 非法（Nd 须 1..' + MAX_WINDOW_DAYS + '）：' + w);
    }
    return [shiftISODate(today, -(n - 1)), today];
  }
  if (w === '今日' || w === 'today') return [today, today];
  if (w === '昨日' || w === 'yesterday') return [shiftISODate(today, -1), shiftISODate(today, -1)];
  if (w === '本周' || w === 'week_cur') return [shiftISODate(today, mondayOffset), today];
  if (w === '上周' || w === 'week_prev') return [shiftISODate(today, mondayOffset - 7), shiftISODate(today, mondayOffset - 1)];
  if (w === '下周' || w === 'week_next') return [shiftISODate(today, mondayOffset + 7), shiftISODate(today, mondayOffset + 13)];
  if (w === '本月' || w === 'month_cur') return [today.slice(0, 8) + '01', today];
  if (w === '上月' || w === 'month_prev') {
    const firstThis = today.slice(0, 8) + '01';
    const lastLast = shiftISODate(firstThis, -1);
    return [lastLast.slice(0, 8) + '01', lastLast];
  }
  if (w === '今年' || w === 'year_cur') return [today.slice(0, 4) + '-01-01', today];
  if (w === '去年' || w === 'year_prev') {
    const y = Number(today.slice(0, 4)) - 1;
    return [y + '-01-01', y + '-12-31'];
  }
  // 工作日／周末：#250 定为「最近一个已经过完或正在过的周六–周日」＋「紧邻它之前的周一–周五」。
  // （锚点常是周一，本周六日还在未来——那样取到的窗是空的；按「最近的那对」取，任何锚点都落在过去、可比较。）
  if (w === '工作日' || w === '周末') {
    const dow = (weekday + 1) % 7; // 0=周日，1=周一，…，6=周六
    const satOffset = dow === 0 ? -1 : dow === 6 ? 0 : -(dow + 1);
    if (w === '周末') return [shiftISODate(today, satOffset), shiftISODate(today, satOffset + 1)];
    const fri = satOffset - 1;
    return [shiftISODate(today, fri - 4), shiftISODate(today, fri)];
  }
  throw new FetchError('window 非法，可选: ' + WINDOW_WORDS.join('／') + '，或 Nd（1..' + MAX_WINDOW_DAYS + '）');
}

/** 单日相对词：`date`／`from`／`to` 这类「一个日」的字段与窗口共用同一套说法。
 *  收 ISO 日、今日／昨日／前天（today／yesterday），其余原样交回由调用方校验（未知值不静默生效）。 */
export function resolveDay(token: string, today: string = todayISO()): string {
  const d = String(token ?? '').trim();
  if (d === '今日' || d === 'today') return today;
  if (d === '昨日' || d === 'yesterday') return shiftISODate(today, -1);
  if (d === '前天') return shiftISODate(today, -2);
  return d;
}

/** 窗口平移：`±Nd`（天）／`±Nw`（周＝7 天）／`±Nm`（按日历进退 N 月）／`±Ny`（按日历进退 N 年）。
 *  例：「一年前今天」＝`window:今日` ＋ `offset:-1y`；「最近 30 天 vs 之前 30 天」＝`compareWindow:prev`。 */
export function applyOffset(range: readonly [string, string], offset?: string | null): [string, string] {
  const o = String(offset ?? '').trim();
  if (!o) return [range[0], range[1]];
  const m = /^([+-])([0-9]+)([dwmy])$/.exec(o);
  if (!m) throw new FetchError('offset 非法（须 ±Nd／±Nw／±Nm／±Ny）：' + o);
  const sign = m[1] === '-' ? -1 : 1;
  const n = Number(m[2]) * sign;
  const shift = (iso: string): string => {
    if (m[3] === 'd') return shiftISODate(iso, n);
    if (m[3] === 'w') return shiftISODate(iso, n * 7);
    return shiftMonthsISO(iso, m[3] === 'y' ? n * 12 : n);
  };
  const [s, e] = [shift(range[0]), shift(range[1])];
  if (s > e) throw new FetchError('offset 后窗口倒置: ' + s + '..' + e);
  return [s, e];
}

/** 对比侧窗口：词表与主窗口同源；`prev` ＝紧邻主窗口之前的**等长**窗口（「近 N 天 vs 之前 N 天」）。 */
export function resolveCompareWindow(
  spec: string,
  main: readonly [string, string],
  start?: string | null,
  end?: string | null,
  today: string = todayISO(),
): [string, string] {
  const w = String(spec ?? '').trim();
  if (w === 'prev') {
    const days = (Date.parse(main[1]) - Date.parse(main[0])) / DAY_MS + 1;
    return [shiftISODate(main[0], -days), shiftISODate(main[0], -1)];
  }
  return resolveWindow(w, start, end, today);
}

/** 按日历进退 N 月（日号超出该月末则收到月末）。 */
function shiftMonthsISO(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12 + 1;
  const lastDay = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  const nd = Math.min(d, lastDay);
  return ny + '-' + String(nm).padStart(2, '0') + '-' + String(nd).padStart(2, '0');
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
    'SELECT date, body_fat_pct AS v FROM body_composition WHERE date BETWEEN ? AND ? AND ' + BODY_ALIVE + ' ORDER BY date, id ASC',
  ).all(start, end) as unknown as DateVal[];
  const bmrows = db.prepare(
    'SELECT date, waist_cm AS waist, hip_cm AS hip FROM body_measurements WHERE date BETWEEN ? AND ? AND ' + BODY_ALIVE + ' ORDER BY date, id ASC',
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
