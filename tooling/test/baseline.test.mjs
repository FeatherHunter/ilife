import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
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

  /* #715 实测记下的缺陷：`git ls-files` 列的是**索引**，「已删、未提交」的件仍在其中而盘上已无 ⇒
     旧写法对每个路径直读会 ENOENT，**整个工具崩**（不是报差异）。多席共用工作区里这是常态。
     本用例在**临时 git 仓库**里造出那个状态（不碰本仓、不动任何真件），断言存基线不抛错、
     且该件不在源面、文件数如实少 1。 */
  it('「已删、未提交」的件不许把存基线打成 ENOENT（#715 回归）', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ilife-baseline-deleted-'));
    tmpDirs.push(dir);
    const run = (args) => {
      const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
      assert.equal(r.status, 0, `git ${args.join(' ')} 失败：${r.stderr}`);
    };
    run(['init', '-q']);
    run(['config', 'user.email', 'baseline@test.local']);
    run(['config', 'user.name', 'baseline test']);
    fs.writeFileSync(path.join(dir, 'kept.txt'), 'kept\n', 'utf8');
    fs.writeFileSync(path.join(dir, 'gone.txt'), 'gone\n', 'utf8');
    run(['add', 'kept.txt', 'gone.txt']);
    run(['commit', '-qm', 'seed']);
    fs.rmSync(path.join(dir, 'gone.txt'));            // 已删、**不提交** —— 正是 #715 撞到的状态
    run(['status', '--short']);                        // 索引仍在，盘上已无

    const base = saveBaseline(dir);                    // 旧写法在这里 ENOENT
    assert.equal(base.source.files, 1, '源面应只剩盘上真实存在的那一件');
    const { notes, diffs } = compareBaseline(base, dir);
    assert.equal(diffs.length, 0, diffs.join('\n'));
    assert.ok(notes.some((n) => n.includes('source')), notes.join('\n'));
  });
});
