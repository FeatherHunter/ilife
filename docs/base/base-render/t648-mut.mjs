#!/usr/bin/env node
/** t648 变异自证（源码级，**独立复核席自设的新探针**）：把本票的铺开接线改坏
 *  ⇒ `t648-十页铺开` 必红 ⇒ 逐文件还原并重编 ⇒ 必绿。两行机器读数。
 *
 *  变异锚点＝`packages/skill-calorie/src/diet/review.ts` 里那处 `shortNames: true`（本票唯一改动）。
 *  与 #647 那套 `mut.mjs` 的差别（这就是「新探针」的意思）：那边打的是**配比页**接线（`nutritionPortDocs.ts`），
 *  这边打的是**复盘 8 词**接线（`review.ts`）——两处互为对方的盲区，各自被打坏时对方的探针不会红。
 *
 *  必须在持锁包装里跑：`node tooling/run-locked.mjs --ticket 648 -- node .scratch/t648/mut.mjs`
 *  （本件会临时改 `src/diet/review.ts` 并重编 ⇒ 走锁；`finally` 无条件还原源码并重编）。
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const SRC = join(ROOT, 'packages', 'skill-calorie', 'src', 'diet', 'review.ts');
const TEST = join(ROOT, 'packages', 'skill-calorie', 'test', 't648-十页铺开.test.mjs');
const TSC_ARGS = [join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc'), '-b', join(ROOT, 'packages', 'skill-calorie'), '--force'];

function build() {
  const r = spawnSync(process.execPath, TSC_ARGS, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) {
    console.log('MUT-ABORT 重编失败 exit=' + r.status + ' :: ' + String(r.stdout + r.stderr).slice(0, 400));
    process.exit(2);
  }
}
function runTest() {
  const r = spawnSync(process.execPath, ['--test', TEST], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const tail = String(r.stdout).split('\n').filter((l) => /^ℹ (pass|fail)/.test(l)).join(' ');
  return { status: r.status, tail };
}

const orig = readFileSync(SRC, 'utf8');
const broken = orig.replace('buildNutritionRatioBlock(loaded.ratio, { shortNames: true })',
  'buildNutritionRatioBlock(loaded.ratio)');
if (broken === orig) {
  console.log('MUT-ABORT 变异锚点没命中（接线写法变了？）：review.ts 里的 `{ shortNames: true }` 不在了');
  process.exit(2);
}
let red = null;
let green = null;
try {
  writeFileSync(SRC, broken, 'utf8');
  build();
  red = runTest();
} finally {
  writeFileSync(SRC, orig, 'utf8');
  build();
  green = runTest();
}
console.log('MUT-RED   铺开接线改坏（review.ts 的 `{ shortNames: true }` 摘掉）  靶向测试 exit=' + red.status
  + ' ' + red.tail + '  期望 exit=1');
console.log('MUT-GREEN 逐文件还原并重编                                      靶向测试 exit=' + green.status
  + ' ' + green.tail + '  期望 exit=0');
process.exit(red.status === 1 && green.status === 0 ? 0 : 1);
