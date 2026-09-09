/** #111 · 运动移植 6 键取数（t71 需移植 exercise_* 六模板的数据面）。
 *
 * 行源一律 T3 `listWindow`（软删除已排除）；分类口径＝**库内实填优先、缺失回退
 * `inferCategory`**（旧模板按入库 category 过滤，本层沿旧口径；view.exercise 的纯
 * 推断口径不动，两处差异见证据 R2）。
 * 缺失阻断不返空：窗内无行即 `missing-data`（G5 #100 口径）；日期非法即 `bad-input`。
 * 本层只做取数＋聚合，不组 HTML（组装归 `render/sportPortDocs.ts`）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { inferCategory, listWindow } from '../fetch/exercise.js';
import type { ExerciseRow } from '../fetch/exercise.js';
import { getPlan } from '../fetch/plan.js';
import { buildSeries } from '../analysis/series.js';
import { shiftISODate } from '../analysis/utils.js';
import { round2 } from '../kcal.js';
import { FetchError } from '../fetch/errors.js';
import { CalorieRenderError } from './errors.js';

function assertRange(start: string, end: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    throw new CalorieRenderError('bad-input', '起止日期非法: ' + start + ' ~ ' + end);
  }
  if (start > end) throw new CalorieRenderError('bad-input', 'start 不得晚于 end');
}

/** 库内实填分类优先（去空格），空串／缺失回退按名推断。 */
export function effectiveCategory(r: ExerciseRow): string {
  const stored = String(r.category ?? '').trim();
  if (stored) return stored;
  return inferCategory(String(r.exercise_type ?? ''));
}

export interface PortRow {
  date: string;
  time: string | null;
  type: string;
  minutes: number | null;
  burned: number;
  category: string;
  distanceKm: number | null;
  avgHr: number | null;
  loadKg: number | null;
  reps: number | null;
  setIndex: number | null;
  note: string;
}

function toPortRow(r: ExerciseRow): PortRow {
  const num = (v: unknown): number | null =>
    (typeof v === 'number' && Number.isFinite(v) ? v : null);
  return {
    date: String(r.date),
    time: r.time === null || r.time === undefined ? null : String(r.time),
    type: String(r.exercise_type ?? '未知'),
    minutes: num(r.duration_minutes),
    burned: num(r.calories_burned) ?? 0,
    category: effectiveCategory(r),
    distanceKm: num(r.distance_km),
    avgHr: num(r.avg_heart_rate),
    loadKg: num(r.load_kg),
    reps: num(r.reps),
    setIndex: num(r.set_index),
    note: String(r.note ?? ''),
  };
}

/** 窗内全部行（无行即 missing-data；调用方再按类过滤——过滤致空亦 missing）。 */
export function listPortRows(db: DatabaseSync, start: string, end: string): PortRow[] {
  assertRange(start, end);
  let rows: ExerciseRow[];
  try {
    rows = listWindow(db, start, end);
  } catch (e) {
    if (e instanceof FetchError) throw new CalorieRenderError('missing-data', e.message);
    throw e;
  }
  if (rows.length === 0) throw new CalorieRenderError('missing-data', `无运动记录：${start} ~ ${end}`);
  return rows.map(toPortRow);
}

function missingCat(start: string, end: string, cat: string): CalorieRenderError {
  return new CalorieRenderError('missing-data', `无${cat}记录：${start} ~ ${end}`);
}

/* ── 力量总览（exercise_strength：按动作聚合＋重量轨迹） ── */

export interface StrengthByMovement {
  movement: string;
  sets: number;
  volumeKg: number | null;
  reps: number | null;
}

export interface StrengthView {
  start: string;
  end: string;
  rows: PortRow[];
  movementCount: number;
  totalSets: number;
  totalVolumeKg: number | null;
  totalReps: number | null;
  byMovement: StrengthByMovement[];
  /** 重量轨迹（近 10 个训练日；单侧口径＝旧模板：Σ load×reps）。 */
  trail: { date: string; volumeKg: number | null }[];
}

