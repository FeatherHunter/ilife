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

/** #440 · 13 部位的**唯一来源**：一处给全「列名 ＋ 中文名」，其次序即列序。
 *  展示层（`body/bodyDocs.ts`／`body/compare.ts`／`body/wizardPlate.ts`／`analysis/cross.ts`）
 *  与写侧参数映射（`body/log.ts`）一律引用本表，不得再自持第二份中文名或第二份键表。
 *  用词：肩部一向是**软尺环绕量**（库内现值 110cm），中文名按此取词（#440 裁定）。 */
const MEASURE_DEFS: [string, string][] = [
  ['chest_cm', '胸围'], ['waist_cm', '腰围'], ['abdomen_cm', '腹围'], ['hip_cm', '臀围'],
  ['left_thigh_cm', '左大腿'], ['right_thigh_cm', '右大腿'], ['left_calf_cm', '左小腿'], ['right_calf_cm', '右小腿'],
  ['left_arm_cm', '左上臂'], ['right_arm_cm', '右上臂'], ['left_forearm_cm', '左前臂'], ['right_forearm_cm', '右前臂'],
  ['shoulder_cm', '肩围'],
];

/** 列序权威（键序＝`MEASURE_DEFS` 次序；SQL 列序、全量表列序都认它）。 */
export const MEASUREMENT_FIELDS: string[] = MEASURE_DEFS.map(([field]) => field);

/** 部位中文名（#440 起的唯一来源；键＝`MEASUREMENT_FIELDS` 列名）。 */
export const MEASUREMENT_ZH: Record<string, string> = Object.fromEntries(MEASURE_DEFS);

/** 库列名 ↔ CLI camel 参数名换算（`left_forearm_cm` → `leftForearmCm`）：调用方据此引用上面两张表。 */
export function measureCamelName(field: string): string {
  return field.split('_').map((s, i) => (i === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1))).join('');
}

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

/** #364 · 删前快照的取数列（围度）：**逐字段**，列序＝列表口径（`listMeasurements`）。 */
const MEASURE_SNAPSHOT_COLS: string[] = ['id', 'date', ...MEASUREMENT_FIELDS, 'note'];

/** #364 · 删前快照取数口（围度）：按主键读出**全部列**的原始值（缺项 `null`／备注 `''`，本层不代字 `—`）。
 *
 *  **不加 `is_deprecated` 过滤**：本表删除是软删（只置废，行与字段值一字不动），
 *  「删前读」与「删后读」自然是同一份值；`null` ＝ 库里没有这条 id。
 *  #365 的整页回执按本函数的逐字段值铺删前对照行（中文名由命令层按唯一来源贴）。
 */
