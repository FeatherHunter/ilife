/** 看身材照（HELP 一级分组「身材照片」下一级）：看身材照（画廊）＋ 查身材照（单张）两条读命令。
 *
 * 两条 `case` 逐字搬自旧分派层 `cli/cmd_read.ts`（#314 纯搬迁，行为不变）；
 * 照片目录走本能力内部件 `dir.ts` 的**读侧口径**（缺目录不抛，视图照常出）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { buildGalleryData, buildViewerData } from './photo.js';
import { buildPhotoListDoc } from './galleryDoc.js';
import { buildPhotoViewerDoc } from './viewerDoc.js';
import { dayField, fail } from '../shared/params.js';
import { commandLine } from '../shared/writeParts.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { photoDir } from './dir.js';

/** `calorie.photo.list` · 看身材照：标签／日期窗口／条数筛选，空库即抛（不返空数组冒充正常）。 */
export function viewPhotoList(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const dir = photoDir(params);
  const filter: Record<string, unknown> = {};
  for (const k of ['tag', 'dateFrom', 'dateTo', 'days', 'limit', 'today'] as const) {
    if (params[k] === undefined) continue;
    // #250 · 三个日期位与其余命令同义：可写相对词（今日／昨日／前天）并吃 offset。
    const rel = k === 'dateFrom' || k === 'dateTo' || k === 'today' ? dayField(params, k) : null;
    (filter as Record<string, unknown>)[k] = rel ?? params[k];
  }
  const g = buildGalleryData(db, filter as never, dir ?? null);
  const items = g.photos.map((p) => ({ id: p.id, date: p.date, photoPath: p.photoPath, tagList: p.tagList, fileExists: p.fileExists }));
  // #341 · 看身材照出口＝完整文档（doctype 起、charset、版面、复制区）＋内嵌照片：
  // 取数仍走 buildGalleryData，呈现改走本能力内 galleryDoc（html.ts 只读，不碰）。
  // #654：复制日志第 4 段的命令原文由命令层共用件 `commandLine()` 派生（含本次 `--params`），页面件不自己拼。
  return {
    data: { items, total: g.totalCount },
    html: buildPhotoListDoc(g, dir ?? null, commandLine('calorie.photo.list', params)),
  };
}

/** `calorie.photo.detail` · 查身材照：`id` 须为整数，查不到即 missing-data。
 *
 * #281 · 单张页与票 1 同形＝完整文档（doctype 起）＋内嵌照片＋复制区，同时兼任
 * 「删身材照」流程的快照：取数仍走 `buildViewerData`，呈现走本能力内 `viewerDoc`
 *（`html.ts` 只读，不碰）。 */
export function viewPhotoDetail(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const id = params['id'];
  if (typeof id !== 'number' || !Number.isInteger(id)) fail(2, '缺参数 id（整数照片 id）');
  const dir = photoDir(params);
  const v = buildViewerData(db, id as number, dir ?? null);
  // #654：同上——复制日志第 4 段的命令原文（含本次 `--params`）由命令层派生。
  return {
    data: { item: { id: v.photo.id, date: v.photo.date, photoPath: v.photo.photoPath, tagList: v.photo.tagList } },
    html: buildPhotoViewerDoc(v, dir ?? null, commandLine('calorie.photo.detail', params)),
  };
}
