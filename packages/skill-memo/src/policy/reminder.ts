// 口径层·提醒路由（M3）：设置/查/废弃/完成四向；废弃留笔记、删除去笔记（须 confirm）。
import { MemoPolicyError } from '../fetch/errors.js';

export const REMIND_ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeRemindAt(v: unknown): string {
  if (typeof v !== 'string' || !REMIND_ISO_RE.test(v) || Number.isNaN(Date.parse(v))) {
    throw new MemoPolicyError('POLICY_BAD_REMINDER', 'remindAt 须为 YYYY-MM-DD：' + String(v));
  }
  return v;
}

export type RemindOp = 'set' | 'query' | 'abandon' | 'complete' | 'listDone';
export interface RemindRoute { key: string; mode?: 'abandon' | 'delete'; done?: boolean; }

export function routeRemind(op: RemindOp): RemindRoute {
  switch (op) {
    case 'set': return { key: 'memo.create' };
    case 'query': return { key: 'memo.remind' };
    case 'abandon': return { key: 'memo.remove', mode: 'abandon' };
    case 'complete': return { key: 'memo.update', done: true };
    case 'listDone': return { key: 'memo.remind', done: true };
    default: throw new MemoPolicyError('POLICY_BAD_REMINDER', '未知提醒操作：' + String(op));
  }
}
