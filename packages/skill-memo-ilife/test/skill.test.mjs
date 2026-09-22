import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHelpLookup, lookupWake } from '../dist/help/index.js';
// #858：手写表 `dist/triggers/wakewords.js` 已退役——路由只读生成物（`routing.js` → `routes.generated.js`）。
import { routeWakeword } from '../dist/triggers/routing.js';
import { WAKE_ROUTES } from '../dist/triggers/routes.generated.js';
import { MEMO_HELP_GROUPS } from '../dist/help/sceneData.js';
import { MEMO_KEY_SHAPES } from '../dist/render/index.js';
import { buildHelpBlock, START, END } from '../scripts/build-help.mjs';

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const skill = readFileSync(join(pkgDir, 'SKILL.md'), 'utf8');

/** HELP 资产的场景主名（`wake_word`）——速查行的唯一合法词集（别名不在其中）。 */
function sceneMains() {
  const out = new Set();
  for (const g of MEMO_HELP_GROUPS) for (const sub of g.subgroups) for (const sc of sub.scenes) out.add(sc.wake_word);
  return out;
}

describe('memo SKILL 与 HELP', () => {
  it('SKILL 含出口/口径/标记块', () => {
    assert.match(skill, /memo-cmd-read/);
    assert.match(skill, /顶层分类/);
    assert.ok(skill.includes(START) && skill.includes(END));
  });
  it('速查：一场景主名一行（#858），且条条路由回同一个键', () => {
    const hits = buildHelpLookup();
    const mains = sceneMains();
    // 行数＝场景主名数：30 场景里 `备忘改分类` 单条与批量共用一词 ⇒ 29 个唯一主名。
    assert.equal(hits.length, mains.size, '速查行数变了：它须等于场景主名数（#858）');
    assert.equal(new Set(hits.map((h) => h.phrase)).size, hits.length, '速查里出现了重复词');
    for (const h of hits) {
      assert.ok(mains.has(h.phrase), h.phrase + ' 不是场景主名（别名不该进速查表）');
      assert.ok(Object.keys(MEMO_KEY_SHAPES).includes(h.key));
      assert.ok(h.shape !== '??' && h.cli.includes(h.key) && h.desc.length > 0);
      const row = WAKE_ROUTES.find((r) => r.wakeWord === h.phrase);
      const ctx = {}; for (const n of (row.needs || [])) ctx[n] = 'x';
      assert.equal(routeWakeword(h.phrase, ctx).key, h.key);
    }
  });
  it('互联区新鲜（构建期注入可复现）', () => {
    // #43 H1 主守卫后 import 不写盘：此处仅比对，CRLF/首尾空白归一化后比较（Windows 检出兼容）。
    const si = skill.indexOf(START), ei = skill.indexOf(END);
    const actual = skill.slice(si + START.length, ei).replace(/\r/g, '').trim();
    assert.equal(actual, buildHelpBlock().replace(/\r/g, '').trim());
    assert.ok(lookupWake(buildHelpLookup(), '帮我搜备忘跑步').some((h) => h.key === 'memo.search'));
  });
});
