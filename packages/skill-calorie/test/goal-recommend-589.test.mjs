/** #589 · 目标推荐整页化验收（`calorie.view.goal-recommend`：片段 → 完整文档，复用目标域同族装配）。
 *
 * 改前这条命令走 `src/render/html.ts::renderGoalRecommendHtml` 的旧片段——产物以
 * `<section class="ilife-page" …>` 起头、没有文档骨架（#256 锁票探针第 26 条；本票改前实测
 * 1968 B）。本票把 `src/goal/read.ts` 的 `html:` 改走本目录姊妹件 `goalRecommendDoc.ts`
 * （`./resultDocs.ts` 那套同族装配：页头唤醒词行 ＋ 类型徽章 ＋ 结论句 ＋ 页内导航 ＋ 读数卡与表 ＋
 * 口径行 ＋ 复制区双按钮），取数、参数与 `metrics` 一字未动。
 *
 * 判据（每条都真跑 `dist/cli/cmd_read.js`，临时种子库）：
 *   ① exit 0；② `data.output` 是绝对路径且文件真的在盘；③ 完整文档四断言 ＋ 字节 > 20KB；
 *   ④ `data.metrics` 与**冻结值**逐字段相同（推荐数：每日基准消耗 2564／热量 2064／蛋白 141／
 *      碳水 246／脂肪 57／饮水 2471——即票面那串数）；
 *   ⑤ 同族装配六样在场（页头那一行唤醒词／类型徽章／结论句／页内导航／口径行／复制日志里的命令原文）；
 *   ⑥ 可见文本无机器话（`visible-text-probe.mjs` 四类探针，剥掉复制载荷后判定）；
 *   ⑦ 路由面一字不动：声明件与生成物里 `看目标推荐` 那条记录的 `cli` 与产物复制日志里的命令原文逐字相同；
 *   ⑧ 同族同架：本页与 `goal-config`（#290 已整页化的同族页）共用同一套骨架标记。
 *
 * 反向锁（第二测）：片段形状必红、错配必抛、固定钟下两次实跑产物同哈希（页内不掺墙钟）。
 * 红线②（不删旧片段）：旧 `renderGoalRecommendHtml` 仍在 `dist/render/html.js` 里导出、且**仍是片段**。
 *
 * 时钟：`--require test/freeze-clock.cjs` ＋ `FAKE_NOW_ISO=2026-09-07T00:00:00`（饮水推荐按**当季**
 * 取 35 ml/kg，只钉 `CALORIE_TODAY` 不够——那一位只覆盖 `todayISO()`，`recommendWaterGoal` 读的是
 * `new Date().getMonth()`）；`CALORIE_TODAY=SEED_TODAY` 钉数据日。
 *
 * 跑法（编译／测试都要持锁）：先
 * `node tooling/run-locked.mjs --ticket 589 -- node node_modules/typescript/bin/tsc -b packages/skill-calorie --force`
 * 再 `node tooling/run-locked.mjs --ticket 589 -- node --test packages/skill-calorie/test/goal-recommend-589.test.mjs`。
 * 真库零触碰：库路径恒走 `mkdtemp` 的临时目录。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { GOAL_ROUTES } from '../dist/goal/routes.js';
import { ALL_ROUTES } from '../dist/triggers/routes.generated.js';
import { renderGoalRecommendHtml } from '../dist/render/html.js';
import { seedFull, SEED_TODAY } from '../../../docs/research/t81-seed.mjs';
import { machineWords } from './visible-text-probe.mjs';
import { assertDocPage } from './doc-page-assert.mjs';
import { calorieConfigDir, configTestBase, freezeClock } from './helpers/config-test.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const PRELOAD = join(HERE, 'freeze-clock.cjs');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';
const KEY = 'calorie.view.goal-recommend';
const WAKE_WORD = '看目标推荐';
/** 路由 cli 原文（与 `src/goal/routes.ts` 那条 exec 行逐字同；复制日志要照抄得出来）。 */
const CMD_CLI = 'calorie-cmd-read ' + KEY + " --params '{\"profile\":\"cut\"}'";
/** 钉「当刻」（判据④的饮水推荐按当季取值，见件头）。 */
const FIXED_NOW = SEED_TODAY + 'T00:00:00';

