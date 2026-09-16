/** #275 · 营养／饮水／总览页 4 条词 ＋ 两个具名区块函数的逐条探针。
 *
 * **票面四条唤醒词**（以 `src/diet/routes.ts` 与 `src/home/routes.ts` 里 `scene:'02'` 的实际路由为准）：
 *
 * | 唤醒词 | 命令 | 页面归属 |
 * |---|---|---|
 * | 看营养结构 | `calorie.view.diet-review` `{"window":"7d"}` | 页归 #273，本票交**配比区块** |
 * | 看今日营养 | `calorie.view.diet-review` `{"window":"今日"}` | 同上 |
 * | 看今日喝水 | `calorie.view.today-water` `{"date":"今日","entry":"drink"}` | 页归本票（`diet/nutritionPortDocs.ts`） |
 * | 看饮食总览 | `calorie.view.diet` `{"window":"7d"}` | 页归 #271，本票交**总览区块** |
 *
 * **本探针守什么**（每条对应票面一条判据／`t425-融合基准.md` 一条裁定）：
 *  ① 四条词**逐条真出口 exit 0**，产物是**完整文档**（`<!doctype html>` 在第 0 字节 ＋ charset ＋
 *     样式段），并打出**绝对路径与字节数**；内容逐块对得上老实物（老 4 张模板的页题、KPI 标签、
 *     表列、图题、来源行诸块都在位；老实物正本 `D:\2Study\StudyNotes\SKILLS\卡路里\templates\`，**只读**）。
 *  ② **两态分清**（裁定 4 的 2026-09-15 澄清）：**空库** ⇒ `exit 4` ＋ `ERR 4: 取数失败（缺失阻断）`、
 *     不落盘（既有设计行为）；**窗口内零记录** ⇒ 出完整页 ＋ 空态句 ＋ 引导句。
 *  ③ 融合 §五 第 ⑥ 类骨架：页头（眉标＋类型徽章）／页内导航／结论句（含本页读数）／来源脚注诸行恒出。
 *  ④ **裁定 2-补**：来源脚注与结论句走**普通小字行**（`renderCaliberLine`），不走深底反馈块
 *     ——`t425` §九 第 1 条点名归本票的那笔欠账在这里被钉住。
 *  ⑤ **裁定 1**：可见文本零机器话（常量名／snake_case／命令键／库表名），走共享探针 `machineWords`。
 *  ⑥ **裁定 7**：复制区双按钮、日志第 4 段「调用链」＝**本次命令原文**（含 `--params`），照抄可重跑。
 *  ⑦ **两个具名区块函数各有直测**（结构化断言）：`buildNutritionRatioBlock`（交 #273）与
 *     `buildDietOverviewBlock`（交 #271）——这两个函数只交付、由宿主页调，故直调取数层 ＋ 直测装配层。
 *  ⑧ **变异自证**：改坏一处 ⇒ 该段断言必红 ⇒ 逐文件还原 ⇒ 变绿（脚本 `.scratch/t275/vary.mjs` 持锁跑，
 *     两行机器读数落 `.scratch/t275/mut-*.txt`）；本件留**原样必绿**的那几条正向读数。
 *
 * **类名口径**（#275 量现场后订正）：产物里的区块根类是**真类名**——
 * 复制区 `<section class="ilife-block ilife-block-copy-block">`、深底提示块
 * `<section class="ilife-block ilife-block-feedback-block">`。旧写法 `ilife-block-copyBlock`／
 * `ilife-block-feedbackBlock` 在本仓产物里**一次都不出现**，那样的断言永远为 0／永远为真、
 * 红不了也绿不了——本件一律按真类名断言。
 *
 * 跑法：`node --test packages/skill-calorie/test/t275-营养饮水总览页.test.mjs`
 * （先 `npx tsc -b packages/base-render packages/skill-calorie`）。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, statSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

import { machineWords, stripCopyPayload, visibleText } from './visible-text-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');

const { openDb } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

const D = SEED_TODAY;                                 // 2026-09-07（种子锚点）
const WEEK = '2026-09-01 ~ 2026-09-07';
const WEEK_ARROW = '2026-09-01 → 2026-09-07';
const EMPTY_WINDOW = { window: 'custom', start: '2020-01-01', end: '2020-01-07' };

/** 一条命令一次真跑：库、产物都落系统 tmp，产物名带票号前缀（收尾自证不落仓内件）。 */
function freshDb(seed = true) {
  const dir = mkdtempSync(join(tmpdir(), 't275-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  if (seed) seedFull(db);
  db.close();
  return dir;
}

function render(dir, key, params, extraEnv) {
  const out = join(dir, 't275-out-' + Math.random().toString(36).slice(2, 8) + '.html');
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params), '--html', out], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: D, ...(extraEnv ?? {}) },
  });
  return {
    status: r.status, stderr: String(r.stderr), out, existed: existsSync(out),
    html: r.status === 0 ? readFileSync(out, 'utf8') : '',
    bytes: r.status === 0 ? statSync(out).size : 0,
  };
}

