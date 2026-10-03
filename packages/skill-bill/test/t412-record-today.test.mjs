// t412 时间页锁：bill.record.today 五词（查今天／查昨天／查某天／查最近／查账单别名）
// 判据三组：
//   ① 标题按参判：无参→查今天／yesterday→查昨天／显式 date→查某天／recent→查最近；查账单别名同页（无参同标题）。
//   ② 空态四句：今天还没有记录／昨天还没有记录／这一天没有记录／库里还没有记录（各带下一步 hint）。
//   ③ 回归锁定：详情不被吞／查某天缺 date 路由抛／recent 越界 exit2／12:00 补时可查到。
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
let EMPTY_DB = '';
let OUT = '';
const P = (o) => JSON.stringify(o);
function runWith(db, args) {
  return spawnSync(NODE, [bin, ...args], { cwd: here, encoding: 'utf8', env: billEnv(db) });
}
function run(args) {
  return runWith(DB, args);
}
/** 跑一次查询并把整页读回来（指定库）。 */
function pageOn(db, key, params, name) {
  const file = join(OUT, name + '.html');
  const r = runWith(db, [key, '--params', P(params), '--html', file]);
  assert.equal(r.status, 0, key + ' ' + P(params) + ' 应 exit 0：' + r.stderr);
  assert.ok(existsSync(file), '产物应落盘：' + file);
  return { text: readFileSync(file, 'utf8'), stdout: r.stdout, file };
}
function page(key, params, name) {
  return pageOn(DB, key, params, name);
}
/** 整段开标签计数（禁裸子串）。 */
function countTag(text, tag) {
  return (text.split(tag).length - 1);
}

before(() => {
  const today = new Date().toISOString().slice(0, 10);
  DB = mkdtempSync(join(tmpdir(), 't412-db-'));
  EMPTY_DB = mkdtempSync(join(tmpdir(), 't412-empty-'));
  OUT = mkdtempSync(join(tmpdir(), 't412-html-'));
  const seed = [
    { category: '餐饮/外卖/午餐', amount: -35, time: today + ' 12:00:00', note: '今天午饭', account: '支付宝' },
    { category: '餐饮/外卖/午餐', amount: -35, time: '2026-09-06 12:00:00', note: '午饭 #工作餐', account: '支付宝' },
    { category: '餐饮/堂食/晚餐', amount: -58, time: '2026-09-06 19:00:00', note: '晚饭', account: '微信' },
    { category: '工资/基本工资', amount: 8000, time: '2026-09-01 09:00:00', note: '9月工资' },
  ];
  for (const s of seed) assert.equal(run(['bill.record.add', '--params', P(s)]).status, 0, '样本应写进临时库');
});

