// 渲染层·envelope：8 联动 key×shape 映射；key 字符串后续票落表时冻结，此处只做形状分配与全字段校验。
import { createEnvelope, parseEnvelope, parseRegistryKey, type Envelope, type EnvelopeShape } from '@feather_wch/base-link-core';
import { ChefRenderError } from './errors.js';

export const CHEF_KEY_SHAPES: Record<string, EnvelopeShape> = {
  'chef.recipe.view': 'detail',
  'chef.recipe.search': 'list',
  'chef.recipe.write': 'receipt',
  'chef.cooking.run': 'list',
  'chef.shopping.query': 'list',
  'chef.history.record': 'receipt',
  'chef.history.query': 'list',
  'chef.help.lookup': 'list',
};

export function chefShapeFor(key: string): EnvelopeShape {
  const s = CHEF_KEY_SHAPES[key];
  if (!s) throw new ChefRenderError('CHEF_UNKNOWN_KEY', '未知联动 key：' + key);
  return s;
}

// 建 envelope：key 先过命名空间，再按分配形状做全字段校验；错形状载荷即 throw。
export function buildChefEnvelope(key: string, data: unknown): Envelope {
  let parsedKey = '';
  try { parsedKey = parseRegistryKey(key).key; }
  catch (e) { throw new ChefRenderError('CHEF_UNKNOWN_KEY', '非法 key：' + (e as Error).message); }
  const shape = chefShapeFor(parsedKey);
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new ChefRenderError('CHEF_BAD_PAYLOAD', '载荷须为对象：' + parsedKey);
  }
  try {
    return createEnvelope({ skill: 'chef', shape, key: parsedKey, data: data as never });
  } catch (e) {
    throw new ChefRenderError('CHEF_SHAPE_MISMATCH', shape + ' 全字段未过：' + (e as Error).message);
  }
}

export function parseChefEnvelope(input: unknown): Envelope {
  try { return parseEnvelope(input); }
  catch (e) { throw new ChefRenderError('CHEF_BAD_PAYLOAD', 'envelope 非法：' + (e as Error).message); }
}
