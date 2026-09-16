/** #290 · 结果页后半 6 条整页化验收（体重目标族 2＋预测对照族 2＋两条悬空视图）。
 *
 * 判据（与 #254 同一形状）：
 *   ① 6 条逐条真跑（临时种子库 ＋ 真 CLI）：`weight-7d`／`expiring`（显式 today）／`vs-30d`／
 *      `predict-14d`／`config`／`status`；
 *   ② 每条 exit 0、`data.output` 是绝对路径且该文件真的在盘上；
 *   ③ 每条产物是完整文档（doctype／charset／style／ilife-page；改前 config 1503B／status 960B 均为片段）；
 *   ④ 每条的 `data.metrics` 与冻结值逐字段相同（取数口径一字不动）——冻结值即证据
 *      `docs/skills/skill-calorie/t290-后半-证据.md` §一（`read.ts` 的 `nums` 对象原样透传）；
 *      唯 `expiring` 改传显式 `today`（无 today 入参时取机器今天，每天漂 1 天，见证据 §一），
 *      `predict` 只钉新仓可复跑值（eta／daysLeft／rate，见下注）；
 *   ⑤ `resultDocs` 族四页可见文本无内部词（与 #254 同一探针；`weight`／`predict` 页本票未动，不探）；
 *   ⑥ 新呈现三处：`expiring` 紧迫度卡、`vs` 平均偏差行、`predict` 达成日与健康徽章。
 *
 * 注 · `predict` 老家口径差（只钉新仓值，不断言与老家同值）：老家达成日复用
 * `weight_milestone.est_date`、置信度按实际日变绝对值分高中低；新仓 `weightTarget`
 * 线性外推 ＋ `eta ＝ 末日 ＋ round(daysLeft)`、`feasible ＝ 0.5–1.0kg/周`
 * （`src/analysis/simulate.ts` 既有注释承认与老家有意偏离）。冻结 `eta=2027-03-05`。
 *
 * 注 · `expiring` 紧迫度是呈现层派生（已过期／3 天内高／落窗中／窗外低），不动取数；
 * 老家另按需算速率分档（需当前体重，本视图无该字段，取数口径另开票裁），见页上口径行。
 *
 * 反向锁（第二测）：片段形状必红、错配必抛、紧迫度三档真分档、固定 today 可复跑、无 today 会漂。
 *
 * 跑法：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`，再
 * `node --test packages/skill-calorie/test/goal-result-290.test.mjs`（编译／测试经
 * `node tooling/run-locked.mjs --ticket 290 -- <命令>` 持锁）。
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

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const BIN = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const DB_FILENAME = 'calorie_data.db';

/** `expiring` 传显式 today 钉死 `daysLeft`（种子截止 2026-12-31，`SEED_TODAY=2026-09-07` ⇒ 115 天）。 */
const FIXED_TODAY = SEED_TODAY;

/** 改前那个片段形状（#254 同款断言形状）；用来证明四断言咬得住片段。 */
const FRAGMENT_HEAD = '<section class="ilife-page" data-skill="calorie" data-slot="ilife:calorie:goal-config" '
  + 'style="background:#16181d;color:#e6edf3"><div class="ilife-block-kpiCard-grid">热量目标 1800 卡</div></section>';

/** 6 条实跑：`metrics` 是冻结值（证据 §一），逐字段锁死。 */
const CASES = [
  {
    name: 'weight-7d', key: 'calorie.view.goal-weight', params: { window: '7d' }, family: 'weight',
    metrics: { weightGoal: 68, latestKg: 70.6, deltaKg: -0.1, loggedDays: 7 },
    texts: ['距目标', '复制数据', '结论'],
  },
  {
    name: 'expiring-fixed', key: 'calorie.view.goal-expiring', params: { today: FIXED_TODAY }, family: 'result',
    metaLeft: '看即将到期的目标 · 目标管理',
    metrics: { daysLeft: 115, withinDays: 14, expiring: 0, weightGoal: 68, calorieGoal: 1800 },
    texts: ['紧迫度'],
    urgency: '低',
  },
  {
    name: 'vs-30d', key: 'calorie.view.goal-vs-actual', params: { window: '30d' }, family: 'result',
    metaLeft: '看目标对比实际 · 目标管理',
    metrics: { completedCount: 0, incompleteCount: 9, completionPct: 0, trendAvg: 158, calorieGoal: 1800 },
    texts: ['平均偏差', '-70.81 %'],
  },
  {
    name: 'predict-14d', key: 'calorie.view.goal-predict', params: { window: '14d' }, family: 'predict',
    metrics: { targetKg: 68, current: 70.6, daysLeft: 179, ratePerWeek: -0.1, feasible: 0 },
    texts: ['预计达成', '2027-03-05', '超范围'],
  },
  {
    name: 'config', key: 'calorie.view.goal-config', params: {}, family: 'result',
    metaLeft: '看目标配置 · 目标管理',
    metrics: {
      calorie_goal: 1800, protein_goal: 150, carbs_goal: 200, fat_goal: 50, water_goal: 2000,
      diffKcal: 50, consistent: 1, paused: 0,
    },
    texts: ['自洽', '宏量折算热量'],
  },
  {
    name: 'status', key: 'calorie.view.goal-status', params: {}, family: 'result',
    metaLeft: '看目标状态 · 目标管理',
    metrics: { paused: 0, calorie_goal: 1800, water_goal: 2000 },
    texts: ['恢复入口', '进行中'],
  },
];

