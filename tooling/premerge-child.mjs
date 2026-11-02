#!/usr/bin/env node
/**
 * tooling/premerge-child.mjs —— 收子工作树的改动进当前树，做三方合并（#1313 其二）。
 *
 * 问题（读数）：多席位并行时，子工作树的改动量常在集成树已经前进之后才收回来。直接按「拷盘面上有变动的文件」收，
 * 会拿子树的**旧基线**覆盖集成树的新提交（历史上真实覆盖过 PROTO_BASELINE、六条场景接线与一个测试件）。
 * 正确的收法不是覆盖，而是三方合并：base＝两边共同的起点（子工作树建树时的 SHA），
 * ours＝当前树现状，theirs＝子工作树现状。只有子工作树确实动过、且与当前树不冲突的部分才写回。
 *
 * 改动清单：子工作树「base..HEAD 已提交」∪「工作区未提交」（--no-renames），两种来源都收。
 * 只看 git status 会把「先 commit 再交回」的产出当 0 件放过（历史读数：copy=0 却 PASS）。
 *
 * 前置校验（不满足即 exit 2，宁可拒绝也不做错基线/跨仓库的合并）：
 *   · --child 与 --root 必须是同一个仓库（git rev-parse --git-common-dir 相同）；
 *   · --base 必须存在且是子工作树 HEAD 的祖先（子工作树可以前移，但不能是别的基线）。
 *
 * 判据：
 *   · 当前树该路径没动过（与 base 逐字节相同）⇒ 子树版本写回（新增/修改/删除照抄；保留 exec 位与符号链接）；
 *   · 两边都动过 ⇒ 文本文件跑 `git merge-file`：干净合入写回；冲突只把 ours/base/theirs 三个版本落到侧车目录；
 *   · 双方都删同一路径 ⇒ noop（不是冲突）；
 *   · 二进制、一边删一边改、双方各自新增同名文件、类型变化（普通文件⇄符号链接）⇒ 一律判冲突（不猜）。
 *
 * 两阶段写回：先算完全部路径的计划，**有任何冲突就本轮整棵树一个字节都不写**（只落冲突侧车），
 * 打 CONFLICT、JSON 里 applied=false、exit 1 交给人或主代理裁决；无冲突才进入写回阶段。
 *
 * 用法：
 *   node tooling/premerge-child.mjs --child D:/ilife-wt-t1204 --base d4127e89 --json .scratch/premerge-t1204.json
 * 选项：
 *   --child <dir>     子工作树目录（必填）
 *   --base <ref>      共同基线（必填；子工作树建树时的提交，如 d4127e89）
 *   --root <dir>      当前仓库根（缺省从当前目录向上找 git 根；测试夹具用）
 *   --skip <p1,p2>    额外跳过的前缀/glob（缺省 .scratch/** 与 node_modules/**；逗号分隔，可重复）
 *   --report-dir <d>  冲突侧车目录（缺省 .scratch/premerge-conflicts/<时间戳>）
 *   --dry             只算不写（冲突照样逐条打 CONFLICT，exit 1）
 *   --json <file>     结构化结果落点
 *
 * 读数（逐行，机读）：
 *   COPY path=<仓库相对路径>            子树新增/修改，当前树没动过 ⇒ 写回
 *   MERGE path=<路径>                   两边都动过，干净三方合并
 *   DELETE path=<路径>                  子树删除、当前树没动过 ⇒ 删除
 *   CONFLICT path=<路径> detail=<原因> dir=<侧车目录或空>
 *   PRE-MERGE child=<abs> base=<sha> copy=<n> merge=<n> delete=<n> conflict=<n> noop=<n> skipped=<n> applied=<true|false> dry=<true|false> ms=<n>
 *   RESULT: PASS|FAIL conflicts=<n>
 * 计数口径：copy/merge/delete/noop 是**计划**数（有冲突时 applied=false，计划数照报、盘上未动）。
 * 退出码：0＝无冲突；1＝有冲突（本轮未写回任何路径）；2＝用法／git 前置条件不满足；
 *         3＝内部错误（如 git merge-file 自身失败；本轮未写回，冲突侧车可能已落）。
 *
 * 纪律：只读写 --root 指定的当前树与 --child 指定的子树；不切分支、不动 git 索引、不提交。
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export class UsageError extends Error {}

/** 工具自身失败（例如 git merge-file 不可用/退出码异常）：与用法错误分开，exit 3。 */
export class InternalError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InternalError';
    this.exitCode = 3;
  }
}

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