/** 冻结读数（`read.ts` 的 `nums` 对象原样透传；种子＝30 岁／男／175 cm／70.6 kg，cut 档）。 */
const FROZEN_METRICS = {
  calorieGoal: 2064, proteinGoal: 141, carbsGoal: 246, fatGoal: 57, waterGoal: 2471,
  tdee: 2564, bmr: 1654, weeklyRateKg: 0.5, weightKg: 70.6, recommendedWaterMl: 2471, mlPerKg: 35,
};

/** 同族装配六样（与 #254／#290 的 `resultDocs` 族同一套；`goal-config` 页也要有这六样）。 */
const FAMILY_MARKERS = ['type-badge', '结论：', 'ilife-block-toc', 'ilife-block-caliber'];

/** 改前那个片段形状（#256 第 26 条实测 1968 B）：用来证明四断言咬得住片段。 */
const FRAGMENT_HEAD = '<section class="ilife-page" data-skill="calorie" '
  + 'data-slot="ilife:calorie:goal-recommend" style="background:#16181d;color:#e6edf3">'
  + '<h1 class="ilife-title">目标推荐（减脂）</h1></section>';

/** 允许上屏的全大写词（与 `goal-result-254/290` 同表：复制区三格式菜单的格式名）。 */
const ALLOWED_UPPER = new Set(['AI', 'JSON']);

const sha = (s) => createHash('sha256').update(s).digest('hex');

/** 实体解码（判据要读**复制载荷**里的命令原文：它住 `data-t` 属性值、按五字符表转义）。
 *  与 `visible-text-probe.mjs` 的 `decodeEntities` 同口径；本件只解这五个，够用。 */
