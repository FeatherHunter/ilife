// t690 取证探针（直调域门，绕开 CLI）：合成库 → 逐条查询命令出整页 → 打印块存在性与读数。
//
// 为什么直调而不是 spawn 真出口：本席与 #689 那张票**共用同一个 `dist/`**，对方在途的
// `dist/record/template-expense.js` 语法坏掉时，`dist/cli/cmd_read.js` 连注册表都加载不了。
// 直调 `dist/query/index.js` 的门只吃本域的件，不受写字辈影响。**最终判据仍走真出口**（见证据件）。
//
// 跑法：node docs/skills/skill-bill/t690-探针-直调.mjs
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..', '..');
const DIST = join(root, 'packages', 'skill-bill', 'dist');
const OUT = join(root, '.scratch', 't690', 'out');
mkdirSync(OUT, { recursive: true });

const { openBillDb, closeBillDb, addBill } = await import('file://' + join(DIST, 'fetch', 'index.js').replace(/\\/g, '/'));
const { runQueryRead } = await import('file://' + join(DIST, 'query', 'index.js').replace(/\\/g, '/'));

const today = new Date().toISOString().slice(0, 10);
const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

const DB_PATH = join(mkdtempSync(join(tmpdir(), 't690-db-')), 'biscuit_accountant.db');
const db = openBillDb(DB_PATH);

const seed = [
  { category: '餐饮/外卖/午餐', amount: -35, time: today + ' 12:00:00', note: '午饭', account: '支付宝', ledger: '生活', currency: '人民币' },
  { category: '工资/基本工资', amount: 8000, time: today + ' 09:00:00', note: '本月工资', account: '招行卡', ledger: '生活', currency: '人民币' },
  { category: '出行/地铁', amount: -20, time: yest + ' 18:00:00', note: '下班地铁', account: '微信', ledger: '生活', currency: '人民币' },
  { category: '餐饮/堂食/晚餐', amount: -58, time: '2026-09-06 19:00:00', note: '晚饭', account: '支付宝', ledger: '生活', currency: '人民币' },
  { category: '学习/书籍', amount: -88, time: '2026-09-06 12:00:00', note: '旅行攻略 #旅行计划', account: '微信', ledger: '旅行', currency: '人民币' },
  { category: '借贷/借出', amount: -500, time: '2026-09-05 12:00:00', note: '借阿明 #未还', account: '支付宝', ledger: '生活', currency: '人民币' },
  { category: '餐饮/外卖/午餐', amount: -120, time: '2026-09-04 12:00:00', note: '出差打车 #待报销', account: '招行卡', ledger: '生活', currency: '人民币' },
  { category: '分期/手机', amount: -300, time: '2026-09-03 12:00:00', note: '分期中 #分期', account: '招行卡', ledger: '生活', currency: '人民币' },
];
for (const s of seed) addBill(db, s);

// 反向压力样本：100 条**长备注**（每行备注 200 字）——探「上限是否被内容长短冲垮」。
for (let i = 0; i < 100; i++) {
  addBill(db, {
    category: '餐饮/外卖/午餐', amount: -12.34, time: '2020-07-15 08:00:00',
    account: '支付宝', ledger: '生活', currency: '人民币',
    note: '长备注压力 ' + String(i) + '：' + '字'.repeat(200),
  });
}
for (let i = 0; i < 205; i++) {
  addBill(db, {
    category: '餐饮/外卖/午餐', amount: -1 - (i % 7), time: '2020-06-15 08:00:00',
    account: '支付宝', ledger: '生活', currency: '人民币', note: '截断样本 ' + String(i),
  });
}

