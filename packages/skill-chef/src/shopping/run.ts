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
import { note } from '../shared/slots.js';

/** 跨菜合并采购清单（按名＋单位合并行，自带 optional/category 标记）。原 `src/fetch/db.ts`，本域独占。
 *
 * 份数换算：`servings` 未给即 1（原谱份量）；给数字即全菜同倍数；给数组即按菜序逐菜倍数
 * （与卡面「多菜可用 2,1 分别指定」同语义）。用量按倍数放大后合并，倍数须为正整数。
 */
export function buildShoppingList(h: ChefDb, names: string[], servings?: unknown): ShoppingItem[] {
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
  // 份数换算：数字全菜同倍数，数组按去重前菜序逐菜倍数（重复菜名取首次倍数）。
  const multipliers = new Map<string, number>();
  if (servings === undefined) {
    for (const id of ids) multipliers.set(id, 1);
  } else if (typeof servings === 'number' || (typeof servings === 'string' && (servings as string).trim() !== '')) {
    const n = typeof servings === 'string' ? Number((servings as string).trim()) : servings;
    if (!Number.isInteger(n) || (n as number) <= 0) throw new ChefFetchError('CHEF_BAD_QUERY', '份数须为正整数');
    for (const id of ids) multipliers.set(id, n as number);
  } else if (Array.isArray(servings)) {
    if (servings.length !== names.length) throw new ChefFetchError('CHEF_BAD_QUERY', '份数数组须与菜名一一对应');
    const perName: number[] = (servings as unknown[]).map((x) => {
      const n = typeof x === 'string' ? Number(x.trim()) : x;
      if (!Number.isInteger(n) || (n as number) <= 0) throw new ChefFetchError('CHEF_BAD_QUERY', '份数须为正整数');
      return n as number;
    });
    const seen = new Set<string>();
    names.forEach((n, i) => {
      const r = mustRecipe(h, (n as string).trim());
      if (!seen.has(r.id)) { seen.add(r.id); multipliers.set(r.id, perName[i]); }
    });
  } else {
    throw new ChefFetchError('CHEF_BAD_QUERY', '份数须为正整数或正整数数组');
  }
  const placeholders = ids.map(() => '?').join(',');
  const rows = qAll<Record<string, unknown>>(h, 'SELECT i.*, r.name AS _recipe_name FROM ingredients i JOIN recipes r ON r.id = i.recipe_id WHERE i.recipe_id IN (' + placeholders + ') ORDER BY i.name ASC', ids);
  const merged = new Map<string, ShoppingItem>();
  for (const r of rows) {
    const ing = toIngredient(r);
    const recipeName = String(r._recipe_name ?? nameById.get(ing.recipe_id) ?? '');
    const key = ing.name + '|||' + ing.unit;
    const mult = multipliers.get(ing.recipe_id) ?? 1;
    const qty = (ing.quantity ?? 0) * mult;
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
  items: ShoppingItem[]; recipes: string[]; servings?: number | number[]; excludeOptional?: boolean;
}): { items: ShoppingItem[]; total: number; recipes: string[]; servings?: number | number[]; excludeOptional: boolean } {
  const out: { items: ShoppingItem[]; total: number; recipes: string[]; servings?: number | number[]; excludeOptional: boolean } =
    { items: args.items, total: args.items.length, recipes: args.recipes, excludeOptional: args.excludeOptional === true };
  if (args.servings !== undefined) out.servings = args.servings;
  return out;
}

/** 跑 `chef.shopping.query`：多菜合并＋份数换算＋可选食材过滤（list 形）。空清单缺失阻断。 */
export function runShoppingQuery(handle: ChefDb, params: Record<string, unknown>): unknown {
  const names = needNames(params);
  const servingsRaw = params.servings as unknown;
  const excludeOptional = params.excludeOptional === true;
  let items = buildShoppingList(handle, names, servingsRaw);
  if (!items.length) throw new ChefFetchError('CHEF_EMPTY_RESULT', '采购清单为空（缺失阻断）');
  // 合并行自带 optional 标记（上 `buildShoppingList`）：excludeOptional 在此过滤。
  if (excludeOptional) items = items.filter((x) => !x.optional);
  // 库存核对走调用契约（#682 零依赖）：不 import 居家管家的代码，拿不到就显式降级提示。
  const stockRaw = params.stock_check;
  const skipStock = stockRaw === false || stockRaw === '不核对' || stockRaw === 0;
  if (!skipStock) {
    note('库存核对请复制 prompt 走「居家管家」技能，不直调');
  }
  return buildShopping({
    items,
    recipes: names,
    ...(servingsRaw === undefined ? {} : { servings: servingsRaw as number | number[] }),
    excludeOptional,
  });
}
