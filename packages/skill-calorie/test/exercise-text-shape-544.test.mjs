/** #544 · 运动族 9 页「文本形状」守卫：分隔符＝设计债（#508 口径）＋ 机器词零上屏 ＋ 显示层取整。
 *
 * 判据与口径**逐字同源** `.scratch/sep-audit/probe.mjs`（#508 立规票的探针，本件按它复述，不另立一套）：
 *   R1 可见文本含 `·`(U+00B7)；R2 含 `；`(U+FF1B)；
 *   R3 ≥3 段并列：以**同一个**并列分隔符切开后，连续 ≥3 个非空片段、且每段 ≤40 字。
 *   并列分隔符集＝`· ； ; ｜ | ／ / 、 ＋`；`，。：~ → ＝` 不算（免得把散文误判）。
 * 可见文本＝剥 `<style>`／`<script>`／注释／全部标签／解实体；属性里的复制载荷与命令原文**不算**。
 *
 * 覆盖的五支（本票 9 页只有这五种页形，复盘五窗同版，其余只是窗口不同）：
 *   ① 类型分布 `buildDistributionDoc` ② 力量 `buildStrengthDoc` ③ 有氧 `buildCardioDoc`
 *   ④ 复盘 `buildRecapDoc` ⑤ 趋势 `buildTrendDoc`（全在 `src/render/sportPortDocs.ts`）。
 *
 * 变异自证（本件末节，读数逐条打 `T544-MUT`）：往产物里塞一处 `·`／一处 `；` 并列 ⇒ 守卫**必红**；
 * 逐文件还原 ⇒ **必绿**。两行都**先 `pnpm build` 再跑**（判据读 `dist/`，不编译则读数无效）。
 *
 * 注：哨兵用转义写法（字面 NUL 会让部分工具判二进制，行为与 probe.mjs 的同长度哨兵一致）。
 */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  buildCardioDoc,
  buildDistributionDoc,
  buildRecapDoc,
  buildStrengthDoc,
  buildTrendDoc,
} from '../dist/render/sportPortDocs.js';
import { configTestBase } from './helpers/config-test.mjs';

// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

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
const NULRE = new RegExp('[^\\n]', 'g');
const blank = (m) => m.replace(NULRE, SENTINEL);

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
    .map((p) => dec(p.split(SENTINEL).join(' ')).replace(/\s+/g, ' ').trim())
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

/* ───────────────────────── 二、夹具（覆盖「脏数」「缺值」「空窗」三态） ───────────────────────── */

/** 数字故意给库内浮点尘（`…00003` 那类）：显示层必须收到取整后的一位小数，页上不许见 ≥6 位。 */
function strengthView(over = {}) {
  return {
    start: '2026-09-09', end: '2026-09-15',
    rows: [
      { date: '2026-09-14', time: null, type: '卧推', minutes: 25, burned: 150, category: '力量', distanceKm: null, avgHr: null, loadKg: 60, reps: 10, setIndex: 1, note: '' },
      { date: '2026-09-15', time: null, type: '卧推', minutes: 25, burned: 150, category: '力量', distanceKm: null, avgHr: null, loadKg: 60, reps: 10, setIndex: 2, note: '' },
    ],
    movementCount: 1, totalSets: 2,
    totalVolumeKg: 1200.4000000000003, totalReps: 20,
    byMovement: [{ movement: '卧推', sets: 2, volumeKg: 1200.4000000000003, reps: 20 }],
    trail: [
      { date: '2026-09-14', volumeKg: 600.2000000000002 },
      { date: '2026-09-15', volumeKg: 600.2000000000002 },
    ],
    ...over,
  };
}