function renderOk(dir, key, params, what) {
  const r = render(dir, key, params);
  assert.equal(r.status, 0, what + ' 真出口 exit=' + r.status + ' stderr=' + r.stderr.slice(-300));
  return r;
}

/* ══════════════════════════════════════════════════════════════
 * 票面四条词：真出口 ＋ 完整文档 ＋ 本页该有的块
 * ══════════════════════════════════════════════════════════════ */

/** `frame`：`own`＝这一页归本票（`diet/nutritionPortDocs.ts`），整页骨架都由本票负责；
 *  `host`＝页归别的票（#273 的复盘页／#271 的条目列表页），本票只负责页上**属于本票的那一块**。 */
const WORDS = [
  {
    id: '看营养结构', key: 'calorie.view.diet-review', params: { window: '7d' }, frame: 'host', owner: '#273',
    old: 'nutrition_ratio.html',
    blocks: ['热量来源占比（按营养素折算）', '推荐范围对比（克数均为这 7 天合计）',
      '折算合计（千卡）', '推荐 10–20%', '推荐 45–65%', '推荐 20–35%', '距范围', '✓ 在范围内', '✓ 均衡'],
    cols: ['营养素', '实际', '下限', '上限', '距范围', '状态'],
    anchors: ['sec-kpi', 'sec-chart', 'sec-table'],
    footnote: '📊 数据来源 · 饮食记录 · ' + WEEK_ARROW,
  },
  {
    id: '看今日营养', key: 'calorie.view.diet-review', params: { window: '今日' }, frame: 'host', owner: '#273',
    old: 'nutrition_ratio.html',
    blocks: ['热量来源占比（按营养素折算）', '推荐范围对比（克数均为这 1 天合计）', '折算合计（千卡）', '✓ 均衡'],
    cols: ['营养素', '实际', '下限', '上限', '距范围', '状态'],
    anchors: ['sec-kpi', 'sec-chart', 'sec-table'],
    footnote: '📊 数据来源 · 饮食记录 · ' + D + ' → ' + D,
  },
  {
    id: '看今日喝水', key: 'calorie.view.today-water', params: { date: D, entry: 'drink' }, frame: 'own',
    old: 'today_water.html',
    title: '💧 今日喝水',
    head: ['今日喝水（饮食）', '营养饮水总览'],
    nav: ['今日读数', '今日进度', '本周 7 天', '今日每杯'],
    blocks: ['今日进度', '本周 7 天', '今日每杯（共 1 杯）', '目标', '已完成目标(100%)'],
    cols: ['时间', '饮水量ml'],
    summary: '今天喝了 2,000 ml（目标的 100%），正好完成目标。',
    footnote: '📊 数据来源 · 饮水记录 · ' + D,
  },
  {
    id: '看饮食总览', key: 'calorie.view.diet', params: { window: '7d' }, frame: 'host', owner: '#271',
    old: 'diet_overview.html',
    /* **接线缺口**（归 #271）：这条词与「看最近 7 天饮食」在路由上参数一字不差，命令这一层分不出
       进来的是哪条 ⇒ 当刻落的是 ② 条目列表页，`buildDietOverviewPage`／`buildDietOverviewBlock`
       已备好但入口未接线。故这里不列 ⑥ 类总览页的块（列了就是假绿），只钉当刻真出的那一页。 */
    gap: true,
    blocks: ['按日汇总', '餐别分布', '每日明细'],
    cols: ['日期', '摄入', '蛋白', '碳水', '脂肪', '目标'],
    footnote: '数据来源 · 饮食记录 · ' + WEEK_ARROW + ' · 共 10 条',
  },
];

const RUNS = WORDS.map((w) => {
  const dir = freshDb();
  const r = renderOk(dir, w.key, w.params, w.id);
  console.log('READING #275 ' + w.id + ' exit=0 产物 ' + r.out + ' ' + r.bytes + ' B');
  return { w, dir, ...r, text: visibleText(stripCopyPayload(r.html)) };
});

/** 本件（`diet/nutritionPortDocs.ts`）**另三条页**：不在票面四条词里，但它们住本件，
 *  而且 `nutrition_detail.html` 正是老实物 ⑥ 类四张模板之一 ⇒ 随本件一起守，
 *  免得「重写探针」这件事本身把本件的三张页守丢了。
 *  `deep`＝这一页该有几个深底提示块实体（`缺数据盒` 走的是 `renderFeedbackBlock`，
 *  营养素那两页各带一个；`裁定 2-补` 只管结论句与来源脚注，不管缺数据盒）。 */
