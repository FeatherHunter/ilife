// t414 搜索页锁：bill.record.search 五词（搜备注／查标签／查欠款／查待报销／查分期）
// 判据六组：
//   ① 搜备注：单 token 命中 2 笔、双 token AND 只剩 1 笔（token 与关系）；kind 回填 search:<词>；
//   ② 查标签：精确匹配双向回归（tag 旅行只命中 #旅行、tag 旅行计划只命中 #旅行计划，各 1 笔；无 # 对照不命中）；
//   ③ 三支口径：查欠款（借贷/或#未还精确，且排除#已还，子串#未还款不计）／查待报销（#待报销精确排除#已报销，
//      子串#待报销单不计）／查分期（分期/分类或#分期/#分期中精确，子串#分期付款不计）；
//   ④ 红线：{}→2 且 stdout 空、kind tag 缺 tag→2、q 空串/全空格→2、tag 空串→2（空查询不返全量）；
//   ⑤ 空结果：tag 不存在的标签→exit 0＋total 0＋空态句＋空态块＋复制数据/日志＋命令原文＋data-key（不断言失败）；
//   ⑥ 五词逐条真跑：每词 exit 0＋shape list＋H1 唤醒词＋KPI 四格（整段开标签计数）。
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
import { billEnv } from './helpers/config-base.mjs';

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
  return spawnSync(NODE, [bin, ...args], { cwd: here, encoding: 'utf8', env: billEnv(DB, envExtra) });
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
const EMPTY_TAG = '<section class="ilife-block ilife-block-empty-block">';

before(() => {
  DB = mkdtempSync(join(tmpdir(), 't414-db-'));
  OUT = mkdtempSync(join(tmpdir(), 't414-html-'));
  const seed = [
    // 搜备注组（q1/q2：单 token 2 笔，双 token AND 1 笔）
    { category: '餐饮/外卖/午餐', amount: -35, time: '2026-09-06 12:00:00', note: 't414午饭 #工作餐', account: '支付宝', ledger: '生活' },
    { category: '餐饮/外卖/午餐', amount: -42, time: '2026-09-06 13:00:00', note: 't414午饭 加班', account: '微信', ledger: '生活' },
    // 查标签组（t1 #旅行计划／t2 #旅行／t3 无#对照）
    { category: '玩乐/旅行/订金', amount: -200, time: '2026-09-05 10:00:00', note: '#旅行计划 订金', account: '支付宝', ledger: '生活' },
    { category: '玩乐/门票', amount: -80, time: '2026-09-05 11:00:00', note: '#旅行 门票', account: '微信', ledger: '生活' },
    { category: '玩乐/旅行', amount: -10, time: '2026-09-05 12:00:00', note: '旅行计划讨论', account: '现金', ledger: '生活' },
    // 查欠款组（d1 正例 #未还／d2 已还对照 #已还／d3 负例／d4 子串对照 #未还款）
    { category: '借贷/借出', amount: -500, time: '2026-09-04 10:00:00', note: '借小明 #未还', account: '支付宝', ledger: '生活' },
    { category: '借贷/借出', amount: -300, time: '2026-09-03 10:00:00', note: '借小红 #已还', account: '支付宝', ledger: '生活' },
    { category: '餐饮/外卖/午餐', amount: -25, time: '2026-09-06 14:00:00', note: '普通午饭', account: '微信', ledger: '生活' },
    { category: '餐饮/外卖/午餐', amount: -30, time: '2026-09-06 15:00:00', note: '垫钱 #未还款 待收', account: '微信', ledger: '生活' },
    // 查待报销组（r1 正例／r2 已报销对照／r3 子串对照 #待报销单）
    { category: '出行/交通', amount: -120, time: '2026-09-02 10:00:00', note: '出差打车 #待报销', account: '支付宝', ledger: '生活' },
    { category: '出行/住宿', amount: -300, time: '2026-09-01 10:00:00', note: '出差住宿 #已报销', account: '支付宝', ledger: '生活' },
    { category: '出行/交通', amount: -50, time: '2026-09-02 11:00:00', note: '发票 #待报销单 附件', account: '微信', ledger: '生活' },
    // 查分期组（i1 分类／i2 #分期／i3 #分期中／i4 子串对照 #分期付款）
    { category: '分期/手机', amount: -200, time: '2026-09-06 10:00:00', note: '手机分期 第1期', account: '支付宝', ledger: '生活' },
    { category: '玩乐/数码', amount: -150, time: '2026-09-06 11:00:00', note: '耳机 #分期', account: '微信', ledger: '生活' },
    { category: '玩乐/数码', amount: -150, time: '2026-09-06 12:00:00', note: '手表 #分期中', account: '微信', ledger: '生活' },
    { category: '玩乐/数码', amount: -200, time: '2026-09-06 13:00:00', note: '电脑 #分期付款 12期', account: '微信', ledger: '生活' },
  ];
  for (const s of seed) assert.equal(run(['bill.record.add', '--params', P(s)]).status, 0, '样本应写进临时库：' + P(s));
});

