// 心愿类·反向对账三步（#661，#665 回归老口径）：① 本地有远端无 → 补建；② 远端完成 → 本地完成；
// ③ 远端改期 → 本地。
// 老家对照 `sync_from_feishu`（feishu_sync.py:535-718）：三步同函数体、单点失败收进 `errors` 并继续，
// 但对外层调用要能看出「这一趟有没有全成」——故 ok＝errors 为空，非空即退出码非零。
// 冲突口径照老实现原话（`feishu_sync.py:540`）：**写入时本地是真相源，对账时远端优先**（用户主动触发对账即视同远端说了算）。
// 与老实现的一处差异：老 `list` 失败返回 `[]`（`:466`）会把「读不到」装成「远端没有」，此处上抛后收进 errors。
// D-24 回摆（待签）：#661 曾把步 2 改为只标完成（`done` 列），DB 对齐后那一列不存在——
// 老权威要求步 2 走本地 `complete-wish`（删心愿 ＋ 生成打卡，`feishu_sync.py:648-655`），此处照老执行。
import { listNotes, updateNote, type MemoDb } from '../db/readonly.js';
import { listRelatedTasks, taskDueDate } from './tasks.js';
import { completeWish } from './complete.js';
import { larkSetupOf, openGate } from './gate.js';
import { ownerIdOf } from './mark.js';
import { ensureRemoteWish } from './taskSync.js';
import type { WishReceipt } from './ensure.js';

const WISH_TOP = '心愿';

/** 老实现那份回执的 11 项统计（feishu_sync.py:564-577），逐项对得上。 */
export interface ReconcileCounters {
  readonly backfilled: number;
  readonly scannedDone: number;
  readonly synced: number;
  readonly scannedPending: number;
  readonly dueAdded: number;
  readonly dueOverridden: number;
  readonly dueRemoved: number;
  readonly skippedNoMark: number;
  readonly skippedAlreadyDone: number;
  readonly skippedNoLocalNote: number;
  readonly errors: readonly string[];
}

export interface ReconcileReceipt extends WishReceipt, ReconcileCounters {}

function textOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** 反向对账。返回分字段回执 ＋ 11 项统计；「这一趟没全成」时退出码非零。 */
export function reconcileWishes(db: MemoDb): { receipt: ReconcileReceipt; exit: number } {
  const zero = {
    backfilled: 0, scannedDone: 0, synced: 0, scannedPending: 0,
    dueAdded: 0, dueOverridden: 0, dueRemoved: 0,
    skippedNoMark: 0, skippedAlreadyDone: 0, skippedNoLocalNote: 0,
  };
  const errors: string[] = [];
  const gate = openGate();
  if (!gate.open) {
    errors.push('远端不可用：' + gate.why);
    return {
      receipt: {
        ok: false, message: '对账没跑成：远端不可用（' + gate.why + '）',
        local: 'unchanged', remote: 'unavailable', remoteId: null, larkSetup: larkSetupOf(gate), ...zero, errors,
      },
      exit: 4,
    };
  }

  let backfilled = 0;
  // 步 1：本地有、远端无（本地缺标识那一批）→ 建远端任务并回写标识。
  for (const note of listNotes(db)) {
    if (note.category !== WISH_TOP || note.feishu_task_guid) continue;
    try {
      ensureRemoteWish(db, gate.cli, gate.openId, note);
      backfilled += 1;
    } catch (e) {
      errors.push('补建 id=' + note.id + '：' + textOf(e));
    }
  }

  // 一次拉远端全量，按状态分流（list 不带 due，步 3 才逐条补）。
  let items;
  try {
    items = listRelatedTasks(gate.cli);
  } catch (e) {
    errors.push('拉远端任务：' + textOf(e));
    return {
      receipt: {
        ok: false, message: '对账没跑完：远端拉不动（' + textOf(e) + '）',
        local: backfilled > 0 ? 'updated' : 'unchanged', remote: 'failed', remoteId: null,
        ...zero, backfilled, errors,
      },
      exit: 4,
    };
  }
  const doneTasks = items.filter((t) => t.status === 'done');
  const todoTasks = items.filter((t) => t.status === 'todo');

  let synced = 0; let dueAdded = 0; let dueOverridden = 0; let dueRemoved = 0;
  let skippedNoMark = 0; let skippedAlreadyDone = 0; let skippedNoLocalNote = 0;

  // 反查口径：正则反查出本地 id，再拿 `id ＋ 远端标识` **双向校验**（老 `feishu_sync.py:633`／`:674`）。
  const localOf = (mark: number | null, guid: string) => mark === null
    ? null
    : (listNotes(db).find((n) => n.id === mark && (n.feishu_task_guid ?? null) === guid) ?? null);

  // 步 2：远端完成 → 本地完成（老 `complete-wish`：删心愿 ＋ 生成打卡；D-24 回摆待签）。
  for (const t of doneTasks) {
    const mark = ownerIdOf(t.description);
    if (mark === null) { skippedNoMark += 1; continue; }
    const row = localOf(mark, t.guid);
    if (!row) { skippedNoLocalNote += 1; continue; }
    if (row.category !== WISH_TOP) { skippedAlreadyDone += 1; continue; }
    try {
      const r = completeWish(db, { id: row.id });
      synced += 1;
      if (r.exit !== 0) errors.push('完成同步 id=' + row.id + '：' + r.receipt.message);
    } catch (e) {
      errors.push('完成同步 id=' + row.id + '：' + textOf(e));
    }
  }

  // 步 3：远端改期 → 本地（仅未完成的任务；四象限按「远端优先」落地，比较结果只认日期）。
  for (const t of todoTasks) {
    const mark = ownerIdOf(t.description);
    if (!mark) { skippedNoMark += 1; continue; }
    const row = localOf(mark, t.guid);
    if (!row) { skippedNoLocalNote += 1; continue; }
    if (row.category !== WISH_TOP) { skippedAlreadyDone += 1; continue; }
    let feishuDue: string | null = null;
    try {
      feishuDue = taskDueDate(gate.cli, t.guid);
    } catch (e) {
      errors.push('取排期 id=' + row.id + '：' + textOf(e));
      continue;
    }
    const localDue = row.due ?? null;
    if (feishuDue === localDue) continue;
    updateNote(db, row.id, { due: feishuDue });
    if (feishuDue === null) dueRemoved += 1;
    else if (localDue === null) dueAdded += 1;
    else dueOverridden += 1;
  }

  const touched = synced + dueAdded + dueOverridden + dueRemoved;
  const counters: ReconcileCounters = {
    backfilled, scannedDone: doneTasks.length, synced, scannedPending: todoTasks.length,
    dueAdded, dueOverridden, dueRemoved, skippedNoMark, skippedAlreadyDone, skippedNoLocalNote, errors,
  };
  return {
    receipt: {
      ok: errors.length === 0,
      message: '对账完成：补建=' + backfilled + '，完成同步=' + synced
        + '，排期同步=' + (dueAdded + dueOverridden + dueRemoved) + '，错误=' + errors.length,
      local: touched > 0 ? 'updated' : 'unchanged',
      remote: errors.length > 0 ? 'partial' : (backfilled > 0 ? 'created' : 'synced'),
      remoteId: null,
      ...counters,
    },
    exit: errors.length === 0 ? 0 : 4,
  };
}
