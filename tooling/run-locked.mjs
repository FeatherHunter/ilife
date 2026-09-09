#!/usr/bin/env node
/**
 * tooling/run-locked.mjs —— 持锁包装器（协议 §2 锁协议 ＋ §2.3 留痕 ＋ §2.4 机械门禁）。
 *
 * 用法：
 *   node tooling/run-locked.mjs --ticket 88 -- pnpm build
 *   node tooling/run-locked.mjs --ticket 88 -- node --test tooling/test/run-locked.test.mjs
 *   node tooling/run-locked.mjs --ticket 88 --lock-dir .scratch/locks-t -- node -e "…"   # 隔离锁目录（测试用）
 *
 * 语义（逐条对应协议条文）：
 *   1. 抢锁（§2）：目录锁 `<lock-dir>/gate.lock`，`mkdir` 原子创建。等待期间的判定顺序：
 *      - **先探活再等**（R-3-3）：每轮先读 `<lock-dir>/owner.json` 的 `pid`，用 `process.kill(pid, 0)` 探活；
 *      - **活进程一律不抢回**（R-2-1-2）：owner 存活时**无论锁龄多大**都不抢回，`--stale-minutes` 不得夺活锁；
 *      - owner 已死、且该记录**属于当前锁**（`owner.json` mtime 不早于锁目录 mtime，否则是上一轮残留记录）
 *        → 立即按 §2.1.3 路径守卫后抢回（不等 10 分钟）；
 *      - 无可用 pid（owner.json 缺失／是残留记录）→ 退化为锁龄 > `--stale-minutes`（默认 10 分钟）才抢回；
 *      - 每次抢回**落盘**一行 `LOCK-STOLEN …` 到 `gate-runs.log`（R-2-1-3，审计面可见）。
 *   2. 留痕（§2.3）：持锁期间写 `<lock-dir>/owner.json`（pid／runId／ticket／cmd／startedAt／waitedMs）；
 *      持锁后**立即**追加 `START …`（R-3-1，崩溃／被杀也留痕），命令结束后追加
 *      `RUN ticket=<票号> runId=<id> cmd=<命令> waitedMs=<n> exit=<n> at=<ISO>`（被信号终止时附 `signal=`）。
 *      **写 `gate-runs.log`／`owner.json` 失败即 exit ≠ 0**（R-2-3，不得仅 `WARN` 静默）。
 *   3. 释放（§2）：`finally` 内**先校验归属**（`owner.json.pid === process.pid` 才允许删除，R-2-1-1），
 *      通过后**先删 `owner.json`、再删锁目录**（顺序不可交换：先删锁会误删新持锁者的记录）；
 *      归属不符（锁已被他人接管／owner.json 不可读）→ 一律不删并以 exit ≠ 0 告警。
 *   4. **子进程超时**（#88 A.5，防「子进程挂死 → 包装器永久持锁 → 堵死其他 session」）：子进程超过
 *      `--child-timeout-ms` 仍在跑 → 终止**进程树**、`RUN … timeout=1`、**exit=124**；若终止后
 *      `--child-kill-grace-ms`（默认 15 s）内仍未退出，则强制结算并释放锁（宁可留孤儿进程，不可持锁不放）。
 *
 * 选项：
 *   --ticket <票号>        审计条目的票号（缺省 `unknown`，会打印告警）
 *   --lock-dir <目录>      锁目录，缺省 `<仓库根>/.scratch/locks`（可用环境变量 ILIFE_GATE_LOCK_DIR 覆盖）
 *   --stale-minutes <n>    无 pid 可探活时的锁龄抢回阈值（分钟，缺省 10）
 *   --poll-ms <n>          抢锁轮询间隔（毫秒，缺省 10000，与协议 §2 的 10s 一致）
 *   --max-wait-ms <n>      最长等待（毫秒，0＝不限，缺省 0）
 *   --child-timeout-ms <n> 子进程超时（毫秒，0＝不限，缺省 900000＝15 分钟）→ 超时杀树 ＋ exit 124
 *   --child-kill-grace-ms <n> 超时杀树后的强制结算宽限（毫秒，0＝不限，缺省 15000）
 *   --run-id <id>          显式指定本次运行的 runId（缺省随机 UUID；仅供测试／调试）
 *   --                  选项与命令的分隔符（可省略；遇到首个非选项参数即视为命令起点）
 *
 * 注意：**不支持重入**。被包装的命令若内部再次调用本工具（例如自证测试），必须用
 *       `--lock-dir` 指向独立目录，否则会等待自己持有的锁。
 */
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const FORBIDDEN_REMOVE_SEGMENTS = new Set(['node_modules', 'packages', 'docs', 'test', 'tooling', '.git']);