const OWN_PAGES = [
  {
    id: '查营养配比', key: 'calorie.view.nutrition-ratio', params: { window: '7d' }, frame: 'own', deep: 0,
    old: 'nutrition_ratio.html',
    title: '🥗 营养配比',
    head: ['查营养配比（饮食）', '营养饮水总览'],
    nav: ['配比读数', '热量来源占比', '推荐范围对比'],
    blocks: ['热量来源占比（按营养素折算）', '推荐范围对比（克数均为这 7 天合计）',
      '折算合计（千卡）', '蛋白（千卡）', '碳水（千卡）', '脂肪（千卡）', '距范围', '✓ 在范围内', '✓ 均衡',
      '推荐 10–20%', '推荐 45–65%', '推荐 20–35%'],
    cols: ['营养素', '实际', '下限', '上限', '距范围', '状态'],
    summary: '这 7 天共摄入 3,339 千卡（热量合计），三大营养素配比均衡。',
    footnote: '📊 数据来源 · 饮食记录 · ' + WEEK_ARROW,
  },
  {
    id: '看营养素深度', key: 'calorie.view.nutrition-detail', params: { window: '7d' }, frame: 'own', deep: 1,
    old: 'nutrition_detail.html',
    title: '🧪 营养素深度',
    head: ['看营养素深度（饮食）', '营养饮水总览'],
    nav: ['读数', '逐项明细'],
    blocks: ['匹配餐数', '缺数据食物', '覆盖营养素', '膳食纤维', '钠', '糖',
      '累计（7 天）', '每天平均', '每天推荐', '完成度', '缺数据食物（共 5 种，未计入）', '建议用「存食品」补录'],
    cols: ['营养素', '累计（7 天）', '每天平均', '每天推荐', '完成度', '状态'],
    summary: '「看营养素深度」本窗匹配到 4 餐。膳食纤维日均 0 克，钠日均 1.1 毫克，糖日均 0 克。'
      + '另有 5 种食物在食品库查不到营养值，未计入。',
    footnote: '📊 数据来源 · 饮食记录 × 食品库 · ' + WEEK_ARROW,
  },
  {
    id: '看营养素明细', key: 'calorie.view.nutrition-detail', params: { window: '7d', entry: 'detail' }, frame: 'own', deep: 1,
    old: 'nutrition_detail.html',
    title: '🧪 营养素明细',
    head: ['看营养素明细（饮食）', '营养饮水总览'],
    nav: ['读数', '逐项明细'],
    blocks: ['匹配餐数', '缺数据食物', '累计（7 天）', '缺数据食物（共 5 种，未计入）'],
    cols: ['营养素', '累计（7 天）', '每天平均', '每天推荐', '完成度', '状态'],
    summary: '「看营养素明细」本窗匹配到 4 餐。膳食纤维日均 0 克，钠日均 1.1 毫克，糖日均 0 克。'
      + '另有 5 种食物在食品库查不到营养值，未计入。',
    footnote: '📊 数据来源 · 饮食记录 × 食品库 · ' + WEEK_ARROW,
  },
];

const OWN_RUNS = OWN_PAGES.map((w) => {
  const dir = freshDb();
  const r = renderOk(dir, w.key, w.params, w.id);
  console.log('READING #275 ' + w.id + ' exit=0 产物 ' + r.out + ' ' + r.bytes + ' B');
  return { w, dir, ...r, text: visibleText(stripCopyPayload(r.html)) };
});
/** 逐块／骨架／机器话／复制区这几段对**票面四条词 ＋ 本件另三条页**一起跑。 */
const ALL_RUNS = [...RUNS, ...OWN_RUNS];
const byId = (id) => [...RUNS, ...OWN_RUNS].find((r) => r.w.id === id);

