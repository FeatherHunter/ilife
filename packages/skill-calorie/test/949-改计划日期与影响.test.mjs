/** #949 · 改训练计划：`start_date` 日期体检 ＋ 「影响」按本次真改的字段派生 —— 票面验收用例。
 *
 * 来源＝报障单 #944 故障 7（票面＝`.scratch/bug-plan-preview/t4-final.md`）：
 *   ① `calorie.workout.plan-update` 的四个配置字段一视同仁、只挡空串（`write.ts` 的字段循环），
 *      `start_date` 唯它不调 `assertISO`（同件三处日期位都调）⇒ 任何字符串都进 `updateConfig` 落库；
 *      坏锚点让 `weekOfDate` 得 `NaN` ⇒ 按日期过滤恒空 ⇒ 页上落成「这一周没有训练安排」那句空态：
 *      **一个静默的坏锚点伪装成「计划没有内容」**。`calorie.workout.plan-set` 那条路同缺口
 *      （`planStore.ts` 的 `validatePlan` 整函数无 `start_date` 检查）。
 *   ② `calorie.view.plan-write-preview` 的「影响」那一格恒是「确认后写入计划库」，与字段无关；
 *      而「改训练计划」这条唤醒词要的正是「改完并提示影响（如改开始日期会影响周次计算）」
 *      （`src/triggers/scene-05-workout.ts` 的 `prompt_template` 原文）。
 *
 * 判据（逐条对应票面验收，每条都要能真红）。读数一律取**真交付出口**——spawn `dist/cli/cmd_read.js`，
 * 口径照 `test/566-result-title.test.mjs:51` 那条真跑（exit 码 ＋ envelope ＋ 落盘页四件一起断言）：
 *   ① 非法日期挡在写前：`plan-update --params '{"start_date":"2026-13-45"}'` ⇒ exit 2、
 *      stderr 含「start_date 非法（须 YYYY-MM-DD）」、**库里那一列一个字节没动**（没写库）；
 *      反面参照＝同一命令给合法日期必须写得进去（判据不恒真）；既有那条「不得为空」也不许放宽。
 *   ② 影响随字段变：`plan-write-preview` 分别带 `{"op":"update","title":…}` 与
 *      `{"op":"update","start_date":…}` 各交付一次，读两次落盘页「确认说明」块「影响」那一格
 *      ⇒ 两格文本不同、且 start_date 那次含「周次计算」；多字段同改＝一条一句并排；
 *      反面参照＝同页 `op=add-movement` 那次的影响仍是老话术（本票没顺手换别的 op）。
 *   ③ plan-set 同缺口收口：带坏 start_date 的整份计划 ⇒ exit 2（走既有的「计划校验未通过」）
 *      且库里不动；合法日期那次 ⇒ exit 0。
 *   ④ 变异自证（字串级，咬住「判据不许恒真」）：把坏日期那条读数改回现状（exit 0／库里落成坏值）
 *      ⇒ 判据①必红；把「影响」那一格换回旧话术 ⇒ 判据②必红；还原 ⇒ 必绿。
 *      真身变异（改源码 → 重编译 → 再跑）的两行机器读数记在 `docs/skills/skill-calorie/t949-证据.md`。
 *
 * 实跑配方＝临时库 `mkdtemp` ＋ `docs/research/t81-seed.mjs` 的 `seedFull()` ＋ 家目录指本次运行的
 * 临时目录（`test/helpers/config-test.mjs` 的 `calorieConfigDir`）＋ `freezeClock(SEED_TODAY)` 钉子进程的钟。
 * 注：票面写的 `SKILLS_DB_PATH`／`CALORIE_TODAY` 两个环境变量**已随 #675／#676 退役**
 * （`test/helpers/config-test.mjs:19-21`、`docs/research/t81-seed.mjs:204`），改用上面这两件；
 * 用例里断言到的日期一律**显式给参数**，不靠钉钟推。
 *
 * 跑法：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`，再
 * `node --test packages/skill-calorie/test/949-改计划日期与影响.test.mjs`；两条都经
 * `node tooling/run-locked.mjs --ticket 949 -- <命令>`。
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
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const PKG = join(ROOT, 'packages', 'skill-calorie');
const CLI = join(PKG, 'dist', 'cli', 'cmd_read.js');
const DB_FILENAME = 'calorie_data.db';

const { openDb } = await import(pathToFileURL(join(PKG, 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

/** 种子库里的计划开始日（`docs/research/t81-seed.mjs:145` 的 `workout_plan_config.start_date`，逐字
 *  `'2026-09-01'`）：**坏日期那次跑完，库里这一列必须还是它**——「没写库」这条断言拿它当对照物。 */
