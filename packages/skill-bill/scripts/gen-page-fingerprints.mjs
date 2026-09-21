#!/usr/bin/env node
/** t689 · 页面指纹账本（**判据甲的机器形态**，规格＝`packages/skill-bill/docs/t685-接口与判据.md` §2.1）。
 *
 * 它守的是什么：**改一次版式只动一处**——写域 16 条词的 32 张页（采集／回执）各留一枚指纹；
 *   此后任何一次改动，跑 `--check` 就能读出「哪几张页的产物变了」。判读三件（人工按读数核）：
 *     甲-1 改版式只动一个文件（`git diff --name-only` 只出现该版式所属那一份模板件）；
 *     甲-2/3 未受影响的页指纹不变、受影响的页恰好等于该模板盖住的那一族（本脚本的 `--check` 给差异集）。
 *
 * **指纹口径**（与产物逐字节比较的差别写在这里，别处不再解释）：先把「今天 ±1 天」的日期时间串换成
 *   `<TS>`（它们来自时钟：`actionStamp()` 取 UTC 当下、缺省时间取本地今天 12:00:00），再对整页取 sha256。
 *   夹具里的固定日期（如 `2026-09-14 19:00:00`）逐字保留 ⇒ 改到它们必须让指纹变。
 *
 * 用法：
 *   node packages/skill-bill/scripts/gen-page-fingerprints.mjs --check          # 门禁（与账本比对）
 *   node packages/skill-bill/scripts/gen-page-fingerprints.mjs --write --declare-layout-change <票号>
 *                                                                              # 重录（只有声明改版式的票才许）
 * 末两行固定：`LEDGER: <账本路径>` 与 `RESULT: n/m`；exit 0 绿、1 红。
 * **本脚本不提供跳过比对的开关**（跳过＝放宽）；重录必须带 `--declare-layout-change`，且会把新旧差异集打出来。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LEDGER = join(PKG_ROOT, 'test', 't689-页面指纹.json');
const BIN = join(PKG_ROOT, 'dist', 'cli', 'cmd_read.js');

/** 32 张页的夹具：16 条词 × 采集／回执两页，**与 t410 验收墙清单 `.scratch/t410-wall/manifest.json` 逐条同参**
 *  （`[唤醒词, 采集｜回执, 命令, 参数, 铺底词?]`；铺底词那三页先把一笔记录写进库再取它的编号）。 */
const FIXTURE_TIME = '2026-09-14 12:00:00';
const PAGES = [
  ['记支出', '采集', 'bill.record.add', { kind: 'expense' }],
  ['记支出', '回执', 'bill.record.add', { kind: 'expense', category: '餐饮', amount: -12.5, time: FIXTURE_TIME }],
  ['记收入', '采集', 'bill.record.add', { kind: 'income' }],
  ['记收入', '回执', 'bill.record.add', { kind: 'income', category: '工资', amount: 8000, time: FIXTURE_TIME }],
  ['拍账单', '采集', 'bill.record.add', { kind: 'photo' }],
  ['拍账单', '回执', 'bill.record.add', { kind: 'photo', category: '餐饮', amount: -30, time: FIXTURE_TIME }],
  ['批量录入', '采集', 'bill.record.add', { kind: 'batch' }],
  ['批量录入', '回执', 'bill.record.add', { kind: 'batch', category: '餐饮', amount: -10, time: FIXTURE_TIME }],
  ['记退款', '采集', 'bill.record.add', { kind: 'refund' }],
  ['记退款', '回执', 'bill.record.add', { kind: 'refund', category: '退款', amount: 20, time: FIXTURE_TIME }],
  ['记报销', '采集', 'bill.record.add', { kind: 'reimburse' }],
  ['记报销', '回执', 'bill.record.add', { kind: 'reimburse', category: '出行', amount: -100, time: FIXTURE_TIME }],
  ['报销到账', '采集', 'bill.record.add', { kind: 'reimburse-done' }],
  ['报销到账', '回执', 'bill.record.add', { kind: 'reimburse-done', category: '其他收入', amount: 100, time: FIXTURE_TIME }],
  ['记借出', '采集', 'bill.record.add', { kind: 'lend' }],
  ['记借出', '回执', 'bill.record.add', { kind: 'lend', category: '借贷/借出', amount: -500, time: FIXTURE_TIME }],
  ['记借入', '采集', 'bill.record.add', { kind: 'borrow' }],
  ['记借入', '回执', 'bill.record.add', { kind: 'borrow', category: '借贷/借入', amount: 500, time: FIXTURE_TIME }],
  ['记收回', '采集', 'bill.record.add', { kind: 'collect' }],
  ['记收回', '回执', 'bill.record.add', { kind: 'collect', category: '借贷/收回', amount: 500, time: FIXTURE_TIME }],
  ['记偿还', '采集', 'bill.record.add', { kind: 'repay' }],
  ['记偿还', '回执', 'bill.record.add', { kind: 'repay', category: '借贷/偿还', amount: -500, time: FIXTURE_TIME }],
  ['记分期', '采集', 'bill.record.add', { kind: 'installment' }],
  ['记分期', '回执', 'bill.record.add', { kind: 'installment', category: '分期', amount: -1200, time: FIXTURE_TIME }],
  ['记一笔', '采集', 'bill.record.add', {}],
  ['记一笔', '回执', 'bill.record.add', { category: '餐饮', amount: -12.5, time: FIXTURE_TIME }],
  ['改记录', '采集', 'bill.record.update', {}],
  ['改记录', '回执', 'bill.record.update', { note: '改过' }, '改记录'],
  ['撤销', '采集', 'bill.record.update', { op: 'undo' }],
  ['撤销', '回执', 'bill.record.update', { op: 'undo' }, '撤销'],
  ['恢复', '采集', 'bill.record.update', { op: 'restore' }],
  ['恢复', '回执', 'bill.record.update', { op: 'restore' }, '恢复'],
];

