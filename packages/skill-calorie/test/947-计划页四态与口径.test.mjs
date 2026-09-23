/** #947 · 「看计划」页四态出页 ＋ 同页 KPI 同口径 —— 票面验收用例。
 *
 * 来源＝报障单 #944 故障 4／5（票面＝`.scratch/bug-plan-preview/t2-final.md`）：
 *   ① 四态被并成一句：「越界」（`date` 落在计划范围之后）与「未开始」（落在起日之前）都被渲染成
 *      「这一周没有训练安排（换一周看，或先定训练计划）」，而那句许诺的「换一周看」（两级页签）与
 *      「先定训练计划」（入口）**随切片一起消失**（改前实测：`data-wk=` 计数 0）。
 *   ② 同页 KPI 不同口径：「总场次／总动作」取过滤后、「总周数」取配置全量，三张卡一律冠「总」
 *      ⇒ 现场出现 `总场次 0 ／ 总动作 0 ／ 总周数 4`，被读成空壳计划。
 *
 * 判据（每条都要能真红；读数一律取**真交付出口**——spawn `dist/cli/cmd_read.js`，口径照
 * `test/566-result-title.test.mjs:51` 那条真跑：exit 码 ＋ envelope ＋ 落盘页正文一起断言）：
 *   ① 越界态（`date=2026-09-23`，计划 2026-08-10 起 4 周 ⇒ 末日 2026-09-06）：页上出现「计划已结束」
 *      且 `data-wk=` 计数 ≥4（周区块照出 ⇒ 周次页签与星期页签都点得到）；红＝改前的 `0` 与那句
 *      「这一周没有训练安排」。
 *   ② 未开始态（`date=2026-08-09`）：出现「计划还没开始」且 `data-wk=` 计数 ≥4。
 *   ③ 反向锁：**不带参数**那一页的三张读数＝100 场／264 个／4 周有安排——与票面记的现状逐字一致；
 *      这一页不许为越界态好看而动（四态改动全部落在带日期的那一支）。
 *   ④ 口径一致：同一次真跑的「总场次」在带参与不带参两页上相等，且与 `data.metrics.planSessions`
 *      相等（默认口径＝场次与动作取**全量**、与「总周数」同源；另用一张卡表达「本周」）。
 *   ⑤ 另两态各自出页、各自有点得到的出口：本日无课（`date=2026-09-02`，那天周三无课但第 1 周有课）
 *      与真无计划（配置在、一行场次都没有）。
 *
 * 夹具＝临时库 `mkdtemp` ＋ `docs/research/t81-seed.mjs` 的 `seedFull()` ＋ `test/helpers/config-test.mjs`
 * 的 `calorieConfigDir()`（家目录隔离，`SKILLS_DB_PATH`／`CALORIE_TODAY` 已随 #675／#676 退役）＋
 * `freezeClock(SEED_TODAY)` 钉住子进程的钟。用例里断言到的日期一律**显式给参数**，不靠钉钟推。
 *
 * 跑法：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`，再
 * `node --test packages/skill-calorie/test/947-计划页四态与口径.test.mjs`；两条都经
 * `node tooling/run-locked.mjs --ticket 947 -- <命令>`。
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

/* ── 夹具的日期与读数（手写在下面，不拿实现输出当期望；出处逐条标注） ── */

/** 种子库的计划起日（`docs/research/t81-seed.mjs:145`，逐字 `'2026-09-01'`）＋ 总周数 4。 */
const SEED_START = '2026-09-01';
const SEED_WEEKS = 4;
/** 种子库计划的末日：起日 ＋ 4 × 7 − 1 天 ＝ 2026-09-28（口径＝`total_weeks`，不按最后一行的周推）。
 *  ⚠️ **票面「现场」段给的越界样例是 `date=2026-09-23`**，但按这个口径它落在**范围内**
 *  （09-23 ≤ 09-28）——种子库的起日是 09-01 而不是票面推演时用的 08-10。故越界档取**末日次日**
 *  2026-09-29（这是「越过计划范围」的最小真值日），票面那个日子单列一档当**反面参照**
 *  （范围内但当天无课 ⇒ 是本日无课态，不许被误判成越界）。*/
