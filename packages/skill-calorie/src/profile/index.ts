/** 基础信息能力对外的门（HELP 场景 07「基础信息」）：命令分派两件 ＋ 两处跨层取用。
 *
 * 对外五件（铁律五「不多于五个」，正好用满）：
 *   ① `PROFILE_COMMANDS`——命令声明（权威源在 `commands.ts`，这里只是转出）；
 *   ② `runProfileView`／③ `runProfileWrite`——读／写命令入口（查不到档案键即抛，不当静默兜底）；
 *   ④ `buildProfileSettingReceiptDoc`／⑤ `buildProfileUpdateReceiptDoc`——档案写命令整页回执的装配：
 *      分派层（`src/cli/write.ts`）在用。④⑤ 按铁律一「要用别的能力的东西走它对外那道门」转出，
 *      免得同一件回执页有两份装配（#318 起：分派层不再直接摸本目录内部件）。
 *
 * 域内其他件（取数 `view.ts`、写链 `setup.ts`／`update.ts`／`labels.ts`、读写入口 `read.ts`／`write.ts`）
 * **不出这个目录**，故不在这里转出；`src/index.ts`／`src/render/index.ts` 另按原样转出「档案视图」，
 * 既有调用方导入面不变。
 */
import type { DatabaseSync } from 'node:sqlite';
import { CalorieRenderError } from '../render/errors.js';
import type { ViewOut, WriteOut } from '../shared/commandSpec.js';
import { PROFILE_COMMANDS } from './commands.js';

export { PROFILE_COMMANDS } from './commands.js';
export { buildProfileSettingReceiptDoc } from './setup.js';
export { buildProfileUpdateReceiptDoc } from './update.js';

const BY_KEY = new Map(PROFILE_COMMANDS.map((c) => [c.key, c]));

/** 读命令入口：命中即走它的处理函数；键不属基础信息（或其实是写键）即抛——**不猜**。 */
export function runProfileView(key: string, params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const spec = BY_KEY.get(key);
  if (!spec || spec.kind !== 'read') {
    throw new CalorieRenderError('bad-input', '不是基础信息的读命令：' + key);
  }
  return spec.run(params, db);
}

/** 写命令入口：同上。 */
export function runProfileWrite(key: string, params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const spec = BY_KEY.get(key);
  if (!spec || spec.kind !== 'write') {
    throw new CalorieRenderError('bad-input', '不是基础信息的写命令：' + key);
  }
  return spec.run(params, db);
}
