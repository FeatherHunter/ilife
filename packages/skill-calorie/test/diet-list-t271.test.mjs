/** #271 · 条目列表页（`calorie.view.diet` 的窗口词）与今日饮食页（`calorie.today`）。
 *
 *  判据落点（`docs/skills/skill-calorie/t155-派单/02-逐票专属节.md` 的 `## #271`）：
 *   ① 11 条词真出口 exit 0、产物为完整文档（本件守 `calorie.view.diet` 那 8 条与 `calorie.today` 那 3 条）；
 *   ② **备注列有结构化断言**（老实物 `today_meals.html:168` 九列含备注；样张空备注写 `—`）；
 *   ③ 骨架照 `t425-融合基准.md` §五 第 ② 类逐行：眉标／标题／结论句／页内导航／KPI／主图／主表（含备注列）／
 *      空态块＋引导句／口径说明行／复制区双按钮／来源脚注；裁定 1（标识符不上屏）／2（结论句）／
 *      2-补（结论与来源不走深底块）／3（导航＋口径行＋脚注恒出）／4（缺值 `—`）／5（零值不画柱身、
 *      单点不成线）／7（日志第 4 段＝本次命令原文）。
 *
 *  先编译：`npx tsc -b packages/base-render packages/skill-calorie`。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

import { machineWords, visibleText } from './visible-text-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const ROOT = join(PKG, '..', '..');
const CLI = join(PKG, 'dist', 'cli', 'cmd_read.js');
const BUILD_VIEW = (await import(pathToFileURL(join(PKG, 'dist', 'render', 'dietDocs.js')).href)).buildViewDietDoc;
const DAY = '2026-09-07';

/* ── ① 直测：骨架 ＋ 备注列（结构化断言，不靠真跑） ── */

function sampleInput(extra = {}) {
  const days = [
    { date: '2026-09-05', calories: 1500, protein: 90, carbs: 180, fat: 50, calorieGoal: 1800 },
    { date: '2026-09-06', calories: null, protein: null, carbs: null, fat: null, calorieGoal: 1800 },
    { date: '2026-09-07', calories: 1700, protein: 100, carbs: 200, fat: 55, calorieGoal: 1800 },
  ];
  const meals = [
    { date: '2026-09-05', time: '08:10:45', food_name: '燕麦粥', grams: 60, calories: 320, protein: 12, carbs: 52, fat: 6, note: '少糖' },
    { date: '2026-09-07', time: null, food_name: '鸡胸饭', grams: 300, calories: 560, protein: 42, carbs: 65, fat: 12, note: null },
  ];
  return {
    overview: {
      start: '2026-09-05', end: '2026-09-07', days: 3, loggedDays: 2, totalCalories: 3200,
      avgCalories: 1600, calorieGoal: 1800, trend: { summary: { trend: '平稳', avg: 1600 } },
    },
    dist: {
      totalCalories: 880, slices: [
        { meal: '早餐', count: 1, calories: 320, pct: 36 },
        { meal: '午餐', count: 1, calories: 560, pct: 64 },
      ],
    },
    distDate: '2026-09-07', days, meals, mealTotal: meals.length, mealsTruncated: false,
    ...extra,
  };
}

/** 一张表（含表头）的列名逐字 —— 按 `<caption>`／`<summary>` 的文本定位那一段。
 *  两种排法都要认：caption 在表内（今日页），summary 在表外（明细折叠区）。 */
function tableOf(html, needle) {
  const i = html.indexOf(needle);
  assert.ok(i > 0, '产物里找不到这张表：' + needle);
  const before = html.lastIndexOf('<table', i);
  const from = (before >= 0 && html.indexOf('</table>', before) > i) ? before : html.indexOf('<table', i);
  assert.ok(from > 0, '这门针之前之后都没有表：' + needle);
  const seg = html.slice(from, html.indexOf('</table>', from));
  const hs = seg.indexOf('<thead');
  const he = seg.indexOf('</thead>');
  /* 跳过 `<thead …>` 标签本身——它的开头也是 `<th`，正则会把它当成一格表头（实测踩过）。 */
  const head = seg.slice(seg.indexOf('>', hs) + 1, he);
  return [...head.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) => m[1]);
}

/** 「复制日志」那颗按钮的标签原文（不给命令原文时公共层仍会出一颗 `disabled` 的同名按钮）。 */
function logButtonTag(html) {
  const i = html.indexOf('data-action-id="ilife-copy-log"');
  if (i < 0) return null;
  return html.slice(html.lastIndexOf('<button', i), html.indexOf('>', i) + 1);
}

