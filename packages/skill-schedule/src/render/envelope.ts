// 渲染层·envelope：8 联动 key×shape 映射是生成物 `src/cli/keys.ts` 的派生（纪律形状二），
// 本件只做建 envelope 的形状守卫；key 字符串后续票落表时冻结。唯一定义地＝各能力 `commands.ts`。
import { createEnvelope, parseEnvelope, parseRegistryKey, type Envelope, type EnvelopeShape } from 'base-link-core';
import { SCHEDULE_KEY_SHAPES } from '../cli/keys.js';
import { ScheduleRenderError } from './errors.js';

export { SCHEDULE_KEY_SHAPES };

export function scheduleShapeFor(key: string): EnvelopeShape {
  // 字符串边界：未知输入进、已知键出；`as` 只放行到运行时判空这一处。
  const s = (SCHEDULE_KEY_SHAPES as Record<string, EnvelopeShape>)[key];
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