const argv = process.argv.slice(2);
const MODE_WRITE = argv.includes('--write');
const DECLARED = argv[argv.indexOf('--declare-layout-change') + 1];
const DATE_FIXTURE = '2026-09-14 12:00:00';

function pad(n) { return String(n).padStart(2, '0'); }
function dateStr(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
const now = new Date();
const clockDates = new Set([-1, 0, 1].map((d) => dateStr(new Date(now.getTime() + d * 86400000))));
const reFull = new RegExp('(' + [...clockDates].join('|') + ') \\d{2}:\\d{2}:\\d{2}', 'g');
const reShort = new RegExp('(' + [...clockDates].join('|') + ') \\d{2}:\\d{2}(?!:)', 'g');
const normalize = (t) => t.replace(reFull, '<TS>').replace(reShort, '<TS>');

const DB = mkdtempSync(join(tmpdir(), 't689-fp-db-'));
// #763：隔离通道改**家目录注入**——`DB` 当**家目录**，配置落 `<DB>/.ilife/bill.yaml`（`db.dir = DB` 不动，
// 库还在原地 ⇒ 指纹口径与重录判据一个字不变）；两格都设：win32 认 `USERPROFILE`、POSIX 认 `HOME`。
const CFG_DIR = join(DB, '.ilife');
mkdirSync(CFG_DIR, { recursive: true });
writeFileSync(join(CFG_DIR, 'bill.yaml'), 'db:\n  dir: ' + JSON.stringify(DB) + '\n', 'utf8');
const env = { ...process.env, USERPROFILE: DB, HOME: DB };
const NODE = process.execPath;

function run(key, params, html) {
  const args = [BIN, key, '--params', JSON.stringify(params)];
  if (html) args.push('--html', html);
  return spawnSync(NODE, args, { encoding: 'utf8', env });
}
function lastJson(stdout) {
  const lines = String(stdout || '').trim().split(/\r?\n/).filter(Boolean);
  return JSON.parse(lines[lines.length - 1]);
}

const seed = {};
for (const w of ['改记录', '撤销', '恢复']) {
  const r = run('bill.record.add', { category: '餐饮', amount: -20, time: '2026-09-14 19:00:00' });
  if (r.status !== 0) { console.error('SEED-FAIL ' + w + ' exit=' + r.status + ' ' + String(r.stderr).slice(-200)); process.exit(2); }
  seed[w] = lastJson(r.stdout).data.receipt.recordId;
}
if (run('bill.record.update', { op: 'undo', id: seed['恢复'] }).status !== 0) { console.error('SEED-UNDO-FAIL'); process.exit(2); }

const dir = mkdtempSync(join(tmpdir(), 't689-fp-html-'));
const pages = {};
let ok = 0;
const total = PAGES.length;
for (const [word, kind, key, rawParams, seedFor] of PAGES) {
  const name = word + '-' + kind;
  const params = seedFor === undefined ? { ...rawParams } : { ...rawParams, id: seed[seedFor] };
  const file = join(dir, name + '.html');
  const r = run(key, params, file);
  let pass = false;
  try {
    const out = lastJson(r.stdout);
    const text = existsSync(file) ? normalize(readFileSync(file, 'utf8')) : '';
    pass = r.status === 0 && /<!doctype html>/i.test(text) && text.includes('<section')
      && statSync(file).size === out.delivery?.bytes && isAbsolute(out.delivery?.path ?? '');
    pages[name] = pass ? createHash('sha256').update(text).digest('hex') : '(FAIL)';
  } catch (err) {
    pages[name] = '(FAIL ' + String(err && err.message || err).slice(0, 60) + ')';
    console.log('  失败详情 exit=' + r.status + ' stderr=' + String(r.stderr).slice(-200) + ' stdout=' + String(r.stdout).slice(-200));
  }
  if (pass) ok++;
  if (!pass) {
    console.log('  失败详情 exit=' + r.status + ' size=' + (existsSync(file) ? statSync(file).size : 'NA')
      + ' stderr=' + String(r.stderr).slice(-160) + ' stdout=' + String(r.stdout).slice(-160));
  }
  console.log((pass ? 'PASS' : 'FAIL') + ' ' + name);
}
console.log('渲染 ' + ok + '/' + total + ' 张（库=' + DB + '）');
if (ok !== total) {
  console.log('LEDGER: ' + LEDGER);
  console.log('RESULT: 0/' + total);
  process.exit(1);
}

const nextText = JSON.stringify({ note: 't689 页面指纹账本（归一化见 scripts/gen-page-fingerprints.mjs 件头）', pages }, null, 2) + '\n';
if (!MODE_WRITE) {
  if (!existsSync(LEDGER)) { console.log('RED 账本不存在：' + LEDGER); console.log('RESULT: 0/' + total); process.exit(1); }
  const old = JSON.parse(readFileSync(LEDGER, 'utf8')).pages;
  const changed = Object.keys(pages).filter((k) => old[k] !== pages[k]);
  const added = Object.keys(pages).filter((k) => old[k] === undefined);
  const gone = Object.keys(old).filter((k) => pages[k] === undefined);
  console.log('LEDGER: ' + LEDGER);
  for (const k of changed) console.log('RED 页指纹变了：' + k);
  for (const k of added) console.log('RED 账本没这一页：' + k);
  for (const k of gone) console.log('RED 账本多这一页（产物已不再出）：' + k);
  console.log('RESULT: ' + (total - changed.length - added.length - gone.length) + '/' + total);
  if (changed.length + added.length + gone.length > 0) {
    console.log('修法：本次若**声明**要改版式，跑 `--write --declare-layout-change <票号>` 重录，'
      + '并把上面的差异集与「改动只动一个模板件」的读数一起写进证据。');
    process.exit(1);
  }
  console.log('PASS: 32 张页指纹与账本一致');
  process.exit(0);
}

if (DECLARED === undefined || !/^\d+$/.test(DECLARED)) {
  console.log('RED 重录必须声明票号：--write --declare-layout-change <票号>');
  console.log('LEDGER: ' + LEDGER);
  console.log('RESULT: 0/' + total);
  process.exit(1);
}
if (existsSync(LEDGER)) {
  const old = JSON.parse(readFileSync(LEDGER, 'utf8')).pages;
  const changed = Object.keys(pages).filter((k) => old[k] !== pages[k]);
  console.log('重录声明（票 ' + DECLARED + '）·差异集 ' + changed.length + ' 张：' + (changed.join('、') || '无'));
}
writeFileSync(LEDGER, nextText, 'utf8');
console.log('LEDGER: ' + LEDGER);
console.log('RESULT: ' + total + '/' + total);
console.log('PASS: 已重录（12 位指纹以当刻产物为准）');
process.exit(0);
