/** #519 · 报告族 8 页的形状判据（`calorie.report.*`：BMI／TDEE／BMR／蛋白／水分／评分／趋势／对比）。
 *
 * 本件量的是**形状**（基准件 `docs/skills/skill-calorie/t516-场景10-视觉整改基准.md` §一 的
 * J1／J2／J6／J8／J9 与 §三 的六种形状词表），取数、字段与口径另由
 * `analysis-report-384.test.mjs`（8 条跑通＋拿错页即红＋两期同源真体重）守着——两件不重复断言同一件事。
 * 用合成数据直调**多态底座**（`buildReportDoc`，不依赖 CLI／库／盘），每条断言对着一处
 * **可源码级改坏**的形状：
 *   ① 三条恒出（页内导航／口径说明行／来源脚注）＋ 结论条恰好一条（J2／J9）
 *   ② 页内导航与区块 id 双向自洽（J8：多一个孤儿锚点即红），8 个形态逐个跑
 *   ③ 形状件接上（徽章列／状态徽章／键值表／空态块，J2）
 *   ④ 可见文本零并列分隔符（J1 的页内影子：`·`／`；`／`~`／`｜`／`、`）
 *   ⑤ 页头三件与宽屏页宽（J6：题名两段不拿 `·` 串、徽章一个词、区间写「至」、`pageChromeCss(1120)`）
 *   ⑥ 8 个形态互不相同（同一底座、不同形态，不许落回同一页）
 *   ⑦ 空窗兜底：区块少了，导航项跟着少，不留孤儿锚点，且出空态块
 *
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`，
 * 再 `node --test packages/skill-calorie/test/analysis-shape-report-520.test.mjs`。
 */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { buildReportDoc, KIND_LABELS } from '../dist/analysis/reportDoc.js';
import { assertDocPage } from './doc-page-assert.mjs';
import { configTestBase } from './helpers/config-test.mjs';

// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

/* ── 合成夹具：三天窗口 ＋ 档案四要素齐备（八形态都从这里派生，只换各自的取数结果） ────── */

/** 三天日序列（`DaySeries` 的字段面按渲染层真正读到的那些给）。 */
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

/** 空底座（各形态只填自己那一支）。 */
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

const FOUR = { avg: 120, target: 150, hitDays: 1, loggedDays: 3, hitRate: 33.3 };

