import type { Envelope } from '@feather_wch/base-link-core';
import { mountInjector } from './injector.js';

export { mountInjector };

export function renderEnvelope(env: Envelope): string {
  return `<section data-skill="${env.skill}">${env.shape}</section>`;
}
