// 口径层·心愿排期（M3）：排期/完成/同步三向；同步动作名对齐 feishu 传输（实现见 fetch/feishu）。
import { MemoPolicyError } from '../fetch/errors.js';

export type WishOp = 'plan' | 'complete';
export type WishSyncOp = 'add_wish_sync' | 'update_wish_sync' | 'complete_wish_sync' | 'update_due_sync' | 'clear_due_sync';
export const WISH_SYNC_OPS: WishSyncOp[] = [
  'add_wish_sync', 'update_wish_sync', 'complete_wish_sync', 'update_due_sync', 'clear_due_sync',
];

export function routeWish(op: WishOp): { key: string } {
  if (op === 'plan') return { key: 'memo.wish' };
  if (op === 'complete') return { key: 'memo.update' };
  throw new MemoPolicyError('POLICY_BAD_INPUT', '未知心愿操作：' + String(op));
}
