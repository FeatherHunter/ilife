/** #566 · 目标类结果页把窗口日期写进大标题 —— 票面验收用例。
 *
 * 来源＝负责人 2026-09-15 肉眼验收（验收墙 `docs/skills/skill-calorie/scene06-验收墙/`）：
 * 「日期不写在标题，写在其他 UI 控件内」。改前实测（`.scratch/t153-视觉缺陷/probe.mjs`：33 件产物里
 * 只有这 3 件的 `<h1>` 带窗口日期）：
 *   - `看目标完成度`     → `<h1>🎯 目标分析 2026-09-01 至 2026-09-07</h1>`
 *   - `看目标历史完成`   → `<h1>🎯 目标分析 2026-08-09 至 2026-09-07</h1>`（同键的 30 天窗）
 *   - `看目标对比实际`   → `<h1>🎯 目标对比实际 2026-08-09 至 2026-09-07</h1>`
 *
 * 判据（逐条对应票面验收，每条都要能真红）：
 *   ① 3 件产物（`calorie.view.goal` 双窗口 ＋ `calorie.view.goal-vs-actual`）的 `<h1>` **不含日期**
 *      且含页面名；`<head>` 里那个 `<title>` 同一条判据一起判（同一类缺陷，`probe.mjs` 两处都数）；
 *   ② 窗口区间**仍上屏，且住进页头已有的控件**——页头 `meta-bar` 左行必须含这一段区间
 *      （`shared/docPage.ts:33` 定死这一行的用途＝「参数一行小字（窗口／区间等）」），
 *      同件产物的可见文本里也仍出现（挪了地方，没丢）；
 *   ③ `data.metrics` 与**当刻口径**逐字段相同（取数口径一个字不许变）——#566 当时那张表是改代码之前
 *      真 CLI 跑出来的读数（`.scratch/t566/before.json`），#609 重冻第二批已按当刻口径重冻（出处见下）；
 *      这条是**反向锁**：正文换版式换出花来也不许动一个数，动了就红；
 *   ④ 产物仍是**完整文档**（doctype／charset／style／ilife-page 四断言）＋ `data.output` 是绝对路径且真在盘上；
 *   ⑤ 变异自证（字串级，判据不许永真）：把日期加回 `<h1>` ⇒ 判据①必红；把窗口从页头那行抠掉 ⇒ 判据②必红；
 *      把窗口从可见文本里全抠掉 ⇒ 判据②的「没丢」那一半必红；还原 ⇒ 必绿。
 *      （真身变异＝真改源码再编译再跑的那两行读数，记在 `docs/skills/skill-calorie/566-证据.md` §七。）
 *
 * **#609 重冻第二批（本件冻结值按当刻口径重冻，值处逐条写出处）**：判据③冻的那张表原样保留（形态一字不改），
 * 只把**随成因提交漂掉的值**按当刻口径改，并在 `CASES` 上方逐条写出处；`CONTROL.metrics` 里那个
 * **只跟机器钟走的 `daysLeft`** 不再当冻结值放着（无参时一天掉 1，冻不住），改由 ③ 条末尾的**形态断言**
 * 咬住：`daysLeft ＝ 截止日 − 机器今天`（与 #254 票面点名的「无参随机器钟」同一条口径）。
 *
 * 反面参照（本票没碰的那一件）：`calorie.view.goal-expiring` 本来就没有窗口，`meta-bar` 左行必须逐字保持
 * 「看即将到期的目标 · 目标管理」——证明本票只搬窗口那一处，没顺手给别的页加字。
 *
 * 跑法：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`，再
 * `node --test packages/skill-calorie/test/566-result-title.test.mjs`；两条都经
 * `node tooling/run-locked.mjs --ticket 566 -- <命令>`。
 * 实跑配方＝临时库 `mkdtemp` ＋ `docs/research/t81-seed.mjs` 的 `seedFull()` ＋ `SKILLS_DB_PATH` 指临时目录
 * ＋ `CALORIE_TODAY=SEED_TODAY`（种子数据日 `2026-09-07`）。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

import { stripCopyPayload, visibleText } from './visible-text-probe.mjs';
import { calorieConfigDir, configTestBase, freezeClock } from './helpers/config-test.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const PKG = join(ROOT, 'packages', 'skill-calorie');
const CLI = join(PKG, 'dist', 'cli', 'cmd_read.js');
const DB_FILENAME = 'calorie_data.db';

const { openDb } = await import(pathToFileURL(join(PKG, 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

/** 日期判据：这一票要的就是「标题里不出现窗口日期」。 `probe.mjs` 同款。 */
const DATE_RE = /\d{4}-\d{2}-\d{2}/;

