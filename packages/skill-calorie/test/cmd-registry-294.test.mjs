/** #294 · 命令登记与分派的**棘轮**＋两条路的活证。
 *
 * 三件事：
 *   ① **棘轮**：两个分派文件里的 `case 'calorie.…'` 标签集合**只许从冻结清单里减少**——
 *      清单不许变长、分派文件行数不许变高。手改回「往分派层加一条 case」当场变红。
 *   ② **两条路各有活证**：命中注册表的新路（走能力目录）与未命中注册表的老路（走原 switch）
 *      各真跑一次读、一次写——防「新路通了、老路悄悄断」。
 *   ③ **对账**：注册表每条声明的键／形状／标题与 `cli/keys.ts` 的登记逐条对得上，
 *      `kind` 与「是不是写键」等价，代表唤醒词都是 `TRIGGERS` 里真有的唤醒词。
 *
 * 冻结口径（写死在下面）：
 *   - 行数＝文件按 `\\n` 切分的物理行数；
 *   - `cmd_read.ts` 冻结 1146 行／`write.ts` 冻结 745 行（本票交付时实测；
 *     票面写的 1140／879 是设计正本撰写时的估值，与实际口径不同，已在交付对账里记账）；
 *   - 标签清单＝去重后的 `case 'calorie.…'` 标签。
 *
 * 运行：先 `pnpm --filter skill-calorie build`，再跑根 `pnpm test`。
 */
import { strict as assert } from 'node:assert';
import { mkdtempSync, readFileSync } from 'node:fs';
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
import { DECLARED_CAPABILITY_KEYS } from './declared.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI_DIR = join(HERE, '..', 'src', 'cli');

/* ── 冻结基线（只许变短） ─────────────────────────────────────────────────────────────── */

const FROZEN_READ_LINES = 1146;
const FROZEN_WRITE_LINES = 745;

const FROZEN_READ_CASES = new Set([
  'calorie.today', 'calorie.view.home', 'calorie.view.diet', 'calorie.view.exercise',
  'calorie.view.exercise-strength', 'calorie.view.exercise-cardio', 'calorie.view.exercise-distribution',
  'calorie.view.exercise-recap', 'calorie.view.exercise-review', 'calorie.view.exercise-trend',
  'calorie.view.nutrition-ratio', 'calorie.view.nutrition-detail', 'calorie.view.source-stats',
  'calorie.view.today-water', 'calorie.view.calorie-trend', 'calorie.view.long-trend',
  'calorie.view.nutrition-analysis', 'calorie.view.six-factors', 'calorie.view.measure-wizard',
  'calorie.view.composition-wizard', 'calorie.view.photo-log-wizard', 'calorie.view.gif-planner',
  'calorie.view.profile-wizard', 'calorie.view.goal-wizard', 'calorie.view.lint-health',
  'calorie.view.batch-import-preview', 'calorie.view.process-progress', 'calorie.view.review-template',
  'calorie.view.goal', 'calorie.view.goal-config', 'calorie.view.goal-recommend',
  'calorie.view.goal-weight', 'calorie.view.goal-progress', 'calorie.view.goal-status',
  'calorie.view.combined', 'calorie.view.deficit', 'calorie.view.diet-review', 'calorie.view.health',
  'calorie.view.ranking', 'calorie.view.library', 'calorie.view.search', 'calorie.photo.list',
  'calorie.photo.detail', 'calorie.photo.compare', 'calorie.photo.gif', 'calorie.help.center',
  'calorie.help.lookup', 'calorie.history', 'calorie.view.body-composition', 'calorie.view.body-measure',
  'calorie.view.plan', 'calorie.view.plan-wizard', 'calorie.view.exercise-goal',
  'calorie.view.goal-expiring', 'calorie.view.goal-predict', 'calorie.view.goal-vs-actual',
  'calorie.view.predict', 'calorie.view.anomaly', 'calorie.view.contraindication',
  'calorie.view.dedupe', 'calorie.view.profile',
]);

