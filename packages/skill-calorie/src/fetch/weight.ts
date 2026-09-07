/** T3 #22 · 体重取数（对照老家 scripts/weight.py）。
 *
 * 身高单一来源 user_profile（老家 2026-07-20 改）；C5 #43 去身高强前置：缺身高仍记，BMI 记 null（延后算），回执给补档案链。
 * 删除为硬删除（老家语义）；失败抛 FetchError。
 */
import type { DatabaseSync } from 'node:sqlite';
import type { SQLInputValue } from './db.js';
import { FetchError } from './errors.js';

export const NOTE_TAGS = ['晨起空腹', '运动后', '睡前', '餐前', '餐后', '晨起', '空腹', '早起', '运动前', '生理期'];

export function noteTag(note: string | null | undefined): string | null {
  if (!note) return null;
  for (const tag of NOTE_TAGS) if (note.includes(tag)) return tag;
  return '其他';
}

function todayStr(): string { return new Date().toISOString().slice(0, 10); }
function nowStr(): string { return new Date().toTimeString().slice(0, 8); }

export interface WeightRow {
  id: number; date: string; time: string | null; weight_kg: number;
  bmi: number | null; note: string | null;
}

function profileHeightCm(db: DatabaseSync): number | null {
  const row = db.prepare('SELECT height_cm FROM user_profile WHERE id = 1').get() as
    | { height_cm: number | null } | undefined;
  const h = row?.height_cm;
  // C5 #43 · 缺身高不抛：回 null，调用方记 BMI null（延后算）。
  if (h === undefined || h === null || h <= 0) return null;
  return h;
}

function bmiOf(kg: number, heightCm: number): number {
  return Math.round((kg / (heightCm / 100) ** 2) * 10) / 10;
}

export interface LogWeightResult {
  id: number; date: string; time: string; kg: number; bmi: number | null; note: string; rowsAffected: number;
}

