/** T10 #29 · 身材照片渲染数据（对照老家 render_body_photo_receipt/gallery/compare/viewer/gif_result）。
 *
 * 铁律直通 T4：照片二进制只存路径 + 元数据——本层只透出 photo_path 文件名与
 * fileExists 存在位，永不读文件字节、不做 base64 内嵌（老家 PIL 缩放+q75 内嵌
 * 在此有意舍弃，飞书自包含改由调用方按需处理）；gif 只出 planGif 任务描述，
 * 不跑图像合成、不碰二进制。写库一律走 T4 fetch，本层只做呈现组装。
 * 缺失阻断不返空：空窗/无行即 missing-data，同体不合并走 bad-input。
 */
import type { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import {
  getPhotoRow, listPhotos, planGif, tagsContain,
  type PhotoRow,
} from '../fetch/photos.js';
import { shiftISODate, todayISO } from '../analysis/utils.js';
import { CalorieRenderError } from './errors.js';
import { buildCrudReceipt, type CrudReceipt, type PhotoDistance } from './receipt.js';

export interface PhotoCard {
  id: number;
  date: string;
  time: string | null;
  photoPath: string;
  tagList: string[];
  note: string | null;
  /** null = 未传 photosDir（未知，不断言）；true/false = 存在性实测。 */
  fileExists: boolean | null;
}

export function toCard(row: PhotoRow, photosDir?: string | null): PhotoCard {
  let fileExists: boolean | null = null;
  if (photosDir) {
    try {
      fileExists = existsSync(join(photosDir, basename(row.photo_path)));
    } catch {
      fileExists = false;
    }
  }
  return {
    id: row.id,
    date: row.date,
    time: row.time,
    photoPath: basename(row.photo_path),
    tagList: [...row.tag_list],
    note: row.note,
    fileExists,
  };
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function assertISO(v: string, field: string): void {
  if (!ISO_RE.test(v)) throw new CalorieRenderError('bad-input', field + ' 非法（须 YYYY-MM-DD）：' + v);
}

function diffDays(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000);
}

export interface GalleryFilter {
  dateFrom?: string;
  dateTo?: string;
  days?: number;
  tag?: string;
  limit?: number | null;
  today?: string;
}

export interface GalleryData {
  scene: '看身材照';
  filters: { tag: string; dateFrom: string; dateTo: string };
  totalCount: number;
  tagCounts: { tag: string; count: number }[];
  daysSinceLast: number | null;
  photos: PhotoCard[];
}

/** 看身材照：网格 + 时间/标签筛选 + 计数（老家 gallery build 对应，默认 90 天窗）。 */
export function buildGalleryData(db: DatabaseSync, filter: GalleryFilter = {}, photosDir?: string | null): GalleryData {
  const today = filter.today ?? todayISO();
  assertISO(today, 'today');
  let dateFrom = filter.dateFrom ?? '';
  let dateTo = filter.dateTo ?? '';
  if (dateFrom) assertISO(dateFrom, 'dateFrom');
  if (dateTo) assertISO(dateTo, 'dateTo');
  if (dateFrom && !dateTo) dateTo = dateFrom;
  if (!dateFrom && !dateTo) {
    const days = filter.days ?? 90;
    if (!Number.isInteger(days) || days < 1 || days > 36500) {
      throw new CalorieRenderError('bad-input', 'days 须为 1..36500 整数');
    }
    dateTo = today;
    dateFrom = shiftISODate(today, -(days - 1));
  }
  if (dateFrom > dateTo) throw new CalorieRenderError('bad-input', 'dateFrom 不得晚于 dateTo');
  const rows = listPhotos(db, {
    dateFrom,
    dateTo,
    tag: filter.tag ?? null,
    limit: filter.limit === undefined ? 500 : filter.limit,
  });
  if (rows.length === 0) {
    throw new CalorieRenderError('missing-data', '无身材照（' + dateFrom + ' ~ ' + dateTo + (filter.tag ? ' · 标签 ' + filter.tag : '') + '）');
  }
  const counts = new Map<string, number>();
  for (const r of listPhotos(db, { days: 36500, limit: null })) {
    for (const t of r.tag_list) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  const daysSinceLast = diffDays(rows[0]?.date as string, today) >= 0 ? diffDays(rows[0]?.date as string, today) : null;
  return {
    scene: '看身材照',
    filters: { tag: filter.tag ?? '', dateFrom, dateTo },
    totalCount: rows.length,
    tagCounts: [...counts.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([tag, count]) => ({ tag, count })),
    daysSinceLast,
    photos: rows.map((r) => toCard(r, photosDir)),
  };
}

export interface CompareData {
  scene: '对比两张照片';
  photo1: PhotoCard;
  photo2: PhotoCard;
  intervalDays: number;
  orderByDate: boolean;
  crossTagWarning: boolean;
}

/** 对比两张照片：并排 + 间隔天数 + 跨标签警告（老家方案 B：警告不拦截）。 */
export function buildCompareData(db: DatabaseSync, id1: number, id2: number, photosDir?: string | null): CompareData {
  if (!Number.isInteger(id1) || !Number.isInteger(id2)) {
    throw new CalorieRenderError('bad-input', '照片 id 须为整数');
  }
  if (id1 === id2) throw new CalorieRenderError('bad-input', '对比的两张照片不能是同一张');
  const p1 = getPhotoRow(db, id1);
  if (!p1) throw new CalorieRenderError('missing-data', '照片 #' + id1 + ' 不存在');
  const p2 = getPhotoRow(db, id2);
  if (!p2) throw new CalorieRenderError('missing-data', '照片 #' + id2 + ' 不存在');
  const intervalDays = Math.abs(diffDays(p1.date, p2.date));
  const crossTagWarning = [...p1.tag_list].sort().join(',') !== [...p2.tag_list].sort().join(',');
  return {
    scene: '对比两张照片',
    photo1: toCard(p1, photosDir),
    photo2: toCard(p2, photosDir),
    intervalDays,
    orderByDate: p1.date <= p2.date,
    crossTagWarning,
  };
}

export interface ViewerData {
  scene: '查身材照';
  photo: PhotoCard;
  prevId: number | null;
  nextId: number | null;
}

/** 单图查看：照片 + 同标签 prev/next（老家 viewer 邻居口径：同 tag 按日期排序）。 */
export function buildViewerData(db: DatabaseSync, id: number, photosDir?: string | null): ViewerData {
  if (!Number.isInteger(id)) throw new CalorieRenderError('bad-input', '照片 id 须为整数');
  const row = getPhotoRow(db, id);
  if (!row) throw new CalorieRenderError('missing-data', '照片 #' + id + ' 不存在');
  const anchor = row.tag_list[0];
  const pool = listPhotos(db, { days: 36500, limit: null })
    .filter((r) => (anchor ? tagsContain(r.tag, anchor) : true))
    .sort((a, b) => (a.date + ' ' + (a.time ?? '') + '#' + a.id < b.date + ' ' + (b.time ?? '') + '#' + b.id ? -1 : 1));
  const idx = pool.findIndex((r) => r.id === id);
  return {
    scene: '查身材照',
    photo: toCard(row, photosDir),
    prevId: idx > 0 ? (pool[idx - 1]?.id ?? null) : null,
    nextId: idx >= 0 && idx < pool.length - 1 ? (pool[idx + 1]?.id ?? null) : null,
  };
}

export interface GifTask {
  task: 'generate_gif';
  tag: string;
  dateFrom: string | null;
  dateTo: string | null;
  photoCount: number;
  photoIds: number[];
  firstDate: string | null;
  lastDate: string | null;
  note: string;
}

export const GIF_PASSTHROUGH_NOTE = 'GIF 合成由外部按本任务描述执行，本渲染不碰二进制';

/** 动图规划器：只出任务描述（T4 planGif 直通；photoIds 显式交集，不跑合成）。 */
export function buildGifTask(
  db: DatabaseSync,
  input: { tag: string; dateFrom?: string | null; dateTo?: string | null; days?: number | null; photoIds?: number[] },
): GifTask {
  const tag = String(input.tag ?? '').trim();
  if (!tag) throw new CalorieRenderError('bad-input', 'tag 必填（GIF 按标签选照片）');
  if (input.dateFrom) assertISO(input.dateFrom, 'dateFrom');
  if (input.dateTo) assertISO(input.dateTo, 'dateTo');
  const plan = planGif(db, {
    tag,
    dateFrom: input.dateFrom ?? null,
    dateTo: input.dateTo ?? null,
    days: input.days ?? 90,
  });
  let ids = [...plan.photoIds];
  if (input.photoIds) {
    const want = new Set(input.photoIds);
    ids = ids.filter((x) => want.has(x));
  }
  let firstDate = plan.dateFrom;
  let lastDate = plan.dateTo;
  if (input.photoIds) {
    const dates = ids
      .map((x) => getPhotoRow(db, x))
      .filter((r): r is PhotoRow => r !== null && tagsContain(r.tag, tag))
      .map((r) => r.date)
      .sort();
    firstDate = dates.length > 0 ? (dates[0] as string) : null;
    lastDate = dates.length > 0 ? (dates[dates.length - 1] as string) : null;
  }
  return {
    task: 'generate_gif',
    tag,
    dateFrom: firstDate,
    dateTo: lastDate,
    photoCount: ids.length,
    photoIds: ids,
    firstDate,
    lastDate,
    note: ids.length === 0 ? '无匹配照片（检查标签/日期范围） · ' + GIF_PASSTHROUGH_NOTE : GIF_PASSTHROUGH_NOTE,
  };
}

export interface AddedPhoto {
  id: number;
  file: string;
}

/** 存照片回执：单张/含备注/批量（items 逐张状态由调用方按 T4 addPhotos 结果组装）。 */
export function buildAddReceipt(
  added: AddedPhoto[],
  opts: { tag: string; note?: string; distance?: PhotoDistance | null; failedCount?: number },
): CrudReceipt {
  const scene = added.length > 1 ? '批量存照片' : (opts.note ? '存照片（含备注）' : '存一张照片');
  let summary = '已存入 ' + added.length + ' 张身材照';
  if (opts.distance) summary += '；距上次「' + opts.distance.tag + '」照已隔 ' + opts.distance.days + ' 天';
  if (opts.failedCount) summary += '，' + opts.failedCount + ' 张未存入';
  return buildCrudReceipt({
    scene,
    action: 'add',
    op: 'create',
    recordId: added.length > 0 ? (added[0]?.id ?? null) : null,
    summary,
    items: added.map((a) => ({ id: a.id, file: a.file, status: '成功', reason: '' })),
    wakeWord: '记身材照',
    source: 'body_photos (写库回执)',
  });
}

/** 删照片回执：删除前快照（调用方先 getPhotoRow 取快照，再调 T4 deletePhoto）。
 *
 * #101 删除可恢复性口径：`body_photos` 走 `DELETE FROM` ＋ 删文件，属**硬删除**，
 * 故文案必须显式标注「硬删除，不可恢复」；软删除键（行保留）一律**不承诺可恢复**
 * （全仓 0 个 restore/undo/recover 入口），词条与 `items[].status` 同源。
 */
export function buildDeleteReceipt(snapshot: PhotoRow): CrudReceipt {
  const tags = [...snapshot.tag_list].join('、') || '无标签';
  const summary = '已删除身材照 #' + snapshot.id + '(' + snapshot.date + ' · ' + tags + ')' +
    (snapshot.note ? ' · ' + snapshot.note : '') + '（硬删除，不可恢复）';
  return buildCrudReceipt({
    scene: '删身材照',
    action: 'delete',
    op: 'delete',
    recordId: snapshot.id,
    summary,
    items: [{
      id: snapshot.id,
      date: snapshot.date,
      photoPath: basename(snapshot.photo_path),
      tagList: [...snapshot.tag_list],
      status: '已删除（硬，不可恢复）',
      reason: '',
    }],
    wakeWord: '删身材照',
    source: 'body_photos (删除快照)',
  });
}

/** 标签回执：改前/改后对比 + 无变化明示（set 整套覆盖 / add 追加判重 / remove 移除）。 */
export function buildTagReceipt(
  photoId: number,
  before: string[],
  after: string[],
  scene: '改照片标签' | '加照片标签' | '删照片标签',
): CrudReceipt {
  if (!Number.isInteger(photoId)) throw new CalorieRenderError('bad-input', '照片 id 须为整数');
  const noChange = [...before].join(',') === [...after].join(',');
  let summary: string;
  if (scene === '改照片标签') {
    summary = '照片 #' + photoId + ' 标签已改为：' + after.join('、') + (noChange ? '；以上标签与原来一致，未产生实际变化' : '');
  } else if (scene === '加照片标签') {
    summary = noChange
      ? '⚠ 标签已存在（当前标签：' + before.join('、') + '），未做修改'
      : '已为照片 #' + photoId + ' 追加标签，当前标签：' + after.join('、');
  } else {
    summary = noChange
      ? '⚠ 标签不存在（当前标签：' + before.join('、') + '），未做修改'
      : '已从照片 #' + photoId + ' 移除标签，剩余标签：' + after.join('、');
  }
  return buildCrudReceipt({
    scene,
    action: scene,
    op: 'update',
    recordId: photoId,
    summary,
    tagDiff: { before: [...before], after: [...after] },
    noChange,
    wakeWord: scene,
    source: 'body_photos (标签更新)',
  });
}
