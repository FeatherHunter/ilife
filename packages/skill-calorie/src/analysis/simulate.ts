/** T5 #24 · 预测模拟（对照老家 scripts/analysis/simulate.py A6）。
 *
 * 线性外推 + ±2σ 按 sqrt(天数) 扩张；<14 天数据降级（MIN_DAYS=14）。
 * KCAL_PER_KG=7700；HEALTHY_RATE=[0.5, 1.0] kg/周。
 * L6 开放式分析留 AI：此处只做规则外推，不做自由文本建议。
 */
import { seriesAvg } from './series.js';
import type { DaySeries } from './series.js';
import { shiftISODate } from './utils.js';

export const SIM_MIN_DAYS = 14;
export const KCAL_PER_KG = 7700;
export const HEALTHY_RATE: [number, number] = [0.5, 1.0];

const round = (n: number): number => Math.round(n);
const round1 = (n: number): number => Math.round(n * 10) / 10;
const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface SimPoint { date: string; value: number; lo?: number; hi?: number }
export interface SimBase { kind: string; title: string; degraded: boolean; start?: string; end?: string; days?: number; degradeMsg?: string; insight: string }

function degrade(kind: string, title: string, series: DaySeries[], need: string): SimBase {
  return { kind, title, degraded: true, degradeMsg: '数据不足:需要 ' + need + ',当前只有 ' + series.length + ' 天。', insight: '数据不足,无法预测。' };
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
  return { label, horizonDays, points: pts };
}

export interface WeightForecast extends SimBase { current?: number; ratePerWeek?: number; rateNote?: string; assumption?: string; forecast?: { label: string; horizonDays: number; points: SimPoint[] } }

export function weightForecast(series: DaySeries[], horizonDays: number, title: string, kind = 'weight_forecast'): WeightForecast {
  const wv = weightVals(series);
  if (wv.length < SIM_MIN_DAYS) return degrade(kind, title, series, '≥' + SIM_MIN_DAYS + ' 天体重记录');
  const [rate, latest] = linearRate(series, 'weightKg');
  if (rate === null || latest === null) return degrade(kind, title, series, '≥' + SIM_MIN_DAYS + ' 天有效体重记录');
  const sigma = residualStd(series, 'weightKg', rate);
  const last = series[series.length - 1] as DaySeries;
  const fc = forecastSeries(latest, rate, sigma, horizonDays, last.date, title);
  const weekly = rate * 7;
  const lastPt = fc.points[fc.points.length - 1] as SimPoint;
  return {
    kind, title, degraded: false,
    start: (series[0] as DaySeries).date, end: last.date, days: series.length,
    current: round2(latest), ratePerWeek: round2(weekly),
    rateNote: '按近 ' + series.length + ' 天线性趋势外推,当前 ' + (weekly >= 0 ? '+' : '') + weekly.toFixed(2) + ' kg/周',
    assumption: '假设趋势延续:体重 = 当前值 + 日速率 × 天数;置信带按残差 σ 扩张',
    forecast: fc,
    insight: '按当前趋势,' + horizonDays + ' 天后体重约 ' + lastPt.value + ' kg(' + lastPt.lo + ' ~ ' + lastPt.hi + ',95% 置信带)。',
  };
}

export interface WeightTarget extends SimBase { current?: number; target?: number; eta?: string; daysLeft?: number; ratePerWeek?: number; feasible?: boolean; assumption?: string }

export function weightTarget(series: DaySeries[], targetKg: number, title: string, kind = 'weight_target'): WeightTarget {
  const wv = weightVals(series);
  if (wv.length < SIM_MIN_DAYS) return degrade(kind, title, series, '≥' + SIM_MIN_DAYS + ' 天体重记录');
  const [rate, latest] = linearRate(series, 'weightKg');
  if (rate === null || latest === null || Math.abs(rate) < 1e-6) return degrade(kind, title, series, '体重处于平台期(无趋势)');
  // 有意偏离老家：老家 (latest-target)/rate 在正常趋近时恒为负→恒降级；此处用 (target-latest)/rate，趋近为正（待口径裁决 T7）。
  const daysLeft = (targetKg - latest) / rate;
  if (daysLeft < 0) {
    return { kind, title, degraded: true, degradeMsg: '目标体重与当前趋势方向相反(当前在上涨)。', insight: '先纠正趋势再预测。' };
  }
  const last = series[series.length - 1] as DaySeries;
  const eta = shiftISODate(last.date, round(daysLeft));
  const weekly = rate * 7;
  const feasible = HEALTHY_RATE[0] <= weekly && weekly <= HEALTHY_RATE[1];
  return {
    kind, title, degraded: false,
    start: (series[0] as DaySeries).date, end: last.date, days: series.length,
    current: round2(latest), target: targetKg, eta,
    daysLeft: round(daysLeft), ratePerWeek: round2(weekly), feasible,
    assumption: '按当前速率 ' + (weekly >= 0 ? '+' : '') + weekly.toFixed(2) + ' kg/周 线性外推;健康范围 0.5-1.0 kg/周',
    insight: '按当前趋势,预计 ' + eta + ' 前后达到 ' + targetKg + ' kg' + (feasible ? '。' : ';⚠️ 当前速率超出健康范围,建议调整目标或策略。'),
  };
}
