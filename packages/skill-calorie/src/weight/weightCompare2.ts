/** T5 #24 · 体重对比续（b8 平台期/e/c5/d4/分发，对照老家 weight_compare.py）。 */
import type { DatabaseSync } from 'node:sqlite';
import { FetchError } from '../fetch/errors.js';
import { shiftISODate, todayISO } from '../analysis/utils.js';
import { ratePerDayText } from './weightCompare.js';

const round1 = (n: number): number => Math.round(n * 10) / 10;
const round2 = (n: number): number => Math.round(n * 100) / 100;
const round3 = (n: number): number => Math.round(n * 1000) / 1000;

export type Row = [string, number];
/** 一段的读数。`spanDays` 只有平台期那一段给：`range` 串里读不出「持续几天」（#503），
 *  页上由区间块的说明呈现；`ScenarioResult.segA` 是 `ScenarioResult` 的一部分，两处同形。 */
export interface Seg { label: string; range: string; count: number; avg: number | null; startKg: number | null; endKg: number | null; netChange: number | null; volatility: number | null; spanDays?: number }
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
  const inSeg = rows.filter((r) => r[0] >= p.start[0] && r[0] <= p.end[0]).map((r) => r[1]);
  const plateauAvg = mean(inSeg);
  const deltaAfter = round2(current - plateauAvg);
  let plateauCount = 1;
  let remaining = [...rows];
  while (remaining.length >= 14) {
    const q = findPlateau(remaining);
    if (!q) break;
    plateauCount += 1;
    remaining = remaining.filter((r) => r[0] < q.start[0]);
  }
  return {
    /* #481 整改缺陷 12：段标签 `平台期首日` 是行话（「首日」是文牍词）⇒ `平台期第一天`。
     * 这正是页脚那一段的标签，与「当前」成对读。
     * #503 形状化：区间原来写 `2026-08-01(持续 14 天)`——日期与天数挤在一个串里（口径 §一）；
     * 改回**真区间** `起 ~ 止`，天数另走 `spanDays`（页上由 `windowStrip()` 的胶囊呈现，
     * 并且这一改让这一段**跨天数**可算，节奏判语不再白丢——`spanOf()` 靠 `~` 形态）。 */
    segA: { label: '平台期第一天', range: p.start[0] + ' ~ ' + p.end[0], count: p.span, avg: round2(plateauAvg), startKg: p.start[1], endKg: p.end[1], netChange: round2(p.end[1] - p.start[1]), volatility: round2(Math.abs(p.end[1] - p.start[1])), spanDays: p.span },
    segB: singleSeg('当前', (rows[rows.length - 1] as Row)[0], current),
    compare: { deltaKg: round2(current - plateauAvg), direction: current < plateauAvg ? '下降' : current > plateauAvg ? '上升' : '持平', rateDiffG: null, speed: '—' },
    extraRows: [
      { label: '平台期持续', value: p.span + ' 天' },
      /* #481 整改缺陷 7：`突破后变化` → `平台期结束后变化`（「突破」是行话）；
       * `第几次平台期` → `这是第几次平台期`（问句要带问的主语）；
       * 「历史平均突破耗时」整行删——本轮种子下它的值是 `—`（零信息），且数的是**别的段**的事。 */
      { label: '平台期结束后变化', value: (deltaAfter >= 0 ? '+' : '') + deltaAfter.toFixed(1) + ' kg' },
      { label: '这是第几次平台期', value: '第 ' + plateauCount + ' 次' },
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
      /* #481 整改缺陷 5：本行与节奏卡标签逐字同名（都叫「每天变化」），这里是**这一段的平均**，写全。 */
      { label: '这段时间平均', value: ratePerDayText(dropped / days) },
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
    throw new FetchError('还没减到 ' + deltaKg + ' kg（当前距历史最高已减 ' + diff + ' kg）');
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
    segA: singleSeg('减重 ' + deltaKg + ' kg 那天', hit[0], hit[1]),
    segB: singleSeg('今天', (rows[rows.length - 1] as Row)[0], current),
    compare: { deltaKg: round2(current - hit[1]), direction: current < hit[1] ? '下降' : current > hit[1] ? '上升' : '持平', rateDiffG: null, speed: '—' },
    extraRows: [
      { label: '用时', value: elapsed + ' 天' },
      /* #481 整改缺陷 5：改名避与节奏卡标签撞词（这里是这一段的平均，写全「平均每天」）。 */
      { label: '这段时间平均', value: ratePerDayText(rate) },
      /* #503 形状化：值原为 `75 → 70.4 kg · 13 天`（同一格用 `·` 串了两件事）——天数本来就有
       * 「用时 13 天」一行，取数层的这一格只留**两端值 ＋ 箭头**（口径 §一「正文里零 `·`」）。 */
      { label: '体重变化曲线', value: hit[1] + ' → ' + current + ' kg', spark: pts.map((r) => ({ d: fmt(r[0]), kg: r[1] })) },
    ],
  };
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
  if (!m) throw new FetchError('今年夏天（6～8 月）没有体重记录');
  const daysSince = Math.max(0, dayDiff(m[0], today));
  return {
    /* #481 整改缺陷 12：`入夏最低` 读者不知道是哪个夏天 ⇒ `今夏以来最低`（段标签与距今天数两处同改）。 */
    segA: singleSeg('今夏以来最低', m[0], m[1]),
    segB: singleSeg('当前', (rows[rows.length - 1] as Row)[0], current),
    compare: { deltaKg: round2(current - m[1]), direction: current > m[1] ? '上升' : current < m[1] ? '下降' : '持平', rateDiffG: null, speed: '—' },
    extraRows: [{ label: '距今夏最低', value: daysSince + ' 天' }],
  };
}

export function scenarioE6(db: DatabaseSync, today: string): ScenarioResult {
  const rows = fetchAll(db);
  if (rows.length === 0) throw new FetchError('无体重记录');
  const current = (rows[rows.length - 1] as Row)[1];
  const m = seasonMin(rows, today, 'winter');
  if (!m) throw new FetchError('最近一个冬天（12～2 月）没有体重记录');
  const daysSince = Math.max(0, dayDiff(m[0], today));
  return {
    /* #481 整改缺陷 12：`入冬最低` → `今冬以来最低`（与 e5 同形）。 */
    segA: singleSeg('今冬以来最低', m[0], m[1]),
    segB: singleSeg('当前', (rows[rows.length - 1] as Row)[0], current),
    compare: { deltaKg: round2(current - m[1]), direction: current > m[1] ? '上升' : current < m[1] ? '下降' : '持平', rateDiffG: null, speed: '—' },
    extraRows: [{ label: '距今冬最低', value: daysSince + ' 天' }],
  };
}