/** 种子库的体重目标截止日（`docs/research/t81-seed.mjs:52` 的 `daily_goal.goal_deadline`，逐字
 *  `'2026-12-31'`）：对照件 `daysLeft` 的**形态断言**要拿它减机器今天（见 ③ 条末）。 */
const SEED_DEADLINE = '2026-12-31';

/** 3 件实跑产物；`metrics` 是**当刻口径**下用真 CLI 跑出来的读数（临时库 ＋ `seedFull` ＋
 *  `CALORIE_TODAY=SEED_TODAY`），逐字段冻结。**#609 重冻第二批的逐条出处**：
 *  `goal-7d`／`goal-30d` 的 `weeklyDeficit`／`avgDeficit`／`predictedLossKg` 三条（五处值）——
 *  出处＝**成因提交 `7831393`**（#518 W2，逐字：「#463 档案 TDEE：`series.ts::loadProfileTdee` 改读最近
 *  一次称重，无记录回退 70.0（逐字不变）」）。该件改前恒用 `70.0` 常量，本仓种子库的最近一次称重是
 *  `2026-09-08 70.6kg`（`docs/research/t81-seed.mjs`）⇒ 消耗类数值随真实体重上抬：
 *  10841→10886、1549→1555、20276→20357、676→679、2.63→2.64。**回退口径没变**：临时库里清空
 *  `weight_log` 后读数逐字回到原表（10841／1549／20276／676／2.63），读数见
 *  `docs/skills/skill-calorie/t589-重冻-证据.md` §二与 `t591-重冻二批-证据.md` §二。 */
const CASES = [
  {
    name: 'goal-7d', key: 'calorie.view.goal', params: { window: '7d' },
    pageName: '目标分析', window: '2026-09-01 至 2026-09-07',
    metrics: {
      calorie_goal: 1800, protein_goal: 150, carbs_goal: 200, fat_goal: 50, water_goal: 2000,
      completionPct: 0, weeklyDeficit: 10886, predictedLossKg: 1.41, avgDeficit: 1555,
      avgIntake: 477, trendAvg: 477, completedCount: 0, incompleteCount: 9,
    },
  },
  {
    name: 'goal-30d', key: 'calorie.view.goal', params: { window: '30d' },
    pageName: '目标分析', window: '2026-08-09 至 2026-09-07',
    metrics: {
      calorie_goal: 1800, protein_goal: 150, carbs_goal: 200, fat_goal: 50, water_goal: 2000,
      completionPct: 0, weeklyDeficit: 20357, predictedLossKg: 2.64, avgDeficit: 679,
      avgIntake: 158, trendAvg: 158, completedCount: 0, incompleteCount: 9,
    },
  },
  {
    name: 'vs-30d', key: 'calorie.view.goal-vs-actual', params: { window: '30d' },
    pageName: '目标对比实际', window: '2026-08-09 至 2026-09-07',
    metrics: { completedCount: 0, incompleteCount: 9, completionPct: 0, trendAvg: 158, calorieGoal: 1800 },
  },
];

/** 反面参照：没有窗口的那一件（本票一行未动，页头左行必须逐字不变）。
 *  `metrics` 只冻**不跟时钟走**的四项：`daysLeft`（＝截止日 − **机器今天**，无参时一天掉 1）不进这张表，
 *  由 ③ 条末尾的形态断言现算现比——「#254 当时冻的 107」就是写用例那天的机器钟读数（#609 重冻第二批）。 */
const CONTROL = {
  name: 'expiring', key: 'calorie.view.goal-expiring', params: {},
  pageName: '目标到期提醒', metaLeft: '看即将到期的目标 · 目标管理',
  metrics: { withinDays: 14, expiring: 0, weightGoal: 68, calorieGoal: 1800 },
};

/** 改前那版的片段形状（`t254-复核.md` §2.2 的产物头）：四断言的反面参照。 */
const FRAGMENT_HEAD = '<section class="ilife-page" data-skill="calorie" data-slot="ilife:calorie:goal" '
  + 'style="background:#16181d;color:#e6edf3"><div class="ilife-block-kpiCard-grid">热量目标 1800 卡</div></section>';

