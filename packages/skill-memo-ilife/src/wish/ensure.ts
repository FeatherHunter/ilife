// 心愿类·合成写（#661）：记一条／改一条／删一条／批量排期，四条宿主写命令统一到「把一条业务事实
// 对齐到本地库 ＋ 飞书任务两侧」这一种语义（契约见 `docs/agents/合成写判据.md`）。
// 三条通用口径：① 两侧各按自然键判重，责任都在被调方；② 远端标识回写本地；③ 回执分字段
// （`local`／`remote`／`remoteId`）＋「最终没达成」时退出码非零（0＝达成，4＝取数/远端那一档）。
import { addNote, getNote, listNotes, removeNote, updateNote, type MemoDb, type MemoNote } from '../fetch/db.js';
import { dueForCategory, normalizeDue } from './due.js';
import { openGate } from './gate.js';
import { clearRemoteWishDue, completeRemoteWish, ensureRemoteWish, rescheduleRemoteWish, retitleRemoteWish } from './taskSync.js';
import { deleteRemoteWish } from './taskRemove.js';

const WISH_TOP = '心愿';

export interface WishReceipt {
  readonly ok: boolean;
  readonly message: string;
  /** 本地侧做了什么。 */
  readonly local: 'created' | 'existing' | 'updated' | 'unchanged' | 'removed';
  /** 远端侧做了什么。 */
  readonly remote: 'created' | 'existing' | 'synced' | 'partial' | 'unavailable' | 'failed' | 'not-applicable';
  /** 远端标识（回写本地的那一格）。 */
  readonly remoteId: string | null;
}

export interface WishBatchReceipt extends WishReceipt {
  readonly updated: number;
  readonly feishuSynced: number;
  readonly skipped: number;
  readonly errors: readonly string[];
}

export interface WishWriteResult {
  readonly receipt: WishReceipt;
  /** 退出码：0＝这一趟达成了；4＝本地成了但远端没成（合成写的「没达成」那一档）。 */
  readonly exit: number;
}

function textOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** 本地侧自然键：`(分类, 标题, 排期日期)`——同分类同题同排期日即同一条心愿。 */
function localWishRow(db: MemoDb, title: string, due: string | null): MemoNote | null {
  for (const n of listNotes(db)) {
    if (n.category === WISH_TOP && n.title === title && (n.due ?? null) === due) return n;
  }
  return null;
}

export interface WishCreateInput {
  readonly title: string;
  readonly body: string;
  readonly category: string;
  readonly sub?: string | null;
  readonly remindAt?: string | null;
  readonly due?: unknown;
}

/** 记一条。心愿分类走合成写（本地 ＋ 飞书任务一次成）；其它分类照旧只落本地。 */
export function ensureWish(db: MemoDb, input: WishCreateInput): WishWriteResult {
  const due = dueForCategory(input.category, input.due);
  if (input.category !== WISH_TOP) {
    const n = addNote(db, {
      title: input.title, body: input.body, category: input.category,
      sub: input.sub ?? null, remindAt: input.remindAt ?? null, due: null,
    });
    return { receipt: { ok: true, message: '已记一条：' + n.id, local: 'created', remote: 'not-applicable', remoteId: null }, exit: 0 };
  }
  const found = localWishRow(db, input.title, due);
  const note = found ?? addNote(db, {
    title: input.title, body: input.body, category: WISH_TOP,
    sub: input.sub ?? null, remindAt: input.remindAt ?? null, due,
  });
  const local: WishReceipt['local'] = found ? 'existing' : 'created';
  const named = (found ? '已存在这条心愿（未新建）：' : '已记一条：') + note.id;
  const gate = openGate();
  if (!gate.open) {
    return {
      receipt: { ok: false, message: named + '；远端没成（' + gate.why + '）', local, remote: 'unavailable', remoteId: note.feishuTaskGuid ?? null },
      exit: 4,
    };
  }
  try {
    const r = ensureRemoteWish(db, gate.cli, gate.openId, note);
    return { receipt: { ok: true, message: named, local, remote: r.remote, remoteId: r.remoteId }, exit: 0 };
  } catch (e) {
    return {
      receipt: { ok: false, message: named + '；远端没成（' + textOf(e) + '）', local, remote: 'failed', remoteId: note.feishuTaskGuid ?? null },
      exit: 4,
    };
  }
}

export interface WishUpdateInput {
  readonly id: string;
  readonly patch: Partial<MemoNote>;
}

/** 改一条：本地先落（本地是真相源），再把动到的三样镜像过去（改题／标完成／改期或清期）。
 *  只改子分类／分类这类不动远端的字段时，远端那一格如实写「不适用」，不假装同步过。 */
