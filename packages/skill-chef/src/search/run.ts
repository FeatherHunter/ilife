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
// #771：补 `ingredient`（按食材含）与 `ingredient_exclude`（排除食材 NOT 条件，老件 search-6），
// 3 条路由错位至此收敛：筛选菜系走 `cuisine`（`filter` 别名保留兼容），筛选食材走 `ingredient`，
// 筛选口味走 `flavor`，筛选季节走 `season`（后三者经显式键，不再经 `filter` 绕 `cuisine`）。
export const FILTER_KEYS = ['cuisine', 'season', 'method', 'flavor', 'tag', 'meal', 'cookware', 'difficulty', 'status', 'maxTime', 'filter', 'ingredient', 'ingredient_exclude'] as const;

/** 过滤维度的**别名**键（老件 `scenes/搜索筛选.yaml` 的词面）：`time_max`／`time` → `maxTime`。
 *
 * #841 修：这两个别名原先在「一个维度都没给」那道预检**之后**才被认（下面 113–114 行的归一），
 * 而那道预检只点名 `FILTER_KEYS` ⇒ 只给 `time_max` 会被判成「没给过滤条件」exit 2，
 * 归一那两行成了走不到的死代码（`filter_time_quick` 那张卡一直因此打不通）。别名属**同一维度**，
 * 故与 `FILTER_KEYS` 一起参与预检，归一换算仍在下面一处。 */
const FILTER_ALIAS_KEYS = ['time_max', 'time'] as const;

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
  // #771：按食材含（老件 search-5：列出含该食材的菜）与排除食材（老件 search-6：NOT 条件查询）。
  if (filters.ingredient !== undefined && filters.ingredient !== '') exists('ingredients', 'name', filters.ingredient);
  if (filters.ingredient_exclude !== undefined && filters.ingredient_exclude !== '') {
    conds.push('NOT EXISTS (SELECT 1 FROM ingredients t WHERE t.recipe_id = r.id AND t.name = ?)');
    params.push(String(filters.ingredient_exclude));
  }
  const rows = qAll<Record<string, unknown>>(h, 'SELECT DISTINCT r.* FROM recipes r WHERE ' + conds.join(' AND ') + ' ORDER BY r.name ASC', params);
  return rows.map(toRecipe);
}

// 搜菜/筛菜/全部：items + total + kind。原 `src/render/views.ts`，本域独占。
export function buildRecipeSearch(kind: string, items: RecipeItem[]): { items: RecipeItem[]; total: number; kind: string } {
  return { items, total: items.length, kind };
}

/** 跑 `chef.recipe.search`：关键词搜／查全部／维度过滤三路（list 形）。空结果缺失阻断，不返空冒充。
 *
 * #771 口径（三条，老件 `scenes/搜索筛选.yaml` 为准）：
 * - 错字模糊匹配（search-2）：精确命中直接返；精确无结果时去尾一字再查，命中则 `kind` 记
 *   `search-fuzzy:<原词>`（页面据此印纠错提示并直接展示结果），仍无结果则如实抛 `CHEF_EMPTY_RESULT`
 *   走无结果口径。不建字典／拼音表（需建另立票，见本票遗留出口）。
 * - 多维组合筛选（search-4）：至多 3 维，超限直接拦（exit 2 并点名维数），不再静默取交集。
 * - 排除食材（search-6）：`ingredient_exclude`（别名 `exclude_ingredient`／`exclude`）走 NOT 条件。
 */
export function runRecipeSearch(handle: ChefDb, params: Record<string, unknown>): unknown {
  const q = params.q;
  let rows: RecipeRow[];
  let kind: string;
  if (typeof q === 'string' && q.trim()) {
    const kw = q.trim();
    const exact = searchRecipes(handle, kw);
    if (exact.length) {
      rows = exact;
      kind = 'search:' + kw;
    } else {
      const short = kw.slice(0, -1);
      if (short.length >= 2) {
        const fb = searchRecipes(handle, short);
        if (fb.length) {
          rows = fb;
          kind = 'search-fuzzy:' + kw;
        } else {
          throw new ChefFetchError('CHEF_EMPTY_RESULT', '搜菜无结果（缺失阻断，不返空冒充）');
        }
      } else {
        throw new ChefFetchError('CHEF_EMPTY_RESULT', '搜菜无结果（缺失阻断，不返空冒充）');
      }
    }
  } else if (params.kind === 'all') {
    rows = listRecipes(handle);
    kind = 'all';
  } else {
    const present = [...FILTER_KEYS, ...FILTER_ALIAS_KEYS].filter((k) => params[k] !== undefined && params[k] !== '');
    if (!present.length) fail(2, 'search 须给 q、kind=all，或过滤条件（cuisine/season/method/flavor/tag/meal/cookware/difficulty/status/maxTime/filter/ingredient/ingredient_exclude，别名 time_max／time）');
    const f: Record<string, unknown> = {};
    for (const k of ['cuisine', 'season', 'method', 'flavor', 'tag', 'meal', 'cookware', 'difficulty', 'status', 'maxTime', 'ingredient', 'ingredient_exclude'] as const) {
      const v = params[k];
      if (v !== undefined && v !== '') f[k] = typeof v === 'string' ? v.trim() : v;
    }
    // 别名：filter=通用筛选（川菜类示例按菜系走，与 HELP 示例对齐，筛选菜系仍走 cuisine）；
    // time_max/time=最大用时别名；exclude_ingredient/exclude=排除食材别名（老件 search-6「不吃/不要/忌」）。
    if (f.cuisine === undefined && typeof params.filter === 'string' && params.filter.trim()) f.cuisine = params.filter.trim();
    if (f.maxTime === undefined && params.time_max !== undefined && params.time_max !== '') f.maxTime = params.time_max;
    if (f.maxTime === undefined && params.time !== undefined && params.time !== '') f.maxTime = params.time;
    if (f.ingredient_exclude === undefined && params.exclude_ingredient !== undefined && params.exclude_ingredient !== '') f.ingredient_exclude = params.exclude_ingredient;
    if (f.ingredient_exclude === undefined && params.exclude !== undefined && params.exclude !== '') f.ingredient_exclude = params.exclude;
    if (!Object.keys(f).length) fail(2, 'search 过滤条件为空（须给 cuisine/season/method/flavor/tag/meal/cookware/difficulty/status/maxTime/filter/ingredient/ingredient_exclude 之一）');
    if (Object.keys(f).length > 3) fail(2, '组合筛选至多 3 维（老件 search-4）：本次 ' + Object.keys(f).length + ' 维（' + Object.keys(f).sort().join('、') + '）');
    rows = filterRecipes(handle, f);
    kind = 'filter:' + Object.keys(f).sort().join(',');
  }
  if (!rows.length) throw new ChefFetchError('CHEF_EMPTY_RESULT', '搜菜无结果（缺失阻断，不返空冒充）');
  return buildRecipeSearch(kind, rows.map(toRecipeItem));
}
