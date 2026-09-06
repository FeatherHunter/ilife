/** #41 · 身体细节读链 render 数据（体成分看/围度看）。
 *
 * 数据源全复用 fetch/body.ts，不自算：
 * 体成分=listCompositions + trendComposition（source 缺省取 latestSource）；
 * 围度=listMeasurements + trendMeasurement（metric 可选）。
 * 录链（composition-add/remove、measure-add/remove）已由 #40 写键承接，本票只补看链。
 * 空库一律 missing-data，不返空数组冒充正常。
 */
import type { DatabaseSync } from 'node:sqlite';
import { compareCompositions, compareMeasurements, listCompositions, listMeasurements, trendComposition, trendMeasurement } from '../fetch/body.js';
import { FetchError } from '../fetch/errors.js';
import { CalorieRenderError } from './errors.js';

export interface BodyCompositionView {
  source: string | null;
  items: Record<string, unknown>[];
  total: number;
  trend: { date: string; avgPct: number; n: number }[];
  latestPct: number | null;
}

export function buildBodyCompositionView(
  db: DatabaseSync,
  opts: { days?: number; source?: string; limit?: number } = {},
): BodyCompositionView {
  const days = opts.days ?? 90;
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    throw new CalorieRenderError('bad-input', 'days 须为 1..365 整数');
  }
  const limit = opts.limit ?? 20;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new CalorieRenderError('bad-input', 'limit 须为 1..100 整数');
  }
  try {
    const items = listCompositions(db, { days, source: opts.source, limit });
    if (items.length === 0) throw new CalorieRenderError('missing-data', '无体成分记录（近' + days + '天）');
    const trend = trendComposition(db, days, opts.source);
    const first = items[0] as { body_fat_pct?: unknown; source?: unknown };
    const latestPct = typeof first?.body_fat_pct === 'number' ? (first.body_fat_pct as number) : null;
    const source = typeof first?.source === 'string' ? (first.source as string) : (opts.source ?? null);
    return { source, items, total: items.length, trend, latestPct };
  } catch (e) {
    if (e instanceof CalorieRenderError) throw e;
    if (e instanceof FetchError) throw new CalorieRenderError('missing-data', e.message);
    throw e;
  }
}

export function buildBodyCompositionCompare(
  db: DatabaseSync,
  fromDate: string,
  toDate: string,
  source?: string,
): Record<string, unknown> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
    throw new CalorieRenderError('bad-input', '日期非法：' + fromDate + ' ~ ' + toDate);
  }
  try {
    return compareCompositions(db, fromDate, toDate, source) as Record<string, unknown>;
  } catch (e) {
    if (e instanceof FetchError) throw new CalorieRenderError('missing-data', e.message);
    throw e;
  }
}

export interface BodyMeasureView {
  metric: string | null;
  items: Record<string, unknown>[];
  total: number;
  trend: { date: string; avgVal: number; n: number }[];
  latestVal: number | null;
}

export function buildBodyMeasureView(
  db: DatabaseSync,
  opts: { metric?: string; days?: number; limit?: number; dateFrom?: string; dateTo?: string } = {},
): BodyMeasureView {
  const days = opts.days ?? 90;
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    throw new CalorieRenderError('bad-input', 'days 须为 1..365 整数');
  }
  const limit = opts.limit ?? 20;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new CalorieRenderError('bad-input', 'limit 须为 1..100 整数');
  }
  if (opts.dateFrom && !/^\d{4}-\d{2}-\d{2}$/.test(opts.dateFrom)) throw new CalorieRenderError('bad-input', 'dateFrom 非法：' + opts.dateFrom);
  if (opts.dateTo && !/^\d{4}-\d{2}-\d{2}$/.test(opts.dateTo)) throw new CalorieRenderError('bad-input', 'dateTo 非法：' + opts.dateTo);
  try {
    const items = listMeasurements(db, {
      metric: opts.metric,
      days: opts.dateFrom && opts.dateTo ? undefined : days,
      dateFrom: opts.dateFrom,
      dateTo: opts.dateTo,
      limit,
    });
    if (items.length === 0) throw new CalorieRenderError('missing-data', '无围度记录');
    let trend: { date: string; avgVal: number; n: number }[] = [];
    let latestVal: number | null = null;
    if (opts.metric) {
      trend = trendMeasurement(db, opts.metric, days);
      const v = (items[0] as Record<string, unknown>)[opts.metric];
      latestVal = typeof v === 'number' ? v : null;
    }
    return { metric: opts.metric ?? null, items, total: items.length, trend, latestVal };
  } catch (e) {
    if (e instanceof CalorieRenderError) throw e;
    if (e instanceof FetchError) throw new CalorieRenderError('missing-data', e.message);
    throw e;
  }
}

export function buildBodyMeasureCompare(db: DatabaseSync, date1: string, date2: string): {
  date1: string; date2: string; deltas: Record<string, { before: number; after: number; delta: number }>; nCompared: number;
} {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date1) || !/^\d{4}-\d{2}-\d{2}$/.test(date2)) {
    throw new CalorieRenderError('bad-input', '日期非法：' + date1 + ' ~ ' + date2);
  }
  try {
    return compareMeasurements(db, date1, date2);
  } catch (e) {
    if (e instanceof FetchError) throw new CalorieRenderError('missing-data', e.message);
    throw e;
  }
}
