#!/usr/bin/env node
/**
 * tooling/run-tests.mjs —— 测试的确定性驱动（#1313 其三）。
 *
 * 背景（读数）：单进程 `node --test <全量 glob>` 默认按 availableParallelism-1 并行运行测试文件；
 * 本仓的浏览器测试几乎每件各起一个 headless Chrome，并行时可在 15 秒内堆到 400+ 个 chrome.exe，
 * 机器被拖到近乎不可用，测试相互超时、日志看起来「停止增长」（历史上 640s／326s 被 kill、1390s 判停滞）。
 * 根因不是退出语义，而是**并行度没有上界**：进程数与内存随核数放大，任何单件都没有墙钟约束。
 *
 * 本件的判据：
 *   · 逐件隔离：每件测试一个 `node --test` 子进程，日志各落一份，互不干扰；
 *   · 有界并发：`--jobs` 缺省 1（一次一件）；要快可显式调大，但浏览器测试并行会互相拖慢，风险自担；
 *   · 每件墙钟：超过 `--timeout-ms` 未见 TAP 汇总即杀进程树，记 timeout；杀完必进收尾，
 *     再等 KILL_EXIT_WAIT_MS 仍无 close 就强制 finish（不把整个驱动挂死）；
 *   · 完成后退出守卫：TAP 已打出末行汇总（`# duration_ms`）后子进程仍存活超过 `--grace-ms`，
 *     说明结果已产完而进程不退出——快照、杀进程树、记 hung，测试结果照常采信；hung 计入 hung 列，
 *     不影响 PASS 判定；
 *   · 机器摘要：每件一行 `# RESULT …`，末行 `RESULT: PASS|FAIL …`；`--json` 落结构化汇总。
 *
 * 用法：
 *   node tooling/run-tests.mjs --all                       # 全量清单（与 pnpm test 同源：test-suite.mjs 的 SUITE_GLOBS）
 *   node tooling/run-tests.mjs packages/base-render/test   # 目录＝该目录下 *.test.mjs
 *   node tooling/run-tests.mjs 'packages/skill-bill/test/i18n-*.test.mjs'
 *   node tooling/run-tests.mjs --list                      # 只列将要跑的文件
 * 选项：
 *   --all                 跑 SUITE_GLOBS 全量清单（无位置参数时的缺省行为）
 *   --list                只打印文件清单，不跑
 *   --jobs <n>            并发件数（缺省 1）
 *   --timeout-ms <n>      每件墙钟上限（缺省 600000＝10 分钟；这是失控保险，不是性能预算）
 *   --grace-ms <n>        TAP 完成后允许残留的毫秒（缺省 5000；0＝不启用该守卫）
 *   --log-dir <dir>       每件日志目录（缺省 .scratch/test-logs；文件名 <路径折 __>-<hash8>.tap.log）
 *   --json <file>         汇总落点（缺省不写）
 *   --quiet               不回显失败件的日志尾（仍打印每件结果行）
 *   --verbose             把子进程 TAP 原样回显（调试用，全量会很大）
 *   --root <dir>          仓库根（缺省按本文件位置推导；测试夹具用）
 *
 * 读数（逐行，机读）：
 *   # RUN [i/N] file=<仓库相对路径>
 *   # RESULT file=<路径> status=pass|fail|timeout|hung|error exit=<n> pass=<n> fail=<n> ms=<n> log=<相对路径>
 *   # HUNG file=<路径> 已完成但 <n> 毫秒内未退出（已杀进程树；结果照常采信）
 *   # TAIL file=<路径> 失败件的日志尾（--quiet 时省略）
 *   RESULT: PASS|FAIL files=<n> pass=<n> fail=<n> timeout=<n> hung=<n> error=<n> ms=<n>
 * 与 `pnpm test` 的分工：清单同源（`tooling/test-suite.mjs` 的 SUITE_GLOBS）；`pnpm test` 另有真实 home
 * 快照隔离与「命令 exit 0」门禁（`tooling/check-real-home-untouched.mjs --run`），本驱动只负责逐件跑与结果判定。
 * 二者不互相替代：收尾验收走 `pnpm test`，排查单件/分区用本驱动（包根 `pnpm test:suite` 就是本驱动 --all）。
 * 退出码：0＝全部 pass（含完成后被守卫杀掉的 hung）；1＝有 fail/timeout/error；2＝用法错误。
 */
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT, expandGlobs, suiteFiles } from './test-suite.mjs';

const DEFAULT_TIMEOUT_MS = 600000;
const DEFAULT_GRACE_MS = 5000;
const KILL_EXIT_WAIT_MS = 5000;

