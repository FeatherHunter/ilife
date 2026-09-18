/** #454 · 场景 04 运动「趋势（1 条）＋复盘（5 条）」融合版式（地图 #156 页面族收尾票）。
 *
 * 骨架照抄 `exercise-receipt-fusion-423.test.mjs`（`mkDir`／`runCli`／`assertDocPage` 逐字学，不另发明）；
 * 参数**不手抄**：本件在运行期读冻结表 `src/triggers/scene-04-exercise.ts`，按唤醒词取 `main_prompt.cli`
 * 原文（`frozenCall`），`<开始日期>`／`<结束日期>` 两个占位填真实日期，其余逐字照跑。
 *
 * 本票判据（机器读，逐条对上票面）：
 *   ① 6 条词逐条真跑（看运动趋势／运动复盘 本周·本月·最近 90 天·今年·自定义时间）：exit 0、
 *      产物存在、`assertDocPage` 过；
 *   ② 趋势页：每日消耗折线（消耗实线＋时长虚线，两套刻度）／每周频次柱图／逐日表
 *      （截断明示、页眉条数与可见行数口径一致、空缺断点不断 0）；
 *   ③ 复盘页：一句话结论条／类型分布条／高频运动徽章／每日消耗趋势；
 *   ④ 五窗同版：五个复盘窗口产物**结构一致**（同一组锚点 id 与区块类名），差异只在文本与数据；
 *   ⑤ 断点口径：缺日不被当 0 计入（表里「—」、折线上少一个点）；
 *   ⑥ 两页都有锚点（href 全有落点）／`ilife-page-printable`／三格式／来源脚注／空态带下一句话；
 *   ⑦ 三类工程话全文命中 0（`calorie.view.`／票号／「移植」）；色值只走 `categoryColor()` 的 hex。
 *
 * 变异自证两行（读数见 `docs/skills/skill-calorie/t454-趋势复盘族融合.md`）：
 *   - 缺日改成补 0（`d.burned` → `d.burned ?? 0`）→ 本测试必红；写回原字节必绿；
 *   - 复盘类别色写成死字面量（`colorOf` 的那一支不吃 `categoryColor()`）→ 本测试必红；写回原字节必绿。
 * 两行都**先 `pnpm build` 再跑**（判据读 `dist/`，不编译则读数无效）。
 *
 * 运行：先 `pnpm build`，再 `node packages/skill-calorie/test/exercise-trend-recap-fusion-454.test.mjs`
 * （6 条产物同时落 `.scratch/t454/out/`，供人双击抽查）。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { categoryColor } from '../dist/exercise/categoryColors.js';
import { buildRecapDoc, buildTrendDoc } from '../dist/exercise/sportPortDocs.js';
import { assertDocPage } from './doc-page-assert.mjs';
import { calorieConfigDir, configTestBase, freezeClock } from './helpers/config-test.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const REPO = join(PKG, '..', '..');
const BIN = join(PKG, 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';
/** 样例产物落点（票面：落 `.scratch/t454/`，不进版本库，回执给可双击绝对路径）。 */
const SAMPLES = join(REPO, '.scratch', 't454', 'out');
/** 冻结「今天」（`CALORIE_TODAY`）：五个窗口都按这一天解析，读数才可复现（2026-06-17 是周三）。 */
const TODAY = '2026-06-17';
const D_TODAY = '2026-06-17';
const D_YESTERDAY = '2026-06-16';
/** 故意空着的一天：05-19..06-17 这 30 天里，06-11 没有任何记录（断点判据）。 */
const D_GAP = '2026-06-11';
const D_MONTH_EVE = '2026-06-10';
const D_MONTH = '2026-06-05';
const D_YEAR_ONLY = '2026-02-10';
/** 两个空窗（自定义时间，窗内一条记录都没有）：空态带下一句话的读数。 */
const EMPTY_START = '2026-05-01';
const EMPTY_END = '2026-05-05';
/** 截断读数用的长窗：120 天 > 逐日表上限 100 行。 */
const LONG_START = '2026-02-18';
const LONG_END = '2026-06-17';
/** 逐日表上限（实现里的 `TREND_ROWS_CAP`，判据按读数钉住 100）。 */
const ROWS_CAP = 100;
/** 30 天窗内有记录的天数（断点判据：折线上的点数＝活跃天数，不等于 30）。 */
const ACTIVE_DAYS_30D = 4;

mkdirSync(SAMPLES, { recursive: true });