function cardioView(over = {}) {
  return {
    start: '2026-09-09', end: '2026-09-15',
    rows: [
      { date: '2026-09-14', time: null, type: '户外跑', minutes: 30, burned: 300, category: '有氧', distanceKm: 5, avgHr: null, loadKg: null, reps: null, setIndex: null, note: '夜跑' },
      { date: '2026-09-15', time: null, type: '室内单车', minutes: 15, burned: 120, category: '有氧', distanceKm: null, avgHr: null, loadKg: null, reps: null, setIndex: null, note: '' },
    ],
    sessions: 2, totalMinutes: 45, totalDistanceKm: 5,
    avgPaceMinPerKm: 9.000000000000002,
    byType: [
      { type: '户外跑', sessions: 1, minutes: 30, distanceKm: 5, paceMinPerKm: 6 },
      { type: '室内单车', sessions: 1, minutes: 15, distanceKm: null, paceMinPerKm: null },
    ],
    ...over,
  };
}

function distributionView(over = {}) {
  return {
    start: '2026-09-09', end: '2026-09-15', days: 7, activeDays: 4, sessions: 20,
    totalBurned: 5000.300000000001,
    buckets: [
      { category: '力量', sessions: 4, burned: 600, minutes: 100, shareByBurned: 12, shareBySessions: 20 },
      { category: '有氧', sessions: 12, burned: 4080.6000000000004, minutes: 420, shareByBurned: 81.6, shareBySessions: 60 },
      { category: '日常', sessions: 4, burned: 320, minutes: 80, shareByBurned: 6.4, shareBySessions: 20 },
    ],
    intakeCal: 1500, tdeeTotal: 17892, deficit: 21392.300000000001,
    ...over,
  };
}