/** 八个形态各一份样本（形如 `buildReportPlate` 的产出面）。 */
function samples() {
  return {
    bmi: plateOf('bmi', { bandPoints: BASE.weightPoints }),
    tdee: plateOf('tdee'),
    bmr: plateOf('bmr', {
      points: SERIES.map((s) => ({ date: s.date, value: s.calories })),
      bmrDanger: { underDays: [{ date: '2026-09-01', calories: 900 }, { date: '2026-09-02', calories: 900 }, { date: '2026-09-03', calories: 900 }], threshold: 1700 },
    }),
    protein: plateOf('protein', {
      points: SERIES.map((s) => ({ date: s.date, value: s.protein })),
      target: 150, fourPiece: FOUR,
    }),
    water: plateOf('water', {
      points: SERIES.map((s) => ({ date: s.date, value: s.waterMl })),
      target: 2000, fourPiece: { ...FOUR, avg: 1800, hitDays: 2, hitRate: 66.7 },
    }),
    score: plateOf('score', {
      scores: SERIES.map((s, i) => ({ date: s.date, hits: 3, score: 50 + i, factors: [] })),
      items: [{ key: 'a', label: '饮水达标', hits: 1, days: 3, rate: 33.3 }, { key: 'b', label: '称重', hits: 3, days: 3, rate: 100 }],
      trend: { earlyAvg: 50, lateAvg: 52, turns: 1, direction: '平稳' },
    }),
    trend: plateOf('trend', {
      points: SERIES.map((s) => ({ date: s.date, value: 50 })),
      scores: SERIES.map((s, i) => ({ date: s.date, hits: 3, score: 50 + i, factors: [] })),
      items: [],
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

/** 形状计数一律在**剥掉样式段与脚本段**的 DOM 串上做：类名在 CSS 里也出现（`.ilife-block-toc{…}`），
 *  在整串上数是数不准的（数出来的是「样式声明 ＋ 元素」的混合，改坏了也可能照样 ≥1）。 */
const domOf = (html) => html.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ');
const countIn = (html, needle) => domOf(html).split(needle).length - 1;

/** 可见文本（口径与 `packages/skill-calorie/scripts/audit-separators.mjs` 同源：剥样式段／脚本段／注释／全部标签）。 */
function visible(text) {
  return text.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]*>/g, ' ');
}

function anchorsOf(html) {
  const hrefs = [...html.matchAll(/<a href="#([^"]+)">([^<]*)<\/a>/g)].map((m) => m[1]);
  const ids = [...html.matchAll(/<section id="([^"]+)"/g)].map((m) => m[1]);
  return { hrefs, ids };
}

test('#519 ① 三条恒出：页内导航 ＋ 口径说明行 ＋ 来源脚注 ＋ 结论条恰好一条（J2／J9）', () => {
  for (const [kind, html] of Object.entries(built)) {
    const what = KIND_LABELS[kind];
    assertDocPage(html, what);
    assert.ok(countIn(html, 'ilife-block-toc') >= 1, what + ' 缺页内导航（ilife-block-toc）');
    assert.ok(countIn(html, 'ilife-block-caliber') >= 2, what + ' 口径说明行／来源脚注都走 ilife-block-caliber，至少两条');
    assert.ok(visible(html).includes('📊 数据来源：'), what + ' 缺来源脚注那一行');
    assert.equal(countIn(html, 'ilife-block-conclusion'), 1, what + ' 结论条应恰好一条（`renderConclusionBar`）');
    assert.ok((html.match(/ilife-block-conclusion">([^<]*)</) || ['', ''])[1].length > 0, what + ' 结论条是空的');
  }
});

test('#519 ② 页内导航与区块 id 双向自洽（J8：多一个孤儿锚点即红），8 个形态逐个跑', () => {
  for (const [kind, html] of Object.entries(built)) {
    const what = KIND_LABELS[kind];
    const { hrefs, ids } = anchorsOf(html);
    assert.ok(hrefs.length >= 2, what + ' 导航项至少 2 项，实得 ' + hrefs.length);
    assert.deepEqual([...hrefs].sort(), [...ids].sort(), what + ' 导航 href 与区块 id 必须一一对应（双向，不许有孤儿）');
    assert.equal(new Set(hrefs).size, hrefs.length, what + ' 导航项 id 不许重复');
  }
});

test('#519 ③ 形状件接上：徽章列／状态徽章／键值表／空态块（J2）', () => {
  // 页头胶囊（#516 §3.2 D01／D02／D04）：三个词各一格，8 页齐
  for (const [kind, html] of Object.entries(built)) {
    const chips = [...html.matchAll(/ilife-block-chip">([^<]*)</g)].map((m) => m[1]);
    assert.ok(chips.includes('卡路里') && chips.includes('健康报告'), KIND_LABELS[kind] + ' 页头胶囊缺归属词：' + chips.join('|'));
  }
  // 有状态处走徽章（`renderKpiCard` 的 status 槽 → `ilife-status-badge`）
  for (const kind of ['bmi', 'tdee', 'bmr', 'score', 'trend', 'compare']) {
    assert.ok(countIn(built[kind], 'ilife-status-badge') >= 1, KIND_LABELS[kind] + ' 有状态处没挂状态徽章');
  }
  // 状态维度改走徽章列：蛋白／水分两页的「达标／未达标天数」（R-39／R-46：两页统一用「达标」）
  const water = [...built.water.matchAll(/ilife-block-chip">([^<]*)</g)].map((m) => m[1]);
  assert.ok(water.includes('达标 2 天') && water.includes('未达标 1 天'), '水分页缺达标天数徽章：' + water.join('|'));
  // 键值表：TDEE 页的身份三件事一条一行（#516 §3.2 D09）
  assert.ok(domOf(built.tdee).includes('>身高<') && domOf(built.tdee).includes('>年龄<') && domOf(built.tdee).includes('>性别<'),
    'TDEE 页的身份三件事没有拆成键值行');
  assert.ok(!visible(built.tdee).includes('身高 / 年龄 / 性别'), 'TDEE 页仍拿斜杠把三件事串成一格（判据 R3）');
});

test('#519 ④ 可见文本零并列分隔符（J1 的页内影子）', () => {
  for (const [kind, html] of Object.entries(built)) {
    const vis = visible(html);
    for (const ch of ['·', '；', '~', '｜', '、']) {
      assert.ok(!vis.includes(ch), KIND_LABELS[kind] + ' 可见文本里出现并列分隔符「' + ch + '」');
    }
    // 口径行的段间竖线只活在版式里：产物文本里没有该字符，但有逐段 span
    assert.ok(/ilife-block-caliber">\s*<span>/.test(html), KIND_LABELS[kind] + ' 口径行的分段没落成 span（分隔应由版式承担）');
  }
});

test('#519 ⑤ 页头三件与宽屏页宽（J6）', () => {
  for (const [kind, html] of Object.entries(built)) {
    const what = KIND_LABELS[kind];
    assert.ok(html.includes('<title>卡路里 ' + what + '</title>'), what + ' head 标题应两段不拿「·」串');
    assert.ok(html.includes('<div class="type-badge">报告</div>'), what + ' 页型徽章只写一个词「报告」（D04）');
    const meta = (html.match(/<div class="left">([^<]*)</) || [])[1] ?? '';
    assert.ok(/^2026-09-01 至 2026-09-03（共 3 天）$/.test(meta), what + ' 页头左格的区间应写「至」且天数进括号：' + meta);
    /* 宽屏余量的解走**包内既有**页面壳件 `pageChromeCss(1120)`（#517 裁定 (a) 的同一条路）。 */
    assert.ok(html.includes('.ilife-block-page-shell{box-sizing:border-box;max-width:1120px'), what + ' 页面壳宽度没走 pageChromeCss(1120)');
  }
});

test('#519 ⑥ 8 个形态互不相同（同一底座、不同形态，不许落回同一页）', () => {
  const keys = Object.keys(built);
  for (let a = 0; a < keys.length; a++) {
    for (let b = a + 1; b < keys.length; b++) {
      assert.notEqual(built[keys[a]], built[keys[b]], '两页产物逐字节相同：' + keys[a] + ' vs ' + keys[b]);
    }
  }
  for (const [kind, html] of Object.entries(built)) {
    assert.ok(html.includes(KIND_LABELS[kind]), KIND_LABELS[kind] + ' 页里没有自己的形态名（疑似拿错页）');
    assert.ok(html.includes('calorie.report.' + kind), KIND_LABELS[kind] + ' 复制载荷里没有本形态命令原文');
  }
});

test('#519 ⑦ 空窗兜底：区块少了，导航项跟着少、不留孤儿锚点，且出空态块', () => {
  // BMI 无称重 ⇒ 只剩「概览」那一块（空态）＋ 复制区
  const bmiEmpty = buildReportDoc(plateOf('bmi', { bandPoints: [] }), '');
  assertDocPage(bmiEmpty, 'BMI 空窗');
  const a = anchorsOf(bmiEmpty);
  assert.deepEqual([...a.hrefs].sort(), [...a.ids].sort(), '空窗时导航 href 与区块 id 仍须一一对应');
  assert.ok(!a.hrefs.includes('sec-chart'), '空窗不该有图区块的导航项');
  assert.ok(bmiEmpty.includes('ilife-empty'), '空窗的 BMI 页应走空态块');
  // BMR 无危险日 ⇒ 危险信号那一块走空态，而不是「一张只有一行字的表」
  const bmrSafe = buildReportDoc(plateOf('bmr', {
    points: SERIES.map((s) => ({ date: s.date, value: s.calories })),
    bmrDanger: { underDays: [], threshold: 1700 },
  }), '');
  assert.ok(bmrSafe.includes('ilife-empty'), 'BMR 没有危险日时应出空态块');
  /* #519 裁定 T（编排者 2026-09-16）：上面这条负向断言必须配**同批正向控制**，
   * 否则它可能只是恒真（本票刚在 `analysis-accept-386` 上吃过这个亏）。
   * 控制来自同一份夹具：有危险日那一支（`built.bmr`，3 天低于阈值）**必须**出这块表。 */
  assert.ok(built.bmr.includes('⚠️ 危险信号'), '正向控制：有危险日时应当出危险信号表（否则上条负向恒真）');
  assert.ok(!bmrSafe.includes('⚠️ 危险信号'), 'BMR 没有危险日时不该出危险信号表');
  // 蛋白页没有目标 ⇒ 不出达标徽章（零信息量的徽章不印）
  const proteinNoGoal = buildReportDoc(plateOf('protein', {
    points: SERIES.map((s) => ({ date: s.date, value: s.protein })),
    target: null, fourPiece: { avg: 120, target: null, hitDays: 0, loggedDays: 3, hitRate: null },
  }), '');
  /* 裁定 T 的同一条：正向控制＝**有目标**那一支（`built.protein`，目标 150、3 天里 1 天达标）
   * 必须真的印出 `未达标`（徽章列那一枚），否则下面这条负向断言是空转。 */
  assert.ok(built.protein.includes('未达标'), '正向控制：有目标时应当出「未达标」徽章（否则上条负向恒真）');
  assert.ok(!proteinNoGoal.includes('未达标'), '没设目标时不判达标，不该出现未达标徽章');
});

/* ── #519 W5 视觉整改（D4／D5／D6／D7）的机器守卫 ─────────────────────────────
 *
 *  为什么要有这一条：D4／D6 两条**严重**缺陷（页 28 的 x 轴标签重叠、页 30 的 59 枚数值标签互压）
 *  原先在机器判据里**完全不可见**——`audit-separators`／`measure-responsive`／版式探针都不看图表内部，
 *  四条靶向测试也没有一条读 `ilife-charts-*`。没有守卫，下一次改动把密度改回去没人会知道。
 *  判据取自**缺陷本身**（不是取自实现）：
 *    · 逐点数值标签**一枚都不许有**（公共层那一档字号是移动端 9.5px，且柱状图那一支恒全开）；
 *    · 折线图的横轴刻度必须**等距**（相邻间距极差 < 1 用户单位）且至少 3 枚——
 *      「首＋峰值＋尾」那条路在峰值贴边时会退化成「首＋次＋尾」，两枚标签只隔十几单位 ⇒ 重叠；
 *    · 仪表盘的值文本不许带 `%`（本页 KPI 与结论行都是「N 分」，`%` 与「满分 100 分」语义打架），
 *      且不许出第二行数值标签（原来 `70%` 叠 `70`）。
 */
test('#519 ⑧ 图表读数纪律：无逐点数值标签 ＋ 折线横轴等距 ≥3 枚 ＋ 仪表盘单位只一种（D4／D5／D6／D7）', () => {
  const chartSections = (html) => [...html.matchAll(/<section class="ilife-block ilife-block-chart-block">[\s\S]*?<\/section>/g)].map((m) => m[0]);
  let lineCharts = 0;
  for (const [kind, html] of Object.entries(built)) {
    const what = KIND_LABELS[kind];
    for (const chart of chartSections(html)) {
      assert.equal([...chart.matchAll(/<text class="ilife-charts-value"/g)].length, 0,
        what + ' 图里出现逐点数值标签（公共层那一档字号 9.5px，且密集时互压）');
      if (!/ilife-charts-line\b/.test(chart)) continue;
      lineCharts += 1;
      const xs = [...chart.matchAll(/<text class="ilife-charts-xlabel" x="([-\d.]+)"/g)].map((m) => Number(m[1]));
      assert.ok(xs.length >= 3, what + ' 折线横轴刻度少于 3 枚（读不出中段参照）：' + xs.length);
      const gaps = xs.slice(1).map((x, i) => x - xs[i]);
      assert.ok(Math.max(...gaps) - Math.min(...gaps) < 1,
        what + ' 折线横轴刻度不等距（「首＋峰值＋尾」那条路会退化成首＋次＋尾 ⇒ 重叠）：' + JSON.stringify(gaps.map((g) => Math.round(g * 10) / 10)));
    }
    const gaugeValues = [...html.matchAll(/charts-gauge-value"[^>]*>([^<]*)</g)].map((m) => m[1]);
    if (gaugeValues.length > 0) {
      for (const v of gaugeValues) assert.ok(!v.includes('%'), what + ' 仪表盘值文本带百分号（与「满分 100 分」两种单位并存）：' + v);
      assert.equal([...html.matchAll(/charts-gauge-label"/g)].length, 0, what + ' 仪表盘多出一行数值标签（同一个数印两遍）');
    }
  }
  assert.ok(lineCharts >= 6, '夹具里的折线图太少（本判据会变空转）：' + lineCharts);
});

/* ── #519 W6 · 长序列的**几何**判据（D4 的本体：标签外框会不会相交） ───────────────
 *
 *  门槛常量怎么来的（**这一步是本条的要害**）：W5 那次用 `5 × 11 × 0.62 ≈ 34.15` 用户单位**估算**，
 *  而公共层折线图的 x 标签字号**按断点换档**（≤720px 走 `LINE_TEXT_MOBILE.*`）⇒ 那个常量既不是
 *  1440 档真值也不是 390 档真值，于是「不相交」这条断言**在最窄档恒绿**，而页 24／26／28／30 在
 *  390／512 档**每页 11/11 相邻对都相交**（复核席 S2-2 抓到的正是这条）。
 *
 *  现门槛＝**真渲染实测的最坏值**，来源 `.scratch/t519/W6-geom-before.json`（headless Chrome ＋ CDP，
 *  `getBBox()` 用户单位）：390 档标签宽 **53.91～54.90**、512 档 **53.91～54.12**、820 档 34.45～34.82、
 *  1440 档 30.01～30.30 ⇒ 按**最坏档（390）**取 **54.90** 用户单位，并要求相邻锚点间距 ≥ 它。
 *  为什么用「锚点间距」而不是「外框间距」：同一张图的标签锚点差＝绘图宽 ÷ (点数−1)，
 *  在**产物文本**里就能算出来（`x` 属性），而外框宽的断点档只有真渲染量得到——
 *  所以定档在**源码常量**上收紧、识别力在真渲染探针上复验，两头都不靠估算。
 *  定档值 9 的推导（484 ÷ (9−1) = 60.5 ≥ 54.90，见 `reportDocParts.ts` 的件头表）。 */
const LABEL_W_USER_WORST = 54.90;

test('#519 ⑨ 30 天长序列的横轴几何：等距 ＋ 刻间距 ≥ **实测**最窄档标签宽（D4／S2-2）', () => {
  const points = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.parse('2026-08-17T12:00:00Z') + i * 86400000);
    return { date: d.toISOString().slice(0, 10), value: 1800 + (i % 3) * 200 };
  });
  const html = buildReportDoc(plateOf('water', {
    points, target: 2000,
    fourPiece: { avg: 2000, target: 2000, hitDays: 20, loggedDays: 30, hitRate: 66.7 },
  }), '');
  const charts = [...html.matchAll(/<section class="ilife-block ilife-block-chart-block">[\s\S]*?<\/section>/g)].map((m) => m[0]);
  assert.equal(charts.length, 1, '30 天水分页应当只有一张图，实得 ' + charts.length);
  assert.equal(charts[0].match(/<text class="ilife-charts-value"/g)?.length ?? 0, 0, '图里出现逐点数值标签（会互压）');
  const xs = [...charts[0].matchAll(/<text class="ilife-charts-xlabel" x="([-\d.]+)"/g)].map((m) => Number(m[1]));
  assert.ok(xs.length >= 3, '横轴刻度少于 3 枚（读不出中段参照）：' + xs.length);
  assert.ok(xs.length <= 9, '横轴刻度超过定档枚数 9（最窄档必相交）：' + xs.length);
  const gaps = xs.slice(1).map((x, i) => x - xs[i]);
  assert.ok(Math.min(...gaps) >= LABEL_W_USER_WORST,
    '相邻横轴标签外框相交：刻间距 ' + Math.min(...gaps).toFixed(1) + ' < 实测最窄档标签宽 ' + LABEL_W_USER_WORST
    + '（改前页 28 在 390 档是 46.1 vs 54.9 ⇒ 11/11 相交、最大重叠 4.98px）');
  assert.ok(Math.max(...gaps) - Math.min(...gaps) < 1, '横轴刻度不等距：' + JSON.stringify(gaps.map((g) => Math.round(g * 10) / 10)));
});

/* ── #519 W6 · y 轴刻度值（复核席实测盲区：**没有任何测试读 `ilife-charts-tick`**） ──────
 *
 *  两条判据：
 *   ① **同一张图三个刻度的小数位数必须一致**——改前页 26 是 `1516／1614.5／1720`（外刻度整数、中刻度一位小数）。
 *   ② 整数语义的图（卡路里／毫升／分／天数）**三个刻度都必须是整数**。
 *  夹具专挑「去掉取整守卫就会退化成 .5」的那一档：`[100, 201]` ⇒ pad = 12.12 ⇒ 87／214（差 127，奇数）
 *  ⇒ 无守卫时中刻度 = 150.5；有守卫时 yMax 抬到 215、中刻度 = 151。 */
test('#519 ⑩ y 轴刻度值：同图小数位一致 ＋ 整数语义的图全为整数（D7／S2-2 盲区）', () => {
  const tickKind = (html) => [...html.matchAll(/<text class="ilife-charts-tick"[^>]*>([^<]*)</g)].map((m) => m[1]);
  const decimals = (s) => (s.includes('.') ? s.split('.')[1].length : 0);
  for (const [kind, html] of Object.entries(built)) {
    const ticks = tickKind(html);
    if (ticks.length === 0) continue;
    assert.equal(ticks.length % 3, 0, KIND_LABELS[kind] + ' 的 y 刻度不是三的倍数（每图 3 条）：' + JSON.stringify(ticks));
    for (let i = 0; i < ticks.length; i += 3) {
      const three = ticks.slice(i, i + 3);
      const ds = three.map(decimals);
      assert.equal(new Set(ds).size, 1,
        KIND_LABELS[kind] + ' 同一张图的 y 刻度小数位不一致（D7：外刻度整数、中刻度带小数）：' + JSON.stringify(three));
    }
  }
  // ② 专挑「去掉取整守卫即退化成 .5」的序列
  const odd = buildReportDoc(plateOf('water', {
    points: [{ date: '2026-08-17', value: 100 }, { date: '2026-08-18', value: 201 }],
    target: null, fourPiece: { avg: 150, target: null, hitDays: 0, loggedDays: 2, hitRate: null },
  }), '');
  const oddTicks = tickKind(odd);
  assert.equal(oddTicks.length, 3, '那张图应当有 3 条 y 刻度，实得 ' + JSON.stringify(oddTicks));
  for (const t of oddTicks) assert.ok(/^-?\d+$/.test(t), '整数语义的图出现非整数刻度（取整守卫失效）：' + JSON.stringify(oddTicks));
});
