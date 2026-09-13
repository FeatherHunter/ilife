/** 管身材照（HELP 一级分组「身材照片」下一级）：删身材照 ＋ 改／加／删照片标签两条写命令。
 *
 * 两条 `case` 逐字搬自旧分派层 `cli/write.ts`（#314 纯搬迁，行为不变）；
 * 删身材照是**硬删除**（行删掉、不可恢复），照片本体也从照片目录里删——口径照旧，未改。
 * 标签命令一个键承载三种动作（`op` = set／add／remove），回执场景名随之分三种。
 */
import type { DatabaseSync } from 'node:sqlite';
import { deletePhoto, getPhotoRow, parseTags, serializeTags, tagAdd, tagRemove, updateTag } from '../fetch/photos.js';
import { buildDeleteReceipt, buildTagReceipt } from '../render/photo.js';
import { withM5 } from '../render/receipt.js';
import { CalorieRenderError } from '../render/errors.js';
import { receiptHtml } from '../shared/writeParts.js';
import { fail, needId, needStr } from '../shared/params.js';
import type { WriteOut } from '../shared/commandSpec.js';
import { photoDirOrThrow } from './dir.js';

/** `calorie.photo.remove` · 删身材照（硬删除；查不到即 missing-data）。 */
export function writePhotoRemove(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const id = needId(params);
  const dir = photoDirOrThrow(params);
  const snap = getPhotoRow(db, id);
  if (!snap) throw new CalorieRenderError('missing-data', '身材照 #' + id + ' 不存在');
  deletePhoto(db, dir, id);
  const receipt = withM5(buildDeleteReceipt(snap), { ids: [id], writtenFields: [] });
  return { data: { ok: true, message: receipt.summary, receipt }, html: receiptHtml(receipt.scene, receipt.summary, receipt.op, receipt.recordId, receipt.items) };
}

/** `calorie.photo.tag` · 改照片标签：`op` 三选一（set 全量替换／add 加一个／remove 删一个）。 */
export function writePhotoTag(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const id = needId(params);
  const op = needStr(params, 'op');
  if (op !== 'set' && op !== 'add' && op !== 'remove') fail(2, 'op 须为 set/add/remove：' + op);
  const row = getPhotoRow(db, id);
  if (!row) throw new CalorieRenderError('missing-data', '身材照 #' + id + ' 不存在');
  const before = [...row.tag_list];
  let scene: '改照片标签' | '加照片标签' | '删照片标签';
  if (op === 'set') {
    const raw = params['tags'] ?? params['tag'];
    const tags = Array.isArray(raw) ? (raw as unknown[]).map(String) : parseTags(typeof raw === 'string' ? raw : '');
    if (tags.length === 0) fail(2, '缺参数 tags（新标签全量）');
    updateTag(db, id, serializeTags(tags));
    scene = '改照片标签';
  } else if (op === 'add') {
    const tag = needStr(params, 'tag');
    tagAdd(db, id, tag);
    scene = '加照片标签';
  } else {
    const tag = needStr(params, 'tag');
    if (parseTags(tag).length !== 1) fail(2, '删标签一次只删 1 个');
    tagRemove(db, id, tag);
    scene = '删照片标签';
  }
  const after = getPhotoRow(db, id)?.tag_list ?? before;
  const receipt = withM5(buildTagReceipt(id, before, after, scene), { ids: [id], writtenFields: op === 'set' ? ['tags'] : ['tag'] });
  return { data: { ok: true, message: receipt.summary, receipt }, html: receiptHtml(receipt.scene, receipt.summary, receipt.op, receipt.recordId, receipt.items) };
}
