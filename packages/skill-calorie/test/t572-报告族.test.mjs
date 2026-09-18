/** t572 报告族返修靶向（R-36~R-58，合成板直调底座，不碰库/盘）。
 *
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`，
 * 再 `node --test packages/skill-calorie/test/t572-报告族.test.mjs`。
 * 每条都是“改前必红”：旧文案/旧结构在断言字面上直接命中（见各条注释的改前形态）。
 */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { buildReportDoc } from '../dist/analysis/reportDoc.js';
import { configTestBase } from './helpers/config-test.mjs';

// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const SERIES = [
  { date: '2026-09-01', calories: 1700, weightKg: 74.0, protein: 120, waterMl: 1800, exerciseKcal: 300, deficit: 400 },
  { date: '2026-09-02', calories: 1800, weightKg: 73.8, protein: 150, waterMl: 2100, exerciseKcal: 0, deficit: 300 },
  { date: '2026-09-03', calories: 1600, weightKg: 73.6, protein: 90, waterMl: 1500, exerciseKcal: 250, deficit: 500 },
];
const PROFILE = {
  heightCm: 175, age: 30, gender: 'male', genderLabel: '男',
  activityLevel: 'moderate', activityLabel: '中等', activityFactor: 1.55,
  bmr: 1700, tdee: 2635, missing: [],
};
const BASE = {
  start: '2026-09-01', end: '2026-09-03', days: 3, series: SERIES,
  weightPoints: [
    { date: '2026-09-01', kg: 74.0, bmi: 24.2 },
    { date: '2026-09-02', kg: 73.8, bmi: 24.1 },
    { date: '2026-09-03', kg: 73.6, bmi: 24.0 },
  ],
  profile: PROFILE,
  goals: { proteinG: 150, waterMl: 2000, calorie: 1800 },
};
function plateOf(kind, over = {}) {
  const base = { ...BASE, kind, ...(over.base ?? {}) };
  const common = {
    base, points: [], target: null, bandPoints: [], fourPiece: null,
    items: [], scores: [], trend: null, bmrDanger: null, compare: null, plate: null,
  };
  const extra = { ...over };
  delete extra.base;
  return { ...common, ...extra };
}
const FOUR_P = { avg: 120, target: 150, hitDays: 1, loggedDays: 3, hitRate: 33.3 };
const FOUR_W = { avg: 1800, target: 2000, hitDays: 2, loggedDays: 3, hitRate: 66.7 };
function samples() {
  return {
    bmi: plateOf('bmi', { bandPoints: BASE.weightPoints }),
    tdee: plateOf('tdee'),
    bmr: plateOf('bmr', {
      points: SERIES.map((s) => ({ date: s.date, value: s.calories })),
      /* 3 天触发危险表（caption 分支与空态分支都走到，R-36 改前两处都印老侧）。 */
      bmrDanger: { underDays: SERIES.map((s) => ({ date: s.date, calories: 900 })), threshold: 1700 },
    }),
    protein: plateOf('protein', {
      points: SERIES.map((s) => ({ date: s.date, value: s.protein })),
      target: 150, fourPiece: FOUR_P,
    }),
    water: plateOf('water', {
      points: SERIES.map((s) => ({ date: s.date, value: s.waterMl })),
      target: 2000, fourPiece: FOUR_W,
    }),
    score: plateOf('score', {
      scores: SERIES.map((s, i) => ({ date: s.date, hits: 3, score: 50 + i, factors: [] })),
      items: [{ key: 'a', label: '饮水达标', hits: 1, days: 3, rate: 33.3 }, { key: 'b', label: '称重', hits: 3, days: 3, rate: 100 }],
      trend: { earlyAvg: 50, lateAvg: 52, turns: 1, direction: '平稳' },
    }),
    trend: plateOf('trend', {
      points: SERIES.map((s) => ({ date: s.date, value: 50 })),
      scores: SERIES.map((s, i) => ({ date: s.date, hits: 3, score: 50 + i, factors: [] })),
      trend: { earlyAvg: 50, lateAvg: 52, turns: 1, direction: '平稳' },
    }),
    compare: plateOf('compare', {
      compare: {
        cur: { start: '2026-09-01', end: '2026-09-03' },
        prev: { start: '2026-08-29', end: '2026-08-31' },
        rows: [
          { label: '日均总消耗', cur: 2635, prev: 2632.5, delta: 2.5, unit: '卡' },
          { label: '日均体重', cur: 73.8, prev: 74.2, delta: -0.4, unit: 'kg' },
          { label: '日均饮水', cur: 1800, prev: 1828.6, delta: -28.6, unit: 'ml' },
        ],
        top: [{ label: '日均饮水', delta: -28.6, unit: 'ml' }, { label: '日均体重', delta: -0.4, unit: 'kg' }],
      },
    }),
  };
}
const built = Object.fromEntries(Object.entries(samples()).map(([k, p]) => [k, buildReportDoc(p, 'calorie-cmd-read calorie.report.' + k + " --params '{}'")]));
const domOf = (html) => html.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ');
const visible = (text) => text.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]*>/g, ' ');
const kpiLabels = (html) => [...domOf(html).matchAll(/kpi-card-label">([^<]*)</g)].map((m) => m[1]);
const kpiValues = (html) => [...domOf(html).matchAll(/kpi-card-value">([^<]*)</g)].map((m) => m[1]);

test('R-36 老侧黑话清零', () => {
  for (const [k, html] of Object.entries(built)) assert.ok(!visible(html).includes('老侧'), k + ' 可见文本含老侧');
});

test('R-37 里程碑无拉丁形参名', () => {
  /* 基础夹具无跨档（caption 本来就是无括注的「分类里程碑」）；另造一组跨档板测中文括注。 */
  assert.ok(!/分类里程碑（from|from → to/.test(built.bmi), 'bmi 含 from 形参名');
  const cross = plateOf('bmi', {
    bandPoints: [
      { date: '2026-09-01', kg: 78.0, bmi: 25.5 }, { date: '2026-09-02', kg: 75.0, bmi: 24.5 },
    ],
  });
  const crossHtml = buildReportDoc(cross, 'calorie-cmd-read calorie.report.bmi');
  assert.ok(crossHtml.includes('分类里程碑（起 → 止）'), '跨档时里程碑标题未改中文起止');
  assert.ok(!/分类里程碑（from/.test(crossHtml), '跨档标题仍有 from');
});

test('R-38 分级标题去内部括注', () => {
  assert.ok(!built.bmi.includes('页面文案口径'), 'bmi 仍有页面文案口径');
  assert.ok(built.bmi.includes('BMI 分级（中国标准）'), 'bmi 未改中国标准');
});

test('R-39/R-46 水分统一达标', () => {
  assert.ok(!visible(built.water).includes('达成'), '水分页仍有达成（改前蛋白达标/水分达成各叫各的）');
  assert.ok(visible(built.water).includes('达标'), '水分页缺达标');
  assert.ok(!visible(built.protein).includes('达成'), '蛋白页混入达成');
});

test('R-40 平稳不挂无数据', () => {
  assert.ok(!built.trend.includes('status-badge-empty">无数据'), '趋势平稳页仍挂无数据徽标');
  assert.ok(built.trend.includes('>平稳<'), '趋势平稳页缺平稳徽标');
});

test('R-41 KPI 内无长日期串', () => {
  for (const v of kpiValues(built.compare)) assert.ok(!/\d{4}-\d{2}-\d{2}/.test(v), '对比 KPI 仍有长日期（390 档折断源）：' + v);
});

test('R-42 徽标无默认通用词', () => {
  for (const [k, html] of Object.entries(built)) {
    for (const w of ['status-badge-ok">成功', 'status-badge-warn">警告', 'status-badge-danger">失败', 'status-badge-empty">无数据']) {
      assert.ok(!domOf(html).includes(w), k + ' 有默认通用徽标 ' + w + '（改前 KPI 只给 status 不给文案）');
    }
  }
  assert.ok(built.score.includes('饮水达标 33.3%'), '评分徽标缺领域词+百分数');
});

test('R-43 口径表与页脚不互为子串', () => {
  const m = built.bmr.match(/危险信号判据<\/td><td[^>]*>([^<]*)</);
  const tableSentence = (m ?? [])[1] ?? '';
  const footer = [...built.bmr.matchAll(/ilife-block-caliber">([\s\S]*?)<\/p>/g)].map((x) => x[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
  assert.ok(tableSentence.length > 0, 'BMR 口径表缺危险信号判据行');
  for (const f of footer) assert.ok(!f.includes(tableSentence), '页脚含口径表原句（逐字重复）：' + f);
});

test('R-44 BMR 四卡标签值两两不等', () => {
  const l = kpiLabels(built.bmr);
  const v = kpiValues(built.bmr);
  assert.equal(new Set(l).size, 4, 'BMR KPI 标签重复（改前 KPI3/KPI4 同为 30 天）：' + l.join('|'));
  assert.equal(new Set(v).size, 4, 'BMR KPI 读数重复：' + v.join('|'));
});

test('R-45 蛋白四卡标签值两两不等', () => {
  const l = kpiLabels(built.protein);
  const v = kpiValues(built.protein);
  assert.equal(new Set(l).size, 4, '蛋白 KPI 标签重复：' + l.join('|'));
  assert.equal(new Set(v).size, 4, '蛋白 KPI 读数重复（改前达标天数与达标率同为 0 事实）：' + v.join('|'));
});

test('R-47/R-56 单位写法', () => {
  for (const [k, html] of Object.entries(built)) {
    for (const w of ['饮水ml', '体重kg', '蛋白g', '当日摄入卡']) assert.ok(!domOf(html).includes(w), k + ' 仍有旧单位写法 ' + w);
  }
  assert.ok(built.water.includes('饮水（ml）'), '水分表头未改括号单位');
});

test('R-48 目标线标签右端收齐', () => {
  assert.ok(built.water.includes('charts-marktext') && built.water.includes('text-anchor="end"'), '目标标签未右端收齐');
  assert.ok(visible(built.water).includes('虚线为目标'), '图题缺虚线为目标（标签含义无落点）');
});

test('R-49 评分读数仪表承载', () => {
  assert.ok(!kpiLabels(built.score).includes('综合评分'), '评分 KPI 仍另起一卡印同一数');
  const gv = [...built.score.matchAll(/charts-gauge-value"[^>]*>([^<]*)</g)].map((m) => m[1]);
  assert.ok(gv.length > 0 && gv.every((v) => !v.includes('%') && v.includes('分')), '仪表值文本非统一分：' + JSON.stringify(gv));
});

test('R-50 对比 KPI 窗口元信息≤1', () => {
  const l = kpiLabels(built.compare);
  const meta = l.filter((x) => x === '本期' || x === '对比期' || x === '记录天数');
  assert.ok(meta.length <= 1, '对比 KPI 窗口元信息超 1：' + l.join('|'));
  assert.ok(!l.includes('本期') && !l.includes('对比期'), '本期/对比期日期卡未下沉');
});

test('R-51 方向列已撤', () => {
  assert.ok(!domOf(built.compare).includes('>方向<'), '对比表仍有方向列（Δ 符号已编码方向）');
});

test('R-52 日均 1 位小数', () => {
  assert.ok(built.compare.includes('2635.0'), '整数日均未补 .0（改前 2635/68 无小数）：' + 'R-52');
});

test('R-53 分级表无空白格', () => {
  const sec = built.bmi.split('id="sec-bands"')[1].split('</section>')[0];
  assert.ok(!/<td[^>]*>\s*<\/td>/.test(sec), '分级表仍有空白格（改前非当前档印空串）');
  assert.ok(sec.includes('—'), '分级表缺 — 占位');
});

test('R-54 BMI 轨迹占图高≥60%', () => {
  const p = plateOf('bmi', {
    bandPoints: [
      { date: '2026-08-01', kg: 78.0, bmi: 25.5 }, { date: '2026-08-10', kg: 77.0, bmi: 25.1 },
      { date: '2026-08-20', kg: 76.0, bmi: 24.8 }, { date: '2026-08-30', kg: 75.5, bmi: 24.6 },
      { date: '2026-09-09', kg: 75.1, bmi: 24.5 },
    ],
  });
  const html = buildReportDoc(p, 'calorie-cmd-read calorie.report.bmi');
  const ticks = [...html.matchAll(/ilife-charts-tick"[^>]*>([^<]*)</g)].map((m) => Number(m[1])).slice(0, 3);
  assert.equal(ticks.length, 3, 'BMI 图缺 3 刻度：' + JSON.stringify(ticks));
  const span = Math.max(...ticks) - Math.min(...ticks);
  assert.ok((25.5 - 24.5) / span >= 0.6, '轨迹占比不足 60%（改前 y 轴 24–26 只占 50%）：ticks=' + ticks.join('/'));
});

test('R-55 来源脚注本机空格', () => {
  for (const [k, html] of Object.entries(built)) assert.ok(visible(html).includes('本机 2026'), k + ' 脚注本机后缺空格');
});

test('R-57 趋势图有刻度无压字', () => {
  const ticks = (built.trend.match(/ilife-charts-tick"/g) ?? []).length;
  assert.ok(ticks >= 3, '趋势图无 y 刻度（改前柱状图全族唯一 0 刻度）');
  assert.equal(built.trend.match(/<text class="ilife-charts-value"/g)?.length ?? 0, 0, '趋势图有逐点数值标签（会压字）');
});

test('R-58 页脚分隔走版式', () => {
  assert.ok(/ilife-block-caliber">\s*<span>/.test(built.bmi), 'BMI 口径行未落成 span 分段');
});
