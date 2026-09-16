/** T7 #26 · 趋势口径层（对照老家 scripts/render_calorie_trend.py 7 dim + ticket-13 精度防护）。
 *
 * 有意偏离：老家直查 food_log（含水）；TS 以 T5 buildSeries 为唯一源（水已排除，
 * 与赤字/摘要同口径；水行 calories=0，数值等价）。空窗抛错（缺失阻断不返空）。
 * 精度：summary trend_value/start_avg/end_avg/weekday_avg/weekend_avg/weekend_diff
 * 与 series[].calorie 统一 round(2)（check_decimal_precision 白名单原样）。
 * #160 收口（本票第一件·达标口径）：`series[].calorie` 对**没记录的天**保 null（删掉老口径的
 * `?? 0`——「没记录＝0 卡」）。达标统计只在**有记录的天**里算（分母＝有记录的天），与页上图例
 * 「没记录的那天不按 0 算，只在有记录的两天之间连线」同一条口径；没记录的天也不再在图上落 0 点
 * （折线靠 `connectNulls` 跨空）。
 * #497（本票第二件·均值口径）：均值族（avg／weekday_avg／weekend_avg）分母一律＝**有记录的天**
 * （各组内空白日不进分母）；首末值（start_avg／end_avg → trend 判定）取**有记录的第一天／最后一天**，
 * 窗边空白日不再读 0。改前「按窗口天数、空白日按 0」是旧口径（见 git 历史），读数变化见 t497 证据。
 */
import type { DatabaseSync } from 'node:sqlite';
import { round2 } from '../kcal.js';
import { buildSeries } from './series.js';
import { weekdayName } from './deficit.js';

export interface TrendDay {
  date: string; weekday: string; type: '工作日' | '周末';
  /** 当日摄入（卡，round(2)）；**没记录的天为 null**（#160 收口：空白日不按 0 算）。 */
  calorie: number | null;
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
      /* #160 收口：没记录的天**不再** `?? 0` 补成 0 卡（老口径的空白日＝0 卡，既在图上落一个
       * 0 点、又被达标统计算成达标）。这里保 null，由消费方各自处理：图跨空连线，达标只数有记录的天。 */
      calorie: day.calories === null || day.calories === undefined ? null : round2(day.calories),
    };
  });
  const n = series.length;
  const total = series.reduce((a, d) => a + (d.calorie ?? 0), 0);
  /* #497：均值分母＝有记录的天（旧口径除以窗口天数 n，把空白日按 0 吃进均值；
   * 7 天窗 5 记录即只除以 5）。窗内无记录时不编数（回 0，不断言 NaN）。 */
  const logged = series.filter((d) => d.calorie !== null);
  const avg = logged.length ? Math.round(total / logged.length) : 0;
  const work = series.filter((d) => d.type === '工作日');
  const rest = series.filter((d) => d.type === '周末');
  /* #497：组内分母同样只数有记录的天（旧口径除以分组窗口天数）；组内无记录回 0。 */
  const mean = (arr: TrendDay[]) => {
    const vals = arr.filter((d) => d.calorie !== null);
    return vals.length ? vals.reduce((a, d) => a + (d.calorie ?? 0), 0) / vals.length : 0;
  };
  const weekdayAvg = round2(mean(work));
  const weekendAvg = round2(mean(rest));
  /* #160 收口（本票第一件）：达标统计的分母＝**有记录的天**——没记录的天既不按 0 卡计入达标、
   * 也不进分母。老口径＝`series.filter(d => d.calorie <= target * 1.05)`、分母是窗口天数 n：
   * 7 天窗只记了 5 天却报「7 天达标」，与页上「没记录的那天不按 0 算」当场打架。
   * 无记录（全窗空白）时分子分母同为 0：不编数（除零不返 NaN）。 */
  const loggedCals = series.map((d) => d.calorie).filter((c): c is number => c !== null);
  const compliantDays = loggedCals.filter((c) => c <= target * 1.05).length;
  let startAvg = avg, endAvg = avg, trendValue = 0, trend: TrendSummary['trend'] = 'flat';
  if (n >= 2) {
    /* #497：首末值取有记录的第一天／最后一天（旧口径 `series[0] ?? 0` 在窗首空白日读 0，
     * 趋势方向会被一个凭空的 0 带偏）。窗内无记录时沿用 avg（＝0，不编数）。 */
    startAvg = logged.length > 0 ? (logged[0] as TrendDay).calorie as number : avg;
    endAvg = logged.length > 0 ? (logged[logged.length - 1] as TrendDay).calorie as number : avg;
    trendValue = round2(endAvg - startAvg);
    trend = trendValue < -50 ? 'down' : trendValue > 50 ? 'up' : 'flat';
  }
  return {
    summary: {
      avg, target, trend, trendValue,
      startAvg: round2(startAvg), endAvg: round2(endAvg),
      weekdayAvg, weekendAvg, weekendDiff: round2(weekendAvg - weekdayAvg),
      complianceRate: loggedCals.length ? Math.round((compliantDays / loggedCals.length) * 100) / 100 : 0,
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