export function buildStrengthView(db: DatabaseSync, start: string, end: string): StrengthView {
  const rows = listPortRows(db, start, end).filter((r) => r.category === '力量');
  if (rows.length === 0) throw missingCat(start, end, '力量');
  const byMovement = new Map<string, StrengthByMovement>();
  let vol = 0;
  let volKnown = false;
  let reps = 0;
  let repsKnown = false;
  const byDate = new Map<string, number>();
  let byDateKnown = new Set<string>();
  for (const r of rows) {
    const m = byMovement.get(r.type) ?? { movement: r.type, sets: 0, volumeKg: null, reps: null };
    m.sets += 1;
    let mv = 0;
    let mvKnown = false;
    if (r.loadKg !== null && r.reps !== null) {
      mv = round2(r.loadKg * r.reps);
      mvKnown = true;
      vol += mv;
      volKnown = true;
      byDate.set(r.date, round2((byDate.get(r.date) ?? 0) + mv));
      byDateKnown.add(r.date);
    }
    if (r.reps !== null) {
      reps += r.reps;
      repsKnown = true;
      m.reps = (m.reps ?? 0) + r.reps;
    }
    if (mvKnown) m.volumeKg = round2((m.volumeKg ?? 0) + mv);
    byMovement.set(r.type, m);
  }
  const dates = [...new Set(rows.map((r) => r.date))].sort().slice(-10);
  return {
    start,
    end,
    rows,
    movementCount: byMovement.size,
    totalSets: rows.length,
    totalVolumeKg: volKnown ? round2(vol) : null,
    totalReps: repsKnown ? reps : null,
    byMovement: [...byMovement.values()].sort((a, b) => (b.volumeKg ?? -1) - (a.volumeKg ?? -1)),
    trail: dates.map((d) => ({ date: d, volumeKg: byDateKnown.has(d) ? (byDate.get(d) ?? null) : null })),
  };
}

/* ── 有氧总览（exercise_cardio：按类型聚合＋配速） ── */

export interface CardioByType {
  type: string;
  sessions: number;
  minutes: number | null;
  distanceKm: number | null;
  paceMinPerKm: number | null;
}

export interface CardioView {
  start: string;
  end: string;
  rows: PortRow[];
  sessions: number;
  totalMinutes: number | null;
  totalDistanceKm: number | null;
  avgPaceMinPerKm: number | null;
  byType: CardioByType[];
}

/** 配速（分/公里；无距离即 null，不编数）。 */
function paceOf(minutes: number | null, km: number | null): number | null {
  if (minutes === null || km === null || km <= 0) return null;
  return round2(minutes / km);
}

export function buildCardioView(db: DatabaseSync, start: string, end: string): CardioView {
  const rows = listPortRows(db, start, end).filter((r) => r.category === '有氧');
  if (rows.length === 0) throw missingCat(start, end, '有氧');
  const byType = new Map<string, { sessions: number; minutes: number; minKnown: boolean; km: number; kmKnown: boolean }>();
  let min = 0;
  let minKnown = false;
  let km = 0;
  let kmKnown = false;
  for (const r of rows) {
    const t = byType.get(r.type) ?? { sessions: 0, minutes: 0, minKnown: false, km: 0, kmKnown: false };
    t.sessions += 1;
    if (r.minutes !== null) {
      t.minutes += r.minutes;
      t.minKnown = true;
      min += r.minutes;
      minKnown = true;
    }
    if (r.distanceKm !== null) {
      t.km = round2(t.km + r.distanceKm);
      t.kmKnown = true;
      km = round2(km + r.distanceKm);
      kmKnown = true;
    }
    byType.set(r.type, t);
  }
  return {
    start,
    end,
    rows,
    sessions: rows.length,
    totalMinutes: minKnown ? min : null,
    totalDistanceKm: kmKnown ? round2(km) : null,
    avgPaceMinPerKm: (minKnown && kmKnown && km > 0) ? paceOf(min, km) : null,
    byType: [...byType.entries()].map(([type, t]) => ({
      type,
      sessions: t.sessions,
      minutes: t.minKnown ? t.minutes : null,
      distanceKm: t.kmKnown ? t.km : null,
      paceMinPerKm: paceOf(t.minKnown ? t.minutes : null, t.kmKnown ? t.km : null),
    })).sort((a, b) => b.sessions - a.sessions),
  };
}

