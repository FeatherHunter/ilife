#!/usr/bin/env node
/** #1079 · 真跑 SAY 采集 16 页（入仓，随票走）。
 *
 * 出什么：16 份**当刻构建产物**的采集页 HTML（不是截图、不是拼的示意），供像素比对与人眼墙用。
 * 隔离家目录：\`$env:TEMP\tick-1079\`（`<家目录>/.ilife/bill.yaml` 指自家库）——**不碰真实家目录的库**。
 *
 * 用法（仓根，先 \`tsc -b packages/skill-bill\`）：
 *   node docs/skills/skill-bill/1079-say-渲染16页.mjs [--out <目录>]
 * 缺省输出 \`.scratch/1079-say/out/<唤醒词>.html\`；末行打 \`rendered n/16\`，exit 0 全出、1 有缺。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const argv = process.argv.slice(2);
const outArg = argv.indexOf('--out');
const OUT = resolve(ROOT, outArg >= 0 && argv[outArg + 1] !== undefined ? argv[outArg + 1] : '.scratch/1079-say/out');

/* 隔离家目录：库与配置都落在这里，绝不碰真家目录。 */
const HOME_DIR = join(tmpdir(), 'tick-1079');
mkdirSync(join(HOME_DIR, '.ilife'), { recursive: true });
writeFileSync(join(HOME_DIR, '.ilife', 'bill.yaml'), 'db:' + String.fromCharCode(10) + '  dir: ' + JSON.stringify(HOME_DIR) + String.fromCharCode(10), 'utf8');

const BIN = join(ROOT, 'packages/skill-bill/dist/cli/cmd_read.js');
const env = { ...process.env, USERPROFILE: HOME_DIR, HOME: HOME_DIR };
mkdirSync(OUT, { recursive: true });

/** 判地原型的序号 ↔ 唤醒词 ↔ 跑这一页的命令与参数（采集页只在必需槽位没给齐时出，故参数一件不给）。 */
const PAGES = [
  ['x01', '记支出', 'bill.record.add', { kind: 'expense' }],
  ['x03', '记收入', 'bill.record.add', { kind: 'income' }],
  ['x05', '拍账单', 'bill.record.add', { kind: 'photo' }],
  ['x07', '批量录入', 'bill.record.add', { kind: 'batch' }],
  ['x09', '记退款', 'bill.record.add', { kind: 'refund' }],
  ['x11', '记报销', 'bill.record.add', { kind: 'reimburse' }],
  ['x13', '报销到账', 'bill.record.add', { kind: 'reimburse-done' }],
  ['x15', '记借出', 'bill.record.add', { kind: 'lend' }],
  ['x17', '记借入', 'bill.record.add', { kind: 'borrow' }],
  ['x19', '记收回', 'bill.record.add', { kind: 'collect' }],
  ['x21', '记偿还', 'bill.record.add', { kind: 'repay' }],
  ['x23', '记分期', 'bill.record.add', { kind: 'installment' }],
  ['x25', '记一笔', 'bill.record.add', {}],
  ['x27', '改记录', 'bill.record.update', {}],
  ['x29', '撤销', 'bill.record.update', { op: 'undo' }],
  ['x31', '恢复', 'bill.record.update', { op: 'restore' }],
];

let ok = 0;
const rows = [];
for (const [seq, word, key, params] of PAGES) {
  const file = join(OUT, word + '.html');
  const r = spawnSync(process.execPath, [BIN, key, '--params', JSON.stringify(params), '--html', file], { encoding: 'utf8', env });
  const pass = r.status === 0 && existsSync(file);
  if (pass) ok += 1;
  rows.push({ seq, word, proto: 'docs/skills/skill-bill/proto/say-collect/' + seq + '-' + word + '-采集-v2.3.html', product: file, ok: pass });
  console.log((pass ? 'PASS ' : 'FAIL ') + word + ' exit=' + String(r.status));
}
writeFileSync(join(OUT, '..', 'rows.json'), JSON.stringify(rows, null, 1), 'utf8');
console.log('rendered ' + ok + '/' + PAGES.length);
console.log('OUT: ' + OUT);
process.exit(ok === PAGES.length ? 0 : 1);
