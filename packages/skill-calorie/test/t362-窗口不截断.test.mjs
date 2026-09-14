/** #362 · 看体脂的窗口不再静默截断（真出口验收）。
 *
 * 期望值来源（不拿新实现的输出当期望）：
 *   ① **票面澄清**（`gh issue view 362` 评论区「编排者口径澄清（2026-09-14）」，本票权威落点）：
 *      不传窗口参数＝**全部历史**；显式传 `days` 或 `dateFrom`+`dateTo` 时按窗口取；
 *      页面**可见文本写明当前窗口口径**（「全部历史」／「近 N 天」／「A → B」）。
 *   ② **手算**（种子跨 240 天、每 30 天一条、共 9 条）：
 *      全历史 9 条；近 90 天＝第 0／30／60／90 天四条；区间 [120..30]＝第 30／60／90／120 天四条。
 *   ③ **基准** `docs/skills/skill-calorie/t395-融合基准.md`：§四 裁定 5（`source=all` 分组＋不可比提示句，
 *      组数 == `SELECT COUNT(DISTINCT source) …`）、§四 裁定 2（可见文本 `—` ／ payload 保留原始空值，
 *      **两条分开断言**）；§六 B 区（锚点大数字＝最新一条、Δ 与间隔天数、空态带「怎么记第一条」）。
 *   ④ **老正本** `D:\2Study\StudyNotes\SKILLS\卡路里\templates\body_composition_view.html`：
 *      锚点 `:74-84`／`:155`／`:327-333`，Δ 与间隔 `:335-340`，无基线 `:344`，空态 `:355`，表体 `:366`。
 * 负向对照（**源码级变异，持锁另做**，两行机器读数见 `docs/skills/skill-calorie/t362-窗口证据.md`）：
 *   M1 把 `body/view.ts` 的默认窗写死 90 天 → 本文件第一条判据读数由 9 变 4 ⇒ 必红；还原 ⇒ 必绿。
 *   M2 把复制 payload 的原始行改写成可见文本（写 `—`）→ 载荷断言必红；还原 ⇒ 必绿。
 *   M3 去掉 `source=all` 的「来源不可直接对比」提示句 → 组数判据必红；还原 ⇒ 必绿。
 * 运行：先 `npx tsc -b packages/skill-calorie`（本票不走 `pnpm --filter skill-calorie build`），再
 *   `node --test packages/skill-calorie/test/t362-窗口不截断.test.mjs`。
 * 真库零写入：一切数据走 mkdtemp tmp 库（`SKILLS_DB_PATH` 指过去）；页面落盘在 tmp 目录内。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const ROUTES = join(HERE, '..', 'src', 'body', 'routes.ts');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const KEY = 'calorie.view.body-composition';
const DB_FILE = 'calorie_data.db';
const CALIPER_FIELDS = [
  'caliper_chest_mm', 'caliper_abdominal_mm', 'caliper_thigh_mm',
  'caliper_tricep_mm', 'caliper_subscapular_mm', 'caliper_suprailiac_mm',
  'caliper_midaxillary_mm',
];
const SOURCES = ['home_caliper', 'gym', 'hospital'];

/** 手算种子（日序：0/30/…/240 共 9 条）。`n` ＝ 距今天数；第一条带 3 个皮褶值＋4 个空槽。 */
const OFFSETS = [0, 30, 60, 90, 120, 150, 180, 210, 240];
const seedA = () => OFFSETS.map((n, i) => ({
  n, source: 'home_caliper', pct: 20 + i, calipers: i === 0 ? [12, 18, 15, null, null, null, null] : null,
}));
/** 判据④ 专用种子：同上 9 条，来源按三值轮转（组数手算＝3；组内点数各 3）。 */
const seedB = () => OFFSETS.map((n, i) => ({
  n, source: SOURCES[i % SOURCES.length], pct: 20 + i, calipers: null,
}));

