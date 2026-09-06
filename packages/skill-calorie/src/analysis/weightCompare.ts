/** T5 #24 · 体重对比 17 场景（对照老家 scripts/analysis/weight_compare.py）。
 *
 * runScenario(db, name, opts?, today?) → {data} 或抛 FetchError（老家 (None, err)
 * 元组转明确抛错/缺失阻断）。today 可注入（默认 UTC 日）。c5 睡眠读外部技能库：
 * 默认不碰（标注缺失），仅显式传 scheduleDbPath 才读（铁律：仓外目录不碰）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { FetchError } from '../fetch/errors.js';
import { shiftISODate, todayISO } from './utils.js';

const round = (n: number): number => Math.round(n);
const round2 = (n: number): number => Math.round(n * 100) / 100;
const round3 = (n: number): number => Math.round(n * 1000) / 1000;

export type Row = [string, number];
export interface Seg { label: string; range: string; count: number; avg: number | null; startKg: number | null; endKg: number | null; netChange: number | null; volatility: number | null }
export interface Compare { deltaKg: number | null; direction: string; rateDiffG: number | null; speed: string }
export interface ExtraRow { label: string; value: string; spark?: Array<{ d: string; kg: number }> }
export interface ScenarioResult { segA: Seg; segB: Seg; compare: Compare; extraRows?: ExtraRow[]; tolerance?: { hit: boolean; target: string; hitDate?: string; offsetDays?: number; note?: string }; sampleWarning?: string }
export interface ScenarioOpts { startA?: string; endA?: string; startB?: string; endB?: string; n?: number; delta?: number; scheduleDbPath?: string | null }

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) * (b - m), 0) / (xs.length - 1));
}

function fetchRows(db: DatabaseSync, start: string, end: string): Row[] {
  const raw = db.prepare('SELECT date AS d, weight_kg AS w FROM weight_log WHERE date BETWEEN ? AND ? ORDER BY date').all(start, end) as unknown as Array<{ d: string; w: number }>;
  return raw.map((r) => [r.d, r.w]);
}

function fetchAll(db: DatabaseSync): Row[] {
  const raw = db.prepare('SELECT date AS d, weight_kg AS w FROM weight_log ORDER BY date').all() as unknown as Array<{ d: string; w: number }>;
  return raw.map((r) => [r.d, r.w]);
}

function seg(rows: Row[], label: string): Seg | null {
  if (rows.length === 0) return null;
  const kgs = rows.map((r) => r[1]);
  const first = rows[0] as Row;
  const last = rows[rows.length - 1] as Row;
  return {
    label,
    range: first[0] + ' ~ ' + last[0],
    count: rows.length,
    avg: round2(mean(kgs)),
    startKg: first[1],
    endKg: last[1],
    netChange: round2(last[1] - first[1]),
    volatility: round2(Math.max(...kgs) - Math.min(...kgs)),
  };
}

function segRate(s: Seg): number {
  const d0 = s.range.slice(0, 10);
  const d1 = s.range.slice(-10);
  const days = Math.max(1, Math.round((Date.parse(d1 + 'T12:00:00Z') - Date.parse(d0 + 'T12:00:00Z')) / 86400000));
  return (s.netChange ?? 0) / days;
}

function comparePair(a: Seg, b: Seg): Compare {
  const delta = round2((b.avg as number) - (a.avg as number));
  const direction = delta < -0.05 ? '下降' : delta > 0.05 ? '上升' : '持平';
  const speedA = -segRate(a);
  const speedB = -segRate(b);
  const diff = speedB - speedA;
  return { deltaKg: delta, direction, rateDiffG: round(diff * 1000), speed: Math.abs(diff) <= 0.005 ? '持平' : diff < 0 ? '慢了' : '快了' };
}

function weekdayOf(iso: string): number {
  return (new Date(iso + 'T12:00:00Z').getUTCDay() + 6) % 7;
}

function monthRange(today: string, offset: 0 | -1): [string, string] {
  const first = today.slice(0, 8) + '01';
  if (offset === 0) return [first, today];
  const prevEnd = shiftISODate(first, -1);
  return [prevEnd.slice(0, 8) + '01', prevEnd];
}

function subMonths(iso: string, months: number): string {
  const d = new Date(iso + 'T12:00:00Z');
  let y = d.getUTCFullYear();
  let m = d.getUTCMonth() - months;
  while (m < 0) { m += 12; y -= 1; }
  const dim = [31, (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m] as number;
  return y + '-' + String(m + 1).padStart(2, '0') + '-' + String(Math.min(d.getUTCDate(), dim)).padStart(2, '0');
}

function nearest(rows: Row[], target: string, tolerance = 3): { hit: Row | null; offset: number | null } {
  let best: Row | null = null;
  let bestOff: number | null = null;
  for (const r of rows) {
    const off = Math.abs(Math.round((Date.parse(r[0] + 'T12:00:00Z') - Date.parse(target + 'T12:00:00Z')) / 86400000));
    if (off <= tolerance && (bestOff === null || off < bestOff)) { best = r; bestOff = off; }
  }
  return { hit: best, offset: bestOff };
}

const emptySeg = (label: string): Seg => ({ label, range: '', count: 0, avg: null, startKg: null, endKg: null, netChange: null, volatility: null });
const singleSeg = (label: string, range: string, kg: number): Seg => ({ label, range, count: 1, avg: kg, startKg: kg, endKg: kg, netChange: 0, volatility: 0 });
const flatCompare = (deltaKg: number | null, direction: string): Compare => ({ deltaKg, direction, rateDiffG: null, speed: '—' });

export function scenarioA1(db: DatabaseSync, today: string): ScenarioResult {
  const seg2 = shiftISODate(today, -29);
  const seg1End = shiftISODate(seg2, -1);
  const seg1Start = shiftISODate(seg1End, -29);
  const a = seg(fetchRows(db, seg1Start, seg1End), '之前 30 天');
  const b = seg(fetchRows(db, seg2, today), '最近 30 天');
  if (!a || !b) throw new FetchError('数据不足(需两段各有记录)');
  return { segA: a, segB: b, compare: comparePair(a, b) };
}

export function scenarioA2(db: DatabaseSync, o: ScenarioOpts): ScenarioResult {
  if (!o.startA || !o.endA || !o.startB || !o.endB) throw new FetchError('a2 需 startA/endA/startB/endB');
  const a = seg(fetchRows(db, o.startA, o.endA), '第一段');
  const b = seg(fetchRows(db, o.startB, o.endB), '第二段');
  if (!a || !b) throw new FetchError('数据不足(某段无记录)');
  return { segA: a, segB: b, compare: comparePair(a, b) };
}

export function scenarioA3(db: DatabaseSync, today: string): ScenarioResult {
  const thisMon = shiftISODate(today, -weekdayOf(today));
  const lastMon = shiftISODate(thisMon, -7);
  const a = seg(fetchRows(db, lastMon, shiftISODate(lastMon, 6)), '上周');
  const b = seg(fetchRows(db, thisMon, today), '本周');
  if (!a || !b) throw new FetchError('数据不足(本周/上周无记录)');
  if (a.count < 3 || b.count < 3) return { segA: a, segB: b, compare: flatCompare(null, '—'), sampleWarning: '样本不足(每段需 ≥3 条记录才能对比)' };
  return { segA: a, segB: b, compare: comparePair(a, b) };
}

export function scenarioA4(db: DatabaseSync, today: string): ScenarioResult {
  const [as, ae] = monthRange(today, -1);
  const [bs, be] = monthRange(today, 0);
  const a = seg(fetchRows(db, as, ae), '上月');
  const b = seg(fetchRows(db, bs, be), '本月');
  if (!a || !b) throw new FetchError('数据不足(本月/上月无记录)');
  return { segA: a, segB: b, compare: comparePair(a, b) };
}

export function scenarioA5(db: DatabaseSync, today: string, n: number): ScenarioResult {
  if (!Number.isInteger(n) || n < 1) throw new FetchError('n 须为正整数');
  const bStart = shiftISODate(today, -(n - 1));
  const aEnd = shiftISODate(bStart, -1);
  const aStart = shiftISODate(aEnd, -(n - 1));
  const a = seg(fetchRows(db, aStart, aEnd), '上一个 ' + n + ' 天');
  const b = seg(fetchRows(db, bStart, today), '最近 ' + n + ' 天');
  if (!a || !b) throw new FetchError('数据不足(两段需各有记录)');
  return { segA: a, segB: b, compare: comparePair(a, b) };
}

export function sameDayCompare(db: DatabaseSync, today: string, monthsBack: number, label: string): ScenarioResult {
  const target = subMonths(today, monthsBack);
  const rows = fetchAll(db);
  const current = rows.length > 0 ? (rows[rows.length - 1] as Row)[1] : null;
  if (current === null) throw new FetchError('无体重记录');
  const { hit, offset } = nearest(rows, target);
  if (!hit) {
    return {
      segA: { ...emptySeg(label), range: '±3 天无记录' },
      segB: singleSeg('今天', today, current),
      compare: { deltaKg: null, direction: '—', rateDiffG: null, speed: '—' },
      tolerance: { hit: false, target, note: target + ' ±3 天内无记录' },
      extraRows: [{ label: '容差命中', value: '未命中' }],
    };
  }
  const delta = round2(current - hit[1]);
  const direction = delta < -0.05 ? '下降' : delta > 0.05 ? '上升' : '持平';
  const windowDays = label === '一年前' ? 365 : label === '半年前' ? 182 : 91;
  const wRows = fetchRows(db, shiftISODate(today, -windowDays), today);
  const wAvg = wRows.length > 0 ? round2(mean(wRows.map((r) => r[1]))) : null;
  return {
    segA: singleSeg(label, hit[0], hit[1]),
    segB: singleSeg('今天', today, current),
    compare: flatCompare(delta, direction),
    tolerance: { hit: true, target, hitDate: hit[0], offsetDays: offset as number },
    extraRows: [
      { label: '容差命中', value: offset ? hit[0] + '(±' + offset + ' 天)' : '精确命中 ' + hit[0] },
      { label: label + '内区间均值', value: wAvg !== null ? wAvg + ' kg' : '—' },
    ],
  };
}

export function scenarioB1(db: DatabaseSync, today: string): ScenarioResult {
  const rows = fetchAll(db);
  if (rows.length === 0) throw new FetchError('无体重记录');
  const g = db.prepare('SELECT weight_goal FROM daily_goal WHERE id = 1').get() as { weight_goal: number | null } | undefined;
  const h = db.prepare('SELECT height_cm FROM user_profile ORDER BY id DESC LIMIT 1').get() as { height_cm: number | null } | undefined;
  const goal = g?.weight_goal ?? null;
  if (!goal) throw new FetchError('未设置目标体重(请先「定体重目标」)');
  const current = (rows[rows.length - 1] as Row)[1];
  const maxKg = Math.max(...rows.map((r) => r[1]));
  const heightM = h?.height_cm ? h.height_cm / 100 : null;
  const delta = round2(current - goal);
  const direction = delta <= 0 ? '已达标' : '还差 ' + delta.toFixed(1) + ' kg';
  const pctDone = maxKg > goal ? round1(((maxKg - current) / (maxKg - goal)) * 100) : null;
  const recent = fetchRows(db, shiftISODate(today, -29), today);
  let eta: string | null = null;
  if (recent.length >= 2 && current > goal) {
    const rate = (recent[recent.length - 1][1] - recent[0][1]) / Math.max(1, recent.length - 1);
    if (rate < -0.001) eta = shiftISODate(today, Math.trunc((current - goal) / Math.abs(rate)));
  }
  const bmi = (kg: number): number | null => heightM ? round1(kg / (heightM * heightM)) : null;
  const curBmi = bmi(current);
  const goalBmi = bmi(goal);
  return {
    segA: { ...singleSeg('目标体重', '目标 ' + goal + ' kg', goal) },
    segB: singleSeg('当前', (rows[rows.length - 1] as Row)[0], current),
    compare: { deltaKg: delta, direction, rateDiffG: null, speed: '—' },
    extraRows: [
      { label: '已完成', value: pctDone !== null ? pctDone + '%' : '—' },
      { label: '预计达成', value: eta ?? '—' },
      { label: '当前 BMI', value: curBmi !== null ? String(curBmi) : '—' },
      { label: '目标 BMI', value: goalBmi !== null ? String(goalBmi) : '—' },
      { label: '是否达标', value: delta <= 0 ? '✅ 已达标' : '未达标' },
    ],
  };

  function round1(n: number): number { return Math.round(n * 10) / 10; }
}