/** 关键词表里允许上屏的那些（逐字同 `goal-result-254.test.mjs`）。 */
const ALLOWED_UPPER = new Set(['AI', 'JSON']);

/** 一份种子库当模板（`mkdtemp` ＋ `seedFull`；业务库一次都不碰）。 */
function mkTemplate() {
  const dir = mkdtempSync(join(tmpdir(), 't290-goal-'));
  const db = openDb(join(dir, DB_FILENAME));
  seedFull(db);
  db.close();
  return dir;
}

/** 真 CLI 跑一件：每件一个独立库副本（同 `t81-seed` 的 harness 口径）。 */
function runCli(templateDir, name, key, params) {
  const runDir = join(templateDir, name);
  mkdirSync(runDir, { recursive: true });
  copyFileSync(join(templateDir, DB_FILENAME), join(runDir, DB_FILENAME));
  const out = join(runDir, name + '.html');
  const r = spawnSync(process.execPath, [BIN, key, '--params', JSON.stringify(params ?? {}), '--html', out], {
    encoding: 'utf8',
    env: { ...process.env, SKILLS_DB_PATH: runDir, CALORIE_TODAY: SEED_TODAY },
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

/** 「完整文档」四断言（与 #254 同一口径；片段形状必红、整页必绿）。 */
function assertFullDoc(html, what) {
  assert.ok(html !== null, what + ' 未落盘');
  assert.ok(html.startsWith('<!doctype html>'), what + ' 缺 doctype');
  assert.ok(html.includes('<meta charset='), what + ' 缺 charset');
  assert.ok(html.includes('<style'), what + ' 缺 style');
  assert.ok(html.includes('ilife-page'), what + ' 缺 ilife-page');
}

/** `resultDocs` 族断言（与 #254 同一套装配件：页头唤醒词 ＋ 徽章 ＋ 结论 ＋ 导航 ＋ 口径 ＋ 复制日志 ＋ 探针）。 */
function assertResultFamily(file, c) {
  assert.ok(file.includes(c.metaLeft), c.name + ' 页头里没有唤醒词那一行：' + c.metaLeft);
  assert.ok(file.includes('type-badge'), c.name + ' 页头里没有类型徽章');
  assert.ok(file.includes('结论：'), c.name + ' 没有结论句');
  assert.ok(file.includes('ilife-block-toc'), c.name + ' 没有页内导航');
  assert.ok(file.includes('ilife-block-caliber'), c.name + ' 没有口径行');
  assert.ok(file.includes('calorie-cmd-read ' + c.key), c.name + ' 复制日志里没有本次命令原文');
  const dirty = machineWords(file)
    .filter((w) => w.hit !== null && !ALLOWED_UPPER.has(w.hit))
    .map((w) => w.kind + '＝' + w.hit);
  assert.deepEqual(dirty, [], c.name + ' 可见文本里有内部词');
}

test('#290 六条产物＝完整文档：exit0 ＋ 落盘 ＋ 四断言 ＋ metrics 冻结 ＋ 新呈现三处', () => {
  const tpl = mkTemplate();
  for (const c of CASES) {
    const r = runCli(tpl, c.name, c.key, c.params);
    assert.equal(r.status, 0, c.name + ' 应 exit 0，实测 ' + r.status + '（stderr：' + r.stderr.slice(0, 200) + '）');
    assert.ok(typeof r.output === 'string' && /^([A-Za-z]:\\|\/)/.test(r.output),
      c.name + ' data.output 应是绝对路径，实测 ' + JSON.stringify(r.output));
    assert.ok(existsSync(r.output), c.name + ' data.output 指向的文件不在盘上：' + r.output);
    assertFullDoc(r.file, c.name);
    assert.ok(r.file.length > 20000, c.name + ' 完整文档应远大于片段（实测 ' + r.file.length + ' 字节，改前 config 1503／status 960）');
    assert.equal(readFileSync(r.output, 'utf8').length, r.file.length, c.name + ' 回执路径与产物字节应一致');
    /* 反向锁：取数口径一字不动（metrics 原样透传）。 */
    assert.deepEqual(r.env?.data?.metrics, c.metrics, c.name + ' 的 data.metrics 与冻结值逐字段不一致');
    for (const t of c.texts) assert.ok(r.file.includes(t), c.name + ' 缺呈现文本：' + t);
    if (c.family === 'result') assertResultFamily(r.file, c);
    if (c.urgency !== undefined) {
      assert.match(r.file, new RegExp('紧迫度[\\s\\S]{0,400}' + c.urgency), c.name + ' 紧迫度档位应为' + c.urgency);
    }
  }
});

test('#290 反向锁：片段必红、错配必抛、紧迫度三档真分档、固定 today 可复跑、无 today 会漂', () => {
  const tpl = mkTemplate();

  /* a) 片段形状必红：改前 config／status 就是这个形状。 */
  assert.throws(() => assertFullDoc(FRAGMENT_HEAD, '改前片段形状'), /缺 doctype/,
    '片段形状竟然通过了四断言 —— 判据是恒绿的，白过');

  /* b) metrics 反向锁有牙：拿 config 那份冻结表去核对 status 的读数，判据必须抛。 */
  const st = runCli(tpl, 'status-x', 'calorie.view.goal-status', {});
  assert.equal(st.status, 0, 'status 应 exit 0');
  const cfgFrozen = CASES.find((c) => c.name === 'config').metrics;
  assert.throws(() => assert.deepEqual(st.env?.data?.metrics, cfgFrozen, '错配对照'),
    /错配对照/, '两份不同的 metrics 竟然判等 —— metrics 锁恒真，白过');

  /* c) 紧迫度三档真分档（同一截止日 2026-12-31，换 today 入参）：高／中两档。 */
  const hi = runCli(tpl, 'expiring-high', 'calorie.view.goal-expiring', { today: '2026-12-29' });
  assert.equal(hi.status, 0, 'expiring-high 应 exit 0');
  assert.deepEqual(hi.env?.data?.metrics, { daysLeft: 2, withinDays: 14, expiring: 1, weightGoal: 68, calorieGoal: 1800 });
  assert.match(hi.file, /紧迫度[\s\S]{0,400}高/, '剩余 2 天紧迫度应为高');
  const mid = runCli(tpl, 'expiring-mid', 'calorie.view.goal-expiring', { today: '2026-12-20' });
  assert.equal(mid.status, 0, 'expiring-mid 应 exit 0');
  assert.deepEqual(mid.env?.data?.metrics, { daysLeft: 11, withinDays: 14, expiring: 1, weightGoal: 68, calorieGoal: 1800 });
  assert.match(mid.file, /紧迫度[\s\S]{0,400}中/, '剩余 11 天（落窗）紧迫度应为中');
  /* 低档见主测 expiring-fixed（剩余 115 天，窗外）。 */

  /* d) 固定 today 可复跑：同一入参跑两次，metrics 逐字段相同。 */
  const again = runCli(tpl, 'expiring-fixed-2', 'calorie.view.goal-expiring', { today: FIXED_TODAY });
  assert.equal(again.status, 0, 'expiring 固定 today 第二次应 exit 0');
  assert.deepEqual(again.env?.data?.metrics, CASES.find((c) => c.name === 'expiring-fixed').metrics, '固定 today 两次读数应一致');

  /* e) 无 today 会漂（这就是主测必须传显式 today 的原因；假设运行日 ≠ 2026-09-07）。 */
  const drift = runCli(tpl, 'expiring-drift', 'calorie.view.goal-expiring', {});
  assert.equal(drift.status, 0, 'expiring 无参应 exit 0');
  assert.notEqual(drift.env?.data?.metrics?.daysLeft, 115, '无 today 入参时取机器今天，读数应随日期漂（若本断言红，说明机器今天恰是 2026-09-07）');
});
