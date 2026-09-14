/** 记账写入域对外的门：命令声明 ＋ 一个写入口。对外两件（铁律五「不多于五个」）：
 *   ① `RECORD_COMMANDS`——命令声明（权威源在 `commands.ts`，这里只是转出）；
 *   ② `runRecordWrite(key, params, db)`——写命令入口（**非本域命令即抛，不猜、不静默兜底**）。
 *
 * 域内其他件（处理体 `write.ts`／采集页 `collect.ts`／回执页 `receipt.ts`）**不出这个目录**，故不在这里转出。
 * 形状照 `packages/skill-calorie/src/diet/index.ts`（照结构，不照文件）：那里的第二参是 `DatabaseSync`，
 * 这里收饼干的库句柄 `BillDb`，理由同 `src/shared/commandSpec.ts` 的 `WriteHandler` 一节。
 */
import type { BillDb } from '../fetch/db.js';
import { BillPolicyError } from '../fetch/errors.js';
import type { WriteOut } from '../shared/commandSpec.js';
import { RECORD_COMMANDS } from './commands.js';

export { RECORD_COMMANDS } from './commands.js';

const BY_KEY = new Map(RECORD_COMMANDS.map((c) => [c.key, c]));

/** 写命令入口：命中即走它的处理函数；命令名不属记账写入域即抛——**不猜**。 */
export function runRecordWrite(key: string, params: Record<string, unknown>, db: BillDb): WriteOut {
  const spec = BY_KEY.get(key);
  if (!spec) throw new BillPolicyError('POLICY_BAD_INPUT', '不是记账写入域的命令：' + key);
  return spec.run(params, db);
}