const SEED_START = '2026-09-01';
/** 坏锚点（票面用例给的那个）：格式不合 ⇒ 一律挡在写前。 */
const BAD_DATE = '2026-13-45';
/** 合法锚点（正面参照用）：与种子值不同，写进去看得出来。 */
const GOOD_DATE = '2026-09-07';

/** 票面点名的那两句影响话术（正文里逐字，不是「含某个词」）。 */
const IMPACT_TITLE = '只改标题，不影响周次与训练内容';
const IMPACT_DATE = '改开始日期会影响周次计算：按周次推出的日期整体平移，已经记过的运动记录不动';

/* ── 判据件（抽成函数：变异自证直接拿它们跑，不另抄一份） ── */

/** ① 坏日期必须挡在写前：exit 2 ＋ 报得出坏在哪 ＋ 库里那一列没动。 */
function assertBadDateRejected(run, what) {
  assert.equal(run.exit, 2,
    what + ' 应 exit 2（现状坏日期是 exit 0 且照样落库），实测 ' + run.exit + '（stderr：' + run.stderr + '）');
  assert.ok(run.stderr.includes('start_date 非法（须 YYYY-MM-DD）'),
    what + ' 的报错里没有「start_date 非法（须 YYYY-MM-DD）」：' + JSON.stringify(run.stderr));
  assert.equal(run.startDate, SEED_START,
    what + ' 竟然写进库了：库里 start_date=' + JSON.stringify(run.startDate));
}

/** ② 坏 start_date 的整份计划必须走既有的「计划校验未通过」：exit 2 ＋ 库里不动。 */
function assertBadPlanRejected(run, what) {
  assert.equal(run.exit, 2, what + ' 应 exit 2，实测 ' + run.exit + '（stderr：' + run.stderr + '）');
  assert.ok(run.stderr.includes('计划校验未通过'), what + ' 没走既有的「计划校验未通过」：' + JSON.stringify(run.stderr));
  assert.ok(run.stderr.includes('开始日期非法（须 YYYY-MM-DD）'),
    what + ' 的报错里点不出坏在哪个字段：' + JSON.stringify(run.stderr));
  assert.equal(run.startDate, SEED_START, what + ' 竟然写进库了：库里 start_date=' + JSON.stringify(run.startDate));
}

/** ④ 完整文档四断言（票面口径；片段形状必红、整页必绿）。 */
function assertFullDoc(html, what) {
  assert.ok(html !== null, what + ' 未落盘');
  assert.ok(html.startsWith('<!doctype html>'), what + ' 缺 doctype');
  assert.ok(html.includes('<meta charset='), what + ' 缺 charset');
  assert.ok(html.includes('<style'), what + ' 缺 style');
  assert.ok(html.includes('ilife-page'), what + ' 缺 ilife-page');
}

/** 页上「确认说明」块里「影响」那一格的正文（`renderListRows` 的左槽＋正文槽两件，口径见
 *  `packages/base-render/src/blocks.ts:901` 的行装配）。读不到即 null。 */
function impactOf(html) {
  const m = /<span class="ilife-block-list-rows-left">影响<\/span><span class="ilife-block-list-rows-main">([\s\S]*?)<\/span>/.exec(html ?? '');
  if (m === null) return null;
  return m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}

/* ── 真跑：临时种子库 ＋ 真交付出口（一条命令一份独立库副本，口径照 test/566-result-title.test.mjs） ── */

