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
