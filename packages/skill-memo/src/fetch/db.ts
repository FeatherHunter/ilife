// 取数层·文件 DB（M2）：SKILLS_DB_PATH 下 memo 目录 *.json 笔记；缺失/损坏大声失败，不返空。
import { accessSync, constants, readdirSync, readFileSync, statSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { MemoFetchError } from './errors.js';

export interface MemoNote {
  id: string;
  title: string;
  body: string;
  category: string;
  sub?: string | null;
  createdAt: string;
  updatedAt: string;
  remindAt?: string | null;
  done?: boolean;
}

export interface MemoDb { dir: string; }

// 打开 DB 目录：不存在/不可读即 throw（调用方阻断取数）。
export function openMemoDb(dir: string): MemoDb {
  if (typeof dir !== 'string' || dir.length === 0) throw new MemoFetchError('MEMO_DB_MISSING', 'memo DB 目录未指定');
  let st = null;
  try { st = statSync(dir); } catch { throw new MemoFetchError('MEMO_DB_MISSING', 'memo DB 目录不存在：' + dir); }
  if (!st.isDirectory()) throw new MemoFetchError('MEMO_DB_MISSING', 'memo DB 非目录：' + dir);
  try { accessSync(dir, constants.R_OK); }
  catch { throw new MemoFetchError('MEMO_DB_UNREADABLE', 'memo DB 不可读：' + dir); }
  return { dir };
}

function parseNoteFile(path: string, name: string): MemoNote {
  let raw: unknown = null;
  try { raw = JSON.parse(readFileSync(path, 'utf8')); }
  catch (e) { throw new MemoFetchError('MEMO_NOTE_CORRUPT', '笔记解析失败：' + name, { cause: e }); }
  const n = raw as Record<string, unknown>;
  for (const f of ['id', 'title', 'body', 'category', 'createdAt', 'updatedAt']) {
    if (typeof n[f] !== 'string' || (n[f] as string).length === 0) {
      throw new MemoFetchError('MEMO_NOTE_CORRUPT', '笔记缺字段 ' + f + '：' + name);
    }
  }
  return n as unknown as MemoNote;
}

// 列全部笔记（确定性按文件名排序；空目录返 [] 仅表示真实无记录）。
export function listNotes(db: MemoDb): MemoNote[] {
  const names = readdirSync(db.dir).filter((f) => f.endsWith('.json')).sort();
  return names.map((n) => parseNoteFile(join(db.dir, n), n));
}

function stamp(): string { return new Date().toISOString(); }

// 新增：id 唯一（m+36进制时间+随机），写盘即读回校验；失败 throw 不谎报回执。
export function addNote(db: MemoDb, input: { title: string; body: string; category: string; sub?: string | null; remindAt?: string | null }): MemoNote {
  const id = 'm' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
  const now = stamp();
  const note: MemoNote = { id, title: input.title, body: input.body, category: input.category, sub: input.sub ?? null, createdAt: now, updatedAt: now, remindAt: input.remindAt ?? null, done: false };
  const p = join(db.dir, id + '.json');
  try { writeFileSync(p, JSON.stringify(note, null, 2), 'utf8'); }
  catch (e) { throw new MemoFetchError('MEMO_DB_UNREADABLE', '笔记写盘失败：' + id); }
  return getNote(db, id);
}

// 更新：只合已知字段；对不上 throw。
export function updateNote(db: MemoDb, id: string, patch: Partial<MemoNote>): MemoNote {
  const cur = getNote(db, id);
  const next: MemoNote = { ...cur, ...patch, id: cur.id, createdAt: cur.createdAt, updatedAt: stamp() };
  const p = join(db.dir, id + '.json');
  try { writeFileSync(p, JSON.stringify(next, null, 2), 'utf8'); }
  catch (e) { throw new MemoFetchError('MEMO_DB_UNREADABLE', '笔记更新失败：' + id); }
  return next;
}

// 删除：须 confirm:true（废弃提醒走 abandon 语义，见 policy）；删后读回确认。
export function removeNote(db: MemoDb, id: string, confirm: boolean): void {
  getNote(db, id);
  if (confirm !== true) throw new MemoFetchError('MEMO_DB_UNREADABLE', '删除须 confirm:true：' + id);
  const p = join(db.dir, id + '.json');
  try { unlinkSync(p); }
  catch (e) { throw new MemoFetchError('MEMO_DB_UNREADABLE', '笔记删除失败：' + id); }
}

// 取一条：对不上即 throw，不返空对象。
export function getNote(db: MemoDb, id: string): MemoNote {
  if (typeof id !== 'string' || id.length === 0) throw new MemoFetchError('MEMO_NOTE_NOT_FOUND', '笔记 id 为空');
  for (const n of listNotes(db)) {
    if (n.id === id) return n;
  }
  throw new MemoFetchError('MEMO_NOTE_NOT_FOUND', '无此笔记：' + id);
}

function norm(s: string): string { return s.toLowerCase(); }

// CJK 搜索：分词即按空白切 token（CJK 不切字），每 token 须为标题+正文子串；空查询 throw。
export function searchNotes(db: MemoDb, query: string, filter?: { category?: string; sub?: string }): MemoNote[] {
  if (typeof query !== 'string' || query.trim().length === 0) {
    throw new MemoFetchError('MEMO_BAD_QUERY', '搜索须给关键词（空查询不返全量）');
  }
  const tokens = query.trim().split(/\s+/).map(norm);
  return listNotes(db).filter((n) => {
    if (filter?.category !== undefined && n.category !== filter.category) return false;
    if (filter?.sub !== undefined && (n.sub || null) !== filter.sub) return false;
    const hay = norm(n.title + '\n' + n.body);
    return tokens.every((t) => hay.includes(t));
  });
}