describe('t414 ① 搜备注：token 与关系（AND）', () => {
  it('单 token t414午饭命中 2 笔，kind 回填 search:，H1 搜备注', () => {
    const { text, stdout } = page('bill.record.search', { q: 't414午饭' }, 't414-q');
    const env = JSON.parse(stdout);
    assert.equal(env.shape, 'list');
    assert.equal(env.data.total, 2);
    assert.equal(env.data.kind, 'search:t414午饭');
    assert.ok(text.includes(H1('搜备注')), 'H1 应为搜备注');
    assert.ok(text.includes('备注里有「t414午饭」的记录'), '窗口说清关键词');
    assert.equal(countTag(text, KPI_TAG), 4, 'KPI 行四格（整段开标签计数）');
    assert.equal(countTag(text, TABLE_TAG), 1, '有数应有数据表一张');
  });
  it('双 token AND：t414午饭 工作餐只剩 1 笔（#工作餐那笔）', () => {
    const { stdout } = page('bill.record.search', { q: 't414午饭 工作餐' }, 't414-q-and');
    const env = JSON.parse(stdout);
    assert.equal(env.data.total, 1, '两 token 须同时命中');
    assert.ok(String(env.data.items[0].note).includes('#工作餐'));
  });
});

describe('t414 ② 查标签：精确匹配双向回归（旅行 vs 旅行计划）', () => {
  it('tag 旅行只命中 #旅行（1 笔），不命中 #旅行计划，不命中无#对照', () => {
    const { text, stdout } = page('bill.record.search', { kind: 'tag', tag: '旅行' }, 't414-tag-short');
    const env = JSON.parse(stdout);
    assert.equal(env.shape, 'list');
    assert.equal(env.data.total, 1);
    assert.equal(env.data.kind, 'tag:旅行');
    assert.ok(String(env.data.items[0].note).includes('#旅行 门票'));
    assert.ok(text.includes(H1('查标签')), 'H1 应为查标签');
    assert.ok(text.includes('标签 旅行（精确匹配）'), '窗口说清精确匹配');
    assert.equal(countTag(text, KPI_TAG), 4, 'KPI 行四格');
  });
  it('tag 旅行计划只命中 #旅行计划（1 笔），不命中 #旅行', () => {
    const { stdout } = page('bill.record.search', { kind: 'tag', tag: '旅行计划' }, 't414-tag-long');
    const env = JSON.parse(stdout);
    assert.equal(env.data.total, 1);
    assert.equal(env.data.kind, 'tag:旅行计划');
    assert.ok(String(env.data.items[0].note).includes('#旅行计划 订金'));
  });
});

