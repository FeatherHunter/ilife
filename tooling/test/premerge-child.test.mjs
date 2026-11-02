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
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import * as premergeModule from '../premerge-child.mjs';
import { git, makeTempRepo, removeRepo, runNode, tempBase } from './helpers/temp-git-repo.mjs';

const SCRIPT = join(import.meta.dirname, '..', 'premerge-child.mjs');

function worktreeAt(repo, base, baseSha, name) {
  const path = join(base.parent, name);
  git(repo.dir, ['worktree', 'add', '--detach', path, baseSha]);
  return path;
}

function commitAll(dir, message) {
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-q', '-m', message]);
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

test('S1-1 子工作树已提交的改动也要收（copy/delete）', () => {
  const repo = makeTempRepo({ 'x.txt': 'one\n', 'gone.txt': 'bye\n' });
  const base = tempBase();
  try {
    const baseSha = repo.head();
    const wt = worktreeAt(repo, base, baseSha, 'wt');
    writeFileSync(join(wt, 'x.txt'), 'two\n');
    rmSync(join(wt, 'gone.txt'));
    commitAll(wt, 'child work');
    assert.deepEqual(premergeModule.changedPaths(wt, baseSha), ['gone.txt', 'x.txt'], '改动清单必须含已提交的部分');
    const r = runNode(SCRIPT, ['--root', repo.dir, '--child', wt, '--base', baseSha], { cwd: repo.dir });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /copy=1 merge=0 delete=1 conflict=0/);
    assert.equal(repo.read('x.txt'), 'two\n', '已提交的修改要收进来');
    assert.equal(existsSync(join(repo.dir, 'gone.txt')), false, '已提交的删除要收进来');
  } finally {
    removeRepo(repo.dir);
    rmSync(base.parent, { recursive: true, force: true });
  }
});

test('S3-1 双方都删同一文件 ⇒ noop，不判冲突', () => {
  const repo = makeTempRepo({ 'del.txt': 'd\n', 'keep.txt': 'k\n' });
  const base = tempBase();
  try {
    const baseSha = repo.head();
    const wt = worktreeAt(repo, base, baseSha, 'wt');
    rmSync(join(wt, 'del.txt'));
    rmSync(join(repo.dir, 'del.txt'));
    const r = runNode(SCRIPT, ['--root', repo.dir, '--child', wt, '--base', baseSha], { cwd: repo.dir });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /conflict=0/);
    assert.match(r.stdout, /noop=1/);
    assert.equal(existsSync(join(repo.dir, 'del.txt')), false);
  } finally {
    removeRepo(repo.dir);
    rmSync(base.parent, { recursive: true, force: true });
  }
});

test('S3-2 有冲突的一轮：无冲突路径也不写回（两阶段），JSON applied=false', () => {
  const repo = makeTempRepo({ 'c.txt': 'alpha\nbeta\ngamma\n', 'd.txt': 'd0\n' });
  const base = tempBase();
  try {
    const baseSha = repo.head();
    const wt = worktreeAt(repo, base, baseSha, 'wt');
    writeFileSync(join(wt, 'c.txt'), 'alpha\nBETA-child\ngamma\n');
    writeFileSync(join(wt, 'd.txt'), 'd-child\n');
    const ours = 'alpha\nBETA-ours\ngamma\n';
    writeFileSync(join(repo.dir, 'c.txt'), ours);
    const jsonPath = join(base.parent, 'report.json');
    const side = join(base.parent, 'sidecar');
    const r = runNode(SCRIPT, ['--root', repo.dir, '--child', wt, '--base', baseSha, '--report-dir', side, '--json', jsonPath], { cwd: repo.dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /CONFLICT path=c\.txt/);
    assert.match(r.stdout, /copy=1 merge=0 delete=0 conflict=1/);
    assert.equal(repo.read('c.txt'), ours, '冲突路径不动');
    assert.equal(repo.read('d.txt'), 'd0\n', '有冲突时整棵树不写回：无冲突路径也必须保持 ours');
    const report = JSON.parse(readFileSync(jsonPath, 'utf8'));
    assert.equal(report.applied, false, 'JSON 要能读出「本轮未写回」');
    assert.equal(report.counts.copy, 1, '计划数照报');
    assert.equal(report.actions.find((action) => action.path === 'd.txt').action, 'copy');
    assert.ok(existsSync(join(side, 'c.txt', 'ours')), '冲突侧车照落');
  } finally {
    removeRepo(repo.dir);
    rmSync(base.parent, { recursive: true, force: true });
  }
});

test('S3-3 --dry 也要逐条打 CONFLICT', () => {
  const repo = makeTempRepo({ 'c.txt': 'alpha\nbeta\ngamma\n' });
  const base = tempBase();
  try {
    const baseSha = repo.head();
    const wt = worktreeAt(repo, base, baseSha, 'wt');
    writeFileSync(join(wt, 'c.txt'), 'alpha\nBETA-child\ngamma\n');
    const ours = 'alpha\nBETA-ours\ngamma\n';
    writeFileSync(join(repo.dir, 'c.txt'), ours);
    const r = runNode(SCRIPT, ['--root', repo.dir, '--child', wt, '--base', baseSha, '--dry'], { cwd: repo.dir });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /CONFLICT path=c\.txt detail=merge-conflict/, '--dry 下冲突行也必须可读');
    assert.match(r.stdout, /dry=true/);
    assert.equal(repo.read('c.txt'), ours);
  } finally {
    removeRepo(repo.dir);
    rmSync(base.parent, { recursive: true, force: true });
  }
});

