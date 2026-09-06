// 渲染层·envelope：21 联动 key×shape 映射（拆分表）；key 字符串后续票落表时冻结，此处只做形状分配与全字段校验。
import { createEnvelope, parseEnvelope, parseRegistryKey, type Envelope, type EnvelopeShape } from '@feather_wch/base-link-core';
import { HomeRenderError } from './errors.js';

export const HOME_KEY_SHAPES: Record<string, EnvelopeShape> = {
  'home.item.search': 'list',
  'home.item.detail': 'detail',
  'home.item.add': 'receipt',
  'home.item.update': 'receipt',
  'home.tag.query': 'list',
  'home.tag.write': 'receipt',
  'home.inventory.round': 'receipt',
  'home.inventory.records': 'list',
  'home.location.query': 'list',
  'home.location.write': 'receipt',
  'home.outfit.pick': 'list',
  'home.trip.manage': 'receipt',
  'home.stats.overview': 'stat',
  'home.stats.alert': 'list',
  'home.shopping.query': 'list',
  'home.shopping.write': 'receipt',
  'home.ticket.query': 'list',
  'home.ticket.write': 'receipt',
  'home.care.query': 'list',
  'home.care.write': 'receipt',
  'home.help.lookup': 'list',
};

export function homeShapeFor(key: string): EnvelopeShape {
  const s = HOME_KEY_SHAPES[key];
  if (!s) throw new HomeRenderError('HOME_UNKNOWN_KEY', '未知联动 key：' + key);
  return s;
}

// 建 envelope：key 先过命名空间，再按分配形状做全字段校验；错形状载荷即 throw。
export function buildHomeEnvelope(key: string, data: unknown): Envelope {
  let parsedKey = '';
  try { parsedKey = parseRegistryKey(key).key; }
  catch (e) { throw new HomeRenderError('HOME_UNKNOWN_KEY', '非法 key：' + (e as Error).message); }
  const shape = homeShapeFor(parsedKey);
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new HomeRenderError('HOME_BAD_PAYLOAD', '载荷须为对象：' + parsedKey);
  }
  try {
    return createEnvelope({ skill: 'home', shape, key: parsedKey, data: data as never });
  } catch (e) {
    throw new HomeRenderError('HOME_SHAPE_MISMATCH', shape + ' 全字段未过：' + (e as Error).message);
  }
}

export function parseHomeEnvelope(input: unknown): Envelope {
  try { return parseEnvelope(input); }
  catch (e) { throw new HomeRenderError('HOME_BAD_PAYLOAD', 'envelope 非法：' + (e as Error).message); }
}
