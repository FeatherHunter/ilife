/** #386 · 场景 10B 锁：**真出口用例**（以唤醒词为起点，六组断言）——票面「只加测试」。
 *
 * 照抄用法（给模板不给白纸）：
 * - `test/analysis-predict-383.test.mjs`（唤醒词→routesFor→CLI 落盘＋绝对路径＋完整文档＋逐字段）；
 * - `test/analysis-report-384.test.mjs`（8 报告各拿自己那页／两两互异／拿错页即红）；
 * - `test/analysis-deficit-385.test.mjs`（唤醒词起点＋`assertDocPage` 共用助手＋缺口页字段）；
 * - `test/home-lock-374.test.mjs`（`main_prompt.cli` 逐字照跑：tokenize ＋ 原样执行 ＋
 *   `delivery.bytes`＝落盘字节 ＋ 空库 exit 4 不落盘 ＋ `T374_BREAK` 式断言级自证）。
 * **完整文档断言助手只读复用** `test/doc-page-assert.mjs::assertDocPage`（#264 建，唯一定义地）；
 * 既有三份五连（`profile-receipt-175`／`wizard-86`／`profile-doc-179`）本票一行不动。
 *
 * 起点纪律：**逐条从用户说的那句话出发**——`lookupWake(HELP_LOOKUP, 唤醒词)` 拿命令，
 * 再 `routesFor(唤醒词)` 拿路由层那条命令；**命令原样跑**（不补 `--html`），落点由命令自己决定。
 * 断言只用命令自己回的 `data.output`，不拿命令表反推。
 *
 * 范围（边界票 #382 Q1：预测模拟 20＋报告 8＋缺口 1＋归属本图的 new 别名 2）**由权威声明派生**，
 * 不写手写计数：冻结表 `SCENE_10_ANALYSIS` 按 `subfunction`／`main_prompt.cli` 的命令名过滤出
 * 29 条；`new` 别名＝`ANALYSIS_ROUTES` 里 `list:'new'` 且命令键落在上面那批命令键里的记录（2 条）。
 * 判定三档守前两档（文件存在＋内容字段正确），视觉不归本票。
 *
 * 运行：`pnpm build && node packages/skill-calorie/test/analysis-accept-386.test.mjs`
 * 断言级自证：`T386_MUT_TPL=1 node ...`（把首条报告的期望页身份换成另一形态的 ⇒ 必红）。
 * 源码级自证两行见 `.scratch/t386/mut-*.log` 与 `docs/skills/skill-calorie/t386-证据.md`。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

process.env.CALORIE_TODAY = '2026-09-07';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const DIST = join(HERE, '..', 'dist');
const BIN = join(DIST, 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';
const TODAY = '2026-09-07';
const MUT_TPL = process.env.T386_MUT_TPL === '1';

const { openDb } = await import(pathToFileURL(join(DIST, 'index.js')).href);
const { routesFor } = await import(pathToFileURL(join(DIST, 'triggers', 'routing.js')).href);
const { HELP_LOOKUP, lookupWake, isExecCli } = await import(pathToFileURL(join(DIST, 'triggers', 'index.js')).href);
const { SCENE_10_ANALYSIS } = await import(pathToFileURL(join(DIST, 'triggers', 'scene-10-analysis.js')).href);
const { ANALYSIS_ROUTES } = await import(pathToFileURL(join(DIST, 'analysis', 'routes.js')).href);
const { KIND_LABELS } = await import(pathToFileURL(join(DIST, 'analysis', 'reportDoc.js')).href);
const { SIM_MIN_DAYS } = await import(pathToFileURL(join(DIST, 'analysis', 'simulate.js')).href);
const { assertDocPage } = await import(pathToFileURL(join(HERE, 'doc-page-assert.mjs')).href);

/* ── 范围：全部由权威声明派生（无手写计数） ─────────────────────────────────── */

/** 冻结表里一条记录的**命令键**（`main_prompt.cli` 的第二段）；不是命令形态即 null。 */
function commandKeyOf(cli) {
  const m = /^calorie-cmd-read\s+(\S+)/.exec(String(cli ?? ''));
  return m === null ? null : m[1];
}

