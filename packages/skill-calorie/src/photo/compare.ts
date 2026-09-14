/** 比身材照（HELP 一级分组「身材照片」下一级）：对比两张照片 ＋ 生成身材照GIF 两条读命令。
 *
 * 两条 `case` 逐字搬自旧分派层 `cli/cmd_read.ts`（#314 纯搬迁，行为不变）。
 * 老口径照旧：GIF 这条只出**任务描述**（`buildGifTask`），不生成也不搬运二进制。
 */
import type { DatabaseSync } from 'node:sqlite';
import { buildCompareData, buildGifTask } from './photo.js';
import { buildPhotoCompareDoc } from './compareDoc.js';
import { renderGifHtml } from '../render/html.js';
import { dayField, fail, needStr, optNum, optStr } from '../shared/params.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { photoDir } from './dir.js';

/** `calorie.photo.compare` · 对比两张照片：`id1`／`id2` 都须为整数。
 *
 * #281 · 对比页与票 1 同形＝完整文档（doctype 起）＋内嵌照片＋复制区：取数仍走
 * `buildCompareData`（间隔天数＋跨标签警告口径不变），呈现走本能力内 `compareDoc`
 *（`html.ts` 只读，不碰）。 */
export function viewPhotoCompare(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const id1 = params['id1'];
  const id2 = params['id2'];
  if (typeof id1 !== 'number' || !Number.isInteger(id1)) fail(2, '缺参数 id1（整数）');
  if (typeof id2 !== 'number' || !Number.isInteger(id2)) fail(2, '缺参数 id2（整数）');
  const dir = photoDir(params);
  const c = buildCompareData(db, id1 as number, id2 as number, dir ?? null);
  const items = [c.photo1, c.photo2].map((p) => ({ id: p.id, date: p.date, photoPath: p.photoPath, tagList: p.tagList }));
  return { data: { items, total: 2 }, html: buildPhotoCompareDoc(c, dir ?? null) };
}

/** `calorie.photo.gif` · 生成身材照GIF：按标签出任务描述（起止日期与张数），不动二进制。 */
export function viewPhotoGif(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const tag = needStr(params, 'tag');
  const gif = buildGifTask(db, {
    tag, dateFrom: dayField(params, 'dateFrom'),
    dateTo: (optStr(params, 'dateTo') ?? null) as string | null,
    days: (optNum(params, 'days') ?? 90) as number,
  });
  return { data: { summary: 'GIF 任务：标签 ' + gif.tag + ' 共 ' + gif.photoCount + ' 张（' + (gif.firstDate ?? '—') + ' ~ ' + (gif.lastDate ?? '—') + '）· ' + gif.note }, html: renderGifHtml(gif) };
}
