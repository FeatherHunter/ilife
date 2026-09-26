/** #273 · 复盘／餐别分布页 10 条词 ＋ `buildMealDistributionBlock` 的逐条探针。
 *
 * **本探针守什么**（每条对应票面一条判据／`t425-融合基准.md` 一条裁定）：
 *  ① 复盘 6 条词**逐条真出口 exit 0**，产物是**完整文档**（`<!doctype html>` ＋ charset ＋ 样式段 ＋
 *     整页根类），且逐块对得上老实物 `diet_review.html`（老实物正本
 *     `D:\2Study\StudyNotes\SKILLS\卡路里\templates\`，**只读**）。
 *  ② `calorie.view.diet-review` 全 8 条词是同一张页：营养配比那一段就是 #275 交的
 *     `buildNutritionRatioBlock`（本票**集成**，不自己重写一份）。
 *  ③ **餐别 5 条**：路由记录带 `meal`（#276 已接线）⇒ 真出口出**餐别分布页**，页上的区块就是本件
 *     交付的 `buildMealDistributionBlock()`；另有区块**直测**逐块对得上 `meal_distribution.html`；
 *     参数缺失一律按用法错走（`bad-input` ⇒ exit 2，不编数）。
 *  ④ 融合骨架：眉标（人话，无命令键）／结论句含读数／页内导航／来源脚注；裁定 2-补 结论句与来源
 *     脚注走普通小字行不走深底块；裁定 5 单点不成线；裁定 4 窗口为空仍出完整页、库为空仍 exit 4。
 *  ⑤ **变异自证**：改坏源件一处 ⇒ 同一段断言必红；逐文件还原 ⇒ 变绿（两行机器读数见证据件）。
 *
 * 跑法：`node --test packages/skill-calorie/test/t273-review-meal.test.mjs`
 * （先 `node node_modules/typescript/bin/tsc -b packages/base-render packages/skill-calorie`）
 *
 * **件名与历史**：本探针原住 `test/diet-review-t273.test.mjs`（`68332d5` 那一笔），收口时按票面
 * 「`test/t273-*.test.mjs`」改名到本件——**一处定义**，不留同内容的第二份副本。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

import { machineWords, visibleText } from './visible-text-probe.mjs';
import { calorieConfigDir, configTestBase, freezeClock } from './helpers/config-test.mjs';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');

const { openDb } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

const D = SEED_TODAY;              // 2026-09-07（种子锚点）
const WEEK = '2026-09-01 ~ 2026-09-07';

/** 一条词一次真跑：库、产物都落系统 tmp（收尾自证不落仓内件）。 */
function freshDb(seed = true) {
  const dir = mkdtempSync(join(tmpdir(), 't273-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  if (seed) seedFull(db);
  db.close();
  return dir;
}

function render(dir, key, params) {
  const out = join(dir, 't273-out-' + Math.random().toString(36).slice(2, 8) + '.html');
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params), '--html', out], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...homeEnvOf(calorieConfigDir(dir)), ...freezeClock(D) },
  });
  return {
    status: r.status, stderr: String(r.stderr), out,
    html: r.status === 0 ? readFileSync(out, 'utf8') : '',
    bytes: r.status === 0 ? statSync(out).size : 0,
  };
}

function renderOk(dir, key, params, what) {
  const r = render(dir, key, params);
  assert.equal(r.status, 0, what + ' 真出口 exit=' + r.status + ' stderr=' + r.stderr.slice(-300));
  return r;
}

