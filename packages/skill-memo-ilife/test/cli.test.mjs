import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { tmpdir as osTmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkMemoDb, seedNote, countNotes } from './helpers/memo-sqlite.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, '..', 'dist', 'cli', 'cmd_read.js');
let DB = '';
const tmpDir = () => osTmpdir();

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
// 本文件只测本地侧：远端闸门钉死（`LARK_CLI_PATH` 指不存在的路径），任何真 lark 都连不上，
// 心愿类写操作走降级（本地照落、退出码非 0）。真远端只在 wish-sync-661 的挡板里测。
function run(args, envExtra) {
  const dead = { LARK_CLI_PATH: join(DB || tmpDir(), 'no-lark-here') };
  return spawnSync(NODE, [bin, ...args], { cwd: here, encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: DB, ...dead, ...(envExtra || {}) } });
}
function outData(r) {
  return JSON.parse(r.stdout).data;
}

before(() => {
  DB = mkMemoDb('memocli-');
  seedNote(DB, { content: '今天去医院复查', category: '备忘' });
  seedNote(DB, { content: '今天跑步5公里', category: '打卡' });
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
    assert.match(outData(r).message, /已记一条/);
    assert.equal(countNotes(DB), 3);
  });
  it('更新/删除闭环', () => {
    const s = run(['memo.search', '--params', JSON.stringify({ q: '买奶' })]);
    const id = outData(s).items[0].id;
    assert.equal(typeof id, 'number');
    const u = run(['memo.update', '--params', JSON.stringify({ id, body: '买牛奶' })]);
    assert.equal(u.status, 0);
    assert.match(outData(u).message, /已更新/);
    const d = run(['memo.remove', '--params', JSON.stringify({ id, confirm: true })]);
    assert.equal(d.status, 0);
    assert.equal(countNotes(DB), 2);
  });
  it('完成心愿走原子转换（删心愿＋生成打卡；建侧降级故无远端对象可标）', () => {
    const c = run(['memo.create', '--params', JSON.stringify({ title: '学游泳', category: '心愿' })]);
    assert.equal(c.status, 4);
    assert.match(outData(c).message, /已记一条/);
    const id = outData(run(['memo.search', '--params', JSON.stringify({ q: '学游泳' })])).items[0].id;
    // 建侧降级 ⇒ 本地无远端标识 ⇒ 完成只做本地原子转换即达成（exit 0，无远端可标不是失败）。
    const w = run(['memo.update', '--params', JSON.stringify({ id, done: true, content: '第一次下水' })]);
    assert.equal(w.status, 0);
    assert.match(outData(w).message, /已完成，打卡/);
    const sports = outData(run(['memo.search', '--params', JSON.stringify({ q: '学游泳' })]));
    assert.equal(sports.total, 0);
    const checkin = outData(run(['memo.search', '--params', JSON.stringify({ q: '第一次下水' })]));
    assert.equal(checkin.total, 1);
    assert.equal(checkin.items[0].category, '打卡');
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
    assert.equal(run(['memo.detail', '--params', JSON.stringify({ id: 999999 })]).status, 4);
    const p = join(DB, 'out.html');
    const r = run(['memo.search', '--html', p]);
    assert.equal(r.status, 0);
    assert.match(readFileSync(p, 'utf8'), /<section/);
  });
});
