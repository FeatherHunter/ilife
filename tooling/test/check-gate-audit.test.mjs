import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  parseClaims, parseAuditLog, parseRelaxations, reconcile, auditMismatches, cmdMatches, normalizeCmd, inWindow,
} from '../check-gate-audit.mjs';

/**
 * tooling/check-gate-audit.mjs 的行为测试（协议 §2.4 证据对账，严格默认口径）。
 * 本文件自身**必须**经持锁包装器跑（自我示范）：
 *   node tooling/run-locked.mjs --ticket 88 -- node --test tooling/test/check-gate-audit.test.mjs
 *
 * 覆盖：缺失 exit≠0／一条记录不得顶两次声称／默认 require-claims／**反向对账**／
 * **runId 一对一绑定**／**exit=0 才认领**／放宽必须写进证据（GATE-RELAX）／`--export`。
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CHECK = path.join(repoRoot, 'tooling', 'check-gate-audit.mjs');

/**
 * 解析真实 node 可执行文件：在 pnpm（Electron 宿主）里 `process.execPath` 是**应用二进制**
 * （实测 `D:\0Tools\DSH Desktop\DSH Desktop.exe`），拿它 spawn 会**静默 exit 0** →
 * `pnpm gate:selftest` 下全数假红（R-3-5 实证）。
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

const q = (s) => (/[\s"]/.test(s) ? JSON.stringify(s) : s);
const runLine = (cmd, { runId = 'r1', exit = '0', ticket = '88', at = '2026-09-09T12:00:00.000Z' } = {}) =>
  `RUN ticket=${ticket}${runId ? ` runId=${runId}` : ''} cmd=${q(cmd)} waitedMs=0 exit=${exit} at=${at}`;
const claimLine = (cmd, { runId = 'r1', ticket = '' } = {}) =>
  `GATE-RUN ${runId ? `runId=${runId} ` : ''}${ticket ? `ticket=${ticket} ` : ''}cmd=${q(cmd)}`;
const relaxLine = (flag, reason = '测试用一次性放宽') => `GATE-RELAX flag=${flag} reason=${reason}`;

function writeCase(tag, { evidence, log }) {
  const dir = makeTmpDir(tag);
  const evidencePath = path.join(dir, 'evidence.md');
  const logPath = path.join(dir, 'gate-runs.log');
  fs.writeFileSync(evidencePath, Array.isArray(evidence) ? `${evidence.join('\n')}\n` : evidence, 'utf8');
  if (log !== undefined && log !== null) {
    fs.writeFileSync(logPath, Array.isArray(log) ? `${log.join('\n')}\n` : log, 'utf8');
  }
  return { dir, evidencePath, logPath };
}

function runAudit(evidencePath, logPath, extra = []) {
  return spawnSync(NODE_BIN, [CHECK, '--evidence', evidencePath, '--log', logPath, ...extra],
    { cwd: repoRoot, encoding: 'utf8' });
}

describe('check-gate-audit：证据声称 vs 审计日志（严格默认）', () => {
  it('③ 审计缺失时 exit≠0 并列出缺失项；补齐后 exit 0', () => {
    const c = writeCase('missing', {
      evidence: ['# 证据', '门禁实测：', `- ${claimLine('pnpm build', { runId: 'r-build' })}`,
        `- ${claimLine('pnpm boundaries', { runId: 'r-bnd' })}`,
        '（下面这行不是声明，不该被算进来：`pnpm test`）'],
      log: [runLine('pnpm build', { runId: 'r-build' })],
    });

    const bad = runAudit(c.evidencePath, c.logPath, ['--ticket', '88']);
    assert.notEqual(bad.status, 0, `缺失时应 exit≠0，实际 ${bad.status}`);
    assert.match(bad.stderr, /pnpm boundaries/, '应列出缺失命令');
    assert.match(bad.stdout, /gate-audit: FAIL/);

    fs.appendFileSync(c.logPath, `${runLine('pnpm boundaries', { runId: 'r-bnd' })}\n`, 'utf8');
    const good = runAudit(c.evidencePath, c.logPath, ['--ticket', '88']);
    assert.equal(good.status, 0, `补齐后应 exit 0；stderr=${good.stderr}`);
    assert.match(good.stdout, /gate-audit: PASS/);
    assert.match(good.stdout, /RESULT: matched=2\/2/);
  });

  it('③b 同一命令声称两次但审计只有一条 → 判缺失（一条记录不得顶两次声称）', () => {
    const c = writeCase('multi', {
      evidence: [claimLine('pnpm test', { runId: 'r1' }), claimLine('pnpm test', { runId: 'r1' })],
      log: [runLine('pnpm test', { runId: 'r1' })],
    });
    const r = runAudit(c.evidencePath, c.logPath, ['--ticket', '88']);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /缺失/);
  });

  it('③c 默认 require-claims：零声明即 FAIL；放宽须写 GATE-RELAX 才放行', () => {
    const c = writeCase('noclaim', { evidence: ['# 只有散文，没有 GATE-RUN 声明'], log: [] });
    assert.notEqual(runAudit(c.evidencePath, c.logPath).status, 0, '默认口径：无声明即 FAIL');
    const noTrace = runAudit(c.evidencePath, c.logPath, ['--allow-no-claims']);
    assert.notEqual(noTrace.status, 0, '放宽未写进证据 → FAIL');
    assert.match(noTrace.stderr, /放宽未写进证据/);
    fs.appendFileSync(c.evidencePath, `${relaxLine('--allow-no-claims')}\n`, 'utf8');
    const relaxed = runAudit(c.evidencePath, c.logPath, ['--allow-no-claims']);
    assert.equal(relaxed.status, 0, `留痕后应放行：stderr=${relaxed.stderr}`);
  });

  it('③d 反向对账：窗口内无人声明的 RUN → FAIL；--allow-undeclared 须留痕；--since 可界定窗口', () => {
    const evidence = [claimLine('pnpm build', { runId: 'r-build' })];
    const c = writeCase('undeclared', {
      evidence,
      log: [runLine('pnpm build', { runId: 'r-build' }), runLine('pnpm test', { runId: 'r-ghost' })],
    });
    const bad = runAudit(c.evidencePath, c.logPath, ['--ticket', '88']);
    assert.notEqual(bad.status, 0, '存在无人声明的条目应 FAIL');
    assert.match(bad.stderr, /反向对账/);
    assert.match(bad.stdout, /r-ghost/, '应列出未声明条目');

    const noTrace = runAudit(c.evidencePath, c.logPath, ['--ticket', '88', '--allow-undeclared']);
    assert.notEqual(noTrace.status, 0, '放宽未写进证据 → FAIL');

    fs.appendFileSync(c.evidencePath, `${relaxLine('--allow-undeclared')}\n`, 'utf8');
    const relaxed = runAudit(c.evidencePath, c.logPath, ['--ticket', '88', '--allow-undeclared']);
    assert.equal(relaxed.status, 0, `留痕后应放行：stderr=${relaxed.stderr}`);

    // --since 界定窗口：未声明条目在窗口之前 → 不需要放宽
    const c2 = writeCase('since', {
      evidence,
      log: [runLine('pnpm test', { runId: 'r-ghost', at: '2026-09-09T11:00:00.000Z' }),
        runLine('pnpm build', { runId: 'r-build', at: '2026-09-09T13:00:00.000Z' })],
    });
    const windowed = runAudit(c2.evidencePath, c2.logPath, ['--ticket', '88', '--since', '2026-09-09T12:00:00Z']);
    assert.equal(windowed.status, 0, `窗口外的条目不应计入反向对账：stderr=${windowed.stderr}`);

    // --until 界定窗口上界（提交后的 git 条目不该被算进本票对账窗口）
    const c3 = writeCase('until', {
      evidence,
      log: [runLine('pnpm build', { runId: 'r-build', at: '2026-09-09T10:00:00.000Z' }),
        runLine('pnpm test', { runId: 'r-ghost', at: '2026-09-09T13:00:00.000Z' })],
    });
    const upper = runAudit(c3.evidencePath, c3.logPath, ['--ticket', '88', '--until', '2026-09-09T12:00:00Z']);
    assert.equal(upper.status, 0, `窗口上界之外的条目不应计入反向对账：stderr=${upper.stderr}`);
  });

  it('③e runId 一对一绑定：同 cmd 历史条目不得顶替新声明', () => {
    const c = writeCase('runid', {
      evidence: [claimLine('pnpm build', { runId: 'r-new' })],
      log: [runLine('pnpm build', { runId: 'r-old' })],
    });
    const bad = runAudit(c.evidencePath, c.logPath, ['--ticket', '88']);
    assert.notEqual(bad.status, 0, 'runId 不同（同 cmd）应判缺失');
    assert.match(bad.stderr, /runId=r-new 未命中/);

    // 无 runId 的声明：默认直接判不成立
    const c2 = writeCase('norunid', {
      evidence: [claimLine('pnpm build', { runId: '' })],
      log: [runLine('pnpm build', { runId: '' })],
    });
    const noRunId = runAudit(c2.evidencePath, c2.logPath, ['--ticket', '88']);
    assert.notEqual(noRunId.status, 0, '默认要求声明引 runId');
    assert.match(noRunId.stderr, /no-runId/);

    // 放宽后：无 runId 的声明只认无 runId 的历史条目
    fs.appendFileSync(c2.evidencePath, `${relaxLine('--allow-no-runid')}\n`, 'utf8');
    const legacy = runAudit(c2.evidencePath, c2.logPath, ['--ticket', '88', '--allow-no-runid']);
    assert.equal(legacy.status, 0, `历史条目应可被认领：stderr=${legacy.stderr}`);

    const c3 = writeCase('norunid-vs-runid', {
      evidence: [claimLine('pnpm build', { runId: '' }), relaxLine('--allow-no-runid')],
      log: [runLine('pnpm build', { runId: 'r-has-id' })],
    });
    const crossed = runAudit(c3.evidencePath, c3.logPath, ['--ticket', '88', '--allow-no-runid']);
    assert.notEqual(crossed.status, 0, '无 runId 的声明不得认领带 runId 的条目');
  });

  it('③f 对账看 exit：默认只认领 exit=0 的条目（--allow-nonzero 须留痕）', () => {
    const c = writeCase('nonzero', {
      evidence: [claimLine('pnpm test', { runId: 'r-fail' })],
      log: [runLine('pnpm test', { runId: 'r-fail', exit: '1' })],
    });
    const bad = runAudit(c.evidencePath, c.logPath, ['--ticket', '88']);
    assert.notEqual(bad.status, 0, 'exit=1 的条目默认不得被认领（蓝队 G-2／红队 D-7）');

    const noTrace = runAudit(c.evidencePath, c.logPath, ['--ticket', '88', '--allow-nonzero']);
    assert.notEqual(noTrace.status, 0, '放宽未写进证据 → FAIL');

    fs.appendFileSync(c.evidencePath, `${relaxLine('--allow-nonzero')}\n`, 'utf8');
    const relaxed = runAudit(c.evidencePath, c.logPath, ['--ticket', '88', '--allow-nonzero']);
    assert.equal(relaxed.status, 0, `留痕后应放行：stderr=${relaxed.stderr}`);
  });

  it('③g --export 把窗口内 RUN 条目导出为受跟踪对账源，且导出文件可作 --log 复核', () => {
    const c = writeCase('export', {
      evidence: [claimLine('pnpm build', { runId: 'r-build' })],
      log: [runLine('pnpm build', { runId: 'r-build' })],
    });
    const exportPath = path.join(c.dir, 't88-gate-runs.log');
    const r = runAudit(c.evidencePath, c.logPath, ['--ticket', '88', '--export', exportPath]);
    assert.equal(r.status, 0, `导出应成功：stderr=${r.stderr}`);
    assert.match(r.stdout, /EXPORT:/);
    const exported = fs.readFileSync(exportPath, 'utf8');
    assert.match(exported, /^RUN ticket=88 runId=r-build/m, '导出文件应含原始 RUN 行');

    // 第三方只需受跟踪的导出文件即可复核（对账源不再只在 gitignored 日志里）
    const recheck = runAudit(c.evidencePath, exportPath, ['--ticket', '88']);
    assert.equal(recheck.status, 0, `导出文件应可直接复核：stderr=${recheck.stderr}`);
  });

  it('匹配口径：引号值／run-locked 包装／node --test basename／票号过滤／START 不计入', () => {
    assert.ok(cmdMatches('pnpm snapshot:check', 'pnpm snapshot:check'));
    assert.ok(cmdMatches('pnpm test', 'pnpm test test/x.test.mjs'), '前缀（token 边界）应命中');
    assert.ok(cmdMatches('node tooling/run-locked.mjs --ticket 88 -- pnpm build', 'pnpm build'), '包装形态应剥掉后比对');
    assert.ok(cmdMatches('node --test tooling/test/run-locked.test.mjs', 'node --test D:/ilife/tooling/test/run-locked.test.mjs'),
      'node --test 按文件名集合比对');
    assert.ok(!cmdMatches('node --test a.test.mjs', 'node --test b.test.mjs'), '文件名不同即不命中');
    assert.ok(!cmdMatches('pnpm test', 'pnpm build'), '不同命令不命中');
    assert.equal(normalizeCmd('`pnpm build`'), 'pnpm build');

    const claims = parseClaims([
      '- GATE-RUN runId=r1 cmd=pnpm build',
      'GATE-RUN ticket=88 runId=r2 cmd="pnpm test test/x.test.mjs"',
      'GATE-RUN ticket=88 runId=r3 cmd=pnpm boundaries waitedMs=0', // cmd= 之后到行尾都是命令（含空格）
      '普通段落里的 `pnpm build` 不算声明',
    ].join('\n'));
    assert.equal(claims.length, 3, JSON.stringify(claims));
    assert.deepEqual(claims.map((c) => c.cmd), ['pnpm build', 'pnpm test test/x.test.mjs', 'pnpm boundaries waitedMs=0']);
    assert.deepEqual(claims.map((c) => c.runId), ['r1', 'r2', 'r3']);
    assert.equal(claims[1].ticket, '88');
    assert.equal(claims[0].ticket, undefined);
    assert.equal(claims[0].line, 1);

    const entries = parseAuditLog([
      runLine('pnpm build', { runId: 'r1' }),
      runLine('pnpm build', { runId: 'r1', ticket: '99' }),
      'START ticket=88 runId=r1 cmd="pnpm build" waitedMs=0 at=2026-09-09T12:00:00.000Z',
      'LOCK-STOLEN ticket=88 runId=r9 reason=age at=2026-09-09T12:00:00.000Z',
      runLine('pnpm-test', { runId: 'r4' }),
    ].join('\n'));
    assert.equal(entries.length, 3, 'START／LOCK-STOLEN 行不计入审计条目');

    const missingTicket = auditMismatches([{ line: 1, cmd: 'pnpm build', runId: 'r1' }], entries, '88');
    assert.equal(missingTicket.length, 0, 'ticket=88 的条目应命中');
    const wrongTicket = auditMismatches([{ line: 1, cmd: 'pnpm build', ticket: '77', runId: 'r1' }], entries, '');
    assert.equal(wrongTicket.length, 1, '票号不符应判缺失');

    // 反向对账／重复 runId／窗口
    const dup = reconcile([], parseAuditLog([
      runLine('pnpm build', { runId: 'dup' }), runLine('pnpm build', { runId: 'dup' }),
    ].join('\n')), { ticket: '88' });
    assert.equal(dup.duplicateRunIds.length, 1, '重复 runId 应被标记（日志可疑）');
    assert.equal(inWindow({ ticket: '88', at: '2026-09-09T12:00:00.000Z' }, { ticket: '88', sinceMs: Date.parse('2026-09-09T11:00:00Z') }), true);
    assert.equal(inWindow({ ticket: '88', at: '2026-09-09T10:00:00.000Z' }, { ticket: '88', sinceMs: Date.parse('2026-09-09T11:00:00Z') }), false);
    assert.equal(inWindow({ ticket: '88', at: '2026-09-09T12:00:00.000Z' }, { ticket: '88', untilMs: Date.parse('2026-09-09T13:00:00Z') }), true);
    assert.equal(inWindow({ ticket: '88', at: '2026-09-09T12:00:00.000Z' }, { ticket: '88', untilMs: Date.parse('2026-09-09T11:00:00Z') }), false);
    assert.equal(inWindow({ ticket: '99' }, { ticket: '88' }), false);

    // GATE-RELAX 解析
    const relax = parseRelaxations(['GATE-RELAX flag=--allow-undeclared reason=只读探针', '- GATE-RELAX --allow-nonzero'].join('\n'));
    assert.equal(relax.has('--allow-undeclared'), true);
    assert.equal(relax.has('--allow-nonzero'), true);
    assert.equal(relax.has('--allow-no-claims'), false);
  });
});
