// P10 安装验收（#11 脚手架）：bundles 双含 + 单 add 单品后 bundles 无总管的负向断言。
// 口径（P1 #2）：reconcile 只扫直接 dependencies；传递的 manager 不进 bundles。
// 单命令双包：dsh plugin add dsh-life-pack <single>，两者皆直接依赖，按序激活。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { reconcileBundles, assertDualBundles, assertNegativeSingleOnly } from '../packages/plugin-manager/dist/install.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = (dir) => JSON.parse(readFileSync(join(root, 'packages', dir, 'package.json'), 'utf8'));
const SINGLES = [
  ['plugin-calorie', 'dsh-calorie'],
  ['plugin-memo-ilife', 'dsh-memo-ilife'],
  ['plugin-schedule-ilife', 'dsh-schedule-ilife'],
  ['plugin-home-ilife', 'dsh-home-ilife'],
  ['plugin-chef', 'dsh-chef'],
  ['plugin-bill-ilife', 'dsh-bill-ilife'],
];

describe('P10 安装验收', () => {
  it('单命令双包：双含（正向断言，6 单品逐一）', () => {
    for (const [, single] of SINGLES) {
      const bundles = reconcileBundles(['dsh-life-pack', single]);
      assert.ok(bundles.includes('dsh-life-pack'), single + ' 双包缺总管');
      assert.ok(bundles.includes(single), single + ' 双包缺单品');
      assertDualBundles(bundles, single);
    }
  });
  it('单 add 单品：bundles 无总管（负向断言，6 单品逐一）', () => {
    for (const [, single] of SINGLES) {
      const bundles = reconcileBundles([single]);
      assert.ok(!bundles.includes('dsh-life-pack'), single + ' 单加不应含总管（传递不激活）');
      assertNegativeSingleOnly(bundles);
      assert.throws(() => assertDualBundles(bundles, single), /缺总管/);
    }
  });
  it('单品 dependencies 硬依赖总管（开发兜底声明仍在）', () => {
    // #48 样板线：plugin-calorie 已转正式版号＋skill 同版本 ^ 声明；#50 首对复制 plugin-chef、home 对 plugin-home-ilife、bill 对 plugin-bill-ilife、schedule 对 plugin-schedule-ilife、memo 对复制 plugin-memo-ilife 同改。
    // 本批发版窗口扩到备忘录线 → 作息线：总管依赖同步升 ^0.2.0（skill 侧精确 pin 由 plugin-p10-boundaries 断言）。
    const FORMAL48 = new Set(['plugin-calorie', 'plugin-chef', 'plugin-home-ilife', 'plugin-bill-ilife', 'plugin-schedule-ilife', 'plugin-memo-ilife']);
    const LIFEPACK123 = { 'plugin-calorie': '^0.2.0', 'plugin-memo-ilife': '^0.2.0', 'plugin-schedule-ilife': '^0.2.0' };
    for (const [dir, single] of SINGLES) {
      const j = pkg(dir);
      assert.equal(j.dependencies?.['dsh-life-pack'], FORMAL48.has(dir) ? (LIFEPACK123[dir] ?? '^0.1.0') : 'workspace:*', single + ' 必须 dependencies 硬依赖总管');
      assert.ok(!(j.peerDependencies?.['dsh-life-pack']), single + ' 不许走 peer');
      if (FORMAL48.has(dir)) assert.ok(!JSON.stringify(j.dependencies).includes('workspace:'), single + ' 依赖不许外泄 workspace:');
    }
  });
  it('装配行双含：cordis.patch.yml insert id/name 与包名一致', () => {
    for (const [dir, single] of SINGLES.concat([['plugin-manager', 'dsh-life-pack']])) {
      const p = join(root, 'packages', dir, 'cordis.patch.yml');
      assert.ok(existsSync(p), dir + ' 缺 cordis.patch.yml');
      const text = readFileSync(p, 'utf8');
      assert.match(text, new RegExp('id: ' + single));
      assert.match(text, new RegExp("name: '" + single + "'"));
    }
  });
  it('首验文档写单命令双包（6 单品逐一可查）', () => {
    const doc = readFileSync(join(root, 'docs/p10-scaffold.md'), 'utf8');
    for (const [, single] of SINGLES) {
      assert.ok(doc.includes('dsh plugin add dsh-life-pack ' + single), single + ' 缺双包命令文档');
    }
  });
});
