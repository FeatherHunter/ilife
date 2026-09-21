/** 搜索筛选能力的命令处理（`chef.recipe.search`）＋ 本域独占的取数与视图装配。
 *
 * 老分派层（`src/cli/cmd_read.ts`）分支逐字节下沉：只改 import 出处，判定与装配一字不动。
 * `searchRecipes`／`filterRecipes`（原 `src/fetch/db.ts`）与 `buildRecipeSearch`
 * （原 `src/render/views.ts`）只被本域调用，按“写不出的留回域目录”搬入本文件；
 * 旧址改转出（搬迁债务，见 `src/fetch/index.ts`／`src/render/index.ts`）。
 */

import { ChefFetchError } from '../fetch/errors.js';
import type { ChefDb, RecipeRow } from '../fetch/db.js';
import { listRecipes, qAll, toRecipe } from '../fetch/db.js';
import type { RecipeItem } from '../render/views.js';
import { toRecipeItem } from '../render/views.js';
import { fail } from '../shared/slots.js';

// #43 F2 一期限制：FILTER 维度只读（recipe.search 透传过滤），本域独占（旧址 `cmd_read.ts`）。
export const FILTER_KEYS = ['cuisine', 'season', 'method', 'flavor', 'tag', 'meal', 'cookware', 'difficulty', 'status', 'maxTime', 'filter'] as const;

/** 按关键词搜菜名／简介／食材名（空查询不返全量，直接拦）。原 `src/fetch/db.ts`，本域独占。 */
export function searchRecipes(h: ChefDb, kw: string): RecipeRow[] {
  if (typeof kw !== 'string' || kw.trim().length === 0) {
    throw new ChefFetchError('CHEF_BAD_QUERY', '搜索须给关键词（空查询不返全量）');
  }
  const k = '%' + kw.trim() + '%';
  const rows = qAll<Record<string, unknown>>(h, "SELECT DISTINCT r.* FROM recipes r LEFT JOIN ingredients i ON i.recipe_id = r.id WHERE (r.name LIKE ? OR r.description LIKE ? OR i.name LIKE ?) AND r.status != '已废弃' ORDER BY r.name ASC", [k, k, k]);
  return rows.map(toRecipe);
}

/** 按维度过滤（维度表只读透传）。原 `src/fetch/db.ts`，本域独占。 */
export function filterRecipes(h: ChefDb, filters: Record<string, unknown> = {}): RecipeRow[] {
  const conds = ['1=1'];
  const params: unknown[] = [];
  if (filters.status !== undefined && filters.status !== '') { conds.push('r.status = ?'); params.push(String(filters.status)); }
  else conds.push("r.status != '已废弃'");
  if (filters.difficulty !== undefined && filters.difficulty !== '') { conds.push('r.difficulty = ?'); params.push(String(filters.difficulty)); }
  if (filters.maxTime !== undefined && filters.maxTime !== '') { conds.push('r.total_time_minutes <= ?'); params.push(Number(filters.maxTime)); }
  const exists = (table: string, col: string, val: unknown): void => {
    conds.push('EXISTS (SELECT 1 FROM ' + table + ' t WHERE t.recipe_id = r.id AND t.' + col + ' = ?)');
    params.push(String(val));
  };
  if (filters.cuisine !== undefined && filters.cuisine !== '') exists('recipe_categories', 'cuisine_type', filters.cuisine);
  if (filters.season !== undefined && filters.season !== '') exists('recipe_seasons', 'season', filters.season);
  if (filters.method !== undefined && filters.method !== '') exists('recipe_cooking_methods', 'method', filters.method);
  if (filters.flavor !== undefined && filters.flavor !== '') exists('recipe_flavors', 'flavor', filters.flavor);
  if (filters.tag !== undefined && filters.tag !== '') exists('recipe_diet_tags', 'tag', filters.tag);
  if (filters.meal !== undefined && filters.meal !== '') exists('recipe_meal_types', 'meal_type', filters.meal);
  if (filters.cookware !== undefined && filters.cookware !== '') exists('cookware', 'name', filters.cookware);
  const rows = qAll<Record<string, unknown>>(h, 'SELECT DISTINCT r.* FROM recipes r WHERE ' + conds.join(' AND ') + ' ORDER BY r.name ASC', params);
  return rows.map(toRecipe);
}

// 搜菜/筛菜/全部：items + total + kind。原 `src/render/views.ts`，本域独占。
export function buildRecipeSearch(kind: string, items: RecipeItem[]): { items: RecipeItem[]; total: number; kind: string } {
  return { items, total: items.length, kind };
}

/** 跑 `chef.recipe.search`：关键词搜／查全部／维度过滤三路（list 形）。空结果缺失阻断，不返空冒充。 */
export function runRecipeSearch(handle: ChefDb, params: Record<string, unknown>): unknown {
  const q = params.q;
  let rows: RecipeRow[];
  let kind: string;
  if (typeof q === 'string' && q.trim()) {
    rows = searchRecipes(handle, q.trim());
    kind = 'search:' + q.trim();
  } else if (params.kind === 'all') {
    rows = listRecipes(handle);
    kind = 'all';
  } else {
    const present = FILTER_KEYS.filter((k) => params[k] !== undefined && params[k] !== '');
    if (!present.length) fail(2, 'search 须给 q、kind=all，或过滤条件（cuisine/season/method/flavor/tag/meal/cookware/difficulty/status/maxTime/filter）');
    const f: Record<string, unknown> = {};
    for (const k of ['cuisine', 'season', 'method', 'flavor', 'tag', 'meal', 'cookware', 'difficulty', 'status', 'maxTime'] as const) {
      const v = params[k];
      if (v !== undefined && v !== '') f[k] = typeof v === 'string' ? v.trim() : v;
    }
    // 别名：filter=通用筛选（川菜类示例按菜系走，与 HELP 示例对齐）；time_max/time=最大用时别名。
    if (f.cuisine === undefined && typeof params.filter === 'string' && params.filter.trim()) f.cuisine = params.filter.trim();
    if (f.maxTime === undefined && params.time_max !== undefined && params.time_max !== '') f.maxTime = params.time_max;
    if (f.maxTime === undefined && params.time !== undefined && params.time !== '') f.maxTime = params.time;
    if (!Object.keys(f).length) fail(2, 'search 过滤条件为空（须给 cuisine/season/method/flavor/tag/meal/cookware/difficulty/status/maxTime/filter 之一）');
    rows = filterRecipes(handle, f);
    kind = 'filter:' + Object.keys(f).sort().join(',');
  }
  if (!rows.length) throw new ChefFetchError('CHEF_EMPTY_RESULT', '搜菜无结果（缺失阻断，不返空冒充）');
  return buildRecipeSearch(kind, rows.map(toRecipeItem));
}
