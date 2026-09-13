/** 目标管理能力对外的门（HELP 场景 06「目标管理」）：命令分派两件。
 *
 * 对外两件（铁律五「不多于五个」）：
 *   ① `GOAL_COMMANDS`——命令声明（权威源在 `commands.ts`，这里只是转出）；
 *   ② `runGoalView`／`runGoalWrite`——读／写命令入口（查不到目标键即抛，不当静默兜底）。
 *
 * 域内其他件（写前草稿 `set.ts`、预检页 `precheck.ts`、读写入口 `read.ts`／`write.ts`）
 * **不出这个目录**，故不在这里转出；上级模块仍按原路径导入（搬迁只换住处，调用面不变）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { CalorieRenderError } from '../render/errors.js';
import type { ViewOut, WriteOut } from '../shared/commandSpec.js';
import { GOAL_COMMANDS } from './commands.js';

export { GOAL_COMMANDS } from './commands.js';

const BY_KEY = new Map(GOAL_COMMANDS.map((c) => [c.key, c]));

/** 读命令入口：命中即走它的处理函数；键不属目标管理（或其实是写键）即抛——**不猜**。 */
export function runGoalView(key: string, params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const spec = BY_KEY.get(key);
  if (!spec || spec.kind !== 'read') {
    throw new CalorieRenderError('bad-input', '不是目标管理的读命令：' + key);
  }
  return spec.run(params, db);
}

/** 写命令入口：同上。 */
export function runGoalWrite(key: string, params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const spec = BY_KEY.get(key);
  if (!spec || spec.kind !== 'write') {
    throw new CalorieRenderError('bad-input', '不是目标管理的写命令：' + key);
  }
  return spec.run(params, db);
}
