import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { findEvidenceFiles, runChecks } from '../check-evidence.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TOOL = path.resolve(HERE, '..', 'check-evidence.mjs');
const SESSION_ID = '52b9ed47-a497-4051-926f-4516a83ca64b';
const SHA = 'a'.repeat(40);
const POINTER_MS = Date.parse('2026-01-02T03:04:05+08:00');

const OK_IDENTITY = 'FeatherHunter|975559549@qq.com|FeatherHunter|975559549@qq.com';

function fakeGit({ subject = 'fix(1299): 夹具提交 #1299' } = {}) {
  return (args) => {
    if (args[0] === 'cat-file') return { status: 0, stdout: '' };
    if (args[0] === 'log' && args.includes('--format=%an|%ae|%cn|%ce')) return { status: 0, stdout: OK_IDENTITY };
    if (args[0] === 'log' && args.includes('--format=%s')) return { status: 0, stdout: subject };
    if (args[0] === 'show') return { status: 0, stdout: 'tooling/session-pointers.mjs' };
    return { status: 1, stdout: '' };
  };
}

function fakeSession() {
  return {
    offsetHours: 8,
    records: [{
      type: 'user/message',
      seq: 10,
      time: POINTER_MS,
      data: { content: [{ type: 'text', text: '落地。' }] },
    }],
  };
}

/** 临时仓库根：docs 证据 md＋同目录资产＋.changeset。 */
function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-evidence-'));
  const dir = path.join(root, 'docs', 'plugins', 'plugin-manager');
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(root, '.changeset'), { recursive: true });
  fs.writeFileSync(path.join(root, '.changeset', '1299-retro-tools.md'), "---\n'dsh-life-pack': patch\n---\n\n夹具。\n");
  const file = path.join(dir, 't1299-证据.md');
  fs.writeFileSync(file, '# 夹具占位（正文由各用例单独传入 runChecks）\n');
  fs.writeFileSync(path.join(dir, 't1299-shot.png'), 'png');
  return { root, dir, file };
}

function goodText() {
  return [
    '# 1299 证据自检夹具',
    '',
    '- 用户原话（会话 `' + SESSION_ID + '` seq 10，2026-01-02 03:04:05，转录）：「落地。」',
    '- ③ 实施（危险代码）：提交 `' + SHA + '`，提交信息带票号 `#1299`。',
    '- ④ 确认：用户直令关闭。',
    '',
    '## 读数',
    '- exit=0',
    '- tests 11/11',
    '- RESULT: PASS',
    '- HIT `drop-shadow(`',
    '',
    '## 资产',
    '- `docs/plugins/plugin-manager/t1299-shot.png`',
  ].join('\n');
}

const base = {
  ticket: '1299',
  git: fakeGit(),
  loadSessionFn: async () => fakeSession(),
  sessionsRoot: 'unused',
};
const byName = (checks, name) => checks.find((check) => check.name === name);

describe('check-evidence 全绿路径', () => {
  it('指针／危险代码／读数／changeset／资产／④ 全过，无 FAIL', async () => {
    const { root, file } = makeRoot();
    const checks = await runChecks({ ...base, text: goodText(), filePath: file, root });
    assert.deepEqual(checks.filter((check) => check.verdict === 'FAIL'), []);
    assert.equal(byName(checks, 'pointer').verdict, 'PASS');
    assert.equal(byName(checks, 'danger').verdict, 'PASS', '提交信息带 #1299 时按规范写法记 PASS 之外的无问题');
    assert.equal(byName(checks, 'changeset').verdict, 'PASS');
    assert.equal(byName(checks, 'assets').verdict, 'PASS');
  });

  it('--no-changeset 时 changeset 降为 WARN（票面须写明理由）', async () => {
    const { root, file } = makeRoot();
    const checks = await runChecks({ ...base, text: goodText(), filePath: file, root, noChangeset: true });
    assert.equal(byName(checks, 'changeset').verdict, 'WARN');
  });

  it('changeset 文件名带 t 前缀（先例 t1296-manual-entry-shadow.md）也认', async () => {
    const { root, file } = makeRoot();
    fs.renameSync(path.join(root, '.changeset', '1299-retro-tools.md'), path.join(root, '.changeset', 't1299-retro-tools.md'));
    const checks = await runChecks({ ...base, text: goodText(), filePath: file, root });
    assert.equal(byName(checks, 'changeset').verdict, 'PASS');
  });

  it('引用带行号后缀（:59）只记 format WARN，不判死', async () => {
    const { root, file } = makeRoot();
    const text = goodText() + '\n- 改点 `packages/plugin-manager/src/manual-entry.ts:59`\n';
    const checks = await runChecks({ ...base, text, filePath: file, root });
    assert.equal(byName(checks, 'format').verdict, 'WARN');
    assert.match(byName(checks, 'format').detail, /行号后缀|不可落地/);
    assert.deepEqual(checks.filter((check) => check.verdict === 'FAIL'), []);
  });

  it('文本卫生不合格（BOM）判 format FAIL', async () => {
    const { root, file } = makeRoot();
    const checks = await runChecks({ ...base, text: '\uFEFF' + goodText(), filePath: file, root });
    assert.equal(byName(checks, 'format').verdict, 'FAIL');
    assert.match(byName(checks, 'format').detail, /BOM/);
  });
});