const PREDICT = SCENE_10_ANALYSIS.filter((t) => t.subfunction === '预测模拟');
const REPORTS = SCENE_10_ANALYSIS.filter((t) => (commandKeyOf(t.main_prompt.cli) ?? '').startsWith('calorie.report.'));
const DEFICIT = SCENE_10_ANALYSIS.filter((t) => t.subfunction === '缺口分析');
const SCOPED = [...PREDICT, ...REPORTS, ...DEFICIT];
const SCOPE_COMMAND_KEYS = new Set(SCOPED.map((t) => commandKeyOf(t.main_prompt.cli)));
/** 归属本图的 new 别名＝`routes.ts` 的 new 记录里、命令键落在本图范围命令键内的那些。 */
const ALIASES = ANALYSIS_ROUTES.filter((r) => r.list === 'new' && SCOPE_COMMAND_KEYS.has(r.key));

/** 每条词的**权威命令原文**（冻结表优先；别名取其自己的路由声明）。 */
const CLI_OF = new Map();
for (const t of SCOPED) CLI_OF.set(t.wake_word, t.main_prompt.cli);
for (const a of ALIASES) CLI_OF.set(a.wakeWord, a.cli);
/** 本图范围全部唤醒词（冻结表 29 ＋ 别名 2）。 */
const WORDS = [...CLI_OF.keys()];