export function logWeight(db: DatabaseSync, weightKg: number, note = '', targetDate?: string, targetTime?: string): LogWeightResult {
  const kg = Number(weightKg);
  if (!Number.isFinite(kg)) throw new FetchError('体重必须是数字');
  if (kg <= 0) throw new FetchError('体重必须为正数');
  const heightCm = profileHeightCm(db);
  const date = targetDate ?? todayStr();
  const time = targetTime ?? nowStr();
  const bmi = heightCm === null ? null : bmiOf(kg, heightCm);
  const info = db.prepare(
    'INSERT INTO weight_log (date, time, weight_kg, height_cm, bmi, note) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(date, time, kg, heightCm, bmi, note);
  return { id: Number(info.lastInsertRowid), date, time, kg, bmi, note, rowsAffected: 1 };
}

export interface UpdateWeightResult {
  id: number; date: string; time: string | null;
  oldWeight: number; newWeight: number; bmi: number | null; note: string | null; rowsAffected: number;
}

export function updateWeight(db: DatabaseSync, weightId: number, weightKg?: number, note?: string): UpdateWeightResult {
  const id = Number(weightId);
  if (!Number.isInteger(id)) throw new FetchError('体重记录 ID 必须是数字');
  if (weightKg === undefined && note === undefined) throw new FetchError('至少需要传入 weight 与 note 中的一个');
  const heightCm = profileHeightCm(db);
  const row = db.prepare('SELECT id, weight_kg, date, time FROM weight_log WHERE id = ?').get(id) as
    | { id: number; weight_kg: number; date: string; time: string | null } | undefined;
  if (!row) throw new FetchError(`体重记录 ID ${id} 不存在`);
  const newWeight = weightKg === undefined ? row.weight_kg : Number(weightKg);
  if (!Number.isFinite(newWeight)) throw new FetchError('体重必须是数字');
  const bmi = heightCm === null ? null : bmiOf(newWeight, heightCm);
  // 老家语义：height_cm 列保留不动，只改 weight_kg/bmi（+note）。
  const sets = ['weight_kg = ?', 'bmi = ?'];
  const vals: SQLInputValue[] = [newWeight, bmi];
  if (note !== undefined) { sets.push('note = ?'); vals.push(note); }
  vals.push(id);
  const info = db.prepare(`UPDATE weight_log SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  return {
    id: row.id, date: row.date, time: row.time, oldWeight: row.weight_kg,
    newWeight, bmi, note: note ?? null, rowsAffected: Number(info.changes),
  };
}

export interface WeightHistory {
  range: string; rows: { date: string; time: string | null; weight_kg: number; bmi: number | null; note: string | null }[];
  change: { spanDays: number; first: number; last: number; delta: number; dailyAvg: number } | null;
}

export function getWeightHistory(db: DatabaseSync, opts: { days?: number; startDate?: string; endDate?: string } = {}): WeightHistory {
  const { days = 30, startDate, endDate } = opts;
  let rows: WeightHistory['rows'];
  let range: string;
  if (startDate && endDate) {
    rows = db.prepare(
      'SELECT date, time, weight_kg, bmi, note FROM weight_log WHERE date >= ? AND date <= ? ORDER BY date DESC, time DESC',
    ).all(startDate, endDate) as WeightHistory['rows'];
    range = startDate === endDate ? startDate : `${startDate} ~ ${endDate}`;
  } else if (startDate) {
    rows = db.prepare(
      'SELECT date, time, weight_kg, bmi, note FROM weight_log WHERE date = ? ORDER BY time DESC',
    ).all(startDate) as WeightHistory['rows'];
    range = startDate;
  } else {
    rows = db.prepare(
      'SELECT date, time, weight_kg, bmi, note FROM weight_log ORDER BY date DESC, time DESC LIMIT ?',
    ).all(days) as WeightHistory['rows'];
    range = `最近${days}天`;
  }
  if (!rows.length) throw new FetchError(`无体重记录（${range}）`);
  let change: WeightHistory['change'] = null;
  if (rows.length >= 2) {
    const first = rows[rows.length - 1].weight_kg;
    const last = rows[0].weight_kg;
    const spanDays = Math.round(
      (new Date(rows[0].date).getTime() - new Date(rows[rows.length - 1].date).getTime()) / 86400000,
    ) + 1;
    const delta = Math.round((last - first) * 10) / 10;
    change = { spanDays, first, last, delta, dailyAvg: spanDays > 0 ? Math.round((delta / spanDays) * 100) / 100 : 0 };
  }
  return { range, rows, change };
}

export function getWeightGoalValue(db: DatabaseSync): number | null {
  const row = db.prepare('SELECT weight_goal FROM daily_goal WHERE id = 1').get() as
    | { weight_goal: number | null } | undefined;
  return row?.weight_goal ?? null;
}

export function deltaLast(db: DatabaseSync, targetDate?: string, excludeTime?: string): number | null {
  const d = targetDate ?? todayStr();
  const row = excludeTime
    ? (db.prepare(
      'SELECT weight_kg FROM weight_log WHERE date < ? OR (date = ? AND time < ?) ORDER BY date DESC, time DESC LIMIT 1',
    ).get(d, d, excludeTime) as { weight_kg: number } | undefined)
    : (db.prepare(
      'SELECT weight_kg FROM weight_log WHERE date < ? OR (date = ? AND time < (SELECT MIN(time) FROM weight_log WHERE date = ?)) ORDER BY date DESC, time DESC LIMIT 1',
    ).get(d, d, d) as { weight_kg: number } | undefined);
  return row ? row.weight_kg : null;
}

export function goalDiff(db: DatabaseSync, weightKg: number): number | null {
  const goal = getWeightGoalValue(db);
  if (goal === null) return null;
  return Math.round((weightKg - goal) * 10) / 10;
}

export function deleteWeight(db: DatabaseSync, weightId: number): WeightRow & { deletedCount: number } {
  const id = Number(weightId);
  if (!Number.isInteger(id)) throw new FetchError('体重记录 ID 必须是数字');
  const row = db.prepare('SELECT id, date, time, weight_kg, bmi, note FROM weight_log WHERE id = ?').get(id) as
    | WeightRow | undefined;
  if (!row) throw new FetchError(`体重记录 ID ${id} 不存在`);
  db.prepare('DELETE FROM weight_log WHERE id = ?').run(id);
  return { ...row, deletedCount: 1 };
}

function snapWeightRows(db: DatabaseSync, where: string, params: SQLInputValue[]): WeightRow[] {
  return db.prepare(
    `SELECT id, date, time, weight_kg, bmi, note FROM weight_log WHERE ${where} ORDER BY date, time`,
  ).all(...params) as unknown as WeightRow[];
}

export function deleteWeightByDate(db: DatabaseSync, targetDate: string): { date: string; deletedCount: number; snapshot: WeightRow[] } {
  const snapshot = snapWeightRows(db, 'date = ?', [targetDate]);
  if (!snapshot.length) throw new FetchError(`${targetDate} 无体重记录`);
  db.prepare('DELETE FROM weight_log WHERE date = ?').run(targetDate);
  return { date: targetDate, deletedCount: snapshot.length, snapshot };
}

export function deleteWeightRange(db: DatabaseSync, startDate: string, endDate: string): {
  start: string; end: string; deletedCount: number; snapshot: WeightRow[];
} {
  const snapshot = snapWeightRows(db, 'date BETWEEN ? AND ?', [startDate, endDate]);
  if (!snapshot.length) throw new FetchError(`${startDate} ~ ${endDate} 无体重记录`);
  db.prepare('DELETE FROM weight_log WHERE date BETWEEN ? AND ?').run(startDate, endDate);
  return { start: startDate, end: endDate, deletedCount: snapshot.length, snapshot };
}

export function updateWeightByDate(db: DatabaseSync, targetDate: string, weightKg?: number, note?: string): {
  date: string; hitCount: number; oldRows: WeightRow[]; newWeight: number | null; bmi: number | null; note: string | null;
} {
  if (weightKg === undefined && note === undefined) throw new FetchError('至少需要传入 weight 与 note 中的一个');
  const heightCm = profileHeightCm(db);
  const oldRows = snapWeightRows(db, 'date = ?', [targetDate]);
  if (!oldRows.length) throw new FetchError(`${targetDate} 无体重记录`);
  let newBmi: number | null = null;
  let newKg: number | null = null;
  if (weightKg !== undefined) {
    newKg = Number(weightKg);
    if (!Number.isFinite(newKg)) throw new FetchError('体重必须是数字');
    newBmi = heightCm === null ? null : bmiOf(newKg, heightCm);
    db.prepare('UPDATE weight_log SET weight_kg = ?, bmi = ? WHERE date = ?').run(newKg, newBmi, targetDate);
  }
  if (note !== undefined) db.prepare('UPDATE weight_log SET note = ? WHERE date = ?').run(note, targetDate);
  return { date: targetDate, hitCount: oldRows.length, oldRows, newWeight: newKg, bmi: newBmi, note: note ?? null };
}

export interface BatchWeightItem { date?: string; kg?: number }

export function batchLogWeight(db: DatabaseSync, items: BatchWeightItem[]): {
  wrote: number; skipped: number; failed: number; items: { date: string | undefined; kg: number | undefined; status: string; reason: string }[];
} {
  const heightRow = db.prepare('SELECT height_cm FROM user_profile WHERE id = 1').get() as
    | { height_cm: number | null } | undefined;
  const heightCm = heightRow?.height_cm ?? null;
  let wrote = 0, skipped = 0, failed = 0;
  const out: { date: string | undefined; kg: number | undefined; status: string; reason: string }[] = [];
  for (const it of items) {
    const d = it.date;
    const kg = Number(it.kg);
    if (!Number.isFinite(kg)) { failed++; out.push({ date: d, kg: it.kg, status: '失败', reason: '体重非数字' }); continue; }
    if (kg <= 0) { failed++; out.push({ date: d, kg, status: '失败', reason: '体重必须为正数' }); continue; }
    if (!d || Number.isNaN(Date.parse(d))) { failed++; out.push({ date: d, kg, status: '失败', reason: '日期格式错误' }); continue; }
    const exist = db.prepare('SELECT weight_kg FROM weight_log WHERE date = ? ORDER BY time DESC LIMIT 1').get(d) as
      | { weight_kg: number } | undefined;
    if (exist) { skipped++; out.push({ date: d, kg, status: '跳过', reason: `已有记录 ${exist.weight_kg}kg` }); continue; }
    const bmi = heightCm ? bmiOf(kg, heightCm) : null;
    db.prepare('INSERT INTO weight_log (date, time, weight_kg, height_cm, bmi, note) VALUES (?, ?, ?, ?, ?, ?)').run(
      d, '08:00:00', kg, heightCm, bmi, '');
    wrote++;
    out.push({ date: d, kg, status: '写入', reason: '' });
  }
  return { wrote, skipped, failed, items: out };
}

export interface WeightLogItem { date: string; kg: number; bmi: number | null; delta: number; note: string; tag: string | null }

export function fetchWeightLogs(db: DatabaseSync, start: string, end: string, noteOnly = false): WeightLogItem[] {
  const rows = (noteOnly
    ? db.prepare(`SELECT date, weight_kg, bmi, note FROM weight_log
        WHERE date BETWEEN ? AND ? AND note IS NOT NULL AND note != '' ORDER BY date, time`).all(start, end)
    : db.prepare('SELECT date, weight_kg, bmi, note FROM weight_log WHERE date BETWEEN ? AND ? ORDER BY date, time').all(start, end)) as
    { date: string; weight_kg: number; bmi: number | null; note: string | null }[];
  const h = db.prepare('SELECT height_cm FROM user_profile ORDER BY id DESC LIMIT 1').get() as
    | { height_cm: number | null } | undefined;
  const heightM = h?.height_cm ? h.height_cm / 100 : null;
  const items: WeightLogItem[] = [];
  let prev: number | null = null;
  for (const r of rows) {
    const bmi = r.bmi ?? (heightM ? bmiOf(r.weight_kg, heightM * 100) : null);
    const delta = prev === null ? 0 : Math.round((r.weight_kg - prev) * 10) / 10;
    items.push({ date: r.date, kg: r.weight_kg, bmi, delta, note: r.note ?? '', tag: noteTag(r.note) });
    prev = r.weight_kg;
  }
  return items;
}
