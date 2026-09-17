/** 健身计划能力对外的门（HELP 场景 05「健身计划」）：命令分派两件 ＋ 命令声明。
 *
 * 对外三件（铁律五「不多于五个」）：
 *   ① `WORKOUT_COMMANDS`——命令声明（权威源在 `commands.ts`，这里只是转出）；
 *   ② `runWorkoutView(key, params, db)`——读命令入口（查不到健身计划键即抛，不当静默兜底）；
 *   ③ `runWorkoutWrite(key, params, db)`——写命令入口（同上）。
 *
 * 本场景**有写键**：`commands.ts` 里 `workout.plan-*` 那一族十条 `kind:'write'` 声明（定训练计划／复制／
 * 定一周／加训练动作／定休息日／改计划／改某天／删某天／改动作／撤销），写入口照 `src/weight/` 的同款形状
 * ——命中即派发，查出不是健身计划（或其实是读键）才抛，与读入口对称；加写键仍只改 `commands.ts`＋子功能
 * 文件，门与分派层不动。（「落地训练」仍无写键，非执行记录住 `routes.ts`；「同步到训记」
 * ／「拉训记实绩」#614 起有写键 `workout.xunji-*`，经本门派发。）
 *
 * 域内其他件（子功能 `plan.ts`／`wizard.ts`／`review.ts`／`contraindication.ts`／`progress.ts`）
 * **不出这个目录**，故不在这里转出。
 */
import type { DatabaseSync } from 'node:sqlite';
import { CalorieRenderError } from '../render/errors.js';
import type { CommandSpec, ViewOut, WriteOut } from '../shared/commandSpec.js';
import { WORKOUT_COMMANDS } from './commands.js';

export { WORKOUT_COMMANDS } from './commands.js';

/** 键 → 声明。类型写成 `CommandSpec`（读＋写的联合），`kind` 判别式才能把两支分别窄化——
 * 若让 `Map` 从 `WORKOUT_COMMANDS` 自己推断，它会被下面那句收窄连累而只剩读支，写入口反而编不过。 */
const BY_KEY = new Map<string, CommandSpec>(WORKOUT_COMMANDS.map((c) => [c.key, c]));

/** 读命令入口：命中即走它的处理函数；键不属健身计划（或其实是写键）即抛——**不猜**。 */
export function runWorkoutView(key: string, params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const spec = BY_KEY.get(key);
  if (!spec || spec.kind !== 'read') {
    throw new CalorieRenderError('bad-input', '不是健身计划的读命令：' + key);
  }
  return spec.run(params, db);
}

/** 写命令入口：命中即走它的处理函数；键不属健身计划（或其实是读键）即抛——**不猜**。 */
export function runWorkoutWrite(key: string, params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const spec = BY_KEY.get(key);
  if (!spec || spec.kind !== 'write') {
    throw new CalorieRenderError('bad-input', '不是健身计划的写命令：' + key);
  }
  return spec.run(params, db);
}
