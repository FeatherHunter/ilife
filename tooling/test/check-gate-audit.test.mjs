import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseClaims, parseAuditLog, auditMismatches, cmdMatches, normalizeCmd } from '../check-gate-audit.mjs';

/**
 * tooling/check-gate-audit.mjs 的行为测试（协议 §2.4 证据对账）。
 * 本文件自身**必须**经持锁包装器跑（自我示范）：
 *   node tooling/run-locked.mjs --ticket 88 -- node --test tooling/test/check-gate-audit.test.mjs
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CHECK = path.join(repoRoot, 'tooling', 'check-gate-audit.mjs');

const tmpDirs = [];
function makeTmpDir(tag) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `ilife-audit-${tag}-`));
  tmpDirs.push(dir);
  return dir;
}
after(() => {
  for (const dir of tmpDirs) {
    if (!dir.startsWith(os.tmpdir())) throw new Error(`路径守卫：拒绝清理临时目录之外的路径 ${dir}`);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const run = (line) => `RUN ticket=88 cmd=${/[\s"]/.test(line) ? JSON.stringify(line) : line} waitedMs=0 exit=0 at=2026-09-09T12:00:00.000Z`;

function runAudit(evidencePath, logPath, extra = []) {
  return spawnSync(process.execPath, [CHECK, '--evidence', evidencePath, '--log', logPath, ...extra],
    { cwd: repoRoot, encoding: 'utf8' });
}

describe('check-gate-audit：证据声称 vs 审计日志', () => {
  it('③ 审计缺失时 exit≠0 并列出缺失项；补齐后 exit 0', () => {
    const dir = makeTmpDir('missing');
    const evidence = path.join(dir, 'evidence.md');
    const log = path.join(dir, 'gate-runs.log');
    fs.writeFileSync(evidence, [
      '# 证据',
      '门禁实测：',
      '- GATE-RUN cmd=pnpm build',
      '- GATE-RUN cmd=pnpm boundaries',
      '（下面这行不是声明，不该被算进来：`pnpm test`）',
      '',
    ].join('\n'), 'utf8');
    fs.writeFileSync(log, `${run('pnpm build')}\n`, 'utf8');

    const bad = runAudit(evidence, log, ['--ticket', '88']);
    assert.notEqual(bad.status, 0, `缺失时应 exit≠0，实际 ${bad.status}`);
    assert.match(bad.stderr, /pnpm boundaries/, '应列出缺失命令');
    assert.match(bad.stdout, /gate-audit: FAIL/);

    fs.appendFileSync(log, `${run('pnpm boundaries')}\n`, 'utf8');
    const good = runAudit(evidence, log, ['--ticket', '88']);
    assert.equal(good.status, 0, `补齐后应 exit 0；stderr=${good.stderr}`);
    assert.match(good.stdout, /gate-audit: PASS/);
    assert.match(good.stdout, /RESULT: matched=2\/2/);
  });

  it('③b 同一命令声称两次但审计只有一条 → 判缺失（一条记录不得顶两次声称）', () => {
    const dir = makeTmpDir('multi');
    const evidence = path.join(dir, 'evidence.md');
    const log = path.join(dir, 'gate-runs.log');
    fs.writeFileSync(evidence, 'GATE-RUN cmd=pnpm test\nGATE-RUN cmd=pnpm test\n', 'utf8');
    fs.writeFileSync(log, `${run('pnpm test')}\n`, 'utf8');
    const r = runAudit(evidence, log, ['--ticket', '88']);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /缺失/);
  });

  it('③c --require-claims：零声明也判 FAIL', () => {
    const dir = makeTmpDir('noclaim');
    const evidence = path.join(dir, 'evidence.md');
    const log = path.join(dir, 'gate-runs.log');
    fs.writeFileSync(evidence, '# 只有散文，没有 GATE-RUN 声明\n', 'utf8');
    fs.writeFileSync(log, `${run('pnpm build')}\n`, 'utf8');
    assert.equal(runAudit(evidence, log).status, 0, '默认口径：无声明即无事可对账');
    assert.notEqual(runAudit(evidence, log, ['--require-claims']).status, 0, '--require-claims 下应 FAIL');
  });

  it('匹配口径：引号值／run-locked 包装／node --test basename／票号过滤', () => {
    // 引号与空格
    assert.ok(cmdMatches('pnpm snapshot:check', 'pnpm snapshot:check'));
    assert.ok(cmdMatches('pnpm test', 'pnpm test test/x.test.mjs'), '前缀（token 边界）应命中');
    assert.ok(cmdMatches('node tooling/run-locked.mjs --ticket 88 -- pnpm build', 'pnpm build'), '包装形态应剥掉后比对');
    assert.ok(cmdMatches('node --test tooling/test/run-locked.test.mjs', 'node --test D:/ilife/tooling/test/run-locked.test.mjs'),
      'node --test 按文件名集合比对');
    assert.ok(!cmdMatches('node --test a.test.mjs', 'node --test b.test.mjs'), '文件名不同即不命中');
    assert.ok(!cmdMatches('pnpm test', 'pnpm build'), '不同命令不命中');
    assert.equal(normalizeCmd('`pnpm build`'), 'pnpm build');

    // 解析
    const claims = parseClaims([
      '- GATE-RUN cmd=pnpm build',
      'GATE-RUN ticket=88 cmd="pnpm test test/x.test.mjs"',
      'GATE-RUN ticket=88 cmd=pnpm boundaries waitedMs=0', // cmd= 之后到行尾都是命令（含空格）
      '普通段落里的 `pnpm build` 不算声明',
    ].join('\n'));
    assert.equal(claims.length, 3, JSON.stringify(claims));
    assert.deepEqual(claims.map((c) => c.cmd), ['pnpm build', 'pnpm test test/x.test.mjs', 'pnpm boundaries waitedMs=0']);
    assert.equal(claims[1].ticket, '88');
    assert.equal(claims[0].ticket, undefined);
    assert.equal(claims[0].line, 1);

    const entries = parseAuditLog([
      'RUN ticket=88 cmd="pnpm build" waitedMs=0 exit=0 at=2026-09-09T12:00:00.000Z',
      'RUN ticket=99 cmd="pnpm build" waitedMs=0 exit=0 at=2026-09-09T12:00:01.000Z',
      'START ticket=88 cmd="pnpm build" waitedMs=0 at=2026-09-09T12:00:00.000Z',
      'RUN ticket=88 cmd=pnpm-test waitedMs=0 exit=0 at=2026-09-09T12:00:02.000Z',
    ].join('\n'));
    assert.equal(entries.length, 3, 'START 行不计入审计条目');

    const missingTicket = auditMismatches([{ line: 1, cmd: 'pnpm build' }], entries, '88');
    assert.equal(missingTicket.length, 0, 'ticket=88 的条目应命中');
    const wrongTicket = auditMismatches([{ line: 1, cmd: 'pnpm build', ticket: '77' }], entries, '');
    assert.equal(wrongTicket.length, 1, '票号不符应判缺失');
  });
});