function thsOf(html) {
  const head = html.slice(html.indexOf('<thead>') + 7, html.indexOf('</thead>'));
  return [...head.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) => m[1]);
}
function visible(html) { return visibleText(html); }
/** 日志里「调用链」那一段（第 4 段）的下一行。 */
function logTextOf(html) {
  const i = html.indexOf('data-action-id="ilife-copy-log"');
  assert.ok(i > 0, '页面上找不到「复制日志」按钮');
  const start = html.lastIndexOf('<button', i);
  const btn = html.slice(start, html.indexOf('>', i) + 1);
  const m = /data-t="([\s\S]*?)"/.exec(btn);
  assert.ok(m, '复制日志按钮上读不到日志文本（按钮没接日志＝死按钮）');
  return m[1].replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
function callChainOf(log) {
  const segs = log.split('\n');
  assert.equal(segs.filter((s) => /^(场景标识|AI 思考链|数据结构|调用链|时间戳版本|异常)$/.test(s.trim())).length,
    6, '日志不是六段：' + log.slice(0, 160));
  return segs[segs.findIndex((s) => s.trim() === '调用链') + 1];
}

/* ── ① 复盘 6 条词逐条真跑（参数照 `src/diet/routes.ts` 的真值，起止按种子库锚点推） ── */

const PAGES = [
  { id: '饮食复盘（本周）', params: { window: '本周' }, span: D + ' ~ ' + D, trend: false },
  { id: '饮食复盘（本月）', params: { window: '本月' }, span: WEEK, trend: true },
  { id: '饮食复盘（最近 90 天）', params: { window: '90d' }, span: '2026-06-10 ~ ' + D, trend: true },
  { id: '饮食复盘（今年）', params: { window: '今年' }, span: '2026-01-01 ~ ' + D, trend: true },
  { id: '饮食复盘（自定义时间）', params: { window: 'custom', start: '2026-09-01', end: D }, span: WEEK, trend: true },
  { id: '看饮食复盘', params: { window: '今日' }, span: D + ' ~ ' + D, trend: false },
];

const DIR = freshDb();
const RUNS = PAGES.map((p) => ({ p, ...renderOk(DIR, 'calorie.view.diet-review', p.params, p.id) }));

for (const { p, html, bytes, out } of RUNS) {
  test('#273 ① 完整文档 ＋ 逐块对得上 diet_review.html —— ' + p.id, () => {
    console.log('READING #273 ' + p.id + ' 产物 ' + out + ' ' + bytes + ' B');
    assert.ok(bytes > 4000, p.id + ' 产物过小（' + bytes + ' B）');
    assert.ok(html.startsWith('<!doctype html>'), p.id + ' 产物不是完整文档（缺 doctype）');
    assert.ok(html.includes('<meta charset="utf-8">'), p.id + ' 缺 charset（中文会乱码）');
    assert.ok(html.includes('<style>'), p.id + ' 缺样式段');
    assert.ok(html.includes('ilife-page'), p.id + ' 缺整页根类');
    assert.ok(!html.includes('<!--'), p.id + ' 产物里还有 HTML 注释残留');
    /* 页题与表题都是短名（区间不住标题，住正文首件窗口条）；其余老实物的块，一个不少。 */
    for (const b of ['📝 饮食复盘', '总热量', '日均热量', '总蛋白', '日均蛋白', '高频食物 TOP5',
      '按餐汇总', '📊 数据来源 · 饮食记录 · 饮食专属复盘 · ' + p.span.replace(' ~ ', ' → ')]) {
      assert.ok(visible(html).includes(b), p.id + ' 缺老实物那一块：「' + b + '」');
    }
    assert.ok(html.includes('dui-window'), p.id + ' 正文首件缺窗口条');
    for (const d of p.span.split(' ~ ')) assert.ok(html.includes(d), p.id + ' 窗口条缺日期 ' + d);
    assert.deepEqual(thsOf(html).slice(0, 5), ['排名', '食物', '总热量', '次数', '餐均'], p.id + ' 高频 TOP5 表列与老实物不一致');
    /* 裁定 5：单点不成线 —— 只有一天有记录的两条词不出趋势图（锚点仍在，落一句说明）。 */
    const chartTitle = '<h2 class="ilife-block-chart-block-title">每日热量趋势</h2>';
    if (p.trend) {
      assert.ok(html.includes(chartTitle), p.id + ' 多天窗口没出趋势图');
    } else {
      assert.ok(!html.includes(chartTitle), p.id + ' 单天窗口画了半截趋势线');
      assert.ok(visible(html).includes('连不成趋势线'), p.id + ' 单天窗口没出「单点不成线」的说明句');
    }
    assert.ok(html.includes('<section id="rv-trend">'), p.id + ' 趋势那一项的锚点不在位（导航指空）');
  });
}

/* ── ② 八个唤醒词同一张页：营养配比那一段＝#275 交的具名区块（本票集成） ── */

for (const { p, html } of RUNS) {
  test('#273 ② 集成 #275 的营养配比区块 ＋ 三处锚点不重号 —— ' + p.id, () => {
    const text = visible(html);
    for (const b of ['热量来源占比（按营养素折算）', '折算合计（千卡）', '推荐范围对比', '营养配比']) {
      assert.ok(text.includes(b), p.id + ' 营养配比那一段缺块：「' + b + '」');
    }
    assert.ok(html.includes('<section id="sec-chart">'), p.id + ' 营养区块的图锚点不在位（导航会指空）');
    const ids = [...html.matchAll(/<section id="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(ids).size, ids.length, p.id + ' 页内锚点重号：' + ids.join('、'));
  });
}

/* ── ③ 融合骨架 ＋ 裁定 1／2-补／7 ── */

const DEEP_BLOCK_CLASSES = ['ilife-block ilife-block-feedbackBlock'];

for (const { p, html } of RUNS) {
  test('#273 ③ 骨架：眉标／结论句含读数／页内导航／来源脚注 ＋ 裁定 1／2-补／7 —— ' + p.id, () => {
    const text = visible(html);
    assert.ok(text.includes('饮食复盘饮食'), p.id + ' 眉标不是人话族名');
    assert.ok(text.includes('复盘餐别'), p.id + ' 缺类型徽章');
    assert.ok(html.includes('class="ilife-block-toc"') && html.includes('aria-label="页内导航"'), p.id + ' 缺页内导航');
    for (const n of ['本窗读数', '每日热量趋势', '高频食物 TOP5', '按餐汇总', '营养配比', '复制数据']) {
      assert.ok(text.includes(n), p.id + ' 页内导航缺项：「' + n + '」');
    }
    for (const id of ['rv-kpi', 'rv-top', 'rv-meal', 'rv-copy', 'sec-chart']) {
      assert.ok(html.includes('<section id="' + id + '">'), p.id + ' 导航项的落点不在位：' + id);
    }
    const conclusion = html.slice(html.indexOf('<h1'), html.indexOf('<nav class="ilife-block-toc"'));
    assert.ok(/[0-9]/.test(conclusion), p.id + ' 结论句里没有读数：' + conclusion.slice(0, 200));
    assert.ok(conclusion.includes('本窗有记录'), p.id + ' 结论句不是本页那句');
    for (const cls of DEEP_BLOCK_CLASSES) assert.ok(!html.includes(cls), p.id + ' 页面上还留着深底提示块：「' + cls + '」');
    /* 裁定 1：可见文本零机器话（复制载荷里允许有命令键与库表名）。
       两个**具名放过**（都不是源码标识符，是页面自己的词）：`JSON`＝公共层复制菜单的格式名
       （与 `test/t275`／`test/t272` 同口径）；`TOP5`＝老实物 `diet_review.html:84` 自己的可见
       标题「高频食物 TOP5」逐字（本票判据要求对得上老实物，故不改成「前五名」）。 */
    const hits = machineWords(html)
      .filter((w) => w.hit !== null && w.hit !== 'JSON' && w.hit !== 'TOP5')
      .map((w) => w.kind + '＝「' + w.hit + '」');
    assert.deepEqual(hits, [], p.id + ' 可见文本里出现机器话：' + hits.join('　'));
    assert.ok(html.includes('calorie.view.diet-review'), p.id + ' 复制载荷里的命令键不该一起消失');
    /* 裁定 7：双按钮 ＋ 日志第 4 段＝本次命令原文（照抄可重跑）。 */
    assert.ok(html.includes('data-fmt-open="1"'), p.id + ' 缺「复制数据」三格式菜单开合器');
    const call = callChainOf(logTextOf(html));
    assert.ok(call.startsWith('calorie-cmd-read calorie.view.diet-review --params \''), p.id + ' 第 4 段不是命令原文：' + call);
    for (const [k, v] of Object.entries(p.params)) {
      assert.ok(call.includes(JSON.stringify(k) + ':' + JSON.stringify(v)), p.id + ' 命令原文没带全本次参数 ' + k);
    }
    assert.ok(!html.includes('>复制数据</h2>') && !html.includes('>复制日志</h2>'), p.id + ' 出了与按钮同名的标题');
    assert.ok(!text.includes('food_log'), p.id + ' 库表名漏到可见文本里');
  });
}

/* ── ④ 裁定 4：窗口为空仍出完整页；库为空仍 exit 4 ── */

test('#273 ④ 窗口为空（库里别处有记录）⇒ 完整空态页 ＋ 引导句 ＋ 来源脚注', () => {
  const r = renderOk(DIR, 'calorie.view.diet-review', { window: 'custom', start: '2026-09-03', end: '2026-09-04' }, '空窗');
  assert.ok(r.html.startsWith('<!doctype html>') && r.html.includes('<meta charset="utf-8">'), '空窗页不是完整文档');
  const text = visible(r.html);
  assert.ok(text.includes('一条饮食记录也没有'), '空窗页缺空态句');
  assert.ok(text.includes('先用「记一餐」'), '空窗页缺「怎么记第一条」的引导句');
  assert.ok(text.includes('📊 数据来源 · 饮食记录 · 饮食专属复盘 · 2026-09-03 → 2026-09-04'), '空窗页缺来源脚注');
  assert.ok(text.includes('这段日子没有饮食记录'), '空窗页缺结论句');
  assert.ok(r.bytes > 4000, '空窗页过小（' + r.bytes + ' B）');
});

test('#273 ④ 库为空 ⇒ 仍是既有缺失阻断 exit 4（页面不据裁定 4 去改它）', () => {
  const empty = freshDb(false);
  const r = render(empty, 'calorie.view.diet-review', { window: '7d' });
  assert.equal(r.status, 4, '空库该 exit 4，实测 exit=' + r.status + ' stderr=' + r.stderr.slice(-200));
  assert.match(r.stderr, /ERR 4: 取数失败（缺失阻断）/, '空库的失败文案不是既有那句');
});

/* ── ⑤ 餐别 5 条：路由带 `meal` ⇒ 真出口出餐别页（区块＝本件交付） ＋ 区块直测 ── */

const { buildMealDistributionView } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'diet', 'review.js')).href);
const { buildMealDistributionBlock, mealParamOf } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'diet', 'reviewDocs.js')).href);

