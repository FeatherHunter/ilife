/** T3 #22 · 身体取数：围度 + 体成分（对照老家 body_measurements.py / body_composition.py / validators.py）。
 *
 * 校验规则逐字对照 validators.py（含 _caliper_cli_name 的 `--a-b` 命名与 fix 文案）；
 * 删除为软删除（is_deprecated=1）；失败抛错（老家 {status:fail} → TS 抛 FetchError/ValidationError）。
 */
import type { DatabaseSync } from 'node:sqlite';
import type { SQLInputValue } from './db.js';
import { SOURCE_CHOICES } from '../kcal.js';
import type { SourceChoice } from '../kcal.js';
import { FetchError } from './errors.js';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const CALIPER_FIELDS = [
  'caliper_chest_mm', 'caliper_abdominal_mm', 'caliper_thigh_mm',
  'caliper_tricep_mm', 'caliper_subscapular_mm', 'caliper_suprailiac_mm',
  'caliper_midaxillary_mm',
];

export const MEASUREMENT_FIELDS = [
  'chest_cm', 'waist_cm', 'abdomen_cm', 'hip_cm',
  'left_thigh_cm', 'right_thigh_cm',
  'left_calf_cm', 'right_calf_cm',
  'left_arm_cm', 'right_arm_cm',
  'left_forearm_cm', 'right_forearm_cm',
  'shoulder_cm',
];

export const MEASUREMENT_BOUNDS: Record<string, [number, number]> = {
  chest_cm: [20, 200], waist_cm: [20, 200], abdomen_cm: [20, 200], hip_cm: [20, 200],
  shoulder_cm: [20, 200],
  left_thigh_cm: [10, 100], right_thigh_cm: [10, 100],
  left_calf_cm: [10, 80], right_calf_cm: [10, 80],
  left_arm_cm: [10, 60], right_arm_cm: [10, 60],
  left_forearm_cm: [10, 50], right_forearm_cm: [10, 50],
};

export const CALIPER_MIN_MM = 0.0;
export const CALIPER_MAX_MM = 100.0;
export const BODY_FAT_PCT_MIN = 0.0;
export const BODY_FAT_PCT_MAX = 60.0;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function cliName(field: string): string {
  return field.replace('_mm', '').split('_').join('-');
}

function fail(field: string, value: unknown, expected: string, fix: string): never {
  throw new ValidationError(`field=${field}, value=${JSON.stringify(value)}, expected=${expected}, fix=${fix}`);
}

function assertIsoDate(date: string): void {
  if (!date || !ISO_DATE_RE.test(date)) fail('date', date, 'YYYY-MM-DD', 'fix: --date 2026-07-25');
}

export type { SourceChoice };

/** #398 · 读侧来源筛选词：三个入库来源 ＋ `all`。
 *
 * `all` **只是读侧筛选词**（不按来源过滤／按来源分组），**不入库**——
 * 写侧仍由 `validateCompositionInput` 的 `SOURCE_CHOICES` 三值守门，
 * 表级 `CHECK (source IN ('home_caliper','hospital','gym'))`（`src/schema.ts:85`）也与本词无关。
 */
export const SOURCE_FILTER_ALL = 'all' as const;
export type SourceFilter = SourceChoice | typeof SOURCE_FILTER_ALL;

/** 读侧来源词判定：给了但不是入库来源也不是 `all` ⇒ 报错（`FetchError`；上层按 `missing-data` 出口）。
 *
 * 原状是**无校验**：任何字面值都原样进 SQL 当来源名，取不到记录就以「无体成分记录」收场（`all` 即此路）。
 * 那种口径把**拼错来源**与**窗口内确实没记录**混成一个答案；本票把它拆开。
 */
export function assertSourceFilter(source: string): void {
  if (source !== SOURCE_FILTER_ALL && !SOURCE_CHOICES.includes(source as SourceChoice)) {
    throw new FetchError(`未知来源: ${source}（合法值: ${SOURCE_CHOICES.join(' / ')} 或 ${SOURCE_FILTER_ALL}）`);
  }
}

export interface CompositionInput {
  date: string; source: string; age?: number | null; sex?: string | null;
  bodyFatPct?: number | null; calculatedAt?: string | null; note?: string;
  [caliper: string]: unknown;
}

