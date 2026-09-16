/** #336 · 页面④体重波动 5 词：页面补齐＋只看异常点形态。
 * 口径：老实物 weight_volatility_v2.html（t165-老页面实物结构.md）＋老脚本
 * render_weight_volatility_v2.py（默认 30 天／--view full|anomalies-only）。
 * 两处对不上处置见证据件 docs/skills/skill-calorie/t336-波动-证据.md。
 */
import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { openDb, DB_FILENAME } from '../dist/index.js';
import { viewVolatility, buildVolatilityDoc, buildVolatilityView, parseVolatilityView, weightVolatilityV2 } from '../dist/weight/volatility.js';
import { metricsOf } from '../dist/shared/docPage.js';

const tmpDb = () => openDb(join(mkdtempSync(join(tmpdir(), 't336-')), 't.db'));

/** 可见文本层：剔掉 script／style、**整条属性**、标签后剩下的读者看得见的字。
 *  顺序要紧：复制区把整份载荷塞进 `title`／`data-t`，属性值里带转义过的 `<`——属性**整条**（连同引号）
 *  换成一个空格的写法，才不会让载荷里的 `结论`／`基线kg` 被当成页上的字（先剔标签会把属性拆散、漏出去）。
 *  标签／属性一律换成一个空格（不删空），免得相邻文本被拼到一起。
 *  （页上真正的属性值里没有裸 `<`，故第一条替换不会误吃正文。） */
