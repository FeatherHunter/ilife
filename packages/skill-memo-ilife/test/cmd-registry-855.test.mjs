/** #855 · 命令登记棘轮：守住「一条命令的事实只住它自己的能力目录」这条纪律，并让旧形状只许变短。
 *
 * 守这些事（都是本票的结构判据，越线即红）：
 *   ⓪ **新鲜度**：`dist/` 不许比 `src/` 旧——本件与差分回归都从 `dist/` 取事实，「改 src 不重编译即门绿」是假绿（对抗式复核证过的门洞）。
 *   ① **单一定义地**：各域 `commands.ts` 里声明的键集 ≡ 生成物 `MEMO_CLI_KEYS` ≡ 分派查表 `REGISTRY_KEYS`；
 *      反过来，生成物里的键必须能在某个域声明件里读到（生成物不许自己长出一条命令）。
 *   ② **域门形状**：有 `commands.ts` 的域必须同带 `index.ts`（生成器要求），且声明件恰好导出一个数组；
 *      没有 `commands.ts` 的域只能是有词面（`routes.ts`）的词面域；`src/` 第一层是**闭集**
 *      （8 个能力域 ＋ 6 个共用位 ＋ 三个根散件），多出来的目录＝没归位。
 *   ③ **键的六件事齐**：每条声明有 `kind`／`key`／`title`／`example`／`run`（`read`／`pre-open` 另要 `shape`），
 *      且 `example` 就是唯一出口形态 `memo-cmd-read <键> …`（照抄即能跑）；两张形状表逐键一致。
 *   ④ **只许变短／老路缺席／域间零直引**：分派件 `src/cli/cmd_read.ts` ≤ 318 LF、生成器 `scripts/gen-cli.mjs` ≤ 293 LF
 *      （升了就得改本件，而改本件会在 diff 里现形；台账记的是历史挂号值，本件守的是收紧后的上限）；
 *      老路容器 `src/cli/legacy/`、转发门 `src/fetch/index.ts`／`src/policy/index.ts` 不许再出现；
 *      `dist` 顶层目录名必须与 `src` 一致（搬空之后留下的旧输出＝幽灵旧家）；
 *      引用某个能力域时只许写 `<域>/index.js`（走门），不许深引域内实现件；
 *      域外件不许出现命令键字面量（逐件白名单在册，理由逐条写在 `KEY_LITERAL_HOMES`）。
 *
 * 跑：`node --test test/cmd-registry-855.test.mjs`（读 `dist/`，先 `pnpm build`；⓪ 会替你把这条前提变成红字）。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MEMO_CLI_KEYS, MEMO_CLI_SOURCES, MEMO_DECLARED_SHAPES } from '../dist/cli/keys.js';
import { REGISTRY, REGISTRY_KEYS } from '../dist/cli/registry.js';
import { MEMO_KEY_SHAPES } from '../dist/render/index.js';

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRCDIR = join(PKG, 'src');
const lf = (p) => (readFileSync(p, 'utf8').match(/\n/g) || []).length;

/** `src/` 第一层的闭集：8 个能力域 ＋ 6 个共用位（票面 §三 的目标树；`health.ts` 是跨包兼容口，见 #706）。 */
const TOP_DIRS = ['checkin', 'cli', 'db', 'help', 'init', 'memo', 'mood', 'remind', 'render', 'search', 'shared', 'sync', 'triggers', 'wish'];
const TOP_FILES = ['config.ts', 'health.ts', 'index.ts'];
/** 8 个能力域（引用它们时只许写 `<域>/index.js`）。 */
const DOMAINS = ['checkin', 'init', 'memo', 'mood', 'remind', 'search', 'sync', 'wish'];
/** 域外件里允许出现命令键字面量的地方（逐条写清是什么、为什么在册）。生成物不扫（它们本来就是键的派生面）。 */
const KEY_LITERAL_HOMES = {
  'checkin/routes.ts': '词面域的词面（这些词指向备忘域的键）',
  'mood/routes.ts': '词面域的词面（同上）',
  'init/commands.ts': 'init 域的声明（键的事实就住这儿）',
  'init/routes.ts': 'init 域的词面',
  'init/run.ts': 'init 域运行件：自己装 envelope，故要写自己的键',
  'memo/commands.ts': '备忘域的声明（键的事实就住这儿）',
  'memo/routes.ts': '备忘域的词面',
  'remind/commands.ts': '提醒域的声明',
  'remind/policy.ts': '提醒域的口径件：老操作名 → 目标键（`set`／`query`／`abandon`／`complete`／`listDone`）',
  'remind/routes.ts': '提醒域的词面',
  'search/commands.ts': '查找域的声明',
  'search/routes.ts': '查找域的词面',
  'sync/commands.ts': '同步域的声明',
  'sync/routes.ts': '同步域的词面',
  'wish/commands.ts': '心愿域的声明',
  'wish/policy.ts': '心愿域的口径件：`plan`／`complete` → 目标键（回执里要报）',
  'wish/routes.ts': '心愿域的词面',
  'render/envelope.ts': 'envelope 形状全表（与生成物那张声明派表逐键一致，由本件 ③ 守）',
  'help/lookup.ts': 'HELP 一句话表（键类型取自生成物 `MemoKey`，写错编译期即红）',
  'cli/cmd_read.ts': '开库前分派的两条内部断言（`memo.help.lookup`／`memo.init`）——**只许这两个**',
  'cli/config.ts': '设置页四条 key（不是唤醒词命令，见该件头注）',
  'cli/health.ts': '设置页体检 key（同上）',
};

