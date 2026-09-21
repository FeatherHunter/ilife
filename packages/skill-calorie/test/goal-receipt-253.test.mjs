/** #253 · 目标管理 5 条会改数据库的命令：回执页从裸片段变完整文档。
 *
 * 接入前这五条命令的产物是 275 字节上下的裸片段（一段 `ilife-page`，没有 doctype／charset／样式／
 * 页框），还把内部词 `op=update · id=1` 印在屏幕上（证据：`scene06-验收墙/逐格缺陷清单.md` §二 第 1、2 条）。
 * 本票给它们接上整页装配（`src/goal/receipt.ts`，`cli/write.ts:85` 链上第六口）。
 *
 * 判据（形状沿 `test/goal-wizard-251.test.mjs:29-53` 的临时种子库＋真 CLI，回读沿
 * `test/cmd-write-40-persist.test.mjs:500-536` 的只读句柄）：
 *   ① 五条命令逐条真跑：exit 0、`data.output` 是绝对路径且字节如实、产物是完整文档（退回片段即红）；
 *   ② 可见文本零内部词（`op=`／`id=1`／`singleton`／库表名／库列名／`sqlite:total_changes`）——
 *      **整份文件里 `id=1` 是复制日志载荷里的正常内容**（`shared/copyArea.ts:139,174-182`），
 *      故断言必须限可见文本，否则假红；
 *   ③ 段落在场：三块标题、表头「改前／改后」、复制区按钮、日志第 4 段是命令原文、导航锚点与段落 id 对齐；
 *   ④ 「改前」不许拿新值顶替：写口没回报旧值的那几条写 `—` ＋ 表下口径行；饮水那一条有真值（2000）；
 *   ⑤ 写入语义一字未变（写后只读回读）＋ 退出码照旧（缺参 exit 2 不落盘／空库 exit 4）。
 *
 * 数据面：临时库（`mkdtemp`）＋ `docs/research/t81-seed.mjs` 的 `seedFull()`，`CALORIE_TODAY` 钉
 * `SEED_TODAY`。种子 `daily_goal#1`＝1800／150／200／50、饮水 2000、体重目标 68、截止 2026-12-31。
 *
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`（用例吃 dist），再
 * node --test packages/skill-calorie/test/goal-receipt-253.test.mjs
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { openDbReadOnly } from '../dist/db/readonly.js';
import { assertDocPage } from './doc-page-assert.mjs';
import { seedFull, SEED_TODAY } from '../../../docs/research/t81-seed.mjs';
import { calorieConfigDir, configTestBase, freezeClock } from './helpers/config-test.mjs';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';
/** 片段族的标记位（`shared/writeParts.ts:87`）——产物里还在它就是没切整页。 */
const FRAGMENT_SLOT = 'data-slot="ilife:calorie:receipt"';
/** 三个页内段落锚点（导航项与段落 id 两面同名）。 */
const SECTION_IDS = ['sec-op', 'sec-change', 'sec-goal'];
/** 可见文本里不许出现的内部词（票面点名 ＋ 同族的库表名／库列名／M5 来源串）。 */
const BANNED = ['op=', 'id=1', 'singleton', 'daily_goal', 'goal_paused',
  'sqlite:total_changes', 'calorie.goal.', 'recordId', 'writtenFields'];

/** 五条命令的实跑参数（票面验收命令那一组，逐字）。 */
const CASES = [
  ['calorie.goal.set', { calorie: 1800, protein: 150, carbs: 200, fat: 50 }, '定营养目标'],
  ['calorie.goal.water', { water: 2000 }, '定饮水目标'],
  ['calorie.goal.weight', { kg: 68, deadline: '2026-09-19' }, '定体重目标'],
  ['calorie.goal.pause', {}, '暂停所有目标'],
  ['calorie.goal.resume', {}, '重启所有目标'],
];

/** 一份标准种子库（只写系统 tmp）。 */
function mkSeed() {
  const dir = mkdtempSync(join(tmpdir(), 't253-goal-'));
  const db = openDb(join(dir, DB_FILENAME));
  try {
    seedFull(db);
  } finally {
    db.close();
  }
  return dir;
}