/** 表头：产物里第一张表的 `<th>` 序列。 */
const thsOf = (html) => [...html.matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map((m) => m[1]);
/** 一页上可能有好几张表（宿主页尤其如此）⇒ 断言「这一列序在产物的表头序列里**成段**出现」，
 *  不要求它正好等于第一张表的列序。 */
function assertColumnRun(html, cols, what) {
  const all = thsOf(html);
  const hit = all.some((_, i) => cols.every((c, j) => all[i + j] === c));
  assert.ok(hit, what + ' 主表列序与老实物不一致：' + all.join('｜'));
}
/** 可见文本的整行（剥掉复制载荷）。 */
const linesOf = (html) => visibleText(stripCopyPayload(html)).split('\n').map((l) => l.trim()).filter(Boolean);
/** 页题那一行（H1 的文本）＋它下面那一行（§五 第 3 行的结论句槽）。 */
function titleAndConclusion(text, title) {
  const l = text.split('\n').map((x) => x.trim()).filter(Boolean);
  const i = l.findIndex((x) => x === title);
  return { title: i === -1 ? null : l[i], conclusion: i === -1 ? null : l[i + 1] };
}
/** 复制日志按钮上的日志文本：`data-t` 载荷（实体还原）。
 *  取按钮**自身**的属性区（到它那个 `>` 为止），不跨到后面的内容——截太宽会读到别处的 `data-t`。 */
function logTextOf(html) {
  const i = html.indexOf('data-action-id="ilife-copy-log"');
  assert.ok(i > 0, '页面上找不到「复制日志」按钮');
  const start = html.lastIndexOf('<button', i);
  const end = html.indexOf('>', i);
  const btn = html.slice(start, end + 1);
  const m = /data-t="([\s\S]*?)"/.exec(btn);
  assert.ok(m, '复制日志按钮上读不到日志文本（按钮没接日志＝死按钮）：' + btn.slice(0, 200));
  return m[1].replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
/** 日志里「调用链」那一段（第 4 段）的下一行。 */
function callChainOf(log) {
  const segs = log.split('\n');
  assert.equal(segs.map((s) => s.trim()).filter((s) => /^(场景标识|AI 思考链|数据结构|调用链|时间戳版本|异常)$/.test(s)).length,
    6, '日志不是六段：' + log.slice(0, 160));
  return segs[segs.findIndex((s) => s.trim() === '调用链') + 1];
}
/* 真类名的实体口径（本件量现场后订正，见件头注释）。 */
const copySections = (html) => html.split('<section class="ilife-block ilife-block-copy-block">').length - 1;
const deepSections = (html) => html.split('<section class="ilife-block ilife-block-feedback-block">').length - 1;

/* ── ① 四条词逐条真跑：exit 0 ＋ 完整文档 ＋ 逐块对得上老实物 ── */

for (const { w, html, bytes, out } of RUNS) {
  test('#275 ① 完整文档（' + w.old + '）—— ' + w.id, () => {
    assert.ok(bytes > 4000, w.id + ' 产物过小（' + bytes + ' B）：' + out);
    /* 完整文档三件：doctype／charset／样式段——双击即开。 */
    assert.ok(html.startsWith('<!doctype html>'), w.id + ' 产物不是完整文档（缺 doctype）');
    assert.equal(html.indexOf('<!doctype html>'), 0, w.id + ' `<!doctype html>` 不在第 0 字节');
    assert.ok(html.includes('<meta charset="utf-8">'), w.id + ' 缺 charset（中文会乱码）');
    assert.ok(html.includes('<style>'), w.id + ' 缺样式段');
    assert.ok(html.includes('ilife-page'), w.id + ' 缺整页根类');
    assert.ok(!html.includes('<!--'), w.id + ' 产物里还有 HTML 注释残留');
  });
}

for (const { w, html, text } of ALL_RUNS) {
  test('#275 ① 逐块对得上老实物（' + w.old + '）—— ' + w.id, () => {
    for (const b of w.blocks) assert.ok(html.includes(b), w.id + ' 缺老实物那一块：「' + b + '」');
    if (w.cols) assertColumnRun(html, w.cols, w.id);
    for (const a of w.anchors ?? []) assert.ok(html.includes('<section id="' + a + '">'), w.id + ' 区块缺锚点 ' + a);
    assert.ok(text.includes(w.footnote), w.id + ' 缺来源脚注：' + w.footnote);
  });
}

test('#275 ①【接线缺口】「看饮食总览」当刻落的不是 ⑥ 总览页（页归 #271，本票只交区块）', () => {
  const ov = byId('看饮食总览');
  /* 当刻真出的是 ② 条目列表页的骨架（锚点 `sec-kpi/sec-trend/sec-dist/sec-daily/sec-meals/sec-copy`）。 */
  for (const a of ['sec-trend', 'sec-dist', 'sec-daily', 'sec-meals']) {
    assert.ok(ov.html.includes('<section id="' + a + '">'),
      '看饮食总览 的分支换了？当刻该落 #271 的条目列表页（有 ' + a + '）——若已接线，把本条改成 ⑥ 总览页断言');
  }
  /* ⑥ 总览页的两个锚点当刻**不在**产物里：这是缺口本身，不是把它藏起来。 */
  for (const a of ['sec-week', 'sec-month']) {
    assert.ok(!ov.html.includes('<section id="' + a + '">'),
      '看饮食总览 已接上 ⑥ 总览页（出现 ' + a + '）——本条按缺口写的断言要一起换掉');
  }
  assert.ok(!ov.html.includes('统计到昨日'), '看饮食总览 已接上 ⑥ 总览页的口径行——本条断言要一起换掉');
});

/* ── ② 裁定 4 的两态：**空库**走 exit 4，**窗口为空**出完整页 ＋ 空态句 ＋ 引导句 ── */

const TWO_STATE = [
  { id: '查营养配比', key: 'calorie.view.nutrition-ratio', params: EMPTY_WINDOW },
  { id: '看营养素深度', key: 'calorie.view.nutrition-detail', params: EMPTY_WINDOW },
  { id: '看今日喝水', key: 'calorie.view.today-water', params: { date: '2020-01-01', entry: 'drink' } },
  { id: '看饮食总览', key: 'calorie.view.diet', params: EMPTY_WINDOW },
  { id: '看营养结构', key: 'calorie.view.diet-review', params: EMPTY_WINDOW },
];
/** 空窗那一态**当刻已分清**的命令（`calorie.view.diet` 不在内——那条词的取数口不住本票，
 *  见回执「未做项」；把它列进来就是拿别人的缺口当自己的绿）。 */
const EMPTY_WINDOW_OK = TWO_STATE.filter((c) => c.key !== 'calorie.view.diet');

test('#275 ② 空库：五条命令一律 exit 4 ＋ `ERR 4: 取数失败（缺失阻断）` ＋ 不落盘（既有设计行为）', () => {
  const empty = freshDb(false);
  for (const c of TWO_STATE) {
    const r = render(empty, c.key, c.params);
    assert.equal(r.status, 4, c.id + ' 空库不是 exit 4（真出口 ' + r.status + '）：' + r.stderr.slice(-200));
    assert.ok(r.stderr.includes('ERR 4: 取数失败（缺失阻断）'),
      c.id + ' 空库没打 `ERR 4: 取数失败（缺失阻断）`：' + r.stderr.slice(-200));
    assert.equal(r.existed, false, c.id + ' 空库却落了盘：' + r.out);
  }
});

test('#275 ② 窗口为空：出完整页 ＋ 空态句 ＋ 引导句（库里有底，只是这一段没记）', () => {
  const dir = freshDb();
  for (const c of EMPTY_WINDOW_OK) {
    const r = renderOk(dir, c.key, c.params, c.id);
    assert.ok(r.html.startsWith('<!doctype html>') && r.html.includes('<meta charset="utf-8">')
      && r.html.includes('<style>'), c.id + ' 空窗的产物不是完整文档');
    assert.ok(r.html.includes('ilife-block-toc'), c.id + ' 空窗缺页内导航');
    assert.equal(copySections(r.html), 1, c.id + ' 空窗的复制区不是恰好一个：' + copySections(r.html));
    const text = visibleText(stripCopyPayload(r.html));
    /* 空态句：说清「哪一段、一条都没有」。 */
    assert.ok(/没有|也没有/.test(text), c.id + ' 空窗没有空态句：' + text.slice(0, 200));
    /* 引导句：一句「怎么记第一条」（裁定 4）。 */
    assert.ok(/要让它有内容，先用「/.test(text), c.id + ' 空窗缺引导句（裁定 4）：' + text.slice(0, 300));
    assert.equal(deepSections(r.html), 0, c.id + ' 空窗页面上出现了深底提示块');
    console.log('READING #275 空窗 ' + c.id + ' exit=0 ' + r.bytes + ' B  ' + r.out);
  }
});

/* ── ③ 融合 §五 第 ⑥ 类骨架：页头／导航／结论句／来源脚注（只判归本票的那张页） ── */

for (const { w, html, text } of ALL_RUNS.filter((r) => r.w.frame === 'own')) {
  test('#275 ③ 融合骨架：页头（眉标＋徽章）／页内导航／结论句含读数／来源脚注 —— ' + w.id, () => {
    for (const h of w.head) assert.ok(html.includes(h), w.id + ' 页头缺：「' + h + '」');
    assert.ok(html.includes('class="ilife-block-toc"') && html.includes('aria-label="页内导航"'), w.id + ' 缺页内导航');
    for (const n of w.nav) assert.ok(text.includes(n), w.id + ' 页内导航缺项：「' + n + '」');
    assert.ok((html.match(/<section id="/g) ?? []).length >= w.nav.length, w.id + ' 导航项多于锚点');
    const c = titleAndConclusion(text, w.title);
    assert.equal(c.title, w.title, w.id + ' 页题读不到：' + linesOf(html).slice(0, 6).join(' ／ '));
    assert.ok(c.conclusion !== null, w.id + ' 页题后面没有结论句');
    assert.ok(/[0-9]/.test(c.conclusion), w.id + ' 结论句里没有读数：' + c.conclusion);
    assert.ok(text.includes(w.summary), w.id + ' 结论句与预期不一致：' + c.conclusion);
    assert.ok(text.includes(w.footnote), w.id + ' 缺来源脚注：' + w.footnote);
    assert.ok(html.includes('class="ilife-block-caliber"'), w.id + ' 来源脚注没走普通小字行');
  });
}

/* ── ④ 裁定 2-补：结论句与来源脚注不走深底块（`t425` §九 第 1 条点名的欠账） ── */

for (const { w, html } of ALL_RUNS.filter((r) => r.w.frame === 'own')) {
  test('#275 ④ 裁定 2-补：来源脚注与结论句不在深底块里 —— ' + w.id, () => {
    /* 真类名的**实体**数（不是样式段里的选择器文本）。`w.deep`＝这一页该有几个：
       缺数据盒走的就是 `renderFeedbackBlock`（深底块），营养素那两页各带一个；
       裁定 2-补 只管**结论句与来源脚注**，不管缺数据盒——两件事别混。 */
    assert.equal(deepSections(html), w.deep ?? 0,
      w.id + ' 深底提示块实体数不是 ' + (w.deep ?? 0) + '：' + deepSections(html));
    /* 页头到页内导航之间（结论句那一带）不许出现深底提示块。
       锚点从 `<h1` 之后找 `ilife-block-toc`——样式段里也有同一个类名，从头找会切出空串。 */
    const from = html.indexOf('<h1');
    const headZone = html.slice(from, html.indexOf('ilife-block-toc', from));
    assert.ok(headZone.includes('<p class="sub">'),
      w.id + ' 页头那几行没走结论小字行（裁定 2-补：结论句是普通小字行，住 H1 之下、首个区块之前）');
    assert.ok(!headZone.includes('feedback-block'), w.id + ' 页头那几行走进了深底块');
    console.log('READING #275 深底块 ' + w.id + ' = ' + deepSections(html) + ' 个');
  });
}

test('#275 ④ 配比块／饮水页的来源脚注逐字取老实物的句子', () => {
  const ratio = byId('看营养结构');
  assert.ok(ratio.text.includes('📊 数据来源 · 饮食记录 · ' + WEEK_ARROW), '配比块来源脚注不是老实物那句');
  assert.ok(ratio.text.includes('占比按营养素折算：蛋白和碳水都是每克 4 千卡，脂肪是每克 9 千卡'),
    '配比块缺折算口径句（老实物图例那一层的意思要用话说出来）');
  const water = byId('看今日喝水');
  assert.ok(water.text.includes('📊 数据来源 · 饮水记录 · ' + D), '饮水页来源脚注不是老实物那句');
});

/* ── ⑤ 裁定 1：可见文本零机器话 ── */

/** 老实物文案里本来就有的两个全大写词（`JSON` 是公共层复制菜单的格式名，`TOP5` 是老实物
 *  `diet_review.html` 与 `food_ranking.html` 的榜名）——只放过这两个，其余一律判红。 */
const MACHINE_ALLOW = new Set(['JSON', 'TOP5']);

for (const { w, html } of ALL_RUNS) {
  test('#275 ⑤ 裁定 1：可见文本零机器话 —— ' + w.id, () => {
    const hits = machineWords(html).filter((x) => x.hit !== null && !MACHINE_ALLOW.has(x.hit))
      .map((x) => x.kind + '＝「' + x.hit + '」');
    assert.deepEqual(hits, [], w.id + ' 可见文本里出现机器话：' + hits.join('　'));
    /* 命令键只许落在复制载荷里（裁定 1 的「不上屏」不等于「不许存在」）。 */
    assert.ok(html.includes(w.key), w.id + ' 复制载荷里的命令键不该一起消失');
    /* 同源入口页的标记名绝不上屏（#511 的硬要求；本票两条词各按自己的叫法出众）。 */
    assert.equal(visibleText(stripCopyPayload(html)).includes('entry'), false, w.id + ' 可见文本里出现了入口标记名');
  });
}

/* ── ⑥ 裁定 7：复制区双按钮 ＋ 日志第 4 段＝本次命令原文 ── */

for (const { w, html, text } of ALL_RUNS) {
  test('#275 ⑥ 裁定 7：复制区双按钮 ＋ 日志第 4 段＝本次命令原文 —— ' + w.id, () => {
    assert.equal(copySections(html), 1, w.id + ' 复制区不是恰好一个：' + copySections(html));
    assert.ok(html.includes('data-fmt-open="1"'), w.id + ' 缺「复制数据」三格式菜单开合器');
    for (const f of ['text', 'json', 'csv']) assert.ok(html.includes('data-fmt="' + f + '"'), w.id + ' 缺三格式里的 ' + f);
    assert.ok(text.includes('复制数据'), w.id + ' 页面上读不到「复制数据 ▾」');
    assert.ok(html.includes('data-action-id="ilife-copy-log"'), w.id + ' 缺「复制日志」按钮');
    if (w.gap === true) {
      /* 接线缺口页（#271 的条目列表页）：当刻的「复制日志」是 disabled 的死按钮——这一条**不是本票的**
         （该页由 #271 装配，见回执「未做项」）。这里把它钉住，接线时本条会一起换掉。 */
      const dead = html.slice(html.indexOf('data-action-id="ilife-copy-log"'));
      assert.ok(/^[^>]*disabled/.test(dead.slice(0, 400)),
        '看饮食总览 的复制日志按钮有日志了——接线/装配已变，本条按缺口写的断言要一起换掉');
      return;
    }
    const logBtn = html.slice(html.indexOf('data-action-id="ilife-copy-log"'));
    assert.ok(!/^[^>]*disabled/.test(logBtn.slice(0, 400)), w.id + ' 复制日志按钮是死的（disabled＝日志文本没接）');
    const call = callChainOf(logTextOf(html));
    assert.ok(call.startsWith('calorie-cmd-read ' + w.key),
      w.id + ' 第 4 段不是命令原文：' + call);
    /* 本次参数逐字在原文里（照抄可重跑）。 */
    for (const [k, v] of Object.entries(w.params)) {
      assert.ok(call.includes(JSON.stringify(k) + ':' + JSON.stringify(v)), w.id + ' 命令原文没带全本次参数 ' + k);
    }
    /* 裁定 7：不出与按钮同名的标题。 */
    assert.ok(!html.includes('>复制数据</h2>') && !html.includes('>复制日志</h2>'), w.id + ' 出了与按钮同名的标题');
  });
}

test('#275 ⑥ 看今日喝水 的日志原文带全入口标记（照抄跑得出同一页）', () => {
  const drink = callChainOf(logTextOf(byId('看今日喝水').html));
  assert.ok(drink.includes('"entry":"drink"'), '喝水那一支的命令原文没带标记：' + drink);
});

/* ══════════════════════════════════════════════════════════════
 * ⑦ 两个具名区块函数：各有直测（结构化断言，交 #273／#271 直调）
 * ══════════════════════════════════════════════════════════════ */

const { buildDietOverviewView, buildNutritionRatioView } =
  await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'diet', 'nutritionPort.js')).href);
const { buildDietOverviewBlock, buildNutritionRatioBlock } =
  await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'diet', 'nutritionPortDocs.js')).href);

