// t690 截断口径的**真出口**读数：spawn 真交付出口 `dist/cli/cmd_read.js` 跑三条超限窗，
// 打「退出码／落盘字节／交付体积门（262,144）／折叠区那句话」。
//
// 为什么单独成一支：本席做体积预算时，写域 #689 在途把 `dist/cli/cmd_read.js` 的注册表加载弄坏过，
// 那几条读数是用 `t690-探针-直调.mjs` 直调域门量的。真出口能跑了，必须用它复量一遍——
// 判据要的是**交付路那一串**的字节，不是域内函数的返回串。
//
// 跑法：node docs/skills/skill-bill/t690-截断-真出口.mjs
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..', '..');
const DIST = join(root, 'packages', 'skill-bill', 'dist');
const OUT = join(root, '.scratch', 't690', 'exit-out');
mkdirSync(OUT, { recursive: true });

const { openBillDb, closeBillDb, addBill } = await import('file://' + join(DIST, 'fetch', 'index.js').replace(/\\/g, '/'));
const { assertHtmlSize, BILL_HTML_MAX_BYTES } = await import('file://' + join(DIST, 'render', 'html.js').replace(/\\/g, '/'));

const DB_DIR = mkdtempSync(join(tmpdir(), 't690-exit-db-'));
const db = openBillDb(join(DB_DIR, 'biscuit_accountant.db'));
const base = { account: '支付宝', ledger: '生活', currency: '人民币' };
// ① 205 条普通备注 ② 100 条 200 字长备注 ③ 40 条（对照：远未超限，应画满）
for (let i = 0; i < 205; i++) addBill(db, { ...base, category: '餐饮/外卖/午餐', amount: -1 - (i % 7), time: '2020-06-15 08:00:00', note: '截断样本 ' + String(i) });
for (let i = 0; i < 100; i++) addBill(db, { ...base, category: '餐饮/外卖/午餐', amount: -12.34, time: '2020-07-15 08:00:00', note: '长备注 ' + String(i) + '：' + '字'.repeat(200) });
for (let i = 0; i < 40; i++) addBill(db, { ...base, category: '出行/地铁', amount: -3, time: '2020-08-15 08:00:00', note: '短样本 ' + String(i) });
closeBillDb(db);

const bin = join(DIST, 'cli', 'cmd_read.js');
const env = { ...process.env, SKILLS_DB_PATH: DB_DIR };
const CASES = [
  ['① 205 条普通备注', { date: '2020-06-15' }, 205],
  ['② 100 条 200 字长备注', { date: '2020-07-15' }, 100],
  ['③ 40 条（对照，未超限）', { date: '2020-08-15' }, 40],
];

console.log('交付体积门 BILL_HTML_MAX_BYTES = ' + String(BILL_HTML_MAX_BYTES));
console.log('');
for (const [label, params, total] of CASES) {
  const file = join(OUT, label.replace(/[^\d]/g, '') + '.html');
  const r = spawnSync(process.execPath, [bin, 'bill.record.today', '--params', JSON.stringify(params), '--html', file], { cwd: root, encoding: 'utf8', env });
  const bytes = existsSync(file) ? Buffer.byteLength(readFileSync(file, 'utf8'), 'utf8') : 0;
  const html = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const b = html.slice(html.indexOf('<body>'), html.indexOf('<script>'));
  const nRows = /<tbody>([\s\S]*?)<\/tbody>/.exec(b);
  const rows = nRows === null ? 0 : (nRows[1].match(/<tr>/g) ?? []).length;
  const fold = /<summary[^>]*>([^<]*)<\/summary>/.exec(b);
  console.log(label + '（本窗 ' + String(total) + ' 条）');
  console.log('  真出口退出码 = ' + String(r.status) + '；落盘 = ' + (existsSync(file) ? '是' : '否') + '；字节 = ' + String(bytes));
  console.log('  表行数 = ' + String(rows) + '；折叠区 = ' + (fold === null ? '无（未截）' : '「' + fold[1] + '」'));
  console.log('  过体积门 = ' + String(bytes > 0 && bytes <= BILL_HTML_MAX_BYTES));
  console.log('');
}

// 体积门本身是真门（不是纸上的数）：超限即抛，且 code 可判。
try {
  assertHtmlSize('x'.repeat(BILL_HTML_MAX_BYTES + 1));
  console.log('体积门自证：**没抛**（假门！）');
} catch (e) {
  console.log('体积门自证：超限抛 ' + String(e && e.code) + '（' + String(e && e.name) + '）——门是真的');
}
console.log('对照：本席改前那条 205 条的窗实测 404,980 B（> 门）⇒ 固定 200 条上限在真交付路上必 exit 5。');
