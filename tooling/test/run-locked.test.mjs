import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { probePidAlive } from '../run-locked.mjs';

/**
 * tooling/run-locked.mjs 的行为测试（协议 §2／§2.3／§2.4）。
 * 本文件自身**必须**经持锁包装器跑（自我示范）：
 *   node tooling/run-locked.mjs --ticket 88 -- node --test tooling/test/run-locked.test.mjs
 *   pnpm gate:selftest          # 同一件事的 npm script 入口（R-3-5）
 * 测试内部一律用**独立 --lock-dir**（临时目录），避免与包装器自身的锁重入（死锁）。
 *
 * 断言纪律（R-3-4）：不使用「墙钟 ≤ N ms」式绝对时延断言，一律断言**行为**（落盘了哪几行、
 * waitedMs 是否 >0、抢回是否发生、锁是否被夺）。唯一的时间上界是 `--max-wait-ms` 这类显式参数。
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const RUN_LOCKED = path.join(repoRoot, 'tooling', 'run-locked.mjs');

/**
 * 解析真实 node 可执行文件。在 pnpm（Electron 宿主）里 `process.execPath` 是**应用二进制**
 * （实测 `D:\0Tools\DSH Desktop\DSH Desktop.exe`），拿它 spawn 会**静默 exit 0**——
 * `pnpm gate:selftest` 下 17/18 假红即由此而来（R-3-5 实证）。
 */
function resolveNodeBin() {
  if (!process.versions.electron && /node(\.exe)?$/i.test(process.execPath)) return process.execPath;
  const probe = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['node'], { encoding: 'utf8' });
  const cands = String(probe.stdout || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const bin = cands.find((p) => /\.exe$/i.test(p)) || cands.find((p) => !/\.(cmd|bat|ps1)$/i.test(p));
  if (bin) return bin;
  if (process.env.NODE && /\.exe$/i.test(process.env.NODE)) return process.env.NODE;
  return process.execPath;
}
const NODE_BIN = resolveNodeBin();

const tmpDirs = [];
function makeTmpLockDir(tag) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `ilife-gate-${tag}-`));
  tmpDirs.push(dir);
  return dir;
}
after(() => {
  for (const dir of tmpDirs) {
    if (!dir.startsWith(os.tmpdir())) throw new Error(`路径守卫：拒绝清理临时目录之外的路径 ${dir}`);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function runLocked(args, opts = {}) {
  return spawnSync(NODE_BIN, [RUN_LOCKED, ...args], { cwd: repoRoot, encoding: 'utf8', ...opts });
}

function readRecords(lockDir, kind) {
  const logPath = path.join(lockDir, 'gate-runs.log');
  if (!fs.existsSync(logPath)) return [];
  return fs.readFileSync(logPath, 'utf8').split(/\r?\n/)
    .filter((l) => l.startsWith(`${kind} `))
    .map((line) => {
      const fields = {};
      const re = /([A-Za-z_][\w-]*)=("(?:[^"\\]|\\.)*"|\S*)/g;
      let m;
      while ((m = re.exec(line)) !== null) {
        let v = m[2];
        if (v.startsWith('"')) { try { v = JSON.parse(v); } catch { v = v.slice(1, -1); } }
        fields[m[1]] = v;
      }
      return fields;
    });
}

const readRuns = (lockDir) => readRecords(lockDir, 'RUN');
const readStarts = (lockDir) => readRecords(lockDir, 'START');
const readStolen = (lockDir) => readRecords(lockDir, 'LOCK-STOLEN');

async function waitFor(predicate, timeoutMs = 8000, stepMs = 50) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (predicate()) return true;
    if (Date.now() > deadline) return false;
    await new Promise((r) => setTimeout(r, stepMs));
  }
}

