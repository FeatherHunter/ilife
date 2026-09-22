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

/** HELP 资产的**场景卡清单**（`wake_word` 是主名）——速查行的唯一合法词集（别名不在其中）。 */
function sceneList() {
  const out = [];
  for (const g of MEMO_HELP_GROUPS) for (const sub of g.subgroups) for (const sc of sub.scenes) out.push(sc);
  return out;
}

describe('memo SKILL 与 HELP', () => {
  it('SKILL 含出口/口径/标记块', () => {
    assert.match(skill, /memo-cmd-read/);
    assert.match(skill, /顶层分类/);
    assert.ok(skill.includes(START) && skill.includes(END));
  });
  it('速查：一场景一行（#858），且不共词的每一行路由回同一个键', () => {
    const hits = buildHelpLookup();
    const scenes = sceneList();
    // 行数＝场景数（30）：`备忘改分类` 服务两张场景卡（单条／批量），故那个词两行、命令不同。
    assert.equal(hits.length, scenes.length, '速查行数变了：它须等于场景数（#858）');
    for (const h of hits) {
      assert.ok(scenes.some((s) => s.wake_word === h.phrase), h.phrase + ' 不是场景主名（别名不该进速查表）');
      assert.ok(Object.keys(MEMO_KEY_SHAPES).includes(h.key));
      assert.ok(h.shape !== '??' && h.cli.includes(h.key) && h.desc.length > 0);
      if (h.phrase === '备忘改分类') continue; // 共词那一格：运行期并列取 order 最小那条，见 858 探针 ①
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
