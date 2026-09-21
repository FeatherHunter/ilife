/** #254 · 目标类 4 件片段结果页变完整文档 —— 票面验收用例。
 *
 * 判据（票面「产物＝完整文档」的统一口径 ＋ 验收命令那一条）：
 *   ① 4 件逐件真跑（临时种子库 ＋ 真 CLI）：`calorie.view.goal` 的 7 天／30 天两窗、
 *      `calorie.view.goal-vs-actual` 30 天窗、`calorie.view.goal-expiring`（#590 起传显式 `today`
 *      把读数钉住，理由见 `CASES` 上方）；
 *   ② 每件 exit 0、`data.output` 是绝对路径且该文件真的在盘上；
 *   ③ 每件产物以 `<!doctype html>` 起、含 `<meta charset=`、含 `<style`、含 `ilife-page`
 *      （改前 4 件这三条全为假：字节 1779／1779／1357／1203，产物以 `<section class="ilife-page" …>` 起头）；
 *   ④ 每件的 `data.metrics` 与本件 `CASES` 的冻结表逐字段相同。**#590 重冻**：这张表由「#254 当时
 *      用真 CLI 跑出来的读数（`.scratch/t254/before.js`）」改成「**当刻口径**的读数」——票面判「甲」：
 *      漂移是共享取数（档案 TDEE）已提交变更所致，不是回归，出处逐条写在 `CASES` 上方；#254 原表
 *      （10841／1549／20276／2.63／676）随成因提交作废，不再是对的期望值。判据形态不变，仍是
 *      **反向锁**：正文换版式换出花来也不许动一个数，动了就红。
 *   ⑤ 可见文本里不出现内部词（命令键／snake_case／库表名那一类，走仓内 `visible-text-probe.mjs` 同一判据）。
 *   ⑥ **无参随机器钟的形态断言（#609 补，#591 票面点名）**：`calorie.view.goal-expiring` 不传入参 `today`
 *      时，`daysLeft` 必须＝**截止日 − 机器今天**（值不冻：它一天掉 1，冻住明天就红）。算式与「今天」的
 *      出处逐条写在测试体内；同族先例 `goal-result-290.test.mjs:204`（那边只判「与 115 不等」）。
 *
 * **反向对照（复核席点名要的那一条）**：只有正向断言时，实现缺失也可能白过。本件另加两发——
 *   · 拿改前那个片段形状（`<section class="ilife-page" …>`）打同一条判据 ⇒ **必须抛**；
 *   · 拿已经整页化的姊妹键 `calorie.view.goal-weight`（#390 先例）打同一条判据 ⇒ **必须过**；
 *   · 拿 7 天窗那份冻结 metrics 去核对 30 天窗的读数 ⇒ **必须抛**（证明第 ④ 条不是恒真）。
 *
 * 跑法：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`，再
 * `node --test packages/skill-calorie/test/goal-result-254.test.mjs`。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { seedFull, SEED_TODAY } from '../../../docs/research/t81-seed.mjs';
import { machineWords } from './visible-text-probe.mjs';
import { calorieConfigDir, configTestBase, freezeClock } from './helpers/config-test.mjs';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const BIN = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const DB_FILENAME = 'calorie_data.db';

/** 种子的体重目标截止日（`docs/research/t81-seed.mjs:52` 的 `daily_goal.goal_deadline`，逐字 `'2026-12-31'`）：
 *  无参「随机器钟」那条断言要拿它减机器今天。 */
const SEED_DEADLINE = '2026-12-31';

/** 改前那一版的片段形状（复核报告 §2.2 的产物头）；用来证明四断言咬得住片段。 */
const FRAGMENT_HEAD = '<section class="ilife-page" data-skill="calorie" data-slot="ilife:calorie:goal" '
  + 'style="background:#16181d;color:#e6edf3"><div class="ilife-block-kpiCard-grid">热量目标 1800 卡</div></section>';

