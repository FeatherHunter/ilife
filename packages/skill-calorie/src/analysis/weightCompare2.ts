/** T5 #24 · 体重对比续（b8 平台期/e/c5/d4/分发，对照老家 weight_compare.py）。 */
import type { DatabaseSync } from 'node:sqlite';
import { FetchError } from '../fetch/errors.js';
import { shiftISODate, todayISO } from './utils.js';

const round = (n: number): number => Math.round(n);
const round1 = (n: number): number => Math.round(n * 10) / 10;
const round2 = (n: number): number => Math.round(n * 100) / 100;
const round3 = (n: number): number => Math.round(n * 1000) / 1000;

export type Row = [string, number];
export interface Seg { label: string; range: string; count: number; avg: number | null; startKg: number | null; endKg: number | null; netChange: number | null; volatility: number | null }
export interface Compare { deltaKg: number | null; direction: string; rateDiffG: number | null; speed: string }
export interface ExtraRow { label: string; value: string; spark?: Array<{ d: string; kg: number }> }
export interface ScenarioResult { segA: Seg; segB: Seg; compare: Compare; extraRows?: ExtraRow[]; tolerance?: { hit: boolean; target: string; hitDate?: string; offsetDays?: number; note?: string }; sampleWarning?: string }
export interface ScenarioOpts { startA?: string; endA?: string; startB?: string; endB?: string; n?: number; delta?: number; scheduleDbPath?: string | null }

const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
const stdev = (xs: number[]): number => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) * (b - m), 0) / (xs.length - 1));
};

function fetchRows(db: DatabaseSync, start: string, end: string): Row[] {
  const raw = db.prepare('SELECT date AS d, weight_kg AS w FROM weight_log WHERE date BETWEEN ? AND ? ORDER BY date').all(start, end) as unknown as Array<{ d: string; w: number }>;
  return raw.map((r) => [r.d, r.w]);
}

function fetchAll(db: DatabaseSync): Row[] {
  const raw = db.prepare('SELECT date AS d, weight_kg AS w FROM weight_log ORDER BY date').all() as unknown as Array<{ d: string; w: number }>;
  return raw.map((r) => [r.d, r.w]);
}

function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000);
}

const singleSeg = (label: string, range: string, kg: number): Seg => ({ label, range, count: 1, avg: kg, startKg: kg, endKg: kg, netChange: 0, volatility: 0 });

/** 平台期识别：日期跨度 ≥14 天且 max-min ≤0.5kg（允许 1-2 天缺口），取最近一个。 */
export function findPlateau(rows: Row[]): { start: Row; end: Row; span: number } | null {
  const segs: Array<{ start: Row; end: Row; span: number }> = [];
  const n = rows.length;
  for (let i = 0; i < n; i++) {
    let j = i;
    let lo = (rows[i] as Row)[1];
    let hi = lo;
    while (j + 1 < n) {
      const nd = dayDiff((rows[j] as Row)[0], (rows[j + 1] as Row)[0]);
      if (nd > 2) break;
      j += 1;
      lo = Math.min(lo, (rows[j] as Row)[1]);
      hi = Math.max(hi, (rows[j] as Row)[1]);
      if (hi - lo > 0.5) break;
    }
    const span = dayDiff((rows[i] as Row)[0], (rows[j] as Row)[0]) + 1;
    if (span >= 14 && hi - lo <= 0.5) segs.push({ start: rows[i] as Row, end: rows[j] as Row, span });
  }
  if (segs.length === 0) return null;
  segs.sort((a, b) => (a.end[0] < b.end[0] ? -1 : 1));
  return segs[segs.length - 1] as { start: Row; end: Row; span: number };
}