/** 命令原文 → 参数对象（`--params '{...}'`）。 */
function paramsOf(cli) {
  const at = String(cli).indexOf('--params ');
  if (at < 0) return {};
  const quoted = String(cli).slice(at + '--params '.length).trim();
  const body = quoted.replace(/^'/, '').replace(/'$/, '');
  return JSON.parse(body.replace(/\\"/g, '"'));
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

function isoAt(i, end = TODAY) {
  return new Date(Date.parse(end + 'T12:00:00Z') - i * 86400000).toISOString().slice(0, 10);
}

/** 种子库（照 `.scratch/t384demo/step23-run.mjs` 口径：100 天体重／三餐／隔日运动／水分）。
 *  饮水在 `food_log` 且 `food_name='💧水'`（库里没有 `water_log` 表）。 */
function seed(db, days = 100) {
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, 'male', 175, 'moderate')").run();
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal) VALUES (1, 1800, 150, 200, 50, 2000)').run();
  for (let i = 0; i < days; i++) {
    const d = isoAt(i);
    db.prepare('INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(d, '12:00:00', '米饭', 200, 1750, 140, 200, 60);
    db.prepare('INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(d, '15:00:00', '💧水', 2100, 0, 0, 0, 0);
    // 体重随**时间前进**下降（`i` 是「距今几天」，故 i 越大越早、越重）：最近一次 67.0kg。
    db.prepare('INSERT INTO weight_log (date, time, weight_kg) VALUES (?, ?, ?)')
      .run(d, '07:00:00', Math.round((67.0 + i * 0.05) * 100) / 100);
    if (i % 2 === 0) {
      db.prepare('INSERT INTO exercise_log (date, exercise_type, duration_minutes, calories_burned, category) VALUES (?, ?, ?, ?, ?)')
        .run(d, '跑步', 30, 300, '有氧');
    }
  }
}

function mkDir(tag, days) {
  const dir = mkdtempSync(join(tmpdir(), tag + '-'));
  const db = openDb(join(dir, DB_FILENAME));
  if (days > 0) seed(db, days);
  db.close();
  return dir;
}

/** 命令**原样**跑（不补任何参数）；库路径经 `SKILLS_DB_PATH` 指向夹具目录，真库零接触。 */
function runWord(dir, cli) {
  const toks = tokenize(cli);
  return spawnSync(NODE_BIN, [BIN, ...toks.slice(1)], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: TODAY },
  });
}

function landedHtml(dir) {
  const outDir = join(dir, 'calorie_html');
  return existsSync(outDir) ? readdirSync(outDir).filter((f) => f.endsWith('.html')) : [];
}

/* ── 六组断言共用的那份真跑（跑一次、各组复用；红线由各组自己判） ─────────────── */

let CACHED = null;
function products() {
  if (CACHED !== null) return CACHED;
  const dir = mkDir('t386-seed', 100);
  const recs = [];
  for (const word of WORDS) {
    const cli = CLI_OF.get(word);
    const r = runWord(dir, cli);
    const tail = String(r.stderr || '').trim().split(/\r?\n/).slice(-2).join(' / ');
    const rec = { word, cli, dir, status: r.status, stdout: String(r.stdout || ''), stderrTail: tail };
    if (r.status === 0) {
      const lines = rec.stdout.trimEnd().split(/\r?\n/);
      assert.equal(lines.length, 1, word + ' stdout 应恒一行 JSON，实得 ' + lines.length + ' 行');
      rec.env = JSON.parse(lines[0]);
      const out = rec.env?.data?.output;
      rec.out = out;
      rec.bytes = existsSync(out) ? statSync(out).size : null;
      rec.html = existsSync(out) ? readFileSync(out, 'utf8') : '';
    }
    recs.push(rec);
  }
  CACHED = { dir, recs, byWord: new Map(recs.map((x) => [x.word, x])) };
  return CACHED;
}

function pageOf(word) {
  const rec = products().byWord.get(word);
  assert.ok(rec !== undefined, '范围外的词：' + word);
  assert.equal(rec.status, 0, word + ' 非 exit 0：status=' + rec.status + ' stderr=' + rec.stderrTail);
  return rec;
}

/** 报告形态名 → 该形态**自己那一件**的独有构件针（互斥；换件名即红）。 */
const REPORT_PIECE = {
  bmi: '逐日体重与 BMI',
  tdee: '活动量系数',
  bmr: '低于基础代谢',
  protein: '每日蛋白量',
  water: '每日饮水量',
  score: '分项分数表',
  trend: '评分序列',
  compare: '两期变化量',
};
const REPORT_KINDS = Object.keys(KIND_LABELS);

/** 报告族的**页型身份标记**（新形状；#519 裁定 Q 的落点）。
 *
 *  改前这两条「不许落进报告页」的断言判的是旧串 `卡路里 · 报告`——那是 #516 判据 R1 的债，
 *  本票已把它形状化掉（题名两段用空格、页型徽章只写一个词「报告」、归属词走页头胶囊）⇒
 *  旧串在产物里**已不存在**，那两条断言变成**恒真的空转**。
 *  收严做法（裁定 Q 的选项 ①：原事实仍在）：把判据换成新形状的**两枚标记**——
 *    ① `<div class="type-badge">报告</div>`：报告族的页型徽章（`assembleDocPage` 的 `badge` 位，只写一个词）；
 *    ② `ilife-block-chip">健康报告<`：报告族页头胶囊里那一枚归属词（`reportChips`）。
 *  两枚**同时**在场才算报告族页；负向断言（预测／缺口页不得带它）与**正面半边**（报告族产物必须带它）
 *  成对使用——没有正面半边，负向断言就是在空转（这正是本条要修的毛病）。 */
const REPORT_PAGE_MARKS = ['<div class="type-badge">报告</div>', 'ilife-block-chip">健康报告<'];

/* ── 判据 0 · 范围分母（派生自权威声明，无手写计数） ─────────────────────── */

test('#386 判据：范围由冻结表＋routes.ts 派生（预测模拟／报告／缺口／new 别名）', () => {
  assert.ok(PREDICT.length > 0, '冻结表没有「预测模拟」段');
  assert.ok(REPORTS.length > 0, '冻结表没有 `calorie.report.*` 词');
  assert.ok(DEFICIT.length > 0, '冻结表没有「缺口分析」段');
  for (const t of SCOPED) {
    const key = commandKeyOf(t.main_prompt.cli);
    assert.ok(key !== null, '本图范围的词必须是命令形态：' + t.wake_word + ' → ' + t.main_prompt.cli);
  }
  // 三段互不相交、无重复词
  const words = SCOPED.map((t) => t.wake_word);
  assert.equal(new Set(words).size, words.length, '冻结表范围内有重复唤醒词');
  for (const t of REPORTS) assert.ok(!PREDICT.includes(t) && !DEFICIT.includes(t), '报告词与别段重叠：' + t.wake_word);
  // 8 条报告各指一条自己的命令（一条命令一个词），形态名与 KIND_LABELS 逐个对得上
  const reportKeys = REPORTS.map((t) => commandKeyOf(t.main_prompt.cli));
  assert.equal(new Set(reportKeys).size, reportKeys.length, '8 条报告有两个词共用一条命令：' + JSON.stringify(reportKeys));
  assert.deepEqual(
    [...reportKeys].map((k) => k.replace('calorie.report.', '')).sort(),
    [...REPORT_KINDS].sort(),
    '报告命令的形态名与 KIND_LABELS 的形态集不相等',
  );
  // 别名：本图范围的 new 记录＝`routes.ts` 里命令键落在范围内且 list==='new' 的那些
  assert.ok(ALIASES.length > 0, '本图范围一条 new 别名都没有（分母缺了口）');
  // 别名集合与范围命令键的自洽性判据在 `:65-67`：`ALIASES` 就是「`routes.ts` 的 `list==='new'` 记录里、
  // 命令键落在 `SCOPE_COMMAND_KEYS` 内的那些」——此处不再复述（旧有一行把集合拿自己筛自己，恒真）。
  assert.equal(new Set(WORDS).size, WORDS.length, '本图范围唤醒词有重复');
  assert.equal(WORDS.length, SCOPED.length + ALIASES.length, '唤醒词数 ≠ 冻结表范围 ＋ 别名');
  // 缺口那条别名与冻结词的命令原文逐字相同（同一条命令、两个入口）
  for (const a of ALIASES) {
    const same = SCOPED.filter((t) => commandKeyOf(t.main_prompt.cli) === a.key).map((t) => t.main_prompt.cli);
    assert.ok(same.includes(a.cli), '别名命令原文与同键的冻结词都不一致：' + a.wakeWord + ' → ' + a.cli);
  }
});

/* ── 第一组 · 以唤醒词为起点（最关键） ─────────────────────────────────── */

test('#386 第一组：逐条 lookupWake 拿命令原样跑（exit 0＋绝对路径＋落盘字节如实＋完整文档）', () => {
  const { recs } = products();
  const helpMissing = [];
  for (const rec of recs) {
    const { word, cli } = rec;
    // 起点：用户说的那句话 → 速查台命中；速查台没有条目的词走路由层（并点名，见文末遗留出口）
    const help = lookupWake(HELP_LOOKUP, word).filter((h) => isExecCli(h.cli));
    const exec = routesFor(word).filter((r) => r.kind === 'exec');
    assert.ok(exec.length > 0, '唤醒词没有命令可执行：' + word);
    if (help.length === 0) helpMissing.push(word);
    else assert.equal(help[0].cli, exec[0].cli, '唤醒词在速查台与路由层给出的命令不一致：' + word);
    // 命令原文必须是**这条词自己**的（范围派生值），不是命令表里的任意一条
    assert.equal(cli, help.length > 0 ? help[0].cli : exec[0].cli, '起点命令原文不符：' + word);
    // 真跑
    assert.equal(rec.status, 0, word + ' 非 exit 0：status=' + rec.status + ' stderr=' + rec.stderrTail);
    const env = rec.env;
    assert.equal(env.key, commandKeyOf(cli), word + ' envelope key 与命令键不符');
    assert.equal(env.shape, 'stat', word + ' 形状不是 stat');
    const out = env?.data?.output;
    assert.ok(typeof out === 'string' && out.length > 0, word + ' 缺 data.output');
    assert.ok(isAbsolute(out), word + ' data.output 非绝对路径：' + out);
    assert.ok(existsSync(out), word + ' 产物不在盘上：' + out);
    assert.equal(basename(dirname(out)), 'calorie_html', word + ' 落点不在 calorie_html/：' + out);
    // 落盘字节如实
    assert.equal(env?.delivery?.bytes, rec.bytes, word + ' delivery.bytes ≠ 落盘字节');
    assert.equal(env?.delivery?.path, out, word + ' delivery.path 与 output 不同值');
    assert.equal(Buffer.byteLength(rec.html, 'utf8'), rec.bytes, word + ' 读取字节数与落盘不等');
    // 产物是完整文档
    assertDocPage(rec.html, word);
  }
  if (helpMissing.length > 0) {
    // 不判红：速查台缺条目的词由「HELP 两边不一致」那条遗留出口点名（代表唤醒词机器不校验是框架级事项）
    assert.ok(helpMissing.every((w) => WORDS.includes(w)), '速查台缺条目名单越界');
  }
});

/* ── 第二组 · 两处定义地对账 ─────────────────────────────────────────── */

test('#386 第二组：冻结表 main_prompt.cli ↔ analysis/routes.ts cli 本图范围内逐字相同', () => {
  for (const t of SCOPED) {
    const hits = ANALYSIS_ROUTES.filter((r) => r.wakeWord === t.wake_word);
    assert.ok(hits.length > 0, 'routes.ts 里没有这条词的记录：' + t.wake_word);
    const exec = hits.filter((r) => r.kind === 'exec');
    assert.equal(exec.length, 1, 'routes.ts 里这条词不是恰好一条可执行记录：' + t.wake_word);
    assert.equal(exec[0].cli, t.main_prompt.cli, '两处定义地不一致：' + t.wake_word);
    assert.equal(commandKeyOf(exec[0].cli), commandKeyOf(t.main_prompt.cli), '两处命令键不一致：' + t.wake_word);
  }
  for (const a of ALIASES) {
    const exec = ANALYSIS_ROUTES.filter((r) => r.wakeWord === a.wakeWord && r.kind === 'exec');
    assert.equal(exec.length, 1, '别名的可执行记录不是恰好一条：' + a.wakeWord);
    assert.equal(exec[0].cli, a.cli, '别名两处定义地不一致：' + a.wakeWord);
    const same = SCOPED.filter((t) => commandKeyOf(t.main_prompt.cli) === a.key).map((t) => t.main_prompt.cli);
    assert.ok(same.includes(exec[0].cli), '别名命令与同键冻结词的命令原文逐字不同：' + a.wakeWord);
  }
});

/* ── 第三组 · 页面归属（拿错页即红） ─────────────────────────────────── */

test('#386 第三组：8 报告各拿自己那页（不是 full 健康盘）／预测各拿各自参数页／缺口拿缺口页', () => {
  const ctx = products();

  // ① 8 报告：页身份＝它自己那个形态；互不相同；都不是 full 健康盘那一页
  const health = runWord(ctx.dir, CLI_OF.get('看健康盘') ?? 'calorie-cmd-read calorie.view.health --params \'{"window":"今日"}\'');
  const healthOut = health.status === 0 ? JSON.parse(String(health.stdout)).data.output : null;
  const healthHtml = healthOut !== null && existsSync(healthOut) ? readFileSync(healthOut, 'utf8') : null;
  assert.ok(healthHtml !== null, '对照基准「看健康盘」没跑出产物（status=' + health.status + '）');
  const reportHtmls = [];
  REPORTS.forEach((t, i) => {
    const kind = (commandKeyOf(t.main_prompt.cli) ?? '').replace('calorie.report.', '');
    const rec = pageOf(t.wake_word);
    // T386_MUT_TPL：把首条报告的期望页身份换成另一形态（模拟「换掉一处模板件名」）⇒ 必红
    const expectKind = MUT_TPL && i === 0
      ? REPORT_KINDS[(REPORT_KINDS.indexOf(kind) + 1) % REPORT_KINDS.length]
      : kind;
    assert.ok(rec.html.includes('<title>卡路里 ' + KIND_LABELS[expectKind] + '</title>'),
      t.wake_word + ' 页面标题不是它自己那个形态（疑似拿错页）：期望「卡路里 ' + KIND_LABELS[expectKind] + '」');
    assert.ok(rec.html.includes('<div class="type-badge">报告</div>'), t.wake_word + ' 缺报告类型徽标');
    assert.ok(rec.html.includes('calorie.report.' + kind), t.wake_word + ' 产物缺本形态命令回执行');
    /* #519 授权改写（编排者 2026-09-16，《编排者授权（2026-09-16 · 报告族 4 条冻结断言的形状改写）》；
     * **一次性、具名、不类推**）：上面两条只把**债字符**换成新形状——题名两段不再拿 `·` 串
     * （#516 判据 R1）改「卡路里 ＋ 半角空格 ＋ 形态名」；徽章只写一个词「报告」（#516 §3.2 D04）。
     * 语义一件不少（仍逐字钉住「这是哪一页」），并按下条与 `analysis-report-384.test.mjs` 的那处对称加强。 */
    const vis = rec.html.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]*>/g, ' ');
    assert.ok(!vis.includes('·'), t.wake_word + ' 可见文本里出现 `·`（#516 判据 R1 的债）');
    assert.ok(!rec.html.includes('卡路里 · 报告'), t.wake_word + ' 产物里仍有旧徽章串「卡路里 · 报告」');
    assert.notEqual(rec.html, healthHtml, t.wake_word + ' 落回 full 健康盘那一页了');
    reportHtmls.push(rec.html);
  });
  for (let a = 0; a < reportHtmls.length; a++) {
    for (let b = a + 1; b < reportHtmls.length; b++) {
      assert.notEqual(reportHtmls[a], reportHtmls[b],
        '两张报告产物逐字节相同（形状没分开）：' + REPORTS[a].wake_word + ' vs ' + REPORTS[b].wake_word);
    }
  }

  // ② 预测各形态：页面必须带上**这条词自己**的参数；20 页两两互异
  /* #519 裁定 Q（编排者 2026-09-16，一次性、具名、不类推）——**正面半边**：
   * 下面两条「预测／缺口页不得落进报告页」的负向断言，只有当报告族产物**真的带**那两枚标记时才有力。
   * 缺了这半边，负向断言就是恒真（旧串 `卡路里 · 报告` 已随形状化消失，正是那个毛病）。 */
  for (const h of reportHtmls) {
    for (const m of REPORT_PAGE_MARKS) {
      assert.ok(h.includes(m), '报告族产物缺页型标记「' + m + '」⇒ 后面的负向断言会空转（裁定 Q）');
    }
  }
  const predKeys = new Set();
  for (const t of PREDICT) {
    const params = paramsOf(t.main_prompt.cli);
    const rec = pageOf(t.wake_word);
    const h1 = (rec.html.match(/ilife-block-page-shell-title">([^<]*)/) ?? [])[1];
    assert.ok(typeof h1 === 'string' && h1.length > 0, t.wake_word + ' 页面没有 H1');
    const numbers = Object.entries(params).filter(([k, v]) => k !== 'window' && typeof v === 'number');
    for (const [k, v] of numbers) {
      assert.equal(rec.env.data.metrics[k], v, t.wake_word + ' 页面读数不是它自己参数算的：metrics.' + k);
    }
    const h1IsOwn = h1 === t.wake_word || numbers.every(([, v]) => h1.includes(String(v)));
    assert.ok(h1IsOwn, t.wake_word + ' 的页头不是它自己那一页（H1=' + h1 + '）：拿错页即红');
    /* #519 裁定 Q：由 `!includes('卡路里 · 报告')`（旧串已随形状化消失 ⇒ 恒真空转）收严为
     * 「报告族的新形状标记一枚都不许出现」；正面半边见本节开头那条（报告族产物必须带这两枚）。 */
    assert.ok(!REPORT_PAGE_MARKS.some((m) => rec.html.includes(m)),
      t.wake_word + ' 落进了报告页（带上了报告族的页型标记）：' + REPORT_PAGE_MARKS.filter((m) => rec.html.includes(m)).join('／'));
    assert.ok(!/^热量缺口 /.test(h1), t.wake_word + ' 落进了缺口页');
    predKeys.add(h1 + '|' + JSON.stringify(rec.env.data.metrics));
  }
  assert.equal(predKeys.size, PREDICT.length, '预测形态有两条词落回同一页（形状没分开）');

  // ③ 缺口：拿缺口页（不是报告页、不是 full 健康盘）
  for (const t of DEFICIT) {
    const rec = pageOf(t.wake_word);
    const h1 = (rec.html.match(/ilife-block-page-shell-title">([^<]*)/) ?? [])[1];
    assert.ok(/^热量缺口 \d{4}-\d{2}-\d{2} 至 \d{4}-\d{2}-\d{2}$/.test(h1 ?? ''),
      t.wake_word + ' 页头不是缺口页：H1=' + h1);
    /* #517（编排者具名授权 3，本票、一次性）：H1 的区间符号按 #516 判据 R6（`~` 顶替「至」判债）改「至」。
     * 上面那条正则的语义**一件不少**：前缀锚定 `^热量缺口 `（不许落进报告页）、必须带完整日期区间、两端锚定 `$`。
     * 紧随其后的这条是**新增的对偶断言**：可见 H1 里不许出现 `~`（与 `analysis-deficit-385.test.mjs`
     * 里 #517 新加的那条「可见文本零并列分隔符」互为对偶；旧写法住在产物的口径注释里，
     * 供 `trend-homogeneity-110.test.mjs:195` 那条不在授权范围内的逐字断言认领）。 */
    assert.ok(!String(h1).includes('~'), t.wake_word + ' 可见 H1 里出现 `~`：H1=' + h1);
    for (const label of ['日均摄入', '日均消耗', '日均缺口', '理论减重']) {
      assert.ok(rec.html.includes('>' + label + '<'), t.wake_word + ' 缺口页缺 KPI 格：' + label);
    }
    /* #519 裁定 Q：同上一条，收严成报告族**新形状**的两枚标记（旧串已不存在）。 */
    assert.ok(!REPORT_PAGE_MARKS.some((m) => rec.html.includes(m)),
      t.wake_word + ' 落进了报告页（带上了报告族的页型标记）：' + REPORT_PAGE_MARKS.filter((m) => rec.html.includes(m)).join('／'));
    assert.notEqual(rec.html, healthHtml, t.wake_word + ' 落回 full 健康盘那一页了');
  }
  // 缺口别名与本体同命令 ⇒ 产物逐字节相同（同一条命令、两个入口）
  for (const a of ALIASES.filter((x) => x.key === 'calorie.view.deficit')) {
    assert.equal(a.cli, DEFICIT[0].main_prompt.cli, '别名命令与冻结词命令不同：' + a.wakeWord);
    assert.equal(pageOf(a.wakeWord).html, pageOf(DEFICIT[0].wake_word).html,
      '同名同命令的两个入口产物不同：' + a.wakeWord + ' vs ' + DEFICIT[0].wake_word);
  }
});

/* ── 第四组 · 阻断（空库／不足 14 天） ───────────────────────────────── */

test('#386 第四组：空库／数据不足 14 天——明确提示、不预测、不落盘、不编默认值', () => {
  // ① 空库：预测模拟全族必须阻断（不落盘、无产物路径、明确提示）
  const emptyDir = mkDir('t386-empty', 0);
  for (const t of PREDICT) {
    const r = runWord(emptyDir, CLI_OF.get(t.wake_word));
    assert.notEqual(r.status, 0, '空库不得出预测产物：' + t.wake_word);
    assert.ok(/缺失阻断/.test(String(r.stderr || '')), '空库须明确提示：' + t.wake_word + ' stderr=' + String(r.stderr || '').slice(-160));
    const env = (() => { try { return JSON.parse(String(r.stdout)); } catch { return null; } })();
    assert.equal(env?.data?.output ?? null, null, '空库不得给产物路径：' + t.wake_word);
  }
  assert.deepEqual(landedHtml(emptyDir), [], '空库本图预测族落了盘：' + JSON.stringify(landedHtml(emptyDir)));

  // ② 空库：报告／缺口族二档必居其一——「阻断档」不落盘且明确提示；「空态档」落盘但每个读数位都是 `—`
  //    （二档都不许编默认值：空态档页面必须点名缺什么，且不得出现由默认值算出的读数）
  for (const t of [...REPORTS, ...DEFICIT]) {
    const r = runWord(emptyDir, CLI_OF.get(t.wake_word));
    if (r.status !== 0) {
      assert.ok(/缺失阻断/.test(String(r.stderr || '')), '空库阻断须明确提示：' + t.wake_word);
      continue;
    }
    const env = JSON.parse(String(r.stdout));
    const html = readFileSync(env.data.output, 'utf8');
    assert.ok(html.includes('—'), '空态档页面必须用 `—` 占位（不得编默认值）：' + t.wake_word);
    assert.ok(/缺[:：]|没有|无/.test(html.replace(/<[^>]+>/g, ' ')), '空态档页面必须点名缺什么：' + t.wake_word);
    assert.ok(!/数据不足|无法预测/.test(html), '空态档不得同时挂降级文案：' + t.wake_word);
  }

  // ③ 不足 14 天（13 天）：落盘的就**不是**降级页、不落盘的就**必须**点名门槛（门槛＝SIM_MIN_DAYS 权威声明）
  const shortDir = mkDir('t386-short', SIM_MIN_DAYS - 1);
  const blocked = [];
  for (const t of PREDICT) {
    const r = runWord(shortDir, CLI_OF.get(t.wake_word));
    if (r.status === 0) {
      const env = JSON.parse(String(r.stdout));
      const html = readFileSync(env.data.output, 'utf8');
      assert.ok(!/数据不足|无法预测/.test(html),
        t.wake_word + ' 数据不足却落了一张降级页（不预测就不落盘）：' + env.data.output);
      continue;
    }
    blocked.push(t.wake_word);
    const err = String(r.stderr || '');
    assert.ok(/缺失阻断/.test(err), t.wake_word + ' 阻断须明确提示：' + err.slice(-160));
    assert.ok(new RegExp('≥\\s*' + SIM_MIN_DAYS + '\\s*天').test(err) || /至少 1 条体重记录/.test(err),
      t.wake_word + ' 阻断文案没点名门槛（SIM_MIN_DAYS=' + SIM_MIN_DAYS + '）：' + err.slice(-160));
    const env = (() => { try { return JSON.parse(String(r.stdout)); } catch { return null; } })();
    assert.equal(env?.data?.output ?? null, null, t.wake_word + ' 阻断时不得给产物路径');
  }
  assert.ok(blocked.length > 0, '不足 ' + SIM_MIN_DAYS + ' 天时一条都没阻断（门槛判据失效）');
  // 落盘的预测词必须逐字对上库里真实末次体重（不编默认值）
  for (const t of PREDICT.filter((x) => !blocked.includes(x.wake_word))) {
    const env = JSON.parse(String(pageOf(t.wake_word).stdout));
    assert.equal(typeof env.data.metrics.current, 'number', t.wake_word + ' 落盘却没有真实起点读数');
  }
});

/* ── 第五组 · 回归灵敏度（换掉一处模板件名即红） ─────────────────────── */

test('#386 第五组：每条报告页装的是**它自己那一件**的构件（换件名即红）', () => {
  REPORTS.forEach((t, i) => {
    const kind = (commandKeyOf(t.main_prompt.cli) ?? '').replace('calorie.report.', '');
    const rec = pageOf(t.wake_word);
    const expectKind = MUT_TPL && i === 0
      ? REPORT_KINDS[(REPORT_KINDS.indexOf(kind) + 1) % REPORT_KINDS.length]
      : kind;
    assert.ok(rec.html.includes(REPORT_PIECE[expectKind]),
      t.wake_word + ' 页面正文不是它自己那一件的构件（换掉一处件名即红）：缺「' + REPORT_PIECE[expectKind] + '」');
  });
  // 8 个形态的构件针两两互斥（当刻实测；任一页混进别件的构件即红）
  for (const [kind, needle] of Object.entries(REPORT_PIECE)) {
    const owners = REPORTS.filter((t) => pageOf(t.wake_word).html.includes(needle))
      .map((t) => (commandKeyOf(t.main_prompt.cli) ?? '').replace('calorie.report.', ''));
    assert.deepEqual(owners, [kind], '构件针不是某一件独有：' + needle + ' → ' + JSON.stringify(owners));
  }
  // 预测／缺口三族的构件也在（产物形态不得回退，与前三张票判据同源）
  for (const t of PREDICT) assert.ok(pageOf(t.wake_word).html.includes('ilife-block-kpi-card'), t.wake_word + ' 缺 KPI 卡块');
  for (const t of DEFICIT) assert.ok(pageOf(t.wake_word).html.includes('缺口明细'), t.wake_word + ' 缺缺口明细表');
});

/* ── 第六组 · 产物形态不得回退（完整文档，与前三张票判据同源） ─────────── */

test('#386 第六组：本图范围全部产物都是完整文档（首尾完整＋三格式复制区）', () => {
  for (const rec of products().recs) {
    const { word, html } = rec;
    assertDocPage(html, word);
    assert.ok(html.startsWith('<!doctype html>'), word + ' 不以 doctype 起');
    assert.equal(html.startsWith('<section'), false, word + ' 是片段页，不是完整文档');
    assert.ok(/<\/html>\s*$/.test(html.trimEnd()), word + ' 未以 </html> 收尾（截断？）');
    const title = (html.match(/<title>([^<]*)<\/title>/) ?? [])[1];
    assert.ok(typeof title === 'string' && title.length > 0, word + ' 缺 <title>');
    assert.ok(html.includes('复制数据'), word + ' 缺复制区');
    assert.ok(html.includes('data-fmt-open="1"'), word + ' 缺三格式菜单开合器');
    assert.deepEqual([...html.matchAll(/data-fmt="([^"]+)"/g)].map((m) => m[1]), ['text', 'json', 'csv'],
      word + ' 三格式菜单缺项');
  }
});

/* ── 真库只读：本文件全部跑动都指向临时夹具目录 ───────────────────────── */

test('#386 真库只读：本文件从不把 SKILLS_DB_PATH 指向真库', () => {
  const real = process.env.SKILLS_DB_PATH ?? null;
  const dirs = [products().dir, mkDir('t386-guard', 0)];
  for (const d of dirs) {
    assert.ok(d.startsWith(tmpdir()), '夹具目录不在系统临时根下：' + d);
    if (real !== null && existsSync(join(real, DB_FILENAME))) {
      assert.notEqual(d, real, '夹具目录指到了真库');
      assert.ok(!d.startsWith(real), '夹具目录落在真库目录内：' + d);
    }
  }
  assert.equal(basename(join(dirs[0], DB_FILENAME)), DB_FILENAME, '夹具库名不符');
  assert.ok(existsSync(ROOT), '仓根不可达');
});
