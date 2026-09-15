/** #523 · 运动族 17 页「文本形状」守卫：分隔符＝设计债（#508 口径）＋ 机器词零上屏 ＋ 显示层取整。
 *
 * 判据与口径**逐字同源** `.scratch/sep-audit/probe.mjs`（#508 立规票的探针，本件按它复述，不另立一套）：
 *   R1 可见文本含 `·`(U+00B7)；R2 含 `；`(U+FF1B)；
 *   R3 ≥3 段并列：以**同一个**并列分隔符切开后，连续 ≥3 个非空片段、且每段 ≤40 字。
 *   并列分隔符集＝`· ； ; ｜ | ／ / 、 ＋`；`，。：~ → ＝` 不算（免得把散文误判）。
 * 可见文本＝剥 `<style>`／`<script>`／注释／全部标签／解实体；属性里的复制载荷与命令原文**不算**。
 *
 * 覆盖的三族（本票 17 页只有这三种页形，其余只是窗口／筛选不同）：
 *   ① 运动汇总 `buildExerciseDoc`（10 页）② 记录级明细 `buildRecordsDoc`（5 页）③ 对照目标 `buildExerciseGoalDoc`（2 页）。
 *
 * 变异自证（本件末节，读数逐条打 `T523-MUT`）：往产物里塞一处 `·`／一处 `；` 并列 ⇒ 守卫**必红**；
 * 逐文件还原 ⇒ **必绿**。
 *
 * #523 返修 R5 追加四条守卫（终审席 `.scratch/t268/视觉终评-全批39.md` §4 的三条 P1／P2 打回项）：
 *   ⑧ **来源脚注的格**：有表时只剩「数据来源」（「窗口」「记录数」两格已撤）；空态仍报「共 0 条」
 *      （#451 的空态判据读这一句，空态页没有表标题可承载条数——撤格只撤有表时的第三遍）。
 *   ⑨ **窗口节＝只读展示形状**：`#sec-window` 里不许有 `<input>`／`<textarea>`／`<select>`，
 *      窗口日期必须在**文本节点**里（改前日期只住 `value` 属性，390 档复制读不到）。
 *   ⑩ **汇总页两处一处**：逐日表表题不复读窗口天数（「按日消耗」，天数只住页头窗口条，
 *      被截窗把天数并进截断明示那一句）；两张表的数值格带单位（「2 次」「800 卡」「90 分钟」）。
 *   另有 ⑨⑩ 的变异自证（塞回 `<input>`／塞回天数／退回裸数 ⇒ 必红；还原 ⇒ 必绿）。
 * #523 返修 R3 追加两条守卫（视觉复评 R2 的两处硬伤，靶心）：
 *   ⑤ **列对齐**：记录级明细那两张八列表，四个数值列（时长／消耗／距离／心率）必须走公共层既有档位
 *      `align:'right'`（右对齐 ＋ 等宽栈 ＋ `tabular-nums`；`renderDataTable` 里「这一列是数值」的
 *      唯一信号就是它），文字列仍留 `left`——判据同时读**表头档**与**每一行的格子档**。
 *   ⑥ **类名不截断**：本族页的样式段里，分布条类名轨必须放开公共层给的 `nowrap` ＋ 省略号截断、
 *      且不再钉在容不下全称的 `6em` 上；窄屏（820）另有两段式（类名独占一行）。
 *      **这一条的渲染面终验是真浏览器读数**——`docs/skills/skill-calorie/t523-截断探针.mjs`
 *      在 headless Chrome 里读 `scrollWidth > clientWidth` 的格，判据与本条同向、互不替代。
 */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { buildExerciseDoc, buildExerciseGoalDoc } from '../dist/render/sportDocs.js';
import { buildRecordsDoc } from '../dist/exercise/records.js';

/* ───────────────────────── 一、口径（与 probe.mjs 逐字同源） ───────────────────────── */

const MAXSEG = 40;
const PARALLEL = ['·', '；', ';', '｜', '|', '／', '/', '、', '＋'];
const SENTINEL = '\u0000';
const ENTITIES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'",
  '&nbsp;': ' ', '&middot;': '·', '&hellip;': '…', '&mdash;': '—', '&ndash;': '–',
  '&times;': '×', '&rarr;': '→', '&larr;': '←', '&deg;': '°', '&permil;': '‰',
};
const dec = (s) => s.replace(/&(?:#(\d+)|#x([0-9a-fA-F]+)|[a-zA-Z]+);/g, (m, d, h) => {
  if (d !== undefined) return String.fromCodePoint(Number(d));
  if (h !== undefined) return String.fromCodePoint(parseInt(h, 16));
  return Object.prototype.hasOwnProperty.call(ENTITIES, m.toLowerCase()) ? ENTITIES[m.toLowerCase()] : m;
});
const blank = (m) => m.replace(/[^\n]/g, SENTINEL);

