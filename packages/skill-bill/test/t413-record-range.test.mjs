// t413 区间页锁：bill.record.range 六词（查周／查月／查区间／查分类／查账户／查账本）
// 判据五组：
//   ① 查周／查月：显式 today 锚点＋截到锚点（end==锚点，非周日／月末）＋ BILL_TODAY 环境 pin 同窗；
//   ② 查区间：start+end 同给真跑；单缺一起→exit 2；start>end→exit 2；空区间→exit 4；
//   ③ 查分类：L1 无斜杠命中下级（餐饮→3 笔）／L2 命中子树（2 笔）／L3 精确（1 笔）；失败路径不断言；
//   ④ 查账户／查账本：只过滤（行集按值过滤，KPI 照窗内收支、转账除外）；余额无关探针（无 balance 字段，
//      账本＝转账两笔全是转账故 KPI 全零）；
//   ⑤ 缺参阻断：空串／全空格→exit 2（空串不退化成全量）；全缺→exit 2（t411 已锁，不复测）。
//
// 计数纪律：判别性标记一律数整段开标签（t411 M1 假绿教训：裸子串会命中 CSS 选择器名）。
// 日期纪律：种子与锚点一律相对日期（今天／本周一／周三／月初 05），不写死种子日期（与卡路里 #250 对齐）。
// 红线：只读临时库；只往临时目录写 --html 产物。
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, '..', 'dist', 'cli', 'cmd_read.js');
const NODE = [process.env.npm_node_execpath, 'node', process.execPath]
  .filter(Boolean)
  .find((c) => {
    const p = spawnSync(c, ['--version'], { encoding: 'utf8' });
    return p.status === 0 && /^v\d+/.test((p.stdout || '').trim());
  }) ?? process.execPath;

// —— 相对日期（UTC，与源码 rangeAnchor 同口径） ——
const DAY = 86400000;
const isoOf = (t) => new Date(t).toISOString().slice(0, 10);
const nowT = Date.parse(new Date().toISOString().slice(0, 10) + 'T12:00:00Z');
const today = isoOf(nowT);
const back = (new Date(nowT).getUTCDay() + 6) % 7;
const monday = isoOf(nowT - back * DAY);
const wed = isoOf(nowT + (2 - back) * DAY); // 本周三（恒≠周日，截断锁用它）
const sunday = isoOf(nowT + (6 - back) * DAY);
const m01 = today.slice(0, 8) + '01';
const m05 = today.slice(0, 8) + '05'; // 本月 05（恒≠月末，截断锁用它）
const yest = isoOf(nowT - DAY);

let DB = '';
let OUT = '';
const P = (o) => JSON.stringify(o);
function runWith(db, args, envExtra) {
  return spawnSync(NODE, [bin, ...args], { cwd: here, encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: db, ...(envExtra || {}) } });
}
function run(args, envExtra) {
  return runWith(DB, args, envExtra);
}
/** 跑一次查询并把整页读回来（指定库＋可选环境）。 */
function pageOn(db, key, params, name, envExtra) {
  const file = join(OUT, name + '.html');
  const r = runWith(db, [key, '--params', P(params), '--html', file], envExtra);
  assert.equal(r.status, 0, key + ' ' + P(params) + ' 应 exit 0：' + r.stderr);
  assert.ok(existsSync(file), '产物应落盘：' + file);
  return { text: readFileSync(file, 'utf8'), stdout: r.stdout, file };
}
function page(key, params, name, envExtra) {
  return pageOn(DB, key, params, name, envExtra);
}
/** 整段开标签计数（禁裸子串）。 */
function countTag(text, tag) {
  return (text.split(tag).length - 1);
}
const H1 = (w) => '<h1 class="ilife-block-page-shell-title">' + w + '</h1>';
const KPI_TAG = '<div class="ilife-block ilife-block-kpi-card">';
const TABLE_TAG = '<table class="ilife-block-data-table-table">';

before(() => {
  DB = mkdtempSync(join(tmpdir(), 't413-db-'));
  OUT = mkdtempSync(join(tmpdir(), 't413-html-'));
  const seed = [
    { category: '餐饮', amount: -20, time: today + ' 12:00:00', account: '支付宝', ledger: '生活', note: 't413-锚日L1' },
    { category: '餐饮/外卖/午餐', amount: -35, time: monday + ' 12:00:00', account: '支付宝', ledger: '生活', note: 't413-周初L3' },
    { category: '餐饮/外卖', amount: -15, time: isoOf(nowT + (1 - back) * DAY) + ' 12:00:00', account: '微信', ledger: '生活', note: 't413-L2' },
    { category: '工资/基本工资', amount: 8000, time: m05 + ' 09:00:00', account: '银行卡', ledger: '生活', note: 't413-月内收入' },
    { category: '转账/转出', amount: -100, time: today + ' 12:00:00', account: '支付宝', ledger: '转账', note: 't413-转出' },
    { category: '转账/转入', amount: 100, time: today + ' 12:00:00', account: '微信', ledger: '转账', note: 't413-转入' },
    { category: '健康/运动', amount: -50, time: wed + ' 12:00:00', account: '现金', ledger: '生活', note: 't413-周中' },
    { category: '学习/书籍', amount: -60, time: m05 + ' 12:00:00', account: '现金', ledger: '生活', note: 't413-月初5' },
  ];
  for (const s of seed) assert.equal(run(['bill.record.add', '--params', P(s)]).status, 0, '样本应写进临时库：' + P(s));
});