/** 日志文本的第 4 段「调用链」（段序正本＝`packages/base-render/src/spec/text.ts:25` 的 `LOG_SECTIONS`）。 */
function callChainOf(tag) {
  const m = /data-t="([\s\S]*?)"/.exec(tag);
  assert.ok(m, '复制日志按钮上读不到日志文本（死按钮）');
  const log = m[1].replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const segs = log.split('\n');
  assert.equal(segs.filter((s) => /^(场景标识|AI 思考链|数据结构|调用链|时间戳版本|异常)$/.test(s.trim())).length,
    6, '日志不是六段：' + log.slice(0, 160));
  return segs[segs.findIndex((s) => s.trim() === '调用链') + 1];
}

test('#271 骨架：15 行里该出的都出，明细长着备注列', () => {
  const html = BUILD_VIEW(sampleInput());
  for (const cls of [
    'ilife-block-page-shell-title', 'ilife-block-page-shell-subtitle', 'ilife-block-toc',
    'ilife-block-kpi-card-grid', 'ilife-block-chart-block', 'ilife-block-data-table',
    'ilife-block-caliber', 'ilife-block-copy-block', 'ilife-block-disclosure',
  ]) {
    assert.ok(html.includes(cls), '骨架缺：' + cls);
  }
  /* 页内导航的六个落点都在，且对应 `<section id>` 真的存在（不留死链接）。 */
  for (const id of ['sec-kpi', 'sec-trend', 'sec-dist', 'sec-daily', 'sec-meals', 'sec-copy']) {
    assert.ok(html.includes('href="#' + id + '"'), '页内导航缺 ' + id);
    assert.ok(html.includes('id="' + id + '"'), '导航指了个不存在的区块：' + id);
  }
  /* 明细九列逐字（老实物 `today_meals.html:168`）：末列就是备注。 */
  assert.deepEqual(tableOf(html, '全部记录'), [
    '日期时间', '餐别', '食物', '克数', '热量', '蛋白', '碳水', '脂肪', '备注',
  ]);
  const visible = visibleText(html);
  assert.ok(visible.includes('少糖'), '备注原文没上屏');
  assert.ok(visible.includes('2026-09-05 08:10'), '日期时间列没写全，或时间没截到分');
  assert.ok(!visible.includes('08:10:45'), '时间没截断到分（还是秒级）');
  /* 裁定 4：缺值写 `—`（备注缺、无记录日的按日汇总都算）。 */
  assert.ok(visible.includes('—'), '缺值没有写成 —');
  /* 裁定 1：源码标识符不上屏（走仓内既有的机器词探针，A3＝内部命令键）。 */
  const a3 = machineWords(html).find((r) => r.kind.startsWith('A3'));
  assert.equal(a3.hit, null, '命令键漏到用户眼前：' + a3.hit);
});

test('#271 复制区：给了命令原文即真·日志按钮，第 4 段＝本次命令原文', () => {
  const cmd = "calorie-cmd-read calorie.view.diet --params '{\"window\":\"7d\"}'";
  const html = BUILD_VIEW(sampleInput({ command: cmd }));
  assert.ok(html.includes('复制数据'), '缺「复制数据」按钮');
  const tag = logButtonTag(html);
  assert.ok(tag !== null, '给了 command 却没出「复制日志」按钮（裁定 7 要双按钮）');
  assert.equal(callChainOf(tag), cmd, '第 4 段不是本次命令原文');
  /* 不给 command 时那颗按钮**不许是活的**（公共层的复制区在无日志文本时出一颗 disabled 的同名按钮，
     页面侧不做补救——不留点得动的死按钮）。 */
  const bareTag = logButtonTag(BUILD_VIEW(sampleInput()));
  if (bareTag !== null) assert.ok(bareTag.includes('disabled'), '不给 command 却出了能点的「复制日志」：' + bareTag);
});

