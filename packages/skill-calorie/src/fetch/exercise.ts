/** T3 #22 · 运动取数（对照老家 scripts/exercise.py + exercise_tracker.py）。
 *
 * 删除为软删除（is_deleted=1，老家 ticket #5 语义）；列表默认排除已软删除。
 * 失败抛 FetchError；MET 关键词表与公式逐字对照老家（含 '中' 原样口径）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { sql } from './db.js';
import type { SQLInputValue } from './db.js';
import { FetchError } from './errors.js';

function todayStr(): string { return new Date().toISOString().slice(0, 10); }
function nowTime(): string { return new Date().toTimeString().slice(0, 8); }
function nowStamp(): string {
  const d = new Date();
  return `${d.toISOString().slice(0, 10)} ${d.toTimeString().slice(0, 8)}`;
}

/** MET 关键词表（顺序敏感，对照 _lookup_met 先后）。 */
const MET_RULES: { keys: string[]; met: number }[] = [
  { keys: ['哑铃', '杠铃', '史密斯', '弯举', '推举', '推肩', '平举', '深蹲', '卧推', '划船', '硬拉', '飞鸟'], met: 5.0 },
  { keys: ['俯卧撑', '引体', '自重', '平板'], met: 3.8 },
  { keys: ['跑步机'], met: 7.5 },
  { keys: ['户外跑', '路跑'], met: 8.0 },
  { keys: ['慢跑', '快跑', '冲刺'], met: 9.0 },
  { keys: ['骑行', '自行车', '小黄车', '骑车'], met: 6.0 },
  { keys: ['跳绳'], met: 12.0 },
  { keys: ['椭圆机'], met: 5.5 },
  { keys: ['游泳'], met: 7.0 },
  { keys: ['hiit'], met: 8.5 },
  { keys: ['八段锦', '太极', '瑜伽', '拉伸', '冥想'], met: 2.5 },
  { keys: ['家务', '做饭', '洗衣', '打扫', '清洁'], met: 2.5 },
  { keys: ['走路', '散步'], met: 3.0 },
  { keys: ['通勤'], met: 2.5 },
  { keys: ['爬楼', '楼梯'], met: 4.0 },
];

export function lookupMet(exerciseType: string | null | undefined): number {
  if (!exerciseType) return 3.0;
  const et = exerciseType.toLowerCase();
  for (const rule of MET_RULES) {
    if (rule.keys.some((k) => et.includes(k.toLowerCase()))) return rule.met;
  }
  // 兜底“跑步”类（排除跑步机，已在上表先行命中）。
  if (et.includes('跑')) return 8.0;
  return 3.0;
}

const STRENGTH_KEYS = ['哑铃', '杠铃', '史密斯', '弯举', '推举', '推肩', '平举', '前平举', '侧平举', '深蹲', '卧推', '划船', '硬拉', '飞鸟', '俯卧撑', '引体', '自重', '平板'];
const FLEX_KEYS = ['八段锦', '太极', '瑜伽', '拉伸', '冥想'];
const DAILY_KEYS = ['家务', '做饭', '洗衣', '打扫', '清洁', '通勤', '走路', '散步', '爬楼'];

export function inferCategory(exerciseType: string | null | undefined): string {
  if (!exerciseType) return '有氧';
  if (STRENGTH_KEYS.some((k) => exerciseType.includes(k))) return '力量';
  if (FLEX_KEYS.some((k) => exerciseType.includes(k))) return '柔韧';
  if (DAILY_KEYS.some((k) => exerciseType.includes(k))) return '日常';
  return '有氧';
}

export function estimateCaloriesMet(exerciseType: string, bodyWeight: number, durationMinutes?: number, sets = 0): [number, number] {
  const met = lookupMet(exerciseType);
  const category = inferCategory(exerciseType);
  if (category === '有氧' || category === '柔韧' || category === '日常') {
    if (!durationMinutes || durationMinutes <= 0) return [0.0, met];
    return [Math.round(met * bodyWeight * (durationMinutes / 60) * 10) / 10, met];
  }
  if (category === '力量') {
    const s = sets <= 0 ? 1 : sets;
    return [Math.round(met * bodyWeight * s * 0.05 * 10) / 10, met];
  }
  return [0.0, met];
}