/** 起一个持锁 N 毫秒的子进程（stdio ignore，仅用于并发场景）。 */
function startHolder(lockDir, { ticket, holdMs, pollMs = 100 }) {
  const child = spawn(NODE_BIN, [RUN_LOCKED, '--ticket', ticket, '--lock-dir', lockDir, '--poll-ms', String(pollMs),
    '--', 'node', '-e', `setTimeout(()=>{},${holdMs})`], { cwd: repoRoot, stdio: 'ignore' });
  return { child, done: new Promise((resolve) => child.on('close', resolve)) };
}

/** 造一个「pid 已死」的残留锁：gate.lock 先建、owner.json 后写（mtime 顺序＝属于当前锁）。 */
function makeDeadOwnerLock(lockDir) {
  const lockPath = path.join(lockDir, 'gate.lock');
  const ownerPath = path.join(lockDir, 'owner.json');
  fs.mkdirSync(lockPath, { recursive: true });
  const dead = spawnSync(NODE_BIN, ['-e', '0'], { encoding: 'utf8' });
  assert.equal(dead.status, 0);
  const deadPid = dead.pid;
  assert.equal(probePidAlive(deadPid).alive, false, `pid ${deadPid} 应已退出`);
  fs.writeFileSync(ownerPath, `${JSON.stringify({ pid: deadPid, ticket: '88-dead', runId: 'dead-run', cmd: 'node -e 0' })}\n`, 'utf8');
  return { lockPath, ownerPath, deadPid };
}

