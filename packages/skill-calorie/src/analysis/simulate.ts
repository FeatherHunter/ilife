/** T5 #24 · 预测模拟（对照老家 scripts/analysis/simulate.py A6）。
 *
 * 线性外推 + ±2σ 按 sqrt(天数) 扩张；<14 天数据降级（MIN_DAYS=14）。
 * KCAL_PER_KG（＝7700）：正本自 #717 批④ 起住共用位 `shared/kcalPerKg.ts`，本件按原名转出；
 * HEALTHY_RATE（0.5–1.0 kg/周）＝**目标速率**，正本住 `shared/healthRate.ts` 的 `TARGET_RATE`，
 * 本件按原名转出（同处还有「缺口折算的容差带」`DEFICIT_RATE_TOLERANCE`，别混用）。
 * L6 开放式分析留 AI：此处只做规则外推，不做自由文本建议。
 */
import { seriesAvg } from './series.js';
import type { DaySeries } from './series.js';
import { shiftISODate } from './utils.js';
import { KCAL_PER_KG } from '../shared/kcalPerKg.js';
import { TARGET_RATE } from '../shared/healthRate.js';
import { m } from '../entries/index.js';

export const SIM_MIN_DAYS = 14;
export { KCAL_PER_KG };
/** 目标速率（kg/周）：定目标时的合理区间（正本 `shared/healthRate.ts` 的 `TARGET_RATE`）。 */
export const HEALTHY_RATE: readonly [number, number] = TARGET_RATE;

const round = (n: number): number => Math.round(n);
const round1 = (n: number): number => Math.round(n * 10) / 10;
const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface SimPoint { date: string; value: number; lo?: number; hi?: number }
export interface SimBase { kind: string; title: string; degraded: boolean; start?: string; end?: string; days?: number; degradeMsg?: string; insight: string }

/** 数据不足的降级（#466）：门槛词与「当前」读数**同一量纲**——由调用方把实际的**有效记录条数**
 *  按门槛同一条量纲传进来（改前这里报的是 `series.length`＝**请求窗口的天数**，空库时会说出
 *  「需要 ≥14 天体重记录,当前只有 14 天」这种自相矛盾的句子）。 */
function degrade(kind: string, title: string, need: string, have: string): SimBase {
  return { kind, title, degraded: true, degradeMsg: m('skill-calorie.analysis-simulate.c001', { p0: String(need), p1: String(have) }), insight: m('skill-calorie.analysis-simulate.c002') };
}

type NumField = 'weightKg' | 'calories';

function linearRate(series: DaySeries[], field: NumField): [number | null, number | null] {
  const vals: Array<[number, number]> = [];
  for (const s of series) {
    const v = s[field];
    if (v === null || v === undefined) continue;
    vals.push([Date.parse(s.date + 'T12:00:00Z'), v]);
  }
  if (vals.length < 2) return [null, vals.length > 0 ? (vals[vals.length - 1] as [number, number])[1] : null];
  const days0 = (vals[0] as [number, number])[0];
  const xs = vals.map(([t]) => (t - days0) / 86400000);
  const ys = vals.map(([, v]) => v);
  const n = xs.length;
  const sx = xs.reduce((a, b) => a + b, 0);
  const sy = ys.reduce((a, b) => a + b, 0);
  const sxy = xs.reduce((a, x, i) => a + x * (ys[i] as number), 0);
  const sx2 = xs.reduce((a, x) => a + x * x, 0);
  const denom = n * sx2 - sx * sx;
  if (denom === 0) return [null, ys[ys.length - 1] as number];
  return [(n * sxy - sx * sy) / denom, ys[ys.length - 1] as number];
}

function residualStd(series: DaySeries[], field: NumField, slope: number): number {
  const vals: Array<[number, number]> = [];
  for (const s of series) {
    const v = s[field];
    if (v === null || v === undefined) continue;
    vals.push([Date.parse(s.date + 'T12:00:00Z'), v]);
  }
  if (vals.length < 3) return 0;
  const base = (vals[0] as [number, number])[0];
  const y0 = (vals[0] as [number, number])[1];
  const resid = vals.map(([t, y]) => y - (y0 + slope * ((t - base) / 86400000)));
  const m = resid.reduce((a, b) => a + b, 0) / resid.length;
  return Math.sqrt(resid.reduce((a, r) => a + (r - m) * (r - m), 0) / (resid.length - 1));
}

function weightVals(series: DaySeries[]): number[] {
  return series.map((s) => s.weightKg).filter((v): v is number => v !== null && v !== undefined);
}

