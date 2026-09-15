/** #518 · 预测族形状判据（W2 预测体重族 4 个装配件 ＋ #466 降级文案口径）。
 *
 * 量的是**形状**（基准件 `t516-场景10-视觉整改基准.md` §一 J2／J8／J9 与 §三 的六种形状），
 * 取数、字段与口径另由 `analysis-predict-383`／`analysis-deficit-385`／`t518` 的 `-455`／`-463` 两件守着，
 * 本件不重复断言同一件事。用**合成数据直调装配件**（不依赖 CLI／库／盘），每条断言对着一处
 * **可源码级改坏**的形状：
 *   ① 三条恒出（页内导航／口径说明行／来源脚注） ② 页内导航与区块 id 双向自洽
 *   ③ 结论条真的在、且只用页里已有的数 ④ 可见文本零并列分隔符（`·`／`；`／`~`／`、`／`｜`）
 *   ⑤ #466：降级文案的门槛词与「当前」读数同量纲，读数是**实际有效记录条数**（不是窗口长度）
 *
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`，再 node --test 本件。
 */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { shiftISODate } from '../dist/analysis/utils.js';
import { SIM_MIN_DAYS, weightTarget, weightForecast } from '../dist/analysis/simulate.js';
import { weightSimCut, weightSimTarget, calorieForecast, calorieGoalEta, calorieDeficitEta, calorieStability } from '../dist/analysis/simulate2.js';
import {
  buildPredictDoc, buildPredictTargetDoc, buildSimCutDoc, buildSimTargetDoc,
  buildCalorieForecastDoc, buildCalorieGoalDoc, buildCalorieDeficitDoc, buildCalorieStabilityDoc,
} from '../dist/render/trendPredictDocs.js';
import { assertDocPage } from './doc-page-assert.mjs';

const START = '2026-06-18';

/** 90 天合成日序列（末条体重 75.1 kg，与票面实例同值）。 */
function mkSeries(n = 90) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const ex = i % 2 === 0 ? 300 : null;
    out.push({
      date: shiftISODate(START, i),
      calories: 1800 + (i % 5) * 40, protein: 90, carbs: 200, fat: 60,
      sodiumMg: null, sugarG: null, fiberG: null, waterMl: null,
      exerciseKcal: ex,
      weightKg: i === n - 1 ? 75.1 : Math.round((75.1 + (n - 1 - i) * 0.05) * 10) / 10,
      bodyFatPct: null, waistCm: null,
      tdee: 2635, deficit: 1800 + (ex ?? 0) - 1800, calorieGoal: 1800, waterGoal: 2000,
    });
  }
  return out;
}

const series = mkSeries();
const START14 = shiftISODate(series[series.length - 1].date, -13);
const TARGET_VIEW = weightTarget(series, 65, '预测体重');

/** 预测族 9 个装配件用同一份合成视图（形状判据与取数无关）。 */
const PAGES = [
  ['01–05／23 预测体重', buildPredictDoc({
    start: START14, end: series[series.length - 1].date, horizonDays: 30,
    current: 75.1, ratePerWeek: -0.5, forecastValue: 72.96, forecastLo: 71.5, forecastHi: 74.4,
    insight: '按当前趋势,30 天后体重约 72.96 kg(71.5 ~ 74.4,95% 置信带)。',
  })],
  ['06 预测体重(自定义目标)', buildPredictTargetDoc(TARGET_VIEW)],
  ['07–09 模拟减重(每天-N卡)', buildSimCutDoc(weightSimCut(series, 500, '模拟减重'))],
  ['10–13 模拟减重(N天减Xkg)', buildSimTargetDoc(weightSimTarget(series, 6, 90, '模拟减重'))],
  /* W3 摄入预测族 7 页（14–20）：四个装配件走同一套页框。 */
  ['14–17 摄入预测(按当前速率)', buildCalorieForecastDoc(calorieForecast(series, 30, '摄入预测'))],
  ['18 摄入预测(营养目标达成预测)', buildCalorieGoalDoc(calorieGoalEta(series, '摄入预测'))],
  ['19 摄入预测(卡路里缺口预测)', buildCalorieDeficitDoc(calorieDeficitEta(series, '摄入预测'))],
  ['20 摄入预测(摄入稳定性预测)', buildCalorieStabilityDoc(calorieStability(series, '摄入预测'))],
];

/** 可见文本（口径与 `scripts/audit-separators.mjs` 同源：剥样式段／脚本段／注释／全部标签）。 */
function visible(text) {
  return text.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]*>/g, ' ');
}
const count = (html, needle) => html.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ').split(needle).length - 1;

test('#518 ① 三条恒出：结论条 ＋ 页内导航 ＋ 口径行与来源脚注（J2／J9）', () => {
  for (const [what, html] of PAGES) {
    assertDocPage(html, what);
    assert.ok(count(html, 'ilife-block-conclusion') >= 1, what + ' 缺结论条（ilife-block-conclusion）');
    assert.ok(count(html, 'ilife-block-toc') >= 1, what + ' 缺页内导航（ilife-block-toc）');
    assert.ok(count(html, 'ilife-block-caliber') >= 2, what + ' 口径行与来源脚注都走 ilife-block-caliber，至少两条');
    assert.ok(visible(html).includes('📊 数据来源：'), what + ' 缺来源脚注那一行');
    /* 形状化不是「把分隔符删掉」：公共层形状类的命中数得跟上（基准件 §四 的落点结论）。 */
    assert.ok(count(html, 'ilife-block-chip') >= 1, what + ' 缺页头胶囊（ilife-block-chip）');
    assert.ok(count(html, 'ilife-block-kpi-card') >= 3, what + ' 概览区至少 3 张卡');
  }
});

