// 渲染层·envelope：8 联动 key×shape 映射（拆分表）；key 字符串后续票落表时冻结，此处只做形状分配与全字段校验。
import { createEnvelope, parseEnvelope, parseRegistryKey, type Envelope, type EnvelopeShape } from 'base-link-core';
import { ScheduleRenderError } from './errors.js';

export const SCHEDULE_KEY_SHAPES: Record<string, EnvelopeShape> = {
  'schedule.record.today': 'list',
  'schedule.record.range': 'stat',
  'schedule.record.detail': 'detail',
  'schedule.record.write': 'receipt',
  'schedule.record.compare': 'analysis',
  'schedule.plan.today': 'list',
  'schedule.plan.write': 'receipt',
  'schedule.help.lookup': 'list',
};

export function scheduleShapeFor(key: string): EnvelopeShape {
  const s = SCHEDULE_KEY_SHAPES[key];
  if (!s) throw new ScheduleRenderError('SCHEDULE_UNKNOWN_KEY', '未知联动 key：' + key);
  return s;
}

// 建 envelope：key 先过命名空间，再按分配形状做全字段校验；错形状载荷即 throw。
export function buildScheduleEnvelope(key: string, data: unknown): Envelope {
  let parsedKey = '';
  try { parsedKey = parseRegistryKey(key).key; }
  catch (e) { throw new ScheduleRenderError('SCHEDULE_UNKNOWN_KEY', '非法 key：' + (e as Error).message); }
  const shape = scheduleShapeFor(parsedKey);
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new ScheduleRenderError('SCHEDULE_BAD_PAYLOAD', '载荷须为对象：' + parsedKey);
  }
  try {
    return createEnvelope({ skill: 'schedule', shape, key: parsedKey, data: data as never });
  } catch (e) {
    throw new ScheduleRenderError('SCHEDULE_SHAPE_MISMATCH', shape + ' 全字段未过：' + (e as Error).message);
  }
}

export function parseScheduleEnvelope(input: unknown): Envelope {
  try { return parseEnvelope(input); }
  catch (e) { throw new ScheduleRenderError('SCHEDULE_BAD_PAYLOAD', 'envelope 非法：' + (e as Error).message); }
}
