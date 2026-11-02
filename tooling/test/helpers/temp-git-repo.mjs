/**
 * tooling/test/helpers/temp-git-repo.mjs —— #1313 测试用的临时 git 仓库夹具。
 *
 * 每个用例一个一次性仓库：真实提交、真实 worktree，不 mock git。
 * 提交身份钉死为仓库约定的 FeatherHunter <975559549@qq.com>，避免继承全局身份；
 * 不开 GPG 签名、不继承本仓 hooks（temp 仓库没有 core.hooksPath）。
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

export const NODE = process.execPath;

export function git(dir, args) {
  const result = spawnSync('git', ['-C', dir, ...args], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) {
    throw new Error('git ' + args.join(' ') + ' 失败：' + ((result.stderr || result.stdout || '').trim()));
  }
  return result.stdout.trim();
}

/** 建一个已提交初始状态的临时仓库；files 是 仓库相对路径 → 文本内容。 */
export function makeTempRepo(files = {}) {
  const dir = fs.mkdtempSync(path.join(tmpdir(), 't1313-repo-'));
  git(dir, ['init', '-q', '-b', 'main']);
  git(dir, ['config', 'user.name', 'FeatherHunter']);
  git(dir, ['config', 'user.email', '975559549@qq.com']);
  git(dir, ['config', 'commit.gpgsign', 'false']);
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, ...rel.split('/'));
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-q', '-m', 'init']);
  return {
    dir,
    head: () => git(dir, ['rev-parse', 'HEAD']),
    path: (rel) => path.join(dir, ...rel.split('/')),
    read: (rel) => {
      try { return fs.readFileSync(path.join(dir, ...rel.split('/')), 'utf8'); } catch { return null; }
    },
    write: (rel, content) => {
      const abs = path.join(dir, ...rel.split('/'));
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, content);
    },
    remove: () => removeRepo(dir),
  };
}

/** 在仓库外建一个一次性父目录，返回它的子路径（用作工作树目标，确保目标本身不存在）。 */
export function tempBase(prefix = 't1313-wt-') {
  const parent = fs.mkdtempSync(path.join(tmpdir(), prefix));
  return { parent, child: (name) => path.join(parent, name) };
}

/** 删仓库：先摘掉它注册的全部工作树，再删目录（Windows 上 worktree 目录可能只读，重试）。 */
export function removeRepo(dir) {
  const list = spawnSync('git', ['-C', dir, 'worktree', 'list', '--porcelain'], { encoding: 'utf8', windowsHide: true });
  if (list.status === 0) {
    for (const line of list.stdout.split('\n')) {
      if (!line.startsWith('worktree ')) continue;
      const wt = line.slice('worktree '.length).trim();
      if (path.resolve(wt).toLowerCase() === path.resolve(dir).toLowerCase()) continue;
      spawnSync('git', ['-C', dir, 'worktree', 'remove', '--force', wt], { stdio: 'ignore', windowsHide: true });
      fs.rmSync(wt, { recursive: true, force: true, maxRetries: 5 });
    }
  }
  fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
}

/** 进程是否仍存活（signal 0 探活；Windows／POSIX 同用 process.kill）。 */
export function isAlive(pid) {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

/** 跑一个 node 脚本，返回 { status, stdout, stderr }。 */
export function runNode(scriptRel, args, { cwd, env = {} } = {}) {
  return spawnSync(NODE, [scriptRel, ...args], { cwd, encoding: 'utf8', env: { ...process.env, ...env }, windowsHide: true });
}
