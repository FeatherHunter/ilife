/**
 * tooling/test/premerge-child.test.mjs —— #1313：子工作树改动三方合并工具的自证。
 *
 * 覆盖：
 *   ① 当前树未动的路径直接拷/删，两边都改的路径三方合并，跳过清单生效；
 *   ② 两边改同一处 ⇒ 判冲突、当前树该路径一字节不动、三版本落侧车、exit 1；
 *   ③ 双方新增同名、子删主改 ⇒ 一律判冲突不猜；
 *   ④ --dry 只算不落盘。
 */
import { strict as assert } from 'node:assert';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { git, makeTempRepo, removeRepo, runNode, tempBase } from './helpers/temp-git-repo.mjs';

const SCRIPT = join(import.meta.dirname, '..', 'premerge-child.mjs');

function worktreeAt(repo, base, baseSha, name) {
  const path = join(base.parent, name);
  git(repo.dir, ['worktree', 'add', '--detach', path, baseSha]);
  return path;
}

test('拷贝/合并/删除/跳过：当前树未动的直接搬，两边都改的合干净', () => {
  const repo = makeTempRepo({ 'a.txt': 'one\ntwo\nthree\n', 'gone.txt': 'bye\n', 'keep.txt': 'same\n' });
  const base = tempBase();
  try {
    const baseSha = repo.head();
    const wt = worktreeAt(repo, base, baseSha, 'wt');
    writeFileSync(join(wt, 'a.txt'), 'ONE\ntwo\nthree\n');
    writeFileSync(join(wt, 'new.txt'), 'brand new\n');
    rmSync(join(wt, 'gone.txt'));
    mkdirSync(join(wt, '.scratch'), { recursive: true });
    writeFileSync(join(wt, '.scratch', 'junk.txt'), 'x\n');
    mkdirSync(join(wt, 'node_modules'), { recursive: true });
    writeFileSync(join(wt, 'node_modules', 'x.js'), 'x\n');
    writeFileSync(join(repo.dir, 'a.txt'), 'one\ntwo\nTHREE\n');

    const jsonPath = join(base.parent, 'report.json');
    const r = runNode(SCRIPT, ['--root', repo.dir, '--child', wt, '--base', baseSha, '--json', jsonPath], { cwd: repo.dir });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /PRE-MERGE child=.* copy=1 merge=1 delete=1 conflict=0 .*skipped=2/);
    assert.match(r.stdout, /RESULT: PASS conflicts=0/);
    assert.equal(repo.read('a.txt'), 'ONE\ntwo\nTHREE\n', '两边改不同行要合干净');
    assert.equal(repo.read('new.txt'), 'brand new\n', '当前树未动的路径直接拷');
    assert.equal(existsSync(join(repo.dir, 'gone.txt')), false, '当前树未动的删除要照删');
    assert.equal(repo.read('keep.txt'), 'same\n', '没动的文件保持原样');
    assert.equal(existsSync(join(repo.dir, '.scratch', 'junk.txt')), false, '.scratch/** 缺省跳过');
    assert.equal(existsSync(join(repo.dir, 'node_modules', 'x.js')), false, 'node_modules/** 缺省跳过');
    const report = JSON.parse(readFileSync(jsonPath, 'utf8'));
    assert.equal(report.counts.conflict, 0);
    assert.equal(report.dryRun, false);
    assert.equal(report.verdict, 'PASS');
    assert.deepEqual(report.actions.filter((a) => a.action === 'merge').map((a) => a.path), ['a.txt']);
  } finally {
    removeRepo(repo.dir);
    rmSync(base.parent, { recursive: true, force: true });
  }
});

test('冲突：两边改同一处 ⇒ exit 1、当前树不动、三版本落侧车', () => {
  const repo = makeTempRepo({ 'c.txt': 'alpha\nbeta\ngamma\n' });
  const base = tempBase();
  try {
    const baseSha = repo.head();
    const wt = worktreeAt(repo, base, baseSha, 'wt');
    writeFileSync(join(wt, 'c.txt'), 'alpha\nBETA-child\ngamma\n');
    const ours = 'alpha\nBETA-ours\ngamma\n';
    writeFileSync(join(repo.dir, 'c.txt'), ours);
    const side = join(base.parent, 'sidecar');

    const r = runNode(SCRIPT, ['--root', repo.dir, '--child', wt, '--base', baseSha, '--report-dir', side], { cwd: repo.dir });
    assert.equal(r.status, 1);
    assert.match(r.stdout, /CONFLICT path=c\.txt detail=merge-conflict/);
    assert.match(r.stdout, /RESULT: FAIL conflicts=1/);
    assert.equal(repo.read('c.txt'), ours, '冲突时当前树一字节不动');
    assert.equal(readFileSync(join(side, 'c.txt', 'ours'), 'utf8'), ours);
    assert.equal(readFileSync(join(side, 'c.txt', 'base'), 'utf8'), 'alpha\nbeta\ngamma\n');
    assert.equal(readFileSync(join(side, 'c.txt', 'theirs'), 'utf8'), 'alpha\nBETA-child\ngamma\n');
  } finally {
    removeRepo(repo.dir);
    rmSync(base.parent, { recursive: true, force: true });
  }
});

test('不可合并形状：双方新增同名、子删主改都判冲突不猜', () => {
  const repo = makeTempRepo({ 'del.txt': 'd\n' });
  const base = tempBase();
  try {
    const baseSha = repo.head();
    const wt = worktreeAt(repo, base, baseSha, 'wt');
    writeFileSync(join(wt, 'both.txt'), 'theirs\n');
    rmSync(join(wt, 'del.txt'));
    writeFileSync(join(repo.dir, 'both.txt'), 'ours\n');
    writeFileSync(join(repo.dir, 'del.txt'), 'd-modified\n');

    const r = runNode(SCRIPT, ['--root', repo.dir, '--child', wt, '--base', baseSha], { cwd: repo.dir });
    assert.equal(r.status, 1);
    assert.match(r.stdout, /CONFLICT path=both\.txt detail=both-added/);
    assert.match(r.stdout, /CONFLICT path=del\.txt detail=deleted-in-child-changed-in-repo/);
    assert.match(r.stdout, /RESULT: FAIL conflicts=2/);
    assert.equal(repo.read('both.txt'), 'ours\n');
    assert.equal(repo.read('del.txt'), 'd-modified\n');
  } finally {
    removeRepo(repo.dir);
    rmSync(base.parent, { recursive: true, force: true });
  }
});

test('--dry：只算不落盘、退出码照实', () => {
  const repo = makeTempRepo({ 'a.txt': 'a\n' });
  const base = tempBase();
  try {
    const baseSha = repo.head();
    const wt = worktreeAt(repo, base, baseSha, 'wt');
    writeFileSync(join(wt, 'a.txt'), 'A-child\n');
    const jsonPath = join(base.parent, 'report.json');
    const r = runNode(SCRIPT, ['--root', repo.dir, '--child', wt, '--base', baseSha, '--dry', '--json', jsonPath], { cwd: repo.dir });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /dry=true/);
    assert.match(r.stdout, /RESULT: PASS conflicts=0/);
    assert.equal(repo.read('a.txt'), 'a\n', '--dry 不得改当前树');
    const report = JSON.parse(readFileSync(jsonPath, 'utf8'));
    assert.equal(report.dryRun, true);
    assert.equal(report.counts.copy, 1);
  } finally {
    removeRepo(repo.dir);
    rmSync(base.parent, { recursive: true, force: true });
  }
});