// 骨架表 §五 的区块锚点（按类判；⑤ 列表页 / ⑥ 状态页）。**只看正文**：样式表与页尾脚本里的类名字面不算。
const ANCHORS = [
  ['3 结论句', /ilife-block-conclusion/],
  ['4 页内导航', /ilife-block-toc/],
  ['5 读数行 KPI', /ilife-block-kpi-card-grid/],
  ['6 徽章列', /ilife-block-chip/],
  ['12 主表', /ilife-block-data-table/],
  ['13 分类聚合/占比条', /ilife-block-dist-row/],
  ['21 长列表截断', /ilife-block-disclosure/],
  ['23 空态块', /ilife-block-empty-block/],
  ['24 口径说明行', /ilife-block-caliber/],
  ['25 复制区', /ilife-block-copy-block/],
  ['26 来源脚注', /ilife-block-caliber/],
];

const CASES = [
  ['w01-today', 'bill.record.today', {}],
  ['w02-yesterday', 'bill.record.today', { date: 'yesterday' }],
  ['w03-someday', 'bill.record.today', { date: '2026-09-06' }],
  ['w04-recent', 'bill.record.today', { recent: true, limit: 3 }],
  ['w06-week', 'bill.record.range', { range: 'week' }],
  ['w07-month', 'bill.record.range', { range: 'month' }],
  ['w08-range', 'bill.record.range', { start: '2026-09-03', end: '2026-09-06' }],
  ['w09-category', 'bill.record.range', { category: '餐饮' }],
  ['w10-account', 'bill.record.range', { account: '支付宝' }],
  ['w11-ledger', 'bill.record.range', { ledger: '旅行' }],
  ['w12-search', 'bill.record.search', { q: '午饭' }],
  ['w13-tag', 'bill.record.search', { kind: 'tag', tag: '旅行计划' }],
  ['w14-debt', 'bill.record.search', { kind: 'debt' }],
  ['w15-reimburse', 'bill.record.search', { kind: 'reimburse' }],
  ['w16-installment', 'bill.record.search', { kind: 'installment' }],
  ['w17-detail', 'bill.record.detail', { id: 1 }],
  ['w-empty', 'bill.record.today', { date: '2020-01-01' }],
  ['w-trunc', 'bill.record.today', { date: '2020-06-15' }],
  ['w-longnote', 'bill.record.today', { date: '2020-07-15' }],
];

const rows = [];
for (const [name, key, params] of CASES) {
  let out;
  try {
    out = runQueryRead(key, params, db);
  } catch (e) {
    console.log('FAIL ' + name + ' ' + (e && e.code ? e.code : '') + ' ' + (e && e.message ? e.message : e));
    continue;
  }
  const raw = out.html;
  const bodyStart = raw.indexOf('<body>');
  const bodyEnd = raw.indexOf('<script>');
  const text = raw.slice(bodyStart, bodyEnd === -1 ? undefined : bodyEnd);
  const missing = ANCHORS.filter(([, re]) => !re.test(text)).map(([n]) => n);
  rows.push({ name, bytes: raw.length, lf: raw.split('\n').length - 1, missing });
  writeFileSync(join(OUT, name + '.html'), raw, 'utf8');
  writeFileSync(join(OUT, name + '.blocks.txt'), ANCHORS.map(([n, re]) => (re.test(text) ? 'HIT  ' : 'MISS ') + n).join('\n'), 'utf8');
}

console.log('DB=' + DB_PATH);
console.log('OUT=' + OUT);
console.log('name             bytes     LF   未命中');
for (const r of rows) console.log(r.name.padEnd(16), String(r.bytes).padStart(6), String(r.lf).padStart(6), '  ' + (r.missing.length === 0 ? '—' : r.missing.join('、')));
console.log('\n--- 逐格（w01-today）---');
const sample = join(OUT, 'w01-today.blocks.txt');
if (existsSync(sample)) console.log(readFileSync(sample, 'utf8'));
console.log('--- 逐格（w-empty）---');
const empty = join(OUT, 'w-empty.blocks.txt');
if (existsSync(empty)) console.log(readFileSync(empty, 'utf8'));
closeBillDb(db);
