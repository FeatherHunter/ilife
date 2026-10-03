// t1110 笔数口径不变量锁（#1084 裁定 C 落地 #1110）
//
// 判据（逐页 8 张 × 两种窗口，全部机器读数）：
//   ① 不变量：对账笔数 − 页头笔数 ＝ 转账数 K（K 由**样本点名**，不从载荷反推）；
//   ② 无转账窗口：字面**不含**「不含转账」「含转账」，且两处笔数逐字等于 kpi.count／total（现状字面）；
//   ③ 含转账窗口：页头笔数后带「（不含转账）」、对账笔数后带「（含转账 K）」，两处注记缺一即红。
//
// 样本两库（都钉钟到 NOW，窗口因此完全确定）：
//   · N 库＝四笔非转账（今天／昨天／某天×2）；T 库＝N 库 ＋ 四笔转账（今天×2、昨天×1、某天×1）。
//   转账判定走 `src/shared/kpi.ts` 的 `isTransfer`（账本「转账」或分类「转账/*」），本件不另判一份。
//
// 计数纪律：判别性标记数整段字面（`共 N 笔（含转账 K）` 这类），不数裸子串。
// 红线：只读临时库；只往临时目录写 --html 产物；真跑用隔离家目录（billEnv）。
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { billEnv, freezeClock } from './helpers/config-base.mjs';
import { countNotes } from '../dist/query/countLabel.js';

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, '..', 'dist', 'cli', 'cmd_read.js');
const NODE = [process.env.npm_node_execpath, 'node', process.execPath]
  .filter(Boolean)
  .find((c) => {
    const p = spawnSync(c, ['--version'], { encoding: 'utf8' });
    return p.status === 0 && /^v\d+/.test((p.stdout || '').trim());
  }) ?? process.execPath;

/** 钉钟日（周五）：周窗＝2026-09-28~10-02、月窗＝2026-10-01~10-02，全由它定。 */
const NOW = '2026-10-02';
const YEST = '2026-10-01';
/** 查某天的固定日（在周／月窗外，免受钉钟影响）。 */
const DAY = '2026-09-06';

let DBN = '';
let DBT = '';
let OUT = '';
const P = (o) => JSON.stringify(o);

function runWith(db, args) {
  return spawnSync(NODE, [bin, ...args], { cwd: here, encoding: 'utf8', env: billEnv(db, freezeClock(NOW)) });
}
/** 跑一次查询并把整页读回来（指定库）。 */
function pageOn(db, key, params, name) {
  const file = join(OUT, name + '.html');
  const r = runWith(db, [key, '--params', P(params), '--html', file]);
  assert.equal(r.status, 0, key + ' ' + P(params) + ' 应 exit 0：' + r.stderr);
  assert.ok(existsSync(file), '产物应落盘：' + file);
  return { text: readFileSync(file, 'utf8'), stdout: r.stdout, file };
}

/** 店头副题（H1）的笔数：形如 `今天共 1 笔（不含转账），支出 35.00 元`。 */
function headCount(text) {
  const m = text.match(/<h1 class="ilife-sheet-title">[^<]*?(\d+)\s*笔/);
  return m ? Number(m[1]) : NaN;
}
/** 对账 CHECK 段的笔数：形如 `编号 1、2 ／ 共 3 笔（含转账 2） ／ 异常：无`。 */
function checkCount(text) {
  const seg = text.split('<span class="ilife-ticket-sec-no">CHECK</span>')[1] ?? '';
  const m = seg.match(/编号[^<]*?共\s*(\d+)\s*笔/);
  return m ? Number(m[1]) : NaN;
}
/** 无转账窗口：两处注记一个都不许有。 */
function assertNoNote(text, label) {
  assert.ok(!text.includes('不含转账'), label + '：无转账窗口不许出现「不含转账」');
  assert.ok(!text.includes('含转账'), label + '：无转账窗口不许出现「含转账」');
}
/** 含转账窗口：两处注记都要在（缺一即红）。 */
function assertBothNotes(text, k, label) {
  assert.ok(text.includes('（不含转账）'), label + '：页头笔数后应带「（不含转账）」');
  assert.ok(text.includes('（含转账 ' + String(k) + '）'), label + '：对账笔数后应带「（含转账 ' + k + '）」');
}
/** 三处读数互锁：页头＝kpi.count、对账＝窗口行数、两者差＝样本点名的转账数。 */
function assertReadings(text, env, k, label) {
  const n = headCount(text);
  const m = checkCount(text);
  assert.ok(Number.isFinite(n), label + '：店头副题应读得到笔数');
  assert.ok(Number.isFinite(m), label + '：对账行应读得到笔数');
  assert.equal(n, env.data.kpi.count, label + '：页头笔数应＝kpi.count（收支口径）');
  assert.equal(m, env.data.total, label + '：对账笔数应＝窗口行数（全行集口径）');
  assert.equal(m - n, k, label + '：不变量 对账笔数 − 页头笔数 应＝转账数 ' + k);
}

