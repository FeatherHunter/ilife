#!/usr/bin/env node
/** #619 · 变异自证电池（两处，各两行机器读数）：判据是活的——改坏必红、还原必绿且逐字节回原。
 *
 *  变异 A（四处复验判据）：把 `看营养分析.html` 的 H1 改回旧写法（后接日期区间，正是 #616 改掉的那一处），
 *    跑 `docs/skills/skill-calorie/t619-四处复验.mjs` ⇒ 期望 `FIX-VERIFY 1/4 FAIL`／`RESULT: 3/4 FAIL`；
 *    还原后 ⇒ 期望 `RESULT: 4/4 PASS`。
 *  变异 B（门禁判据）：向 `记一餐.html`（门禁 83 里**零命中**的产物页）的**非脚注**节点塞一枚 `·`，
 *    跑 `audit-separators.mjs <该页>` ⇒ 期望 `RESULT: 0/1`（红）；还原后 ⇒ 期望 `RESULT: 1/1`／`PASS`。
 *
 *  只动本票写集内的墙产物，且**逐字节还原**；另打两行 `MANIFEST-BEFORE/AFTER` 证明清单未被污染。
 *  本件走锁：`node tooling/run-locked.mjs --ticket 619 -- node docs/skills/skill-calorie/t619-变异.mjs`
 *  （协议 §5：变异须在持锁期间做、释放锁前复原）。
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const WALL = join(ROOT, 'docs', 'skills', 'skill-calorie', 'scene02-验收墙');
const MANIFEST = join(WALL, 'manifest.json');
const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);
const mfBefore = readFileSync(MANIFEST);
const mfReadingBefore = JSON.parse(mfBefore.toString('utf8')).readings['字节区间'];
console.log('MANIFEST-BEFORE sha256=' + sha(mfBefore) + ' bytes=' + mfBefore.length + ' 字节区间=' + mfReadingBefore);

const run = (args) => {
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { status: r.status, lines: String(r.stdout || '').trim().split('\n') };
};
const show = (tag, out, needle) => {
  const hit = out.lines.filter((l) => l.includes(needle));
  console.log(tag + ' exit=' + out.status + ' ' + (hit[hit.length - 1] ?? '(无 ' + needle + ' 行)'));
};
const cycle = (file, mutate, label, probe, needle) => {
  const path = join(WALL, file);
  const before = readFileSync(path);
  console.log('── 变异 ' + label + '：' + file + '（变异前 sha256=' + sha(before) + ' bytes=' + before.length + '）');
  const mutant = Buffer.from(mutate(before.toString('utf8')), 'utf8');
  if (mutant.equals(before)) throw new Error('变异没改到东西（锚点没命中）');
  writeFileSync(path, mutant);
  show('MUTANT  ' + label, run(probe), needle);
  writeFileSync(path, before);
  const back = readFileSync(path);
  const same = back.equals(before);
  console.log('RESTORE ' + label + ' sha256=' + sha(back) + ' bytes=' + back.length + ' == 变异前 ' + (same ? '✓' : '✗'));
  if (!same) throw new Error('还原不是逐字节回原');
  show('RESTORE ' + label, run(probe), needle);
};

cycle('看营养分析.html',
  (h) => h.replace('<h1 class="ilife-block-page-shell-title">营养分析</h1>', '<h1 class="ilife-block-page-shell-title">营养分析 2026-09-09 至 2026-09-15</h1>'),
  'A/H1日期', [join(ROOT, 'docs', 'skills', 'skill-calorie', 't619-四处复验.mjs')], 'RESULT:');

cycle('记一餐.html',
  (h) => h.replace('<h2>✅ 操作回执</h2>', '<h2>✅ 操作·回执</h2>'),
  'B/门禁·', [join(ROOT, 'packages', 'skill-calorie', 'scripts', 'audit-separators.mjs'), join(WALL, '记一餐.html')], 'RESULT:');

const mfAfter = readFileSync(MANIFEST);
const mfReadingAfter = JSON.parse(mfAfter.toString('utf8')).readings['字节区间'];
console.log('MANIFEST-AFTER sha256=' + sha(mfAfter) + ' bytes=' + mfAfter.length + ' 字节区间=' + mfReadingAfter
  + ' == 变异前 ' + (mfAfter.equals(mfBefore) && mfReadingAfter === mfReadingBefore ? '✓' : '✗'));
if (!mfAfter.equals(mfBefore)) throw new Error('变异污染了 manifest.json');
