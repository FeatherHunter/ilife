import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, chmodSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHelpLookup, routeWakeword } from '../packages/skill-memo/dist/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(root, 'tooling/skilllink.mjs');
let DB = '';

function nodeBin() {
  const cands = [process.env.npm_node_execpath, 'node', process.execPath].filter(Boolean);
  for (const c of cands) {
    try {
      const p = spawnSync(c, ['--version'], { encoding: 'utf8' });
      if (p.status === 0 && /^v\d+/.test((p.stdout || '').trim())) return c;
    } catch { /* 试下一个 */ }
  }
  return process.execPath;
}
const NODE = nodeBin();
function run(args, envExtra) {
  return spawnSync(NODE, [cli, ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: DB, ...(envExtra || {}) } });
}
function note(id, title, body, category) {
  return { id, title, body, category, sub: null, createdAt: '2026-09-01', updatedAt: '2026-09-02' };
}

// fake lark-cli（sync 全链路用；posix shebang / win .cmd 转调）。
function makeFakeCli(dir) {
  const logic = [
    'const a = process.argv.slice(2);',
    "if (a[0] === '--version') { console.log('lark-cli 9.9.9-fake'); }",
    "else if (a[0] === 'auth' && a[1] === 'status') { console.log(JSON.stringify({ identities: { user: { openId: 'ou_fake' } } })); }",
    "else if (a[0] === 'auth' && a[1] === 'check') { process.exit(a[3] === 'task' ? 0 : 1); }",
    'else { console.error(\'unknown\'); process.exit(2); }',
    '',
  ].join('\n');
  if (process.platform === 'win32') {
    const mjs = join(dir, 'fakelark.mjs');
    writeFileSync(mjs, logic);
    const cmd = join(dir, 'fakelark.cmd');
    writeFileSync(cmd, '@node "' + mjs + '" %*\r\n');
    return cmd;
  }
  const sh = join(dir, 'fakelark');
  writeFileSync(sh, '#!/usr/bin/env node\n' + logic);
  try { chmodSync(sh, 0o755); } catch { /* win 无 exec 位 */ }
  return sh;
}

before(() => {
  DB = mkdtempSync(join(tmpdir(), 'memoe2e-'));
  mkdirSync(join(DB, 'memo'));
  writeFileSync(join(DB, 'memo', 'n1.json'), JSON.stringify(note('n1', '去医院', '今天去医院复查', '备忘')));
  writeFileSync(join(DB, 'memo', 'n2.json'), JSON.stringify(note('n2', '跑步', '今天跑了 5 公里', '打卡')));
  process.env.LARK_CLI_PATH = makeFakeCli(DB);
});

function read(key, params) {
  const a = params === undefined ? [key] : [key, '--params', JSON.stringify(params)];
  const r = run(['read', ...a]);
  assert.equal(r.status, 0, key + ' exit ' + r.status + ' stderr=' + r.stderr);
  const env = JSON.parse(r.stdout);
  assert.equal(env.key, key);
  return env;
}

describe('备忘录联动端到端 M7', () => {
  it('读键全链路（registry→spawn 出口→envelope）', () => {
    assert.equal(read('memo.search', { q: '跑步' }).shape, 'list');
    assert.equal(read('memo.detail', { id: 'n1' }).shape, 'detail');
    assert.equal(read('memo.remind').data.total, 0);
    assert.equal(read('memo.wish').shape, 'list');
    assert.equal(read('memo.stats').data.metrics.count, 2);
    assert.equal(read('memo.sync').shape, 'receipt');
  });
  it('写键闭环（建→改→删）', () => {
    const c = read('memo.create', { title: '买奶', category: '备忘' });
    const id = c.data.message.replace('已记一条：', '');
    assert.ok(id.length > 0);
    assert.equal(read('memo.update', { id, done: true }).shape, 'receipt');
    assert.equal(read('memo.remove', { id, confirm: true }).shape, 'receipt');
    assert.equal(read('memo.batch').shape, 'receipt');
  });
  it('HELP 现找一句可执行（框架 6 条第 2 条）', () => {
    const hit = buildHelpLookup().find((h) => h.phrase === '查打卡');
    const rt = routeWakeword(hit.phrase, {});
    assert.equal(rt.key, hit.key);
    assert.equal(read(rt.key, rt.params).shape, 'list');
  });
  it('对不上即 fail，不返空', () => {
    const r = run(['read', 'memo.nope']);
    assert.equal(r.status, 3);
    assert.equal(r.stdout, '');
  });
  it('仓内无 py 残留（验收第 5 条）', () => {
    const bad = [];
    const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (f === 'node_modules' || f === '.git' || f === 'dist') continue; const s = statSync(p); if (s.isDirectory()) walk(p); else if (f.endsWith('.py')) bad.push(p); } };
    walk(join(root, 'packages'));
    assert.deepEqual(bad, []);
  });
});
