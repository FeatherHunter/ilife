#!/usr/bin/env node
/**
 * tooling/worktree-init.mjs —— 一条命令把工作树准备到「可开工」（#1313 其一）。
 *
 * 用途：多席位／子代理并行开发时，新工作树的冷启动有固定几步——建 worktree、按锁文件离线装依赖、
 * 写 .scratch 脚手架、记住必读文档与验证命令。每一步都不难，但漏一步就要在子代理里重新摸索，
 * 历史读数：45 个子代理分布在 61 个工作树，首编辑 p50 11 分钟、p90 24 分钟，大半花在这几步上。
 *
 * 用法：
 *   node tooling/worktree-init.mjs --path D:/ilife-wt-1313 --branch chore/retro-tools-1313
 *   node tooling/worktree-init.mjs --path D:/ilife-wt-probe --detach --base origin/master --no-install
 * 选项：
 *   --path <dir>       工作树目录（必填；不存在，或已注册为同一工作树）
 *   --branch <name>    新分支名；本地已存在则直接检出（git 规则：同一分支不能在两处同时检出）
 *   --base <ref>       基线（缺省 HEAD；分支模式即新分支起点）
 *   --detach           不建分支，detached HEAD 于 --base（缺省行为）
 *   --no-install       跳过 `pnpm install --offline --frozen-lockfile`（只建树）
 *   --no-scratch       不在树里写 .scratch/README.md
 *   --dry              只打印将要执行的 git／安装命令，不落盘
 *   --json <file>      结构化结果落点
 *   --root <dir>       仓库根（缺省从当前目录向上找 git 根；测试夹具用）
 *
 * 读数（逐行，机读）：
 *   WORKTREE path=<abs> head=<短 sha> branch=<名|detached> base=<短 sha> install=<ok|skipped|failed> scratch=<相对路径|none> existing=<true|false> dry=<true|false> ms=<n>
 *   RESULT: PASS|FAIL reason=<无|git-add-failed|install-failed>
 * 退出码：0＝树就绪且（需要时）依赖装好；1＝树建了但依赖没装成；2＝用法／git 前置条件不满足。
 *
 * 纪律：本件不碰仓库源码、不切分支、不改 .git 配置；只在目标目录里建树与写脚手架。
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRATCH_README = [
  '# 本工作树的 .scratch/',
  '',
  '这个目录被 .gitignore 忽略，用来放临时产物（日志、一次性脚本、报告）。',
  '多席位协作的常用动作都有仓库级工具，不要在这里重写：',
  '',
  '- 编译：node node_modules/typescript/bin/tsc -b（本仓 node_modules/.bin 不存在，别用 npx tsc）',
  '- 跑测试（逐件隔离、每件墙钟、完成后退出守卫）：node tooling/run-tests.mjs <目录|glob|--all>',
  '- 收另一个工作树的改动（三方合并）：node tooling/premerge-child.mjs --child <dir> --base <sha>',
  '',
  '必读：CONTEXT.md、docs/adr/、docs/agents/structure.md、docs/subagent-concurrency-protocol.md。',
  '工作文档不放这里：技能 docs/skills/<件名>/、插件 docs/plugins/<件名>/、公共层 docs/base/<件名>/、跨件 docs/agents/。',
  '',
].join('\n');

export class UsageError extends Error {}

/** 解析命令行；未知选项不猜，直接报用法错。 */
export function parseArgs(argv, { root = '' } = {}) {
  const opts = { path: '', branch: '', base: '', detach: false, install: true, scratch: true, dry: false, json: '', root };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const need = () => {
      if (i + 1 >= argv.length) throw new UsageError('选项 ' + token + ' 缺参数');
      i += 1;
      return argv[i];
    };
    if (token === '--path') opts.path = need();
    else if (token === '--branch') opts.branch = need();
    else if (token === '--base') opts.base = need();
    else if (token === '--json') opts.json = need();
    else if (token === '--root') opts.root = path.resolve(need());
    else if (token === '--detach') opts.detach = true;
    else if (token === '--no-install') opts.install = false;
    else if (token === '--no-scratch') opts.scratch = false;
    else if (token === '--dry') opts.dry = true;
    else if (token.startsWith('-')) throw new UsageError('不认识的选项：' + token);
    else throw new UsageError('多余的位置参数：' + token);
  }
  if (!opts.path) throw new UsageError('--path 必填');
  if (opts.branch && opts.detach) throw new UsageError('--branch 与 --detach 只能二选一');
  return opts;
}

function git(cwd, args) {
  return spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8', windowsHide: true });
}

/** 找到包含 cwd 的 git 仓库根；找不到返回空串。 */
export function repoRootOf(cwd) {
  const result = git(cwd, ['rev-parse', '--show-toplevel']);
  if (result.status !== 0) return '';
  return result.stdout.trim();
}

/** 当前已注册的工作树路径（git worktree list --porcelain）。 */
function registeredWorktrees(root) {
  const result = git(root, ['worktree', 'list', '--porcelain']);
  if (result.status !== 0) return [];
  return result.stdout.split('\n').filter((line) => line.startsWith('worktree ')).map((line) => line.slice('worktree '.length).trim());
}

function samePath(a, b) {
  return path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
}

