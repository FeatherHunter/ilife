/** 身材照片能力对外的门（HELP 一级分组「身材照片」／场景 09）：命令分派三件。
 *
 * 对外三件：
 *   ① `PHOTO_COMMANDS`——命令声明（权威源在 `commands.ts`，这里只是转出）；
 *   ② `runPhotoView(key, params, db)`——读命令入口（查不到身材照片键即抛，不当静默兜底）；
 *   ③ `runPhotoWrite(key, params, db)`——写命令入口（同上）。
 * 域内其他件（存／看／比／管／向导／HELP 六个子功能文件 ＋ 照片目录解析 `dir.ts`）
 * **不出这个目录**，故不在这里转出。
 */
import type { DatabaseSync } from 'node:sqlite';
import { CalorieRenderError } from '../render/errors.js';
import type { ViewOut, WriteOut } from '../shared/commandSpec.js';
import { PHOTO_COMMANDS } from './commands.js';

export { PHOTO_COMMANDS } from './commands.js';

const BY_KEY = new Map(PHOTO_COMMANDS.map((c) => [c.key, c]));

/** 读命令入口：命中即走它的处理函数；键不属身材照片（或其实是写键）即抛——**不猜**。 */
export function runPhotoView(key: string, params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const spec = BY_KEY.get(key);
  if (!spec || spec.kind !== 'read') {
    throw new CalorieRenderError('bad-input', '不是身材照片的读命令：' + key);
  }
  return spec.run(params, db);
}

/** 写命令入口：同上。 */
export function runPhotoWrite(key: string, params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const spec = BY_KEY.get(key);
  if (!spec || spec.kind !== 'write') {
    throw new CalorieRenderError('bad-input', '不是身材照片的写命令：' + key);
  }
  return spec.run(params, db);
}
