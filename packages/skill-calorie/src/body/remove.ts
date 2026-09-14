/** 删身体细节（HELP 一级分组「身体细节」下一级）：删体脂 ＋ 删围度两条写命令。
 *
 * 两条都是**软删除**（行保留、已从查询与统计排除），文案与 `items[].status` 同源
 * （口径常量住共用位 `shared/writeParts.ts`：`SOFT_EXCLUDED`／`deleteStatus`）。
 * 两条 `case` 逐字搬自旧分派层 `cli/write.ts`（#314 纯搬迁，行为不变）。
 *
 * #364 · 删除取快照（照同仓其它域的形状：写命令先在**写之前**把这条记录读出来，再让回执带着它走）：
 * 取数走 `fetch/body.ts` 的 `compositionSnapshot`／`measurementSnapshot`（在置废之前读，返回原始列值），
 * 回执两处带快照——① 摘要一句给抬头读数（日期 ＋ 体脂率 ＋ 来源；围度给已填各项）；
 * ② `items[0].detail` 给**逐字段的删前值**全表（「中文标签 值」、项间「、」、缺项 `—`），
 * 就是 #365 整页回执按老正本 `crud_receipt.html:328-350` 铺删前对照行的数据面。
 * 中文名一律取唯一来源（13 部位 `MEASUREMENT_ZH`／7 点 `CALIPER_SITE_LABELS`／来源 `SOURCE_LABELS`），
 * 本件不写第二份名表；**写库行为一字未动**（仍置废、绝不物理删）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { CALIPER_FIELDS, MEASUREMENT_FIELDS, MEASUREMENT_ZH, deleteComposition, deleteMeasurement } from '../fetch/body.js';
import { CALIPER_SITE_LABELS } from './bodyPlate.js';
import { SOURCE_LABELS } from '../kcal.js';
import type { SourceChoice } from '../kcal.js';
import { R, SOFT_EXCLUDED, deleteStatus, out } from '../shared/writeParts.js';
import { needId } from '../shared/params.js';
import type { WriteOut } from '../shared/commandSpec.js';

/** 缺值占位（裁定 2 的可见文本那一半；取数层与库内不给这个字）。 */
const MISSING = '—';

/** 单格可见文本：缺项（`null`／`undefined`／空串）一律 `—`；有值照原样（不加单位，「逐字等于查库值」）。 */
function cell(v: unknown): string {
  return v === null || v === undefined || v === '' ? MISSING : String(v);
}

/** 数值 ＋ 单位：缺项写 `—`（连单位一起省掉，不留 `—%` 这种半截写法）。 */
function numLine(v: unknown, unit: string): string {
  return v === null || v === undefined ? MISSING : String(v) + unit;
}

/** 一条记录的**逐字段**删前值文本（`标签 值`，项间「、」；标签里无空格，值里可以有）。 */
function fieldsLine(pairs: readonly (readonly [string, unknown])[]): string {
  return pairs.map(([label, v]) => label + ' ' + cell(v)).join('、');
}

/** 体成分快照：逐字段（日期／来源／体脂率／7 点皮褶／备注），标签全部取自唯一来源。 */
function compositionFields(snap: Record<string, unknown>): string {
  const src = String(snap['source'] ?? '');
  return fieldsLine([
    ['日期', snap['date']],
    ['来源', SOURCE_LABELS[src as SourceChoice] ?? src],
    ['体脂率', snap['body_fat_pct']],
    ...CALIPER_FIELDS.map((f, i): [string, unknown] => [CALIPER_SITE_LABELS[i] ?? f, snap[f]]),
    ['备注', snap['note']],
  ]);
}

/** 围度快照：逐字段（日期／13 部位／备注），中文名取 `MEASUREMENT_ZH`（唯一来源）。 */
function measureFields(snap: Record<string, unknown>): string {
  return fieldsLine([
    ['日期', snap['date']],
    ...MEASUREMENT_FIELDS.map((f): [string, unknown] => [MEASUREMENT_ZH[f], snap[f]]),
    ['备注', snap['note']],
  ]);
}

/** 体成分快照摘要：日期 ＋ 体脂率 ＋ 来源（＋有备注才带备注）——老正本同一句的取词。 */
function compositionSummary(id: number, snap: Record<string, unknown>): string {
  const src = String(snap['source'] ?? '');
  const note = cell(snap['note']);
  return '已删除体脂记录 #' + id + '（日期 ' + cell(snap['date'])
    + ' · 体脂率 ' + numLine(snap['body_fat_pct'], '%')
    + ' · 来源 ' + (SOURCE_LABELS[src as SourceChoice] ?? (src === '' ? MISSING : src))
    + (note === MISSING ? '' : ' · 备注 ' + note) + '）' + SOFT_EXCLUDED;
}

/** 围度快照摘要：日期 ＋ **已填各项**（部位名 ＋ 值cm，缺项不摆——13 项全空不成记录）。 */
function measureSummary(id: number, snap: Record<string, unknown>): string {
  const filled = MEASUREMENT_FIELDS
    .filter((f) => snap[f] !== null && snap[f] !== undefined)
    .map((f) => MEASUREMENT_ZH[f] + ' ' + String(snap[f]) + 'cm');
  const note = cell(snap['note']);
  return '已删除围度记录 #' + id + '（日期 ' + cell(snap['date'])
    + ' · ' + (filled.length > 0 ? filled.join('、') : '无围度')
    + (note === MISSING ? '' : ' · 备注 ' + note) + '）' + SOFT_EXCLUDED;
}

/** `calorie.body.composition-remove` · 删体脂（软删：置 `is_deprecated`；删前快照带回执）。 */
export function writeCompositionRemove(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const id = needId(params);
  const r = deleteComposition(db, id);
  const snap = r.snapshot;
  return out(R('删体脂', 'delete', compositionSummary(id, snap), '删体脂', 'body_composition (写库回执)', {
    recordId: id, ids: [id], writtenFields: ['is_deprecated'],
    items: [{ id, date: cell(snap['date']), status: deleteStatus('soft'), reason: '', detail: compositionFields(snap) }],
  }));
}

/** `calorie.body.measure-remove` · 删围度（软删：置 `is_deprecated`；删前快照带回执）。 */
export function writeMeasureRemove(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const id = needId(params);
  const r = deleteMeasurement(db, id);
  const snap = r.snapshot;
  return out(R('删围度', 'delete', measureSummary(id, snap), '删围度', 'body_measurements (写库回执)', {
    recordId: id, ids: [id], writtenFields: ['is_deprecated'],
    items: [{ id, date: cell(snap['date']), status: deleteStatus('soft'), reason: '', detail: measureFields(snap) }],
  }));
}