export function scenarioB8(db: DatabaseSync): ScenarioResult {
  const rows = fetchAll(db);
  if (rows.length < 14) throw new FetchError('数据不足(需至少 14 天记录)');
  const p = findPlateau(rows);
  const current = (rows[rows.length - 1] as Row)[1];
  if (!p) throw new FetchError('未识别到平台期(需至少连续 14 天波动 ≤ ±0.5kg)');
  const after = rows.filter((r) => r[0] > p.end[0]);
  const inSeg = rows.filter((r) => r[0] >= p.start[0] && r[0] <= p.end[0]).map((r) => r[1]);
  const plateauAvg = mean(inSeg);
  const deltaAfter = round2(current - plateauAvg);
  let plateauCount = 1;
  const breakDays: number[] = [];
  let remaining = [...rows];
  while (remaining.length >= 14) {
    const q = findPlateau(remaining);
    if (!q) break;
    plateauCount += 1;
    const nxt = remaining.filter((r) => r[0] > q.end[0]);
    if (nxt.length > 0) breakDays.push(dayDiff(q.end[0], (nxt[0] as Row)[0]));
    remaining = remaining.filter((r) => r[0] < q.start[0]);
  }
  const avgBreak = breakDays.length > 0 ? round(mean(breakDays)) : null;
  return {
    segA: { label: '平台期首日', range: p.start[0] + '(持续 ' + p.span + ' 天)', count: p.span, avg: round2(plateauAvg), startKg: p.start[1], endKg: p.end[1], netChange: round2(p.end[1] - p.start[1]), volatility: round2(Math.abs(p.end[1] - p.start[1])) },
    segB: singleSeg('当前', (rows[rows.length - 1] as Row)[0], current),
    compare: { deltaKg: round2(current - plateauAvg), direction: current < plateauAvg ? '下降' : current > plateauAvg ? '上升' : '持平', rateDiffG: null, speed: '—' },
    extraRows: [
      { label: '平台期持续', value: p.span + ' 天' },
      { label: '突破后变化', value: (deltaAfter >= 0 ? '+' : '') + deltaAfter.toFixed(1) + ' kg' },
      { label: '第几次平台期', value: '第 ' + plateauCount + ' 次' },
      { label: '历史平均突破耗时', value: avgBreak !== null ? avgBreak + ' 天' : '—' },
    ],
  };
}

export function scenarioE1(db: DatabaseSync, today: string): ScenarioResult {
  const rows = fetchAll(db);
  if (rows.length === 0) throw new FetchError('无体重记录');
  const current = (rows[rows.length - 1] as Row)[1];
  const minRow = rows.reduce((a, b) => (b[1] < a[1] ? b : a));
  const daysSince = dayDiff(minRow[0], today);
  return {
    segA: singleSeg('历史最低', minRow[0], minRow[1]),
    segB: singleSeg('当前', (rows[rows.length - 1] as Row)[0], current),
    compare: { deltaKg: round2(current - minRow[1]), direction: current > minRow[1] ? '上升' : '持平', rateDiffG: null, speed: '—' },
    extraRows: [{ label: '距历史最低', value: daysSince + ' 天' }],
  };
}

export function scenarioE2(db: DatabaseSync): ScenarioResult {
  const rows = fetchAll(db);
  if (rows.length === 0) throw new FetchError('无体重记录');
  const current = (rows[rows.length - 1] as Row)[1];
  const maxRow = rows.reduce((a, b) => (b[1] > a[1] ? b : a));
  const dropped = round2(maxRow[1] - current);
  const days = Math.max(1, dayDiff(maxRow[0], (rows[rows.length - 1] as Row)[0]));
  return {
    segA: singleSeg('历史最高', maxRow[0], maxRow[1]),
    segB: singleSeg('当前', (rows[rows.length - 1] as Row)[0], current),
    compare: { deltaKg: round2(current - maxRow[1]), direction: current < maxRow[1] ? '下降' : '持平', rateDiffG: null, speed: '—' },
    extraRows: [
      { label: '已下降', value: dropped.toFixed(1) + ' kg' },
      { label: '下降速率', value: round3(dropped / days).toFixed(3) + ' kg/天' },
    ],
  };
}

