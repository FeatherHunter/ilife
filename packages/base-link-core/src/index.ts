// link-core：沉底零依赖。envelope 全字段 + registry key 类型 + runner 契约。
export { ENVELOPE_VERSION, ENVELOPE_SHAPES, createEnvelope, parseEnvelope, isEnvelope, assertShapeData } from './envelope.js';
export type { Envelope, EnvelopeShape, EnvelopeDataByShape } from './envelope.js';
export { createRegistry, parseRegistryKey } from './registry.js';
export type { Registry, RegistryKey, ParsedKey } from './registry.js';
export { runCombo } from './runner.js';
export type { RunRequest, Fetcher } from './runner.js';
export { LinkCoreError, EnvelopeError, RegistryError, RunnerError } from './errors.js';
