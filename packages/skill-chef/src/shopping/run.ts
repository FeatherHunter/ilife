/** 采购能力的命令处理（`chef.shopping.query`）＋ 本域独占的取数与视图装配。
 *
 * 老分派层（`src/cli/cmd_read.ts`）分支逐字节下沉：只改 import 出处，判定与装配一字不动。
 * `buildShoppingList`（原 `src/fetch/db.ts`）与 `buildShopping`（原 `src/render/views.ts`）
 * 只被本域调用，按“写不出的留回域目录”搬入本文件；旧址改转出（搬迁债务，见对应 index）。
 */

import { ChefFetchError } from '../fetch/errors.js';
import type { ChefDb, ShoppingItem } from '../fetch/db.js';
import { mustRecipe, qAll, toIngredient } from '../fetch/db.js';
import { needNames } from '../policy/index.js';
import { needServings, note } from '../shared/slots.js';

/** 跨菜合并采购清单（按名＋单位合并行，自带 optional/category 标记）。原 `src/fetch/db.ts`，本域独占。 */
export function buildShoppingList(h: ChefDb, names: string[]): ShoppingItem[] {
  if (!Array.isArray(names) || names.length === 0) {
    throw new ChefFetchError('CHEF_BAD_QUERY', '采购须给菜名（空查询不返空）');
  }
  const ids: string[] = [];
  const nameById = new Map<string, string>();
  for (const n of names) {
    if (typeof n !== 'string' || !n.trim()) throw new ChefFetchError('CHEF_BAD_QUERY', '采购菜名含空串');
    const r = mustRecipe(h, n.trim());
    if (!ids.includes(r.id)) { ids.push(r.id); nameById.set(r.id, r.name); }
  }
  const placeholders = ids.map(() => '?').join(',');
  const rows = qAll<Record<string, unknown>>(h, 'SELECT i.*, r.name AS _recipe_name FROM ingredients i JOIN recipes r ON r.id = i.recipe_id WHERE i.recipe_id IN (' + placeholders + ') ORDER BY i.name ASC', ids);
  const merged = new Map<string, ShoppingItem>();
  for (const r of rows) {
    const ing = toIngredient(r);
    const recipeName = String(r._recipe_name ?? nameById.get(ing.recipe_id) ?? '');
    const key = ing.name + '|||' + ing.unit;
    const qty = ing.quantity ?? 0;
    const hit = merged.get(key);
    const qt = ing.quantity_text || (ing.quantity !== null ? String(ing.quantity) + ing.unit : '');
    if (!hit) {
      merged.set(key, { name: ing.name, quantity: qty, unit: ing.unit, recipes: [recipeName], quantity_text: qt, from: recipeName, optional: ing.is_optional === 1, category: ing.category });
    } else {
      hit.quantity += qty;
      if (!hit.recipes.includes(recipeName)) hit.recipes.push(recipeName);
      hit.from = hit.recipes.join('+');
      if (ing.is_optional !== 1) hit.optional = false;
    }
  }
  return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh'));
}

// 跨菜合并采购 list：items（合并行 name/quantity/unit/recipes）+ total + recipes（+servings/excludeOptional 回显）。
// 原 `src/render/views.ts`，本域独占。
export function buildShopping(args: {
  items: ShoppingItem[]; recipes: string[]; servings?: number; excludeOptional?: boolean;
}): { items: ShoppingItem[]; total: number; recipes: string[]; servings?: number; excludeOptional: boolean } {
  const out: { items: ShoppingItem[]; total: number; recipes: string[]; servings?: number; excludeOptional: boolean } =
    { items: args.items, total: args.items.length, recipes: args.recipes, excludeOptional: args.excludeOptional === true };
  if (args.servings !== undefined) out.servings = args.servings;
  return out;
}

/** 跑 `chef.shopping.query`：多菜合并＋可选食材过滤（list 形）。空清单缺失阻断。 */
export function runShoppingQuery(handle: ChefDb, params: Record<string, unknown>): unknown {
  const names = needNames(params);
  const servings = needServings(params);
  const excludeOptional = params.excludeOptional === true;
  let items = buildShoppingList(handle, names);
  if (!items.length) throw new ChefFetchError('CHEF_EMPTY_RESULT', '采购清单为空（缺失阻断）');
  // 合并行自带 optional 标记（上 `buildShoppingList`）：excludeOptional 在此过滤。
  if (excludeOptional) items = items.filter((x) => !x.optional);
  // 库存核对不直调居家管家：只给清单，核对请复制 prompt 走居家管家技能。
  note('库存核对请复制 prompt 走「居家管家」技能，不直调');
  return buildShopping({ items, recipes: names, servings, excludeOptional });
}
