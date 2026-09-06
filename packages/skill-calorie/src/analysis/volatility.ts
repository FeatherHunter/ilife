/** T5 #24 · 体重波动 v2（对照老家 weight.py::weight_volatility_v2，Q8 spec）。
 *
 * detrended sigma：rolling 取近 7 点 stdev；goal 模式全程差分 stdev；
 * 阈值 1.5σ 黄 / 2.0σ 红；sigma 为 0 兜底 0.5。baseline rolling=近 30 均值，
 * goal=目标体重。recent_anomalies 取近 7 天非 normal 按 |dev| 倒序。
 */
import type { DatabaseSync } from 'node:sqlite';
import { FetchError } from '../fetch/errors.js';
import { parseDate, shiftISODate } from './utils.js';
import { stdev } from './weight.js';
import { ok } from './result.js';
import type { AnalysisResult } from './result.js';

const YELLOW_SIGMA = 1.5;
const RED_SIGMA = 2.0;

export type VolLevel = 'red' | 'yellow' | 'normal';
export type BaselineMode = 'rolling' | 'goal';

export interface VolPoint { date: string; kg: number; deviationKg: number; level: VolLevel }
export interface VolSigmaTrend { dateStart: string; sigmaKg: number }
export interface VolEarlyWarning { date: string; kg: number; deviationKg: number; level: VolLevel; message: string }
export interface VolatilityV2 { baselineMode: string; baselineValue: number; baselineSigma: number; thresholds: { yellow: number; red: number }; points: VolPoint[]; recentAnomalies: VolPoint[]; sigmaTrend: VolSigmaTrend[]; earlyWarning: VolEarlyWarning; baselineToggleLabel: string }

function rollingSigma7d(w: number[]): number {
  if (w.length < 3) return 0;
  const recent = w.length >= 7 ? w.slice(-7) : w;
  return recent.length >= 2 ? stdev(recent) : 0;
}

function fullDetrendedSigma(w: number[]): number {
  if (w.length < 3) return 0;
  const diffs = w.slice(1).map((v, i) => v - (w[i] as number));
  return diffs.length >= 2 ? stdev(diffs) : 0;
}

const round = (n: number): number => Math.round(n);
const round2 = (n: number): number => Math.round(n * 100) / 100;
const round3 = (n: number): number => Math.round(n * 1000) / 1000;

export function weightVolatilityV2(db: DatabaseSync, startDate: string, endDate?: string | null, baselineMode: BaselineMode = 'rolling'): AnalysisResult<VolatilityV2> {
  const start = parseDate(startDate);
  if (!start) throw new FetchError('起始日期非法: ' + String(startDate));
  const end = parseDate(endDate ?? undefined) ?? start;
  const rawV = db.prepare(
    'SELECT date AS d, weight_kg AS w FROM weight_log WHERE date >= ? AND date <= ? ORDER BY date ASC',
  ).all(start, end) as unknown as Array<{ d: string; w: number }>;
  const rows: Array<[string, number]> = rawV.map((r) => [r.d, r.w]);
  let goalWeight: number | null = null;
  try {
    const grow = db.prepare('SELECT weight_goal FROM daily_goal WHERE id = 1').get() as { weight_goal: unknown } | undefined;
    if (grow && grow.weight_goal !== null && grow.weight_goal !== undefined && grow.weight_goal !== '') {
      const f = Number(grow.weight_goal);
      if (Number.isFinite(f)) goalWeight = f;
    }
  } catch { goalWeight = null; }
  if (rows.length < 2) return { status: 'error', data: null, message: '记录不足(' + start + ' ~ ' + end + ')，需要至少2条记录' };
  const dates = rows.map((r) => r[0]);
  const weights = rows.map((r) => r[1]);
  let baselineValue: number;
  let baselineSigma: number;
  let toggleLabel: string;
  if (baselineMode === 'goal' && goalWeight) {
    baselineValue = goalWeight;
    baselineSigma = fullDetrendedSigma(weights);
    toggleLabel = 'vs 目标 ' + goalWeight + 'kg';
  } else {
    const recent30 = weights.length >= 30 ? weights.slice(-30) : weights;
    baselineValue = recent30.reduce((a, b) => a + b, 0) / recent30.length;
    baselineSigma = rollingSigma7d(weights);
    toggleLabel = 'vs 近 ' + Math.min(30, weights.length) + ' 天均值';
  }
  const sigmaForThresholds = baselineSigma > 0 ? baselineSigma : 0.5;
  const thresholds = { yellow: round3(YELLOW_SIGMA * sigmaForThresholds), red: round3(RED_SIGMA * sigmaForThresholds) };
  const levelFor = (absDev: number): VolLevel => absDev >= thresholds.red ? 'red' : absDev >= thresholds.yellow ? 'yellow' : 'normal';
  const points: VolPoint[] = dates.map((d, i) => {
    const dev = (weights[i] as number) - baselineValue;
    return { date: d, kg: weights[i] as number, deviationKg: round2(dev), level: levelFor(Math.abs(dev)) };
  });
  const cutoff = shiftISODate(end, -7);
  const recentAnomalies = points
    .filter((p) => p.level !== 'normal' && p.date >= cutoff)
    .sort((a, b) => Math.abs(b.deviationKg) - Math.abs(a.deviationKg));
  const sigmaTrend: VolSigmaTrend[] = [];
  for (let i = 0; i < weights.length; i++) {
    const window = weights.slice(Math.max(0, i - 6), i + 1);
    if (window.length >= 3) sigmaTrend.push({ dateStart: dates[i] as string, sigmaKg: round3(stdev(window)) });
  }
  const lastDate = dates[dates.length - 1] as string;
  const lastKg = weights[weights.length - 1] as number;
  const lastDev = lastKg - baselineValue;
  const lastAbs = Math.abs(lastDev);
  const ewLevel = levelFor(lastAbs);
  const ewMsg = ewLevel === 'red'
    ? '今偏离 ±' + lastAbs.toFixed(1) + 'kg 超过 2sigma 红线，谨紧张'
    : ewLevel === 'yellow' ? '今天偏离 ±' + lastAbs.toFixed(1) + 'kg 超过 1.5sigma 黄线，注意' : '今天在正常范围内(±' + lastAbs.toFixed(1) + 'kg)';
  return ok({
    baselineMode,
    baselineValue: round2(baselineValue),
    baselineSigma: round3(baselineSigma),
    thresholds,
    points,
    recentAnomalies,
    sigmaTrend,
    earlyWarning: { date: lastDate, kg: lastKg, deviationKg: round2(lastDev), level: ewLevel, message: ewMsg },
    baselineToggleLabel: toggleLabel,
  }, '波动分析完成:baseline=' + baselineValue.toFixed(1) + 'kg,σ=' + baselineSigma.toFixed(2) + 'kg');
}