function mkTemplate() {
  const dir = mkdtempSync(join(tmpdir(), 't949-'));
  const db = openDb(join(dir, DB_FILENAME));
  seedFull(db);
  db.close();
  return dir;
}

/** 跑完那一刻的库内读数（对照物＝**脚本查库值**，不是页上文本）。 */
function startDateOf(dir) {
  const db = openDb(join(dir, DB_FILENAME));
  try {
    const row = db.prepare('SELECT start_date FROM workout_plan_config WHERE id = 1').get();
    return row === undefined ? null : row.start_date;
  } finally {
    db.close();
  }
}

/** 一条命令的读数：exit 码 ＋ stderr 尾 ＋ envelope ＋ 落盘页 ＋ 库内 start_date。 */
function runCli(name, key, params) {
  const runDir = join(TPL, name);
  mkdirSync(runDir, { recursive: true });
  copyFileSync(join(TPL, DB_FILENAME), join(runDir, DB_FILENAME));
  const out = join(runDir, name + '.html');
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params), '--html', out], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...homeEnvOf(calorieConfigDir(runDir)), ...freezeClock(SEED_TODAY) },
  });
  let env = null;
  try { env = JSON.parse(String(r.stdout || '').trim()); } catch { env = null; }
  return {
    name, key, runDir, exit: r.status, stderr: String(r.stderr || '').trim().slice(-400), env,
    output: env?.data?.output ?? null,
    file: existsSync(out) ? readFileSync(out, 'utf8') : null,
    startDate: startDateOf(runDir),
  };
}

/** `plan-set` 的整份计划（周非空、动作留空 ⇒ 除 start_date 外没有别的硬止会掺进读数）。 */
function planOf(startDate) {
  return {
    config: { title: 't949 计划', version: 'v1', description: '', start_date: startDate,
      user_level: '中手', available_equipment: [] },
    weeks: [{ week_number: 1, days: [{ day_of_week: 1, sessions: [{ session_label: '上肢', movements: [] }] }] }],
  };
}

const TPL = mkTemplate();
const RUNS = {
  badUpdate: runCli('bad-update', 'calorie.workout.plan-update', { start_date: BAD_DATE }),
  goodUpdate: runCli('good-update', 'calorie.workout.plan-update', { start_date: GOOD_DATE }),
  emptyDate: runCli('empty-date', 'calorie.workout.plan-update', { start_date: '' }),
  emptyTitle: runCli('empty-title', 'calorie.workout.plan-update', { title: '' }),
  prevTitle: runCli('prev-title', 'calorie.view.plan-write-preview', { op: 'update', title: '示例改名' }),
  prevDate: runCli('prev-date', 'calorie.view.plan-write-preview', { op: 'update', start_date: GOOD_DATE }),
  prevMulti: runCli('prev-multi', 'calorie.view.plan-write-preview', { op: 'update', title: '示例改名', start_date: GOOD_DATE }),
  prevAdd: runCli('prev-add', 'calorie.view.plan-write-preview', { op: 'add-movement', week: 1, dayOfWeek: 3, movement: { name: '俯卧撑' } }),
  badSet: runCli('bad-set', 'calorie.workout.plan-set', { plan: planOf(BAD_DATE) }),
  goodSet: runCli('good-set', 'calorie.workout.plan-set', { plan: planOf(GOOD_DATE) }),
};

/* ── ① 非法日期挡在写前（＋「非空字符串」那条不许放宽） ── */

