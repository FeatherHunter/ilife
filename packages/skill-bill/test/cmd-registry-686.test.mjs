/** #686 · **棘轮一 · 命令登记与分派**（形状照卡路里 `packages/skill-calorie/test/cmd-registry-294.test.mjs`，
 * 数字自己现场测）。钉三件事：
 *
 *   ① **分派层的按键分派字面量集恒等**：`src/cli/cmd_read.ts` 里 `bill.…` 的按键分派字面量必须与
 *      冻结集**逐条相等**——只许随搬迁变短，不许长出新分支（新命令要住能力目录 `src/<能力>/commands.ts`）。
 *      判据是**行为口径**不是拼写口径：`case '…'`／`case "…"`／`if (key === '…')`／就地键集查询
 *      （`new Set([…]).has(key)`）四种写法一视同仁；具名键集／默认值／注释里的字样不算。
 *      鉴别力自证在同一支测试里（四种写法各喂一条合成样本，都要数出来；三类反例不许被数出来）。
 *   ② **行数恒等**（＝收紧口径，与卡路里的 `<=` 不同）：`cmd_read.ts`／`envelope.ts` 的行数必须
 *      **等于**冻结值——搬迁删掉行就同窗下调冻结值；不动它就红（卡路里那两条棘轮就是被 `<=` 喂松的）。
 *   ③ **注册表对账**：生成物 `src/cli/registry.ts` 的每条键都能在**恰好一处**能力目录 `commands.ts`
 *      找到定义地（一个键恰住一处），形状与运行期形状表一致，代表唤醒词是真唤醒词且路由回同键。
 *
 * 冻结值与量法的唯一定义地＝`scripts/ratchet-frozen-686.mjs`（本件不自己抄一份数）。
 * 运行：先 `pnpm build`（测试读 `dist/`），再 `node --test packages/skill-bill/test/cmd-registry-686.test.mjs`。
 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { BILL_KEY_SHAPES, WAKE_TABLE, projectWakeWord, routeWakeword } from '../dist/index.js';
import { REGISTRY, REGISTRY_KEYS } from '../dist/cli/registry.js';
import { FROZEN, PKG_DIR, cliDispatchKeysOf, dispatchLiteralsOf } from '../scripts/ratchet-frozen-686.mjs';

const read = (rel) => readFileSync(join(PKG_DIR, rel), 'utf8');
const sorted = (list) => [...list].sort();

/* ── ① 扫描器鉴别力自证 ＋ 分派层字面量集 ──────────────────────────────────────────────── */

test('#686 分派层扫描器有鉴别力：四种按键分派写法都数得出来，数据位与注释不数', () => {
  const probes = [
    ["switch (key) { case 'bill.zz': { fail(3, 'zz'); } }", 'bill.zz', '单引号 case'],
    ['switch (key) { case "bill.zz": { fail(3, "zz"); } }', 'bill.zz', '双引号 case'],
    ["if (key === 'bill.yy') fail(3, 'yy');", 'bill.yy', 'if 阶梯（=== 比较）'],
    ["if (new Set(['bill.ww']).has(key)) fail(3, 'ww');", 'bill.ww', '就地键集查询'],
  ];
  for (const [src, key, what] of probes) {
    assert.deepEqual([...dispatchLiteralsOf(src)], [key], '扫描器看不见' + what + '（这条判据会假绿）');
  }
  const benign = [
    "const S = new Set(['bill.record.add']); // 具名键集＝数据位，不算分派",
    "const key = given ?? 'bill.help.lookup';",
    "// 原先这里写 case 'bill.analysis.trend'（已搬走）",
  ];
  for (const src of benign) {
    assert.deepEqual([...dispatchLiteralsOf(src)], [], '数据位／注释被误判为按键分派：' + src);
  }
});

test('#686 扫描面是 src/cli 全目录：case 挪进同目录的姊妹件也躲不掉（夹具自证）', () => {
  const dir = mkdtempSync(join(tmpdir(), 't686-cli-'));
  try {
    mkdirSync(join(dir, 'src', 'cli'), { recursive: true });
    writeFileSync(join(dir, 'src', 'cli', 'cmd_read.ts'), "function d(key) { switch (key) { case 'bill.aa.one': return 1; } }\n", 'utf8');
    writeFileSync(join(dir, 'src', 'cli', 'sibling.ts'), "export function f(key) { if (key === 'bill.bb.two') return 2; }\n", 'utf8');
    assert.deepEqual(cliDispatchKeysOf(dir), ['bill.aa.one', 'bill.bb.two'],
      '只盯 cmd_read.ts 一件会让同目录姊妹件里的按键分派漏掉');
  } finally {
    const guard = resolve(tmpdir()) + '\\';
    if (!resolve(dir).startsWith(guard)) throw new Error('拒绝删除临时根之外的路径：' + dir);
    rmSync(dir, { recursive: true, force: true });
  }
});

