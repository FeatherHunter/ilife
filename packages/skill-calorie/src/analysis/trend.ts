/** T7 #26 · 趋势口径层（对照老家 scripts/render_calorie_trend.py 7 dim + ticket-13 精度防护）。
 *
 * 有意偏离：老家直查 food_log（含水）；TS 以 T5 buildSeries 为唯一源（水已排除，
 * 与赤字/摘要同口径；水行 calories=0，数值等价）。空窗抛错（缺失阻断不返空）。
 * 精度：summary trend_value/start_avg/end_avg/weekday_avg/weekend_avg/weekend_diff
 * 与 series[].calorie 统一 round(2)（check_decimal_precision 白名单原样）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { round2 } from '../kcal.js';
import { buildSeries } from './series.js';
import { weekdayName } from './deficit.js';

export interface TrendDay {
  date: string; weekday: string; type: '工作日' | '周末'; calorie: number;
}

export interface TrendSummary {
  avg: number; target: number; trend: 'up' | 'down' | 'flat'; trendValue: number;
  startAvg: number; endAvg: number; weekdayAvg: number; weekendAvg: number;
  weekendDiff: number; complianceRate: number; compliantDays: number;
}

export interface TrendData {
  summary: TrendSummary;
  series: TrendDay[];
  meta: { start: string; end: string; weekdayCount: number; weekendCount: number };
}

export function buildTrendData(db: DatabaseSync, start: string, end: string): TrendData {
  const s = buildSeries(db, start, end);
  const target = (s[0]?.calorieGoal || 1800) as number;
  const series: TrendDay[] = s.map((day) => {
    const wd = weekdayName(day.date);
    return {
      date: day.date,
      weekday: wd,
      type: wd === '周六' || wd === '周日' ? '周末' : '工作日',
      calorie: round2(day.calories ?? 0),
    };
  });
  const n = series.length;
  const total = series.reduce((a, d) => a + d.calorie, 0);
  const avg = n ? Math.round(total / n) : 0;
  const work = series.filter((d) => d.type === '工作日');
  const rest = series.filter((d) => d.type === '周末');
  const mean = (arr: TrendDay[]) => (arr.length ? arr.reduce((a, d) => a + d.calorie, 0) / arr.length : 0);
  const weekdayAvg = round2(mean(work));
  const weekendAvg = round2(mean(rest));
  const compliantDays = series.filter((d) => d.calorie <= target * 1.05).length;
  let startAvg = avg, endAvg = avg, trendValue = 0, trend: TrendSummary['trend'] = 'flat';
  if (n >= 2) {
    startAvg = (series[0] as TrendDay).calorie;
    endAvg = (series[n - 1] as TrendDay).calorie;
    trendValue = round2(endAvg - startAvg);
    trend = trendValue < -50 ? 'down' : trendValue > 50 ? 'up' : 'flat';
  }
  return {
    summary: {
      avg, target, trend, trendValue,
      startAvg: round2(startAvg), endAvg: round2(endAvg),
      weekdayAvg, weekendAvg, weekendDiff: round2(weekendAvg - weekdayAvg),
      complianceRate: n ? Math.round((compliantDays / n) * 100) / 100 : 0,
      compliantDays,
    },
    series,
    meta: {
      start, end,
      weekdayCount: work.length,
      weekendCount: rest.length,
    },
  };
}