/** 直调取数层：开一个种子库（与真出口用的是同一份种子）。 */
function withSeedDb(fn) {
  const dir = freshDb();
  const db = openDb(join(dir, 'calorie_data.db'));
  try {
    return fn(db);
  } finally {
    db.close();
  }
}

const RATIO_CMD = "calorie-cmd-read calorie.view.nutrition-ratio --params '{\"window\":\"7d\"}'";
const RATIO_BLOCK = withSeedDb((db) => buildNutritionRatioBlock(buildNutritionRatioView(db, '2026-09-01', D)));
const OVERVIEW_BLOCK = withSeedDb((db) => buildDietOverviewBlock(buildDietOverviewView(db, D)));
/** 同一个种子库上直调区块：`opts` 不给＝老调用点（#273 当刻的写法）。 */
const ratioBlockWith = (opts) => withSeedDb((db) => {
  const v = buildNutritionRatioView(db, '2026-09-01', D);
  return opts === undefined ? buildNutritionRatioBlock(v) : buildNutritionRatioBlock(v, opts);
});

test('#275 ⑦ 交 #273 的 buildNutritionRatioBlock：一段一锚点 ＋ 逐块断言 ＋ 不夹整页壳', () => {
  for (const id of ['sec-kpi', 'sec-chart', 'sec-table']) {
    assert.ok(RATIO_BLOCK.includes('<section id="' + id + '">'), '区块缺锚点 ' + id);
  }
  for (const b of ['<div class="ilife-block-kpi-card-grid">', 'ilife-block-dist-row', 'ilife-block-data-table',
    '推荐范围对比（克数均为这 7 天合计）', '📊 数据来源 · 饮食记录 · ']) {
    assert.ok(RATIO_BLOCK.includes(b), '区块缺块：「' + b + '」');
  }
  /* 区块不是页面：不夹 doctype／head／整页壳（集成归 #273）。 */
  assert.ok(!RATIO_BLOCK.includes('<!doctype'), '区块里夹了 doctype——它是块，不是页');
  assert.ok(!RATIO_BLOCK.includes('ilife-block-page-shell'), '区块里夹了整页壳');
  assert.ok(RATIO_BLOCK.length > 800, '区块过短（' + RATIO_BLOCK.length + ' 字符）');
});