export function estimateDifficultyMet(met: number | null | undefined): string | null {
  if (met === null || met === undefined || met <= 0) return null;
  if (met < 3) return 'easy';
  if (met < 6) return 'normal';
  return 'hard';
}

const HARD_WORDS = ['累死', '力竭', '极限', '干不动', '暴毙', '撑不住', '想死', '不行', '很累', '挺累', '暴汗', '喘', '气喘吁吁', '出汗多', '冲', '狠', 'hard', 'hiit'];
const EASY_WORDS = ['轻松', '没什么', '没感觉', '微微', '散步', 'easy', '很轻'];
const MID_WORDS = ['一般', '还行', '中等', '普通', '正常', '适中', '中等强度'];

/** 口语难度映射（老家原样口径：中等档返回 '中'，非 'normal'）。 */
export function parseUserDifficulty(userText: string | null | undefined): string | null {
  if (!userText) return null;
  const t = userText.toLowerCase();
  if (HARD_WORDS.some((k) => t.includes(k.toLowerCase()))) return 'hard';
  if (EASY_WORDS.some((k) => t.includes(k.toLowerCase()))) return 'easy';
  if (MID_WORDS.some((k) => t.includes(k))) return '中';
  return null;
}

export function combinedCalories(userReported: number | null | undefined, estimated: number, warnAt = 0.5): [number | null, string | null, number] {
  if (userReported === null || userReported === undefined) return [Math.round(estimated * 10) / 10, null, 0.0];
  if (estimated <= 0) return [Number(userReported), null, 0.0];
  const deviation = Math.abs(Number(userReported) - estimated) / estimated;
  const suffix = `你报 ${userReported}/AI ${Math.round(estimated * 10) / 10}/偏差 ${Math.trunc(deviation * 100)}%`;
  if (deviation < 0.2) return [Math.round(estimated * 10) / 10, suffix, deviation];
  if (deviation < warnAt) return [Math.round((Number(userReported) + estimated) / 2 * 10) / 10, `${suffix}/取中位`, deviation];
  return [null, `${suffix}/需确认`, deviation];
}

export function estimateCaloriesFromTraining(totalVolumeKg: number): number {
  if (totalVolumeKg <= 0) return 0.0;
  return Math.round(totalVolumeKg * 0.08 * 10) / 10;
}

export function convertLoadKg(weightStr: unknown, unitStr: unknown): number {
  const w = parseFloat(String(weightStr));
  if (!Number.isFinite(w)) return 0.0;
  if (unitStr && String(unitStr).toLowerCase() === 'lbs') return Math.round(w * 0.45359237 * 10) / 10;
  return Math.round(w * 10) / 10;
}

export type WindowName = 'today' | 'yesterday' | 'week' | 'last-week' | 'month' | 'last-month';

export function resolveWindow(opts: { window?: string; days?: number; fromDate?: string; toDate?: string; now?: Date } = {}): [string, string] {
  const now = opts.now ?? new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const { window, days, fromDate, toDate } = opts;
  if (window === 'today') return [iso(today), iso(today)];
  if (window === 'yesterday') { const d = addDays(today, -1); return [iso(d), iso(d)]; }
  if (window === 'week') {
    // 老家 weekday() 周一=0；JS getDay() 周日=0 → 换算。(JS+6)%7 即周一偏移。
    const start = addDays(today, -((today.getDay() + 6) % 7));
    return [iso(start), iso(today)];
  }
  if (window === 'last-week') {
    const thisStart = addDays(today, -((today.getDay() + 6) % 7));
    const end = addDays(thisStart, -1);
    return [iso(addDays(end, -6)), iso(end)];
  }
  if (window === 'month') return [iso(new Date(today.getFullYear(), today.getMonth(), 1)), iso(today)];
  if (window === 'last-month') {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = addDays(first, -1);
    return [iso(new Date(end.getFullYear(), end.getMonth(), 1)), iso(end)];
  }
  if (days) return [iso(addDays(today, -(days - 1))), iso(today)];
  if (fromDate) return [fromDate, toDate ?? iso(today)];
  return [iso(today), iso(today)];
}

