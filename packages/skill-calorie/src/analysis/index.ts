/** 分析能力对外的门（HELP 场景 10「分析」）：命令分派两件 ＋ 命令声明。
 *
 * 对外三件（铁律五「不多于五个」）：
 *   ① `ANALYSIS_COMMANDS`——命令声明（权威源在 `commands.ts`，这里只是转出）；
 *   ② `runAnalysisView(key, params, db)`——读命令入口（查不到分析键即抛，不当静默兜底）；
 *   ③ `runAnalysisWrite(key, params, db)`——写命令入口（同上）。
 *
 * 本场景 13 键**全是读命令**（旧链里「定时复盘／训记／营养表／落地」那些划出去不做的词，
 * 逐字理由住 `routes.ts` 的非执行记录）。写入口照 `src/weight/` 的同款形状保留：
 * 能力对外形状一致，且日后真出写键时只改 `commands.ts`，门与分派层不动。
 *
 * 域内其他件（算式与取数 `series.ts`／`trend.ts`／`deficit.ts`／`dashboard.ts`／`cross.ts`／
 * `simulate*.ts`／`anomaly/`／`diet.ts`／`exercise*.ts`／`review.ts`／`utils.ts` 等）**不出这个目录**，
 * 故不在这里转出：它们由 `render/` 侧的视图层直接消费，导入面照旧。
 */
import type { DatabaseSync } from 'node:sqlite';
import { CalorieRenderError } from '../render/errors.js';
import type { CommandSpec, ViewOut, WriteOut } from '../shared/commandSpec.js';
import { ANALYSIS_COMMANDS } from './commands.js';

export { ANALYSIS_COMMANDS } from './commands.js';

/** 声明数组按**声明的类型**收进查表：本场景全是读命令，若让它保持字面量窄化，
 *  `spec.kind !== 'write'` 会因两个字面量类型无交集而被 `tsc` 判错（TS2367）。 */
const BY_KEY = new Map<string, CommandSpec>(
  ANALYSIS_COMMANDS.map((c): [string, CommandSpec] => [c.key, c]),
);

/** 读命令入口：命中即走它的处理函数；键不属分析（或其实是写键）即抛——**不猜**。 */
export function runAnalysisView(key: string, params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const spec = BY_KEY.get(key);
  if (!spec || spec.kind !== 'read') {
    throw new CalorieRenderError('bad-input', '不是分析的读命令：' + key);
  }
  return spec.run(params, db);
}

/** 写命令入口：同上（本场景今天无写键，任何键都抛）。 */
export function runAnalysisWrite(key: string, params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const spec = BY_KEY.get(key);
  if (!spec || spec.kind !== 'write') {
    throw new CalorieRenderError('bad-input', '不是分析的写命令：' + key);
  }
  return spec.run(params, db);
}
