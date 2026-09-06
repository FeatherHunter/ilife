/** T7 #26 · 精度守卫（对照老家 check_decimal_precision.py 白名单与规则）。
 *
 * 白名单：summary.trend_value/start_avg/end_avg/weekday_avg/weekend_avg/avg/total_calorie/avg_calorie、
 * series[*].calorie/items[*].calorie。规则：round(2) 后差 ≤ 1e-9，否则抛错。
 * T8-T10 渲染序列化前调 assertNoLeak；T1 kcal.isClean 为单值版。
 */
import { isClean } from '../kcal.js';

export const PRECISION_SUMMARY_FIELDS = [
  'trend_value', 'trendValue', 'start_avg', 'startAvg', 'end_avg', 'endAvg',
  'weekday_avg', 'weekdayAvg', 'weekend_avg', 'weekendAvg', 'weekend_diff', 'weekendDiff',
  'avg', 'total_calorie', 'totalCalorie', 'avg_calorie', 'avgCalorie',
];

export const PRECISION_SERIES_KEYS = ['calorie'];

export interface LeakReport { path: string; value: number }

export function findLeaks(data: { summary?: Record<string, unknown>; series?: Record<string, unknown>[] }): LeakReport[] {
  const leaks: LeakReport[] = [];
  const summary = data.summary ?? {};
  for (const f of PRECISION_SUMMARY_FIELDS) {
    const v = summary[f];
    if (typeof v === 'number' && !isClean(v)) leaks.push({ path: `summary.${f}`, value: v });
  }
  for (let i = 0; i < (data.series ?? []).length; i++) {
    const item = (data.series as Record<string, unknown>[])[i] as Record<string, unknown>;
    for (const k of PRECISION_SERIES_KEYS) {
      const v = item[k];
      if (typeof v === 'number' && !isClean(v)) leaks.push({ path: `series[${i}].${k}`, value: v });
    }
  }
  return leaks;
}

export function assertNoLeak(data: { summary?: Record<string, unknown>; series?: Record<string, unknown>[] }): void {
  const leaks = findLeaks(data);
  if (leaks.length) {
    throw new Error(
      '[calorie] 小数精度泄漏: ' + leaks.map((l) => `${l.path}=${l.value}`).join(', '),
    );
  }
}
