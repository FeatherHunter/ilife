/** #855 · 命令登记棘轮：守住「一条命令的事实只住它自己的能力目录」这条纪律，并让旧形状只许变短。
 *
 * 守四件事（都是本票的结构判据，越线即红）：
 *   ① **单一定义地**：各域 `commands.ts` 里声明的键集 ≡ 生成物 `MEMO_CLI_KEYS` ≡ 分派查表 `REGISTRY_KEYS`；
 *      反过来，生成物里的键必须能在某个域声明件里读到（生成物不许自己长出一条命令）。
 *   ② **域门形状**：有 `commands.ts` 的域必须同带 `index.ts`（生成器要求），且声明件恰好导出一个数组；
 *      没有 `commands.ts` 的域只能是有词面（`routes.ts`）的词面域。
 *   ③ **键的六件事齐**：每条声明有 `kind`／`key`／`title`／`example`／`run`（`read`／`pre-open` 另要 `shape`），
 *      且 `example` 就是唯一出口形态 `memo-cmd-read <键> …`（照抄即能跑）。
 *   ④ **旧形状只许变短**：分派件 `src/cli/cmd_read.ts` ≤ 318 LF、生成器 `scripts/gen-cli.mjs` ≤ 380 LF
 *      ——升了就得改本件，而改本件会在 diff 里现形。（台账里 `cmd_read.ts` 的**挂号值 367** 是首次挂号时的读数、
 *      永不回改；本件带的是收尾后**收紧过一次**的天花板 318。两个数不冲突：台账记历史，本件守上限。）
 *      老路容器 `src/cli/legacy/`、转发门 `src/fetch/index.ts`／`src/policy/index.ts` 一律不许再出现。
 *
 * 跑：`node --test test/cmd-registry-855.test.mjs`（读 `dist/`，先 `pnpm build`）。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MEMO_CLI_KEYS, MEMO_CLI_SOURCES, MEMO_DECLARED_SHAPES } from '../dist/cli/keys.js';
import { REGISTRY, REGISTRY_KEYS } from '../dist/cli/registry.js';
import { MEMO_KEY_SHAPES } from '../dist/render/index.js';

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRCDIR = join(PKG, 'src');
const lf = (p) => (readFileSync(p, 'utf8').match(/\n/g) || []).length;

/** 目录下的 `.ts` 源件（递归，相对该目录的路径）。 */
function tsFiles(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...tsFiles(p));
    else if (e.name.endsWith('.ts')) out.push(e.name);
  }
  return out;
}

/** 各域声明件里的键（手写面＝权威源；生成物只是它的派生）。 */
function declaredKeys() {
  const out = new Map();
  for (const name of readdirSync(SRCDIR, { withFileTypes: true })) {
    if (!name.isDirectory()) continue;
    const file = join(SRCDIR, name.name, 'commands.ts');
    if (!existsSync(file)) continue;
    const text = readFileSync(file, 'utf8');
    const keys = [...text.matchAll(/^\s*key: '([^']+)',\s*$/gm)].map((m) => m[1]);
    out.set(name.name, keys);
  }
  return out;
}

const declared = declaredKeys();
const declaredFlat = [...declared.values()].flat();