/* ── 复制区开关（`buildNutritionRatioBlock` 第二参）：#273 收口报「一张页两个复制区」那一处 ── */

test('#275 ⑦ 复制区开关：不给开关与给 `{ copy: true }` 的产物逐字相同（老调用点不变）', () => {
  assert.equal(ratioBlockWith(undefined), ratioBlockWith({ copy: true }),
    '缺省与显式 `copy: true` 出了两份不同的产物——缺省不是「带那一节」');
  assert.equal(copySections(ratioBlockWith(undefined)), 0, '不给命令原文时区块自带了一节复制区');
});

test('#275 ⑦ 复制区开关：给了命令原文才出那一节；`copy: false` 整节不出（裁定 7）', () => {
  const withCopy = ratioBlockWith({ command: RATIO_CMD });
  assert.equal(copySections(withCopy), 1, '给了命令原文却没出那一节复制区');
  assert.ok(withCopy.includes('data-action-id="ilife-copy-log"'), '那一节缺复制日志按钮');
  assert.ok(callChainOf(logTextOf(withCopy)).startsWith('calorie-cmd-read calorie.view.nutrition-ratio'),
    '那一节的日志第 4 段不是给进来的命令原文：' + callChainOf(logTextOf(withCopy)));
  /* 关掉 ⇒ 整节不出：没有复制区、没有按钮，也没有「点不动」的 disabled 控件。 */
  const off = ratioBlockWith({ copy: false, command: RATIO_CMD });
  assert.equal(copySections(off), 0, '`copy: false` 没把那一节关掉');
  assert.ok(!off.includes('data-action-id="ilife-copy-log"'), '关掉之后还留着复制日志按钮');
  assert.ok(!off.includes('>复制日志<'), '关掉之后还留着复制日志按钮的文案');
  /* 不给命令原文、只说 `copy: true` ⇒ 也不出（不编命令原文、不出半截复制区）。 */
  assert.equal(copySections(ratioBlockWith({ copy: true })), 0, '没给命令原文却出了复制区');
  /* 关掉的那一份＝缺省那一份（只少那一节，块本身一字不差）。 */
  assert.equal(off, ratioBlockWith(undefined), '`copy: false` 的产物应当与缺省调用逐字相同');
});