const attrOrTag = /[a-zA-Z][a-zA-Z0-9:._-]*\s*=\s*"[^"]*"|[a-zA-Z][a-zA-Z0-9:._-]*\s*=\s*'[^']*'|<[^>]*>/g;
const cleanText = (s) => String(s).replace(attrOrTag, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ').trim();
const toVisible = (html) => cleanText(String(html)
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, ' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, ' '));
/** 正文可见文本（#504）：在 `toVisible` 之上再剔掉 `<title>`——那一处 `卡路里·体重` 是全仓 58 页逐字
 *  同一份品牌名（`plateDocs.ts:29` 的 `DOC_TITLE`），不是正文串；「正文零 `·`／`；`」数的是正文
 *  （`<script>`／`<style>` 已由 `toVisible` 剔掉，页内脚本那些 `；` 不算正文）。 */
const bodyText = (html) => toVisible(String(html).replace(/<title\b[^>]*>[\s\S]*?<\/title>/g, ' '));
/** 机器面（复制载荷）里的键名：只住在属性值里，故那条判据看**引号串**、不看可见文本。 */
const quotedStrings = (html) => (String(html).match(/"[^"]*"|'[^']*'/g) || []).join('\u0000');
const betweenTags = (html, re) => (String(html).match(/>([^<>]*)</g) || [])
  .map((s) => cleanText(s.slice(1, -1))).filter((s) => re.test(s));

/** 30 天平稳 70kg＋一日 spike，保证近 7 天有异常点可断言。 */
const seedVol = (db) => {
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, weight_goal) VALUES (1, 1800, 68)').run();
  let d = new Date('2026-07-20T12:00:00Z');
  for (let i = 0; i < 30; i++) {
    const iso = d.toISOString().slice(0, 10);
    const kg = i === 25 ? 75.0 : 70 + (i % 3) * 0.1;
    db.prepare('INSERT INTO weight_log (date, weight_kg) VALUES (?, ?)').run(iso, kg);
    d = new Date(d.getTime() + 86400000);
  }
  db.prepare("INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES ('2026-08-18', '08:00', '米饭', 200, 1000, 20, 200, 10)").run();
};

test('#336 波动算式：双基线＋1.5σ/2.0σ＋异常＋σ趋势＋预警', () => {
  const db = tmpDb();
  seedVol(db);
  const v = buildVolatilityView(db, '2026-07-20', '2026-08-18', 'rolling');
  assert.ok(v.volatility.baselineValue > 69 && v.volatility.baselineValue < 72);
  assert.ok(v.volatility.thresholds.yellow > 0 && v.volatility.thresholds.red > v.volatility.thresholds.yellow);
  assert.ok(v.volatility.points.length === 30);
  assert.ok(v.volatility.recentAnomalies.length >= 1);
  assert.ok(v.volatility.sigmaTrend.length > 0);
  assert.ok(['red', 'yellow', 'normal'].includes(v.volatility.earlyWarning.level));
  assert.match(v.volatility.baselineToggleLabel, /近/);
  const g = buildVolatilityView(db, '2026-07-20', '2026-08-18', 'goal');
  assert.match(g.volatility.baselineToggleLabel, /目标/);
  db.close();
});

test('#336 5 条全有命令：窗口与唤醒词语义一致＋页脚只留人话来源（#485 裁定 F）', () => {
  const db = tmpDb();
  seedVol(db);
  const cases = [
    // #490 就地摆正：这一条原来只给 `window: '30d'` 不钉「今天」，窗口按**当刻**倒推 30 天，
    // 与种子库那 30 天史（2026-07-20~2026-08-18）不重叠 ⇒ `points` 为 0、本用例恒红（与 #490 无关的旧红）。
    // 五个用例的窗口语义本来就要求钉同一枚锚点（同文件其余四条都已钉），照钉。
    ['看体重稳不稳（增强版）', { window: '30d', today: '2026-08-18' }],
    ['看本月波动', { window: '本月', today: '2026-08-18' }],
    ['看最近 90 天波动', { window: '90d', today: '2026-08-18' }],
    ['看最近 180 天波动', { window: '180d', today: '2026-08-18' }],
    ['看波动异常点', { window: '30d', today: '2026-08-18', view: 'anomalies-only' }],
  ];
  for (const [wake, params] of cases) {
    const out = viewVolatility(params, db);
    assert.ok(out.html.includes('<html'), wake + ' 产物是完整文档');
    assert.ok(out.html.includes('ilife-page'), wake + ' 走整页模板');
    assert.ok(out.data.metrics.points >= 2, wake + ' 有点数');
    // #485 裁定 F：可见文本里两个库表名命中 0（页脚来源行只留「体重记录」）；复制日志第 4 段与复制载荷照旧带库与表。
    // #542 收紧：口径行分隔改由 CSS 细竖线承担（t154-r3 #541 起 `｜` 只活在 HTML 结构里）后，
    // 可见文本里不再有字面 ｜——分三段各断一处，不断整句（旧整句断言至此作废）。
    const vis = toVisible(out.html);
    assert.ok(vis.includes('📊 数据来源：'), wake + ' 页脚缺来源头');
    assert.ok(vis.includes('体重记录'), wake + ' 页脚缺人话来源');
    assert.ok(vis.includes('窗口'), wake + ' 页脚缺窗口');
    assert.ok(out.html.includes('ilife-block-caliber'), wake + ' 缺口径行区块');
    assert.equal(vis.includes('weight_log'), false, wake + ' 可见文本没有表名');
    assert.equal(vis.includes(DB_FILENAME), false, wake + ' 可见文本没有库文件名');
    assert.ok(quotedStrings(out.html).includes('体重记录（本窗体重波动）'), wake + ' 复制日志第 4 段仍带库与来源（机器面）');
    assert.ok(quotedStrings(out.html).includes('基线kg'), wake + ' 复制载荷的中文键名一字不动（机器面）');
  }
  db.close();
});

test('#336 只看异常点：不含曲线段、含异常点与原因', () => {
  const db = tmpDb();
  seedVol(db);
  const full = viewVolatility({ window: '30d', today: '2026-08-18' }, db);
  const only = viewVolatility({ window: '30d', today: '2026-08-18', view: 'anomalies-only' }, db);
  assert.ok(full.html.includes('每天离平均线多远'), '整图含曲线段');
  assert.ok(full.html.includes('去掉涨跌后的波动'), '整图含「去掉涨跌后的波动」那张趋势图（#485 整改：图题不再叫「波动幅度趋势」）');
  assert.ok(!only.html.includes('每天离平均线多远'), '只看异常点不出曲线段');
  const charts = (html) => (html.match(/ilife-block-chart-block"/g) || []).length;
  assert.equal(charts(only.html), 0, '只看异常点一张图都不出（判据从文案改成图表区块计数）');
  assert.ok(charts(full.html) >= 2, '整图至少两段（离平均线＋去掉涨跌后的波动）');
  assert.ok(only.html.includes('波动异常点'), '只看异常点标题');
  assert.ok(only.html.includes('原因'), '只看异常点含原因列');
  assert.ok(only.html.includes('共 ') && only.html.includes('个'), '只看异常点含计数');
  db.close();
});

test('#336 融合（§5 七组）：图表 options／徽章／结论块／页脚来源行／复制双钮', () => {
  const db = tmpDb();
  seedVol(db);
  const full = viewVolatility({ window: '30d', today: '2026-08-18' }, db).html;
  const only = viewVolatility({ window: '30d', today: '2026-08-18', view: 'anomalies-only' }, db).html;
  for (const n of ['ilife-charts-tick', 'ilife-charts-markline', 'status-badge', '📊 数据来源：', '复制日志', '<details', '结论']) {
    assert.ok(full.includes(n), '整图面缺：' + n);
  }
  for (const n of ['只看异常点', 'status-badge', '📊 数据来源：', '复制日志', '结论']) {
    assert.ok(only.includes(n), '只看异常点面缺：' + n);
  }
  assert.equal((full.match(/<summary[^>]*>结论<\/summary>/g) || []).length, 1, '结论块一页最多一块');
  assert.ok(!full.includes('>normal<') && !full.includes('>yellow<') && !full.includes('>red<'), '档位不出现英文裸值');
  db.close();
});

test('#336 页面补齐：波动带与今日偏离＋异常列表计数＋波动曲线＋结论句（#485 换词后同步收紧）', () => {
  const db = tmpDb();
  seedVol(db);
  const v = buildVolatilityView(db, '2026-07-20', '2026-08-18', 'rolling');
  const html = buildVolatilityDoc(v, 'full');
  for (const needle of ['平均线', '注意线', '警戒线', '今日偏离', '近期异常', '去掉涨跌后的波动', '体重很稳|体重基本稳定|体重波动较大']) {
    assert.match(html, new RegExp(needle), '补齐含 ' + needle);
  }
  // #485 文本审查：旧术语句命中数必须为 0（`基线` 不在本清单——复制载荷的中文**键名**仍有 `基线kg`，
  // 页上可见文本里已经没有它；载荷键名归 #41 登记册的 `render-t41.test.mjs:113` 断 `/基线/` 复用）。
  for (const gone of ['偏离基线', '黄±', '红±', '阈值', '标准差', 'σ 趋势', '2sigma', '1.5sigma',
    'vs 近', '档位「', '📊 数据来源:', 'rolling 基线', '黄/红阈上']) {
    assert.equal(html.split(gone).length - 1, 0, '旧术语句残留：' + gone);
  }
  db.close();
});

test('#485 对抗审查 D1：一屏一义——「波动幅度」全页只许指卡②那个数（值槽同数同精度）', () => {
  const db = tmpDb();
  seedVol(db);
  const html = viewVolatility({ window: '30d', today: '2026-08-18' }, db).html;
  const vis = toVisible(html);
  // S1 的根：本库（30 天里一天 75 kg 的尖峰）里，卡②的 1.848（σ＝去掉逐日涨跌后的波动）与整窗
  // 离散度 0.90 是两个互不相容的量，原来两处都叫「波动幅度」——读者拿这个词得不出任何结论。
  assert.equal(vis.split('波动幅度').length - 1, 1, '可见文本里「波动幅度」只许 1 处（卡②说明）');
  const readings = vis.match(/波动幅度 (\d+\.\d+) kg/g) || [];
  assert.equal(readings.length, 1, '「波动幅度」后面必须紧跟一个数：' + JSON.stringify(readings));
  const sigma = metricsOf(weightVolatilityV2(db, '2026-07-20', '2026-08-18').data).baselineSigma;
  assert.equal(readings[0], '波动幅度 ' + sigma + ' kg', '「波动幅度」跟随的数必须恒等于卡②值槽的 σ=' + sigma);  // 「波动带」是两条线围出来的那个已有名字（不是本票的量名）：页上只许卡②说明与结论句各 1 处
  // （表注里的「超过波动带的点」是表格自述口径，不计入；卡②值槽与徽章的措辞走「警戒线／这两条线」。）
  assert.equal((vis.match(/波动带 ±/g) || []).length, 1, '「波动带」＋线值只许卡②说明 1 处');
  // #510（审查席 S3）：徽章原来是一句 11 字的话（「这两条线按本窗数据算」）——胶囊位只装 2～4 字状态词。
  assert.equal(vis.includes('本窗算出'), true, '卡②徽章说清两条线是按本窗数据算的（收到 4 字状态词）');
  assert.equal(vis.includes('这两条线按本窗数据算'), false, '卡②徽章仍是整句（胶囊位装不下句子）');
  // D2／D3：结论不再复述卡面数字（卡②的档位天数／卡③的今日偏离与线值）——那几个数在结论句里命中 0，
  // 它们只住在自己的卡里（表格逐行的偏离值与复制载荷机器面不在本判据内）。
  const conclusion = betweenTags(html, /体重很稳|体重基本稳定|体重波动较大/).join('\n');
  assert.ok(conclusion.length > 0, '找得到结论句');
  assert.ok(conclusion.includes('整体离散度'), '结论句那个标准差用自己的名字（不是「波动幅度」）');
  assert.equal(conclusion.split('波动幅度').length - 1, 0, '结论句不含「波动幅度」（那个词只归卡②）');
  for (const gone of ['最近 7 天平均每天变化', '超过警戒线 0 天', '注意线 0 天', '超过警戒线 ±', '平均线高 0.03 kg']) {
    assert.ok(!conclusion.includes(gone), '结论句复述了卡面读数：' + gone);
  }
  db.close();
});

test('#504 形状化与手机端：卡②那行 `·` 串落成条子、卡槽不吃 HTML、正文零 `·`／`；`', () => {
  const db = tmpDb();
  seedVol(db);
  const html = viewVolatility({ window: '30d', today: '2026-08-18' }, db).html;
  const vis = bodyText(html);
  /* 卡②副说明原来是一行三件事的 `·` 串 ⇒ 现在：三个数全在卡下那条**形状**上（标签 ＋ 值，竖排）；
   * #510（审查席 S3）：那一句「两条线各是多少，看这张卡下面那条」是**指路牌**（事实已被移出卡、
   * 再叫读者去别处看）⇒ 整条副说明撤掉，卡②改成无副行的纯指标卡。 */
  assert.equal(vis.split('·').length - 1, 0, '正文仍有 `·`');
  assert.equal(vis.split('；').length - 1, 0, '正文仍有 `；`');
  assert.equal(vis.includes('看这张卡下面那条'), false, '卡②仍在写指路牌副说明');
  assert.equal(vis.includes('两条线各是多少'), false, '卡②仍在写指路牌副说明');
  assert.ok(!html.includes('kpi-card-detail">两条线'), '卡②副说明槽里仍是指路牌');
  assert.ok(!/警戒线 ±[\d.]+ kg · 注意线/.test(vis), '卡②那行 `·` 串没删掉');
  /* 三个数全在页上那条形状里（标签 ＋ 值成对），且不再是「一句话一串」的写法。 */
  const v = weightVolatilityV2(db, '2026-07-20', '2026-08-18').data;
  const shown = '波动幅度 ' + v.baselineSigma + ' kg';
  for (const needle of [shown, '注意线 ±' + v.thresholds.yellow + ' kg', '警戒线 ±' + v.thresholds.red + ' kg']) {
    assert.ok(vis.includes(needle), '卡下那条形状缺「' + needle + '」（页上读到的正文：' + vis.slice(0, 200) + '）');
  }
  assert.ok(html.includes('<div class="wui-strip">'), '卡下那条形状未上屏（没有事实条）');
  assert.ok(html.includes('<span class="wui-fact-k">注意线</span><span class="wui-fact-v">±' + v.thresholds.yellow + ' kg</span>'),
    '注意线未落成「标签 ＋ 值」的一枚');
  /* 形状走的是真 DOM（不是被转义成字面文本的串）——本票实测踩过这一格：
   * `renderKpiCard` 的 `detail` 槽由公共层 `esc`，把形状 HTML 塞进去会把整串标签印在页上、页还照样出。 */
  assert.equal(html.includes('&lt;div class=&quot;wui'), false, '形状被当成字面文本印上屏');
  for (const m of html.matchAll(/ilife-block-kpi-card-(?:detail|label|value|unit)">([^<]*)</g)) {
    assert.ok(!m[1].includes('<'), '卡槽里塞了 HTML：' + m[1].slice(0, 60));
  }
  /* 结论块的 `；` 串拆成「判语 ＋ 今天那条读数」两件（`verdict()` ＋ `note()`）。 */
  assert.ok(html.includes('class="wui-verdict"'), '结论未落成判语块');
  assert.ok(html.includes('class="wui-note"'), '结论里今天那条读数未落成脚注行');
  assert.ok(!vis.includes('超过注意线的天；'), '结论里仍有 `；` 串');
  /* 手机端（负责人第 1／2 条）：820 段随页到场，触摸面两条到位。 */
  assert.ok(html.includes('@media (max-width:820px)'), '页内没有 820 段');
  assert.ok(html.includes('-webkit-tap-highlight-color:transparent'), '触摸面没到场');
  assert.ok(html.includes('touch-action:manipulation'), '触摸面没到场');
  /* 只看异常点那一页同样带形状与 820 段（两读法共用一份装配，只差曲线段）。 */
  const only = viewVolatility({ window: '30d', today: '2026-08-18', view: 'anomalies-only' }, db).html;
  assert.ok(only.includes('class="wui-verdict"') && only.includes('@media (max-width:820px)'), '只看异常点那一页缺形状或 820 段');
  assert.equal(bodyText(only).split('；').length - 1, 0, '只看异常点那一页仍有 `；`');  db.close();
});

test('#336 view 非法抛 bad-input；缺省 view=full', () => {  assert.equal(parseVolatilityView({}), 'full');
  assert.equal(parseVolatilityView({ view: 'anomalies-only' }), 'anomalies-only');
  assert.throws(() => parseVolatilityView({ view: 'only' }), /view 非法/);
});

test('#336 缺省窗口=30 天（老脚本无参即 30 天）', () => {
  const db = tmpDb();
  seedVol(db);
  const out = viewVolatility({ today: '2026-08-18' }, db);
  assert.equal(out.data.metrics.points, 30);
  db.close();
});

test('#542 页题去时间：窗口退出 H1，改住正文首件窗口条（#340 打回批）', () => {
  const db = tmpDb();
  seedVol(db);
  const full = viewVolatility({ window: '30d', today: '2026-08-18' }, db).html;
  const only = viewVolatility({ window: '30d', today: '2026-08-18', view: 'anomalies-only' }, db).html;
  const h1 = (html) => /<h1[^>]*>([^<]*)<\/h1>/.exec(html)?.[1] ?? '';
  assert.equal(h1(full), '波动分析', '整图页题不该再带时间（实测 ' + h1(full) + '）');
  assert.equal(h1(only), '看波动异常点', '只看异常点页题不该再带时间（实测 ' + h1(only) + '）');
  assert.ok(!/<h1[^>]*>[\s\S]{0,40}\d{4}-\d\d-\d\d/.test(full), '整图页题里仍有日期');
  assert.ok(!/<h1[^>]*>[\s\S]{0,40}\d{4}-\d\d-\d\d/.test(only), '只看异常点页题里仍有日期');
  // 窗口进正文首件窗口条（两枚日期块 ＋ 条数胶囊），两读法各恰一条。
  for (const [name, html] of [['整图', full], ['只看异常点', only]]) {
    assert.equal(html.split('class="wui-window"').length - 1, 1, name + ' 窗口条不是恰 1 条');
    assert.ok(html.includes('2026-07-20') && html.includes('2026-08-18'), name + ' 窗口条缺两枚日期块');
  }
  db.close();
});

/* #490：第 34 条「看波动异常点」原先与第 5 条「看体重稳不稳（增强版）」的 cli 逐字相同
 * （都不带 `view`），两条词出**逐字节相同**的页（实测 sha 6853d76ee585b21b／88472 B）；
 * 只看异常点那一支的三句可见文案只在直调用例里被覆盖，交付页上看不到。本条按**路由表**取参数
 * （路由丢了 `view` 即红），比两份正文的 sha（先经 `bodyText` 削掉标签与机器面）。 */
test('#490 第 34 条按路由出「只看异常点」页，与第 5 条不再逐字相同', async () => {
  const { ALL_ROUTES } = await import('../dist/triggers/routes.generated.js');
  const of = (wake) => ALL_ROUTES.find((r) => r.wakeWord === wake);
  const a = of('看波动异常点');
  const b = of('看体重稳不稳（增强版）');
  assert.ok(a && b, '路由表里缺这两条词（看波动异常点／看体重稳不稳（增强版））');
  const parsed = (cli) => {
    const m = /^calorie-cmd-read (\S+)(?: --params '(.*)')?$/.exec(String(cli));
    assert.ok(m, '路由 cli 形态不对：' + cli);
    return { key: m[1], params: m[2] ? JSON.parse(m[2]) : {} };
  };
  const pa = parsed(a.cli);
  const pb = parsed(b.cli);
  assert.equal(pa.key, 'calorie.view.volatility', '第 34 条键不对：' + a.cli);
  assert.equal(pb.key, 'calorie.view.volatility', '第 5 条键不对：' + b.cli);
  // 判据①（参数面）：两条词的出页参数必须已经不同，且第 34 条带只看异常点读法。
  assert.equal(pa.params.view, 'anomalies-only', '第 34 条没带只看异常点读法：' + a.cli);
  assert.notDeepEqual(pa.params, pb.params, '第 34 条与第 5 条的出页参数仍逐字相同：' + a.cli);
  // 判据①（产页面）＋ 判据②（只看异常点那一支的页顶提示上屏）。
  const db = tmpDb();
  seedVol(db);
  const page = (p) => viewVolatility({ ...p, today: '2026-08-18' }, db).html;
  const pageA = page(pa.params);
  const pageB = page(pb.params);
  const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);
  assert.notEqual(sha(bodyText(pageA)), sha(bodyText(pageB)), '第 34 条与第 5 条的正文 sha 仍相同');
  assert.ok(pageA.includes('只看异常点'), '第 34 条页缺「只看异常点」那一支的页顶提示');
  assert.ok(!pageA.includes('每天离平均线多远'), '第 34 条页不该再出整图的曲线段');
  assert.ok(pageB.includes('每天离平均线多远'), '第 5 条页应仍出整图的曲线段');
  // 变异自证（改坏必红）：把第 34 条的 `view` 摘掉，两份正文立刻回到**逐字相同**那副样子
  // —— 本判据的鉴别力就在这一个参数上（#490 的缺陷形态即「路由没传 view」）。
  const { view: _dropped, ...noView } = pa.params;
  assert.equal(sha(bodyText(page(noView))), sha(bodyText(pageB)),
    '摘掉 view 后两份正文应逐字相同（判据的鉴别力自证）');
  db.close();
});
