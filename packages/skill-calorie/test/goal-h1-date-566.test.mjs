/** #292 · Q4 判据洞：目标类结果页 H1 无日期（宽口径）＋ 三窗。
 *
 * 来源＝#566 复核 §六第 1 条：`test/566-result-title.test.mjs` 的日期判据只认 ISO 一种写法，
 * 且只跑 7d／30d 两个窗口——把日期写回 H1（换写法或换窗口）会从门下走过去。本件补两条：
 * 宽口径日期正则（ISO ＋ 中文全写 ＋ 中文短写）＋ 第三个窗口 90d（显式区间另在证据探针里跑）。
 *
 * 判据（只加断言，不改产品代码）：
 *   ① 3 件产物（`calorie.view.goal` 的 7d／30d／90d 三窗）的 `<h1>` **不含日期**
 *      （三种写法各判一次）且含页面名；`<head>` 里那个 `<title>` 同一条判据一起判；
 *   ② 窗口区间**仍上屏，且住进页头已有的控件**——页头 `meta-bar` 左行必须含这一段区间，
 *      同件产物的可见文本里也仍出现（挪了地方，没丢）；
 *   ③ 产物仍是**完整文档**（doctype／charset／style／ilife-page 四断言）＋ `data.output` 是绝对路径且真在盘上；
 *   ④ 变异自证（字串级，判据不许永真）：把 ISO 日期加回 `<h1>` ⇒ 判据①必红；
 *      把中文全写日期加回 `<h1>` ⇒ 判据①必红；把中文短写日期加回 `<h1>` ⇒ 判据①必红；
 *      把窗口从页头那行抠掉 ⇒ 判据②必红；把窗口从可见文本里全挖掉 ⇒ 判据②的「没丢」那一半必红；
 *      还原 ⇒ 必绿。（真身变异＝真改源码再编译再跑的那两行读数，记在 `docs/skills/skill-calorie/t292-收口-证据.md` §六。）
 *
 * 反面参照（本票没碰的那一件）：`calorie.view.goal-expiring` 本来就没有窗口，`meta-bar` 左行必须逐字保持
 * 「看即将到期的目标 · 目标管理」——证明本票只看窗口那两处，没顺手给别的页加字。
 *
 * 跑法：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`，再
 * `node --test packages/skill-calorie/test/goal-h1-date-566.test.mjs`；两条都经
 * `node tooling/run-locked.mjs --ticket 292 -- <命令>`。
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

/** 日期判据（宽口径）：ISO ＋ 中文全写（2026年9月1日）＋ 中文短写（9月1日）。三条各判一次。 */
const DATE_ISO_RE = /\d{4}-\d{2}-\d{2}/;
const DATE_CN_FULL_RE = /\d{4}年\d{1,2}月\d{1,2}日/;
const DATE_CN_SHORT_RE = /\d{1,2}月\d{1,2}日/;

/** 3 件实跑产物：同一结果页（`calorie.view.goal`）在 7d／30d／90d 三窗各一件。 */
const CASES = [
  {
    name: 'goal-7d', key: 'calorie.view.goal', params: { window: '7d' },
    pageName: '目标分析', window: '2026-09-01 至 2026-09-07',
    cnFull: '2026年9月1日 至 2026年9月7日', cnShort: '9月1日 至 9月7日',
  },
  {
    name: 'goal-30d', key: 'calorie.view.goal', params: { window: '30d' },
    pageName: '目标分析', window: '2026-08-09 至 2026-09-07',
    cnFull: '2026年8月9日 至 2026年9月7日', cnShort: '8月9日 至 9月7日',
  },
  {
    name: 'goal-90d', key: 'calorie.view.goal', params: { window: '90d' },
    pageName: '目标分析', window: '2026-06-10 至 2026-09-07',
    cnFull: '2026年6月10日 至 2026年9月7日', cnShort: '6月10日 至 9月7日',
  },
];

