// 口径层·物品增改查校验（老家 features/add.md + commands.md 对应）。
// add 须 name+category_id+location；update 须 id；数量/状态/移动各守卫；坏输入阻断不返空。
import { HomePolicyError } from '../fetch/errors.js';
import { normalizeLocation, normalizeStatus } from './category.js';

export function validateAddInput(p: Record<string, unknown>): {
  name: string; category_id: number; location: string; owner: string;
  purchase_price: number | null; remark: string | null; photo: string | null;
  quantity: number; location_status: string; purchase_date: string | null;
  expiration_date: string | null; reason: string | null; tags: string[];
} {
  const name = typeof p.name === 'string' ? p.name.trim() : '';
  if (!name) throw new HomePolicyError('POLICY_BAD_INPUT', '录物品须给 name');
  const cid = p.category_id ?? p.categoryId;
  if (!Number.isInteger(cid) || (cid as number) <= 0) throw new HomePolicyError('POLICY_BAD_INPUT', '录物品须给 category_id 正整数（从 categories 表查）');
  const location = normalizeLocation(p.location);
  const quantity = p.quantity === undefined ? 1 : p.quantity;
  if (!Number.isInteger(quantity) || (quantity as number) <= 0) throw new HomePolicyError('POLICY_BAD_INPUT', 'quantity 须为正整数');
  const status = p.location_status === undefined || p.location_status === null ? '在家' : normalizeStatus(p.location_status);
  let price: number | null = null;
  if (p.price !== undefined && p.price !== null) {
    if (typeof p.price !== 'number' || !(p.price as number >= 0)) throw new HomePolicyError('POLICY_BAD_INPUT', 'price 须为非负数');
    price = p.price as number;
  } else if (p.purchase_price !== undefined && p.purchase_price !== null) {
    if (typeof p.purchase_price !== 'number' || !(p.purchase_price as number >= 0)) throw new HomePolicyError('POLICY_BAD_INPUT', 'purchase_price 须为非负数');
    price = p.purchase_price as number;
  }
  for (const d of ['purchase_date', 'purchaseDate', 'expiration_date', 'expirationDate'] as const) {
    const v = (p as Record<string, unknown>)[d];
    if (v !== undefined && v !== null && typeof v === 'string' && v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      throw new HomePolicyError('POLICY_BAD_DATE', '日期须 YYYY-MM-DD：' + d);
    }
  }
  const tags: string[] = [];
  if (p.tags !== undefined && p.tags !== null) {
    if (typeof p.tags !== 'string') throw new HomePolicyError('POLICY_BAD_INPUT', 'tags 须为逗号分隔字符串');
    for (const t of (p.tags as string).split(',')) { const s = t.trim(); if (s) tags.push(s); }
  }
  return {
    name, category_id: cid as number, location, owner: typeof p.owner === 'string' && p.owner ? p.owner : '使用者',
    purchase_price: price, remark: typeof p.remark === 'string' ? p.remark : null,
    photo: typeof p.photo === 'string' ? p.photo : null, quantity: quantity as number, location_status: status,
    purchase_date: (p.purchase_date ?? p.purchaseDate ?? null) as string | null,
    expiration_date: (p.expiration_date ?? p.expirationDate ?? null) as string | null,
    reason: typeof p.reason === 'string' ? p.reason : null, tags,
  };
}

export function parseUpdateOp(p: Record<string, unknown>): string {
  if (p.op !== undefined) {
    if (typeof p.op !== 'string' || !p.op) throw new HomePolicyError('POLICY_BAD_INPUT', 'op 须为非空字符串');
    return p.op as string;
  }
  if (p.plus !== undefined || p.minus !== undefined || p.set !== undefined || p.quantity !== undefined) return 'qty';
  if (p.location_status !== undefined || p.status !== undefined) return 'status';
  if (p.new_location !== undefined || p.newLocation !== undefined) return 'move';
  if (p.tags !== undefined) return 'tags';
  if (p.target !== undefined || p.sources !== undefined) return 'merge';
  if (p.related !== undefined) return 'relate';
  if (p.photo !== undefined && Object.keys(p).length <= 3) return 'photo';
  return 'generic';
}

export function needId(p: Record<string, unknown>): number {
  const v = p.id ?? p.item_id ?? p.itemId;
  if (!Number.isInteger(v) || (v as number) <= 0) throw new HomePolicyError('POLICY_BAD_INPUT', '须给 id 正整数');
  return v as number;
}
