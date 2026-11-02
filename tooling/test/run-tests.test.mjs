/**
 * tooling/test/run-tests.test.mjs —— #1313：确定性测试驱动的自证。
 *
 * 覆盖：
 *   ① 通过／失败逐件判定，机器行与 JSON 汇总一致，失败件留日志尾；
 *   ② 超时件：墙钟到点杀进程树（孙进程不得存活），记 timeout；
 *   ③ 并发池 --jobs 2：两件都跑、汇总正确；
 *   ④ 纯函数：parseTapSummary 只认顶层汇总、classifyOutcome 逐格判定；
 *   ⑤ 用法错误：未知取值／找不到文件都 exit 2，不静默跑空套件。
 */
import { strict as assert } from 'node:assert';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { classifyOutcome, parseTapSummary } from '../run-tests.mjs';
import * as runTestsModule from '../run-tests.mjs';
import { isAlive } from './helpers/temp-git-repo.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const RUNNER = join(ROOT, 'tooling', 'run-tests.mjs');
const NODE = process.execPath;

const PASS_FILE = "import { test } from 'node:test';\ntest('ok', () => {});\n";
const FAIL_FILE = "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\ntest('no', () => { assert.equal(1, 2); });\n";
const HANG_FILE = [
  "import { spawn } from 'node:child_process';",
  "import fs from 'node:fs';",
  "import { test } from 'node:test';",
  "test('hang', async () => {",
  "  const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 120000)'], { stdio: 'ignore' });",
  "  fs.writeFileSync('grandchild.pid', String(child.pid));",
  "  await new Promise(() => {});",
  "});",
  '',
].join('\n');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function fixture(files) {
  const dir = mkdtempSync(join(tmpdir(), 't1313-run-'));
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body, 'utf8');
  return dir;
}

function run(fixtureDir, args) {
  return spawnSync(NODE, [RUNNER, '--root', fixtureDir, ...args], { cwd: fixtureDir, encoding: 'utf8', windowsHide: true });
}

