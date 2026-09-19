/** 共用位·跨域参数槽位口径（#689 结构搬迁第三批新建）：从 `src/policy/record.ts` 里被**两个域**同时取用的那两件来——
 *   ① `RecordOp`——写命令 `op` 的取值集（`parseRecordOp` 认的就是它）；形状事实的取值面同时被
 *      `src/shared/writeParts.ts` 的 `BillReceipt.op` 与 `src/shared/commandSpec.ts` 的写出口取；
 *   ② `needId`——`id` 槽位的正整数守卫（改记录／撤销／恢复与查账单详情四处同一句校验）。
 *
 *  为什么新建这一件、而不是留在某一域里（#689 按「谁在用」判，逐条记在这里）：
 *   · `needId` 的消费者是**两个域**——写域 `src/write/record.ts`（`validateUpdateInput`）与
 *     查询域 `src/query/read.ts`（查账单详情）⇒ 归属律 2「说得出两个域在用 ⇒ 共用位」。
 *     塞进任一域都会让另一个域伸手进对方内部件（或经对方门反向依赖），故上浮共用位。
 *   · `RecordOp` 的消费者是写域 ＋ **两个共用件**（`writeParts.ts`／`commandSpec.ts`）。
 *     它若留在 `src/write/record.ts`，共用件就得 import 域目录 —— 撞守卫③a
 *     （共用位不 import 任何域目录）。故与 `needId` 同住本件；`src/write/record.ts` 转出它，
 *     写域内部的消费方（`write.ts`）照旧只认自己域那一件。
 *
 *  谁在用（指名）：`src/write/record.ts`（两件都取，并转出 `RecordOp`）·
 *    `src/write/write.ts`（经 `./record.js` 取 `RecordOp`）· `src/query/read.ts`（`needId`）·
 *    `src/shared/writeParts.ts` 与 `src/shared/commandSpec.ts`（`RecordOp` 作字段类型）。
 *  形状照兄弟件 `packages/skill-calorie/src/shared/params.ts`：跨域参数口径住共用位，域内不各写一份。 */
import { BillPolicyError } from '../fetch/errors.js';

/** 写命令的操作名（`bill.record.add` 的 add／`bill.record.update` 的三支）。 */
export type RecordOp = 'add' | 'update' | 'undo' | 'restore';

/** `id` 槽位守卫：须给正整数（改记录／撤销／恢复／查详情同一句口径，别处不再写第二份）。 */
export function needId(params: Record<string, unknown>): number {
  const id = params.id;
  if (!Number.isInteger(id) || (id as number) <= 0) {
    throw new BillPolicyError('POLICY_BAD_INPUT', '须给正整数 id');
  }
  return id as number;
}
