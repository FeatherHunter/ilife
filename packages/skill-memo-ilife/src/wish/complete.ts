// 心愿类·完成心愿（#665）：老 `complete_wish`（`memo_cli.py:463-549`）的 TS 换皮。
// 第一性（老原文）：心愿完成的本质是原子转换——待完成项变成已完成记录。
//   ① 只认心愿（闸门）；② 删该心愿 note（关联 reminders 手动先删，外键 NO ACTION）；
//   ③ 新建一条 `打卡` note（content 默认拷贝心愿原文；reminder_id 留 NULL）；
//   ④ 单事务，失败回滚；⑤ 本地提交后，用删前快照的 guid 调远端标完成（本地优先，远端失败不影响本地）。
import { addNote, getNote, removeNote, removeReminderRowsOfNote, type MemoDb } from '../db/readonly.js';
import { larkSetupOf, openGate } from './gate.js';
import { completeRemoteWish } from './taskSync.js';
import type { WishReceipt, WishWriteResult } from './ensure.js';

const WISH_TOP = '心愿';

export interface CompleteWishInput {
  readonly id: number;
  /** 打卡内容：用户原话优先，缺省拷贝心愿原文（老原文 Step 2）。 */
  readonly content?: unknown;
}

function textOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** 完成一条心愿：删心愿 ＋ 生成打卡 ＋ 远端标完成。回执沿合成写三格。 */
export function completeWish(db: MemoDb, input: CompleteWishInput): WishWriteResult {
  const wish = getNote(db, input.id);
  if (wish.category !== WISH_TOP) {
    return {
      receipt: { ok: false, message: '非心愿，完不成：' + input.id, local: 'unchanged', remote: 'not-applicable', remoteId: wish.feishu_task_guid },
      exit: 4,
    };
  }
  const guid = wish.feishu_task_guid;
  const checkinContent =
    typeof input.content === 'string' && input.content.trim() !== '' ? input.content.trim() : wish.content;
  // 单事务：先删 reminders，再删 note，再建打卡（老原文 Step 3）。
  db.conn.exec('BEGIN IMMEDIATE');
  let checkinId = 0;
  try {
    removeReminderRowsOfNote(db, wish.id);
    removeNote(db, wish.id, true);
    checkinId = addNote(db, { content: checkinContent, category: '打卡' }).id;
    db.conn.exec('COMMIT');
  } catch (e) {
    try {
      db.conn.exec('ROLLBACK');
    } catch {
      // 回滚失败已无更好退路，如实报错。
    }
    return {
      receipt: { ok: false, message: '完成失败已回滚：' + textOf(e), local: 'unchanged', remote: 'not-applicable', remoteId: guid },
      exit: 4,
    };
  }
  const done: WishReceipt = {
    ok: true,
    message: '心愿 #' + wish.id + ' 已完成，打卡 #' + checkinId + ' 已记录',
    local: 'updated',
    remote: 'not-applicable',
    remoteId: guid,
  };
  if (!guid) return { receipt: done, exit: 0 };
  const gate = openGate();
  if (!gate.open) {
    return {
      receipt: { ...done, ok: false, message: done.message + '；远端没成（' + gate.why + '）', remote: 'unavailable', larkSetup: larkSetupOf(gate) },
      exit: 4,
    };
  }
  try {
    completeRemoteWish(gate.cli, guid);
    return { receipt: { ...done, remote: 'synced' }, exit: 0 };
  } catch (e) {
    return {
      receipt: { ...done, ok: false, message: done.message + '；远端没成（' + textOf(e) + '）', remote: 'failed' },
      exit: 4,
    };
  }
}