/** 用法错误：统一由 main 转成 exit 2。 */
export class UsageError extends Error {}

/** 解析命令行；未知选项直接抛 UsageError（不猜）。 */
export function parseArgs(argv, { root = REPO_ROOT } = {}) {
  const opts = {
    all: false, list: false, jobs: 1, timeoutMs: DEFAULT_TIMEOUT_MS, graceMs: DEFAULT_GRACE_MS,
    logDir: '.scratch/test-logs', json: '', quiet: false, verbose: false, root, args: [],
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const need = () => {
      if (i + 1 >= argv.length) throw new UsageError('选项 ' + token + ' 缺参数');
      i += 1;
      return argv[i];
    };
    if (token === '--all') opts.all = true;
    else if (token === '--list') opts.list = true;
    else if (token === '--quiet') opts.quiet = true;
    else if (token === '--verbose') opts.verbose = true;
    else if (token === '--jobs') opts.jobs = parsePositiveInt(need(), '--jobs');
    else if (token === '--timeout-ms') opts.timeoutMs = parsePositiveInt(need(), '--timeout-ms');
    else if (token === '--grace-ms') opts.graceMs = parseNonNegativeInt(need(), '--grace-ms');
    else if (token === '--log-dir') opts.logDir = need();
    else if (token === '--json') opts.json = need();
    else if (token === '--root') opts.root = path.resolve(need());
    else if (token.startsWith('-')) throw new UsageError('不认识的选项：' + token);
    else opts.args.push(token);
  }
  return opts;
}

function parsePositiveInt(text, flag) {
  const value = Number(text);
  if (!Number.isInteger(value) || value <= 0) throw new UsageError(flag + ' 需要正整数，得到：' + text);
  return value;
}

function parseNonNegativeInt(text, flag) {
  const value = Number(text);
  if (!Number.isInteger(value) || value < 0) throw new UsageError(flag + ' 需要非负整数，得到：' + text);
  return value;
}

/**
 * 把位置参数解析成测试文件清单（仓库相对、正斜杠、去重、字典序）。
 * 规则：目录 ⇒ 其下 `*.test.mjs`；含 `*` ⇒ glob；否则按单文件；都不匹配则 UsageError（拼错必须当场报）。
 */
