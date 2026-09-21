// 心愿类·合成写（#661，#665 DB 对齐）：记一条／改一条／删一条／批量排期，四条宿主写命令统一到
// 「把一条业务事实对齐到本地库 ＋ 飞书任务两侧」这一种语义（契约见 `docs/agents/合成写判据.md`）。
// 三条通用口径：① 两侧各按自然键判重，责任都在被调方；② 远端标识回写本地；③ 回执分字段
// （`local`／`remote`／`remoteId`）＋「最终没达成」时退出码非零（0＝达成，4＝取数/远端那一档）。
// DB 对齐（老权威）：行语义逐列照老 `notes` 表；命令面的题／文双参数收敛到 `content` 单列
// （正文优先、标题补位，`summary` 列不动）；本地判重键＝（分类，content 全文，排期日期）。
import {
  addNote,
  addReminderRow,
  getNote,
  listNotes,
  removeNote,
  removeReminderRowsOfNote,
  updateNote,
  type MemoDb,
  type MemoNote,
  type NotePatch,
} from '../fetch/db.js';
import { normalizeRemindAt, normalizeRepeatRule, normalizeRepeatType } from '../remind/policy.js';
import { dueForCategory, normalizeDue } from './due.js';
import { larkSetupOf, openGate } from './gate.js';
import type { LarkSetupInfo } from '../fetch/index.js';
import { clearRemoteWishDue, completeRemoteWish, ensureRemoteWish, rescheduleRemoteWish, retitleRemoteWish } from './taskSync.js';
import { deleteRemoteWish } from './taskRemove.js';

const WISH_TOP = '心愿';

