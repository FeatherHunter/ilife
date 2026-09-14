/** 饮食能力的子功能「查食品·批量导入写」（HELP 场景 02「饮食」下一级 diet_4）：批量导入食品。
 *
 * 读写分开：查询命令 `calorie.view.batch-import-preview` 只预览不写库；
 * 本命令 `calorie.product.import` 承接写入。校验口径与去重口径复用现成件：
 * `fetch/validate.ts` 的 `validateRecord`（与老家逐条一致）＋ `fetch/batch.ts` 的
 * `checkDuplicate`（product_name＋brand 完全相同视为同一条）；写库走
 * `diet/productStore.ts` 的 `addProduct`／`updateProduct`／`deprecateProduct`
 *（与 `calorie.product.add` 同一条写路）。
 *
 * 同步说明：`fetch/batch.ts:136` 的 `importProducts` 是异步文件路
 * （`file`＋重复时人工确认），命令处理函数是同步的，故命令侧只收 `items`
 * （数组即能跑）；`file` 路仍走脚本与预览→确认两段式，不在本命令内再包一层异步。
 * `source` 缺省记“批量导入”（`validateRecord` 要求非空；`productStore.addProduct`
 * 与 `calorie.product.add` 同形暂不存 source 列，缺口与存食品同口径，不在本票扩大范围）。
 * 声明住 `./commands.ts`；对外只经 `./index.ts`。
 */
import type { DatabaseSync } from 'node:sqlite';
import { checkDuplicate } from '../fetch/batch.js';
import { validateRecord } from '../fetch/validate.js';
import { CalorieRenderError } from '../render/errors.js';
import type { WriteOut } from '../shared/commandSpec.js';
import { fail, needArr, optStr } from '../shared/params.js';
import { F, R, out } from '../shared/writeParts.js';
import { addProduct, deprecateProduct, updateProduct } from './productStore.js';

type DuplicatePolicy = 'skip' | 'overwrite' | 'deprecate';

function strOf(o: Record<string, unknown>, ...names: string[]): unknown {
  for (const n of names) {
    const v = o[n];
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

function numOf(o: Record<string, unknown>, ...names: string[]): unknown {
  return strOf(o, ...names);
}

/** 命令参数归一化为 `validateRecord` 的蛇形记录（驼峰与蛇形两收）。 */
function normalize(o: Record<string, unknown>): Record<string, unknown> {
  const rec: Record<string, unknown> = {
    product_name: strOf(o, 'productName', 'product_name'),
    brand: strOf(o, 'brand') ?? null,
    calories: numOf(o, 'calories'),
    protein: numOf(o, 'protein'),
    fat: numOf(o, 'fat'),
    saturated_fat: numOf(o, 'saturatedFat', 'saturated_fat'),
    carbohydrates: numOf(o, 'carbohydrates'),
    sugar: numOf(o, 'sugar'),
    dietary_fiber: numOf(o, 'dietaryFiber', 'dietary_fiber'),
    sodium: numOf(o, 'sodium'),
    source: strOf(o, 'source') ?? '批量导入',
    note: strOf(o, 'note') ?? '',
  };
  const dep = strOf(o, 'isDeprecated', 'is_deprecated');
  if (dep !== undefined) rec['is_deprecated'] = dep;
  return rec;
}

function brandOf(rec: Record<string, unknown>): string | null {
  const b = rec['brand'];
  return typeof b === 'string' && b !== '' ? b : null;
}

/** `calorie.product.import` · 批量导入食品（同步 `items` 路）。 */
export function writeProductImport(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const items = needArr(params, 'items');
  if (items.length > 200) fail(2, 'items 至多 200 条');
  const policyRaw = optStr(params, 'onDuplicate') ?? 'skip';
  if (policyRaw !== 'skip' && policyRaw !== 'overwrite' && policyRaw !== 'deprecate') {
    fail(2, 'onDuplicate 须为 skip/overwrite/deprecate');
  }
  const policy = policyRaw as DuplicatePolicy;
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let deprecated = 0;
  const ids: number[] = [];
  const failures: { status: string; reason: string; detail: string }[] = [];
  items.forEach((raw, idx) => {
    try {
      const o = (raw ?? {}) as Record<string, unknown>;
      const rec = normalize(o);
      const v = validateRecord(rec);
      if (!v.ok) throw new CalorieRenderError('bad-input', v.error ?? '记录不合法');
      const dup = checkDuplicate(db, String(rec['product_name']).trim(), brandOf(rec));
      if (!dup) {
        const r = addProduct(db, {
          productName: String(rec['product_name']).trim(),
          brand: brandOf(rec),
          calories: rec['calories'] as number,
          protein: rec['protein'] as number,
          fat: rec['fat'] as number,
          saturatedFat: (rec['saturated_fat'] as number | undefined) ?? null,
          carbohydrates: rec['carbohydrates'] as number,
          sugar: (rec['sugar'] as number | undefined) ?? null,
          dietaryFiber: (rec['dietary_fiber'] as number | undefined) ?? null,
          sodium: rec['sodium'] as number,
          note: typeof rec['note'] === 'string' ? (rec['note'] as string) : '',
        });
        ids.push(r.id);
        inserted += 1;
        return;
      }
      if (policy === 'skip') {
        skipped += 1;
        return;
      }
      if (policy === 'overwrite') {
        const fields: Record<string, string | number | null> = {
          product_name: String(rec['product_name']).trim(),
          calories: rec['calories'] as number,
          protein: rec['protein'] as number,
          fat: rec['fat'] as number,
          carbohydrates: rec['carbohydrates'] as number,
          sodium: rec['sodium'] as number,
          note: typeof rec['note'] === 'string' ? (rec['note'] as string) : '',
        };
        if (rec['brand'] !== undefined) fields['brand'] = brandOf(rec);
        for (const k of ['saturated_fat', 'sugar', 'dietary_fiber'] as const) {
          if (rec[k] !== undefined) fields[k] = rec[k] as number | null;
        }
        updateProduct(db, dup.id, fields);
        ids.push(dup.id);
        updated += 1;
        return;
      }
      deprecateProduct(db, dup.id);
      deprecated += 1;
    } catch (e) {
      failures.push({
        status: '失败',
        reason: e instanceof Error ? e.message : String(e),
        detail: '第' + (idx + 1) + '条',
      });
    }
  });
  const failed = failures.length;
  const written = inserted + updated + deprecated;
  return out(R('批量导入食品', 'create', '批量导入食品：新增 ' + inserted + '，更新 ' + updated + '，跳过 ' + skipped + '，下架 ' + deprecated + '，失败 ' + failed, '批量导入食品', 'nutrition_products (写库回执)', {
    recordId: ids.length > 0 ? ids[0] : null,
    noChange: written === 0,
    ids,
    idSource: ids.length > 0 ? 'record' : 'none',
    writtenFields: written > 0 ? [...F.product] : [],
    items: failures.slice(0, 20).map((f) => ({ status: f.status, reason: f.reason, detail: f.detail })),
  }));
}
