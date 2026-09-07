// 口径层·增删改查字段政策（M3）：建须题/文其一、改删须 id、真删须 confirm；废弃走 reminder abandon。
import { MemoPolicyError } from '../fetch/errors.js';

function needId(id: unknown, op: string): string {
  if (typeof id !== 'string' || id.length === 0) throw new MemoPolicyError('POLICY_BAD_INPUT', op + ' 须给 id');
  return id;
}

export function crudCreate(input: { title?: unknown; body?: unknown }): { title: string; body: string } {
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const body = typeof input.body === 'string' ? input.body.trim() : '';
  if (!title && !body) throw new MemoPolicyError('POLICY_BAD_INPUT', '新建须给标题或正文其一');
  return { title, body };
}

export function crudUpdate(input: { id?: unknown }): { id: string } {
  return { id: needId(input.id, '更新') };
}

export function crudRemove(input: { id?: unknown; confirm?: unknown }): { id: string } {
  const id = needId(input.id, '删除');
  if (input.confirm !== true) throw new MemoPolicyError('POLICY_BAD_INPUT', '真删须 confirm:true（废弃提醒走 abandon）');
  return { id };
}
