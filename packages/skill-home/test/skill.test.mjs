import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHelpLookup, lookupHelp, routeWakeword, HOME_KEY_SHAPES, WAKE_TABLE, DEPRECATED_PHRASES } from '../dist/index.js';
import { buildHelpBlock, START, END } from '../scripts/build-help.mjs';

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const skill = readFileSync(join(pkgDir, 'SKILL.md'), 'utf8');

describe('居家 SKILL 与 HELP', () => {
  it('SKILL 含出口/口径/标记块/出 scope', () => {
    assert.match(skill, /home-cmd-read/);
    assert.match(skill, /8 顶级/);
    assert.match(skill, /定时任务/);
    assert.ok(skill.includes(START) && skill.includes(END));
  });
  it('速查：短语全可路由且 key 对得上', () => {
    const hits = buildHelpLookup();
    assert.equal(hits.length, WAKE_TABLE.length);
    for (const h of hits) {
      assert.ok(Object.keys(HOME_KEY_SHAPES).includes(h.key));
      assert.ok(h.shape !== '??' && h.cli.includes(h.key) && h.desc.length > 0);
      const e = WAKE_TABLE.find((x) => x.phrase === h.phrase);
      const ctx = {};
      for (const n of (e.needs || [])) ctx[n] = n === 'id' ? 1 : n === 'from' ? 'a' : n === 'to' ? 'b' : 'x';
      assert.equal(routeWakeword(h.phrase, ctx).key, h.key);
    }
  });
  it('互联区新鲜（构建期注入可重现）', () => {
    const si = skill.indexOf(START), ei = skill.indexOf(END);
    assert.equal(skill.slice(si + START.length + 1, ei - 1), buildHelpBlock());
    assert.ok(lookupHelp(buildHelpLookup(), '帮我查物品牛奶').some((h) => h.key === 'home.item.search'));
    assert.ok(lookupHelp(buildHelpLookup(), '').length === WAKE_TABLE.length);
  });
  it('废弃词不在速查中', () => {
    const phrases = buildHelpLookup().map((h) => h.phrase).join('\n');
    for (const dead of DEPRECATED_PHRASES) {
      assert.ok(!phrases.includes(dead), '废弃词不应进 HELP：' + dead);
    }
  });
});
