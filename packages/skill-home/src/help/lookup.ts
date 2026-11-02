// HELP 速查：WAKE_TABLE 唯一上游；短语→key/cli/一句话。构建期注入 SKILL.md（scripts/build-help.mjs）。
import { WAKE_TABLE, type HomeKey } from '../policy/index.js';
import { HOME_KEY_SHAPES } from '../render/index.js';
import { m } from '../entries/index.js';

export interface HelpHit { phrase: string; key: HomeKey; shape: string; cli: string; desc: string; }

function exampleParams(e: { key: HomeKey; needs?: string[]; preset?: Record<string, unknown> }): string {
  const p: Record<string, unknown> = { ...(e.preset || {}) };
  for (const n of e.needs || []) {
    if (p[n] === undefined) {
      p[n] = n === 'id' ? 1 : n === 'from' ? m('skill-home.help-lookup.c001') : n === 'to' ? m('skill-home.help-lookup.c002') : m('skill-home.help-lookup.c003');
    }
  }
  const keys = Object.keys(p);
  return keys.length ? ' --params \'' + JSON.stringify(p) + '\'' : '';
}

// #1220 · 模块级常量取词禁令：这张表的值是上屏文案，语言必须在取词那一刻定
// （模块加载期取词会把语言固化在 import 那一刻），故改成函数，`m()` 只在函数体内调。
function descs(): Record<string, string> {
  return {
    'home.item.search': m('skill-home.help-lookup.c004'),
    'home.item.detail': m('skill-home.help-lookup.c005'),
    'home.item.add': m('skill-home.help-lookup.c006'),
    'home.item.update': m('skill-home.help-lookup.c007'),
    'home.tag.query': m('skill-home.help-lookup.c008'),
    'home.tag.write': m('skill-home.help-lookup.c009'),
    'home.inventory.round': m('skill-home.help-lookup.c010'),
    'home.inventory.records': m('skill-home.help-lookup.c011'),
    'home.location.query': m('skill-home.help-lookup.c012'),
    'home.location.write': m('skill-home.help-lookup.c013'),
    'home.outfit.pick': m('skill-home.help-lookup.c014'),
    'home.trip.manage': m('skill-home.help-lookup.c015'),
    'home.stats.overview': m('skill-home.help-lookup.c016'),
    'home.stats.alert': m('skill-home.help-lookup.c017'),
    'home.shopping.query': m('skill-home.help-lookup.c018'),
    'home.shopping.write': m('skill-home.help-lookup.c019'),
    'home.ticket.query': m('skill-home.help-lookup.c020'),
    'home.ticket.write': m('skill-home.help-lookup.c021'),
    'home.care.query': m('skill-home.help-lookup.c022'),
    'home.care.write': m('skill-home.help-lookup.c023'),
    'home.help.lookup': m('skill-home.help-lookup.c024'),
  };
}

// 全量速查表（WAKE_TABLE 有几条就有几行）。
export function buildHelpLookup(): HelpHit[] {
  const d = descs();
  return WAKE_TABLE.map((e) => ({
    phrase: e.phrase,
    key: e.key,
    shape: HOME_KEY_SHAPES[e.key] || '??',
    cli: 'home-cmd-read ' + e.key + exampleParams(e),
    desc: d[e.key] || '',
  }));
}

export function lookupHelp(hits: HelpHit[], word: string): HelpHit[] {
  if (!word || !word.trim()) return hits;
  return hits.filter((h) => word.includes(h.phrase) || h.phrase.includes(word.trim()));
}