export function measurementSnapshot(db: DatabaseSync, id: number): Record<string, unknown> | null {
  const row = db.prepare(`SELECT ${MEASURE_SNAPSHOT_COLS.join(', ')} FROM body_measurements WHERE id = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ?? null;
}

export function deleteMeasurement(db: DatabaseSync, id: number): { id: number; snapshot: Record<string, unknown> } {
  // #364 · **删前**先取快照（必须排在置废那一句之前）。下面 `changes` 仍是不存在即抛的原判据，取数面不动它。
  const snapshot = measurementSnapshot(db, id);
  const info = db.prepare('UPDATE body_measurements SET is_deprecated=1, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(id);
  if (!info.changes || snapshot === null) throw new FetchError(`id=${id} 不存在`);
  return { id, snapshot };
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

// ---- #363 · 补记查冲突：同一天既有记录 ----

/** #363 · 同日既有记录的**唯一取数口**：`date = ?` 且未废弃，按 `id ASC`（同日多条全给，不取首条）。
 *  返回值是**原始列值**（缺项 `null`／备注 `''`）——可见文本的 `—` 由命令层写，取数层不代字。
 */
function sameDay(db: DatabaseSync, table: string, cols: string[], date: string): Record<string, unknown>[] {
  return db.prepare(`SELECT ${['id', 'date', ...cols].join(', ')} FROM ${table}
    WHERE COALESCE(is_deprecated, 0) = 0 AND date = ? ORDER BY id ASC`).all(date) as unknown as Record<string, unknown>[];
}

/** 同一天已有的体成分记录（列序同 `listCompositions`）。 */
export function compositionsOnDate(db: DatabaseSync, date: string): Record<string, unknown>[] {
  return sameDay(db, 'body_composition', ['source', 'body_fat_pct', ...CALIPER_FIELDS, 'note'], date);
}

/** 同一天已有的围度记录（列序同 `listMeasurements`）。 */
export function measurementsOnDate(db: DatabaseSync, date: string): Record<string, unknown>[] {
  return sameDay(db, 'body_measurements', [...MEASUREMENT_FIELDS, 'note'], date);
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

/** #362 · 体成分读侧的**窗口**：本票起「不传 ＝ 全部历史」，不再兜 90 天。
 *
 * `{days}`＝近 N 天（`date >= 今天-N`，含界）；`{dateFrom, dateTo}`＝闭区间（**两个都**给才生效，
 * 只给一个由调用方拦成用法错）；`{}`／`undefined`＝**全部历史**（不加任何日期谓词）。
 * 第二参数位另收 `number`（＝`{days}`）：#398 与既有三处调用（`t398-*`／`fetch.test.mjs`／
 * `deprecated-126.test.mjs`）照旧原样通过，行为逐字不变。
 */
export type CompositionWindowInput = number | { days?: number; dateFrom?: string; dateTo?: string } | undefined;

/** 窗口 → 日期谓词：列表、两条趋势、组数四条取数**共用这一条口径**（区间优先于天数，与既有次序同）。 */
function windowClause(win: CompositionWindowInput): { sql: string; params: SQLInputValue[] } {
  const w = typeof win === 'number' ? { days: win } : win;
  if (w?.dateFrom && w?.dateTo) return { sql: ' AND date >= ? AND date <= ?', params: [w.dateFrom, w.dateTo] };
  if (w?.days !== undefined) return { sql: ' AND date >= ?', params: [daysAgo(w.days)] };
  return { sql: '', params: [] };  // 全部历史：一条日期谓词都不加（本票正题：不许静默按 90 天截断）
}

export function listCompositions(db: DatabaseSync, opts: { dateFrom?: string; dateTo?: string; days?: number; source?: string; limit?: number } = {}): Record<string, unknown>[] {
  // #359 · 读侧放行 7 点皮褶：原 5 列不含 CALIPER_FIELDS，看体脂页读不到当初填的 7 个数。
  // 形状照下方 listMeasurements 的既有写法（cols 数组）；只放行列，不动筛选与排序，更不在读侧算任何东西。
  // #398 · `source` 三值照旧按字面过滤；`all`（读侧筛选词）＝**不按来源过滤**，行形状与次序一律不变。
  //        其它字面值 ⇒ 报错（原来的「静默当来源名用、空结果」口径已收）。
  // #362 · 日期窗口改走 `windowClause`（同一条口径的四条取数之一）；三样都不给＝全部历史，`limit` 仍可截行。
  if (opts.source !== undefined) assertSourceFilter(opts.source);
  const cols = ['id', 'date', 'source', 'body_fat_pct', ...CALIPER_FIELDS, 'note']; // M1-ANCHOR
  let sql = 'SELECT ' + cols.join(', ') + ' FROM body_composition WHERE COALESCE(is_deprecated, 0) = 0';
  const params: SQLInputValue[] = [];
  if (opts.source && opts.source !== SOURCE_FILTER_ALL) { sql += ' AND source = ?'; params.push(opts.source); }
  const win = windowClause(opts);
  sql += win.sql;
  params.push(...win.params);
  sql += ' ORDER BY date DESC, id DESC';
  if (opts.limit) { sql += ' LIMIT ?'; params.push(opts.limit); }
  return db.prepare(sql).all(...params) as unknown as Record<string, unknown>[];
}

/** #364 · 删前快照的取数列（体成分）：**逐字段**，列序＝列表口径（`listCompositions`，不含 7 点以外的运算列）。 */
const COMPOSITION_SNAPSHOT_COLS: string[] = ['id', 'date', 'source', 'body_fat_pct', ...CALIPER_FIELDS, 'note'];

/** #364 · 删前快照取数口（体成分）：口径与 `measurementSnapshot` 逐条相同（软删不删内容，删后仍可回读）。 */
export function compositionSnapshot(db: DatabaseSync, id: number): Record<string, unknown> | null {
  const row = db.prepare(`SELECT ${COMPOSITION_SNAPSHOT_COLS.join(', ')} FROM body_composition WHERE id = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ?? null;
}

export function deleteComposition(db: DatabaseSync, id: number): { id: number; snapshot: Record<string, unknown> } {
  // #364 · **删前**先取快照（必须排在置废那一句之前）；不存在即抛仍看 `changes`（原判据不动）。
  const snapshot = compositionSnapshot(db, id);
  const info = db.prepare('UPDATE body_composition SET is_deprecated=1, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(id);
  if (!info.changes || snapshot === null) throw new FetchError(`id=${id} 不存在`);
  return { id, snapshot };
}

export function latestSource(db: DatabaseSync): string | null {
  const row = db.prepare(`SELECT source FROM body_composition
    WHERE COALESCE(is_deprecated, 0) = 0 ORDER BY date DESC, id DESC LIMIT 1`).get() as { source: string } | undefined;
  return row?.source ?? null;
}

/** 单来源趋势：一天一个点（`AVG` 取当天均值）。
 *
 * #362 · 窗口位放开为 `CompositionWindowInput`（天数／闭区间／**不传＝全部历史**）：页面「看体脂」的 KPI 与图
 * 必须与列表同批定，趋势不能再恒按 90 天取。窗口位原样收 `number`（＝`{days}`），旧调用不变。
 */
export function trendComposition(db: DatabaseSync, win: CompositionWindowInput, source?: string): { date: string; avgPct: number; n: number }[] {
  if (source !== undefined) assertSourceFilter(source);
  const all = source === SOURCE_FILTER_ALL;
  const src = all ? null : (source ?? latestSource(db) ?? 'home_caliper');
  const clause = windowClause(win);
  let sql = `SELECT date, AVG(body_fat_pct) AS avg_pct, COUNT(*) AS n FROM body_composition
    WHERE COALESCE(is_deprecated, 0) = 0` + clause.sql;
  const params: SQLInputValue[] = [...clause.params];
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

export function trendCompositionBySource(db: DatabaseSync, win: CompositionWindowInput): SourceSeries[] {
  const clause = windowClause(win); // #362 · 与列表同一条窗口口径（不传＝全部历史）
  const rows = db.prepare(`SELECT source, date, AVG(body_fat_pct) AS avg_pct, COUNT(*) AS n FROM body_composition
    WHERE COALESCE(is_deprecated, 0) = 0` + clause.sql + `
    GROUP BY source, date ORDER BY date ASC`).all(...clause.params) as unknown as // M2-ANCHOR
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
 *  #362 · 窗口谓词改走 `windowClause`（同一条口径）；`{}`＝全部历史，读数与不带窗口的同一句 SQL 恒等。
 */
export function compositionSourceCount(
  db: DatabaseSync,
  opts: { days?: number; dateFrom?: string; dateTo?: string } = {},
): number {
  const clause = windowClause(opts);
  const sql = `SELECT COUNT(DISTINCT source) AS n FROM body_composition WHERE COALESCE(is_deprecated, 0) = 0` + clause.sql;
  const row = db.prepare(sql).get(...clause.params) as { n: number };
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