test('#949 ① 坏 start_date 挡在写前：exit 2 ＋ 报字段名 ＋ 库里一个字节没动', () => {
  assertBadDateRejected(RUNS.badUpdate, '`plan-update` 带 ' + BAD_DATE);
  /* 反面参照（判据不恒真）：合法日期那条**必须写得进去**——不然「一律挡」也能过上面这条。 */
  assert.equal(RUNS.goodUpdate.exit, 0,
    '`plan-update` 带合法日期应 exit 0，实测 ' + RUNS.goodUpdate.exit + '（stderr：' + RUNS.goodUpdate.stderr + '）');
  assert.ok(RUNS.goodUpdate.env !== null, '成功那次必须解析得出 envelope');
  assert.equal(RUNS.goodUpdate.startDate, GOOD_DATE,
    '合法日期那次没落库：库里 start_date=' + JSON.stringify(RUNS.goodUpdate.startDate));
  /* 既有那条「不得为空」一格不许放宽（本票只加严）：start_date 与 title 各跑一次。 */
  assert.equal(RUNS.emptyDate.exit, 2, '`start_date` 空串应 exit 2，实测 ' + RUNS.emptyDate.exit);
  assert.ok(RUNS.emptyDate.stderr.includes('start_date 不得为空'),
    '空串那条的报错变了：' + JSON.stringify(RUNS.emptyDate.stderr));
  assert.equal(RUNS.emptyTitle.exit, 2, '`title` 空串应 exit 2，实测 ' + RUNS.emptyTitle.exit);
  assert.ok(RUNS.emptyTitle.stderr.includes('title 不得为空'),
    '空串那条的报错变了：' + JSON.stringify(RUNS.emptyTitle.stderr));
  assert.equal(RUNS.emptyTitle.startDate, SEED_START, '空串那次也不许写库');
});

/* ── ② 影响随字段变，且话术逐字是票面给的那几句 ── */

test('#949 ② 「影响」按本次真改的字段派生：改标题与改开始日期两格不同', () => {
  for (const r of [RUNS.prevTitle, RUNS.prevDate, RUNS.prevMulti, RUNS.prevAdd]) {
    const what = '「' + r.name + '」`' + r.key + '`';
    assert.equal(r.exit, 0, what + ' 应 exit 0，实测 ' + r.exit + '（stderr：' + r.stderr + '）');
    assert.ok(r.env !== null, what + ' 没解析出 envelope');
    assert.ok(typeof r.output === 'string' && existsSync(r.output), what + ' 产物没落盘：' + r.output);
    assertFullDoc(r.file, what);
    assert.ok(impactOf(r.file) !== null, what + ' 读不到「确认说明」块的「影响」那一格');
  }
  assert.equal(impactOf(RUNS.prevTitle.file), IMPACT_TITLE, '改标题那次的影响不是票面那句');
  assert.equal(impactOf(RUNS.prevDate.file), IMPACT_DATE, '改开始日期那次的影响不是票面那句');
  assert.notEqual(impactOf(RUNS.prevTitle.file), impactOf(RUNS.prevDate.file),
    '两格文本相同 ⇒ 「影响」没随字段变（改前就是恒定的「确认后写入计划库」）');
  assert.ok(impactOf(RUNS.prevDate.file).includes('周次计算'),
    '改开始日期那次的影响里没有「周次计算」：' + JSON.stringify(impactOf(RUNS.prevDate.file)));
  assert.ok(!impactOf(RUNS.prevTitle.file).includes('周次计算'),
    '没改 start_date 却出现了周次那句：' + JSON.stringify(impactOf(RUNS.prevTitle.file)));
  /* 多字段同改＝一条一句并排（两句都在），且与单字段那两格都不同。 */
  const multi = impactOf(RUNS.prevMulti.file);
  assert.ok(multi.includes(IMPACT_TITLE) && multi.includes(IMPACT_DATE),
    '多字段同改没把两句话并排：' + JSON.stringify(multi));
  /* 那句话是**用户看得见**的（不是只活在复制载荷里）。 */
  for (const r of [RUNS.prevTitle, RUNS.prevDate, RUNS.prevMulti]) {
    assert.ok(visibleText(stripCopyPayload(r.file)).includes(impactOf(r.file)),
      '「' + r.name + '」的影响只在复制载荷里、没进可见文本');
  }
  /* 反面参照：别的 op 的影响还是老话术（本票只动 `update` 那一条，没顺手换别处）。 */
  assert.equal(impactOf(RUNS.prevAdd.file), '确认后写入计划库',
    '`add-movement` 的影响被顺手改了（不在本票写集）：' + JSON.stringify(impactOf(RUNS.prevAdd.file)));
});

