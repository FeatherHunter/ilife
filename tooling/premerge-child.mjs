#!/usr/bin/env node
/**
 * tooling/premerge-child.mjs —— 收子工作树的改动进当前树，做三方合并（#1313 其二）。
 *
 * 问题（读数）：多席位并行时，子工作树的改动量常在集成树已经前进之后才收回来。直接按「拷盘面上有变动的文件」收，
 * 会拿子树的**旧基线**覆盖集成树的新提交（历史上真实覆盖过 PROTO_BASELINE、六条场景接线与一个测试件）。
 * 正确的收法不是覆盖，而是三方合并：base＝两边共同的起点（子工作树建树时的 SHA），
 * ours＝当前树现状，theirs＝子工作树现状。只有子工作树确实动过、且与当前树不冲突的部分才写回。
 *
 * 判据：
 *   · 当前树该路径没动过（与 base 逐字节相同）⇒ 子树版本直接写入（新增/修改/删除照抄）；
 *   · 两边都动过 ⇒ 文本文件跑 `git merge-file`：干净合入写回；冲突只把 ours/base/theirs 三个版本落到侧车目录，
 *     **当前树一个字节都不动**，报 CONFLICT 并以 exit 1 结束，交给人或主代理裁决；
 *   · 二进制、一边删一边改、双方各自新增同名文件 ⇒ 一律判冲突（不猜）。
 *
 * 用法：
 *   node tooling/premerge-child.mjs --child D:/ilife-wt-t1204 --base d4127e89 --json .scratch/premerge-t1204.json
 * 选项：
 *   --child <dir>     子工作树目录（必填）
 *   --base <ref>      共同基线（必填；子工作树建树时的提交，如 d4127e89）
 *   --root <dir>      当前仓库根（缺省从当前目录向上找 git 根；测试夹具用）
 *   --skip <p1,p2>    额外跳过的前缀/glob（缺省 .scratch/** 与 node_modules/**；逗号分隔，可重复）
 *   --report-dir <d>  冲突侧车目录（缺省 .scratch/premerge-conflicts/<时间戳>）
 *   --dry             只算不写（冲突照样报，exit 1）
 *   --json <file>     结构化结果落点
 *
 * 读数（逐行，机读）：
 *   COPY path=<仓库相对路径>            子树新增/修改，当前树没动过 ⇒ 直接写入
 *   MERGE path=<路径>                   两边都动过，干净三方合并
 *   DELETE path=<路径>                  子树删除、当前树没动过 ⇒ 删除
 *   CONFLICT path=<路径> detail=<原因> dir=<侧车目录或空>
 *   PRE-MERGE child=<abs> base=<sha> copy=<n> merge=<n> delete=<n> conflict=<n> noop=<n> skipped=<n>
 *   RESULT: PASS|FAIL conflicts=<n>
 * 退出码：0＝无冲突；1＝有冲突（当前树未被冲突路径改动）；2＝用法／git 前置条件不满足。
 *
 * 纪律：只读写 --root 指定的当前树与 --child 指定的子树；不切分支、不动 git 索引、不提交。
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export class UsageError extends Error {}

const DEFAULT_SKIP = ['.scratch/**', 'node_modules/**'];

export function parseArgs(argv, { root = '' } = {}) {
  const opts = { child: '', base: '', root, skip: [], reportDir: '', dry: false, json: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const need = () => {
      if (i + 1 >= argv.length) throw new UsageError('选项 ' + token + ' 缺参数');
      i += 1;
      return argv[i];
    };
    if (token === '--child') opts.child = path.resolve(need());
    else if (token === '--base') opts.base = need();
    else if (token === '--root') opts.root = path.resolve(need());
    else if (token === '--report-dir') opts.reportDir = path.resolve(need());
    else if (token === '--json') opts.json = need();
    else if (token === '--skip') opts.skip.push(...need().split(',').map((item) => item.trim()).filter(Boolean));
    else if (token === '--dry') opts.dry = true;
    else if (token.startsWith('-')) throw new UsageError('不认识的选项：' + token);
    else throw new UsageError('多余的位置参数：' + token);
  }
  if (!opts.child) throw new UsageError('--child 必填');
  if (!opts.base) throw new UsageError('--base 必填');
  return opts;
}

function git(cwd, args, { maxBuffer = 64 * 1024 * 1024 } = {}) {
  return spawnSync('git', ['-C', cwd, ...args], { encoding: 'buffer', maxBuffer, windowsHide: true });
}

function repoRootOf(cwd) {
  const result = git(cwd, ['rev-parse', '--show-toplevel']);
  if (result.status !== 0) return '';
  return result.stdout.toString('utf8').trim();
}

/** 跳过规则：支持精确路径、`前缀/**`、以及含 `*` 的单段通配（与 test-suite 的 glob 语义一致）。 */
export function matchesSkip(rel, patterns) {
  for (const raw of patterns) {
    const pattern = raw.replace(/^\.\//, '');
    if (pattern.endsWith('/**')) {
      const prefix = pattern.slice(0, -3);
      if (rel === prefix || rel.startsWith(prefix + '/')) return true;
      continue;
    }
    const escaped = pattern.replace(/[.+^$()|[\]\\{}]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*');
    if (new RegExp('^' + escaped + '$').test(rel)) return true;
  }
  return false;
}

/** 子工作树的改动清单（路径都是仓库相对、正斜杠）。--no-renames 让改名拆成 D + 新文件，收法统一。 */
export function changedPaths(childDir) {
  const result = git(childDir, ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--no-renames']);
  if (result.status !== 0) throw new UsageError('git status 失败（--child 必须是工作树）：' + result.stderr.toString('utf8').trim());
  const entries = result.stdout.toString('utf8').split('\0');
  const paths = [];
  for (const entry of entries) {
    if (!entry) continue;
    paths.push(entry.slice(3));
  }
  return [...new Set(paths)].sort();
}

/** 从 git 对象库读 base 版本；没有该文件返回 null。 */
function readFromBase(root, baseSha, relPath) {
  const result = git(root, ['show', baseSha + ':' + relPath]);
  if (result.status !== 0) return null;
  return result.stdout;
}

function readIfExists(absPath) {
  try {
    const stat = fs.statSync(absPath);
    if (!stat.isFile()) return null;
    return fs.readFileSync(absPath);
  } catch {
    return null;
  }
}

function same(a, b) {
  if (a === null || b === null) return a === b;
  return a.equals(b);
}

function isBinary(buffer) {
  return Boolean(buffer && buffer.includes(0));
}

function writeFileAt(absPath, buffer) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, buffer);
}

/** 三方合并一个文件；返回 { status: 'merged'|'conflict'|'error', merged?: Buffer, detail?: string }。 */
function threeWayMerge(ours, base, theirs) {
  if (isBinary(ours) || isBinary(base) || isBinary(theirs)) return { status: 'conflict', detail: 'binary' };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'premerge-'));
  try {
    const oursPath = path.join(dir, 'ours');
    const basePath = path.join(dir, 'base');
    const theirsPath = path.join(dir, 'theirs');
    fs.writeFileSync(oursPath, ours);
    fs.writeFileSync(basePath, base);
    fs.writeFileSync(theirsPath, theirs);
    const result = spawnSync('git', ['merge-file', '-p', '-L', 'ours', '-L', 'base', '-L', 'theirs', oursPath, basePath, theirsPath], {
      encoding: 'buffer', maxBuffer: 64 * 1024 * 1024, windowsHide: true,
    });
    if (result.status === 0) return { status: 'merged', merged: result.stdout };
    if (result.status === 1) return { status: 'conflict', detail: 'merge-conflict' };
    return { status: 'error', detail: (result.stderr || Buffer.from('')).toString('utf8').trim() || 'git merge-file 失败' };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** 冲突侧车：按原目录层级落 ours/base/theirs 三份，便于直接 diff。 */
function writeConflictSidecar(reportDir, relPath, ours, base, theirs) {
  if (!reportDir) return '';
  const target = path.join(reportDir, ...relPath.split('/'));
  fs.mkdirSync(target, { recursive: true });
  if (ours !== null) fs.writeFileSync(path.join(target, 'ours'), ours);
  if (base !== null) fs.writeFileSync(path.join(target, 'base'), base);
  if (theirs !== null) fs.writeFileSync(path.join(target, 'theirs'), theirs);
  return target;
}

/** 主流程；返回退出码。 */
export function premerge(opts) {
  const startedAt = Date.now();
  const root = opts.root || repoRootOf(process.cwd());
  if (!root) throw new UsageError('当前目录不在 git 仓库内（用 --root 指定仓库根）');
  const child = path.resolve(opts.child);
  if (!fs.existsSync(child)) throw new UsageError('--child 不存在：' + child);
  const childRoot = repoRootOf(child);
  if (!childRoot) throw new UsageError('--child 不是 git 工作树：' + child);
  const baseResult = git(root, ['rev-parse', '--verify', opts.base + '^{commit}']);
  if (baseResult.status !== 0) throw new UsageError('基线不存在：' + opts.base);
  const baseSha = baseResult.stdout.toString('utf8').trim();
  const skip = [...DEFAULT_SKIP, ...opts.skip];
  const reportDir = opts.reportDir || path.join(root, '.scratch', 'premerge-conflicts', String(startedAt));
  if (!opts.dry && !fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

  const counts = { copy: 0, merge: 0, delete: 0, conflict: 0, noop: 0, skipped: 0 };
  const actions = [];
  const record = (relPath, action, detail = '', sidecar = '') => {
    actions.push({ path: relPath, action, detail, sidecar });
    counts[action] += 1;
  };

  for (const relPath of changedPaths(child)) {
    if (matchesSkip(relPath, skip)) {
      counts.skipped += 1;
      continue;
    }
    const oursAbs = path.join(root, ...relPath.split('/'));
    const childAbs = path.join(child, ...relPath.split('/'));
    const ours = readIfExists(oursAbs);
    const theirs = readIfExists(childAbs);
    const base = readFromBase(root, baseSha, relPath);
    const upstreamChanged = !same(ours, base);

    if (theirs === null) {
      if (!upstreamChanged) {
        if (ours !== null) {
          if (!opts.dry) fs.rmSync(oursAbs, { force: true });
          record(relPath, 'delete');
          if (!opts.dry) console.log('DELETE path=' + relPath);
        } else {
          record(relPath, 'noop');
        }
      } else {
        record(relPath, 'conflict', 'deleted-in-child-changed-in-repo');
        if (!opts.dry) console.log('CONFLICT path=' + relPath + ' detail=deleted-in-child-changed-in-repo');
      }
      continue;
    }
    if (ours !== null && ours.equals(theirs)) {
      record(relPath, 'noop');
      continue;
    }
    if (!upstreamChanged) {
      if (!opts.dry) writeFileAt(oursAbs, theirs);
      record(relPath, 'copy');
      if (!opts.dry) console.log('COPY path=' + relPath);
      continue;
    }
    if (ours === null || base === null) {
      const detail = ours === null ? 'modified-in-child-deleted-in-repo' : 'both-added';
      record(relPath, 'conflict', detail);
      if (!opts.dry) console.log('CONFLICT path=' + relPath + ' detail=' + detail);
      continue;
    }
    const merged = threeWayMerge(ours, base, theirs);
    if (merged.status === 'merged') {
      if (!opts.dry) writeFileAt(oursAbs, merged.merged);
      record(relPath, 'merge');
      if (!opts.dry) console.log('MERGE path=' + relPath);
    } else if (merged.status === 'conflict') {
      const sidecar = opts.dry ? '' : writeConflictSidecar(reportDir, relPath, ours, base, theirs);
      record(relPath, 'conflict', merged.detail, sidecar);
      if (!opts.dry) console.log('CONFLICT path=' + relPath + ' detail=' + merged.detail + (sidecar ? ' dir=' + sidecar : ''));
    } else {
      throw new UsageError('三方合并出错：' + relPath + '（' + merged.detail + '）');
    }
  }

  const ms = Date.now() - startedAt;
  console.log('PRE-MERGE child=' + child + ' base=' + baseSha.slice(0, 8) + ' copy=' + counts.copy + ' merge=' + counts.merge
    + ' delete=' + counts.delete + ' conflict=' + counts.conflict + ' noop=' + counts.noop + ' skipped=' + counts.skipped + ' dry=' + opts.dry + ' ms=' + ms);
  const verdict = counts.conflict === 0 ? 'PASS' : 'FAIL';
  console.log('RESULT: ' + verdict + ' conflicts=' + counts.conflict);
  if (opts.json) {
    fs.mkdirSync(path.dirname(path.resolve(opts.json)), { recursive: true });
    fs.writeFileSync(path.resolve(opts.json), JSON.stringify({
      root, child, base: baseSha, dryRun: opts.dry, counts, actions, durationMs: ms, verdict,
    }, null, 2) + '\n');
  }
  return counts.conflict === 0 ? 0 : 1;
}

function main() {
  return premerge(parseArgs(process.argv.slice(2)));
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
