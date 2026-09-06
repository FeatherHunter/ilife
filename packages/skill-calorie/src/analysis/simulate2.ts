/** T5 #24 · 预测模拟续（减重模拟/摄入预测，对照老家 simulate.py A6.2/A6.3）。 */
import { seriesAvg } from './series.js';
import type { DaySeries } from './series.js';
import { shiftISODate } from './utils.js';
import { HEALTHY_RATE, KCAL_PER_KG, SIM_MIN_DAYS } from './simulate.js';
import type { SimBase, SimPoint } from './simulate.js';

const round = (n: number): number => Math.round(n);
const round2 = (n: number): number => Math.round(n * 100) / 100;

function degrade(kind: string, title: string, series: DaySeries[], need: string): SimBase {
  return { kind, title, degraded: true, degradeMsg: '数据不足:需要 ' + need + ',当前只有 ' + series.length + ' 天。', insight: '数据不足,无法预测。' };
}

function weightVals(series: DaySeries[]): number[] {
  return series.map((s) => s.weightKg).filter((v): v is number => v !== null && v !== undefined);
}

export interface WeightSimCut extends SimBase { current?: number; cutKcal?: number; newDeficit?: number; weeklyLoss?: number; feasible?: boolean; assumption?: string; forecast?: { label: string; horizonDays: number; points: SimPoint[] } }

export function weightSimCut(series: DaySeries[], cutKcal: number, title: string, kind = 'weight_sim_cut'): WeightSimCut {
  const dfAvg = seriesAvg(series, 'deficit');
  const wv = weightVals(series);
  if (wv.length === 0) return degrade(kind, title, series, '至少 1 条体重记录');
  const current = wv[wv.length - 1] as number;
  const newDeficit = (dfAvg ?? 0) + cutKcal;
  const weeklyLoss = (newDeficit * 7) / KCAL_PER_KG;
  const horizon = 90;
  const last = series[series.length - 1] as DaySeries;
  const pts: SimPoint[] = [{ date: last.date, value: round2(current) }];
  for (let d = 7; d <= horizon; d += 7) {
    pts.push({ date: shiftISODate(last.date, d), value: round2(current - (weeklyLoss * d) / 7) });
  }
  const feasible = HEALTHY_RATE[0] <= weeklyLoss && weeklyLoss <= HEALTHY_RATE[1];
  return {
    kind, title, degraded: false,
    start: (series[0] as DaySeries).date, end: last.date, days: series.length,
    current: round2(current), cutKcal,
    newDeficit: round(newDeficit), weeklyLoss: round2(weeklyLoss), feasible,
    assumption: '当前日均缺口 ' + ((dfAvg ?? 0) >= 0 ? '+' : '') + round(dfAvg ?? 0) + ' 卡,再每天多减 ' + cutKcal + ' 卡(≈ 每周 ' + round2((cutKcal * 7) / KCAL_PER_KG) + ' kg);90 天轨迹见下',
    forecast: { label: title, horizonDays: 90, points: pts },
    insight: '模拟 90 天:约减 ' + round1((weeklyLoss * 90) / 7) + ' kg,速率 ' + weeklyLoss.toFixed(2) + ' kg/周(' + (feasible ? '健康范围内' : '⚠️ 超出健康范围 0.5-1.0,建议减量') + ')。',
  };

  function round1(n: number): number { return Math.round(n * 10) / 10; }
}

export interface WeightSimTarget extends SimBase { current?: number; targetLoss?: number; daysTarget?: number; weeklyRate?: number; neededDeficit?: number; feasible?: boolean; assumption?: string; forecast?: { label: string; horizonDays: number; points: SimPoint[] } }

