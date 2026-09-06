/** T7 #26 · 赤字口径层（对照老家 scripts/render_calorie_deficit.py 数据段 + ADR-0013）。
 *
 * 薄壳：唯一数据源 = T5 buildSeries，不自算缺口（老家 v2 T5 薄壳化后同样）。
 * 热量缺口 = 消耗 − 摄入，正=缺口；消耗 = TDEE + 当日运动；摄入 = 当日食物（不含水）。
 * KCAL_PER_KG = 7700（脂肪）；weekly_deficit_per_day: 300 沿老家 target 段。
 */
import type { DatabaseSync } from 'node:sqlite';
import { FetchError } from '../fetch/errors.js';
import { round2 } from '../kcal.js';
import { buildSeries } from './series.js';

export const KCAL_PER_KG = 7700;
export const WEEKDAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export function weekdayName(isoDate: string): string {
  const t = Date.parse(isoDate + 'T12:00:00Z');
  if (Number.isNaN(t)) throw new FetchError('日期非法: ' + isoDate);
  return WEEKDAY_NAMES[(new Date(t).getUTCDay() + 6) % 7] as string;
}

export interface DeficitDay {
  date: string; intake: number; burn: number; deficit: number; weekday: string;
}

export interface DeficitSummary {
  avgIntake: number; avgBurn: number; avgExerciseBurn: number; avgDeficit: number;
  weeklyDeficit: number; predictedLossKg: number; trend: 'loss' | 'gain' | 'flat';
}

export interface DeficitData {
  summary: DeficitSummary;
  target: { intake: number; tdee: number; weeklyDeficitPerDay: number };
  series: DeficitDay[];
  meta: { start: string; end: string; days: number; weekdayCount: number; weekendCount: number };
}

export function buildDeficitData(db: DatabaseSync, start: string, end: string): DeficitData {
  const s = buildSeries(db, start, end);
  if (!s.length) throw new FetchError(`无数据：${start} ~ ${end}`);
  const first = s[0] as (typeof s)[number];
  const targetIntake = first.calorieGoal || 1800;
  const tdee = first.tdee || 1800;
  const series: DeficitDay[] = s.map((day) => {
    const intake = day.calories ?? 0;
    const exerciseBurn = day.exerciseKcal ?? 0;
    return {
      date: day.date,
      intake,
      burn: (day.tdee || 0) + exerciseBurn,
      deficit: day.deficit ?? 0,
      weekday: weekdayName(day.date),
    };
  });
  const n = series.length;
  const sum = (f: (d: DeficitDay) => number) => series.reduce((a, d) => a + f(d), 0);
  const totalD = sum((d) => d.deficit);
  const avgD = Math.round(totalD / n);
  const totalEx = s.reduce((a, d) => a + (d.exerciseKcal ?? 0), 0);
  return {
    summary: {
      avgIntake: Math.round(sum((d) => d.intake) / n),
      avgBurn: Math.round(sum((d) => d.burn) / n),
      avgExerciseBurn: Math.round(totalEx / n),
      avgDeficit: avgD,
      weeklyDeficit: totalD,
      predictedLossKg: round2(totalD / KCAL_PER_KG),
      trend: avgD > 0 ? 'loss' : avgD < 0 ? 'gain' : 'flat',
    },
    target: { intake: targetIntake, tdee, weeklyDeficitPerDay: 300 },
    series,
    meta: {
      start, end, days: n,
      weekdayCount: series.filter((d) => ['周一', '周二', '周三', '周四', '周五'].includes(d.weekday)).length,
      weekendCount: series.filter((d) => d.weekday === '周六' || d.weekday === '周日').length,
    },
  };
}
