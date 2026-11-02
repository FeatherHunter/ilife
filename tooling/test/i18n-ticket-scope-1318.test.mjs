/**
 * #1318 · check-i18n-ticket-scope.mjs 的夹具自证回归测试。
 *
 * 背景：旧 --selftest 拿「仓里还有一张待迁票」当变异基；28 张迁移票全部收口后 files 全空，
 * 自证自己在收口完成那一刻必红（exit 1「自证需要至少一张仍有待迁件的票」）。
 * 本测试锁两条性质：
 *   ① --selftest 在「全部票已收口（files 全空）」的清单形态下仍 exit 0；
 *   ② 夹具与真实票面进度解耦——合成清单本身零问题，且「零待迁票」形态也能被判据审计；
 *      五处变异（漏件／重叠／条数不符／不迁无理由／未迁记成已迁）仍然每处必红。
 *
 * 跑法：node --test tooling/test/i18n-ticket-scope-1318.test.mjs
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { audit, fixture } from '../check-i18n-ticket-scope.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SCRIPT = join(ROOT, 'tooling', 'check-i18n-ticket-scope.mjs');

test('--selftest 不依赖真实待迁票：零待迁票形态下仍绿', () => {
  const run = spawnSync(process.execPath, [SCRIPT, '--selftest'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(run.status, 0, '--selftest 必须 exit 0（stderr：' + (run.stderr || '').trim() + '）');
  assert.match(run.stdout, /六条自证 OK/);
});

test('夹具清单：收口形态（files 全空）可审计，五处变异仍逐条必红', () => {
  const clean = audit(fixture(), ROOT);
  assert.deepEqual(clean.problems, [], '合成夹具本身必须零问题');
  assert.equal(clean.pendingFiles, 2, '合成夹具应有 2 件待迁');

  // 收口形态：把两件待迁按结论搬走（一件迁入并登记 scope、一件不迁并写理由）→ files 全空。
  const closed = fixture();
  closed.scope.files = [closed.paths.migrated, closed.paths.pendingA];
  closed.scopeJson.tickets['9101'].files = [];
  closed.scopeJson.tickets['9101'].migrated = [{ path: closed.paths.pendingA, literals: 10 }];
  closed.scopeJson.tickets['9102'].files = [];
  closed.scopeJson.tickets['9102'].excluded.push({ path: closed.paths.pendingB, literals: 7, reason: '夹具：收口后不迁' });
  Object.assign(closed.scopeJson.scopeSummary, { migratedFiles: 2, pendingFiles: 0, pendingLiterals: 0, excludedFiles: 2, excludedLiterals: 12 });
  const done = audit(closed, ROOT);
  assert.deepEqual(done.problems, [], '收口形态（零待迁票）必须仍零问题');
  assert.equal(done.pendingFiles, 0);

  // ① 漏件
  const dropped = fixture();
  dropped.scopeJson.tickets['9101'].files = [];
  dropped.scopeJson.tickets['9101'].totals = { files: 0, literals: 0, copy: 0 };
  assert.ok(audit(dropped, ROOT).problems.some((p) => p.includes('没归到任何票的三处之一')), '漏件必红');

  // ② 票间重叠
  const dup = fixture();
  dup.scopeJson.tickets['9102'].files[0] = { path: dup.paths.pendingA, literals: 10 };
  assert.ok(audit(dup, ROOT).problems.some((p) => p.includes('重复分配')), '重叠必红');

  // ③ 条数不符
  const lie = fixture();
  lie.scopeJson.tickets['9101'].files.push({ path: lie.paths.pendingA, literals: 11 });
  assert.ok(audit(lie, ROOT).problems.some((p) => p.includes('条数与 ledger 不符')), '条数不符必红');

  // ④ 不迁无理由
  const mute = fixture();
  const moved = mute.scopeJson.tickets['9101'].files.shift();
  mute.scopeJson.tickets['9101'].excluded.push({ path: moved.path, literals: moved.literals });
  assert.ok(audit(mute, ROOT).problems.some((p) => p.includes('没写理由')), '不迁无理由必红');

  // ⑤ 未迁记成已迁
  const fake = fixture();
  const notMigrated = fake.scopeJson.tickets['9102'].files.shift();
  fake.scopeJson.tickets['9102'].migrated.push({ path: notMigrated.path, literals: notMigrated.literals });
  assert.ok(audit(fake, ROOT).problems.some((p) => p.includes('把未迁件记成已迁')), '未迁记成已迁必红');
});