test('#275 ⑦ 一张页只有一个复制区：整页那一支把命令原文交给区块，页脚不再另出一节', () => {
  const ratio = byId('看营养结构');
  assert.equal(copySections(ratio.html), 1, '复盘整页的复制区不是恰好一个：' + copySections(ratio.html));
  assert.equal((ratio.html.match(/data-action-id="ilife-copy-log"/g) ?? []).length, 1, '复制日志按钮不是恰好一个');
  /* 关掉复制区不动块里的锚点与正文：页内导航仍按那三个 id 出。 */
  for (const id of ['sec-kpi', 'sec-chart', 'sec-table']) {
    assert.ok(ratio.html.includes('<section id="' + id + '">'), '整页缺锚点 ' + id);
  }
});

test('#275 ⑦ 交 #271 的 buildDietOverviewBlock：本周／本月两段 ＋ 锚点 ＋ 到昨日口径 ＋ 来源脚注', () => {
  for (const b of ['<section id="sec-week">', '<section id="sec-month">', '本周累计', '本月累计',
    '每日热量(卡)', '本周和本月都统计到昨日为止，不含今日（今天是 ' + D + '）。',
    '今日的饮食由「看今日饮食概览」承接。', '📊 数据来源 · 饮食记录 ·']) {
    assert.ok(OVERVIEW_BLOCK.includes(b), '总览区块缺块：「' + b + '」');
  }
  /* 不给命令原文 ⇒ 不出复制区（调用方不给就不替它编一条命令原文）。 */
  assert.equal(copySections(OVERVIEW_BLOCK), 0, '没给命令原文却出了复制日志');
  /* 给了命令原文 ⇒ 复制日志第 4 段就是它。 */
  const withCmd = withSeedDb((db) => buildDietOverviewBlock(
    buildDietOverviewView(db, D), "calorie-cmd-read calorie.view.diet --params '{\"window\":\"7d\"}'"));
  assert.equal(copySections(withCmd), 1, '给了命令原文却没出复制区');
  assert.ok(callChainOf(logTextOf(withCmd)).startsWith('calorie-cmd-read calorie.view.diet'),
    '总览区块的日志第 4 段不是给进来的命令原文');
  /* 不含今日：本月段以昨日收口；本周段在「今天正是本周第一天」时出空态句（老脚本 `days=0` 那一支，
     2026-09-07 是周一——这正是老实物那句「累计从明天起算」该出现的场合）。 */
  assert.ok(OVERVIEW_BLOCK.includes('2026-09-01 至 2026-09-06'), '本月段不是到昨日收口');
  assert.ok(OVERVIEW_BLOCK.includes('窗口还没有自然日（今天正是窗口首日），累计从明天起算'),
    '本周落在窗口首日时该出空态句（老脚本 days=0 那一支）');
  for (const b of ['总热量', '日均热量', '总蛋白', '有记录天数']) {
    assert.ok(OVERVIEW_BLOCK.includes(b), '总览区块缺 KPI 标签：「' + b + '」');
  }
  assert.ok(!OVERVIEW_BLOCK.includes('ilife-block-feedback-block'), '总览区块的说明行走了深底块');
});