test('S3-4 基线/仓库前置校验：base 不是子工作树祖先、child 不是同仓库都 exit 2', () => {
  const repo = makeTempRepo({ 'a.txt': 'a\n' });
  const other = makeTempRepo({ 'z.txt': 'z\n' });
  const base = tempBase();
  try {
    const baseSha = repo.head();
    const wt = worktreeAt(repo, base, baseSha, 'wt');
    repo.write('b.txt', 'b\n');
    git(repo.dir, ['add', '-A']);
    git(repo.dir, ['commit', '-q', '-m', 'advance']);
    const advanced = repo.head();
    assert.notEqual(advanced, baseSha);
    assert.equal(git(wt, ['rev-parse', 'HEAD']), baseSha);
    const ancestor = runNode(SCRIPT, ['--root', repo.dir, '--child', wt, '--base', advanced], { cwd: repo.dir });
    assert.equal(ancestor.status, 2, '基线不是子工作树 HEAD 的祖先要拒绝：' + ancestor.stdout);
    assert.match(ancestor.stderr, /不是.*祖先/);
    const foreign = runNode(SCRIPT, ['--root', repo.dir, '--child', other.dir, '--base', baseSha], { cwd: repo.dir });
    assert.equal(foreign.status, 2, '不同仓库的子工作树要拒绝：' + foreign.stdout);
    assert.match(foreign.stderr, /不是同一个仓库/);
  } finally {
    removeRepo(repo.dir);
    removeRepo(other.dir);
    rmSync(base.parent, { recursive: true, force: true });
  }
});

test('S3-5 写回保留 exec 位与符号链接', () => {
  assert.equal(typeof premergeModule.fsModeFromGitMode, 'function', '需要导出 git 模式换算');
  assert.equal(premergeModule.fsModeFromGitMode('100755'), 0o755);
  assert.equal(premergeModule.fsModeFromGitMode('100644'), 0o644);
  assert.equal(premergeModule.fsModeFromGitMode('120000'), 0o777);
  const calls = [];
  const io = {
    mkdirSync: () => {},
    rmSync: () => {},
    writeFileSync: (...args) => calls.push(['write', ...args]),
    chmodSync: (...args) => calls.push(['chmod', ...args]),
    symlinkSync: (...args) => calls.push(['symlink', ...args]),
  };
  premergeModule.applyEntry('/repo', 'bin/tool', { kind: 'file', buffer: Buffer.from('#!/bin/sh\n'), mode: 0o755 }, io);
  assert.ok(calls.some((call) => call[0] === 'write'), '普通文件要写内容');
  assert.ok(calls.some((call) => call[0] === 'chmod' && call[2] === 0o755), '可执行位要保住');
  const linkCalls = [];
  const linkIo = {
    ...io,
    writeFileSync: (...args) => linkCalls.push(['write', ...args]),
    symlinkSync: (...args) => linkCalls.push(['symlink', ...args]),
  };
  premergeModule.applyEntry('/repo', 'link.txt', { kind: 'symlink', target: '../a.txt', mode: 0o777 }, linkIo);
  assert.ok(linkCalls.some((call) => call[0] === 'symlink' && call[1] === '../a.txt'), '符号链接按目标重建');
  assert.equal(linkCalls.some((call) => call[0] === 'write'), false, '符号链接不得被写成普通文件');

  const base = tempBase();
  try {
    mkdirSync(join(base.parent, 'targetdir'), { recursive: true });
    writeFileSync(join(base.parent, 'target.txt'), 't\n');
    let linkPath = '';
    try {
      symlinkSync(join(base.parent, 'target.txt'), join(base.parent, 'link.txt'));
      linkPath = join(base.parent, 'link.txt');
    } catch {
      try {
        symlinkSync(join(base.parent, 'targetdir'), join(base.parent, 'jlink'), 'junction');
        linkPath = join(base.parent, 'jlink');
      } catch {
        linkPath = '';
      }
    }
    assert.ok(linkPath, '本机需要能造链接夹具（Windows 无权限时用 junction）');
    const entry = premergeModule.readWorktreeEntry(linkPath);
    assert.equal(entry.kind, 'symlink', '不能跟随链接当普通文件读');
    assert.ok(entry.target.length > 0);
  } finally {
    rmSync(base.parent, { recursive: true, force: true });
  }
});

test('S3-6 git merge-file 内部错误 ⇒ InternalError（exit 3），不当用法错', () => {
  const repo = makeTempRepo({ 'c.txt': 'alpha\nbeta\ngamma\n' });
  const base = tempBase();
  const ours = 'alpha\nBETA-ours\ngamma\n';
  try {
    const baseSha = repo.head();
    const wt = worktreeAt(repo, base, baseSha, 'wt');
    writeFileSync(join(wt, 'c.txt'), 'alpha\nBETA-child\ngamma\n');
    writeFileSync(join(repo.dir, 'c.txt'), ours);
    const opts = { root: repo.dir, child: wt, base: baseSha, skip: [], reportDir: join(base.parent, 'side'), dry: false, json: '' };
    let caught = null;
    const originalLog = console.log;
    console.log = () => {};
    try {
      premergeModule.premerge(opts, { threeWayMerge: () => ({ status: 'error', detail: '模拟 merge-file 失败' }) });
    } catch (err) {
      caught = err;
    } finally {
      console.log = originalLog;
    }
    assert.ok(caught, '内部错误必须抛出，不能静默');
    assert.equal(caught.name, 'InternalError', '内部错误要单独分型：' + caught.message);
    assert.equal(caught.exitCode, 3);
    assert.equal(premergeModule.exitCodeForError(caught), 3);
    assert.equal(repo.read('c.txt'), ours, '内部错误时不得写回');
  } finally {
    removeRepo(repo.dir);
    rmSync(base.parent, { recursive: true, force: true });
  }
});

