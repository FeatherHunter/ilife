/** t576 · N1–N8 页级症状判据（终审 #268 §2.6 八条，只验读者看得见的页级症状，不碰口径与数据）。
 *
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`，再 `node --test packages/skill-calorie/test/t576-n1n8.test.mjs`。
 * 判据读 `dist/`（不编译则读数无效）。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { buildExerciseDoc, buildExerciseGoalDoc } from '../dist/render/sportDocs.js';
import { buildCardioDoc, buildDistributionDoc, buildRecapDoc, buildStrengthDoc, buildTrendDoc } from '../dist/render/sportPortDocs.js';
import { buildRecordsDoc } from '../dist/exercise/records.js';
import { openDb } from '../dist/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const REPO = join(PKG, '..', '..');
const BIN = join(PKG, 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';
const SAMPLES = join(REPO, '.scratch', 't576', 'out');
mkdirSync(SAMPLES, { recursive: true });

function cardOf(html, id) {
  const open = html.indexOf('<section id="' + id + '"');
  if (open === -1) return '';
  const start = html.indexOf('>', open) + 1;
  const end = html.indexOf('</section>', start);
  return end === -1 ? '' : html.slice(start, end);
}
function navTexts(html) {
  const nav = (/<nav class="ilife-block-toc"[^>]*>([\s\S]*?)<\/nav>/.exec(html) ?? [])[1] ?? '';
  return [...nav.matchAll(/<a href="#([^"]+)">([^<]+)<\/a>/g)].map((m) => [m[1], m[2]]);
}

/* ── 夹具（脏数口径照 #523／#544 形状测试） ── */
function summaryView(over = {}) {
  const series = [];
  for (let i = 0; i < 10; i += 1) {
    series.push({ date: '2026-09-' + String(i + 1).padStart(2, '0'), exerciseKcal: i % 2 === 0 ? 800 + i : null });
  }
  return {
    start: '2026-09-01', end: '2026-09-10', activeDays: 5,
    totalBurnedSeries: 32123.4000000000005, avgBurnedPerLoggedDay: 698.3000000000001,
    series,
    review: {
      start: '2026-09-01', end: '2026-09-10', days: 10, sessions: 20, activeDays: 5,
      totalBurned: 32123.4000000000005, totalMinutes: 4385, avgBurnedPerSession: 53.63, avgBurnedPerDay: 159.8,
      byCategory: { 有氧: { sessions: 12, burned: 21053.499999999985 }, 力量: { sessions: 8, burned: 8431.500000000005 } },
      byType: [
        { type: '骑行', sessions: 24, burned: 5702, minutes: 736 },
        { type: '慢跑', sessions: 7, burned: 1680.8000000000002, minutes: 210 },
      ],
      estimatedCheck: { reported: 1, estimated: 1, deviationPct: 0 },
    },
    ...over,
  };
}
function strengthView(over = {}) {
  return {
    start: '2026-09-09', end: '2026-09-15',
    rows: [{ date: '2026-09-14', time: null, type: '卧推', minutes: 25, burned: 150, category: '力量', distanceKm: null, avgHr: null, loadKg: 60, reps: 10, setIndex: 1, note: '' }],
    movementCount: 1, totalSets: 1, totalVolumeKg: 600.2000000000002, totalReps: 10,
    byMovement: [{ movement: '卧推', sets: 1, volumeKg: 600.2000000000002, reps: 10 }],
    trail: [{ date: '2026-09-14', volumeKg: 600.2000000000002 }],
    ...over,
  };
}
function cardioView(over = {}) {
  return {
    start: '2026-09-09', end: '2026-09-15',
    rows: [{ date: '2026-09-14', time: null, type: '户外跑', minutes: 30, burned: 300, category: '有氧', distanceKm: 5, avgHr: null, loadKg: null, reps: null, setIndex: null, note: '' }],
    sessions: 1, totalMinutes: 30, totalDistanceKm: 5.200000000000001, avgPaceMinPerKm: 6.599999999999999,
    byType: [{ type: '户外跑', sessions: 1, minutes: 30, distanceKm: 5.200000000000001, paceMinPerKm: 6.599999999999999 }],
    ...over,
  };
}
function distributionView(over = {}) {
  return {
    start: '2026-09-09', end: '2026-09-15', days: 7, activeDays: 2, sessions: 4,
    totalBurned: 5000.300000000001,
    buckets: [
      { category: '力量', sessions: 2, burned: 600, minutes: 100, shareByBurned: 12, shareBySessions: 50 },
      { category: '有氧', sessions: 2, burned: 4080.6000000000004, minutes: 120, shareByBurned: 81.6, shareBySessions: 50 },
    ],
    intakeCal: null, tdeeTotal: null, deficit: null,
    ...over,
  };
}
/** 目标两页（23 看今日运动 vs 目标／24 看本周运动 vs 目标）的入参：`buildExerciseGoalDoc` 直接吃这个视图。 */
function goalView(over = {}) {
  return {
    start: '2026-09-15', end: '2026-09-15', days: 1, dailyGoal: 500,
    goalTotal: 500, actual: 320, pct: 64, gap: -180, achieved: false,
    ...over,
  };
}
function trendView(over = {}) {
  return {
    start: '2026-09-14', end: '2026-09-15',
    days: [
      { date: '2026-09-14', minutes: 150, burned: 1250.3000000000002, sessions: 5 },
      { date: '2026-09-15', minutes: 150, burned: 1250.3000000000002, sessions: 5 },
    ],
    weekly: [{ weekStart: '2026-09-08', sessions: 10, burned: 2500.6000000000004 }],
    activeDays: 2, totalMinutes: 300, totalBurned: 2500.6000000000004,
    peak: { date: '2026-09-14', burned: 1250.3000000000002 },
    ...over,
  };
}

