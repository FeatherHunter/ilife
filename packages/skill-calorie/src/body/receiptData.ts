/** #537 拆件 · 身体细节写后回执族的**数据面**（逐格取值 ＋ 复制载荷）。
 *
 *  拆因：本族七页的整页装配与数据面同住 `receipt.ts`，重排后那件越过 350 行告警线。
 *  按**为什么叫这个名字**切一刀——本件回答「这条记录现在是什么值／复制出去的是哪些项」，
 *  `receipt.ts` 回答「这一页长什么样」。它也是全套七页的唯一取值口：手改库里一个字段，
 *  页面上那一段（含删前快照）跟着变，**不回显命令参数**。
 *
 *  两条口径（`docs/skills/skill-calorie/t395-融合基准.md` §四 裁定 2）在这里分家落：
 *  ① **可见文本**缺值一律 `—`（`cell()`）；
 *  ② **复制数据**里缺值不写 `—`——`payloadLines()` 只摆有值的项，缺项整项缺位（连标签一起省）。
 *  中文名一律取唯一来源：13 部位 `MEASUREMENT_ZH`、7 点站名 `CALIPER_SITE_LABELS`、来源
 *  `SOURCE_LABELS`（＋「日期」「备注」），本件不写第二份名表。
 */
import type { DatabaseSync } from 'node:sqlite';
import type { ChangeRowInput } from 'base-paint/blocks';
import type { CrudReceipt, ReceiptItem } from '../render/receipt.js';
import {
  CALIPER_FIELDS, MEASUREMENT_FIELDS, MEASUREMENT_ZH, compositionSnapshot, measureCamelName,
  measurementSnapshot,
} from '../fetch/body.js';
import { CALIPER_SITE_LABELS } from './bodyPlate.js';
import { SOURCE_LABELS } from '../kcal.js';
import type { SourceChoice } from '../kcal.js';
import { OPERATION_LABELS } from '../shared/operationHead.js';

/** 非围度／非皮褶列的中文名（`is_deprecated` 照仓内软删口径给中文，不让库内列名直接上屏）。 */
const COL_ZH: Record<string, string> = {
  date: '日期', note: '备注', source: '来源', body_fat_pct: '体脂率', is_deprecated: '删除标志',
};

/** 写入字段摘要里那几个**不进库列**的 CLI 参数名（`bodyFatPct` 写进的是 `body_fat_pct`；
 *  `age`／`sex` 只喂 JP7 换算）——不换中文就会把参数名直接摆上屏。 */
const CLI_ZH: Record<string, string> = { bodyFatPct: '体脂率', age: '年龄', sex: '性别' };

/** 逐字段中文标签（老正本 `:276-291` 那张表的本域等价物）：库列名与 CLI 参数名都收，
 *  一律查唯一来源（13 部位／7 点／来源／日期／备注），未命中回退原键名。 */
export function zhLabel(key: string): string {
  const site = CALIPER_FIELDS.indexOf(key);
  if (site >= 0) return CALIPER_SITE_LABELS[site] ?? key;
  const camelCol = MEASUREMENT_FIELDS.find((f) => measureCamelName(f) === key);
  return MEASUREMENT_ZH[key]
    ?? (camelCol === undefined ? undefined : MEASUREMENT_ZH[camelCol])
    ?? COL_ZH[key]
    ?? CLI_ZH[key]
    ?? key;
}

/** 记／补记／删三条路共用的实体词（页名、结论句与复制载荷的头用）。 */
export const isMeasure = (key: string): boolean => key.includes('measure');

/** 取值列序（＝#364 两条快照口跳过 `id` 之后的列序；本件不假设返回对象的键序）。 */
function colsOf(key: string): readonly string[] {
  return isMeasure(key)
    ? ['date', ...MEASUREMENT_FIELDS, 'note']
    : ['date', 'source', 'body_fat_pct', ...CALIPER_FIELDS, 'note'];
}

/** 记／补记／删三条路共用的实体词。 */
export const entityOf = (key: string): string => (isMeasure(key) ? '围度' : '体脂');

/** #364 的按 id 复取口：软删后行仍在 ⇒ 写后与删后都能回读同一行（页面现值与删前快照同源）。 */
export function snapshotOf(db: DatabaseSync, key: string, id: number): Record<string, unknown> | null {
  return isMeasure(key) ? measurementSnapshot(db, id) : compositionSnapshot(db, id);
}

/** 可见文本的缺值写法（裁定 2 的可见文本那一半）：`null`／`undefined`／空串一律 `—`。 */
export function cell(v: unknown): string {
  return v === null || v === undefined || String(v) === '' ? '—' : String(v);
}

/** 库内原始值是否「有值」（裁定 2 的 payload 那一半：缺项整项缺位，不写 `—`）。 */
export const hasValue = (v: unknown): boolean => v !== null && v !== undefined && String(v) !== '';

