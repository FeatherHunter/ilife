/** #294 · 命令登记与分派的**棘轮**＋注册表那条路的活证。
 *
 * 三件事：
 *   ① **终态（#320 起）**：分派层（`src/cli` 全目录）里**一条 `case 'calorie.…'` 都不许有**——
 *      #320 把最后一条老键（`calorie.view.goal-weight`）搬进 `src/weight/`、整口老 switch 删掉之后，
 *      「往分派层加一条分支」这件事不再有上限可调：空白名单是硬断言，塞一条当场变红。
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
import { runWeightView, runWeightWrite, WEIGHT_COMMANDS } from '../dist/weight/index.js';
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

/** 一段源码里的 `case 'calorie.…'` 标签集（判据本体；对文件与对合成样本用同一个）。 */
function calorieCaseLabelsOf(text) {
  return new Set([...text.matchAll(/case '([^']+)'/g)].map((m) => m[1]).filter((k) => k.startsWith('calorie.')));
}

function tsFilesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return tsFilesUnder(p);
    return e.isFile() && e.name.endsWith('.ts') ? [p] : [];
  });
}

/** `src/cli` **全目录**（含 `legacy/` 那条过渡期分片）的 `case 'calorie.…'` 标签集。 */
function cliCaseLabels() {
  const labels = new Set();
  for (const f of tsFilesUnder(CLI_DIR)) {
    for (const k of calorieCaseLabelsOf(readFileSync(f, 'utf8'))) labels.add(k);
  }
  return labels;
}

function caseLabels(file) {
  const src = readFileSync(join(CLI_DIR, file), 'utf8');
  return { labels: calorieCaseLabelsOf(src), lines: src.split('\n').length - 1 };
}

/* ── ① 终态：分派层不再有按键分派的 case（#320） ────────────────────────────────────────── */

test('#320 终态：分派层（src/cli 全目录）一条 case 标签都没有', () => {
  // 判据有鉴别力（机比，不是自述）：同一个扫描器喂一条合成的 `case`，必须看得见。
  const probe = calorieCaseLabelsOf("switch (key) { case 'calorie.x': return null; default: break; }");
  assert.deepEqual([...probe], ['calorie.x'], '扫描器看不见塞进去的 case（这条终态断言会假绿）');

  const labels = cliCaseLabels();
  assert.deepEqual([...labels], [],
    '分派层仍有按键分派的 case 分支（#320 起老路应无活口）：' + [...labels].join('、'));
  for (const f of DISPATCH_FILES) {
    assert.deepEqual([...caseLabels(f).labels], [], f + ' 仍有 case 分支：' + [...caseLabels(f).labels].join('、'));
  }
});

test('#294 棘轮：两个分派文件的行数只许减少', () => {
  assert.ok(caseLabels('cmd_read.ts').lines <= FROZEN_READ_LINES,
    'cmd_read.ts 行数变高：' + caseLabels('cmd_read.ts').lines + ' > ' + FROZEN_READ_LINES);
  assert.ok(caseLabels('write.ts').lines <= FROZEN_WRITE_LINES,
    'write.ts 行数变高：' + caseLabels('write.ts').lines + ' > ' + FROZEN_WRITE_LINES);
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

test('#294 能力那道门：同键同结果，非本能力的键即抛', () => {
  const db = mkDb();
  try {
    const viaDoor = runWeightView('calorie.view.weight', { start: '2026-09-05', end: '2026-09-07' }, db);
    const viaDispatch = dispatch('calorie.view.weight', { start: '2026-09-05', end: '2026-09-07' }, db);
    assert.deepEqual(viaDoor, viaDispatch, '门的产物与分派层不一致');

    assert.equal(runWeightWrite('calorie.weight.log', { kg: 70.0, date: '2026-09-09' }, db).data.ok, true);
    assert.throws(() => runWeightView('calorie.view.home', {}, db), /不是体重的读命令/, '门对非本能力的键必须抛');
    // 写命令的字段校验走 `fail()`（process.exit），不在此断言——它由出口级测试（spawn）覆盖，
    // 在本进程里断言会把测试进程一起带走。
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
    assert.equal(spec.shape, reg.shape, '形状不一致：' + key);
    assert.equal(spec.title, reg.title, '标题不一致：' + key);
    assert.equal(spec.kind === 'write', isCalorieWriteKey(key), 'kind 与写键表不一致：' + key);
    if (spec.kind === 'write') {
      assert.equal(spec.shape, 'receipt', '写命令一律 receipt 形：' + key);
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
