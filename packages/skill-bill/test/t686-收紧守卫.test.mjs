/** #686 · **收紧守卫**（`scripts/check-ratchet-tight.mjs`）的门禁测试：真包绿 ＋ 五种松法各自红。
 *
 * 这条守卫是**卡路里那两条棘轮没有的那一条**：`实况 ≤ 冻结值 且 冻结值 ≤ 实况` ⇒ 逐项相等。
 * 卡路里 #294 的病正是反例：冻结 92 个键、断言 `<=`、实况 0 —— 一路绿，棘轮退化成摆设。
 *
 * 本件用**独立夹具树**（`--root`，`mkdtempSync` 独占目录、自带 `src/` ＋ `dist/` 两件 stub）自证：
 *   ① 真包（无参）逐项恒等 ⇒ `exit 0`；`--selftest` 的合成读数 ⇒ `SELFTEST 5/5`；
 *   ② 分派层多一条 case（过渡表没有）⇒ 红且**点名那条键**；
 *   ③ 过渡表少一条而冻结值留着（搬迁没下调冻结值）⇒ 红且点名「冻结值仍有 … 条」；
 *   ④ 行数上涨 ⇒ 红且点名 `lineCaps`；
 *   ⑤ 计数不变但键换了（注册表里一条键被别的键替掉）⇒ 仍红——**判据不是只数数**（这条专打「脚本自我满足」）；
 *   ⑥ 量不到实况（缺 `dist/`）⇒ 红且说明先 compile，不是静默放行。
 *
 * 运行：`node --test packages/skill-bill/test/t686-收紧守卫.test.mjs`（真包那两条要先 `pnpm build`）。
 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { FROZEN, PKG_DIR } from '../scripts/ratchet-frozen-686.mjs';

const GUARD = join(PKG_DIR, 'scripts', 'check-ratchet-tight.mjs');
const REGISTRY_KEYS = ['bill.record.add', 'bill.record.detail', 'bill.record.range', 'bill.record.search', 'bill.record.today', 'bill.record.update'];

/** 把一段正文补到恰好 `target` 个 LF（补的是注释行，不影响任何判据）。 */
function padTo(body, target) {
  const lines = body.split('\n').filter((l, i, a) => !(i === a.length - 1 && l === ''));
  while (lines.length < target) lines.push('// 夹具填充行 ' + (lines.length + 1));
  return lines.slice(0, target).join('\n') + '\n';
}

/** 造一棵夹具树（`src/` ＋ `dist/` 两件 stub）；`keys` 决定三处的键集与行数。 */
function makeFixture(root, opt = {}) {
  const dispatchKeys = opt.dispatchKeys ?? FROZEN.dispatchKeys;
  const legacyKeys = opt.legacyKeys ?? FROZEN.legacyKeys;
  const registryKeys = opt.registryKeys ?? REGISTRY_KEYS;
  const wakeKeys = opt.wakeKeys ?? [...new Set([...FROZEN.legacyKeys, ...REGISTRY_KEYS])].sort();
  mkdirSync(join(root, 'src', 'cli'), { recursive: true });
  mkdirSync(join(root, 'src', 'render'), { recursive: true });
  mkdirSync(join(root, 'dist', 'cli'), { recursive: true });
  mkdirSync(join(root, 'dist', 'policy'), { recursive: true });
  if (opt.dispatchKeys !== null) {
    const body = ['function dispatch(key) {', '  switch (key) {',
      ...dispatchKeys.map((k) => "    case '" + k + "': return 1;"), '  }', '}'].join('\n');
    writeFileSync(join(root, 'src', 'cli', 'cmd_read.ts'), padTo(body, opt.cmdLines ?? FROZEN.lineCaps['src/cli/cmd_read.ts']), 'utf8');
  }
  if (opt.legacyKeys !== null) {
    const body = ['const TRANSITIONAL_KEY_SHAPES = {',
      ...legacyKeys.map((k) => "  '" + k + "': 'list',"), '};'].join('\n');
    writeFileSync(join(root, 'src', 'render', 'envelope.ts'), padTo(body, opt.envLines ?? FROZEN.lineCaps['src/render/envelope.ts']), 'utf8');
  }
  if (opt.dist !== false) {
    writeFileSync(join(root, 'dist', 'cli', 'registry.js'), 'export const REGISTRY_KEYS = ' + JSON.stringify(registryKeys) + ';\n', 'utf8');
    writeFileSync(join(root, 'dist', 'policy', 'index.js'), 'export const WAKE_TABLE = ' + JSON.stringify(wakeKeys.map((k) => ({ phrase: '词-' + k, key: k }))) + ';\n', 'utf8');
  }
  return root;
}

const run = (args, cwd = PKG_DIR) => spawnSync(process.execPath, [GUARD, ...args], { cwd, encoding: 'utf8' });
const outOf = (r) => (r.stdout || '') + (r.stderr || '');

/** 夹具生命周期：用完即删（路径守卫：只删 `os.tmpdir()` 下的独占目录）。 */
function withFixture(opt, fn) {
  const dir = mkdtempSync(join(tmpdir(), 't686-tight-'));
  try {
    makeFixture(dir, opt);
    return fn(dir);
  } finally {
    const guard = resolve(tmpdir()) + '\\';
    if (!resolve(dir).startsWith(guard)) throw new Error('拒绝删除临时根之外的路径：' + dir);
    rmSync(dir, { recursive: true, force: true });
  }
}

