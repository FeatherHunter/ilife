/** #294 · 命令登记与分派的**棘轮**＋注册表那条路的活证。
 *
 * 三件事：
 *   ① **终态（#320 起）**：分派层（`src/cli` 全目录）里**一条按键分派的 `calorie.…` 字面量都不许有**——
 *      #320 把最后一条老键（`calorie.view.goal-weight`）搬进 `src/goal/`（键族 `view.goal*` 同主人，
 *      写孪生 `calorie.goal.weight` 也归那一族）、整口老 switch 删掉之后，
 *      「往分派层加一条分支」这件事不再有上限可调：空白名单是硬断言，塞一条当场变红。
 *      **口径是行为、不是拼写**（#320b 返修 S2-1／S3-2）：`case '…'`／`case "…"`／
 *      `if (key === '…')`／就地键集查询，四种写法一视同仁——只数单引号 `case` 的门等于没门。
 *   ② **注册表那条路的活证**：命中注册表的读键与写键各真跑一次——防「新路通了、悄悄断」。
 *      （#294 原来还有一条「老路活证」，它用的两个键早已在注册表里；#320 改写成「老路已无活口」的断言。）
 *   ③ **对账**：注册表每条声明的键／形状／标题与 `cli/keys.ts` 的登记逐条对得上，
 *      `kind` 与「是不是写键」等价，代表唤醒词都是 `TRIGGERS` 里真有的唤醒词；
 *      注册表 ⊇ 各能力声明的键集，且每个键都能在某个能力目录的 `commands.ts` 里找到定义地
 *      （#322 预热：这三条与「搬了几家能力」无关，搬一条老命令不必回头改本文件）。
 *
 * 冻结口径（写死在下面）：
 *   - 行数＝文件按 `\\n` 切分的物理行数；
 *   - `cmd_read.ts` 冻结 1146 行／`write.ts` 冻结 745 行（#294 交付时实测；
 *     票面写的 1140／879 是设计正本撰写时的估值，与实际口径不同，已在交付对账里记账）。
 *
 * 运行：先 `pnpm --filter skill-calorie build`，再跑根 `pnpm test`。
 */