/* ── 判据件（三个 checker 都单独抽出来：变异自证直接拿它们跑，不另抄一份） ── */

/** ① 标题不含日期且含页面名：`<h1>` 与 `<head>` 里那个 `<title>` 各判一次。 */
function assertTitleFree(html, what, pageName) {
  const h1 = nodeText(html, /<h1 class="ilife-block-page-shell-title">([\s\S]*?)<\/h1>/);
  assert.ok(h1 !== null, what + ' 读不到页题节点（ilife-block-page-shell-title）');
  assert.ok(h1.includes(pageName), what + ' 的 H1 不含页面名「' + pageName + '」：' + JSON.stringify(h1));
  assert.ok(!DATE_RE.test(h1), what + ' 的 H1 里还有窗口日期（日期不该住标题）：' + JSON.stringify(h1));
  const title = nodeText(html, /<title>([\s\S]*?)<\/title>/);
  assert.ok(title !== null, what + ' 读不到 head 的 <title>');
  assert.ok(!DATE_RE.test(title), what + ' 的 <title> 里还有窗口日期：' + JSON.stringify(title));
}

/** ② 窗口区间挪进了页头控件：`meta-bar` 左行必须含它（两个半边分开成件，变异各自咬得住）。 */
function assertWindowInHeader(html, what, windowText) {
  const head = nodeText(html, /<div class="meta-bar"><div class="left">([\s\S]*?)<\/div>/);
  assert.ok(head !== null, what + ' 页头没有 meta-bar 左行（页头控件丢了）');
  assert.ok(head.includes(windowText),
    '页头 meta-bar 左行里没有窗口区间「' + windowText + '」——区间被挪走却没落进页头控件：' + JSON.stringify(head));
}

/** ② 窗口区间没丢：同件产物的可见文本里仍出现（只搬了地方）。 */
function assertWindowInVisibleText(html, what, windowText) {
  assert.ok(visibleText(stripCopyPayload(html)).includes(windowText),
    what + ' 的可见文本里找不到窗口区间「' + windowText + '」——窗口信息被删了');
}

/** ② 合判：区间住页头控件 ＋ 可见文本里还在。 */
function assertWindowOnScreen(html, what, windowText) {
  assertWindowInHeader(html, what, windowText);
  assertWindowInVisibleText(html, what, windowText);
}

/** 节点头文本（剥标签、压空白）；读不到即 null。 */
function nodeText(html, re) {
  const m = re.exec(html);
  if (m === null) return null;
  return m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/** ④ 完整文档四断言（票面口径；片段形状必红、整页必绿）。 */
function assertFullDoc(html, what) {
  assert.ok(html !== null, what + ' 未落盘');
  assert.ok(html.startsWith('<!doctype html>'), what + ' 缺 doctype');
  assert.ok(html.includes('<meta charset='), what + ' 缺 charset');
  assert.ok(html.includes('<style'), what + ' 缺 style');
  assert.ok(html.includes('ilife-page'), what + ' 缺 ilife-page');
}

/* ── 真跑：临时种子库 ＋ 真 CLI（一件一个独立库副本，同 t81-seed 的 harness 口径） ── */

function mkTemplate() {
  const dir = mkdtempSync(join(tmpdir(), 't566-title-'));
  const db = openDb(join(dir, DB_FILENAME));
  seedFull(db);
  db.close();
  return dir;
}

function runCli(templateDir, c) {
  const runDir = join(templateDir, c.name);
  mkdirSync(runDir, { recursive: true });
  copyFileSync(join(templateDir, DB_FILENAME), join(runDir, DB_FILENAME));
  const out = join(runDir, c.name + '.html');
  const r = spawnSync(process.execPath, [CLI, c.key, '--params', JSON.stringify(c.params ?? {}), '--html', out], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ILIFE_CONFIG_DIR: calorieConfigDir(runDir), ...freezeClock(SEED_TODAY) },
  });
  let env = null;
  try { env = JSON.parse(String(r.stdout || '').trim()); } catch { env = null; }
  return {
    c, exit: r.status, stderr: String(r.stderr || '').trim().slice(-300), env,
    output: env?.data?.output ?? null,
    file: existsSync(out) ? readFileSync(out, 'utf8') : null,
  };
}