/** 手算期望（唯一依据＝上面的日序与轮转，不是实现输出）。 */
const EXPECT = {
  all: 9,                    // 全历史：9 条全在
  within90: 4,               // 近 90 天：第 0／30／60／90 天
  withinRange: 4,            // 区间 [120..30]：第 30／60／90／120 天
  trendPointsAll: 9,         // 一天一点（单来源）：9 点
  trendPointsWithin90: 4,    // 窗口内 4 点
  anchorPct: 20,             // 最新一条＝第 0 天那条（窗口均值 24，两者不同 ⇒ 锚点可判）
  windowMeanPct: 24,
  gapDays: 30,               // 第 0 天与第 30 天的日历差
  diffPct: -1,               // 20 - 21
  groupedSources: 3,         // 三值轮转 ⇒ 3 组
  perSourcePoints: 3,        // 每来源 3 条（9／3）
  strayLimit: { shown: 20, window: 25, hidden: 5 }, // `limit` 只截显示、不许静默丢窗口
};

/** 与 `fetch/body.ts` 的 `daysAgo` **逐字同式**的日基准：避开本地／UTC ±1 天漂移。 */
const dayBefore = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

function mkTmpDb(rows) {
  const dir = mkdtempSync(join(tmpdir(), 't362-'));
  const db = openDb(join(dir, DB_FILE));
  const cols = ['date', 'source', 'body_fat_pct', ...CALIPER_FIELDS, 'note'];
  const stmt = db.prepare('INSERT INTO body_composition (' + cols.join(', ') + ') VALUES ('
    + cols.map(() => '?').join(', ') + ')');
  for (const r of rows) {
    stmt.run(dayBefore(r.n), r.source, r.pct, ...(r.calipers ?? CALIPER_FIELDS.map(() => null)), r.note ?? null);
  }
  db.close();
  return dir;
}

function withDb(dir, fn) {
  const db = openDb(join(dir, DB_FILE));
  try { return fn(db); } finally { db.close(); }
}

/** 剥标签（先摘 script／style，再把标签换空格，再解实体、压空白）。 */
function visible(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;|&#8212;|&#x2014;/gi, '—')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ').trim();
}

/** 真出口：跑 `cmd_read`，页面从 `delivery.path` 读回（可见文本以落盘页面为准）。 */
function runRead(dir, params) {
  const args = params === undefined ? [BIN, KEY] : [BIN, KEY, '--params', JSON.stringify(params)];
  const r = spawnSync(NODE_BIN, args, { encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir } });
  let env = null;
  try { env = JSON.parse(r.stdout); } catch { /* 非 0 退出时 stdout 可能不是 JSON */ }
  const path = env?.delivery?.path;
  const html = path ? readFileSync(path, 'utf8') : '';
  return { status: r.status, env, html, text: visible(html), stderr: String(r.stderr || '') };
}

/** 窗口口径句（页面可见文本的写法：`窗口：全部历史`／`窗口：近 N 天`／`窗口：A → B`）。 */
const WINDOW_RE = /窗口：(全部历史|近 \d+ 天|\d{4}-\d{2}-\d{2} → \d{4}-\d{2}-\d{2})/g;
const windowLabels = (text) => [...new Set([...text.matchAll(WINDOW_RE)].map((m) => m[1]))];

/** 条数读数：页面上所有「共 N 条」的 N（全部命中都要等于手算值，不是取一个了事）。 */
const countReadings = (text) => [...text.matchAll(/共\s*(\d+)\s*条/g)].map((m) => Number(m[1]));

