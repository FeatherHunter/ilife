/** 跨域共用 · 参数校验原语（票 #855 从 `memo/crud.ts` 提到共用位）。
 *
 * 谁在用（写得出三个在用）：`memo/crud.ts`（增删改查的 id 口）／`src/search/run.ts`（详情 id）／
 * `src/remind/run.ts`（提醒关联笔记 id）——三域同用一个正整数 id 口径，各写一份迟早走散（铁律二）。
 * 本件只做一件事（正整数归一），不碰分类／提醒／附件那些域口径。
 */
import { MemoPolicyError } from './errors.js';

/** id 归一：对外接受数字或数字串，统一归一为 number（老 `note_id <= 0` 即错口径）。 */
export function needId(id: unknown, op: string): number {
  const n = typeof id === 'number' ? id : typeof id === 'string' && id.trim() !== '' ? Number(id) : NaN;
  if (!Number.isInteger(n) || n <= 0) throw new MemoPolicyError('POLICY_BAD_INPUT', op + ' 须给正整数 id');
  return n;
}