/* ── 类型分布（exercise_distribution：四类桶＋摄入/TDEE 联动） ── */

export interface DistributionBucket {
  category: string;
  sessions: number;
  burned: number;
  minutes: number | null;
  shareByBurned: number | null;
  shareBySessions: number | null;
}

export interface DistributionView {
  start: string;
  end: string;
  days: number;
  activeDays: number;
  sessions: number;
  totalBurned: number;
  buckets: DistributionBucket[];
  intakeCal: number | null;
  tdeeTotal: number | null;
  /** 缺口＝TDEE×天＋运动−摄入（series ADR-0013 口径；缺摄入即 null）。 */
  deficit: number | null;
}

const KNOWN_CATS = ['力量', '有氧', '柔韧', '日常'];

export function buildDistributionView(db: DatabaseSync, start: string, end: string): DistributionView {
  const rows = listPortRows(db, start, end);
  const series = buildSeries(db, start, end);
  const days = series.length;
  const daySet = new Set(rows.map((r) => r.date));
  const acc = new Map<string, { sessions: number; burned: number; minutes: number; minKnown: boolean }>();
  let totalBurned = 0;
  for (const r of rows) {
    const cat = KNOWN_CATS.includes(r.category) ? r.category : '其他';
    const b = acc.get(cat) ?? { sessions: 0, burned: 0, minutes: 0, minKnown: false };
    b.sessions += 1;
    b.burned = round2(b.burned + r.burned);
    if (r.minutes !== null) {
      b.minutes += r.minutes;
      b.minKnown = true;
    }
    acc.set(cat, b);
    totalBurned = round2(totalBurned + r.burned);
  }
  const order = [...KNOWN_CATS, '其他'].filter((c) => acc.has(c));
  const buckets: DistributionBucket[] = order.map((c) => {
    const b = acc.get(c) as { sessions: number; burned: number; minutes: number; minKnown: boolean };
    return {
      category: c,
      sessions: b.sessions,
      burned: b.burned,
      minutes: b.minKnown ? b.minutes : null,
      shareByBurned: totalBurned > 0 ? round2((b.burned / totalBurned) * 100) : null,
      shareBySessions: rows.length > 0 ? round2((b.sessions / rows.length) * 100) : null,
    };
  });
  let intake: number | null = null;
  let tdee = 0;
  for (const d of series) {
    if (d.calories !== null) intake = round2((intake ?? 0) + d.calories);
    tdee = round2(tdee + d.tdee);
  }
  return {
    start,
    end,
    days,
    activeDays: daySet.size,
    sessions: rows.length,
    totalBurned,
    buckets,
    intakeCal: intake,
    tdeeTotal: days > 0 ? tdee : null,
    deficit: intake === null ? null : round2(tdee + totalBurned - intake),
  };
}

/* ── 运动复盘（exercise_recap：多窗 KPI＋TOP5＋日趋势＋一句话） ── */

export interface RecapView {
  start: string;
  end: string;
  sessions: number;
  totalMinutes: number | null;
  totalBurned: number;
  activeDays: number;
  days: number;
  byCategory: { category: string; sessions: number; burned: number }[];
  top5: { type: string; sessions: number; burned: number }[];
  daily: { date: string; burned: number | null }[];
  summary: string;
}