/** 逐字同 probe.mjs 的 `visibleText()`（①②③ 全串级剥壳）。 */
function shellOff(text) {
  return text
    .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, blank)
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/<[^>]*>/g, blank);
}
/** 节点级：哨兵切段，段内含非空白即成节点（与 probe.mjs 一致）。 */
function textNodes(html) {
  return shellOff(html).split(SENTINEL)
    .map((p) => dec(p.replace(/\u0000+/g, ' ')).replace(/\s+/g, ' ').trim())
    .filter((t) => t !== '');
}
/** ≥3 段并列（与 probe.mjs 的 `parallelRun()` 同判）。 */
function parallelRun(text) {
  for (const sep of PARALLEL) {
    if (!text.includes(sep)) continue;
    const parts = text.split(sep);
    let i = 0;
    while (i < parts.length) {
      if (parts[i].trim() === '' || parts[i].trim().length > MAXSEG) { i += 1; continue; }
      let end = i;
      while (end + 1 < parts.length
        && parts[end + 1].trim() !== '' && parts[end + 1].trim().length <= MAXSEG) end += 1;
      if (end - i + 1 >= 3) return { sep, n: end - i + 1, segs: parts.slice(i, end + 1).map((s) => s.trim()) };
      i = end + 1;
    }
  }
  return null;
}
/** 判一处文本节点：返回命中的规则名（空数组＝干净）。 */
function judge(text) {
  const tags = [];
  if (text.includes('·')) tags.push('R1');
  if (text.includes('；')) tags.push('R2');
  if (parallelRun(text) !== null) tags.push('R3');
  return tags;
}
/** 整页读数：逐节点判，返回命中清单（空＝该页零债）。 */
function separatorHits(html) {
  const hits = [];
  for (const t of textNodes(html)) {
    const tags = judge(t);
    if (tags.length > 0) hits.push({ tags, text: t.slice(0, 80) });
  }
  return hits;
}
/** 可见文本整串（行级判据与机器词判据读它）。 */
const visibleAll = (html) => textNodes(html).join('\n');

/* ───────────────────────── 二、夹具（覆盖「脏数」「缺值」「长窗截断」三态） ───────────────────────── */

/** 汇总页入参：消耗用**库内原值**给（`153.60000000000002` 那类），恰是本票要收的脏数。 */
function summaryView(over = {}) {
  const series = [];
  for (let i = 0; i < 120; i += 1) {
    series.push({ date: '2026-0' + (i % 9 + 1) + '-01', exerciseKcal: i % 3 === 0 ? null : 100 + i / 3 });
  }
  return {
    start: '2026-02-27', end: '2026-09-15', activeDays: 46,
    totalBurnedSeries: 32123.4000000000005, avgBurnedPerLoggedDay: 698.3000000000001,
    series,
    review: {
      start: '2026-02-27', end: '2026-09-15', days: 201, sessions: 599, activeDays: 46,
      totalBurned: 32123.4000000000005, totalMinutes: 4385, avgBurnedPerSession: 53.63, avgBurnedPerDay: 159.8,
      byCategory: {
        有氧: { sessions: 240, burned: 21053.499999999985 },
        力量: { sessions: 350, burned: 8431.500000000005 },
      },
      byType: [
        { type: '骑行', sessions: 24, burned: 5702, minutes: 736 },
        { type: '慢跑', sessions: 7, burned: 2240.4000000000004, minutes: 210 },
        { type: '卧推', sessions: 7, burned: 1050, minutes: 175 },
      ],
      estimatedCheck: { reported: 32123.4, estimated: 32123.4, deviationPct: 0 },
    },
    ...over,
  };
}

/** 记录级明细入参：一行缺时长／距离／心率（缺值走 `—`），消耗给脏数。 */
function recordsView(over = {}) {
  return {
    start: '2026-09-13', end: '2026-09-15', sessions: 2, totalBurned: 470.40000000000003,
    totalMinutes: 50, activeDays: 2, category: '有氧', hasNote: null,
    rows: [
      { date: '2026-09-14', type: '户外跑', category: '有氧', minutes: 30, burned: 300.40000000000003, distanceKm: 5, avgHr: null, note: '夜跑' },
      { date: '2026-09-15', type: '步行', category: '有氧', minutes: 20, burned: 170, distanceKm: null, avgHr: 96, note: '' },
    ],
    ...over,
  };
}

/** 对照目标入参（达成态，超额由文字承载）。 */
function goalView(over = {}) {
  return {
    key: 'calorie.view.exercise-goal', start: '2026-09-15', end: '2026-09-15', days: 1,
    dailyGoal: 1250, goalTotal: 1250, actual: 1260.4000000000003, pct: 420, gap: 960.4000000000003, achieved: true,
    ...over,
  };
}

/* ───────────────────────── 三、判据 ───────────────────────── */

