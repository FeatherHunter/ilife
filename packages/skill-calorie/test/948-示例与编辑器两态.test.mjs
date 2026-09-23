/** #948 · 报障单 #944 故障 6／9 的票面验收用例（「AI 看得见的那一面」两件事）。
 *
 * 来源＝票面 `.scratch/bug-plan-preview/t3-final.md`：
 *   ① **示例与冻结表同口径**（故障 6）：`calorie.view.plan` 的代表唤醒词「看计划概览」在冻结表
 *      （`src/triggers/scene-05-workout.ts:12`）与路由（`src/workout/routes.ts:21`）里都定它**不带参数**；
 *      命令声明（`src/workout/commands.ts`）原先却带 `--params '{"date":"今日"}'`（那是别的词才有的窄口径，
 *      照抄即得 0 场 0 动作的窄页 ⇒ 读者误判「库里是空的」），并经生成链印进 SKILL.md 速查表「例」列。
 *   ② **编辑器两态**（故障 9①）：`calorie.view.plan-wizard` 要能被「不给 `plan`＝空模板」与
 *      「给部分 `plan`＝部分预填」两种形态调起来，两种都 exit 0、都不写库。
 *   ③ **可落库载荷**（故障 9②）：交付页那颗复制载荷必须是**能直接执行的命令串**——载荷文本去空白后
 *      逐字等于 `calorie.workout.plan-set` 的命令串，把该串原样执行 ⇒ exit 0、库内值＝串里的值。
 *
 * 判据（逐条对应票面「件内三条读数」，每条都要能真红；变异两行机器读数见 `docs/skills/skill-calorie/t948-证据.md`）：
 *   ① 速查表该键那一行＝`calorie-cmd-read calorie.view.plan`（与冻结表的 `cli` 逐字同、不含 `--params`）；
 *      反面参照＝同一行若回到带 `--params` 的窄口径即红。**冻结表只读不写**（它是权威）。
 *   ② 不带 `plan` ⇒ exit 0 且 `metrics.weeks = 0`；带部分 `plan` ⇒ `metrics.weeks` ＝所给周数，
 *      且页面真的按部分预填（标题上屏）、没给的留空（空模板那支不出训练段）。
 *   ③ 载荷（预览块 ＋ 复制按钮 `data-t`）**去空白后逐字等于**同一条命令串；原样执行 ⇒ exit 0；
 *      库内 `workout_plan_config`／`workout_plans` 的值＝串里的值（口径照 `test/t366-复制执行闭环.test.mjs`）。
 *
 * 断言打在**真交付出口**上（#702）：spawn `dist/cli/cmd_read.js`，断 exit 码 ＋ envelope ＋ 落盘页文本；
 * 库内读数只作对照（用 `dist/index.js` 的 `openDb` 读回来），不直调内部件。
 *
 * 实跑配方＝临时库 `mkdtemp` ＋ 种子 `docs/research/t81-seed.mjs` 的 `seedFull()` ＋ 家目录指本次运行的
 * 临时目录（`test/helpers/config-test.mjs` 的 `calorieConfigDir`）＋ `freezeClock(SEED_TODAY)` 钉子进程的钟。
 * 注：票面与派单早期写的 `CALORIE_TODAY`／`SKILLS_DB_PATH` 两个环境变量**已随 #675／#676 退役**，
 * 一律改走上面这两件；用例里的日期全部显式给参数，不靠钉钟推。
 *
 * 跑法：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`，再
 *   `node --test packages/skill-calorie/test/948-示例与编辑器两态.test.mjs`；两条都经
 *   `node tooling/run-locked.mjs --ticket 948 -- <命令>`。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

import { calorieConfigDir, configTestBase, freezeClock, homeEnvOf } from './helpers/config-test.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const PKG = join(ROOT, 'packages', 'skill-calorie');
const CLI = join(PKG, 'dist', 'cli', 'cmd_read.js');
const DB_FILENAME = 'calorie_data.db';

const { openDb } = await import(pathToFileURL(join(PKG, 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);
const { SCENE_05_WORKOUT } = await import(pathToFileURL(join(PKG, 'dist', 'triggers', 'scene-05-workout.js')).href);
const { WORKOUT_COMMANDS } = await import(pathToFileURL(join(PKG, 'dist', 'workout', 'commands.js')).href);
const { PLAN_SET_COMMAND_TEMPLATE } = await import(pathToFileURL(join(PKG, 'dist', 'workout', 'planEditorRuntime.js')).href);

/** 故障 6 的两个键（示例住在命令声明里，两处读的是同一份事实）。 */
const KEY_PLAN = 'calorie.view.plan';
const KEY_EDITOR = 'calorie.view.plan-wizard';
/** 故障 9③ 的写命令键。 */
const KEY_SET = 'calorie.workout.plan-set';
/** 本次那条命令的时间锚点（显式给参数，不靠钉钟推；与种子的 2026-09-01 不同，写进去看得出来）。 */
const START_DATE = '2026-09-07';
/** 部分预填那支给的标题（页上要看得见它，证明确实按所给的部分预填了）。 */
const PARTIAL_TITLE = '减脂4周';
/** 空模板那支与部分预填那支都不许落库：跑完库内 `total_weeks` 必须还是种子那份（4 周）。 */
const SEED_WEEKS = 4;

