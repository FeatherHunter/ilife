/** 主页能力对外的门（HELP 一级分组「主页」／场景 01）：命令分派两件。
 *
 * 对外两件：
 *   ① `HOME_COMMANDS`——命令声明（权威源在 `commands.ts`，这里只是转出）；
 *   ② `runHomeView(key, params, db)`——读命令入口（查不到主页键即抛，不当静默兜底）。
 * 域内其他件（四条命令的事实与处理函数 `today.ts`）**不出这个目录**，故不在这里转出；
 * 本能力今天只有读命令，没有写键，因此不设写入口。
 */
import type { DatabaseSync } from 'node:sqlite';
import { CalorieRenderError } from '../render/errors.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { HOME_COMMANDS } from './commands.js';

export { HOME_COMMANDS } from './commands.js';

const BY_KEY = new Map(HOME_COMMANDS.map((c) => [c.key, c]));

/** 读命令入口：命中即走它的处理函数；键不属主页（或其实是写键）即抛——**不猜**。 */
export function runHomeView(key: string, params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const spec = BY_KEY.get(key);
  if (!spec || spec.kind !== 'read') {
    throw new CalorieRenderError('bad-input', '不是主页的读命令：' + key);
  }
  return spec.run(params, db);
}