const PAGES = [
  ['运动汇总（长窗）', () => buildExerciseDoc(summaryView())],
  ['运动汇总（短窗）', () => buildExerciseDoc(summaryView({
    start: '2026-09-09', end: '2026-09-15', activeDays: 3, totalBurnedSeries: 1200, avgBurnedPerLoggedDay: 400,
    series: [{ date: '2026-09-11', exerciseKcal: 500 }, { date: '2026-09-12', exerciseKcal: null }, { date: '2026-09-15', exerciseKcal: 700 }],
    review: { ...summaryView().review, start: '2026-09-09', end: '2026-09-15', days: 7, sessions: 2, activeDays: 2, totalMinutes: 40, totalBurned: 1200, byCategory: { 有氧: { sessions: 2, burned: 1200 } } },
  }))],
  ['运动汇总（空窗）', () => buildExerciseDoc(summaryView({
    activeDays: 0, totalBurnedSeries: 0, avgBurnedPerLoggedDay: null, series: [],
    review: { start: '2026-09-15', end: '2026-09-15', days: 0, sessions: 0, activeDays: 0, totalBurned: 0, totalMinutes: 0, avgBurnedPerSession: 0, avgBurnedPerDay: 0, byCategory: {}, byType: [], estimatedCheck: { reported: 0, estimated: 0, deviationPct: null } },
  }))],
  ['记录级明细（带筛选）', () => buildRecordsDoc(recordsView())],
  ['记录级明细（无筛选）', () => buildRecordsDoc(recordsView({ category: null, hasNote: true }))],
  ['对照目标（达成）', () => buildExerciseGoalDoc(goalView())],
  ['对照目标（未达成）', () => buildExerciseGoalDoc(goalView({ achieved: false, actual: 290, pct: 23, gap: -960 }))],
  ['对照目标（目标缺席）', () => buildExerciseGoalDoc(goalView({ goalTotal: null, pct: null }))],
];

test('#523 ① 分隔符：三族页面的可见文本零 `·`／`；`／≥3 段并列（节点级）', () => {
  const lines = [];
  let bad = 0;
  for (const [name, build] of PAGES) {
    const hits = separatorHits(build());
    if (hits.length > 0) bad += 1;
    lines.push('T523 SEP ' + name.padEnd(18) + ' 节点级命中=' + hits.length
      + (hits.length === 0 ? '' : '  ' + hits.map((h) => h.tags.join('+') + ':' + h.text).join(' | ')));
  }
  for (const l of lines) console.log(l);
  console.log('T523 SEP-TOTAL 页面=' + PAGES.length + ' 有债页=' + bad + ' 命中合计='
    + PAGES.reduce((a, [, b]) => a + separatorHits(b()).length, 0));
  assert.equal(bad, 0, '有 ' + bad + ' 页仍在可见文本里用 `·`／`；`／多段并列（分隔符＝设计债，#508）');
});

test('#523 ② 文案：零机器词上屏（库表名／常量名／参数名）＋ `<title>`／眉标零 `·`', () => {
  const NAMED = ['exercise_log', 'daily_goal', 'total_changes', 'CALORIE_TODAY', 'calorie.view.'];
  const ROOT = /<div class="wrap ilife-page">/;
  let bad = 0;
  for (const [name, build] of PAGES) {
    const html = build();
    assert.ok(ROOT.test(html), name + ' 不是完整文档（版面根缺失）');
    // 可见面（剥掉属性里的复制载荷）零机器词——复制载荷是机器面，不在判据内。
    const body = html.replace(/data-t="[^"]*"/g, 'data-t="［复制载荷］"');
    const vis = visibleAll(body);
    for (const w of NAMED) {
      if (vis.includes(w)) { bad += 1; console.log('T523 MW ' + name + ' 可见面出现机器词 ' + w); }
    }
    const title = (/<title>([^<]*)<\/title>/.exec(html) ?? [])[1] ?? '';
    const eyebrow = (/<p class="ilife-block-page-shell-eyebrow">([^<]*)<\/p>/.exec(html) ?? [])[1] ?? '';
    assert.ok(title !== '' && !title.includes('·'), name + ' 的 `<title>` 仍是品牌 `·`：' + title);
    if (eyebrow !== '') assert.ok(!eyebrow.includes('·'), name + ' 的眉标仍是 `·` 串：' + eyebrow);
    console.log('T523 HEAD ' + name.padEnd(18) + ' title=' + title + ' eyebrow=' + eyebrow);
  }
  assert.equal(bad, 0, '有 ' + bad + ' 处机器词上屏');
});

test('#523 ③ 取整：页上不出现 ≥6 位小数（库内原值只许在复制载荷里）', () => {
  const DIRTY = /\d+\.\d{6,}/g;
  let bad = 0;
  for (const [name, build] of PAGES) {
    const body = build().replace(/data-t="[^"]*"/g, 'data-t=""');
    const vis = visibleAll(body);
    const hit = vis.match(DIRTY);
    if (hit !== null) { bad += hit.length; console.log('T523 DIRTY ' + name + ' ' + [...new Set(hit)].join(' ')); }
  }
  assert.equal(bad, 0, '页上仍有 ' + bad + ' 处 ≥6 位小数（用户第 4 条：文字不能出现不合理）');
});

test('#523 ④ 同一事实一页一处：窗口天数不在页头与表标题上各报一遍', () => {
  const html = buildExerciseDoc(summaryView());
  const vis = visibleAll(html);
  const days201 = (vis.match(/201\s*天/g) ?? []).length;
  const burn = (vis.match(/32123\.4\s*卡/g) ?? []).length;
  console.log('T523 DUP 201天x' + days201 + ' 32123.4卡x' + burn);
  assert.ok(days201 <= 2, '「201 天」在页上出现 ' + days201 + ' 次（窗口天数只许在窗口条与截断口径各一处）');
  assert.ok(burn <= 1, '总消耗数字在页上出现 ' + burn + ' 次（同一数值一页一处）');
});

