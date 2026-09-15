/** T9 #28 · 食品库盘数据（library/search 对应：food_search + product_library）。
 *
 * 数据源全 T4 products：searchProducts（LIKE 双字段+未弃用过滤）/ listProducts /
 * listProductsByCategory / sourceStats。keyword 空串即 bad-input；limit 范围 1..100。
 *
 * **两态分开（2026-09-15 编排者口径，`t425-融合基准.md` 裁定 4 的澄清）**：
 *   · **整个数据面为空**（库里一条在架食品都没有）⇒ `missing-data` 阻断，`exit 4`、不落盘；
 *   · **库里有东西、只是本次查询零命中**（关键词搜不到／分类里没有）⇒ **不出阻断**，
 *     返 `total 0` 的空盘，由装配层出完整页 ＋ 空态句 ＋ 引导句、`exit 0`、落盘。
 *   老实物正本同口径：`food_search.html:98-101` 对 `items.length === 0` 出 `emptyState`；
 *   `scripts/render_food_search.py:132-153` 无论命中几条都 `status:'ok'`、写页、`return 0`。
 */
import type { DatabaseSync } from 'node:sqlite';
import { listProducts, listProductsByCategory, searchProducts, sourceStats } from './productStore.js';
import type { ProductRow } from './productStore.js';
import { FetchError } from '../fetch/errors.js';
import { CalorieRenderError } from '../render/errors.js';

export interface ProductSearch {
  keyword: string;
  /** 本次命中条数（可以 0）。 */
  total: number;
  /** 库内在架食品总数（页脚与两态判别都用它，不是本次命中数）。 */
  libraryTotal: number;
  items: ProductRow[];
}

/** 查食品盘（food_search 按关键词）：**库整体为空**才 missing-data；库里非空而本次零命中出空盘。 */
export function buildProductSearch(db: DatabaseSync, keyword: string, limit = 20): ProductSearch {
  const kw = String(keyword ?? '').trim();
  if (!kw) throw new CalorieRenderError('bad-input', '关键词必填');
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new CalorieRenderError('bad-input', 'limit 须为 1..100 整数');
  }
  let items: ProductRow[];
  let libraryTotal: number;
  try {
    libraryTotal = sourceStats(db).total;
    items = searchProducts(db, kw).slice(0, limit);
  } catch (e) {
    if (e instanceof FetchError) throw new CalorieRenderError('missing-data', e.message);
    throw e;
  }
  if (libraryTotal === 0) throw new CalorieRenderError('missing-data', '食品库空（先导入食品）');
  return { keyword: kw, total: items.length, libraryTotal, items };
}

export interface ProductLibrary {
  category: string | null;
  total: number;
  items: ProductRow[];
}

/** 食品库盘（library 按分类/全量）：**库整体为空**才 missing-data；库非空而该分类零命中出空盘。 */
export function buildProductLibrary(db: DatabaseSync, category?: string | null, limit = 50): ProductLibrary {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new CalorieRenderError('bad-input', 'limit 须为 1..100 整数');
  }
  let items: ProductRow[];
  let libraryTotal: number;
  try {
    libraryTotal = sourceStats(db).total;
    if (category) items = listProductsByCategory(db, category);
    else items = listProducts(db, limit);
  } catch (e) {
    if (e instanceof FetchError) throw new CalorieRenderError('missing-data', e.message);
    throw e;
  }
  if (libraryTotal === 0) throw new CalorieRenderError('missing-data', '食品库空（先导入食品）');
  return { category: category ?? null, total: items.length, items: items.slice(0, limit) };
}

export interface ProductStats {
  total: number;
  stats: Array<{ source: string; count: number }>;
}

/** 库来源统计盘（source_stats）：total 0 即 missing-data。 */
export function buildProductStats(db: DatabaseSync): ProductStats {
  const r = sourceStats(db);
  if (r.total === 0) throw new CalorieRenderError('missing-data', '食品库空（先导入食品）');
  return { total: r.total, stats: r.stats };
}
