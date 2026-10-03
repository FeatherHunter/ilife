#!/usr/bin/env node
/** #1121 · 空窗口 5 场景「票据纸空态」渲染器（入仓，长期可复跑；照 .scratch/1081-空态/ 的形状改）。
 *
 * 出什么：在**全新隔离家目录**（零记录）里把 \`bill.record.today\` 族的空窗口各跑一遍，逐页量
 *   \`sheetRoot\`（\`<div class="ilife-bill-sheet-page\` 计数）／\`✂ 裁切线\` 计数／旧壳块位
 *   （\`ilife-block-page-shell\` 计数，body 口径：先剥 style／script）／exit／字节，并落 \`.scratch/1121-空态/\`。
 *
 * 隔离家目录：\`$env:TEMP\tick-1121\`（本票号命名，不碰真实家目录的库）。
 * 用法（仓根）：
 *   node docs/skills/skill-bill/1121-空态渲染.mjs [--out <目录>]
 * 绿的样子：5 行全部 `票据纸`（sheetRoot=1 ／ 裁切线=1 ／ 旧壳=0）⇒ 末行 `RESULT: 5/5 …`、exit 0；
 *   任何一行回落老壳即点名并 exit 1。
 *
 * 红线：只读 dist 与源码，只写产物目录；不改任何 packages/ 代码、不改原型。
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..');
const argv = process.argv.slice(2);
const outIdx = argv.indexOf('--out');
const OUT = resolve(ROOT, outIdx >= 0 && argv[outIdx + 1] !== undefined ? argv[outIdx + 1] : '.scratch/1121-空态');
const HOME_DIR = join(tmpdir(), 'tick-1121');
const BIN = join(ROOT, 'packages', 'skill-bill', 'dist', 'cli', 'cmd_read.js');

/** 五场景（判地：\`proto/query/w00-空态-查某天无记录-v2.1.html\`；查账单是别名，见 \`src/query/declaration.ts\`）。 */
const CASES = [
  ['w01-查今天', 'bill.record.today', {}, '今天零记录'],
  ['w02-查昨天', 'bill.record.today', { date: 'yesterday' }, '昨天零记录'],
  ['w00-查某天', 'bill.record.today', { date: '2026-06-04' }, '某天零记录（＝w00 判地那一页）'],
  ['w04-查最近', 'bill.record.today', { recent: true, limit: 10 }, '库里零记录'],
  ['w05-查账单', 'bill.record.today', {}, '查账单别名：无参时与查今天同页（域声明里它无 preset）'],
];

rmSync(HOME_DIR, { recursive: true, force: true });
mkdirSync(join(HOME_DIR, '.ilife'), { recursive: true });
writeFileSync(join(HOME_DIR, '.ilife', 'bill.yaml'), 'db:' + String.fromCharCode(10) + '  dir: ' + JSON.stringify(HOME_DIR) + String.fromCharCode(10), 'utf8');
mkdirSync(OUT, { recursive: true });

const env = { ...process.env, USERPROFILE: HOME_DIR, HOME: HOME_DIR };
const domOnly = (h) => h.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ');
const countOf = (t, n) => t.split(n).length - 1;

const rows = [];
const log = [];
for (const [id, key, params, note] of CASES) {
  const file = join(OUT, id + '.html');
  rmSync(file, { force: true });
  const r = spawnSync(process.execPath, [BIN, key, '--params', JSON.stringify(params), '--html', file], { cwd: ROOT, encoding: 'utf8', env });
  const exists = existsSync(file);
  const html = exists ? readFileSync(file, 'utf8') : '';
  const body = domOnly(html);
  const sheetRoot = countOf(body, '<div class="ilife-bill-sheet-page');
  const cutLine = countOf(body, '✂ 裁切线');
  const oldShell = countOf(body, 'ilife-block-page-shell');
  const emptyBlock = countOf(body, 'ilife-block-empty-block');
  const family = sheetRoot >= 1 && cutLine >= 1 ? '票据纸' : (oldShell > 0 ? '回落老壳' : '其它壳');
  const ok = r.status === 0 && family === '票据纸' && oldShell === 0 && emptyBlock === 1;
  rows.push({
    id, key, params, note, file: id + '.html', exit: r.status,
    bytes: exists ? statSync(file).size : 0,
    sheetRoot, cutLine, oldShell, emptyBlock, family, ok,
    sha256: exists ? createHash('sha256').update(html).digest('hex').slice(0, 16) : '',
    stderr: String(r.stderr ?? '').slice(-200),
  });
  log.push([id, 'exit=' + String(r.status), 'bytes=' + String(exists ? statSync(file).size : 0),
    'sheetRoot=' + String(sheetRoot), '裁切线=' + String(cutLine), '旧壳=' + String(oldShell),
    '空态块=' + String(emptyBlock), '=> ' + family, ok ? 'PASS' : 'RED'].join(' | '));
}

const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
const distSha = existsSync(BIN) ? createHash('sha256').update(readFileSync(BIN)).digest('hex') : '';
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({
  ticket: 1121, purpose: '空窗口 5 场景票据纸空态渲染（零库）',
  isolatedHome: HOME_DIR, seeded: false,
  proto: 'docs/skills/skill-bill/proto/query/w00-空态-查某天无记录-v2.1.html',
  snapshot: { gitHead: head, cmdReadDistSha256: distSha, at: new Date().toISOString() },
  rows,
}, null, 2), 'utf8');

console.log(log.join(String.fromCharCode(10)));
const bad = rows.filter((x) => !x.ok);
console.log('SNAPSHOT HEAD=' + head.slice(0, 8) + ' dist=' + distSha.slice(0, 12) + ' 隔离家目录=' + HOME_DIR);
console.log('RESULT: ' + String(rows.length - bad.length) + '/' + String(rows.length) + ' 场景出票据纸空态'
  + (bad.length ? '；回落/异常 -> ' + bad.map((b) => b.id + '［' + b.family + ' 旧壳=' + String(b.oldShell) + '］').join('、') : ' -> 空窗口 5 场景已切票据纸'));
console.log('OUT: ' + OUT);
process.exit(bad.length === 0 ? 0 : 1);