export function weightSimTarget(series: DaySeries[], targetKg: number, days: number, title: string, kind = 'weight_sim_target'): WeightSimTarget {
  const wv = weightVals(series);
  if (wv.length === 0) return degrade(kind, title, series, '至少 1 条体重记录');
  const current = wv[wv.length - 1] as number;
  const weeklyRate = targetKg / (days / 7);
  const neededDeficit = round((targetKg * KCAL_PER_KG) / days);
  const feasible = HEALTHY_RATE[0] <= weeklyRate && weeklyRate <= HEALTHY_RATE[1];
  const last = series[series.length - 1] as DaySeries;
  const pts: SimPoint[] = [{ date: last.date, value: round2(current) }];
  for (let d = 7; d <= days; d += 7) {
    pts.push({ date: shiftISODate(last.date, d), value: round2(current - (targetKg * Math.min(d, days)) / days) });
  }
  (pts[pts.length - 1] as SimPoint).value = round2(current - targetKg);
  return {
    kind, title, degraded: false,
    start: (series[0] as DaySeries).date, end: last.date, days: series.length,
    current: round2(current), targetLoss: targetKg, daysTarget: days,
    weeklyRate: round2(weeklyRate), neededDeficit, feasible,
    assumption: days + ' 天减 ' + targetKg + ' kg = 每周 ' + weeklyRate.toFixed(2) + ' kg,需日均缺口 ' + neededDeficit + ' 卡(≈ 每天少吃 2 碗米饭 + 30 分钟快走)',
    forecast: { label: title, horizonDays: days, points: pts },
    insight: '所需日均缺口 ' + neededDeficit + ' 卡,速率 ' + weeklyRate.toFixed(2) + ' kg/周' + (feasible ? '(可行,在健康范围内)。' : '(⚠️ 不可行:超出每周 0.5-1.0 kg 安全范围,拉长时间或降低目标)。'),
  };
}

export interface CalorieForecast extends SimBase { current?: number; goal?: number | null; dailyRate?: number; assumption?: string; forecast?: { label: string; horizonDays: number; points: SimPoint[] } }