/** 8 页的取数与「无转账窗口的字面」（head(n) ＋ ` 笔` ＋ tail；对账 tail 按分隔符分半角／全角）。 */
const PAGES = [
  { name: '查今天', key: 'bill.record.today', sep: 'half', head: (n) => '今天共 ' + n, tail: '，支出 ',
    neg: {}, pos: {}, kT: 2 },
  { name: '查昨天', key: 'bill.record.today', sep: 'full', head: (n) => '昨天 ' + n, tail: '，支出 ',
    neg: { date: 'yesterday' }, pos: { date: 'yesterday' }, kT: 1 },
  { name: '查某天', key: 'bill.record.today', sep: 'full', head: (n) => '共 ' + n, tail: '，支出 ',
    neg: { date: DAY }, pos: { date: DAY }, kT: 1 },
  { name: '查周', key: 'bill.record.range', sep: 'full', head: (n) => '本周共 ' + n, tail: '，支出 ',
    neg: { range: 'week', today: NOW }, pos: { range: 'week', today: NOW }, kT: 3 },
  { name: '查月', key: 'bill.record.range', sep: 'full', head: (n) => '本月共 ' + n, tail: '，支出 ',
    neg: { range: 'month', today: NOW }, pos: { range: 'month', today: NOW }, kT: 3 },
  { name: '查分类', key: 'bill.record.range', sep: 'full', head: (n) => '查分类共记 ' + n, tail: '',
    neg: { category: '餐饮' }, pos: { category: '转账' }, kT: 4 },
  { name: '查账户', key: 'bill.record.range', sep: 'full', head: (n) => '支付宝共 ' + n, tail: '，支出 ',
    neg: { account: '支付宝' }, pos: { account: '支付宝' }, kT: 2 },
  { name: '查账本', key: 'bill.record.range', sep: 'full', head: (n) => '旅行账本 ' + n, tail: '，支出 ',
    neg: { ledger: '旅行' }, pos: { ledger: '转账' }, kT: 4, posHead: (n) => '转账账本 ' + n },
];

/** 无转账窗口的对账字面尾巴（编号序列之后那一段）。 */
const checkTail = (m, sep) => (sep === 'half' ? ' / 共 ' + m + ' 笔 / 异常：无' : ' ／ 共 ' + m + ' 笔 ／ 异常：无');
/** 含转账窗口的对账字面尾巴。 */
const checkTailK = (m, k, sep) =>
  sep === 'half' ? ' / 共 ' + m + ' 笔（含转账 ' + k + '） / 异常：无' : ' ／ 共 ' + m + ' 笔（含转账 ' + k + '） ／ 异常：无';

before(() => {
  DBN = mkdtempSync(join(tmpdir(), 't1110-db-n-'));
  DBT = mkdtempSync(join(tmpdir(), 't1110-db-t-'));
  OUT = mkdtempSync(join(tmpdir(), 't1110-html-'));
  const base = [
    { category: '餐饮/外卖/午餐', amount: -35, time: NOW + ' 12:00:00', account: '支付宝', ledger: '日常', note: 't1110-今天' },
    { category: '出行/地铁', amount: -20, time: YEST + ' 12:00:00', account: '微信', ledger: '日常', note: 't1110-昨天' },
    { category: '学习/书籍', amount: -88, time: DAY + ' 15:00:00', account: '微信', ledger: '旅行', note: 't1110-某天旅行' },
    { category: '餐饮/堂食/晚餐', amount: -58, time: DAY + ' 19:00:00', account: '支付宝', ledger: '日常', note: 't1110-某天晚饭' },
  ];
  const transfers = [
    { category: '转账/转出', amount: -500, time: NOW + ' 05:00:00', account: '支付宝', ledger: '转账', note: '#转账 今天转出' },
    { category: '转账/转入', amount: 500, time: NOW + ' 05:00:00', account: '微信', ledger: '转账', note: '#转账 今天转入' },
    { category: '转账/转出', amount: -300, time: YEST + ' 05:00:00', account: '支付宝', ledger: '转账', note: '#转账 昨天转出' },
    { category: '转账/转入', amount: 200, time: DAY + ' 05:00:00', account: '微信', ledger: '转账', note: '#转账 某天转入' },
  ];
  for (const s of base) assert.equal(runWith(DBN, ['bill.record.add', '--params', P(s)]).status, 0, 'N 库样本应写进临时库：' + P(s));
  for (const s of [...base, ...transfers]) assert.equal(runWith(DBT, ['bill.record.add', '--params', P(s)]).status, 0, 'T 库样本应写进临时库：' + P(s));
});

