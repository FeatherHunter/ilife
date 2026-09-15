/** 饮食能力对外的门（HELP 场景 02「饮食」）：命令声明 ＋ 读／写两个分派入口。
 *
 * 对外三件（铁律五「不多于五个」）：
 *   ① `DIET_COMMANDS`——命令声明（权威源在 `commands.ts`，这里只是转出）；
 *   ② `runDietView(key, params, db)`——读命令入口（查不到饮食键即抛，不当静默兜底）；
 *   ③ `runDietWrite(key, params, db)`——写命令入口（同上）；
 *   ④ `buildMealDistributionView(db, mealRaw, start, end)`——**餐别分布取数**（**#271／#276 跨能力调用**：
 *      `calorie.view.diet` 那一族五条词住 `src/home/`，它要按 `meal` 出餐别分布页。取数口径与餐别取值
 *      域住本能力，故经这道门出去；页装配仍由调用方自己的文档件接 `diet/reviewDocs.ts` 的具名区块）。
 *      （**#271** 用的 `buildDietOverviewView`／`hasAnyDietRow`／`buildEmptyWindowDoc`／`ENTRY_OVERVIEW`
 *      四个不在这里转出：它们照 #275 交接的口径走**深路径**——门只留「取数口径要跨能力对齐」的那一件。）
 *
 * 域内其他件（记饮食 `log.ts`／改饮食 `edit.ts`／看饮食 `today.ts`／查食品 `library.ts`＋`products.ts`／
 * 看营养 `nutrition.ts`／看排行 `ranking.ts`／饮食复盘 `review.ts`／路由声明 `routes.ts`）
 * **不出这个目录**，故不在这里转出；包级出口另有既有面，本票不动。
 */
import type { DatabaseSync } from 'node:sqlite';
import { CalorieRenderError } from '../render/errors.js';
import type { ViewOut, WriteOut } from '../shared/commandSpec.js';
import { DIET_COMMANDS } from './commands.js';
import { buildMealDistributionView } from './review.js';

export { DIET_COMMANDS } from './commands.js';
export { buildMealDistributionView } from './review.js';
export type { MealDistributionView } from './reviewDocs.js';

const BY_KEY = new Map(DIET_COMMANDS.map((c) => [c.key, c]));

/** 读命令入口：命中即走它的处理函数；键不属饮食（或其实是写键）即抛——**不猜**。 */
export function runDietView(key: string, params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const spec = BY_KEY.get(key);
  if (!spec || spec.kind !== 'read') {
    throw new CalorieRenderError('bad-input', '不是饮食的读命令：' + key);
  }
  return spec.run(params, db);
}

/** 写命令入口：同上。 */
export function runDietWrite(key: string, params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const spec = BY_KEY.get(key);
  if (!spec || spec.kind !== 'write') {
    throw new CalorieRenderError('bad-input', '不是饮食的写命令：' + key);
  }
  return spec.run(params, db);
}