test('#518 ② 页内导航与区块 id 双向自洽（J8：多一个孤儿锚点即红）', () => {
  for (const [what, html] of PAGES) {
    const hrefs = [...html.matchAll(/<a href="#([^"]+)">([^<]*)<\/a>/g)].map((m) => m[1]);
    const ids = [...html.matchAll(/<section id="([^"]+)"/g)].map((m) => m[1]);
    assert.ok(hrefs.length >= 2, what + ' 导航项至少 2 项，实得 ' + hrefs.length);
    assert.deepEqual([...hrefs].sort(), [...ids].sort(), what + ' 导航 href 与区块 id 必须一一对应（双向）');
    assert.equal(new Set(hrefs).size, hrefs.length, what + ' 导航项 id 不许重复');
  }
});

test('#518 ③ 结论条只用页里已有的数（`target:65` 页要写出目标与预计达成日）', () => {
  const html = PAGES[1][1];
  const text = (html.match(/ilife-block-conclusion">([^<]*)</) || [])[1] || '';
  assert.ok(text.length > 0, '结论条是空的');
  assert.ok(text.includes('65 kg'), '结论句少了页里已有的目标体重：' + text);
  assert.ok(text.includes(TARGET_VIEW.eta), '结论句少了页里已有的预计达成日 ' + TARGET_VIEW.eta + '：' + text);
});

test('#518 ④ 可见文本零并列分隔符（`·`／`；`／`~`／`、`／`｜`）', () => {
  const BAD = ['·', '；', '~', '、', '｜'];
  for (const [what, html] of PAGES) {
    const v = visible(html);
    for (const ch of BAD) {
      assert.ok(!v.includes(ch), what + ' 可见文本里还有 `' + ch + '`（基准件 §三：该处要换形状，不是删符号）');
    }
  }
});

test('#518 ⑤ #466 降级文案：门槛词与「当前」读数同量纲，读数是实际记录条数不是窗口长度', () => {
  /* 30 天窗口、只有 13 天有体重记录 ⇒ 改前会报「当前只有 30 天」（＝窗口长度），
   * 读者看到「需要 ≥14 天体重记录,当前只有 30 天」这种自相矛盾的句子。 */
  const sparse = mkSeries(30).map((d, i) => ({ ...d, weightKg: i >= 17 ? d.weightKg : null }));
  const weightDays = sparse.filter((d) => d.weightKg !== null).length;
  const fc = weightForecast(sparse, 30, '预测体重');
  assert.ok(fc.degraded, '13 天体重记录必须降级');
  assert.match(fc.degradeMsg, new RegExp('≥\\s*' + SIM_MIN_DAYS + '\\s*天体重记录'), '门槛词丢了：' + fc.degradeMsg);
  assert.ok(fc.degradeMsg.includes('当前只有 ' + weightDays + ' 天体重记录'),
    '「当前」读数须是实际有效记录条数（' + weightDays + '），实得：' + fc.degradeMsg);
  assert.ok(!fc.degradeMsg.includes('当前只有 30 天'), '不许把窗口天数当记录条数报：' + fc.degradeMsg);

  /* 同量纲：门槛与「当前」两处都得带「天…记录」这条量纲，不许一边门槛一边窗口长度。 */
  const m = /需要 ([^,，]+),当前只有 ([^。]+)。/.exec(fc.degradeMsg);
  assert.ok(m, '降级文案形状变了（取不到门槛／当前两段）：' + fc.degradeMsg);
  assert.ok(/天体重记录$/.test(m[1].replace(/^[≥\s]*\d+\s*/, '')), '门槛词量纲异常：' + m[1]);
  assert.ok(/天体重记录$/.test(m[2]), '「当前」读数与门槛不同量纲：' + m[2]);

  /* 摄入侧同一套口径（30 天窗口、13 天有摄入记录）。 */
  const sparseCal = mkSeries(30).map((d, i) => ({ ...d, calories: i < 13 ? d.calories : null }));
  const cf = calorieForecast(sparseCal, 30, '摄入预测');
  assert.ok(cf.degraded, '13 天摄入记录必须降级');
  assert.ok(cf.degradeMsg.includes('当前只有 13 天摄入记录'), '摄入侧「当前」读数须是 13：' + cf.degradeMsg);

  /* 模拟减重族：一条体重记录都没有时，门槛与读数也要同量纲。 */
  const noWeight = mkSeries(30).map((d) => ({ ...d, weightKg: null }));
  const sc = weightSimCut(noWeight, 500, '模拟减重');
  assert.ok(sc.degraded, '零体重记录必须降级');
  assert.ok(sc.degradeMsg.endsWith('需要 至少 1 天体重记录,当前只有 0 天体重记录。'),
    '模拟减重降级文案：' + sc.degradeMsg);

  /* 目标达成预测（`calorieGoalEta`）同样量纲，防止只改一处。 */
  const ge = calorieGoalEta(sparseCal, '摄入预测');
  assert.ok(ge.degraded);
  assert.ok(ge.degradeMsg.includes('当前只有 13 天摄入记录'), '营养目标达成侧读数：' + ge.degradeMsg);
});
