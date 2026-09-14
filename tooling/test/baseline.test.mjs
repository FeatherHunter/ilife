import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { saveBaseline, compareBaseline } from '../baseline.mjs';

/**
 * tooling/baseline.mjs 的靶向测试（#327 其二）。
 * 跑法（持锁单写者）：
 *   node tooling/run-locked.mjs --ticket 327 --lock-dir .scratch/locks-land --stale-minutes 30 -- node --test tooling/test/baseline.test.mjs
 * 覆盖：开窗存→收窗比一致（绿）；源码／派生／冻结三面坏样例点名差异面（红）；
 * 复现"他窗回滚留下陈旧 dist"（翻转一枚派生哈希即报 差异面 dist）。
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const fix = (n) => path.join(here, n);
const load = (n) => JSON.parse(fs.readFileSync(fix(n), 'utf8'));

const tmpDirs = [];
after(() => {
  for (const d of tmpDirs) fs.rmSync(d, { recursive: true, force: true });
});

describe('baseline：基线指纹', () => {
  it('开窗存→收窗比一致（绿）', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ilife-baseline-'));
    tmpDirs.push(dir);
    const file = path.join(dir, 'base.json');
    fs.writeFileSync(file, JSON.stringify(saveBaseline(repoRoot)), 'utf8');
    const { notes, diffs } = compareBaseline(JSON.parse(fs.readFileSync(file, 'utf8')), repoRoot);
    assert.ok(notes.length > 0);
    assert.equal(diffs.length, 0);
  });

  it('坏因① 源码面差异点名 source（红）', () => {
    const { diffs } = compareBaseline(load('baseline-bad-source.json'), repoRoot);
    assert.ok(diffs.some((d) => d.includes('差异面 source')), diffs.join('\n'));
  });

  it('坏因② 派生面删除点名路径（红）', () => {
    const { diffs } = compareBaseline(load('baseline-bad-dist.json'), repoRoot);
    assert.ok(diffs.some((d) => d.includes('差异面 dist') && d.includes('packages/skill-calorie/dist/__probe__.js')), diffs.join('\n'));
  });

  it('坏因③ 冻结面变化点名文件（红）', () => {
    const { diffs } = compareBaseline(load('baseline-bad-frozen.json'), repoRoot);
    assert.ok(diffs.some((d) => d.includes('差异面 frozen') && d.includes('test/calorie-routing-81.test.mjs')), diffs.join('\n'));
  });

  it('坏因④ 基线不可读抛错（红）', () => {
    assert.throws(() => compareBaseline(JSON.parse(fs.readFileSync(fix('baseline-bad-corrupt.json'), 'utf8'))), /JSON|形状/);
    assert.throws(() => compareBaseline({ version: 999 }, repoRoot), /形状/);
  });

  it('复现"陈旧 dist"：翻转一枚派生哈希即报差异面（红→修回绿）', () => {
    const base = saveBaseline(repoRoot);
    const keys = Object.keys(base.dist.files);
    assert.ok(keys.length > 0, '派生面为空，无法复现');
    const victim = keys[0];
    const flipped = { ...base, dist: { ...base.dist, files: { ...base.dist.files, [victim]: 'f'.repeat(64) } } };
    const red = compareBaseline(flipped, repoRoot);
    assert.ok(red.diffs.some((d) => d.includes('差异面 dist') && d.includes(victim)), red.diffs.join('\n'));
    assert.equal(compareBaseline(base, repoRoot).diffs.length, 0);
  });
});