function forecastSeries(current: number, ratePerDay: number, sigma: number, horizonDays: number, startDate: string, label: string): { label: string; horizonDays: number; points: SimPoint[] } {
  const pts: SimPoint[] = [{ date: startDate, value: round2(current), lo: round2(current), hi: round2(current) }];
  for (let d = 7; d <= horizonDays; d += 7) {
    const v = current + ratePerDay * d;
    const band = ((2 * sigma * Math.sqrt(d)) / Math.sqrt(7));
    pts.push({ date: shiftISODate(startDate, d), value: round2(v), lo: round2(v - band), hi: round2(v + band) });
  }
  /* #455 路线 A（轨迹末点口径）：非整周时补第 horizonDays 天末点——本页的结论句写的是
   *  「<horizonDays> 天后体重约 X kg」，没有那一行时 X 其实是第 horizonDays−余数 天的值
   *  （30 天页给的是第 28 天的值）。整周 horizon 不补，回归不变。 */
  if (horizonDays % 7 !== 0) {
    const v = current + ratePerDay * horizonDays;
    const band = ((2 * sigma * Math.sqrt(horizonDays)) / Math.sqrt(7));
    pts.push({ date: shiftISODate(startDate, horizonDays), value: round2(v), lo: round2(v - band), hi: round2(v + band) });
  }
  return { label, horizonDays, points: pts };
}

export interface WeightForecast extends SimBase { current?: number; ratePerWeek?: number; rateNote?: string; assumption?: string; forecast?: { label: string; horizonDays: number; points: SimPoint[] } }

export function weightForecast(series: DaySeries[], horizonDays: number, title: string, kind = 'weight_forecast'): WeightForecast {
  const wv = weightVals(series);
  if (wv.length < SIM_MIN_DAYS) return degrade(kind, title, m('skill-calorie.analysis-simulate.c003', { p0: String(SIM_MIN_DAYS) }), m('skill-calorie.analysis-simulate.c004', { p0: String(wv.length) }));
  const [rate, latest] = linearRate(series, 'weightKg');
  if (rate === null || latest === null) return degrade(kind, title, m('skill-calorie.analysis-simulate.c005', { p0: String(SIM_MIN_DAYS) }), m('skill-calorie.analysis-simulate.c006', { p0: String(wv.length) }));
  const sigma = residualStd(series, 'weightKg', rate);
  const last = series[series.length - 1] as DaySeries;
  const fc = forecastSeries(latest, rate, sigma, horizonDays, last.date, title);
  const weekly = rate * 7;
  const lastPt = fc.points[fc.points.length - 1] as SimPoint;
  return {
    kind, title, degraded: false,
    start: (series[0] as DaySeries).date, end: last.date, days: series.length,
    current: round2(latest), ratePerWeek: round2(weekly),
    rateNote: m('skill-calorie.analysis-simulate.c007', {
      p0: String(series.length),
      p1: String(weekly >= 0 ? '+' : ''),
      p2: String(weekly.toFixed(2)),
    }),
    assumption: m('skill-calorie.analysis-simulate.c008'),
    forecast: fc,
    insight: m('skill-calorie.analysis-simulate.c009', {
      p0: String(horizonDays),
      p1: String(lastPt.value),
      p2: String(lastPt.lo),
      p3: String(lastPt.hi),
    }),
  };
}

export interface WeightTarget extends SimBase { current?: number; target?: number; eta?: string; daysLeft?: number; ratePerWeek?: number; feasible?: boolean; assumption?: string }

export function weightTarget(series: DaySeries[], targetKg: number, title: string, kind = 'weight_target'): WeightTarget {
  const wv = weightVals(series);
  if (wv.length < SIM_MIN_DAYS) return degrade(kind, title, m('skill-calorie.analysis-simulate.c010', { p0: String(SIM_MIN_DAYS) }), m('skill-calorie.analysis-simulate.c011', { p0: String(wv.length) }));
  const [rate, latest] = linearRate(series, 'weightKg');
  if (rate === null || latest === null || Math.abs(rate) < 1e-6) return degrade(kind, title, m('skill-calorie.analysis-simulate.c012'), m('skill-calorie.analysis-simulate.c013', { p0: String(wv.length) }));
  // 有意偏离老家：老家 (latest-target)/rate 在正常趋近时恒为负→恒降级；此处用 (target-latest)/rate，趋近为正（待口径裁决 T7）。
  const daysLeft = (targetKg - latest) / rate;
  if (daysLeft < 0) {
    return { kind, title, degraded: true, degradeMsg: m('skill-calorie.analysis-simulate.c014'), insight: m('skill-calorie.analysis-simulate.c015') };
  }
  const last = series[series.length - 1] as DaySeries;
  const eta = shiftISODate(last.date, round(daysLeft));
  const weekly = rate * 7;
  const feasible = HEALTHY_RATE[0] <= weekly && weekly <= HEALTHY_RATE[1];
  /* #1197 §4.7：条件分枝先落成局部变量，整句才好迁成 m(key, {...})。 */
  const sign = weekly >= 0 ? '+' : '';
  const feasibleNote = feasible ? '。' : m('skill-calorie.analysis-simulate.c016');
  return {
    kind, title, degraded: false,
    start: (series[0] as DaySeries).date, end: last.date, days: series.length,
    current: round2(latest), target: targetKg, eta,
    daysLeft: round(daysLeft), ratePerWeek: round2(weekly), feasible,
    assumption: m('skill-calorie.analysis-simulate.c017', { p0: String(sign), p1: String(weekly.toFixed(2)) }),
    insight: m('skill-calorie.analysis-simulate.c018', {
      p0: String(eta),
      p1: String(targetKg),
      p2: String(feasibleNote),
    }),
  };
}
