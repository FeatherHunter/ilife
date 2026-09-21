/** #385 · 热量缺口页核验（对照老实物 templates\calorie_deficit.html 逐项核 10 个字段）。
 *
 * 照抄：packages/skill-calorie/test/analysis-predict-383.test.mjs（唤醒词→routesFor→CLI 落盘＋
 * 绝对路径＋完整文档＋逐字段断言）＋ trend-homogeneity-110.test.mjs（本页既有基线文案）。
 * 运行：先 pnpm build，再 node packages/skill-calorie/test/analysis-deficit-385.test.mjs
 *
 * 范围（票面）：冻结表 order 200 查热量缺口（有命令可执行）＋别名 看热量缺口（new 7）；
 * 两者 routesFor 命中同一条命令 `calorie.view.deficit`，cli 逐字 `--params '{"window":"7d"}'`。
 * 不做 13 张缺口页（地图正文该处不成立：冻结表里 `calorie_deficit.html` 只出现 1 次）。
 *
 * 逐项核 10 个字段（老侧 render_calorie_deficit.py build_data 的产物 ↔ 本页落点）：
 *   1 日均摄入 summary.avg_intake        → KPI「日均摄入」＋详情「目标 X 卡/天」
 *   2 日均消耗 summary.avg_burn          → KPI「日均消耗」＋详情「日常消耗 X ＋ 运动 Y 卡」（#160 改人话）
 *   3 日均运动消耗 avg_exercise_burn     → 同上详情「运动 Y 卡」
 *   4 日均缺口 summary.avg_deficit       → KPI「日均缺口」（带符号）
 *   5 每周缺口 summary.weekly_deficit    → KPI「理论减重」详情「周缺口 X 卡」
 *   6 预测掉重 summary.predicted_loss_kg → KPI「理论减重」值（kg）
 *   7 趋势 summary.trend                 → KPI「日均缺口」详情（减重方向／增重方向／持平）
 *   8 目标摄入 target.intake             → KPI「日均摄入」详情 ＋ 图表 markLine
 *   9 逐日序列 series[]                  → 缺口明细表（日期/摄入/消耗/缺口/状态；**#517 后目标列上浮成口径行**）
 *  10 工作日与周末 meta.weekday_count／weekend_count → 表格 caption
 *
 * #517（场景 10 样板页，编排者具名授权一次性改本文件）改了本文件的七处断言／解析：
 *   · `tableCells()` 属性段放宽（#154-r3 的 `data-label` 让旧正则一律不匹配、在干净树上就红），
 *     并新增 `tableLabels()`／`assertCellLabels()` 把 `data-label` 升级成一条正向断言；
 *   · ⑨ 测试与合成测试的单元格形状：6 列 → 5 列（每日缺口目标那列上浮成口径行，见下面 D6）；
 *   · H1 的区间符号「~」→「至」（#516 判据 R6），并新增「可见文本零并列分隔符」断言。
 *   改前断言原文 → 改后断言原文 → 为什么是同语义的加强，三列对照见
 *   `docs/skills/skill-calorie/t517-W1-共享形状与样板-证据.md` §六。
 *
 * 差异清单（判据先行跑红的两处；老侧 `calorie_deficit.html` 6 列明细表 ↔ 改前本页）：
 *   D1 表格「目标」列：老侧＝`target.weekly_deficit_per_day`（每日缺口目标，逐行 `+300`，
 *      与「状态」列的判定阈值同源）；改前＝`target.intake`（摄入目标 1800），
 *      即拿摄入目标去比缺口列 → 该列值错、且与状态判定脱钩。本票按老侧改正。
 *   D2 表格「状态」列：老侧＝三态（`deficit >= 每日缺口目标` → ✓ 达标／`> 0` → ⚠ 偏低／否则 ✗ 超量）；
 *      改前＝两态（按缺口正负给「缺口／盈余」）。本票按老侧补第三态。
 *   D3 老侧 `tfoot` 合计行（总摄入／总消耗／总缺口）：改前本页无合计块（B-03 表格块无 footer 槽，
 *      不改公共层）→ 改用 B-05 行列表补「合计摄入／合计消耗／合计缺口」三行（仓内既有先例
 *      `src/exercise/sportPortDocs.ts` 的「摄入合计／TDEE 合计」同款）。
 *   D4 老侧每行摄入／消耗用专色 `--intake`／`--burn`、缺口三态用 `.deficit-pos/neg/zero`：
 *      **不移植**（本仓零命中，且技能侧颜色字面量必须为 0、样式一律走 base-paint）→ 记偏离。
 *   D5 老侧图表缺 Y 轴刻度值（`calorie_deficit.html:149` 自注该偏离）：**不是公共层能力缺口**——
 *      公共层支持刻度（`spec/charts.ts:98` 声明 `yTicks?:number|false`；`charts.ts:452` 收敛 2–6；
 *      `:471-490` 渲 `<text class="ilife-charts-tick">`），只是折线缺省 `yTicks→false`（`charts.ts:777`）
 *      ⇒ 属「本页漏传参数」。本页折线补 `yTicks:3`＋`labels:'select'`＋`format`（**不改公共层**）。
 *   D6 表格「目标」列（**#517 引入的呈现改动，不是取数改动**）：7 行全是同一个 `+300` ⇒ 零信息量的
 *      一列占掉 1/6 宽度。**值不变、口径不变**，只是这份事实从「逐行印一遍」上浮成口径行上的一句话
 *      （`达标线＝每天 +300 卡缺口`，见本文件 ⑨ 测试的 D1 断言：页上仍可见地出现一次）。
 *
 * 变异证据（源码级，票面 §自证两行）：
 *   MUT-RED  ：见文件尾「变异证据」段（改坏 D1 一处 → 本测试变红）。
 *   MUT-GREEN：还原后全绿（两行机器读数写入 docs/skills/skill-calorie/t385-证据.md）。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { buildDeficitDoc } from '../dist/render/trendDocs.js';
import { routesFor } from '../dist/triggers/routing.js';
import { assertDocPage } from './doc-page-assert.mjs';
import { calorieConfigDir, configTestBase, pinProcessClock } from './helpers/config-test.mjs';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

pinProcessClock('2026-09-07'); // #676：CALORIE_TODAY 退役，改钉整只钟（当刻进程＋后续子进程）

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';
const KEY = 'calorie.view.deficit';

/** 每日缺口目标（老侧 target.weekly_deficit_per_day 常量，deficit.ts:73 同值）。 */
const TARGET_DEF = 300;

