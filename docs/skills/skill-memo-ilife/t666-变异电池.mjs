#!/usr/bin/env node
/**
 * #666 · 变异电池（改坏必红／还原必绿，两轮）。
 * 跑法（经排队锁）：node tooling/run-locked.mjs --ticket 666 -- node docs/skills/skill-memo-ilife/t666-变异电池.mjs
 * 机理（沿 #665 两条实操教训）：
 *  1. Windows `copyFileSync` 保留源 mtime ⇒ 还原后必须把源码 mtime 拨到当下，否则 `tsc -b`
 *     判「已是最新」不重编、`dist` 里留着改坏那一版——还原后必断言产物里真有／真没有那段行。
 *  2. 挡板只认真命令：本电池不碰挡板形状，只改本包源码。
 * 两轮各打 D-03 的一处改造：
 *  MUT-1 打改造①（默认不跑）：诊断分支改成恒真 ⇒ 默认路径偷跑自检，D3（零 +create）必须红。
 *  MUT-2 打改造③（删干净）：删尝试改成空操作 ⇒ 成功链留完成态残留，D1（删干净＋exit 0）必须红。
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, utimesSync } from 'node:fs';

const ROOT = process.cwd();
// 变异构建一律 `--force`：增量门在“改完即编”节拍下曾漏编一次（见 t658-C 证据件），电池不赌它。
const TSC = ['node', 'node_modules/typescript/bin/tsc', '-b', '--force', 'packages/skill-memo-ilife'];
let failures = 0;

function sh(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8' });
  return r.status;
}
function build() {
  const s = sh(TSC[0], TSC.slice(1));
  if (s !== 0) throw new Error('构建失败 exit=' + s);
}
function runTest(file, pattern) {
  const args = ['--test'];
  if (pattern) args.push('--test-name-pattern', pattern);
  args.push(file);
  return sh('node', args);
}
function touchNow(path) {
  const now = new Date();
  utimesSync(path, now, now);
}
function round(name, file, from, to, testFile, pattern, distNeedle) {
  const path = file;
  const orig = readFileSync(path, 'utf8');
  if (!orig.includes(from)) throw new Error(name + '：改坏锚点不在了：' + from.slice(0, 60));
  let redOk = false;
  // 改坏 → 必须红（构建红也算红，照收；但还原必须能编过，否则是电池写法问题，直接抛）。
  writeFileSync(path, orig.replace(from, to), 'utf8');
  touchNow(path);
  try {
    if (path.endsWith('.ts')) build();
    redOk = runTest(testFile, pattern) !== 0;
  } catch (e) {
    redOk = true;
    console.log(name + ' 改坏=构建红（照收）：' + String(e).slice(0, 120));
  }
  console.log(name + ' 改坏=' + (redOk ? '红' : '绿（坏！）'));
  if (!redOk) failures += 1;
  // 还原 → 必须绿，且产物里真没那段坏行（有针才查）。
  writeFileSync(path, orig, 'utf8');
  touchNow(path);
  if (path.endsWith('.ts')) build();
  if (distNeedle) {
    const dist = readFileSync(distNeedle.file, 'utf8');
    const has = dist.includes(distNeedle.bad);
    console.log(name + ' 产物残留检查=' + (!has ? '干净' : '有残留（坏！）'));
    if (has) failures += 1;
  }
  const greenOk = runTest(testFile, pattern) === 0;
  console.log(name + ' 还原=' + (greenOk ? '绿' : '红（坏！）'));
  if (!greenOk) failures += 1;
}

const TEST = 'packages/skill-memo-ilife/test/sentinel-666.test.mjs';

round(
  'MUT-1', 'packages/skill-memo-ilife/src/cli/cmd_read.ts',
  "        return ok({ ok: true, message: '授权状态', step: 'status', ...authStatus() });",
  "        { const r = runSentinel(undefined); return { data: r.receipt, exit: r.exit }; }",
  TEST, 'D3',
  { file: 'packages/skill-memo-ilife/dist/cli/cmd_read.js', bad: 'runSentinel(undefined); return' },
);

round(
  'MUT-2', 'packages/skill-memo-ilife/src/fetch/sentinel.ts',
  '    deleteTask(cli, guid);',
  '    void cli; void guid;',
  TEST, 'D1',
  { file: 'packages/skill-memo-ilife/dist/fetch/sentinel.js', bad: 'void cli; void guid;' },
);

if (failures) {
  console.log('MUTATION RESULT: FAIL(' + failures + ')');
  process.exit(1);
}
console.log('MUTATION RESULT: PASS');
