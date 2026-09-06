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
