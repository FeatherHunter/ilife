#!/usr/bin/env node
/** #280 断言 · 验收墙自检**正反两面**（能红）：把变异自证写成可复跑的两行机器读数。
 *
 * 判据出处：`docs/agents/视觉验收墙.md` §4「反例（必跑）：故意在清单里写一个不存在的文件名，
 * 再跑一次 → exit 1 且点名那份 —— 走不出这条，说明自检永远不会红，等于没有」。
 *
 * 跑法（在检出根跑）：
 *   node docs/skills/skill-calorie/t280-断言-自检正反两面.mjs
 *   可带一个参数换产物目录；缺省＝`docs/skills/skill-calorie/scene02-验收墙`。
 *
 * 做三步，逐步断言：
 *   ① 正例：`--check` 必须 exit 0 且打出「缺失 0 -> 可发」；
 *   ② 反例：把清单第 1 行的 `file` 改成盘上不存在的名字，`--check` 必须 **exit 1** 且
 *      stderr 里**点名那一份**（既要点到变异名，也要点到那个唤醒词）；
 *   ③ 还原：把清单字节**逐字节写回**（先存 Buffer），`--check` 必须回到 exit 0。
 *
 * 边界：只读／只改**本票产物目录里的 manifest.json**，改完必还原；不动源码、不动别目录。
 * （Windows 上 `copyFileSync` 还原会把备份的 mtime 带回，本件按字节写回、并按内容断言，不看 mtime。）
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DIR = resolve(process.argv[2] || 'docs/skills/skill-calorie/scene02-验收墙');
const GEN = join(DIR, 'gen-wall.mjs');
const MF = join(DIR, 'manifest.json');
const MUTANT = '__变异-盘上没有这一份__.html';

if (!existsSync(GEN) || !existsSync(MF)) {
  console.error('缺件：' + GEN + ' 或 ' + MF);
  process.exit(2);
}

const check = () => {
  const r = spawnSync(process.execPath, [GEN, '--check', DIR], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { code: r.status, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
};

const fails = [];
const original = readFileSync(MF);          // 逐字节备份（还原时按字节写回）
let mf = null;

/* ① 正例 */
const a = check();
const aOk = a.code === 0 && /缺失 0 -> 可发/.test(a.out);
console.log('① 正例 --check：exit ' + a.code + '｜' + a.out);
if (!aOk) fails.push('正例未达到「exit 0 ＋ 缺失 0 -> 可发」');

/* ② 反例 */
try {
  mf = JSON.parse(original.toString('utf8'));
  const victim = mf.rows[0];
  const wake = victim.wake;
  victim.file = MUTANT;
  writeFileSync(MF, JSON.stringify(mf, null, 2), 'utf8');
  const b = check();
  const namesFile = b.err.includes(MUTANT);
  const namesWake = b.err.includes(wake);
  const bOk = b.code === 1 && namesFile && namesWake;
  console.log('② 反例 --check（第 1 行 file 改成 ' + MUTANT + '）：exit ' + b.code + '｜点名那一份 ' + (namesFile ? '是' : '否') + '｜点名唤醒词「' + wake + '」' + (namesWake ? '是' : '否'));
  console.log('   stderr：' + b.err.split('\n').filter(Boolean).join(' ／ '));
  if (!bOk) fails.push('反例未达到「exit 1 ＋ 点名那一份（文件名与唤醒词都要点到）」');
} finally {
  /* ③ 还原（无论 ② 怎样都还原） */
  writeFileSync(MF, original);
  const c = check();
  const cOk = c.code === 0 && /缺失 0 -> 可发/.test(c.out);
  const same = Buffer.compare(readFileSync(MF), original) === 0;
  console.log('③ 还原 --check：exit ' + c.code + '｜' + c.out + '｜清单与备份逐字节相同 ' + (same ? '是' : '否'));
  if (!cOk) fails.push('还原后未回到「exit 0 ＋ 缺失 0 -> 可发」');
  if (!same) fails.push('还原后清单与备份不逐字节相同');
}

if (fails.length) { for (const f of fails) console.error('FAIL: ' + f); process.exit(1); }
console.log('正反两面都走过：① exit 0 ／ ② exit 1 且点名 ／ ③ 还原 exit 0 -> 断言可红可绿');
