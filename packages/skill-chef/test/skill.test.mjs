import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHelpLookup, lookupWake, routeWakeword, CHEF_KEY_SHAPES, WAKE_TABLE } from '../dist/index.js';
import { buildHelpBlock, START, END } from '../scripts/build-help.mjs';

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const skillText = readFileSync(join(pkgDir, 'SKILL.md'), 'utf8');

describe('私家大厨 SKILL 与 HELP', () => {
  it('SKILL 含出口/口径/标记块', () => {
    assert.match(skillText, /chef-cmd-read/);
    assert.match(skillText, /难度 5/);
    assert.match(skillText, /状态 4/);
    assert.match(skillText, /火候 5/);
    assert.match(skillText, /11 类/);
    assert.ok(skillText.includes(START) && skillText.includes(END));
  });
  it('速查：35 短语全可路由且 key 对得上', () => {
    const hits = buildHelpLookup();
    assert.equal(hits.length, 35);
    assert.equal(hits.length, WAKE_TABLE.length);
    for (const h of hits) {
      assert.ok(Object.keys(CHEF_KEY_SHAPES).includes(h.key));
      assert.ok(h.shape !== '??' && h.cli.includes(h.key) && h.desc.length > 0);
      const entry = WAKE_TABLE.find((e) => e.phrase === h.phrase);
      const ctx = {};
      for (const n of (entry.needs || [])) ctx[n] = n === 'id' ? '1' : n === 'name' ? '宫保虾球' : n === 'q' ? '虾' : n === 'names' ? ['宫保虾球'] : n === 'rating' ? 5 : 'x';
      assert.equal(routeWakeword(h.phrase, ctx).key, h.key);
    }
  });
  it('互联区新鲜（构建期注入可复现）', () => {
    const si = skillText.indexOf(START), ei = skillText.indexOf(END);
    assert.equal(skillText.slice(si + START.length + 1, ei - 1), buildHelpBlock());
    assert.ok(lookupWake(buildHelpLookup(), '帮我搜个虾球菜').some((h) => h.key === 'chef.recipe.search'));
  });
});
