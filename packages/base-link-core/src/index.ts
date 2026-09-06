/** link-core：沉底零依赖。envelope 全字段 + registry key 类型 + runner 契约占位。 */
export const ENVELOPE_VERSION = '0.1.0' as const;

export type RegistryKey = string;

export interface Envelope<T = unknown> {
  version: typeof ENVELOPE_VERSION;
  skill: string;
  shape: string;
  data: T;
}

export function createEnvelope<T>(skill: string, shape: string, data: T): Envelope<T> {
  return { version: ENVELOPE_VERSION, skill, shape, data };
}
