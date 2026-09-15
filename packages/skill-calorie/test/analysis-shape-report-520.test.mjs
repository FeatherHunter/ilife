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
  // 状态维度改走徽章列：蛋白／水分两页的「达标／未达标天数」
  const water = [...built.water.matchAll(/ilife-block-chip">([^<]*)</g)].map((m) => m[1]);
  assert.ok(water.includes('达成 2 天') && water.includes('未达成 1 天'), '水分页缺达标天数徽章：' + water.join('|'));
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
  assert.ok(!bmrSafe.includes('⚠️ 危险信号'), 'BMR 没有危险日时不该出危险信号表');
  // 蛋白页没有目标 ⇒ 不出达标徽章（零信息量的徽章不印）
  const proteinNoGoal = buildReportDoc(plateOf('protein', {
    points: SERIES.map((s) => ({ date: s.date, value: s.protein })),
    target: null, fourPiece: { avg: 120, target: null, hitDays: 0, loggedDays: 3, hitRate: null },
  }), '');
  assert.ok(!proteinNoGoal.includes('未达标'), '没设目标时不判达标，不该出现未达标徽章');
});