const SEED_END = '2026-09-28';
/** 反向锁那三张读数：种子库有 3 行场次、每行 1 个动作（`docs/research/t81-seed.mjs:152-157`）。
 *  ⚠️ 票面「现场」段记的 100 场／264 个是**生产库**读数；本用例按票面点名用 `seedFull()` 造夹具，
 *  故这三张读数按种子库当刻口径冻结（3／3／4），「逐字一致」这层语义不变。 */
const SEED_SESSIONS = 3;
const SEED_MOVEMENTS = 3;
/** 「本日无课」那一档：**同一周内有课、当天没课**的日子。种子第 1 周只有周三（09-02，下肢）
 *  与周日（09-06，有氧）两场，其余五天都没排课——取 2026-09-04（周五，第 1 周第 5 天）。 */
const NOCLASS_DATE = '2026-09-04';
/** 「本日无课」同周里有课那一天的场次名（09-02 周三那场，`docs/research/t81-seed.mjs:153`）。 */
const NOCLASS_WEEK_LABEL = '下肢';
/** 计划里**真排了课的周数**（种子三行落在第 1、2 周）：反向锁里「其中 N 周有安排」那句口径的落点，
 *  也是「每个周区块数」的对账基准——周区块**只按有场次的周出**（库里没排课的第 3、4 周不出区块），
 *  故「周区块数」的冻结值是 2，不是配置的 4。 */
const SEED_PLANNED_WEEKS = 2;
/** 「越界」那一档：末日的次日（计划已结束）。 */
const AFTER_DATE = '2026-09-29';
/** 「越界」第二档：越过一年（周次远超总周数）。 */
const AFTER_FAR = '2027-03-01';
/** 「越过计划范围」的反面参照（票面原样给的那一天）：范围内、当天无课 ⇒ 必须走「本日无课」，
 *  不许判成越界（判据不许把范围判宽——这正是改前「按周过滤到空」会踩的那条线）。 */
const IN_RANGE_NO_SESSION = '2026-09-23';
/** 「未开始」那一档：起日（2026-09-01）的前一天与更早的一天。 */
const BEFORE_DATE = '2026-08-31';
const BEFORE_EARLY = '2026-08-09';

/* ── 机械件：临时种子库 ＋ 一条命令一份库副本 ＋ 真交付出口 ── */

/** 种子模板库（`seedFull` 那份），另留一个「一格场次都没有」的变体给「真无计划」那一态。 */
const TPL = mkdtempSync(join(tmpdir(), 't947-tpl-'));
const TPL_EMPTY = mkdtempSync(join(tmpdir(), 't947-tpl-empty-'));
{
  const db = openDb(join(TPL, DB_FILENAME));
  seedFull(db);
  db.close();
  copyFileSync(join(TPL, DB_FILENAME), join(TPL_EMPTY, DB_FILENAME));
  const empty = openDb(join(TPL_EMPTY, DB_FILENAME));
  empty.prepare('DELETE FROM workout_plans').run(); // 配置行留着、场次行清空 ⇒ 「真无计划」那一档
  empty.close();
}

/** 一条命令的读数：exit 码 ＋ envelope ＋ 落盘页原文（`--html` 显式给，不靠默认落点）。 */
function runCli(name, params, tpl = TPL) {
  const runDir = join(TPL, 'run-' + name);
  mkdirSync(runDir, { recursive: true });
  copyFileSync(join(tpl, DB_FILENAME), join(runDir, DB_FILENAME));
  const out = join(runDir, name + '.html');
  const args = [CLI, 'calorie.view.plan', '--html', out];
  if (Object.keys(params).length > 0) args.push('--params', JSON.stringify(params));
  const r = spawnSync(process.execPath, args, {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...homeEnvOf(calorieConfigDir(runDir)), ...freezeClock(SEED_TODAY) },
  });
  let env = null;
  try { env = JSON.parse(String(r.stdout || '').trim()); } catch { env = null; }
  return {
    name, exit: r.status, stderr: String(r.stderr || '').trim().slice(-400), env,
    metrics: env?.data?.metrics ?? null,
    output: env?.data?.output ?? null,
    html: existsSync(out) ? readFileSync(out, 'utf8') : null,
  };
}

