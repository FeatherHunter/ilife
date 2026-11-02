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
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { classifyOutcome, parseTapSummary } from '../run-tests.mjs';
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
  assert.equal(classifyOutcome({ exitCode: 0, summary: { complete: true, fail: 0 }, killedAfterCompletion: true }), 'pass');
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