/** 4 件实跑产物：`metrics` 是**当刻口径**下用真 CLI 跑出来的读数（临时库 ＋ `seedFull` ＋
 *  `CALORIE_TODAY=SEED_TODAY`），逐字段冻结。**#590 重冻的逐条出处**：
 *
 *  ① `goal-7d`／`goal-30d` 的 `weeklyDeficit`／`avgDeficit`／`predictedLossKg` —— 出处＝**成因提交
 *     `7831393`**（#518 W2，逐字：「#463 档案 TDEE：`series.ts::loadProfileTdee` 改读最近一次称重，
 *     无记录回退 70.0（逐字不变）」）。该件改前恒用 `70.0` 常量，本仓种子库的最近一次称重是
 *     `2026-09-08 70.6kg`（`docs/research/t81-seed.mjs`）⇒ 消耗类数值随真实体重上抬：10841→10886、
 *     1549→1555、20276→20357、676→679、2.63→2.64。**回退口径没变**：临时库里清空 `weight_log`
 *     后读数逐字回到 #254 原表（10841／1549／20276／676／2.63），即「档案无体重记录时与改前相同」
 *     这句自述成立（读数见 `docs/skills/skill-calorie/t589-重冻-证据.md` §二）。
 *  ② `expiring` 的 `daysLeft` —— 出处＝**日期推导**：`goal_deadline='2026-12-31'`（种子库
 *     `daily_goal`，`docs/research/t81-seed.mjs:52`）减「今天」，而本命令的「今天」**只认入参
 *     `today`**（`buildGoalExpiringView`，`src/goal/goalExtraPlate.ts:42`：`today ?? new Date()`；
 *     它**不读** `CALORIE_TODAY`）⇒ 无参时读数随机器钟天天漂（#254 冻的 107 就是 2026-09-15 的机器钟）。
 *     故本件**必须传显式 `today`** 把它钉死：`2026-12-31 − 2026-09-07 = 115` 天，同族先例逐字照
 *     `goal-result-290.test.mjs:45`（那张单子也把无参随机器钟那一支单列成断言，见该件 `:204`；
 *     `goal-weight-deadline-548.test.mjs:124` 同口径）。钉住之后**无参那一支就没有断言守着**，
 *     故 #609 另加一条只判形态的断言（见下「⑥ 无参随机器钟」）。 */
const CASES = [
  {
    name: 'goal-7d', key: 'calorie.view.goal', params: { window: '7d' },
    metaLeft: '看目标完成度 · 目标管理',
    metrics: {
      calorie_goal: 1800, protein_goal: 150, carbs_goal: 200, fat_goal: 50, water_goal: 2000,
      completionPct: 0, weeklyDeficit: 10886, predictedLossKg: 1.41, avgDeficit: 1555,
      avgIntake: 477, trendAvg: 477, completedCount: 0, incompleteCount: 9,
    },
  },
  {
    name: 'goal-30d', key: 'calorie.view.goal', params: { window: '30d' },
    metaLeft: '看目标完成度 · 目标管理',
    metrics: {
      calorie_goal: 1800, protein_goal: 150, carbs_goal: 200, fat_goal: 50, water_goal: 2000,
      completionPct: 0, weeklyDeficit: 20357, predictedLossKg: 2.64, avgDeficit: 679,
      avgIntake: 158, trendAvg: 158, completedCount: 0, incompleteCount: 9,
    },
  },
  {
    name: 'vs-30d', key: 'calorie.view.goal-vs-actual', params: { window: '30d' },
    metaLeft: '看目标对比实际 · 目标管理',
    metrics: { completedCount: 0, incompleteCount: 9, completionPct: 0, trendAvg: 158, calorieGoal: 1800 },
  },
  {
    name: 'expiring', key: 'calorie.view.goal-expiring', params: { today: SEED_TODAY },
    metaLeft: '看即将到期的目标 · 目标管理',
    metrics: { daysLeft: 115, withinDays: 14, expiring: 0, weightGoal: 68, calorieGoal: 1800 },
  },
];

/** 关键词表里允许上屏的那些（逐字同 `t401c-页面机器话探针.test.mjs:53`：`AI` 是老仓原话里的词，
 *  `JSON` 是复制数据三格式菜单里的格式名——用户点的就是它，属面向用户的专名，不是内部标识符）。 */
const ALLOWED_UPPER = new Set(['AI', 'JSON']);

/** 一份种子库当模板（`mkdtemp` ＋ `seedFull`；业务库一次都不碰）。 */
function mkTemplate() {
  const dir = mkdtempSync(join(tmpdir(), 't254-goal-'));
  const db = openDb(join(dir, DB_FILENAME));
  seedFull(db);
  db.close();
  return dir;
}