export function parseTimeStr(timeStr?: string): string {
  if (!timeStr) return nowTime();
  if (/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) return timeStr;
  const m2 = /^(\d{2}):(\d{2})$/.exec(timeStr);
  if (m2) return `${m2[1]}:${m2[2]}:00`;
  return nowTime();
}

export interface ExerciseRecordInput {
  date: string; exerciseType: string; caloriesBurned: number;
  minutes?: number | null; timeStr?: string; note?: string;
  reps?: number | null; category?: string | null; difficulty?: string | null;
  distance?: number | null; heartRate?: number | null; maxHeartRate?: number | null;
  steps?: number | null; setIndex?: number | null; loadKg?: number | null;
  isBackfill?: boolean;
}

export type ExerciseRow = Record<string, unknown>;

const LIVE_COLS = 'date, time, exercise_type, duration_minutes, calories_burned, note, reps, category, difficulty, distance_km, avg_heart_rate, set_index, load_kg, steps, max_heart_rate, is_backfill';

export function addRecord(db: DatabaseSync, input: ExerciseRecordInput): { id: number; record: ExerciseRow } {
  const time = parseTimeStr(input.timeStr);
  const info = db.prepare(`INSERT INTO exercise_log (${LIVE_COLS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    input.date, time, input.exerciseType, input.minutes ?? null, input.caloriesBurned,
    input.note ?? '', input.reps ?? null, input.category ?? null, input.difficulty ?? null,
    input.distance ?? null, input.heartRate ?? null, input.setIndex ?? null, input.loadKg ?? null,
    input.steps ?? null, input.maxHeartRate ?? null, input.isBackfill ? 1 : 0);
  const id = Number(info.lastInsertRowid);
  return {
    id,
    record: {
      id, date: input.date, time, exercise_type: input.exerciseType, duration_minutes: input.minutes ?? null,
      calories_burned: input.caloriesBurned, note: input.note ?? '', reps: input.reps ?? null,
      category: input.category ?? null, difficulty: input.difficulty ?? null, distance_km: input.distance ?? null,
      avg_heart_rate: input.heartRate ?? null, max_heart_rate: input.maxHeartRate ?? null,
      steps: input.steps ?? null, set_index: input.setIndex ?? null, load_kg: input.loadKg ?? null,
      is_backfill: input.isBackfill ? 1 : 0,
    },
  };
}

const KNOWN_EX_COLS = new Set([
  'date', 'time', 'exercise_type', 'duration_minutes', 'calories_burned', 'note',
  'reps', 'category', 'difficulty', 'distance_km', 'avg_heart_rate', 'max_heart_rate',
  'steps', 'set_index', 'load_kg', 'is_backfill', 'is_deleted', 'xunji_localid', 'xunji_title',
]);

export function updateRecord(db: DatabaseSync, recordId: number, fields: Record<string, unknown>): { old: ExerciseRow; new: ExerciseRow } {
  const id = Number(recordId);
  if (!Number.isInteger(id)) throw new FetchError('记录 ID 必须是数字');
  const old = db.prepare('SELECT * FROM exercise_log WHERE id = ?').get(id) as ExerciseRow | undefined;
  if (!old) throw new FetchError(`记录 ID ${id} 不存在`);
  const sets: string[] = [];
  const vals: SQLInputValue[] = [];
  for (const [col, val] of Object.entries(fields)) {
    if (!KNOWN_EX_COLS.has(col)) throw new FetchError(`未知字段: ${col}`);
    sets.push(`${col} = ?`);
    vals.push(sql(val));
  }
  if (sets.length) {
    db.prepare(`UPDATE exercise_log SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`)
      .run(...vals, nowStamp(), id);
  }
  const row = db.prepare('SELECT * FROM exercise_log WHERE id = ?').get(id) as ExerciseRow;
  return { old, new: row };
}

function softDeleteWhere(db: DatabaseSync, where: string, params: SQLInputValue[]): number {
  const info = db.prepare(
    `UPDATE exercise_log SET is_deleted = 1, updated_at = ? WHERE ${where} AND COALESCE(is_deleted, 0) = 0`,
  ).run(nowStamp(), ...params);
  return Number(info.changes);
}

export function deleteRecord(db: DatabaseSync, recordId: number): ExerciseRow {
  const id = Number(recordId);
  if (!Number.isInteger(id)) throw new FetchError('记录 ID 必须是数字');
  const row = db.prepare('SELECT * FROM exercise_log WHERE id = ?').get(id) as ExerciseRow | undefined;
  if (!row) throw new FetchError(`记录 ID ${id} 不存在`);
  db.prepare('UPDATE exercise_log SET is_deleted = 1, updated_at = ? WHERE id = ?').run(nowStamp(), id);
  return row;
}

export function deleteDay(db: DatabaseSync, date: string): number {
  return softDeleteWhere(db, 'date = ?', [date]);
}

export function deleteRange(db: DatabaseSync, fromDate: string, toDate: string): number {
  return softDeleteWhere(db, 'date BETWEEN ? AND ?', [fromDate, toDate]);
}

export function updateDay(db: DatabaseSync, date: string, fields: Record<string, unknown>): { matched: number; pairs: { old: ExerciseRow; new: ExerciseRow }[] } {
  const ids = (db.prepare('SELECT id FROM exercise_log WHERE date = ? AND COALESCE(is_deleted, 0) = 0').all(date) as { id: number }[])
    .map((r) => r.id);
  const pairs = ids.map((id) => updateRecord(db, id, fields));
  return { matched: ids.length, pairs };
}

export function copyYesterday(db: DatabaseSync, targetDate?: string): { copied: number; skipped: number; rows: ExerciseRow[] } {
  const target = targetDate ?? todayStr();
  const y = new Date(target + 'T00:00:00');
  y.setDate(y.getDate() - 1);
  const src = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
  const rows = db.prepare('SELECT * FROM exercise_log WHERE date = ? AND COALESCE(is_deleted, 0) = 0').all(src) as ExerciseRow[];
  let copied = 0, skipped = 0;
  const out: ExerciseRow[] = [];
  for (const r of rows) {
    const hit = db.prepare(
      'SELECT id FROM exercise_log WHERE date = ? AND exercise_type = ? AND calories_burned = ? AND duration_minutes = ? AND COALESCE(is_deleted, 0) = 0 LIMIT 1',
    ).get(target, sql(r.exercise_type), sql(r.calories_burned), sql(r.duration_minutes));
    if (hit) { skipped++; continue; }
    const { id } = addRecord(db, {
      date: target, exerciseType: String(r.exercise_type), caloriesBurned: Number(r.calories_burned),
      minutes: r.duration_minutes as number | null, timeStr: r.time as string, note: String(r.note ?? ''),
      reps: r.reps as number | null, category: r.category as string | null, difficulty: r.difficulty as string | null,
      distance: r.distance_km as number | null, heartRate: r.avg_heart_rate as number | null,
      maxHeartRate: r.max_heart_rate as number | null, steps: r.steps as number | null,
      setIndex: r.set_index as number | null, loadKg: r.load_kg as number | null,
    });
    copied++;
    out.push(db.prepare('SELECT * FROM exercise_log WHERE id = ?').get(id) as ExerciseRow);
  }
  return { copied, skipped, rows: out };
}

export function batchAdd(db: DatabaseSync, items: ExerciseRecordInput[]): { added: number; ids: number[] } {
  const ids: number[] = [];
  for (const it of items) ids.push(addRecord(db, it).id);
  return { added: ids.length, ids };
}

export function listWindow(db: DatabaseSync, start: string, end: string): ExerciseRow[] {
  return db.prepare(
    'SELECT * FROM exercise_log WHERE date BETWEEN ? AND ? AND COALESCE(is_deleted, 0) = 0 ORDER BY date, time',
  ).all(start, end) as ExerciseRow[];
}
