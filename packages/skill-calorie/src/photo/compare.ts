/** 比身材照（HELP 一级分组「身材照片」下一级）：对比两张照片 ＋ 生成身材照GIF 两条读命令。
 *
 * 两条 `case` 逐字搬自旧分派层 `cli/cmd_read.ts`（#314 纯搬迁）。对比那条的取数与呈现口径
 * 仍照 #281（`buildCompareData` ＋ `compareDoc`，本票一行不碰）。
 * GIF 那条**老口径已作废**：#281 之前它只出任务描述（`buildGifTask` 的字面）+ 一段裸片段；
 * #352 起同一份规划数据（取数口径不变）交 `gifDoc` 合成 GIF 落盘并装配整页文档（页内嵌那份 GIF）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { buildCompareData, buildGifTask, toCard } from './photo.js';
import { buildPhotoCompareDoc } from './compareDoc.js';
import { buildPhotoGifPage } from './gifDoc.js';
import { getPhotoRow, type PhotoRow } from './photos.js';
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

/** `calorie.photo.gif` · 生成身材照GIF：规划（`buildGifTask`，入参口径不变）→ 合成落盘 → 整页文档。
 *
 * #352 · 说「做身材照GIF」跑完拿到的是一页完整文档，页内嵌着那份能播放的 GIF：取数仍是
 * `buildGifTask`（标签／窗口／入片 id／首末日期口径不变，零匹配仍 exit 4 不落盘），
 * 合成与装配走本能力目录 `gifDoc`（`html.ts` 只读，不碰）。`copyData` 就是复制区与
 * envelope 的同一份数据（交付层再另加 `output`）。
 */
export function viewPhotoGif(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const tag = needStr(params, 'tag');
  const gif = buildGifTask(db, {
    tag, dateFrom: dayField(params, 'dateFrom'),
    dateTo: (optStr(params, 'dateTo') ?? null) as string | null,
    days: (optNum(params, 'days') ?? 90) as number,
  });
  const dir = photoDir(params) ?? null;
  const cards = gif.photoIds
    .map((id) => getPhotoRow(db, id))
    .filter((r): r is PhotoRow => r !== null)
    .map((r) => toCard(r, dir));
  const page = buildPhotoGifPage({ task: gif, photosDir: dir, cards });
  return { data: { ...page.copyData }, html: page.html };
}