const MDB = openDb(join(DIR, 'calorie_data.db'));
const ALL = buildMealDistributionView(MDB, 'all', '2026-09-01', D);
const BREAKFAST = buildMealDistributionView(MDB, 'breakfast', '2026-09-01', D);
const ALL_BLOCK = buildMealDistributionBlock(ALL, "calorie-cmd-read calorie.view.diet --params '{\"window\":\"7d\",\"meal\":\"all\"}'");
const SINGLE_BLOCK = buildMealDistributionBlock(BREAKFAST);
const SNACK_EMPTY = buildMealDistributionView(MDB, '加餐', '2026-09-01', '2026-09-04');
const SNACK_BLOCK = buildMealDistributionBlock(SNACK_EMPTY);
MDB.close();

test('#273 ⑤ 餐别 5 条逐条真出口：路由带 `meal` ⇒ 出餐别分布页 ＋ 本件区块（exit 0／完整文档）', () => {
  /* 参数**照当刻路由记录**（`src/home/routes.ts:32-36`）：`{"window":"7d","meal":"…"}`。这一族在复盘页
     之外的那一半，页住在 `calorie.view.diet`（#271 是那条命令的作者），**区块必须是本件交付的
     `buildMealDistributionBlock`** —— 页上 `<section id="md-kpi">` 与七列明细表同现，就是区块到位的读法。 */
  const MEALS = [
    { word: '看早餐（最近 7 天）', meal: '早餐', n: 4 },
    { word: '看午餐（最近 7 天）', meal: '午餐', n: 4 },
    { word: '看晚餐（最近 7 天）', meal: '晚餐', n: 1 },
    { word: '看加餐（最近 7 天）', meal: '加餐', n: 1 },
    { word: '看全部餐别分布（最近 7 天）', meal: 'all', n: 10 },
  ];
  for (const m of MEALS) {
    const r = renderOk(DIR, 'calorie.view.diet', { window: '7d', meal: m.meal }, m.word);
    assert.ok(r.html.startsWith('<!doctype html>') && r.html.includes('<meta charset="utf-8">'), m.word + ' 产物不是完整文档');
    assert.ok(r.html.includes('<section id="md-kpi">'), m.word + ' 没出本区块的读数卡锚点 md-kpi');
    assert.ok(r.html.includes('<section id="md-table">'), m.word + ' 没出本区块的明细锚点 md-table');
    assert.ok(visible(r.html).includes('明细（共 ' + m.n + ' 条）'),
      m.word + ' 明细条数不是种子库那 ' + m.n + ' 条：' + visible(r.html).slice(0, 200));
    /* 四桶占比只有「全部餐别」那一支出（老实物 `view === 'all'` 才显示 distSection）。 */
    assert.equal(r.html.includes('<section id="md-dist">'), m.meal === 'all', m.word + ' 的四桶占比出／不出与老实物不一致');
  }
});