test('#686 棘轮：分派层的按键分派字面量集与冻结集逐条相等（只许随搬迁变短）', () => {
  const actual = cliDispatchKeysOf(PKG_DIR);
  const extra = actual.filter((k) => !FROZEN.dispatchKeys.includes(k));
  const left = FROZEN.dispatchKeys.filter((k) => !actual.includes(k));
  assert.deepEqual(extra, [],
    '分派层长出了新的按键分派分支（新命令要住能力目录 `src/<能力>/commands.ts`）：' + extra.join('、'));
  assert.deepEqual(left, [],
    '冻结集里留着实况已经没有的键——搬走一条就同窗删键、下调冻结值：' + left.join('、'));
  assert.deepEqual(actual, sorted(FROZEN.dispatchKeys), '分派层字面量集与冻结集不相等');
});

/* ── ② 行数恒等（收紧口径） ──────────────────────────────────────────────────────────── */

test('#686 棘轮：分派层两件的行数等于冻结值（搬走即下调，不是 <=）', () => {
  for (const [rel, cap] of Object.entries(FROZEN.lineCaps)) {
    const lf = read(rel).split('\n').length - 1;
    assert.equal(lf, cap,
      rel + ' 行数 ' + lf + ' ≠ 冻结值 ' + cap + '：'
      + (lf > cap ? '棘轮只许变短（新分支别加在这儿）' : '搬迁删了行就同窗把 `scripts/ratchet-frozen-686.mjs` 的冻结值下调'));
  }
});

/* ── ③ 注册表对账 ───────────────────────────────────────────────────────────────────── */

/** 各能力目录的声明**定义地**：扫 `src/<能力>/commands.ts` 的 `key: 'bill.*'`，保留重复项（要数次数）。 */
function capabilityDeclarationSites() {
  const srcDir = join(PKG_DIR, 'src');
  const dirs = readdirSync(srcDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(srcDir, e.name, 'commands.ts')))
    .map((e) => e.name)
    .sort();
  const out = [];
  for (const d of dirs) {
    for (const m of readFileSync(join(srcDir, d, 'commands.ts'), 'utf8').matchAll(/key: '(bill\.[^']+)'/g)) out.push(m[1]);
  }
  return out;
}

test('#686 对账：注册表每条键恰有一处定义地，且与能力声明同集', () => {
  assert.equal(new Set(REGISTRY_KEYS).size, REGISTRY_KEYS.length, '注册表有重复键');
  const sites = capabilityDeclarationSites();
  const twice = [...new Set(sites.filter((k, i) => sites.indexOf(k) !== i))].sort();
  assert.deepEqual(twice, [], '有键住在两个定义地（一个键恰住一处）：' + twice.join('、'));
  assert.deepEqual(sorted(new Set(sites)), sorted(REGISTRY_KEYS),
    '能力目录的定义地之集 ≠ 注册表键集（生成物落后于权威源？或有键没有定义地）');
});

test('#686 对账：注册表的键都在运行期形状表里，形状一致', () => {
  for (const key of REGISTRY_KEYS) {
    const spec = REGISTRY[key];
    assert.equal(spec.kind === 'write' ? 'receipt' : spec.shape, BILL_KEY_SHAPES[key], '形状不一致：' + key);
    assert.equal(spec.kind === 'write' || spec.kind === 'read', true, 'kind 只认 write／read：' + key);
  }
});

test('#686 对账：每条声明的代表唤醒词（按 key 派生）是真唤醒词，且路由回同一个键', () => {
  const phrases = new Set(WAKE_TABLE.map((e) => e.phrase));
  for (const key of REGISTRY_KEYS) {
    const spec = REGISTRY[key];
    // #721 起代表唤醒词不再写在声明里，按 key 从域声明算（`projectWakeWord`）。
    const word = projectWakeWord({ key });
    assert.ok(phrases.has(word), '代表唤醒词不在 `WAKE_TABLE` 里：' + word + '（' + key + '）');
    const hit = WAKE_TABLE.filter((e) => e.phrase === word);
    for (const e of hit) assert.equal(e.key, key, '代表唤醒词路由到别的键：' + word + ' → ' + e.key);
    assert.equal(typeof spec.run, 'function', '声明缺处理函数：' + key);
    const routed = (() => {
      // 有的词带必需槽位（如「查区间」要 start／end）：路由层缺槽位即抛，那属**词的槽位口径**、
      // 不是路由错；这里只要它不把这个词派到别的键上（`WAKE_TABLE` 那一条已把键钉死）。
      try { return routeWakeword(word); } catch (e) {
        assert.equal(e.code, 'POLICY_MISSING_SLOT', '代表唤醒词路由时抛出非「缺槽位」的错：' + word);
        return null;
      }
    })();
    if (routed !== null) assert.equal(routed.key, key, '路由层把代表唤醒词派到别的键：' + word + ' → ' + routed.key);
  }
});

test('#686 生成物身份：注册表件头带「勿手改」印记（它是派生件，手改无效）', () => {
  const head = read('src/cli/registry.ts').split('\n').slice(0, 3).join('\n');
  assert.ok(head.includes('勿手改'), 'src/cli/registry.ts 件头缺「勿手改」印记：生成物身份认不出来');
});