const FROZEN_WRITE_CASES = new Set([
  'calorie.profile.set', 'calorie.profile.activity', 'calorie.profile.update',
  'calorie.diet.add', 'calorie.diet.update', 'calorie.diet.remove', 'calorie.diet.batch',
  'calorie.diet.copy', 'calorie.diet.update-by-date', 'calorie.diet.remove-by-date',
  'calorie.diet.remove-by-range', 'calorie.diet.remove-by-type', 'calorie.water.log',
  'calorie.exercise.add', 'calorie.exercise.update', 'calorie.exercise.remove',
  'calorie.photo.add', 'calorie.photo.remove', 'calorie.photo.tag',
  'calorie.product.add', 'calorie.product.update', 'calorie.product.deprecate',
  'calorie.goal.set', 'calorie.goal.water', 'calorie.goal.weight', 'calorie.goal.pause',
  'calorie.goal.resume', 'calorie.body.composition-add', 'calorie.body.composition-remove',
  'calorie.body.measure-add', 'calorie.body.measure-remove',
]);

/** 清单「只许变短」的上限：等于冻结时的条数，长一条即红（改这个数字＝一次显式的加码动作）。 */
const FROZEN_READ_CASES_MAX = 61;
const FROZEN_WRITE_CASES_MAX = 31;

function caseLabels(file) {
  const src = readFileSync(join(CLI_DIR, file), 'utf8');
  const all = [...src.matchAll(/case '([^']+)'/g)].map((m) => m[1]).filter((k) => k.startsWith('calorie.'));
  return { labels: new Set(all), lines: src.split('\n').length - 1 };
}

/* ── ① 棘轮 ─────────────────────────────────────────────────────────────────────────── */

test('#294 棘轮：分派层的 case 标签只许从冻结清单里减少', () => {
  const cases = [
    ['cmd_read.ts', FROZEN_READ_CASES, FROZEN_READ_CASES_MAX],
    ['write.ts', FROZEN_WRITE_CASES, FROZEN_WRITE_CASES_MAX],
  ];
  for (const [file, frozen, max] of cases) {
    const { labels } = caseLabels(file);
    for (const k of labels) {
      assert.ok(frozen.has(k), file + ' 出现清单外的新 case（往分派层加分支＝破坏接缝）：' + k);
    }
    assert.ok(frozen.size <= max, file + ' 的冻结清单变长了（加码）：' + frozen.size + ' > ' + max);
  }
});

test('#294 棘轮：两个分派文件的行数只许减少', () => {
  assert.ok(caseLabels('cmd_read.ts').lines <= FROZEN_READ_LINES,
    'cmd_read.ts 行数变高：' + caseLabels('cmd_read.ts').lines + ' > ' + FROZEN_READ_LINES);
  assert.ok(caseLabels('write.ts').lines <= FROZEN_WRITE_LINES,
    'write.ts 行数变高：' + caseLabels('write.ts').lines + ' > ' + FROZEN_WRITE_LINES);
});

/* ── ② 两条路各有活证 ───────────────────────────────────────────────────────────────── */

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
  } finally {
    db.close();
  }
});

test('#294 老路：未命中注册表的老键照旧落原 switch（读＋写）', () => {
  const db = mkDb();
  try {
    const read = dispatch('calorie.view.body-composition', {}, db);
    assert.equal(read.data.metrics.total, 2, '体成分读未走通（老 switch 路径）');

    const write = dispatchWrite('calorie.water.log', { ml: 300, date: '2026-09-08' }, db);
    assert.equal(write.data.ok, true, '记喝水未走通（老 switch 路径）');
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
  // 本票只搬了体重：注册表当前恰好是体重那 9 条。
  assert.deepEqual([...REGISTRY_KEYS].sort(), WEIGHT_COMMANDS.map((c) => c.key).sort(),
    '注册表当前应恰为体重 9 条（别的场景随各自的票搬）');
  // 计数不手写：两边都从权威声明算出来（加／删一条命令时本行不动，见 test/declared.mjs）。
  assert.equal(WEIGHT_COMMANDS.length, DECLARED_CAPABILITY_KEYS.length,
    '体重声明条数 == 各能力目录声明的键数（权威声明算出来的，不再手写数字）');
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
