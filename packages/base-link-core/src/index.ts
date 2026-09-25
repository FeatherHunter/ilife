// link-core：沉底零依赖。envelope 全字段 + registry key 类型 + runner 契约 + config 配置文件读写。
export { ENVELOPE_VERSION, ENVELOPE_SHAPES, createEnvelope, parseEnvelope, isEnvelope, assertShapeData } from './envelope.js';
export type { Envelope, EnvelopeShape, EnvelopeDataByShape } from './envelope.js';
export { createRegistry, parseRegistryKey } from './registry.js';
export type { Registry, RegistryKey, ParsedKey } from './registry.js';
export { runCombo } from './runner.js';
export type { RunRequest, Fetcher } from './runner.js';
export { LinkCoreError, EnvelopeError, RegistryError, RunnerError, ConfigError } from './errors.js';
// 目录读取件（#954）：允许清单的表 → 运行时现读的列与类型，见 src/data-schema.ts。
// 取用方：各技能的数据族目录命令（卡路里先行 `skill-calorie/src/data/schema.ts`）。
export { readDataSchema } from './data-schema.js';
export type { DataColumn, DataTableSchema, DataSchemaDb } from './data-schema.js';
// 配置件（#694）：定位／读写校验／重置为默认，见 src/config/。
export { configPaths, loadConfig, saveConfig, resetConfig } from './config/index.js';
export type { ConfigPaths, LoadedConfig, ConfigRecord, ConfigGroup, ConfigValue } from './config/index.js';