export function scenarioE3(db: DatabaseSync, deltaKg: number): ScenarioResult {
  const rows = fetchAll(db);
  if (rows.length === 0) throw new FetchError('无体重记录');
  const current = (rows[rows.length - 1] as Row)[1];
  const maxKg = Math.max(...rows.map((r) => r[1]));
  const th = maxKg - deltaKg;
  const hit = rows.find((r) => r[1] <= th);
  if (!hit) {
    const diff = round1(maxKg - current);
    throw new FetchError('未达成减重 ' + deltaKg + 'kg 里程碑(当前距历史最高已减 ' + diff + 'kg)');
  }
  const elapsed = Math.max(1, dayDiff(hit[0], (rows[rows.length - 1] as Row)[0]));
  const rate = round3((current - hit[1]) / elapsed);
  let pts = rows.filter((r) => r[0] >= hit[0]);
  const crossYear = pts.length > 1 && (pts[0] as Row)[0].slice(0, 4) !== (pts[pts.length - 1] as Row)[0].slice(0, 4);
  const fmt = (d: string): string => crossYear ? d.slice(2) : d.slice(5);
  if (pts.length > 10) {
    const step = (pts.length - 1) / 9;
    const idxs = [...new Set([...Array.from({ length: 10 }, (_, i) => Math.trunc(i * step)), pts.length - 1])];
    pts = idxs.map((i) => pts[i] as Row);
  }
  return {
    segA: singleSeg('减重 ' + deltaKg + 'kg 那天', hit[0], hit[1]),
    segB: singleSeg('今天', (rows[rows.length - 1] as Row)[0], current),
    compare: { deltaKg: round2(current - hit[1]), direction: current < hit[1] ? '下降' : current > hit[1] ? '上升' : '持平', rateDiffG: null, speed: '—' },
    extraRows: [
      { label: '用时', value: elapsed + ' 天' },
      { label: '期间速率', value: rate.toFixed(3) + ' kg/天' },
      { label: '体重轨迹', value: hit[1] + ' → ' + current + ' kg · ' + elapsed + ' 天', spark: pts.map((r) => ({ d: fmt(r[0]), kg: r[1] })) },
    ],
  };

  function round1(n: number): number { return Math.round(n * 10) / 10; }
}

function seasonMin(rows: Row[], today: string, season: 'summer' | 'winter'): Row | null {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  let s: string;
  let e: string;
  if (season === 'summer') { s = y + '-06-01'; e = y + '-08-31'; }
  else if (m >= 12) { s = y + '-12-01'; e = (y + 1) + '-02-28'; }
  else { s = (y - 1) + '-12-01'; e = y + '-02-28'; }
  void m;
  const inSeason = rows.filter((r) => r[0] >= s && r[0] <= e);
  if (inSeason.length === 0) return null;
  return inSeason.reduce((a, b) => (b[1] < a[1] ? b : a));
}

export function scenarioE5(db: DatabaseSync, today: string): ScenarioResult {
  const rows = fetchAll(db);
  if (rows.length === 0) throw new FetchError('无体重记录');
  const current = (rows[rows.length - 1] as Row)[1];
  const m = seasonMin(rows, today, 'summer');
  if (!m) throw new FetchError('今年夏天(6-8 月)无体重记录');
  const daysSince = Math.max(0, dayDiff(m[0], today));
  return {
    segA: singleSeg('入夏最低', m[0], m[1]),
    segB: singleSeg('当前', (rows[rows.length - 1] as Row)[0], current),
    compare: { deltaKg: round2(current - m[1]), direction: current > m[1] ? '上升' : current < m[1] ? '下降' : '持平', rateDiffG: null, speed: '—' },
    extraRows: [{ label: '距入夏最低', value: daysSince + ' 天' }],
  };
}

export function scenarioE6(db: DatabaseSync, today: string): ScenarioResult {
  const rows = fetchAll(db);
  if (rows.length === 0) throw new FetchError('无体重记录');
  const current = (rows[rows.length - 1] as Row)[1];
  const m = seasonMin(rows, today, 'winter');
  if (!m) throw new FetchError('最近一个冬天(12-2 月)无体重记录');
  const daysSince = Math.max(0, dayDiff(m[0], today));
  return {
    segA: singleSeg('入冬最低', m[0], m[1]),
    segB: singleSeg('当前', (rows[rows.length - 1] as Row)[0], current),
    compare: { deltaKg: round2(current - m[1]), direction: current > m[1] ? '上升' : current < m[1] ? '下降' : '持平', rateDiffG: null, speed: '—' },
    extraRows: [{ label: '距入冬最低', value: daysSince + ' 天' }],
  };
}
