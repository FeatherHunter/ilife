/** #41 · 身体细节读链 render 数据（体成分看/围度看）。
 *
 * 数据源全复用 fetch/body.ts，不自算：
 * 体成分=listCompositions + trendComposition（source 缺省取 latestSource）；
 * 围度=listMeasurements + trendMeasurement（metric 可选）。
 * 录链（composition-add/remove、measure-add/remove）已由 #40 写键承接，本票只补看链。
 * 空库一律 missing-data，不返空数组冒充正常。
 */
import type { DatabaseSync } from 'node:sqlite';
import { CALIPER_FIELDS, compareCompositions, compareMeasurements, compositionSourceCount, latestMeasurementMetric, listCompositions, listMeasurements, trendComposition, trendCompositionBySource, trendMeasurement } from '../fetch/body.js';
import type { SourceFilter, SourceSeries } from '../fetch/body.js';
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

/** #362 · 体成分看页的**窗口**（页面裁决后的三态；取数侧的入参类型是 `fetch/body.ts` 的
 *  `CompositionWindowInput`——同形两层的分工：那里收「天数／区间／不给」，这里记「裁决出的是哪一种」）。
 *  不传窗口参数＝`all`（**全部历史**，本票正题）；`days`＝近 N 天；两个日期都给＝闭区间。 */
export type CompositionWindow =
  | { kind: 'all' }
  | { kind: 'days'; days: number }
  | { kind: 'range'; from: string; to: string };

/** 窗口口径句（页面可见文本的**唯一出处**，判据「两次跑的这句随参数变」认这一句）：
 *  `全部历史`／`近 N 天`／`A → B`。 */
export function compositionWindowLabel(w: CompositionWindow): string {
  if (w.kind === 'days') return '近 ' + w.days + ' 天';
  if (w.kind === 'range') return w.from + ' → ' + w.to;
  return '全部历史';
}

/** 窗口 → 取数位入参：`{}`＝全部历史（`windowClause` 不加日期谓词）。 */
function windowInput(w: CompositionWindow): { days?: number; dateFrom?: string; dateTo?: string } {
  if (w.kind === 'days') return { days: w.days };
  if (w.kind === 'range') return { dateFrom: w.from, dateTo: w.to };
  return {};
}

/** #362 · 锚点 Δ（老正本 `body_composition_view.html:327-328` 的 `rows[1]` 口径，**逐字移植**）：
 *  比较对象＝记录列表里的**上一条**（不按来源另挑；来源不同时页面在注里点名）。
 *  上一条缺席或体脂缺席 ⇒ `null`（页面写「暂无对比基线」）。间隔天数＝日历差（老 `daysBetween` 同式）。 */
function compositionDelta(items: Record<string, unknown>[]): {
  prevDate: string; prevSource: string | null; gapDays: number; diffPct: number;
} | null {
  const cur = items[0] as { date?: unknown; body_fat_pct?: unknown } | undefined;
  const prev = items[1] as { date?: unknown; body_fat_pct?: unknown; source?: unknown } | undefined;
  if (!cur || !prev) return null;
  if (typeof cur.body_fat_pct !== 'number' || typeof prev.body_fat_pct !== 'number') return null;
  if (typeof cur.date !== 'string' || typeof prev.date !== 'string') return null;
  return {
    prevDate: prev.date,
    prevSource: typeof prev.source === 'string' ? prev.source : null,
    gapDays: Math.round((Date.parse(cur.date) - Date.parse(prev.date)) / 86400000),
    diffPct: Math.round((cur.body_fat_pct - prev.body_fat_pct) * 100) / 100,
  };
}

export interface BodyCompositionView {
  source: string | null;
  /** #362 · 读命令**实际收到的** `source` 参数（页面表单回显用；`null`＝没传，不是「全部来源」的别名）。 */
  sourceParam: string | null;
  items: Record<string, unknown>[];
  total: number;
  trend: { date: string; avgPct: number; n: number }[];
  latestPct: number | null;
  /** #362 · 本页窗口（页面必须把 `compositionWindowLabel(window)` 写进可见文本）。 */
  window: CompositionWindow;
  /** #362 · 窗口内**总条数**（不受 `limit` 影响）：`total` 是显示出来的行数，这一项让「窗口内共几条」可判、不静默截断。 */
  windowTotal: number;
  /** #362 · 锚点大数字的数据（老正本 `:74-84`／`:155`）：读数＝**最新一条**（列表首行），不是窗口均值。 */
  anchor: { date: string; pct: number | null; source: string | null } | null;
  /** #362 · Δ 与间隔天数（老正本 `:339-340`）；无基线 ⇒ `null`。 */
  delta: { prevDate: string; prevSource: string | null; gapDays: number; diffPct: number } | null;
  /** #359 · 7 点皮褶回显（最近一条有皮褶数据的记录；没有＝null）。 */
  calipers: CaliperEcho | null;
  /** #398 · 按来源分组（仅 `source=all` 时非空）：每个来源一条序列，来源之间不合并。 */
  sourceSeries: SourceSeries[];
  /** #398 · 窗口内按来源分组的组数（`source=all` 时＝`compositionSourceCount` 的读数，页面直接可判）。 */
  sourceCount: number;
}

