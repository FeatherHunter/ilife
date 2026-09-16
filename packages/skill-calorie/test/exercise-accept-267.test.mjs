/** #267 · 场景 04 运动：39 条词的**真出口锁**（以唤醒词为起点，六组断言）——票面「只加断言，不改被测实现」。
 *
 * 起点纪律（票面第一组，最关键）：逐条从**用户说的那句话**出发——
 * `lookupWake(buildHelpLookup(TRIGGERS), 词)` 拿这条词自己的命令 → **命令原样跑**（不补 `--html`）
 * → 断言 `exit 0`、`data.output` 是绝对路径、落盘字节如实、产物是**完整文档**。
 * 起点**必须是唤醒词**：被执行的命令文本取自查找命中（并与冻结表逐字对账），不是从命令表里挑一条。
 *
 * 完整文档断言**只读复用** `test/doc-page-assert.mjs::assertDocPage`（#264 建，唯一定义地）；
 * 本票不写第二份五连，既有三份（`profile-receipt-175`／`wizard-86`／`profile-doc-179`）一行不动。
 *
 * 六组：
 *   ① 以唤醒词为起点（exit 0 ＋ 绝对路径 ＋ 落盘字节如实 ＋ 完整文档）
 *   ② 两处定义地对账（冻结表 `main_prompt.cli` ↔ 路由声明 `cli` 逐条逐字相同）
 *   ③ 页面归属（分布／趋势／复盘这 7 条读类词各拿**自己那一页**，不是「运动总览」）
 *   ④ 阻断（空库／无记录：报错、不落盘、不编默认值）
 *   ⑤ 回归灵敏度（换掉一处模板件名／页件 ⇒ 用例变红）
 *   ⑥ 产物形态不得回退（写类产物是完整文档，与 #264 判据同源）
 *
 * 条数一律**派生**（冻结表条数／声明记录数／命令键分组），不写手写计数。
 * 判定三档只守前两档（文件存在 ＋ 内容字段正确），视觉归票 6（用户肉眼）。
 *
 * 运行：`pnpm build && node packages/skill-calorie/test/exercise-accept-267.test.mjs`
 * 断言级自证：`T267_MUT_PAGE=1 node packages/skill-calorie/test/exercise-accept-267.test.mjs`（必红）。
 * 源码级自证两行（任一条词的命令改回总览页 ⇒ 红；改回 ⇒ 全绿）见
 * `docs/skills/skill-calorie/t267-锁-真出口.md`。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

const TODAY = '2026-09-07';
process.env.CALORIE_TODAY = TODAY;

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const ROOT = join(PKG, '..', '..');
const DIST = join(PKG, 'dist');
const BIN = join(DIST, 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DAY = 86400000;
/** 断言级变异开关：把首条读类词的**期望**页身份换成另一页 ⇒ 页归属断言必红（核对它真在判）。 */
const MUT_PAGE = process.env.T267_MUT_PAGE === '1';

const { openDb, DB_FILENAME } = await import(pathToFileURL(join(DIST, 'index.js')).href);
const { buildHelpLookup, lookupWake, HELP_LOOKUP } = await import(pathToFileURL(join(DIST, 'triggers', 'index.js')).href);
const { TRIGGERS } = await import(pathToFileURL(join(DIST, 'triggers', 'index.js')).href);
const { SCENE_04_EXERCISE } = await import(pathToFileURL(join(DIST, 'triggers', 'scene-04-exercise.js')).href);
const { routesFor } = await import(pathToFileURL(join(DIST, 'triggers', 'routing.js')).href);
const { WAKE_ROUTES } = await import(pathToFileURL(join(DIST, 'triggers', 'routes.generated.js')).href);
const { EXERCISE_ROUTES } = await import(pathToFileURL(join(DIST, 'exercise', 'routes.js')).href);
const { HOME_ROUTES } = await import(pathToFileURL(join(DIST, 'home', 'routes.js')).href);
const { EXERCISE_COMMANDS } = await import(pathToFileURL(join(DIST, 'exercise', 'index.js')).href);
const { assertDocPage } = await import(pathToFileURL(join(HERE, 'doc-page-assert.mjs')).href);

/* ── 范围与派生量（无手写计数） ───────────────────────────────────────────── */

/** 命令文本里抠命令键（唯一出口形态 `calorie-cmd-read <命令> …`）；不是这个形态即 null。 */
function commandKeyOf(cli) {
  const m = /^calorie-cmd-read\s+(\S+)/.exec(String(cli ?? ''));
  return m === null ? null : m[1];
}

/** 冻结表那 39 条词（本图范围＝整张场景 04 冻结表）。 */
const WORDS = SCENE_04_EXERCISE.map((t) => t.wake_word);
/** 词 → 冻结表自己的命令原文（第二、一组两个面的共同锚）。 */
const FROZEN_CLI = new Map(SCENE_04_EXERCISE.map((t) => [t.wake_word, t.main_prompt.cli]));
const FROZEN_DATA_SOURCE = new Map(SCENE_04_EXERCISE.map((t) => [t.wake_word, t.data_source]));
/** 词 → 它自己那条命令的键（由冻结表 `main_prompt.cli` 派生）。 */
const KEY_OF_WORD = new Map(SCENE_04_EXERCISE.map((t) => [t.wake_word, commandKeyOf(t.main_prompt.cli)]));

/** 两处定义地：能力目录里的路由声明件（记录住键所属能力，场景 04 的词分住两件）。 */
const DECLS = [...EXERCISE_ROUTES, ...HOME_ROUTES];