test('#686 收紧守卫：真包无参逐项恒等（实况 ≤ 冻结值 且 冻结值 ≤ 实况）', () => {
  const r = run([]);
  const out = outOf(r);
  assert.equal(r.status, 0, '真包不恒等：\n' + out);
  assert.match(out, /^PASS: 棘轮与实况逐项恒等/m, '没打 PASS 行');
  assert.match(out, /^RESULT: (\d+)\/\1$/m, '末行不是 RESULT: n/n');
  assert.match(out, /^MEASURE dispatchKeys=\d+ legacyKeys=\d+ registryKeys=\d+ wakeKeys=\d+/m, '缺 MEASURE 机器读数行');
});

test('#686 收紧守卫：--selftest 五种松法都被抓住', () => {
  const r = run(['--selftest']);
  assert.equal(r.status, 0, '自证有红：\n' + outOf(r));
  assert.match(outOf(r), /SELFTEST 5\/5/, '自证条数不对');
});

test('#686 收紧守卫：夹具恒等 ⇒ 绿（同一棵树上改一处即红，见下四条）', () => {
  withFixture({}, (dir) => {
    const green = run(['--root', dir]);
    assert.equal(green.status, 0, '恒等夹具不绿：\n' + outOf(green));
    assert.match(outOf(green), /^RESULT: (\d+)\/\1$/m, '夹具绿读数没给 n/n');
  });
  withFixture({ dispatchKeys: [...FROZEN.dispatchKeys, 'bill.zz.probe'].sort(), wakeKeys: [...new Set([...FROZEN.legacyKeys, ...REGISTRY_KEYS, 'bill.zz.probe'])].sort() }, (dir) => {
    const r = run(['--root', dir]);
    const out = outOf(r);
    assert.equal(r.status, 1, '分派层多一条 case 却判绿：\n' + out);
    assert.ok(out.includes('bill.zz.probe'), '没点名多出来的那条键：\n' + out);
    assert.match(out, /TIGHT FAIL dispatchKeys/, '没点名 dispatchKeys 那条判据');
  });
});

test('#686 收紧守卫：过渡表少一条而冻结值留着 ⇒ 红且点名「冻结值仍有」（卡路里 #294 的病）', () => {
  withFixture({ legacyKeys: FROZEN.legacyKeys.slice(1), dispatchKeys: FROZEN.dispatchKeys.slice(1) }, (dir) => {
    const r = run(['--root', dir]);
    const out = outOf(r);
    assert.equal(r.status, 1, '冻结值比实况松却判绿：\n' + out);
    assert.match(out, /冻结值仍有 1 条/, '没点名「冻结值比实况松」这一种：\n' + out);
  });
});

test('#686 收紧守卫：行数上涨 ⇒ 红且点名 lineCaps', () => {
  withFixture({ cmdLines: FROZEN.lineCaps['src/cli/cmd_read.ts'] + 1 }, (dir) => {
    const r = run(['--root', dir]);
    const out = outOf(r);
    assert.equal(r.status, 1, '行数上涨却判绿：\n' + out);
    assert.match(out, /TIGHT FAIL lineCaps src\/cli\/cmd_read\.ts/, '没点名行数那一条：\n' + out);
  });
});

test('#686 收紧守卫：结束夹具（分派层多一条 case）⇒ 红且点名那条键', () => {
  withFixture({ dispatchKeys: [...FROZEN.dispatchKeys, 'bill.zz.probe'].sort(), wakeKeys: [...new Set([...FROZEN.legacyKeys, ...REGISTRY_KEYS, 'bill.zz.probe'])].sort() }, (dir) => {
    const r = run(['--root', dir]);
    const out = outOf(r);
    assert.equal(r.status, 1, '分派层多一条 case 却判绿：\n' + out);
    assert.ok(out.includes('bill.zz.probe'), '没点名多出来的那条键：\n' + out);
    assert.match(out, /TIGHT FAIL dispatchKeys/, '没点名 dispatchKeys 那条判据：\n' + out);
  });
});

test('#686 收紧守卫：计数不变但键被换了 ⇒ 仍红（判据不是只数数）', () => {
  // 注册表里一条键被替掉：两个计数（注册表 6、全量 16）都没变，只有**并集**与全量声明不再相等。
  const swapped = [...REGISTRY_KEYS.slice(0, 5), 'bill.record.zzz'].sort();
  withFixture({ registryKeys: swapped }, (dir) => {
    const r = run(['--root', dir]);
    const out = outOf(r);
    assert.equal(r.status, 1, '计数没变就等于放行——判据退化成了数数：\n' + out);
    assert.match(out, /TIGHT FAIL unionIsTotal/, '没点名并集那条判据：\n' + out);
  });
});

test('#686 收紧守卫：量不到实况（缺 dist/）⇒ 红且不是静默放行', () => {
  withFixture({ dist: false }, (dir) => {
    const r = run(['--root', dir]);
    const out = outOf(r);
    assert.equal(r.status, 1, '缺 dist 却放行：\n' + out);
    assert.match(out, /量不到实况|缺编译产物/, '没说明为什么量不到：\n' + out);
    assert.match(out, /RESULT: 0\/1/, '末行读数不对：\n' + out);
  });
});
