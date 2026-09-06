/** T9 #28 · 食品库盘数据（library/search 对应：food_search + product_library）。
 *
 * 数据源全 T4 products：searchProducts（LIKE 双字段+未弃用过滤）/ listProducts /
 * listProductsByCategory / sourceStats。空结果即 missing-data（查无即阻断，不返空页）；
 * keyword 空串即 bad-input；limit 范围 1..100。
 */
import type { DatabaseSync } from 'node:sqlite';
import { listProducts, listProductsByCategory, searchProducts, sourceStats } from '../fetch/products.js';
import type { ProductRow } from '../fetch/products.js';
import { FetchError } from '../fetch/errors.js';
import { CalorieRenderError } from './errors.js';

export interface ProductSearch {
  keyword: string;
  total: number;
  items: ProductRow[];
}

/** 查食品盘（food_search 按关键词）：无命中即 missing-data。 */
export function buildProductSearch(db: DatabaseSync, keyword: string, limit = 20): ProductSearch {
  const kw = String(keyword ?? '').trim();
  if (!kw) throw new CalorieRenderError('bad-input', '关键词必填');
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new CalorieRenderError('bad-input', 'limit 须为 1..100 整数');
  }
  let items: ProductRow[];
  try {
    items = searchProducts(db, kw).slice(0, limit);
  } catch (e) {
    if (e instanceof FetchError) throw new CalorieRenderError('missing-data', e.message);
    throw e;
  }
  if (items.length === 0) throw new CalorieRenderError('missing-data', '食品库无命中：' + kw);
  return { keyword: kw, total: items.length, items };
}

export interface ProductLibrary {
  category: string | null;
  total: number;
  items: ProductRow[];
}

/** 食品库盘（library 按分类/全量）：空库即 missing-data。 */
export function buildProductLibrary(db: DatabaseSync, category?: string | null, limit = 50): ProductLibrary {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new CalorieRenderError('bad-input', 'limit 须为 1..100 整数');
  }
  let items: ProductRow[];
  try {
    if (category) items = listProductsByCategory(db, category);
    else items = listProducts(db, limit);
  } catch (e) {
    if (e instanceof FetchError) throw new CalorieRenderError('missing-data', e.message);
    throw e;
  }
  if (items.length === 0) {
    throw new CalorieRenderError('missing-data', category ? '该分类空库：' + category : '食品库空（先导入食品）');
  }
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