export function updateWish(db: MemoDb, input: WishUpdateInput): WishWriteResult {
  const note = updateNote(db, input.id, input.patch);
  const done = '已更新：' + note.id;
  const mirror = note.category === WISH_TOP
    && (input.patch.title !== undefined || input.patch.done === true || Object.prototype.hasOwnProperty.call(input.patch, 'due'));
  if (!mirror) {
    return { receipt: { ok: true, message: done, local: 'updated', remote: 'not-applicable', remoteId: note.feishuTaskGuid ?? null }, exit: 0 };
  }
  const gate = openGate();
  if (!gate.open) {
    return { receipt: { ok: false, message: done + '；远端没成（' + gate.why + '）', local: 'updated', remote: 'unavailable', remoteId: note.feishuTaskGuid ?? null }, exit: 4 };
  }
  let guid = note.feishuTaskGuid ?? null;
  try {
    if (!guid) guid = ensureRemoteWish(db, gate.cli, gate.openId, note).remoteId;
    if (input.patch.title !== undefined) retitleRemoteWish(gate.cli, guid, note.title);
    if (Object.prototype.hasOwnProperty.call(input.patch, 'due')) {
      const due = note.due ?? null;
      if (due) rescheduleRemoteWish(gate.cli, guid, due);
      else clearRemoteWishDue(gate.cli, guid);
    }
    if (input.patch.done === true) completeRemoteWish(gate.cli, guid);
    return { receipt: { ok: true, message: done, local: 'updated', remote: 'synced', remoteId: guid }, exit: 0 };
  } catch (e) {
    return { receipt: { ok: false, message: done + '；远端没成（' + textOf(e) + '）', local: 'updated', remote: 'failed', remoteId: guid }, exit: 4 };
  }
}

/** 删一条。心愿若在飞书有任务：**默认只标完成**（照老口径，飞书留「已完成」终态）；
 *  调用方显式带 `purge` 才真删远端任务（`task tasks delete`，见 `taskRemove.ts`）。
 *  两条路都是**先动远端、成了才删本地**——老实现先删本地再动远端（`memo_cli.py:407` → `:417`），
 *  远端一失败就再也补不回来，那条顺序不照抄；本侧的代价是远端不可用时删不掉，重试即可。 */
export function removeWish(db: MemoDb, id: string, purge = false): WishWriteResult {
  const note = getNote(db, id);
  const guid = note.feishuTaskGuid ?? null;
  if (note.category !== WISH_TOP || !guid) {
    removeNote(db, id, true);
    return { receipt: { ok: true, message: '已删除：' + id, local: 'removed', remote: 'not-applicable', remoteId: guid }, exit: 0 };
  }
  const gate = openGate();
  if (!gate.open) {
    return { receipt: { ok: false, message: '本地未删（远端没成：' + gate.why + '）：' + id, local: 'unchanged', remote: 'unavailable', remoteId: guid }, exit: 4 };
  }
  try {
    if (purge) deleteRemoteWish(gate.cli, guid);
    else completeRemoteWish(gate.cli, guid);
  } catch (e) {
    return { receipt: { ok: false, message: '本地未删（远端没成：' + textOf(e) + '）：' + id, local: 'unchanged', remote: 'failed', remoteId: guid }, exit: 4 };
  }
  removeNote(db, id, true);
  return {
    receipt: {
      ok: true,
      message: (purge ? '已删除（远端任务一并删除）：' : '已删除（远端任务标为完成）：') + id,
      local: 'removed', remote: 'synced', remoteId: guid,
    },
    exit: 0,
  };
}

export interface WishSetDueInput {
  readonly ids: readonly string[];
  readonly due: unknown;
}

/** 批量排期（老 `set-due`：一批 id ＋ 一个日期，可传空值清期）。非心愿与找不到的逐条记账，不静默吞。 */
export function setWishDue(db: MemoDb, input: WishSetDueInput): { receipt: WishBatchReceipt; exit: number } {
  const due = normalizeDue(input.due);
  const errors: string[] = [];
  let updated = 0; let feishuSynced = 0; let skipped = 0;
  const gate = openGate();
  for (const id of input.ids) {
    const row = listNotes(db).find((n) => n.id === id) ?? null;
    if (!row) { skipped += 1; errors.push('id=' + id + '：没有这条笔记'); continue; }
    if (row.category !== WISH_TOP) { skipped += 1; errors.push('id=' + id + '：分类是 ' + row.category + '，不是心愿'); continue; }
    const next = updateNote(db, id, { due });
    updated += 1;
    if (!gate.open) { errors.push('id=' + id + '：本地排期已设，远端没成（' + gate.why + '）'); continue; }
    try {
      const guid = next.feishuTaskGuid ?? ensureRemoteWish(db, gate.cli, gate.openId, next).remoteId;
      if (due) rescheduleRemoteWish(gate.cli, guid, due);
      else clearRemoteWishDue(gate.cli, guid);
      feishuSynced += 1;
    } catch (e) {
      errors.push('id=' + id + '：远端没成（' + textOf(e) + '）');
    }
  }
  const remote: WishReceipt['remote'] = !gate.open ? 'unavailable'
    : errors.length === 0 ? 'synced' : (feishuSynced > 0 ? 'partial' : 'failed');
  return {
    receipt: {
      ok: errors.length === 0,
      message: '排期完成：本地更新=' + updated + '，远端同步=' + feishuSynced + '，错误=' + errors.length,
      local: updated > 0 ? 'updated' : 'unchanged',
      remote,
      remoteId: null,
      updated, feishuSynced, skipped, errors,
    },
    exit: errors.length === 0 ? 0 : 4,
  };
}
