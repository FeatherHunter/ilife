/** #466 交付点（并入 #518 兑现）· `calorieDeficitEta` 降级文案的**量纲一致**。
 *
 *  病根（编排者 2026-09-16 裁定 J 逐字）：
 *    「`calorieDeficitEta` 门槛写『≥14 天**摄入+运动**记录』，读数写『N 天**摄入或运动**记录』
 *      ——前后量纲词 AND／OR 不一致；实施席 ⑤ 只覆盖体重／摄入／营养目标三条路径。」
 *
 *  为什么单立一件（不塞进 `analysis-shape-predict-520.test.mjs` 的 ⑤）：
 *  ⑤ 守的是「门槛词与『当前』读数同一量纲」这条**形状**判据的四条路径（体重／摄入／模拟减重／
 *  营养目标达成），本件补的是 ⑤ 打不到的那两条路径里出问题的一条——**卡路里缺口**
 *  （`calorieDeficitEta`，页 19「摄入预测(卡路里缺口预测)」）。件名带票号，与 #455／#463 两件同形。
 *
 *  本件把「同一量纲」落成**可判真假**的两条：
 *   ① 门槛段的量纲词与读数段的量纲词必须**逐字相等**（AND／OR 混用即红）；
 *   ② 读数＝`series[].deficit` 里**非空**的条数（不是窗口长度，也不是「摄入或运动」那种并集口径——
 *      `deficit` 在 `series.ts:239` 由摄入非空才算出，故它与门槛「摄入+运动」同指一件事）。
 *
 *  运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`，再 node --test 本件。
 */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { shiftISODate } from '../dist/analysis/utils.js';
import { SIM_MIN_DAYS, weightTarget } from '../dist/analysis/simulate.js';
import {
  calorieDeficitEta, calorieGoalEta, calorieStability, calorieForecast,
  weightSimCut, weightSimTarget,
} from '../dist/analysis/simulate2.js';
import {
  buildCalorieDeficitDoc, buildCalorieForecastDoc, buildCalorieGoalDoc, buildCalorieStabilityDoc,
  buildPredictDoc, buildPredictTargetDoc, buildSimCutDoc, buildSimTargetDoc,
} from '../dist/render/trendPredictDocs.js';
import { configTestBase } from './helpers/config-test.mjs';

// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const START = '2026-06-18';

/** 合成日序列：`keep` 天有摄入（`deficit` 随之有值），其余天摄入为空；运动隔日一次。 */
function mkSeries(n, keep) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const has = i < keep;
    const ex = i % 2 === 0 ? 300 : null;
    out.push({
      date: shiftISODate(START, i),
      calories: has ? 1800 : null, protein: null, carbs: null, fat: null,
      sodiumMg: null, sugarG: null, fiberG: null, waterMl: null,
      exerciseKcal: ex,
      weightKg: 75.1, bodyFatPct: null, waistCm: null,
      tdee: 2635, deficit: has ? 1800 + (ex ?? 0) - 1800 : null, calorieGoal: 1800, waterGoal: 2000,
    });
  }
  return out;
}

/** 从 `需要 X,当前只有 Y。` 里取门槛段与读数段（形状与 `analysis-shape-predict-520.test.mjs` ⑤ 同源）。 */
function splitDegrade(msg) {
  const m = /需要 ([^,，]+),当前只有 ([^。]+)。/.exec(msg);
  assert.ok(m, '降级文案形状变了（取不到门槛／当前两段）：' + msg);
  return { need: m[1], have: m[2] };
}

