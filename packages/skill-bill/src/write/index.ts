/** 记账写入域对外的门：命令声明 ＋ 一个写入口 ＋ 写出口的结果载荷。对外三件（铁律五「不多于五个」）：
 *   ① `RECORD_COMMANDS`——命令声明（权威源在 `commands.ts`，这里只是转出）；
 *   ② `runRecordWrite(key, params, db)`——写命令入口（**非本域命令即抛，不猜、不静默兜底**）；
 *   ③ `buildRecordReceipt`——写类命令的 envelope 载荷（件住 `receiptOut.ts`）。第三件是**过渡转出**：
 *      `src/cli/cmd_read.ts` 里 goal／account／link／setup 四族未迁移命令的分派也要这一格载荷
 *      （#689 结构搬迁第三批的现状）；那四族各自搬进自己的域后，这一行随之删掉。
 *
 * 域内其他件（处理体 `write.ts`／采集页 collector 一族／回执页 `receipt.ts`／`receiptBody.ts`）**不出这个目录**。
 * 形状照 `packages/skill-calorie/src/diet/index.ts`（照结构，不照文件）：那里的第二参是 `DatabaseSync`，
 * 这里收饼干的库句柄 `BillDb`，理由同 `src/shared/commandSpec.ts` 的 `WriteHandler` 一节。
 */
import type { BillDb } from '../fetch/db.js';
import { BillPolicyError } from '../fetch/errors.js';
import type { WriteOut } from '../shared/commandSpec.js';
import { RECORD_COMMANDS } from './commands.js';

export { RECORD_COMMANDS } from './commands.js';
export { buildRecordReceipt } from './receiptOut.js';

const BY_KEY = new Map(RECORD_COMMANDS.map((c) => [c.key, c]));

/** 写命令入口：命中即走它的处理函数；命令名不属记账写入域即抛——**不猜**。 */
export function runRecordWrite(key: string, params: Record<string, unknown>, db: BillDb): WriteOut {
  const spec = BY_KEY.get(key);
  if (!spec) throw new BillPolicyError('POLICY_BAD_INPUT', '不是记账写入域的命令：' + key);
  return spec.run(params, db);
}
