#!/usr/bin/env node
/**
 * #665 · 变异电池（改坏必红／还原必绿，六轮）。
 * 跑法（经排队锁）：node tooling/run-locked.mjs --ticket 665 -- node docs/skills/skill-memo-ilife/t665-变异电池.mjs
 * 机理（沿 #661 两条实操教训）：
 *  1. Windows `copyFileSync` 保留源 mtime ⇒ 还原后必须把源码 mtime 拨到当下，否则 `tsc -b`
 *     判「已是最新」不重编、`dist` 里留着改坏那一版——还原后必断言产物里真有／真没有那段行。
 *  2. 挡板只认真命令：本电池不碰挡板形状，只改本包源码／模板／HELP 产物。
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, utimesSync } from 'node:fs';

const ROOT = process.cwd();
// 变异构建一律 `--force`：增量门在“改完即编”节拍下曾漏编一次（见证据件），电池不赌它。
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

const SRC = 'packages/skill-memo-ilife/src/cli/cmd_read.ts';

round(
  'MUT-1', SRC,
  "deliver: { html: fillMemoPage('wish_plan', payload), stem: '心愿排期向导' }",
  "deliver: { html: fillMemoPage('memo_query', payload), stem: '心愿排期向导' }",
  'packages/skill-memo-ilife/test/wizard-pages-665.test.mjs', 'W1',
  { file: 'packages/skill-memo-ilife/dist/cli/cmd_read.js', bad: "fillMemoPage('memo_query', payload), stem: '心愿排期向导'" },
);

round(
  'MUT-2', 'packages/skill-memo-ilife/src/policy/reminder.ts',
  '  const m = REMIND_AT_RE.exec(v.trim());',
  "  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(v.trim())) return v.trim();\n  const m = REMIND_AT_RE.exec(v.trim());",
  'packages/skill-memo-ilife/test/policy.test.mjs', '提醒',
  { file: 'packages/skill-memo-ilife/dist/policy/reminder.js', bad: 'return v.trim();\n  const m' },
);

round(
  'MUT-3', 'packages/skill-memo-ilife/src/wish/reconcile.ts',
  '      const r = completeWish(db, { id: row.id });',
  "      const r = { exit: 0, receipt: { message: 'noop', ok: true, local: 'unchanged', remote: 'synced', remoteId: null } };",
  'packages/skill-memo-ilife/test/wish-sync-661.test.mjs', 'M-09',
  null,
);

round(
  'MUT-4', 'packages/skill-memo-ilife/src/wish/wizards.ts',
  '      selected: false as const,',
  '      selected: (rows.length > 0) as unknown as false,',
  'packages/skill-memo-ilife/test/wizard-pages-665.test.mjs', 'W2',
  null,
);

round(
  'MUT-5', 'packages/skill-memo-ilife/templates/wish_plan.html',
  '<!--INJECT-DATA-->',
  '<!--INJECT-DATAX-->',
  'packages/skill-memo-ilife/test/wizard-pages-665.test.mjs', 'W1',
  null,
);

round(
  'MUT-6', 'packages/skill-memo-ilife/SKILL.md',
  '| 唤醒词 | key | shape | 例 |',
  '| 唤醒词 | key | shape | 例 | ',
  'packages/skill-memo-ilife/test/skill.test.mjs', '互联区新鲜',
  null,
);

if (failures) {
  console.log('MUTATION RESULT: FAIL(' + failures + ')');
  process.exit(1);
}
console.log('MUTATION RESULT: PASS');