export function resolveTestFiles(positional, { root = REPO_ROOT } = {}) {
  if (positional.length === 0) return suiteFiles({ root });
  const files = new Set();
  for (const arg of positional) {
    const rel = arg.split(path.sep).join('/').replace(/^\.\//, '');
    const abs = path.resolve(root, rel);
    let stat = null;
    try { stat = fs.statSync(abs); } catch { stat = null; }
    if (stat && stat.isDirectory()) {
      for (const file of expandGlobs([rel.replace(/\/+$/, '') + '/*.test.mjs'], { root })) files.add(file);
      continue;
    }
    if (rel.includes('*')) {
      for (const file of expandGlobs([rel], { root })) files.add(file);
      continue;
    }
    if (!stat || !stat.isFile()) throw new UsageError('找不到测试文件：' + arg);
    files.add(rel);
  }
  if (files.size === 0) throw new UsageError('位置参数没有展开出任何测试文件：' + positional.join(' '));
  return [...files].sort();
}

/** 从 TAP 行里读**顶层**汇总（缩进的子测试汇总不算；子进程结束前最后一行即 `# duration_ms`）。 */
export function parseTapSummary(lines) {
  const summary = { tests: null, pass: null, fail: null, cancelled: null, skipped: null, todo: null, durationMs: null, complete: false };
  for (const line of lines) {
    const match = /^# (tests|pass|fail|cancelled|skipped|todo|duration_ms)\s+(\S+)/.exec(line);
    if (!match) continue;
    const key = match[1] === 'duration_ms' ? 'durationMs' : match[1];
    summary[key] = Number(match[2]);
    if (match[1] === 'duration_ms') summary.complete = true;
  }
  return summary;
}

/** 判定一件测试的结局。纯函数，供测试逐格核对（不让守卫语义只活在实现里）。hung 是独立结局，不是 pass。 */
export function classifyOutcome({ exitCode = null, summary = null, timedOut = false, killedAfterCompletion = false, spawnError = null } = {}) {
  if (spawnError) return 'error';
  if (timedOut) return 'timeout';
  const complete = Boolean(summary && summary.complete);
  const failed = Boolean(summary && Number(summary.fail) > 0);
  if (killedAfterCompletion) return complete && !failed ? 'hung' : 'fail';
  if (exitCode !== 0) return 'fail';
  if (!complete) return 'fail';
  return failed ? 'fail' : 'pass';
}

/**
 * 日志文件名：路径分隔符折成 `__`（避免在 .scratch 里造目录树），再拼 8 位路径哈希。
 * 只折分隔符会撞名：`a/b.test.mjs` 与 `a__b.test.mjs` 折完都是 `a__b.test.mjs`，两份日志互相覆盖。
 */
export function logFileName(relPath) {
  const readable = relPath.split('/').join('__');
  const digest = createHash('sha256').update(relPath).digest('hex').slice(0, 8);
  return readable + '-' + digest + '.tap.log';
}

/** 杀进程树：Windows 用 taskkill /T；POSIX 用进程组（子进程以 detached 起）。 */
export function killTree(pid) {
  if (!pid) return;
  if (process.platform === 'win32') {
    try { execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* 已退出即失败 */ }
    return;
  }
  try { process.kill(-pid, 'SIGKILL'); } catch {
    try { process.kill(pid, 'SIGKILL'); } catch { /* 已退出即失败 */ }
  }
}

function tailOf(lines, count) {
  return lines.slice(Math.max(0, lines.length - count));
}

/**
 * 跑一件：返回 { path, status, exitCode, pass, fail, durationMs, hung, log }。
 * deps 是测试注入点：spawnChild / killTree / killExitWaitMs（缺省用真实实现）。
 */
export function runOne(relPath, index, total, opts, logDirAbs, deps = {}) {
  // 外层若也是 node --test 起的（自证、CI 嵌套），NODE_TEST_CONTEXT 会让内层 reporter 以为「递归调用」而跳过文件；
  // 逐件驱动必须是全新的一轮测试，所以显式清掉。
  const abs = path.join(opts.root, relPath);
  const logAbs = path.join(logDirAbs, logFileName(relPath));
  const logStream = fs.createWriteStream(logAbs, { flags: 'w' });
  const childArgs = ['--test', '--test-reporter=tap', abs];
  const startedAt = Date.now();
  const kill = deps.killTree || killTree;
  const killExitWaitMs = deps.killExitWaitMs ?? KILL_EXIT_WAIT_MS;
  return new Promise((resolve) => {
    if (!opts.quiet) console.log('# RUN [' + (index + 1) + '/' + total + '] file=' + relPath);
    const childEnv = { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' };
    delete childEnv.NODE_TEST_CONTEXT;
    const spawnChild = deps.spawnChild || ((args) => spawn(process.execPath, args, {
      cwd: opts.root,
      env: childEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      detached: process.platform !== 'win32',
    }));
    let child;
    try {
      child = spawnChild(childArgs);
    } catch (err) {
      logStream.end(String(err && err.message ? err.message : err));
      resolve({ path: relPath, status: 'error', exitCode: null, pass: null, fail: null, durationMs: Date.now() - startedAt, hung: false, log: path.relative(opts.root, logAbs).split(path.sep).join('/') });
      return;
    }
    const lines = [];
    let pending = '';
    let summary = null;
    let completedAt = null;
    let timedOut = false;
    let killedAfterCompletion = false;
    let exited = false;
    let exitCode = null;
    let spawnError = null;
    let graceTimer = null;
    const timeoutTimer = setTimeout(() => {
      if (exited) return;
      timedOut = true;
      kill(child.pid);
      finalize();
    }, opts.timeoutMs);
    const finalize = () => {
      if (exited) return;
      exited = true;
      clearTimeout(timeoutTimer);
      if (graceTimer) clearTimeout(graceTimer);
      const fallback = setTimeout(() => {
        try { child.stdout?.destroy(); } catch { /* 已关闭 */ }
        try { child.stderr?.destroy(); } catch { /* 已关闭 */ }
        finish();
      }, killExitWaitMs);
      child.once('close', () => { clearTimeout(fallback); finish(); });
    };
    const finish = () => {
      if (finished) return;
      finished = true;
      const status = classifyOutcome({ exitCode, summary, timedOut, killedAfterCompletion, spawnError });
      const pass = summary && summary.pass !== null ? summary.pass : null;
      const fail = summary && summary.fail !== null ? summary.fail : null;
      const durationMs = Date.now() - startedAt;
      const logRel = path.relative(opts.root, logAbs).split(path.sep).join('/');
      logStream.end();
      if (status === 'fail' || status === 'timeout') {
        if (!opts.quiet) {
          console.log('# TAIL file=' + relPath + '（日志：' + logRel + '）');
          for (const line of tailOf(lines, 25)) console.log('    ' + line);
        }
      }
      if (killedAfterCompletion) console.log('# HUNG file=' + relPath + ' 已完成但 ' + opts.graceMs + ' 毫秒内未退出（已杀进程树；结果照常采信）');
      console.log('# RESULT file=' + relPath + ' status=' + status + ' exit=' + (exitCode === null ? '-' : exitCode)
        + ' pass=' + (pass === null ? '-' : pass) + ' fail=' + (fail === null ? '-' : fail)
        + ' ms=' + durationMs + ' log=' + logRel);
      resolve({ path: relPath, status, exitCode, pass, fail, durationMs, hung: killedAfterCompletion, log: logRel });
    };
    let finished = false;
    const consume = (chunk) => {
      logStream.write(chunk);
      if (opts.verbose) process.stdout.write(chunk);
      pending += chunk.toString('utf8');
      const parts = pending.split('\n');
      pending = parts.pop();
      for (const part of parts) {
        const line = part.replace(/\r$/, '');
        lines.push(line);
        if (/^# duration_ms\s+\S+/.test(line)) {
          if (!completedAt) {
            completedAt = Date.now();
            summary = parseTapSummary(lines);
            clearTimeout(timeoutTimer);
            if (opts.graceMs > 0) {
              graceTimer = setTimeout(() => {
                if (exited) return;
                killedAfterCompletion = true;
                kill(child.pid);
                finalize();
              }, opts.graceMs);
            }
          }
        }
      }
    };
    child.stdout.on('data', consume);
    child.stderr.on('data', consume);
    child.on('error', (err) => {
      lines.push(String(err));
      spawnError = err;
      exitCode = null;
      finalize();
    });
    child.on('exit', (code) => {
      exitCode = code;
      if (completedAt && !summary) summary = parseTapSummary(lines);
      finalize();
    });
  });
}

/** 并发池：结果按输入顺序落位，打印顺序按完成先后。 */
async function runAll(files, opts, logDirAbs) {
  const results = new Array(files.length);
  let cursor = 0;
  const worker = async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= files.length) return;
      results[index] = await runOne(files[index], index, files.length, opts, logDirAbs);
    }
  };
  await Promise.all(Array.from({ length: Math.min(opts.jobs, files.length) }, worker));
  return results;
}

