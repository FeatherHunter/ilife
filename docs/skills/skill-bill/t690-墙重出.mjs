// t690 双端墙重出：按已提交清单 `docs/skills/skill-bill/t403-manifest.json` 出全套产物 ＋ 跑墙与机审。
//
// 判据（#690 第 ⑤ 条）：双端墙重出一次，产物**格数对得上清单**。
// 与 t417 的差别：本席 spawn 的是**真交付出口** `dist/cli/cmd_read.js`（t690 当刻 #689 在途，
// 但写域的 dist 已经能加载，故走真出口而不是直调）。
//
// 跑法：node docs/skills/skill-bill/t690-墙重出.mjs
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, copyFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..', '..');
const DIST = join(root, 'packages', 'skill-bill', 'dist');
const MANIFEST = join(root, 'docs', 'skills', 'skill-bill', 't403-manifest.json');
const WALL = join(root, '.scratch', 't690-wall');
mkdirSync(WALL, { recursive: true });

const { openBillDb, closeBillDb, addBill } = await import('file://' + join(DIST, 'fetch', 'index.js').replace(/\\/g, '/'));

const today = new Date().toISOString().slice(0, 10);
const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

// `SKILLS_DB_PATH` 指**目录**（CLI 自己拼 `biscuit_accountant.db`）；种子写同一个文件。
const DB_DIR = mkdtempSync(join(tmpdir(), 't690-wall-db-'));
const DB_PATH = join(DB_DIR, 'biscuit_accountant.db');
const db = openBillDb(DB_PATH);
// 与 t417 同一批样本（清单 `check` 列那些读数就是照它写的）。
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
closeBillDb(db);

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const bin = join(DIST, 'cli', 'cmd_read.js');
const env = { ...process.env, SKILLS_DB_PATH: DB_DIR };
let ok = 0;
const failed = [];
for (const row of manifest.rows) {
  const m = /--params\s+'([\s\S]*)'\s*$/.exec(row.cli);
  const params = m === null ? '{}' : m[1];
  const file = join(WALL, row.file);
  const r = spawnSync(process.execPath, [bin, row.key, '--params', params, '--html', file], { cwd: root, encoding: 'utf8', env });
  if (r.status !== 0) { failed.push(row.file + ' exit=' + String(r.status) + ' ' + (r.stderr || '').slice(0, 160)); continue; }
  if (!existsSync(file)) { failed.push(row.file + ' 未落盘'); continue; }
  ok += 1;
}
copyFileSync(MANIFEST, join(WALL, 'manifest.json'));
console.log('产物格数 = ' + ok + '／' + manifest.rows.length + '；失败 ' + failed.length);
for (const f of failed) console.log('  FAIL ' + f);
console.log('DB=' + DB_PATH);
console.log('WALL=' + WALL);
