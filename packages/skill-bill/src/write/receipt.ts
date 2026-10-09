/** 回执页分派位：按 `op`／`kind` 取场景件，叫它的 `receipt`。**装配体不住这里**（本票的拆件口径）。
 *
 * 谁在用（两个调用点，指名）：
 *   ① `src/write/write.ts` 的 `writeRecordAdd`——记一笔写库成功后出这一页；
 *   ② `src/write/write.ts` 的 `writeRecordUpdate`（改字段／撤销／恢复三支共用）——改记录写库成功后出这一页。
 *
 * 本件只剩两件事：按落点取件（`./scene.ts` 的 `sceneFor`）、把入参原样交给那一件场景件。
 *  拆件前这里装着回执页的九块：先搬进 `./receiptBody.ts`，再随「按域页型表」落成**五张模板件**
 *  各持自己那张页的块序（`./template-{expense,flow,batch,installment,update}.ts`）——`receiptBody.ts`
 *  随本票删除（场景件都走模板了，它已无调用方）。
 *
 * 落点怎么判（**与采集侧同一张表**）：`add` 那一支看 `params.kind`（13 条录入词各自的型）；
 *  `undo`／`restore` 两支看 `op`；改字段那一支（`op` 是 `update`）落改记录那一件。
 */
import type { ReceiptInput } from './scene.js';
import { sceneFor } from './scene.js';

/** 结果型回执整页：取件交给场景件装配（判定四条见 `./scene.ts` 的 `sceneFor`）。 */
export function recordReceiptDoc(input: ReceiptInput): string {
  const op = input.receipt.op === 'add' ? '' : input.receipt.op;
  return sceneFor({
    key: input.key,
    kind: typeof input.params['kind'] === 'string' ? String(input.params['kind']) : '',
    op,
  }).receipt(input);
}