/** 运动复盘页（39 看运动复盘）的入参：`buildRecapDoc` 直接吃这个视图。 */
function recapView(over = {}) {
  return {
    start: '2026-09-09', end: '2026-09-15', sessions: 2, totalMinutes: 60, totalBurned: 620,
    activeDays: 2, days: 7,
    byCategory: [{ category: '有氧', sessions: 2, burned: 620 }],
    top5: [{ type: '慢跑', sessions: 2, burned: 620 }],
    daily: [
      { date: '2026-09-14', burned: 320 },
      { date: '2026-09-15', burned: 300 },
    ],
    summary: '本窗共运动 2 天、2 次、累计消耗 620 卡',
    ...over,
  };
}

test('t576-N1 读数卡与分布块有可见h2（核心数字／类型消耗分布／分类占比／指标）', () => {
  const sum = buildExerciseDoc(summaryView());
  assert.ok(cardOf(sum, 'sec-kpi').includes('<h2') && cardOf(sum, 'sec-kpi').includes('核心数字'), '汇总读数卡缺h2核心数字');
  assert.ok(cardOf(sum, 'sec-dist').includes('<h2') && cardOf(sum, 'sec-dist').includes('类型消耗分布'), '汇总分布块缺h2类型消耗分布');
  /* #602 补：目标两页（23／24）的读数卡块原先只有裸 KPI 卡格、块内无可见标题——判据单源（t268 §2.6 N1）
   * 的页枚举漏了这两页，判据件也没盖它们，于是「8/8 全绿」与「两页无题」并存。现把目标两页补进本判据：
   * 断言①块内有 h2、②题词与页内导航同源（都取 `card()` 的 label），改坏任一处必红。 */
  for (const [what, v] of [
    ['今日(23)', goalView()],
    ['本周(24)', goalView({ start: '2026-09-09', end: '2026-09-15', days: 7, goalTotal: 3500, actual: 2200, pct: 62.9, gap: -1300 })],
  ]) {
    const goal = buildExerciseGoalDoc(v);
    const fig = cardOf(goal, 'sec-figures');
    assert.ok(/<h2[^>]*>数值对照<\/h2>/.test(fig), `目标页${what}读数卡缺h2数值对照：` + fig.slice(0, 160));
    assert.equal(new Map(navTexts(goal)).get('sec-figures'), '数值对照', `目标页${what}读数卡题与页内导航不同源`);
  }
  const dist = buildDistributionDoc(distributionView());
  assert.ok(cardOf(dist, 'sec-figures').includes('<h2>核心数字</h2>'), '分布页读数卡缺h2核心数字');
  assert.ok(cardOf(dist, 'sec-ratio').includes('<h2>分类占比</h2>'), '分布页分布块缺h2分类占比');
  assert.ok(cardOf(buildStrengthDoc(strengthView()), 'sec-figures').includes('<h2>核心数字</h2>'), '力量页缺h2核心数字');
  assert.ok(cardOf(buildCardioDoc(cardioView()), 'sec-figures').includes('<h2>核心数字</h2>'), '有氧页缺h2核心数字');
  assert.ok(cardOf(buildTrendDoc(trendView()), 'sec-figures').includes('<h2>核心数字</h2>'), '趋势页缺h2核心数字');
  console.log('T576-N1 h2=9/9（含#602目标两页2/2）');
});

