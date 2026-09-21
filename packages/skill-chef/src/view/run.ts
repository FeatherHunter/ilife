/** 查看能力的命令处理（`chef.recipe.view`）。
 *
 * 老分派层（`src/cli/cmd_read.ts`）分支逐字节下沉：只改 import 出处，判定与装配一字不动。
 * 缺定位走取数错（`resolveNameOrId` 任务口径，入口映射为 exit 4）。
 *
 * #770 取数面（配方 `t768-页面族配方.md` §4 回写本票领 4 条）：营养／背景／六张关联表徽标／
 * 替换食材。替换食材已在行上（`ingredients.substitute`）；历史统计走共享原语。
 * 营养无行时显式标未估算，不编数字冒充（票面「不许动的东西」）。
 */

import type { ChefDb } from '../fetch/db.js';
import { getRecipeDetail, historyStats, qAll, qGet, queryHistory } from '../fetch/db.js';
import type { RecipeDetail } from '../render/views.js';
import { toRecipeItem } from '../render/views.js';
import { resolveNameOrId } from '../shared/slots.js';

// 营养行（`nutrition_info`，一菜一行）：有行即真数据，无行即显式未估算。
function queryNutrition(recipeId: string, h: ChefDb): Record<string, unknown> {
  const row = qGet<Record<string, unknown>>(h, 'SELECT * FROM nutrition_info WHERE recipe_id = ?', [recipeId]);
  if (!row) return { estimated: false, note: '营养估算一期占位（以实际食材称量为准）' };
  return {
    estimated: true,
    serving_size: row.serving_size, serving_unit: row.serving_unit,
    calories: row.calories, protein: row.protein, fat: row.fat,
    carbs: row.carbs, fiber: row.fiber, sodium: row.sodium,
  };
}

// 背景行（`background_knowledge`，一菜一行）：无行即 null（页面不留空块）。
function queryBackground(recipeId: string, h: ChefDb): Record<string, unknown> | null {
  const row = qGet<Record<string, unknown>>(h, 'SELECT * FROM background_knowledge WHERE recipe_id = ?', [recipeId]);
  if (!row) return null;
  return {
    origin_story: row.origin_story,
    historical_background: row.historical_background,
    cultural_significance: row.cultural_significance,
  };
}

// 页头徽标行（六张关联表，各 1–N 行）：只收文本列，无行即空数组（徽章行空即不印）。
function queryBadges(recipeId: string, h: ChefDb): Record<string, string[]> {
  const col = (table: string, field: string): string[] =>
    qAll<Record<string, unknown>>(h, 'SELECT ' + field + ' FROM ' + table + ' WHERE recipe_id = ?', [recipeId])
      .map((r) => String(r[field] ?? ''))
      .filter((s) => s !== '');
  const region = qAll<Record<string, unknown>>(h, 'SELECT region, country FROM recipe_categories WHERE recipe_id = ?', [recipeId]);
  return {
    cuisine: col('recipe_categories', 'cuisine_type'),
    region: region.map((r) => String(r.region ?? '')).filter((s) => s !== ''),
    country: region.map((r) => String(r.country ?? '')).filter((s) => s !== ''),
    flavors: col('recipe_flavors', 'flavor'),
    seasons: col('recipe_seasons', 'season'),
    meal_types: col('recipe_meal_types', 'meal_type'),
    diet_tags: col('recipe_diet_tags', 'tag'),
    cooking_methods: col('recipe_cooking_methods', 'method'),
  };
}

// 单菜全貌 detail：基本 + 食材 + 步骤 + 历史统计 + 营养（真行或显式占位）+ 背景 + 徽标。
// 原 `src/render/views.ts`，本域独占（旧址由 `src/render/index.ts` 转出）。
export function recipeDetail(detail: RecipeDetail, handle?: ChefDb): { item: Record<string, unknown> } {
  const ingredients = [...detail.ingredients].sort((a, b) => a.sequence - b.sequence).map((g) => ({ ...g }));
  const steps = [...detail.steps].sort((a, b) => a.sequence - b.sequence).map((s) => ({ ...s }));
  const recipeId = detail.recipe.id;
  const history = detail.history ?? (handle ? historyStats(handle, recipeId) : { count: 0, avgRating: null });
  const timeline = handle
    ? queryHistory(handle, recipeId).map((r) => ({
      cook_date: r.cook_date, cook_sequence: r.cook_sequence, rating: r.rating, feedback: r.feedback,
    }))
    : [];
  const nutrition = handle ? queryNutrition(recipeId, handle) : { estimated: false, note: '营养估算一期占位（以实际食材称量为准）' };
  const background = handle ? queryBackground(recipeId, handle) : null;
  const badges = handle ? queryBadges(recipeId, handle) : {
    cuisine: [], region: [], country: [], flavors: [], seasons: [], meal_types: [], diet_tags: [], cooking_methods: [],
  };
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
      history,
      history_timeline: timeline,
      nutrition,
      background,
      badges,
    },
  };
}

/** 跑 `chef.recipe.view`：按名或 id 取单菜全貌（detail 形）。 */
export function runRecipeView(handle: ChefDb, params: Record<string, unknown>): unknown {
  const detail = getRecipeDetail(handle, resolveNameOrId(params));
  return recipeDetail(detail, handle);
}