/* ── 期望值：手写在下面，不拿实现输出当期望 ── */

/** 故障 6 的期望示例（冻结表 `scene-05-workout.ts:12` 的 `main_prompt.cli` 逐字；**不带参数**）。 */
const WANT_PLAN_EXAMPLE = 'calorie-cmd-read calorie.view.plan';

/** 本次编辑器状态下那条落库命令的 `plan` 参数（＝`T948_PLAN`，逐字手写）。
 *  一条命令一行，故 `sets` 在 JSON 里必须写成一行（不折行）——折行会让命令串不是单行。 */
const WANT_PLAN_BODY = '{"config":{"title":"t948 计划","start_date":"2026-09-07","user_level":"中手","available_equipment":["瑜伽垫"]},'
  + '"weeks":[{"week_number":1,"days":[{"day_of_week":1,"sessions":[{"session_label":"上午","movements":[{"name":"俯卧撑","part":"胸","type":"力量","sets":[{"reps":8,"weight":60,"unit":"kg"}]}]}]}]}]}';
/** 期望命令串：`calorie-cmd-read <写命令> --params '<JSON>'`（拼法与 `shared/writeParts.ts` 的 `commandLine` 同形）。 */
const WANT_SET_COMMAND = "calorie-cmd-read " + KEY_SET + " --params '{\"plan\":" + WANT_PLAN_BODY + "}'";
/** 模板里那个标记的名字（`PLAN_SET_COMMAND_TEMPLATE` 的约定）。 */
const PLAN_MARKER = '__PLAN__';

/** 部分预填那支给的 `plan`（只给标题与起日：第一周没给 ⇒ 空模板那一支的形态）。 */
const PARTIAL_PLAN = { config: { title: PARTIAL_TITLE, start_date: START_DATE } };
/** 本次测试那道**真的会落库**的计划（一条命令、一天、一个动作）。 */
const T948_PLAN = {
  config: { title: 't948 计划', start_date: START_DATE, user_level: '中手', available_equipment: ['瑜伽垫'] },
  weeks: [{
    week_number: 1,
    days: [{
      day_of_week: 1,
      sessions: [{
        session_label: '上午',
        movements: [{ name: '俯卧撑', part: '胸', type: '力量', sets: [{ reps: 8, weight: 60, unit: 'kg' }] }],
      }],
    }],
  }],
};

/* ── 机械件 ── */

const TPL = mkdtempSync(join(tmpdir(), 't948-tpl-'));
{
  const db = openDb(join(TPL, DB_FILENAME));
  seedFull(db);
  db.close();
}

