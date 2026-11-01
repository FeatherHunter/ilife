/** 场景件：**看分布**（`kind = 'distribution'`，命令 `bill.analysis.trend`）——本件只是差异声明与取值，
 *  块位序列住 `./template-charts.ts`（族＝读数＋图；#729）。
 *
 * 老侧对应件：`scripts/analysis/cli.py` 的 `cmd_distribution`（`:632-666`）
 *  ＋ 模板 `templates/分析/analysis_view.html` 的 `renderDistribution`（`:769-797`）。
 *
 * 本件的差异（照老侧那一页逐点对；#688 §四 裁定 3 的图判据住本件）：
 *   ① 窗口两态同老侧：给了 `start`＋`end` 就走区间（缺一即报缺槽位），否则取一个月（缺＝本月）；
 *   ② 五档与半开区间**逐字照老侧**（`10 元以下` 是 `0 ≤ 金额 < 10`，`500 以上` 是 `≥ 500`）；
 *   ③ 图卡＝**柱图**：`singleColor`（色由公共层管）＋ `showValues` ＋ 纵轴**可读刻度**（`yTicks: 4`）；
 *   ④ **零值不出柱身**：笔数为 0 的档不进图元，但明细里**照实写 0 笔**（老侧那五行一条不减）；
 *   ⑤ **点数不足改出说明句**：五档一笔都没有时图卡改出说明句，不画一张全 0 的柱子；
 *   ⑥ 收支方向按参数取（缺＝支出）；老侧把未识别的方向悄悄当收入，本件改成立即报参数错。
 *
 * 谁在用（一个调用点，指名）：`src/analysis/read.ts` 的 `pageOf`——`family === 'charts'` 的 4 件场景
 *  由落点表 `./scene.js` 取到本件。
 */
import { runWithLanguage } from 'base-entries';
import { BillPolicyError } from '../fetch/errors.js';
import { monthRange } from '../shared/dateRange.js';
import { DIRECTION_WORDS } from '../shared/direction.js';
import { filterOf, kpiOf, round1, thisMonth, windowRecords } from './agg.js';
import { pctText, windowLabel } from './pageParts.js';
import { needMonth, needRange } from './params.js';
import type { AnalysisScene, ChartCard } from './scene.js';
import { buildTrend } from './views.js';
import { m } from '../entries/index.js';

/** 五档金额区间（半开区间 `[lo, hi)`；`hi` 为 `null` 即「以上」）——老侧 `cmd_distribution` 的同一张档表。
 *  档名要上屏，故按需取词（模块级常量会把语言在加载时固化）。 */
function bucketsOf(): readonly { readonly name: string; readonly lo: number; readonly hi: number | null }[] {
  return [
    { name: m('skill-bill.analysis-scene-distribution.c001'), lo: 0, hi: 10 },
    { name: '10~50', lo: 10, hi: 50 },
    { name: '50~100', lo: 50, hi: 100 },
    { name: '100~500', lo: 100, hi: 500 },
    { name: m('skill-bill.analysis-scene-distribution.c002'), lo: 500, hi: null },
  ];
}

/** 一个金额落在哪一档。 */
function inBucket(bucket: { readonly lo: number; readonly hi: number | null }, amount: number): boolean {
  return bucket.hi === null ? amount >= bucket.lo : (amount >= bucket.lo && amount < bucket.hi);
}

/** 收支方向（缺＝支出）。只认支出／收入两种写法；别的形态立即报参数错，不悄悄当收入。 */
function directionOf(params: Record<string, unknown>): { readonly key: 'expense' | 'income'; readonly word: string } {
  const raw = params['type'];
  if (raw === undefined || raw === null || raw === '') return { key: 'expense', word: m('skill-bill.analysis-scene-distribution.c003') };
  if (raw === 'expense' || raw === DIRECTION_WORDS.expense) return { key: 'expense', word: m('skill-bill.analysis-scene-distribution.c004') };
  if (raw === 'income' || raw === DIRECTION_WORDS.income) return { key: 'income', word: m('skill-bill.analysis-scene-distribution.c005') };
  throw new BillPolicyError('POLICY_BAD_INPUT', '收支方向只认支出／收入');
}

/** 柱图纵轴的上界：抬到「刻度条数 − 1」的整数倍——笔数是整数，否则刻度会印出「1.33 笔」。 */
function axisTopOf(max: number, ticks: number): number {
  const segments = Math.max(ticks - 1, 1);
  return max <= 0 ? segments : Math.ceil(max / segments) * segments;
}