test('#466 卡路里缺口：门槛词与「当前」读数是同一量纲（AND／OR 不许混用）', () => {
  /* 30 天窗口、只有 13 天有摄入记录 ⇒ 必须降级（门槛 SIM_MIN_DAYS=14）。 */
  const series = mkSeries(30, SIM_MIN_DAYS - 1);
  const v = calorieDeficitEta(series, '摄入预测');
  assert.equal(v.degraded, true, '13 天摄入记录必须降级：' + JSON.stringify(v.degradeMsg));

  const { need, have } = splitDegrade(v.degradeMsg);

  /* ① 门槛段的量纲词＝读数段的量纲词（剥掉数字与「≥」后逐字相等）。
   *    改前：门槛「≥14 天摄入+运动记录」／读数「13 天摄入或运动记录」⇒ 两个词不相等，本条即红。 */
  const unitOf = (s) => s.replace(/^[≥\s]*\d+\s*/, '');
  assert.equal(unitOf(need), unitOf(have),
    '门槛与读数不同量纲（改前是 AND／OR 混用）：门槛=' + need + ' 读数=' + have);

  /* ② 读数＝`deficit` 非空条数（不是窗口长度 30；也不是「摄入或运动」那种并集口径）。 */
  const deficitDays = series.filter((d) => d.deficit !== null && d.deficit !== undefined).length;
  assert.equal(deficitDays, SIM_MIN_DAYS - 1, '夹具自证：' + deficitDays + ' 天有缺口读数');
  assert.ok(have.startsWith(deficitDays + ' '), '读数须是实际有效记录条数 ' + deficitDays + '：' + have);
  assert.ok(!have.includes('当前只有 30'), '不许把窗口天数当记录条数报：' + have);
  /* 量纲词里不许同时出现在读段：并集口径（或）与交集口径（+）混用＝本条判的正是那处不一致。 */
  assert.ok(!have.includes('或运动'), '读数不许回退成并集口径「摄入或运动」：' + have);
  assert.match(need, /摄入\+运动/, '门槛词须逐字保留「摄入+运动」这条量纲：' + need);
});

test('#466 卡路里缺口：降级页不落盘（不编读数）＋ 同族另一条路径同为交集口径', () => {
  /* ① 0 天记录：读数 = 0，仍同一量纲（页面侧由取数层阻断，这里只判文案与数值）。 */
  const zero = calorieDeficitEta(mkSeries(30, 0), '摄入预测');
  assert.equal(zero.degraded, true);
  const z = splitDegrade(zero.degradeMsg);
  assert.ok(z.have.startsWith('0 '), '零记录读数须是 0：' + z.have);
  assert.ok(!z.have.includes('30'), '零记录时读数不许是窗口长度：' + z.have);
  assert.equal(z.need.replace(/^[≥\s]*\d+\s*/, ''), z.have.replace(/^[≥\s]*\d+\s*/, ''), '零记录时两段仍须同量纲');

  /* ② 「摄入稳定性」那条路径（同族另一处 `degrade`）：门槛与读数都是**摄入**这一种量纲。 */
  const st = calorieStability(mkSeries(30, SIM_MIN_DAYS - 1), '摄入预测');
  assert.equal(st.degraded, true);
  const s = splitDegrade(st.degradeMsg);
  assert.equal(s.need.replace(/^[≥\s]*\d+\s*/, ''), s.have.replace(/^[≥\s]*\d+\s*/, ''), '稳定性路径两段不同量纲：' + st.degradeMsg);

  /* ③ 装配层用的是同一条口径：`buildCalorieDeficitDoc` 只吃视图字段，不另算天数——页 19 的
   *    KPI／结论句与降级文案因此不可能各说一套（本票 W3 已把该页铺开，这里锁住不回退）。 */
  const html = buildCalorieDeficitDoc({ ...calorieDeficitEta(mkSeries(30, 0), '摄入预测') });
  assert.ok(html.startsWith('<!doctype html>'), '降级视图仍须装配出完整文档');
  assert.ok(html.includes('ilife-block-caliber'), '降级页仍须带口径行（口径不因降级而丢）');
});

/* ── W5 视觉整改（#518）· 页面级三条的机器守卫 ──────────────────────────────────
 *
 *  为什么也住本件：#518 的 W5 派单要求「变异自证」打在**这条判据自己的断言**上（改坏一处 → 相关
 *  断言必红 → 还原必绿）。在按主题分件之后，新增件就是本件；视觉抽查判过的三条症状各落一条断言。
 *  三条的形状化判据（#518 ①②③④）已由 `analysis-shape-predict-520.test.mjs` 守着，这里只补它没盖的：
 *  ① 同卡重复（页 07 缺陷 3）；② 有效位一致（页 01 缺陷 4／页 07 缺陷 5）；③ H1 括号全半角（缺陷 4）。 */