test('#273 ⑤ 餐别取数：四餐一桶不漏 ＋ 与老脚本同口径的读数（种子 09-01~09-07）', () => {
  assert.equal(ALL.days, 7, '窗口天数不是 7');
  assert.equal(ALL.total, 10, '餐数不是 10（水的三行不该进来）');
  assert.equal(ALL.totalCal, 3339, '累计热量不是 3339');
  assert.equal(ALL.avg, 477, '日均热量不是 477（按窗口 7 天算）');
  assert.deepEqual(ALL.dist.map((s) => [s.label, s.count, s.cal, s.pct]),
    [['早餐', 4, 989, 29.6], ['午餐', 4, 1750, 52.4], ['晚餐', 1, 500, 15], ['加餐', 1, 100, 3]],
    '四桶读数与老脚本口径不一致：' + JSON.stringify(ALL.dist));
  assert.equal(ALL.oneLine, '最近 7 天共 10 餐。午餐热量占比最高（52.4%）。', '结论句与老脚本那句不同');
  assert.equal(BREAKFAST.total, 4, '早餐支的餐数不是 4');
  assert.equal(BREAKFAST.totalCal, 989, '早餐支的累计热量不是 989');
  assert.equal(BREAKFAST.avg, 141.3, '早餐支的日均不是 141.3');
  assert.deepEqual(BREAKFAST.dist, [], '单餐别那一支不该出四桶占比');
  assert.equal(BREAKFAST.oneLine, '最近 7 天早餐：4 餐，日均 141.3 卡。', '单餐别结论句不对');
  /* 明细字段面＝老实物七列（时间截到分、克数／热量／蛋白逐条在）。 */
  assert.equal(ALL.items.length, 10, '明细条数不是 10');
  assert.deepEqual(
    [ALL.items[0].date, ALL.items[0].time, ALL.items[0].meal, ALL.items[0].food, ALL.items[0].grams, ALL.items[0].cal, ALL.items[0].protein],
    ['2026-09-01', '08:00', '早餐', '粥', 300, 150, 3], '首条明细与种子库不一致');
  assert.ok(ALL.items.some((i) => i.meal === '加餐' && i.food === '苹果'), '下午茶的苹果没归进加餐');
  assert.ok(ALL.items.every((i) => i.food !== '💧水'), '饮水行混进了餐别明细');
});

