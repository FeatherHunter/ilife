/** 存身材照（HELP 一级分组「身材照片」下一级）：`calorie.photo.add` 写命令。
 *
 * 老口径照旧：**只做引用、不碰二进制**——`addPhotos` 只登记文件名与标签，照片本体留在
 * 用户给的照片目录里。`case` 逐字搬自旧分派层 `cli/write.ts`（#314 纯搬迁，行为不变）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { addPhotos, daysSinceTagPhoto } from './photos.js';
import { buildAddReceipt } from './photo.js';
import { withM5 } from '../render/receipt.js';
import { CalorieRenderError } from '../render/errors.js';
import { todayISO } from '../analysis/utils.js';
import { F, commandLine, totalChanges } from '../shared/writeParts.js';
import { assertISO, fail, needStr, optStr, wday } from '../shared/params.js';
import type { WriteOut } from '../shared/commandSpec.js';
import { photoDirOrThrow } from './dir.js';
import { embedPhotos } from './photoThumb.js';
import { buildPhotoAddDoc } from './receipt.js';

/** `calorie.photo.add` · 记身材照（至多 20 张；源文件都不存在即 missing-data，不写半条空记录）。 */
export function writePhotoAdd(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const raw = params['srcPaths'] ?? params['srcPath'];
  const srcPaths = (Array.isArray(raw) ? raw : [raw]).filter((s) => typeof s === 'string' && (s as string).length > 0) as string[];
  if (srcPaths.length === 0) fail(2, '缺参数 srcPaths（照片源文件路径数组）');
  if (srcPaths.length > 20) fail(2, 'srcPaths 至多 20 张');
  const tag = needStr(params, 'tag');
  const dir = photoDirOrThrow(params);
  const today = wday(params, 'date') ?? todayISO();
  assertISO(today, 'date');
  const note = optStr(params, 'note');
  const before = totalChanges(db);
  const added = addPhotos(db, dir, { srcPaths, tag, note, today, nowTime: optStr(params, 'time') });
  if (added.length === 0) throw new CalorieRenderError('missing-data', '照片源文件均不存在，未存入');
  let distance = null;
  try {
    const days = daysSinceTagPhoto(db, tag, today);
    distance = days === null ? null : { tag, days };
  } catch {
    distance = null;
  }
  const receipt = withM5(buildAddReceipt(added, { tag, note, distance, failedCount: srcPaths.length - added.length || undefined }), {
    ids: added.map((a) => a.id), writtenFields: [...F.photo],
    affectedRows: totalChanges(db) - before,
  });
  const embeds = embedPhotos(dir, added.map((a) => ({ photoPath: a.file })));
  return { data: { ok: true, message: receipt.summary, receipt }, html: buildPhotoAddDoc(receipt, { embeds, tag, note, date: today, command: commandLine('calorie.photo.add', params) }) };
}