/* ─────────────────── 冻结表取参数（不手抄：运行期读票面那张表） ─────────────────── */

const SCENE = readFileSync(join(PKG, 'src', 'triggers', 'scene-04-exercise.ts'), 'utf8');

/** 冻结表某条词的 `main_prompt.cli` → `{ key, params }`（`\"` 是 TS 字面量里的转义，逐层还原）。
 *  `<开始日期>`／`<结束日期>` 这类占位由 `fill` 填真值，其余逐字照跑。 */
function frozenCall(wakeWord, fill = {}) {
  const line = SCENE.split('\n').find((l) => l.includes('"wake_word": "' + wakeWord + '"'));
  assert.ok(line !== undefined, '冻结表里找不到唤醒词「' + wakeWord + '」');
  const m = /"cli": "((?:[^"\\]|\\.)*)"/.exec(line);
  assert.ok(m !== null, '唤醒词「' + wakeWord + '」的 cli 取不到');
  const cli = m[1].replace(/\\"/g, '"');
  const call = /^calorie-cmd-read (\S+) --params '(.*)'$/.exec(cli);
  assert.ok(call !== null, 'cli 形状不是「calorie-cmd-read 键 --params {json}」：' + cli);
  let raw = call[2];
  for (const [token, value] of Object.entries(fill)) raw = raw.split(token).join(value);
  return { key: call[1], params: JSON.parse(raw), cli };
}

function mkDir() {
  const dir = mkdtempSync(join(tmpdir(), 't454-exercise-'));
  const db = openDb(join(dir, DB_FILENAME));
  db.close();
  return dir;
}

/** 真 CLI 跑一条命令并落盘（产物直接落样例目录，回执里的路径即用户双击的那一份）。 */
function runCli(dir, key, params, outName) {
  const out = join(SAMPLES, (outName ?? key.replace(/\./g, '_')) + '.html');
  const r = spawnSync(NODE_BIN, [BIN, key, '--params', JSON.stringify(params ?? {}), '--html', out], {
    encoding: 'utf8', env: { ...process.env, ILIFE_CONFIG_DIR: calorieConfigDir(dir), ...freezeClock(TODAY) },
  });
  const stdout = String(r.stdout || '').trim();
  const file = existsSync(out) ? readFileSync(out, 'utf8') : null;
  // 机读留痕：每条真跑的 exit 与产物字节数（证据件与门禁日志的可对账读数；字节数取 stat，不取字符数）。
  console.log('T454-RUN ' + (outName ?? key) + ' exit=' + r.status + ' bytes=' + (file === null ? 0 : statSync(out).size));
  return { status: r.status, out, stderr: String(r.stderr || '').trim(), file };
}

/** 五个窗口共用的一份数据（一条记录都没落在那两个空窗里）。 */
const SEED = [
  { type: '慢跑', calories: 320, minutes: 30, category: '有氧', date: D_TODAY },
  { type: '卧推', calories: 150, minutes: 20, category: '力量', date: D_TODAY },
  { type: '慢跑', calories: 300, minutes: 30, category: '有氧', date: D_YESTERDAY },
  { type: '游泳', calories: 280, minutes: 35, category: '有氧', date: D_MONTH_EVE },
  { type: '步行', calories: 80, minutes: 20, category: '日常', date: D_MONTH },
  { type: '游泳', calories: 260, minutes: 40, category: '有氧', date: D_YEAR_ONLY },
];

let seeded = null;
/** 已播过种的那张库（读命令不改库，6 条词共用一份，省得每次重播）。 */
function seededDir() {
  if (seeded !== null) return seeded;
  const dir = mkDir();
  for (const row of SEED) {
    const r = runCli(dir, 'calorie.exercise.add', row, 'seed-' + row.date + '-' + row.type);
    assert.equal(r.status, 0, 'seed ' + row.type + ' stderr=' + r.stderr.slice(-200));
  }
  seeded = dir;
  return dir;
}

/* ───────────────────────────────── 读数小工具 ───────────────────────────────── */

function cardOf(html, id) {
  const hit = new RegExp('<section id="' + id + '">([\\s\\S]*?)</section>').exec(html);
  return hit === null ? '' : hit[1];
}

/** 类名**落在标记上**（不是落在那条常驻样式规则里）：按空格逐段精确比。 */
function hasClass(html, name) {
  return [...html.matchAll(/class="([^"]*)"/g)].some((m) => m[1].split(/\s+/).includes(name));
}