/* ── ⑧ 变异自证（源码级）：改坏 ⇒ 该段断言必红 ⇒ 逐文件还原 ⇒ 变绿 ──
 * 变异与还原由 `.scratch/t275/vary.mjs` 持锁执行并留下两行机器读数（见 `.scratch/t275/mut-*.txt`），
 * 本处只留**原样必绿**的读数：下面几条就是被变异打的那几处断言的正向读数。 */
test('#275 ⑧ 原样必绿：被变异打的三处断言在未改动时成立', () => {
  const good = byId('看营养结构');
  /* 甲（① 逐块）：配比档位徽章「✓ 均衡」在位（三档文案只此一处定义）。 */
  assert.equal(good.text.includes('✓ 均衡'), true, '原样产物该读到「✓ 均衡」档位徽章');
  /* 乙（① 逐块）：来源脚注与窗口区间逐字在位。 */
  assert.equal(good.text.includes('📊 数据来源 · 饮食记录 · ' + WEEK_ARROW), true, '原样产物该读到来源脚注');
  /* 丙（① 逐块）：环图中心标签与图例条三行在位。
     注意「折算合计」的**值**由页面运行时的图表脚本算出，故这里查的是中心标签与图例条文案。 */
  assert.equal(good.text.includes('折算合计（千卡）'), true, '原样产物里读不到环图中心标签');
  assert.equal(good.text.includes('蛋白（推荐 10–20%）'), true, '原样产物里读不到图例条那三行');
});

/* ── 收尾：探针只在自己的临时库里写产物，不留痕 ── */

test('#275 探针不落仓内文件', () => {
  const stray = [...RUNS].filter((r) => r.out.startsWith(ROOT)).map((r) => r.out);
  assert.deepEqual(stray, [], '探针产物落进了仓内：' + stray.join('、'));
});
