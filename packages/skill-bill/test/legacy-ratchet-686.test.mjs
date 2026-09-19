/** #686 · **棘轮二 · 未搬迁清单（过渡表）**（形状照卡路里 `packages/skill-calorie/test/legacy-ratchet-295.test.mjs`，
 * 数字自己现场测）。它钉的是**搬迁的账**：
 *
 *   ① **未搬迁的键恰住两处**：`src/render/envelope.ts` 的 `TRANSITIONAL_KEY_SHAPES` 有它的形状行，
 *      `src/cli/cmd_read.ts` 的按键分派有它的 `case`。两边必须**同集**——搬一条 ⇒ 两处**同窗**消失。
 *   ② **冻结值只许随搬迁变短**：冻结键集与实际键集**逐条相等**（`实况 ≤ 冻结值 且 冻结值 ≤ 实况`）。
 *      只删一处、或两处都删了却没下调冻结值，都当场红。
 *   ③ **键总数守恒**：注册表（已搬）∪ 过渡表（未搬）＝ 口径层 `WAKE_TABLE` 的全量 16 键，
 *      两处**不相交**（一个键恰住一处），已搬的键数＝冻结值。
 *   ④ **同窗纪律的机器自证**（变异探针，合成读数、不碰真树）：上面四种「搬得不对」的写法必须各自红/绿，
 *      否则本件的判据是空的。
 *
 * 冻结值与量法的唯一定义地＝`scripts/ratchet-frozen-686.mjs`。
 * 运行：先 `pnpm build`，再 `node --test packages/skill-bill/test/legacy-ratchet-686.test.mjs`。
 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { WAKE_TABLE } from '../dist/triggers/wakeTable.js';
import { REGISTRY } from '../dist/cli/registry.js';
import { FROZEN, PKG_DIR, cliDispatchKeysOf, ratchetProblems, transitionKeysOf } from '../scripts/ratchet-frozen-686.mjs';

const read = (rel) => readFileSync(join(PKG_DIR, rel), 'utf8');
const sorted = (list) => [...list].sort();

const actualTransitionKeys = () => sorted(transitionKeysOf(read('src/render/envelope.ts')));
const actualDispatchKeys = () => cliDispatchKeysOf(PKG_DIR);
const wakeKeys = () => sorted(new Set(WAKE_TABLE.map((e) => e.key)));

test('#686 棘轮：过渡表键集与冻结的未搬迁清单逐条相等', () => {
  const actual = actualTransitionKeys();
  const extra = actual.filter((k) => !FROZEN.legacyKeys.includes(k));
  const left = FROZEN.legacyKeys.filter((k) => !actual.includes(k));
  assert.deepEqual(extra, [], '过渡表多了键（未搬迁清单只许随搬迁变短）：' + extra.join('、'));
  assert.deepEqual(left, [], '冻结清单里留着实况已搬走的键——搬一条就同窗删键：' + left.join('、'));
  assert.deepEqual(actual, sorted(FROZEN.legacyKeys), '过渡表键集与冻结清单不相等');
});

test('#686 棘轮：未搬迁的键恰住两处——过渡表形状行与分派层 case 同集', () => {
  const table = actualTransitionKeys();
  const dispatch = actualDispatchKeys();
  assert.deepEqual(dispatch.filter((k) => !table.includes(k)), [],
    '分派层有 case 而过渡表没有形状行（搬迁删了过渡表那一行？）：' + dispatch.filter((k) => !table.includes(k)).join('、'));
  assert.deepEqual(table.filter((k) => !dispatch.includes(k)), [],
    '过渡表有形状行而分派层没有 case（搬迁删了 case 却没删过渡表？）：' + table.filter((k) => !dispatch.includes(k)).join('、'));
});

test('#686 守恒：注册表（已搬）∪ 未搬迁 ＝ 全量 16 键，两处不相交', () => {
  const registry = sorted(Object.keys(REGISTRY));
  const table = actualTransitionKeys();
  assert.deepEqual(registry.filter((k) => table.includes(k)), [], '一个键恰住一处：注册表与过渡表都有的键：' + registry.filter((k) => table.includes(k)).join('、'));
  assert.deepEqual(sorted([...registry, ...table]), wakeKeys(),
    '注册表 ∪ 过渡表 ≠ 口径层全量声明');
  assert.equal(wakeKeys().length, FROZEN.totalKeyCount, '全量声明条数 ≠ 冻结的键总数');
  assert.equal(registry.length, FROZEN.registryKeyCount,
    '已搬进注册表的键数 ' + registry.length + ' ≠ 冻结值 ' + FROZEN.registryKeyCount
    + '（搬一条就同窗上调冻结值）');
});

test('#686 未搬迁的键还没有定义地（搬一条才建能力目录的声明）', () => {
  const srcDir = join(PKG_DIR, 'src');
  const dirs = readdirSync(srcDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(srcDir, e.name, 'commands.ts')))
    .map((e) => e.name);
  const sites = new Set();
  for (const d of dirs) {
    for (const m of readFileSync(join(srcDir, d, 'commands.ts'), 'utf8').matchAll(/key: '(bill\.[^']+)'/g)) sites.add(m[1]);
  }
  const both = actualTransitionKeys().filter((k) => sites.has(k));
  assert.deepEqual(both, [], '未搬迁的键已经有能力目录声明了（搬迁做了一半）：' + both.join('、'));
});

/* ── ④ 同窗纪律的机器自证（合成读数，不碰真树） ─────────────────────────────────────────── */