export function buildRecapView(db: DatabaseSync, start: string, end: string): RecapView {
  const rows = listPortRows(db, start, end);
  const series = buildSeries(db, start, end);
  let totalBurned = 0;
  let min = 0;
  let minKnown = false;
  const byCat = new Map<string, { sessions: number; burned: number }>();
  const byType = new Map<string, { sessions: number; burned: number }>();
  for (const r of rows) {
    totalBurned = round2(totalBurned + r.burned);
    if (r.minutes !== null) {
      min += r.minutes;
      minKnown = true;
    }
    const c = byCat.get(r.category) ?? { sessions: 0, burned: 0 };
    c.sessions += 1;
    c.burned = round2(c.burned + r.burned);
    byCat.set(r.category, c);
    const t = byType.get(r.type) ?? { sessions: 0, burned: 0 };
    t.sessions += 1;
    t.burned = round2(t.burned + r.burned);
    byType.set(r.type, t);
  }
  const top5 = [...byType.entries()]
    .map(([type, t]) => ({ type, ...t }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 5);
  const topCat = [...byCat.entries()].sort((a, b) => b[1].sessions - a[1].sessions)[0];
  const peak = series
    .filter((d) => d.exerciseKcal !== null)
    .sort((a, b) => (b.exerciseKcal as number) - (a.exerciseKcal as number))[0];
  const summary = `本窗 ${series.length} 天中共运动 ${daySetOf(rows).size} 天、${rows.length} 次、` +
    `累计消耗 ${totalBurned} 卡` +
    (topCat ? `；${topCat[0]}类为主（${topCat[1].sessions} 次）` : '') +
    (top5[0] ? `；最高频为${top5[0].type}（${top5[0].sessions} 次）` : '') +
    (peak && peak.exerciseKcal !== null ? `；单日峰值 ${peak.date}（${peak.exerciseKcal} 卡）` : '') +
    '。';
  return {
    start,
    end,
    sessions: rows.length,
    totalMinutes: minKnown ? min : null,
    totalBurned,
    activeDays: daySetOf(rows).size,
    days: series.length,
    byCategory: [...byCat.entries()].map(([category, t]) => ({ category, ...t })),
    top5,
    daily: series.map((d) => ({ date: d.date, burned: d.exerciseKcal })),
    summary,
  };
}

function daySetOf(rows: PortRow[]): Set<string> {
  return new Set(rows.map((r) => r.date));
}

/* ── 计划复盘（exercise_review：计划 vs 实绩） ── */

export interface PlannedSession {
  date: string;
  label: string;
  movements: string[];
  plannedSets: number | null;
  hit: boolean;
  actualTypes: string[];
}

export interface ReviewView {
  start: string;
  end: string;
  planTitle: string;
  plannedSessions: number;
  hitSessions: number;
  completionPct: number | null;
  plannedMovements: number;
  hitMovements: number;
  movementPct: number | null;
  sessions: PlannedSession[];
  unhit: PlannedSession[];
}

function mondayOf(iso: string): string {
  const dow = (new Date(iso + 'T12:00:00Z').getUTCDay() + 6) % 7;
  return shiftISODate(iso, -dow);
}

function sessionDate(planStart: string, week: number, day: number): string {
  // day_of_week 老家 Monday=1 口径（fetch/exercise resolveWindow 注释同源）。
  return shiftISODate(mondayOf(planStart), (week - 1) * 7 + (day - 1));
}

export function buildReviewView(db: DatabaseSync, start: string, end: string): ReviewView {
  assertRange(start, end);
  const plan = getPlan(db);
  if (!plan.config || !plan.config.start_date) {
    throw new CalorieRenderError('missing-data', '无训练计划（先定训练计划）');
  }
  const rows = listWindow(db, start, end);
  if (rows.length === 0) throw new CalorieRenderError('missing-data', `无运动记录：${start} ~ ${end}`);
  const byDate = new Map<string, string[]>();
  for (const r of rows) {
    const d = String(r.date);
    const arr = byDate.get(d) ?? [];
    arr.push(String(r.exercise_type ?? ''));
    byDate.set(d, arr);
  }
  const sessions: PlannedSession[] = [];
  for (const s of plan.sessions) {
    if (s.is_rest_day) continue;
    const d = sessionDate(plan.config.start_date, s.week_number, s.day_of_week);
    if (d < start || d > end) continue;
    const movements = (s.movements ?? []).map((m) => String(m.name ?? '')).filter(Boolean);
    let plannedSets: number | null = null;
    for (const m of s.movements ?? []) {
      if (Array.isArray(m.sets)) plannedSets = (plannedSets ?? 0) + m.sets.length;
    }
    const actual = byDate.get(d) ?? [];
    sessions.push({
      date: d,
      label: String(s.session_label ?? ''),
      movements,
      plannedSets,
      hit: actual.length > 0,
      actualTypes: [...new Set(actual)],
    });
  }
  if (sessions.length === 0) {
    throw new CalorieRenderError('missing-data', `窗内无计划会话：${start} ~ ${end}`);
  }
  const hitSessions = sessions.filter((s) => s.hit).length;
  const plannedMoves = sessions.flatMap((s) => s.movements.map((m) => s.date + '|' + m));
  const hitMoveKeys = new Set<string>();
  // 动作命中：双向子串（计划名含实做或实做含计划名；中文原样，大小写敏感）。
  for (const s of sessions) {
    const actual = byDate.get(s.date) ?? [];
    for (const m of s.movements) {
      if (actual.some((t) => t.includes(m) || m.includes(t))) hitMoveKeys.add(s.date + '|' + m);
    }
  }
  const unhit = sessions.filter((s) => !s.hit);
  return {
    start,
    end,
    planTitle: String(plan.config.title ?? ''),
    plannedSessions: sessions.length,
    hitSessions,
    completionPct: sessions.length > 0 ? round2((hitSessions / sessions.length) * 100) : null,
    plannedMovements: plannedMoves.length,
    hitMovements: hitMoveKeys.size,
    movementPct: plannedMoves.length > 0 ? round2((hitMoveKeys.size / plannedMoves.length) * 100) : null,
    sessions,
    unhit,
  };
}

/* ── 运动趋势（exercise_trend：日序列＋周频次＋峰值） ── */

export interface TrendView {
  start: string;
  end: string;
  days: { date: string; minutes: number | null; burned: number | null; sessions: number }[];
  weekly: { weekStart: string; sessions: number; burned: number }[];
  activeDays: number;
  totalMinutes: number | null;
  totalBurned: number;
  peak: { date: string; burned: number } | null;
}

export function buildTrendView(db: DatabaseSync, start: string, end: string): TrendView {
  const rows = listPortRows(db, start, end);
  const perDay = new Map<string, { minutes: number; minKnown: boolean; burned: number; sessions: number }>();
  for (const r of rows) {
    const d = perDay.get(r.date) ?? { minutes: 0, minKnown: false, burned: 0, sessions: 0 };
    d.sessions += 1;
    d.burned = round2(d.burned + r.burned);
    if (r.minutes !== null) {
      d.minutes += r.minutes;
      d.minKnown = true;
    }
    perDay.set(r.date, d);
  }
  // 全窗日期（含空日；空日 null 不断 0，沿 t110 R1 冻结口径）。
  const dates: string[] = [];
  for (let d = start; d <= end; d = shiftISODate(d, 1)) dates.push(d);
  const days = dates.map((d) => {
    const hit = perDay.get(d);
    return {
      date: d,
      minutes: hit && hit.minKnown ? hit.minutes : null,
      burned: hit ? hit.burned : null,
      sessions: hit ? hit.sessions : 0,
    };
  });
  const perWeek = new Map<string, { sessions: number; burned: number }>();
  for (const [d, v] of perDay) {
    const w = mondayOf(d);
    const acc = perWeek.get(w) ?? { sessions: 0, burned: 0 };
    acc.sessions += v.sessions;
    acc.burned = round2(acc.burned + v.burned);
    perWeek.set(w, acc);
  }
  let totalBurned = 0;
  let min = 0;
  let minKnown = false;
  let peak: { date: string; burned: number } | null = null;
  for (const [d, v] of perDay) {
    totalBurned = round2(totalBurned + v.burned);
    if (v.minKnown) {
      min += v.minutes;
      minKnown = true;
    }
    if (!peak || v.burned > peak.burned) peak = { date: d, burned: v.burned };
  }
  return {
    start,
    end,
    days,
    weekly: [...perWeek.entries()]
      .map(([weekStart, v]) => ({ weekStart, ...v }))
      .sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1)),
    activeDays: perDay.size,
    totalMinutes: minKnown ? min : null,
    totalBurned,
    peak,
  };
}