export function validateCompositionInput(input: CompositionInput): void {
  assertIsoDate(input.date);
  if (!SOURCE_CHOICES.includes(input.source as SourceChoice)) {
    fail('source', input.source, String(SOURCE_CHOICES), `fix: --source ${SOURCE_CHOICES.join(' --source ')}`);
  }
  const isCaliper = input.source === 'home_caliper';
  for (const f of CALIPER_FIELDS) {
    const v = input[f] as number | null | undefined;
    if (isCaliper && (v === null || v === undefined)) {
      fail(f, v, '(0, 100)mm · 皮褶钳来源 7 个皮褶必填', `fix: --${cliName(f)} 5`);
    }
    if (v !== null && v !== undefined && !(CALIPER_MIN_MM < v && v < CALIPER_MAX_MM)) {
      fail(f, v, `(${CALIPER_MIN_MM}, ${CALIPER_MAX_MM})mm (exclusive)`, `fix: --${cliName(f)} 5`);
    }
  }
  const bf = input.bodyFatPct;
  if (bf === null || bf === undefined) {
    fail('body_fat_pct', bf, `[${BODY_FAT_PCT_MIN}, ${BODY_FAT_PCT_MAX}]`, 'fix: 自动算或 --body-fat-pct 18');
  }
  if (!(BODY_FAT_PCT_MIN < (bf as number) && (bf as number) < BODY_FAT_PCT_MAX)) {
    fail('body_fat_pct', bf, `[${BODY_FAT_PCT_MIN}, ${BODY_FAT_PCT_MAX}] (exclusive)`, 'fix: --body-fat-pct 18');
  }
}

export interface MeasurementInput { date: string; note?: string; [metric: string]: unknown }

