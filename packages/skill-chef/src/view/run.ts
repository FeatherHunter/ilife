/** 查看能力的命令处理（`chef.recipe.view`）。
 *
 * 老分派层（`src/cli/cmd_read.ts`）分支逐字节下沉：只改 import 出处，判定与装配一字不动。
 * 缺定位走取数错（`resolveNameOrId` 任务口径，入口映射为 exit 4）。
 */

import type { ChefDb } from '../fetch/db.js';
import { getRecipeDetail } from '../fetch/db.js';
import type { RecipeDetail } from '../render/views.js';
import { toRecipeItem } from '../render/views.js';
import { resolveNameOrId } from '../shared/slots.js';

// 单菜全貌 detail：基本 + 食材 + 步骤 + 历史统计 + 营养占位（一期只占位，不编数字）。
// 原 `src/render/views.ts`，本域独占（旧址由 `src/render/index.ts` 转出）。
export function recipeDetail(detail: RecipeDetail): { item: Record<string, unknown> } {
  const ingredients = [...detail.ingredients].sort((a, b) => a.sequence - b.sequence).map((g) => ({ ...g }));
  const steps = [...detail.steps].sort((a, b) => a.sequence - b.sequence).map((s) => ({ ...s }));
  return {
    item: {
      ...toRecipeItem(detail.recipe),
      photo_url: detail.recipe.photo_url,
      source: detail.recipe.source,
      source_url: detail.recipe.source_url,
      created_at: detail.recipe.created_at,
      updated_at: detail.recipe.updated_at,
      ingredients,
      steps,
      history: detail.history ?? { count: 0, avgRating: null },
      // 营养占位：一期不估算，显式标记未估算，不编数字冒充。
      nutrition: { estimated: false, note: '营养估算一期占位（以实际食材称量为准）' },
    },
  };
}

/** 跑 `chef.recipe.view`：按名或 id 取单菜全貌（detail 形）。 */
export function runRecipeView(handle: ChefDb, params: Record<string, unknown>): unknown {
  return recipeDetail(getRecipeDetail(handle, resolveNameOrId(params)));
}
