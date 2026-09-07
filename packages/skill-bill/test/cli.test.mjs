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
    } catch {}
  }
  return process.execPath;
}
const NODE = nodeBin();
function run(args, envExtra) {
  return spawnSync(NODE, [bin, ...args], { cwd: here, encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: DB, ...(envExtra || {}) } });
}
const P = (o) => JSON.stringify(o);

before(() => {
  DB = mkdtempSync(join(tmpdir(), 'billcli-'));
  assert.equal(run(['bill.record.add', '--params', P({ category: '餐饮/外卖/午餐', amount: -35, time: '2026-09-06 12:00:00', note: '午饭 #工作餐', account: '支付宝' })]).status, 0);
  assert.equal(run(['bill.record.add', '--params', P({ category: '餐饮/堂食/晚餐', amount: -58, time: '2026-09-06 19:00:00', note: '晚饭', account: '微信' })]).status, 0);
  assert.equal(run(['bill.record.add', '--params', P({ category: '工资/基本工资', amount: 8000, time: '2026-09-01 09:00:00', note: '9月工资' })]).status, 0);
  assert.equal(run(['bill.record.add', '--params', P({ category: '餐饮/外卖/午餐', amount: -42, time: '2026-08-06 12:00:00', note: '午饭' })]).status, 0);
});

describe('饼干记账唯一出口 cmd_read（16 键全票）', () => {
  it('record.today：exit 0 + 纯 JSON list', () => {
    const r = run(['bill.record.today', '--params', P({ date: '2026-09-06' })]);
    assert.equal(r.status, 0);
    const env = JSON.parse(r.stdout);
    assert.equal(env.shape, 'list');
    assert.equal(env.skill, 'bill');
    assert.equal(env.data.total, 2);
  });
  it('record.range：条件查 + 空区间 exit 4', () => {
    const r = run(['bill.record.range', '--params', P({ start: '2026-09-01', end: '2026-09-30' })]);
    assert.equal(r.status, 0);
    assert.equal(JSON.parse(r.stdout).data.total, 3);
    const c = run(['bill.record.range', '--params', P({ category: '餐饮' })]);
    assert.equal(c.status, 0);
    assert.ok(JSON.parse(c.stdout).data.total >= 3);
    assert.equal(run(['bill.record.range', '--params', P({ start: '2020-01-01', end: '2020-01-02' })]).status, 4);
  });
  it('record.search：备注/标签/欠款 + record.detail 闭环', () => {
    const s = run(['bill.record.search', '--params', P({ q: '午饭' })]);
    assert.equal(s.status, 0);
    assert.equal(JSON.parse(s.stdout).data.total, 2);
    const d = run(['bill.record.search', '--params', P({ kind: 'debt' })]);
    assert.equal(d.status, 0);
    const id = JSON.parse(s.stdout).data.items[0].id;
    assert.equal(JSON.parse(run(['bill.record.detail', '--params', P({ id })]).stdout).data.item.id, id);
    assert.equal(run(['bill.record.detail', '--params', P({ id: 99999 })]).status, 4);
  });
  it('record.update：改 + 撤销恢复闭环', () => {
    const id = JSON.parse(run(['bill.record.search', '--params', P({ q: '晚饭' })]).stdout).data.items[0].id;
    assert.equal(run(['bill.record.update', '--params', P({ id, note: '晚饭v2' })]).status, 0);
    assert.equal(run(['bill.record.update', '--params', P({ op: 'undo', id })]).status, 0);
    assert.equal(run(['bill.record.update', '--params', P({ op: 'restore', id })]).status, 0);
    assert.equal(run(['bill.record.update', '--params', P({})]).status, 2);
  });
  it('analysis 三键：overview stat + compare/trend analysis', () => {
    const o = run(['bill.analysis.overview', '--params', P({ month: '2026-09' })]);
    assert.equal(o.status, 0);
    const { metrics } = JSON.parse(o.stdout).data;
    for (const v of Object.values(metrics)) assert.equal(typeof v, 'number');
    assert.ok(metrics.expense > 0 && metrics.income > 0);
    const c = run(['bill.analysis.compare', '--params', P({ kind: 'period', monthA: '2026-08', monthB: '2026-09' })]);
    assert.equal(c.status, 0);
    assert.match(JSON.parse(c.stdout).data.summary, /支出/);
    const t = run(['bill.analysis.trend', '--params', P({ kind: 'top', limit: 2 })]);
    assert.equal(t.status, 0);
  });
  it('goal/account 写读闭环（写走 receipt）', () => {
    assert.equal(run(['bill.goal.write', '--params', P({ op: 'set-budget', month: '2026-09', amount: 3000 })]).status, 0);
    assert.equal(run(['bill.goal.write', '--params', P({ op: 'set-budget', month: '2026-09', amount: 3000 })]).status, 2);
    assert.equal(run(['bill.goal.write', '--params', P({ op: 'set-budget', month: '2026-09', amount: 3500, force: true })]).status, 0);
    assert.match(JSON.parse(run(['bill.goal.query', '--params', P({ op: 'budget', month: '2026-09' })]).stdout).data.items[0].month, /2026-09/);
    assert.equal(run(['bill.account.write', '--params', P({ op: 'add', name: '招行卡' })]).status, 0);
    assert.equal(run(['bill.account.write', '--params', P({ op: 'transfer', amount: 500, from: '支付宝', to: '招行卡' })]).status, 0);
    assert.equal(JSON.parse(run(['bill.account.query']).stdout).data.total, 1);
  });
  it('link/setup/help：联动采单 + 初始化 + 现找', () => {
    const l = run(['bill.link.submit', '--params', P({ scene: 'meal', ate: '鸡腿饭', amount: -35 })]);
    assert.equal(l.status, 0);
    assert.match(JSON.parse(l.stdout).data.message, /卡路里/);
    assert.equal(run(['bill.setup.run', '--params', P({ op: 'init' })]).status, 0);
    assert.equal(run(['bill.setup.run', '--params', P({ op: 'init-status' })]).status, 0);
    const h = run(['bill.help.lookup']);
    assert.equal(h.status, 0);
    assert.equal(JSON.parse(h.stdout).data.total, 77);
    const q = run(['bill.help.lookup', '--params', P({ q: '帮我查今天花了多少' })]);
    assert.ok(JSON.parse(q.stdout).data.items.some((x) => x.key === 'bill.record.today'));
  });
  it('契约：未知 key 3 且 stdout 空；坏参 2；缺 DB 1；--html 落盘', () => {
    const k = run(['bill.nope']);
    assert.equal(k.status, 3);
    assert.equal(k.stdout, '');
    assert.equal(run(['bill.record.today', '--params', '[]']).status, 2);
    assert.equal(run(['bill.record.today', '--timeout', 'abc']).status, 2);
    assert.equal(run(['bill.record.today'], { SKILLS_DB_PATH: '' }).status, 1);
    const p = join(DB, 'out.html');
    const r = run(['bill.record.today', '--params', P({ date: '2026-09-06' }), '--html', p]);
    assert.equal(r.status, 0);
    const html = readFileSync(p, 'utf8');
    assert.match(html, /<section/);
    assert.match(html, /<!DOCTYPE html/);
    assert.match(html, /bill-cmd-read bill\.record\.today/);
  });
});
