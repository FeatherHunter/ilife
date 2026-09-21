/** 提醒域 · **命令的运行件**（票 #855：域逻辑搬回本域，出口只查表调用）。
 *
 * 两条命令逐字从 `src/cli/cmd_read.ts` 搬来：
 *   - `memo.remind`（读）：四视图 —— 到期（`mode:"due"`／`due:true`）／已完成（`mode:"done"`／`done:true`）／
 *     有效（缺省）／已废弃（`status:"dismissed"`）；
 *   - `memo.reminder`（写，`#850` 新开）：只 INSERT 提醒行，不建笔记；`note_id` 可选（给了校验存在，
 *     不给即独立提醒）；`content` 必填；`repeat_type` 默认一次性、一次性必须有时间（老 `add_reminder` 口径）。
 *     `memo.create` 的两步合一（记提醒）不动，读四视图仍走 `memo.remind`，两条路不混。
 *
 * 搬迁判据：`node docs/skills/skill-memo-ilife/t855-产物基线.mjs --check` 逐条一致（行为字节不变）。
 * 写参数的四件解析（`reminderNoteIdOf`／`reminderContentOf`／`reminderAtOf`／`reminderTypeRuleOf`）
 * 只有本域在用，随命令一起搬——不留第二份。
 */
import type { CommandOut } from '../shared/commandSpec.js';
import { fail } from '../shared/exit.js';
import type { MemoDb } from '../db/readonly.js';
import { addReminderRow, getNote, listReminderRows } from '../db/readonly.js';
import { checkDueReminders, listCompletedReminders } from './store.js';
import { needId } from '../shared/validators.js';
import { normalizeRemindAt, normalizeRepeatType, normalizeRepeatRule } from './policy.js';

/** `memo.remind`：提醒四视图（到期／已完成／有效／已废弃）。 */
export function runRemind(params: Record<string, unknown>, db: MemoDb): CommandOut {
  // 到期判定（老 `due`）：读＋写 notified，定时壳不搬。
  if (params.mode === 'due' || params.due === true) {
    const items = checkDueReminders(db);
    return { data: { items, total: items.length }, exit: 0 };
  }
  // 已完成视图（老 `completed`）；`done:true` 是它的兼容写法。
  if (params.mode === 'done' || params.done === true) {
    const items = listCompletedReminders(db);
    return { data: { items, total: items.length }, exit: 0 };
  }
  const status = params.status === undefined ? 'active' : String(params.status);
  if (status !== 'active' && status !== 'dismissed') fail(2, 'status 只认 active/dismissed');
  const items = listReminderRows(db, status);
  return { data: { items, total: items.length }, exit: 0 };
}

// #850 · 提醒写参数（HELP 蛇形为主，驼峰兼容既有 `memo.create` 两步合一）：`note_id`／`noteId`／`id`
// 三名同义（给了校验存在，不给即独立提醒）；`content` 必填；`remind_at`／`remindAt`／`at` 三名同义；
// `repeat_type`／`repeatType` 默认一次性，一次性必须有时间（老 `add_reminder` 口径）。
function reminderNoteIdOf(params: Record<string, unknown>): number | null {
  const v = params.note_id !== undefined ? params.note_id : params.noteId !== undefined ? params.noteId : undefined;
  if (v === undefined || v === null || v === '') return null;
  return needId(v, '提醒关联笔记');
}

function reminderContentOf(params: Record<string, unknown>): string {
  const v = params.content !== undefined ? params.content : params.body !== undefined ? params.body : params.title;
  if (typeof v !== 'string' || v.trim().length === 0) fail(2, '请填入提醒内容');
  return (v as string).trim();
}

function reminderAtOf(params: Record<string, unknown>): string | null {
  const v = params.remind_at !== undefined ? params.remind_at : params.remindAt !== undefined ? params.remindAt : params.at;
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string') fail(2, '提醒时间须为 YYYY-MM-DD HH:MM');
  return normalizeRemindAt(v);
}

function reminderTypeRuleOf(params: Record<string, unknown>, at: string | null): { type: string; rule: string | null } {
  const rawType = params.repeat_type !== undefined ? params.repeat_type : params.repeatType;
  const type = normalizeRepeatType(rawType);
  const rawRule = params.repeat_rule !== undefined ? params.repeat_rule : params.repeatRule !== undefined ? params.repeatRule : params.rule;
  const rule = normalizeRepeatRule(type, rawRule, at);
  if (type === '一次性' && !at) fail(2, '一次性提醒必须给提醒时间');
  return { type, rule };
}

/** `memo.reminder`：给已有笔记加提醒（`note_id` 可选）或建一条独立提醒；只 INSERT，不建笔记。 */
export function runReminder(params: Record<string, unknown>, db: MemoDb): CommandOut {
  const noteId = reminderNoteIdOf(params);
  if (noteId !== null) {
    try { getNote(db, noteId); } catch { fail(4, '无此笔记：' + noteId); }
  }
  const content = reminderContentOf(params);
  const at = reminderAtOf(params);
  const { type, rule } = reminderTypeRuleOf(params, at);
  const row = addReminderRow(db, {
    note_id: noteId,
    remind_at: at,
    repeat_type: type,
    repeat_rule: rule,
    content,
  });
  return {
    data: {
      ok: true,
      message: '提醒已设置' + (noteId !== null ? '（笔记 ' + noteId + '）' : '（独立提醒）') + '：' + row.id,
      id: row.id,
      note_id: row.note_id,
      remind_at: row.remind_at,
      repeat_type: row.repeat_type,
      repeat_rule: row.repeat_rule,
      content: row.content,
    },
    exit: 0,
  };
}
