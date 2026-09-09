/** #107 受锁运行器（**须在持锁包装器内跑**）：build／靶向测试／四门／canonical 四条路径。
 *  跑法：node tooling/run-locked.mjs --ticket 107 -- node docs/research/t107-run.mjs <mode>
 *   mode = targeted（build ＋ skill-t11／help-center-88／help-center-91）
 *        | gates（四门逐条：build／boundaries／snapshot:check／publish:pre）
 *        | canonical（pnpm test 1 轮，判据＝失败集新增 0，非 exit 码）
 *  机器可读摘要：逐条 `GATE <名> exit=<n>` ＋ 末行 `RESULT: …`。
 */
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const mode = process.argv[2] ?? '';
const run = (cmd, args) => spawnSync(cmd, args, { stdio: 'inherit', shell: true, cwd: ROOT });

const TARGETED_TESTS = [
  'packages/skill-calorie/test/skill-t11.test.mjs',
  'packages/skill-calorie/test/help-center-88.test.mjs',
  'packages/skill-calorie/test/help-center-91.test.mjs',
];

const PLANS = {
  targeted: [
    ['build', 'pnpm', ['build']],
    ['targeted-tests', 'node', ['--test', ...TARGETED_TESTS]],
  ],
  gates: [
    ['G1 build', 'pnpm', ['build']],
    ['G2 boundaries', 'pnpm', ['boundaries']],
    ['G3 snapshot:check', 'pnpm', ['snapshot:check']],
    ['G4 publish:pre', 'pnpm', ['publish:pre']],
  ],
  canonical: [
    ['canonical pnpm test', 'pnpm', ['test']],
  ],
};

if (!(mode in PLANS)) {
  console.error('用法：node docs/research/t107-run.mjs <targeted|gates|canonical>');
  process.exit(2);
}

let worst = 0;
for (const [label, cmd, args] of PLANS[mode]) {
  const r = run(cmd, args);
  console.log('GATE ' + label + ' exit=' + r.status);
  if (r.status !== 0) worst = r.status ?? 1;
}
// canonical 的判据是「失败集新增 0」而非 exit 码（冻结基线既有红必然 exit 1）；其余模式 exit 即判据。
const passed = mode === 'canonical' ? true : worst === 0;
console.log('RESULT: ' + (passed ? (mode === 'canonical' ? 'RAN(判据见失败集对账)' : 'PASS') : 'FAIL'));
process.exit(passed ? 0 : 1);