const TPL = mkTemplate();
const RUNS = CASES.map((c) => runCli(TPL, c));
const CONTROL_RUN = runCli(TPL, CONTROL);

/* ── ① 标题不含日期、含页面名 ── */

test('#566 ① 三件产物的 H1 不含日期且含页面名（head 的 <title> 同判）', () => {
  assert.equal(RUNS.length, 3, '三件产物都要真跑（判据不许空跑）：实测 ' + RUNS.length);
  for (const r of RUNS) {
    const what = '「' + r.c.name + '」`' + r.c.key + '`';
    assert.equal(r.exit, 0, what + ' 应 exit 0，实测 ' + r.exit + '（stderr：' + r.stderr + '）');
    assert.ok(r.file !== null, what + ' 未落盘');
    assertTitleFree(r.file, what, r.c.pageName);
  }
  /* 反面参照：没有窗口的那一件 H1 一直是页面名，本票没改它。 */
  assert.equal(CONTROL_RUN.exit, 0, '对照件 `' + CONTROL.key + '` 应 exit 0');
  assertTitleFree(CONTROL_RUN.file, '对照「' + CONTROL.name + '」', CONTROL.pageName);
});

/* ── ② 窗口区间仍上屏，且住页头控件 ── */

test('#566 ② 窗口区间仍看得见：页头 meta-bar 左行带它 ＋ 可见文本里没丢', () => {
  for (const r of RUNS) {
    assertWindowOnScreen(r.file, '「' + r.c.name + '」', r.c.window);
  }
  /* 反面参照：对照件没有窗口，页头左行逐字不变（本票没顺手加字）。 */
  const head = nodeText(CONTROL_RUN.file, /<div class="meta-bar"><div class="left">([\s\S]*?)<\/div>/);
  assert.equal(head, CONTROL.metaLeft, '对照件页头左行被改动了：' + JSON.stringify(head));
});

/* ── ③ 取数口径没被动过（反向锁：与当刻口径读数逐字段相同） ── */

test('#566 ③ data.metrics 与当刻口径逐字段相同，且这条件不是恒真', () => {
  for (const r of RUNS) {
    assert.equal(r.exit, 0, '「' + r.c.name + '」应 exit 0');
    assert.deepEqual(r.env?.data?.metrics, r.c.metrics,
      '「' + r.c.name + '」的 data.metrics 与当刻口径不一致（取数口径被动了）');
  }
  /* 对照件：`daysLeft` 跟机器钟走（无参时一天掉 1），故**不整表判等**——先把它摘出来，
   * 其余四项与冻结表逐字段比，`daysLeft` 交给下面那条形态断言。 */
  const { daysLeft: _machine, ...restControl } = CONTROL_RUN.env?.data?.metrics ?? {};
  assert.deepEqual(restControl, CONTROL.metrics, '对照件 data.metrics（除随机器钟的 daysLeft 外）与当刻口径不一致');
  /* 反向锁有牙：拿 7 天窗那份冻结表去核对 30 天窗的读数，必须抛（证明第 ③ 条不是恒真）。 */
  const wide = RUNS.find((r) => r.c.name === 'goal-30d');
  assert.throws(() => assert.deepEqual(wide.env?.data?.metrics, CASES[0].metrics, '错配对照'),
    /错配对照/, '两份不同的 metrics 竟然判等 —— 第 ③ 条恒真，白过');
  /* 对照件那个 `daysLeft` 是**日期推导**，冻不住（无参时一天掉 1）：不冻值，改判**形态**——
   * 截止日（`SEED_DEADLINE`，出处见它的定义处）减**机器今天**。算式出处＝
   * `src/goal/goalExtraPlate.ts:49`（`Math.round(毫秒差／86400000)`），
   * 「今天」出处＝同件 `:42` 逐字 `today ?? new Date().toISOString().slice(0, 10)`（本命令只认入参 `today`，
   * **不读** `CALORIE_TODAY` ⇒ 无参时取机器钟）。同族先例：`goal-result-290.test.mjs:204`。 */
  const todayISO = new Date().toISOString().slice(0, 10);
  const expectedDaysLeft = Math.round(
    (Date.parse(SEED_DEADLINE + 'T12:00:00Z') - Date.parse(todayISO + 'T12:00:00Z')) / 86400000);
  assert.equal(CONTROL_RUN.env?.data?.metrics?.daysLeft, expectedDaysLeft,
    '对照件 daysLeft 应＝截止日 ' + SEED_DEADLINE + ' − 机器今天 ' + todayISO + '（＝' + expectedDaysLeft + '）');
});