test('#271 裁定 4／5：空窗仍出完整页；单点不成线；零值不画柱身', () => {
  /* 空窗：一条记录也没有 ⇒ 标题／空态句／引导句／来源脚注都在。 */
  const empty = BUILD_VIEW(sampleInput({
    days: [{ date: '2026-09-07', calories: null, protein: null, carbs: null, fat: null, calorieGoal: 1800 }],
    meals: [], mealTotal: 0,
    overview: {
      start: '2026-09-07', end: '2026-09-07', days: 1, loggedDays: 0, totalCalories: 0,
      avgCalories: null, calorieGoal: 1800, trend: { summary: { trend: '平稳', avg: 0 } },
    },
    dist: { totalCalories: 0, slices: [{ meal: '早餐', count: 0, calories: 0, pct: 0 }] },
  }));
  assert.ok(empty.startsWith('<!doctype html>'), '空窗产物不是完整文档');
  assert.ok(empty.includes('ilife-block-empty-block'), '空窗缺空态块');
  assert.ok(visibleText(empty).includes('没有饮食记录'), '空窗缺空态句');
  assert.ok(visibleText(empty).includes('记一餐'), '空窗缺引导句');
  assert.ok(empty.includes('数据来源'), '空窗缺来源脚注');
  /* 断「图上不出图元」要看**正文**：样式段里本来就有 `.ilife-block-chart-block{…}` 那类规则名。 */
  const emptyBody = empty.slice(empty.indexOf('</style>'));
  assert.ok(!emptyBody.includes('ilife-block-chart-block-canvas'), '空窗不该画图');
  assert.ok(!emptyBody.includes('id="sec-trend"') && !emptyBody.includes('id="sec-daily"'), '空窗不该出折线／按日汇总区块');
  /* 单点不成线：只有一天有记录 ⇒ 出说明句、不出折线。 */
  const one = BUILD_VIEW(sampleInput({
    days: [{ date: '2026-09-07', calories: 1700, protein: 100, carbs: 200, fat: 55, calorieGoal: 1800 }],
    overview: {
      start: '2026-09-07', end: '2026-09-07', days: 1, loggedDays: 1, totalCalories: 1700,
      avgCalories: 1700, calorieGoal: 1800, trend: { summary: { trend: '平稳', avg: 1700 } },
    },
  }));
  assert.ok(visibleText(one).includes('一个点画不成折线'), '单点没出说明句');
  /* 零值不画柱身：尾日无记录 ⇒ 餐别那支出四张卡、值位 `—`、不出柱图。 */
  const zero = BUILD_VIEW(sampleInput({
    dist: { totalCalories: 0, slices: [{ meal: '早餐', count: 0, calories: 0, pct: 0 }] },
  }));
  assert.ok(visibleText(zero).includes('餐别分布 早餐'), '零值那支没出餐别卡');
  assert.ok(!zero.includes('"type":"bar"') , '零值仍画了柱身');
});

test('#271 餐别支／总览支：调用点给了取数才换页，区块走 #273／#275 的具名函数', () => {
  const meal = BUILD_VIEW(sampleInput({
    mealView: {
      start: '2026-09-01', end: '2026-09-07', days: 7, meal: 'all', mealLabel: '全部餐别',
      items: [{ date: '2026-09-07', time: '08:10', meal: '早餐', food: '燕麦粥', grams: 60, cal: 320, protein: 12 }],
      total: 1, totalCal: 320, avg: 46,
      oneLine: '最近 7 天共 1 餐；早餐热量占比最高（100%）。',
      dist: [{ label: '早餐', count: 1, cal: 320, pct: 100 }],
    },
  }));
  assert.ok(meal.includes('ilife-block-dist-row'), '餐别支没出 #273 的占比条');
  assert.ok(meal.includes('餐别分布 2026-09-01 ~ 2026-09-07'), '餐别支页名不对');
  assert.ok(visibleText(meal).includes('早餐热量占比最高'), '餐别支没把 #273 的结论句放进副题槽');
  const ov = BUILD_VIEW(sampleInput({
    overviewView: {
      today: '2026-09-07',
      week: { start: '2026-09-01', end: '2026-09-06', days: 6, loggedDays: 5, totalCalorie: 9000, avgCalorie: 1500, totalProtein: 500, daily: [] },
      month: { start: '2026-09-01', end: '2026-09-06', days: 6, loggedDays: 5, totalCalorie: 9000, avgCalorie: 1500, totalProtein: 500, daily: [] },
    },
  }));
  assert.ok(ov.includes('id="sec-week"') && ov.includes('id="sec-month"'), '总览支缺 #275 的两个锚点');
  assert.ok(visibleText(ov).includes('本周累计'), '总览支没出「本周累计」');
  assert.ok(visibleText(ov).includes('统计到昨日'), '总览支缺 #275 的口径句');
});

/* ── ② 真跑：一条读命令走完整 CLI（exit 0 ＋ 完整文档 ＋ 备注列） ── */

