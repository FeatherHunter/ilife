// #676 自证：改坏一处必须变红、改回必须变绿（验收第 5 条）。
//
// 改哪儿：`packages/plugin-calorie/src/settings.ts` 里设置页行表的一个键
// （`key: 'db.name'` → `key: 'db.names'`）。这一处一改，页面就与技能侧配置表对不上，
// 新写的 lockstep 断言「页面每一行都有对应的技能键，且技能每一个键都有对应行」必红。
//
// 跑法（**整个窗口由外层持锁包装器持锁**，本脚本内部直接调 node --test，不重复抢锁）：
//   node tooling/run-locked.mjs --ticket 676-变异 -- node docs/plugins/plugin-calorie/t676-变异.mjs
//
// 输出只留两行机器读数（协议 §2.2：变异只报红没红 / 还原后是否一致）：
//   MUTANT-RED  fail=<n> exit=<n>
//   RESTORED-GREEN fail=<n> exit=<n>
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const TARGET = join(REPO, 'packages', 'plugin-calorie', 'src', 'settings.ts');
const TEST = join(REPO, 'packages', 'plugin-calorie', 'test', 'config-surface-676.test.mjs');

const FROM = "key: 'db.name',";
const TO = "key: 'db.names',";

const original = readFileSync(TARGET, 'utf8');
if (!original.includes(FROM)) {
  console.log('PROBE-FAIL: 找不到要改的那一行（' + FROM + '）——源码变了就更新本探针');
  process.exit(1);
}

function runTest() {
  const r = spawnSync(process.execPath, ['--test', TEST], { encoding: 'utf8', cwd: REPO });
  const out = String(r.stdout ?? '') + String(r.stderr ?? '');
  const fail = Number((out.match(/^\D*fail (\d+)$/m) ?? [0, '0'])[1] ?? '0');
  return { exit: r.status ?? -1, fail };
}

/** 测试读的是编译产物（`dist/`），所以每次改完源码都要重建，否则量到的还是旧 dist。 */
function build() {
  const r = spawnSync(process.execPath, [join(REPO, 'node_modules', 'typescript', 'bin', 'tsc'), '-b', join(REPO, 'packages', 'plugin-calorie')], {
    encoding: 'utf8',
    cwd: REPO,
  });
  if ((r.status ?? -1) !== 0) {
    console.log('PROBE-FAIL: 重建失败 exit=' + r.status);
    console.log(String(r.stdout ?? '').slice(0, 400));
    process.exit(1);
  }
}

let red;
try {
  writeFileSync(TARGET, original.replace(FROM, TO), 'utf8');
  build();
  red = runTest();
  console.log('MUTANT-RED  fail=' + red.fail + ' exit=' + red.exit);
} finally {
  writeFileSync(TARGET, original, 'utf8');
  build();
}

const same = readFileSync(TARGET, 'utf8') === original;
const green = runTest();
console.log('RESTORED-GREEN fail=' + green.fail + ' exit=' + green.exit + ' byteIdentical=' + String(same));

const ok = red.exit !== 0 && red.fail > 0 && green.exit === 0 && green.fail === 0 && same;
console.log('RESULT: ' + (ok ? 'PASS' : 'FAIL') + '（改坏必红 ＋ 改回必绿 ＋ 逐字节还原）');
process.exitCode = ok ? 0 : 1;
