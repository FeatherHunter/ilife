// 心愿类·飞书任务同步五操作（#661）：建／改题／标完成／改期／清期。
// 每个操作一个一个对得上老实现：`add_wish_sync`(feishu_sync.py:272)、`update_wish_sync`(:349)、
// `complete_wish_sync`(:363)、`update_due_sync`(:373)、`clear_due_sync`(:398)。
// 建的那一支带三条口径：① 建前查重（远端侧自然键）；② 成功后标识回写本地；③ 远端对象带归属标记。
import type { MemoDb, MemoNote } from '../fetch/db.js';
import { updateNote } from '../fetch/db.js';
import { searchTasks } from '../fetch/tasks.js';
import { createTask, updateTask, completeTask, clearTaskDue, taskTitle } from '../fetch/taskWrite.js';
import { ownershipMark } from './mark.js';

export interface RemoteWishRef {
  readonly remote: 'created' | 'existing';
  readonly remoteId: string;
}

/** 远端自然键命中判据：标题全等（比对口径＝写入口径 `title[:200]`）＋ 排期日期同日。
 *  老实现把未截断的全文拿去比 `[:200]` 的标题，长正文必然比不中（feishu_sync.py:313 vs :327）——
 *  口径不一致那条缺陷不照抄（偏离 D-15）。 */
function hitOf(found: readonly { summary: string; guid: string }[], title: string): string | null {
  const want = taskTitle(title);
  for (const t of found) if (t.summary === want) return t.guid;
  return null;
}

/** 远端已有一条同键任务就复用它（不重复建）；没有就建一条。两种情况都把标识回写本地。
 *  老实现只在 `if due_iso:` 里查重（feishu_sync.py:312）——无排期的心愿完全不查重，同内容再记一次就再建一个任务；
 *  契约要求两侧一律判重，故此处不设这个前提（偏离 D-16）。自然键的标题位取 `content`（老 `add_wish_sync`
 *  拿正文建任务，`content[:200]` 截断口径见 `taskTitle`）。 */
export function ensureRemoteWish(db: MemoDb, cli: string, assignee: string, note: MemoNote): RemoteWishRef {
  const existing = hitOf(searchTasks(cli, { summary: note.content, due: note.due ?? null }), note.content);
  if (existing) {
    updateNote(db, note.id, { feishu_task_guid: existing });
    return { remote: 'existing', remoteId: existing };
  }
  const guid = createTask(cli, {
    summary: note.content,
    description: ownershipMark(note.id),
    assignee,
    due: note.due ?? null,
  });
  updateNote(db, note.id, { feishu_task_guid: guid });
  return { remote: 'created', remoteId: guid };
}

/** 改题：标题跟着本地改（老 `memo_cli.py:306-308` 的镜像）。 */
export function retitleRemoteWish(cli: string, taskId: string, title: string): void {
  updateTask(cli, taskId, { summary: title });
}

/** 标完成。 */
export function completeRemoteWish(cli: string, taskId: string): void {
  completeTask(cli, taskId);
}

/** 改期：排期日期非空那一支（老 `memo_cli.py:734` 的分流）。 */
export function rescheduleRemoteWish(cli: string, taskId: string, due: string): void {
  updateTask(cli, taskId, { due });
}

/** 清期：排期日期被清空那一支——必须走接口的显式空值通道 `--data '{"due": null}'`，常规 `--due` 参数表达不了清空。 */
export function clearRemoteWishDue(cli: string, taskId: string): void {
  clearTaskDue(cli, taskId);
}
