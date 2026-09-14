import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadEditSet, checkEditSet } from '../plan-check.mjs';

/**
 * tooling/plan-check.mjs 的靶向测试（#327 其一）。
 * 跑法（持锁单写者）：
 *   node tooling/run-locked.mjs --ticket 327 --lock-dir .scratch/locks-land --stale-minutes 30 -- node --test tooling/test/plan-check.test.mjs
 * 覆盖：好样例 PASS；5 种坏因逐条点名报错（先红）；形状错抛错（exit 2 口径）。
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const fix = (n) => path.join(here, n);

describe('plan-check：编辑集静态校验', () => {
  it('好样例零报错（绿）', () => {
    assert.deepEqual(checkEditSet(loadEditSet(fix('plan-check-good.json')), repoRoot), []);
  });

  it('坏因① 源不存在点名路径（红）', () => {
    const errs = checkEditSet(loadEditSet(fix('plan-check-bad-missing.json')), repoRoot);
    assert.ok(errs.some((e) => e.includes('源不存在') && e.includes('tooling/test/__nope-missing__.md')), errs.join('\n'));
  });

  it('坏因② 目标父目录不可建点名挡路文件（红）', () => {
    const errs = checkEditSet(loadEditSet(fix('plan-check-bad-parent.json')), repoRoot);
    assert.ok(errs.some((e) => e.includes('不可建') && e.includes('package.json/__probe__.md') && e.includes('package.json')), errs.join('\n'));
  });

  it('坏因③ 重复项点名（红）', () => {
    const errs = checkEditSet(loadEditSet(fix('plan-check-bad-dup.json')), repoRoot);
    assert.ok(errs.some((e) => e.includes('重复项') && e.includes('package.json')), errs.join('\n'));
  });

  it('坏因④ 残留旧路点名（红）', () => {
    const errs = checkEditSet(loadEditSet(fix('plan-check-bad-residue.json')), repoRoot);
    assert.ok(errs.some((e) => e.includes('残留旧路') && e.includes('tooling/run-locked.mjs')), errs.join('\n'));
  });

  it('坏因⑤ 写手集≡核对集不一致双向点名（红）', () => {
    const errs = checkEditSet(loadEditSet(fix('plan-check-bad-writers.json')), repoRoot);
    assert.ok(errs.some((e) => e.includes('只在写手集') && e.includes('tooling/__probe-a__.md')), errs.join('\n'));
    assert.ok(errs.some((e) => e.includes('只在核对集') && e.includes('tooling/__probe-b__.md')), errs.join('\n'));
  });

  it('形状错抛错（load 层，不进校验）', () => {
    assert.throws(() => loadEditSet(fix('plan-check.test.mjs')), /合法 JSON|顶层/);
  });
});