/** 一条命令一份独立库副本（真库零写入）；`seed=true` 拷种子，`false` 建空库（给「原样执行」那条用）。 */
function mkRun(name, seed = true) {
  const dir = join(TPL, name);
  mkdirSync(dir, { recursive: true });
  const dbPath = join(dir, DB_FILENAME);
  if (seed) copyFileSync(join(TPL, DB_FILENAME), dbPath);
  else openDb(dbPath).close();
  return dir;
}

/** 跑一条真出口命令：exit 码 ＋ envelope ＋ 落盘页文本。 */
function runCli(dir, key, params) {
  const out = join(dir, key + '.html');
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params), '--html', out], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...homeEnvOf(calorieConfigDir(dir)), ...freezeClock(SEED_TODAY) },
  });
  let env = null;
  try { env = JSON.parse(String(r.stdout || '').trim()); } catch { env = null; }
  const output = env?.data?.output ?? null;
  const file = output !== null && existsSync(output) ? output : (existsSync(out) ? out : null);
  return {
    exit: r.status, stderr: String(r.stderr || '').trim().slice(-500), env,
    output, html: file === null ? null : readFileSync(file, 'utf8'),
  };
}

/** 把页上那段载荷文本原样当一条命令跑（分词口径照 `test/t366-复制执行闭环.test.mjs`：引号内的空格不切）。 */
function execCommandString(dir, cmd) {
  const toks = tokenize(cmd);
  assert.equal(toks[0], 'calorie-cmd-read', '命令串首个 token 应是出口名：' + cmd);
  assert.ok(toks.length >= 4 && toks[2] === '--params', '命令串应带 --params 段：' + cmd);
  const r = spawnSync(process.execPath, [CLI, ...toks.slice(1)], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...homeEnvOf(calorieConfigDir(dir)), ...freezeClock(SEED_TODAY) },
  });
  let env = null;
  try { env = JSON.parse(String(r.stdout || '').trim()); } catch { env = null; }
  return { exit: r.status, stderr: String(r.stderr || '').trim().slice(-500), env };
}

/** 命令串分词（引号内的空格不切）。 */
function tokenize(cmd) {
  const out = [];
  let cur = '';
  let q = null;
  for (const ch of String(cmd)) {
    if (q !== null) { if (ch === q) q = null; else cur += ch; }
    else if (ch === "'" || ch === '"') q = ch;
    else if (ch === ' ') { if (cur !== '') out.push(cur); cur = ''; }
    else cur += ch;
  }
  if (cur !== '') out.push(cur);
  return out;
}

/** 反转义（复制区与 `data-t` 属性里的实体）。 */
function unesc(s) {
  return String(s)
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** 去掉全部空白之后的形态（比较口径之一）。 */
const nows = (s) => String(s).replace(/\s+/g, '');

/** 复制按钮的载荷（点了复制的就是它）：`data-action-id` 冻结 id ＋ `data-t` 承载文本。 */
function copyPayload(html) {
  const m = /<button[^>]* data-action-id="ilife-help-copy-prompt"[^>]* data-t="([^"]*)"/.exec(html ?? '');
  assert.ok(m, '页面应有「复制指令」按钮（`data-action-id="ilife-help-copy-prompt"` ＋ `data-t` 承载文本）');
  return unesc(m[1]);
}

/** 页底预览块的文本（`renderPreBlock` 的 B-06 指令块那个 `<pre>`；页上只有这一个）。 */
function copyPreviewText(html) {
  const m = /<pre class="ilife-block-pre-block-code">([\s\S]*?)<\/pre>/.exec(html ?? '');
  assert.ok(m, '页面应有复制区预览块（`ilife-block-pre-block-code`）');
  return unesc(m[1]);
}

/** 页面里那条落库命令的模板（随状态序列化进 `#pe-state`；页内运行时只换标记，不自己拼命令名）。 */
function setCommandTemplateOf(html) {
  const m = /<script type="application\/json" id="pe-state">([\s\S]*?)<\/script>/.exec(html ?? '');
  assert.ok(m, '页面应有状态块 `#pe-state`（编辑器运行时从它读回状态）');
  const state = JSON.parse(m[1].replace(/\\u003c/g, '<'));
  assert.equal(typeof state.setCommand, 'string', '状态里应带 setCommand（那条命令的模板）');
  return state.setCommand;
}

