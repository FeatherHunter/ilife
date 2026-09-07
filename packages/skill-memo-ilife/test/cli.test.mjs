import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, '..', 'dist', 'cli', 'cmd_read.js');
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
  return spawnSync(NODE, [bin, ...args], { cwd: here, encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: DB, ...(envExtra || {}) } });
}
function note(id, title, body, category) {
  return { id, title, body, category, sub: null, createdAt: '2026-09-01', updatedAt: '2026-09-02' };
}

before(() => {
  DB = mkdtempSync(join(tmpdir(), 'memocli-'));
  mkdirSync(join(DB, 'memo'));
  writeFileSync(join(DB, 'memo', 'n1.json'), JSON.stringify(note('n1', '去医院', '今天去医院复查', '备忘')));
  writeFileSync(join(DB, 'memo', 'n2.json'), JSON.stringify(note('n2', '跑步', '今天跑了 5 公里', '打卡')));
});

describe('memo 唯一出口 cmd_read', () => {
  it('搜备忘：exit 0 + 纯 JSON list', () => {
    const r = run(['memo.search', '--params', JSON.stringify({ q: '跑步' })]);
    assert.equal(r.status, 0);
    const env = JSON.parse(r.stdout);
    assert.equal(env.shape, 'list');
    assert.equal(env.data.total, 1);
  });
  it('记一条：回执 + 落盘', () => {
    const r = run(['memo.create', '--params', JSON.stringify({ title: '买奶', body: '', category: '备忘' })]);
    assert.equal(r.status, 0);
    assert.match(JSON.parse(r.stdout).data.message, /已记一条/);
    assert.equal(readdirSync(join(DB, 'memo')).length, 3);
  });
  it('更新/删除闭环', () => {
    const id = readdirSync(join(DB, 'memo')).map((f) => f.replace('.json', '')).find((x) => x !== 'n1' && x !== 'n2');
    const u = run(['memo.update', '--params', JSON.stringify({ id, done: true })]);
    assert.equal(u.status, 0);
    const d = run(['memo.remove', '--params', JSON.stringify({ id, confirm: true })]);
    assert.equal(d.status, 0);
    assert.equal(readdirSync(join(DB, 'memo')).length, 2);
  });
  it('未知 key exit 3 且 stdout 空；坏参数 exit 2；缺 DB exit 1', () => {
    const k = run(['memo.nope']);
    assert.equal(k.status, 3);
    assert.equal(k.stdout, '');
    assert.equal(run(['memo.search', '--params', '[]']).status, 2);
    assert.equal(run(['memo.search', '--timeout', 'abc']).status, 2);
    assert.equal(run(['memo.search'], { SKILLS_DB_PATH: '' }).status, 1);
  });
  it('查无对条 exit 4；--html 落盘', () => {
    assert.equal(run(['memo.detail', '--params', JSON.stringify({ id: 'nope' })]).status, 4);
    const p = join(DB, 'out.html');
    const r = run(['memo.search', '--html', p]);
    assert.equal(r.status, 0);
    assert.match(readFileSync(p, 'utf8'), /<section/);
  });
});