export function buildBodyCompositionView(
  db: DatabaseSync,
  opts: { days?: number; dateFrom?: string; dateTo?: string; source?: SourceFilter; limit?: number } = {},
): BodyCompositionView {
  const days = opts.days;
  if (days !== undefined && (!Number.isInteger(days) || days < 1 || days > 365)) {
    throw new CalorieRenderError('bad-input', 'days 须为 1..365 整数');
  }
  const limit = opts.limit ?? 20;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new CalorieRenderError('bad-input', 'limit 须为 1..100 整数');
  }
  // #362 · 窗口裁决：两个日期都给 ⇒ 闭区间（优先于 `days`）；只给一个 ⇒ 用法错（不许静默忽略参数）；
  // 给了 `days` ⇒ 近 N 天；都不给 ⇒ **全部历史**（原状是兜 90 天，本票正题）。
  const { dateFrom, dateTo } = opts;
  if ((dateFrom === undefined) !== (dateTo === undefined)) {
    throw new CalorieRenderError('bad-input', 'dateFrom 与 dateTo 须成对给（区间窗口）');
  }
  if (dateFrom !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) throw new CalorieRenderError('bad-input', 'dateFrom 非法：' + dateFrom);
  if (dateTo !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) throw new CalorieRenderError('bad-input', 'dateTo 非法：' + dateTo);
  const window: CompositionWindow = dateFrom !== undefined && dateTo !== undefined
    ? { kind: 'range', from: dateFrom, to: dateTo }
    : days !== undefined ? { kind: 'days', days } : { kind: 'all' };
  const win = windowInput(window);
  try {
    // #362 · 先把窗口内的**全部**行取出来（`limit` 只截显示、不再截窗口）：`windowTotal` 即「窗口内共几条」。
    const rows = listCompositions(db, { ...win, source: opts.source });
    if (rows.length === 0) {
      // 序 6（老 `:355`）：空态句必须带「怎么记第一条」的指引，不许只写「无数据」；同时把窗口口径写进这句。
      throw new CalorieRenderError('missing-data',
        '无体成分记录（窗口：' + compositionWindowLabel(window) + '）→ 记体脂：皮褶钳或外部测量，第一条就是基线');
    }
    const items = rows.slice(0, limit);
    const trend = trendComposition(db, win, opts.source);
    const first = items[0] as { date?: unknown; body_fat_pct?: unknown; source?: unknown };
    const latestPct = typeof first?.body_fat_pct === 'number' ? (first.body_fat_pct as number) : null;
    const firstSource = typeof first?.source === 'string' ? (first.source as string) : null;
    // #398 · `source=all`：分组序列与组数由数据层备齐（不按来源过滤、按来源分组）。
    // 组数取 `compositionSourceCount` 的读数，与 `SELECT COUNT(DISTINCT source)…`（同窗口）恒等。
    const grouped = opts.source === 'all';
    return {
      source: firstSource ?? (opts.source ?? null),
      sourceParam: opts.source ?? null,
      items,
      total: items.length,
      window,
      windowTotal: rows.length,
      trend,
      latestPct,
      anchor: first === undefined ? null : { date: typeof first.date === 'string' ? first.date : '', pct: latestPct, source: firstSource },
      delta: compositionDelta(items),
      calipers: caliperEchoOf(items),
      sourceSeries: grouped ? trendCompositionBySource(db, win) : [],
      sourceCount: grouped ? compositionSourceCount(db, win) : 0,
    };
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
  /** #534 波次裁定 · 窗口是「调用方点名给的」还是「缺省兜的」。
   *  两条唤醒词「看围度」与「看围度趋势」当刻同键同参（缺省 90 天 vs 显式 `days:90`）⇒ 产物**逐字节相同**，
   *  在验收墙上是两格一模一样的东西。本字段让页面按「谁在问」换主次（趋势那条以趋势为主、记录那条以全量记录为主），
   *  **不动任何取数与窗口语义**：缺省仍是近 90 天，`window` 文案照旧。 */
  windowGiven: boolean;
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
  opts: { metric?: string; days?: number; limit?: number; dateFrom?: string; dateTo?: string; windowGiven?: boolean } = {},
): BodyMeasureView {
  const days = opts.days ?? 90;
  const windowGiven = opts.windowGiven === true;
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
        return { metric: opts.metric, items: [], total: 0, trend: [], latestVal: null, autoMetric: null, kpi: emptyMeasureKpi(), windowGiven };
      }
      const trend = trendMeasurement(db, opts.metric, days);
      const v = (items[0] as Record<string, unknown>)[opts.metric];
      const latestVal = typeof v === 'number' ? v : null;
      return { metric: opts.metric, items, total: items.length, trend, latestVal, autoMetric: null, kpi: measureTrendKpi(trend), windowGiven };
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
    return { metric: null, items, total: items.length, trend, latestVal, autoMetric: picked, kpi: measureTrendKpi(trend), windowGiven };
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