const WAKE_WORDS = ['查热量缺口', '看热量缺口'];

/** 窗口差异三例（程序断言）：7d／本月／自定义。 */
const WINDOWS = [
  { name: '7d', params: { window: '7d' }, start: '2026-09-01', end: '2026-09-07', days: 7 },
  { name: '本月', params: { window: '本月' }, start: '2026-09-01', end: '2026-09-07', days: 7 },
  { name: '自定义', params: { window: 'custom', start: '2026-08-25', end: '2026-09-07' }, start: '2026-08-25', end: '2026-09-07', days: 14 },
];

/** 09-01 ~ 09-07 七天的摄入（卡）：与档 TDEE 2556 摆出 达标／偏低／超量 三态全覆盖。 */
const WEEK_INTAKE = [1000, 2400, 2800, 1500, 2200, 2600, 1100];

function isoAt(i) {
  return new Date(Date.parse('2026-08-25T12:00:00Z') + i * 86400000).toISOString().slice(0, 10);
}

function seed385(db) {
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, 'male', 175, 'moderate')").run();
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal) VALUES (1, 1800, 150, 200, 50, 2000)').run();
  // 08-25 .. 09-07 逐日有饮食（窗内无饮食即 missing-data，那是另一路断言，本测试要的是有记录窗）。
  for (let i = 0; i < 14; i++) {
    const date = isoAt(i);
    const kcal = i < 7 ? 2000 : WEEK_INTAKE[i - 7];
    db.prepare('INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(date, '12:00:00', '米饭', 200, kcal, 90, 200, 60);
  }
  db.prepare("INSERT INTO exercise_log (date, exercise_type, duration_minutes, calories_burned, category) VALUES ('2026-09-04', '跑步', 30, 300, '有氧')").run();
  db.prepare("INSERT INTO exercise_log (date, exercise_type, duration_minutes, calories_burned, category) VALUES ('2026-08-28', '快走', 40, 200, '有氧')").run();
}