/* ───────────────────── 三之二、R3 两处硬伤的守卫（视觉复评 R2 靶心） ───────────────────── */

/** 逐列表头档（页上原字）：`<th scope="col" class="ilife-block-data-table-cell-<档>">列名</th>`。 */
function columnAligns(html) {
  const out = new Map();
  for (const m of html.matchAll(/<th scope="col" class="ilife-block-data-table-cell-([a-z]+)">([^<]*)<\/th>/g)) {
    out.set(m[2], m[1]);
  }
  return out;
}
/** 数据行数（只数带 `<td` 的 `<tr>`，表头那一行不计）。 */
function bodyRowCount(html) {
  return (html.match(/<tr>[\s\S]*?<\/tr>/g) ?? []).filter((r) => r.includes('<td ')).length;
}
/** 本族自己的样式段（`exerciseUiCss()` 那一段：认 `sui-window` 这条类名，不拿裸 `<style>` 当判据）。 */
function familyCss(html) {
  const blocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
  const mine = blocks.filter((b) => b.includes('sui-window'));
  assert.equal(mine.length, 1, '读不到本族样式段（含 `sui-window` 的那一段），形制变了要当面红');
  return mine[0];
}
/** 取某条选择器的声明串（扁平扫描；同一段里后出的同名规则并到后面，正好当覆盖读）。 */
function cssRule(css, selector) {
  const decls = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (m[1].split(',').map((s) => s.trim()).includes(selector)) decls.push(m[2].replace(/\s+/g, ' ').trim());
  }
  return decls.join(';');
}

test('#523 ⑤ 记录级明细：四个数值列走公共层 `align:"right"`（右对齐＋等宽数字），文字列留 left', () => {
  const NUM = ['时长', '消耗', '距离', '心率'];
  const TEXT = ['日期', '类型', '分类', '备注'];
  let bad = 0;
  const lines = [];
  for (const [name, build] of PAGES.filter(([n]) => n.startsWith('记录级明细'))) {
    const html = build();
    const cols = columnAligns(html);
    assert.equal(cols.size, 8, name + ' 的八列表头没读全（读到 ' + cols.size + ' 列）');
    for (const c of NUM) {
      if (cols.get(c) !== 'right') { bad += 1; lines.push(name + ' 数值列「' + c + '」档=' + cols.get(c)); }
    }
    for (const c of TEXT) {
      if (cols.get(c) !== 'left') { bad += 1; lines.push(name + ' 文字列「' + c + '」档=' + cols.get(c)); }
    }
    // 每一行的数值格都带同一档（不是只改表头、也不是只改一行）。
    const rows = bodyRowCount(html);
    const right = (html.match(/<td class="ilife-block-data-table-cell-right"/g) ?? []).length;
    const left = (html.match(/<td class="ilife-block-data-table-cell-left"/g) ?? []).length;
    lines.push('T523 COL ' + name.padEnd(18) + ' 数据行=' + rows + ' 数值格=' + right + '（期望 ' + rows * NUM.length
      + '）文字格=' + left + '（期望 ' + rows * TEXT.length + '）');
    if (right !== rows * NUM.length || left !== rows * TEXT.length) bad += 1;
  }
  for (const l of lines) console.log(l);
  assert.equal(bad, 0, '有 ' + bad + ' 处列对齐不达标：数值列必须 cell-right（右对齐＋等宽＋tabular-nums，'
    + '公共层 #507 那条数值列主次的唯一信号），文字列留 cell-left');
});

test('#523 ⑥ 分布条：类名轨不截断（本族页样式段放开 nowrap／ellipsis ＋ 窄屏两段式）', () => {
  const html = buildExerciseDoc(summaryView());
  const css = familyCss(html);
  const nameDecl = cssRule(css, '.ilife-page .ilife-block-dist-row-name');
  const rowDecl = cssRule(css, '.ilife-page .ilife-block-dist-row');
  const narrow = cssRule(css, '.ilife-page .ilife-block-dist-row-bar');
  console.log('T523 DIST 类名声明=' + nameDecl);
  console.log('T523 DIST 轨声明=' + rowDecl.slice(0, 120));
  // 公共层给的是 `minmax(0,6em)` ＋ `nowrap` ＋ `text-overflow:ellipsis`（超长类名被悄悄截断）。
  assert.ok(!/white-space:\s*nowrap/.test(nameDecl), '分布条类名轨仍是 nowrap（长类名会被截断）：' + nameDecl);
  assert.ok(/white-space:\s*normal/.test(nameDecl), '分布条类名轨没放开换行：' + nameDecl);
  assert.ok(/text-overflow:\s*clip/.test(nameDecl), '分布条类名轨没关掉省略号截断：' + nameDecl);
  assert.ok(/overflow:\s*visible/.test(nameDecl), '分布条类名轨仍按 `overflow:hidden` 裁字：' + nameDecl);
  assert.ok(!/6em/.test(rowDecl), '分布条类名轨仍钉在 6em（容不下「把手式蝴蝶机飞鸟」这类全称）：' + rowDecl);
  // 窄屏（820）两段式：类名独占一行、条与数值第二行。
  assert.ok(/grid-row:\s*2/.test(narrow), '窄屏分布条没有两段式（条不在第二行）：' + narrow);
});

