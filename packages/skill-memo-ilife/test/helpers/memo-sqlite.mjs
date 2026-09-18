// 备忘录测试 helper（#665）：临时 SQLite 库。DDL 只有一处定义——`tooling/contract-seam.mjs`
// 的 `MEMO_TEST_SCHEMA_DDL`（mirror 老 `script/init.sql` 的两张业务表；FTS 虚表与触发器不 mirror——
// 老家 #180 已停用 FTS 查询路径，测试库不需要全文副表；见证据件）。
// 铁律：只建临时库（库目录＝配置项 `db.dir`，测试里指向 tmp），绝不碰活库 `D:\2Study\StudyNotes\.db`。
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { initMemoTestDb } from '../../../../tooling/contract-seam.mjs';

/** 建一个临时库，返回可直接当 `db.dir` 用的目录（含 `memo.db`）。 */
export function mkMemoDb(prefix = 'memo-665-') {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  initMemoTestDb(join(dir, 'memo.db'));
  return dir;
}

/** 直插一条笔记，返回自增 id。 */
export function seedNote(
  dir,
  { content = '正文', category = '备忘', sub = null, media = null, due = null, guid = null } = {},
) {
  const db = new DatabaseSync(join(dir, 'memo.db'));
  try {
    const r = db
      .prepare(
        'INSERT INTO notes (content, category, sub_category, media_path, due, feishu_task_guid) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(content, category, sub, media, due, guid);
    return Number(r.lastInsertRowid);
  } finally {
    db.close();
  }
}

/** 直插一条提醒，返回自增 id。 */
export function seedReminder(
  dir,
  { noteId, at = null, type = '一次性', rule = null, content = '提醒', status = 'active', notified = null } = {},
) {
  const db = new DatabaseSync(join(dir, 'memo.db'));
  try {
    const r = db
      .prepare(
        'INSERT INTO reminders (note_id, remind_at, repeat_type, repeat_rule, content, status, notified_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(noteId, at, type, rule, content, status, notified);
    return Number(r.lastInsertRowid);
  } finally {
    db.close();
  }
}

/** 数笔记行数（断言落盘用）。 */
export function countNotes(dir) {
  const db = new DatabaseSync(join(dir, 'memo.db'));
  try {
    return (db.prepare('SELECT COUNT(*) AS c FROM notes').get()).c;
  } finally {
    db.close();
  }
}
