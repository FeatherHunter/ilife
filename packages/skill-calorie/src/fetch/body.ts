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
  let sql = 'SELECT id, date, source, body_fat_pct, note FROM body_composition WHERE COALESCE(is_deprecated, 0) = 0';
  const params: SQLInputValue[] = [];
  if (opts.source) { sql += ' AND source = ?'; params.push(opts.source); }
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

export function trendComposition(db: DatabaseSync, days: number, source?: string): { date: string; avgPct: number; n: number }[] {
  const src = source ?? latestSource(db) ?? 'home_caliper';
  const rows = db.prepare(`SELECT date, AVG(body_fat_pct) AS avg_pct, COUNT(*) AS n FROM body_composition
    WHERE COALESCE(is_deprecated, 0) = 0 AND date >= ? AND source = ? GROUP BY date ORDER BY date ASC`)
    .all(daysAgo(days), src) as unknown as { date: string; avg_pct: number; n: number }[];
  return rows.map((r) => ({ date: r.date, avgPct: r.avg_pct, n: r.n }));
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