/** KPI 卡片逐张解析（值槽／单位／注文，结构读取；`split` 保证每段只含本卡的字段）。 */
function kpiCards(html) {
  return html.split('<div class="ilife-block ilife-block-kpi-card">').slice(1).map((seg) => ({
    label: (seg.match(/ilife-block-kpi-card-label">([^<]*)</) || [])[1] ?? '',
    value: (seg.match(/ilife-block-kpi-card-value">([^<]*)</) || [])[1] ?? '',
    unit: (seg.match(/ilife-block-kpi-card-unit">([^<]*)</) || [])[1] ?? '',
    detail: visible((seg.match(/ilife-block-kpi-card-detail">([\s\S]*?)<\/div>/) || [])[1] ?? ''),
  })).filter((c) => c.label !== '');
}
const cardOf = (html, label) => kpiCards(html).find((c) => c.label === label) ?? null;

/** 来源中文名（#440 起唯一定义地＝`fetch/body.ts` 同层的 `kcal.ts SOURCE_LABELS`；此处按冻结值独立写死当期望）。 */
const SRC_ZH = { home_caliper: '家测皮褶钳', gym: '健身房 InBody', hospital: '医院测' };

/** 按表头标题取一张数据表（结构化读行，不做全文 includes）。 */
function tableByCaption(html, kw) {
  for (const seg of html.split('<div class="ilife-block ilife-block-data-table">').slice(1)) {
    const cap = visible((seg.match(/ilife-block-data-table-caption">([\s\S]*?)<\/caption>/) || [])[1] ?? '');
    if (!cap.includes(kw)) continue;
    const body = (seg.match(/<tbody>([\s\S]*?)<\/tbody>/) || [])[1] ?? '';
    const rows = body.split(/<tr[^>]*>/).slice(1)
      .map((tr) => tr.split(/<td[^>]*>/).slice(1).map((c) => visible(c.split('</td>')[0])));
    return { caption: cap, rows };
  }
  return null;
}

/** 图上的点数（`charts.ts:1567` 每个数据点一个 `<circle class="…charts-dot">`）。 */
const chartDots = (html) => (html.match(/<circle class="ilife-charts-dot"/g) || []).length;
const chartTitles = (html) => [...html.matchAll(/ilife-block-chart-block-title">([^<]*)</g)].map((m) => m[1]);

/** 复制区（复制数据）的 JSON 载荷：页面里以 HTML 转义的 `data-t` 属性承载。 */
function copyPayload(html) {
  const at = html.indexOf('复制数据');
  assert.ok(at > 0, '页面必须带「复制数据」区');
  const seg = html.slice(at);
  const json = (seg.match(/data-fmt="json"[^>]*data-t="([\s\S]*?)"/) || [])[1];
  assert.ok(json !== undefined, '复制数据必须带 JSON 格式那一路');
  return JSON.parse(json.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
}

/* ── 判据① ② ③：窗口不再静默截断 ── */

test('#362 判据①②③：不传参＝全部历史 9 条、days=90＝4 条，可见文本的窗口口径句随参变', () => {
  const dir = mkTmpDb(seedA());
  const none = runRead(dir, undefined);
  assert.equal(none.status, 0, '不传窗口参数必须 exit 0，stderr=' + none.stderr.slice(-300));
  const r90 = runRead(dir, { days: 90 });
  assert.equal(r90.status, 0, 'days=90 必须 exit 0，stderr=' + r90.stderr.slice(-300));
  const from = dayBefore(120);
  const to = dayBefore(30);
  const range = runRead(dir, { dateFrom: from, dateTo: to });
  assert.equal(range.status, 0, '区间必须 exit 0，stderr=' + range.stderr.slice(-300));

  // ① 不传参：条数读数（页面上每一处）＝手算 9；不是 90 天窗的 4
  const noneReads = countReadings(none.text);
  assert.ok(noneReads.length >= 2, '「共 N 条」读数至少出现在 KPI 注与表头两处，实测 ' + noneReads.length);
  assert.deepEqual([...new Set(noneReads)], [EXPECT.all], '不传窗口参数 ⇒ 条数读数全部等于 9（旧行为是静默 90 天＝4）');
  assert.notDeepEqual([...new Set(noneReads)], [EXPECT.within90], '禁止落回 90 天窗口的读数 4');
  assert.equal(tableByCaption(none.html, '体成分记录').rows.length, EXPECT.all, '记录表逐行列全 9 条');

  // ② days=90：条数读数＝手算 4（第 0／30／60／90 天，含界）
  assert.deepEqual([...new Set(countReadings(r90.text))], [EXPECT.within90], 'days=90 ⇒ 条数读数全部等于 4');
  assert.equal(tableByCaption(r90.html, '体成分记录').rows.length, EXPECT.within90, '记录表逐行为 4 条');

  // ③ 窗口口径句：三次跑各写各的口径，且互不相同
  assert.deepEqual(windowLabels(none.text), ['全部历史'], '不传参 ⇒ 可见文本写明「窗口：全部历史」');
  assert.deepEqual(windowLabels(r90.text), ['近 90 天'], 'days=90 ⇒ 可见文本写明「窗口：近 90 天」');
  assert.deepEqual(windowLabels(range.text), [from + ' → ' + to], '区间 ⇒ 可见文本写明「A → B」');
  assert.notEqual(windowLabels(none.text)[0], windowLabels(r90.text)[0], '两次跑的窗口口径句必须随参数变');
  console.log('T362-WINDOW 无参=' + JSON.stringify(windowLabels(none.text)) + ' 读数=' + JSON.stringify(noneReads)
    + ' | days=90=' + JSON.stringify(windowLabels(r90.text)) + ' 读数=' + JSON.stringify(countReadings(r90.text))
    + ' | 区间=' + JSON.stringify(windowLabels(range.text)) + ' 读数=' + JSON.stringify(countReadings(range.text)));
});

test('#362 窗口边界外的记录不入读数：days=90 之外那 5 条只在全历史口径里出现', () => {
  const dir = mkTmpDb(seedA());
  const none = runRead(dir, undefined);
  const r90 = runRead(dir, { days: 90 });
  const allRows = tableByCaption(none.html, '体成分记录').rows.length;
  const winRows = tableByCaption(r90.html, '体成分记录').rows.length;
  assert.equal(allRows - winRows, EXPECT.all - EXPECT.within90, '两个窗口的差 = 5 条（手算）');
  console.log('T362-BOUNDARY 全历史行=' + allRows + ' 近90天行=' + winRows);
});

test('#362 `limit` 只截显示、不许静默丢窗口：窗口内总数写在标题里', () => {
  // 25 条（每 10 天一条）：默认 `limit` 20 ⇒ 列表 20 行，但「窗口内共 25 条」必须写在可见文本里。
  const rows = Array.from({ length: 25 }, (_, i) => ({ n: i * 10, source: 'home_caliper', pct: 20 + i, calipers: null }));
  const r = runRead(mkTmpDb(rows), undefined);
  assert.equal(r.status, 0, 'stderr=' + r.stderr.slice(-300));
  const table = tableByCaption(r.html, '体成分记录');
  assert.equal(table.rows.length, EXPECT.strayLimit.shown, '表体只列 limit 20 行');
  assert.ok(table.caption.includes('共 ' + EXPECT.strayLimit.shown + ' 条'), '表头报本页行数：' + table.caption);
  assert.ok(table.caption.includes('窗口内另有 ' + EXPECT.strayLimit.hidden + ' 条'), '表头必须写明窗口内还有 5 条：' + table.caption);
  assert.equal(r.env.data.metrics.windowTotal, EXPECT.strayLimit.window, 'metrics.windowTotal = 窗口内总条数 25');
  console.log('T362-LIMIT 表体=' + table.rows.length + ' windowTotal=' + r.env.data.metrics.windowTotal + ' 标题=' + table.caption);
});

/* ── 基准 §四 裁定 5：source=all 按来源分组 ── */

test('#362 裁定5：source=all exit 0 ＋ 不可比提示句 ＋ 组数 == SQL COUNT(DISTINCT source)', () => {
  const dir = mkTmpDb(seedB());
  const r = runRead(dir, { source: 'all' });
  assert.equal(r.status, 0, 'source=all 必须 exit 0（改前读数 EXIT=4 走 missing-data），stderr=' + r.stderr.slice(-300));
  assert.ok(r.text.includes('来源不可直接对比'), '页面必须出「来源不可直接对比」提示句');
  const sqlDistinct = withDb(dir, (db) => db.prepare(
    'SELECT COUNT(DISTINCT source) AS n FROM body_composition WHERE COALESCE(is_deprecated, 0) = 0').get().n);
  assert.equal(sqlDistinct, EXPECT.groupedSources, 'SQL 组数 == 手算 3');
  const card = cardOf(r.html, '来源分组');
  assert.ok(card, '页面必须出「来源分组」KPI 卡');
  assert.equal(card.value, String(sqlDistinct), '页面组数读数 == SQL 组数');
  const groups = tableByCaption(r.html, '来源分组');
  assert.equal(groups.rows.length, sqlDistinct, '分组表逐行 == SQL 组数');
  for (const row of groups.rows) assert.equal(Number(row[1]), EXPECT.perSourcePoints, '每来源点数 == 手算 3：' + JSON.stringify(row));
  console.log('T362-GROUP exit=' + r.status + ' 组数(页)=' + card.value + ' 组数(SQL)=' + sqlDistinct
    + ' 逐组点数=' + groups.rows.map((x) => x[0] + ':' + x[1]).join(','));
});

test('#362 裁定5：KPI「趋势点」与图同批定（分组态＝各来源图上点数之和，不许「有图＋0 天」）', () => {
  const dir = mkTmpDb(seedB());
  const r = runRead(dir, { source: 'all' });
  assert.equal(r.status, 0, 'stderr=' + r.stderr.slice(-300));
  const dots = chartDots(r.html);
  const titles = chartTitles(r.html);
  assert.equal(titles.length, EXPECT.groupedSources, '逐来源一张图：' + JSON.stringify(titles));
  assert.equal(dots, EXPECT.all, '图上圆点数 == 手算 9（9 条记录一天一条）');
  assert.ok(!r.text.includes('窗口内暂无趋势点'), '有图时不得同时出空态句');
  const card = cardOf(r.html, '趋势点');
  assert.equal(card.value, String(dots), 'KPI「趋势点」== 图上真正画出的点数');
  assert.notEqual(card.value, '0', '不许「有图 ＋ 趋势点 0 天」');
  console.log('T362-KPI 趋势点(KPI)=' + card.value + ' 图上点数=' + dots + ' 图数=' + titles.length);
});

test('#362 裁定5：逐来源成线，每条线各自点名来源与窗口（不合并成一条混源线）', () => {
  const dir = mkTmpDb(seedB());
  const r = runRead(dir, { source: 'all' });
  const titles = chartTitles(r.html);
  for (const s of SOURCES) {
    assert.ok(titles.some((t) => t.includes('体脂趋势') && t.includes(SRC_ZH[s])),
      '分组图标题必须点名来源：' + s + '（' + SRC_ZH[s] + '）@ ' + JSON.stringify(titles));
  }
  for (const t of titles) assert.ok(t.includes('窗口：全部历史'), '每张分组图都自报窗口口径：' + t);
  console.log('T362-SPLIT 图标题=' + JSON.stringify(titles));
});

/* ── 基准 §四 裁定 2：可见文本 `—` ／ payload 原始空值（两条分开断言） ── */

test('#362 裁定2-可见：皮褶缺槽位在可见文本里写 `—`（按格定位，不做全文 includes）', () => {
  const r = runRead(mkTmpDb(seedA()), undefined);
  assert.equal(r.status, 0, 'stderr=' + r.stderr.slice(-300));
  const echo = tableByCaption(r.html, '皮褶 7 点原始值');
  assert.ok(echo, '必须出「皮褶 7 点原始值」表');
  assert.equal(echo.rows.length, 7, '7 个槽位逐点成行');
  const byName = Object.fromEntries(echo.rows.map((row) => [row[0], row[1]]));
  // 种子给的是 12／18／15 ＋ 4 个空槽 ⇒ 前三点读数、后四槽位 `—`
  assert.deepEqual([byName['胸'], byName['腹'], byName['大腿']], ['12', '18', '15'], '已填槽位照原值回显');
  assert.deepEqual([byName['三头肌'], byName['肩胛下'], byName['髂上'], byName['腋中线']], ['—', '—', '—', '—'],
    '缺槽位一律 `—`（老 `:342`／`:347-352` 同口径）');
  for (const row of echo.rows) assert.notEqual(row[1], '', '缺值格不得留空串：' + JSON.stringify(row));
  console.log('T362-DASH-VISIBLE 槽位=' + JSON.stringify(byName));
});

test('#362 裁定2-载荷：复制数据保留原始空值（同一条记录在 payload 里是 null，不是 `—`）', () => {
  const r = runRead(mkTmpDb(seedA()), undefined);
  const env = copyPayload(r.html);
  assert.equal(env.key, KEY, '载荷必须是该命令的 envelope');
  const items = env.data.items;
  assert.equal(items.length, EXPECT.all, '载荷行数 == 手算 9');
  const newest = items[0];
  assert.equal(newest.caliper_chest_mm, 12, '已填槽位原值透传');
  assert.equal(newest.caliper_tricep_mm, null, '缺槽位在载荷里是 null（原始空值）');
  assert.equal(newest.caliper_midaxillary_mm, null, '缺槽位在载荷里是 null（原始空值）');
  assert.equal(typeof newest.body_fat_pct, 'number', '体脂率原样数字（不套 `%`）');
  // 载荷侧另断言：行里不得出现可见文本那套 `—` 代字
  const dashed = items.filter((row) => Object.values(row).includes('—'));
  assert.deepEqual(dashed, [], '载荷行里不许出现可见文本的 `—` 代字');
  assert.equal(env.data.total, EXPECT.all, '载荷 total == 9');
  console.log('T362-PAYLOAD 行数=' + items.length + ' 三头肌=' + JSON.stringify(newest.caliper_tricep_mm)
    + ' 胸=' + JSON.stringify(newest.caliper_chest_mm) + ' 含破折号行=' + dashed.length);
});

/* ── 老正本三项（§六 B 区：锚点／Δ 与间隔／空态引导） ── */

test('#362 老正本锚点：首屏读数＝最新一条（不是窗口均值）', () => {
  const r = runRead(mkTmpDb(seedA()), undefined);
  const card = cardOf(r.html, '最新体脂');
  assert.ok(card, '必须出「最新体脂」锚点卡');
  assert.equal(card.value, EXPECT.anchorPct + '%', '锚点读数＝最新一条 20%');
  assert.notEqual(card.value, EXPECT.windowMeanPct + '%', '锚点不是窗口均值（均值 24%，两者有别才可判）');
  assert.ok(card.detail.includes(dayBefore(0)), '锚点注写明最新日期：' + card.detail);
  assert.ok(card.detail.includes('家测皮褶钳'), '锚点注写明来源：' + card.detail);
  assert.ok(kpiCards(r.html).some((c) => c.label === '最新体脂'), '最新体脂卡在列');
  const badge = r.html.includes('最新</span>');
  assert.ok(badge, '锚点带「最新」徽标（老 :333）');
  console.log('T362-ANCHOR 值=' + card.value + ' 注=' + card.detail + ' 窗口均值(手算)=24%');
});

test('#362 老正本 Δ 与间隔天数：读数与「距上次测量 N 天」都写出来', () => {
  const r = runRead(mkTmpDb(seedA()), undefined);
  const card = cardOf(r.html, '距上次 Δ');
  assert.ok(card, '必须出「距上次 Δ」卡');
  assert.equal(card.value, String(EXPECT.diffPct) + '%', 'Δ＝最新 - 上一条 ＝ -1%');
  assert.ok(card.detail.includes('距上次测量 ' + EXPECT.gapDays + ' 天'), '间隔天数写出：' + card.detail);
  assert.ok(card.detail.includes(dayBefore(30)), '比较对象日期写出：' + card.detail);
  assert.ok(card.detail.includes('下降'), '方向词：' + card.detail);
  const row = tableByCaption(r.html, '体成分记录').rows[0];
  assert.ok(row.length >= 4, '记录表首行：' + JSON.stringify(row));
  console.log('T362-DELTA 值=' + card.value + ' 注=' + card.detail);
});

test('#362 老正本空态：无对比基线写「暂无对比基线」', () => {
  const single = runRead(mkTmpDb([{ n: 0, source: 'gym', pct: 22, calipers: null }]), undefined);
  assert.equal(single.status, 0, 'stderr=' + single.stderr.slice(-300));
  const card = cardOf(single.html, '距上次 Δ');
  assert.equal(card.value, '—', '单条记录 ⇒ Δ 值槽 `—`（老 :342）');
  assert.ok(card.detail.includes('暂无对比基线'), '单条记录 ⇒ 注文「首条记录，暂无对比基线」（老 :344）：' + card.detail);
  console.log('T362-NOBASE 值=' + card.value + ' 注=' + card.detail);
});

test('#362 老正本空态引导：窗口内无记录时写「怎么记第一条」，并把窗口口径带进这句', () => {
  const r = runRead(mkTmpDb([]), undefined);
  assert.equal(r.status, 4, '空库走 missing-data 阻断，exit=4（原状），实测 ' + r.status);
  assert.ok(r.stderr.includes('第一条就是基线'), '空态句必须带「怎么记第一条」（老 :355）：' + r.stderr.slice(-300));
  assert.ok(r.stderr.includes('窗口：全部历史'), '空态句必须自报窗口口径：' + r.stderr.slice(-300));
  console.log('T362-EMPTY exit=' + r.status + ' 句=' + r.stderr.trim());
});

/* ── 不许动的落点与数据层口径 ── */

test('#362 「看体脂趋势」那条词的时间窗语义未动（routes.ts:17 的 `{"days":90}` 示例逐字保留）', () => {
  const lines = readFileSync(ROUTES, 'utf8').split('\n');
  const line17 = lines[16];
  const line16 = lines[15];
  assert.ok(line17.includes("wakeWord: '看体脂趋势'"), 'routes.ts:17 仍是「看体脂趋势」那条：' + line17);
  const cli17 = (line17.match(/cli: '([\s\S]*)' \}/) || [])[1] ?? '';
  assert.equal(cli17, "calorie-cmd-read calorie.view.body-composition --params \\'{\"days\":90}\\'",
    '示例参数逐字仍是 {"days":90}：' + line17);
  const cli16 = (line16.match(/cli: '([\s\S]*)' \}/) || [])[1] ?? '';
  assert.ok(line16.includes("wakeWord: '看体脂'"), 'routes.ts:16 仍是「看体脂」那条：' + line16);
  assert.equal(cli16, 'calorie-cmd-read calorie.view.body-composition',
    '「看体脂」那条必须不带窗口参数（＝全部历史）：' + line16);
  console.log('T362-ROUTES16 ' + cli16);
  console.log('T362-ROUTES17 ' + cli17);
});

test('#362 窗口口径两条路恒等：页面读数与同一 tmp 库 SQL 读数一致（不靠实现自证）', () => {
  const dir = mkTmpDb(seedA());
  const none = runRead(dir, undefined);
  const r90 = runRead(dir, { days: 90 });
  const sql = withDb(dir, (db) => db.prepare(
    'SELECT COUNT(*) AS n FROM body_composition WHERE COALESCE(is_deprecated, 0) = 0 AND date >= ?').get(dayBefore(90)).n);
  assert.equal(sql, EXPECT.within90, 'SQL 近 90 天 == 手算 4');
  assert.equal(none.env.data.metrics.total, EXPECT.all, '无参 total == 全表条数');
  assert.equal(r90.env.data.metrics.total, sql, 'days=90 total == SQL 同窗口读数');
  assert.equal(r90.env.data.metrics.trendDays, EXPECT.trendPointsWithin90, '趋势点 == 窗口内天数 4');
  assert.equal(none.env.data.metrics.trendDays, EXPECT.trendPointsAll, '趋势点 == 全历史天数 9');
  console.log('T362-SQL total(无参)=' + none.env.data.metrics.total + ' total(90)=' + r90.env.data.metrics.total + ' SQL(90)=' + sql);
});

test('#362 非法窗口参数不静默吞掉：只给一头报用法错', () => {
  const dir = mkTmpDb(seedA());
  const one = runRead(dir, { dateFrom: dayBefore(120) });
  assert.notEqual(one.status, 0, '只给 dateFrom 必须报错，不许静默当全历史');
  const bad = runRead(dir, { dateFrom: '2026/01/01', dateTo: '2026/02/01' });
  assert.notEqual(bad.status, 0, '非法日期字面值必须报错');
  console.log('T362-BADINPUT 只给一头 exit=' + one.status + ' 非法日期 exit=' + bad.status);
});
