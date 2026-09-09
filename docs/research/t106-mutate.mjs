/** #106 变异自证（src 级 · **须在持锁包装器内跑**）：
 *  变异 → 重建 → 靶向测试红 → 立即还原（内存原文写回 ＋ sha256 自校）→ 重建 → 靶向测试绿。
 *  跑法：`node tooling/run-locked.mjs --ticket 106 -- node docs/research/t106-mutate.mjs`
 *
 *  两处 **src 级**变异各打一条本票核心断言：
 *   M1 口径层：`helpSceneCli` 恒返 `null`（＝回补被摘掉）→ 341 条命令行全部消失，必须红。
 *   M2 接线层：新场景不再挂 `editable_fields`（＝字段只发一半）→ 数据层／渲染层条数必须红。
 *
 *  还原口径：**内存原文写回 ＋ sha256 自校**（本文件与被变异文件均已提交，仍用写回法以与
 *  `t107-mutate.mjs` 同口径，且避免 `git checkout` 触碰共享 index）。
 *  机器可读摘要：末行 `RESULT: PASS|FAIL`。
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = join(ROOT, 'packages/skill-calorie/src/render/helpCenter.ts');
const TEST = 'packages/skill-calorie/test/help-center-106.test.mjs';
const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

const original = readFileSync(FILE, 'utf8');
const originalSha = sha256(original);
console.log('SHA-BEFORE ' + originalSha);

const run = (cmd, args) => spawnSync(cmd, args, { encoding: 'utf8', shell: true, cwd: ROOT });

function buildAndTest() {
  const b = run('pnpm', ['build']);
  if (b.status !== 0) return { build: b.status, test: null, fail: null, out: (b.stdout || '') + (b.stderr || '') };
  const t = run('node', ['--test', TEST]);
  const out = (t.stdout || '') + (t.stderr || '');
  const fail = /^ℹ fail (\d+)$/m.exec(out);
  return { build: 0, test: t.status, fail: fail ? Number(fail[1]) : null, out };
}

const mutations = [
  ['M1', '口径层：helpSceneCli 恒返 null', (src) => src.replace(
    '    if (route.kind === \'exec\') return route.cli;',
    '    if (route.kind === \'exec\') return null;',
  )],
  ['M2', '接线层：新场景不挂 editable_fields', (src) => src.replace(
    '      ...(badge === undefined ? {} : { types: [badge] }),\n'
    + '      ...(fields.length === 0 ? {} : { editable_fields: fields }),',
    '      ...(badge === undefined ? {} : { types: [badge] }),',
  )],
];

let ok = true;
for (const [tag, label, mutate] of mutations) {
  const mutated = mutate(original);
  if (mutated === original) { console.log('MUT ' + tag + ' FAIL 变异未命中锚点'); ok = false; continue; }
  writeFileSync(FILE, mutated, 'utf8');
  const red = buildAndTest();
  const isRed = red.test !== 0 && red.fail > 0;
  console.log('MUT ' + tag + ' (' + label + ') build=' + red.build + ' testExit=' + red.test
    + ' fail=' + red.fail + ' → ' + (isRed ? 'RED-AS-EXPECTED' : 'NOT-RED(缺陷)'));
  if (!isRed) { ok = false; console.log((red.out || '').slice(-1200)); }

  writeFileSync(FILE, original, 'utf8');
  const restoredSha = sha256(readFileSync(FILE, 'utf8'));
  console.log('MUT ' + tag + ' restored sha256=' + restoredSha + ' match=' + (restoredSha === originalSha));
  if (restoredSha !== originalSha) { ok = false; continue; }

  const green = buildAndTest();
  const isGreen = green.test === 0 && green.fail === 0;
  console.log('MUT ' + tag + ' green build=' + green.build + ' testExit=' + green.test
    + ' fail=' + green.fail + ' → ' + (isGreen ? 'GREEN-AS-EXPECTED' : 'NOT-GREEN(缺陷)'));
  if (!isGreen) { ok = false; console.log((green.out || '').slice(-1200)); }
}

console.log('SHA-AFTER ' + sha256(readFileSync(FILE, 'utf8')));
console.log('RESULT: ' + (ok ? 'PASS' : 'FAIL'));
process.exit(ok ? 0 : 1);
