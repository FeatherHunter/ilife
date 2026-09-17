#!/usr/bin/env node
/**
 * #661 · 变异自证（协议 §5）：改坏必红／还原必绿，两行机器读数。
 *
 * 两轮，各打一条判据：
 *   MUT-A 改坏＝「建前不查重」（老行为）→ 四条读数里的幂等那条必须红；
 *   MUT-B 改坏＝「删心愿只标完成」（老行为，D-06 的还原态）→ 删心愿那条必须红。
 * 每轮都：备份 → 改坏（断言片段恰出现 1 次）→ 编译 → **校验编译产物真的含改坏后的行为** → 跑用例（必须红）
 * → 逐文件还原 → 校验还原后与原件 sha256 一致 → 编译 → **校验产物回到正确行为** → 跑用例（必须绿）。
 *
 * ⚠️ 两处实测踩过的坑，写在这里免得下次再踩：
 *   1. Windows 的 `copyFileSync` **保留源文件的 mtime**（CopyFileW 语义）⇒ 还原后源码 mtime 比 dist 还旧，
 *      `tsc -b` 会判「已是最新」而不重编，`dist` 里留着改坏那一版（假绿/假红都会出）。故还原后必须
 *      `utimesSync` 把源码 mtime 拨到当下。
 *   2. 只看用例红绿不够——必须先断言 **dist 里真有／真没有** 那段改坏后的行为，否则读到的是陈旧产物。
 *
 * 本脚本只动两件源码（都在本票声明路径内）且只经 `.scratch/t661/mut-backup` 备份还原，不做任何递归删除；
 * 须在**外层加锁窗口**内运行（窗口内一律直接调用，不再抢锁）。
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, utimesSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const ROOT = process.cwd();
const SCRATCH = join(ROOT, '.scratch', 't661');
const BACKUP = join(SCRATCH, 'mut-backup');
const PKG = join(ROOT, 'packages', 'skill-memo-ilife');
const TEST = join('packages', 'skill-memo-ilife', 'test', 'wish-sync-661.test.mjs');
const FILES = {
  taskSync: join(PKG, 'src', 'wish', 'taskSync.ts'),
  ensure: join(PKG, 'src', 'wish', 'ensure.ts'),
  reconcile: join(PKG, 'src', 'wish', 'reconcile.ts'),
  tasks: join(PKG, 'src', 'fetch', 'tasks.ts'),
  helpSync: join(PKG, 'src', 'help', 'scenes', 'sync.ts'),
};
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex').slice(0, 16);
const originals = Object.fromEntries(Object.entries(FILES).map(([k, p]) => [k, sha(p)]));

mkdirSync(BACKUP, { recursive: true });
for (const [k, p] of Object.entries(FILES)) copyFileSync(p, join(BACKUP, k + '.ts'));

/** 还原＝逐文件取回备份，并把 mtime 拨到当下（否则 tsc -b 判「已是最新」不重编）。 */
function restore() {
  const now = new Date();
  for (const [k, p] of Object.entries(FILES)) {
    copyFileSync(join(BACKUP, k + '.ts'), p);
    utimesSync(p, now, now);
  }
}