function mkSeededDir() {
  const dir = mkdtempSync(join(tmpdir(), 't385-'));
  const db = openDb(join(dir, DB_FILENAME));
  seed385(db);
  db.close();
  return dir;
}

function runCli(dir, params, htmlPath) {
  return spawnSync(NODE_BIN, [BIN, KEY, '--params', JSON.stringify(params), '--html', htmlPath],
    { encoding: 'utf8', env: { ...process.env, ...homeEnvOf(calorieConfigDir(dir))} });
}

/** 跑一轮并返回 { env, html, out }（exit 0／绝对路径／完整文档三连在此收口）。 */
function runCase(dir, params, tag) {
  const out = join(dir, tag + '.html');
  const r = runCli(dir, params, out);
  assert.equal(r.status, 0, tag + ' 非 exit 0：status=' + r.status + ' stderr=' + String(r.stderr || '').slice(-600));
  const env = JSON.parse(String(r.stdout));
  assert.ok(typeof env.data.output === 'string', tag + ' 缺 data.output');
  assert.ok(isAbsolute(env.data.output), tag + ' data.output 非绝对路径：' + env.data.output);
  assert.equal(env.data.output, out, tag + ' 落点不是本次 --html');
  assert.ok(existsSync(out), tag + ' 产物不在盘上');
  const html = readFileSync(out, 'utf8');
  assertDocPage(html, tag);
  return { env, html, out };
}

