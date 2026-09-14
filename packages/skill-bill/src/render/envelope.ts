// 渲染层·envelope：16 联动 key×shape 映射（拆分表）；key 字符串后续票落表时冻结，此处只做形状分配与全字段校验。
// 迁移过的命令（记一笔／改记录）的形状**不在本文件写死**：从 `src/cli/registry.ts` 运行期派生。
import { createEnvelope, parseEnvelope, parseRegistryKey, type Envelope, type EnvelopeShape } from 'base-link-core';
import { REGISTRY } from '../cli/registry.js';
import { BillRenderError } from './errors.js';

/** 过渡表是**债务**：14 条尚未搬进能力目录的命令，形状仍写在这里。
 *  待生成器链那票把它替换成「全部命令的形状从注册表派生」——届时本表删掉，
 *  本文件只剩 `billShapeFor`／`buildBillEnvelope`／`parseBillEnvelope` 三件。 */
const TRANSITIONAL_KEY_SHAPES: Record<string, EnvelopeShape> = {
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

/** 形状表的组成：过渡表打底 ＋ 注册表里的命令逐条派生（**形状事实只住各能力的 `commands.ts`**）。
 *  过渡表里若还留着同一条命令且形状对不上 → 抛：那就是漏删了过渡表那一行。 */
function keyShapeTable(): Record<string, EnvelopeShape> {
  const out: Record<string, EnvelopeShape> = { ...TRANSITIONAL_KEY_SHAPES };
  for (const spec of Object.values(REGISTRY)) {
    const prev = out[spec.key];
    if (prev !== undefined && prev !== spec.shape) {
      throw new BillRenderError('BILL_SHAPE_MISMATCH', '形状两处不一致（迁移过的命令要从过渡表里删掉）：' + spec.key);
    }
    out[spec.key] = spec.shape;
  }
  return out;
}

export const BILL_KEY_SHAPES: Record<string, EnvelopeShape> = keyShapeTable();

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