/** 页族身份（键 → 眉标）：产物层面的页身份针，**换错页件即红**。 */
const EYEBROW_OF_KEY = new Map([
  // #543（写后回执 13 页）：眉标去 `·`——同上，类别「运动」与页族名都还在。
  ['calorie.exercise.add', '运动写后回执'],
  ['calorie.exercise.update', '运动写后回执'],
  ['calorie.exercise.remove', '运动写后回执'],
  // #523（汇总／记录级明细／对照目标三族）：眉标去 `·`——`·` 是分隔符债，探针节点级必须为 0；
  // 类别「运动」与页族名都还在（`运动` ＋ `汇总`），只是不拿符号串。其余两族的眉标归 #524／#525。
  // #523 返修 R3：汇总族眉标与 H1（`运动汇总`）逐字全同 → 眉标退回类别词「运动」；页族的身份针
  // 落到同族的 H1 断言上（本件 G3 的 `rec.h1` 那两条，`运动汇总` 仍是汇总页的钉子，覆盖面未减）。
  ['calorie.view.exercise', '运动'],
  ['calorie.view.exercise-goal', '运动对照目标'],
  // #523 返修：记录级明细眉标原来与 H1 逐字同名，现退回族名「运动记录」（H1 留页名）。
  ['calorie.view.exercise-records', '运动记录'],
  // #544（类型分布／力量／有氧／趋势／复盘五族）：眉标去 `·`——`·` 是分隔符债，探针节点级必须为 0；
  // 类别「运动」与页族名都还在，只是不拿符号串。
  ['calorie.view.exercise-distribution', '运动类型分布'],
  ['calorie.view.exercise-strength', '力量训练总览'],
  ['calorie.view.exercise-cardio', '有氧训练总览'],
  ['calorie.view.exercise-trend', '运动趋势'],
  ['calorie.view.exercise-recap', '运动复盘'],
]);
/** 载荷面页名（键 → 复制头「技能 · 页名」里的页名）；只有这几页当刻是**人话**页名。 */
const COPY_PAGE_OF_KEY = new Map([
  ['calorie.view.exercise-records', '运动记录'],
  ['calorie.view.exercise-distribution', '运动类型分布'],
  ['calorie.view.exercise-strength', '力量训练总览'],
  ['calorie.view.exercise-cardio', '有氧训练总览'],
  ['calorie.view.exercise-trend', '运动趋势'],
  ['calorie.view.exercise-recap', '运动复盘'],
]);
/** 当刻载荷头仍印命令键的两页（#452 地盘；本票只记账不当判据——见证据件「遗留出口」）。 */
const COPY_KEY_LEAK = new Set(['calorie.view.exercise', 'calorie.view.exercise-goal']);

/** **模板件名**（冻结表 `html_template`）→ 页族身份针：声明面的页身份。
 *  只登记「一条词一个页」的那几件——`templates/exercise_summary.html` 一族**两页**
 *  （汇总与记录级明细共件），它的页身份由命令键面钉住，不进本表。 */
const PAGE_OF_TEMPLATE = new Map([
  ['templates/exercise_distribution.html', { eyebrow: '运动类型分布', copyPage: '运动类型分布' }],
  ['templates/exercise_trend.html', { eyebrow: '运动趋势', copyPage: '运动趋势' }],
  ['templates/exercise_recap.html', { eyebrow: '运动复盘', copyPage: '运动复盘' }],
  ['templates/exercise_strength.html', { eyebrow: '力量训练总览', copyPage: '力量训练总览' }],
  ['templates/exercise_cardio.html', { eyebrow: '有氧训练总览', copyPage: '有氧训练总览' }],
]);

/** 票面第三组：曾经指错页的**读类词**——按**模板件名**派生（分布／趋势／复盘三件下的全部词）。
 *  **不从命令键派生**：命令键正是要判的那条轴——命令被改指总览页时，词自己的身份（模板件名）不许跟着漂。 */
const READ_TEMPLATES = new Set(['templates/exercise_distribution.html', 'templates/exercise_trend.html', 'templates/exercise_recap.html']);
const READ_WORDS = SCENE_04_EXERCISE.filter((t) => READ_TEMPLATES.has(t.html_template)).map((t) => t.wake_word);
const TPL_OF_WORD = new Map(SCENE_04_EXERCISE.map((t) => [t.wake_word, t.html_template]));
/** 写类键（由命令声明派生；键下的词＝写类词）。 */
const WRITE_KEYS = new Set(EXERCISE_COMMANDS.filter((c) => c.kind === 'write').map((c) => c.key));
const WRITE_WORDS = SCENE_04_EXERCISE.filter((t) => WRITE_KEYS.has(KEY_OF_WORD.get(t.wake_word))).map((t) => t.wake_word);

/* ── 真跑夹具（真库零接触：库路径一律指向系统临时根） ─────────────────────── */

const isoAt = (i) => new Date(Date.parse(TODAY + 'T12:00:00Z') - i * DAY).toISOString().slice(0, 10);
/** 本库里真实可达的记录号（占位符 `"<记录号>"` 的填法）：取 live 行里最大的 id。#478 */
function recordIdOf(seedDir) {
  const db = openDb(join(seedDir, DB_FILENAME));
  try {
    const r = db.prepare('SELECT MAX(id) AS id FROM exercise_log WHERE COALESCE(is_deleted, 0) = 0').get();
    return r === undefined || r.id === null ? null : String(r.id);
  } finally {
    db.close();
  }
}

/** 空种子库上没有可填的真记录号（#478 起 `"<记录号>"` 是占位符：填不出真值就原样递给入口，
 *  入口先报 `ERR 2: id 须为正整数`，走不到取数层——G4 那条判据判的是**取数层的阻断**
 *  （`取数失败` ＋ 点名缺什么 ＋ 不落盘），故空库上用一枚语法合法、库里必然不存在的记录号把占位符填上。
 *  **判据一行未放宽、覆盖面一行未减**：`999999` 在任何库里都不可达（空库更是零行），
 *  实测 `exit 4 ＋ ERR 4: 取数失败：记录 ID 999999 不存在`。出处：#523 R3 的范围外发现（见证据件遗留节）。 */