/** 页内锚点全表（`<section id="...">`）——五窗同版判据按它逐字比。 */
function anchorsOf(html) {
  return [...html.matchAll(/<section id="([^"]+)">/g)].map((m) => m[1]);
}

/** 页上出现过的页面级类名（去重排序）——五窗同版判据的第二把尺。 */
function blockClassesOf(html) {
  const names = [...html.matchAll(/class="([^"]*)"/g)]
    .flatMap((m) => m[1].split(/\s+/))
    .filter((c) => c.startsWith('ilife-block-') || c === 'ilife-block');
  return [...new Set(names)].sort();
}

/** 主序列（`data-s="0"`）的数据点数：缺日不画点，故点数＝有记录的天数（断点判据）。 */
function mainDots(html) {
  return [...html.matchAll(/class="ilife-charts-dot[^"]*" data-s="0"/g)].length;
}

/** 表格正文行数（`<tbody>` 里的 `<tr>`）。 */
function bodyRows(card) {
  const body = /<tbody>([\s\S]*?)<\/tbody>/.exec(card);
  return body === null ? 0 : (body[1].match(/<tr>/g) ?? []).length;
}

/** 每个复盘窗口共用的融合版式断言（票面 ①③⑥⑦ 的机器面）。
 *  断言次序：**先结构、后文本**——红读数才指向「缺哪件融合构件」，而不是先撞上页头文案那一条。 */
function assertFusion(r, what, eyebrow) {
  assert.equal(r.status, 0, what + ' exit ' + r.status + ' stderr=' + r.stderr.slice(-300));
  assert.ok(r.file !== null, what + ' 产物未落盘');
  assertDocPage(r.file, what);

  // ⑥ 页内导航：每个 href 都有对应的页内 id。
  assert.ok(r.file.includes('<nav class="ilife-block-toc" aria-label="页内导航">'), what + ' 缺页内导航');
  const ids = new Set([...r.file.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const hrefs = [...r.file.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
  assert.ok(hrefs.length >= 4, what + ' 页内导航只有 ' + hrefs.length + ' 个锚点');
  for (const href of hrefs) assert.ok(ids.has(href), what + ' 锚点 ' + href + ' 没有对应的页内 id');
  // ⑥ 可打印：类落版面根 ＋ 具名页绑定都在（#448 透传位）。
  assert.ok(/<section class="[^"]*ilife-block-page-shell[^"]*ilife-page-printable[^"]*">/.test(r.file),
    what + ' 的 ilife-page-printable 没有落在版面根上');
  assert.ok(r.file.includes('page: printable') && r.file.includes('@page printable'),
    what + ' 缺具名页 @page printable');
  // ⑥ 三格式复制菜单（顺序固定）。
  assert.deepEqual([...r.file.matchAll(/data-fmt="([^"]+)"/g)].map((m) => m[1]), ['text', 'json', 'csv'],
    what + ' 的复制数据不是三格式菜单');
  // ⑥ 来源脚注 ＋ 口径行。
  // #544：来源脚注改键值行「数据来源／窗口／记录数」，不再是 `数据来源 · …` 那种 `·` 串。
  assert.ok(r.file.includes('数据来源'), what + ' 缺来源脚注');
  assert.ok((r.file.match(/class="ilife-block-caliber"/g) ?? []).length >= 2,
    what + ' 口径行／来源脚注不足两条（ilife-block-caliber）');
  assert.ok(r.file.length > 10000, what + ' 产物只有 ' + r.file.length + ' 字符，看着仍像片段');
  // ⑦ 三类工程话全文命中 0（命令键／票号／工序词「移植」）。
  assert.ok(!r.file.includes('calorie.view.'), what + ' 产物里出现命令键 calorie.view.*');
  assert.ok(!r.file.includes('移植'), what + ' 产物里出现工序词「移植」');
  assert.ok(!/t454\b/i.test(r.file) && !r.file.includes('#454'), what + ' 产物里出现票号');
  // 页头写人话：眉标是「运动<页名>」（#544 去 `·`），<title> 是人话标题。
  const title = (/<title>([^<]*)<\/title>/.exec(r.file) ?? [])[1] ?? '';
  const gotEyebrow = (/<p class="ilife-block-page-shell-eyebrow">([^<]*)<\/p>/.exec(r.file) ?? [])[1] ?? '';
  assert.equal(gotEyebrow, eyebrow, what + ' 眉标不是人话原文：' + gotEyebrow);
  assert.ok(!/calorie\.[a-z]/.test(title) && !/\bt\d{3}\b/i.test(title), what + ' 的 <title> 里有工程话：' + title);
}

/* ───────────────────────── ① 6 条词（冻结表逐字参数） ───────────────────────── */

const RECAP_TITLE = '卡路里 运动复盘';

test('#454 看运动趋势（冻结表 window=30d）→ 趋势页融合版式', () => {
  const call = frozenCall('看运动趋势');
  assert.equal(call.key, 'calorie.view.exercise-trend');
  assert.deepEqual(call.params, { window: '30d' });
  const r = runCli(seededDir(), call.key, call.params, '01-trend');
  assertFusion(r, '看运动趋势', '运动趋势');
  assert.equal((/<title>([^<]*)<\/title>/.exec(r.file) ?? [])[1], '卡路里 运动趋势');

  // ② 每日消耗折线：消耗实线（无虚线属性）＋时长虚线（`stroke-dasharray`），两套刻度各一条序列。
  const line = cardOf(r.file, 'sec-line');
  assert.ok(line.includes('data-chart-kind="line"'), '缺每日消耗折线容器');
  const paths = [...line.matchAll(/<path class="ilife-charts-line[^"]*"[^>]*>/g)].map((m) => m[0]);
  assert.equal(paths.length, 2, '折线不是两条序列（消耗＋时长）：' + paths.length);
  assert.equal(paths.filter((p) => p.includes('stroke-dasharray="6 5"')).length, 1, '时长那条不是虚线');
  assert.equal(paths.filter((p) => !p.includes('stroke-dasharray')).length, 1, '消耗那条不是实线');
  assert.ok(line.includes('data-s="1"'), '缺副刻度序列的点');
  // ② 每周频次柱图。
  assert.ok(cardOf(r.file, 'sec-weekly').includes('data-chart-kind="bar"'), '缺每周频次柱图容器');
  // ② 逐日表：页眉条数（共 30 天／列出 30 天）与可见行数口径一致，未截断就不说截断。
  const daily = cardOf(r.file, 'sec-daily');
  assert.equal(bodyRows(daily), 30, '逐日表可见行数不是 30');
  assert.ok(daily.includes('共 30 天'), '逐日表页眉没报窗口天数');
  assert.ok(daily.includes('列出 30 天'), '逐日表页眉没报列出天数');
  assert.ok(daily.includes('未截断'), '30 天窗没截断却没印「未截断」');
  // ⑤ 断点：缺日不补 0（表里「—」），折线上的点数＝活跃天数。
  assert.equal(mainDots(line), ACTIVE_DAYS_30D, '折线点数不等于活跃天数（缺日被当成 0 画点了）');
  const gapRow = new RegExp('<tr>(?:(?!</tr>)[\\s\\S])*' + D_GAP + '(?:(?!</tr>)[\\s\\S])*</tr>').exec(daily);
  assert.ok(gapRow !== null, '逐日表里找不到缺日那一行：' + D_GAP);
  assert.ok(gapRow[0].includes('—'), '缺日那一行没有印「—」（被当成了 0）');
});

for (const [i, word] of ['运动复盘（本周）', '运动复盘（本月）', '运动复盘（最近 90 天）', '运动复盘（今年）']
  .entries()) {
  test('#454 ' + word + '（冻结表逐字参数）→ 复盘页融合版式', () => {
    const call = frozenCall(word);
    assert.equal(call.key, 'calorie.view.exercise-recap');
    const r = runCli(seededDir(), call.key, call.params, '0' + (i + 2) + '-recap-' + ['week', 'month', '90d', 'year'][i]);
    assertFusion(r, word, '运动复盘');
    assert.equal((/<title>([^<]*)<\/title>/.exec(r.file) ?? [])[1], RECAP_TITLE);
    // ③ 一句话结论条（页内静态提示形态）＋核心数字。
    assert.ok(hasClass(r.file, 'ilife-block-feedback-block-note'), word + ' 缺一句话结论条');
    assert.ok(cardOf(r.file, 'sec-conclusion').includes('共运动'), word + ' 结论条里不是本窗的那句话');
    assert.ok(hasClass(r.file, 'ilife-block-kpi-card'), word + ' 缺核心数字卡');
    // ③ 类型分布条：条色只走 categoryColor() 的 hex。
    const cat = cardOf(r.file, 'sec-category');
    assert.ok(hasClass(cat, 'ilife-block-dist-row'), word + ' 缺类型分布条');
    for (const [name, key] of [['有氧', 'cardio'], ['力量', 'strength'], ['日常', 'daily']]) {
      if (!cat.includes('>' + name + '</span>')) continue;
      const hex = categoryColor(key);
      assert.ok(cat.includes('background:' + hex), word + ' 的「' + name + '」条色不是 categoryColor() 的 hex：' + hex);
    }
    // ③ 高频运动徽章 ＋ 每日消耗趋势。
    assert.ok(hasClass(cardOf(r.file, 'sec-badges'), 'ilife-block-chip'), word + ' 缺高频运动徽章');
    assert.ok(cardOf(r.file, 'sec-daily').includes('data-chart-kind="line"'), word + ' 缺每日消耗趋势块');
  });
}

test('#454 运动复盘（自定义时间）（冻结表 window=custom＋真日期）→ 复盘页融合版式', () => {
  const call = frozenCall('运动复盘（自定义时间）', { '<开始日期>': '2026-06-01', '<结束日期>': '2026-06-30' });
  assert.equal(call.key, 'calorie.view.exercise-recap');
  assert.deepEqual(call.params, { window: 'custom', start: '2026-06-01', end: '2026-06-30' });
  const r = runCli(seededDir(), call.key, call.params, '06-recap-custom');
  assertFusion(r, '运动复盘（自定义时间）', '运动复盘');
  assert.ok(r.file.includes('2026-06-01') && r.file.includes('2026-06-30'), '窗口没落成给的那对日期');
  assert.ok(hasClass(r.file, 'ilife-block-feedback-block-note'), '缺一句话结论条');
  assert.ok(hasClass(cardOf(r.file, 'sec-category'), 'ilife-block-dist-row'), '缺类型分布条');
  assert.ok(hasClass(cardOf(r.file, 'sec-badges'), 'ilife-block-chip'), '缺高频运动徽章');
  assert.ok(cardOf(r.file, 'sec-daily').includes('data-chart-kind="line"'), '缺每日消耗趋势块');
});

/* ───────────────────────────── ④ 五窗同版 ───────────────────────────── */

test('#454 五窗同版：五个复盘窗口的锚点 id 与区块类名逐一相同（差异只在文本与数据）', () => {
  const dir = seededDir();
  const runs = [
    ['本周', '10-same-week', { window: '本周' }],
    ['本月', '11-same-month', { window: '本月' }],
    ['最近 90 天', '12-same-90d', { window: '90d' }],
    ['今年', '13-same-year', { window: '今年' }],
    ['自定义时间', '14-same-custom', { window: 'custom', start: LONG_START, end: LONG_END }],
  ].map(([label, out, params]) => {
    const r = runCli(dir, 'calorie.view.exercise-recap', params, out);
    assert.equal(r.status, 0, label + ' exit ' + r.status + ' stderr=' + r.stderr.slice(-200));
    assertDocPage(r.file, label);
    return { label, r };
  });
  const base = runs[0];
  console.log('T454-SAME-VIEW anchors=' + anchorsOf(base.r.file).join(',')
    + ' classes=' + blockClassesOf(base.r.file).length);
  for (const run of runs.slice(1)) {
    assert.deepEqual(anchorsOf(run.r.file), anchorsOf(base.r.file),
      run.label + ' 的锚点 id 与本窗不同版\n' + anchorsOf(run.r.file).join(',')
      + '\n vs \n' + anchorsOf(base.r.file).join(','));
    assert.deepEqual(blockClassesOf(run.r.file), blockClassesOf(base.r.file),
      run.label + ' 的区块类名与本窗不同版');
  }
  // 差异只在数据：五份产物的页面标题（h1）各不相同，且各自含自己窗口解析出的起始日。
  const titles = runs.map((x) => (/<h1 class="ilife-block-page-shell-title">([^<]*)<\/h1>/.exec(x.r.file) ?? [])[1]);
  assert.equal(new Set(titles).size, 5, '五窗的页面标题没有体现各自的窗口：' + titles.join(' / '));
  const WINDOW_START = { 本周: '2026-06-15', 本月: '2026-06-01', 最近90天: '2026-03-20', 今年: '2026-01-01', 自定义时间: LONG_START };
  for (const [label, start] of Object.entries(WINDOW_START)) {
    const hit = runs.find((x) => x.label.replace(/\s+/g, '') === label);
    assert.ok(hit !== undefined && hit.r.file.includes(start),
      label + ' 的产物里没有本窗自己的起始日 ' + start);
  }
});

/* ───────────────────── ② 截断明示 ／ ⑥ 空态带下一句话 ───────────────────── */

test('#454 长窗（120 天）逐日表：截断明示＋页眉条数与可见行数口径一致', () => {
  const r = runCli(seededDir(), 'calorie.view.exercise-trend',
    { window: 'custom', start: LONG_START, end: LONG_END }, '07-trend-long');
  assertFusion(r, '看运动趋势（长窗）', '运动趋势');
  const daily = cardOf(r.file, 'sec-daily');
  assert.equal(bodyRows(daily), ROWS_CAP, '可见行数不是 ' + ROWS_CAP);
  assert.ok(daily.includes('共 120 天'), '页眉没报窗口总天数');
  assert.ok(daily.includes('列出 ' + ROWS_CAP + ' 天'), '页眉没报列出天数');
  assert.ok(daily.includes('截断') && daily.includes('前 ' + ROWS_CAP + ' 天'), '截断没有明示');
});

test('#454 空窗两页：真出口按缺失阻断退出 4；空态产物在装配层构造（带下一句话，不留空图表壳）', () => {
  const dir = seededDir();
  const empty = { window: 'custom', start: EMPTY_START, end: EMPTY_END };
  // 实测：两个键在空窗都按缺失阻断退出 4、不落产物（`exercisePort.ts` 的 `listPortRows` 抛 missing-data），
  // 故「空态产物」只能装配层构造（与 #423 的「空明细」同一处境，证据件里写明）。
  const blocked = [
    ['calorie.view.exercise-trend', '08-trend-empty-blocked'],
    ['calorie.view.exercise-recap', '09-recap-empty-blocked'],
  ].map(([key, out]) => {
    const r = runCli(dir, key, empty, out);
    assert.equal(r.status, 4, key + ' 空窗今天应缺失阻断退出 4（实测读数）stderr=' + r.stderr.slice(-160));
    assert.equal(r.file, null, key + ' 被阻断却落了产物');
    return r;
  });
  assert.ok(blocked[0].stderr.includes('无运动记录'), '阻断理由不是「无运动记录」：' + blocked[0].stderr.slice(-120));

  const spanDays = [];
  for (let d = EMPTY_START; d <= EMPTY_END; d = new Date(Date.parse(d + 'T12:00:00Z') + 86400000).toISOString().slice(0, 10)) {
    spanDays.push(d);
  }
  // 趋势空态：装配层构造（空窗的取数在真出口是抛错，产不出产物）。
  const trendEmpty = buildTrendDoc({
    start: EMPTY_START, end: EMPTY_END,
    days: spanDays.map((date) => ({ date, minutes: null, burned: null, sessions: 0 })),
    weekly: [], activeDays: 0, totalMinutes: null, totalBurned: 0, peak: null,
  });
  assertFusion({ status: 0, file: trendEmpty, stderr: '' }, '看运动趋势（空窗）', '运动趋势');
  assert.ok(hasClass(trendEmpty, 'ilife-block-empty-block'), '趋势空窗缺空态');
  assert.ok(trendEmpty.includes('说「记运动」'), '趋势空窗缺下一句话');
  assert.equal(cardOf(trendEmpty, 'sec-line'), '', '空窗却出了折线卡外壳');
  assert.equal(cardOf(trendEmpty, 'sec-weekly'), '', '空窗却出了柱图卡外壳');
  assert.equal(cardOf(trendEmpty, 'sec-daily'), '', '空窗却出了逐日表卡外壳');

  const recapEmpty = buildRecapDoc({
    start: EMPTY_START, end: EMPTY_END, sessions: 0, totalMinutes: null, totalBurned: 0,
    activeDays: 0, days: spanDays.length, byCategory: [], top5: [],
    daily: spanDays.map((date) => ({ date, burned: null })),
    summary: '本窗 ' + spanDays.length + ' 天中共运动 0 天、0 次、累计消耗 0 卡。',
  });
  assertFusion({ status: 0, file: recapEmpty, stderr: '' }, '运动复盘（空窗）', '运动复盘');
  assert.ok(hasClass(recapEmpty, 'ilife-block-empty-block'), '复盘空窗缺空态');
  assert.ok(recapEmpty.includes('说「记运动」'), '复盘空窗缺下一句话');
  assert.equal(cardOf(recapEmpty, 'sec-category'), '', '空窗却出了类型分布条外壳');
  assert.equal(cardOf(recapEmpty, 'sec-badges'), '', '空窗却出了高频徽章外壳');
  assert.equal(cardOf(recapEmpty, 'sec-daily'), '', '空窗却出了趋势块外壳');
});
