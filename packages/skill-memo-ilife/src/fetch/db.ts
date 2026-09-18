// 取数层·SQLite 直连（负责人 2026-09-17 裁定：老技能是权威，新仓直连老库文件，结构不动）。
//
// 对照老 `script/init.sql`（仓外只读）：`notes`＋`reminders` 两张业务表及全部列语义原样承认，
// 本文件只做 DML（增删改查），**禁 DDL**（不建表、不改表、不建索引）；连接只开 `foreign_keys=ON`
// （当连接生效，不落盘），不碰 `journal_mode`（那是落盘状态，老库是什么就是什么）。
// 打开前先 stat：文件不在即抛 `MEMO_DB_MISSING`，绝不让驱动建出空库文件。
import { accessSync, constants, statSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { MemoFetchError } from './errors.js';
import { dbFilename } from './paths.js';

/** 老 `notes` 行（`init.sql` 逐列：id 自增整数／content 正文／summary 短摘要／category／sub_category／
 *  media_path 附件相对路径／reminder_id 打卡追溯来源／feishu_task_guid 远端标识回写／due 排期日期／
 *  created_at／updated_at 本地时间 `YYYY-MM-DD HH:MM:SS`）。 */
export interface MemoNote {
  readonly id: number;
  readonly content: string;
  readonly summary: string | null;
  readonly category: string;
  readonly sub_category: string | null;
  readonly media_path: string | null;
  readonly reminder_id: number | null;
  readonly feishu_task_guid: string | null;
  readonly due: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

/** 老 `reminders` 行（`init.sql` 逐列：note_id 归属笔记／remind_at `YYYY-MM-DD HH:MM`／repeat_type
 *  一次性|每天|每周|每月|每年／repeat_rule／status active|dismissed／notified_at／content 提醒独有正文）。 */
export interface MemoReminder {
  readonly id: number;
  readonly note_id: number | null;
  readonly remind_at: string | null;
  readonly repeat_type: string;
  readonly repeat_rule: string | null;
  readonly status: string;
  readonly notified_at: string | null;
  readonly content: string | null;
  readonly created_at: string;
}

export interface MemoDb {
  readonly file: string;
  readonly conn: DatabaseSync;
}

// 老定位规则（`memo_cli.py:47-59`）：库目录下的 `memo.db`。库目录从哪来见 `./paths.js`
// （#695 起＝配置文件的唯一真相，环境变量 `SKILLS_DB_PATH` 已删）；此处不再做 `D:/.db` fallback，不静默换库。
export function memoDbFile(dbDir: string): string {
  return join(dbDir, dbFilename());
}

/** 打开老库文件：不存在／不是文件／不可读即抛（调用方阻断取数）。成功则开连接＋外键，不做别的。 */
export function openMemoDb(dbDir: string): MemoDb {
  if (typeof dbDir !== 'string' || dbDir.length === 0) {
    throw new MemoFetchError('MEMO_DB_MISSING', 'memo DB 目录未指定');
  }
  const file = memoDbFile(dbDir);
  let st = null;
  try {
    st = statSync(file);
  } catch {
    throw new MemoFetchError('MEMO_DB_MISSING', 'memo DB 文件不存在：' + file);
  }
  if (!st.isFile()) throw new MemoFetchError('MEMO_DB_MISSING', 'memo DB 非文件：' + file);
  try {
    accessSync(file, constants.R_OK);
  } catch {
    throw new MemoFetchError('MEMO_DB_UNREADABLE', 'memo DB 不可读：' + file);
  }
  const conn = new DatabaseSync(file);
  conn.exec('PRAGMA foreign_keys = ON');
  return { file, conn };
}

export function closeMemoDb(db: MemoDb): void {
  db.conn.close();
}

function rowNote(r: Record<string, unknown>): MemoNote {
  return {
    id: r.id as number,
    content: r.content as string,
    summary: (r.summary as string | null) ?? null,
    category: r.category as string,
    sub_category: (r.sub_category as string | null) ?? null,
    media_path: (r.media_path as string | null) ?? null,
    reminder_id: (r.reminder_id as number | null) ?? null,
    feishu_task_guid: (r.feishu_task_guid as string | null) ?? null,
    due: (r.due as string | null) ?? null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

function rowReminder(r: Record<string, unknown>): MemoReminder {
  return {
    id: r.id as number,
    note_id: (r.note_id as number | null) ?? null,
    remind_at: (r.remind_at as string | null) ?? null,
    repeat_type: (r.repeat_type as string) ?? '一次性',
    repeat_rule: (r.repeat_rule as string | null) ?? null,
    status: (r.status as string) ?? 'active',
    notified_at: (r.notified_at as string | null) ?? null,
    content: (r.content as string | null) ?? null,
    created_at: r.created_at as string,
  };
}

/** 列全部笔记（确定性按 id 排序；空库返 [] 仅表示真实无记录）。 */
export function listNotes(db: MemoDb): MemoNote[] {
  return (db.conn.prepare('SELECT * FROM notes ORDER BY id').all() as Record<string, unknown>[]).map(rowNote);
}

/** 取一条：对不上即抛，不返空对象。id 须为正整数（老 `get_note` 口径）。 */
export function getNote(db: MemoDb, id: number): MemoNote {
  if (!Number.isInteger(id) || id <= 0) throw new MemoFetchError('MEMO_NOTE_NOT_FOUND', '笔记 id 须为正整数');
  const r = db.conn.prepare('SELECT * FROM notes WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!r) throw new MemoFetchError('MEMO_NOTE_NOT_FOUND', '无此笔记：' + id);
  return rowNote(r);
}

function likeEscape(s: string): string {
  return s.replace(/[\\%_]/g, (c) => '\\' + c);
}

// CJK 搜索（老 `search_notes` 口径）：分词即按空白切 token（CJK 不切字），每 token 须为正文子串；
// 空查询抛错不返全量。分类／子分类／排期日的过滤与老 `--category／--sub／--due` 同形。
export function searchNotes(
  db: MemoDb,
  query: string,
  filter?: { category?: string; sub?: string; due?: string | null },
): MemoNote[] {
  if (typeof query !== 'string' || query.trim().length === 0) {
    throw new MemoFetchError('MEMO_BAD_QUERY', '搜索须给关键词（空查询不返全量）');
  }
  const tokens = query.trim().split(/\s+/);
  const where: string[] = [];
  const params: (string | number | null)[] = [];
  for (const t of tokens) {
    where.push("content LIKE ? ESCAPE '\\'");
    params.push('%' + likeEscape(t) + '%');
  }
  if (filter?.category !== undefined) {
    where.push('category = ?');
    params.push(filter.category);
  }
  if (filter?.sub !== undefined) {
    where.push('sub_category IS ?');
    params.push(filter.sub);
  }
  if (filter?.due !== undefined) {
    if (filter.due === null) where.push('due IS NULL');
    else {
      where.push('due = ?');
      params.push(filter.due);
    }
  }
  const rows = db.conn
    .prepare('SELECT * FROM notes WHERE ' + where.join(' AND ') + ' ORDER BY id')
    .all(...params) as Record<string, unknown>[];
  return rows.map(rowNote);
}

export interface AddNoteInput {
  readonly content: string;
  readonly summary?: string | null;
  readonly category: string;
  readonly sub_category?: string | null;
  readonly media_path?: string | null;
  readonly due?: string | null;
}

// 新增（老 `add_note` 的落盘形状）：content 必填非空；summary／子分类／附件／排期可空；
// reminder_id 与远端标识不在建时写（前者由打卡追溯链写，后者由同步成功后回写）。
export function addNote(db: MemoDb, input: AddNoteInput): MemoNote {
  const content = input.content.trim();
  if (!content) throw new MemoFetchError('MEMO_BAD_QUERY', '新建须给正文');
  const r = db.conn
    .prepare(
      "INSERT INTO notes (content, summary, category, sub_category, media_path, due, created_at, updated_at) " +
        "VALUES (?, ?, ?, ?, ?, ?, datetime('now','localtime'), datetime('now','localtime'))",
    )
    .run(
      content,
      input.summary ?? null,
      input.category,
      input.sub_category ?? null,
      input.media_path ?? null,
      input.due ?? null,
    );
  return getNote(db, Number(r.lastInsertRowid));
}

const NOTE_PATCH_COLS = [
  'content',
  'summary',
  'category',
  'sub_category',
  'media_path',
  'reminder_id',
  'feishu_task_guid',
  'due',
] as const;
export type NotePatch = { -readonly [K in (typeof NOTE_PATCH_COLS)[number]]?: MemoNote[K] };

// 更新：只合已知列；对不中抛。`updated_at` 照老口径走库时间。
export function updateNote(db: MemoDb, id: number, patch: NotePatch): MemoNote {
  getNote(db, id);
  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  for (const c of NOTE_PATCH_COLS) {
    if (Object.prototype.hasOwnProperty.call(patch, c)) {
      sets.push(c + ' = ?');
      params.push((patch[c] as string | number | null) ?? null);
    }
  }
  if (sets.length === 0) throw new MemoFetchError('MEMO_BAD_QUERY', '更新须给字段：' + id);
  sets.push("updated_at = datetime('now','localtime')");
  params.push(id);
  db.conn.prepare('UPDATE notes SET ' + sets.join(', ') + ' WHERE id = ?').run(...params);
  return getNote(db, id);
}

// 删除：须 confirm:true（废弃提醒走 abandon 语义，见 policy）。删后读回确认。
// 外键是 NO ACTION：调用方须先删该笔记的 reminders（老 `delete_note`／`complete_wish` 同形），否则库抛错。
export function removeNote(db: MemoDb, id: number, confirm: boolean): void {
  getNote(db, id);
  if (confirm !== true) throw new MemoFetchError('MEMO_DB_UNREADABLE', '删除须 confirm:true：' + id);
  db.conn.prepare('DELETE FROM notes WHERE id = ?').run(id);
  if (db.conn.prepare('SELECT id FROM notes WHERE id = ?').get(id)) {
    throw new MemoFetchError('MEMO_DB_UNREADABLE', '笔记删除失败：' + id);
  }
}

// ---- reminders 表行级读写（判定逻辑住 `reminders.ts`，此处只做行存取）----

export function listReminderRows(db: MemoDb, status?: string): (MemoReminder & { readonly note_content: string | null })[] {
  const base =
    'SELECT r.*, n.content AS note_content FROM reminders r LEFT JOIN notes n ON r.note_id = n.id';
  const rows =
    status === undefined
      ? ((db.conn.prepare(base + ' ORDER BY r.id').all() as Record<string, unknown>[]))
      : ((db.conn
          .prepare(base + ' WHERE r.status = ? ORDER BY r.id')
          .all(status) as Record<string, unknown>[]));
  return rows.map((r) => ({ ...rowReminder(r), note_content: (r.note_content as string | null) ?? null }));
}

export function countReminderRowsOfNote(db: MemoDb, noteId: number): number {
  const r = db.conn.prepare('SELECT COUNT(*) AS c FROM reminders WHERE note_id = ?').get(noteId) as { c: number };
  return r.c;
}

export function getReminderRow(db: MemoDb, id: number): MemoReminder {
  if (!Number.isInteger(id) || id <= 0) throw new MemoFetchError('MEMO_NOTE_NOT_FOUND', '提醒 id 须为正整数');
  const r = db.conn.prepare('SELECT * FROM reminders WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!r) throw new MemoFetchError('MEMO_NOTE_NOT_FOUND', '无此提醒：' + id);
  return rowReminder(r);
}

export interface AddReminderInput {
  readonly note_id: number | null;
  readonly remind_at: string | null;
  readonly repeat_type: string;
  readonly repeat_rule?: string | null;
  readonly content: string;
}

// 新增提醒行（老 `add_reminder` 的落盘形状）：note_id 有值时须存在；`note_id` 列是 NOT NULL，
// 传空即库错大声失败（老实现同形，不静默）。
export function addReminderRow(db: MemoDb, input: AddReminderInput): MemoReminder {
  if (input.note_id !== null) getNote(db, input.note_id);
  const r = db.conn
    .prepare(
      "INSERT INTO reminders (note_id, remind_at, repeat_type, repeat_rule, content, created_at) " +
        "VALUES (?, ?, ?, ?, ?, datetime('now','localtime'))",
    )
    .run(input.note_id, input.remind_at, input.repeat_type, input.repeat_rule ?? null, input.content);
  return getReminderRow(db, Number(r.lastInsertRowid));
}

export function setReminderRow(
  db: MemoDb,
  id: number,
  patch: { status?: string; notified_at?: string | null },
): MemoReminder {
  getReminderRow(db, id);
  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  if (patch.status !== undefined) {
    sets.push('status = ?');
    params.push(patch.status);
  }
  if (patch.notified_at !== undefined) {
    sets.push('notified_at = ?');
    params.push(patch.notified_at);
  }
  if (sets.length === 0) throw new MemoFetchError('MEMO_BAD_QUERY', '提醒更新须给字段：' + id);
  params.push(id);
  db.conn.prepare('UPDATE reminders SET ' + sets.join(', ') + ' WHERE id = ?').run(...params);
  return getReminderRow(db, id);
}

export function removeReminderRowsOfNote(db: MemoDb, noteId: number): number {
  const r = db.conn.prepare('DELETE FROM reminders WHERE note_id = ?').run(noteId);
  return Number(r.changes);
}