const { openDb } = await import(pathToFileURL(join(PKG, 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

function freshDb() {
  const dir = mkdtempSync(join(tmpdir(), 't271-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  seedFull(db);
  db.close();
  return dir;
}

function run(dir, key, params) {
  const out = join(dir, 't271-' + Math.random().toString(36).slice(2, 8) + '.html');
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params), '--html', out], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: SEED_TODAY },
  });
  assert.equal(r.status, 0, key + ' 真出口 exit=' + r.status + ' stderr=' + String(r.stderr).slice(-300));
  return { html: readFileSync(out, 'utf8'), bytes: statSync(out).size };
}

test('#271 真跑：calorie.view.diet（窗口词）exit 0＋完整文档＋日志第 4 段＝命令原文', () => {
  const dir = freshDb();
  const r = run(dir, 'calorie.view.diet', { window: '7d' });
  assert.ok(r.html.startsWith('<!doctype html>'), '产物不是完整文档');
  assert.ok(r.html.includes('<meta charset="utf-8">'), '产物缺 charset');
  assert.ok(r.html.length > 4000 && r.bytes > 4000, '产物太小，像片段：' + r.bytes);
  assert.ok(r.html.includes('ilife-block-toc'), '缺页内导航');
  assert.ok(r.html.includes('数据来源'), '缺来源脚注');
  assert.deepEqual(tableOf(r.html, '全部记录').at(-1), '备注', '真跑的明细末列不是备注');
  assert.ok(r.html.includes('复制数据'), '真跑缺「复制数据」按钮');
  /* 复制日志那一颗要处理体把命令原文传进来才**活**：`calorie.view.diet` 的处理体住 `src/home/**`，
     本票按编排者 2026-09-15 的裁定**不接线**（改归 #276 席）⇒ 这里守的是不变量：
     接上了，第 4 段必须逐字等于本次命令原文；没接上，那颗按钮必须是 `disabled`（不是死按钮）。 */
  const tag = logButtonTag(r.html);
  if (tag !== null && tag.includes('data-t=')) {
    assert.equal(callChainOf(tag), "calorie-cmd-read calorie.view.diet --params '{\"window\":\"7d\"}'",
      '第 4 段不是本次命令原文');
  } else {
    assert.ok(tag === null || tag.includes('disabled'), '没接上命令原文时那颗日志按钮不许是活的：' + tag);
  }
});

test('#271 真跑：calorie.today 带 hasNote 的备注列＋标题写明筛选口径', () => {
  const dir = freshDb();
  /* 种子里今日未必有备注 ⇒ 先写一条带备注的记录（走本技能自己的写命令，不手改库）。 */
  const w = spawnSync(process.execPath, [CLI, 'calorie.diet.add', '--params', JSON.stringify({
    foodName: '结构化断言用例', calories: 100, protein: 5, date: DAY, note: '断言用备注',
  })], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: SEED_TODAY },
  });
  assert.equal(w.status, 0, '写这条验用例失败 exit=' + w.status + ' ' + String(w.stderr).slice(-200));
  const r = run(dir, 'calorie.today', { date: '今日', hasNote: true });
  assert.ok(r.html.startsWith('<!doctype html>'), '产物不是完整文档');
  const visible = visibleText(r.html);
  assert.ok(visible.includes('只看有备注的'), '标题没写明筛选口径');
  assert.ok(visible.includes('断言用备注'), '备注原文没上屏');
  assert.ok(tableOf(r.html, '今日明细').at(-1) === '备注', '「有备注」那一支的明细末列不是备注');
  /* 普通今日页（不给 hasNote）的明细也必须长着备注列——老实物 `today_meals.html:168` 恒有，
     融合基准 §五 第 9 行「主表／主列表（含备注列）」恒出。 */
  const plain = run(dir, 'calorie.today', { date: '今日' });
  assert.ok(tableOf(plain.html, '今日明细').at(-1) === '备注', '普通今日页的明细缺备注列');
  /* 裁定 7 的真出口证据：处理体在自己声明路径内（`src/diet/today.ts`）⇒ 这一支接上了命令原文。 */
  const tag = logButtonTag(r.html);
  assert.ok(tag !== null && tag.includes('data-t='), 'calorie.today 那一支的「复制日志」不是活按钮：' + tag);
  assert.equal(callChainOf(tag),
    "calorie-cmd-read calorie.today --params '{\"date\":\"今日\",\"hasNote\":true}'", '第 4 段不是本次命令原文');
});