describe('t412 ① 标题按参判（五词四态＋别名同页）', () => {
  it('无参→查今天（w01 票据纸 v2.1：店头＋H2 今天句式＋票据纸，载荷键不动）', () => {
    const { text, stdout } = page('bill.record.today', {}, 't412-today');
    const env = JSON.parse(stdout);
    assert.equal(env.shape, 'list');
    assert.ok(env.data.date, '无参也回填 date（今天）');
    assert.ok(text.includes('饼干记账 · 查今天'), '店头品牌行应为查今天');
    // 笔数取值源＝kpi.count（收支口径，转账不计；#1110 起两处笔数各标口径，本样本无转账故无注记）。
    assert.ok(text.includes('今天共 ' + env.data.kpi.count + ' 笔，支出 '), 'H2 今天句式（含笔数与支出）');
    assert.ok(text.includes('查账单和查今天是一样的。'), '别名注（w01 v2.1 逐字）');
    assert.ok(text.includes('<section class="ilife-block-sheet is-ticket">'), '票据纸一枚');
    assert.ok(text.includes('复制数据'), '复制区');
    assert.ok(text.includes('✂ 裁切线'), '裁切线');
    assert.ok(!text.includes('<h1 class="ilife-block-page-shell-title">'), '票据纸不出老列表 H1');
    for (const k of ['items', 'total', 'date', 'kpi']) assert.ok(k in env.data, '载荷键不动：' + k);
  });
  it('date=yesterday→查昨天（w02 票据纸 v2.1：店头＋H2 昨天句式＋票据纸，载荷键不动）', () => {
    // 有数昨天：先补一笔昨天，再查昨天应为查昨天且有数
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const ys = y.toISOString().slice(0, 10);
    const add = run(['bill.record.add', '--params', P({ category: '餐饮/外卖/午餐', amount: -20, time: ys + ' 12:00:00', note: '昨天午饭' })]);
    assert.equal(add.status, 0);
    const { text, stdout } = page('bill.record.today', { date: 'yesterday' }, 't412-yesterday');
    const env = JSON.parse(stdout);
    assert.equal(env.data.date, ys, 'yesterday 应解析为昨天日期串');
    assert.ok(text.includes('饼干记账 · 查昨天'), '店头品牌行应为查昨天');
    // 同查今天：笔数取 kpi.count（#1110），本样本无转账故字面不含注记。
    assert.ok(text.includes('昨天 ' + env.data.kpi.count + ' 笔，支出 '), 'H2 昨天句式（含笔数与支出）');
    assert.ok(!text.includes('查账单和查今天是一样的。'), '无别名注（w02 原型无此行，w01 专属）');
    assert.ok(text.includes('<section class="ilife-block-sheet is-ticket">'), '票据纸一枚');
    assert.ok(text.includes('复制数据'), '复制区');
    assert.ok(text.includes('✂ 裁切线'), '裁切线');
    assert.ok(!text.includes('<h1 class="ilife-block-page-shell-title">'), '票据纸不出老列表 H1');
    for (const k of ['items', 'total', 'date', 'kpi']) assert.ok(k in env.data, '载荷键不动：' + k);
  });
  it('显式 date→查某天（GAP-T1）', () => {
    const { text, stdout } = page('bill.record.today', { date: '2026-09-06' }, 't412-someday');
    const env = JSON.parse(stdout);
    assert.equal(env.data.date, '2026-09-06');
    assert.equal(env.data.total, 2, '样本那天两笔');
    assert.ok(text.includes('饼干记账 · 查某天'), '店头品牌行应为查某天');
    assert.ok(text.includes('共 2 笔'), 'H2 聚合句（如查某天共 2 笔）');
    assert.ok(text.includes('sheet-frame'), '有数走票据纸');
  });
  it('recent→查最近（票据纸：店头＋窗口句＋票据纸，载荷键不动）', () => {
    const { text, stdout } = page('bill.record.today', { recent: true, limit: 2 }, 't412-recent');
    assert.equal(JSON.parse(stdout).data.total, 2);
    assert.ok(text.includes('饼干记账 · 查最近'), '店头品牌行应为查最近');
    assert.ok(text.includes('最近 2 笔'), '窗口说清条数');
    assert.ok(text.includes('<section class="ilife-block-sheet is-ticket">'), '票据纸一枚');
    assert.ok(text.includes('sheet-frame'), '有数走票据纸');
    assert.ok(text.includes('复制数据'), '复制区');
    assert.ok(text.includes('✂ 裁切线'), '裁切线');
    assert.ok(text.includes('<div class="ilife-recent-foot">饼干记账 · 查最近</div>'), '页脚查最近');
    assert.ok(!text.includes('<h1 class="ilife-block-page-shell-title">'), '票据纸不出老列表 H1');
  });
  it('查账单别名同页：同无参同标题查今天', () => {
    assert.equal(routeWakeword('帮我查账单').key, 'bill.record.today', '查账单路由到 today');
    const { text } = page('bill.record.today', {}, 't412-alias');
    assert.ok(text.includes('饼干记账 · 查今天'), '别名页仍为查今天票据纸（Q2 别名同页）');
  });
});