export function validateMeasurementInput(input: MeasurementInput): string[] {
  assertIsoDate(input.date);
  const filled: string[] = [];
  for (const f of MEASUREMENT_FIELDS) {
    const v = input[f] as number | null | undefined;
    if (v !== null && v !== undefined) {
      const [lo, hi] = MEASUREMENT_BOUNDS[f];
      if (!(lo <= v && v <= hi)) fail(f, v, `[${lo}, ${hi}]cm`, `fix: --${cliName(f)} 85`);
      filled.push(f);
    }
  }
  if (!filled.length) fail('围度', 'empty', '≥ 1 个(记录级必填)', 'fix: --waist-cm 85 或 --hip-cm 95 至少 1 个');
  return filled;
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// ---- body_measurements ----

export function addMeasurement(db: DatabaseSync, input: MeasurementInput): { id: number; date: string; filled: string[] } {
  const filled = validateMeasurementInput(input);
  const cols = ['date', ...MEASUREMENT_FIELDS, 'note'];
  const vals: SQLInputValue[] = [String(input.date), ...MEASUREMENT_FIELDS.map((f) => (input[f] as number | null | undefined) ?? null), String(input.note ?? '')];
  const info = db.prepare(
    `INSERT INTO body_measurements (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
  ).run(...vals);
  return { id: Number(info.lastInsertRowid), date: input.date, filled };
}

export function listMeasurements(db: DatabaseSync, opts: { dateFrom?: string; dateTo?: string; days?: number; metric?: string; limit?: number } = {}): Record<string, unknown>[] {
  const cols = ['id', 'date', ...MEASUREMENT_FIELDS, 'note'];
  let sql = 'SELECT ' + cols.join(', ') + ' FROM body_measurements WHERE COALESCE(is_deprecated, 0) = 0';
  const params: SQLInputValue[] = [];
  if (opts.metric) {
    if (!MEASUREMENT_FIELDS.includes(opts.metric)) throw new FetchError(`未知围度项: ${opts.metric}`);
    sql += ` AND ${opts.metric} IS NOT NULL`;
  }
  if (opts.dateFrom && opts.dateTo) { sql += ' AND date >= ? AND date <= ?'; params.push(opts.dateFrom, opts.dateTo); }
  else if (opts.days !== undefined) { sql += ' AND date >= ?'; params.push(daysAgo(opts.days)); }
  sql += ' ORDER BY date DESC, id DESC';
  if (opts.limit) { sql += ' LIMIT ?'; params.push(opts.limit); }
  return db.prepare(sql).all(...params) as unknown as Record<string, unknown>[];
}

export function deleteMeasurement(db: DatabaseSync, id: number): { id: number } {
  const info = db.prepare('UPDATE body_measurements SET is_deprecated=1, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(id);
  if (!info.changes) throw new FetchError(`id=${id} 不存在`);
  return { id };
}

export function trendMeasurement(db: DatabaseSync, metric: string, days: number): { date: string; avgVal: number; n: number }[] {
  if (!metric || !MEASUREMENT_FIELDS.includes(metric)) {
    throw new FetchError(`--metric 必填且为: ${MEASUREMENT_FIELDS.join(', ')}`);
  }
  const rows = db.prepare(`SELECT date, AVG(${metric}) AS avg_val, COUNT(*) AS n FROM body_measurements
    WHERE COALESCE(is_deprecated, 0) = 0 AND date >= ? AND ${metric} IS NOT NULL GROUP BY date ORDER BY date ASC`)
    .all(daysAgo(days)) as unknown as { date: string; avg_val: number; n: number }[];
  return rows.map((r) => ({ date: r.date, avgVal: r.avg_val, n: r.n }));
}

/** #360 · 最近有数据部位：窗口内各部位按最新非空 `(date DESC, id DESC)` 取最大者。
 *
 * 平局（同日多部位）按 `MEASUREMENT_FIELDS` 既有次序取首位（确定性；循环不覆盖已选即首位胜）。
 * 与老 `render_body_measurements_view.py:96-118` 的「首个有数据即 active（固定首项）」不同——
 * 老口径不比日期，本票逐部位比最新日期，负向（改回固定首项）必红。
 * 窗口与 `listMeasurements` 同口径：`dateFrom+dateTo` 显式区间优先，否则 `days`；
 * 窗口内全无数据 → `null`（调用方按既有 `missing-data` 抛，空库语义不变）。 */
export function latestMeasurementMetric(
  db: DatabaseSync,
  opts: { days?: number; dateFrom?: string; dateTo?: string } = {},
): string | null {
  let best: { field: string; date: string; id: number } | null = null;
  for (const f of MEASUREMENT_FIELDS) {
    let sql = `SELECT date, id FROM body_measurements WHERE COALESCE(is_deprecated, 0) = 0 AND ${f} IS NOT NULL`;
    const params: SQLInputValue[] = [];
    if (opts.dateFrom && opts.dateTo) { sql += ' AND date >= ? AND date <= ?'; params.push(opts.dateFrom, opts.dateTo); }
    else if (opts.days !== undefined) { sql += ' AND date >= ?'; params.push(daysAgo(opts.days)); }
    sql += ' ORDER BY date DESC, id DESC LIMIT 1';
    const row = db.prepare(sql).get(...params) as { date: string; id: number } | undefined;
    if (!row) continue;
    if (!best || row.date > best.date || (row.date === best.date && row.id > best.id)) {
      best = { field: f, date: row.date, id: row.id };
    }
  }
  return best?.field ?? null;
}

export function compareMeasurements(db: DatabaseSync, date1: string, date2: string): {
  date1: string; date2: string; deltas: Record<string, { before: number; after: number; delta: number }>; nCompared: number;
} {
  const snap = (day: string) => {
    const cols = ['id', ...MEASUREMENT_FIELDS];
    return db.prepare(`SELECT ${cols.join(', ')} FROM body_measurements
      WHERE COALESCE(is_deprecated, 0) = 0 AND date = ? ORDER BY id DESC LIMIT 1`).get(day) as unknown as Record<string, number> | undefined;
  };
  const s1 = snap(date1);
  if (!s1) throw new FetchError(`${date1} 无围度记录`);
  const s2 = snap(date2);
  if (!s2) throw new FetchError(`${date2} 无围度记录`);
  const deltas: Record<string, { before: number; after: number; delta: number }> = {};
  for (const f of MEASUREMENT_FIELDS) {
    const v1 = s1[f], v2 = s2[f];
    if (v1 !== null && v1 !== undefined && v2 !== null && v2 !== undefined) {
      deltas[f] = { before: v1, after: v2, delta: Math.round((v2 - v1) * 100) / 100 };
    }
  }
  return { date1, date2, deltas, nCompared: Object.keys(deltas).length };
}

// ---- body_composition ----

export function addComposition(db: DatabaseSync, input: CompositionInput): { id: number; date: string; bodyFatPct: number } {
  validateCompositionInput(input);
  const info = db.prepare(`INSERT INTO body_composition (date, source, age, sex,
    caliper_chest_mm, caliper_abdominal_mm, caliper_thigh_mm, caliper_tricep_mm,
    caliper_subscapular_mm, caliper_suprailiac_mm, caliper_midaxillary_mm,
    body_fat_pct, calculated_at, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    String(input.date), String(input.source), input.age ?? null, input.sex ?? null,
    ...CALIPER_FIELDS.map((f) => (input[f] as number | null | undefined) ?? null),
    input.bodyFatPct ?? null, input.calculatedAt ?? null, input.note ?? '');
  return { id: Number(info.lastInsertRowid), date: input.date, bodyFatPct: input.bodyFatPct as number };
}

export function listCompositions(db: DatabaseSync, opts: { dateFrom?: string; dateTo?: string; days?: number; source?: string; limit?: number } = {}): Record<string, unknown>[] {
  // #359 · 读侧放行 7 点皮褶：原 5 列不含 CALIPER_FIELDS，看体脂页读不到当初填的 7 个数。
  // 形状照下方 listMeasurements 的既有写法（cols 数组）；只放行列，不动筛选与排序，更不在读侧算任何东西。
  // #398 · `source` 三值照旧按字面过滤；`all`（读侧筛选词）＝**不按来源过滤**，行形状与次序一律不变。
  //        其它字面值 ⇒ 报错（原来的「静默当来源名用、空结果」口径已收）。
  if (opts.source !== undefined) assertSourceFilter(opts.source);
  const cols = ['id', 'date', 'source', 'body_fat_pct', ...CALIPER_FIELDS, 'note']; // M1-ANCHOR
  let sql = 'SELECT ' + cols.join(', ') + ' FROM body_composition WHERE COALESCE(is_deprecated, 0) = 0';
  const params: SQLInputValue[] = [];
  if (opts.source && opts.source !== SOURCE_FILTER_ALL) { sql += ' AND source = ?'; params.push(opts.source); }
  if (opts.dateFrom && opts.dateTo) { sql += ' AND date >= ? AND date <= ?'; params.push(opts.dateFrom, opts.dateTo); }
  else if (opts.days !== undefined) { sql += ' AND date >= ?'; params.push(daysAgo(opts.days)); }
  sql += ' ORDER BY date DESC, id DESC';
  if (opts.limit) { sql += ' LIMIT ?'; params.push(opts.limit); }
  return db.prepare(sql).all(...params) as unknown as Record<string, unknown>[];
}

export function deleteComposition(db: DatabaseSync, id: number): { id: number } {
  const info = db.prepare('UPDATE body_composition SET is_deprecated=1, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(id);
  if (!info.changes) throw new FetchError(`id=${id} 不存在`);
  return { id };
}

export function latestSource(db: DatabaseSync): string | null {
  const row = db.prepare(`SELECT source FROM body_composition
    WHERE COALESCE(is_deprecated, 0) = 0 ORDER BY date DESC, id DESC LIMIT 1`).get() as { source: string } | undefined;
  return row?.source ?? null;
}

/** 单来源趋势：一天一个点（窗口内 `date >= 今天-N 天`，`AVG` 取当天均值）。 */
export function trendComposition(db: DatabaseSync, days: number, source?: string): { date: string; avgPct: number; n: number }[] {
  if (source !== undefined) assertSourceFilter(source);
  const all = source === SOURCE_FILTER_ALL;
  const src = all ? null : (source ?? latestSource(db) ?? 'home_caliper');
  let sql = `SELECT date, AVG(body_fat_pct) AS avg_pct, COUNT(*) AS n FROM body_composition
    WHERE COALESCE(is_deprecated, 0) = 0 AND date >= ?`;
  const params: SQLInputValue[] = [daysAgo(days)];
  // #398 · `all` ⇒ 不加 `AND source = ?`（不按来源过滤）；具体来源与缺省（`latestSource`）照旧恒带该过滤。
  if (src !== null) { sql += ' AND source = ?'; params.push(src); }
  sql += ' GROUP BY date ORDER BY date ASC';
  const rows = db.prepare(sql).all(...params) as unknown as { date: string; avg_pct: number; n: number }[];
  return rows.map((r) => ({ date: r.date, avgPct: r.avg_pct, n: r.n }));
}

/** #398 · 按来源分组的趋势：每个来源一条序列，来源内**一天一个点**，来源之间**不合并**。
 *
 * 口径不同的设备（家测皮褶钳／健身房 InBody／医院测）混成一条线会得出假趋势
 * （基准 `docs/skills/skill-calorie/t395-融合基准.md` §四 裁定 5 的原文理由），故分组在数据层做：
 * 页面拿到的是**已经分好的序列**，不允许再自行把来源混回去。
 *
 * 序列次序＝「该来源最近一条的日期」由近到远（并列按来源名升序）——与记录列表 `date DESC, id DESC` 同向，
 * 使组序在任何日期种子下都由数据决定，不含字典序偶然。
 */
export interface SourceSeries {
  source: string;
  points: { date: string; avgPct: number; n: number }[];
  latestDate: string;
}

export function trendCompositionBySource(db: DatabaseSync, days: number): SourceSeries[] {
  const rows = db.prepare(`SELECT source, date, AVG(body_fat_pct) AS avg_pct, COUNT(*) AS n FROM body_composition
    WHERE COALESCE(is_deprecated, 0) = 0 AND date >= ?
    GROUP BY source, date ORDER BY date ASC`).all(daysAgo(days)) as unknown as // M2-ANCHOR
    { source: string; date: string; avg_pct: number; n: number }[];
  const bySource = new Map<string, { date: string; avgPct: number; n: number }[]>();
  for (const r of rows) {
    const list = bySource.get(r.source) ?? [];
    list.push({ date: r.date, avgPct: r.avg_pct, n: r.n });
    bySource.set(r.source, list);
  }
  return [...bySource.entries()]
    .map(([source, points]) => ({ source, points, latestDate: points[points.length - 1]?.date ?? '' }))
    .sort((a, b) => (a.latestDate === b.latestDate
      ? a.source.localeCompare(b.source)
      : (a.latestDate < b.latestDate ? 1 : -1)));
}

/** #398 · 窗口内**按来源分组的组数**：本函数的读数与
 *  `SELECT COUNT(DISTINCT source) FROM body_composition WHERE COALESCE(is_deprecated, 0) = 0`
 *  （同窗口）**恒等**——它就是同一句聚合，只是把窗口参数与「跳过废弃」写成与列表同一套写法。
 *  给「按来源分组取数」一条可独立取的读数（页面文本不参与判据）。
 */
export function compositionSourceCount(
  db: DatabaseSync,
  opts: { days?: number; dateFrom?: string; dateTo?: string } = {},
): number {
  let sql = `SELECT COUNT(DISTINCT source) AS n FROM body_composition WHERE COALESCE(is_deprecated, 0) = 0`;
  const params: SQLInputValue[] = [];
  if (opts.dateFrom && opts.dateTo) { sql += ' AND date >= ? AND date <= ?'; params.push(opts.dateFrom, opts.dateTo); }
  else if (opts.days !== undefined) { sql += ' AND date >= ?'; params.push(daysAgo(opts.days)); }
  const row = db.prepare(sql).get(...params) as { n: number };
  return row.n;
}

export function compareCompositions(db: DatabaseSync, fromDate: string, toDate: string, source?: string): Record<string, unknown> {
  const src = source ?? latestSource(db) ?? 'home_caliper';
  const agg = (day: string, cmp: string) => db.prepare(`SELECT AVG(body_fat_pct) AS avg_pct,
    MIN(body_fat_pct) AS min_pct, COUNT(*) AS n FROM body_composition
    WHERE COALESCE(is_deprecated, 0) = 0 AND source = ? AND date ${cmp} ?`).get(src, day) as
    { avg_pct: number | null; min_pct: number | null; n: number };
  const before = agg(fromDate, '<');
  const after = agg(toDate, '>=');
  const delta = before.avg_pct !== null && after.avg_pct !== null
    ? Math.round((after.avg_pct - before.avg_pct) * 100) / 100 : null;
  return { source: src, before, after, delta };
}

/** #355 · 体脂显式区间均值（对比体脂两段各调一次，与 `compareCompositions` 同一表同一口径）。
 *
 * 只做一件事：闭区间 `[start, end]` 内 `AVG/MIN/COUNT`；`source` 给了即按源滤，
 * 不给即全源（对比页调用方显式传源或缺省全源，不沿用 `latestSource` 暗口径）。
 */
export function avgCompositionInRange(
  db: DatabaseSync,
  start: string,
  end: string,
  source?: string,
): { avg_pct: number | null; min_pct: number | null; n: number } {
  const base = `SELECT AVG(body_fat_pct) AS avg_pct,
    MIN(body_fat_pct) AS min_pct, COUNT(*) AS n FROM body_composition
    WHERE COALESCE(is_deprecated, 0) = 0 AND date >= ? AND date <= ?`;
  if (source === undefined) {
    return db.prepare(base).get(start, end) as { avg_pct: number | null; min_pct: number | null; n: number };
  }
  return db.prepare(base + ' AND source = ?').get(start, end, source) as
    { avg_pct: number | null; min_pct: number | null; n: number };
}
