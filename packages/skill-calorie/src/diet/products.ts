/** 饮食能力的子功能「查食品·写」（HELP 场景 02「饮食」下一级 diet_4）：存食品／改食品／下架食品。
 *
 * #315 纯搬迁：三个处理体**逐字搬自** `src/cli/write.ts` 的对应 `case`（语义不动，只换住处）。
 * 取数走 `fetch/products.ts` 的公开接口，删除措辞与回执底座走共用位 `shared/writeParts.ts`。
 * 三条声明住 `./commands.ts`；对外只经 `./index.ts`。
 */
import type { DatabaseSync } from 'node:sqlite';
import { addProduct, deprecateProduct, updateProduct } from './productStore.js';
import { CalorieRenderError } from '../render/errors.js';
import type { WriteOut } from '../shared/commandSpec.js';
import { fail, needId, needNum, optNum, optStr } from '../shared/params.js';
import { F, R, SOFT_EXCLUDED_INNER, cliNames, deleteStatus, out } from '../shared/writeParts.js';

/** `calorie.product.add` · 存食品。 */
export function writeProductAdd(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const productName = (optStr(params, 'productName') ?? optStr(params, 'product_name') ?? '');
  if (!productName.trim()) fail(2, '缺参数 productName');
  const r = addProduct(db, {
    productName: productName.trim(), brand: optStr(params, 'brand'),
    calories: needNum(params, 'calories'), protein: needNum(params, 'protein'), fat: needNum(params, 'fat'),
    saturatedFat: optNum(params, 'saturatedFat'), carbohydrates: needNum(params, 'carbohydrates'),
    sugar: optNum(params, 'sugar'), dietaryFiber: optNum(params, 'dietaryFiber'),
    sodium: needNum(params, 'sodium'), note: optStr(params, 'note'),
  });
  return out(R('存食品', 'create', '已存食品 #' + r.id + '（' + productName.trim() + '）', '存食品', 'nutrition_products (写库回执)', {
    recordId: r.id, ids: [r.id], writtenFields: [...F.product],
    items: [{ id: r.id, status: '成功', reason: '', detail: productName.trim() }],
  }));
}

/** `calorie.product.update` · 改食品。 */
export function writeProductUpdate(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const id = needId(params);
  const map: Record<string, string> = {
    productName: 'product_name', brand: 'brand', calories: 'calories', protein: 'protein', fat: 'fat',
    saturatedFat: 'saturated_fat', carbohydrates: 'carbohydrates', sugar: 'sugar',
    dietaryFiber: 'dietary_fiber', sodium: 'sodium', note: 'note', category: 'category',
  };
  const fields: Record<string, string | number | null> = {};
  for (const [camel, col] of Object.entries(map)) {
    if (params[camel] !== undefined) fields[col] = params[camel] as string | number | null;
  }
  for (const k of Object.keys(params)) {
    if (!(k in map) && k !== 'id' && k !== 'key') fail(2, '不支持字段: ' + k);
  }
  if (Object.keys(fields).length === 0) fail(2, '至少传 1 个待改字段');
  const r = updateProduct(db, id, fields);
  if (!r.updated) throw new CalorieRenderError('missing-data', '食品 #' + id + ' 不存在');
  return out(R('改食品', 'update', '已更新食品 #' + id + '（' + Object.keys(fields).join('、') + '）', '改食品', 'nutrition_products (写库回执)', {
    recordId: id, ids: [id], writtenFields: cliNames(Object.keys(fields)),
    items: [{ id, status: '已更新', reason: '' }],
  }));
}

/** `calorie.product.deprecate` · 下架食品。 */
export function writeProductDeprecate(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const id = needId(params);
  const r = deprecateProduct(db, id);
  if (!r.ok) {
    if (/not found/.test(String(r.error ?? ''))) throw new CalorieRenderError('missing-data', '食品 #' + id + ' 不存在');
    fail(2, String(r.error ?? '废弃失败'));
  }
  return out(R('下架食品', 'update', '已下架食品 #' + id + '（' + (r.name ?? '') + ' · ' + SOFT_EXCLUDED_INNER + '）', '下架食品', 'nutrition_products (写库回执)', {
    recordId: id, ids: [id], writtenFields: ['is_deprecated'], items: [{ id, status: deleteStatus('soft', '已下架'), reason: '' }],
  }));
}