export function writeSummary(opts, results) {
  const totals = { files: results.length, pass: 0, fail: 0, timeout: 0, hung: 0, error: 0, durationMs: 0 };
  for (const result of results) {
    totals[result.status] += 1;
    totals.durationMs += result.durationMs;
  }
  const verdict = totals.fail === 0 && totals.timeout === 0 && totals.error === 0 ? 'PASS' : 'FAIL';
  console.log('RESULT: ' + verdict + ' files=' + totals.files + ' pass=' + totals.pass + ' fail=' + totals.fail
    + ' timeout=' + totals.timeout + ' hung=' + totals.hung + ' error=' + totals.error + ' ms=' + totals.durationMs);
  return { verdict, totals };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.all && opts.args.length > 0) throw new UsageError('--all 与位置参数只能二选一');
  const files = opts.all || opts.args.length === 0 ? suiteFiles({ root: opts.root }) : resolveTestFiles(opts.args, { root: opts.root });
  if (opts.list) {
    for (const file of files) console.log(file);
    return 0;
  }
  if (files.length === 0) throw new UsageError('清单为空：SUITE_GLOBS 一个文件都没展开出来');
  const logDirAbs = path.resolve(opts.root, opts.logDir);
  fs.mkdirSync(logDirAbs, { recursive: true });
  console.log('# SUITE files=' + files.length + ' jobs=' + opts.jobs + ' timeout-ms=' + opts.timeoutMs + ' grace-ms=' + opts.graceMs);
  const startedAt = Date.now();
  const results = await runAll(files, opts, logDirAbs);
  const { verdict, totals } = writeSummary(opts, results);
  if (opts.json) {
    const jsonAbs = path.resolve(opts.root, opts.json);
    fs.mkdirSync(path.dirname(jsonAbs), { recursive: true });
    fs.writeFileSync(jsonAbs, JSON.stringify({
      generatedAt: new Date().toISOString(), root: opts.root, jobs: opts.jobs,
      timeoutMs: opts.timeoutMs, graceMs: opts.graceMs, durationMs: Date.now() - startedAt,
      verdict, totals, files: results,
    }, null, 2) + '\n');
  }
  return verdict === 'PASS' ? 0 : 1;
}

const IS_MAIN = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (IS_MAIN) {
  try {
    process.exitCode = await main();
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
