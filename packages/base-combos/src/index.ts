import { createEnvelope, createRegistry, type Envelope } from '@feather_wch/base-link-core';
import { PRESENT_KEYS } from './present.js';

export { PRESENT_KEYS };

const registry = createRegistry(PRESENT_KEYS);

// 骨架占位：key 先过 registry（对不上即 throw），载荷走 envelope list 全字段；真实载荷 P7/skilllink 落包。
export function comboEnvelope(key: string): Envelope<'list'> {
  const { skill } = registry.resolve(key);
  return createEnvelope({ skill, shape: 'list', key, data: { items: [] } });
}
