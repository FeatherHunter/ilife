// t415 详情页锁：bill.record.detail 查账单详情（专属版式）
// 判据五组：
//   ① 存在 id 整页：字段 10 列全可见＋金额两位小数＝载荷数值＋金额卡＋状态卡（正常 ok）＋复制区＋页标记；
//   ② 软删三态：同 id 正常→撤销后（整页＋已撤销 danger＋删除时间原值＋已撤销胶囊）→恢复后（正常）；
//   ③ 红线：缺 id／坏 id→exit 2 且 stdout 空，真无此号→exit 4 且 stdout 空（不冒充正常）；
//   ④ 路由回归：查账单→today，查账单详情→detail，含两词的长句走长者（最长匹配）；
//   ⑤ 真跑：每条 exit 0＋shape detail＋H1 查账单详情＋KPI 两格（整段开标签计数）＋字段表一张 11 行。
//
// 计数纪律：判别性标记一律数整段开标签（t411 M1 假绿教训：裸子串会命中 CSS 选择器名）。
// 红线：只读临时库；只往临时目录写 --html 产物。
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { routeWakeword } from '../dist/triggers/wakeTable.js';

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
/** 跑一次查询并把整页读回来。 */
function page(key, params, name) {
  const file = join(OUT, name + '.html');
  const r = run([key, '--params', P(params), '--html', file]);
  assert.equal(r.status, 0, key + ' ' + P(params) + ' 应 exit 0：' + r.stderr);
  assert.ok(existsSync(file), '产物应落盘：' + file);
  return { text: readFileSync(file, 'utf8'), stdout: r.stdout, file };
}
/** 整段开标签计数（禁裸子串）。 */
function countTag(text, tag) {
  return (text.split(tag).length - 1);
}
const H1 = (w) => '<h1 class="ilife-block-page-shell-title">' + w + '</h1>';
const KPI_TAG = '<div class="ilife-block ilife-block-kpi-card">';
const TABLE_TAG = '<table class="ilife-block-data-table-table">';
const BADGE_OK = '<span class="ilife-status-badge ilife-status-badge-ok">';
const BADGE_DANGER = '<span class="ilife-status-badge ilife-status-badge-danger">';

let ID1 = 1;
let ID2 = 2;

before(() => {
  DB = mkdtempSync(join(tmpdir(), 't415-db-'));
  OUT = mkdtempSync(join(tmpdir(), 't415-html-'));
  const seed = [
    { category: '餐饮/外卖/午餐', amount: -35.5, time: '2026-09-06 12:00:00', note: 't415午饭 #工作餐', account: '支付宝', ledger: '生活', currency: '人民币' },
    { category: '工资/基本工资', amount: 8000.25, time: '2026-09-06 09:00:00', note: 't415工资', account: '银行卡', ledger: '工资', currency: '人民币' },
  ];
  for (const s of seed) assert.equal(run(['bill.record.add', '--params', P(s)]).status, 0, '样本应写进临时库：' + P(s));
  const probe = JSON.parse(run(['bill.record.search', '--params', P({ q: 't415午饭' })]).stdout);
  assert.equal(probe.data.total, 1);
  ID1 = probe.data.items[0].id;
  const probe2 = JSON.parse(run(['bill.record.search', '--params', P({ q: 't415工资' })]).stdout);
  assert.equal(probe2.data.total, 1);
  ID2 = probe2.data.items[0].id;
});

describe('t415 ① 存在 id 整页：字段全＋金额卡＋状态卡＋复制区', () => {
  it('详情整页 10 列全可见，金额两位小数＝载荷数值，KPI 两格，表 11 行', () => {
    const { text, stdout } = page('bill.record.detail', { id: ID1 }, 't415-detail');
    const env = JSON.parse(stdout);
    assert.equal(env.shape, 'detail');
    assert.equal(env.data.item.id, ID1);
    assert.equal(typeof env.data.item.amount, 'number');
    assert.equal(env.data.item.amount, -35.5);
    assert.equal(typeof env.data.item.created_at, 'string', '载荷应含 created_at（加法式）');
    assert.ok('deleted_at' in env.data.item, '载荷应含 deleted_at（加法式）');
    assert.ok(text.includes(H1('查账单详情')), 'H1 应为查账单详情');
    assert.ok(text.includes('2026-09-06 12:00:00'), '副标题说清时刻');
    assert.ok(text.includes('>记录编号 ' + ID1 + '<'), '编号是胶囊（一枚独立形状）');
    const sub = text.match(/<p class="ilife-block-page-shell-subtitle">([\s\S]*?)<\/p>/);
    assert.ok(sub && !sub[1].includes('·'), '副标题不许有 ·（复制日志载荷里的 · 是机器文本，不算展示）');
    assert.equal(countTag(text, KPI_TAG), 2, '金额卡＋状态卡两格（整段开标签计数）');
    assert.equal(countTag(text, TABLE_TAG), 1, '字段表一张');
    assert.equal(countTag(text, '<tr>'), 11, '表头一行＋字段十行');
    for (const label of ['编号', '时间', '分类', '金额', '账户', '账本', '币种', '备注', '创建时间', '删除时间']) {
      assert.ok(text.includes(label), '字段表该有：' + label);
    }
    assert.ok(text.includes('-35.50'), '金额两位小数文案');
    assert.ok(text.includes('支付宝'), '账户可见');
    assert.ok(text.includes('人民币'), '币种可见（缺省也是读数）');
    assert.ok(text.includes('t415午饭'), '备注可见');
    assert.ok(text.includes(BADGE_OK), '正常态徽 ok（整段开标签）');
    assert.ok(text.includes('正常'), '正常态可见');
    assert.equal(countTag(text, BADGE_DANGER), 0, '正常页无已撤销徽');
    for (const needle of [
      '复制数据',
      '复制日志',
      'bill-cmd-read bill.record.detail',
      '--params',
      'data-key="record.detail"',
      'data-shape="detail"',
    ]) assert.ok(text.includes(needle), '复制区/页标记该有：' + needle);
    assert.ok(text.includes('&quot;id&quot;') || text.includes('"id":' + ID1), '复制命令应带 id 参数（HTML 转义与否皆可）');
    assert.equal(countTag(text, 'data-page='), 1, '整页恰一枚 data-page');
    assert.ok(text.includes('详情 1 笔 · 记录编号 ' + ID1 + ' · 正常'), '复制日志详情口径（非列表话术）');
  });
  it('收入那笔金额卡写收入，载荷数值逐字一致', () => {
    const { text, stdout } = page('bill.record.detail', { id: ID2 }, 't415-detail-income');
    const env = JSON.parse(stdout);
    assert.equal(env.data.item.amount, 8000.25);
    assert.ok(text.includes('8000.25'), '金额两位小数文案＝载荷数值');
    assert.ok(text.includes('收入'), '金额卡说清收入');
    assert.ok(text.includes('银行卡'), '账户可见');
  });
});