/* ───────────────────── 三之三、R4 两处收口的守卫（视觉复评 R3 的三行灰小字／日期复读） ───────────────────── */

/** 口径行（`<p class="ilife-block-caliber">`）逐条文本，按页上顺序。 */
function caliberParas(html) {
  return [...html.matchAll(/<p class="ilife-block-caliber">([\s\S]*?)<\/p>/g)].map((m) => m[1]);
}

test('#523 ⑦ 明细族口径行：三行收一行（页上 1 行，三条事实一条不减，段间由版式承载）', () => {
  const lines = [];
  let bad = 0;
  for (const [name, build] of PAGES.filter(([n]) => n.startsWith('记录级明细'))) {
    const html = build();
    const paras = caliberParas(html);
    // 带筛选的页＝收口后的「条数＋消耗」一行 ＋「筛选口径」一行；无筛选的页＝只有收口后那一行。
    const merged = paras.filter((t) => t.includes('口径：条数'));
    const filter = paras.filter((t) => t.includes('筛选口径'));
    lines.push('T523 CAL ' + name.padEnd(18) + ' 口径行=' + paras.length + '（收口行 ' + merged.length
      + '／筛选行 ' + filter.length + '）');
    if (merged.length !== 1) bad += 1;
    // 三条事实一条都不许丢：条数口径 ＋ 消耗口径 同住收口那一行；筛选口径在它自己那一行。
    const row = merged[0] ?? '';
    if (!row.includes('条数＝本窗内未删除的运动记录') || !row.includes('消耗＝记录行上报值合计，不按天摊')) bad += 1;
    if (name === '记录级明细（带筛选）' && filter.length !== 1) bad += 1;
    // 收口那一行的可见文本里不许出现竖线字符本身（分隔由版式承担，不是拿字符当分隔）。
    if (/[｜|]/.test(visibleAll(html))) bad += 1;
  }
  for (const l of lines) console.log(l);
  assert.equal(bad, 0, '明细族口径行不是「三行收一行」：收口行必须恰好 1 行且三条事实齐（视觉复评 R3 的连排灰小字打回项）');
});

/** 某张卡（`<section id="…">…</section>`）的整段 HTML，本件自己数（不借别的测试件的夹具）。 */
function cardOf(html, id) {
  return (new RegExp('<section id="' + id + '">[\\s\\S]*?</section>').exec(html) ?? [])[0] ?? '';
}

test('#523 ⑧ 明细族来源脚注：有表时只剩「数据来源」（窗口／记录数两格已撤）；空态仍报「共 0 条」', () => {
  const lines = [];
  let bad = 0;
  for (const [name, build] of PAGES.filter(([n]) => n.startsWith('记录级明细'))) {
    const html = build();
    const card = cardOf(html, 'sec-source');
    assert.notEqual(card, '', name + ' 缺来源卡（sec-source）');
    const keys = [...card.matchAll(/<span class="sui-fact-k">([^<]*)<\/span>/g)].map((m) => m[1]);
    lines.push('T523 SRC ' + name.padEnd(18) + ' 脚注键=' + JSON.stringify(keys));
    // R5 打回项 G2：脚注原来还有「记录数 共 N 条」一格——读数卡与表标题已各报一处，脚注是第三遍。
    assert.deepEqual(keys, ['数据来源'], name + ' 来源脚注的格不是只剩「数据来源」：' + JSON.stringify(keys));
    // 撤的是落点、不是事实：日期仍在页头窗口条与窗口卡两处；条数仍在读数卡与表标题两处。
    assert.ok(html.includes('2026-09-13') && html.includes('2026-09-15'), name + ' 撤了脚注那两格后页上找不到日期');
    const vis = visibleAll(html);
    assert.ok((vis.match(/共 2 条/g) ?? []).length >= 1, name + ' 撤了脚注的条数格后，页上找不到条数（读数卡／表标题都不报）');
    if (!/共 2 条/.test(cardOf(html, 'sec-table'))) bad += 1;
  }
  for (const l of lines) console.log(l);
  assert.equal(bad, 0, '条数从表标题里丢了（脚注撤格不等于删事实）');
  // 例外那一格：本页没有表（空态）时脚注仍报「共 0 条」——#451 的空态判据读的正是这一句，
  // 而空态页上没有表标题可承载条数（撤格只撤有表时的第三遍，不是把空态的唯一那句也撤了）。
  const emptyHtml = buildRecordsDoc({
    start: '2026-09-13', end: '2026-09-13', rows: [], sessions: 0,
    totalBurned: 0, totalMinutes: null, activeDays: 0, category: null, hasNote: null,
  });
  const emptyKeys = [...cardOf(emptyHtml, 'sec-source').matchAll(/<span class="sui-fact-k">([^<]*)<\/span>/g)].map((m) => m[1]);
  console.log('T523 SRC 空态 脚注键=' + JSON.stringify(emptyKeys) + ' 「共 0 条」=' + emptyHtml.includes('共 0 条'));
  assert.deepEqual(emptyKeys, ['数据来源', '记录数'], '空态的脚注丢了条数格（#451 空态判据「0 条也要报」）：' + JSON.stringify(emptyKeys));
  assert.ok(emptyHtml.includes('共 0 条'), '空态页上读不到「共 0 条」');
});