describe('t414 ③ 三支按 #tag 流转口径（欠款／待报销／分期）', () => {
  it('查欠款：只剩 #未还那笔（1 笔）；#已还与 #未还款子串不计', () => {
    const { text, stdout } = page('bill.record.search', { kind: 'debt' }, 't414-debt');
    const env = JSON.parse(stdout);
    assert.equal(env.shape, 'list');
    assert.equal(env.data.total, 1, 'd1 唯一正例');
    assert.equal(env.data.kind, 'debt');
    assert.ok(String(env.data.items[0].note).includes('#未还'));
    assert.ok(text.includes(H1('查欠款')), 'H1 应为查欠款');
    assert.ok(text.includes('还欠着的那些账'), '窗口说清未还口径');
    assert.equal(countTag(text, KPI_TAG), 4, 'KPI 行四格');
  });
  it('查待报销：只剩 #待报销那笔（1 笔）；#已报销与 #待报销单不计', () => {
    const { text, stdout } = page('bill.record.search', { kind: 'reimburse' }, 't414-reimburse');
    const env = JSON.parse(stdout);
    assert.equal(env.shape, 'list');
    assert.equal(env.data.total, 1, 'r1 唯一正例');
    assert.equal(env.data.kind, 'reimburse');
    assert.ok(String(env.data.items[0].note).includes('#待报销'));
    assert.ok(text.includes(H1('查待报销')), 'H1 应为查待报销');
    assert.ok(text.includes('等着报销的那些账'), '窗口说清待报销口径');
  });
  it('查分期：分类＋#分期＋#分期中（3 笔）；#分期付款子串不计', () => {
    const { text, stdout } = page('bill.record.search', { kind: 'installment' }, 't414-installment');
    const env = JSON.parse(stdout);
    assert.equal(env.shape, 'list');
    assert.equal(env.data.total, 3, 'i1 分类＋i2 #分期＋i3 #分期中');
    assert.equal(env.data.kind, 'installment');
    assert.ok(text.includes(H1('查分期')), 'H1 应为查分期');
    assert.ok(text.includes('分期还款的那些账'), '窗口说清分期口径');
    const notes = env.data.items.map((x) => String(x.note)).join('\n');
    assert.ok(!notes.includes('#分期付款'), '子串对照不得混入');
  });
});

describe('t414 ④ 红线：空查询不返全量（exit 2 且 stdout 空）', () => {
  it('{} 既没 q 也没 kind → exit 2', () => {
    const r = run(['bill.record.search', '--params', P({})]);
    assert.equal(r.status, 2, r.stderr);
    assert.equal(r.stdout, '', '失败路径 stdout 不吐载荷');
  });
  it('kind tag 缺 tag → exit 2', () => {
    assert.equal(run(['bill.record.search', '--params', P({ kind: 'tag' })]).status, 2);
  });
  it('q 空串／全空格 → exit 2（不返全量）', () => {
    for (const q of ['', '   ']) {
      const r = run(['bill.record.search', '--params', P({ q })]);
      assert.equal(r.status, 2, 'q=' + JSON.stringify(q) + '：' + r.stderr);
      assert.equal(r.stdout, '', '失败路径 stdout 不吐载荷');
    }
  });
  it('tag 空串 → exit 2', () => {
    const r = run(['bill.record.search', '--params', P({ kind: 'tag', tag: '' })]);
    assert.equal(r.status, 2, r.stderr);
    assert.equal(r.stdout, '', '失败路径 stdout 不吐载荷');
  });
});

describe('t414 ⑤ 空结果：exit 0 空态＋复制区正常出（不断言失败）', () => {
  it('tag 不存在的标签→exit 0＋total 0＋空态句＋空态块＋复制区', () => {
    const { text, stdout } = page('bill.record.search', { kind: 'tag', tag: '不存在的标签' }, 't414-empty');
    const env = JSON.parse(stdout);
    assert.equal(env.shape, 'list');
    assert.equal(env.data.total, 0);
    assert.equal(env.data.kind, 'tag:不存在的标签');
    assert.ok(text.includes('没有找到符合条件的记录'), '空态句');
    assert.ok(text.includes('换个关键词'), '空态引导');
    assert.equal(countTag(text, EMPTY_TAG), 1, '空态块一枚（整段开标签计数）');
    assert.equal(countTag(text, KPI_TAG), 4, '零行仍有 KPI 行四格');
    assert.equal(countTag(text, TABLE_TAG), 0, '零行无数据表');
    for (const needle of [
      '复制数据',
      '复制日志',
      'bill-cmd-read bill.record.search',
      'data-key="record.search"',
      'data-shape="list"',
    ]) assert.ok(text.includes(needle), '复制区/页标记该有：' + needle);
    assert.ok(!text.includes('t414午饭'), '空页不得倒出全量（无种子备注）');
    assert.ok(!text.includes('#旅行'), '空页不得倒出全量（无种子标签）');
    assert.ok(stdout.length < 2000, '空命中 stdout 只有 envelope（字节数量级 envelope，实得 ' + stdout.length + '）');
  });
});