describe('t415 ② 软删三态：同 id 正常→撤销后→恢复后', () => {
  it('撤销后查详情仍 exit 0＋已撤销徽＋删除时间原值＋已撤销胶囊', () => {
    assert.equal(run(['bill.record.update', '--params', P({ op: 'undo', id: ID1 })]).status, 0, '撤销应成功');
    const { text, stdout } = page('bill.record.detail', { id: ID1 }, 't415-detail-deleted');
    const env = JSON.parse(stdout);
    assert.equal(env.shape, 'detail');
    assert.equal(env.data.item.id, ID1);
    assert.ok(env.data.item.deleted_at !== null && env.data.item.deleted_at !== '', '载荷 deleted_at 非空');
    assert.ok(text.includes(BADGE_DANGER), '已撤销徽 danger（整段开标签）');
    assert.ok(text.includes('已撤销'), '已撤销可见');
    assert.ok(text.includes(String(env.data.item.deleted_at)), '删除时间原值可见');
    assert.ok(text.includes('>记录编号 ' + ID1 + '<'), '编号胶囊在');
    assert.ok(text.includes('>已撤销<'), '已撤销胶囊在（状态卡徽之外另有一枚）');
    const subDel = text.match(/<p class="ilife-block-page-shell-subtitle">([\s\S]*?)<\/p>/);
    assert.ok(subDel && !subDel[1].includes('·'), '副标题不许有 ·');
    assert.ok(text.includes('详情 1 笔 · 记录编号 ' + ID1 + ' · 已撤销'), '复制日志同步已撤销');
    assert.equal(countTag(text, KPI_TAG), 2, '已撤销页仍两格');
    assert.equal(countTag(text, '<tr>'), 11, '已撤销页仍十行');
  });
  it('恢复后回到正常态（徽 ok＋删除时间占位）', () => {
    assert.equal(run(['bill.record.update', '--params', P({ op: 'restore', id: ID1 })]).status, 0, '恢复应成功');
    const { text, stdout } = page('bill.record.detail', { id: ID1 }, 't415-detail-restored');
    const env = JSON.parse(stdout);
    assert.equal(env.data.item.deleted_at, null, '恢复后 deleted_at 回 NULL');
    assert.ok(text.includes(BADGE_OK), '恢复后正常徽');
    assert.equal(countTag(text, BADGE_DANGER), 0, '恢复后无已撤销徽');
  });
});

describe('t415 ③ 红线：缺 id／坏 id→exit 2，真无此号→exit 4（不冒充正常）', () => {
  it('缺 id→exit 2 且 stdout 空', () => {
    const r = run(['bill.record.detail', '--params', P({})]);
    assert.equal(r.status, 2, r.stderr);
    assert.equal(r.stdout, '', '失败路径 stdout 不吐载荷');
    assert.ok(r.stderr.includes('id'), 'stderr 说清缺 id');
  });
  it('坏 id（0／-1／1.5／"1"）→exit 2 且 stdout 空', () => {
    for (const id of [0, -1, 1.5, '1', null]) {
      const r = run(['bill.record.detail', '--params', P({ id })]);
      assert.equal(r.status, 2, 'id=' + JSON.stringify(id) + '：' + r.stderr);
      assert.equal(r.stdout, '', '失败路径 stdout 不吐载荷');
    }
  });
  it('真无此号→exit 4 且 stdout 空', () => {
    const r = run(['bill.record.detail', '--params', P({ id: 99999 })]);
    assert.equal(r.status, 4, r.stderr);
    assert.equal(r.stdout, '', '失败路径 stdout 不吐载荷');
    assert.ok(r.stderr.includes('无此账单'), 'stderr 说清无此号');
  });
});

describe('t415 ④ 路由回归：查账单与查账单详情互不吞词（最长匹配）', () => {
  it('查账单→today，查账单详情→detail', () => {
    assert.equal(routeWakeword('查账单', {}).key, 'bill.record.today');
    assert.equal(routeWakeword('查账单详情', { id: 1 }).key, 'bill.record.detail');
  });
  it('含两词的长句走长者', () => {
    assert.equal(routeWakeword('帮我查账单详情里的那笔', { id: 1 }).key, 'bill.record.detail');
    assert.equal(routeWakeword('查账单', {}).key, 'bill.record.today', '短词不反吞长词');
  });
});
