/* #693 变异自证脚本（证据件，随 `t693-证据.md` 入仓，可复跑）。
 *
 * 做什么（源码级变异：把修复从模板源上拿掉，再走一遍生成管线）：
 *   ① 把 `packages/base-render/assets/help-template.html` 里 `stack.className = 'hm-toast-stack';` 那行删掉
 *      （回到修前形状：栈只写 id、不写定位类名）→ 重跑 `gen-help-shell` → 重编 → 跑 t693 用例（应红）；
 *   ② 用变异后的产物出两页长页复现件（长页「修前」证据）；
 *   ③ 还原模板 → 重跑生成管线 → 重编 → 跑 t693 用例（应绿）；
 *   ④ 打印机读摘要行。
 * 任一步抛错都在 `finally` 里还原并重跑生成管线，不把变异留在树里。
 *
 * 跑法（**必须在外层持锁的窗口里**跑，脚本内部一律不抢锁，见协议 §2）：
 *   node tooling/run-locked.mjs --ticket 693 -- node docs/base/base-render/t693-mut.mjs
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const ROOT = process.cwd();
const TPL = 'packages/base-render/assets/help-template.html';
const TEST = 'packages/base-render/test/help-toast-stack-693.test.mjs';
const REPRO = 'docs/base/base-render/t693-repro.mjs';
const OUT_DIR = '.scratch/t693';
const MUTATION_LINE = "      stack.className = 'hm-toast-stack';\r\n";

mkdirSync(OUT_DIR, { recursive: true });

const run = (args, out) => {
  const r = spawnSync(process.execPath, args, {
    cwd: ROOT,
    stdio: out ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    encoding: 'utf8',
  });
  if (out) writeFileSync(out, String(r.stdout ?? '') + String(r.stderr ?? ''), 'utf8');
  return r.status ?? 1;
};

const countTests = (log) => ({
  pass: /^[#\u2139]\s*pass\s+(\d+)/m.exec(log)?.[1] ?? '?',
  fail: /^[#\u2139]\s*fail\s+(\d+)/m.exec(log)?.[1] ?? '?',
  failing: (log.match(/^✖ /gm) ?? []).length,
});

const original = readFileSync(TPL, 'utf8');
if (!original.includes(MUTATION_LINE)) {
  console.error('变异锚点不存在：模板里没有那行 `stack.className = ...`（先确认在仓库根运行本脚本）');
  process.exit(2);
}

let summary;
try {
  writeFileSync(TPL, original.replace(MUTATION_LINE, ''), 'utf8');
  const genRed = run(['packages/base-render/scripts/gen-help-shell.cjs']);
  const tscRed = run(['node_modules/typescript/bin/tsc', '-b', 'packages/base-render']);
  const testRed = run(['--test', TEST], OUT_DIR + '/mutation-red.log');
  const redLog = readFileSync(OUT_DIR + '/mutation-red.log', 'utf8');
  const tallTop = run([REPRO, OUT_DIR + '/tall-before.html', 'top', 'tall']);
  const tallBottom = run([REPRO, OUT_DIR + '/tall-before-bottom.html', 'bottom', 'tall']);
  summary = { mutate: { gen: genRed, tsc: tscRed, test: testRed, tallTop, tallBottom, counts: countTests(redLog) } };
} finally {
  writeFileSync(TPL, original, 'utf8');
  const genGreen = run(['packages/base-render/scripts/gen-help-shell.cjs']);
  const tscGreen = run(['node_modules/typescript/bin/tsc', '-b', 'packages/base-render']);
  const testGreen = run(['--test', TEST], OUT_DIR + '/mutation-restore.log');
  const greenLog = readFileSync(OUT_DIR + '/mutation-restore.log', 'utf8');
  summary = {
    ...(summary ?? {}),
    restore: {
      gen: genGreen, tsc: tscGreen, test: testGreen,
      identical: readFileSync(TPL, 'utf8') === original,
      counts: countTests(greenLog),
    },
  };
}

const ok = summary.mutate.test !== 0
  && summary.restore.test === 0
  && summary.restore.identical
  && summary.mutate.gen === 0 && summary.mutate.tsc === 0
  && summary.restore.gen === 0 && summary.restore.tsc === 0;
console.log('MUTATION red: test exit=' + summary.mutate.test + ' fail=' + summary.mutate.counts.fail
  + ' 失败用例行=' + summary.mutate.counts.failing);
console.log('RESTORE  green: test exit=' + summary.restore.test + ' pass=' + summary.restore.counts.pass
  + ' fail=' + summary.restore.counts.fail + ' 模板逐字还原=' + summary.restore.identical);
console.log('RESULT: ' + (ok ? 'PASS' : 'FAIL')
  + ' mutate(gen=' + summary.mutate.gen + ',tsc=' + summary.mutate.tsc
  + ',tallTop=' + summary.mutate.tallTop + ',tallBottom=' + summary.mutate.tallBottom + ')'
  + ' restore(gen=' + summary.restore.gen + ',tsc=' + summary.restore.tsc + ')');
process.exit(ok ? 0 : 1);
