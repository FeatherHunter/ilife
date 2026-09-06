import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
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
const P = (o) => JSON.stringify(o);

before(() => {
  DB = mkdtempSync(join(tmpdir(), 'homecli-'));
  // 种子：分类取首个 + 录两件 + 购物/家人/保修前置
  const probe = run(['home.stats.overview']);
  assert.equal(probe.status, 0);
  const cats = JSON.parse(run(['home.tag.query', '--params', P({ kind: 'categories' })]).stdout).data.items;
  const cid = cats.find((c) => String(c.name).startsWith('分类:')).count;
  assert.equal(run(['home.item.add', '--params', P({ name: '牛奶', category_id: cid, location: '客厅/冰箱', tags: '早餐', purchase_price: 5 })]).status, 0);
  assert.equal(run(['home.item.add', '--params', P({ name: '卫衣', category_id: cid, location: '卧室/衣柜' })]).status, 0);
  assert.equal(run(['home.shopping.write', '--params', P({ op: 'list-add', name: '鸡蛋', quantity: 2 })]).status, 0);
  assert.equal(run(['home.care.write', '--params', P({ kind: 'member', name: '妈妈' })]).status, 0);
});

describe('居家唯一出口 cmd_read（21 键全票）', () => {
  it('search/detail：list/detail + 查无对条 4', () => {
    const r = run(['home.item.search', '--params', P({ name: '牛奶' })]);
    assert.equal(r.status, 0);
    const env = JSON.parse(r.stdout);
    assert.equal(env.shape, 'list');
    assert.equal(env.skill, 'home');
    assert.ok(env.data.total >= 1);
    const id = env.data.items[0].id;
    assert.equal(JSON.parse(run(['home.item.detail', '--params', P({ id })]).stdout).data.item.id, id);
    assert.equal(run(['home.item.detail', '--params', P({ id: 999999 })]).status, 4);
  });
  it('add/update 写链 receipt 闭环', () => {
    const cats = JSON.parse(run(['home.tag.query', '--params', P({ kind: 'categories' })]).stdout).data.items;
    const cid = cats.find((c) => String(c.name).startsWith('分类:')).count;
    const a = run(['home.item.add', '--params', P({ name: '电池', category_id: cid, location: '书房/抽屉' })]);
    assert.equal(a.status, 0);
    assert.match(JSON.parse(a.stdout).data.message, /已录物品/);
    const id = JSON.parse(run(['home.item.search', '--params', P({ name: '电池' })]).stdout).data.items[0].id;
    assert.equal(run(['home.item.update', '--params', P({ id, remark: '南孚' })]).status, 0);
    assert.equal(run(['home.item.update', '--params', P({ id, op: 'qty', plus: 1 })]).status, 0);
    assert.equal(run(['home.item.update', '--params', P({ id, op: 'status', location_status: '备用' })]).status, 0);
    assert.equal(run(['home.item.add', '--params', P({ name: '', category_id: cid, location: '客厅/桌' })]).status, 2);
  });
  it('tag/inventory/location：查改分流', () => {
    assert.equal(JSON.parse(run(['home.tag.query']).stdout).data.total >= 1, true);
    assert.equal(run(['home.tag.write', '--params', P({ op: 'merge', from: '早餐', to: '早点' })]).status, 0);
    assert.equal(run(['home.inventory.round', '--params', P({ op: 'round', scope: 'all' })]).status, 0);
    assert.ok(JSON.parse(run(['home.inventory.records']).stdout).data.total >= 1);
    assert.ok(JSON.parse(run(['home.location.query']).stdout).data.total >= 1);
    assert.equal(run(['home.location.write', '--params', P({ op: 'manage', action: 'add', path: '阳台/柜子' })]).status, 0);
  });
  it('outfit/trip/stats：推荐与统计', () => {
    assert.equal(run(['home.outfit.pick']).status, 0);
    assert.match(run(['home.trip.manage', '--params', P({ mode: 'pack', ids: [] })]).stdout, /出行清单/);
    const ov = JSON.parse(run(['home.stats.overview']).stdout).data.metrics;
    assert.ok(typeof ov.items === 'number');
    assert.equal(run(['home.stats.alert', '--params', P({ kind: 'idle', days: 90 })]).status, 0);
    assert.equal(run(['home.stats.alert', '--params', P({ kind: 'expiring', days: 30 })]).status, 0);
  });
  it('shopping/ticket/care：三域读写', () => {
    assert.ok(JSON.parse(run(['home.shopping.query']).stdout).data.total >= 1);
    assert.equal(run(['home.shopping.write', '--params', P({ op: 'list-check', ids: '1' })]).status, 0);
    assert.equal(run(['home.ticket.query', '--params', P({ kind: 'purchase' })]).status, 0);
    const id = JSON.parse(run(['home.item.search', '--params', P({ name: '牛奶' })]).stdout).data.items[0].id;
    assert.equal(run(['home.ticket.write', '--params', P({ kind: 'purchase', op: 'add', item_id: id, date: '2026-09-01', price: 5 })]).status, 0);
    assert.equal(run(['home.ticket.write', '--params', P({ kind: 'account', op: 'add', platform: '淘宝', user: 'u', pass: 'p123', master_key: '12345678' })]).status, 0);
    assert.match(run(['home.ticket.write', '--params', P({ kind: 'account', op: 'show', platform: '淘宝', master_key: '12345678' })]).stdout, /密码/);
    assert.equal(run(['home.care.query', '--params', P({ kind: 'lint' })]).status, 0);
    assert.equal(run(['home.care.write', '--params', P({ kind: 'init' })]).status, 0);
  });
  it('help.lookup：全表 + 现找', () => {
    const h = run(['home.help.lookup']);
    assert.equal(h.status, 0);
    assert.ok(JSON.parse(h.stdout).data.total >= 88);
    const q = run(['home.help.lookup', '--params', P({ q: '帮我查物品牛奶' })]);
    assert.ok(JSON.parse(q.stdout).data.items.some((x) => x.key === 'home.item.search'));
  });
  it('契约：未知 key 3 且 stdout 空；坏参 2；缺 DB 1；--html 落盘', () => {
    const k = run(['home.nope']);
    assert.equal(k.status, 3);
    assert.equal(k.stdout, '');
    assert.equal(run(['home.item.search', '--params', '[]']).status, 2);
    assert.equal(run(['home.item.search', '--timeout', 'abc']).status, 2);
    assert.equal(run(['nope']).status, 3);
    assert.equal(run(['home.item.search'], { SKILLS_DB_PATH: '' }).status, 1);
    const p = join(DB, 'out.html');
    const r = run(['home.item.search', '--params', P({ name: '牛奶' }), '--html', p]);
    assert.equal(r.status, 0);
    assert.match(readFileSync(p, 'utf8'), /<section/);
  });
});