/** KPI 卡解析（base-paint/blocks B-02 类名）：label → { value, unit, detail }。 */
function kpiMap(html) {
  const map = new Map();
  for (const card of html.split('<div class="ilife-block ilife-block-kpi-card">').slice(1)) {
    const label = (card.match(/ilife-block-kpi-card-label">([^<]*)/) || [])[1];
    if (label === undefined) continue;
    map.set(label, {
      value: (card.match(/ilife-block-kpi-card-value">([^<]*)/) || [])[1],
      unit: (card.match(/ilife-block-kpi-card-unit">([^<]*)/) || [])[1],
      detail: (card.match(/ilife-block-kpi-card-detail">([^<]*)/) || [])[1],
    });
  }
  return map;
}

/** 数据表格解析（B-03，只用本页那一张缺口明细表）：`<td>` 的属性段（class 之后）＋ 单元格文本。
 *
 *  #517 定点修复（编排者具名授权，一次性）：本函数原来把 `<td>` 钉成**只有 class 一个属性**，
 *  而 `1712317 fix(base-render): 数据表窄屏行卡化 ＋ 口径行分隔形状化` 给每个数据格加了 `data-label`
 *  （窄屏行卡化时 `td::before{content:attr(data-label)}` 的标签源）⇒ 旧正则一律不匹配、`cells` 全是
 *  空数组，两条断言（`:221`／`:292` 原行号）在**干净树上**就红。修法＝属性段放宽成「class 之后可跟
 *  任意属性」，并把 `data-label` **升级成一条正向断言**（`assertCellLabels`）——原来这条没有任何断言。
 *  这是修不是放宽：放宽属性的同时新增了「每格标签与列头同源」。 */
const CELL_RE = /<td class="ilife-block-data-table-cell-[a-z]+"([^>]*)>([^<]*)<\/td>/g;
const cellRows = (html) => [...((html.match(/<tbody>([\s\S]*?)<\/tbody>/) || [])[1] || '').matchAll(/<tr>([\s\S]*?)<\/tr>/g)];

function tableCells(html) {
  return cellRows(html).map((m) => [...m[1].matchAll(new RegExp(CELL_RE.source, 'g'))].map((c) => c[2]));
}

/** 每格 `data-label` 的二维数组（与 `tableCells` 同一行／同一格口径，只换取属性段里的哪一段）。 */
function tableLabels(html) {
  return cellRows(html).map((m) => [...m[1].matchAll(new RegExp(CELL_RE.source, 'g'))]
    .map((c) => (c[1].match(/data-label="([^"]*)"/) || [])[1]));
}

/** 正向断言（#517 新增）：表头逐列 ↔ 每格 `data-label` 必须逐字相同——窄屏行卡化以后，格子上的
 *  标签就是它那一列的列头，两处走散会让 390 档显示错列名。 */
function assertCellLabels(html, labels, what) {
  const thead = (html.match(/<thead>([\s\S]*?)<\/thead>/) || [])[1] || '';
  const heads = [...thead.matchAll(/<th scope="col"[^>]*>([^<]*)</g)].map((m) => m[1]);
  assert.deepEqual(heads, labels, what + ' 表头与期望不符：' + heads.join('|'));
  const all = tableLabels(html);
  assert.ok(all.length > 0, what + ' 明细表没有解析到数据格');
  for (const row of all) assert.deepEqual(row, heads, what + ' 每格的 data-label 必须等于该列列头，实得：' + row.join('|'));
}

/** 合计三行（B-05 行列表）：left → main。 */
function listRowMap(html) {
  const map = new Map();
  for (const chunk of html.split('<div class="ilife-block-list-rows-row">').slice(1)) {
    const left = (chunk.match(/ilife-block-list-rows-left">([^<]*)/) || [])[1];
    const main = (chunk.match(/ilife-block-list-rows-main">([^<]*)/) || [])[1];
    if (left !== undefined) map.set(left, main);
  }
  return map;
}

/** 老侧三态判定（calorie_deficit.html:174-178）——逐字对齐。 */
function expectStatus(deficit, targetDef) {
  if (deficit >= targetDef) return '✓ 达标';
  if (deficit > 0) return '⚠ 偏低';
  return '✗ 超量';
}

function num(text) {
  return Number(String(text).replace(/,/g, '').replace('+', ''));
}

test('#385 判据：查热量缺口／看热量缺口 两个唤醒词都命中 calorie.view.deficit（routesFor exec）', () => {
  for (const word of WAKE_WORDS) {
    const hits = routesFor(word).filter((r) => r.kind === 'exec');
    assert.ok(hits.length > 0, '唤醒词没有命令可执行：' + word);
    assert.equal(hits[0].key, KEY, '唤醒词指错命令：' + word);
    const cliParams = JSON.parse(String(hits[0].cli).split('--params ')[1].replace(/^'|'$/g, ''));
    assert.deepEqual(cliParams, { window: '7d' }, '唤醒词 cli 参数形状变了：' + word);
  }
});

test('#385 十字段：窗内逐字段与老实物一一对上（7d 窗口，命令真跑）', () => {
  const dir = mkSeededDir();
  const { env, html } = runCase(dir, { window: '7d' }, 't385-fields');
  const m = env.data.metrics;
  const kpi = kpiMap(html);

  // ① 日均摄入（含 ⑧ 目标摄入）
  assert.equal(kpi.get('日均摄入').value, String(m.avgIntake), '① 日均摄入值不等于 metrics.avgIntake');
  assert.equal(kpi.get('日均摄入').unit, '卡', '① 日均摄入单位');
  assert.equal(kpi.get('日均摄入').detail, '目标 ' + m.targetIntake + ' 卡/天', '⑧ 目标摄入文案');
  // ② 日均消耗 ＋ ③ 日均运动消耗
  assert.equal(kpi.get('日均消耗').value, String(m.avgBurn), '② 日均消耗值不等于 metrics.avgBurn');
  assert.equal(kpi.get('日均消耗').unit, '卡', '② 日均消耗单位');
  // #160 文本返工：详情改人话「日常消耗 X ＋ 运动 Y 卡」（旧文案 `TDEE X · 运动 Y 卡` 已判死）。
  assert.equal(kpi.get('日均消耗').detail, '日常消耗 ' + m.targetTdee + ' ＋ 运动 ' + m.avgExerciseBurn + ' 卡', '③ 日均运动消耗文案');
  assert.ok(m.avgExerciseBurn > 0, '③ 窗体应含运动消耗（本测试种了 exercise_log）');
  // ④ 日均缺口 ＋ ⑦ 趋势
  assert.equal(kpi.get('日均缺口').value, (m.avgDeficit >= 0 ? '+' : '') + m.avgDeficit, '④ 日均缺口值（带符号）');
  assert.equal(kpi.get('日均缺口').unit, '卡', '④ 日均缺口单位');
  const trendZh = m.avgDeficit > 0 ? '减重方向' : m.avgDeficit < 0 ? '增重方向' : '持平';
  assert.equal(kpi.get('日均缺口').detail, trendZh, '⑦ 趋势文案');
  assert.ok(['减重方向', '增重方向', '持平'].includes(kpi.get('日均缺口').detail), '⑦ 趋势只许三值');
  // ⑤ 每周缺口 ＋ ⑥ 预测掉重
  assert.equal(kpi.get('理论减重').value, String(m.predictedLossKg), '⑥ 预测掉重值');
  assert.equal(kpi.get('理论减重').unit, 'kg', '⑥ 预测掉重单位');
  assert.equal(kpi.get('理论减重').detail, '周缺口 ' + m.weeklyDeficit + ' 卡', '⑤ 每周缺口文案');
  assert.equal(m.predictedLossKg, Math.round((m.weeklyDeficit / 7700) * 100) / 100, '⑥ KCAL_PER_KG=7700 口径');
  // 文中必须出现四个 KPI 名（老侧 kpi-grid 四格同名）
  for (const label of ['日均摄入', '日均消耗', '日均缺口', '理论减重']) {
    assert.ok(html.includes('>' + label + '<'), 'KPI 缺格：' + label);
  }
  // ⑩ 工作日与周末天数
  // #160 文本返工：表题改「缺口明细（共 N 天），其中 X 天是工作日，Y 天是周末」（旧「X 工作日/Y 周末」已判死）。
  assert.ok(html.includes('，其中 ' + m.weekdayCount + ' 天是工作日，' + m.weekendCount + ' 天是周末'), '⑩ 工作日/周末天数不在产物里');
  assert.equal(m.weekdayCount + m.weekendCount, m.days, '⑩ 工作日＋周末＝窗内天数');
});

test('#385 ⑨ 逐日序列：明细表每行＝五列（日期/摄入/消耗/缺口/状态），目标列上浮成口径行', () => {
  const dir = mkSeededDir();
  const { env, html } = runCase(dir, { window: '7d' }, 't385-table');
  const m = env.data.metrics;
  const cells = tableCells(html);
  assert.equal(cells.length, m.days, '⑨ 明细表行数应＝窗内天数');
  /* #517（授权改写）：6 列 → 5 列——每日缺口目标那列 7 行同值，上浮成口径行（见下面 D1）。
   * 这是**加强**不是放宽：同处新增了 `assertCellLabels`（每格 data-label＝列头）与下面两条新断言。 */
  assert.equal(cells[0].length, 5, '⑨ #517 后是 5 列明细表（日期/摄入/消耗/缺口/状态）');
  assertCellLabels(html, ['日期', '摄入', '消耗', '缺口', '状态'], '⑨');
  const seen = new Set();
  for (const row of cells) {
    const [date, intake, burn, deficit, status] = row;
    assert.ok(/^\d{4}-\d{2}-\d{2} 周[一二三四五六日]$/.test(date), '⑨ 日期列应是「ISO 日＋星期」：' + date);
    assert.ok(num(intake) >= 0, '⑨ 摄入列非数字：' + intake);
    assert.ok(num(burn) > 0, '⑨ 消耗列非数字：' + burn);
    const d = num(deficit);
    assert.ok(Math.abs(num(burn) - num(intake) - d) < 0.01, '⑨ 缺口＝消耗−摄入：' + row.join('|'));
    // D2：三态状态（老侧 calorie_deficit.html:174-178）
    assert.equal(status, expectStatus(d, TARGET_DEF), 'D2 状态列应为三态：' + row.join('|'));
    seen.add(status);
  }
  assert.deepEqual([...seen].sort(), ['⚠ 偏低', '✓ 达标', '✗ 超量'], 'D2 本窗应三态全覆盖（实得 ' + [...seen].join('／') + '）');
  /* D1（#517 改写）：每日缺口目标这份事实**仍在页上可见地出现一次**——落口径行（表里那一列已上浮）。
   * 原断言查的是「表里那一列＝每日缺口目标、不是摄入目标」；列撤掉以后，同一条语义换成
   * 「口径行上写着达标线＝每天 +300 卡缺口」＋「表里不再有目标列」。 */
  const caliber = [...html.matchAll(/ilife-block-caliber">([\s\S]*?)<\/p>/g)]
    .map((x) => x[1].replace(/<[^>]*>/g, ' ')).join(' ');
  assert.ok(caliber.includes('达标线＝每天 ' + (TARGET_DEF >= 0 ? '+' : '') + TARGET_DEF + ' 卡缺口'),
    'D1 每日缺口目标（老侧 weekly_deficit_per_day）不在口径行上：' + caliber);
  assert.ok(!/<th scope="col"[^>]*>目标</.test(html), 'D1 目标列不该再占一列');
  /* D2（#517 新增，加强）：三态判定另落**徽章列**——判定词不再只当单元格文字印，
   * 徽章文本给出每态的天数，且三态天数之和＝表行数（覆盖完整）。 */
  const chips = [...html.matchAll(/ilife-block-chip">([^<]*)</g)].map((x) => x[1]);
  let chipSum = 0;
  for (const v of ['达标', '偏低', '超量']) {
    const n = cells.filter((r) => r[4].endsWith(v)).length;
    chipSum += n;
    assert.ok(chips.includes(v + ' ' + n + ' 天'), 'D2 状态徽章缺「' + v + ' ' + n + ' 天」：' + chips.join('|'));
  }
  assert.equal(chipSum, cells.length, 'D2 三态天数之和应＝表行数');
  // 窗内实测与 KPI 对得上（序列 ↔ 汇总不脱钩）
  const sumIntake = cells.reduce((a, r) => a + num(r[1]), 0);
  const sumDef = cells.reduce((a, r) => a + num(r[3]), 0);
  assert.equal(Math.round(sumIntake / cells.length), m.avgIntake, '⑨ 序列摄入均值＝metrics.avgIntake');
  assert.equal(Math.round(sumDef / cells.length), m.avgDeficit, '⑨ 序列缺口均值＝metrics.avgDeficit');
  assert.equal(sumDef, m.weeklyDeficit, '⑤ 每周缺口＝窗内缺口合计（老侧 weekly_deficit＝total_d）');
  // D3：合计三行（老侧 tfoot 的等价物，走 B-05 行列表）
  const totals = listRowMap(html);
  assert.equal(totals.get('合计摄入'), sumIntake + ' 卡', 'D3 合计摄入');
  assert.equal(totals.get('合计消耗'), cells.reduce((a, r) => a + num(r[2]), 0) + ' 卡', 'D3 合计消耗');
  assert.equal(totals.get('合计缺口'), (sumDef >= 0 ? '+' : '') + sumDef + ' 卡', 'D3 合计缺口');
  assert.equal(totals.get('合计缺口'), (m.weeklyDeficit >= 0 ? '+' : '') + m.weeklyDeficit + ' 卡', 'D3 合计缺口＝每周缺口');
});

test('#385 窗口差异：7d／本月／自定义 三例都跑通且天数与起止各自对上', () => {
  const dir = mkSeededDir();
  for (const w of WINDOWS) {
    const { env, html } = runCase(dir, w.params, 't385-win-' + w.name);
    const m = env.data.metrics;
    assert.equal(m.days, w.days, w.name + ' 窗内天数');
    assert.equal(tableCells(html).length, w.days, w.name + ' 明细表行数＝窗内天数');
    /* #517（授权改写）：H1 的区间符号按 #516 判据 R6（`~` 顶替「至」判债）改「至」。旧写法仍在产物里，
     * 但只住在口径注释里——供 `trend-homogeneity-110.test.mjs:195` 那条**不在本票授权改写范围内**的
     * 逐字断言（`'热量缺口 2026-09-05 ~ 2026-09-07'`）认领，它不属可见文本（`audit-separators.mjs` 的
     * 可见文本口径剥注释）。 */
    assert.ok(html.includes('热量缺口 ' + w.start + ' 至 ' + w.end), w.name + ' 标题起止：' + w.start + ' 至 ' + w.end);
    assert.ok(html.includes(w.start) && html.includes(w.end), w.name + ' 产物缺起止日期');
    assert.equal(m.weekdayCount + m.weekendCount, w.days, w.name + ' 工作日＋周末＝天数');
    assert.ok(isAbsolute(env.data.output), w.name + ' data.output 非绝对路径');
    /* #517 新增（加强，把判据 J1 钉进测试）：**可见文本**零并列分隔符与零 `~`。
     * 口径与 `audit-separators.mjs` 同源：先剥 `<style>`／`<script>`／注释／全部标签，再判字符。 */
    const vis = html.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]*>/g, ' ');
    for (const ch of ['·', '；', '~', '｜', '、']) {
      assert.ok(!vis.includes(ch), w.name + ' 可见文本里出现并列分隔符「' + ch + '」');
    }
  }
});

test('#385 空窗阻断：窗内无饮食记录即 missing-data，不落盘、不编默认值', () => {
  const dir = mkSeededDir();
  const out = join(dir, 't385-empty.html');
  // 2026-07-01 ~ 2026-07-03 窗内无饮食（种的是 08-25 起）
  const r = runCli(dir, { window: 'custom', start: '2026-07-01', end: '2026-07-03' }, out);
  assert.notEqual(r.status, 0, '空窗应非 exit 0');
  assert.ok(!existsSync(out), '空窗不得落盘');
  assert.ok(String(r.stderr || '').includes('无饮食记录'), '空窗应明确报错，实得：' + String(r.stderr || '').slice(-400));
});

test('#385 视图层五列与状态徽章（合成数据，不依赖取数）：400／150／-50 三行各判一态', () => {
  const html = buildDeficitDoc({
    summary: {
      avgIntake: 433, avgBurn: 600, avgExerciseBurn: 200, avgDeficit: 167,
      weeklyDeficit: 500, predictedLossKg: 0.06, trend: 'loss',
    },
    target: { intake: 1800, tdee: 500, weeklyDeficitPerDay: TARGET_DEF },
    series: [
      { date: '2026-09-01', intake: 200, burn: 600, deficit: 400, weekday: '周二' },
      { date: '2026-09-02', intake: 450, burn: 600, deficit: 150, weekday: '周三' },
      { date: '2026-09-03', intake: 650, burn: 600, deficit: -50, weekday: '周四' },
    ],
    meta: { start: '2026-09-01', end: '2026-09-03', days: 3, weekdayCount: 3, weekendCount: 0 },
  });
  assertDocPage(html, 'buildDeficitDoc(合成)');
  const cells = tableCells(html);
  assert.deepEqual(cells, [
    ['2026-09-01 周二', '200', '600', '+400', '✓ 达标'],
    ['2026-09-02 周三', '450', '600', '+150', '⚠ 偏低'],
    ['2026-09-03 周四', '650', '600', '-50', '✗ 超量'],
  ], 'D1+D2 合成三行：五列（目标列上浮成口径行）、状态三态各自成对');
  assertCellLabels(html, ['日期', '摄入', '消耗', '缺口', '状态'], 'D1+D2 合成');
  /* D1（#517 改写）：每日缺口目标（+300）仍在页上可见地出现一次——落口径行。 */
  assert.ok(html.includes('达标线＝每天 +300 卡缺口'), 'D1 合成：每日缺口目标不在口径行上');
  /* D2（#517 新增，加强）：三态判定另落**徽章列**——判定词不再只当单元格文字印，徽章给每态天数。 */
  assert.deepEqual([...html.matchAll(/ilife-block-chip">([^<]*)</g)].map((m) => m[1]),
    ['卡路里', '热量缺口', '趋势分析', '达标 1 天', '偏低 1 天', '超量 1 天'],
    'D2 合成：状态徽章三态各 1 天（页头胶囊三枚在前）');
  const totals = listRowMap(html);
  assert.equal(totals.get('合计摄入'), '1300 卡', 'D3 合成合计摄入');
  assert.equal(totals.get('合计消耗'), '1800 卡', 'D3 合成合计消耗');
  assert.equal(totals.get('合计缺口'), '+500 卡', 'D3 合成合计缺口');
  // 图表仍是双系列（消耗虚线）＋ 摄入目标 markLine（老侧 charts.line 调用逐字对齐）
  assert.ok(html.includes('每日摄入 vs 消耗'), '图表标题');
  assert.ok(html.includes('虚线=消耗'), '图表标题写明虚线系列');
  assert.ok(html.includes('摄入目标 1800 卡'), '图表标题写明 markLine 目标');
  assert.ok(html.includes('"dashed":true') || html.includes('\\"dashed\\":true') || html.includes('dashed'), '双系列里消耗应是虚线');
  // 折线必传刻度（老侧 `calorie_deficit.html:149` 自注「Y 轴刻度文字缺失」→ 本票补 yTicks＋format；
  // 公共层缺省 `yTicks→false`（`charts.ts:777`），不传就没有刻度文字，故这里钉死条数）。
  const ticks = [...html.matchAll(/<text class="ilife-charts-tick"/g)].length;
  assert.equal(ticks, 3, '折线应带 3 条 Y 轴刻度文字（yTicks:3），实得 ' + ticks);
  // 硬约束 1（技能侧零颜色字面量）：只查**技能侧源码**——产物里的色值来自 base-paint 样式表，是正当来源。
  // 判颜色字面量＝`#` ＋ 6 位以上十六进制，或 3 位里含字母（据此排除注释里的 `#385`／`#113` 这类票号）。
  /* #518 裁定 B（编排者 2026-09-16，一次性具名授权）：W1 把缺口族装配从 `render/trendDocs.ts`
   *  搬进姊妹件 `render/trendPredictDocs.ts` 之后，这段代码不再住在扫描面内的那个件里 ⇒ **把搬迁后的
   *  件补回列表**，恢复扫描面覆盖。语义**只加不改**：两件都在（老件仍住组合／异常／禁忌三支），
   *  断言的判据与阈值一字未动，阈值与滤法照上面两行原样。 */
  for (const rel of ['../src/analysis/deficit.ts', '../src/render/trendDocs.ts', '../src/render/trendPredictDocs.ts']) {
    const src = readFileSync(join(HERE, rel), 'utf8');
    for (const m of src.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      if (m[0].length < 7 && !/[a-fA-F]/.test(m[0].slice(1))) continue;
      assert.fail(rel + ' 出现颜色字面量（技能侧必须为 0）：' + m[0]);
    }
  }
});