/** 一份空库（只有 schema，没有目标行）。 */
function mkEmpty() {
  const dir = mkdtempSync(join(tmpdir(), 't253-bare-'));
  const db = openDb(join(dir, DB_FILENAME));
  db.close();
  return dir;
}

/** 真 CLI 跑一次并落盘（`--html` 给显式落点，回执路径回走 `data.output`）。 */
function runCli(dir, key, params, outName) {
  const out = join(dir, outName + '.html');
  const args = [BIN, key];
  if (params !== undefined) args.push('--params', JSON.stringify(params));
  args.push('--html', out);
  const r = spawnSync(NODE_BIN, args, {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...homeEnvOf(calorieConfigDir(dir)), ...freezeClock(SEED_TODAY) },
  });
  return {
    status: r.status, out,
    stderr: String(r.stderr || '').trim().slice(-400),
    stdout: String(r.stdout || '').trim(),
    file: existsSync(out) ? readFileSync(out, 'utf8') : null,
  };
}

/** 跑一条写命令并要求 exit 0（不通就带上 stderr 末段判红）。 */
function runOk(dir, key, params, outName) {
  const r = runCli(dir, key, params, outName);
  assert.equal(r.status, 0, key + ' 应 exit 0，实测 ' + r.status + ' ' + r.stderr);
  return r;
}

/** 页面**可见文案**（去 script／style、去全部标签、还原实体）：断言「某个词没上页」时看这一层——
 *  整份文件里还住着共享样式与复制载荷，`id=1`／`calorie.goal.set` 这类串在 `data-t` 里本来就有。 */