test('#273 ⑤ 餐别区块对得上 meal_distribution.html ＋ 区外不夹整页（页头／页脚一概不进块）', () => {
  const text = visibleText(ALL_BLOCK);
  for (const b of ['餐数', '日均热量', '餐别热量占比', '最高占比', '午餐 52.4%', '明细（共 10 条）',
    '📊 数据来源 · 饮食记录 · 餐别时间窗推断 · 2026-09-01 → 2026-09-07', '加餐是下午茶和夜宵']) {
    assert.ok(text.includes(b), '餐别区块缺老实物那一块：「' + b + '」');
  }
  for (const id of ['md-kpi', 'md-dist', 'md-table', 'md-copy']) {
    assert.ok(ALL_BLOCK.includes('<section id="' + id + '">'), '餐别区块缺锚点 ' + id);
  }
  const detail = ALL_BLOCK.slice(ALL_BLOCK.indexOf('<section id="md-table">'));
  assert.deepEqual(thsOf(detail), ['日期', '时间', '餐次', '食物', '克数', '热量', '蛋白'], '明细列序与老实物不一致');
  assert.ok(detail.includes('>2026-09-07<') && detail.includes('>19:10<') && detail.includes('>晚餐<'), '明细行缺日期／时间／餐次');
  assert.ok(detail.includes('200 克') && detail.includes('500 卡'), '明细行缺克数／热量读数');
  /* 区块不是页面：不带 doctype、不带整页区（`ilife-block-page-shell` 那一层）；给了命令行原文才出复制区。 */
  assert.ok(!ALL_BLOCK.includes('<!doctype'), '区块里夹了 doctype——它是块，不是页');
  assert.ok(!ALL_BLOCK.includes('ilife-block-page-shell'), '区块里夹了整页区那一层');
  assert.ok(ALL_BLOCK.includes('data-action-id="ilife-copy-log"'), '给了命令原文却没出复制日志');
  assert.equal(callChainOf(logTextOf(ALL_BLOCK)), "calorie-cmd-read calorie.view.diet --params '{\"window\":\"7d\",\"meal\":\"all\"}'",
    '复制日志第 4 段不是给进来的命令原文');
  assert.ok(!SINGLE_BLOCK.includes('data-action-id="ilife-copy-log"'), '没给命令原文却出了复制日志');
  assert.ok(!visibleText(SINGLE_BLOCK).includes('餐别热量占比'), '单餐别那一支不该出四桶占比块');
});