/* ── ④ 产物仍是完整文档 ── */

test('#566 ④ 三件产物＝完整文档：绝对路径 ＋ 落盘 ＋ 四断言', () => {
  for (const r of RUNS) {
    const what = '「' + r.c.name + '」';
    assert.ok(typeof r.output === 'string' && /^([A-Za-z]:\\|\/)/.test(r.output),
      what + ' data.output 应是绝对路径，实测 ' + JSON.stringify(r.output));
    assert.ok(existsSync(r.output), what + ' data.output 指向的文件不在盘上：' + r.output);
    assertFullDoc(r.file, what);
    assert.equal(readFileSync(r.output, 'utf8').length, r.file.length, what + ' 回执路径与产物字符数应一致');
  }
  /* 反面参照：改前那版的片段形状打同一条判据必须抛（判据不恒真）。 */
  assert.throws(() => assertFullDoc(FRAGMENT_HEAD, '改前片段形状'), /缺 doctype/,
    '片段形状竟然通过了四断言 —— 判据是恒绿的，白过');
});

/* ── ⑤ 变异自证（字串级）：判据咬得住改坏的那一行 ── */

test('#566 ⑤ 变异自证：日期加回 H1 判据①必红、窗口从页头抠掉判据②必红，还原必绿', () => {
  const reds = [];
  for (const r of RUNS) {
    const what = '「' + r.c.name + '」';
    const m = /<h1 class="ilife-block-page-shell-title">([\s\S]*?)<\/h1>/.exec(r.file);
    assert.ok(m !== null, what + ' 产物里读不到 H1 原文（改不了变异）');
    const h1 = m[1];
    /* 变异①：把窗口日期加回 H1（改前就是这个形状）⇒ 判据①必须红。 */
    const reH1 = r.file.replace('<h1 class="ilife-block-page-shell-title">' + h1 + '</h1>',
      '<h1 class="ilife-block-page-shell-title">' + h1 + ' ' + r.c.window + '</h1>');
    assert.notEqual(reH1, r.file, what + ' 变异①没落上（产物里找不到 H1 原文）');
    assert.throws(() => assertTitleFree(reH1, what + '（变异①）', r.c.pageName), /还有窗口日期/,
      what + ' 把日期加回 H1 后判据①没红');
    assertTitleFree(r.file, what, r.c.pageName); // 还原（原产物）必绿
    reds.push('①' + r.c.name);
    /* 变异②：把窗口从页头那行抠掉 ⇒ 判据②的「住页头控件」那一半必须红。 */
    const head = nodeText(r.file, /<div class="meta-bar"><div class="left">([\s\S]*?)<\/div>/);
    assert.ok(head !== null && head.includes(r.c.window), what + ' 页头那行里本来就找不到窗口（改不了变异②）');
    const reHead = r.file.replace(head, head.replace(' · 窗口 ' + r.c.window, ''));
    assert.notEqual(reHead, r.file, what + ' 变异②没落上（页头那行里找不到窗口）');
    assert.throws(() => assertWindowInHeader(reHead, what + '（变异②）', r.c.window), /没落进页头控件/,
      what + ' 把窗口从页头抠掉后判据②没红');
    reds.push('②' + r.c.name);
    /* 变异③：把窗口从整份产物里全挖掉（页头／卡副说明／表题一起）⇒ 判据②的「没丢」那一半必须红。 */
    const reAll = r.file.split(r.c.window).join('（挖掉）');
    assert.notEqual(reAll, r.file, what + ' 变异③没落上（产物里找不到窗口区间）');
    assert.throws(() => assertWindowInVisibleText(reAll, what + '（变异③）', r.c.window), /窗口信息被删了/,
      what + ' 把窗口全挖掉后判据②没红');
    assertWindowOnScreen(r.file, what, r.c.window); // 还原必绿
  }
  assert.deepEqual(reds, ['①goal-7d', '②goal-7d', '①goal-30d', '②goal-30d', '①vs-30d', '②vs-30d'],
    '变异覆盖面不对（三件产物的 ①② 两条都要各红一次）');
  console.log('T566-MUT 字串级：日期加回 H1 红=3、窗口抠出页头 红=3、窗口全挖掉 红=3；还原绿=3');
});
