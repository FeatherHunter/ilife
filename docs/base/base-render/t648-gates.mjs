#!/usr/bin/env node
/** t648 判据电池（12 项）：编译 → 靶向测试 → 同族回归 → 台账门 → 门禁（分隔符）。
 *
 *  用法：node tooling/run-locked.mjs --ticket 648 -- node .scratch/t648/gates.mjs
 *  读数逐行落 .scratch/t648/gates.log；末行给「硬失败 n → PASS/FAIL」。
 *  注：**本脚本与 t647 那套分开**（#648 是独立复核席，不采信实施者的判据包装）。
 */
import { spawnSync } from 'node:child_process';
import { appendFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const LOG = join(HERE, 'gates.log');
const lines = [];
/** 每条判据的 runId 与读数摘要（供证据件对账）。 */
const summary = [];
function say(line) { console.log(line); lines.push(line); }

function run(label, args, { keep = 6, hard = true } = {}) {
  const r = spawnSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, cwd: ROOT });
  const out = String(r.stdout ?? '') + String(r.stderr ?? '');
  const tail = out.split(/\r?\n/).filter((l) => l.trim() !== '');
  for (const line of tail.slice(-keep)) say('      ' + line.trim());
  say('  ' + label.padEnd(36) + ' exit=' + r.status);
  if (hard && r.status !== 0) hardFail += 1;
  summary.push({ label, exit: r.status, tail: tail.slice(-keep) });
  return r.status;
}

writeFileSync(LOG, '# t648 判据电池读数 ' + new Date().toISOString() + '\n', 'utf8');
say('=== t648 判据电池 ===');
let hardFail = 0;

say('① 编译（node node_modules/typescript/bin/tsc -b packages/skill-calorie --force）');
run('tsc -b packages/skill-calorie', [join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc'), '-b', join(ROOT, 'packages', 'skill-calorie'), '--force'], { keep: 4 });

say('② 靶向测试（本票新探针 ＋ #647 一页探针）');
run('node --test t648-十页铺开', ['--test', join(ROOT, 'packages', 'skill-calorie', 'test', 't648-十页铺开.test.mjs')], { keep: 10 });
run('node --test t647-短名化-一页', ['--test', join(ROOT, 'packages', 'skill-calorie', 'test', 't647-短名化-一页.test.mjs')], { keep: 8 });

say('③ 同族回归（同区块／同页归属票的既有探针）');
run('node --test t275-营养饮水总览页', ['--test', join(ROOT, 'packages', 'skill-calorie', 'test', 't275-营养饮水总览页.test.mjs')], { keep: 8 });
run('node --test t273-review-meal', ['--test', join(ROOT, 'packages', 'skill-calorie', 'test', 't273-review-meal.test.mjs')], { keep: 8 });

say('④ 台账门（本票改了 149 行的 review.ts：未超线，台账不动也该绿）');
run('check-warning-line', [join(ROOT, 'packages', 'skill-calorie', 'scripts', 'check-warning-line.mjs')], { keep: 6 });

writeFileSync(LOG, lines.join('\n') + '\n' + JSON.stringify(summary, null, 2) + '\n', 'utf8');
say('=== 硬失败=' + hardFail + ' → ' + (hardFail === 0 ? 'PASS' : 'FAIL') + ' ===');
process.exit(hardFail === 0 ? 0 : 1);