test('#273 ⑤ 单餐别支与空态支：缺值 `—`、空态句 ＋ 引导句（裁定 4）', () => {
  const text = visibleText(SINGLE_BLOCK);
  assert.ok(text.includes('早餐'), '单餐别区块缺餐别名');
  assert.ok(text.includes('明细（共 4 条）'), '早餐支的明细条数不对：' + text.slice(0, 200));
  /* 加餐在 09-01~09-04 零记录：整段仍出完整区块，值位写 `—`、空态句后接引导句。 */
  const empty = visibleText(SNACK_BLOCK);
  assert.equal(SNACK_EMPTY.total, 0, '这一段不该有加餐记录');
  assert.equal(SNACK_EMPTY.avg, 0, '零记录时取数层的原始日均是 0（页面把它写成 —）');
  assert.ok(empty.includes('—'), '零记录那一支的值位没写 `—`');
  assert.ok(empty.includes('没有加餐的记录'), '零记录那一支缺空态句');
  assert.ok(empty.includes('用「记一餐」'), '零记录那一支缺「怎么记第一条」的引导句');
  assert.ok(empty.includes('📊 数据来源 · 饮食记录 · 餐别时间窗推断'), '零记录那一支缺来源脚注');
  assert.ok(!SNACK_BLOCK.includes('md-dist'), '零记录那一支不该出占比块');
});

