/** T4 #23 · product_library 取数+写数（对照老家 scripts/product_library.py）。
 *
 * 读：searchProducts（LIKE 双字段 + is_deprecated 过滤）/ listProducts（limit 默认 50）/
 * listProductsByCategory / sourceStats。写：addProduct / updateProduct / deprecateProduct。
 * 不 print，返回数据；失败抛 FetchError。
 */
import type { DatabaseSync } from 'node:sqlite';
import { FetchError } from './errors.js';

export interface ProductRow {
  id: number;
  product_name: string;
  brand: string | null;
  calories: number;
  protein: number;
  fat: number;
  saturated_fat: number | null;
  carbohydrates: number;
  sugar: number | null;
  dietary_fiber: number | null;
  sodium: number;
  category?: string;
  source?: string;
  note: string | null;
  updated_at: string | null;
}

export interface AddProductInput {
  productName: string;
  brand?: string | null;
  calories: number;
  protein: number;
  fat: number;
  saturatedFat?: number | null;
  carbohydrates: number;
  sugar?: number | null;
  dietaryFiber?: number | null;
  sodium: number;
  note?: string;
}

const PRODUCT_COLS =
  'id, product_name, brand, calories, protein, fat, saturated_fat, carbohydrates, sugar, dietary_fiber, sodium, category, source, note, updated_at';

function num(v: unknown, field: string): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  if (!Number.isFinite(n)) throw new FetchError(field + ' 必须是数字');
  return n;
}

export function addProduct(db: DatabaseSync, input: AddProductInput): { id: number } {
  const name = String(input.productName ?? '').trim();
  if (!name) throw new FetchError('产品名必填');
  const run = db
    .prepare(
      'INSERT INTO nutrition_products (product_name, brand, calories, protein, fat, saturated_fat, carbohydrates, sugar, dietary_fiber, sodium, note)' +
        ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .run(
      name, input.brand ?? null, num(input.calories, 'calories'), num(input.protein, 'protein'), num(input.fat, 'fat'),
      input.saturatedFat ?? null, num(input.carbohydrates, 'carbohydrates'), input.sugar ?? null,
      input.dietaryFiber ?? null, num(input.sodium, 'sodium'), input.note ?? '',
    );
  return { id: Number(run.lastInsertRowid) };
}

export function searchProducts(db: DatabaseSync, keyword: string): ProductRow[] {
  const kw = '%' + String(keyword ?? '') + '%';
  return db
    .prepare(
      'SELECT ' + PRODUCT_COLS + ' FROM nutrition_products' +
        ' WHERE is_deprecated = 0 AND (product_name LIKE ? OR brand LIKE ?) ORDER BY product_name',
    )
    .all(kw, kw) as unknown as ProductRow[];
}

const UPDATE_FIELDS = [
  'product_name', 'brand', 'calories', 'protein', 'fat', 'saturated_fat',
  'carbohydrates', 'sugar', 'dietary_fiber', 'sodium', 'note', 'category', 'is_deprecated',
] as const;

export function updateProduct(db: DatabaseSync, id: number, fields: Partial<Record<(typeof UPDATE_FIELDS)[number], string | number | null>>): { updated: boolean } {
  if (!id) throw new FetchError('Product ID 必填');
  const keys = UPDATE_FIELDS.filter((k) => fields[k] !== undefined && fields[k] !== null);
  if (keys.length === 0) throw new FetchError('没有有效更新字段');
  const exists = db.prepare('SELECT product_name FROM nutrition_products WHERE id = ?').get(id);
  if (!exists) return { updated: false };
  const upd = db
    .prepare('UPDATE nutrition_products SET ' + keys.map((k) => k + ' = ?').join(', ') + ', updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(...keys.map((k) => fields[k] as string | number | null), id);
  return { updated: Number(upd.changes) > 0 };
}

export function deprecateProduct(db: DatabaseSync, id: unknown): { ok: boolean; id?: number; name?: string; error?: string } {
  const pid = typeof id === 'number' ? id : parseInt(String(id), 10);
  if (!Number.isInteger(pid)) return { ok: false, error: 'Product ID 必须是数字' };
  const row = db.prepare('SELECT product_name FROM nutrition_products WHERE id = ?').get(pid) as
    | { product_name: string }
    | undefined;
  if (!row) return { ok: false, error: 'Product ID ' + pid + ' not found' };
  db.prepare('UPDATE nutrition_products SET is_deprecated = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(pid);
  return { ok: true, id: pid, name: row.product_name };
}

export function listProducts(db: DatabaseSync, limit = 50): ProductRow[] {
  if (!Number.isInteger(limit) || limit < 1) throw new FetchError('limit 须为正整数');
  return db
    .prepare('SELECT ' + PRODUCT_COLS + ' FROM nutrition_products WHERE is_deprecated = 0 ORDER BY product_name LIMIT ?')
    .all(limit) as unknown as ProductRow[];
}

export function listProductsByCategory(db: DatabaseSync, category: string): ProductRow[] {
  return db
    .prepare('SELECT ' + PRODUCT_COLS + ' FROM nutrition_products WHERE is_deprecated = 0 AND category = ? ORDER BY product_name')
    .all(category) as unknown as ProductRow[];
}

export function sourceStats(db: DatabaseSync): { stats: Array<{ source: string; count: number }>; total: number } {
  const rows = db
    .prepare('SELECT source, COUNT(*) AS n FROM nutrition_products WHERE is_deprecated = 0 GROUP BY source ORDER BY COUNT(*) DESC')
    .all() as Array<{ source: string; n: number }>;
  const stats = rows.map((r) => ({ source: r.source, count: r.n }));
  return { stats, total: stats.reduce((a, s) => a + s.count, 0) };
}