import { strict as assert } from 'node:assert';
import { existsSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { dispatch } from '../dist/cli/cmd_read.js';
import { dispatchWrite } from '../dist/cli/write.js';
import { REGISTRY, REGISTRY_KEYS } from '../dist/cli/registry.js';
import { CALORIE_COMBOS, CALORIE_WRITE_COMBOS, isCalorieWriteKey } from '../dist/cli/keys.js';
import { WEIGHT_COMMANDS } from '../dist/weight/index.js';
import { TRIGGERS } from '../dist/triggers/index.js';
import { routesFor } from '../dist/triggers/routing.js';
import { DECLARED_CAPABILITY_KEYS, DECLARED_KEYS, LEGACY_COMMANDS } from './declared.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI_DIR = join(HERE, '..', 'src', 'cli');

/* ── 冻结基线（只许变短） ─────────────────────────────────────────────────────────────── */

const FROZEN_READ_LINES = 1146;
const FROZEN_WRITE_LINES = 745;

/** 分派层两个文件（#320 起：它们只做「注册表先行」，按键分派的老 switch 已整口删除）。 */
const DISPATCH_FILES = ['cmd_read.ts', 'write.ts'];

/* ── 判据本体（**行为口径**，不是拼写口径）─────────────────────────────────────────────
 * 凡 `calorie.…` **字面量**出现在「按键分派」的位置，即算老路活口——不认它用哪种引号，
 * 也不认它是 `switch` 还是 `if` 阶梯：
 *   ① `case 'calorie.x':`／`case "calorie.x":`（switch 标号，任意引号）；
 *   ② `key === 'calorie.x'`／`'calorie.x' === key`（等值比较，两侧皆认，`!=` 系同理）；
 *   ③ `new Set(['calorie.x']).has(key)`／`['calorie.x'].includes(key)`（**就地**键集查询）。
 * 不算的形态（数据位，与「按键选实现」无关）：**具名**键集／注册表行／默认值／注释里的字样。
 * 已知边界（正则门的固有边界，不假装覆盖）：拼串（`'calorie.' + x`）、模板串插值、
 * 对象字面量当键集、`switch (true)`，以及「往具名键集里偷偷加一条老键」（那属命令登记纪律的
 * 注册表对账面，不是本件射程）。放宽边界须改本件，不许在别处降级。
 * 对文件与对合成样本用**同一个**扫描器（鉴别力自证见下面那条终态断言）。 */
const QUOTE_CHARS = new Set(["'", '"', '`']);
const CMP_BEFORE = /(?:\bcase\s*|(?:===|!==|==|!=)\s*)$/;
const CMP_AFTER = /^\s*(?:===|!==|==|!=)/;
const INLINE_QUERY_AFTER = /^\s*\)?\s*\.\s*(?:has|includes|indexOf|get)\s*\(/;

function calorieDispatchLiteralsOf(text) {
  const found = new Set();
  const brackets = []; // 未闭合的 `[`：其内出现过的键（就地查询时连坐）
  let code = ''; // 已扫过的**非注释**文本：用来判字面量的前缀
  for (let i = 0; i < text.length;) {
    const two = text.slice(i, i + 2);
    if (two === '//') {
      const nl = text.indexOf('\n', i);
      i = nl < 0 ? text.length : nl;
      continue;
    }
    if (two === '/*') {
      const end = text.indexOf('*/', i + 2);
      i = end < 0 ? text.length : end + 2;
      continue;
    }
    const c = text[i];
    if (QUOTE_CHARS.has(c)) {
      let j = i + 1;
      while (j < text.length && text[j] !== c) j += text[j] === '\\' ? 2 : 1;
      const lit = text.slice(i + 1, j);
      if (lit.startsWith('calorie.')) {
        if (CMP_BEFORE.test(code) || CMP_AFTER.test(text.slice(j + 1, j + 33))) found.add(lit);
        for (const b of brackets) b.push(lit);
      }
      code += text.slice(i, Math.min(j + 1, text.length));
      i = j + 1;
      continue;
    }
    if (c === '[') brackets.push([]);
    if (c === ']') {
      const b = brackets.pop();
      if (b && b.length > 0 && INLINE_QUERY_AFTER.test(text.slice(i + 1, i + 25))) {
        for (const k of b) found.add(k);
      }
    }
    code += c;
    i += 1;
  }
  return found;
}

function tsFilesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return tsFilesUnder(p);
    return e.isFile() && e.name.endsWith('.ts') ? [p] : [];
  });
}

/** `src/cli` **全目录**（含 `legacy/` 那条过渡期分片）的按键分派字面量集。 */
function cliDispatchLiterals() {
  const literals = new Set();
  for (const f of tsFilesUnder(CLI_DIR)) {
    for (const k of calorieDispatchLiteralsOf(readFileSync(f, 'utf8'))) literals.add(k);
  }
  return literals;
}

function scanDispatchFile(file) {
  const src = readFileSync(join(CLI_DIR, file), 'utf8');
  return { literals: calorieDispatchLiteralsOf(src), lines: src.split('\n').length - 1 };
}

/* ── ① 终态：分派层不再有按键分派的 case（#320） ────────────────────────────────────────── */