/** 来源列照老正本与 #364 的删前快照一致地换中文名（`SOURCE_LABELS` 是唯一来源，本件不编词）。 */
function cellOf(col: string, v: unknown): string {
  if (col === 'source') {
    const s = String(v ?? '');
    return SOURCE_LABELS[s as SourceChoice] ?? cell(v);
  }
  return cell(v);
}

/** 值落在哪一槽：`old` ＝ 改前（`renderChangeRows` 画**红删除线**，`base-render/src/blocks.ts:1333-1336`）、
 *  `new` ＝ 改后（同件 `:1344-1348`，正文字重 600）。**由操作类型定，不是由调用点随手定**。 */
type Slot = 'old' | 'new';

/** 一行「标签 ＋ 值」落在指定槽（`arrow:false` 仍占箭位，与老 `:344`／`:365` 同一手法）。 */
const rowIn = (label: string, value: string, slot: Slot): ChangeRowInput => (slot === 'new'
  ? { label, after: value, arrow: false }
  : { label, before: value, arrow: false });

/** 库内那一行的逐格 `[中文标签, 可见文本值]`（`currentRows` 与删前快照**共用同一份取值**，
 *  免得两处各读一次、其中一处读错槽）。 */
function currentCells(db: DatabaseSync, key: string, id: number): Array<[string, string]> {
  const snap = snapshotOf(db, key, id);
  return snap === null ? [] : colsOf(key).map((c) => [zhLabel(c), cellOf(c, snap[c])]);
}

/** **记录现值（逐格读自库内）**——落**新值槽**（老正本增类那一支 `:351-371`，`:364` 把值写进
 *  `.diff-new`）。落旧槽会被 `renderChangeRows` 的 `.block-change-row-old` 画成红删除线，把
 *  「本次刚写入的现值」读成「这些值要被删掉」。
 *  防「回显输入」的那一面：手改库里一个字段，本段跟着变。 */
export function currentRows(db: DatabaseSync, key: string, id: number): ChangeRowInput[] {
  return currentCells(db, key, id).map(([label, value]) => rowIn(label, value, 'new'));
}

/** **删除前的原值**（老正本 `:328-350`）：#364 把每条记录逐字段铺成 `标签 值`（项间「、」），
 *  这里只按首个空格切成有序 `[标签, 值]`；标签不信本件、由 #364 的唯一来源给。
 *  **值落旧值槽**（老正本删类那一支 `:343` 写 `.diff-old`）——删除页的删除线正对：被删的就是它。
 *  **值改读库内现值**（软删除不改内容，两者恒等）——删前快照与「现值」是同一行，故只出一段、
 *  不摆两遍；同时页面跟着库走，手改库里一个字段这一段跟着变（不回显命令参数）。 */
export function deleteSnapshotRows(
  db: DatabaseSync, key: string, id: number | null, item: ReceiptItem | undefined,
): ChangeRowInput[] {
  const detail = item?.detail ?? '';
  if (detail === '') return [];
  const fromDb = new Map(id === null ? [] : currentCells(db, key, id));
  return detail.split('、').map((seg) => {
    const at = seg.indexOf(' ');
    if (at < 0) return rowIn(seg, '—', 'old');
    const label = seg.slice(0, at);
    return rowIn(label, fromDb.get(label) ?? seg.slice(at + 1), 'old');
  });
}

/** 同日已有记录（#363 的补记口径）：`items` 里**除本次写入那条以外**的行，逐行按 id 复取库内现值。 */
export const otherItems = (receipt: CrudReceipt): ReceiptItem[] =>
  receipt.items.filter((it) => it.id !== receipt.recordId);

/** 复制数据的正文（裁定 2）：只摆有值的项，缺项整项缺位 ⇒ 载荷里不含 `—`。 */
function payloadLines(db: DatabaseSync, key: string, id: number): string[] {
  const snap = snapshotOf(db, key, id);
  if (snap === null) return [];
  return colsOf(key)
    .filter((c) => hasValue(snap[c]))
    .map((c) => zhLabel(c) + ' ' + (c === 'source' ? cellOf(c, snap[c]) : String(snap[c])));
}

/** 复制数据那句头（本件自己拼，**不取 `receipt.summary`**——那是一句人类话，含 **#363** 的
 *  冲突段与 `—` 占位，进载荷会违反裁定 2）。 */
export function payloadMessage(db: DatabaseSync, key: string, receipt: CrudReceipt): string {
  const id = receipt.recordId;
  const head = '本次' + OPERATION_LABELS[receipt.op] + entityOf(key) + '记录'
    + (id === null ? '' : ' #' + id);
  return [head, ...(id === null ? [] : payloadLines(db, key, id))].join(' ｜ ');
}