/* ───────────── 三之四、R5 打回项的守卫（终审席 P1-1／P2-7／P2-8，票 #523） ───────────── */

/** 某张卡里数据格的「标签 ＋ 文本」清单（`<td … data-label="…">值</td>`，与页面同序）。 */
function cellsOf(card) {
  return [...card.matchAll(/<td[^>]*data-label="([^"]*)">([^<]*)<\/td>/g)].map((m) => ({ label: m[1], text: m[2] }));
}

test('#523 ⑨ 窗口节＝只读展示形状（无输入控件；两枚日期都在文本流里，复制得到）', () => {
  const lines = [];
  let bad = 0;
  for (const [name, build] of PAGES.filter(([n]) => n.startsWith('记录级明细'))) {
    const html = build();
    const sec = cardOf(html, 'sec-window');
    assert.notEqual(sec, '', name + ' 缺窗口节（sec-window）');
    // ① 只读：只读页上不许出现写页的入参控件（真 `<input>`／`<textarea>`／`<select>`）。
    const controls = (sec.match(/<(input|textarea|select)\b/g) ?? []).length;
    // ② 日期在文本流里：节点级可见文本（属性里的 `value` 不算）必须读到窗口起止两个日期。
    const secText = visibleAll(sec);
    const dates = secText.match(/\d{4}-\d{2}-\d{2}/g) ?? [];
    const keys = [...sec.matchAll(/<span class="sui-fact-k">([^<]*)<\/span>/g)].map((m) => m[1]);
    lines.push('T523 WIN ' + name.padEnd(18) + ' 控件=' + controls + ' 节内文本日期=' + JSON.stringify(dates)
      + ' 键=' + JSON.stringify(keys) + ' 带写页表单类=' + /param-form/.test(sec));
    if (controls !== 0 || dates.length === 0) bad += 1;
    if (/param-form/.test(sec)) bad += 1;
    // 起止两天必须都读到（夹具是 2026-09-13 → 2026-09-15 的区间窗）。
    for (const d of ['2026-09-13', '2026-09-15']) {
      if (!dates.includes(d)) { bad += 1; lines.push('  日期缺：' + d); }
    }
  }
  for (const l of lines) console.log(l);
  assert.equal(bad, 0, '窗口节仍是可改的入参控件，或窗口日期仍不在文本流里（终审席 P1-1：只读事实就要只读形状）');
});

test('#523 ⑩ 汇总页两处一处：表题不复读窗口天数；表内数值带单位（与分布条同一写法）', () => {
  const lines = [];
  let bad = 0;
  // 长窗（逐日行 120 条 > 上限 100，触发截断）：天数只在页头窗口条与截断明示那一句；表题收成「按日消耗」。
  const long = buildExerciseDoc(summaryView());
  const cutDays = summaryView().series.length; // 截断口径里的「本窗共 N 天」＝逐日行数（夹具 120）
  const longCap = (/<caption class="ilife-block-data-table-caption">([^<]*)<\/caption>/.exec(cardOf(long, 'sec-series')) ?? [])[1] ?? '';
  const longVis = visibleAll(long);
  const daysLong = (longVis.match(/201\s*天/g) ?? []).length;
  lines.push('T523 DAY 长窗 表题=' + JSON.stringify(longCap) + ' 「201 天」=' + daysLong + ' 处'
    + ' 截断句带本窗天数=' + longVis.includes('本窗共 ' + cutDays + ' 天')
    + ' 截断句带上限=' + longVis.includes('显示最近 100 天'));
  assert.equal(longCap, '按日消耗', '长窗表题仍复读窗口天数（终审席 P2-8）：' + longCap);
  if (daysLong > 1) bad += 1; // 天数只住页头窗口条那一颗胶囊（截断句报的是逐日行数，不是窗口天数）
  if (!longVis.includes('本窗共 ' + cutDays + ' 天')) bad += 1; // 截断三数仍在同一个句子里
  if (!longVis.includes('显示最近 100 天')) bad += 1;

  // 短窗（2 天，不截断）：天数只住页头窗口条那一颗胶囊，页上不再有第二处「本窗共 N 天」。
  const short = buildExerciseDoc(summaryView({
    start: '2026-09-14', end: '2026-09-15', activeDays: 2, totalBurnedSeries: 2500, avgBurnedPerLoggedDay: 1250,
    series: [{ date: '2026-09-14', exerciseKcal: 1250 }, { date: '2026-09-15', exerciseKcal: 1250 }],
    review: {
      ...summaryView().review, start: '2026-09-14', end: '2026-09-15', days: 2, sessions: 10, activeDays: 2,
      totalBurned: 2500, totalMinutes: 300, byCategory: { 有氧: { sessions: 8, burned: 2000 }, 力量: { sessions: 2, burned: 500 } },
    },
  }));
  const shortCap = (/<caption class="ilife-block-data-table-caption">([^<]*)<\/caption>/.exec(cardOf(short, 'sec-series')) ?? [])[1] ?? '';
  const shortVis = visibleAll(short);
  lines.push('T523 DAY 短窗 表题=' + JSON.stringify(shortCap) + ' 「本窗共」出现=' + shortVis.includes('本窗共')
    + ' 页头天数胶囊=' + /<span class="sui-days">2 天<\/span>/.test(short));
  assert.equal(shortCap, '按日消耗', '短窗表题仍复读窗口天数：' + shortCap);
  if (shortVis.includes('本窗共')) bad += 1; // 短窗没有截断句，天数只许在页头窗口条
  if (!/<span class="sui-days">2 天<\/span>/.test(short)) bad += 1; // 天数没被删掉，仍在页头

  // 数值带单位：两张表的数值格按列名收尾（次数→次、消耗→卡、时长→分钟；缺值 `—` 除外）。
  const UNITS = [['sec-series', { 消耗: / 卡$/ }], ['sec-type', { 次数: / 次$/, 消耗: / 卡$/, 时长: / 分钟$/ }]];
  for (const [name, html] of [['长窗', long], ['短窗', short]]) {
    for (const [id, labels] of UNITS) {
      const card = cardOf(html, id);
      for (const cell of cellsOf(card)) {
        if (labels[cell.label] === undefined || cell.text === '—') continue;
        if (!labels[cell.label].test(cell.text)) { bad += 1; lines.push('T523 UNIT ' + name + ' ' + id + ' ' + cell.label + '=' + cell.text); }
      }
    }
  }
  const firstBurn = cellsOf(cardOf(short, 'sec-type')).find((c) => c.label === '消耗');
  lines.push('T523 UNIT 类型表首个消耗格=' + JSON.stringify(firstBurn));
  for (const l of lines) console.log(l);
  assert.equal(bad, 0, '汇总页仍有「同一事实两处」或「数值列裸数」（终审席 P2-7／P2-8）');
});