describe('#855 · 命令登记棘轮（声明面／域门形状／只许变短）', () => {
  it('① 键集单源：域声明 ≡ MEMO_CLI_KEYS ≡ REGISTRY_KEYS', () => {
    assert.deepEqual([...declaredFlat].sort(), [...MEMO_CLI_KEYS].sort(), '域声明与生成键表不一致');
    assert.deepEqual([...REGISTRY_KEYS].sort(), [...MEMO_CLI_KEYS].sort(), '分派查表与生成键表不一致');
    assert.deepEqual(declaredFlat, [...new Set(declaredFlat)], '同一个键被两个域声明');
    assert.equal(new Set(MEMO_CLI_KEYS).size, MEMO_CLI_KEYS.length, '生成键表里有重复键');
  });

  it('① 生成物不许自己长命令：每条键都能点在某个域声明件上', () => {
    for (const k of MEMO_CLI_KEYS) assert.ok(declaredFlat.includes(k), '键 ' + k + ' 在生成物里有、在域声明里没有');
  });

  it('② 域门形状：声明件所在的域必须也在 MEMO_CLI_SOURCES 里，且恰好导出一个数组', () => {
    for (const [domain, keys] of declared) {
      assert.ok(MEMO_CLI_SOURCES.includes(domain), '域 ' + domain + ' 有 commands.ts 却不在生成器的扫描源里（声明不会被读到）');
      assert.ok(existsSync(join(SRCDIR, domain, 'index.ts')), '域 ' + domain + ' 缺 index.ts（生成器要求域门有它）');
      assert.ok(keys.length > 0, '域 ' + domain + ' 的 commands.ts 里一条键都没读到（格式变了？）');
      const text = readFileSync(join(SRCDIR, domain, 'commands.ts'), 'utf8');
      const arrays = [...text.matchAll(/^export const (\w+) = \[/gm)].map((m) => m[1]);
      assert.equal(arrays.length, 1, '域 ' + domain + ' 的声明件要恰好导出一个声明数组（生成器按它扫）');
    }
  });

  it('② 没有 commands.ts 的域只能是有词面的词面域', () => {
    const framework = ['cli', 'db', 'help', 'render', 'shared', 'triggers'];
    for (const name of readdirSync(SRCDIR, { withFileTypes: true })) {
      if (!name.isDirectory() || declared.has(name.name) || framework.includes(name.name)) continue;
      if (tsFiles(join(SRCDIR, name.name)).length === 0) continue; // 空目录是盘上残渣，不是结构
      assert.ok(existsSync(join(SRCDIR, name.name, 'index.ts')) || existsSync(join(SRCDIR, name.name, 'routes.ts')),
        '域 ' + name.name + ' 既没命令声明也没词面——是半成品还是起错了名？');
    }
  });

  it('③ 键的六件事齐：kind／key／title／example／run（read／pre-open 另要 shape）', () => {
    for (const key of REGISTRY_KEYS) {
      const s = REGISTRY[key];
      assert.equal(s.key, key, 'REGISTRY 的键与声明里的 key 不一致：' + key);
      assert.ok(s.kind === 'read' || s.kind === 'write' || s.kind === 'pre-open', key + ' 的 kind 不在三种里：' + s.kind);
      assert.ok(typeof s.title === 'string' && s.title.length > 0, key + ' 缺 title');
      assert.ok(typeof s.run === 'function', key + ' 没有处理函数');
      assert.ok(s.example.startsWith('memo-cmd-read ' + key), key + ' 的 example 不是唯一出口形态：' + s.example);
      if (s.kind === 'read' || s.kind === 'pre-open') {
        assert.ok(typeof s.shape === 'string' && s.shape.length > 0, key + '（' + s.kind + '）缺 shape');
      } else {
        assert.equal(s.shape, undefined, key + ' 是写命令，不该自己写 shape（写命令一律回执形，定义地在生成器）');
      }
      assert.equal(MEMO_DECLARED_SHAPES[key], s.kind === 'write' ? 'receipt' : s.shape, key + ' 的形状与生成键表对不上');
    }
  });

  it('③ 两张形状表逐键一致（声明派投影 vs envelope 全表）', () => {
    // 事实只住一处（各域声明）；`cli/keys.ts` 的 MEMO_DECLARED_SHAPES 是它的投影，
    // `render/envelope.ts` 的 MEMO_KEY_SHAPES 是 envelope 认的全表（＝声明派 ＋ 框架位那几行）。两张表不许漂。
    for (const [key, shape] of Object.entries(MEMO_DECLARED_SHAPES)) {
      assert.equal(MEMO_KEY_SHAPES[key], shape, key + ' 在两张形状表里不一致');
    }
    const extra = Object.keys(MEMO_KEY_SHAPES).filter((k) => MEMO_DECLARED_SHAPES[k] === undefined);
    assert.deepEqual(extra, ['memo.help.lookup'], 'envelope 全表多出来的键变了：它只能是框架位那些（不属任何域）');
  });

  it('④ 旧形状只许变短：分派件与生成器的挂号值', () => {
    // 两个数都取「本批收工时的实测」，只许降不许升（升了就得改本件，改本件在 diff 里现形）：
    //   cmd_read 854（#855 开工前）→ 367（收尾批）→ 318（本批：删 switch 与一摞「已搬走」注记）；
    //   gen-cli  380 →（本批：渲染段切到 gen-cli.render.mjs，件从超线回到线内）→ 现在这个数。
    const ceilings = [['src/cli/cmd_read.ts', 318], ['scripts/gen-cli.mjs', 293]];
    for (const [rel, ceiling] of ceilings) {
      const n = lf(join(PKG, rel));
      assert.ok(n <= ceiling, rel + ' 涨到 ' + n + ' LF（挂号值 ' + ceiling + '，只许降）：加东西要加到它自己域的能力目录去');
    }
  });

  it('④ 老路容器与转发门不许再出现', () => {
    for (const rel of ['src/cli/legacy', 'src/fetch/index.ts', 'src/policy/index.ts']) {
      assert.ok(!existsSync(join(PKG, rel)), '#855 已撤的 ' + rel + ' 又长回来了');
    }
    for (const rel of ['src/fetch', 'src/policy']) {
      const dir = join(PKG, rel);
      if (!existsSync(dir)) continue;
      const left = tsFiles(dir);
      assert.deepEqual(left, [], rel + ' 这个已退役的目录里还有源件：' + left.join('、'));
    }
    const exit = readFileSync(join(PKG, 'src/cli/cmd_read.ts'), 'utf8');
    assert.ok(!/case 'memo\./.test(exit), '分派件里又出现命令键的 case——命令事实该住它自己的域');
    assert.ok(/REGISTRY\[/.test(exit), '分派件不再查登记表了？');
    assert.ok(statSync(join(PKG, 'src/cli/registry.ts')).size > 0, '登记表生成物不见了');
  });
});
