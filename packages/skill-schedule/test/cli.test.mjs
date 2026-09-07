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
  DB = mkdtempSync(join(tmpdir(), 'schedcli-'));
  // 种子：9 月两块 + 8 月一块（对比用）+ 日程一条
  assert.equal(run(['schedule.record.write', '--params', P({ op: 'add', date: '2026-09-06', time_start: '09:00', time_end: '10:00', activity: '调优', category: '工作.AI调优' })]).status, 0);
  assert.equal(run(['schedule.record.write', '--params', P({ op: 'add', date: '2026-09-07', time_start: '07:00', time_end: '08:00', activity: '跑步', category: '健康.运动' })]).status, 0);
  assert.equal(run(['schedule.record.write', '--params', P({ op: 'add', date: '2026-08-06', time_start: '09:00', time_end: '10:00', activity: '调优', category: '工作.AI调优' })]).status, 0);
  assert.equal(run(['schedule.plan.write', '--params', P({ op: 'ensure', date: '2026-09-06', time_start: '09:00', time_end: '10:00', title: '晨会' })]).status, 0);
});

describe('作息唯一出口 cmd_read（8 键全票）', () => {
  it('record.today：exit 0 + 纯 JSON list + 相对日期', () => {
    const r = run(['schedule.record.today', '--params', P({ date: '2026-09-06' })]);
    assert.equal(r.status, 0);
    const env = JSON.parse(r.stdout);
    assert.equal(env.shape, 'list');
    assert.equal(env.skill, 'schedule');
    assert.equal(env.data.total, 1);
    assert.equal(env.data.items[0].activity, '调优');
  });
  it('record.range：stat metrics 全 number；空区间 exit 4', () => {
    const r = run(['schedule.record.range', '--params', P({ start: '2026-09-01', end: '2026-09-30' })]);
    assert.equal(r.status, 0);
    const { metrics } = JSON.parse(r.stdout).data;
    for (const v of Object.values(metrics)) assert.equal(typeof v, 'number');
    assert.equal(metrics.blocks, 2);
    assert.equal(run(['schedule.record.range', '--params', P({ start: '2020-01-01', end: '2020-01-02' })]).status, 4);
  });
  it('record.detail：按 id；查无对条 exit 4', () => {
    assert.equal(JSON.parse(run(['schedule.record.detail', '--params', P({ id: 1 })]).stdout).data.item.activity, '调优');
    const miss = run(['schedule.record.detail', '--params', P({ id: 999 })]);
    assert.equal(miss.status, 4);
    assert.equal(miss.stdout, '');
  });
  it('record.write：修正闭环 + 写摘要', () => {
    const u = run(['schedule.record.write', '--params', P({ op: 'amend', id: 1, activity: '调优v2' })]);
    assert.equal(u.status, 0);
    assert.match(JSON.parse(u.stdout).data.message, /edit_count=1/);
    const s = run(['schedule.record.write', '--params', P({ op: 'summary', date: '2026-09-06', category: '工作', total_minutes: 60 })]);
    assert.equal(s.status, 0);
    assert.equal(run(['schedule.record.write', '--params', P({ op: 'add', date: '2026-09-06', time_start: '10:00', time_end: '09:00', activity: 'x', category: '工作' })]).status, 2);
  });
  it('record.compare：months 对比 analysis 非空', () => {
    const r = run(['schedule.record.compare', '--params', P({ kind: 'months', monthA: '2026-08', monthB: '2026-09' })]);
    assert.equal(r.status, 0);
    assert.match(JSON.parse(r.stdout).data.summary, /健康分/);
    const a = run(['schedule.record.compare', '--params', P({ kind: 'anomaly', windowDays: 7, end: '2026-09-07' })]);
    assert.equal(a.status, 0);
  });
  it('plan.today：查日程 + 标题搜 + 多日', () => {
    const r = run(['schedule.plan.today', '--params', P({ date: '2026-09-06' })]);
    assert.equal(r.status, 0);
    assert.equal(JSON.parse(r.stdout).data.total, 1);
    const t = run(['schedule.plan.today', '--params', P({ date: '2026-09-06', title: '晨会' })]);
    assert.equal(JSON.parse(t.stdout).data.total, 1);
    const m = run(['schedule.plan.today', '--params', P({ dates: ['2026-09-06', '2026-09-07'] })]);
    assert.equal(m.status, 0);
  });
  it('plan.write：preview/upsert/ensure 幂等/update/deactivate/review', () => {
    const ev = (s, e, title) => ({ time_start: s, time_end: e, title });
    const pv = run(['schedule.plan.write', '--params', P({ op: 'preview', date: '2026-09-09', events: [ev('00:00', '12:00', '上'), ev('12:00', '23:59', '下')] })]);
    assert.equal(pv.status, 0);
    assert.match(JSON.parse(pv.stdout).data.message, /预览通过/);
    assert.equal(run(['schedule.plan.write', '--params', P({ op: 'preview', date: '2026-09-09', events: [ev('01:00', '12:00', '上')] })]).status, 2);
    const up = run(['schedule.plan.write', '--params', P({ op: 'upsert', date: '2026-09-09', events: [ev('00:00', '12:00', '上'), ev('12:00', '23:59', '下')] })]);
    assert.equal(up.status, 0);
    const en = run(['schedule.plan.write', '--params', P({ op: 'ensure', date: '2026-09-10', time_start: '09:00', time_end: '10:00', title: '补' })]);
    assert.match(JSON.parse(en.stdout).data.message, /已补计划/);
    const en2 = run(['schedule.plan.write', '--params', P({ op: 'ensure', date: '2026-09-10', time_start: '09:00', time_end: '10:00', title: '补' })]);
    assert.match(JSON.parse(en2.stdout).data.message, /幂等/);
    const id = JSON.parse(run(['schedule.plan.today', '--params', P({ date: '2026-09-09' })]).stdout).data.items[0].id;
    assert.equal(run(['schedule.plan.write', '--params', P({ op: 'update', id, completion: '已完成' })]).status, 0);
    assert.equal(run(['schedule.plan.write', '--params', P({ op: 'deactivate', id })]).status, 0);
    const rv = run(['schedule.plan.write', '--params', P({ op: 'review', date: '2026-09-09' })]);
    assert.equal(rv.status, 0);
    assert.match(JSON.parse(rv.stdout).data.message, /已复盘/);
  });
  it('help.lookup：全表 + 现找 + 空结果指引 + 飞书缺失阻断', () => {
    const h = run(['schedule.help.lookup']);
    assert.equal(h.status, 0);
    assert.ok(JSON.parse(h.stdout).data.total >= 40);
    const q = run(['schedule.help.lookup', '--params', P({ q: '帮我查作息' })]);
    assert.ok(JSON.parse(q.stdout).data.items.some((x) => x.key === 'schedule.record.today'));
    const empty = run(['schedule.help.lookup', '--params', P({ q: '不存在的词zzz' })]);
    assert.equal(empty.status, 0);
    const ed = JSON.parse(empty.stdout).data;
    assert.equal(ed.total, 0);
    assert.ok(typeof ed.hint === 'string' && ed.hint.includes('定时') && ed.hint.includes('早睡') && ed.hint.includes('以外置为准'));
    const sync = run(['schedule.plan.write', '--params', P({ op: 'sync', date: '2026-09-06' })], { LARK_CLI_PATH: join(DB, 'no-lark-cli') });
    assert.equal(sync.status, 4);
  });
  it('契约：未知 key 3 且 stdout 空；坏参 2；缺 DB 1；--html 落盘', () => {
    const k = run(['schedule.nope']);
    assert.equal(k.status, 3);
    assert.equal(k.stdout, '');
    assert.equal(run(['schedule.record.today', '--params', '[]']).status, 2);
    assert.equal(run(['schedule.record.today', '--timeout', 'abc']).status, 2);
    assert.equal(run(['nope']).status, 3);
    assert.equal(run(['schedule.record.today'], { SKILLS_DB_PATH: '' }).status, 1);
    const p = join(DB, 'out.html');
    const r = run(['schedule.record.today', '--params', P({ date: '2026-09-06' }), '--html', p]);
    assert.equal(r.status, 0);
    assert.match(readFileSync(p, 'utf8'), /<section/);
  });
});