test('#320 终态：分派层（src/cli 全目录）没有按键分派的 calorie. 字面量', () => {
  // 判据有鉴别力（机比，不是自述）：同一个扫描器喂**三种写法**的合成样本，都得数出来——
  // 只认单引号 `case` 的门，双引号或 `if (key === '…')` 就能整口绕过去（#320r 复核席 S2-1／S3-2 探针）。
  const probes = [
    ["switch (key) { case 'calorie.zz': { fail(3, 'zz'); } }", 'calorie.zz', '单引号 case'],
    ['switch (key) { case "calorie.zz": { fail(3, "zz"); } }', 'calorie.zz', '双引号 case'],
    ["if (key === 'calorie.yy') fail(3, 'yy');", 'calorie.yy', 'if 阶梯（=== 比较）'],
    ["if (new Set(['calorie.ww']).has(key)) fail(3, 'ww');", 'calorie.ww', '就地键集查询'],
  ];
  for (const [src, key, what] of probes) {
    assert.deepEqual([...calorieDispatchLiteralsOf(src)], [key], '扫描器看不见' + what + '（这条终态断言会假绿）');
  }
  // 反向自证：数据位（具名键集／默认值）与注释里的字样不许被数出来——判据是「按键分派」，
  // 不是「grep calorie.」（后者会把注册表、键集数据与文档一起算进去，红得没有意义）。
  const benign = [
    "const S = new Set(['calorie.profile.set']); // 具名键集＝数据位，不算分派",
    "const key = given ?? 'calorie.help.center';",
    "// 原先这里写 case 'calorie.view.home'（#320 已删）",
  ];
  for (const src of benign) {
    assert.deepEqual([...calorieDispatchLiteralsOf(src)], [], '数据位／注释被误判为按键分派：' + src);
  }

  const literals = cliDispatchLiterals();
  assert.deepEqual([...literals], [],
    '分派层仍有按键分派（#320 起老路应无活口）：' + [...literals].join('、'));
  for (const f of DISPATCH_FILES) {
    const found = scanDispatchFile(f).literals;
    assert.deepEqual([...found], [], f + ' 仍有按键分派：' + [...found].join('、'));
  }
});

test('#294 棘轮：两个分派文件的行数只许减少', () => {
  assert.ok(scanDispatchFile('cmd_read.ts').lines <= FROZEN_READ_LINES,
    'cmd_read.ts 行数变高：' + scanDispatchFile('cmd_read.ts').lines + ' > ' + FROZEN_READ_LINES);
  assert.ok(scanDispatchFile('write.ts').lines <= FROZEN_WRITE_LINES,
    'write.ts 行数变高：' + scanDispatchFile('write.ts').lines + ' > ' + FROZEN_WRITE_LINES);
});

/* ── ② 注册表那条路的活证 ＋ 老路无活口（#320 起） ────────────────────────────────────── */