/** 反面参照：没有窗口的那一件（本票一行未动，页头左行必须逐字不变）。 */
const CONTROL = {
  name: 'expiring', key: 'calorie.view.goal-expiring', params: {},
  pageName: '目标到期提醒', metaLeft: '看即将到期的目标 · 目标管理',
};

/* ── 判据件（三个 checker 都单独抽出来：变异自证直接拿它们跑，不另抄一份） ── */

/** ① 标题不含日期（三种写法）且含页面名：`<h1>` 与 `<head>` 里那个 `<title>` 各判一次。 */
function assertTitleFree(html, what, pageName) {
  const h1 = nodeText(html, /<h1 class="ilife-block-page-shell-title">([\s\S]*?)<\/h1>/);
  assert.ok(h1 !== null, what + ' 读不到页题节点（ilife-block-page-shell-title）');
  assert.ok(h1.includes(pageName), what + ' 的 H1 不含页面名「' + pageName + '」：' + JSON.stringify(h1));
  assert.ok(!DATE_ISO_RE.test(h1), what + ' 的 H1 里还有 ISO 窗口日期（日期不该住标题）：' + JSON.stringify(h1));
  assert.ok(!DATE_CN_FULL_RE.test(h1), what + ' 的 H1 里还有中文全写日期：' + JSON.stringify(h1));
  assert.ok(!DATE_CN_SHORT_RE.test(h1), what + ' 的 H1 里还有中文短写日期：' + JSON.stringify(h1));
  const title = nodeText(html, /<title>([\s\S]*?)<\/title>/);
  assert.ok(title !== null, what + ' 读不到 head 的 <title>');
  assert.ok(!DATE_ISO_RE.test(title), what + ' 的 <title> 里还有 ISO 日期：' + JSON.stringify(title));
  assert.ok(!DATE_CN_FULL_RE.test(title), what + ' 的 <title> 里还有中文全写日期：' + JSON.stringify(title));
  assert.ok(!DATE_CN_SHORT_RE.test(title), what + ' 的 <title> 里还有中文短写日期：' + JSON.stringify(title));
}

/** ② 窗口区间挪进了页头控件：`meta-bar` 左行必须含它。 */
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

/** ③ 完整文档四断言（票面口径）。 */
function assertFullDoc(html, what) {
  assert.ok(html !== null, what + ' 未落盘');
  assert.ok(html.startsWith('<!doctype html>'), what + ' 缺 doctype');
  assert.ok(html.includes('<meta charset='), what + ' 缺 charset');
  assert.ok(html.includes('<style'), what + ' 缺 style');
  assert.ok(html.includes('ilife-page'), what + ' 缺 ilife-page');
}

/* ── 真跑：临时种子库 ＋ 真 CLI（一件一个独立库副本，同 t81-seed 的 harness 口径） ── */