/** 柱图的数据：笔数为 0 的档不进图元（零值不出柱身）；一档都不剩时改出说明句。 */
function barInputOf(
  buckets: readonly { readonly name: string; readonly count: number }[],
  emptyText: string,
): ChartCard['input'] {
  const bars = buckets.filter((b) => b.count > 0);
  if (bars.length === 0) return { items: [], options: { emptyText } };
  const max = bars.reduce((m, b) => (b.count > m ? b.count : m), 0);
  return {
    items: bars.map((b) => ({ label: b.name, value: b.count })),
    options: {
      singleColor: true,
      showValues: true,
      yTicks: 4,
      yMax: axisTopOf(max, 4),
      format: (v: number): string => m('skill-bill.analysis-scene-distribution.c006', { p0: String(String(v)) }),
    },
  };
}

function buildScene(): AnalysisScene {
  return {
  id: 'distribution',
  key: 'bill.analysis.trend',
  kind: 'distribution',
  title: m('skill-bill.analysis-scene-distribution.title'),
  family: 'charts',
  values: ({ params, db }) => {
    /* ① 窗口：给了起止日就走区间（缺一即报缺槽位），否则取一个月（缺＝本月）。 */
    const hasRange = params['start'] !== undefined || params['end'] !== undefined;
    const month = params['month'] === undefined ? thisMonth() : needMonth(params);
    const range = hasRange ? needRange(params) : monthRange(month);
    const periodLabel = hasRange ? windowLabel(range.start, range.end) : month;

    /* ② 取数与方向筛选（转账已由 `filterOf` 剔除）。 */
    const rows = windowRecords(db, range.start, range.end);
    const direction = directionOf(params);
    const recs = filterOf(rows, { direction: direction.key });
    const total = recs.length;

    /* ③ 五档笔数与占比（老侧同式：分母＝这一侧的笔数，一笔都没有时占比写 0）。 */
    const buckets = bucketsOf().map((b) => {
      const count = recs.filter((r) => inBucket(b, Math.abs(r.amount))).length;
      return { name: b.name, count, pct: total === 0 ? 0 : round1((count / total) * 100) };
    });
    const top = buckets.reduce((best, b) => (b.count > best.count ? b : best), buckets[0]);
    const empties = buckets.filter((b) => b.count === 0).map((b) => '「' + b.name + '」');
    const kpi = kpiOf(recs);
    const emptyTail = empties.length === 0
      ? m('skill-bill.analysis-scene-distribution.c008')
      : m('skill-bill.analysis-scene-distribution.c009', {
        p0: String(empties.join('、')),
        p1: String(String(empties.length)),
      });

    /* ④ 结论句与口径句：零值档不出柱身但明细照实写 0 笔；一笔都没有时图卡改出说明句。 */
    const conclusion = total === 0
      ? m('skill-bill.analysis-scene-distribution.c010', {
        p0: String(periodLabel),
        p1: String(direction.word),
      })
      : m('skill-bill.analysis-scene-distribution.c011', {
        p0: String(periodLabel),
        p1: String(String(total)),
        p2: String(direction.word),
        p3: String(top.name),
        p4: String(String(top.count)),
        p5: String(pctText(top.pct)),
        p6: String(emptyTail),
      });
    const caliber = [
      m('skill-bill.analysis-scene-distribution.c012'),
      m('skill-bill.analysis-scene-distribution.c013'),
      total === 0 ? m('skill-bill.analysis-scene-distribution.c014') : '',
      m('skill-bill.analysis-scene-distribution.c015'),
    ].filter((s) => s !== '').join('；') + '。';

    return {
      title: m('skill-bill.analysis-scene-distribution.title'),
      label: periodLabel,
      from: range.start,
      to: range.end,
      count: total,
      conclusion,
      caliber,
      chips: [],
      payload: buildTrend('distribution', [...recs]),
      kpi,
      page: {
        kpis: [
          { label: m('skill-bill.analysis-scene-distribution.c017'), value: direction.word },
          { label: m('skill-bill.analysis-scene-distribution.c018'), value: String(total), unit: m('skill-bill.analysis-scene-distribution.c019') },
          { label: m('skill-bill.analysis-scene-distribution.c020'), value: periodLabel },
        ],
        chips: [],
        charts: [{
          title: m('skill-bill.analysis-scene-distribution.c021'),
          kind: 'bar',
          input: barInputOf(buckets, m('skill-bill.analysis-scene-distribution.c022', { p0: String(periodLabel) })),
        }],
        listCards: [],
        factCards: [{
          title: m('skill-bill.analysis-scene-distribution.c023'),
          rows: buckets.map((b) => ({ k: b.name, v: m('skill-bill.analysis-scene-distribution.c024', {
            p0: String(String(b.count)),
            p1: String(pctText(b.pct)),
          }) })),
        }],
        empty: {
          text: m('skill-bill.analysis-scene-distribution.c025', { p0: String(periodLabel) }),
          hint: m('skill-bill.analysis-scene-distribution.c026'),
        },
      },
    };
  },
  };
}

export const sceneDistribution: AnalysisScene = buildScene();

/** 按语言重建本场景（#1197：文案经词条层，语言是运行期参数）。 */
export function sceneDistributionFor(language: string): AnalysisScene {
  return runWithLanguage(language, buildScene);
}
