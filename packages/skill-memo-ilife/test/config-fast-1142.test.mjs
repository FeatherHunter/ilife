// #1142 快慢分离：memo.config.read 禁外部探测与完整体检（TDD 预算测试）。
// 判据：PATH 首位放一个 hang 住的 lark-cli 挡板，read 仍须秒回、不带 lark 格、只做本地目录判定。
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, delimiter } from 'node:path';
import { setupConfigTestBase, requireConfigTestBase } from '../../../test/helpers/config-test-base.mjs';

const base = setupConfigTestBase();
let savedPath;
let stubDir;

before(() => {
  requireConfigTestBase(base);
  stubDir = mkdtempSync(join(tmpdir(), 'lark-hang-'));
  const mjs = join(stubDir, 'hang.mjs');
  writeFileSync(mjs, 'await new Promise(() => {});\n');
  if (process.platform === 'win32') {
    writeFileSync(join(stubDir, 'lark-cli.cmd'), '@node "' + mjs + '" %*\r\n');
  } else {
    writeFileSync(join(stubDir, 'lark-cli'), '#!/usr/bin/env node\nawait new Promise(() => {});\n');
    chmodSync(join(stubDir, 'lark-cli'), 0o755);
  }
  savedPath = process.env.PATH ?? '';
  process.env.PATH = stubDir + delimiter + savedPath;
});

after(() => {
  process.env.PATH = savedPath;
});

describe('#1142 read 快路径预算', () => {
  it('hang 住 lark-cli 时 read 仍秒回且不带 lark 格', async () => {
    const { runConfigKey } = await import('../dist/cli/config.js');
    const t0 = Date.now();
    const out = runConfigKey('memo.config.read', {});
    const elapsed = Date.now() - t0;
    const env = JSON.parse(out);
    assert.equal(env.key, 'memo.config.read');
    assert.ok(env.data && typeof env.data.path === 'string', '带本地文件落点');
    assert.ok(env.data.values && typeof env.data.values === 'object', '带取值');
    assert.ok(env.data.resolved && typeof env.data.resolved === 'object', '带 resolved');
    assert.equal('lark' in env.data, false, 'read 不再带 lark 格（只走 check）');
    assert.ok(elapsed < 5000, 'hang 住外部探测也须秒回，实耗 ' + elapsed + 'ms');
  });
});