function mkTemplate() {
  const dir = mkdtempSync(join(tmpdir(), 't292-h1date-'));
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

/* ── ① 标题不含日期（三种写法）、含页面名 ── */

test('#292 ① 三件产物（三窗）的 H1 不含日期（ISO＋中文两种写法）且含页面名（head 的 <title> 同判）', () => {
  assert.equal(RUNS.length, 3, '三件产物都要真跑（判据不许空跑）：实测 ' + RUNS.length);
  assert.deepEqual(RUNS.map((r) => r.c.name), ['goal-7d', 'goal-30d', 'goal-90d'], '三窗都要跑到 7d／30d／90d');
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

test('#292 ② 窗口区间仍看得见：页头 meta-bar 左行带它 ＋ 可见文本里没丢', () => {
  for (const r of RUNS) {
    assertWindowOnScreen(r.file, '「' + r.c.name + '」', r.c.window);
  }
  /* 反面参照：对照件没有窗口，页头左行逐字不变（本票没顺手加字）。 */
  const head = nodeText(CONTROL_RUN.file, /<div class="meta-bar"><div class="left">([\s\S]*?)<\/div>/);
  assert.equal(head, CONTROL.metaLeft, '对照件页头左行被改动了：' + JSON.stringify(head));
});

/* ── ③ 产物仍是完整文档 ── */

test('#292 ③ 三件产物＝完整文档：绝对路径 ＋ 落盘 ＋ 四断言', () => {
  for (const r of RUNS) {
    const what = '「' + r.c.name + '」';
    assert.ok(typeof r.output === 'string' && /^([A-Za-z]:\\|\/)/.test(r.output),
      what + ' data.output 应是绝对路径，实测 ' + JSON.stringify(r.output));
    assert.ok(existsSync(r.output), what + ' data.output 指向的文件不在盘上：' + r.output);
    assertFullDoc(r.file, what);
    assert.equal(readFileSync(r.output, 'utf8').length, r.file.length, what + ' 回执路径与产物字符数应一致');
  }
});

/* ── ④ 变异自证（字串级）：判据咬得住改坏的那一行 ── */

test('#292 ④ 变异自证：ISO／中文全写／中文短写日期加回 H1 判据①必红、窗口从页头抠掉判据②必红，还原必绿', () => {
  const reds = [];
  for (const r of RUNS) {
    const what = '「' + r.c.name + '」';
    const m = /<h1 class="ilife-block-page-shell-title">([\s\S]*?)<\/h1>/.exec(r.file);
    assert.ok(m !== null, what + ' 产物里读不到 H1 原文（改不了变异）');
    const h1 = m[1];
    /* 变异①a：把 ISO 窗口日期加回 H1（改前就是这个形状）⇒ 判据①必须红。 */
    const reIso = r.file.replace('<h1 class="ilife-block-page-shell-title">' + h1 + '</h1>',
      '<h1 class="ilife-block-page-shell-title">' + h1 + ' ' + r.c.window + '</h1>');
    assert.notEqual(reIso, r.file, what + ' 变异①a 没落上（产物里找不到 H1 原文）');
    assert.throws(() => assertTitleFree(reIso, what + '（变异①a）', r.c.pageName), /ISO 窗口日期/,
      what + ' 把 ISO 日期加回 H1 后判据①没红');
    /* 变异①b：把中文全写日期加回 H1 ⇒ 判据①必须红（宽口径的牙）。 */
    const reCnFull = r.file.replace('<h1 class="ilife-block-page-shell-title">' + h1 + '</h1>',
      '<h1 class="ilife-block-page-shell-title">' + h1 + ' ' + r.c.cnFull + '</h1>');
    assert.notEqual(reCnFull, r.file, what + ' 变异①b 没落上');
    assert.throws(() => assertTitleFree(reCnFull, what + '（变异①b）', r.c.pageName), /中文全写日期/,
      what + ' 把中文全写日期加回 H1 后判据①没红');
    /* 变异①c：把中文短写日期加回 H1 ⇒ 判据①必须红（短写无年份也咬得住）。 */
    const reCnShort = r.file.replace('<h1 class="ilife-block-page-shell-title">' + h1 + '</h1>',
      '<h1 class="ilife-block-page-shell-title">' + h1 + ' ' + r.c.cnShort + '</h1>');
    assert.notEqual(reCnShort, r.file, what + ' 变异①c 没落上');
    assert.throws(() => assertTitleFree(reCnShort, what + '（变异①c）', r.c.pageName), /中文短写日期/,
      what + ' 把中文短写日期加回 H1 后判据①没红');
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
  assert.deepEqual(reds, ['①goal-7d', '②goal-7d', '①goal-30d', '②goal-30d', '①goal-90d', '②goal-90d'],
    '变异覆盖面不对（三件产物的 ①② 两条都要各红一次）');
  console.log('T292-MUT 字串级：ISO加回H1红=3、中文全写红=3、中文短写红=3、窗口抠出页头红=3、窗口全挖掉红=3；还原绿=3');
});
