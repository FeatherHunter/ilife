/** 做菜能力的命令处理（`chef.cooking.run`）＋ 本域独占的视图装配。
 *
 * 老分派层（`src/cli/cmd_read.ts`）分支逐字节下沉：只改 import 出处，判定与装配一字不动。
 * `buildCookingRun`（原 `src/render/views.ts`）只被本域调用，按“写不出的留回域目录”搬入本文件；
 * 旧址改转出（搬迁债务，见 `src/render/index.ts`）。
 */

import type { ChefDb } from '../fetch/db.js';
import { getRecipeDetail, historyStats } from '../fetch/db.js';
import type { CookingStep, RecipeHistoryStats, RecipeItem } from '../render/views.js';
import { toRecipeItem } from '../render/views.js';
import { needServings, resolveNameOrId } from '../shared/slots.js';

// 开做 list：items 为步骤（内联食材）+ total；recipe/份数放大说明/历史提示作扩展字段（list 形只校验 items/total）。
// 原 `src/render/views.ts`，本域独占。
export function buildCookingRun(args: {
  recipe: RecipeItem;
  steps: CookingStep[];
  servings?: number;
  history?: RecipeHistoryStats | null;
}): { items: CookingStep[]; total: number; recipe: RecipeItem; servingsNote: string; historyHint: string; steps: CookingStep[] } {
  const base = args.recipe.servings > 0 ? args.recipe.servings : 2;
  const servings = args.servings ?? base;
  const factor = Math.round((servings / base) * 100) / 100;
  const servingsNote = servings === base
    ? '按原份量 ' + base + ' 人份备料'
    : '已按 ' + servings + ' 人份放大（原 ' + base + ' 人份，倍率 ' + factor + '，食材用量同倍）';
  const h = args.history;
  const historyHint = h && h.count > 0
    ? '做过 ' + h.count + ' 次' + (h.avgRating !== null && h.avgRating !== undefined ? '，平均评分 ' + h.avgRating : '') + '；本次做完请走 chef.history.record 记录'
    : '还没做过；本次做完请走 chef.history.record 记录';
  return { items: args.steps, total: args.steps.length, recipe: args.recipe, servingsNote, historyHint, steps: args.steps };
}

/** 跑 `chef.cooking.run`：取单菜全貌＋份数放大＋历史提示（list 形）。 */
export function runCookingRun(handle: ChefDb, params: Record<string, unknown>): unknown {
  const servings = needServings(params);
  const detail = getRecipeDetail(handle, resolveNameOrId(params));
  const base = detail.recipe.servings > 0 ? detail.recipe.servings : 2;
  const factor = servings === undefined ? 1 : (servings as number) / base;
  const scaled = detail.ingredients.map((g) => ({
    name: g.name,
    quantity: g.quantity === null ? null : Math.round(g.quantity * factor * 100) / 100,
    unit: g.unit, quantity_text: g.quantity_text, optional: g.is_optional === 1,
  }));
  const steps: CookingStep[] = [...detail.steps]
    .sort((a, b) => a.sequence - b.sequence)
    .map((s) => ({
      sequence: s.sequence, action: s.action, duration_minutes: s.duration_minutes,
      heat_level: s.heat_level, temperature: s.temperature, expected_result: s.expected_result,
      ingredients: scaled,
    }));
  const history = historyStats(handle, detail.recipe.id);
  return buildCookingRun({ recipe: toRecipeItem(detail.recipe), steps, servings, history });
}
