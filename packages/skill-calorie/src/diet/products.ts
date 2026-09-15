/** 饮食能力的子功能「查食品·写」（HELP 场景 02「饮食」下一级 diet_4）：存食品／改食品／下架食品。
 *
 * #315 纯搬迁：三个处理体**逐字搬自** `src/cli/write.ts` 的对应 `case`（语义不动，只换住处）。
 * 取数走 `diet/productStore.ts` 的公开接口，删除措辞与回执底座走共用位 `shared/writeParts.ts`。
 * 三条声明住 `./commands.ts`；对外只经 `./index.ts`。
 */
import type { DatabaseSync } from 'node:sqlite';
import { addProduct, deprecateProduct, updateProduct } from './productStore.js';
import { CalorieRenderError } from '../render/errors.js';
import type { WriteOut } from '../shared/commandSpec.js';
import { fail, needId, needNum, optNum, optStr } from '../shared/params.js';
import { fieldLabel } from '../shared/fieldLabel.js';
import { DIET_DOMAIN } from './fieldLabels.js';
import { F, R, deleteStatus, out } from '../shared/writeParts.js';

/** 字段键 → 中文标签（走 `./fieldLabels.ts` 那张域表；缺项回退原键名，不编词）。 */
function zhLabel(key: string): string {
  return fieldLabel(DIET_DOMAIN, key);
}

/** 被改字段串：库列名（`note`／`dietary_fiber`）换中文，逗号顿开。 */
function changedText(cols: readonly string[]): string {
  return cols.map(zhLabel).join('、');
}

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
  return out(R('存食品', 'create', '已存食品：' + productName.trim(), '存食品', '食品库', {
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
  /* #496 · 摘要原写「已更新食品 #1（note）」——库列名与编号上屏（审查件第 32 条同形）⇒ 字段换中文。 */
  return out(R('改食品', 'update', '已改食品：' + changedText(Object.keys(fields)), '改食品', '食品库', {
    recordId: id, ids: [id], writtenFields: cliNamesOf(Object.keys(fields)),
    items: [{ id, status: '已更新', reason: '' }],
  }));
}

/** 库列名 → CLI 参数名（回执 `writtenFields` 的口径：`shared/writeParts.ts` 的 `COL_CLI`）。
 *  本件按同一张表走，避免为「改食品」这一个调用点再把 `cliNames` 引回来。 */
function cliNamesOf(cols: readonly string[]): string[] {
  return cols.map((c) => CHANGED_COL_CLI[c] ?? c);
}

const CHANGED_COL_CLI: Readonly<Record<string, string>> = Object.freeze({
  product_name: 'productName', brand: 'brand', calories: 'calories', protein: 'protein', fat: 'fat',
  saturated_fat: 'saturatedFat', carbohydrates: 'carbohydrates', sugar: 'sugar',
  dietary_fiber: 'dietaryFiber', sodium: 'sodium', note: 'note', category: 'category',
});

/** `calorie.product.deprecate` · 下架食品。 */
export function writeProductDeprecate(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const id = needId(params);
  const r = deprecateProduct(db, id);
  if (!r.ok) {
    if (/not found/.test(String(r.error ?? ''))) throw new CalorieRenderError('missing-data', '食品 #' + id + ' 不存在');
    fail(2, String(r.error ?? '废弃失败'));
  }
  /* #496 · 摘要原写「…（鸡胸肉 · 软删除：行保留，已从查询与统计中排除；暂无恢复入口）」——
     软删除那串是共用位 `SOFT_EXCLUDED_INNER`（库层措辞，审查件第 5 条点到）⇒ 本页改人话。
     共用位的常量一个字节不动：运动／身体／体重三域的摘要同用那一串，改它等于三域一起换文案，
     不在本票写集内（详见证据件「影响面」一节）。 */
  return out(R('下架食品', 'update', '已下架：' + (r.name ?? '') + '（不再出现在搜索和统计里；暂时无法恢复）', '下架食品', '食品库', {
    recordId: id, ids: [id], writtenFields: ['is_deprecated'], items: [{ id, status: deleteStatus('soft', '已下架'), reason: '' }],
  }));
}
