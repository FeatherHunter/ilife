/** #275 · 营养／饮水／总览页 4 条词 ＋ 两个具名区块函数的逐条探针。
 *
 * **本探针守什么**（每条对应票面一条判据／`t425-融合基准.md` 一条裁定）：
 *  ① 4 条词**逐条真出口 exit 0**，产物是**完整文档**（`<!doctype html>` ＋ charset ＋ 样式段），
 *     且**内容逐块对得上老实物**：老 4 张模板的页题、KPI 标签、表列、图题、来源行诸块都在位
 *     （老实物正本 `D:\2Study\StudyNotes\SKILLS\卡路里\templates\`，**只读**）。
 *  ② 融合 §五 第 ⑥ 类骨架：页头（眉标＋类型徽章）／页内导航／结论句（含本页读数）／
 *     口径说明行／来源脚注诸行恒出。
 *  ③ **裁定 2-补**：来源脚注与结论句走**普通小字行**（`renderCaliberLine`），不走深底反馈块
 *     ——`t425` §九 第 1 条点名归本票的那笔欠账在这里被钉住。
 *  ④ **裁定 1**：可见文本零机器话（常量名／snake_case／命令键／库表名），走共享探针 `machineWords`。
 *  ⑤ **裁定 7**：复制区双按钮、日志第 4 段「调用链」＝**本次命令原文**（含 `--params`），照抄可重跑。
 *  ⑥ **两个具名区块函数各有直测**（结构化断言）：`buildNutritionRatioBlock`（交 #273）与
 *     `buildDietOverviewBlock`（交 #271）——这两个函数今天**没有调用点**，只交付、不集成，
 *     故只能直调取数层 ＋ 直测装配层。
 *  ⑦ **变异自证**：改坏配比档位文案／改坏缺数据盒图标，同一段断言必红；原样必绿。
 *
 * 跑法：`node --test packages/skill-calorie/test/t275-营养饮水总览页.test.mjs`
 * （先 `npx tsc -b packages/base-render packages/skill-calorie`）。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, statSync } from 'node:fs';
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

/** 一条词一次真跑：库、产物都落系统 tmp，产物名带票号前缀（收尾自证不落仓内件）。 */
function freshDb() {
  const dir = mkdtempSync(join(tmpdir(), 't275-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  seedFull(db);
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

/* ── 四条词（参数照 `src/diet/routes.ts` 的真值）＋ 逐块对齐老实物的清单 ── */

/** 老实物 → 本仓的逐块清单：`blocks`＝必须在位的块（老模板里那几块），`cols`＝主表列序，
 *  `head`＝页头（眉标／徽章），`nav`＝页内导航项。 */
const PAGES = [
  {
    id: '查营养配比',
    key: 'calorie.view.nutrition-ratio',
    params: { window: '7d' },
    old: 'nutrition_ratio.html',
    title: '🥗 营养配比 ' + WEEK,
    head: ['查营养配比 · 饮食', '营养 · 饮水 · 总览'],
    nav: ['配比读数', '热量来源占比', '推荐范围对比'],
    blocks: ['热量来源占比（按营养素折算）', '推荐范围对比（' + WEEK + '；克数均为这 7 天合计）',
      '折算合计（千卡）', '蛋白（千卡）', '碳水（千卡）', '脂肪（千卡）', '距范围', '✓ 在范围内',
      '推荐 10–20%', '推荐 45–65%', '推荐 20–35%'],
    cols: ['营养素', '实际', '下限', '上限', '距范围', '状态'],
    summary: '这 7 天共摄入 3,339 千卡；三大营养素配比均衡（蛋白 13% · 碳水 64% · 脂肪 11%）。',
    footnote: '📊 数据来源 · 饮食记录 · 2026-09-01 → 2026-09-07',
  },
  {
    id: '看营养素深度',
    key: 'calorie.view.nutrition-detail',
    params: { window: '7d' },
    old: 'nutrition_detail.html',
    title: '🧪 营养素深度 ' + WEEK,
    head: ['看营养素深度 · 饮食', '营养 · 饮水 · 总览'],
    nav: ['读数', '逐项明细'],
    blocks: ['匹配餐数', '缺数据食物', '覆盖营养素', '膳食纤维', '钠', '糖',
      '累计（7 天）', '每天平均', '每天推荐', '完成度', '缺数据食物（共 5 种，未计入）', '建议用「存食品」补录'],
    cols: ['营养素', '累计（7 天）', '每天平均', '每天推荐', '完成度', '状态'],
    summary: '「看营养素深度」本窗匹配到 4 餐；膳食纤维日均 0 克、钠日均 1.1 毫克、糖日均 0 克；另有 5 种食物在食品库查不到营养值，未计入。',
    footnote: '📊 数据来源 · 饮食记录 × 食品库 · 2026-09-01 → 2026-09-07',
  },
  {
    id: '看营养素明细',
    key: 'calorie.view.nutrition-detail',
    params: { window: '7d', entry: 'detail' },
    old: 'nutrition_detail.html',
    title: '🧪 营养素明细 ' + WEEK,
    head: ['看营养素明细 · 饮食', '营养 · 饮水 · 总览'],
    nav: ['读数', '逐项明细'],
    blocks: ['匹配餐数', '缺数据食物', '累计（7 天）', '缺数据食物（共 5 种，未计入）'],
    cols: ['营养素', '累计（7 天）', '每天平均', '每天推荐', '完成度', '状态'],
    summary: '「看营养素明细」本窗匹配到 4 餐；膳食纤维日均 0 克、钠日均 1.1 毫克、糖日均 0 克；另有 5 种食物在食品库查不到营养值，未计入。',
    footnote: '📊 数据来源 · 饮食记录 × 食品库 · 2026-09-01 → 2026-09-07',
  },
  {
    id: '看今日喝水',
    key: 'calorie.view.today-water',
    params: { date: D, entry: 'drink' },
    old: 'today_water.html',
    title: '💧 今日喝水 ' + D,
    head: ['今日喝水 · 饮食', '营养 · 饮水 · 总览'],
    nav: ['今日读数', '今日进度', '本周 7 天', '今日每杯'],
    blocks: ['今日进度', '本周 7 天（2026-09-01 ~ ' + D + '）', '今日每杯（共 1 杯）', '目标', '已完成目标(100%)'],
    cols: ['时间', '饮水量ml'],
    summary: '今天喝了 2,000 ml（目标的 100%），正好完成目标。',
    footnote: '📊 数据来源 · 饮水记录 · ' + D,
  },
];

const RUNS = PAGES.map((p) => {
  const dir = freshDb();
  const r = renderOk(dir, p.key, p.params, p.id);
  return { p, dir, ...r, text: visibleText(stripCopyPayload(r.html)) };
});
const byId = (id) => RUNS.find((r) => r.p.id === id);

/** 表头：产物里第一张表的 `<th>` 序列。 */
const thsOf = (html) => [...html.matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map((m) => m[1]);
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

/* ── ① 四条词逐条实跑：exit 0 ＋ 完整文档 ＋ 逐块对得上老实物 ── */

for (const { p, html, bytes, out } of RUNS) {
  test('#275 ① 完整文档 ＋ 逐块对得上老实物（' + p.old + '）—— ' + p.id, () => {
    console.log('READING #275 ' + p.id + ' 产物 ' + out + ' ' + bytes + ' B');
    assert.ok(bytes > 4000, p.id + ' 产物过小（' + bytes + ' B）');
    /* 完整文档三件：doctype／charset／样式段——双击即开。 */
    assert.ok(html.startsWith('<!doctype html>'), p.id + ' 产物不是完整文档（缺 doctype）');
    assert.ok(html.includes('<meta charset="utf-8">'), p.id + ' 缺 charset（中文会乱码）');
    assert.ok(html.includes('<style>'), p.id + ' 缺样式段');
    assert.ok(html.includes('ilife-page'), p.id + ' 缺整页根类');
    assert.ok(!html.includes('<!--'), p.id + ' 产物里还有 HTML 注释残留');
    /* 逐块：老实物那一页的块一个不少。 */
    for (const b of p.blocks) assert.ok(html.includes(b), p.id + ' 缺老实物那一块：「' + b + '」');
    assert.deepEqual(thsOf(html), p.cols, p.id + ' 主表列序与老实物不一致：' + thsOf(html).join('｜'));
  });
}

/* ── ② 融合 §五 第 ⑥ 类骨架：页头／导航／结论句／来源脚注 ── */

for (const { p, html, text } of RUNS) {
  test('#275 ② 融合骨架：页头（眉标＋徽章）／页内导航／结论句含读数／来源脚注 —— ' + p.id, () => {
    for (const h of p.head) assert.ok(html.includes(h), p.id + ' 页头缺：「' + h + '」');
    assert.ok(html.includes('class="ilife-block-toc"') && html.includes('aria-label="页内导航"'), p.id + ' 缺页内导航');
    for (const n of p.nav) assert.ok(text.includes(n), p.id + ' 页内导航缺项：「' + n + '」');
    /* 每个导航项都有落点：`<section id=…>` 数得不小于导航项数。 */
    assert.ok((html.match(/<section id="/g) ?? []).length >= p.nav.length, p.id + ' 导航项多于锚点');
    const c = titleAndConclusion(text, p.title);
    assert.equal(c.title, p.title, p.id + ' 页题读不到：' + linesOf(html).slice(0, 6).join(' ／ '));
    assert.ok(c.conclusion !== null, p.id + ' 页题后面没有结论句');
    assert.ok(/[0-9]/.test(c.conclusion), p.id + ' 结论句里没有读数：' + c.conclusion);
    assert.ok(text.includes(p.summary), p.id + ' 结论句与预期不一致：' + c.conclusion);
    assert.ok(text.includes(p.footnote), p.id + ' 缺来源脚注：' + p.footnote);
    assert.ok(html.includes('class="ilife-block-caliber"'), p.id + ' 来源脚注没走普通小字行');
  });
}

/* ── ③ 裁定 2-补：结论句与来源脚注不走深底块（`t425` §九 第 1 条点名的欠账） ── */

const DEEP_BLOCK_CLASSES = [
  'ilife-block ilife-block-feedbackBlock',      // `notice()` 走的静态提示块（来源脚注原来住这里）
];

for (const { p, html } of RUNS) {
  test('#275 ③ 裁定 2-补：来源脚注与结论句不在深底块里 —— ' + p.id, () => {
    for (const cls of DEEP_BLOCK_CLASSES) {
      assert.ok(!html.includes(cls), p.id + ' 页面上还留着深底提示块：「' + cls + '」');
    }
    /* 页头到页内导航之间（结论句那一带）不许出现深底提示块。 */
    const headZone = html.slice(html.indexOf('<h1'), html.indexOf('ilife-block-toc'));
    assert.ok(!headZone.includes('feedbackBlock'), p.id + ' 页头那几行走进了深底块');
  });
}

test('#275 ③ 配比页／饮水页的来源脚注逐字取老实物的句子', () => {
  const ratio = byId('查营养配比');
  assert.ok(ratio.text.includes('📊 数据来源 · 饮食记录 · 2026-09-01 → 2026-09-07'), '配比页来源脚注不是老实物那句');
  assert.ok(ratio.text.includes('占比按营养素折算：蛋白和碳水每克 4 千卡、脂肪每克 9 千卡'),
    '配比页缺折算口径句（老实物图例那一层的意思要用话说出来）');
  const water = byId('看今日喝水');
  assert.ok(water.text.includes('📊 数据来源 · 饮水记录 · ' + D), '饮水页来源脚注不是老实物那句');
});

/* ── ④ 裁定 1：可见文本零机器话 ── */

for (const { p, html } of RUNS) {
  test('#275 ④ 裁定 1：可见文本零机器话 —— ' + p.id, () => {
    /* `JSON` 是公共层复制菜单的格式名（与 `test/t272` 同口径放过这一个词）。 */
    const hits = machineWords(html).filter((w) => w.hit !== null && w.hit !== 'JSON')
      .map((w) => w.kind + '＝「' + w.hit + '」');
    assert.deepEqual(hits, [], p.id + ' 可见文本里出现机器话：' + hits.join('　'));
    /* 命令键只许落在复制载荷里（裁定 1 的「不上屏」不等于「不许存在」）。 */
    assert.ok(html.includes(p.key), p.id + ' 复制载荷里的命令键不该一起消失');
    /* 同源入口页的标记名绝不上屏（#511 的硬要求；本票两条词各按自己的叫法出众）。 */
    assert.equal(visibleText(stripCopyPayload(html)).includes('entry'), false, p.id + ' 可见文本里出现了入口标记名');
  });
}

test('#275 ④ 同源入口页各自对得上：水分／明细两支的页题与正文都不同', () => {
  const drink = byId('看今日喝水');
  const detail = byId('看营养素明细');
  const deep = byId('看营养素深度');
  assert.ok(drink.text.includes('今日喝水') && drink.text.includes('今天喝了'), '喝水那一支没按自己的叫法出页');
  assert.notEqual(drink.html, deep.html, '喝水两支出了同一张页');
  assert.ok(detail.text.includes('营养素明细'), '明细那一支没按自己的叫法出页');
  assert.notEqual(detail.html, deep.html, '营养素两支出了同一张页');
  /* 「正文也要各自不同」：两页剔掉含两条词的行之后，剩余正文仍不同（`#511 ②` 的同一条口径）。 */
  const strip = (t) => t.split('\n').filter((l) => !l.includes('营养素深度') && !l.includes('营养素明细')).join('\n');
  assert.notEqual(strip(detail.text), strip(deep.text), '营养素两支只有标题不同，正文一模一样');
  /* 与上一条同源：口径说明行两支各一句（正文级差异，不是标题级）。 */
  assert.ok(deep.text.includes('膳食纤维越高越好'), '深度那一支的口径行不在位');
  assert.ok(detail.text.includes('并排列出'), '明细那一支的口径行不在位');
});

/* ── ⑤ 裁定 7：复制区双按钮 ＋ 日志第 4 段＝本次命令原文 ── */

for (const { p, html, text } of RUNS) {
  test('#275 ⑤ 裁定 7：复制区双按钮 ＋ 日志第 4 段＝本次命令原文 —— ' + p.id, () => {
    assert.ok(html.includes('data-fmt-open="1"'), p.id + ' 缺「复制数据 ▾」开合器');
    for (const f of ['text', 'json', 'csv']) assert.ok(html.includes('data-fmt="' + f + '"'), p.id + ' 缺三格式里的 ' + f);
    assert.ok(text.includes('复制数据 ▾'), p.id + ' 页面上读不到「复制数据 ▾」');
    assert.ok(html.includes('data-action-id="ilife-copy-log"'), p.id + ' 缺「复制日志」按钮');
    const logBtn = html.slice(html.indexOf('data-action-id="ilife-copy-log"'));
    assert.ok(!/^[^>]*disabled/.test(logBtn.slice(0, 400)), p.id + ' 复制日志按钮是死的（disabled＝日志文本没接）');
    assert.equal(logTextOf(html).split('\n').length >= 8, true, p.id + ' 日志文本段数不足（六段）');
    const call = callChainOf(logTextOf(html));
    assert.ok(call.startsWith('calorie-cmd-read ' + p.key + " --params '"),
      p.id + ' 第 4 段不是命令原文：' + call);
    /* 本次参数逐字在原文里（照抄可重跑）。 */
    for (const [k, v] of Object.entries(p.params)) {
      assert.ok(call.includes(JSON.stringify(k) + ':' + JSON.stringify(v)), p.id + ' 命令原文没带全本次参数 ' + k);
    }
    /* 裁定 7：不出与按钮同名的标题。 */
    assert.ok(!html.includes('>复制数据</h2>') && !html.includes('>复制日志</h2>'), p.id + ' 出了与按钮同名的标题');
  });
}

test('#275 ⑤ 两条「同源入口」的日志原文各自带全自己的标记（照抄跑得出同一页）', () => {
  const drink = callChainOf(logTextOf(byId('看今日喝水').html));
  assert.ok(drink.includes('"entry":"drink"'), '喝水那一支的命令原文没带标记：' + drink);
  const detail = callChainOf(logTextOf(byId('看营养素明细').html));
  assert.ok(detail.includes('"entry":"detail"'), '明细那一支的命令原文没带标记：' + detail);
  const deep = callChainOf(logTextOf(byId('看营养素深度').html));
  assert.ok(!deep.includes('"entry"'), '深度那一支默认路径不该凭空多出标记：' + deep);
});

/* ── ⑥ 两个具名区块函数：各有直测（结构化断言） ── */

const { buildDietOverviewView, buildNutritionDetailView, buildNutritionRatioView } =
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

const RATIO_BLOCK = withSeedDb((db) => buildNutritionRatioBlock(buildNutritionRatioView(db, '2026-09-01', D)));
const OVERVIEW_BLOCK = withSeedDb((db) => buildDietOverviewBlock(buildDietOverviewView(db, D)));
const OVERVIEW_BLOCK_NO_CMD = withSeedDb((db) => buildDietOverviewBlock(buildDietOverviewView(db, D)));

test('#275 ⑥ 交 #273 的 buildNutritionRatioBlock：一段一锚点 ＋ 逐块断言 ＋ 不夹整页壳', () => {
  for (const id of ['sec-kpi', 'sec-chart', 'sec-table']) {
    assert.ok(RATIO_BLOCK.includes('<section id="' + id + '">'), '区块缺锚点 ' + id);
  }
  for (const b of ['<div class="ilife-block-kpi-card-grid">', 'ilife-block-dist-row', 'ilife-block-data-table',
    '推荐范围对比（' + WEEK + '；克数均为这 7 天合计）', '📊 数据来源 · 饮食记录 · ']) {
    assert.ok(RATIO_BLOCK.includes(b), '区块缺块：「' + b + '」');
  }
  /* 区块不是页面：不夹 doctype／head／整页壳／复制区（集成归 #273）。 */
  assert.ok(!RATIO_BLOCK.includes('<!doctype'), '区块里夹了 doctype——它是块，不是页');
  assert.ok(!RATIO_BLOCK.includes('ilife-block-page-shell'), '区块里夹了整页壳');
  assert.ok(!RATIO_BLOCK.includes('data-action-id="ilife-copy-data"'), '区块里夹了复制区（集成归调用方）');
  assert.ok(RATIO_BLOCK.length > 800, '区块过短（' + RATIO_BLOCK.length + ' 字符）');
});

test('#275 ⑥ 交 #271 的 buildDietOverviewBlock：本周／本月两段 ＋ 锚点 ＋ 到昨日口径 ＋ 来源脚注', () => {
  for (const b of ['<section id="sec-week">', '<section id="sec-month">', '本周累计', '本月累计',
    '每日热量(卡)', '统计到昨日 · ' + D, '📊 数据来源 · 饮食记录 ·']) {
    assert.ok(OVERVIEW_BLOCK.includes(b), '总览区块缺块：「' + b + '」');
  }
  /* 不给命令原文 ⇒ 不出复制区（调用方不给就不替它编一条命令原文）。 */
  assert.ok(!OVERVIEW_BLOCK.includes('data-action-id="ilife-copy-log"'), '没给命令原文却出了复制日志');
  /* 给了命令原文 ⇒ 复制日志第 4 段就是它。 */
  const withCmd = withSeedDb((db) => buildDietOverviewBlock(
    buildDietOverviewView(db, D), "calorie-cmd-read calorie.view.diet --params '{\"window\":\"7d\"}'"));
  assert.ok(withCmd.includes('data-action-id="ilife-copy-log"'), '给了命令原文却没出复制日志');
  assert.ok(callChainOf(logTextOf(withCmd)).startsWith('calorie-cmd-read calorie.view.diet'),
    '总览区块的日志第 4 段不是给进来的命令原文');
  /* 不含今日：本月段以昨日收口；本周段在「今天正是本周第一天」时出空态句（老脚本 `days=0` 那一支，
     2026-09-07 是周一——这正是老实物那句「累计从明天起算」该出现的场合）。 */
  assert.ok(OVERVIEW_BLOCK.includes('2026-09-01 ~ 2026-09-06'), '本月段不是到昨日收口');
  assert.ok(OVERVIEW_BLOCK.includes('窗口还没有自然日（今天正是窗口首日），累计从明天起算'),
    '本周落在窗口首日时该出空态句（老脚本 days=0 那一支）');
  for (const b of ['总热量', '日均热量', '总蛋白', '有记录天数']) {
    assert.ok(OVERVIEW_BLOCK.includes(b), '总览区块缺 KPI 标签：「' + b + '」');
  }
  assert.ok(!OVERVIEW_BLOCK.includes('ilife-block-feedbackBlock'), '总览区块的说明行走了深底块');
  assert.equal(OVERVIEW_BLOCK_NO_CMD, OVERVIEW_BLOCK, '不给命令原文时产物应当一致（同一次调用两遍）');
});

/* ── ⑦ 变异自证（源码级）：改坏 ⇒ 该段断言必红 ⇒ 逐文件还原 ⇒ 变绿 ──
 * 变异与还原由 `.scratch/t275/vary.mjs` 持锁执行并留下两行机器读数（见证据件），
 * 本处只留**原样必绿**的读数：下面两条就是被变异打的那两处断言的正向读数。 */
test('#275 ⑦ 原样必绿：被变异打的两处断言在未改动时成立', () => {
  const good = byId('查营养配比');
  /* 甲（① 结论句）：档位文案「均衡」在位。 */
  assert.equal(good.text.includes('三大营养素配比均衡'), true, '原样产物该读到「均衡」档位');
  /* 乙（② 来源脚注）：来源行与窗口区间逐字在位。 */
  assert.equal(good.text.includes('📊 数据来源 · 饮食记录 · 2026-09-01 → 2026-09-07'), true,
    '原样产物该读到来源脚注');
  /* 另一条被变异打的断言：环图中心读数（中心标签 ＋ 图例条一行）在位。
     注意「折算合计」的**值**由页面运行时的图表脚本算出，故这里查的是中心标签与图例条文案。 */
  assert.equal(good.text.includes('折算合计（千卡）'), true, '原样产物里读不到环图中心标签');
  assert.equal(good.text.includes('蛋白（推荐 10–20%）'), true, '原样产物里读不到图例条那三行');
});

/* ── 收尾：探针只在自己的临时库里写产物，不留痕 ── */

test('#275 探针不落仓内文件', () => {
  const stray = [...RUNS].filter((r) => r.out.startsWith(ROOT)).map((r) => r.out);
  assert.deepEqual(stray, [], '探针产物落进了仓内：' + stray.join('、'));
});