describe('t1110 ⓪ 共用件：口径只写一处（src/query/countLabel.ts）', () => {
  it('无转账：两个片段即裸笔数（含量词），字面与现状逐字节相同', () => {
    const rows = [{ ledger: '日常', category: '餐饮/外卖/午餐' }, { ledger: '旅行', category: '学习/书籍' }];
    const cn = countNotes(rows, 2);
    assert.equal(cn.transfer, 0, 'K 应为 0');
    assert.equal(cn.head, '2 笔', 'K＝0 的页头片段即裸笔数');
    assert.equal(cn.check, '2 笔', 'K＝0 的对账片段即裸笔数');
  });
  it('含转账：K 按 isTransfer 数出（账本＝转账 或 分类＝转账/*），注记落在量词「笔」之后', () => {
    const rows = [
      { ledger: '日常', category: '餐饮/外卖/午餐' },
      { ledger: '转账', category: '转账/转出' },
      { ledger: '日常', category: '转账/转入' },
      { ledger: '转账', category: '餐饮' },
    ];
    const cn = countNotes(rows, 1);
    assert.equal(cn.transfer, 3, 'K 应数出三笔转账（账本口径 2 ＋ 分类口径 1）');
    assert.equal(cn.head, '1 笔（不含转账）', '页头片段＝收支笔数＋注记');
    assert.equal(cn.check, '4 笔（含转账 3）', '对账片段＝窗口行数＋注记');
  });
});

describe('t1110 ① 无转账窗口：两处笔数逐字保持现状、不许出现任何注记', () => {
  for (const p of PAGES) {
    it(p.name + '：K＝0 ⇒ 字面不含注记，两处笔数＝kpi.count／total', () => {
      const { text, stdout } = pageOn(DBN, p.key, p.neg, 'n-' + p.name);
      const env = JSON.parse(stdout);
      assertNoNote(text, p.name);
      assertReadings(text, env, 0, p.name);
      const n = env.data.kpi.count;
      const m = env.data.total;
      assert.ok(text.includes(p.head(n) + ' 笔' + p.tail), p.name + '：页头字面应与现状逐字相同（' + p.head(n) + ' 笔' + p.tail + '）');
      assert.ok(text.includes(checkTail(m, p.sep)), p.name + '：对账字面应与现状逐字相同（' + checkTail(m, p.sep) + '）');
    });
  }
});

describe('t1110 ② 含转账窗口：两处注记都在，不变量 对账 − 页头 ＝ 转账数', () => {
  for (const p of PAGES) {
    it(p.name + '：K＝' + p.kT + ' ⇒ 页头带「（不含转账）」、对账带「（含转账 ' + p.kT + '）」', () => {
      const { text, stdout } = pageOn(DBT, p.key, p.pos, 't-' + p.name);
      const env = JSON.parse(stdout);
      assertReadings(text, env, p.kT, p.name);
      assertBothNotes(text, p.kT, p.name);
      const n = env.data.kpi.count;
      const m = env.data.total;
      const head = (p.posHead ?? p.head)(n);
      assert.ok(text.includes(head + ' 笔（不含转账）' + p.tail), p.name + '：页头应写「' + head + ' 笔（不含转账）' + p.tail + '」');
      assert.ok(text.includes(checkTailK(m, p.kT, p.sep)), p.name + '：对账应写「' + checkTailK(m, p.kT, p.sep) + '」');
    });
  }
});