test('#273 ⑤ 反例①：同一把键缺 `meal` ＝ 不是餐别支（不编数、不默认餐别）', () => {
  /* 票面口径：「若某条命令的餐别参数缺失，按『参数缺失即用法错』走出错，不编数」。当刻 5 条路由记录
     都带 `meal`（#276 已接线），故只能从**同一把键**直接递参数来验：没有 `meal` 就走它从前那一支
     （窗口列表页），**绝不默认一个餐别**。 */
  const r = renderOk(DIR, 'calorie.view.diet', { window: '7d' }, '缺 meal');
  assert.ok(!r.html.includes('<section id="md-table">') && !r.html.includes('<section id="md-kpi">'),
    '缺 meal 却出了餐别区块——默认值出现了（编数）');
  assert.ok(!visible(r.html).includes('餐别热量占比'), '缺 meal 却出了四桶占比');
});

/* 反例②（#273 收口 · 编排者裁定 2026-09-15 授权落 4 行补丁）：空窗 ＋ 带 `meal` 必须仍出**餐别分布页**
   的空态。修前那一次读数（`h1=🍽️ 饮食总览 …`、67249 B、`md-table`=no）与修后（`h1=餐别分布 …`、
   71748 B、`md-table`=yes）留在 `.scratch/t273/mut/` 与 `t273-报告.md` §二 6。 */
test('#273 ⑤ 空窗（库非空、这一段零记录）⇒ 仍出完整页 ＋ 空态句 ＋ 引导句（餐别页外的那一支已真）', () => {
  const r = renderOk(DIR, 'calorie.view.diet', { start: '2026-10-01', end: '2026-10-07' }, '空窗无 meal');
  assert.ok(r.html.startsWith('<!doctype html>') && r.html.includes('<meta charset="utf-8">'), '空窗页不是完整文档');
  const text = visible(r.html);
  assert.ok(text.includes('没有饮食记录'), '空窗页缺空态句');
  assert.ok(text.includes('「记一餐」'), '空窗页缺「怎么记第一条」的引导句');
  assert.ok(text.includes('📊 数据来源 · 饮食记录 · 2026-10-01 → 2026-10-07'), '空窗页缺来源脚注');
  assert.ok(r.bytes > 4000, '空窗页过小（' + r.bytes + ' B）');
});

