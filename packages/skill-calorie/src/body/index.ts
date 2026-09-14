/** 身体细节能力对外的门（HELP 一级分组「身体细节」／场景 08）：命令分派三件 ＋ 回执整页端口。
 *
 * 对外四件：
 *   ① `BODY_COMMANDS`——命令声明（权威源在 `commands.ts`，这里只是转出）；
 *   ② `runBodyView(key, params, db)`——读命令入口（查不到身体细节键即抛，不当静默兜底）；
 *   ③ `runBodyWrite(key, params, db)`——写命令入口（同上）；
 *   ④ `bodyReceiptDoc(key, params, receipt, db)`——七条写词整页回执的端口（#365）：分派层
 *      （`src/cli/write.ts`）在用，形状与体重那条 `weightReceiptDoc` 逐条相同（经本门转出，
 *      分派层只调门、不写命令名字面量）。
 * 域内其他件（记／看／删／向导四个子功能文件）**不出这个目录**，故不在这里转出。
 * 本能力今天没有供别家取数的算式，故不设取数转出。
 */
import type { DatabaseSync } from 'node:sqlite';
import { CalorieRenderError } from '../render/errors.js';
import type { ViewOut, WriteOut } from '../shared/commandSpec.js';
import { BODY_COMMANDS } from './commands.js';

export { BODY_COMMANDS } from './commands.js';
export { bodyReceiptDoc } from './receipt.js';

const BY_KEY = new Map(BODY_COMMANDS.map((c) => [c.key, c]));

/** 读命令入口：命中即走它的处理函数；键不属身体细节（或其实是写键）即抛——**不猜**。 */
export function runBodyView(key: string, params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const spec = BY_KEY.get(key);
  if (!spec || spec.kind !== 'read') {
    throw new CalorieRenderError('bad-input', '不是身体细节的读命令：' + key);
  }
  return spec.run(params, db);
}

/** 写命令入口：同上。 */
export function runBodyWrite(key: string, params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const spec = BY_KEY.get(key);
  if (!spec || spec.kind !== 'write') {
    throw new CalorieRenderError('bad-input', '不是身体细节的写命令：' + key);
  }
  return spec.run(params, db);
}
