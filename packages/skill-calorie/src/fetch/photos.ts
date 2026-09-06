/** T4 #23 · body_photo_tracker 取数+写数（对照老家 scripts/body_photo_tracker.py）。
 *
 * 铁律：照片二进制只存路径 + 元数据（body_photos.photo_path 仅文件名，目录由
 * CALORIE_PHOTOS_DIR 解析；缺失直接抛，不静默落盘）。gif 规划器只出任务描述
 * （planGif），不跑图像处理。getLatestWeight 归 T3（weight_log），此处不碰。
 */
import type { DatabaseSync } from 'node:sqlite';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { FetchError } from './errors.js';

export const TAG_SEP = ',';
export const TAG_MAX_LEN = 20;
export const TAG_MAX_COUNT = 10;

/** '正面, 侧面' → ['正面', '侧面']（去空白/去空项/去重保序）。 */
export function parseTags(tagStr: string | null | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of String(tagStr ?? '').split(TAG_SEP)) {
    const s = t.trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

export function serializeTags(tags: string[]): string {
  return tags.join(TAG_SEP);
}

/** 硬规则：非空 + 单个 ≤20 + 数量 ≤10（非法即抛）。 */
export function validateTags(tags: string[]): string[] {
  if (tags.length === 0) throw new FetchError('标签必填，当前是空列表');
  for (const t of tags) {
    if (t.length > TAG_MAX_LEN) throw new FetchError('标签太长(' + t.length + ' > ' + TAG_MAX_LEN + '): ' + t);
  }
  if (tags.length > TAG_MAX_COUNT) throw new FetchError('标签数量太多(' + tags.length + ' > ' + TAG_MAX_COUNT + ')');
  return tags;
}

export function tagsContain(tagStr: string | null | undefined, tag: string): boolean {
  return parseTags(tagStr).includes(tag);
}

/** 照片目录解析：显式传参 > CALORIE_PHOTOS_DIR；缺失抛（不静默落盘）。 */
export function resolvePhotosDir(dir?: string | null): string {
  const raw = dir ?? process.env.CALORIE_PHOTOS_DIR ?? '';
  if (!raw) throw new FetchError('照片目录未配置：请传参或设置 CALORIE_PHOTOS_DIR');
  mkdirSync(raw, { recursive: true });
  return resolve(raw);
}

export interface PhotoRow {
  id: number;
  date: string;
  time: string | null;
  photo_path: string;
  tag: string;
  note: string | null;
  created_at: string | null;
  tag_list: string[];
}

const PHOTO_COLS = 'id, date, time, photo_path, tag, note, created_at';

function toRow(r: Omit<PhotoRow, 'tag_list'>): PhotoRow {
  return { ...r, tag_list: parseTags(r.tag) };
}

export function getPhotoRow(db: DatabaseSync, id: number): PhotoRow | null {
  const row = db.prepare('SELECT ' + PHOTO_COLS + ' FROM body_photos WHERE id = ?').get(id) as
    | Omit<PhotoRow, 'tag_list'>
    | undefined;
  return row ? toRow(row) : null;
}

export interface ListPhotosFilter {
  days?: number;
  tag?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  limit?: number | null;
  today?: string;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftISODate(iso: string, deltaDays: number): string {
  const t = Date.parse(iso + 'T12:00:00Z');
  if (Number.isNaN(t)) throw new FetchError('日期非法: ' + iso);
  return new Date(t + deltaDays * 86400000).toISOString().slice(0, 10);
}

export function listPhotos(db: DatabaseSync, filter: ListPhotosFilter = {}): PhotoRow[] {
  const days = filter.days ?? 7;
  const where: string[] = [];
  const params: string[] = [];
  if (filter.dateFrom) {
    where.push('date >= ?');
    params.push(filter.dateFrom);
  }
  if (filter.dateTo) {
    where.push('date <= ?');
    params.push(filter.dateTo);
  }
  if (!filter.dateFrom && !filter.dateTo) {
    where.push('date >= ?');
    params.push(shiftISODate(filter.today ?? todayISO(), -days));
  }
  const rows = db
    .prepare('SELECT ' + PHOTO_COLS + ' FROM body_photos WHERE ' + where.join(' AND ') + ' ORDER BY date DESC, time DESC')
    .all(...params) as Array<Omit<PhotoRow, 'tag_list'>>;
  let out = rows.map(toRow);
  if (filter.tag) out = out.filter((r) => tagsContain(r.tag, filter.tag as string));
  const limit = filter.limit ?? 100;
  if (limit) out = out.slice(0, limit);
  return out;
}

export function daysSinceTagPhoto(db: DatabaseSync, tag: string, beforeDate: string): number | null {
  const rows = db
    .prepare('SELECT id, tag, date FROM body_photos WHERE date < ? ORDER BY date DESC, time DESC')
    .all(beforeDate) as Array<{ id: number; tag: string; date: string }>;
  for (const r of rows) {
    if (tagsContain(r.tag, tag)) {
      const delta = Math.round((Date.parse(beforeDate + 'T12:00:00Z') - Date.parse(r.date + 'T12:00:00Z')) / 86400000);
      return delta >= 0 ? delta : null;
    }
  }
  return null;
}

export interface AddPhotosInput {
  srcPaths: string[];
  tag: string;
  note?: string;
  today?: string;
  nowTime?: string;
}

/** 添加照片：文件复制进目录 + 落库（仅文件名入库）。不存在的源文件跳过。 */
export function addPhotos(db: DatabaseSync, photosDir: string, input: AddPhotosInput): Array<{ id: number; file: string }> {
  const tags = validateTags(parseTags(input.tag));
  const serialized = serializeTags(tags);
  const today = input.today ?? todayISO();
  const now = input.nowTime ?? new Date().toTimeString().slice(0, 8);
  const cnt = db.prepare('SELECT COUNT(*) AS n FROM body_photos WHERE date = ?').get(today) as { n: number };
  const added: Array<{ id: number; file: string }> = [];
  let i = 0;
  for (const srcPath of input.srcPaths) {
    if (!existsSync(srcPath)) continue;
    const ext = srcPath.slice(srcPath.lastIndexOf('.')).toLowerCase();
    const destName = today + '_' + String(cnt.n + i + 1).padStart(3, '0') + ext;
    cpSync(srcPath, join(photosDir, destName));
    const run = db
      .prepare('INSERT INTO body_photos (date, time, photo_path, tag, note) VALUES (?, ?, ?, ?, ?)')
      .run(today, now, destName, serialized, input.note ?? '');
    added.push({ id: Number(run.lastInsertRowid), file: destName });
    i += 1;
  }
  return added;
}

export function deletePhoto(db: DatabaseSync, photosDir: string, id: number): { deleted: boolean; fileDeleted: boolean } {
  const row = db.prepare('SELECT photo_path FROM body_photos WHERE id = ?').get(id) as
    | { photo_path: string }
    | undefined;
  if (!row) return { deleted: false, fileDeleted: false };
  db.prepare('DELETE FROM body_photos WHERE id = ?').run(id);
  const file = join(photosDir, basename(row.photo_path));
  if (existsSync(file)) {
    rmSync(file);
    return { deleted: true, fileDeleted: true };
  }
  return { deleted: true, fileDeleted: false };
}

export function updateTag(db: DatabaseSync, id: number, newTag: string): boolean {
  const row = db.prepare('SELECT id FROM body_photos WHERE id = ?').get(id);
  if (!row) return false;
  const serialized = serializeTags(validateTags(parseTags(newTag)));
  db.prepare('UPDATE body_photos SET tag = ? WHERE id = ?').run(serialized, id);
  return true;
}

/** 追加标签（判重）；返回新增标签数（不存在的照片回 0）。 */
export function tagAdd(db: DatabaseSync, id: number, tag: string): number {
  const photo = getPhotoRow(db, id);
  if (!photo) return 0;
  const tags = validateTags(parseTags(tag));
  const existing = [...photo.tag_list];
  let added = 0;
  for (const t of tags) {
    if (existing.includes(t)) continue;
    existing.push(t);
    added += 1;
  }
  if (added === 0) return 0;
  db.prepare('UPDATE body_photos SET tag = ? WHERE id = ?').run(serializeTags(existing), id);
  return added;
}

/** 移除单个标签（至少保留 1 个；一次只删 1 个）。 */
export function tagRemove(db: DatabaseSync, id: number, tag: string): boolean {
  const photo = getPhotoRow(db, id);
  if (!photo) return false;
  const tags = parseTags(tag);
  if (tags.length !== 1) throw new FetchError('删标签一次只删 1 个，收到 ' + tags.length + ' 个');
  const existing = [...photo.tag_list];
  const rm = tags[0] as string;
  if (!existing.includes(rm)) return false;
  if (existing.length <= 1) throw new FetchError('每张照片至少保留 1 个标签');
  db.prepare('UPDATE body_photos SET tag = ? WHERE id = ?').run(serializeTags(existing.filter((t) => t !== rm)), id);
  return true;
}

export interface GifPlanInput {
  tag: string;
  dateFrom?: string | null;
  dateTo?: string | null;
  days?: number | null;
}

/** gif 规划器：只出任务描述（起止、张数、标签），不跑图像处理、不碰二进制。 */
export function planGif(db: DatabaseSync, input: GifPlanInput): { task: 'generate_gif'; tag: string; dateFrom: string | null; dateTo: string | null; photoCount: number; photoIds: number[] } {
  const photos = listPhotos(db, { tag: input.tag, dateFrom: input.dateFrom, dateTo: input.dateTo, days: input.days ?? 30, limit: null });
  return {
    task: 'generate_gif',
    tag: input.tag,
    dateFrom: photos.length > 0 ? (photos[photos.length - 1] as PhotoRow).date : null,
    dateTo: photos.length > 0 ? (photos[0] as PhotoRow).date : null,
    photoCount: photos.length,
    photoIds: photos.map((p) => p.id),
  };
}
