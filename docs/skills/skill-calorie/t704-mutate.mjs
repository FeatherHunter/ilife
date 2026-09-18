/**
 * #704 变异自证：打的是「搬迁后这个件仍然是出这一页的那个件」这条判据本身。
 *
 * 做法（照 `t518-W1-搬家-证据.md` §3.3 先例）：把搬走的 `planEditorDocs.ts` 里一处**会落到页面上**的
 * 可见文案改坏 → 重编 → 重出并与基线逐页比，**必须红**；再逐字节写回原文 → 重编 → 重出，**必须绿**。
 *
 * 必须在**同一个持锁窗口**里跑（外层 `run-locked.mjs` 持锁，窗口内 tsc／重出器一律直调不抢锁）。
 * 还原判据＝文件字节 sha256 与改前逐字相同（不是整目录还原）。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const ROOT = 'D:/ilife';
const TARGET = `${ROOT}/packages/skill-calorie/src/workout/planEditorDocs.ts`;
const ANCHOR = '生成的计划，照这张表落库';
const BROKEN = '生成的计划（改坏了），照这张表落库';
const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

const original = readFileSync(TARGET, 'utf8');
const n = original.split(ANCHOR).length - 1;
if (n !== 1) { console.log(`变异锚点在盘上命中 ${n} 处（要求 1 处），停`); process.exit(1); }
const origSha = sha(original);

const run = (cmd, args) => spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', timeout: 900000 });
const tsc = () => {
  const r = run(process.execPath, ['node_modules/typescript/bin/tsc', '-b', 'packages/skill-calorie']);
  if (r.status !== 0) { console.log('tsc 红：\n' + (r.stdout || '') + (r.stderr || '')); process.exit(1); }
};
const regen = (tag, out) => {
  const r = run(process.execPath, ['.scratch/t704/regen.mjs', '--tag', tag, '--compare', '.scratch/t704/基线.json', '--out', out]);
  const lines = (r.stdout || '').split('\n').filter((l) => l.startsWith(tag + ' ') || l.trim().startsWith('total_'));
  return { status: r.status, lines };
};

let failed = false;

// ── 变异轮 ──────────────────────────────────────────────────────
writeFileSync(TARGET, original.split(ANCHOR).join(BROKEN));
tsc();
const red = regen('MUT-RED', '.scratch/t704/产物-变异');
console.log(red.lines.join('\n'));
if (red.status === 0) { console.log('变异轮没红 —— 判据没有识别力，停'); failed = true; }

// ── 还原（逐字节写回原文） ──────────────────────────────────────
writeFileSync(TARGET, original);
const restored = readFileSync(TARGET, 'utf8');
console.log(`RESTORE 相等=${sha(restored) === origSha} sha256_12=${origSha.slice(0, 12)}`);
if (sha(restored) !== origSha) { console.log('还原不逐字相同，停'); process.exit(1); }

// ── 还原轮 ──────────────────────────────────────────────────────
tsc();
const green = regen('GREEN', '.scratch/t704/产物-还原');
console.log(green.lines.join('\n'));
if (green.status !== 0) { console.log('还原轮没绿，停'); failed = true; }

process.exit(failed ? 1 : 0);
