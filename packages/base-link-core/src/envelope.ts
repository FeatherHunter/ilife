/**
 * envelope：唯一出口载荷。6 形状全字段，semver 版本化。
 * 零依赖：手写守卫（不用 Zod），保 P4 零依赖冻结；Zod 可后加于 combos/skill 层。
 */
import { EnvelopeError } from './errors.js';

export const ENVELOPE_VERSION = '0.1.0' as const;

// 6 形状：list 今日列表 / detail 单条详情 / stat 聚合统计 / receipt 写入回执 / analysis 开放式分析(L6) / fallback 降级载荷
export const ENVELOPE_SHAPES = ['list', 'detail', 'stat', 'receipt', 'analysis', 'fallback'] as const;
export type EnvelopeShape = (typeof ENVELOPE_SHAPES)[number];

export interface EnvelopeDataByShape {
  list: { items: unknown[]; total?: number };
  detail: { item: Record<string, unknown> };
  stat: { metrics: Record<string, number> };
  receipt: { ok: boolean; message: string };
  analysis: { summary: string };
  fallback: { reason: string; degraded: true };
}

export interface Envelope<S extends EnvelopeShape = EnvelopeShape> {
  version: typeof ENVELOPE_VERSION;
  skill: string;
  shape: S;
  // registry 命名空间 key：形如 skill.combo，对不上即 fail
  key: string;
  data: EnvelopeDataByShape[S];
}

const SEMVER_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:[-+].*)?$/;

function vstr(v: unknown): string { return String(v); }

function assertSemverCompatible(version: unknown): asserts version is typeof ENVELOPE_VERSION {
  if (typeof version !== 'string' || !SEMVER_RE.test(version)) {
    throw new EnvelopeError('version 非法 semver：' + vstr(version));
  }
  const major = version.split('.')[0];
  const want = ENVELOPE_VERSION.split('.')[0];
  if (major !== want) throw new EnvelopeError('version 主版本不兼容：' + version + '（当前 ' + ENVELOPE_VERSION + '）');
}

function assertNonEmptyString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) throw new EnvelopeError(field + ' 须为非空字符串');
}

function assertDataObject(data: unknown): asserts data is Record<string, unknown> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new EnvelopeError('data 须为对象（坏输入不返空数组）');
  }
}

// 逐形状全字段校验：缺字段即 throw，不返空。
export function assertShapeData(shape: EnvelopeShape, data: Record<string, unknown>): void {
  switch (shape) {
    case 'list':
      if (!Array.isArray(data.items)) throw new EnvelopeError('list 形缺 items 数组');
      if (data.total !== undefined && typeof data.total !== 'number') throw new EnvelopeError('list 形 total 须为 number');
      break;
    case 'detail':
      if (typeof data.item !== 'object' || data.item === null || Array.isArray(data.item)) {
        throw new EnvelopeError('detail 形缺 item 对象');
      }
      break;
    case 'stat':
      if (typeof data.metrics !== 'object' || data.metrics === null || Array.isArray(data.metrics)) {
        throw new EnvelopeError('stat 形缺 metrics 对象');
      }
      for (const v of Object.values(data.metrics as Record<string, unknown>)) {
        if (typeof v !== 'number') throw new EnvelopeError('stat 形 metrics 值须全为 number');
      }
      break;
    case 'receipt':
      if (typeof data.ok !== 'boolean' || typeof data.message !== 'string') {
        throw new EnvelopeError('receipt 形缺 ok/message 全字段');
      }
      break;
    case 'analysis':
      if (typeof data.summary !== 'string' || data.summary.length === 0) {
        throw new EnvelopeError('analysis 形缺 summary 全字段');
      }
      break;
    case 'fallback':
      if (typeof data.reason !== 'string' || data.reason.length === 0 || data.degraded !== true) {
        throw new EnvelopeError('fallback 形缺 reason/degraded:true 全字段（须显式标记降级）');
      }
      break;
  }
}

export function createEnvelope<S extends EnvelopeShape>(input: {
  skill: string;
  shape: S;
  key: string;
  data: EnvelopeDataByShape[S];
}): Envelope<S> {
  if (typeof input !== 'object' || input === null) throw new EnvelopeError('入参须为对象');
  assertNonEmptyString(input.skill, 'skill');
  if (!ENVELOPE_SHAPES.includes(input.shape)) throw new EnvelopeError('未知 shape：' + vstr(input.shape));
  assertNonEmptyString(input.key, 'key');
  assertDataObject(input.data);
  assertShapeData(input.shape, input.data);
  return { version: ENVELOPE_VERSION, skill: input.skill, shape: input.shape, key: input.key, data: input.data };
}

// 校验未知输入（CLI/跨包边界）：合法返回 envelope，非法 throw。
export function parseEnvelope(input: unknown): Envelope {
  if (typeof input !== 'object' || input === null) throw new EnvelopeError('envelope 须为对象');
  const e = input as Record<string, unknown>;
  assertSemverCompatible(e.version);
  assertNonEmptyString(e.skill, 'skill');
  if (typeof e.shape !== 'string' || !ENVELOPE_SHAPES.includes(e.shape as EnvelopeShape)) {
    throw new EnvelopeError('未知 shape：' + vstr(e.shape));
  }
  assertNonEmptyString(e.key, 'key');
  assertDataObject(e.data);
  assertShapeData(e.shape as EnvelopeShape, e.data);
  return { version: ENVELOPE_VERSION, skill: e.skill, shape: e.shape as EnvelopeShape, key: e.key, data: e.data as never };
}

export function isEnvelope(input: unknown): input is Envelope {
  try {
    parseEnvelope(input);
    return true;
  } catch {
    return false;
  }
}
