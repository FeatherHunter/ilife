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
import { toRows } from '../shared/rows.js';
import { normalizeRemindAt, normalizeRepeatType, normalizeRepeatRule } from './policy.js';
import { buildListPage, buildReceiptPage, querySnapshot, type ListPageScene } from '../render/index.js';

/** 本条命令的**两格产物**（册子 seq 16／17）：一个视图，两种页。
 *  词随它服务的 HELP 场景住（#855 口径），故场景 id 由调用它的路由声明给；不带即「看提醒」那一格。 */
const SCENE_REMINDERS_ACTIVE: ListPageScene = 'memo_reminders_active';
const SCENE_COMPLETED: ListPageScene = 'memo_completed_reminders';
function sceneOf(params: Record<string, unknown>): ListPageScene {
  const s = params.scene;
  if (s === SCENE_COMPLETED) return SCENE_COMPLETED;
  if (s === undefined || s === '' || s === SCENE_REMINDERS_ACTIVE) return SCENE_REMINDERS_ACTIVE;
  fail(2, 'scene 只认 ' + SCENE_REMINDERS_ACTIVE + '／' + SCENE_COMPLETED);
}

/** `memo.remind`：提醒四视图（到期／已完成／有效／已废弃）。 */
export function runRemind(params: Record<string, unknown>, db: MemoDb): CommandOut {
  // 到期判定（老 `due`）：读＋写 notified，定时壳不搬。**到期这一支不出页**——册子本域只有两格
  // （seq 16「看提醒」／seq 17「查已提醒备忘」），到期是壳里的触发视图，等 #834 收口时另判。
  if (params.mode === 'due' || params.due === true) {
    const items = checkDueReminders(db);
    return { data: { items, total: items.length }, exit: 0 };
  }
  // 已完成视图（老 `completed`）：提醒行 ＋ 它带出来的打卡笔记 ＋ 触发时间（`listCompletedReminders`）。
  if (params.mode === 'done' || params.done === true) {
    const items = listCompletedReminders(db);
    const snap = querySnapshot(toRows(items));
    return {
      data: { items, total: items.length },
      exit: 0,
      deliver: buildListPage({
        scene: SCENE_COMPLETED,
        title: '查已提醒备忘',
        subtitle: items.length === 0
          ? '还没有「已触发并打了卡」的提醒'
          : '已被打卡带回的提醒 ' + items.length + ' 条',
        summary: snap.summary,
        sections: snap.sections,
        copyLog: {
          thinking: '已触发提醒视图 · 提醒行经打卡笔记的 reminder_id 反查（老 completed_reminders 口径）',
          data_structure: 'reminders 表 × notes 表（category=打卡）· reminder_content／checkin_content／checkin_at／period',
          call_chain: 'memo.remind done:true → listCompletedReminders → querySnapshot → buildListPage(memo_query) → deliver 钩子落盘',
          exception: '无',
        },
        items,
      }),
    };
  }
  const status = params.status === undefined ? 'active' : String(params.status);
  if (status !== 'active' && status !== 'dismissed') fail(2, 'status 只认 active/dismissed');
  const items = listReminderRows(db, status);
  const snap = querySnapshot(toRows(items));
  const scene = sceneOf(params);
  return {
    data: { items, total: items.length },
    exit: 0,
    deliver: buildListPage({
      scene,
      title: '看提醒',
      subtitle: items.length === 0
        ? (status === 'active' ? '没有有效提醒' : '没有已废弃提醒')
        : (status === 'active' ? '有效期内的提醒 ' : '已废弃的提醒 ') + items.length + ' 条',
      summary: snap.summary,
      sections: snap.sections,
      copyLog: {
        // #858：看提醒页的状态说明补上**已废弃语义与废弃调用形**——「废弃提醒」这条唤醒词已退役
        // （#842 Q②），能力仍在 `memo.remove` 的 `mode:"abandon"` 支上，故调用形要在页内读得到，
        // 不必翻速查表。HELP 交付面写不了这句：那份资产的可见文案闸（`VISIBLE_FORBIDDEN`）禁 `memo.`／`--`。
        thinking: '提醒列表视图 · ' + (status === 'active'
          ? '只看有效（status=active）；已废弃＝撤下这条提醒、笔记保留，调用形 memo.remove --params \'{"mode":"abandon","id":<提醒 id>}\'（独立废弃支，不经删确认闸）'
          : '只看已废弃（status=dismissed）；废弃＝提醒撤下、笔记保留，调用形 memo.remove --params \'{"mode":"abandon","id":<提醒 id>}\'（独立废弃支，不经删确认闸）'),
        data_structure: 'reminders 表 · id／note_id／remind_at／repeat_type／repeat_rule／content／status／note_content',
        call_chain: 'memo.remind → listReminderRows → querySnapshot → buildListPage(memo_query) → deliver 钩子落盘',
        exception: '无',
      },
      items,
    }),
  };
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

/** 提醒状态 → 人话（#876）：`reminders.status` 是 `active`／`dismissed` 两个**后端取值**，
 *  印给用户看的要换成中文。两个中文说法取自本域既有的那一套（列表视图副标题写
 *  「有效期内的提醒 N 条」／「已废弃的提醒 N 条」，`src/help/scenes/remind.ts` 的参数说明写
 *  「有效(默认)／已废弃」），不去造第三套词。不认得的取值原样透出，不静默吞掉。 */
const STATUS_LABEL: Record<string, string> = { active: '有效', dismissed: '已废弃' };

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
  // #828 · 缺省落「设提醒」那一格（册子 seq 15，通用回执族）。关联笔记时对象行写那条笔记，
  // 独立提醒时写提醒自己——两种都从库里的行取（权威），不照抄入参。
  const note = noteId === null ? null : getNote(db, noteId);
  const deliver = buildReceiptPage({
    scene: 'memo_remind_existing',
    title: '设提醒',
    message: '提醒已设置' + (noteId !== null ? '（笔记 ' + noteId + '）' : '（独立提醒）'),
    badges: { category: note === null ? '独立提醒' : note.category, sub: note === null ? null : note.sub_category },
    summary: [
      note === null ? '对象：独立提醒（未关联笔记）' : '对象：' + note.content.slice(0, 40),
      '提醒时间：' + (at ?? '(未定)'),
      '重复：' + type + (rule === null ? '' : '（' + rule + '）'),
      '提醒内容：' + content,
    ],
    sections: [
      // #876 · 这三行原先是库行 dump（`提醒 ID：4`／`状态：active`）：`ID` 是**列名裸奔**、
      // `active` 是**后端取值上屏**。改成人话后同两样信息都还在，且 4 号那条提醒仍指代得清。
      { heading: '提醒行', rows: ['提醒编号：' + row.id, '状态：' + (STATUS_LABEL[row.status] ?? row.status), '写入时间：' + row.created_at] },
    ],
    receipt: {
      entityLabel: note === null ? '提醒' : note.category,
      entityId: note === null ? row.id : note.id,
      local: 'created',
      remote: 'not-applicable',
      remoteId: null,
    },
    copyLog: {
      thinking: '设提醒 · 只 INSERT 提醒行，不建笔记（老 `remind [note_id] --at --content` 口径）',
      data_structure: 'reminders 表 · note_id／remind_at／repeat_type／repeat_rule／content／status',
      call_chain: 'memo.reminder → addReminderRow → buildReceiptPage → fillMemoPage(receipt) → deliver 钩子落盘',
      exception: '无',
    },
    retryPrompt: '若这条提醒不对，请把要改的提醒编号与要改成的样子发我，我废弃旧条重开一条：设提醒',
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
    deliver,
  };
}