describe('t412 ② 空态四句（空库上四态各一句）', () => {
  it('今天空：今天还没有记录', () => {
    const { text, stdout } = pageOn(EMPTY_DB, 'bill.record.today', {}, 't412-empty-today');
    assert.equal(JSON.parse(stdout).data.total, 0);
    assert.equal(JSON.parse(stdout).shape, 'list');
    assert.ok(text.includes('今天还没有记录'), '今天空文案');
    assert.ok(text.includes('要记一笔就说「记支出」。'), '今天空 hint');
    assert.equal(countTag(text, '<section class="ilife-block ilife-block-empty-block">'), 1, '空态块恰一枚（整段开标签）');
    assert.equal(countTag(text, '<div class="ilife-block ilife-block-kpi-card">'), 4, '空态页仍有 KPI 行四格');
    assert.equal(countTag(text, '<table class="ilife-block-data-table-table">'), 0, '空态页无数据表');
  });
  it('昨天空：昨天还没有记录', () => {
    const { text, stdout } = pageOn(EMPTY_DB, 'bill.record.today', { date: 'yesterday' }, 't412-empty-yesterday');
    assert.equal(JSON.parse(stdout).data.total, 0);
    assert.ok(text.includes('昨天还没有记录'), '昨天空文案（内核点名的昨天无账空文案）');
    assert.ok(text.includes('要补昨天那笔就说「记支出」。'), '昨天空 hint');
    assert.equal(countTag(text, '<section class="ilife-block ilife-block-empty-block">'), 1, '空态块恰一枚');
  });
  it('某天空：这一天没有记录（t411 通用句沿用，显式 date 子情形）', () => {
    const { text, stdout } = pageOn(EMPTY_DB, 'bill.record.today', { date: '2020-01-01' }, 't412-empty-someday');
    assert.equal(JSON.parse(stdout).data.total, 0);
    assert.ok(text.includes('这一天没有记录'), '某天空文案（与 t411 :141-146 同句）');
    assert.ok(text.includes('换个日子再查一次'), '某天空 hint 已摘自指（不说查某天）');
    assert.ok(!text.includes('换个日子可以说「查某天」'), '某天空 hint 不得自指查某天');
    assert.equal(countTag(text, '<section class="ilife-block ilife-block-empty-block">'), 1, '空态块恰一枚');
  });
  it('最近空：库里还没有记录', () => {
    const { text, stdout } = pageOn(EMPTY_DB, 'bill.record.today', { recent: true }, 't412-empty-recent');
    assert.equal(JSON.parse(stdout).data.total, 0);
    assert.ok(text.includes('库里还没有记录'), '最近空文案');
    assert.equal(countTag(text, '<section class="ilife-block ilife-block-empty-block">'), 1, '空态块恰一枚');
  });
});

describe('t412 ③ 回归锁定（详情不被吞／缺槽／越界／补时）', () => {
  it('详情不被吞：查账单详情走 detail（最长匹配）', () => {
    assert.equal(routeWakeword('查账单详情', { id: 1 }).key, 'bill.record.detail');
    assert.equal(routeWakeword('查账单').key, 'bill.record.today');
    assert.equal(routeWakeword('帮我查账单详情看看', { id: 2 }).key, 'bill.record.detail', '长句含详情仍走 detail');
    const s = page('bill.record.search', { q: '午饭' }, 't412-detail-src');
    const id = JSON.parse(s.stdout).data.items[0].id;
    const d = page('bill.record.detail', { id }, 't412-detail');
    assert.equal(JSON.parse(d.stdout).data.item.id, id);
    assert.ok(d.text.includes('data-shape="detail"'), '详情页形状仍是 detail');
    assert.ok(d.text.includes('饼干记账 · 账单详情'), '店头品牌行应为账单详情');
    assert.ok(d.text.includes('<section class="ilife-block-sheet is-ticket">'), '详情走票据纸（不被列表页吞）');
    assert.ok(d.text.includes('sheet-frame'), '纸框');
    assert.ok(d.text.includes('<span class="ilife-ticket-sec-no">DETAIL</span>'), '明细段');
    assert.ok(d.text.includes('<span class="ilife-ticket-sec-no">CHECK</span>'), '对账段');
    assert.ok(d.text.includes('✂ 裁切线'), '裁切线');
    assert.ok(!d.text.includes('<h1 class="ilife-block-page-shell-title">'), '票据纸不出老列表 H1');
  });
  it('查某天缺 date 路由抛（反问入口）', () => {
    assert.throws(() => routeWakeword('查某天', {}), /缺槽位 date/);
    try {
      routeWakeword('查某天', {});
      assert.fail('应抛');
    } catch (e) {
      assert.equal(e.name, 'BillPolicyError');
    }
  });
  it('recent 越界 exit2（0／201／非整数）', () => {
    for (const limit of [0, 201, 1.5, '10']) {
      const r = run(['bill.record.today', '--params', P({ recent: true, limit })]);
      assert.equal(r.status, 2, 'limit=' + String(limit) + ' 应 exit2：' + r.stderr);
      assert.equal(r.stdout, '', '失败路径 stdout 不吐载荷');
    }
  });
  it('12:00 补时可查到：只给日期记一笔，查那天能查到且时刻为 12:00:00', () => {
    const add = run(['bill.record.add', '--params', P({ category: '餐饮/外卖/午餐', amount: -42, time: '2026-09-07', note: '补时那笔' })]);
    assert.equal(add.status, 0, '日期缺时分应补 12:00：' + add.stderr);
    const r = run(['bill.record.today', '--params', P({ date: '2026-09-07' })]);
    assert.equal(r.status, 0);
    const env = JSON.parse(r.stdout);
    assert.ok(env.data.total >= 1, '补时那笔应被当天窗口查到');
    assert.ok(env.data.items.some((x) => String(x.time) === '2026-09-07 12:00:00'), '库里时刻应为 12:00:00');
  });
});