/* ───────────────────────── 四、变异自证（改坏必红／还原必绿） ───────────────────────── */
test('#523 变异：塞回一处 `·` 并列 ⇒ 守卫必红；还原 ⇒ 必绿', () => {
  const clean = buildExerciseDoc(summaryView());
  assert.equal(separatorHits(clean).length, 0, '原样产物应当零命中');

  // 变异①：把 KPI 的 `detail` 塞回 `·` 串（本票整改过的那一处）。
  const mut1 = clean.replace('活跃 46 天', '活跃 46 天 · 有数 46 天');
  assert.notEqual(mut1, clean, '变异①没塞进去（夹具变了）');
  const h1 = separatorHits(mut1);
  assert.ok(h1.length >= 1, '变异①：塞回 `·` 串后守卫没红');

  // 变异②：把口径行塞回 `；` 串（本票整改过的另一处）。
  // #552 去文（用户裁决“口径/来源块消失”——票面判据）：原锚点“消耗＝运动记录上报值合计”已随口径块删，
  // 与本支矛盾，换仍在屏的“按日消耗”作锚点（只换锚点，`；`必红的守卫口径不变）。
  const mut2 = clean.replace('按日消耗', '按日消耗；时长＝分钟；次数＝次');
  assert.notEqual(mut2, clean, '变异②没塞进去（夹具变了）');
  const h2 = separatorHits(mut2);
  assert.ok(h2.length >= 1, '变异②：塞回 `；` 串后守卫没红');

  // 还原：逐文件还原（这里就是原样那一份）⇒ 必绿。
  assert.equal(separatorHits(clean).length, 0, '还原后守卫没绿');
  console.log('T523-MUT 塞`·`=' + h1.length + ' 处命中 塞`；`=' + h2.length + ' 处命中 还原=' + separatorHits(clean).length + ' 处命中');
});

test('#523 变异（R3 两处硬伤）：数值列改回 `left` ⇒ ⑤ 必红；类名轨改回 `6em+nowrap` ⇒ ⑥ 必红；还原 ⇒ 必绿', () => {
  /** ⑤ 的判定（与上面那条同口径：四列在表头与每一行都必须是 `cell-right`）。 */
  const numericOk = (html) => {
    const cols = columnAligns(html);
    return ['时长', '消耗', '距离', '心率'].every((c) => cols.get(c) === 'right')
      && (html.match(/<td class="ilife-block-data-table-cell-right"/g) ?? []).length === bodyRowCount(html) * 4;
  };
  /** ⑥ 的判定（与上面那条同口径：类名轨放开换行、不再拿省略号裁字）。 */
  const distOk = (html) => {
    const decl = cssRule(familyCss(html), '.ilife-page .ilife-block-dist-row-name');
    return /white-space:\s*normal/.test(decl) && !/nowrap/.test(decl) && /text-overflow:\s*clip/.test(decl);
  };

  const cleanRec = buildRecordsDoc(recordsView());
  const cleanSum = buildExerciseDoc(summaryView());
  assert.equal(numericOk(cleanRec), true, '原样产物：明细表数值列应当达标');
  assert.equal(distOk(cleanSum), true, '原样产物：分布条类名轨应当达标');

  // 变异①：数值列整列退回 `left`（视觉复评 R2 硬伤① 的原状）。
  const mutA = cleanRec.replaceAll('ilife-block-data-table-cell-right', 'ilife-block-data-table-cell-left');
  assert.notEqual(mutA, cleanRec, '变异①没塞进去（夹具变了）');
  assert.equal(numericOk(mutA), false, '变异①：数值列改回 left 后守卫没红');

  // 变异②：类名轨退回公共层原样（`6em` ＋ `nowrap` ＋ 省略号，视觉复评 R2 硬伤② 的原状）。
  const mutB = cleanSum.replace(
    '.ilife-page .ilife-block-dist-row-name{overflow:visible;text-overflow:clip;white-space:normal;overflow-wrap:anywhere}',
    '.ilife-page .ilife-block-dist-row-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}');
  assert.notEqual(mutB, cleanSum, '变异②没塞进去（夹具变了）');
  assert.equal(distOk(mutB), false, '变异②：类名轨改回 6em＋nowrap 后守卫没红');

  // 还原：原样那两份 ⇒ 必绿。
  assert.equal(numericOk(cleanRec) && distOk(cleanSum), true, '还原后守卫没绿');
  console.log('T523-MUT2 数值列改回left→' + numericOk(mutA) + ' 类名轨改回6em+nowrap→' + distOk(mutB)
    + ' 还原→' + (numericOk(cleanRec) && distOk(cleanSum)));
});

