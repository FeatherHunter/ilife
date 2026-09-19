#!/usr/bin/env node
/** #686 · **收紧守卫**（卡路里那两条棘轮没有的那一条）：棘轮的冻结值不许比实况松。
 *
 * 卡路里 #294 的病：`FROZEN_LEGACY_KEYS` 冻着 92 个键、断言用 `<=`，实况搬到 0 条也一路绿，
 * 92 个键搬完一个都没从冻结集里删——**棘轮退化成摆设**。本守卫把那条判据钉成恒等：
 *
 *     实况 ≤ 冻结值 **且** 冻结值 ≤ 实况   ⇒   逐项相等
 *
 * 任一侧松了都红，并**指名是哪一种**：
 *   · 实况多出／行数上涨 ⇒ 「棘轮只许随搬迁变短」（新命令住能力目录，别往分派层加分支）；
 *   · 冻结值高于实况 ⇒ 「搬走了却没同窗下调冻结值」——这一条正是卡路里的病。
 *
 * 量法与冻结值的唯一定义地＝`scripts/ratchet-frozen-686.mjs`（本脚本只做入口与报告）。
 *
 * 用法：
 *   node packages/skill-bill/scripts/check-ratchet-tight.mjs           # 真实门禁（读本包）
 *   node packages/skill-bill/scripts/check-ratchet-tight.mjs --root <夹具根>
 *   node packages/skill-bill/scripts/check-ratchet-tight.mjs --selftest  # 判据鉴别力自证（合成读数，不碰盘）
 *
 * 退出码：0＝逐项恒等；1＝有红（逐条 `TIGHT FAIL` 点名）；末行恒为 `RESULT: n/m`。
 */
import { FROZEN, PKG_DIR, measure, ratchetProblems } from './ratchet-frozen-686.mjs';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const ROOT = resolve(flag('--root', PKG_DIR));
const SELFTEST = argv.includes('--selftest');

function report(problems, title) {
  const failed = problems.filter((p) => !p.ok);
  for (const p of problems) console.log((p.ok ? 'TIGHT ok   ' : 'TIGHT FAIL ') + p.name + '：' + p.detail);
  console.log('RESULT: ' + (problems.length - failed.length) + '/' + problems.length);
  if (failed.length > 0) {
    console.error('FAIL: ' + title + '（' + failed.length + ' 条不恒等）');
    console.error('  修法按红的种类：① 实况多出／行数上涨 ⇒ 棘轮只许随搬迁变短，新命令住能力目录 `src/<能力>/commands.ts`；');
    console.error('  ② 冻结值高于实况 ⇒ 搬走一条就同窗把冻结值删掉、上限下调（改 `scripts/ratchet-frozen-686.mjs` 的 FROZEN）。');
    return 1;
  }
  console.log('PASS: ' + title);
  return 0;
}

if (SELFTEST) {
  // 判据鉴别力自证：合成读数喂 `ratchetProblems`，四种松法都要被抓、恒等要放行。
  const base = {
    dispatchKeys: [...FROZEN.dispatchKeys],
    legacyKeys: [...FROZEN.legacyKeys],
    registryKeys: Array.from({ length: FROZEN.registryKeyCount }, (_, i) => 'bill.x' + i),
    wakeKeys: [...new Set([...FROZEN.legacyKeys, ...Array.from({ length: FROZEN.registryKeyCount }, (_, i) => 'bill.x' + i)])].sort(),
    lines: { ...FROZEN.lineCaps },
  };
  const cases = [
    ['恒等（基线）', base, false, null],
    ['冻结值留着一条实况已经没有的键（搬走没下调）', { ...base, dispatchKeys: base.dispatchKeys.slice(1), legacyKeys: base.legacyKeys.slice(1) }, true, FROZEN.legacyKeys[0]],
    ['分派层偷偷长出一条新 case（实况多出）', { ...base, dispatchKeys: [...base.dispatchKeys, 'bill.zz.probe'].sort(), wakeKeys: [...base.wakeKeys, 'bill.zz.probe'].sort() }, true, 'bill.zz.probe'],
    ['分派层行数上涨', { ...base, lines: { ...base.lines, 'src/cli/cmd_read.ts': base.lines['src/cli/cmd_read.ts'] + 1 } }, true, null],
    ['注册表少一条（实况已降而冻结值没下调）', { ...base, registryKeys: base.registryKeys.slice(1) }, true, null],
  ];
  let hit = 0;
  const bad = [];
  for (const [name, measured, wantRed, needle] of cases) {
    const problems = ratchetProblems(measured, FROZEN);
    const red = problems.some((p) => !p.ok);
    const detail = problems.filter((p) => !p.ok).map((p) => p.detail).join(' ');
    const named = needle === null || detail.includes(needle) || problems.some((p) => !p.ok && p.name.includes(needle));
    if (red === wantRed && named) { hit += 1; console.log('SELFTEST ok   ' + name); continue; }
    bad.push(name + '：期望' + (wantRed ? '红' : '绿') + '，实得' + (red ? '红' : '绿') + (named ? '' : '，且没点名 ' + needle));
  }
  for (const b of bad) console.error('SELFTEST FAIL ' + b);
  console.log('SELFTEST ' + hit + '/' + cases.length);
  process.exit(bad.length === 0 ? 0 : 1);
}

console.log('RATCHET-SCAN root=' + ROOT);
let measured;
try {
  measured = await measure(ROOT);
} catch (e) {
  console.error('FAIL: 量不到实况（' + (e && e.message) + '）');
  console.log('RESULT: 0/1');
  process.exit(1);
}
console.log(
  'MEASURE dispatchKeys=' + measured.dispatchKeys.length + ' legacyKeys=' + measured.legacyKeys.length
  + ' registryKeys=' + measured.registryKeys.length + ' wakeKeys=' + measured.wakeKeys.length
  + '；行数 ' + Object.entries(measured.lines).map(([k, v]) => k + '=' + v).join(' '),
);
process.exit(report(ratchetProblems(measured, FROZEN), '棘轮与实况逐项恒等（实况 ≤ 冻结值 且 冻结值 ≤ 实况）'));
