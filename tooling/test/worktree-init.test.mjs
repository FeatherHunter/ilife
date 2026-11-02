/**
 * tooling/test/worktree-init.test.mjs —— #1313：工作树初始化工具的自证。
 *
 * 覆盖：
 *   ① 建树到指定基线、写 .scratch/README.md、JSON 读数、幂等（第二次报 existing=true）；
 *   ② 分支模式：新分支建在指定基线上；
 *   ③ --dry 只打印不落盘；
 *   ④ 前置条件不满足（目标非空、基线不存在）必须 exit 2，不许半建。
 */
import { strict as assert } from 'node:assert';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { git, makeTempRepo, removeRepo, runNode, tempBase } from './helpers/temp-git-repo.mjs';

const SCRIPT = join(import.meta.dirname, '..', 'worktree-init.mjs');

test('建树：指定基线、写脚手架、JSON 读数、幂等', () => {
  const repo = makeTempRepo({ 'README.md': '# demo\n' });
  const base = tempBase();
  try {
    const wt = base.child('wt');
    const json = join(base.parent, 'out.json');
    const first = runNode(SCRIPT, ['--root', repo.dir, '--path', wt, '--detach', '--no-install', '--json', json], { cwd: repo.dir });
    assert.equal(first.status, 0, first.stderr);
    assert.match(first.stdout, /WORKTREE path=.* install=skipped scratch=\.scratch\/README\.md existing=false dry=false/);
    assert.match(first.stdout, /RESULT: PASS reason=-/);
    assert.ok(existsSync(join(wt, 'README.md')), '工作树里应有基线的文件');
    assert.match(readFileSync(join(wt, '.scratch', 'README.md'), 'utf8'), /run-tests\.mjs/, '.scratch 脚手架要指到验证命令');
    const data = JSON.parse(readFileSync(json, 'utf8'));
    assert.equal(data.existing, false);
    assert.equal(data.install, 'skipped');
    assert.equal(data.branch, '');
    assert.ok(repo.head().startsWith(data.base), 'JSON 里的 base 是工作树实际基线');
    assert.equal(git(wt, ['rev-parse', 'HEAD']), repo.head(), '工作树 HEAD 等于指定基线');

    const second = runNode(SCRIPT, ['--root', repo.dir, '--path', wt, '--detach', '--no-install'], { cwd: repo.dir });
    assert.equal(second.status, 0, second.stderr);
    assert.match(second.stdout, /existing=true/, '重复执行必须幂等（报已存在，不重建）');
  } finally {
    removeRepo(repo.dir);
    rmSync(base.parent, { recursive: true, force: true });
  }
});

test('分支模式：新分支落在指定基线上', () => {
  const repo = makeTempRepo({ 'a.txt': 'a\n' });
  const base = tempBase();
  try {
    const wt = base.child('wt');
    const r = runNode(SCRIPT, ['--root', repo.dir, '--path', wt, '--branch', 'feat/t1313', '--no-install'], { cwd: repo.dir });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /branch=feat\/t1313/);
    assert.equal(git(repo.dir, ['rev-parse', 'refs/heads/feat/t1313']), repo.head());
    assert.equal(git(wt, ['symbolic-ref', '--short', 'HEAD']), 'feat/t1313');
  } finally {
    removeRepo(repo.dir);
    rmSync(base.parent, { recursive: true, force: true });
  }
});

test('--dry：只打印不落盘；目标非空与基线不存在都 exit 2', () => {
  const repo = makeTempRepo({ 'a.txt': 'a\n' });
  const base = tempBase();
  try {
    const dryTarget = base.child('dry');
    const dry = runNode(SCRIPT, ['--root', repo.dir, '--path', dryTarget, '--detach', '--no-install', '--dry'], { cwd: repo.dir });
    assert.equal(dry.status, 0, dry.stderr);
    assert.match(dry.stdout, /DRY: git -C .* worktree add --detach/);
    assert.match(dry.stdout, /dry=true/);
    assert.equal(existsSync(dryTarget), false, '--dry 不得建目录');

    const busy = base.child('busy');
    mkdirSync(busy, { recursive: true });
    writeFileSync(join(busy, 'file.txt'), 'x');
    const nonEmpty = runNode(SCRIPT, ['--root', repo.dir, '--path', busy, '--detach', '--no-install'], { cwd: repo.dir });
    assert.equal(nonEmpty.status, 2);
    assert.match(nonEmpty.stderr, /FAIL: --path 已存在且非空/);

    const badBase = runNode(SCRIPT, ['--root', repo.dir, '--path', base.child('bad'), '--detach', '--no-install', '--base', 'no-such-ref'], { cwd: repo.dir });
    assert.equal(badBase.status, 2);
    assert.match(badBase.stderr, /FAIL: 基线不存在/);
  } finally {
    removeRepo(repo.dir);
    rmSync(base.parent, { recursive: true, force: true });
  }
});

test('S2-2 安装失败后重跑：不得洗成 PASS（重试安装，仍失败就 exit 1）', () => {
  const repo = makeTempRepo({ 'package.json': '{"name": "broken", oops\n', 'README.md': '# demo\n' });
  const base = tempBase();
  const wt = base.child('wt');
  try {
    const first = runNode(SCRIPT, ['--root', repo.dir, '--path', wt, '--detach'], { cwd: repo.dir });
    assert.equal(first.status, 1, first.stdout + first.stderr);
    assert.match(first.stdout, /install=failed/);
    assert.match(first.stdout, /RESULT: FAIL reason=install-failed/);
    assert.ok(existsSync(join(wt, '.scratch', 'worktree-init-install.json')), '安装结果要落状态文件，供重跑判定');
    const second = runNode(SCRIPT, ['--root', repo.dir, '--path', wt, '--detach'], { cwd: repo.dir });
    assert.equal(second.status, 1, '上次安装失败，重跑必须重试并如实失败，不许报 PASS：' + second.stdout + second.stderr);
    assert.match(second.stdout, /install=failed/);
    assert.match(second.stdout, /RESULT: FAIL reason=install-failed/);
  } finally {
    removeRepo(repo.dir);
    rmSync(base.parent, { recursive: true, force: true });
  }
});

test('S3-7 --dry --json：dryRun=true、install=planned，也要落 JSON', () => {
  const repo = makeTempRepo({ 'README.md': '# demo\n' });
  const base = tempBase();
  try {
    const target = base.child('dry');
    const json = join(base.parent, 'dry.json');
    const r = runNode(SCRIPT, ['--root', repo.dir, '--path', target, '--detach', '--dry', '--json', json], { cwd: repo.dir });
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.ok(existsSync(json), '--dry --json 必须落结构化读数');
    const data = JSON.parse(readFileSync(json, 'utf8'));
    assert.equal(data.dryRun, true);
    assert.equal(data.install, 'planned');
    assert.equal(data.existing, false);
    assert.equal(data.verdict, 'PASS');
    assert.equal(existsSync(target), false, '--dry 不得建目录');
  } finally {
    removeRepo(repo.dir);
    rmSync(base.parent, { recursive: true, force: true });
  }
});