function unentity(s) {
  return s
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

/** 一份种子库当模板（`mkdtemp` ＋ `seedFull`；业务库一次都不碰）。 */
function mkTemplate() {
  const dir = mkdtempSync(join(tmpdir(), 't589-rec-'));
  const db = openDb(join(dir, DB_FILENAME));
  seedFull(db);
  db.close();
  return dir;
}

/** 真 CLI 跑一件：每件一个独立库副本（与 #254／#290 的 harness 同形）。 */
function runCli(template, name, key, params) {
  const runDir = join(template, name);
  mkdirSync(runDir, { recursive: true });
  copyFileSync(join(template, DB_FILENAME), join(runDir, DB_FILENAME));
  const out = join(runDir, name + '.html');
  const argv = ['--require', PRELOAD, BIN, key, '--params', JSON.stringify(params ?? {}), '--html', out];
  const r = spawnSync(NODE_BIN, argv, {
    encoding: 'utf8',
    env: { ...process.env, ILIFE_CONFIG_DIR: calorieConfigDir(runDir), NODE_OPTIONS: freezeClock(SEED_TODAY).NODE_OPTIONS, FAKE_NOW_ISO: FIXED_NOW },
  });
  let env = null;
  try { env = JSON.parse(String(r.stdout || '').trim()); } catch { env = null; }
  return {
    status: r.status,
    stderr: String(r.stderr || '').trim(),
    env,
    output: env?.data?.output ?? null,
    file: existsSync(out) ? readFileSync(out, 'utf8') : null,
    bytes: existsSync(out) ? statSync(out).size : null,
  };
}

test('#589 ① 目标推荐＝完整文档：exit0 ＋ 绝对路径 ＋ 四断言 ＋ >20KB ＋ 冻结推荐数 ＋ 同族六样', () => {
  const tpl = mkTemplate();
  try {
    const r = runCli(tpl, 'cut', KEY, { profile: 'cut' });
    assert.equal(r.status, 0, '应 exit 0，实测 ' + r.status + '（stderr：' + r.stderr.slice(0, 200) + '）');
    assert.ok(typeof r.output === 'string' && /^([A-Za-z]:\\|\/)/.test(r.output),
      'data.output 应是绝对路径，实测 ' + JSON.stringify(r.output));
    assert.ok(existsSync(r.output), 'data.output 指向的文件不在盘上：' + r.output);
    assertDocPage(r.file, '目标推荐');
    assert.ok(r.bytes > 20000, '完整文档应远大于片段（实测 ' + r.bytes + ' 字节；改前片段 1968 字节）');
    assert.equal(readFileSync(r.output, 'utf8').length, r.file.length, '回执路径与产物应一致');

    /* 反向锁：取数口径一字不动（metrics 原样透传；推荐数＝票面那串数）。 */
    assert.deepEqual(r.env?.data?.metrics, FROZEN_METRICS, 'data.metrics 与冻结值逐字段不一致');

    /* 同族装配六样（页头那一行 ＋ 徽章 ＋ 结论句 ＋ 导航 ＋ 口径行 ＋ 复制日志命令原文）。 */
    assert.ok(r.file.includes('看目标推荐 · 目标管理'), '页头没有「看目标推荐 · 目标管理」那一行');
    for (const m of FAMILY_MARKERS) assert.ok(r.file.includes(m), '缺同族装配标记：' + m);
    /* 复制日志里的命令原文要能照抄重跑（与路由 cli 逐字同）：它住复制按钮的 `data-t` 载荷
       （可见文本里只有按钮，技术原文按裁定 7 只许落载荷），故先解实体再比对。 */
    assert.ok(unentity(r.file).includes(CMD_CLI), '复制日志里没有本次命令原文：' + CMD_CLI);
    assert.match(r.file, /ilife-block-page-shell-title">🎯 目标推荐/, 'H1 不是「🎯 目标推荐」');

    /* 推荐数上屏（票面那串数在上屏文本里逐条在场；TDEE 走人话「日常消耗」）。 */
    for (const t of ['2064', '141', '246', '57', '2471', '2564']) {
      assert.ok(r.file.includes(t), '页上缺推荐数：' + t);
    }
    assert.ok(r.file.includes('结论：'), '缺结论句');
    assert.ok(r.file.includes('日常消耗'), '依据没有走人话（英文缩写该归一）');
    assert.ok(!r.file.includes('TDEE'), '可见文本里仍印着 TDEE（英文缩写该归一）');

    /* 可见文本无机器话（剥掉复制载荷后判定；与 #254／#290 同一条探针）。 */
    const dirty = machineWords(r.file)
      .filter((w) => w.hit !== null && !ALLOWED_UPPER.has(w.hit))
      .map((w) => w.kind + '＝' + w.hit);
    assert.deepEqual(dirty, [], '可见文本里有内部词');
  } finally {
    rmSync(tpl, { recursive: true, force: true });
  }
});

test('#589 ② 路由面一字不动：声明件与生成物同一条记录，且与产物复制日志逐字相同', () => {
  const decl = GOAL_ROUTES.find((r) => r.wakeWord === WAKE_WORD);
  assert.ok(decl, '目标域声明件里找不到「' + WAKE_WORD + '」（词被删即回归）');
  assert.equal(decl.key, KEY, '「' + WAKE_WORD + '」落到了别的键上');
  assert.equal(decl.cli, CMD_CLI, '声明件里的 cli 被改过');
  const rec = ALL_ROUTES.find((r) => r.wakeWord === WAKE_WORD);
  assert.ok(rec, '生成物里找不到「' + WAKE_WORD + '」（记录面漏了）');
  assert.equal(rec.cli, decl.cli, '生成物与声明件走散');

  const tpl = mkTemplate();
  try {
    const r = runCli(tpl, 'cut2', KEY, { profile: 'cut' });
    assert.equal(r.status, 0, '应 exit 0');
    assert.ok(unentity(r.file).includes(decl.cli), '产物复制日志里的命令原文与路由 cli 不一致');
  } finally {
    rmSync(tpl, { recursive: true, force: true });
  }
});

test('#589 ③ 同族同架：本页与 goal-config 共用同一套骨架标记（复用而非另起一套）', () => {
  const tpl = mkTemplate();
  try {
    const rec = runCli(tpl, 'cut3', KEY, { profile: 'cut' });
    const cfg = runCli(tpl, 'cfg', 'calorie.view.goal-config', {});
    assert.equal(rec.status, 0, '目标推荐应 exit 0');
    assert.equal(cfg.status, 0, '目标配置应 exit 0');
    for (const f of [rec.file, cfg.file]) assertDocPage(f, '同族两页');
    for (const m of FAMILY_MARKERS) {
      assert.ok(rec.file.includes(m), '目标推荐缺同族标记：' + m);
      assert.ok(cfg.file.includes(m), '目标配置缺同族标记：' + m);
    }
    assert.equal(
      rec.file.includes('<meta charset="utf-8">'), cfg.file.includes('<meta charset="utf-8">'),
      '两页的文档骨架不一致（一个走同族装配、一个没有）',
    );
  } finally {
    rmSync(tpl, { recursive: true, force: true });
  }
});

test('#589 ④ 红线②：旧片段 renderGoalRecommendHtml 仍在，且仍是片段（只出台账、本票不删）', () => {
  assert.equal(typeof renderGoalRecommendHtml, 'function', '旧片段函数被删了（本票红线：只出台账不删）');
  const g = {
    profile: 'cut',
    recommend: {
      profileLabel: '减脂', tdee: 2564, calorieGoal: 2064, weeklyRateKg: 0.5, proteinGoal: 141,
      carbsGoal: 246, fatGoal: 57, waterGoal: 2471, bmr: 1654, planReasons: ['减脂模板：TDEE 2564 卡'], missing: [],
      selfCheck: { calculatedKcal: 2061, diffKcal: -3 },
    },
    water: { basis: '体重 70.6 kg × 35 ml/kg（夏季偏高）' },
  };
  const html = renderGoalRecommendHtml(g);
  assert.ok(html.startsWith('<section class="ilife-page"'), '旧片段不再是片段形状了（它就该是片段、留在原处）');
  assert.ok(html.includes('ilife:calorie:goal-recommend'), '旧片段的 slot 标识丢了');
});

test('#589 反向锁：片段形状必红、错配必抛、固定钟下两次实跑同哈希', () => {
  const tpl = mkTemplate();
  try {
    /* a) 片段形状必红——四断言对片段必须抛，否则判据恒绿白过。 */
    assert.throws(() => assertDocPage(FRAGMENT_HEAD, '改前片段形状'), /缺 doctype/,
      '片段形状竟然通过了四断言 —— 判据是恒绿的，白过');

    /* b) metrics 反向锁有牙：拿目标配置那份读数核对目标推荐的冻结表，必须抛。 */
    const cfg = runCli(tpl, 'cfg-b', 'calorie.view.goal-config', {});
    assert.equal(cfg.status, 0, '目标配置应 exit 0');
    assert.throws(() => assert.deepEqual(cfg.env?.data?.metrics, FROZEN_METRICS, '错配对照'),
      /错配对照/, '两份不同的 metrics 竟然判等 —— metrics 锁恒真，白过');

    /* c) 固定钟下两次实跑产物同哈希（页内不掺墙钟；饮水推荐按当季取值因此可复跑）。 */
    const a = runCli(tpl, 'again-a', KEY, { profile: 'cut' });
    const b = runCli(tpl, 'again-b', KEY, { profile: 'cut' });
    assert.equal(a.status, 0, '应 exit 0');
    assert.equal(b.status, 0, '应 exit 0');
    assert.equal(sha(a.file), sha(b.file), '同一入参两次实跑产物不同（页内掺了墙钟）');
  } finally {
    rmSync(tpl, { recursive: true, force: true });
  }
});
