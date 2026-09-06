// runner：唯一取数编排。key 先过 registry，载荷再过 envelope 全字段；失败 throw，永不合成空数组。
import { createEnvelope, type Envelope, type EnvelopeShape, type EnvelopeDataByShape } from './envelope.js';
import { RunnerError } from './errors.js';
import type { Registry } from './registry.js';

export interface RunRequest<S extends EnvelopeShape> {
  key: string;
  shape: S;
  params?: Record<string, unknown>;
  signal?: AbortSignal;
}

export type Fetcher<S extends EnvelopeShape> = (
  req: { skill: string; combo: string; params: Record<string, unknown>; signal?: AbortSignal },
) => Promise<EnvelopeDataByShape[S]> | EnvelopeDataByShape[S];

export async function runCombo<S extends EnvelopeShape>(
  registry: Registry,
  req: RunRequest<S>,
  fetchData: Fetcher<S>,
): Promise<Envelope<S>> {
  if (typeof req !== 'object' || req === null) throw new RunnerError('请求须为对象');
  let skill = '';
  try {
    skill = registry.resolve(req.key).skill;
  } catch (e) {
    throw new RunnerError('key 解析失败：' + (e as Error).message, { cause: e });
  }
  if (req.params !== undefined && (typeof req.params !== 'object' || req.params === null || Array.isArray(req.params))) {
    throw new RunnerError('params 须为对象');
  }
  let data: EnvelopeDataByShape[S];
  try {
    data = await fetchData({ skill, combo: req.key.split('.').slice(1).join('.'), params: req.params ?? {}, signal: req.signal });
  } catch (e) {
    if (e instanceof RunnerError) throw e;
    throw new RunnerError('取数失败：' + (e as Error).message, { cause: e });
  }
  try {
    return createEnvelope({ skill, shape: req.shape, key: req.key, data });
  } catch (e) {
    throw new RunnerError('载荷未过 envelope 全字段：' + (e as Error).message, { cause: e });
  }
}
