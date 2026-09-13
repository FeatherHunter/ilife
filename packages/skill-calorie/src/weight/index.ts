/** 体重能力对外的门（HELP 场景 03「体重」）：命令分派三件 ＋ 两处跨能力取数。
 *
 * 对外五件（铁律五「不多于五个」，正好用满）：
 *   ① `WEIGHT_COMMANDS`——命令声明（权威源在 `commands.ts`，这里只是转出）；
 *   ② `runWeightView(key, params, db)`——读命令入口（查不到体重键即抛，不当静默兜底）；
 *   ③ `runWeightWrite(key, params, db)`——写命令入口（同上）；
 *   ④ `getWeightGoalInfo`——「体重目标」取数：目标管理那侧（`goal/goalExtraPlate.ts`）在用；
 *   ⑤ `weightTrend`——「体重趋势」算式：健康盘那侧（`analysis/dashboard.ts`）在用。
 *  ④⑤ 都按铁律一「要用别的能力的东西走它对外那道门」转出，免得同一件事有两份取数／两份算式。
 *
 * 域内其他件（取数 `records.ts`、算式 `figures.ts`、页装配 `plate.ts`／`plateDocs.ts`、
 * 对比场景 `weightCompare*.ts`）**不出这个目录**，故不在这里转出；包级出口
 * （`src/index.ts`）另按原样转出「体重取数」，既有调用方导入面不变。
 */
import type { DatabaseSync } from 'node:sqlite';
import { CalorieRenderError } from '../render/errors.js';
import type { ViewOut, WriteOut } from '../shared/commandSpec.js';
import { WEIGHT_COMMANDS } from './commands.js';

export { WEIGHT_COMMANDS } from './commands.js';
export { getWeightGoalInfo, weightTrend } from './figures.js';
export type { WeightGoalInfo, WeightTrend } from './figures.js';

const BY_KEY = new Map(WEIGHT_COMMANDS.map((c) => [c.key, c]));

/** 读命令入口：命中即走它的处理函数；键不属体重（或其实是写键）即抛——**不猜**。 */
export function runWeightView(key: string, params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const spec = BY_KEY.get(key);
  if (!spec || spec.kind !== 'read') {
    throw new CalorieRenderError('bad-input', '不是体重的读命令：' + key);
  }
  return spec.run(params, db);
}

/** 写命令入口：同上。 */
export function runWeightWrite(key: string, params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const spec = BY_KEY.get(key);
  if (!spec || spec.kind !== 'write') {
    throw new CalorieRenderError('bad-input', '不是体重的写命令：' + key);
  }
  return spec.run(params, db);
}