/* ── ③ plan-set 同缺口收口 ── */

test('#949 ③ plan-set 带坏 start_date 走「计划校验未通过」exit 2，合法日期仍写得进去', () => {
  assertBadPlanRejected(RUNS.badSet, '`plan-set` 带 ' + BAD_DATE);
  assert.equal(RUNS.goodSet.exit, 0,
    '`plan-set` 带合法日期应 exit 0，实测 ' + RUNS.goodSet.exit + '（stderr：' + RUNS.goodSet.stderr + '）');
  assert.ok(RUNS.goodSet.env !== null, '成功那次必须解析得出 envelope');
  assert.equal(RUNS.goodSet.startDate, GOOD_DATE,
    '合法日期那次没落库：库里 start_date=' + JSON.stringify(RUNS.goodSet.startDate));
});

/* ── ④ 变异自证（字串级）：判据咬得住改坏的那两处 ── */

test('#949 ④ 变异自证：坏日期读成现状必红、影响换回旧话术必红，还原必绿', () => {
  let red = 0;
  /* 变异①：把「坏日期被挡」那条读数改回**现状**（exit 0、库里落成坏值）⇒ 判据①两半各红一次。 */
  assert.throws(() => assertBadDateRejected({ ...RUNS.badUpdate, exit: 0 }, '变异①'),
    /应 exit 2/, '把 exit 读成 0 后判据①没红（exit 码那一半是恒真的）');
  assert.throws(() => assertBadDateRejected({ ...RUNS.badUpdate, startDate: BAD_DATE }, '变异①'),
    /竟然写进库了/, '把库内值读成坏日期后判据①没红（查库那一半是恒真的）');
  red += 2;
  assertBadDateRejected(RUNS.badUpdate, '还原'); // 还原（真读数）必绿
  /* 变异②：把「影响」那一格换回本票改前的字面量 ⇒ 判据②必红。 */
  const reverted = RUNS.prevDate.file.replace(IMPACT_DATE, '确认后写入计划库');
  assert.notEqual(reverted, RUNS.prevDate.file, '变异②没落上（产物里找不到那句影响话术）');
  assert.notEqual(impactOf(reverted), IMPACT_DATE, '换回旧话术后判据②没红（话术断言是恒真的）');
  assert.ok(!impactOf(reverted).includes('周次计算'), '换回旧话术后仍含「周次计算」？');
  red += 1;
  assert.equal(impactOf(RUNS.prevDate.file), IMPACT_DATE, '还原（原产物）必绿');
  /* 反面参照同判：判据④自己不许恒真——拿**别的 op** 的那一格去套 `update` 的期望值必须不等。 */
  assert.notEqual(impactOf(RUNS.prevAdd.file), IMPACT_DATE, '两个 op 的影响竟然判等 —— 判据②是恒真的');
  console.log('T949-MUT 字串级：坏日期读成现状 红=2、影响换回旧话术 红=1；还原绿=2（变异次数=' + red + '）');
});

test('#949 判据摘要', () => {
  const cells = [
    RUNS.badUpdate.stderr.includes('start_date 非法（须 YYYY-MM-DD）') ? '坏日期挡住' : '坏日期没挡住',
    impactOf(RUNS.prevTitle.file) === IMPACT_TITLE ? '改标题话术对' : '改标题话术不对',
    impactOf(RUNS.prevDate.file) === IMPACT_DATE ? '改日期话术对' : '改日期话术不对',
    RUNS.badSet.stderr.includes('计划校验未通过') ? 'plan-set 收口' : 'plan-set 没收口',
  ];
  console.log('T949-RESULT 四条读数：' + cells.join('／') + '（坏日期 exit=' + RUNS.badUpdate.exit
    + '、合法日期 exit=' + RUNS.goodUpdate.exit + '、plan-set 坏日期 exit=' + RUNS.badSet.exit + '）');
});