/** `owner.json` 与锁目录 mtime 的容差（毫秒）：owner.json 只要不早于「锁目录 mtime − 容差」即视为属于当前锁。 */
export const OWNER_RECORD_TOLERANCE_MS = 2;

/** 协议 §2.1.3 路径守卫：只允许删除 root 之下的路径，且不得落在禁区目录内。 */
export function assertSafeToRemove(target, root) {
  const abs = path.resolve(target);
  const rootAbs = path.resolve(root);
  if (abs === rootAbs) throw new Error(`拒绝删除根目录自身: ${abs}`);
  if (!abs.startsWith(rootAbs + path.sep)) throw new Error(`拒绝删除 root 之外的路径: ${abs}`);
  const segs = [...rootAbs.split(path.sep), ...path.relative(rootAbs, abs).split(path.sep)];
  for (const seg of segs) {
    if (FORBIDDEN_REMOVE_SEGMENTS.has(seg)) throw new Error(`拒绝删除禁区目录下的路径: ${abs}`);
  }
}

/** 机读字段值：含空白或引号时用 JSON 双引号包裹，否则原样。 */
export function formatFieldValue(value) {
  const s = String(value ?? '');
  return /[\s"]/.test(s) ? JSON.stringify(s) : s;
}

/** 生成一行机读记录（`RUN …`／`START …`／`LOCK-STOLEN …`）。 */
export function formatRecord(kind, fields) {
  const body = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${formatFieldValue(v)}`)
    .join(' ');
  return `${kind} ${body}`;
}

/** 读取 owner.json；缺失／损坏／非对象时返回 null（不抛错）。 */
export function readOwnerRecord(ownerPath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(ownerPath, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * pid 存活探测（R-2-1-2／R-3-3）：
 * `ESRCH` → 已死；`EPERM` → 存在但无权限（视为活）；其它错误／非法 pid → 保守视为**活**（宁可不抢回）。
 */
export function probePidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return { alive: false, reason: 'invalid-pid' };
  try {
    process.kill(pid, 0);
    return { alive: true, reason: 'signal-0-ok' };
  } catch (err) {
    if (err && err.code === 'ESRCH') return { alive: false, reason: 'esrch' };
    if (err && err.code === 'EPERM') return { alive: true, reason: 'eperm' };
    return { alive: true, reason: `unknown:${(err && (err.code || err.message)) || 'error'}` };
  }
}

function usage() {
  const text = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  const block = text.match(/\/\*\*([\s\S]*?)\*\//);
  return block ? block[1].replace(/^\s*\*?/gm, '').trim() : 'run-locked.mjs';
}

const OPTION_SPECS = {
  '--ticket': 'value',
  '--lock-dir': 'value',
  '--stale-minutes': 'value',
  '--poll-ms': 'value',
  '--max-wait-ms': 'value',
  '--child-timeout-ms': 'value',
  '--child-kill-grace-ms': 'value',
  '--run-id': 'value',
};

export function parseArgs(argv) {
  const opts = {
    ticket: '', lockDir: '', staleMinutes: 10, pollMs: 10000, maxWaitMs: 0,
    childTimeoutMs: 900000, childKillGraceMs: CHILD_KILL_GRACE_MS, runId: '', command: [], help: false,
  };
  let i = 0;
  for (; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--') { i++; break; }
    if (arg === '--help' || arg === '-h') { opts.help = true; return opts; }
    if (OPTION_SPECS[arg] === undefined) break; // 首个非选项参数＝命令起点
    const value = argv[++i];
    if (value === undefined) throw new Error(`${arg} 缺少取值`);
    if (arg === '--ticket') opts.ticket = value;
    else if (arg === '--lock-dir') opts.lockDir = value;
    else if (arg === '--stale-minutes') opts.staleMinutes = Number(value);
    else if (arg === '--poll-ms') opts.pollMs = Number(value);
    else if (arg === '--max-wait-ms') opts.maxWaitMs = Number(value);
    else if (arg === '--child-timeout-ms') opts.childTimeoutMs = Number(value);
    else if (arg === '--child-kill-grace-ms') opts.childKillGraceMs = Number(value);
    else if (arg === '--run-id') opts.runId = value;
  }
  opts.command = argv.slice(i);
  for (const key of ['staleMinutes', 'pollMs', 'maxWaitMs', 'childTimeoutMs', 'childKillGraceMs']) {
    if (!Number.isFinite(opts[key]) || opts[key] < 0) throw new Error(`${key} 必须是非负数字`);
  }
  return opts;
}

/** Windows 下 `spawn(..., { shell: true })` 需要把整条命令拼成一行；含空白的参数加双引号。 */
export function toShellCommandLine(command) {
  return command
    .map((arg) => (/[\s"&|<>^]/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg))
    .join(' ');
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** 超时杀树后的强制结算宽限（毫秒）：到点仍未退出就放弃等待，**必须**释放锁。 */
export const CHILD_KILL_GRACE_MS = 15000;

/**
 * 终止子进程**及其进程树**（#88 A.5）。
 * Windows 下 `shell: true` 的 `child.pid` 是 `cmd.exe`——只 kill 它会留下真正的孙进程（挂死源头），
 * 故必须**先** `taskkill /T /F` 连子孙一起杀，**只有它失败时**才兜底 `child.kill('SIGKILL')`；
 * 顺序不可交换：先 kill 掉 shell 会让 `taskkill` 找不到 PID，孙进程存活（实测 30 s 才自然退出）。
 * 失败不抛错（由 `--child-kill-grace-ms` 兜底）。
 */
export function killChildTree(child, spawnImpl = spawn) {
  if (!child || !Number.isInteger(child.pid)) return;
  const fallback = () => { try { child.kill('SIGKILL'); } catch { /* 已退出 */ } };
  if (process.platform === 'win32') {
    try {
      const tk = spawnImpl('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
      tk.on('error', fallback);
      tk.on('close', (code) => { if (code !== 0) fallback(); });
      return;
    } catch { /* 落到 fallback */ }
  }
  fallback();
}

/**
 * 抢锁：返回 `{ waitedMs, stolen }`。
 * 抢回判定顺序＝先探活（活进程一律不抢回）→ 死 owner 且记录属于当前锁 → 立即抢回
 * → 无 pid 可用时按锁龄兜底（`--stale-minutes`）。
 */
export async function acquireLock({
  lockPath,
  ownerPath = path.join(path.dirname(lockPath), 'owner.json'),
  staleMinutes,
  pollMs,
  maxWaitMs,
  ticket = '',
  runId = '',
  log = () => {},
  onSteal = () => {},
}) {
  const started = Date.now();
  let stolen = 0;
  let warnedLive = false;
  let warnedResidual = false;
  for (;;) {
    try {
      fs.mkdirSync(lockPath);
      return { waitedMs: Date.now() - started, stolen };
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    let lockStat = null;
    try {
      lockStat = fs.statSync(lockPath);
    } catch {
      continue; // 锁刚被别人释放
    }
    let ownerStat = null;
    try { ownerStat = fs.statSync(ownerPath); } catch { ownerStat = null; }
    const owner = readOwnerRecord(ownerPath);
    const ownerPid = owner && Number.isInteger(owner.pid) ? owner.pid : null;
    const probe = ownerPid === null ? null : probePidAlive(ownerPid);
    // 残留记录判定：owner.json 早于锁目录 → 属于上一轮（死）运行的记录，不得据其 pid 抢回。
    const ownerBelongsToLock = Boolean(ownerStat) && Boolean(lockStat)
      && ownerStat.mtimeMs >= lockStat.mtimeMs - OWNER_RECORD_TOLERANCE_MS;
    const ageMinutes = (Date.now() - lockStat.mtimeMs) / 60000;
    let stealReason = null;

    if (probe && probe.alive) {
      // R-2-1-2：活进程一律不抢回（无论 age）。
      if (!warnedLive) {
        log(`WAIT-OWNER-ALIVE pid=${ownerPid} ticket=${owner.ticket ?? ''} runId=${owner.runId ?? ''}`
          + ` ageMinutes=${ageMinutes.toFixed(2)}（活进程一律不抢回，等它释放）`);
        warnedLive = true;
      }
    } else if (probe && !probe.alive) {
      if (ownerBelongsToLock) stealReason = 'owner-dead';
      else if (!warnedResidual) {
        log(`WARN: owner.json 早于锁目录（疑似上一轮残留记录），忽略其 pid=${ownerPid}`);
        warnedResidual = true;
      }
    }
    if (!stealReason && !(probe && probe.alive) && staleMinutes > 0 && ageMinutes > staleMinutes) {
      stealReason = 'age';
    }

    if (stealReason) {
      if (stealReason === 'owner-dead') {
        // 顺序不可交换：先删残留 owner.json（避免新持锁者被它顶替），再删锁目录。
        try {
          assertSafeToRemove(ownerPath, path.dirname(ownerPath));
          fs.rmSync(ownerPath, { force: true });
        } catch (err) {
          log(`WARN: 残留 owner.json 删除失败（继续抢回）：${err.message}`);
        }
      }
      assertSafeToRemove(lockPath, path.dirname(lockPath));
      fs.rmSync(lockPath, { recursive: true, force: true });
      stolen += 1;
      onSteal({
        ticket,
        runId,
        reason: stealReason,
        ownerPid: ownerPid ?? '',
        ownerAlive: probe ? (probe.alive ? '1' : '0') : 'unknown',
        ownerBelongsToLock: ownerBelongsToLock ? '1' : '0',
        ageMinutes: ageMinutes.toFixed(2),
        lockPath,
      });
      continue;
    }

    const waitedMs = Date.now() - started;
    if (maxWaitMs > 0 && waitedMs >= maxWaitMs) {
      throw new Error(`等待锁超时（maxWaitMs=${maxWaitMs}，当前 waitedMs=${waitedMs}，lock=${lockPath}）`);
    }
    await sleep(pollMs);
  }
}

function appendLogLine(logPath, line) {
  fs.appendFileSync(logPath, `${line}\n`, 'utf8');
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) { console.log(usage()); return 0; }
  if (opts.command.length === 0) {
    console.error('FAIL: 未给出要执行的命令。用法：node tooling/run-locked.mjs --ticket 88 -- pnpm build');
    return 2;
  }
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const lockDir = path.resolve(repoRoot, opts.lockDir || process.env.ILIFE_GATE_LOCK_DIR || '.scratch/locks');
  const lockPath = path.join(lockDir, 'gate.lock');
  const ownerPath = path.join(lockDir, 'owner.json');
  const logPath = path.join(lockDir, 'gate-runs.log');
  const ticket = opts.ticket || 'unknown';
  const runId = opts.runId || randomUUID();
  const cmdText = toShellCommandLine(opts.command);
  if (!opts.ticket) console.error('WARN: 未给 --ticket，审计条目的票号记作 unknown（协议 §2.4 建议显式给出）');

  fs.mkdirSync(lockDir, { recursive: true });

  /** R-2-3：写审计日志失败必须 exit ≠ 0（抛错由 main 兜住），不得只 WARN。 */
  const appendOrThrow = (kind, fields, what) => {
    try {
      appendLogLine(logPath, formatRecord(kind, fields));
    } catch (err) {
      throw new Error(`审计日志写入失败（${what}，${logPath}）：${err.message}`);
    }
  };

  let acquired = false;
  let ownerWritten = false;
  let exitCode = 1;
  let waitedMs = 0;
  let signal = null;
  let spawnError = null;
  let lockNote = '';
  let timedOut = false;
  let timeoutTimer = null;
  let graceTimer = null;

  try {
    const acq = await acquireLock({
      lockPath,
      ownerPath,
      staleMinutes: opts.staleMinutes,
      pollMs: opts.pollMs,
      maxWaitMs: opts.maxWaitMs,
      ticket,
      runId,
      log: (msg) => console.error(msg),
      // R-2-1-3：抢回落盘（写失败 → 抛错 → exit ≠ 0）。
      onSteal: (info) => {
        console.error(`LOCK-STOLEN lock=${info.lockPath} reason=${info.reason} ownerPid=${info.ownerPid} ageMinutes=${info.ageMinutes}`);
        appendOrThrow('LOCK-STOLEN', {
          ticket,
          runId,
          reason: info.reason,
          ownerPid: info.ownerPid || undefined,
          ownerAlive: info.ownerAlive,
          ownerBelongsToLock: info.ownerBelongsToLock,
          ageMinutes: info.ageMinutes,
          at: new Date().toISOString(),
        }, 'LOCK-STOLEN');
      },
    });
    acquired = true;
    waitedMs = acq.waitedMs;
    const startedAt = new Date().toISOString();

    // R-2-3：owner.json 写失败必须 exit ≠ 0（且不执行命令，避免产生无归属的持锁运行）。
    try {
      fs.writeFileSync(ownerPath, `${JSON.stringify({
        pid: process.pid,
        runId,
        ticket,
        cmd: cmdText,
        startedAt,
        waitedMs,
        stolen: acq.stolen,
        lockPath,
        cwd: repoRoot,
      }, null, 2)}\n`, 'utf8');
      ownerWritten = true;
    } catch (err) {
      console.error(`FAIL: owner.json 写入失败（${ownerPath}）：${err.message}`);
      exitCode = 1;
    }

    if (ownerWritten) {
      console.error(`LOCK-ACQUIRED ticket=${ticket} runId=${runId} waitedMs=${waitedMs} pid=${process.pid}`);
      // R-3-1：START 行——崩溃／被杀也留痕；写失败即不执行命令并 exit ≠ 0（R-2-3）。
      try {
        appendLogLine(logPath, formatRecord('START', {
          ticket,
          runId,
          cmd: cmdText,
          waitedMs,
          pid: process.pid,
          at: startedAt,
        }));
      } catch (err) {
        console.error(`FAIL: 审计日志写入失败（START 行，${logPath}）：${err.message}`);
        exitCode = 1;
        lockNote = 'START 行写入失败，未执行命令';
      }

      if (!lockNote) {
        try {
          const child = spawn(cmdText, { cwd: repoRoot, stdio: 'inherit', shell: true });
          const outcome = await new Promise((resolve) => {
            let settled = false;
            const finish = (value) => { if (!settled) { settled = true; resolve(value); } };
            child.on('error', (err) => finish({ code: null, signal: null, error: err }));
            child.on('close', (code, sig) => finish({ code, signal: sig }));
            // #88 A.5：子进程超时 → 杀进程树 ＋ 记 timeout=1 ＋ exit 124；宽限内仍未退出则强制结算（必须放锁）。
            if (opts.childTimeoutMs > 0) {
              timeoutTimer = setTimeout(() => {
                timedOut = true;
                console.error(`TIMEOUT: 子进程超时（--child-timeout-ms=${opts.childTimeoutMs}，pid=${child.pid}）`
                  + '→ 终止进程树（否则包装器会永久持锁、堵死其他 session）');
                killChildTree(child);
                if (opts.childKillGraceMs > 0) {
                  graceTimer = setTimeout(() => {
                    console.error(`TIMEOUT: 杀树后 ${opts.childKillGraceMs}ms 仍未退出 → 强制结算并释放锁（可能留下孤儿进程）`);
                    finish({ code: null, signal: 'TIMEOUT' });
                  }, opts.childKillGraceMs);
                }
              }, opts.childTimeoutMs);
            }
          });
          if (timeoutTimer !== null) { clearTimeout(timeoutTimer); timeoutTimer = null; }
          if (graceTimer !== null) { clearTimeout(graceTimer); graceTimer = null; }
          if (outcome.error) {
            spawnError = outcome.error;
            exitCode = 127;
          } else if (timedOut) {
            signal = outcome.signal || 'TIMEOUT';
            exitCode = 124;
          } else if (outcome.code === null) {
            signal = outcome.signal;
            exitCode = 1; // 被信号终止：按失败记账（协议 §2 的死锁／误杀口径）
          } else {
            exitCode = outcome.code;
            signal = outcome.signal;
          }
        } catch (err) {
          spawnError = err;
          exitCode = 1;
        }
      }
    }
  } catch (err) {
    // 抢锁阶段失败（等待超时／LOCK-STOLEN 落盘失败等）：未持有锁，无需释放。
    console.error(`FAIL: ${err.message}`);
    exitCode = 1;
  } finally {
    if (acquired && ownerWritten) {
      try {
        appendLogLine(logPath, formatRecord('RUN', {
          ticket,
          runId,
          cmd: cmdText,
          waitedMs,
          exit: exitCode,
          pid: process.pid,
          at: new Date().toISOString(),
          signal: signal || undefined,
          timeout: timedOut ? 1 : undefined,
        }));
      } catch (err) {
        // R-2-3：写日志失败不得静默——exit 必须 ≠ 0。
        console.error(`FAIL: 审计日志写入失败（RUN 行，${logPath}）：${err.message}`);
        if (exitCode === 0) exitCode = 1;
      }
      // R-2-1-1：归属校验——只有 owner.json.pid === 本进程 pid 才允许删除。
      const ownerNow = readOwnerRecord(ownerPath);
      const ownedByUs = ownerNow !== null && Number(ownerNow.pid) === process.pid;
      if (ownedByUs) {
        try {
          // 顺序不可交换：先删 owner.json，再删锁目录（否则可能误删新持锁者的 owner.json）。
          assertSafeToRemove(ownerPath, lockDir);
          fs.rmSync(ownerPath, { force: true });
        } catch (err) {
          console.error(`FAIL: owner.json 清理失败：${err.message}`);
          if (exitCode === 0) exitCode = 1;
        }
        try {
          assertSafeToRemove(lockPath, lockDir);
          fs.rmSync(lockPath, { recursive: true, force: true });
          console.error(`LOCK-RELEASED ticket=${ticket} runId=${runId} exit=${exitCode}`);
        } catch (err) {
          console.error(`FAIL: 锁释放失败（锁可能残留，需人工处理）：${err.message}`);
          if (exitCode === 0) exitCode = 1;
        }
      } else {
        console.error('FAIL: 释放前归属校验失败——'
          + `owner.json.pid=${ownerNow ? ownerNow.pid : '缺失'} ≠ 本进程 pid=${process.pid}`
          + '（锁已被他人接管／owner.json 不可读；本进程不删除锁与 owner.json，协议 §2／R-2-1-1）');
        if (exitCode === 0) exitCode = 1;
      }
    } else if (acquired && !ownerWritten) {
      // owner.json 未写成：本进程刚 mkdir 成功，删掉自己刚创建的锁（他人无法据 pid 抢回它）。
      try {
        assertSafeToRemove(lockPath, lockDir);
        fs.rmSync(lockPath, { recursive: true, force: true });
        console.error(`LOCK-RELEASED ticket=${ticket} runId=${runId} exit=${exitCode}（owner.json 未写成，未执行命令）`);
      } catch (releaseErr) {
        console.error(`FAIL: 锁释放失败（锁可能残留，需人工处理）：${releaseErr.message}`);
      }
    }
  }

  if (spawnError) {
    console.error(`FAIL: 命令启动失败（${opts.command[0]}）：${spawnError.message}`);
    if (exitCode === 0) exitCode = 127;
  }
  console.error(`RESULT: ticket=${ticket} runId=${runId} waitedMs=${waitedMs} exit=${exitCode}`);
  return exitCode;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => { console.error(`FAIL: ${err.message}`); process.exit(1); });
}