/** 按页内运行时的同一换法把模板换成载荷（标记两侧各取一次；不用 String.replace，免得 `$` 被当替换模式）。 */
function renderTemplate(tpl, body) {
  const at = tpl.indexOf(PLAN_MARKER);
  assert.ok(at >= 0, '模板里应有标记 ' + PLAN_MARKER + '：' + tpl);
  return tpl.slice(0, at) + body + tpl.slice(at + PLAN_MARKER.length);
}

/** 库内读数（对照物＝**脚本查库值**，不是页上文本）。 */
function readPlan(dir) {
  const db = openDb(join(dir, DB_FILENAME));
  try {
    const cfg = db.prepare('SELECT title, total_weeks, start_date FROM workout_plan_config WHERE id = 1').get();
    const rows = db.prepare('SELECT week_number, day_of_week, session_label, movements FROM workout_plans ORDER BY week_number, day_of_week, session_index').all();
    return {
      title: cfg === undefined ? null : cfg.title,
      totalWeeks: cfg === undefined ? null : cfg.total_weeks,
      startDate: cfg === undefined ? null : cfg.start_date,
      rows: rows.map((r) => ({ ...r, movements: JSON.parse(r.movements || '[]') })),
    };
  } finally {
    db.close();
  }
}

/** 一条命令声明（按票面点名的路径从**声明正本**取；不读 SKILL.md，那是派生件）。 */
function declOf(key) {
  const hit = WORKOUT_COMMANDS.find((c) => c.key === key);
  assert.ok(hit !== undefined, '命令声明里应有 ' + key + '：' + WORKOUT_COMMANDS.map((c) => c.key).join('、'));
  return hit;
}

/** 冻结表里该唤醒词那条记录（故障 6 的权威源）。 */
function frozenOf(wakeWord) {
  const hit = SCENE_05_WORKOUT.find((t) => t.wake_word === wakeWord);
  assert.ok(hit !== undefined, '冻结表里应有唤醒词「' + wakeWord + '」');
  return hit;
}

/* ── 判据件（抽成函数：变异自证直接拿它们跑，不另抄一份） ── */

/** ① 示例与冻结表同形：声明里的 example ＝冻结表的 `cli`（逐字），且不含 `--params`。 */
function assertExampleMatchesFrozen(example, frozenCli) {
  assert.equal(example, frozenCli,
    '示例必须与冻结表同形（冻结表是权威）；实测 example=' + JSON.stringify(example) + ' 冻结表 cli=' + JSON.stringify(frozenCli));
  assert.ok(!example.includes('--params'),
    '代表词「看计划概览」在冻结表里不带参数，示例也不许带：' + example);
}

/** ② 两态：`metrics.weeks` ＝ 所给周数（空模板 0、部分预填 1），且都不写库。 */
function assertWeeks(run, want, what) {
  assert.equal(run.exit, 0, what + ' 必须 exit 0，stderr=' + run.stderr);
  assert.ok(run.html !== null && run.html !== '', what + ' 必须落盘整页');
  const weeks = run.env?.data?.metrics?.weeks;
  assert.equal(weeks, want, what + ' 的 metrics.weeks 应＝' + want + '（空模板＝0／部分预填＝所给周数），实测 ' + JSON.stringify(weeks));
}

/** ③ 复制载荷＋预览块两处都逐字等于同一条命令串。 */
function assertCopyIsCommand(html, want, what) {
  const payload = copyPayload(html);
  const preview = copyPreviewText(html);
  assert.equal(nows(payload), nows(want), what + ' 复制载荷（去空白）应逐字等于命令串；实测=' + JSON.stringify(payload));
  assert.equal(payload, want, what + ' 复制载荷连空白也应逐字相同（命令串是单行）');
  assert.equal(preview, want, what + ' 预览块文本应等于同一条命令串；实测=' + JSON.stringify(preview));
  assert.ok(payload.startsWith('calorie-cmd-read ' + KEY_SET + ' '),
    what + ' 载荷应是可执行的命令串（不是自然语言／不是占位串）：' + payload);
  console.log('T948-CMD ' + what + ' 逐字相等=true len=' + payload.length);
  return payload;
}