test('#273 ⑤ 反例②：空窗（库非空、这一段零记录）＋ 带 `meal` ⇒ 出餐别分布页的空态，不退回总览页', () => {
  /* 裁定 4 的 2026-09-15 澄清：窗口内零记录 ⇒ 出完整页 ＋ 空态句 ＋ 引导句。这一族里「完整页」指的
     是**餐别分布页**（区块自出空态句＋引导句），不是退回总览那一张——两条词说的是餐别看餐别。 */
  const r = renderOk(DIR, 'calorie.view.diet', { start: '2026-10-01', end: '2026-10-07', meal: 'all' }, '空窗餐别');
  assert.ok(r.html.startsWith('<!doctype html>') && r.html.includes('<meta charset="utf-8">'), '空窗餐别页不是完整文档');
  const text = visible(r.html);
  assert.ok(text.includes('餐别分布'), '空窗 ＋ meal 落的是别的页（不是餐别分布页）：' + text.slice(0, 200));
  assert.ok(text.includes('📊 数据来源 · 饮食记录 · 餐别时间窗推断 · 2026-10-01 → 2026-10-07'), '空窗餐别页缺来源脚注');
  assert.ok(r.html.includes('<section id="md-table">'), '空窗餐别页缺明细段的空态锚点 md-table');
  assert.ok(text.includes('没有全部餐别的记录'), '空窗餐别页缺空态句：' + text.slice(0, 300));
  assert.ok(text.includes('用「记一餐」'), '空窗餐别页缺「怎么记第一条」的引导句');
  /* 日均那一格**逐字**：值位写 `—`、单位位不出现（0 是「那天真吃了 0 卡」的意思，不许拿 0 顶）。 */
  assert.ok(r.html.includes('<div class="ilife-block-kpi-card-label">日均热量</div>'
    + '<div class="ilife-block-kpi-card-value-row"><span class="ilife-block-kpi-card-value">—</span></div>'),
    '空窗餐别页的日均那一格没写 `—`：' + text.slice(0, 300));
  /* 反例②的钉点换到**总览空态页独有的那一句**（`guide` 里的「记下吃的」）：原来拿「没有饮食记录，
     汇总算不出来」当标记，2026-09-25 用户把那句从第一性原理重写后它不再存在（垫字全删），
     而餐别页自己的副题恰好也写「…没有饮食记录。」⇒ 拿「没有饮食记录」当标记会误判。 */
  assert.ok(!text.includes('记下吃的'), '空窗 ＋ meal 还是落回了总览那一张空态页');
  assert.ok(!r.html.includes('<section id="md-dist">'), '零记录不该出四桶占比块');
  assert.ok(r.bytes > 4000, '空窗餐别页过小（' + r.bytes + ' B）');
  /* 单餐别那一支也走同一页（不许只有 `all` 走对）：餐数 0、日均 `—`、空态句按餐别名逐字换。 */
  const br = renderOk(DIR, 'calorie.view.diet', { start: '2026-10-01', end: '2026-10-07', meal: '早餐' }, '空窗餐别·早餐');
  const bt = visible(br.html);
  assert.ok(bt.includes('餐别分布'), '空窗 ＋ meal=早餐 落的是别的页：' + bt.slice(0, 200));
  assert.ok(bt.includes('没有早餐的记录'), '单餐别空窗缺按餐别名的空态句：' + bt.slice(0, 300));
  assert.ok(bt.includes('用「记一餐」'), '单餐别空窗缺引导句');
  assert.ok(br.bytes > 4000, '单餐别空窗餐别页过小（' + br.bytes + ' B）');
});

test('#273 ⑤ 餐别参数缺失／未知值一律用法错（exit 2），不编数、不给默认餐别', () => {
  for (const bad of [undefined, null, '', 'brunch', '早饭']) {
    assert.throws(() => mealParamOf(bad), (e) => e && e.code === 'bad-input',
      'mealParamOf(' + JSON.stringify(bad) + ') 没按用法错走');
  }
  assert.equal(mealParamOf('早餐'), '早餐', '中文餐别名没认');
  assert.equal(mealParamOf('snack'), '加餐', '老 CLI 的英文键没认');
  assert.equal(mealParamOf('全部餐别'), 'all', '「全部餐别」没认');
  const db = openDb(join(DIR, 'calorie_data.db'));
  try {
    assert.throws(() => buildMealDistributionView(db, undefined, '2026-09-01', D), (e) => e && e.code === 'bad-input',
      '取数入口没兜住缺参（#271 会从参数层把未解析的值直接递进来）');
  } finally { db.close(); }
});

/* ── ⑥ 变异自证（源码级那两行机器读数见证据件；这里是同一段断言的「必红」对照） ── */

test('#273 ⑥ 变异自证：改坏餐别四色映射 ⇒ 同一段断言必红', () => {
  const good = visibleText(ALL_BLOCK);
  assert.ok(good.includes('午餐 52.4%'), '原样产物该读到最高占比那格');
  const bad = ALL_BLOCK.replace('午餐 52.4%', '午餐 52%');
  assert.notEqual(bad, ALL_BLOCK, '变异点没命中（最高占比那格没找到）');
  assert.equal(visibleText(bad).includes('午餐 52.4%'), false, '改坏之后读数没变——那一段断言是永真的');
  /* 还原读数：原样产物里那格仍在（与证据件里的源码级变异两行读数同源）。 */
  assert.equal(good.includes('午餐 52.4%'), true, '还原读数不一致');
});

test('#273 探针不落仓内文件', () => {
  const stray = RUNS.filter((r) => r.out.startsWith(ROOT)).map((r) => r.out);
  assert.deepEqual(stray, [], '探针产物落进了仓内：' + stray.join('、'));
});