function visibleText(html) {
  return html.slice(html.indexOf('<body>'))
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

/** 一段 HTML → 纯文本（去标签、还原实体、合并空白）。 */
function textOf(html) {
  return html.replace(/<[^>]*>/g, ' ')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim();
}

/** 取一个页内段落（`id="sec-…"` 起，到下一个段落锚点为止）。 */
function sectionOf(html, id) {
  const start = html.indexOf('id="' + id + '"');
  assert.ok(start >= 0, '产物里没有段落锚点 ' + id);
  const next = html.indexOf('<section id="sec-', start + 1);
  return html.slice(start, next < 0 ? html.length : next);
}

/** 段落里逐行格子（丢掉表头那一行）：`[[格, …], …]`，格子已还原成文本。 */
function tableRows(sectionHtml) {
  return [...sectionHtml.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].slice(1)
    .map((m) => [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => textOf(c[1])));
}

/** 只读回读目标行（写后对账；写句柄会迁移 schema，故一律只读）。 */
function readGoal(dir, cols) {
  const db = openDbReadOnly(join(dir, DB_FILENAME));
  try {
    return db.prepare('SELECT ' + cols + ' FROM daily_goal WHERE id = 1').get();
  } finally {
    db.close();
  }
}

test('#253 ① 五条命令逐条真跑：exit 0 ＋ 绝对路径 ＋ 字节如实 ＋ 产物是完整文档（不是片段）', () => {
  for (const [key, params, title] of CASES) {
    const dir = mkSeed();
    const r = runOk(dir, key, params, 'receipt');
    const env = JSON.parse(r.stdout);
    assert.equal(env.key, key, title + ' 信封 key 应是本命令');
    assert.ok(typeof env.data.output === 'string' && /^([A-Za-z]:\\|\/)/.test(env.data.output),
      title + ' data.output 应是绝对路径');
    assert.ok(existsSync(env.data.output), title + ' data.output 指向的文件不存在');
    assert.equal(readFileSync(env.data.output, 'utf8'), r.file, title + ' 回执路径与产物不一致');
    assertDocPage(r.file, title);
    assert.equal(r.file.includes(FRAGMENT_SLOT), false, title + ' 仍是片段族产物（没接上整页装配）');
    assert.ok(r.file.length > 20000, title + ' 完整文档应远大于片段（实测 ' + r.file.length + ' 字节）');
    // 页头三件：页签名／眉标／主标题＝那条命令的中文名。
    assert.ok(r.file.includes('<title>卡路里 目标回执</title>'), title + ' 页签名不对');
    assert.ok(r.file.includes('目标管理'), title + ' 眉标不对');
    assert.ok(r.file.includes('>' + title + '<'), title + ' 主标题不是那条命令的中文名');
  }
});

test('#253 ② 可见文本零内部词（复制载荷里的技术原文不算可见文本）', () => {
  for (const [key, params, title] of CASES) {
    const dir = mkSeed();
    const r = runOk(dir, key, params, 'receipt');
    const text = visibleText(r.file);
    for (const bad of BANNED) {
      assert.equal(text.includes(bad), false, title + ' 可见文案里还有内部词：' + bad);
    }
    // 反向锁：技术原文确实还在复制载荷里（否则上面那几条会因「根本没印」而白过）。
    assert.ok(r.file.includes('calorie-cmd-read ' + key), title + ' 复制日志里丢了命令原文（本页的复制载荷消失了？）');
    assert.ok(r.file.includes('data-t="'), title + ' 复制载荷位不在（形制不对）');
  }
});

test('#253 ③ 段落在场：三块标题 ＋ 表头／导航对锚 ＋ 复制区 ＋ 日志第 4 段是命令原文', () => {
  for (const [key, params, title] of CASES) {
    const dir = mkSeed();
    const r = runOk(dir, key, params, 'receipt');
    // 三块标题与导航：导航项的文字与段落里的 `<h2>` 同一串，锚点 href 与段落 id 同名。
    for (const [id, head] of [['sec-op', '✅ 操作回执'], ['sec-change', '📋 字段变更'], ['sec-goal', '📊 库里现在的目标']]) {
      const sec = sectionOf(r.file, id);
      assert.ok(sec.includes('<h2>' + head + '</h2>'), title + ' 段落 ' + id + ' 缺标题 ' + head);
      assert.ok(r.file.includes('href="#' + id + '"'), title + ' 页内导航缺锚点 ' + id);
    }
    assert.ok(/<nav[^>]*aria-label="页内导航"/.test(r.file), title + ' 缺页内导航');
    // 表头「改前／改后」（字段变更那张三列表）。
    const change = sectionOf(r.file, 'sec-change');
    for (const head of ['字段', '改前', '改后']) {
      assert.ok(new RegExp('<th[^>]*>' + head + '</th>').test(change), title + ' 字段变更表缺表头：' + head);
    }
    // 复制区两颗按钮 ＋ 日志第 4 段＝本次命令原文（含 --params，可照抄重跑）。
    assert.ok(r.file.includes('>复制数据<'), title + ' 缺复制数据按钮');
    assert.ok(r.file.includes('>复制日志<'), title + ' 缺复制日志按钮');
    assert.ok(r.file.includes('calorie-cmd-read ' + key), title + ' 日志缺命令原文');
    if (Object.keys(params).length > 0) {
      // 载荷是 HTML 属性值，命令原文里那对单引号在这里是 `&#39;`（冻结转义表），故只钉到 `--params`。
      assert.ok(r.file.includes('calorie-cmd-read ' + key + ' --params '), title + ' 日志缺本次参数原文');
    }
  }
});

test('#253 ④ 改前不许拿新值顶替：写口没回报旧值的那四条写 —，饮水那条有真值', () => {
  // ① 定营养目标：写口只回报变更字段名 ⇒ 四行「改前」全是 `—`，表下有一条口径行说清为什么空。
  const set = runOk(mkSeed(), 'calorie.goal.set', { calorie: 1800, protein: 150, carbs: 200, fat: 50 }, 'set');
  const setRows = tableRows(sectionOf(set.file, 'sec-change'));
  assert.deepEqual(setRows.map((r) => r[0]), ['热量(卡)', '蛋白(g)', '碳水(g)', '脂肪(g)'],
    '定营养目标的字段变更行不是四个宏量：' + JSON.stringify(setRows));
  assert.deepEqual(setRows.map((r) => r[1]), ['—', '—', '—', '—'],
    '写口没回报旧值时「改前」必须写 —，实得：' + JSON.stringify(setRows.map((r) => r[1])));
  assert.ok(sectionOf(set.file, 'sec-change').includes('不拿新值顶替'), '缺表下那条口径行');
  // 「改后」逐格读库：四格是库内现值（不是空、也不是参数原文的回显）。
  assert.deepEqual(setRows.map((r) => r[2]), ['1800 卡', '150 g', '200 g', '50 g'],
    '「改后」不是库内现值：' + JSON.stringify(setRows.map((r) => r[2])));

  // ② 定饮水目标：摘要里带着真值那一对（`2000→2400`）⇒ 改前 2000、改后 2400。
  const water = runOk(mkSeed(), 'calorie.goal.water', { water: 2400 }, 'water');
  const waterRows = tableRows(sectionOf(water.file, 'sec-change'));
  assert.deepEqual(waterRows, [['饮水(ml)', '2000', '2400 ml']],
    '饮水那一行没把摘要里的旧值摆进「改前」：' + JSON.stringify(waterRows));

  // ③ 暂停／重启：写口报的是 `goal_paused`，页面上要写中文名与中文态（不许把库列名印出来）。
  const pause = runOk(mkSeed(), 'calorie.goal.pause', {}, 'pause');
  assert.deepEqual(tableRows(sectionOf(pause.file, 'sec-change')), [['目标状态', '—', '已暂停']],
    '暂停页的字段变更行不对');

  // ④ 「改后」逐格读库（不是回显本次参数）：库里没被本次命令碰过的列也要照实上页。
  const goal = sectionOf(water.file, 'sec-goal');
  assert.ok(goal.includes('体重目标(kg)') && goal.includes('68 kg'), '现值块没读到库里的体重目标');
  assert.ok(goal.includes('截止日期') && goal.includes('2026-12-31'), '现值块没读到库里的截止日');
  assert.ok(goal.includes('1800 卡') && goal.includes('2400 ml'),
    '现值块没读到库里的目标行（本次只写饮水，改后应读回 2400 ml，其余列读回种子值）');
});

test('#253 ⑤ 写入语义未变：写后只读回读逐列 ＋ 缺参 exit 2 不落盘 ＋ 空库 exit 4', () => {
  const dir = mkSeed();
  runOk(dir, 'calorie.goal.set', { calorie: 1750, protein: 140, carbs: 180, fat: 45, water: 2300 }, 'set');
  const afterSet = readGoal(dir, 'calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal');
  for (const [col, want] of [['calorie_goal', 1750], ['protein_goal', 140], ['carbs_goal', 180],
    ['fat_goal', 45], ['water_goal', 2300]]) {
    assert.equal(afterSet[col], want, 'goal.set 的 ' + col + ' 没落库');
  }
  runOk(dir, 'calorie.goal.water', { water: 2400 }, 'water');
  assert.equal(readGoal(dir, 'water_goal').water_goal, 2400, 'goal.water 没落库');
  runOk(dir, 'calorie.goal.weight', { kg: 70, deadline: '2026-12-31', startKg: 72, startDate: '2026-09-01' }, 'weight');
  const afterWeight = readGoal(dir, 'weight_goal, goal_deadline, start_weight, start_date');
  for (const [col, want] of [['weight_goal', 70], ['goal_deadline', '2026-12-31'],
    ['start_weight', 72], ['start_date', '2026-09-01']]) {
    assert.equal(afterWeight[col], want, 'goal.weight 的 ' + col + ' 没落库');
  }
  runOk(dir, 'calorie.goal.pause', {}, 'pause');
  assert.equal(readGoal(dir, 'goal_paused').goal_paused, 1, 'goal.pause 没落库');
  runOk(dir, 'calorie.goal.resume', {}, 'resume');
  assert.equal(readGoal(dir, 'goal_paused').goal_paused, 0, 'goal.resume 没落库');

  // 缺参 exit 2 且不落盘（写命令的退出码语义一字未动）。
  const miss = runCli(mkSeed(), 'calorie.goal.set', { calorie: 1800 }, 'missing');
  assert.equal(miss.status, 2, 'goal.set 缺参应 exit 2，实测 ' + miss.status + ' ' + miss.stderr);
  assert.equal(existsSync(miss.out), false, 'exit 2 不得落盘');

  // 空库：定饮水目标是缺失阻断 exit 4（没有营养目标行就不静默兜底）。
  const bare = runCli(mkEmpty(), 'calorie.goal.water', { water: 2000 }, 'bare');
  assert.equal(bare.status, 4, '空库 goal.water 应 exit 4，实测 ' + bare.status + ' ' + bare.stderr);
  assert.equal(existsSync(bare.out), false, '缺失阻断不得落盘');
});