describe('t413 ① 查周：锚点周一..锚点（截到锚点，非周日）', () => {
  it('显式 today=今天：窗口 周一~今天（本周），有数', () => {
    const { text, stdout } = page('bill.record.range', { range: 'week', today }, 't413-week');
    const env = JSON.parse(stdout);
    assert.equal(env.shape, 'list');
    assert.equal(env.data.start, monday);
    assert.equal(env.data.end, today);
    assert.ok(env.data.total >= 3, '今天三笔（L1＋转出＋转入）恒在窗内，实得 ' + env.data.total);
    assert.ok(text.includes(H1('查周')), 'H1 应为查周');
    assert.ok(text.includes(monday + ' ~ ' + today + '（本周）'), '窗口说清起止＋本周');
    assert.equal(countTag(text, KPI_TAG), 4, 'KPI 行四格（整段开标签计数）');
    assert.equal(countTag(text, TABLE_TAG), 1, '有数应有数据表一张');
  });
  it('截断锁定：today=周三 → end==周三（不是周日）', () => {
    const { text, stdout } = page('bill.record.range', { range: 'week', today: wed }, 't413-week-trunc');
    const env = JSON.parse(stdout);
    assert.equal(env.data.start, monday);
    assert.equal(env.data.end, wed);
    assert.ok(env.data.total >= 3, '周一／周二／周三三笔恒在窗内，实得 ' + env.data.total);
    assert.ok(text.includes(monday + ' ~ ' + wed + '（本周）'), '窗口 end 应为锚点');
    assert.ok(!text.includes(monday + ' ~ ' + sunday), '窗口 end 不得是周日（旧整周口径已退）');
  });
  it('环境 pin：BILL_TODAY=周三（不传 today）同窗', () => {
    const { stdout } = page('bill.record.range', { range: 'week' }, 't413-week-pin', { BILL_TODAY: wed });
    const env = JSON.parse(stdout);
    assert.equal(env.data.start, monday, '环境 pin 应与显式锚点同窗');
    assert.equal(env.data.end, wed);
  });
});

describe('t413 ② 查月：锚点月初..锚点（截到锚点，非月末）', () => {
  it('显式 today=今天：窗口 月初~今天（本月），有数', () => {
    const { text, stdout } = page('bill.record.range', { range: 'month', today }, 't413-month');
    const env = JSON.parse(stdout);
    assert.equal(env.data.start, m01);
    assert.equal(env.data.end, today);
    assert.ok(env.data.total >= 3, '今天三笔恒在窗内，实得 ' + env.data.total);
    assert.ok(text.includes(H1('查月')), 'H1 应为查月');
    assert.ok(text.includes(m01 + ' ~ ' + today + '（本月）'), '窗口说清起止＋本月');
    assert.equal(countTag(text, KPI_TAG), 4, 'KPI 行四格');
  });
  it('截断锁定：today=本月05 → end==05（不是月末）', () => {
    const { stdout } = page('bill.record.range', { range: 'month', today: m05 }, 't413-month-trunc');
    const env = JSON.parse(stdout);
    assert.equal(env.data.start, m01);
    assert.equal(env.data.end, m05);
    assert.ok(env.data.total >= 2, '05 日两笔（收入＋学习）恒在窗内，实得 ' + env.data.total);
  });
});