function compile() {
  const r = spawnSync(process.execPath, [join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc'), '-b', 'packages/skill-memo-ilife'], { cwd: ROOT, encoding: 'utf8' });
  return { code: r.status, tail: String(r.stdout || '').trim().split('\n').slice(-3).join(' / ') };
}

function runTest(pattern) {
  const r = spawnSync(process.execPath, ['--test', '--test-name-pattern', pattern, TEST], { cwd: ROOT, encoding: 'utf8' });
  const text = String(r.stdout || '') + String(r.stderr || '');
  const pass = (text.match(/^ℹ pass (\d+)/m) || [])[1];
  const fail = (text.match(/^ℹ fail (\d+)/m) || [])[1];
  const why = (text.match(/AssertionError \[ERR_ASSERTION\]: (.+)/) || [])[1] || '';
  return { code: r.status, pass, fail, why: why.slice(0, 140), text };
}

/** 包内某件里有没有那段行为（判「改坏真的编进去了／还原真的编回去了」）。 */
function distHas(rel, needle) {
  const p = join(PKG, rel);
  return existsSync(p) && readFileSync(p, 'utf8').includes(needle);
}

/** HELP 生成物门：手改产物一个字节 → `--check` 必须红；还原 → 必须绿。 */
function helpCheck() {
  const r = spawnSync(process.execPath, [join(PKG, 'scripts', 'gen-help-assets.mjs'), '--check'], { cwd: ROOT, encoding: 'utf8' });
  const text = String(r.stdout || '') + String(r.stderr || '');
  const why = (text.match(/DRIFT：(.+)/) || text.match(/摘要锁对不上：(.+)/) || [])[1] || '';
  return { code: r.status, why: why.slice(0, 140), text };
}

const out = [];
let bad = 0;

function round(id, what, fileKey, from, to, pattern, dist, custom) {
  const p = FILES[fileKey];
  const src = readFileSync(p, 'utf8');
  const hits = src.split(from).length - 1;
  if (hits !== 1) { out.push(id + ' 失败：变异锚点命中 ' + hits + ' 次（应恰 1 次）'); bad += 1; return; }
  writeFileSync(p, src.split(from).join(to), 'utf8');
  utimesSync(p, new Date(), new Date());
  const c1 = custom ? { code: 0 } : compile();
  if (c1.code !== 0) { restore(); out.push(id + ' 失败：改坏后编译红：' + c1.tail); bad += 1; return; }
  const brokeIn = dist ? distHas(dist.rel, dist.broken) : true;
  const red = custom ? custom() : runTest(pattern);
  restore();
  const same = Object.entries(FILES).every(([k, q]) => sha(q) === originals[k]);
  const c2 = custom ? { code: 0 } : compile();
  const backIn = dist ? distHas(dist.rel, dist.fixed) : true;
  const green = custom ? custom() : runTest(pattern);
  writeFileSync(join(SCRATCH, 'mut-' + id + '-red.log'), red.text, 'utf8');
  writeFileSync(join(SCRATCH, 'mut-' + id + '-green.log'), green.text, 'utf8');
  const okRed = red.code !== 0 && brokeIn && (custom ? true : red.fail === '1' && red.pass === '0');
  const okGreen = green.code === 0 && same && backIn && c2.code === 0 && (custom ? true : green.fail === '0');
  if (!okRed || !okGreen) bad += 1;
  const mk = dist ? '（产物含改坏行为=' + brokeIn + '／回到正确行为=' + backIn + '）' : '（产物断言=略：锚点行在产物里不唯一，红绿由用例自身承担）';
  out.push(id + ' ' + what + '　改坏必红＝' + okRed + mk + ' exit=' + red.code
    + (custom ? '' : ' pass=' + red.pass + ' fail=' + red.fail) + (red.why ? ' 红在『' + red.why + '』' : '')
    + '　还原必绿＝' + okGreen + '（sha一致=' + same + ' exit=' + green.code
    + (custom ? '' : ' pass=' + green.pass + ' fail=' + green.fail) + '）');
}

try {
  round('MUT-A', '「建前不查重」（老行为）→ 幂等读数', 'taskSync',
    'const existing = hitOf(searchTasks(cli, { summary: note.title, due: note.due ?? null }), note.title);',
    'const existing: string | null = null;', '#661 T2',
    { rel: 'dist/wish/taskSync.js', broken: 'const existing = null;', fixed: 'searchTasks(cli' });
  round('MUT-B', '「删心愿只标完成」（老行为 D-06／D-17）→ 删心愿读数', 'ensure',
    'deleteRemoteWish(gate.cli, guid);', 'completeRemoteWish(gate.cli, guid);', '#661 T6',
    { rel: 'dist/wish/ensure.js', broken: 'completeRemoteWish(gate.cli, guid);', fixed: 'deleteRemoteWish(gate.cli, guid);' });
  round('MUT-C', '偏离 D-15：查重键用未截断全文（老行为）→ 长标题读数', 'tasks',
    "'--query', taskTitle(query.summary)", "'--query', query.summary", '#661 T10',
    { rel: 'dist/fetch/tasks.js', broken: "'--query', query.summary", fixed: 'taskTitle(query.summary)' });
  round('MUT-D', '偏离 D-16：只在有排期日期时查重（老行为）→ 无排期查重读数', 'taskSync',
    '  const existing = hitOf(searchTasks(cli, { summary: note.title, due: note.due ?? null }), note.title);',
    '  const existing: string | null = note.due ? hitOf(searchTasks(cli, { summary: note.title, due: note.due }), note.title) : null;',
    '#661 T9',
    { rel: 'dist/wish/taskSync.js', broken: 'note.due ? hitOf', fixed: 'const existing = hitOf' });
  round('MUT-E', '偏离 D-18：对账步 2 把心愿转打卡（老行为会删心愿并生成打卡）→ 对账读数', 'reconcile',
    '    updateNote(db, row.id, { done: true });', "    updateNote(db, row.id, { done: true, category: '打卡' });", '#661 T7',
    { rel: 'dist/wish/reconcile.js', broken: "category: '打卡'", fixed: 'updateNote(db, row.id, { done: true });' });
  round('MUT-F', '偏离 D-19：远端不可用时退出码照老口径写 0 → 降级读数（退出码那一格）', 'ensure',
    "remote: 'unavailable', remoteId: note.feishuTaskGuid ?? null },\n      exit: 4,",
    "remote: 'unavailable', remoteId: note.feishuTaskGuid ?? null },\n      exit: 0,", '#661 T7', null);
  round('MUT-H', '偏离 D-20：本地侧建前不判重（老行为：直插 INSERT）→ 幂等读数（本地那一格）', 'ensure',
    '  const found = localWishRow(db, input.title, due);', '  const found: MemoNote | null = null;', '#661 T2',
    { rel: 'dist/wish/ensure.js', broken: 'const found = null;', fixed: 'localWishRow(db, input.title, due)' });
  round('MUT-G', 'HELP 生成物门：手改产物一个字节 → --check 必须红（#227 那道锁的复用）', 'helpSync',
    '并回执 11 项统计。', '并回执 11 项统计！',
    null, { rel: 'src/help/scenes/sync.ts', broken: '并回执 11 项统计！', fixed: '并回执 11 项统计。' }, helpCheck);
} finally {
  restore();
  compile();
}

mkdirSync(SCRATCH, { recursive: true });
writeFileSync(join(SCRATCH, 'mutation-readings.txt'), out.join('\n') + '\n', 'utf8');
for (const l of out) console.log(l);
console.log('MUTATION RESULT: ' + (bad === 0 ? 'PASS' : 'FAIL(' + bad + ')'));
process.exit(bad === 0 ? 0 : 1);
