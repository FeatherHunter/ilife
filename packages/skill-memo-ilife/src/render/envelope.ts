// 渲染层·envelope（M4）：11 联动 key×shape 映射（M1 拆分表 10 条 ＋ #229 的 memo.help.lookup）；key 字符串 P8 落表时冻结，此处只做形状分配与全字段校验。
import { createEnvelope, parseEnvelope, parseRegistryKey, type Envelope, type EnvelopeShape } from 'base-link-core';
import { MemoRenderError } from './errors.js';

export const MEMO_KEY_SHAPES: Record<string, EnvelopeShape> = {
  'memo.search': 'list',
  'memo.detail': 'detail',
  'memo.create': 'receipt',
  'memo.update': 'receipt',
  'memo.remove': 'receipt',
  'memo.remind': 'list',
  'memo.wish': 'list',
  'memo.sync': 'receipt',
  'memo.batch': 'receipt',
  'memo.stats': 'stat',
  // #229：「备忘录 help」这条主路（照 bill.help.lookup／home.help.lookup 命名）。载荷＝域级索引（list 形），
  // 由出口层 `dispatchHelp` 在**开库之前**装配——本键必须登表，否则出口早期就抛 `ERR 3: 未知联动 key`。
  'memo.help.lookup': 'list',
};

export function memoShapeFor(key: string): EnvelopeShape {
  const s = MEMO_KEY_SHAPES[key];
  if (!s) throw new MemoRenderError('MEMO_UNKNOWN_KEY', '未知联动 key：' + key);
  return s;
}

// 建 envelope：key 先过命名空间，再按分配形状做全字段校验；错形状载荷即 throw。
export function buildMemoEnvelope(key: string, data: unknown): Envelope {
  let parsedKey = '';
  try { parsedKey = parseRegistryKey(key).key; }
  catch (e) { throw new MemoRenderError('MEMO_UNKNOWN_KEY', '非法 key：' + (e as Error).message); }
  const shape = memoShapeFor(parsedKey);
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new MemoRenderError('MEMO_BAD_PAYLOAD', '载荷须为对象：' + parsedKey);
  }
  try {
    return createEnvelope({ skill: 'memo', shape, key: parsedKey, data: data as never });
  } catch (e) {
    throw new MemoRenderError('MEMO_SHAPE_MISMATCH', shape + ' 全字段未过：' + (e as Error).message);
  }
}

export function parseMemoEnvelope(input: unknown): Envelope {
  try { return parseEnvelope(input); }
  catch (e) { throw new MemoRenderError('MEMO_BAD_PAYLOAD', 'envelope 非法：' + (e as Error).message); }
}