/** 把 renderKpiGrid 区切成逐卡的四槽文本（浅解析：只读 `<div class="ilife-block-kpi-card-<slot>">`）。 */
function cardsOf(html) {
  const seg = html.slice(html.indexOf('<div class="ilife-block-kpi-card-grid">'));
  const body = seg.slice(0, seg.indexOf('</section>'));
  return body.split('<div class="ilife-block ilife-block-kpi-card">').slice(1).map((c) => ({
    label: (c.match(/kpi-card-label">([^<]*)</) ?? [])[1] ?? '',
    value: (c.match(/kpi-card-value">([^<]*)</) ?? [])[1] ?? '',
    detail: (c.match(/kpi-card-detail">([^<]*)</) ?? [])[1] ?? '',
    badge: (c.match(/ilife-status-badge[^>]*>([^<]*)</) ?? [])[1] ?? '',
  }));
}

const series90 = mkSeries(90, 90);
const V20 = weightTarget(series90, 65, '预测体重');
const V01 = {
  start: series90[series90.length - 8].date, end: series90[series90.length - 1].date, horizonDays: 7,
  current: 75.1, ratePerWeek: -0.36, forecastValue: 74.74, forecastLo: 74.69, forecastHi: 74.8,
  insight: '按当前趋势,7 天后体重约 74.74 kg。',
};

test('#518 W5-① 同卡重复：结论词（状态徽标）在同一张卡里只许出现一次', () => {
  /* 改前反例（视觉抽查 §2.2 缺陷 3 原句）：页 07「可行性」卡 `value='超范围'` 与 `badge='超范围'`
   * 同词两处；同族 06／10–13／18／20 同形。断言＝**同一张卡内，徽标文本不得在值或说明里再出现**。
   * 变异（本票自证）：把 `value: '—'` 改回 `value: v.feasible ? '可行' : '超范围'` ⇒ 本条即红。 */
  const pages = [
    ['06 预测体重(自定义目标)', buildPredictTargetDoc(V20)],
    ['07–09 模拟减重(每天-N卡)', buildSimCutDoc(weightSimCut(series90, 300, '模拟减重'))],
    ['10–13 模拟减重(N天减Xkg)', buildSimTargetDoc(weightSimTarget(series90, 6, 90, '模拟减重'))],
    ['18 摄入预测(营养目标达成)', buildCalorieGoalDoc(calorieGoalEta(series90, '摄入预测'))],
    ['20 摄入预测(稳定性)', buildCalorieStabilityDoc(calorieStability(series90, '摄入预测'))],
  ];
  for (const [what, html] of pages) {
    const cards = cardsOf(html);
    assert.ok(cards.length >= 3, what + ' 卡数异常：' + cards.length);
    let sawVerdict = false;
    for (const c of cards) {
      if (c.badge === '') continue;
      sawVerdict = true;
      assert.ok(!c.value.includes(c.badge) && !c.detail.includes(c.badge),
        what + '「' + c.label + '」卡把结论词印了两遍（值=' + c.value + ' 说明=' + c.detail + ' 徽标=' + c.badge + '）');
    }
    assert.ok(sawVerdict, what + ' 没有一张卡挂状态徽标（判定词丢了）：同卡重复这条会退化成空转');
  }
});

test('#518 W5-② 有效位一致：同列／同卡的小数位按语义档统一', () => {
  /* 体重类 1 位、速率类 2 位、卡路里类整数。改前反例：页 01「预计区间」`74.69 至 74.80` 与
   * `74.8` 混排（视觉抽查 §2.1 缺陷 4）；页 07 轨迹列 `75.1` 与 `73.74` 混排（§2.2 缺陷 5）。 */
  const lo = cardsOf(buildPredictDoc(V01)).find((c) => c.label === '预计区间');
  assert.ok(lo, '01「预计区间」卡不见了');
  const dens = [...lo.value.matchAll(/[+-]?\d+\.(\d+)/g)].map((m) => m[1].length);
  assert.ok(dens.length >= 2, '区间里应有两个端点：' + lo.value);
  assert.equal(new Set(dens).size, 1, '01 区间两端有效位不齐：' + lo.value);
  assert.equal(dens[0], 1, '01 区间端点有效位不是 1 位：' + lo.value);

  /* 页 07 的轨迹列：整列只许一种小数位。 */
  const track = buildSimCutDoc(weightSimCut(series90, 300, '模拟减重'));
  const rows = (track.match(/<tbody>([\s\S]*?)<\/tbody>/) ?? [])[1] ?? '';
  const vals = [...rows.matchAll(/data-label="[^"]*">([^<]*)</g)].map((m) => m[1]).filter((_, i) => i % 2 === 1);
  assert.ok(vals.length >= 10, '轨迹表行数异常：' + vals.length);
  const widths = new Set(vals.filter((s) => s.includes('.')).map((s) => s.split('.')[1].length));
  assert.equal(widths.size, 1, '轨迹列里混了 ' + widths.size + ' 种小数位：' + vals.join('／'));
  /* 速率类 2 位（结论句与卡同档）。 */
  const concl = (track.match(/ilife-block-conclusion">([^<]*)</) ?? [])[1] ?? '';
  const rate = /一周大约掉 (\d+\.\d+) kg/.exec(concl);
  assert.ok(rate && rate[1].split('.')[1].length === 2, '结论句速率有效位不是 2 位：' + concl);
});

test('#518 W5-③ 括号一致：同族同层 H1 一律全角中文括号（半角只剩在唤醒词／路由里）', () => {
  /* 改前反例：页 01 H1 全角、页 07／19 半角（视觉抽查 §2.2 缺陷 4／§2.3 缺陷 2）。
   * 变异的**方向**也判：H1 里出现半角 `(` 或 `)` 即红（唤醒词原文不在这条断言面内——它住 routes.ts）。 */
  const pages = [
    ['01–05／23', buildPredictDoc(V01)],
    ['06', buildPredictTargetDoc(V20)],
    ['07–09', buildSimCutDoc(weightSimCut(series90, 300, '模拟减重'))],
    ['10–13', buildSimTargetDoc(weightSimTarget(series90, 6, 90, '模拟减重'))],
    ['14–17', buildCalorieForecastDoc(calorieForecast(series90, 30, '摄入预测'))],
    ['18', buildCalorieGoalDoc(calorieGoalEta(series90, '摄入预测'))],
    ['19', buildCalorieDeficitDoc(calorieDeficitEta(series90, '摄入预测'))],
    ['20', buildCalorieStabilityDoc(calorieStability(series90, '摄入预测'))],
  ];
  for (const [what, html] of pages) {
    const h1 = (html.match(/ilife-block-page-shell-title">([^<]*)</) ?? [])[1] ?? '';
    assert.ok(h1.length > 0, what + ' 没有 H1');
    assert.ok(!h1.includes('(') && !h1.includes(')'), what + ' H1 里还有半角括号：' + h1);
    if (h1.includes('（') || h1.includes('）')) {
      assert.ok(h1.includes('（') && h1.includes('）'), what + ' H1 括号不成对：' + h1);
    }
  }
});

/* ── W6 收尾（#518）· 两条真缺陷 ＋ 一处补齐的机器守卫 ────────────────────────────
 *
 *  出处＝视觉抽查件 `docs/skills/skill-calorie/t518-视觉抽查.md` §9.2／§9.5／§9.6 ＋ W6 派单
 *  `.scratch/t161-plan/dispatch-518-W6.md` §1／§2／§3：
 *   ①【真缺陷 · W5 自己引入的歧义】**值位不许再拿 `—` 顶替**——`—` 在数据页的通行读法是
 *      「缺值／无数据」，被用来表达「该指标不是数值型」即**同符号两义**，且全页最大字号位被空符号占住。
 *      改法＝派单推荐①：判定卡的值位**整格撤掉**，判定词只由徽标承担，空出的位置由 `detail`
 *      补一句人话（不引入新数字）。硬规矩＝**可见文本里的 `—` 只许用于缺值语境**。
 *   ②【真缺陷】**同页同一单位只许一形态**：页 07 表头渲染 `KG`／源码 `kg`／脚注「公斤」三形态。
 *   ③【补齐】轨迹列整数也补 `.0`（页 07「部分修」的尾巴：`71` 与 `72.4` 同列两种字面）。
 *
 *  为什么也住本件：本件的 W5-①／②／③ 就是这三条的同族守卫（那三条守 W5 的动作，本三条守 W6 的收口），
 *  且派单 §1 明示**变异两行**打在新断言上（改坏一处 → 必红 → 逐字节还原 → 必绿）。
 *  覆盖面＝本件能直调的全部预测族／缺口族装配件（01–20 ＋ 23 ＋ 目标预测达成）；21／22 两份别名页
 *  由 `buildDeficitDoc` 出、口径与产物级读数见 `t518-W6-收尾-证据.md` §三 的逐页核过表。 */

/** 可见文本（口径与 `scripts/audit-separators.mjs`／`analysis-shape-predict-520` 同源）。 */
function visibleText(html) {
  return html.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]*>/g, ' ');
}

/** 预测族／缺口族全装配件（同一份夹具，逐页一份产物）：[页名, html, 判定卡的卡名（没有＝null）]。 */
const FAMILY = [
  ['01–05／23 预测体重', buildPredictDoc(V01), null],
  ['06 预测体重(自定义目标)', buildPredictTargetDoc(V20), '可行性'],
  ['07–09 模拟减重(每天-N卡)', buildSimCutDoc(weightSimCut(series90, 300, '模拟减重')), '可行性'],
  ['10–13 模拟减重(N天减Xkg)', buildSimTargetDoc(weightSimTarget(series90, 6, 90, '模拟减重')), '可行性'],
  ['14–17 摄入预测(按当前速率)', buildCalorieForecastDoc(calorieForecast(series90, 30, '摄入预测')), null],
  ['18 摄入预测(营养目标达成)', buildCalorieGoalDoc(calorieGoalEta(series90, '摄入预测')), '是否在轨'],
  ['19 摄入预测(卡路里缺口预测)', buildCalorieDeficitDoc(calorieDeficitEta(series90, '摄入预测')), null],
  ['20 摄入预测(稳定性)', buildCalorieStabilityDoc(calorieStability(series90, '摄入预测')), '是否稳定'],
];

test('#518 W6-① 值位不许再用 `—`：判定卡撤掉值位，`—` 只许出在真缺值语境', () => {
  /* ①-a 判定卡：值槽那一格**整格不存在**（不是「值槽里写着 `—`」）。
   *     改前反例（W5 状态，视觉抽查 §9.2 逐字命中 @44719）：`…kpi-card-label">可行性</div>
   *     <div class="ilife-block-kpi-card-value-row"><span class="…kpi-card-value">—</span></div>`。
   *     变异（本票自证）：把这一格放回去（值写 `—`）⇒ 本条即红。 */
  for (const [what, html, verdict] of FAMILY) {
    if (verdict === null) continue;
    const card = cardsOf(html).find((c) => c.label === verdict);
    assert.ok(card, what + ' 判定卡「' + verdict + '」不见了');
    assert.ok(card.badge.length > 0, what + '「' + verdict + '」卡的判定词不在徽标上：' + JSON.stringify(card));
    assert.equal(card.value, '', what + '「' + verdict + '」卡的值位没撤掉（值=' + card.value + '）');
    assert.ok(card.detail.length > 0, what + '「' + verdict + '」卡撤了值位却没补人话（detail 空）');
  }
  /* ①-b 值位里一个 `—` 都不许有（本件全部装配件，含派单点名的 01 与 07–13）。 */
  for (const [what, html] of FAMILY) {
    for (const c of cardsOf(html)) {
      assert.ok(!c.value.includes('—'), what + '「' + c.label + '」卡的值位里出现了 `—`：' + c.value);
    }
  }
  /* ①-c 硬规矩（**整页可见文本**）：夹具数据完整（无缺值）⇒ 页面上一个 `—` 都不许有。
   *     这条判的正是「同符号两义」：完整数据下的 `—` 只可能是「非数值型占位」那种误读写法。 */
  for (const [what, html] of FAMILY) {
    const v = visibleText(html);
    assert.ok(!v.includes('—'), what + ' 可见文本里出现了 `—`（这份夹具没有缺值）：'
      + v.slice(Math.max(0, v.indexOf('—') - 40), v.indexOf('—') + 40));
  }
  /* ①-d 缺值语境**仍要写得出** `—`（否则是「把缺值也藏了」，不是「只许用于缺值」）：
   *     页 14–17 的「目标」在 `goal === null` 时值位仍写 `—`。 */
  const noGoal = buildCalorieForecastDoc({ ...calorieForecast(series90, 30, '摄入预测'), goal: null });
  const goalCard = cardsOf(noGoal).find((c) => c.label === '目标');
  assert.ok(goalCard, '14–17「目标」卡不见了');
  assert.equal(goalCard.value, '—', '缺值语境仍须写 `—`（口径不能反过来把缺值也藏掉）：' + goalCard.value);
});

test('#518 W6-② 同页同一单位只许一形态（表头＝卡片＝脚注都写 kg）', () => {
  /* 改前反例（视觉抽查 §9.2 新引入项③）：「表头源码字面是小写（`模拟体重（kg）`），390 档也渲染
   * `kg`，但 1440 档渲染成『模拟体重（KG）』；同页 KPI 卡单位是 `kg/周`，脚注写「公斤」」。 */
  for (const [what, html] of FAMILY) {
    const v = visibleText(html);
    const at = v.indexOf('公斤');
    assert.equal(at, -1, what + ' 可见文本里还有「公斤」（同页单位两形态）：'
      + (at === -1 ? '' : v.slice(Math.max(0, at - 40), at + 40)));
    if (v.includes('模拟体重')) {
      /* 表头那一格：源码字面必须是 `（kg）`，且本页族样式把公共层 `th{text-transform:uppercase}`
       * 压掉了——不然 1440 档渲染出来就是 `KG`（判据不能只判源码字面，要把这条覆盖动作一起判）。 */
      assert.ok(html.includes('<div class="tpd-track-table">'), what + ' 轨迹表没套页族标记类，压大写的规则锚不上');
      assert.ok(/<th[^>]*>[^<]*（kg）<\/th>/.test(html), what + ' 表头单位不是源码字面 `kg`');
      assert.ok(!/(?:^|[">\s])KG(?:[<"\s]|$)/.test(html), what + ' 产物源码里出现了大写 KG');
      assert.ok(html.includes('.tpd-track-table .ilife-block-data-table th{text-transform:none}'),
        what + ' 页族样式没压掉 th 的大写转换（1440 档会渲染成 KG）');
    }
    /* 卡片那一侧的单位形态也判一眼（07–13／06 是 kg/周）。 */
    if (what.includes('模拟减重')) assert.ok(v.includes('kg/周'), what + ' 卡片单位形态不见了：kg/周');
  }
});

test('#518 W6-③ 轨迹列有效位：整数也补 `.0`（同列只许一种字面）', () => {
  /* 改前反例（视觉抽查 §9.5 那格「部分修」）：源码命中 `<td …>71</td>`（@45899），
   * 两档截图 2026-10-06 行都显示 `71`，与同列 `72.4`／`73.7` 仍是两种字面。 */
  const html = buildSimCutDoc(weightSimCut(series90, 300, '模拟减重'));
  const rows = (html.match(/<tbody>([\s\S]*?)<\/tbody>/) ?? [])[1] ?? '';
  const vals = [...rows.matchAll(/data-label="[^"]*">([^<]*)</g)].map((m) => m[1]).filter((_, i) => i % 2 === 1);
  assert.ok(vals.length >= 10, '轨迹表行数异常：' + vals.length);
  for (const s of vals) {
    assert.match(s, /^\d+\.\d$/, '轨迹列出现了非「整数.一位」的字面：' + s + '（整列＝' + vals.join('／') + '）');
  }
  /* 整数位**真的补出 `.0`**（否则「补 .0」这条可能退化成空转）：取一个整数末值直接判。
   * 旧写法 `fmt(Number((66).toFixed(1)))` 会印 `66`，新写法 `toFixed(1)` 印 `66.0`。 */
  const intHtml = buildPredictDoc({ ...V01, forecastValue: 66, forecastLo: 66, forecastHi: 66.5 });
  assert.ok(visibleText(intHtml).includes('66.0 kg'), '整数末值没补 `.0`：'
    + (visibleText(intHtml).match(/体重约 [^ ]+ kg/) ?? [''])[0]);
  const range = cardsOf(intHtml).find((c) => c.label === '预计区间');
  assert.ok(range && range.value === '66.0 至 66.5', '区间端点没补 `.0`：' + (range ? range.value : '卡不见了'));
});

