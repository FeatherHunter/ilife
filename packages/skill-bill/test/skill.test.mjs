import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHelpLookup, lookupWake, routeWakeword, BILL_KEY_SHAPES, WAKE_TABLE } from '../dist/index.js';
import { buildHelpBlock, START, END } from '../scripts/build-help.mjs';

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const skillText = readFileSync(join(pkgDir, 'SKILL.md'), 'utf8');

describe('饼干 SKILL 与 HELP', () => {
  it('SKILL 含出口/口径/标记块', () => {
    assert.match(skillText, /bill-cmd-read/);
    assert.match(skillText, /L1 10/);
    assert.ok(skillText.includes(START) && skillText.includes(END));
  });
  it('速查：75 短语全可路由且 key 对得上', () => {
    const hits = buildHelpLookup();
    assert.equal(hits.length, 75);
    assert.equal(hits.length, WAKE_TABLE.length);
    for (const h of hits) {
      assert.ok(Object.keys(BILL_KEY_SHAPES).includes(h.key));
      assert.ok(h.shape !== '??' && h.cli.includes(h.key) && h.desc.length > 0);
      const entry = WAKE_TABLE.find((e) => e.phrase === h.phrase);
      const ctx = {};
      for (const n of (entry.needs || [])) ctx[n] = n === 'id' ? 1 : n === 'amount' ? 35 : 'x';
      assert.equal(routeWakeword(h.phrase, ctx).key, h.key);
    }
  });
  it('互联区新鲜（构建期注入可复现）', () => {
    const si = skillText.indexOf(START), ei = skillText.indexOf(END);
    assert.equal(skillText.slice(si + START.length + 1, ei - 1), buildHelpBlock());
    assert.ok(lookupWake(buildHelpLookup(), '帮我查今天花了多少').some((h) => h.key === 'bill.record.today'));
  });
});
