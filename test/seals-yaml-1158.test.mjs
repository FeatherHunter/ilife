// seals.yaml 漂移门：源码里的六份生成件必须与 yaml 逐字节一致（改了 yaml 不重跑生成器就红）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
const { renderAll } = await import('../tooling/gen-seals.mjs');

describe('六家章状态表（seals.yaml → 各插件生成件）', () => {
  it('生成件与 yaml 一致，且六家都在', () => {
    const all = renderAll();
    assert.equal(all.size, 6, '六家');
    for (const [file, want] of all) {
      assert.ok(existsSync(file), '缺生成件：' + file + '（跑 node tooling/gen-seals.mjs）');
      assert.equal(readFileSync(file, 'utf8'), want, file + ' 与 seals.yaml 不一致：跑 node tooling/gen-seals.mjs');
    }
  });
  it('每家三枚齐、档位只能是铜／银／金', () => {
    for (const [, want] of renderAll()) {
      const roles = [...want.matchAll(/role: '([a-z]+)'/g)].map((m) => m[1]);
      assert.deepEqual(roles, ['help', 'skill', 'plugin'], '按 HELP／技能／插件三枚');
      for (const m of want.matchAll(/tier: '([a-z]+)'/g)) assert.ok(['copper', 'silver', 'gold'].includes(m[1]), '档位只能是铜／银／金，现为 ' + m[1]);
    }
  });
});