test('t576-N2 跨年轴印全年（09-16对09-15不再同形）', () => {
  const cross = buildExerciseDoc(summaryView({
    start: '2025-09-16', end: '2026-09-15',
    series: [
      { date: '2025-09-16', exerciseKcal: 800 },
      { date: '2026-09-15', exerciseKcal: 900 },
    ],
  }));
  const labels = [...cross.matchAll(/charts-xlabel[^>]*>([^<]+)</g)].map((m) => m[1]).filter((t) => /\d/.test(t));
  assert.ok(labels.includes('2025-09-16') && labels.includes('2026-09-15'), '跨年轴仍只印MM-DD：' + JSON.stringify(labels));
  const same = buildExerciseDoc(summaryView());
  const labels2 = [...same.matchAll(/charts-xlabel[^>]*>([^<]+)</g)].map((m) => m[1]).filter((t) => /\d\d-\d\d/.test(t));
  assert.ok(labels2.length >= 2, '同年轴标签丢失');
  console.log('T576-N2 cross=' + labels.join('|'));
});

/** 折线／柱图横轴刻度标签（`charts-xlabel` 里带数字的那几条）。 */
function axisLabelsOf(html) {
  return [...html.matchAll(/charts-xlabel[^>]*>([^<]+)</g)].map((m) => m[1]).filter((t) => /\d/.test(t));
}