/** 真 CLI 跑一件：每件一个独立库副本（同 `t81-seed` 的 harness 口径）。
 *  `noClock: true` 那一趟**不钉钟**（给「无参 ⇒ 取机器钟」那条用例留真实时钟）。 */
function runCli(templateDir, name, key, params, noClock = false) {
  const runDir = join(templateDir, name);
  mkdirSync(runDir, { recursive: true });
  copyFileSync(join(templateDir, DB_FILENAME), join(runDir, DB_FILENAME));
  const out = join(runDir, name + '.html');
  const clock = noClock ? { NODE_OPTIONS: '', FAKE_NOW_ISO: '' } : freezeClock(SEED_TODAY);
  const r = spawnSync(process.execPath, [BIN, key, '--params', JSON.stringify(params ?? {}), '--html', out], {
    encoding: 'utf8',
    env: { ...process.env, ...homeEnvOf(calorieConfigDir(runDir)), ...clock },
  });
  let env = null;
  try { env = JSON.parse(String(r.stdout || '').trim()); } catch { env = null; }
  return {
    status: r.status,
    stderr: String(r.stderr || '').trim(),
    env,
    output: env?.data?.output ?? null,
    file: existsSync(out) ? readFileSync(out, 'utf8') : null,
  };
}

/** 「完整文档」四断言（票面口径；片段形状必红、整页必绿）。 */
function assertFullDoc(html, what) {
  assert.ok(html !== null, what + ' 未落盘');
  assert.ok(html.startsWith('<!doctype html>'), what + ' 缺 doctype');
  assert.ok(html.includes('<meta charset='), what + ' 缺 charset');
  assert.ok(html.includes('<style'), what + ' 缺 style');
  assert.ok(html.includes('ilife-page'), what + ' 缺 ilife-page');
}

test('#254 四件产物＝完整文档：绝对路径 ＋ 落盘 ＋ 四断言 ＋ metrics 与改前逐字段相同', () => {
  const tpl = mkTemplate();
  for (const c of CASES) {
    const r = runCli(tpl, c.name, c.key, c.params);
    assert.equal(r.status, 0, c.name + ' 应 exit 0，实测 ' + r.status + '（stderr：' + r.stderr.slice(0, 200) + '）');
    assert.ok(typeof r.output === 'string' && /^([A-Za-z]:\\|\/)/.test(r.output),
      c.name + ' data.output 应是绝对路径，实测 ' + JSON.stringify(r.output));
    assert.ok(existsSync(r.output), c.name + ' data.output 指向的文件不在盘上：' + r.output);
    assertFullDoc(r.file, c.name);
    assert.ok(r.file.length > 20000, c.name + ' 完整文档应远大于片段（实测 ' + r.file.length + ' 字节，改前 1203～1779）');
    assert.equal(readFileSync(r.output, 'utf8').length, r.file.length, c.name + ' 回执路径与产物字节应一致');
    /* ④ 反向锁：取数口径一个字不许变（值＝改前真 CLI 读数）。 */
    assert.deepEqual(r.env?.data?.metrics, c.metrics, c.name + ' 的 data.metrics 与改前逐字段不一致');
    /* 页头两行（唤醒词 ＋ 类型徽章）与结论句（含本页读数）在。 */
    assert.ok(r.file.includes(c.metaLeft), c.name + ' 页头里没有唤醒词那一行：' + c.metaLeft);
    assert.ok(r.file.includes('type-badge'), c.name + ' 页头里没有类型徽章');
    assert.ok(r.file.includes('结论：'), c.name + ' 没有结论句');
    assert.ok(r.file.includes('ilife-block-toc'), c.name + ' 没有页内导航');
    assert.ok(r.file.includes('ilife-block-caliber'), c.name + ' 没有口径行或来源脚注');
    assert.ok(r.file.includes('calorie-cmd-read ' + c.key), c.name + ' 复制日志里没有本次命令原文');
    const dirty = machineWords(r.file)
      .filter((w) => w.hit !== null && !ALLOWED_UPPER.has(w.hit))
      .map((w) => w.kind + '＝' + w.hit);
    assert.deepEqual(dirty, [], c.name + ' 可见文本里有内部词');
  }
});

