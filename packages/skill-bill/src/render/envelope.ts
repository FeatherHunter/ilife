// 渲染层·envelope：16 联动 key×shape 映射（拆分表）；key 字符串后续票落表时冻结，此处只做形状分配与全字段校验。
import { createEnvelope, parseEnvelope, parseRegistryKey, type Envelope, type EnvelopeShape } from '@feather_wch/base-link-core';
import { BillRenderError } from './errors.js';

export const BILL_KEY_SHAPES: Record<string, EnvelopeShape> = {
  'bill.record.add': 'receipt',
  'bill.record.update': 'receipt',
  'bill.record.today': 'list',
  'bill.record.range': 'list',
  'bill.record.search': 'list',
  'bill.record.detail': 'detail',
  'bill.analysis.overview': 'stat',
  'bill.analysis.compare': 'analysis',
  'bill.analysis.trend': 'analysis',
  'bill.goal.write': 'receipt',
  'bill.goal.query': 'list',
  'bill.account.write': 'receipt',
  'bill.account.query': 'list',
  'bill.link.submit': 'receipt',
  'bill.setup.run': 'receipt',
  'bill.help.lookup': 'list',
};

export function billShapeFor(key: string): EnvelopeShape {
  const s = BILL_KEY_SHAPES[key];
  if (!s) throw new BillRenderError('BILL_UNKNOWN_KEY', '未知联动 key：' + key);
  return s;
}

// 建 envelope：key 先过命名空间，再按分配形状做全字段校验；错形状载荷即 throw。
export function buildBillEnvelope(key: string, data: unknown): Envelope {
  let parsedKey = '';
  try { parsedKey = parseRegistryKey(key).key; }
  catch (e) { throw new BillRenderError('BILL_UNKNOWN_KEY', '非法 key：' + (e as Error).message); }
  const shape = billShapeFor(parsedKey);
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new BillRenderError('BILL_BAD_PAYLOAD', '载荷须为对象：' + parsedKey);
  }
  try {
    return createEnvelope({ skill: 'bill', shape, key: parsedKey, data: data as never });
  } catch (e) {
    throw new BillRenderError('BILL_SHAPE_MISMATCH', shape + ' 全字段未过：' + (e as Error).message);
  }
}

export function parseBillEnvelope(input: unknown): Envelope {
  try { return parseEnvelope(input); }
  catch (e) { throw new BillRenderError('BILL_BAD_PAYLOAD', 'envelope 非法：' + (e as Error).message); }
}
