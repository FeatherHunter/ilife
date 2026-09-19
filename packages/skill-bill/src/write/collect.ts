/** 采集页分派位：按 `kind`／`op` 取场景件，叫它的 `collect`。**装配体不住这里**（本票的拆件口径）。
 *
 * 谁在用（两个调用点，指名）：
 *   ① `src/write/write.ts` 的 `writeRecordAdd`——`bill.record.add` 有阻断项（缺必需槽位／金额方向不符）时出这一页；
 *   ② `src/write/write.ts` 的 `writeRecordUpdate`——`bill.record.update` 有阻断项（缺 `id`）时出这一页。
 *  第二个消费者：`src/query/`（随兄弟图 #403 的查询域一起到位，出来的是同一套采集页／回执页／复制区）。
 *
 * 本件只剩三件事：转出槽位表（`./slots.ts` 的定义，测试与 `write.ts` 照旧引这一条）、
 *  按落点取件（`./scene.ts` 的 `sceneFor`）、把入参原样交给那一件场景件。
 *  拆件前这里装着通用采集页的十块：先搬进 `./collectBody.ts`，再随「按域页型表」落成**五张模板件**
 *  各持自己那张页的块序（`./template-{expense,flow,batch,installment,update}.ts`）——`collectBody.ts`
 *  随本票删除（场景件都走模板了，它已无调用方）。
 *  后续三族窗口填各自那张页时改的是**模板件（块序）与场景件（差异值）**，本件一行不动。
 */
import type { CollectInput } from './scene.js';
import { sceneFor } from './scene.js';

export { RECORD_SLOTS, missingSlots } from './slots.js';
export type { RecordSlot } from './slots.js';

/** 一个值的字符串形态（判落点只认字符串；数字等其余形态一律当「没给这一格」）。 */
function textOf(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** 过程型采集页整页：取件交给场景件装配（判定四条见 `./scene.ts` 的 `sceneFor`）。 */
export function recordCollectDoc(input: CollectInput): string {
  return sceneFor({
    key: input.key,
    kind: textOf(input.params['kind']),
    op: textOf(input.params['op']),
  }).collect(input);
}