test('#254 反向对照：判据咬得住片段、认得整页，metrics 对照器不是恒真', () => {
  const tpl = mkTemplate();

  /* a) 片段形状必红：改前那 4 件就是这个形状（`<section class="ilife-page" …>`）。 */
  assert.throws(() => assertFullDoc(FRAGMENT_HEAD, '改前片段形状'), /缺 doctype/,
    '片段形状竟然通过了四断言 —— 判据是恒绿的，白过');

  /* b) 阳性对照：已经整页化的姊妹键（#390）打同一条判据必须过 —— 证明判据不是恒红。 */
  const control = runCli(tpl, 'goal-weight', 'calorie.view.goal-weight', { window: '30d' });
  assert.equal(control.status, 0, '对照命令 calorie.view.goal-weight 应 exit 0');
  assertFullDoc(control.file, '对照 calorie.view.goal-weight');

  /* c) metrics 反向锁有牙：把 7 天窗那份冻结表拿去核对 30 天窗的读数，判据必须抛。 */
  const wide = runCli(tpl, 'goal-30d', 'calorie.view.goal', { window: '30d' });
  assert.equal(wide.status, 0, '30 天窗应 exit 0');
  assert.throws(() => assert.deepEqual(wide.env?.data?.metrics, CASES[0].metrics, '错配对照'),
    /错配对照/, '两份不同的 metrics 竟然判等 —— 第 ④ 条恒真，白过');
});

test('#254 ⑥ 无参随机器钟：daysLeft ＝ 截止日 − 机器今天（值不冻，只判形态）', () => {
  const tpl = mkTemplate();
  /* 同一件命令，**不传** `today`（主测 `CASES.expiring` 传的是 `SEED_TODAY`）：这条要的就是
   * 「无参 ⇒ 取机器钟」那一支。出处：`src/goal/goalExtraPlate.ts:42` 逐字
   * `const t = today ?? new Date().toISOString().slice(0, 10);`——本命令的「今天」只认入参 `today`，
   * **不读** `CALORIE_TODAY`（同仓另注：`goal-weight-deadline-548.test.mjs:124`）。 */
  const r = runCli(tpl, 'expiring-machine-clock', 'calorie.view.goal-expiring', {}, true);
  assert.equal(r.status, 0, '无参 expiring 应 exit 0，实测 ' + r.status + '（stderr：' + r.stderr.slice(0, 200) + '）');
  /* 期望值＝**形态**（不写死数字）：截止日取种子库那一条（`SEED_DEADLINE`，出处见其定义处），
   * 机器今天取与实现同一套 ISO 日期（`src/goal/goalExtraPlate.ts:42`），差值算式同实现
   * `:49`：`Math.round((Date.parse(截止日 + 'T12:00:00Z') − Date.parse(今天 + 'T12:00:00Z')) / 86400000)`。 */
  const machineToday = new Date().toISOString().slice(0, 10);
  const expectedDaysLeft = Math.round(
    (Date.parse(SEED_DEADLINE + 'T12:00:00Z') - Date.parse(machineToday + 'T12:00:00Z')) / 86400000);
  assert.equal(r.env?.data?.metrics?.daysLeft, expectedDaysLeft,
    '无参 daysLeft 应＝截止日 ' + SEED_DEADLINE + ' − 机器今天 ' + machineToday
    + '（＝' + expectedDaysLeft + '），实测 ' + JSON.stringify(r.env?.data?.metrics?.daysLeft));
  /* 反向对照：同一支命令**传**显式 `today: SEED_TODAY` 必须给出 115（`2026-12-31 − 2026-09-07`，
   * 主测那张冻结表的出处），证明上面那条不是恒真式（两支的读数各按各的「今天」算）。 */
  const pinned = runCli(tpl, 'expiring-pinned-again', 'calorie.view.goal-expiring', { today: SEED_TODAY });
  assert.equal(pinned.status, 0, '显式 today 那一支应 exit 0');
  assert.equal(pinned.env?.data?.metrics?.daysLeft, 115, '显式 today = SEED_TODAY 时 daysLeft 应为 115（日期推导）');
  if (machineToday !== SEED_TODAY) {
    assert.notEqual(r.env?.data?.metrics?.daysLeft, pinned.env?.data?.metrics?.daysLeft,
      '机器今天 ≠ 2026-09-07 时，两支读数不该相等（否则「随机器钟」这句名不副实）');
  }
});