function gitCommonDir(dir) {
  const result = git(dir, ['rev-parse', '--path-format=absolute', '--git-common-dir']);
  return result.status === 0 ? result.stdout.toString('utf8').trim() : '';
}

function samePath(a, b) {
  return path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
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

/**
 * 子工作树的改动清单（仓库相对、正斜杠）。
 * 「base..HEAD 已提交」与「工作区未提交」取并集；--no-renames 让改名拆成 D + 新文件，收法统一。
 */
export function changedPaths(childDir, baseSha) {
  const status = git(childDir, ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--no-renames']);
  if (status.status !== 0) throw new UsageError('git status 失败（--child 必须是工作树）：' + status.stderr.toString('utf8').trim());
  const committed = git(childDir, ['-c', 'core.quotePath=false', 'diff', '--name-only', '--no-renames', '-z', baseSha + '..HEAD']);
  if (committed.status !== 0) throw new UsageError('git diff base..HEAD 失败：' + committed.stderr.toString('utf8').trim());
  const paths = [];
  for (const entry of status.stdout.toString('utf8').split('\0')) {
    if (entry) paths.push(entry.slice(3));
  }
  for (const entry of committed.stdout.toString('utf8').split('\0')) {
    if (entry) paths.push(entry);
  }
  return [...new Set(paths)].sort();
}

/** 读工作区里的一个条目：符号链接不跟随（按链接目标收），普通文件带 mode。 */
export function readWorktreeEntry(absPath) {
  try {
    const stat = fs.lstatSync(absPath);
    if (stat.isSymbolicLink()) {
      return { kind: 'symlink', target: fs.readlinkSync(absPath), mode: stat.mode & 0o777 };
    }
    if (!stat.isFile()) return null;
    return { kind: 'file', buffer: fs.readFileSync(absPath), mode: stat.mode & 0o777 };
  } catch {
    return null;
  }
}

/** git 的 mode（100644/100755/120000）换算成文件系统 mode；未知按普通文件。 */
export function fsModeFromGitMode(mode) {
  if (mode === '100755') return 0o755;
  if (mode === '120000') return 0o777;
  return 0o644;
}

/** 从 git 对象库读 base 版本：返回 { kind, buffer|target, mode }；没有该文件返回 null。 */
export function readBaseEntry(root, baseSha, relPath) {
  const tree = git(root, ['ls-tree', '-z', baseSha, '--', relPath]);
  if (tree.status !== 0) return null;
  const entryLine = tree.stdout.toString('utf8').split('\0').find(Boolean);
  if (!entryLine) return null;
  const tab = entryLine.indexOf('\t');
  if (tab < 0) return null;
  const [mode, type, sha] = entryLine.slice(0, tab).split(' ');
  if (type !== 'blob' || !sha) return null;
  const blob = git(root, ['cat-file', 'blob', sha]);
  if (blob.status !== 0) return null;
  if (mode === '120000') return { kind: 'symlink', target: blob.stdout.toString('utf8'), mode: 0o777 };
  return { kind: 'file', buffer: blob.stdout, mode: fsModeFromGitMode(mode) };
}

function entryBuffer(entry) {
  if (entry === null) return null;
  return entry.kind === 'symlink' ? Buffer.from(entry.target) : entry.buffer;
}

function entriesEqual(a, b) {
  if (a === null || b === null) return a === b;
  if (a.kind !== b.kind) return false;
  if (a.kind === 'symlink') return a.target === b.target;
  return a.buffer.equals(b.buffer);
}

function isBinaryBuffer(buffer) {
  return Boolean(buffer && buffer.includes(0));
}

/** 三方合并一个文件；返回 { status: 'merged'|'conflict'|'error', merged?: Buffer, detail?: string }。 */
export function threeWayMerge(ours, base, theirs) {
  if (isBinaryBuffer(ours) || isBinaryBuffer(base) || isBinaryBuffer(theirs)) return { status: 'conflict', detail: 'binary' };
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

/** 写回一个条目：符号链接按链接目标重建（不能写成普通文件），普通文件保留 mode（exec 位）。 */
export function applyEntry(root, relPath, entry, io = fs) {
  const abs = path.join(root, ...relPath.split('/'));
  io.mkdirSync(path.dirname(abs), { recursive: true });
  io.rmSync(abs, { force: true });
  if (entry.kind === 'symlink') {
    io.symlinkSync(entry.target, abs);
    return;
  }
  io.writeFileSync(abs, entry.buffer);
  io.chmodSync(abs, entry.mode & 0o777);
}

/** 删除一个条目（文件或符号链接；只删链接本身，不动链接目标）。 */
export function deleteEntry(root, relPath, io = fs) {
  const abs = path.join(root, ...relPath.split('/'));
  io.rmSync(abs, { force: true });
}

function assertSameRepository(root, childRoot) {
  const rootCommon = gitCommonDir(root);
  const childCommon = gitCommonDir(childRoot);
  if (!rootCommon || !childCommon || !samePath(rootCommon, childCommon)) {
    throw new UsageError('--child 不是同一个仓库的工作树（git common dir 不同）：' + childRoot);
  }
}

function assertBaseAncestor(childRoot, baseSha) {
  const exists = git(childRoot, ['cat-file', '-e', baseSha + '^{commit}']);
  if (exists.status !== 0) throw new UsageError('基线 ' + baseSha.slice(0, 8) + ' 不在子工作树仓库里：' + childRoot);
  const ancestor = git(childRoot, ['merge-base', '--is-ancestor', baseSha, 'HEAD']);
  if (ancestor.status !== 0) {
    throw new UsageError('基线 ' + baseSha.slice(0, 8) + ' 不是子工作树 HEAD 的祖先（子工作树已前移或基线给错）：' + childRoot);
  }
}

/** 主流程；返回退出码。deps 是测试注入点（threeWayMerge/readWorktreeEntry/readBaseEntry/applyEntry/deleteEntry）。 */
export function premerge(opts, deps = {}) {
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
  assertSameRepository(root, childRoot);
  assertBaseAncestor(childRoot, baseSha);

  const skip = [...DEFAULT_SKIP, ...opts.skip];
  const reportDir = opts.reportDir || path.join(root, '.scratch', 'premerge-conflicts', String(startedAt));
  const readChildEntry = deps.readWorktreeEntry || readWorktreeEntry;
  const readBase = deps.readBaseEntry || readBaseEntry;
  const mergeFn = deps.threeWayMerge || threeWayMerge;
  const writeEntry = deps.applyEntry || applyEntry;
  const removeEntry = deps.deleteEntry || deleteEntry;

  const counts = { copy: 0, merge: 0, delete: 0, conflict: 0, noop: 0, skipped: 0 };
  const actions = [];
  const writes = [];
  const record = (relPath, action, detail = '', sidecar = '') => {
    actions.push({ path: relPath, action, detail, sidecar });
    counts[action] += 1;
  };
  const reportConflict = (relPath, detail, ours, base, theirs) => {
    const sidecar = opts.dry ? '' : writeConflictSidecar(reportDir, relPath, entryBuffer(ours), entryBuffer(base), entryBuffer(theirs));
    record(relPath, 'conflict', detail, sidecar);
    console.log('CONFLICT path=' + relPath + ' detail=' + detail + (sidecar ? ' dir=' + sidecar : ''));
  };

  for (const relPath of changedPaths(child, baseSha)) {
    if (matchesSkip(relPath, skip)) {
      counts.skipped += 1;
      continue;
    }
    const oursAbs = path.join(root, ...relPath.split('/'));
    const childAbs = path.join(child, ...relPath.split('/'));
    const ours = readChildEntry(oursAbs);
    const theirs = readChildEntry(childAbs);
    const base = readBase(root, baseSha, relPath);
    const upstreamChanged = !entriesEqual(ours, base);

    if (theirs === null) {
      if (ours === null) {
        record(relPath, 'noop');
      } else if (!upstreamChanged) {
        record(relPath, 'delete');
        writes.push({ path: relPath, op: 'delete', action: 'delete' });
      } else {
        reportConflict(relPath, 'deleted-in-child-changed-in-repo', ours, base, null);
      }
      continue;
    }
    if (entriesEqual(ours, theirs)) {
      record(relPath, 'noop');
      continue;
    }
    if (!upstreamChanged) {
      record(relPath, 'copy');
      writes.push({ path: relPath, op: 'write', action: 'copy', entry: theirs });
      continue;
    }
    if (ours === null || base === null) {
      reportConflict(relPath, ours === null ? 'modified-in-child-deleted-in-repo' : 'both-added', ours, base, theirs);
      continue;
    }
    if (ours.kind !== 'file' || base.kind !== 'file' || theirs.kind !== 'file') {
      reportConflict(relPath, 'symlink-or-type-change', ours, base, theirs);
      continue;
    }
    const merged = mergeFn(ours.buffer, base.buffer, theirs.buffer);
    if (merged.status === 'merged') {
      record(relPath, 'merge');
      writes.push({ path: relPath, op: 'write', action: 'merge', entry: { kind: 'file', buffer: merged.merged, mode: theirs.mode } });
    } else if (merged.status === 'conflict') {
      reportConflict(relPath, merged.detail, ours, base, theirs);
    } else {
      throw new InternalError('三方合并出错：' + relPath + '（' + merged.detail + '）');
    }
  }

  const applied = counts.conflict === 0 && !opts.dry;
  if (applied) {
    for (const action of writes) {
      try {
        if (action.op === 'delete') {
          removeEntry(root, action.path);
          console.log('DELETE path=' + action.path);
        } else {
          writeEntry(root, action.path, action.entry);
          console.log(action.action.toUpperCase() + ' path=' + action.path);
        }
      } catch (err) {
        throw new InternalError('写回失败：' + action.path + '（' + (err && err.message ? err.message : err) + '）');
      }
    }
  }

  const ms = Date.now() - startedAt;
  console.log('PRE-MERGE child=' + child + ' base=' + baseSha.slice(0, 8) + ' copy=' + counts.copy + ' merge=' + counts.merge
    + ' delete=' + counts.delete + ' conflict=' + counts.conflict + ' noop=' + counts.noop + ' skipped=' + counts.skipped
    + ' applied=' + applied + ' dry=' + opts.dry + ' ms=' + ms);
  const verdict = counts.conflict === 0 ? 'PASS' : 'FAIL';
  console.log('RESULT: ' + verdict + ' conflicts=' + counts.conflict);
  if (opts.json) {
    fs.mkdirSync(path.dirname(path.resolve(opts.json)), { recursive: true });
    fs.writeFileSync(path.resolve(opts.json), JSON.stringify({
      root, child, base: baseSha, dryRun: opts.dry, applied, counts, actions, durationMs: ms, verdict,
    }, null, 2) + '\n');
  }
  return counts.conflict === 0 ? 0 : 1;
}

function main() {
  return premerge(parseArgs(process.argv.slice(2)));
}

/** 错误 → 退出码：内部错误 3，其余（用法/未知）2。 */
export function exitCodeForError(err) {
  return err instanceof InternalError ? 3 : 2;
}

const IS_MAIN = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (IS_MAIN) {
  try {
    process.exitCode = main();
  } catch (err) {
    console.error('FAIL: ' + (err && err.stack && !(err instanceof UsageError) && !(err instanceof InternalError) ? err.stack : err.message));
    process.exitCode = exitCodeForError(err);
  }
}