/* ── ① 故障 6：示例与冻结表同口径 ── */

test('#948 ① 示例：calorie.view.plan 的 example 与冻结表逐字同形（不带参数）', () => {
  const frozen = frozenOf('看计划概览');
  const frozenCli = String(frozen.main_prompt.cli);
  // 权威源先自证：冻结表里这一条就是「不带参数」的形态（本票只改声明，冻结表一行不动）
  assert.equal(frozenCli, WANT_PLAN_EXAMPLE, '冻结表这条 cli 应是不带参数的形态：' + frozenCli);
  assertExampleMatchesFrozen(declOf(KEY_PLAN).example, frozenCli);
  console.log('T948-EX1 示例=冻结表=' + JSON.stringify(WANT_PLAN_EXAMPLE));
});

test('#948 ① 速查表那一行（派生件）与声明同形：不含 --params', () => {
  const skill = readFileSync(join(PKG, 'SKILL.md'), 'utf8');
  const row = skill.split('\n').find((l) => l.includes('| ' + KEY_PLAN + ' |'));
  assert.ok(row !== undefined, 'SKILL.md 速查表里应有 ' + KEY_PLAN + ' 那一行');
  const cmd = [...row.matchAll(/`([^`]*)`/g)].map((m) => m[1]).find((c) => c.startsWith('calorie-cmd-read'));
  assert.ok(cmd !== undefined, '该行的「例」列应是一条命令：' + row);
  assert.equal(cmd, WANT_PLAN_EXAMPLE, '速查表「例」列应与声明／冻结表同形：' + cmd);
  console.log('T948-EX2 速查表例=' + JSON.stringify(cmd));
});

/* ── ② 故障 9①：编辑器两态 ── */

test('#948 ② 空模板：不带 plan ⇒ exit 0 且 metrics.weeks = 0（不写库）', () => {
  const dir = mkRun('wizard-empty');
  const run = runCli(dir, KEY_EDITOR, {});
  assertWeeks(run, 0, '不带 plan 的编辑器页');
  assert.ok(run.html.includes('还没有训练计划'), '空模板那支页上应出空态（还没有训练计划）');
  assert.equal(readPlan(dir).totalWeeks, SEED_WEEKS, '出页不许写库：库里应还是种子那份');
  console.log('T948-W1 空模板 exit=0 weeks=0 写库=0');
});

test('#948 ② 部分预填：只给标题 ⇒ metrics.weeks = 0（没给周数就是空模板）＋标题上屏', () => {
  const dir = mkRun('wizard-partial-title');
  const run = runCli(dir, KEY_EDITOR, { plan: PARTIAL_PLAN });
  assertWeeks(run, 0, '只给标题的编辑器页');
  assert.ok(run.html.includes(PARTIAL_TITLE), '页上应看得见所给的标题（真的按部分预填）：' + PARTIAL_TITLE);
  assert.equal(readPlan(dir).totalWeeks, SEED_WEEKS, '出页不许写库');
  console.log('T948-W2 只给标题 exit=0 weeks=0 标题上屏=1');
});

test('#948 ② 部分预填：只给第 1 周 ⇒ metrics.weeks = 1 且标题上屏（不写库）', () => {
  const dir = mkRun('wizard-partial-week');
  const run = runCli(dir, KEY_EDITOR, { plan: { ...PARTIAL_PLAN, weeks: T948_PLAN.weeks } });
  assertWeeks(run, 1, '只给第 1 周的编辑器页');
  assert.ok(run.html.includes(PARTIAL_TITLE), '页上应看得见所给的标题');
  assert.ok(run.html.includes('俯卧撑'), '页上应看得见所给那周的动作');
  assert.equal(readPlan(dir).totalWeeks, SEED_WEEKS, '出页不许写库');
  console.log('T948-W3 给第1周 exit=0 weeks=1 动作上屏=1');
});

/* ── ③ 故障 9②：载荷＝可执行命令串，原样执行 exit 0，库内值＝串里的值 ── */

test('#948 ③ 载荷：去空白后逐字等于命令串（预览块＋复制按钮两处）', () => {
  const dir = mkRun('wizard-cmd');
  const run = runCli(dir, KEY_EDITOR, { plan: T948_PLAN });
  assertWeeks(run, 1, '带整份 plan 的编辑器页');
  const cmd = assertCopyIsCommand(run.html, WANT_SET_COMMAND, '计划编辑器');
  // 页内那条命令**必须与 TS 侧同一出处**：模板逐字等于 `PLAN_SET_COMMAND_TEMPLATE`
  assert.equal(setCommandTemplateOf(run.html), PLAN_SET_COMMAND_TEMPLATE,
    '页内模板应逐字等于 TS 侧那条 PLAN_SET_COMMAND_TEMPLATE');
  assert.equal(renderTemplate(PLAN_SET_COMMAND_TEMPLATE, WANT_PLAN_BODY), WANT_SET_COMMAND,
    '按同一换法还原出来的串应等于手写的期望串（防模板与期望漂移）');
  assert.equal(cmd, WANT_SET_COMMAND, '载荷就等于这条串');
  console.log('T948-P1 载荷=命令串 len=' + cmd.length + ' 模板同源=1');
});

test('#948 ③ 原样执行该串 ⇒ exit 0，库内值＝串里的值', () => {
  const pageDir = mkRun('wizard-cmd-exec');
  const run = runCli(pageDir, KEY_EDITOR, { plan: T948_PLAN });
  const cmd = assertCopyIsCommand(run.html, WANT_SET_COMMAND, '计划编辑器');
  // 落库那条命令跑在一份**空库**上：库里那份计划只能来自这条串，读数不会与种子撞车
  const execDir = mkRun('exec-empty', false);
  const w = execCommandString(execDir, cmd);
  assert.equal(w.exit, 0, '原样执行该串必须 exit 0：' + w.stderr);
  assert.equal(w.env?.key, KEY_SET, '串里的键就是那条会改数据库的命令');
  const got = readPlan(execDir);
  assert.equal(got.title, T948_PLAN.config.title, '库内标题＝串里的值');
  assert.equal(got.startDate, START_DATE, '库内 start_date＝串里的值');
  assert.equal(got.totalWeeks, 1, '库内 total_weeks＝串里 weeks 的条数');
  assert.deepEqual(got.rows.map((r) => ({ w: r.week_number, d: r.day_of_week, s: r.session_label, m: r.movements })),
    T948_PLAN.weeks[0].days.map((d) => ({
      w: 1, d: d.day_of_week, s: d.sessions[0].session_label, m: d.sessions[0].movements,
    })), '库内周次／星期／时段／动作逐字段等于串里的值（不是页面别处的值）');
  console.log('T948-P2 原样执行 exit=0 周=' + got.totalWeeks + ' 行=' + got.rows.length
    + ' 标题=' + JSON.stringify(got.title));
});

test('#948 ③ 载体自证：复制按钮与预览块都在页上（判据不恒真）', () => {
  const dir = mkRun('wizard-carrier');
  const run = runCli(dir, KEY_EDITOR, { plan: T948_PLAN });
  assert.ok(run.html.includes('data-action-id="ilife-help-copy-prompt"'), '页上应有一颗「复制指令」按钮');
  assert.ok(run.html.includes('ilife-block-pre-block-code'), '页上应有一个复制区预览块');
  assert.ok(statSync(join(dir, DB_FILENAME)).size > 0, '本次跑用的库副本应在场');
  console.log('T948-CARRIER 按钮=1 预览块=1');
});
