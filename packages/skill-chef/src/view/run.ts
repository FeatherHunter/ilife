/** 查看能力的命令处理（`chef.recipe.view`）。
 *
 * 老分派层（`src/cli/cmd_read.ts`）分支逐字节下沉：只改 import 出处，判定与装配一字不动。
 * 缺定位走取数错（`resolveNameOrId` 任务口径，入口映射为 exit 4）。
 */

import type { ChefDb } from '../fetch/db.js';
import { getRecipeDetail } from '../fetch/db.js';
import { recipeDetail } from '../render/views.js';
import { resolveNameOrId } from '../shared/slots.js';

/** 跑 `chef.recipe.view`：按名或 id 取单菜全貌（detail 形）。 */
export function runRecipeView(handle: ChefDb, params: Record<string, unknown>): unknown {
  return recipeDetail(getRecipeDetail(handle, resolveNameOrId(params)));
}