/** 执行 pnpm 离线安装；返回 ok 或 failed（不抛异常——树已建好，安装失败要如实报）。 */
function installDependencies(dir) {
  const isWindows = process.platform === 'win32';
  const result = isWindows
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', 'pnpm install --offline --frozen-lockfile'], { cwd: dir, stdio: 'inherit', timeout: 15 * 60 * 1000 })
    : spawnSync('pnpm', ['install', '--offline', '--frozen-lockfile'], { cwd: dir, stdio: 'inherit', timeout: 15 * 60 * 1000 });
  return result.status === 0 ? 'ok' : 'failed';
}

function shortSha(root, ref) {
  const result = git(root, ['rev-parse', '--short', ref + '^{commit}']);
  return result.status === 0 ? result.stdout.trim() : '';
}

/** 主流程；返回退出码。分离出来供测试直接调用（不经过 process.exit）。 */
export function initWorktree(opts) {
  const startedAt = Date.now();
  const root = opts.root || repoRootOf(process.cwd());
  if (!root) throw new UsageError('当前目录不在 git 仓库内（用 --root 指定仓库根）');
  if (git(root, ['rev-parse', '--git-dir']).status !== 0) throw new UsageError('不是 git 仓库：' + root);
  const target = path.resolve(opts.path);
  if (samePath(target, root)) throw new UsageError('--path 不能是仓库根本身');
  const baseRef = opts.base || 'HEAD';
  const baseSha = shortSha(root, baseRef);
  if (!baseSha) throw new UsageError('基线不存在：' + baseRef);

  const existing = registeredWorktrees(root).some((item) => samePath(item, target));
  const targetExists = fs.existsSync(target);
  if (!existing && targetExists) {
    const entries = fs.readdirSync(target);
    if (entries.length > 0) throw new UsageError('--path 已存在且非空：' + target);
  }
  const branch = opts.detach || !opts.branch ? '' : opts.branch;
  const addArgs = ['worktree', 'add'];
  if (branch) {
    const branchExists = git(root, ['rev-parse', '--verify', '--quiet', 'refs/heads/' + branch]).status === 0;
    if (!branchExists) addArgs.push('-b', branch);
    addArgs.push(target, branchExists ? branch : baseRef);
  } else {
    addArgs.push('--detach', target, baseRef);
  }
  const plan = ['git -C ' + root + ' ' + addArgs.join(' ')];
  if (opts.install) plan.push('pnpm install --offline --frozen-lockfile（cwd=' + target + '）');
  if (opts.scratch) plan.push('写 ' + path.join(target, '.scratch', 'README.md'));
  if (opts.dry) {
    for (const line of plan) console.log('DRY: ' + line);
    console.log('WORKTREE path=' + target + ' head=' + baseSha + ' branch=' + (branch || 'detached') + ' base=' + baseSha
      + ' install=' + (opts.install ? 'planned' : 'skipped') + ' scratch=' + (opts.scratch ? '.scratch/README.md' : 'none')
      + ' existing=' + existing + ' dry=true ms=' + (Date.now() - startedAt));
    console.log('RESULT: PASS reason=-');
    return 0;
  }
  let added = false;
  if (!existing) {
    const result = git(root, addArgs);
    if (result.status !== 0) {
      const detail = (result.stderr || result.stdout || '').trim();
      console.error('FAIL: git worktree add 失败：' + detail);
      console.log('RESULT: FAIL reason=git-add-failed');
      return 2;
    }
    added = true;
  }
  const head = shortSha(target, 'HEAD') || baseSha;
  let install = 'skipped';
  let scratch = 'none';
  if (opts.install && !existing) {
    console.log('# INSTALL cwd=' + target);
    install = installDependencies(target);
  }
  if (opts.scratch) {
    const scratchDir = path.join(target, '.scratch');
    fs.mkdirSync(scratchDir, { recursive: true });
    const readme = path.join(scratchDir, 'README.md');
    if (!fs.existsSync(readme)) fs.writeFileSync(readme, SCRATCH_README);
    scratch = '.scratch/README.md';
  }
  const ms = Date.now() - startedAt;
  console.log('WORKTREE path=' + target + ' head=' + head + ' branch=' + (branch || 'detached') + ' base=' + baseSha
    + ' install=' + install + ' scratch=' + scratch + ' existing=' + existing + ' dry=false ms=' + ms);
  const verdict = install === 'failed' ? 'FAIL' : 'PASS';
  console.log('RESULT: ' + verdict + ' reason=' + (install === 'failed' ? 'install-failed' : '-'));
  if (opts.json) {
    fs.mkdirSync(path.dirname(path.resolve(opts.json)), { recursive: true });
    fs.writeFileSync(path.resolve(opts.json), JSON.stringify({
      root, path: target, head, branch: branch || '', base: baseSha, existing, added, install, scratch, dryRun: false, durationMs: ms, verdict,
    }, null, 2) + '\n');
  }
  return install === 'failed' ? 1 : 0;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  return initWorktree(opts);
}

const IS_MAIN = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (IS_MAIN) {
  try {
    process.exitCode = main();
  } catch (err) {
    if (err instanceof UsageError) {
      console.error('FAIL: ' + err.message);
      process.exitCode = 2;
    } else {
      console.error('FAIL: ' + (err && err.stack ? err.stack : err));
      process.exitCode = 2;
    }
  }
}