describe('check-evidence 红路径（先拿旧材料试）', () => {
  it('没有可复算指针：pointer FAIL（旧证据常见）', async () => {
    const { root, file } = makeRoot();
    const text = goodText().replace(/（会话[^）]*）/g, '（用户当时说的，转录）');
    const checks = await runChecks({ ...base, text, root });
    assert.equal(byName(checks, 'pointer').verdict, 'FAIL');
    assert.match(byName(checks, 'pointer').detail, /指针/);
  });

  it('seq 抄错：pointer FAIL 且点名 seq', async () => {
    const { root, file } = makeRoot();
    const text = goodText().replace('seq 10', 'seq 11');
    const checks = await runChecks({ ...base, text, filePath: file, root });
    assert.equal(byName(checks, 'pointer').verdict, 'FAIL');
    assert.match(byName(checks, 'pointer').detail, /不存在/);
  });

  it('本机取不到会话存储：pointer 记 WARN，不假装命中', async () => {
    const { root } = makeRoot();
    const checks = await runChecks({
      ...base,
      text: goodText(),
      root,
      loadSessionFn: async () => { throw new Error('ENOENT'); },
    });
    assert.equal(byName(checks, 'pointer').verdict, 'WARN');
  });

  it('没有「危险代码」标记：danger FAIL', async () => {
    const { root, file } = makeRoot();
    const checks = await runChecks({ ...base, text: goodText().replace('（危险代码）', ''), filePath: file, root });
    assert.equal(byName(checks, 'danger').verdict, 'FAIL');
  });

  it('提交身份不是 FeatherHunter：danger FAIL', async () => {
    const { root, file } = makeRoot();
    const git = fakeGit();
    const badGit = (args) => (args[0] === 'log' && args.includes('--format=%an|%ae|%cn|%ce')
      ? { status: 0, stdout: '王辰浩|975559549@qq.com|王辰浩|975559549@qq.com' }
      : git(args));
    const checks = await runChecks({ ...base, git: badGit, text: goodText(), filePath: file, root });
    assert.equal(byName(checks, 'danger').verdict, 'FAIL');
    assert.match(byName(checks, 'danger').detail, /身份/);
  });

  it('提交信息没有票号：danger FAIL；票号写成 (1299) 只 WARN', async () => {
    const { root, file } = makeRoot();
    const noTicket = await runChecks({ ...base, git: fakeGit({ subject: 'fix: 夹具提交' }), text: goodText(), filePath: file, root });
    assert.equal(byName(noTicket, 'danger').verdict, 'FAIL');
    const nonCanonical = await runChecks({ ...base, git: fakeGit({ subject: 'fix(1299): 夹具提交' }), text: goodText(), filePath: file, root });
    assert.equal(byName(nonCanonical, 'danger').verdict, 'WARN');
  });

  it('缺 changeset：FAIL（每票一件）', async () => {
    const { root, file } = makeRoot();
    fs.rmSync(path.join(root, '.changeset', '1299-retro-tools.md'));
    const checks = await runChecks({ ...base, text: goodText(), filePath: file, root });
    assert.equal(byName(checks, 'changeset').verdict, 'FAIL');
  });

  it('资产在子目录、不与证据 md 同目录：FAIL（doc-homes 同目录同前缀）', async () => {
    const { root, dir } = makeRoot();
    const sub = path.join(dir, 't1299-assets');
    fs.mkdirSync(sub);
    fs.writeFileSync(path.join(sub, 't1299-shot.png'), 'png');
    const text = goodText().replace('`docs/plugins/plugin-manager/t1299-shot.png`', '`docs/plugins/plugin-manager/t1299-assets/t1299-shot.png`');
    const checks = await runChecks({ ...base, text, filePath: path.join(dir, 't1299-证据.md'), root });
    assert.equal(byName(checks, 'assets').verdict, 'FAIL');
    assert.match(byName(checks, 'assets').detail, /不同目录/);
  });

  it('④ 格写「无用户确认」：confirm FAIL（自查即关作废）', async () => {
    const { root } = makeRoot();
    const checks = await runChecks({ ...base, text: goodText() + '\n关闭前无用户逐字确认。\n', root });
    assert.equal(byName(checks, 'confirm').verdict, 'FAIL');
  });
});

describe('check-evidence CLI 与找文件', () => {
  it('按票号在 docs/ 下找到 t<票号>-*.md', () => {
    const { root } = makeRoot();
    const files = findEvidenceFiles(root, '1299');
    assert.equal(files.length, 1);
    assert.match(path.basename(files[0]), /^t1299-/);
  });

  it('--help exit 0；无参数 exit 2', () => {
    const help = spawnSync(process.execPath, [TOOL, '--help'], { encoding: 'utf8' });
    assert.equal(help.status, 0);
    assert.match(help.stdout, /证据自检/);
    const noArgs = spawnSync(process.execPath, [TOOL], { encoding: 'utf8' });
    assert.equal(noArgs.status, 2);
  });
});
