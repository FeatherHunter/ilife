import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { collectTestFiles, formatGateLine, parseTestCounts, readPackageScripts, tailLines } from '../gate.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TOOL = path.resolve(HERE, '..', 'gate.mjs');

describe('gate 参数与文件收集', () => {
  it('收集 scope 包测试文件：显式相对路径、按名排序、跳过非 .test.mjs', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-'));
    try {
      const testDir = path.join(root, 'packages', 'demo', 'test');
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(path.join(testDir, 'b.test.mjs'), '');
      fs.writeFileSync(path.join(testDir, 'a.test.mjs'), '');
      fs.writeFileSync(path.join(testDir, 'helper.mjs'), '');
      assert.deepEqual(collectTestFiles(root, 'packages/demo'), [
        'packages/demo/test/a.test.mjs',
        'packages/demo/test/b.test.mjs',
      ]);
      assert.deepEqual(collectTestFiles(root, 'packages/none'), []);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('读 package.json 的 scripts；没有 build:client 时返回的 scripts 里没有该键', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-'));
    try {
      fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ scripts: { test: 'x' } }));
      assert.deepEqual(readPackageScripts(root), { test: 'x' });
      assert.equal(readPackageScripts(path.join(root, 'nope')), null);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('gate 读数解析', () => {
  const NODE_SPEC = [
    '▶ 入口样式',
    '  ✔ 书那六条在场',
    'ℹ tests 407',
    'ℹ suites 102',
    'ℹ pass 407',
    'ℹ fail 0',
    'ℹ duration_ms 61234',
  ].join('\n');

  it('从 node --test 输出取 tests／pass／fail', () => {
    assert.deepEqual(parseTestCounts(NODE_SPEC), { tests: 407, pass: 407, fail: 0 });
  });

  it('取不到计数返回 null，不编数字', () => {
    assert.equal(parseTestCounts('all good'), null);
    assert.equal(parseTestCounts('FAIL: boom'), null);
  });

  it('汇总行：全过 exit=0；阶段红则 exit=1 且点名 failed_stage', () => {
    const ok = formatGateLine({
      scope: 'packages/plugin-manager',
      full: false,
      stages: [{ name: 'tsc', exit: 0 }, { name: 'tests', exit: 0 }],
      tests: { tests: 407, pass: 407, fail: 0 },
      durationMs: 1234,
      logFile: '.scratch/t1299/gate.log',
    });
    assert.equal(ok, 'GATE scope=packages/plugin-manager tsc=0 tests=407/407 exit=0 ms=1234 log=.scratch/t1299/gate.log');
    const bad = formatGateLine({
      scope: 'packages/plugin-manager',
      full: false,
      stages: [{ name: 'tsc', exit: 0 }, { name: 'tests', exit: 1 }],
      tests: { tests: 407, pass: 405, fail: 2 },
      durationMs: 9,
      logFile: 'x.log',
    });
    assert.match(bad, /exit=1/);
    assert.match(bad, /failed_stage=tests/);
  });

  it('--full 汇总行标 mode=full 且测试计数委托（不复制套件清单）', () => {
    const line = formatGateLine({ scope: '', full: true, stages: [{ name: 'tsc', exit: 0 }, { name: 'tests', exit: 0 }], tests: null, durationMs: 5, logFile: 'x.log' });
    assert.match(line, /GATE mode=full/);
    assert.match(line, /tests=delegated/);
  });

  it('日志尾巴只留最后 N 行', () => {
    assert.equal(tailLines('1\n2\n3\n4\n5\n6', 3), '4\n5\n6');
  });
});

describe('gate CLI', () => {
  it('--help exit 0；无参数 exit 2；--scope 与 --full 同给 exit 2', () => {
    const help = spawnSync(process.execPath, [TOOL, '--help'], { encoding: 'utf8' });
    assert.equal(help.status, 0);
    assert.match(help.stdout, /一条命令跑门禁/);
    const none = spawnSync(process.execPath, [TOOL], { encoding: 'utf8' });
    assert.equal(none.status, 2);
    const both = spawnSync(process.execPath, [TOOL, '--scope', 'packages/x', '--full'], { encoding: 'utf8' });
    assert.equal(both.status, 2);
  });
});
