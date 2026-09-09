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
 *   1. 抢锁（§2）：目录锁 `<lock-dir>/gate.lock`，`mkdir` 原子创建；已被占用且 mtime 超过
 *      `--stale-minutes`（默认 10）分钟 → 视为死锁，按 §2.1.3 路径守卫后抢回。
 *   2. 留痕（§2.3）：持锁期间写 `<lock-dir>/owner.json`（pid／ticket／cmd／startedAt／waitedMs）；
 *      命令结束后**追加**一行机读记录到 `<lock-dir>/gate-runs.log`：
 *        RUN ticket=<票号> cmd=<命令> waitedMs=<n> exit=<n> at=<ISO>
 *      （值含空格／引号时以双引号包裹；被信号终止时追加 `signal=<信号>`。）
 *   3. 释放（§2）：`finally` 内删除 `owner.json` 与锁目录，路径守卫失败即抛错（不静默）。
 *
 * 选项：
 *   --ticket <票号>        审计条目的票号（缺省 `unknown`，会打印告警）
 *   --lock-dir <目录>      锁目录，缺省 `<仓库根>/.scratch/locks`（可用环境变量 ILIFE_GATE_LOCK_DIR 覆盖）
 *   --stale-minutes <n>    死锁抢回阈值（分钟，缺省 10）
 *   --poll-ms <n>          抢锁轮询间隔（毫秒，缺省 10000，与协议 §2 的 10s 一致）
 *   --max-wait-ms <n>      最长等待（毫秒，0＝不限，缺省 0）
 *   --                  选项与命令的分隔符（可省略；遇到首个非选项参数即视为命令起点）
 *
 * 注意：**不支持重入**。被包装的命令若内部再次调用本工具（例如自证测试），必须用
 *       `--lock-dir` 指向独立目录，否则会等待自己持有的锁（10 分钟后被抢回）。
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const FORBIDDEN_REMOVE_SEGMENTS = new Set(['node_modules', 'packages', 'docs', 'test', 'tooling', '.git']);

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

/** 生成一行机读记录（`RUN …` ／ 未来可复用于其它前缀）。 */
export function formatRecord(kind, fields) {
  const body = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${formatFieldValue(v)}`)
    .join(' ');
  return `${kind} ${body}`;
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
};

export function parseArgs(argv) {
  const opts = { ticket: '', lockDir: '', staleMinutes: 10, pollMs: 10000, maxWaitMs: 0, command: [], help: false };
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
  }
  opts.command = argv.slice(i);
  for (const key of ['staleMinutes', 'pollMs', 'maxWaitMs']) {
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

/** 抢锁：返回 { waitedMs, stolen }。 */
export async function acquireLock({ lockPath, staleMinutes, pollMs, maxWaitMs, log = () => {} }) {
  const started = Date.now();
  let stolen = 0;
  for (;;) {
    try {
      fs.mkdirSync(lockPath);
      return { waitedMs: Date.now() - started, stolen };
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    let ageMinutes = 0;
    try {
      ageMinutes = (Date.now() - fs.statSync(lockPath).mtimeMs) / 60000;
    } catch {
      continue; // 锁刚被别人释放
    }
    if (staleMinutes > 0 && ageMinutes > staleMinutes) {
      assertSafeToRemove(lockPath, path.dirname(lockPath));
      fs.rmSync(lockPath, { recursive: true, force: true });
      stolen += 1;
      log(`LOCK-STOLEN lock=${lockPath} ageMinutes=${ageMinutes.toFixed(1)}`);
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
  const cmdText = toShellCommandLine(opts.command);
  if (!opts.ticket) console.error('WARN: 未给 --ticket，审计条目的票号记作 unknown（协议 §2.4 建议显式给出）');

  fs.mkdirSync(lockDir, { recursive: true });
  const { waitedMs, stolen } = await acquireLock({
    lockPath,
    staleMinutes: opts.staleMinutes,
    pollMs: opts.pollMs,
    maxWaitMs: opts.maxWaitMs,
    log: (msg) => console.error(msg),
  });

  const startedAt = new Date().toISOString();
  fs.writeFileSync(ownerPath, `${JSON.stringify({
    pid: process.pid,
    ticket,
    cmd: cmdText,
    startedAt,
    waitedMs,
    stolen,
    lockPath,
    cwd: repoRoot,
  }, null, 2)}\n`, 'utf8');
  console.error(`LOCK-ACQUIRED ticket=${ticket} waitedMs=${waitedMs} pid=${process.pid}`);

  let exitCode = 1;
  let signal = null;
  let spawnError = null;
  try {
    const child = spawn(cmdText, { cwd: repoRoot, stdio: 'inherit', shell: true });
    const outcome = await new Promise((resolve) => {
      child.on('error', (err) => resolve({ code: null, signal: null, error: err }));
      child.on('close', (code, sig) => resolve({ code, signal: sig }));
    });
    if (outcome.error) {
      spawnError = outcome.error;
      exitCode = 127;
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
  } finally {
    try {
      appendLogLine(logPath, formatRecord('RUN', {
        ticket,
        cmd: cmdText,
        waitedMs,
        exit: exitCode,
        at: new Date().toISOString(),
        signal: signal || undefined,
      }));
    } catch (err) {
      console.error(`WARN: 审计日志写入失败（${logPath}）：${err.message}`);
    }
    try {
      if (fs.existsSync(ownerPath)) { assertSafeToRemove(ownerPath, lockDir); fs.rmSync(ownerPath); }
    } catch (err) {
      console.error(`WARN: owner.json 清理失败：${err.message}`);
    }
    try {
      assertSafeToRemove(lockPath, lockDir);
      fs.rmSync(lockPath, { recursive: true, force: true });
      console.error(`LOCK-RELEASED ticket=${ticket} exit=${exitCode}`);
    } catch (err) {
      console.error(`FAIL: 锁释放失败（锁可能残留，需人工处理）：${err.message}`);
      if (exitCode === 0) exitCode = 1;
    }
  }
  if (spawnError) {
    console.error(`FAIL: 命令启动失败（${opts.command[0]}）：${spawnError.message}`);
    if (exitCode === 0) exitCode = 127;
  }
  console.error(`RESULT: ticket=${ticket} waitedMs=${waitedMs} exit=${exitCode}`);
  return exitCode;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => { console.error(`FAIL: ${err.message}`); process.exit(1); });
}
