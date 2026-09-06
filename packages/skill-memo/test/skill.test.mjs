import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHelpLookup, lookupWake, routeWakeword, MEMO_KEY_SHAPES, WAKE_TABLE } from '../dist/index.js';
import { buildHelpBlock, START, END } from '../scripts/build-help.mjs';

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const skill = readFileSync(join(pkgDir, 'SKILL.md'), 'utf8');

describe('memo SKILL 与 HELP', () => {
  it('SKILL 含出口/口径/标记块', () => {
    assert.match(skill, /memo-cmd-read/);
    assert.match(skill, /顶层分类/);
    assert.ok(skill.includes(START) && skill.includes(END));
  });
  it('速查：短语全可路由且 key 对得上', () => {
    const hits = buildHelpLookup();
    assert.equal(hits.length, WAKE_TABLE.length);
    for (const h of hits) {
      assert.ok(Object.keys(MEMO_KEY_SHAPES).includes(h.key));
      assert.ok(h.shape !== '??' && h.cli.includes(h.key) && h.desc.length > 0);
      const ctx = {}; for (const n of (WAKE_TABLE.find((e) => e.phrase === h.phrase).needs || [])) ctx[n] = 'x';
      assert.equal(routeWakeword(h.phrase, ctx).key, h.key);
    }
  });
  it('互联区新鲜（构建期注入可复现）', () => {
    const si = skill.indexOf(START), ei = skill.indexOf(END);
    assert.equal(skill.slice(si + START.length + 1, ei - 1), buildHelpBlock());
    assert.ok(lookupWake(buildHelpLookup(), '帮我搜备忘跑步').some((h) => h.key === 'memo.search'));
  });
});
