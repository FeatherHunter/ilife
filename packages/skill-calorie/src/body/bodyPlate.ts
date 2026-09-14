/** #41 · 身体细节读链 render 数据（体成分看/围度看）。
 *
 * 数据源全复用 fetch/body.ts，不自算：
 * 体成分=listCompositions + trendComposition（source 缺省取 latestSource）；
 * 围度=listMeasurements + trendMeasurement（metric 可选）。
 * 录链（composition-add/remove、measure-add/remove）已由 #40 写键承接，本票只补看链。
 * 空库一律 missing-data，不返空数组冒充正常。
 */
import type { DatabaseSync } from 'node:sqlite';
import { CALIPER_FIELDS, compareCompositions, compareMeasurements, latestMeasurementMetric, listCompositions, listMeasurements, trendComposition, trendMeasurement } from '../fetch/body.js';
import { FetchError } from '../fetch/errors.js';
import { CalorieRenderError } from '../render/errors.js';

/** #359 · 7 点站点标签：**次序与 `CALIPER_FIELDS` 逐位对齐**；标签原文照老技能向导页
 *  `D:\2Study\StudyNotes\SKILLS\卡路里\templates\body_composition_wizard.html:515`
 *  「胸 ／ 腹 ／ 大腿 ／ 三头肌 ／ 肩胛下 ／ 髂上 ／ 腋中线」。本表只供页面认位，不含任何换算。 */
export const CALIPER_SITE_LABELS = ['胸', '腹', '大腿', '三头肌', '肩胛下', '髂上', '腋中线'] as const;

/** 一条记录的 7 个皮褶槽（缺槽位如实给 `null`，不补默认值、不求和）。 */
export interface CaliperEcho {
  date: string;
  sites: { key: string; label: string; mm: number | null }[];
}

/** 取「最近一条有皮褶数据的记录」的 7 槽原始值：按 listCompositions 的既有次序（date DESC, id DESC）
 *  逐条找，第一条至少有一个皮褶值非空者即回显；全无皮褶数据（如健身房 InBody）→ `null`（页面不渲染 7 点表）。 */
function caliperEchoOf(items: Record<string, unknown>[]): CaliperEcho | null {
  for (const item of items) {
    if (!CALIPER_FIELDS.some((f) => typeof item[f] === 'number')) continue;
    return {
      date: typeof item['date'] === 'string' ? (item['date'] as string) : '',
      sites: CALIPER_FIELDS.map((f, i) => ({
        key: f,
        label: CALIPER_SITE_LABELS[i] ?? f,
        mm: typeof item[f] === 'number' ? (item[f] as number) : null,
      })),
    };
  }
  return null;
}

export interface BodyCompositionView {
  source: string | null;
  items: Record<string, unknown>[];
  total: number;
  trend: { date: string; avgPct: number; n: number }[];
  latestPct: number | null;
  /** #359 · 7 点皮褶回显（最近一条有皮褶数据的记录；没有＝null）。 */
  calipers: CaliperEcho | null;
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
    return { source, items, total: items.length, trend, latestPct, calipers: caliperEchoOf(items) };
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
  /** #360 · 不带部位时自动挑的部位（`metric` 有值时为 `null`；全量表语义不动，仍是未过滤列表）。 */
  autoMetric: string | null;
  /** #360 · 趋势五项 KPI 的唯一来源（由 `trend` 的 `avgVal` 序列算出，与图同批定；
   * 口径照老 `body_measurements_view.html:454-462` 的 `kpiFor`：均值保留 2 位，`n<2` 时变化量为 `null`）。 */
  kpi: { count: number; avg: number | null; min: number | null; max: number | null; delta: number | null };
}

/** #360 · 趋势 KPI 单一来源（`bodyDocs` 只渲染不重算，KPI 与图必然一致）。 */
export function measureTrendKpi(trend: { date: string; avgVal: number; n: number }[]): {
  count: number; avg: number | null; min: number | null; max: number | null; delta: number | null;
} {
  const values = trend.map((t) => t.avgVal).filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (values.length === 0) return { count: 0, avg: null, min: null, max: null, delta: null };
  const round2 = (n: number): number => Math.round(n * 100) / 100;
  return {
    count: values.length,
    avg: round2(values.reduce((a, b) => a + b, 0) / values.length),
    min: Math.min(...values),
    max: Math.max(...values),
    delta: values.length >= 2 ? round2(values[values.length - 1] - values[0]) : null,
  };
}

/** #360 · 样本不足兜底的空 KPI（老正本 `:491／:496／:507` 三处 `kpiHtml(null×4)` 的新侧等价：四格 `null`＋点数 0）。 */
function emptyMeasureKpi(): {
  count: number; avg: number | null; min: number | null; max: number | null; delta: number | null;
} {
  return { count: 0, avg: null, min: null, max: null, delta: null };
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
  const useRange = Boolean(opts.dateFrom && opts.dateTo);
  try {
    // #360 · 带部位＝单部位趋势（行为不变，另加该部位无数据时的样本不足兜底）；
    // 不带部位＝全量表（列表语义归 #361，本票不动）＋ 自动挑最近有数据部位出趋势（裁定 4）。
    if (opts.metric) {
      const items = listMeasurements(db, {
        metric: opts.metric,
        days: useRange ? undefined : days,
        dateFrom: opts.dateFrom,
        dateTo: opts.dateTo,
        limit,
      });
      if (items.length === 0) {
        const anyRows = listMeasurements(db, {
          days: useRange ? undefined : days,
          dateFrom: opts.dateFrom,
          dateTo: opts.dateTo,
          limit: 1,
        });
        if (anyRows.length === 0) throw new CalorieRenderError('missing-data', '无围度记录');
        return { metric: opts.metric, items: [], total: 0, trend: [], latestVal: null, autoMetric: null, kpi: emptyMeasureKpi() };
      }
      const trend = trendMeasurement(db, opts.metric, days);
      const v = (items[0] as Record<string, unknown>)[opts.metric];
      const latestVal = typeof v === 'number' ? v : null;
      return { metric: opts.metric, items, total: items.length, trend, latestVal, autoMetric: null, kpi: measureTrendKpi(trend) };
    }
    const items = listMeasurements(db, {
      days: useRange ? undefined : days,
      dateFrom: opts.dateFrom,
      dateTo: opts.dateTo,
      limit,
    });
    if (items.length === 0) throw new CalorieRenderError('missing-data', '无围度记录');
    const picked = latestMeasurementMetric(db, useRange
      ? { dateFrom: opts.dateFrom, dateTo: opts.dateTo }
      : { days });
    if (!picked) throw new CalorieRenderError('missing-data', '无围度记录');
    const trend = trendMeasurement(db, picked, days);
    let latestVal: number | null = null;
    for (const r of items) {
      const cand = (r as Record<string, unknown>)[picked];
      if (typeof cand === 'number') { latestVal = cand; break; }
    }
    return { metric: null, items, total: items.length, trend, latestVal, autoMetric: picked, kpi: measureTrendKpi(trend) };
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