describe('run-locked：持锁包装器', () => {
  it('① 正常获取／释放：START＋RUN 落盘（同 runId）、exit 0、owner.json 与锁目录都被清掉', () => {
    const lockDir = makeTmpLockDir('normal');
    const r = runLocked(['--ticket', '88-test', '--lock-dir', lockDir, '--', 'node', '-e', '0']);
    assert.equal(r.status, 0, `包装器应透传 exit 0；stderr=${r.stderr}`);
    const starts = readStarts(lockDir);
    const runs = readRuns(lockDir);
    assert.equal(starts.length, 1, `应有且仅有 1 条 START 记录：${JSON.stringify(starts)}`);
    assert.equal(runs.length, 1, `应有且仅有 1 条 RUN 记录：${JSON.stringify(runs)}`);
    assert.equal(runs[0].ticket, '88-test');
    assert.equal(runs[0].cmd, 'node -e 0');
    assert.match(runs[0].runId, /^[0-9a-f-]{36}$/, `runId 应为 UUID：${runs[0].runId}`);
    assert.equal(starts[0].runId, runs[0].runId, 'START 与 RUN 必须是同一个 runId');
    assert.equal(starts[0].ticket, '88-test');
    assert.equal(starts[0].cmd, 'node -e 0');
    assert.match(starts[0].pid, /^\d+$/, 'START 应带 pid');
    assert.equal(runs[0].pid, starts[0].pid, 'RUN 也应带同一个 pid');
    assert.ok(Number(runs[0].waitedMs) >= 0, `waitedMs 应为非负数字，实测 ${runs[0].waitedMs}`);
    assert.equal(runs[0].waitedMs, starts[0].waitedMs, 'START 与 RUN 的 waitedMs 应一致');
    assert.equal(runs[0].exit, '0');
    assert.match(runs[0].at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, 'at 应为 ISO 时间戳');
    assert.equal(fs.existsSync(path.join(lockDir, 'owner.json')), false, 'owner.json 应在释放时删除');
    assert.equal(fs.existsSync(path.join(lockDir, 'gate.lock')), false, '锁目录应被释放');
  });

  it('①b 失败命令透传 exit≠0，并照样落盘 exit=<n>', () => {
    const lockDir = makeTmpLockDir('exit7');
    const r = runLocked(['--ticket', '88-test', '--lock-dir', lockDir, '--', 'node', '-e', 'process.exit(7)']);
    assert.equal(r.status, 7, '包装器应透传子进程 exit 7');
    const runs = readRuns(lockDir);
    assert.equal(runs.length, 1);
    assert.equal(runs[0].exit, '7');
    assert.equal(fs.existsSync(path.join(lockDir, 'gate.lock')), false);
  });

  it('② 等待时 waitedMs>0 落盘（持锁者可复核），且并发期间 owner.json 指向持锁者', async () => {
    const lockDir = makeTmpLockDir('wait');
    const holder = startHolder(lockDir, { ticket: '88-holder', holdMs: 2000 });
    const holderDone = holder.done;

    const ownerPath = path.join(lockDir, 'owner.json');
    assert.ok(await waitFor(() => fs.existsSync(ownerPath)), '持锁者应在 8s 内写出 owner.json');
    const owner = JSON.parse(fs.readFileSync(ownerPath, 'utf8'));
    assert.equal(owner.ticket, '88-holder');
    assert.equal(typeof owner.pid, 'number');
    assert.equal(typeof owner.runId, 'string');
    assert.equal(typeof owner.startedAt, 'string');

    const waiter = runLocked(['--ticket', '88-waiter', '--lock-dir', lockDir, '--poll-ms', '100', '--', 'node', '-e', '0']);
    assert.equal(waiter.status, 0, `等待者应成功：stderr=${waiter.stderr}`);
    assert.equal(await holderDone, 0, '持锁者应正常退出');

    const runs = readRuns(lockDir);
    const starts = readStarts(lockDir);
    assert.equal(runs.length, 2, `应有 2 条 RUN 记录：${JSON.stringify(runs)}`);
    assert.equal(starts.length, 2, `应有 2 条 START 记录：${JSON.stringify(starts)}`);
    assert.equal(readStolen(lockDir).length, 0, '正常并发不得出现抢回');
    const byTicket = Object.fromEntries(runs.map((x) => [x.ticket, x]));
    assert.ok(byTicket['88-holder'] && byTicket['88-waiter'], '两条记录应分别对应持锁者与等待者');
    assert.equal(byTicket['88-holder'].exit, '0');
    assert.ok(Number(byTicket['88-waiter'].waitedMs) > 0,
      `等待者的 waitedMs 必须 >0 且落盘（实测 ${byTicket['88-waiter'].waitedMs}）`);
    assert.equal(byTicket['88-waiter'].exit, '0');
    const waiterStart = readStarts(lockDir).find((s) => s.ticket === '88-waiter');
    assert.equal(waiterStart.waitedMs, byTicket['88-waiter'].waitedMs, 'START 与 RUN 的 waitedMs 应一致');
    assert.equal(fs.existsSync(ownerPath), false, '全部释放后不应残留 owner.json');
    assert.equal(fs.existsSync(path.join(lockDir, 'gate.lock')), false, '全部释放后不应残留锁目录');
  });

  it('②b 锁龄抢回（无 owner 记录）：抢回并留下 LOCK-STOLEN 落盘痕迹', () => {
    const lockDir = makeTmpLockDir('stale');
    const lockPath = path.join(lockDir, 'gate.lock');
    fs.mkdirSync(lockPath, { recursive: true });
    const old = new Date(Date.now() - 60_000);
    fs.utimesSync(lockPath, old, old); // 伪造成 1 分钟前创建的锁（无 owner.json）
    const r = runLocked(['--ticket', '88-test', '--lock-dir', lockDir, '--stale-minutes', '0.5', '--poll-ms', '100', '--', 'node', '-e', '0']);
    assert.equal(r.status, 0, `陈旧锁应被抢回：stderr=${r.stderr}`);
    assert.match(r.stderr, /LOCK-STOLEN/, '抢回应打印 LOCK-STOLEN 痕迹');
    const stolen = readStolen(lockDir);
    assert.equal(stolen.length, 1, `LOCK-STOLEN 必须落盘（R-2-1-3）：${JSON.stringify(stolen)}`);
    assert.equal(stolen[0].reason, 'age');
    assert.equal(stolen[0].ticket, '88-test');
    assert.equal(fs.existsSync(lockPath), false);
    assert.equal(readRuns(lockDir).length, 1);
  });

  it('②c R-2-1：活 owner 的锁**不得**被抢回（--stale-minutes 再小也不行）', async () => {
    const lockDir = makeTmpLockDir('live');
    const ownerPath = path.join(lockDir, 'owner.json');
    const holder = startHolder(lockDir, { ticket: '88-live', holdMs: 3000 });
    assert.ok(await waitFor(() => fs.existsSync(ownerPath)), '持锁者应写出 owner.json');
    const owner = JSON.parse(fs.readFileSync(ownerPath, 'utf8'));

    // 抢回阈值 0.02 分钟（≈1.2s），远小于持有时间；若仍会夺活锁，这里就会立刻得锁。
    const waiter = runLocked(['--ticket', '88-live-waiter', '--lock-dir', lockDir, '--stale-minutes', '0.02',
      '--poll-ms', '50', '--max-wait-ms', '900', '--', 'node', '-e', '0']);
    assert.notEqual(waiter.status, 0, `等待者应超时失败而不是夺走活锁：stdout=${waiter.stdout}`);
    assert.match(waiter.stderr, /等待锁超时/, `应因等待超时退出：${waiter.stderr}`);
    assert.match(waiter.stderr, /WAIT-OWNER-ALIVE/, '应先探活并识别出活 owner');
    assert.equal(readStolen(lockDir).length, 0, '活 owner 不得被抢回（R-2-1-2）');
    assert.ok(fs.existsSync(ownerPath), '等待者不得删除持锁者的 owner.json');
    assert.equal(JSON.parse(fs.readFileSync(ownerPath, 'utf8')).pid, owner.pid, 'owner.json 仍应指向原持锁者');

    assert.equal(await holder.done, 0, '持锁者应正常退出');
    const runs = readRuns(lockDir);
    assert.equal(runs.length, 1, `只有持锁者产生 RUN：${JSON.stringify(runs)}`);
    assert.equal(runs[0].ticket, '88-live');
    assert.equal(runs[0].exit, '0');
    assert.equal(fs.existsSync(ownerPath), false, '持锁者释放后不得残留 owner.json');
    assert.equal(fs.existsSync(path.join(lockDir, 'gate.lock')), false, '持锁者释放后不得残留锁目录');
  });

  it('②d R-2-1：释放前归属校验——锁被他人接管时**不得**删除他人的 owner.json／锁目录', async () => {
    const lockDir = makeTmpLockDir('ownercheck');
    const lockPath = path.join(lockDir, 'gate.lock');
    const ownerPath = path.join(lockDir, 'owner.json');
    const holder = startHolder(lockDir, { ticket: '88-old', holdMs: 2500 });
    assert.ok(await waitFor(() => fs.existsSync(ownerPath)), '持锁者应写出 owner.json');

    // 模拟「锁已被他人接管」：换掉 owner.json／gate.lock 为**本测试进程**（活 pid）所有。
    fs.rmSync(ownerPath, { force: true });
    fs.rmSync(lockPath, { recursive: true, force: true });
    fs.mkdirSync(lockPath, { recursive: true });
    fs.writeFileSync(ownerPath, `${JSON.stringify({ pid: process.pid, ticket: '88-new', runId: 'new-run' })}\n`, 'utf8');

    assert.notEqual(await holder.done, 0, '归属校验失败时旧持锁者必须 exit≠0');
    assert.ok(fs.existsSync(ownerPath), '不得删除他人的 owner.json');
    assert.equal(JSON.parse(fs.readFileSync(ownerPath, 'utf8')).pid, process.pid);
    assert.ok(fs.existsSync(lockPath), '不得删除他人的锁目录');
  });

  it('②e R-3-3：死 pid 残留锁 → 先探活、立即抢回（不等 10 分钟）且 LOCK-STOLEN 落盘', () => {
    const lockDir = makeTmpLockDir('deadpid');
    const { ownerPath, deadPid } = makeDeadOwnerLock(lockDir);
    const r = runLocked(['--ticket', '88-reclaim', '--lock-dir', lockDir, '--stale-minutes', '10',
      '--poll-ms', '100', '--max-wait-ms', '4000', '--', 'node', '-e', '0']);
    assert.equal(r.status, 0, `死 pid 残留锁应被立即抢回：stderr=${r.stderr}`);
    const stolen = readStolen(lockDir);
    assert.equal(stolen.length, 1, `抢回必须落盘：${JSON.stringify(stolen)}`);
    assert.equal(stolen[0].reason, 'owner-dead');
    assert.equal(stolen[0].ownerPid, String(deadPid));
    assert.equal(stolen[0].ownerAlive, '0');
    assert.equal(readRuns(lockDir).length, 1);
    assert.equal(fs.existsSync(ownerPath), false, '抢回后不得残留死 owner.json');
    assert.equal(probePidAlive(process.pid).alive, true, '探活对活 pid 应为 true');
  });

  it('③ 缺票号时记 unknown 并告警；缺命令时 exit 2', () => {
    const lockDir = makeTmpLockDir('args');
    const noTicket = runLocked(['--lock-dir', lockDir, '--', 'node', '-e', '0']);
    assert.equal(noTicket.status, 0);
    assert.match(noTicket.stderr, /WARN: 未给 --ticket/);
    assert.equal(readRuns(lockDir)[0].ticket, 'unknown');

    const noCmd = runLocked(['--ticket', '88-test', '--lock-dir', lockDir, '--']);
    assert.equal(noCmd.status, 2, '未给命令应 exit 2');
    assert.match(noCmd.stderr, /未给出要执行的命令/);
  });

  it('④ R-2-3：审计日志／owner.json 写入失败必须 exit≠0，且不执行命令', () => {
    // ④a gate-runs.log 被目录占位 → appendFileSync 抛错
    const lockDirA = makeTmpLockDir('logfail');
    fs.mkdirSync(path.join(lockDirA, 'gate-runs.log'), { recursive: true });
    const markerA = path.join(lockDirA, 'child-ran.txt');
    const a = runLocked(['--ticket', '88-test', '--lock-dir', lockDirA, '--',
      'node', '-e', `require('fs').writeFileSync(${JSON.stringify(markerA)},'ran')`]);
    assert.notEqual(a.status, 0, `写日志失败必须 exit≠0（R-2-3）；stdout=${a.stdout}`);
    assert.match(a.stderr, /审计日志写入失败/, `应明确报错：${a.stderr}`);
    assert.equal(fs.existsSync(markerA), false, '写日志失败时不得执行命令（避免无痕运行）');

    // ④b owner.json 被目录占位 → writeFileSync 抛错
    const lockDirB = makeTmpLockDir('ownerfail');
    fs.mkdirSync(path.join(lockDirB, 'owner.json'), { recursive: true });
    const markerB = path.join(lockDirB, 'child-ran.txt');
    const b = runLocked(['--ticket', '88-test', '--lock-dir', lockDirB, '--',
      'node', '-e', `require('fs').writeFileSync(${JSON.stringify(markerB)},'ran')`]);
    assert.notEqual(b.status, 0, `owner.json 写失败必须 exit≠0（R-2-3）；stdout=${b.stdout}`);
    assert.match(b.stderr, /owner.json 写入失败/);
    assert.equal(fs.existsSync(markerB), false, 'owner.json 写失败时不得执行命令');
    assert.equal(fs.existsSync(path.join(lockDirB, 'gate.lock')), false, '刚创建的锁应被释放');
  });

  it('⑤ R-3-1：START 行必须在命令开始前就已落盘（崩溃／被杀也留痕）', () => {
    const lockDir = makeTmpLockDir('start');
    const logPath = path.join(lockDir, 'gate-runs.log');
    const marker = path.join(lockDir, 'child-ran.txt');
    // 子命令自己读审计日志：若此刻没有 START 行就以 exit 9 失败。
    const script = "const fs=require('fs');const t=fs.readFileSync(process.argv[1],'utf8');"
      + "if(!/^START /m.test(t))process.exit(9);fs.writeFileSync(process.argv[2],'ran')";
    const r = runLocked(['--ticket', '88-start', '--lock-dir', lockDir, '--', 'node', '-e', script, logPath, marker]);
    assert.equal(r.status, 0, `命令执行前应已有 START 行：stderr=${r.stderr}`);
    assert.equal(fs.existsSync(marker), true, '命令应真的执行了');
    const starts = readStarts(lockDir);
    assert.equal(starts.length, 1, `应有 1 条 START：${JSON.stringify(starts)}`);
    assert.equal(starts[0].ticket, '88-start');
    assert.match(starts[0].runId, /^[0-9a-f-]{36}$/);
  });

  it('⑨ #88 A.5：--child-timeout-ms 到点杀子进程树 ＋ RUN 记 timeout=1 ＋ exit 124 ＋ 放锁', () => {
    const lockDir = makeTmpLockDir('child-timeout');
    const marker = path.join(lockDir, 'child-done.txt');
    // 子命令永不自行退出，且**故意留下一个孙进程**（shell:true 下 pid 是 cmd.exe，只杀它不够）。
    const script = "const{spawn}=require('child_process');"
      + "spawn(process.execPath,['-e','setTimeout(()=>{},60000)'],{stdio:'ignore'});"
      + `require('fs').writeFileSync(${JSON.stringify(marker)},'started');`
      + 'setTimeout(()=>{},60000)';
    const r = runLocked(['--ticket', '88-timeout', '--lock-dir', lockDir,
      '--child-timeout-ms', '1500', '--child-kill-grace-ms', '15000', '--', 'node', '-e', script],
    { timeout: 90000 });
    assert.equal(fs.existsSync(marker), true, `前置：子命令必须真的跑起来（stderr=${r.stderr}）`);
    assert.equal(r.status, 124, `超时必须 exit 124（≠0），实测 ${r.status}；stderr=${r.stderr}`);
    assert.match(r.stderr, /TIMEOUT: 子进程超时/, `应打印超时诊断：${r.stderr}`);
    const runs = readRuns(lockDir);
    assert.equal(runs.length, 1, `应有且仅有 1 条 RUN：${JSON.stringify(runs)}`);
    assert.equal(runs[0].timeout, '1', `RUN 必须记 timeout=1：${JSON.stringify(runs[0])}`);
    assert.equal(runs[0].exit, '124', `RUN 的 exit 必须记 124：${JSON.stringify(runs[0])}`);
    assert.equal(fs.existsSync(path.join(lockDir, 'gate.lock')), false, '超时后必须放锁（否则堵死其他 session）');
    assert.equal(fs.existsSync(path.join(lockDir, 'owner.json')), false, '超时后 owner.json 必须清理');
  });

  it('⑨b 未超时的运行不得记 timeout 字段（防「总是 timeout=1」的假绿）', () => {
    const lockDir = makeTmpLockDir('no-timeout');
    const r = runLocked(['--ticket', '88-no-timeout', '--lock-dir', lockDir,
      '--child-timeout-ms', '30000', '--', 'node', '-e', '0']);
    assert.equal(r.status, 0, `正常运行应 exit 0：stderr=${r.stderr}`);
    const runs = readRuns(lockDir);
    assert.equal(runs.length, 1);
    assert.equal(runs[0].timeout, undefined, `正常运行不得出现 timeout 字段：${JSON.stringify(runs[0])}`);
    assert.equal(runs[0].exit, '0');
  });
});