test('#523 变异（R5 三处）：窗口节塞回 `<input>` ⇒ ⑨ 必红；表题塞回窗口天数 ／ 数值列退回裸数 ⇒ ⑩ 必红；还原 ⇒ 必绿', () => {
  /** ⑨ 的判定（与上面那条同口径：只读形状、日期在文本流里）。 */
  const winOk = (sec) => (sec.match(/<(input|textarea|select)\b/g) ?? []).length === 0
    && new Set(visibleAll(sec).match(/\d{4}-\d{2}-\d{2}/g) ?? []).size >= 2
    && !/param-form/.test(sec);
  /** ⑩ 的判定：表题不带天数 ＋ 三个数值列都带单位（`—` 是缺值写法，不算裸数）。 */
  const capOf = (html) => (/<caption class="ilife-block-data-table-caption">([^<]*)<\/caption>/.exec(cardOf(html, 'sec-series')) ?? [])[1] ?? '';
  const UNIT_RE = { 次数: / 次$/, 消耗: / 卡$/, 时长: / 分钟$/ };
  const unitOk = (html) => ['sec-type', 'sec-series'].every((id) => cellsOf(cardOf(html, id))
    .filter((c) => UNIT_RE[c.label] !== undefined && c.text !== '—')
    .every((c) => UNIT_RE[c.label].test(c.text)));

  const cleanRec = buildRecordsDoc(recordsView());
  const cleanSum = buildExerciseDoc(summaryView());
  assert.equal(winOk(cardOf(cleanRec, 'sec-window')), true, '原样产物：窗口节应当是只读形状且带两个日期');
  assert.equal(capOf(cleanSum) === '按日消耗' && unitOk(cleanSum), true, '原样产物：表题不该带天数、消耗格该带单位');

  // 变异①：窗口节塞回写页的入参控件（P1-1 的原状）。
  const mutA = cleanRec.replace(
    '<div class="sui-facts">',
    '<input class="ilife-block-param-form-input" name="start" value="2026-09-13" /><div class="sui-facts">');
  assert.notEqual(mutA, cleanRec, '变异①没塞进去（夹具变了）');
  assert.equal(winOk(cardOf(mutA, 'sec-window')), false, '变异①：窗口节塞回 input 后守卫没红');

  // 变异②：表题塞回窗口天数（P2-8 的原状）。
  const mutB = cleanSum.replace('<caption class="ilife-block-data-table-caption">按日消耗</caption>',
    '<caption class="ilife-block-data-table-caption">按日消耗（本窗共 201 天）</caption>');
  assert.notEqual(mutB, cleanSum, '变异②没塞进去（夹具变了）');
  assert.equal(capOf(mutB) === '按日消耗', false, '变异②：表题塞回天数后守卫没红');

  // 变异③：类型表的消耗格退回裸数（P2-7 的原状）。靶心钉在表格单元格上——
  // 同一个数在分布条里也带单位（那里先出现），只换分布条那处不算本条的靶。
  const mutC = cleanSum.replace('data-label="消耗">5702 卡<', 'data-label="消耗">5702<');
  assert.notEqual(mutC, cleanSum, '变异③没塞进去（夹具变了）');
  assert.equal(unitOk(mutC), false, '变异③：消耗格退回裸数后守卫没红');

  // 还原：原样那两份 ⇒ 必绿。
  assert.equal(winOk(cardOf(cleanRec, 'sec-window')) && capOf(cleanSum) === '按日消耗' && unitOk(cleanSum), true,
    '还原后守卫没绿');
  console.log('T523-MUT3 窗口塞input→' + winOk(cardOf(mutA, 'sec-window')) + ' 表题塞天数→' + (capOf(mutB) === '按日消耗')
    + ' 数值退回裸数→' + unitOk(mutC) + ' 还原→' + (winOk(cardOf(cleanRec, 'sec-window')) && unitOk(cleanSum)));
});