function mkDb() {
  const dir = mkdtempSync(join(tmpdir(), 't294-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  db.prepare("INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal, goal_deadline, exercise_goal) VALUES (1, 1800, 150, 200, 50, 2000, 65, '2026-10-01', 300)").run();
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, 'male', 175, 'moderate')").run();
  const rows = [
    ['2026-09-05', '08:00:00', 70.5, '晨起'],
    ['2026-09-06', '08:00:00', 70.3, '晨起'],
    ['2026-09-07', '08:00:00', 70.1, '晨起'],
  ];
  for (const [d, t, kg, note] of rows) {
    db.prepare('INSERT INTO weight_log (date, time, weight_kg, height_cm, bmi, note) VALUES (?, ?, ?, 175, 23.0, ?)').run(d, t, kg, note);
  }
  db.prepare("INSERT INTO body_composition (date, source, body_fat_pct, note) VALUES ('2026-09-05', 'gym', 19.5, ''), ('2026-09-07', 'gym', 19.2, '')").run();
  return db;
}

test('#294 新路：注册表命中的体重键走能力目录（读＋写）', () => {
  const db = mkDb();
  try {
    const read = dispatch('calorie.view.weight', { start: '2026-09-05', end: '2026-09-07' }, db);
    assert.equal(read.data.metrics.recordCount, 3, '体重盘未走通（注册表路径）');
    assert.ok(read.html.includes('ilife-page'), '体重盘产物不是整页');

    const write = dispatchWrite('calorie.weight.log', { kg: 70.0, date: '2026-09-08' }, db);
    assert.equal(write.data.ok, true, '记体重未走通（注册表路径）');
    assert.ok(write.data.receipt.recordId > 0, '记体重回执缺记录号');

    // #320 · 补搬的那条（原住 `cmd_read.ts` 那口老 switch 的最后一条 case）：搬完后照旧从注册表走通。
    const goalWeight = dispatch('calorie.view.goal-weight', { start: '2026-09-05', end: '2026-09-07' }, db);
    assert.equal(goalWeight.data.metrics.weightGoal, 65, '体重目标未走通（#320 搬迁后的注册表路径）');
    assert.ok(goalWeight.html.includes('ilife-page'), '体重目标产物不是整页');
  } finally {
    db.close();
  }
});

test('#320 老路已无活口：未搬迁清单是空集，注册表键集即全量声明', () => {
  // 原 #294 的这条活证取样 `calorie.view.body-composition`（现住 `src/body/commands.ts:25`）与
  // `calorie.water.log`（现住 `src/diet/commands.ts:61`）——两键当刻都已在注册表里，
  // 「未命中注册表的老键」这个前提早已不成立；#320 搬走最后一条（`calorie.view.goal-weight`）后，
  // 老路的活口是**空集**：下一条断言就是它的机比判据。
  assert.deepEqual(LEGACY_COMMANDS.map((d) => d.key), [],
    '未搬迁清单不再是空集（老路又长出了活口）：' + LEGACY_COMMANDS.map((d) => d.key).join('、'));
  assert.deepEqual([...Object.keys(REGISTRY)].sort(), [...DECLARED_KEYS].sort(),
    '注册表键集 != 全量声明（101 键闭环破了：有键住在两处，或某个声明没有定义地）');

  // 两个「前任老键」照旧真跑一遍——它们当刻走的已是注册表那条路（新路不许断）。
  const db = mkDb();
  try {
    const read = dispatch('calorie.view.body-composition', {}, db);
    assert.equal(read.data.metrics.total, 2, '体成分读未走通（注册表路径）');

    const write = dispatchWrite('calorie.water.log', { ml: 300, date: '2026-09-08' }, db);
    assert.equal(write.data.ok, true, '记喝水未走通（注册表路径）');
  } finally {
    db.close();
  }
});

test('#703 真出口：体重键的读／写照旧走得通（门上那道 run* 已删）', () => {
  // #703 · 原先这条断言的是「能力门与分派层同键同结果」＋「门对非本能力的键即抛」：两件都是**门上
  // run* 的行为**，门上的入口删掉后它们随之退役（生产从来不走那条路）。真出口那一半留在这里。
  const db = mkDb();
  try {
    const read = dispatch('calorie.view.weight', { start: '2026-09-05', end: '2026-09-07' }, db);
    assert.ok(read.html.includes('ilife-page'), '体重盘未走通真出口');
    assert.equal(dispatchWrite('calorie.weight.log', { kg: 70.0, date: '2026-09-09' }, db).data.ok, true);
    // 非本能力的键那条不再有对应物：真出口对未登记键走 `fail()`（process.exit），本进程里断言会把
    // 测试进程一起带走——它由出口级测试（spawn）覆盖。
  } finally {
    db.close();
  }
});

/* ── ③ 声明与键表对账 ──────────────────────────────────────────────────────────────── */

test('#294 对账：注册表每条声明与 cli/keys.ts 的登记逐条一致', () => {
  assert.equal(new Set(REGISTRY_KEYS).size, REGISTRY_KEYS.length, '注册表有重复键');
  for (const key of REGISTRY_KEYS) {
    const spec = REGISTRY[key];
    const reg = CALORIE_COMBOS[key];
    assert.ok(reg, '注册表的键未登记进 CALORIE_COMBOS：' + key);
    // #703 · 写声明不再自带 `shape`（与 `kind: 'write'` 是同一件事实）：写键的形状事实住生成物
    // `CALORIE_WRITE_COMBOS`（由生成器合成），读键仍在声明上。
    assert.equal(spec.kind === 'write' ? 'receipt' : spec.shape, reg.shape, '形状不一致：' + key);
    assert.equal(spec.title, reg.title, '标题不一致：' + key);
    assert.equal(spec.kind === 'write', isCalorieWriteKey(key), 'kind 与写键表不一致：' + key);
    if (spec.kind === 'write') {
      assert.equal(CALORIE_WRITE_COMBOS[key].shape, 'receipt', '写命令一律 receipt 形：' + key);
      assert.ok(CALORIE_WRITE_COMBOS[key], '写键未登记：' + key);
    }
    assert.equal(typeof spec.run, 'function', '声明缺处理函数：' + key);
  }
  // #322 预热 · 口径与「搬了几家能力」无关：别的场景随各自的票搬进来时，本段一行不必改
  // （改写前这里是两条等号：`REGISTRY 恰为体重 9 条`＋`条数 == DECLARED_CAPABILITY_KEYS.length`，
  //  第一条命令搬进新能力目录即红 ⇒ 六票都来改同一处。改成 ⊇／≤ 后仍是原判据，只是不再钉住搬家进度。）
  const registryKeys = new Set(REGISTRY_KEYS);
  const weightKeys = WEIGHT_COMMANDS.map((c) => c.key);
  assert.equal(new Set(weightKeys).size, weightKeys.length, '体重声明出现重复键');
  // ① 注册表 ⊇ 体重声明的键集（注册表是生成物、体重声明是权威源）：搬迁不许把体重这几条弄丢。
  const missingInRegistry = weightKeys.filter((k) => !registryKeys.has(k));
  assert.deepEqual(missingInRegistry, [],
    '注册表缺了体重声明的键（生成物落后于权威源？）：' + missingInRegistry.join('、'));
  // ② 定义地：注册表里的每个键都能在某个能力目录的 `commands.ts` 里找到（不许有只活在生成物里的键）。
  const srcDir = join(HERE, '..', 'src');
  const capabilityDirs = readdirSync(srcDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(srcDir, e.name, 'commands.ts')))
    .map((e) => e.name)
    .sort();
  const declaredByCapabilities = new Set(capabilityDirs.flatMap((d) =>
    [...readFileSync(join(srcDir, d, 'commands.ts'), 'utf8').matchAll(/key: '([^']+)'/g)]
      .map((m) => m[1]).filter((k) => k.startsWith('calorie.'))));
  const withoutSite = [...registryKeys].filter((k) => !declaredByCapabilities.has(k));
  assert.deepEqual(withoutSite, [], '注册表的键在各能力目录的声明里找不到定义地：' + withoutSite.join('、'));
  // ③ 计数不手写：两边都从权威声明算出来（加／删一条命令时本行不动，见 test/declared.mjs）；
  //    口径是「≤」而非「==」——搬走一条命令时本行也不必改。
  assert.ok(weightKeys.length <= DECLARED_CAPABILITY_KEYS.length,
    '体重声明条数多于各能力目录声明的键数：' + weightKeys.length + ' > ' + DECLARED_CAPABILITY_KEYS.length);
});

test('#294 对账：每条声明的代表唤醒词都是真唤醒词，且路由落回同一个键', () => {
  const words = new Set(TRIGGERS.map((t) => t.wake_word));
  for (const spec of WEIGHT_COMMANDS) {
    const exec = routesFor(spec.wakeWord).filter((r) => r.kind === 'exec');
    assert.ok(words.has(spec.wakeWord) || exec.length > 0,
      '代表唤醒词不是真唤醒词（既不在触发词表，也不在路由表）：' + spec.wakeWord + '（' + spec.key + '）');
    for (const r of exec) {
      assert.equal(r.key, spec.key, '代表唤醒词路由到别的键：' + spec.wakeWord + ' → ' + r.key);
    }
  }
});