/** 目录下的 `.ts` 源件（递归，绝对路径）。 */
function walkTs(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walkTs(p));
    else if (e.name.endsWith('.ts')) out.push(p);
  }
  return out;
}

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

describe('#855 · 命令登记棘轮（新鲜度／声明面／域门形状／只许变短／域间零直引）', () => {
  it('⓪ 新鲜度：dist 不许比 src 旧（本件读的是 dist，改了 src 不重编译＝假绿）', () => {
    // 对抗式复核的门洞 D：`src/render/envelope.ts` 改一格形状、不编译，五道门全绿——
    // 因为门从 `dist/` 取事实，而本包没有任何陈旧守卫。这里把「先 pnpm build」从注释变成红字。
    // 口径（如实写）：这是 mtime 口径，看的是「有没有人改过 src 却没重编译」。三个生成物**不算**——
    // 它们被 `gen-cli.mjs` 重写（同字节也会 bump mtime），那一路的一致性由 `gen-cli.mjs --check`（读源码文本）守；
    // 声明与形状这两类手写事实另有**内容级**对账（见 ③ 那两条），不靠时钟。
    const generated = new Set(['cli/keys.ts', 'cli/registry.ts', 'triggers/routes.generated.ts']);
    const stale = [];
    for (const abs of walkTs(SRCDIR)) {
      const rel = relative(SRCDIR, abs).replace(/\\/g, '/');
      if (generated.has(rel)) continue;
      const out = join(PKG, 'dist', rel.replace(/\.ts$/, '.js'));
      if (!existsSync(out)) { stale.push(rel + '（没有对应的 dist 产物）'); continue; }
      if (statSync(abs).mtimeMs > statSync(out).mtimeMs) stale.push(rel + '（src 比 dist 新）');
    }
    assert.deepEqual(stale, [], 'dist 落后于 src：先 `node node_modules/typescript/bin/tsc -b packages/skill-memo-ilife` 再跑门');
  });

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

  it('② src 第一层是闭集：8 个能力域 ＋ 6 个共用位 ＋ 三个根散件', () => {
    // 对抗式复核的变异⑦c：新建 `src/utils/index.ts`（铁律四的违反样子）＋ 同步编译 ＋ 台账补行，
    // 当时五道门全绿——就是这条缺了闭集。「src 下只有这些」本来就该是机器判据，不是人看。
    const dirs = readdirSync(SRCDIR, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
    const files = readdirSync(SRCDIR, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name).sort();
    assert.deepEqual(dirs, [...TOP_DIRS].sort(), 'src 第一层目录变了：多出来的是没归位的目录（域或共用位都得在票面 §三 的目标树里）');
    assert.deepEqual(files, [...TOP_FILES].sort(), 'src 第一层散件变了：`health.ts` 是跨包兼容口（#706，真消费者在 plugin-manager），其余两件是包门与配置边界');
  });

  it('④ 域间零直引：引用能力域只许走门（`<域>/index.js`），不许深引域内实现件', () => {
    // 票面「Testing Decisions」点名要这条静态自证。门就是为跨域准备的（structure.md 铁律五），
    // 故「经门」合法、**深引**不合法；域内自引不受限（`own` 那半边跳过）。
    const bad = [];
    for (const abs of walkTs(SRCDIR)) {
      const rel = relative(SRCDIR, abs).replace(/\\/g, '/');
      const own = DOMAINS.find((d) => rel.startsWith(d + '/'));
      const text = readFileSync(abs, 'utf8');
      for (const m of text.matchAll(/from\s+'([^']+)'/g)) {
        const hit = /(?:^|\/)([a-z-]+)\/([a-z0-9._-]+)\.js$/.exec(m[1]);
        if (!hit) continue;
        const [, dom, file] = hit;
        if (!DOMAINS.includes(dom) || dom === own || file === 'index') continue;
        bad.push(rel + ' → ' + m[1]);
      }
    }
    assert.deepEqual(bad, [], '这些地方深引了别的能力域：走那道域的门（`<域>/index.js`），或把共用件提到共用位');
  });

  it('④ 域外件不许认命令键：键字面量逐件白名单（新出现的即红并点名）', () => {
    // 对抗式复核的变异⑨／⑩：出口里写长度中性的 `if (key === 'memo.search')`、或域外件里另起一张键表，
    // 当时五道门全绿。这条把「哪些件可以出现键字面量」变成在册事实，新件／新分支一律先登记再说话。
    const keys = new Set([...MEMO_CLI_KEYS, ...Object.keys(MEMO_KEY_SHAPES)]);
    const gen = new Set(['cli/keys.ts', 'cli/registry.ts', 'triggers/routes.generated.ts']);
    const bad = [];
    for (const abs of walkTs(SRCDIR)) {
      const rel = relative(SRCDIR, abs).replace(/\\/g, '/');
      if (gen.has(rel)) continue;
      // 只扫代码行：整行注释不算（注释里提键名是说明，不是第二定义）。
      const code = readFileSync(abs, 'utf8').split('\n')
        .filter((l) => { const s = l.trim(); return !(s.startsWith('//') || s.startsWith('*') || s.startsWith('/*')); })
        .join('\n');
      const allowed = KEY_LITERAL_HOMES[rel];
      for (const lit of new Set([...code.matchAll(/'([^']+)'/g)].map((m) => m[1]))) {
        if (!keys.has(lit)) continue;
        if (allowed === undefined) { bad.push(rel + ' 出现了键字面量 ' + lit + '（该件不在白名单里）'); continue; }
        if (rel === 'cli/cmd_read.ts' && lit !== 'memo.help.lookup' && lit !== 'memo.init') {
          bad.push(rel + ' 出现了计划外的键字面量 ' + lit + '（本件只许那两条开库前分派断言）');
        }
      }
    }
    assert.deepEqual(bad, [], '域外件出现命令键字面量：要么把事实搬回它自己的能力目录，要么在 KEY_LITERAL_HOMES 里登记理由');
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

  it('③ 两张形状表逐键一致（声明派投影 vs envelope 全表）＋ 手写面与 dist 逐个对账', () => {
    // 事实只住一处（各域声明）；`cli/keys.ts` 的 MEMO_DECLARED_SHAPES 是它的投影，
    // `render/envelope.ts` 的 MEMO_KEY_SHAPES 是 envelope 认的全表（＝声明派 ＋ 框架位那几行）。两张表不许漂。
    for (const [key, shape] of Object.entries(MEMO_DECLARED_SHAPES)) {
      assert.equal(MEMO_KEY_SHAPES[key], shape, key + ' 在两张形状表里不一致');
    }
    const extra = Object.keys(MEMO_KEY_SHAPES).filter((k) => MEMO_DECLARED_SHAPES[k] === undefined);
    assert.deepEqual(extra, ['memo.help.lookup'], 'envelope 全表多出来的键变了：它只能是框架位那些（不属任何域）');
    // 内容级新鲜度：形状是手写事实（各域 `commands.ts` 的 `shape:` 与 `render/envelope.ts` 的表），
    // 这里直接从**源码文本**读它们，与 `dist/` 读到的对账——改 src 不编译即红（不靠 mtime）。
    for (const [domain, keys] of declared) {
      const text = readFileSync(join(SRCDIR, domain, 'commands.ts'), 'utf8');
      const pairs = [...text.matchAll(/^\s*(?:key|shape): '([^']+)',\s*$/gm)].map((m) => m[1]);
      for (const key of keys) {
        const kind = REGISTRY[key]?.kind;
        assert.ok(kind !== undefined, key + '（' + domain + ' 声明）不在 dist 的登记表里——dist 落后于 src？先重编译');
        if (kind === 'write') continue;
        const shape = pairs[pairs.indexOf(key) + 1];
        assert.equal(MEMO_DECLARED_SHAPES[key], shape, key + ' 的 shape 与源码文本不一致：dist 里的值 ' +
          MEMO_DECLARED_SHAPES[key] + ' ≠ 源码 ' + shape + '（改了 src 没重编译？）');
      }
    }
    const envText = readFileSync(join(SRCDIR, 'render', 'envelope.ts'), 'utf8');
    const envPairs = [...envText.matchAll(/^\s*'([^']+)': '([^']+)',\s*$/gm)].map((m) => [m[1], m[2]]);
    assert.ok(envPairs.length > 0, 'envelope.ts 的形状表一条都没解析到（写法变了？）');
    for (const [key, shape] of envPairs) {
      assert.equal(MEMO_KEY_SHAPES[key], shape, key + ' 的 envelope 形状与源码文本不一致：dist 里 ' + MEMO_KEY_SHAPES[key] + ' ≠ 源码 ' + shape);
    }
  });

  it('④ 旧形状只许变短：分派件与生成器的挂号值', () => {
    // 两个数都取「本批收工时的实测」，只许降不许升（升了就得改本件，改本件在 diff 里现形）：
    //   cmd_read 854（#855 开工前）→ 367（收尾批）→ 318（本批：删 switch 与一摞「已搬走」注记）；
    //   gen-cli  380 →（本批：渲染段切到 gen-cli.render.mjs，件从超线回到线内）→ 293
    //     → 299（#953：程序面标记 surface＋路由守卫，框架级变更，挂号值 380 留档、只许变短）。
    const ceilings = [['src/cli/cmd_read.ts', 318], ['scripts/gen-cli.mjs', 299]];
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

  it('④ 构建产物里没有「搬空之后留下的旧家」（dist 顶层目录名必须与 src 一致）', () => {
    // #855 实测踩到的坑：`tsc -b` **不会**删掉「源件已搬走」的那些旧输出，于是 `dist/fetch/`、`dist/policy/`
    // 成了幽灵旧家——仓根的 `test/combos-p8.test.mjs` 照旧扫它们（扫的是过期产物），npm 包也会把它发出去。
    // 这条门把「dist 顶层目录名 == src 顶层目录名」钉死：搬完家没清 dist 就红。
    const names = (dir) => readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
    const dist = join(PKG, 'dist');
    if (!existsSync(dist)) return; // 还没构建过：本门只管「建过之后不许留旧家」
    assert.deepEqual(names(dist), names(SRCDIR), 'dist 顶层目录与 src 对不上：多的是搬空后没清的旧家，少的是没编译出来的新家（清 dist 重编）');
  });
});
