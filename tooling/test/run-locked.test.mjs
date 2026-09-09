import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * tooling/run-locked.mjs 的行为测试（协议 §2／§2.3／§2.4）。
 * 本文件自身**必须**经持锁包装器跑（自我示范）：
 *   node tooling/run-locked.mjs --ticket 88 -- node --test tooling/test/run-locked.test.mjs
 * 测试内部一律用**独立 --lock-dir**（临时目录），避免与包装器自身的锁重入（死锁）。
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const RUN_LOCKED = path.join(repoRoot, 'tooling', 'run-locked.mjs');

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
  return spawnSync(process.execPath, [RUN_LOCKED, ...args], { cwd: repoRoot, encoding: 'utf8', ...opts });
}

function readRuns(lockDir) {
  const logPath = path.join(lockDir, 'gate-runs.log');
  if (!fs.existsSync(logPath)) return [];
  return fs.readFileSync(logPath, 'utf8').split(/\r?\n/).filter((l) => l.startsWith('RUN ')).map((line) => {
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

async function waitFor(predicate, timeoutMs = 8000, stepMs = 50) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (predicate()) return true;
    if (Date.now() > deadline) return false;
    await new Promise((r) => setTimeout(r, stepMs));
  }
}

describe('run-locked：持锁包装器', () => {
  it('① 正常获取／释放：exit 0、RUN 落盘（waitedMs=0／exit=0）、owner.json 与锁目录都被清掉', () => {
    const lockDir = makeTmpLockDir('normal');
    const r = runLocked(['--ticket', '88-test', '--lock-dir', lockDir, '--', 'node', '-e', '0']);
    assert.equal(r.status, 0, `包装器应透传 exit 0；stderr=${r.stderr}`);
    const runs = readRuns(lockDir);
    assert.equal(runs.length, 1, `应有且仅有 1 条 RUN 记录：${JSON.stringify(runs)}`);
    assert.equal(runs[0].ticket, '88-test');
    assert.equal(runs[0].cmd, 'node -e 0');
    assert.ok(Number(runs[0].waitedMs) <= 50, `无人持锁时 waitedMs 应≈0，实测 ${runs[0].waitedMs}`);
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
    const holder = spawn(process.execPath, [RUN_LOCKED, '--ticket', '88-holder', '--lock-dir', lockDir, '--poll-ms', '100',
      '--', 'node', '-e', 'setTimeout(()=>{},2000)'], { cwd: repoRoot, stdio: 'ignore' });
    const holderDone = new Promise((resolve) => holder.on('close', resolve));

    const ownerPath = path.join(lockDir, 'owner.json');
    assert.ok(await waitFor(() => fs.existsSync(ownerPath)), '持锁者应在 8s 内写出 owner.json');
    const owner = JSON.parse(fs.readFileSync(ownerPath, 'utf8'));
    assert.equal(owner.ticket, '88-holder');
    assert.equal(typeof owner.pid, 'number');
    assert.equal(typeof owner.startedAt, 'string');
    assert.ok(Number(owner.waitedMs) <= 50, `持锁者 waitedMs 应≈0，实测 ${owner.waitedMs}`);

    const waiter = runLocked(['--ticket', '88-waiter', '--lock-dir', lockDir, '--poll-ms', '100', '--', 'node', '-e', '0']);
    assert.equal(waiter.status, 0, `等待者应成功：stderr=${waiter.stderr}`);
    assert.equal(await holderDone, 0, '持锁者应正常退出');

    const runs = readRuns(lockDir);
    assert.equal(runs.length, 2, `应有 2 条 RUN 记录：${JSON.stringify(runs)}`);
    const byTicket = Object.fromEntries(runs.map((x) => [x.ticket, x]));
    assert.ok(byTicket['88-holder'] && byTicket['88-waiter'], '两条记录应分别对应持锁者与等待者');
    assert.equal(byTicket['88-holder'].exit, '0');
    assert.ok(Number(byTicket['88-holder'].waitedMs) <= 50, `持锁者 waitedMs 应≈0，实测 ${byTicket['88-holder'].waitedMs}`);
    assert.ok(Number(byTicket['88-waiter'].waitedMs) > 0,
      `等待者的 waitedMs 必须 >0 且落盘（实测 ${byTicket['88-waiter'].waitedMs}）`);
    assert.equal(byTicket['88-waiter'].exit, '0');
    assert.equal(fs.existsSync(ownerPath), false, '全部释放后不应残留 owner.json');
    assert.equal(fs.existsSync(path.join(lockDir, 'gate.lock')), false, '全部释放后不应残留锁目录');
  });

  it('②b 死锁抢回：锁龄 1 分钟 > --stale-minutes 0.5 → 抢回并留下 LOCK-STOLEN 痕迹', async () => {
    const lockDir = makeTmpLockDir('stale');
    const lockPath = path.join(lockDir, 'gate.lock');
    fs.mkdirSync(lockPath, { recursive: true });
    const old = new Date(Date.now() - 60_000);
    fs.utimesSync(lockPath, old, old); // 伪造成 1 分钟前创建的锁
    const r = runLocked(['--ticket', '88-test', '--lock-dir', lockDir, '--stale-minutes', '0.5', '--poll-ms', '100', '--', 'node', '-e', '0']);
    assert.equal(r.status, 0, `陈旧锁应被抢回：stderr=${r.stderr}`);
    assert.match(r.stderr, /LOCK-STOLEN/, '抢回应打印 LOCK-STOLEN 痕迹');
    assert.equal(fs.existsSync(lockPath), false);
    assert.equal(readRuns(lockDir).length, 1);
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
});
