/**
 * #715 变异自证：打的是「搬迁后这个件仍然是出这五页的那个件」这条判据本身。
 *
 * 做法（照 `t704-搬家-证据.md` §3.2／`t518-W1-搬家-证据.md` §3.3 先例）：在**搬迁后的新家**里
 * 挑一件会落到页面上的可见文案改坏 → 重编 → 重出并与基线逐页比，**必须红**；
 * 再**逐字节写回原文** → 重编 → 重出，**必须绿**。
 *
 * 两轮变异（打不同页族，验证判据的识别面不是只覆盖一条页）：
 *   ① 力量页的来源句 `STRENGTH_SOURCE`（只喂力量那一键）；
 *   ② 有氧页的 `km` 单位（有氧页的距离列／表头都用它）。
 *
 * 必须在**同一个持锁窗口**里跑（外层 `run-locked.mjs` 持锁，窗口内 tsc／重出器一律直调不抢锁）。
 * 还原判据＝文件字节 sha256 与改前逐字相同（逐文件写回，不是整目录还原）。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const ROOT = 'D:/ilife';
const TARGET = `${ROOT}/packages/skill-calorie/src/exercise/sportPortDocs.ts`;
const BASELINE = '.scratch/t715/基线.json';
const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

const MUTANTS = [
  { tag: 'STRENGTH_SOURCE', anchor: "'运动记录（本窗未删除的力量行）'", broken: "'运动记录（改坏了的力量行）'" },
  { tag: 'km 单位', anchor: "numUnit(v.totalDistanceKm, 'km')", broken: "numUnit(v.totalDistanceKm, 'km改坏')" },
];

const run = (cmd, args) => spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', timeout: 900000 });
const tsc = () => {
  const r = run(process.execPath, ['node_modules/typescript/bin/tsc', '-b', 'packages/skill-calorie']);
  if (r.status !== 0) { console.log('tsc 红：\n' + (r.stdout || '') + (r.stderr || '')); process.exit(1); }
};
const regen = (tag, out) => {
  const r = run(process.execPath, ['.scratch/t715/regen.mjs', '--tag', tag, '--compare', BASELINE, '--out', out]);
  const lines = (r.stdout || '').split('\n').filter((l) => l.startsWith(tag + ' ') || l.trim().startsWith('total_'));
  return { status: r.status, lines };
};

let failed = false;
const original = readFileSync(TARGET, 'utf8');
const origSha = sha(original);

for (const [i, m] of MUTANTS.entries()) {
  const hits = original.split(m.anchor).length - 1;
  if (hits !== 1) { console.log(`变异锚点「${m.tag}」在盘上命中 ${hits} 处（要求 1 处），停`); process.exit(1); }

  // ── 变异轮 ──────────────────────────────────────────────────────
  writeFileSync(TARGET, original.split(m.anchor).join(m.broken));
  tsc();
  const red = regen(`MUT${i + 1}-RED`, `.scratch/t715/产物-变异${i + 1}`);
  console.log(`【${m.tag}】`);
  console.log(red.lines.join('\n'));
  if (red.status === 0) { console.log(`变异轮（${m.tag}）没红 —— 判据没有识别力，停`); failed = true; }

  // ── 还原（逐字节写回原文） ──────────────────────────────────────
  writeFileSync(TARGET, original);
  const restored = readFileSync(TARGET, 'utf8');
  console.log(`RESTORE-${i + 1} 相等=${sha(restored) === origSha} sha256_12=${origSha.slice(0, 12)}`);
  if (sha(restored) !== origSha) { console.log('还原不逐字相同，停'); process.exit(1); }

  // ── 还原轮 ──────────────────────────────────────────────────────
  tsc();
  const green = regen(`GREEN${i + 1}`, `.scratch/t715/产物-还原${i + 1}`);
  console.log(green.lines.join('\n'));
  if (green.status !== 0) { console.log(`还原轮（${m.tag}）没绿，停`); failed = true; }
}

process.exit(failed ? 1 : 0);
