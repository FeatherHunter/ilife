// t411 查询骨架锁：查询域能力目录 ＋ 通用查询列表页 ＋ 四条读命令走注册表。
//
// 判据分四组：
//   ① 注册表：四条查询命令进表、kind 是 read、形状 list/list/list/detail，且写命令仍只在写入域；
//   ② 整页：查今天／查区间各出一张整页（DOCTYPE ＋ ilife-list 段 ＋ KPI 行 ＋ 数据表 ＋ 复制数据／日志 ＋ 命令原文）；
//   ③ 红线：空查询不返全量（缺 q／缺 start,end → exit 2）、坏输入阻断不冒充正常（空区间／查无此号 → exit 4）；
//   ④ 页标记：data-slot="ilife:bill:list"、data-page="list" 整页恰一枚、data-key 写场景名（不带 bill. 前缀）。
//
// 红线：本文件只读库里已有的数据；只往临时目录写自己的产物（--html）。
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REGISTRY } from '../dist/cli/registry.js';
import { runQueryRead } from '../dist/query/index.js';
import { WAKE_TABLE } from '../dist/policy/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, '..', 'dist', 'cli', 'cmd_read.js');
const NODE = [process.env.npm_node_execpath, 'node', process.execPath]
  .filter(Boolean)
  .find((c) => {
    const p = spawnSync(c, ['--version'], { encoding: 'utf8' });
    return p.status === 0 && /^v\d+/.test((p.stdout || '').trim());
  }) ?? process.execPath;

let DB = '';
let OUT = '';
const P = (o) => JSON.stringify(o);
function run(args, envExtra) {
  return spawnSync(NODE, [bin, ...args], { cwd: here, encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: DB, ...(envExtra || {}) } });
}
/** 跑一次查询并把它那张整页读回来。 */
function page(key, params, name) {
  const file = join(OUT, name + '.html');
  const r = run([key, '--params', P(params), '--html', file]);
  assert.equal(r.status, 0, key + ' 应 exit 0：' + r.stderr);
  assert.ok(existsSync(file), '产物应落盘：' + file);
  return { text: readFileSync(file, 'utf8'), stdout: r.stdout, file };
}

before(() => {
  DB = mkdtempSync(join(tmpdir(), 't411-db-'));
  OUT = mkdtempSync(join(tmpdir(), 't411-html-'));
  // 样本与 test/cli.test.mjs 同一批（2026-09-06 两笔、2026-09-01 一笔、2026-08-06 一笔）。
  const seed = [
    { category: '餐饮/外卖/午餐', amount: -35, time: '2026-09-06 12:00:00', note: '午饭 #工作餐', account: '支付宝' },
    { category: '餐饮/堂食/晚餐', amount: -58, time: '2026-09-06 19:00:00', note: '晚饭', account: '微信' },
    { category: '工资/基本工资', amount: 8000, time: '2026-09-01 09:00:00', note: '9月工资' },
    { category: '餐饮/外卖/午餐', amount: -42, time: '2026-08-06 12:00:00', note: '午饭' },
  ];
  for (const s of seed) assert.equal(run(['bill.record.add', '--params', P(s)]).status, 0, '样本应写进临时库');
});

describe('t411 ① 注册表：查询四条进表', () => {
  it('四条查询命令 kind=read、形状对得上', () => {
    const want = {
      'bill.record.today': 'list',
      'bill.record.range': 'list',
      'bill.record.search': 'list',
      'bill.record.detail': 'detail',
    };
    for (const [key, shape] of Object.entries(want)) {
      const spec = REGISTRY[key];
      assert.ok(spec, '注册表应有：' + key);
      assert.equal(spec.kind, 'read', key + ' 是读命令');
      assert.equal(spec.shape, shape, key + ' 的形状');
    }
  });
  it('代表唤醒词都是 WAKE_TABLE 里真有的词', () => {
    const phrases = new Set(WAKE_TABLE.map((e) => e.phrase));
    for (const key of ['bill.record.today', 'bill.record.range', 'bill.record.search', 'bill.record.detail']) {
      assert.ok(phrases.has(REGISTRY[key].wakeWord), REGISTRY[key].wakeWord + ' 应是真唤醒词');
    }
  });
  it('本域的门不认别域命令（不猜、不兜底）', () => {
    assert.throws(() => runQueryRead('bill.record.add', {}, null), /不是记账查询域的命令/);
    assert.throws(() => runQueryRead('bill.analysis.trend', {}, null), /不是记账查询域的命令/);
  });
});