test('逐件判定：pass/fail 分开报，JSON 汇总与机器行一致，失败件有日志尾', () => {
  const dir = fixture({ 'pass.test.mjs': PASS_FILE, 'fail.test.mjs': FAIL_FILE });
  try {
    const logs = join(dir, 'logs');
    const json = join(dir, 'summary.json');
    const r = run(dir, ['--log-dir', logs, '--json', json, '--timeout-ms', '30000', '--grace-ms', '3000', 'fail.test.mjs', 'pass.test.mjs']);
    assert.equal(r.status, 1, r.stderr);
    assert.match(r.stdout, /RESULT: FAIL files=2 pass=1 fail=1 timeout=0 hung=0 error=0/);
    assert.match(r.stdout, /# TAIL file=fail\.test\.mjs/);
    const summary = JSON.parse(readFileSync(json, 'utf8'));
    assert.equal(summary.verdict, 'FAIL');
    assert.equal(summary.totals.files, 2);
    const failed = summary.files.find((item) => item.path === 'fail.test.mjs');
    const passed = summary.files.find((item) => item.path === 'pass.test.mjs');
    assert.equal(failed.status, 'fail');
    assert.equal(passed.status, 'pass');
    assert.ok(existsSync(join(dir, passed.log)), '每件都要留日志：' + passed.log);
    assert.ok(readFileSync(join(dir, passed.log), 'utf8').includes('# duration_ms'), '日志里要有 TAP 汇总行');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('超时：墙钟到点杀进程树，孙进程不得存活，记 timeout', async () => {
  const dir = fixture({ 'hang.test.mjs': HANG_FILE });
  try {
    const r = run(dir, ['--log-dir', join(dir, 'logs'), '--timeout-ms', '3000', '--grace-ms', '1000', 'hang.test.mjs']);
    assert.equal(r.status, 1, r.stderr);
    assert.match(r.stdout, /status=timeout/);
    assert.match(r.stdout, /RESULT: FAIL files=1 pass=0 fail=0 timeout=1/);
    const pid = Number(readFileSync(join(dir, 'grandchild.pid'), 'utf8'));
    assert.ok(pid > 0, '夹具必须真的起过孙进程');
    let alive = isAlive(pid);
    for (let i = 0; i < 50 && alive; i += 1) {
      await sleep(100);
      alive = isAlive(pid);
    }
    assert.equal(alive, false, '超时后孙进程仍存活：进程树没杀干净（pid=' + pid + '）');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('并发池：--jobs 2 两件都跑、汇总正确', () => {
  const dir = fixture({ 'a.test.mjs': PASS_FILE, 'b.test.mjs': PASS_FILE });
  try {
    const r = run(dir, ['--jobs', '2', '--log-dir', join(dir, 'logs'), '--timeout-ms', '30000', '--grace-ms', '3000', 'a.test.mjs', 'b.test.mjs']);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /RESULT: PASS files=2 pass=2 fail=0/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('parseTapSummary 只认顶层汇总，classifyOutcome 逐格判定', () => {
  const summary = parseTapSummary([
    '# Subtest: demo.test.mjs',
    '    # tests 9',
    '    # fail 3',
    'ok 1 - demo.test.mjs',
    '1..1',
    '# tests 1',
    '# pass 1',
    '# fail 0',
    '# duration_ms 12.5',
  ]);
  assert.deepEqual([summary.tests, summary.pass, summary.fail, summary.durationMs, summary.complete], [1, 1, 0, 12.5, true]);
  assert.equal(classifyOutcome({ exitCode: 0, summary: { complete: true, fail: 0 } }), 'pass');
  assert.equal(classifyOutcome({ exitCode: 1, summary: { complete: true, fail: 1 } }), 'fail');
  assert.equal(classifyOutcome({ timedOut: true }), 'timeout');
  assert.equal(classifyOutcome({ exitCode: 0, summary: { complete: true, fail: 0 }, killedAfterCompletion: true }), 'hung',
    'TAP 已完成但进程被守卫杀掉，结局是 hung 而不是 pass');
  assert.equal(classifyOutcome({ summary: { complete: true, fail: 1 }, killedAfterCompletion: true }), 'fail');
  assert.equal(classifyOutcome({ exitCode: 0, summary: { complete: false, fail: 0 } }), 'fail');
  assert.equal(classifyOutcome({ spawnError: new Error('spawn 失败') }), 'error');
});

test('用法错误：坏取值与找不到文件都 exit 2，不静默跑空套件', () => {
  const dir = fixture({ 'pass.test.mjs': PASS_FILE });
  try {
    const badNumber = run(dir, ['--timeout-ms', 'abc', 'pass.test.mjs']);
    assert.equal(badNumber.status, 2);
    assert.match(badNumber.stderr, /FAIL: --timeout-ms/);
    const missing = run(dir, ['missing.test.mjs']);
    assert.equal(missing.status, 2);
    assert.match(missing.stderr, /FAIL: 找不到测试文件：missing\.test\.mjs/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const TAP_THEN_LINGER = "process.stdout.write(['# tests 1', '# pass 1', '# fail 0', '# duration_ms 5', ''].join('\\n')); setInterval(() => {}, 1000);";

function killPid(pid) {
  if (!pid) return;
  if (process.platform === 'win32') {
    try { spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* 已退出 */ }
    return;
  }
  try { process.kill(pid, 'SIGKILL'); } catch { /* 已退出 */ }
}

test('S2-1 完成后赖着不退 ⇒ hung：classifyOutcome/writeSummary 读数一致', async () => {
  const dir = fixture({ 'lingered.mjs': 'setInterval(() => {}, 1000);\n' });
  const logs = join(dir, 'logs');
  mkdirSync(logs, { recursive: true });
  let childPid = 0;
  try {
    const result = await runTestsModule.runOne('lingered.mjs', 0, 1, { root: dir, quiet: true, timeoutMs: 2000, graceMs: 150 }, logs, {
      spawnChild: () => {
        const child = spawn(NODE, ['-e', TAP_THEN_LINGER], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
        childPid = child.pid;
        return child;
      },
      killExitWaitMs: 500,
    });
    assert.equal(result.hung, true, 'TAP 完成后未退出必须记 hung');
    assert.equal(result.status, 'hung', '状态行要与 hung 计数一致');
    const logged = [];
    const originalLog = console.log;
    let summary = null;
    console.log = (...args) => logged.push(args.join(' '));
    try {
      summary = runTestsModule.writeSummary({ quiet: true }, [result]);
    } finally {
      console.log = originalLog;
    }
    assert.equal(summary.totals.hung, 1);
    assert.equal(summary.totals.pass, 0);
    assert.equal(summary.verdict, 'PASS', 'hung 件结果照常采信，不影响 PASS 判定');
    assert.match(logged.join('\n'), /RESULT: PASS files=1 pass=0 fail=0 timeout=0 hung=1 error=0/);
    let alive = childPid ? isAlive(childPid) : false;
    for (let i = 0; i < 50 && alive; i += 1) {
      await sleep(100);
      alive = isAlive(childPid);
    }
    assert.equal(alive, false, 'hung 件必须被守卫杀掉');
  } finally {
    killPid(childPid);
    rmSync(dir, { recursive: true, force: true });
  }
});

test('S2-3 超时后杀进程失败：有界返回 timeout，不无限挂', async () => {
  const dir = fixture({ 'hangforever.mjs': 'setInterval(() => {}, 1000);\n' });
  const logs = join(dir, 'logs');
  mkdirSync(logs, { recursive: true });
  let childPid = 0;
  try {
    const startedAt = Date.now();
    const raced = await Promise.race([
      runTestsModule.runOne('hangforever.mjs', 0, 1, { root: dir, quiet: true, timeoutMs: 300, graceMs: 1000 }, logs, {
        spawnChild: () => {
          const child = spawn(NODE, ['-e', 'setInterval(() => {}, 1000);'], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
          childPid = child.pid;
          return child;
        },
        killTree: () => {},
        killExitWaitMs: 250,
      }),
      sleep(4000).then(() => ({ status: 'NEVER_RESOLVED' })),
    ]);
    const elapsed = Date.now() - startedAt;
    assert.ok(childPid > 0, 'DI 必须生效（旧实现没有注入点，无法模拟杀失败）');
    assert.notEqual(raced.status, 'NEVER_RESOLVED', '超时后必须有兜底收尾，runOne 不得永不 resolve');
    assert.equal(raced.status, 'timeout');
    assert.ok(elapsed < 300 + 250 + 1500, '收尾必须在上界内完成：' + elapsed + 'ms');
  } finally {
    killPid(childPid);
    rmSync(dir, { recursive: true, force: true });
  }
});

test('S3-13 日志文件名不得撞名：a/b.test.mjs 与 a__b.test.mjs', () => {
  const one = runTestsModule.logFileName('a/b.test.mjs');
  const two = runTestsModule.logFileName('a__b.test.mjs');
  assert.notEqual(one, two, '不同路径的日志名必须不同：' + one);
  assert.match(one, /^a__b\.test\.mjs-[0-9a-f]{8}\.tap\.log$/);
  assert.match(two, /^a__b\.test\.mjs-[0-9a-f]{8}\.tap\.log$/);
});