test('t576-N2b 跨年轴印全年：趋势族(sec-line)与复盘族(sec-daily)同口径', () => {
  /* #615 缺陷（#577 的 N2 判据枚举只盖汇总页，与 N1 漏 23／24 同型）：跨年窗下趋势族与复盘族
   * 仍只印 `MM-DD`，左端 `09-08` 排在右端 `09-07` 前头也读不出来，读者读成「起点比终点晚一天」。
   * 本判据把两族钉在同一口径：跨年窗轴标签必须含全年（`YYYY-MM-DD`），同年窗仍印 `MM-DD`。 */
  const crossTrend = buildTrendDoc(trendView({
    start: '2025-09-16', end: '2026-09-15',
    days: [
      { date: '2025-09-16', minutes: 90, burned: 800, sessions: 1 },
      { date: '2026-09-15', minutes: 100, burned: 900, sessions: 1 },
    ],
    weekly: [{ weekStart: '2025-09-15', sessions: 1, burned: 800 }],
    activeDays: 2, totalMinutes: 190, totalBurned: 1700,
    peak: { date: '2026-09-15', burned: 900 },
  }));
  const trendCross = axisLabelsOf(cardOf(crossTrend, 'sec-line'));

  const crossRecap = buildRecapDoc(recapView({
    start: '2025-09-16', end: '2026-09-15', days: 365,
    daily: [
      { date: '2025-09-16', burned: 800 },
      { date: '2026-09-15', burned: 900 },
    ],
  }));
  const recapCross = axisLabelsOf(cardOf(crossRecap, 'sec-daily'));
  /* 两族一次判完、两族的实读都进同一条消息：红读数必须同时点名两族（修好一族不算数）。 */
  const want = ['2025-09-16', '2026-09-15'];
  assert.ok(want.every((t) => trendCross.includes(t) && recapCross.includes(t)),
    '跨年轴仍只印MM-DD — 趋势族(sec-line)=' + JSON.stringify(trendCross)
      + ' 复盘族(sec-daily)=' + JSON.stringify(recapCross));

  const trendSame = axisLabelsOf(cardOf(buildTrendDoc(trendView()), 'sec-line'));
  assert.ok(trendSame.includes('09-14') && trendSame.includes('09-15'),
    '趋势族同年轴标签丢失：' + JSON.stringify(trendSame));
  const recapSame = axisLabelsOf(cardOf(buildRecapDoc(recapView()), 'sec-daily'));
  assert.ok(recapSame.some((t) => /^\d\d-\d\d$/.test(t)),
    '复盘族同年轴标签丢失：' + JSON.stringify(recapSame));
  /* 同年两族不得擅自补年份：补了就是另一处走样（口径是「跨年才补」）。 */
  assert.ok(!trendSame.some((t) => /^\d{4}-\d\d-\d\d$/.test(t)), '趋势族同年轴多印了年份：' + JSON.stringify(trendSame));
  assert.ok(!recapSame.some((t) => /^\d{4}-\d\d-\d\d$/.test(t)), '复盘族同年轴多印了年份：' + JSON.stringify(recapSame));
  console.log('T576-N2b trendCross=' + trendCross.join('|') + ' recapCross=' + recapCross.join('|')
    + ' trendSame=' + trendSame.join('|') + ' recapSame=' + recapSame.join('|'));
});

test('t576-N3 页19类稀疏窗折线有数据圆点（查空已补）', () => {
  const days = [];
  for (let d = 1; d <= 31; d += 1) {
    const date = '2026-08-' + String(d).padStart(2, '0');
    days.push({ date, exerciseKcal: (d === 6 || d === 26) ? 800 : null });
  }
  const html = buildExerciseDoc(summaryView({ start: '2026-08-01', end: '2026-08-31', series: days }));
  const seg = cardOf(html, 'sec-trend');
  const circles = (seg.match(/<circle /g) ?? []).length;
  assert.ok(circles >= 2, '稀疏窗折线仍无数据圆点：circles=' + circles);
  console.log('T576-N3 circles=' + circles);
});

test('t576-N4 导航与卡题同源（按日消耗／图表题）', () => {
  const sum = buildExerciseDoc(summaryView());
  const nav = new Map(navTexts(sum));
  assert.equal(nav.get('sec-series'), '按日消耗', '汇总逐日导航与表题不同源：' + nav.get('sec-series'));
  const dist = buildDistributionDoc(distributionView());
  const navD = new Map(navTexts(dist));
  assert.equal(navD.get('sec-chart'), '按分类热量分布', '分布图表导航与卡题不同源：' + navD.get('sec-chart'));
  const car = buildCardioDoc(cardioView());
  const navC = new Map(navTexts(car));
  assert.equal(navC.get('sec-chart'), '按类型次数', '有氧图表导航与卡题不同源：' + navC.get('sec-chart'));
  console.log('T576-N4 nav=3/3');
});

test('t576-N5 合计值取整统一（同列无小数卡）', () => {
  const sum = buildExerciseDoc(summaryView());
  const kpi = cardOf(sum, 'sec-kpi');
  assert.ok(!/\d+\.\d[^<]*卡/.test(kpi), '汇总读数卡仍有小数卡：' + kpi.slice(0, 200));
  const type = cardOf(sum, 'sec-type');
  assert.ok(!/\d+\.\d[^<]*卡/.test(type), '按类型明细列仍混排小数：' + type.slice(0, 300));
  const dist = buildDistributionDoc(distributionView());
  assert.ok(!/\d+\.\d[^<]*卡/.test(cardOf(dist, 'sec-figures')), '分布读数卡仍有小数卡');
  console.log('T576-N5 int=3/3');
});