/** 造一份「搬走了第 `n` 条键」的合成读数，`how` 决定这次搬得对不对。 */
function migrate(nth, how) {
  const moved = FROZEN.legacyKeys[nth];
  const keys = FROZEN.legacyKeys.filter((_, i) => i !== nth);
  const registry = [...Object.keys(REGISTRY), moved].sort();
  const dropCase = how === '只删 case' || how === '两处都删但冻结值没下调' || how === '同窗下调';
  const dropRow = how === '只删过渡表行' || how === '两处都删但冻结值没下调' || how === '同窗下调';
  const lower = how === '同窗下调';
  const lineDrop = { 'src/cli/cmd_read.ts': 5, 'src/render/envelope.ts': 1 };
  const lines = {};
  for (const [rel, cap] of Object.entries(FROZEN.lineCaps)) {
    const dropped = (rel === 'src/cli/cmd_read.ts' ? dropCase : dropRow) ? lineDrop[rel] : 0;
    lines[rel] = cap - dropped;
  }
  const frozen = lower
    ? { ...FROZEN, legacyKeys: keys, dispatchKeys: keys, registryKeyCount: registry.length,
        lineCaps: Object.fromEntries(Object.entries(FROZEN.lineCaps).map(([rel, cap]) => [rel, cap - lineDrop[rel]])) }
    : FROZEN;
  return {
    moved,
    measured: {
      dispatchKeys: (dropCase ? keys : [...keys, moved]).sort(),
      legacyKeys: (dropRow ? keys : [...keys, moved]).sort(),
      registryKeys: registry,
      wakeKeys: wakeKeys(),
      lines,
    },
    frozen,
  };
}

const redsOf = (problems) => problems.filter((p) => !p.ok).map((p) => p.name + '：' + p.detail).join(' ｜ ');

test('#686 同窗自证：只删 case／只删过渡表行／两处都删却没下调冻结值 ⇒ 三种都红', () => {
  for (const how of ['只删 case', '只删过渡表行']) {
    const { measured, frozen } = migrate(3, how);
    const problems = ratchetProblems(measured, frozen);
    assert.ok(problems.some((p) => !p.ok), how + '：两处不同集却判绿——「同窗」这条纪律是空的');
    assert.match(redsOf(problems), /dispatchEqualsLegacy/, how + '：没点名两处不同集');
  }
  const stale = migrate(3, '两处都删但冻结值没下调');
  const problems = ratchetProblems(stale.measured, stale.frozen);
  assert.ok(problems.some((p) => !p.ok), '两处都删、冻结值没下调却判绿——收紧守卫是空的（卡路里 #294 的病）');
  assert.match(redsOf(problems), /冻结值仍有 1 条/, '没点名「冻结值比实况松」这一种');
});

test('#686 同窗自证：两处都删 ＋ 冻结值与上限同窗下调 ⇒ 绿', () => {
  const { measured, frozen } = migrate(3, '同窗下调');
  const problems = ratchetProblems(measured, frozen);
  assert.deepEqual(problems.filter((p) => !p.ok), [], '照规矩搬一条却判红：' + redsOf(problems));
});
