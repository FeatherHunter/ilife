#!/usr/bin/env node
/** #101 · 变异自证（可复跑）：故意破坏写链落库／删除回执文案 → 落库断言必须变红 → 恢复变绿。
 *
 * 判据（逐变异）：
 *   - `pnpm build` 必须 exit 0（否则变异没编译进去，证据无效）；
 *   - 新增的落库断言 `test/cmd-write-40-persist.test.mjs` 必须 **exit ≠ 0**；
 *   - 恢复后两者都必须 exit 0。
 * 「旧回执断言」`test/cmd-write-40.test.mjs` 一栏只作**对照**：M1／M3／M4 上它仍绿，
 * 正是「只断言回执行字串测不出落库」的直接证据；M2 上它变红是顺带撞上 exit 4 存在性校验，非落库断言。
 *
 * 用法（须先 `pnpm build`；本脚本自己持 `D:\ilife\.scratch\locks\gate.lock`）：
 *   node docs/research/t101-mutation.mjs                 # 全部 4 个变异
 *   node docs/research/t101-mutation.mjs --only M3       # 只跑指定变异
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, 'packages', 'skill-calorie', 'src', 'cli', 'write.ts');
const LOCK = join(ROOT, '.scratch', 'locks', 'gate.lock');
const NEW_TEST = 'packages/skill-calorie/test/cmd-write-40-persist.test.mjs';
const OLD_TEST = 'packages/skill-calorie/test/cmd-write-40.test.mjs';

const MUTANTS = [
  {
    name: 'M1-write-value-not-persisted',
    old: 'caloriesBurned: cal as number',
    neu: 'caloriesBurned: 0',
    note: '运动写入值被换成 0：回执照旧，库内值错',
  },
  {
    name: 'M2-delete-call-removed',
    old: '        deleteRecord(db, id);',
    neu: '        /* mutant: deleteRecord call removed */',
    note: '软删调用整条摘掉',
  },
  {
    name: 'M3-wording-wrong',
    old: '（软删除，可恢复）',
    neu: '[MUTANT-TAG]',
    note: '软删词条被替换：文案与库内语义脱钩',
  },
  {
    name: 'M4-hard-delete-not-persisted',
    old: '        const r = deleteWeight(db, id);',
    neu: "        const r = deleteWeight(db, id); db.prepare('INSERT INTO weight_log (id, date, time, weight_kg, bmi, note) VALUES (?, ?, ?, ?, ?, ?)').run(r.id, r.date, r.time, r.weight_kg, r.bmi, r.note);",
    note: '硬删后又把行按原 id 插回：回执照旧，库里没删掉',
  },
];

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

function acquireLock() {
  mkdirSync(dirname(LOCK), { recursive: true });
  for (;;) {
    if (existsSync(LOCK)) {
      const ageMin = (Date.now() - statSync(LOCK).mtimeMs) / 60000;
      if (ageMin > 10) { rmSync(LOCK, { recursive: true, force: true }); continue; }
      sleep(5000);
      continue;
    }
    try { mkdirSync(LOCK); return; } catch { sleep(2000); }
  }
}

const run = (cmd) => spawnSync(cmd, { cwd: ROOT, shell: true, encoding: 'utf8' });

const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const picked = only ? MUTANTS.filter((m) => m.name === only) : MUTANTS;
if (picked.length === 0) { console.error('no such mutant: ' + only); process.exit(2); }

acquireLock();
const orig = readFileSync(SRC, 'utf8');
const rows = [];
try {
  for (const m of picked) {
    if (!orig.includes(m.old)) { console.error('pattern not found for ' + m.name); process.exitCode = 2; break; }
    writeFileSync(SRC, orig.split(m.old).join(m.neu), 'utf8');
    const build = run('pnpm build');
    const newT = run('node --test ' + NEW_TEST);
    const oldT = run('node --test ' + OLD_TEST);
    writeFileSync(SRC, orig, 'utf8');
    rows.push({ mutant: m.name, build: build.status, persistAssert: newT.status, oldReceiptAssert: oldT.status, note: m.note });
    console.log(`${m.name}: build=${build.status} newPersistTest=${newT.status} oldReceiptTest=${oldT.status}`);
  }
} finally {
  writeFileSync(SRC, orig, 'utf8');
  const build = run('pnpm build');
  console.log('RESTORED: build=' + build.status);
  rows.push({ mutant: 'RESTORED', build: build.status, persistAssert: 0, oldReceiptAssert: 0, note: '源码复原后重建（dist 与源一致）' });
  rmSync(LOCK, { recursive: true, force: true });
}
console.log('\n| 变异 | build | 落库断言（新） | 旧回执断言（对照） | 说明 |');
console.log('| --- | --- | --- | --- | --- |');
for (const r of rows) console.log(`| ${r.mutant} | ${r.build} | ${r.persistAssert} | ${r.oldReceiptAssert} | ${r.note} |`);
const bad = rows.filter((r) => r.mutant !== 'RESTORED' && (r.build !== 0 || r.persistAssert === 0));
if (bad.length) { console.error('变异自证不成立：' + bad.map((b) => b.mutant).join('、')); process.exitCode = 1; }
