/** T4 #23 · goal_manager 取数+状态写（对照老家 scripts/goal_manager.py）。
 *
 * T3 范式：失败抛 FetchError，不 print（打印归 T11 CLI）。
 * 一处有意偏离：老家无 daily_goal 行时 UPDATE 0 行后取 row['id'] 直接崩溃；
 * TS 线先 ensureGoalRow（INSERT OR IGNORE 默认行），崩溃转显式可运行语义。
 */
import type { DatabaseSync } from 'node:sqlite';
import { FetchError } from './errors.js';

export interface PausedState {
  paused: boolean;
  pausedAt: string | null;
}

export interface PauseResult {
  id: number;
  updatedAt: string | null;
  rowsAffected: number;
  paused: true;
  note: string;
  restoreHint: string;
}

export interface ResumeResult {
  id: number;
  updatedAt: string | null;
  rowsAffected: number;
  resumeState: string;
  resumedAt: string | null;
}

/** 单例行兜底（INSERT OR IGNORE，全默认列）。 */
export function ensureGoalRow(db: DatabaseSync): void {
  db.prepare('INSERT OR IGNORE INTO daily_goal (id) VALUES (1)').run();
}

export function getPausedState(db: DatabaseSync): PausedState {
  const row = db.prepare('SELECT goal_paused, updated_at FROM daily_goal WHERE id = 1').get() as
    | { goal_paused: number | null; updated_at: string | null }
    | undefined;
  if (!row) return { paused: false, pausedAt: null };
  return { paused: row.goal_paused === 1, pausedAt: row.updated_at };
}

export function pauseAllGoals(db: DatabaseSync): PauseResult {
  ensureGoalRow(db);
  const upd = db
    .prepare('UPDATE daily_goal SET goal_paused = 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1')
    .run();
  const row = db.prepare('SELECT id, updated_at FROM daily_goal WHERE id = 1').get() as
    | { id: number; updated_at: string | null }
    | undefined;
  if (!row) throw new FetchError('pause 后 daily_goal#1 缺失');
  return {
    id: row.id,
    updatedAt: row.updated_at,
    rowsAffected: Number(upd.changes),
    paused: true,
    note: '记录照常，仅目标暂停（完成度显示不计入暂停期）',
    restoreHint: '说「重启所有目标」即可恢复',
  };
}

export interface SetWeightGoalInput {
  kg: unknown;
  deadline?: unknown;
  startKg?: unknown;
  startDate?: unknown;
}

export interface SetWeightGoalResult {
  weightGoal: number;
  deadline: string | null;
  startKg: number | null;
  startDate: string | null;
  updatedAt: string | null;
  rowsAffected: number;
}

/** 定体重目标（对照老家 render_goal_weight --live：目标 kg 必填，截止/起点可选；ISO 日期校验）。 */
export function setWeightGoal(db: DatabaseSync, input: SetWeightGoalInput): SetWeightGoalResult {
  const kg = typeof input.kg === 'number' ? input.kg : Number(String(input.kg ?? '').trim());
  if (!Number.isFinite(kg) || kg <= 0 || kg > 500) throw new FetchError('体重目标非法：' + JSON.stringify(input.kg) + '（须 0..500 正数 kg）');
  const iso = (v: unknown, field: string): string | null => {
    if (v === undefined || v === null || v === '') return null;
    const s = String(v);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new FetchError(field + ' 非法（须 YYYY-MM-DD）：' + s);
    return s;
  };
  const deadline = iso(input.deadline, 'deadline');
  const startDate = iso(input.startDate, 'startDate');
  let startKg: number | null = null;
  if (input.startKg !== undefined && input.startKg !== null && input.startKg !== '') {
    startKg = typeof input.startKg === 'number' ? input.startKg : Number(String(input.startKg).trim());
    if (!Number.isFinite(startKg) || startKg <= 0 || startKg > 500) throw new FetchError('起点体重非法：' + JSON.stringify(input.startKg));
  }
  ensureGoalRow(db);
  const upd = db
    .prepare('UPDATE daily_goal SET weight_goal = ?, goal_deadline = ?, start_weight = ?, start_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1')
    .run(kg, deadline, startKg, startDate);
  const row = db.prepare('SELECT updated_at FROM daily_goal WHERE id = 1').get() as
    | { updated_at: string | null }
    | undefined;
  return { weightGoal: kg, deadline, startKg, startDate, updatedAt: row?.updated_at ?? null, rowsAffected: Number(upd.changes) };
}

export function resumeAllGoals(db: DatabaseSync): ResumeResult {
  ensureGoalRow(db);
  const upd = db
    .prepare('UPDATE daily_goal SET goal_paused = 0, updated_at = CURRENT_TIMESTAMP WHERE id = 1')
    .run();
  const row = db.prepare('SELECT id, updated_at FROM daily_goal WHERE id = 1').get() as
    | { id: number; updated_at: string | null }
    | undefined;
  if (!row) throw new FetchError('resume 后 daily_goal#1 缺失');
  return {
    id: row.id,
    updatedAt: row.updated_at,
    rowsAffected: Number(upd.changes),
    resumeState: '正常（未暂停）',
    resumedAt: row.updated_at,
  };
}