test('t576-N6 截断说明在表题侧（不在100行表之后）', () => {
  const series = [];
  for (let i = 0; i < 120; i += 1) series.push({ date: '2026-05-' + String((i % 28) + 1).padStart(2, '0'), exerciseKcal: 500 + i });
  const html = buildExerciseDoc(summaryView({ series }));
  const sec = cardOf(html, 'sec-series');
  const noteAt = sec.indexOf('逐日表已截断');
  const tableAt = sec.indexOf('<table');
  assert.ok(noteAt !== -1 && tableAt !== -1 && noteAt < tableAt, '截断说明仍在表之后：note=' + noteAt + ' table=' + tableAt);
  assert.ok(/<caption[^>]*>按日消耗<\/caption>/.test(sec), '表题不是按日消耗');
  console.log('T576-N6 note<table=1');
});

test('t576-N7 逐条明细卡同层可折叠（与变更卡同为disclosure）', () => {
  const dir = mkdtempSync(join(tmpdir(), 't576-exercise-'));
  const db = openDb(join(dir, DB_FILENAME));
  db.close();
  const out = join(SAMPLES, 'n7-detail.html');
  const s1 = spawnSync(NODE_BIN, [BIN, 'calorie.exercise.add', '--params', JSON.stringify({ type: '慢跑', calories: 320, minutes: 30, date: '2026-09-05' }), '--html', out], { encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir } });
  assert.equal(s1.status, 0, 'seed1 stderr=' + String(s1.stderr || '').slice(-200));
  const s2 = spawnSync(NODE_BIN, [BIN, 'calorie.exercise.add', '--params', JSON.stringify({ type: '慢跑', calories: 320, minutes: 30, date: '2026-09-06' }), '--html', out], { encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir } });
  assert.equal(s2.status, 0, 'seed2 stderr=' + String(s2.stderr || '').slice(-200));
  const r = spawnSync(NODE_BIN, [BIN, 'calorie.exercise.remove', '--params', JSON.stringify({ from: '2026-09-05', to: '2026-09-06' }), '--html', out], { encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir } });
  assert.equal(r.status, 0, 'remove stderr=' + String(r.stderr || '').slice(-200));
  const file = existsSync(out) ? readFileSync(out, 'utf8') : '';
  const detail = cardOf(file, 'sec-detail');
  assert.ok(detail.includes('ilife-block-disclosure'), '逐条明细卡不是可折叠层');
  assert.ok(detail.includes('>日期</th>'), '明细表头丢失');
  console.log('T576-N7 disclosure=1 bytes=' + (existsSync(out) ? statSync(out).size : 0));
});

test('t576-N8 眉标对齐H1＋距离统一km＋34卡题单刻度说法', () => {
  const st = buildStrengthDoc(strengthView());
  const stEyebrow = (/<p class="ilife-block-page-shell-eyebrow">([^<]*)<\/p>/.exec(st) ?? [])[1] ?? '';
  const stH1 = (/<h1[^>]*>([^<]*)<\/h1>/.exec(st) ?? [])[1] ?? '';
  assert.equal(stEyebrow, stH1, '力量眉标与H1未对齐：' + stEyebrow + ' vs ' + stH1);
  const ca = buildCardioDoc(cardioView());
  const caEyebrow = (/<p class="ilife-block-page-shell-eyebrow">([^<]*)<\/p>/.exec(ca) ?? [])[1] ?? '';
  const caH1 = (/<h1[^>]*>([^<]*)<\/h1>/.exec(ca) ?? [])[1] ?? '';
  assert.equal(caEyebrow, caH1, '有氧眉标与H1未对齐：' + caEyebrow + ' vs ' + caH1);
  assert.ok(!ca.includes('公里'), '有氧页仍混用公里');
  assert.ok(ca.includes('km'), '有氧页缺km统一单位');
  const tr = buildTrendDoc(trendView());
  assert.ok(!tr.includes('两套刻度'), '趋势卡题仍称两套刻度');
  console.log('T576-N8 eyebrow=2/2 km=1 nok2=1');
});