const UNREACHABLE_ID = '999999';

/** 占位符补真实日期（`<日期>`／`<开始日期>`／`<结束日期>`；命令**形状**一字不改）。
 *  `"<记录号>"` 一样补真值（#478：冻结表的改／删两条词改成占位符，替掉不可达的常量 `"id":1`）。 */
function fillPlaceholders(cli, recordId) {
  const s = String(cli)
    .replaceAll('<开始日期>', isoAt(200)).replaceAll('<结束日期>', TODAY).replaceAll('<日期>', isoAt(3));
  return recordId === undefined || recordId === null ? s : s.replaceAll('"<记录号>"', '"' + recordId + '"');
}

/** 命令原文 → argv（首个 token 是 `calorie-cmd-read` 本身，运行时由 `dist/cli/cmd_read.js` 顶替）。 */
function tokenize(cli) {
  const out = []; let cur = ''; let q = null;
  for (const ch of String(cli)) {
    if (q) { if (ch === q) q = null; else cur += ch; }
    else if (ch === "'" || ch === '"') q = ch;
    else if (ch === ' ') { if (cur) { out.push(cur); cur = ''; } } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

/** 命令原文 → 参数对象（`recordId` 给了就把 `"<记录号>"` 补成真值）。 */
function paramsOf(cli, recordId) {
  const toks = tokenize(fillPlaceholders(cli, recordId));
  const at = toks.indexOf('--params');
  if (at < 0 || toks[at + 1] === undefined) return {};
  return JSON.parse(toks[at + 1]);
}

/** 满种子库：每天 3 条（有氧／力量／日常，含备注与距离心率），跨 400 天覆盖 365d 窗口。 */
function seedFull(db, days) {
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, 'male', 175, 'moderate')").run();
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, exercise_goal) VALUES (1, 1800, 150, 200, 50, 2000, 300)').run();
  const ins = db.prepare('INSERT INTO exercise_log (id, date, exercise_type, duration_minutes, calories_burned, category, load_kg, reps, distance_km, avg_heart_rate, note) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
  let id = 0;
  for (let i = 0; i < days; i += 1) {
    const d = isoAt(i);
    for (const row of [
      ['慢跑', 30, 320, '有氧', null, null, 5, null, i % 3 === 0 ? '夜跑' : null],
      ['卧推', 25, 150, '力量', 60, 10, null, null, null],
      ['步行', 20, 80, '日常', null, null, 3000, null, null],
    ]) {
      id += 1;
      ins.run(id, d, ...row);
    }
  }
  return id;
}

/** 建夹具库目录：`days>0` 出满种子库，`days=0` 出空库（只有 schema，无记录、无目标）。 */
function mkDir(tag, days) {
  const dir = mkdtempSync(join(tmpdir(), tag + '-'));
  const db = openDb(join(dir, DB_FILENAME));
  if (days > 0) seedFull(db, days);
  db.close();
  return dir;
}

/** 命令**原样**跑：库路径经 `SKILLS_DB_PATH` 指向本词的独立副本，写类词互不串扰。
 *  `recordId`＝本次种子库里真实可达的记录号（`"<记录号>"` 的填法），不给即按不可达正例跑。 */
function runWord(seedDir, cli, tag, recordId) {
  const dir = mkdtempSync(join(tmpdir(), tag + '-'));
  copyFileSync(join(seedDir, DB_FILENAME), join(dir, DB_FILENAME));
  const toks = tokenize(fillPlaceholders(cli, recordId));
  const r = spawnSync(NODE_BIN, [BIN, ...toks.slice(1)], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: TODAY },
  });
  const outDir = join(dir, 'calorie_html');
  return {
    dir,
    status: r.status,
    stderrTail: String(r.stderr || '').trim().split(/\r?\n/).filter(Boolean).slice(-1)[0] ?? '',
    stdout: String(r.stdout || ''),
    landed: existsSync(outDir) ? readdirSync(outDir).filter((f) => f.endsWith('.html')) : [],
  };
}

/** 一轮真跑：逐条从**唤醒词**出发（查找命中 → 那条命令 → 真跑），跑一次、各组复用。
 *  种子库里真实可达的记录号先量一次（#478：改／删两条词的 `"<记录号>"` 拿它填）。 */