function linearRateCal(series: DaySeries[]): [number | null, number | null] {
  const vals: Array<[number, number]> = [];
  for (const s of series) {
    if (s.calories === null || s.calories === undefined) continue;
    vals.push([Date.parse(s.date + 'T12:00:00Z'), s.calories]);
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

function residualStdCal(series: DaySeries[], slope: number): number {
  const vals: Array<[number, number]> = [];
  for (const s of series) {
    if (s.calories === null || s.calories === undefined) continue;
    vals.push([Date.parse(s.date + 'T12:00:00Z'), s.calories]);
  }
  if (vals.length < 3) return 0;
  const y0 = (vals[0] as [number, number])[1];
  const t0 = (vals[0] as [number, number])[0];
  const resid = vals.map(([t, y]) => y - (y0 + slope * ((t - t0) / 86400000)));
  const m = resid.reduce((a, b) => a + b, 0) / resid.length;
  return Math.sqrt(resid.reduce((a, r) => a + (r - m) * (r - m), 0) / (resid.length - 1));
}

export function calorieForecast(series: DaySeries[], horizonDays: number, title: string, kind = 'calorie_forecast'): CalorieForecast {
  const cal = series.map((s) => s.calories).filter((v): v is number => v !== null && v !== undefined);
  if (cal.length < SIM_MIN_DAYS) return degrade(kind, title, series, '≥' + SIM_MIN_DAYS + ' 天摄入记录');
  const [rate, latest] = linearRateCal(series);
  const sigma = residualStdCal(series, rate ?? 0);
  const last = series[series.length - 1] as DaySeries;
  const goal = last.calorieGoal;
  const pts: SimPoint[] = [{ date: last.date, value: round2(latest as number), lo: round2(latest as number), hi: round2(latest as number) }];
  for (let d = 7; d <= horizonDays; d += 7) {
    const v = (latest as number) + (rate as number) * d;
    const band = ((2 * sigma * Math.sqrt(d)) / Math.sqrt(7));
    pts.push({ date: shiftISODate(last.date, d), value: round2(v), lo: round2(v - band), hi: round2(v + band) });
  }
  const fc = { label: title, horizonDays, points: pts };
  const endV = (pts[pts.length - 1] as SimPoint).value;
  const nearGoal = goal !== null && goal !== undefined && Math.abs(endV - goal) <= 100;
  return {
    kind, title, degraded: false,
    start: (series[0] as DaySeries).date, end: last.date, days: series.length,
    current: round(latest as number), goal, dailyRate: round1(rate as number),
    assumption: '按近 ' + series.length + ' 天摄入趋势外推(日变化 ' + ((rate as number) >= 0 ? '+' : '') + (rate as number).toFixed(1) + ' 卡/天)',
    forecast: fc,
    insight: horizonDays + ' 天后日均摄入预计 ' + round(endV) + ' 卡(目标 ' + goal + ' 卡,' + (nearGoal ? '' : '⚠️ ') + '偏离 ' + round(Math.abs(endV - (goal ?? 0))) + ' 卡)。',
  };

  function round1(n: number): number { return Math.round(n * 10) / 10; }
}

export interface CalorieGoalEta extends SimBase { avg?: number; goal?: number; onTarget?: boolean; gap?: number; assumption?: string }

export function calorieGoalEta(series: DaySeries[], title: string, kind = 'calorie_goal'): CalorieGoalEta {
  const cal = series.map((s) => s.calories).filter((v): v is number => v !== null && v !== undefined);
  if (cal.length < SIM_MIN_DAYS) return degrade(kind, title, series, '≥' + SIM_MIN_DAYS + ' 天摄入记录');
  const avg = cal.reduce((a, b) => a + b, 0) / cal.length;
  const goal = (series[series.length - 1] as DaySeries).calorieGoal ?? 1800;
  const onTarget = Math.abs(avg - goal) <= goal * 0.1;
  return {
    kind, title, degraded: false,
    start: (series[0] as DaySeries).date, end: (series[series.length - 1] as DaySeries).date, days: series.length,
    avg: round(avg), goal, onTarget,
    gap: round(goal - avg),
    assumption: '目标 = daily_goal 表当日热量目标;达成判定 = 日均偏离 ≤10%',
    insight: '日均摄入 ' + round(avg) + ' 卡 vs 目标 ' + goal + ' 卡,' + (onTarget ? '已在目标 ±10% 内 ✅' : avg > goal ? '⚠️ 超出目标 ' + round(avg - goal) + ' 卡,先查超标日来源' : '⚠️ 低于目标,注意别低于 BMR') + '。',
  };
}

export interface CalorieDeficitEta extends SimBase { avgDeficit?: number; weeklyLoss?: number; assumption?: string }

export function calorieDeficitEta(series: DaySeries[], title: string, kind = 'calorie_deficit'): CalorieDeficitEta {
  const df = series.map((s) => s.deficit).filter((v): v is number => v !== null && v !== undefined);
  if (df.length < SIM_MIN_DAYS) return degrade(kind, title, series, '≥' + SIM_MIN_DAYS + ' 天摄入+运动记录');
  const avgDf = df.reduce((a, b) => a + b, 0) / df.length;
  const weekly = (avgDf * 7) / KCAL_PER_KG;
  const healthy = weekly >= 0.3 && weekly <= 1.2;
  return {
    kind, title, degraded: false,
    start: (series[0] as DaySeries).date, end: (series[series.length - 1] as DaySeries).date, days: series.length,
    avgDeficit: round(avgDf), weeklyLoss: round2(weekly),
    assumption: '缺口 = (TDEE + 运动消耗) − 摄入;每 7700 卡 ≈ 1 kg',
    insight: '日均缺口 ' + (avgDf >= 0 ? '+' : '') + round(avgDf) + ' 卡 → 每周约 ' + (weekly >= 0 ? '+' : '') + weekly.toFixed(2) + ' kg' + (healthy ? '(健康范围内)。' : '(⚠️ 缺口过大或不足,建议调整到 +300~+500 卡/天)。'),
  };
}

export interface CalorieStability extends SimBase { avg?: number; sigma?: number; stable?: boolean; assumption?: string }

export function calorieStability(series: DaySeries[], title: string, kind = 'calorie_stability'): CalorieStability {
  const cal = series.map((s) => s.calories).filter((v): v is number => v !== null && v !== undefined);
  if (cal.length < SIM_MIN_DAYS) return degrade(kind, title, series, '≥' + SIM_MIN_DAYS + ' 天摄入记录');
  const avg = cal.reduce((a, b) => a + b, 0) / cal.length;
  const sigma = Math.sqrt(cal.reduce((a, c) => a + (c - avg) * (c - avg), 0) / (cal.length - 1));
  const stable = sigma <= 300;
  return {
    kind, title, degraded: false,
    start: (series[0] as DaySeries).date, end: (series[series.length - 1] as DaySeries).date, days: series.length,
    avg: round(avg), sigma: round(sigma), stable,
    assumption: '稳定性判据:σ ≤ 300 卡 = 稳定;σ > 300 = 摄入忽高忽低',
    insight: '摄入波动 σ = ' + round(sigma) + ' 卡(日均 ' + round(avg) + '),' + (stable ? '稳定,按当前节奏预测可信度较高' : '⚠️ 波动大:预测可信度低,先规律化进食(固定三餐+加餐)再谈预测') + '。',
  };
}