describe('t411 ② 整页：查今天／查区间各出一张列表整页', () => {
  it('查今天：整页含 DOCTYPE、列表页段、KPI 行、数据表、复制数据／日志', () => {
    const { text, stdout, file } = page('bill.record.today', { date: '2026-09-06' }, 'today');
    const env = JSON.parse(stdout);
    assert.equal(env.shape, 'list');
    assert.equal(env.data.total, 2, '样本那天两笔');
    for (const needle of [
      '<!DOCTYPE html',
      'data-slot="ilife:bill:list"',
      'data-page="list"',
      'data-shape="list"',
      'data-key="record.today"',
      'ilife-block-kpi-card',
      '<table',
      '复制数据',
      '复制日志',
      'bill-cmd-read bill.record.today',
    ]) assert.ok(text.includes(needle), '整页该有：' + needle);
    assert.equal((text.match(/data-page=/g) ?? []).length, 1, '整页恰一枚 data-page');
    assert.ok(!text.includes('data-key="bill.'), 'data-key 写场景名，不带技能前缀');
    assert.ok(text.includes('午饭'), '表里应有备注');
    assert.ok(file.endsWith('today.html'));
  });
  it('查区间：整页含区间说明与两笔样本', () => {
    const { text, stdout } = page('bill.record.range', { start: '2026-09-01', end: '2026-09-30' }, 'range');
    const env = JSON.parse(stdout);
    assert.equal(env.shape, 'list');
    assert.equal(env.data.total, 3, '九月三笔');
    assert.ok(text.includes('2026-09-01')) ;
    assert.ok(text.includes('data-key="record.range"'));
    assert.ok(text.includes('bill-cmd-read bill.record.range'));
  });
  it('查最近：窗口说清条数，行情按时间倒序', () => {
    const { text, stdout } = page('bill.record.today', { recent: true, limit: 2 }, 'recent');
    assert.equal(JSON.parse(stdout).data.total, 2);
    assert.ok(text.includes('最近 2 笔'));
    const first = text.indexOf('2026-09-06 19:00:00');
    const second = text.indexOf('2026-09-06 12:00:00');
    assert.ok(first > -1 && second > first, '倒序：19:00 那笔在 12:00 那笔之前');
  });
  it('搜备注：命中两笔；查账单详情：单条也出一整页', () => {
    const s = page('bill.record.search', { q: '午饭' }, 'search');
    assert.equal(JSON.parse(s.stdout).data.total, 2);
    assert.ok(s.text.includes('备注里有「午饭」的记录'));
    const id = JSON.parse(s.stdout).data.items[0].id;
    const d = page('bill.record.detail', { id }, 'detail');
    assert.equal(JSON.parse(d.stdout).data.item.id, id);
    assert.ok(d.text.includes('data-shape="detail"'), '详情页形状仍是 detail');
    assert.ok(d.text.includes('记录编号 ' + id));
  });
  it('零行也是正常：查某天没有记录时出一张空态页（exit 0）', () => {
    const { text, stdout } = page('bill.record.today', { date: '2020-01-01' }, 'today-empty');
    assert.equal(JSON.parse(stdout).data.total, 0);
    assert.ok(text.includes('这一天没有记录'), '空态句');
    assert.ok(text.includes('ilife-block-empty-block'), '空态块');
  });
});

describe('t411 ③ 红线：空查询不返全量、坏输入阻断不冒充正常', () => {
  it('搜备注缺 q、且没给 kind → exit 2（不返全量）', () => {
    const r = run(['bill.record.search', '--params', P({})]);
    assert.equal(r.status, 2, r.stderr);
    assert.equal(r.stdout, '', '失败路径 stdout 不吐载荷');
  });
  it('查标签缺 tag → exit 2', () => {
    assert.equal(run(['bill.record.search', '--params', P({ kind: 'tag' })]).status, 2);
  });
  it('查区间既缺 start/end 也缺条件 → exit 2', () => {
    const r = run(['bill.record.range', '--params', P({})]);
    assert.equal(r.status, 2, r.stderr);
    assert.equal(r.stdout, '');
  });
  it('查最近条数越界（0／201／非整数）→ exit 2', () => {
    for (const limit of [0, 201, 1.5, '10']) {
      assert.equal(run(['bill.record.today', '--params', P({ recent: true, limit })]).status, 2, 'limit=' + String(limit));
    }
  });
  it('空区间 → exit 4（不出一张空表冒充查过了）', () => {
    assert.equal(run(['bill.record.range', '--params', P({ start: '2020-01-01', end: '2020-01-02' })]).status, 4);
  });
  it('查无此号 → exit 4', () => {
    assert.equal(run(['bill.record.detail', '--params', P({ id: 99999 })]).status, 4);
    assert.equal(run(['bill.record.detail', '--params', P({})]).status, 2, '缺 id 是参数错');
  });
});

describe('t411 ④ 与老路径同口径的载荷字段（envelope data 不许走形）', () => {
  it('today：items/total/date/kpi 都在，kpi 四格是数', () => {
    const env = JSON.parse(run(['bill.record.today', '--params', P({ date: '2026-09-06' })]).stdout);
    assert.equal(env.data.date, '2026-09-06');
    assert.equal(typeof env.data.total, 'number');
    for (const k of ['count', 'expense', 'income', 'net']) {
      assert.equal(typeof env.data.kpi[k], 'number', 'kpi.' + k);
    }
    assert.equal(env.data.kpi.count, 2);
  });
  it('range：start/end 回填；search：kind 回填；recent：date=recent', () => {
    const r = JSON.parse(run(['bill.record.range', '--params', P({ start: '2026-09-01', end: '2026-09-30' })]).stdout);
    assert.equal(r.data.start, '2026-09-01');
    assert.equal(r.data.end, '2026-09-30');
    const s = JSON.parse(run(['bill.record.search', '--params', P({ kind: 'debt' })]).stdout);
    assert.equal(s.data.kind, 'debt');
    const n = JSON.parse(run(['bill.record.today', '--params', P({ recent: true })]).stdout);
    assert.equal(n.data.date, 'recent');
  });
});