function round(tag, seedDays) {
  const seedDir = mkDir(tag + '-seed', seedDays);
  const recordId = recordIdOf(seedDir) ?? UNREACHABLE_ID;
  const recs = [];
  for (const word of WORDS) {
    const hits = lookupWake(buildHelpLookup(TRIGGERS), word);
    const cli = hits.length === 1 ? hits[0].cli : null;
    const rec = { word, cli, hits: hits.length };
    const r = runWord(seedDir, cli ?? FROZEN_CLI.get(word), tag + '-run', recordId);
    Object.assign(rec, r);
    if (rec.status === 0) {
      const lines = String(rec.stdout).trimEnd().split(/\r?\n/);
      rec.env = lines.length === 1 && lines[0].startsWith('{') ? JSON.parse(lines[0]) : null;
      const out = rec.env?.data?.output;
      rec.out = out;
      rec.bytes = typeof out === 'string' && existsSync(out) ? statSync(out).size : null;
      rec.html = typeof out === 'string' && existsSync(out) ? readFileSync(out, 'utf8') : '';
      rec.eyebrow = (rec.html.match(/<p class="ilife-block-page-shell-eyebrow">([^<]*)<\/p>/) ?? [])[1] ?? null;
      rec.h1 = (rec.html.match(/ilife-block-page-shell-title">([^<]*)</) ?? [])[1] ?? null;
      rec.copyHead = copyPayloadOf(rec.html, 'text');
    }
    recs.push(rec);
  }
  return { seedDir, recs, byWord: new Map(recs.map((r) => [r.word, r])) };
}

/** 复制菜单某一格式的载荷（机器面；实体还原后原样返回）。 */
function copyPayloadOf(html, fmt) {
  const m = new RegExp('data-fmt="' + fmt + '"[^>]*?data-t="([^"]*)"').exec(String(html));
  return m === null ? null : m[1]
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

/** 产物**可见文本**（剥样式段／脚本段／标签后压空白）——判「产物印了什么」用这一面，不拿原始 HTML 猜标签。 */
function visibleText(html) {
  return String(html)
    .replace(/<style>[\s\S]*?<\/style>/g, ' ')
    .replace(/<script>[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

let FULL = null;
const full = () => (FULL ??= round('t267-full', 400));
let EMPTY = null;
const empty = () => (EMPTY ??= round('t267-empty', 0));

function ok0(rec) {
  assert.equal(rec.hits, 1, rec.word + ' 查找命中不是恰好 1 条（起点断了）：' + rec.hits);
  assert.equal(rec.status, 0, rec.word + ' 非 exit 0：status=' + rec.status + ' stderr=' + rec.stderrTail);
  return rec;
}

/* ── 机器读数：每组一条 T267-G# 行（回执与证据件直接抄） ─────────────────── */

const RESULT = { total: 0, passed: 0, failed: [] };
function group(id, name, fn) {
  RESULT.total += 1;
  test('#267 G' + id + ' ' + name, () => {
    try { fn(); RESULT.passed += 1; } catch (err) { RESULT.failed.push('G' + id); throw err; }
  });
}
process.on('exit', (code) => {
  const tail = RESULT.failed.length > 0 ? '（红：' + RESULT.failed.join('；') + '）' : '';
  console.log('T267-RESULT: ' + RESULT.passed + '/' + RESULT.total + ' 通过' + tail + ' exit=' + code);
});
const say = (tag, text) => console.log('T267-' + tag + ' ' + text);

/* ── 判据 0 · 范围分母（派生自权威声明，无手写计数） ─────────────────────── */

group(0, '范围由冻结表＋两条声明面派生（词／键／页族闭合）', () => {
  assert.ok(SCENE_04_EXERCISE.length > 0, '冻结表为空');
  assert.equal(new Set(WORDS).size, WORDS.length, '冻结表有重复唤醒词');
  for (const t of SCENE_04_EXERCISE) {
    assert.ok(commandKeyOf(t.main_prompt.cli) !== null, '冻结 cli 不是命令形态：' + t.wake_word);
    assert.ok(EYEBROW_OF_KEY.has(commandKeyOf(t.main_prompt.cli)),
      '冻结词指向了页族针表里没有的键（新键未登记页身份）：' + t.wake_word + ' → ' + t.main_prompt.cli);
  }
  const keys = new Set([...KEY_OF_WORD.values()]);
  say('G0', '词=' + WORDS.length + ' 命令键=' + keys.size + ' 页族针=' + EYEBROW_OF_KEY.size
    + ' 读类词(分布/趋势/复盘)=' + READ_WORDS.length + ' 写类词=' + WRITE_WORDS.length
    + ' 声明面=exercise/routes.ts(' + EXERCISE_ROUTES.length + ')＋home/routes.ts(' + HOME_ROUTES.length + ')');
});

/* ── 第一组 · 以唤醒词为起点（最关键） ───────────────────────────────────── */

group(1, '逐条从唤醒词出发：exit 0＋绝对路径＋落盘字节如实＋完整文档', () => {
  const { recs } = full();
  for (const rec of recs) {
    const { word } = rec;
    assert.equal(rec.hits, 1, word + ' 查找命中不是恰好 1 条：' + rec.hits);
    // 起点就是这句话自己那条命令（与冻结表逐字对账）——不是从命令表里挑一条
    assert.equal(rec.cli, FROZEN_CLI.get(word), word + ' 查找给的命令不是这条词自己的命令');
    assert.equal(commandKeyOf(rec.cli), KEY_OF_WORD.get(word), word + ' 命令键与冻结表不符');
    // 现搭的速查表与模块级预建表同源（防「命令行里跑的那张表」与判据用的那张走散）
    assert.equal(lookupWake(HELP_LOOKUP, word)[0]?.cli, rec.cli, word + ' 预建 HELP_LOOKUP 与现搭速查表不一致');
    ok0(rec);
    // 与运行时的**路由层**同源（同一个词在两处给同一条命令）
    const exec = routesFor(word).filter((r) => r.kind === 'exec');
    assert.equal(exec.length, 1, word + ' 路由层可执行记录不是恰好 1 条');
    assert.equal(exec[0].cli, rec.cli, word + ' 查找与路由层给的命令不一致');
    // 产物：绝对路径＋真在盘上＋落点固定
    const out = rec.env?.data?.output;
    assert.ok(typeof out === 'string' && out.length > 0, word + ' 缺 data.output');
    assert.ok(isAbsolute(out), word + ' data.output 非绝对路径：' + out);
    assert.ok(existsSync(out), word + ' 产物不在盘上：' + out);
    assert.equal(basename(dirname(out)), 'calorie_html', word + ' 落点不在 calorie_html/：' + out);
    assert.equal(rec.landed.length, 1, word + ' 本词目录落盘文件不是恰好 1 个：' + JSON.stringify(rec.landed));
    // 落盘字节如实
    assert.equal(rec.env?.delivery?.bytes, rec.bytes, word + ' delivery.bytes ≠ 落盘字节');
    assert.equal(rec.env?.delivery?.path, out, word + ' delivery.path 与 output 不同值');
    assert.equal(Buffer.byteLength(rec.html, 'utf8'), rec.bytes, word + ' 读取字节数与落盘不等');
    // 包络形状与命令面自己声明的 kind 一致（写类回执 receipt／读类页面 stat；由声明派生）
    assert.equal(rec.env?.shape, WRITE_KEYS.has(KEY_OF_WORD.get(word)) ? 'receipt' : 'stat',
      word + ' 包络形状与命令声明的 kind 不符：' + rec.env?.shape);
    assert.equal(rec.env?.key, KEY_OF_WORD.get(word), word + ' 包络 key 与命令键不符');
    // 产物是**完整文档**（#264 的共用助手，唯一定义地）
    assertDocPage(rec.html, word);
    // 产物消费了这条词自己的参数（custom 窗口的起止逐字落在产物里）
    const params = paramsOf(rec.cli);
    if (params.window === 'custom') {
      assert.ok(rec.html.includes(params.start) && rec.html.includes(params.end),
        word + ' 产物没带上这条词自己的自定义起止：' + params.start + '~' + params.end);
    }
  }
  assert.equal(recs.length, WORDS.length, '真跑条数与冻结表条数不等');
  say('G1', '词=' + recs.length + ' exit0=' + recs.filter((r) => r.status === 0).length
    + ' 绝对路径=' + recs.filter((r) => isAbsolute(r.out ?? '')).length
    + ' 字节如实=' + recs.filter((r) => r.env?.delivery?.bytes === r.bytes && r.bytes > 0).length
    + ' 完整文档=' + recs.filter((r) => isAbsolute(r.out ?? '') && startsDoc(r)).length
    + ' 落盘字节域=[' + Math.min(...recs.map((r) => r.bytes ?? 0)) + ',' + Math.max(...recs.map((r) => r.bytes ?? 0)) + ']');
});
function startsDoc(rec) {
  try { assertDocPage(rec.html, rec.word); return true; } catch { return false; }
}

/* ── 第二组 · 两处定义地对账（冻结表 ↔ 路由声明） ───────────────────────── */

group(2, '冻结表 main_prompt.cli ↔ 路由声明 cli 逐条逐字相同（无 non-exec）', () => {
  const sameCli = [];
  const nonExec = [];
  for (const word of WORDS) {
    const hits = DECLS.filter((r) => r.wakeWord === word);
    assert.equal(hits.length, 1, word + ' 在两件声明里的记录不是恰好 1 条：' + JSON.stringify(hits.map((h) => h.kind)));
    const decl = hits[0];
    assert.equal(decl.kind, 'exec', word + ' 的路由记录不是 exec（non-exec）：' + decl.kind);
    assert.equal(decl.cli, FROZEN_CLI.get(word), word + ' 两处定义地不一致（冻结表 vs 路由声明）');
    assert.equal(decl.cli, FROZEN_DATA_SOURCE.get(word), word + ' 路由 cli 与冻结 data_source 不一致');
    assert.equal(decl.key, KEY_OF_WORD.get(word), word + ' 路由声明的键与冻结命令键不符');
    assert.equal(decl.scene, '04', word + ' 的路由记录场景不是 04');
    sameCli.push(word);
  }
  // 反向：场景 04 的 wake 声明记录不许有冻结表外的词（无孤儿、无重复）
  const declWords = DECLS.filter((r) => r.scene === '04' && r.list === 'wake').map((r) => r.wakeWord);
  assert.equal(new Set(declWords).size, declWords.length, '场景 04 的 wake 声明有重复词');
  assert.deepEqual([...declWords].sort(), [...WORDS].sort(), 'wake 声明词集与冻结表词集不相等（有孤儿或缺词）');
  // 场景 04 的任何声明记录（含 new 别名）都不许是 non-exec
  for (const r of DECLS.filter((x) => x.scene === '04')) {
    assert.equal(r.kind, 'exec', '场景 04 声明里还有 non-exec 记录：' + r.wakeWord);
    if (r.kind === 'non-exec') nonExec.push(r.wakeWord);
  }
  // 生成物（记录面）与冻结表逐字相同
  const gen = new Map(WAKE_ROUTES.filter((r) => r.scene === '04').map((r) => [r.wakeWord, r]));
  for (const word of WORDS) {
    const g = gen.get(word);
    assert.ok(g !== undefined, word + ' 生成物（routes.generated.ts）里没有这条词');
    assert.equal(g.kind, 'exec', word + ' 生成物里这条词不是 exec');
    assert.equal(g.cli, FROZEN_CLI.get(word), word + ' 生成物 cli 与冻结表不一致');
  }
  assert.equal(gen.size, WORDS.length, '生成物里场景 04 的记录数与冻结表不等：' + gen.size);
  // 词 → 键 → 页族：同键的词共用同一页族身份（页族针表与命令键闭合）
  const keyGroups = new Map();
  for (const word of WORDS) {
    const key = KEY_OF_WORD.get(word);
    keyGroups.set(key, (keyGroups.get(key) ?? 0) + 1);
  }
  for (const key of keyGroups.keys()) assert.ok(EYEBROW_OF_KEY.has(key), '页族针表缺键：' + key);
  say('G2', '冻结词=' + WORDS.length + ' 逐字相同=' + sameCli.length + ' non-exec=' + nonExec.length
    + ' 生成物一致=' + WORDS.length + ' 键数=' + keyGroups.size
    + ' 分布=' + keyGroups.get('calorie.view.exercise-distribution')
    + ' 趋势=' + keyGroups.get('calorie.view.exercise-trend')
    + ' 复盘=' + keyGroups.get('calorie.view.exercise-recap')
    + '（票面括号里的「38 条一致／1 条 non-exec」是开票日读数，#342 已把最后一条改指真命令）');
});

/* ── 第三组 · 页面归属（拿错页即红） ─────────────────────────────────────── */

group(3, '分布／趋势／复盘 7 条读类词各拿自己那一页，不是「运动总览」', () => {
  const { byWord } = full();
  assert.ok(READ_WORDS.length > 0, '范围里一条读类词都没有（派生失败）');
  const seen = new Map();
  READ_WORDS.forEach((word, i) => {
    const rec = ok0(byWord.get(word));
    const own = PAGE_OF_TEMPLATE.get(TPL_OF_WORD.get(word));   // 词自己的页身份（**模板件名**给出）
    assert.ok(own !== undefined, word + ' 的模板件名不在页身份针表里：' + TPL_OF_WORD.get(word));
    // ① **页轴的两处定义地对账**：模板件名说的页 ↔ 命令键说的页（改任一条轴的页 ⇒ 必红）
    assert.equal(EYEBROW_OF_KEY.get(KEY_OF_WORD.get(word)), own.eyebrow,
      word + ' 两处定义地（模板件名 vs 命令键）对不上页：模板说「' + own.eyebrow
      + '」，命令键 ' + KEY_OF_WORD.get(word) + ' 说「' + EYEBROW_OF_KEY.get(KEY_OF_WORD.get(word)) + '」');
    // ② 产物面：眉标／题面／载荷头三处都指得出**自己那一页**
    //    MUT_PAGE：把首条读类词的期望页身份换成另一页 ⇒ 必红（核对判据真在判这条）
    const expect = MUT_PAGE && i === 0 ? PAGE_OF_TEMPLATE.get('templates/exercise_recap.html') : own;
    assert.equal(rec.eyebrow, expect.eyebrow,
      word + ' 的页眉不是它自己那一页：实得「' + rec.eyebrow + '」，期望「' + expect.eyebrow + '」');
    const copyHead = String(rec.copyHead ?? '').split('\n')[0];
    assert.equal(copyHead, '【calorie · ' + expect.copyPage + '】', word + ' 载荷头不是它自己那一页：' + copyHead);
    assert.ok(String(rec.h1 ?? '').includes(expect.copyPage), word + ' 题面不含自己那一页的页名：' + rec.h1);
    // ③ 不是「运动总览」：眉标／题面／载荷头三处都不许是汇总页
    assert.notEqual(rec.eyebrow, EYEBROW_OF_KEY.get('calorie.view.exercise'), word + ' 落回运动总览页（眉标）');
    assert.ok(!String(rec.h1 ?? '').startsWith('运动汇总'), word + ' 落回运动总览页（题面）：' + rec.h1);
    assert.notEqual(copyHead, '【calorie · calorie.view.exercise】', word + ' 落回运动总览页（载荷头）');
    // ④ 产物零命令键（页身份一律人话面）
    assert.ok(!rec.html.includes('calorie.view.'), word + ' 产物里出现命令键 calorie.view.*');
    seen.set(TPL_OF_WORD.get(word), (seen.get(TPL_OF_WORD.get(word)) ?? 0) + 1);
  });
  // 三条页族的身份两两不同（形状真分开了）
  const readTpls = [...READ_TEMPLATES];
  for (let a = 0; a < readTpls.length; a += 1) {
    for (let b = a + 1; b < readTpls.length; b += 1) {
      assert.notEqual(PAGE_OF_TEMPLATE.get(readTpls[a]).eyebrow, PAGE_OF_TEMPLATE.get(readTpls[b]).eyebrow,
        '两条页族共用同一个眉标：' + readTpls[a] + ' vs ' + readTpls[b]);
      assert.notEqual(PAGE_OF_TEMPLATE.get(readTpls[a]).copyPage, PAGE_OF_TEMPLATE.get(readTpls[b]).copyPage,
        '两条页族共用同一个载荷页名：' + readTpls[a] + ' vs ' + readTpls[b]);
    }
  }
  // 对照面：汇总族的词**确实**拿的是汇总页（证明上面的「不是总览」不是空判）
  const summary = WORDS.filter((w) => KEY_OF_WORD.get(w) === 'calorie.view.exercise');
  for (const w of summary) {
    const rec = ok0(byWord.get(w));
    assert.equal(rec.eyebrow, EYEBROW_OF_KEY.get('calorie.view.exercise'), w + ' 汇总页眉标不对：' + rec.eyebrow);
    assert.ok(String(rec.h1 ?? '').startsWith('运动汇总'), w + ' 汇总页题面不对：' + rec.h1);
  }
  // 载荷面：除两页印命令键的（见证据件遗留出口），其余产物的载荷页名一律是人话
  const leak = [];
  for (const rec of full().recs) {
    const key = KEY_OF_WORD.get(rec.word);
    const page = /^【calorie · (.*)】$/.exec(String(rec.copyHead ?? '').split('\n')[0])?.[1] ?? null;
    assert.ok(page !== null, rec.word + ' 载荷头不是「技能 · 页名」形态：' + rec.copyHead);
    if (COPY_KEY_LEAK.has(key)) { leak.push(rec.word); continue; }
    assert.ok(!/[.]/.test(page), rec.word + ' 载荷页名里出现工程名（应是人话页名）：' + page);
  }
  say('G3', '读类词=' + READ_WORDS.length + '（分布=' + seen.get('templates/exercise_distribution.html')
    + ' 趋势=' + seen.get('templates/exercise_trend.html') + ' 复盘=' + seen.get('templates/exercise_recap.html') + '）'
    + ' 各拿自己那页=' + READ_WORDS.length + ' 页轴两处对账=' + READ_WORDS.length + ' 产物零命令键=' + READ_WORDS.length
    + ' 汇总族对照=' + summary.length + ' 载荷头仍印命令键=' + leak.length + '（见遗留出口）'
    + (MUT_PAGE ? '｜MUT_PAGE=1（期望页身份被换 ⇒ 本轮应红）' : ''));
});

/* ── 第四组 · 阻断（空库／无记录） ───────────────────────────────────────── */

group(4, '空库：报错、不落盘、不编默认值（新增类如实出账且只消费输入）', () => {
  const { recs } = empty();
  const blocked = [];
  const landed = [];
  for (const rec of recs) {
    const { word } = rec;
    const params = paramsOf(rec.cli);
    // 派生：真**新增**记录的词（add 且不是「复制」派生）在空库上应当如实出账；其余一律阻断
    const creates = KEY_OF_WORD.get(word) === 'calorie.exercise.add' && params.copyFrom === undefined;
    if (creates) {
      landed.push(rec);
      assert.equal(rec.status, 0, word + ' 空库上新增类应当出账，实得 status=' + rec.status + ' stderr=' + rec.stderrTail);
      assertDocPage(rec.html, word + '（空库新增）');
      // 只消费输入：类型／消耗／时长逐字落在产物的**可见文本**里（没编默认值就没有别的读数来源）
      const body = visibleText(rec.html);
      const p = Array.isArray(params.items) ? (params.items[0] ?? {}) : params;
      for (const [label, value, unit] of [['消耗', p.calories, '卡'], ['时长', p.minutes, '分钟']]) {
        if (typeof value === 'number') {
          assert.ok(body.includes(label + ' → ' + value + ' ' + unit),
            word + ' 产物没如实印出输入的' + label + '：' + value + '（实得可见文本里找不到「' + label + ' → ' + value + ' ' + unit + '」）');
        }
      }
      if (typeof p.type === 'string') assert.ok(body.includes(p.type), word + ' 产物没印出输入的运动类型：' + p.type);
      if (typeof p.note === 'string') assert.ok(body.includes(p.note), word + ' 产物没印出输入的备注：' + p.note);
      continue;
    }
    blocked.push(rec);
    assert.notEqual(rec.status, 0, word + ' 空库必须阻断，实得 exit 0');
    assert.match(rec.stderrTail, /取数失败/, word + ' 阻断须明确提示取数失败：' + rec.stderrTail);
    assert.ok(/缺失阻断|不存在/.test(rec.stderrTail), word + ' 阻断文案要点名缺什么：' + rec.stderrTail);
    const env = (() => { try { return JSON.parse(String(rec.stdout)); } catch { return null; } })();
    assert.equal(env?.data?.output ?? null, null, word + ' 阻断时不得给产物路径');
    assert.deepEqual(rec.landed, [], word + ' 阻断时空库落盘了：' + JSON.stringify(rec.landed));
  }
  assert.equal(blocked.length + landed.length, WORDS.length, '空库两档条数之和 ≠ 冻结表条数');
  assert.ok(blocked.length > 0, '空库一条都没阻断（阻断判据失效）');
  assert.ok(landed.length > 0, '空库新增类一条都没出账（派生规则错了）');
  // 空库落盘总数＝新增类条数（没有别的页悄悄落下来）
  assert.equal(recs.reduce((a, r) => a + r.landed.length, 0), landed.length, '空库落盘数与新增类条数不等');
  say('G4', '空库阻断=' + blocked.length + ' 空库新增出账=' + landed.length + ' 落盘文件数=' + landed.length
    + ' 阻断后落盘=0 阻断提示取值=' + JSON.stringify([...new Set(blocked.map((r) => r.stderrTail.slice(0, 30)))].slice(0, 3)));
});

/* ── 第五组 · 回归灵敏度（换掉一处模板件名 ⇒ 用例变红） ──────────────────── */

group(5, '页身份针＋冻结表模板件名：换掉一处即红（原样时两两互斥）', () => {
  const { recs } = full();
  // ① 产物面：每条词的眉标＝它自己页族那一族；一族之外的词不许出现这一族的眉标（互斥）
  const owners = new Map();
  for (const rec of recs) {
    const key = KEY_OF_WORD.get(rec.word);
    const expect = MUT_PAGE && READ_WORDS.includes(rec.word) && READ_WORDS.indexOf(rec.word) === 0
      ? 'calorie.view.exercise-recap' : key;
    assert.equal(rec.eyebrow, EYEBROW_OF_KEY.get(expect), rec.word + ' 眉标不是它自己那一族：' + rec.eyebrow);
    owners.set(rec.eyebrow, (owners.get(rec.eyebrow) ?? 0) + 1);
  }
  for (const [eyebrow, n] of owners) {
    const keysOfFamily = [...EYEBROW_OF_KEY.entries()].filter(([, e]) => e === eyebrow).map(([k]) => k);
    const wordsOfFamily = recs.filter((r) => keysOfFamily.includes(KEY_OF_WORD.get(r.word)));
    assert.equal(n, wordsOfFamily.length, '眉标「' + eyebrow + '」的产物数与同键词数不等');
  }
  // ② 声明面：冻结表 `html_template`（**模板件名**）与命令键／页族对账——
  //    a) 同键的词必须点名同一件模板（换掉一处模板件名 ⇒ 这条必红）；
  //    b) 每件模板只许服务一个页族，**登记在册的共用件**例外（`exercise_summary.html` 承载汇总＋记录明细两页）。
  const tplByKey = new Map();
  for (const t of SCENE_04_EXERCISE) {
    const key = commandKeyOf(t.main_prompt.cli);
    const tpl = t.html_template;
    assert.ok(typeof tpl === 'string' && tpl.length > 0, t.wake_word + ' 冻结表没有 html_template（模板件名）');
    if (!tplByKey.has(key)) tplByKey.set(key, new Set());
    tplByKey.get(key).add(tpl);
  }
  for (const [key, set] of tplByKey) {
    assert.equal(set.size, 1, '同键的词点了两件不同模板：' + key + ' → ' + JSON.stringify([...set]));
  }
  const SHARED_TEMPLATES = new Set(['templates/exercise_summary.html']);   // 登记在册：一族两页共用件
  const familiesOfTpl = new Map();
  for (const t of SCENE_04_EXERCISE) {
    const fam = EYEBROW_OF_KEY.get(commandKeyOf(t.main_prompt.cli));
    if (!familiesOfTpl.has(t.html_template)) familiesOfTpl.set(t.html_template, new Set());
    familiesOfTpl.get(t.html_template).add(fam);
  }
  for (const [tpl, fams] of familiesOfTpl) {
    if (SHARED_TEMPLATES.has(tpl)) continue;
    assert.equal(fams.size, 1, '一件模板被两个页族共用（未登记）：' + tpl + ' → ' + JSON.stringify([...fams]));
  }
  // 读类三件模板与「运动总览」那件不许同一件（页轴的另一半）
  const summaryTpl = [...tplByKey.get('calorie.view.exercise')][0];
  for (const tpl of READ_TEMPLATES) {
    assert.notEqual(tpl, summaryTpl, tpl + ' 与「运动总览」同一件模板');
  }
  say('G5', '眉标族长=' + owners.size + ' 产物逐条对族=' + recs.length
    + ' 键→模板件=(' + [...tplByKey].map(([k, v]) => k.replace('calorie.view.exercise', 'view.exercise') + ':' + [...v][0].split('/')[1]).join(' ')
    + ') 读类三件模板=' + READ_TEMPLATES.size + ' 登记共用件=' + SHARED_TEMPLATES.size
    + (MUT_PAGE ? '｜MUT_PAGE=1（期望页身份被换 ⇒ 本轮应红）' : ''));
});

/* ── 第六组 · 产物形态不得回退（写类完整文档，与 #264 判据同源） ─────────── */

group(6, '写类 13 词产物是完整文档（不是片段），与 #264 判据同源', () => {
  const { byWord } = full();
  assert.ok(WRITE_WORDS.length > 0, '写类词一条都没派生出来');
  for (const word of WRITE_WORDS) {
    const rec = ok0(byWord.get(word));
    assert.ok(WRITE_KEYS.has(KEY_OF_WORD.get(word)), word + ' 不在写类键里');
    assertDocPage(rec.html, word);
    assert.ok(rec.html.startsWith('<!doctype html>'), word + ' 不以 doctype 起（被打了回片段）');
    assert.equal(rec.html.startsWith('<section'), false, word + ' 是片段页，不是完整文档');
    assert.ok(/<\/html>\s*$/.test(rec.html.trimEnd()), word + ' 未以 </html> 收尾（截断？）');
    const title = (rec.html.match(/<title>([^<]*)<\/title>/) ?? [])[1];
    assert.ok(typeof title === 'string' && title.length > 0, word + ' 缺 <title>');
    assert.ok(rec.html.includes('复制数据'), word + ' 缺复制区');
    const fmts = [...rec.html.matchAll(/data-fmt="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(fmts, ['text', 'json', 'csv'], word + ' 三格式菜单缺项：' + JSON.stringify(fmts));
    assert.ok(rec.html.length > 10000, word + ' 产物只有 ' + rec.html.length + ' 字符，看着仍像片段');
    // 写后回执的页族身份（写类 13 词共用一族）
    assert.equal(rec.eyebrow, EYEBROW_OF_KEY.get(KEY_OF_WORD.get(word)), word + ' 写后回执眉标不对：' + rec.eyebrow);
  }
  say('G6', '写类词=' + WRITE_WORDS.length + ' 完整文档=' + WRITE_WORDS.length
    + ' 字节域=[' + Math.min(...WRITE_WORDS.map((w) => byWord.get(w).bytes)) + ','
    + Math.max(...WRITE_WORDS.map((w) => byWord.get(w).bytes)) + ']');
});

/* ── 真库只读：本文件全部跑动都指向临时夹具目录 ─────────────────────────── */

test('#267 真库只读：本文件从不把 SKILLS_DB_PATH 指向真库', () => {
  RESULT.total += 1;
  try {
    const real = process.env.SKILLS_DB_PATH ?? null;
    for (const [tag, dir] of [['满库', full().seedDir], ['空库', empty().seedDir]]) {
      assert.ok(dir.startsWith(tmpdir()), tag + '夹具目录不在系统临时根下：' + dir);
      if (real !== null && existsSync(join(real, DB_FILENAME))) {
        assert.notEqual(dir, real, tag + '夹具目录指到了真库');
        assert.ok(!dir.startsWith(real), tag + '夹具目录落在真库目录内：' + dir);
      }
      assert.equal(basename(join(dir, DB_FILENAME)), DB_FILENAME, tag + '夹具库名不符');
    }
    assert.ok(existsSync(ROOT), '仓根不可达');
    assert.ok(existsSync(BIN), 'dist/cli/cmd_read.js 不在（先 pnpm build）');
    RESULT.passed += 1;
    say('G7', '夹具根=' + tmpdir() + ' 真库SKILLS_DB_PATH=' + (real ?? '（未设）') + ' 真库零接触=是');
  } catch (err) {
    RESULT.failed.push('G7');
    throw err;
  }
});