function recapView(over = {}) {
  return {
    start: '2026-09-14', end: '2026-09-15', sessions: 10,
    totalMinutes: 300, totalBurned: 2500.2000000000003, activeDays: 2, days: 2,
    byCategory: [
      { category: '有氧', sessions: 6, burned: 2040.4000000000003 },
      { category: '力量', sessions: 2, burned: 300 },
      { category: '日常', sessions: 2, burned: 160 },
    ],
    top5: [
      { type: '慢跑', sessions: 2, burned: 640 },
      { type: '卧推', sessions: 2, burned: 300 },
      { type: '户外跑', sessions: 2, burned: 600 },
      { type: '步行', sessions: 2, burned: 160 },
      { type: '骑行', sessions: 2, burned: 800 },
    ],
    daily: [
      { date: '2026-09-14', burned: 1250.1000000000004 },
      { date: '2026-09-15', burned: 1250.1000000000004 },
    ],
    summary: '本窗 2 天中共运动 2 天、10 次、累计消耗 2500 卡；有氧类为主（6 次）；最高频为慢跑（2 次）；单日峰值 2026-09-14（1250 卡）。',
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

/* ───────────────────────── 三、判据 ───────────────────────── */

const PAGES = [
  ['类型分布（有数）', () => buildDistributionDoc(distributionView())],
  ['类型分布（空窗）', () => buildDistributionDoc({
    start: '2026-09-14', end: '2026-09-15', days: 2, activeDays: 0, sessions: 0,
    totalBurned: 0, buckets: [], intakeCal: null, tdeeTotal: null, deficit: null,
  })],
  ['力量（有数）', () => buildStrengthDoc(strengthView())],
  ['力量（空窗）', () => buildStrengthDoc({
    start: '2026-09-14', end: '2026-09-15', rows: [], movementCount: 0, totalSets: 0,
    totalVolumeKg: null, totalReps: null, byMovement: [], trail: [],
  })],
  ['有氧（有数）', () => buildCardioDoc(cardioView())],
  ['有氧（空窗）', () => buildCardioDoc({
    start: '2026-09-14', end: '2026-09-15', rows: [], sessions: 0,
    totalMinutes: null, totalDistanceKm: null, avgPaceMinPerKm: null, byType: [],
  })],
  ['复盘（有数）', () => buildRecapDoc(recapView())],
  ['复盘（空窗）', () => buildRecapDoc({
    start: '2026-09-14', end: '2026-09-15', sessions: 0, totalMinutes: null, totalBurned: 0,
    activeDays: 0, days: 2, byCategory: [], top5: [],
    daily: [
      { date: '2026-09-14', burned: null },
      { date: '2026-09-15', burned: null },
    ],
    // 取数层在本窗无记录时给的就是这一句（`buildRecapView` 的空支，逐字照抄）：
    // 显示层不许把它原样印上屏——三个零在核心数字卡各有出处，且这句是一处 `、` 三连并列。
    summary: '本窗 2 天中共运动 0 天、0 次、累计消耗 0 卡。',
  })],
  ['趋势（有数）', () => buildTrendDoc(trendView())],
  ['趋势（空窗）', () => buildTrendDoc({
    start: '2026-09-14', end: '2026-09-15',
    days: [
      { date: '2026-09-14', minutes: null, burned: null, sessions: 0 },
      { date: '2026-09-15', minutes: null, burned: null, sessions: 0 },
    ],
    weekly: [], activeDays: 0, totalMinutes: null, totalBurned: 0, peak: null,
  })],
];

test('#544 ① 分隔符：五支页面的可见文本零 `·`／`；`／≥3 段并列（节点级）', () => {
  const lines = [];
  let bad = 0;
  for (const [name, build] of PAGES) {
    const hits = separatorHits(build());
    if (hits.length > 0) bad += 1;
    lines.push('T544 SEP ' + name.padEnd(18) + ' 节点级命中=' + hits.length
      + (hits.length === 0 ? '' : '  ' + hits.map((h) => h.tags.join('+') + ':' + h.text).join(' | ')));
  }
  for (const l of lines) console.log(l);
  console.log('T544 SEP-TOTAL 页面=' + PAGES.length + ' 有债页=' + bad + ' 命中合计='
    + PAGES.reduce((a, [, b]) => a + separatorHits(b()).length, 0));
  assert.equal(bad, 0, '有 ' + bad + ' 页仍在可见文本里用 `·`／`；`／多段并列（分隔符＝设计债，#508）');
});

test('#544 ② 文案：零机器词上屏（库表名／常量名／参数名）＋ `<title>`／眉标零 `·`', () => {
  const NAMED = ['exercise_log', 'daily_goal', 'total_changes', 'CALORIE_TODAY', 'calorie.view.'];
  const ROOT = /<div class="wrap ilife-page/;
  let bad = 0;
  for (const [name, build] of PAGES) {
    const html = build();
    assert.ok(ROOT.test(html), name + ' 不是完整文档（版面根缺失）');
    // 可见面（剥掉属性里的复制载荷）零机器词——复制载荷是机器面，不在判据内。
    const body = html.replace(/data-t="[^"]*"/g, 'data-t="［复制载荷］"');
    const vis = visibleAll(body);
    for (const w of NAMED) {
      if (vis.includes(w)) { bad += 1; console.log('T544 MW ' + name + ' 可见面出现机器词 ' + w); }
    }
    const title = (/<title>([^<]*)<\/title>/.exec(html) ?? [])[1] ?? '';
    const eyebrow = (/<p class="ilife-block-page-shell-eyebrow">([^<]*)<\/p>/.exec(html) ?? [])[1] ?? '';
    assert.ok(title !== '' && !title.includes('·'), name + ' 的 `<title>` 仍是品牌 `·`：' + title);
    if (eyebrow !== '') assert.ok(!eyebrow.includes('·'), name + ' 的眉标仍是 `·` 串：' + eyebrow);
    console.log('T544 HEAD ' + name.padEnd(18) + ' title=' + title + ' eyebrow=' + eyebrow);
  }
  assert.equal(bad, 0, '有 ' + bad + ' 处机器词上屏');
});

test('#544 ③ 取整：页上不出现 ≥6 位小数（库内原值只许在复制载荷里）', () => {
  const DIRTY = /\d+\.\d{6,}/g;
  let bad = 0;
  for (const [name, build] of PAGES) {
    const body = build().replace(/data-t="[^"]*"/g, 'data-t=""');
    const vis = visibleAll(body);
    const hit = vis.match(DIRTY);
    if (hit !== null) { bad += hit.length; console.log('T544 DIRTY ' + name + ' ' + [...new Set(hit)].join(' ')); }
  }
  assert.equal(bad, 0, '页上仍有 ' + bad + ' 处 ≥6 位小数（用户第 4 条：文字不能出现不合理）');
});

test('#544 ④ 同一事实一页一处：窗口天数与主角数字不在页上各报三遍', () => {
  // 分布页：窗口天数只许在窗口条胶囊与联动卡各一处；总消耗在 KPI／联动／合计表三处各尽其用
  // （一眼／构成／逐条，上限 3，理由见证据件 §五之二）；复盘页结论句的复述是页眼，单列不断言。
  const dist = visibleAll(buildDistributionDoc(distributionView()));
  const days7 = (dist.match(/7\s*天/g) ?? []).length;
  const burn = (dist.match(/5000\.3\s*卡/g) ?? []).length;
  console.log('T544 DUP 7天x' + days7 + ' 5000.3卡x' + burn);
  assert.ok(days7 <= 2, '「7 天」在页上出现 ' + days7 + ' 次（窗口天数只许在窗口条与联动卡各一处）');
  assert.ok(burn <= 3, '总消耗数字在页上出现 ' + burn + ' 次（一眼／构成／逐条三处封顶）');
});

/* ───────────────────────── 四、空窗那一句的三连零（显示层承接） ───────────────────────── */

test('#544 ⑤ 空窗复盘不印取数层那句三连零：结论条不占位，空态引导承接', () => {
  // 取数层 `buildRecapView` 在本窗无记录时给的是「本窗 N 天中共运动 0 天、0 次、累计消耗 0 卡。」
  // ——三个零在核心数字卡各有出处（这一页已有「频次 0 次」「总消耗 —」「覆盖分类 0 类」），
  // 原样上屏既是冗余，也是一处 `、` 三连并列（#508 的 R3 债）。显示层不许把它印上屏。
  const build = PAGES.find(([n]) => n === '复盘（空窗）')[1];
  const html = build();
  const vis = visibleAll(html);
  const zeroTriple = vis.includes('共运动 0 天');
  const hasConclusion = html.includes('id="sec-conclusion"');
  console.log('T544 EMPTY 三连零上屏=' + (zeroTriple ? 1 : 0) + ' 结论条占位=' + (hasConclusion ? 1 : 0)
    + ' 空态引导=' + (html.includes('ilife-block-empty-block') ? 1 : 0));
  assert.equal(zeroTriple, false, '空窗把取数层那句三连零印上了屏：' + vis.split('\n').find((l) => l.includes('共运动')) );
  assert.equal(hasConclusion, false, '空窗仍占着结论条的位置（空窗的交代归空态引导块）');
  assert.ok(html.includes('ilife-block-empty-block'), '空窗缺空态引导块');
  assert.ok(vis.includes('说「记运动」'), '空窗缺下一句话');
});

/* ───────────────────────── 五、视觉第 1 轮整改的三条判据 ───────────────────────── */

/** 抽一个区块（`<section id="<锚点>">` 到下一个**卡锚点**之前；卡内还有自己的 `<section class=…>`，不能按它切）。 */
function cardOf(html, anchor) {
  const a = html.indexOf('<section id="' + anchor + '"');
  if (a === -1) return '';
  const b = html.indexOf('<section id="', a + 10);
  return html.slice(a, b === -1 ? a + 30000 : b);
}

test('#544 ⑥ 折线纵轴：刻度 3 条在；全等序列不贴底（视觉第 1 轮整改）', () => {
  // 共享层折线**缺省不给刻度标注**（`yTicks` 缺省 → 0 条），本族三张折线都要显式给 3 条
  // （同族先例：`analysis-deficit-385` 把这条定成「本页漏传参数」）。
  const cases = [
    ['力量（重量轨迹）', buildStrengthDoc(strengthView()), 'sec-chart'],
    ['复盘（每日消耗）', buildRecapDoc(recapView()), 'sec-daily'],
    ['趋势（消耗＋时长）', buildTrendDoc(trendView()), 'sec-line'],
  ];
  let bad = 0;
  for (const [name, html, anchor] of cases) {
    const card = cardOf(html, anchor);
    const ticks = (card.match(/<text class="ilife-charts-tick"/g) ?? []).length;
    if (ticks !== 3) { bad += 1; console.log('T544 AXIS ' + name + ' 纵轴刻度条数=' + ticks); }
    else console.log('T544 AXIS ' + name + ' 纵轴刻度=3 条');
  }
  assert.equal(bad, 0, '有 ' + bad + ' 张折线没有 3 条纵轴刻度（读不出量级）');

  // 全等序列（本窗每天都同值）不许贴着底边画：`domainOf` 缺省会把 hi 抬成 lo+1，
  // 值只占 0.06/1.12 ⇒ 线落在图底 5% 处，看着像「满量程画成了零」。
  const recap = buildRecapDoc(recapView());          // 夹具两天都是 1250.1 卡
  const daily = cardOf(recap, 'sec-daily');
  const box = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(daily);
  const path = /<path class="ilife-charts-line[^"]*" d="([^"]+)"/.exec(daily);
  assert.ok(box !== null && path !== null, '复盘折线没有 SVG 或路径');
  const H = Number(box[2]);
  const ys = [...path[1].matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map((m) => Number(m[2]));
  assert.ok(ys.length >= 2, '折线路径点数不足：' + path[1]);
  const ratio = Math.min(...ys) / H;                  // 越接近 1 越靠底
  console.log('T544 AXIS 全等序列线位=' + ratio.toFixed(3) + '（图中=0.25~0.75，贴底>0.9）');
  assert.ok(ratio > 0.2 && ratio < 0.8, '全等序列的线贴在边上（线位比例 ' + ratio.toFixed(3) + '）');
});

test('#544 ⑦ 窄屏页内导航换行铺开（视觉第 1 轮整改）', () => {
  // 共享页框在 ≤640 把胶囊轨切成横滑（滚动条还被藏），390 档第 5、6 枚胶囊被拦腰切断且无滚动提示；
  // 本族在**自己的页内样式段**改回换行（不碰共用层）。
  const html = buildRecapDoc(recapView());
  assert.ok(html.includes('@media (max-width:820px){.ilife-page .ilife-block-toc{flex-wrap:wrap;overflow-x:visible}'),
    '窄屏导航没有改回换行铺开的页级规则');
  assert.ok(/\.ilife-page \.ilife-block-toc a\{flex:0 1 auto\}/.test(html),
    '窄屏导航胶囊没有跟着允许收缩');
  console.log('T544 TOC 窄屏换行规则=在');
});

/* ───────────────────────── 六、终审席（票 #268）打回项的四条判据 ───────────────────────── */

/** 长窗夹具（复盘五窗与趋势共用形状）：逐日表 120 天、每天 500 卡（全等——刻度与线位都吃满这条）。 */
function longDaily(over = {}) {
  const out = [];
  for (let i = 0; i < 120; i += 1) {
    out.push({ date: new Date(Date.parse('2026-12-31T12:00:00Z') - (119 - i) * 86400000).toISOString().slice(0, 10), burned: 500, minutes: 30, sessions: 1 });
  }
  return out;
}
const LONG_DAILY = longDaily();
function longRecapView(over = {}) {
  return recapView({
    start: LONG_DAILY[0].date, end: LONG_DAILY[LONG_DAILY.length - 1].date,
    sessions: 120, activeDays: 120, days: 120, daily: LONG_DAILY, ...over,
  });
}
function longTrendView(over = {}) {
  return trendView({
    start: LONG_DAILY[0].date, end: LONG_DAILY[LONG_DAILY.length - 1].date,
    days: LONG_DAILY.map((d) => ({ date: d.date, minutes: d.minutes, burned: d.burned, sessions: d.sessions })),
    activeDays: 120, totalMinutes: 3600, totalBurned: 60000,
    peak: { date: LONG_DAILY[0].date, burned: 500 }, ...over,
  });
}

test('#268 ① 纵轴刻度：最小刻度是 0（不印负数）；三条刻度都是整数（K2／P1-5）', () => {
  // 终审席 §4 P1-5：38／39 两页纵轴最低刻度印出过 `-87.4`（「消耗了多少卡」出现负数）；
  // §5 K2：37 页印过 `31.4／1118.0／2204.5` 这类带 `.0`／`.5` 尾巴的刻度。
  const cases = [
    ['复盘（长窗，全等）', buildRecapDoc(longRecapView()), 'sec-daily'],
    ['趋势（长窗，全等）', buildTrendDoc(longTrendView()), 'sec-line'],
    ['力量（等值序列）', buildStrengthDoc(strengthView()), 'sec-chart'],
    ['复盘（两日窗）', buildRecapDoc(recapView()), 'sec-daily'],
  ];
  for (const [name, html, anchor] of cases) {
    const card = cardOf(html, anchor);
    const ticks = [...card.matchAll(/<text class="ilife-charts-tick"[^>]*>([^<]*)</g)].map((m) => m[1]);
    const nums = ticks.map(Number);
    console.log('T268 AXIS ' + name.padEnd(16) + ' 刻度=' + JSON.stringify(ticks));
    assert.equal(ticks.length, 3, name + ' 纵轴刻度不是 3 条');
    assert.ok(nums.every((v) => Number.isFinite(v)), name + ' 刻度里有非数：' + JSON.stringify(ticks));
    assert.ok(nums[0] === 0, name + ' 纵轴最低刻度不是 0（实印 ' + ticks[0] + '）——负刻度与悬空的零基线都不许');
    assert.ok(nums.every((v) => v >= 0), name + ' 纵轴出现负刻度：' + JSON.stringify(ticks));
    assert.ok(nums.every((v) => Number.isInteger(v)),
      name + ' 刻度带小数尾巴（`31.4`／`2204.5` 那种）：' + JSON.stringify(ticks));
    assert.ok(nums[1] > nums[0] && nums[2] > nums[1], name + ' 刻度没有单调上升：' + JSON.stringify(ticks));
  }
});

test('#268 ② 三节可见标题：核心数字／类型分布／高频运动（P1-6／K6）', () => {
  // 终审席 §4 P1-6：盘族五页只有折线卡有卡题，另外三节在正文里没有任何可见标题。
  for (const [name, html] of [['复盘（两日窗）', buildRecapDoc(recapView())], ['复盘（长窗）', buildRecapDoc(longRecapView())]]) {
    const heads = [...html.matchAll(/<section id="(sec-[a-z]+)"><h2>([^<]+)<\/h2>/g)].map((m) => m[1] + '=' + m[2]);
    console.log('T268 HEAD ' + name.padEnd(12) + ' ' + heads.join(' '));
    for (const [anchor, text] of [['sec-figures', '核心数字'], ['sec-category', '类型分布'], ['sec-badges', '高频运动']]) {
      assert.ok(heads.includes(anchor + '=' + text), name + ' 的 ' + anchor + ' 缺可见节标题「' + text + '」');
    }
  }
});

test('#268 ③ 参数输入框：页级规则不再把 44px 压下来（E1）', () => {
  // 终审席 §5 E1：本族页级 `min-height:38px` 把 #525 配方给全宽档的 44px 压下来了（九页全是 38px）。
  for (const [name, build] of PAGES) {
    const html = build();
    assert.ok(html.includes('#sec-window .ilife-block-param-form-input{min-height:44px}'),
      name + ' 的页级输入框高度不是 44px（E1 会复现）');
    assert.ok(!html.includes('min-height:38px'), name + ' 仍留着 38px 的页级覆盖');
  }
  console.log('T268 INPUT 页级 min-height=44px 覆盖已撤（9 页同形）');
});

test('#268 ④ KPI 一排四卡同一字号（K1）＋ 细条有下限（K5）', () => {
  // K1：终审席机读 oddFonts —— 一排四卡首卡 28px、其余 22px，混用且基线错开。
  for (const [name, html] of [['分布', buildDistributionDoc(distributionView())],
    ['力量', buildStrengthDoc(strengthView())], ['有氧', buildCardioDoc(cardioView())],
    ['复盘', buildRecapDoc(recapView())], ['趋势', buildTrendDoc(trendView())]]) {
    const kpi = cardOf(html, 'sec-figures');
    assert.ok(!kpi.includes('font-size:28px'), name + ' 页仍留着「首卡放大到 28px」的页级规则');
  }
  assert.ok(!buildRecapDoc(recapView()).includes(':first-child .ilife-block-kpi-card-value'),
    '页级样式段里还留着 KPI 首卡的字号规则');
  console.log('T268 KPI 首卡字号规则=已撤（整排退回公共层 22px）');

  // K5：占比 <1% 的分布条实渲不到 1px，肉眼读成空行／占位残渣。
  const recap = buildRecapDoc(recapView({ byCategory: [
    { category: '力量', sessions: 99, burned: 9900 }, { category: '柔韧', sessions: 1, burned: 100 },
  ], sessions: 100 }));
  assert.ok(recap.includes('.ilife-page .ilife-block-dist-row-fill{min-width:4px}'),
    '分布条缺 4px 下限（占比 <1% 的条会渲染成空行）');
  console.log('T268 BAR 细条下限规则=在（4px）');
});

test('#268 ④b 窄屏长序列：折线卡下方有一条只出内部日期的日期轴（K4）', () => {
  const html = buildRecapDoc(longRecapView());
  const card = cardOf(html, 'sec-daily');
  const ruler = /<div class="sui-xruler"[^>]*>([\s\S]*?)<\/div>/.exec(card);
  assert.ok(ruler !== null, '120 天窗的折线卡没有日期轴（K4：读者看不出点落在哪一天）');
  // 形状：5 个等宽槽（点数能整除 5 时取 4 条，免得有一条正好压在窗口末端），每槽＝一个刻度点（`<i>`）＋一条日期。
  const marks = [...ruler[1].matchAll(/<span class="sui-xruler-t"><i><\/i>([^<]+)<\/span>/g)].map((m) => m[1]);
  console.log('T268 RULER 标注=' + marks.join(' '));
  assert.ok(marks.length === 4 || marks.length === 5, '日期轴的内部日期不是 4／5 条：' + JSON.stringify(marks));
  assert.ok(marks.every((t) => /^\d\d-\d\d$/.test(t)), '日期轴里混进了非日期串：' + JSON.stringify(marks));

  // 首尾两条**不出**：折线自带的首尾横轴标签已经说了窗口的起止（复评 r3 打回项之一：逐字重复）。
  const chart = cardOf(html, 'sec-daily');
  const edgeLabels = [...chart.matchAll(/<text class="ilife-charts-xlabel"[^>]*>([^<]+)</g)].map((m) => m[1]);
  assert.ok(edgeLabels.includes('12-31') && edgeLabels.length >= 2, '折线自己的首尾标签不在了：' + JSON.stringify(edgeLabels));
  assert.ok(!marks.includes(edgeLabels[0]) && !marks.includes(edgeLabels[edgeLabels.length - 1]),
    '日期轴与折线的首尾标签逐字重复：' + JSON.stringify({ marks, edgeLabels }));

  // 等宽槽：`flex:1 1 0` ＋ 最小宽，槽宽＝容器÷5；相邻标签不再挤在一条窄带里（复评 r3 的叠字）。
  assert.ok(html.includes('.sui-xruler-t{position:relative;flex:1 1 0;min-width:26px'), '日期轴缺等宽槽规则');
  assert.ok(html.includes('.sui-xruler{position:relative;display:flex;align-items:flex-start'), '日期轴缺 flex 容器规则');
  // 轴要挂在**卡片内**（复评 r3b 打回项：初版挂在卡外、把卡片下边框顶出去），且左右与绘图区同起同止
  //（复评 r3c 量出右内距写 35px 会短 14.5px ⇒ 右内距＝SVG 盒宽−566 用户单位＝24.4px；再加内距让槽区对齐）。
  assert.ok(html.includes('.sui-xruler{position:relative;display:flex;align-items:flex-start;margin:2px 2.414% 0 10%;'
    + 'padding-left:4%;padding-right:4%}'),
    '日期轴的内距不是按 viewBox 比例给的（写死 px 会在手机档偏 25px）');
  assert.ok(html.includes('class="ilife-block-chart-block-canvas"'), '折线卡缺画布容器');
  const canvasAt = card.indexOf('ilife-block-chart-block-canvas');
  const rulerAt = card.indexOf('<div class="sui-xruler"');
  assert.ok(canvasAt !== -1 && rulerAt > canvasAt, '日期轴没挂在折线卡的画布容器里（会落到卡片外）');
  assert.ok(rulerAt > card.indexOf('</svg>'), '日期轴没落在折线图下方');
  assert.ok(!/<\/section>\s*<div class="sui-xruler"/.test(html), '日期轴落在了卡片外');

  // 短窗不出标尺：两天窗那两条首尾标签本来就够，多点两条反而添乱。
  // （判据认**标记**不认类名——页内样式段里那两条 `.sui-xruler*` 规则一直都在。）
  const RULER_TAG = '<div class="sui-xruler"';
  assert.ok(!buildRecapDoc(recapView()).includes(RULER_TAG), '短窗（2 天）不该出日期轴');
  // 趋势页同一条（长窗出、短窗不出）。
  assert.ok(cardOf(buildTrendDoc(longTrendView()), 'sec-line').includes(RULER_TAG), '趋势长窗缺日期轴');
  assert.ok(!cardOf(buildTrendDoc(trendView()), 'sec-line').includes(RULER_TAG), '趋势短窗不该出日期轴');
});

/* ───────────────────────── 七、变异自证（改坏必红／还原必绿） ───────────────────────── */
test('#544 变异：塞回一处 `·` 并列 ⇒ 守卫必红；还原 ⇒ 必绿', () => {
  const clean = buildRecapDoc(recapView());
  assert.equal(separatorHits(clean).length, 0, '原样产物应当零命中');

  // 变异①：把频次卡的 `detail` 塞回 `·` 串（本票整改过的那一处）。
  const mut1 = clean.replace('活跃 2 天', '活跃 2 天 · 有数 2 天');
  assert.notEqual(mut1, clean, '变异①没塞进去（夹具变了）');
  const h1 = separatorHits(mut1);
  assert.ok(h1.length >= 1, '变异①：塞回 `·` 串后守卫没红');

  // 变异②：把口径行塞回 `；` 串（本票整改过的另一处）。
  const mut2 = clean.replace('时长单位分钟，消耗单位卡', '时长单位分钟；消耗单位卡');
  assert.notEqual(mut2, clean, '变异②没塞进去（夹具变了）');
  const h2 = separatorHits(mut2);
  assert.ok(h2.length >= 1, '变异②：塞回 `；` 串后守卫没红');

  // 还原：逐文件还原（这里就是原样那一份）⇒ 必绿。
  assert.equal(separatorHits(clean).length, 0, '还原后守卫没绿');
  console.log('T544-MUT 塞`·`=' + h1.length + ' 处命中 塞`；`=' + h2.length + ' 处命中 还原=' + separatorHits(clean).length + ' 处命中');
});
