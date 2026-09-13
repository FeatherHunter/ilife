/** 删身体细节（HELP 一级分组「身体细节」下一级）：删体脂 ＋ 删围度两条写命令。
 *
 * 两条都是**软删除**（行保留、已从查询与统计排除），文案与 `items[].status` 同源
 * （口径常量住共用位 `shared/writeParts.ts`：`SOFT_EXCLUDED`／`deleteStatus`）。
 * 两条 `case` 逐字搬自旧分派层 `cli/write.ts`（#314 纯搬迁，行为不变）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { deleteComposition, deleteMeasurement } from '../fetch/body.js';
import { R, SOFT_EXCLUDED, deleteStatus, out } from '../shared/writeParts.js';
import { needId } from '../shared/params.js';
import type { WriteOut } from '../shared/commandSpec.js';

/** `calorie.body.composition-remove` · 删体脂（软删：置 `is_deprecated`）。 */
export function writeCompositionRemove(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const id = needId(params);
  deleteComposition(db, id);
  return out(R('删体脂', 'delete', '已删除体脂记录 #' + id + SOFT_EXCLUDED, '删体脂', 'body_composition (写库回执)', {
    recordId: id, ids: [id], writtenFields: ['is_deprecated'], items: [{ id, status: deleteStatus('soft'), reason: '' }],
  }));
}

/** `calorie.body.measure-remove` · 删围度（软删：置 `is_deprecated`）。 */
export function writeMeasureRemove(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const id = needId(params);
  deleteMeasurement(db, id);
  return out(R('删围度', 'delete', '已删除围度记录 #' + id + SOFT_EXCLUDED, '删围度', 'body_measurements (写库回执)', {
    recordId: id, ids: [id], writtenFields: ['is_deprecated'], items: [{ id, status: deleteStatus('soft'), reason: '' }],
  }));
}