describe('t413 ③ 查区间：同给真跑＋缺一阻断', () => {
  it('start+end 同给：周一起~今天，有数且回填', () => {
    const { text, stdout } = page('bill.record.range', { start: monday, end: today }, 't413-range');
    const env = JSON.parse(stdout);
    assert.equal(env.data.start, monday);
    assert.equal(env.data.end, today);
    assert.ok(env.data.total >= 2, '周一起与今天两笔恒在窗内，实得 ' + env.data.total);
    assert.ok(text.includes(H1('查区间')), 'H1 应为查区间');
    assert.ok(text.includes(monday + ' ~ ' + today), '窗口说清起止');
    assert.equal(countTag(text, KPI_TAG), 4, 'KPI 行四格');
    assert.equal(countTag(text, TABLE_TAG), 1, '有数应有数据表一张');
  });
  it('缺参阻断：只给 start → exit 2（stdout 不吐载荷）', () => {
    const r = run(['bill.record.range', '--params', P({ start: monday })]);
    assert.equal(r.status, 2, '单缺 start 即用法错：' + r.stderr);
    assert.equal(r.stdout, '', '失败路径 stdout 不吐载荷');
  });
  it('缺参阻断：只给 end → exit 2', () => {
    const r = run(['bill.record.range', '--params', P({ end: today })]);
    assert.equal(r.status, 2, '单缺 end 即用法错：' + r.stderr);
    assert.equal(r.stdout, '', '失败路径 stdout 不吐载荷');
  });
  it('start 晚于 end → exit 2', () => {
    const r = run(['bill.record.range', '--params', P({ start: today, end: yest })]);
    assert.equal(r.status, 2, r.stderr);
  });
  it('空区间 → exit 4（不返空表冒充）', () => {
    assert.equal(run(['bill.record.range', '--params', P({ start: '2020-01-01', end: '2020-01-02' })]).status, 4);
  });
});

describe('t413 ④ 查分类：三级（无 / 视为 L1）', () => {
  it('L1 无斜杠「餐饮」命中本级＋全部下级（3 笔）', () => {
    const { text, stdout } = page('bill.record.range', { category: '餐饮' }, 't413-cat-l1');
    const env = JSON.parse(stdout);
    assert.equal(env.data.total, 3, '餐饮本级 1＋下级 2');
    assert.equal(env.data.start, '', '单条件支 start 回填空串');
    assert.equal(env.data.end, '', '单条件支 end 回填空串');
    assert.ok(text.includes(H1('查分类')), 'H1 应为查分类');
    assert.ok(text.includes('分类＝餐饮（全部时间）'), '窗口说清条件＋全部时间');
    assert.equal(countTag(text, KPI_TAG), 4, 'KPI 行四格');
  });
  it('L2「餐饮/外卖」命中子树（2 笔）', () => {
    const { stdout } = page('bill.record.range', { category: '餐饮/外卖' }, 't413-cat-l2');
    assert.equal(JSON.parse(stdout).data.total, 2, '外卖本级 1＋午餐 1');
  });
  it('L3「餐饮/外卖/午餐」精确（1 笔）', () => {
    const { stdout } = page('bill.record.range', { category: '餐饮/外卖/午餐' }, 't413-cat-l3');
    assert.equal(JSON.parse(stdout).data.total, 1);
  });
});

describe('t413 ⑤ 查账户／查账本：只过滤（余额无关性探针）', () => {
  it('查账户：只按值过滤，KPI 照窗内收支（转账除外）', () => {
    const { text, stdout } = page('bill.record.range', { account: '支付宝' }, 't413-account');
    const env = JSON.parse(stdout);
    assert.equal(env.data.total, 3, '支付宝三笔（L1＋L3＋转出）');
    assert.ok(env.data.items.every((x) => x.account === '支付宝'), '行集只含该账户');
    assert.deepEqual(env.data.kpi, { count: 2, expense: 55, income: 0, net: -55 }, 'KPI 是过滤窗内收支（转出 -100 除外），不是余额');
    assert.ok(!('balance' in env.data), '载荷无 balance 字段（余额另走 bill.account.query）');
    assert.ok(text.includes(H1('查账户')), 'H1 应为查账户');
    assert.ok(text.includes('账户＝支付宝（全部时间）'), '窗口说清条件＋全部时间');
  });
  it('查账本：账本＝转账两笔全是转账 → KPI 全零（只过滤不重算）', () => {
    const { text, stdout } = page('bill.record.range', { ledger: '转账' }, 't413-ledger');
    const env = JSON.parse(stdout);
    assert.equal(env.data.total, 2, '转账账本两笔');
    assert.deepEqual(env.data.kpi, { count: 0, expense: 0, income: 0, net: 0 }, '两笔全是转账：行集照出，收支全零');
    assert.ok(!('balance' in env.data), '载荷无 balance 字段');
    assert.ok(text.includes(H1('查账本')), 'H1 应为查账本');
  });
});

describe('t413 ⑥ 空串阻断（空查询不返全量）', () => {
  it('category 空串 → exit 2（不退化成全量）', () => {
    const r = run(['bill.record.range', '--params', P({ category: '' })]);
    assert.equal(r.status, 2, r.stderr);
    assert.equal(r.stdout, '', '失败路径 stdout 不吐载荷');
  });
  it('account 全空格 → exit 2', () => {
    const r = run(['bill.record.range', '--params', P({ account: '   ' })]);
    assert.equal(r.status, 2, r.stderr);
    assert.equal(r.stdout, '', '失败路径 stdout 不吐载荷');
  });
});