/** 周区块数（每周一个 `<section class="ilw-week" data-wk="…">`，住 `./workoutPlanLook.ts:138`）：
 *  出口在不在的机器读数。**只数 section**——同一页里还有一组周次选钮也带 `data-wk` 属性
 *  （选钮串 `radios()` 的 `data-wk` 是我早先数错的那一半），拿裸计数会把每周数成 2。 */
const weekCount = (html) => ((html ?? '').match(/<section class="ilw-week" data-wk="/g) ?? []).length;

/** 页上给用户看的正文（剥掉复制载荷那几段技术原文，照 `test/566` 同款口径）。 */
const seen = (run) => (run.html === null ? '' : visibleText(stripCopyPayload(run.html)));

/** 抠出 KPI 卡的四槽：`[{ label, value, unit, detail }]`。
 *  为什么要抠卡而不是在可见文本上找整句：卡片四槽是**各自独立**的文本段（`renderKpiCard` 的
 *  label／value／unit／detail 是四个兄弟节点），`visibleText` 抽出来是「总场次\n3\n场」而不是
 *  「总场次 3 场」这**一句**。要断「某张卡的值」就得读卡本身，别拿拼串凑。
 *  卡串的固定形状（`packages/base-render/src/blocks.ts` 的 `renderKpiCard`）：
 *  `…-label">标签<` … `…-value">值<` … 可选 `…-unit">单位<` … 可选 `…-detail">说明<`，四槽都在同一张卡内。 */
function kpiCards(run) {
  const html = run.html ?? '';
  return [...html.matchAll(/ilife-block-kpi-card-label">([^<]*)</g)].map((m) => {
    // 从这张卡的 label 起，到**本卡结束**为止的一段（用「下一个 label 或收尾」切段，不数字符）：
    // 四槽是同卡内的兄弟节点，中间隔着 grid 的样式字符串（数百字节），数字符窗口会漏槽。
    const at = m.index;
    const nextLabel = html.indexOf('ilife-block-kpi-card-label">', at + m[0].length);
    const seg = html.slice(at, nextLabel === -1 ? at + 4000 : nextLabel);
    const value = /ilife-block-kpi-card-value">([^<]*)</.exec(seg);
    const unit = /ilife-block-kpi-card-unit">([^<]*)</.exec(seg);
    const detail = /ilife-block-kpi-card-detail">([^<]*)</.exec(seg);
    return {
      label: m[1],
      value: value === null ? null : value[1],
      unit: unit === null ? null : unit[1],
      detail: detail === null ? null : detail[1],
    };
  });
}

/** 某张卡（按标签取；取不到即 null）。 */
const cardOf = (run, label) => kpiCards(run).find((c) => c.label === label) ?? null;

/** 四件一起断：exit 0 ＋ envelope 解析得出 ＋ 产物落盘 ＋ 整页文档（片段形状必红）。 */
function assertDelivered(run, what) {
  assert.equal(run.exit, 0, what + ' 应 exit 0，实测 ' + run.exit + '（stderr：' + run.stderr + '）');
  assert.ok(run.metrics !== null, what + ' 没解析出 envelope.data.metrics');
  assert.ok(typeof run.output === 'string' && existsSync(run.output), what + ' 产物没落盘：' + run.output);
  const html = run.html ?? '';
  for (const [needle, name] of [['<!doctype html>', 'doctype'], ['<meta charset=', 'charset'],
    ['<style', 'style'], ['ilife-page', 'ilife-page']]) {
    assert.ok(html.includes(needle), what + ' 缺 ' + name);
  }
}

/* ── 真跑：七页（不带参那一页是**反向锁**的对照物） ── */

const RUNS = {
  /** 反向锁那一页：不带任何参数（判据 ③ 的三张读数就从它读）。 */
  noParams: runCli('no-params', {}),
  after: runCli('after', { date: AFTER_DATE }),
  afterFar: runCli('after-far', { date: AFTER_FAR }),
  before: runCli('before', { date: BEFORE_DATE }),
  beforeEarly: runCli('before-early', { date: BEFORE_EARLY }),
  noclass: runCli('noclass', { date: NOCLASS_DATE }),
  inRangeNoSession: runCli('in-range-no-session', { date: IN_RANGE_NO_SESSION }),
  noPlan: runCli('no-plan', {}, TPL_EMPTY),
};

/* ── ① 越界态：出页 ＋ 周区块照出（出口在） ── */

test('#947 ① 越界态（date 越过计划末日）：出现「计划已结束」且周区块一个不少', () => {
  for (const r of [RUNS.after, RUNS.afterFar]) {
    assertDelivered(r, '越界态那一页（' + r.name + '）');
    const text = seen(r);
    assert.ok(text.includes('计划已结束'),
      r.name + ' 页上没有「计划已结束」（改前这里是「这一周没有训练安排」）：'
      + JSON.stringify(text.slice(0, 300)));
    assert.ok(!text.includes('这一周没有训练安排'),
      r.name + ' 还在用那句三态共用的空态句（故障 4 的原样）：' + JSON.stringify(text.slice(0, 300)));
    /* 出口不只是「有标签」——页上真铺出了计划里那几周的正文（场次卡与逐日面板都在 DOM 里），
     * 且**一块不少**：与不带参数那一页的周区块数相等（改前这两态丢的就是这几块）。 */
    assert.equal(weekCount(r.html), SEED_PLANNED_WEEKS,
      r.name + ' 周区块数应与计划里排了课的周数相等（' + SEED_PLANNED_WEEKS + '），实测 ' + weekCount(r.html));
    assert.ok(text.includes('第 1 周') && text.includes('第 2 周'),
      r.name + ' 页上应能看到计划里各周的正文：' + JSON.stringify(text.slice(0, 300)));
    assert.ok(text.includes('下肢') && text.includes('上肢'),
      r.name + ' 页上应能看到场次卡（＝点得到的那几周内容）：' + JSON.stringify(text.slice(0, 400)));
  }
  console.log('T947-P1 越界 data-wk=' + weekCount(RUNS.after.html) + '/' + weekCount(RUNS.afterFar.html)
    + ' 出现「计划已结束」=' + (seen(RUNS.after).includes('计划已结束') ? 1 : 0));
});

/* ── ② 未开始态：出页 ＋ 周区块照出（出口在） ── */

test('#947 ② 未开始态（date 落在起日之前）：出现「计划还没开始」且周区块一个不少', () => {
  for (const r of [RUNS.before, RUNS.beforeEarly]) {
    assertDelivered(r, '未开始态那一页（' + r.name + '）');
    const text = seen(r);
    assert.ok(text.includes('计划还没开始'),
      r.name + ' 页上没有「计划还没开始」：' + JSON.stringify(text.slice(0, 300)));
    assert.ok(!text.includes('这一周没有训练安排'),
      r.name + ' 还在用那句三态共用的空态句（故障 4 的原样）：' + JSON.stringify(text.slice(0, 300)));
    assert.equal(weekCount(r.html), SEED_PLANNED_WEEKS,
      r.name + ' 周区块数应与计划里排了课的周数相等（' + SEED_PLANNED_WEEKS + '），实测 ' + weekCount(r.html));
  }
  console.log('T947-P2 未开始 data-wk=' + weekCount(RUNS.before.html) + '/' + weekCount(RUNS.beforeEarly.html)
    + ' 出现「计划还没开始」=' + (seen(RUNS.before).includes('计划还没开始') ? 1 : 0));
});

/* ── ③ 反向锁：不带参数那一页的三张读数逐字不动 ── */

test('#947 ③ 反向锁：不带参数那一页仍报 3 场／3 个／4 周有安排（不许为越界态改它）', () => {
  const r = RUNS.noParams;
  assertDelivered(r, '不带参数那一页');
  const text = seen(r);
  /* 三张冻结卡逐槽断（值 ＋ 单位 ＋ 说明），别再拿可见文本拼串凑：
   * 四槽是四个兄弟文本段，拼串会连「两张不同的卡」都拼得出来。 */
  const frozen = [
    ['总场次', String(SEED_SESSIONS), '场', null],
    ['总动作', String(SEED_MOVEMENTS), '个', null],
    /* 种子的 4 周里**只有第 1、2 周真排了课**（`docs/research/t81-seed.mjs:152-157` 三行落在 w1／w2）：
     * 这句说明正是「总周数取配置、其中 N 周有安排取实况」两个口径的落点，别拿 SEED_WEEKS 当 N。 */
    ['总周数', String(SEED_WEEKS), '周', '其中 ' + SEED_PLANNED_WEEKS + ' 周有安排'],
  ];
  for (const [label, value, unit, detail] of frozen) {
    const card = cardOf(r, label);
    assert.ok(card !== null, '不带参数那一页读不到「' + label + '」那张卡');
    assert.equal(card.value, value, '「' + label + '」的值变了（应为 ' + value + '）：' + JSON.stringify(card));
    assert.equal(card.unit, unit, '「' + label + '」的单位变了：' + JSON.stringify(card));
    if (detail !== null) assert.equal(card.detail, detail, '「' + label + '」的说明变了：' + JSON.stringify(card));
  }
  assert.equal(r.metrics.totalSessions, SEED_SESSIONS, '不带参数那一页「总场次」的报文读数变了');
  assert.equal(r.metrics.totalMovements, SEED_MOVEMENTS, '不带参数那一页「总动作」的报文读数变了');
  assert.equal(r.metrics.totalWeeks, SEED_WEEKS, '不带参数那一页「总周数」的报文读数变了');
  assert.equal(weekCount(r.html), SEED_PLANNED_WEEKS,
    '不带参数那一页的周区块数变了（计划里排了课的周数）：' + weekCount(r.html));
  /* 三张冻结卡在**页上正文**里也读得到（防「卡被挪进复制载荷才凑出的数」）。 */
  assert.ok(text.includes('总场次') && text.includes('总周数'), '三张卡没进可见正文');
  /* 四态那两句状态词不许漏到不带参数那一页上（那一页既没越界也没未开始）。 */
  assert.ok(!text.includes('计划已结束') && !text.includes('计划还没开始'),
    '不带参数那一页混进了越界／未开始的状态词：' + JSON.stringify(text.slice(0, 400)));
  console.log('T947-P3 反向锁 总场次=' + cardOf(r, '总场次').value + ' 总动作=' + cardOf(r, '总动作').value
    + ' 总周数=' + cardOf(r, '总周数').value + ' data-wk=' + weekCount(r.html)
    + ' 卡标签=' + kpiCards(r).map((c) => c.label).join('／'));
});

/* ── ④ 口径一致：带参与不带参两页的「总场次」相等，且＝计划全量 ── */

test('#947 ④ 口径一致：带参与不带参两页「总场次」相等（全量口径，与「总周数」同源）', () => {
  // 计划全量（＝不带参数那一页读到的那一份）：改前带日期那一页读的是**过滤后**那一份（现场是 0）。
  const full = RUNS.noParams.metrics.planSessions;
  assert.equal(full, SEED_SESSIONS, '计划全量场次数（`planSessions`）应为 ' + SEED_SESSIONS + '，实测 ' + JSON.stringify(full));
  assert.equal(RUNS.noParams.metrics.planMovements, SEED_MOVEMENTS, '计划全量动作数应为 ' + SEED_MOVEMENTS);
  for (const r of [RUNS.after, RUNS.afterFar, RUNS.before, RUNS.beforeEarly, RUNS.noclass, RUNS.inRangeNoSession]) {
    // 越界／未开始两态过滤到 0 场，页面「总场次」卡仍报全量 3（改前这里印 0 ⇒ 被读成空壳计划）。
    const card = cardOf(r, '总场次');
    assert.ok(card !== null, r.name + ' 那一页读不到「总场次」卡');
    assert.equal(card.value, String(full),
      r.name + ' 那一页的「总场次」不等于不带参数那一页的 ' + full + '：' + JSON.stringify(card));
    assert.equal(r.metrics.planSessions, full, r.name + ' 那一页的 planSessions 与不带参数那一页不相等');
  }
  /* 「本周」另用一张卡表达（全量之外的那一半口径）：四态页上都得有这张卡，报的是**本次过滤真读到多少**
   * （越界／未开始的日子落在计划外 ⇒ 照实 0；本日无课的日期档 ⇒ 只算那一天；不带参数 ⇒ 与全量同值，
   * 因为「本次取到的」就是整份计划）。 */
  for (const r of [RUNS.noParams, RUNS.after, RUNS.before, RUNS.noclass]) {
    const card = cardOf(r, '本周');
    assert.ok(card !== null,
      r.name + ' 那一页没有「本周」这张卡（本周读数没有第二个落点）：' + JSON.stringify(kpiCards(r).map((c) => c.label)));
    assert.equal(card.unit, '场', r.name + ' 那一页「本周」卡的单位不是「场」：' + JSON.stringify(card));
  }
  assert.equal(cardOf(RUNS.noParams, '本周').value, String(SEED_SESSIONS),
    '不带参数那一页「本周」应报本次取到的全部场次（' + SEED_SESSIONS + '）');
  assert.equal(cardOf(RUNS.noclass, '本周').value, '0',
    '本日无课那一页「本周」应报这一天真读到的 0 场（不许拿为保住出口而上屏的整周冒充）：'
    + JSON.stringify(cardOf(RUNS.noclass, '本周')));
  for (const r of [RUNS.after, RUNS.before]) {
    assert.equal(cardOf(r, '本周').value, '0',
      r.name + ' 那一页「本周」应报 0（目标日落在计划范围外，不编数）：' + JSON.stringify(cardOf(r, '本周')));
  }
  console.log('T947-P4 口径一致 planSessions=' + full + ' 越界页总场次=' + cardOf(RUNS.after, '总场次').value
    + ' 未开始页总场次=' + cardOf(RUNS.before, '总场次').value
    + ' 无参本周=' + cardOf(RUNS.noParams, '本周').value + ' 越界本周=' + cardOf(RUNS.after, '本周').value);
});

/* ── ⑤ 另两态：本日无课／真无计划 ＋ 范围判定的反面参照 ── */

test('#947 ⑤ 本日无课与真无计划各自出页、各自有可点出口', () => {
  const nc = RUNS.noclass;
  assertDelivered(nc, '本日无课那一页');
  const ncText = seen(nc);
  assert.ok(ncText.includes('这一天没有训练安排'),
    '本日无课那一页没出这一天的空态句：' + JSON.stringify(ncText.slice(0, 400)));
  assert.ok(weekCount(nc.html) >= 1,
    '本日无课那一页没有周区块（换一天看的页签没了）：' + weekCount(nc.html));
  // 那一天所在的那一周有课 ⇒ 至少一个场次卡在页上（换一天看得到东西）。
  assert.ok(ncText.includes(NOCLASS_WEEK_LABEL),
    '本日无课那一页把同周别的场次也丢了（应有「' + NOCLASS_WEEK_LABEL + '」）：' + JSON.stringify(ncText.slice(0, 400)));
  assert.ok(!ncText.includes('计划已结束') && !ncText.includes('计划还没开始'),
    '本日无课那一页混进了越界／未开始的状态词');

  /* 反面参照（票面原样给的那一天 2026-09-23）：它落在**范围内**（09-23 ≤ 末日 09-28）⇒ 必须是
   * 本日无课态，不许判成越界。这条咬住「范围判定不许判宽」——改前正是「按周过滤到空」把这种日子
   * 也吞成同一句空态。 */
  const ir = RUNS.inRangeNoSession;
  assertDelivered(ir, '范围内无课那一天那一页');
  const irText = seen(ir);
  assert.ok(!irText.includes('计划已结束'),
    '范围内（' + IN_RANGE_NO_SESSION + ' ≤ 末日 ' + SEED_END + '）却报了「计划已结束」——范围判定判宽了：'
    + JSON.stringify(irText.slice(0, 400)));
  assert.ok(irText.includes('这一天没有训练安排'),
    '范围内无课那一天没出本日无课的空态句：' + JSON.stringify(irText.slice(0, 400)));

  const np = RUNS.noPlan;
  assertDelivered(np, '真无计划那一页');
  const npText = seen(np);
  assert.ok(npText.includes('计划里还没有任何训练安排'),
    '真无计划那一页没出「计划里还没有任何训练安排」：' + JSON.stringify(npText.slice(0, 400)));
  assert.ok(npText.includes('定训练计划'),
    '真无计划那一页没把「定训练计划」这个出口写出来：' + JSON.stringify(npText.slice(0, 400)));
  console.log('T947-P5 本日无课 data-wk=' + weekCount(nc.html) + ' 范围内无课 ' + IN_RANGE_NO_SESSION
    + ' 报越界=0 真无计划 空态=1 计划末日=' + SEED_END + '（种子起日 ' + SEED_START + ' ＋ ' + SEED_WEEKS + ' 周）');
});

/* ── ⑥ 判据摘要（机器可读一行，给证据件与回执抄） ── */

test('#947 判据摘要', () => {
  const frozenOk = ['总场次', '总动作', '总周数'].every((label, i) => {
    const card = cardOf(RUNS.noParams, label);
    return card !== null && card.value === [String(SEED_SESSIONS), String(SEED_MOVEMENTS), String(SEED_WEEKS)][i];
  });
  const cells = [
    seen(RUNS.after).includes('计划已结束') && weekCount(RUNS.after.html) >= 1 ? '越界出页' : '越界没出页',
    seen(RUNS.before).includes('计划还没开始') && weekCount(RUNS.before.html) >= 1 ? '未开始出页' : '未开始没出页',
    frozenOk ? '无参页三读逐槽不动' : '无参页被改动了',
    RUNS.after.metrics.planSessions === RUNS.noParams.metrics.planSessions ? '带参与不带参同口径' : '两页口径不同',
    seen(RUNS.noclass).includes('这一天没有训练安排') ? '本日无课出页' : '本日无课没出页',
    seen(RUNS.noPlan).includes('计划里还没有任何训练安排') ? '真无计划出页' : '真无计划没出页',
    !seen(RUNS.inRangeNoSession).includes('计划已结束') ? '范围判定未判宽' : '范围判定判宽了',
  ];
  console.log('T947-RESULT 七条读数：' + cells.join('／')
    + '（越界 data-wk=' + weekCount(RUNS.after.html) + '、未开始 data-wk=' + weekCount(RUNS.before.html)
    + '、无参 data-wk=' + weekCount(RUNS.noParams.html) + '、无参总场次=' + RUNS.noParams.metrics.totalSessions
    + '、全量场次=' + RUNS.noParams.metrics.planSessions + '）');
});
