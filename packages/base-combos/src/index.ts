import { createEnvelope } from '@feather_wch/base-link-core';
import { PRESENT_KEYS } from './present.js';

export { PRESENT_KEYS };

export function comboEnvelope(key: string): ReturnType<typeof createEnvelope> {
  if (!PRESENT_KEYS.includes(key)) throw new Error(`unknown combo key: ${key}`);
  return createEnvelope('combos', key, {});
}