export interface WishReceipt {
  readonly ok: boolean;
  readonly message: string;
  /** 本地侧做了什么（`checked`＝自检 #666：只验远端，本地零写）。 */
  readonly local: 'created' | 'existing' | 'updated' | 'unchanged' | 'removed' | 'checked';
  /** 远端侧做了什么。 */
  readonly remote: 'created' | 'existing' | 'synced' | 'partial' | 'unavailable' | 'failed' | 'not-applicable';
  /** 远端标识（回写本地的那一格）。 */
  readonly remoteId: string | null;
  /** 远端不可用时的安装指引（#760：与面板「复制安装指引」按钮同一内容；可用时缺席）。
   *  可选——老回执与 `not-applicable` 那一支没有它。 */
  readonly larkSetup?: LarkSetupInfo;
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

/** 本地侧自然键：`(分类, content 全文, 排期日期)`——同分类同文同排期日即同一条。 */
function localWishRow(db: MemoDb, content: string, due: string | null): MemoNote | null {
  for (const n of listNotes(db)) {
    if (n.category === WISH_TOP && n.content === content && (n.due ?? null) === due) return n;
  }
  return null;
}

export interface WishCreateInput {
  readonly title: string;
  readonly body: string;
  readonly category: string;
  readonly sub?: string | null;
  readonly media?: string | null;
  readonly remindAt?: unknown;
  readonly repeatType?: unknown;
  readonly repeatRule?: unknown;
  readonly due?: unknown;
}

/** 记一条。心愿分类走合成写（本地 ＋ 飞书任务一次成）；其它分类照旧只落本地（回执远端格如实写不适用）。
 *  带提醒时间即两步合一：建笔记后再建提醒行（老 `remind` 的落盘形状），提醒没设上即这一趟没达成。 */
export function ensureWish(db: MemoDb, input: WishCreateInput): WishWriteResult {
  const content = input.body !== '' ? input.body : input.title;
  const due = dueForCategory(input.category, input.due);
  let remindSpec: { at: string; type: string; rule: string | null } | null = null;
  if (input.remindAt !== undefined) {
    const at = normalizeRemindAt(input.remindAt);
    const type = normalizeRepeatType(input.repeatType);
    remindSpec = { at, type, rule: normalizeRepeatRule(type, input.repeatRule, at) };
  }
  const fail = (message: string, local: WishReceipt['local'], remoteId: string | null, larkSetup?: LarkSetupInfo): WishWriteResult => ({
    receipt: { ok: false, message, local, remote: 'unavailable', remoteId, larkSetup },
    exit: 4,
  });
  const placeReminder = (note: MemoNote): string | null => {
    if (!remindSpec) return null;
    try {
      addReminderRow(db, {
        note_id: note.id,
        remind_at: remindSpec.at,
        repeat_type: remindSpec.type,
        repeat_rule: remindSpec.rule,
        content: note.content,
      });
      return null;
    } catch (e) {
      return '；提醒没设上（' + textOf(e) + '）';
    }
  };
  if (input.category !== WISH_TOP) {
    const n = addNote(db, {
      content,
      category: input.category,
      sub_category: input.sub ?? null,
      media_path: input.media ?? null,
      due: null,
    });
    const err = placeReminder(n);
    if (err) return { receipt: { ok: false, message: '已记一条：' + n.id + err, local: 'created', remote: 'not-applicable', remoteId: null }, exit: 4 };
    return { receipt: { ok: true, message: '已记一条：' + n.id, local: 'created', remote: 'not-applicable', remoteId: null }, exit: 0 };
  }
  const found = localWishRow(db, content, due);
  const note = found ?? addNote(db, {
    content,
    category: WISH_TOP,
    sub_category: input.sub ?? null,
    media_path: input.media ?? null,
    due,
  });
  const local: WishReceipt['local'] = found ? 'existing' : 'created';
  const named = (found ? '已存在这条心愿（未新建）：' : '已记一条：') + note.id;
  const reminderErr = placeReminder(note);
  const gate = openGate();
  if (!gate.open) {
    const message = named + (reminderErr ?? '') + '；远端没成（' + gate.why + '）';
    if (reminderErr) return fail(message, local, note.feishu_task_guid ?? null, larkSetupOf(gate));
    return {
      receipt: { ok: false, message, local, remote: 'unavailable', remoteId: note.feishu_task_guid ?? null, larkSetup: larkSetupOf(gate) },
      exit: 4,
    };
  }
  try {
    const r = ensureRemoteWish(db, gate.cli, gate.openId, note);
    if (reminderErr) return { receipt: { ok: false, message: named + reminderErr, local, remote: r.remote, remoteId: r.remoteId }, exit: 4 };
    return { receipt: { ok: true, message: named, local, remote: r.remote, remoteId: r.remoteId }, exit: 0 };
  } catch (e) {
    return {
      receipt: { ok: false, message: named + (reminderErr ?? '') + '；远端没成（' + textOf(e) + '）', local, remote: 'failed', remoteId: note.feishu_task_guid ?? null },
      exit: 4,
    };
  }
}

export interface WishUpdateInput {
  readonly id: number;
  readonly patch: NotePatch;
}

/** 改一条：本地先落（本地是真相源），再把动到的两样镜像过去（改题／改期或清期）。
 *  只改子分类／分类／附件这类不动远端的字段时，远端那一格如实写「不适用」，不假装同步过。
 *  完成心愿不走这里（走 `completeWish` 的原子转换，老 `complete_wish`）。 */
export function updateWish(db: MemoDb, input: WishUpdateInput): WishWriteResult {
  const note = updateNote(db, input.id, input.patch);
  const done = '已更新：' + note.id;
  const mirror = note.category === WISH_TOP
    && (input.patch.content !== undefined || Object.prototype.hasOwnProperty.call(input.patch, 'due'));
  if (!mirror) {
    return { receipt: { ok: true, message: done, local: 'updated', remote: 'not-applicable', remoteId: note.feishu_task_guid ?? null }, exit: 0 };
  }
  const gate = openGate();
  if (!gate.open) {
    return { receipt: { ok: false, message: done + '；远端没成（' + gate.why + '）', local: 'updated', remote: 'unavailable', remoteId: note.feishu_task_guid ?? null, larkSetup: larkSetupOf(gate) }, exit: 4 };
  }
  let guid = note.feishu_task_guid ?? null;
  try {
    if (!guid) guid = ensureRemoteWish(db, gate.cli, gate.openId, note).remoteId;
    if (input.patch.content !== undefined) retitleRemoteWish(gate.cli, guid, note.content);
    if (Object.prototype.hasOwnProperty.call(input.patch, 'due')) {
      const due = note.due ?? null;
      if (due) rescheduleRemoteWish(gate.cli, guid, due);
      else clearRemoteWishDue(gate.cli, guid);
    }
    return { receipt: { ok: true, message: done, local: 'updated', remote: 'synced', remoteId: guid }, exit: 0 };
  } catch (e) {
    return { receipt: { ok: false, message: done + '；远端没成（' + textOf(e) + '）', local: 'updated', remote: 'failed', remoteId: guid }, exit: 4 };
  }
}

/** 删一条。心愿若在飞书有任务：**默认只标完成**（照老口径，飞书留「已完成」终态）；
 *  调用方显式带 `purge` 才真删远端任务（`task tasks delete`，见 `taskRemove.ts`）。
 *  两条路都是**先动远端、成了才删本地**——老实现先删本地再动远端（`memo_cli.py:407` → `:417`），
 *  远端一失败就再也补不回来，那条顺序不照抄；本侧的代价是远端不可用时删不掉，重试即可。
 *  外键 NO ACTION：删 note 前先清它的 reminders（老 `delete_note` 同形）。 */
export function removeWish(db: MemoDb, id: number, purge = false): WishWriteResult {
  const note = getNote(db, id);
  const guid = note.feishu_task_guid ?? null;
  if (note.category !== WISH_TOP || !guid) {
    removeReminderRowsOfNote(db, id);
    removeNote(db, id, true);
    return { receipt: { ok: true, message: '已删除：' + id, local: 'removed', remote: 'not-applicable', remoteId: guid }, exit: 0 };
  }
  const gate = openGate();
  if (!gate.open) {
    return { receipt: { ok: false, message: '本地未删（远端没成：' + gate.why + '）：' + id, local: 'unchanged', remote: 'unavailable', remoteId: guid, larkSetup: larkSetupOf(gate) }, exit: 4 };
  }
  try {
    if (purge) deleteRemoteWish(gate.cli, guid);
    else completeRemoteWish(gate.cli, guid);
  } catch (e) {
    return { receipt: { ok: false, message: '本地未删（远端没成：' + textOf(e) + '）：' + id, local: 'unchanged', remote: 'failed', remoteId: guid }, exit: 4 };
  }
  removeReminderRowsOfNote(db, id);
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
  readonly ids: readonly number[];
  readonly due: unknown;
}

/** 批量排期（老 `set-due`：一批 id ＋ 一个日期，可传空值清期）。非心愿与找不到的逐条记账，不静默吞。 */
export function setWishDue(db: MemoDb, input: WishSetDueInput): { receipt: WishBatchReceipt; exit: number } {
  const due = normalizeDue(input.due);
  const errors: string[] = [];
  let updated = 0; let feishuSynced = 0; let skipped = 0;
  const gate = openGate();
  for (const id of input.ids) {
    let row: MemoNote | null = null;
    try {
      row = getNote(db, id);
    } catch {
      row = null;
    }
    if (!row) { skipped += 1; errors.push('id=' + id + '：没有这条笔记'); continue; }
    if (row.category !== WISH_TOP) { skipped += 1; errors.push('id=' + id + '：分类是 ' + row.category + '，不是心愿'); continue; }
    const next = updateNote(db, id, { due });
    updated += 1;
    if (!gate.open) { errors.push('id=' + id + '：本地排期已设，远端没成（' + gate.why + '）'); continue; }
    try {
      const guid = next.feishu_task_guid ?? ensureRemoteWish(db, gate.cli, gate.openId, next).remoteId;
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
      larkSetup: larkSetupOf(gate),
      updated, feishuSynced, skipped, errors,
    },
    exit: errors.length === 0 ? 0 : 4,
  };
}
