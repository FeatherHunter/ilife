/** 运动能力对外的门（HELP 场景 04「运动」）：命令声明 ＋ 读写两条分派入口 ＋ 回写桥。
 *
 * 对外四件（铁律五「不多于五个」）：
 *   ① `EXERCISE_COMMANDS`——命令声明（权威源在 `commands.ts`，这里只是转出），生成物 `cli/registry.ts` 从这取；
 *   ② `runExerciseView(key, params, db)`——读命令入口（查不到运动键即抛，不当静默兜底）；
 *   ③ `runExerciseWrite(key, params, db)`——写命令入口（同上）；
 *   ④ `exerciseBackfillBridge`——训记回写桥（R2 收口：回写侧经此门，不深引 `exerciseStore.ts` 内部件）。
 *
 * 域内的取数与页面装配（`exercise/exerciseStore.ts`／`home/exercise.ts`／`render/exercisePort.ts`／
 * `render/sportDocs.ts`／`render/sportPortDocs.ts`）**仍住原处**：它们是既有的取数与移植层，
 * 别的场景（01／05／10）也在用，搬进来会连带改它们的调用方（本票车道外，见证据 §偏离 1）。
 * 本目录只搬**命令声明与分派**，处理逻辑一律经那些件已公开的接口调用（铁律一）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { CalorieRenderError } from '../render/errors.js';
import type { ViewOut, WriteOut } from '../shared/commandSpec.js';
import { EXERCISE_COMMANDS } from './commands.js';

export { EXERCISE_COMMANDS } from './commands.js';
export { exerciseBackfillBridge } from './exerciseStore.js';

const BY_KEY = new Map(EXERCISE_COMMANDS.map((c) => [c.key, c]));

/** 读命令入口：命中即走它的处理函数；键不属运动（或其实是写键）即抛——**不猜**。 */
export function runExerciseView(key: string, params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const spec = BY_KEY.get(key);
  if (!spec || spec.kind !== 'read') {
    throw new CalorieRenderError('bad-input', '不是运动的读命令：' + key);
  }
  return spec.run(params, db);
}

/** 写命令入口：同上。 */
export function runExerciseWrite(key: string, params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const spec = BY_KEY.get(key);
  if (!spec || spec.kind !== 'write') {
    throw new CalorieRenderError('bad-input', '不是运动的写命令：' + key);
  }
  return spec.run(params, db);
}
