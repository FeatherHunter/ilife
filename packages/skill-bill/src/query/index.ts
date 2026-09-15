/** 记账查询域对外的门：命令声明 ＋ 一个读入口。对外两件（铁律五「不多于五个」）：
 *   ① `QUERY_COMMANDS`——命令声明（权威源在 `commands.ts`，这里只是转出）；
 *   ② `runQueryRead(key, params, db)`——读命令入口（**非本域命令即抛，不猜、不静默兜底**）。
 *
 * 域内其他件（处理体 `read.ts`／列表装配件 `list.ts`）**不出这个目录**，故不在这里转出。
 * 形状照 `../record/index.ts`（同一包内两域同形）：那边的第二参是饼干库句柄 `BillDb`，这里同。
 */
import type { BillDb } from '../fetch/db.js';
import { BillPolicyError } from '../fetch/errors.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { QUERY_COMMANDS } from './commands.js';

export { QUERY_COMMANDS } from './commands.js';

const BY_KEY = new Map(QUERY_COMMANDS.map((c) => [c.key, c]));

/** 读命令入口：命中即走它的处理函数；命令名不属记账查询域即抛——**不猜**。 */
export function runQueryRead(key: string, params: Record<string, unknown>, db: BillDb): ViewOut {
  const spec = BY_KEY.get(key);
  if (!spec) throw new BillPolicyError('POLICY_BAD_INPUT', '不是记账查询域的命令：' + key);
  return spec.run(params, db);
}
