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
import { BillPolicyError } from '../fetch/errors.js';
import { monthRange } from '../shared/dateRange.js';
import { filterOf, kpiOf, round1, thisMonth, windowRecords } from './agg.js';
import { pctText, windowLabel } from './pageParts.js';
import { needMonth, needRange } from './params.js';
import type { AnalysisScene, ChartCard } from './scene.js';
import { buildTrend } from './views.js';

/** 五档金额区间（半开区间 `[lo, hi)`；`hi` 为 `null` 即「以上」）——老侧 `cmd_distribution` 的同一张档表。 */
const BUCKETS: readonly { readonly name: string; readonly lo: number; readonly hi: number | null }[] = [
  { name: '10 元以下', lo: 0, hi: 10 },
  { name: '10~50', lo: 10, hi: 50 },
  { name: '50~100', lo: 50, hi: 100 },
  { name: '100~500', lo: 100, hi: 500 },
  { name: '500 以上', lo: 500, hi: null },
];

/** 一个金额落在哪一档。 */
function inBucket(bucket: { readonly lo: number; readonly hi: number | null }, amount: number): boolean {
  return bucket.hi === null ? amount >= bucket.lo : (amount >= bucket.lo && amount < bucket.hi);
}

/** 收支方向（缺＝支出）。只认支出／收入两种写法；别的形态立即报参数错，不悄悄当收入。 */
function directionOf(params: Record<string, unknown>): { readonly key: 'expense' | 'income'; readonly word: string } {
  const raw = params['type'];
  if (raw === undefined || raw === null || raw === '') return { key: 'expense', word: '支出' };
  if (raw === 'expense' || raw === '支出') return { key: 'expense', word: '支出' };
  if (raw === 'income' || raw === '收入') return { key: 'income', word: '收入' };
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
      format: (v: number): string => String(v) + ' 笔',
    },
  };
}

export const sceneDistribution: AnalysisScene = {
  id: 'distribution',
  key: 'bill.analysis.trend',
  kind: 'distribution',
  title: '看分布',
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
    const buckets = BUCKETS.map((b) => {
      const count = recs.filter((r) => inBucket(b, Math.abs(r.amount))).length;
      return { name: b.name, count, pct: total === 0 ? 0 : round1((count / total) * 100) };
    });
    const top = buckets.reduce((best, b) => (b.count > best.count ? b : best), buckets[0]);
    const empties = buckets.filter((b) => b.count === 0).map((b) => '「' + b.name + '」');
    const kpi = kpiOf(recs);

    /* ④ 结论句与口径句：零值档不出柱身但明细照实写 0 笔；一笔都没有时图卡改出说明句。 */
    const conclusion = total === 0
      ? periodLabel + ' 这段时间没有' + direction.word + '记录。'
      : periodLabel + ' 一共 ' + String(total) + ' 笔' + direction.word + '：最多的是「' + top.name + '」'
        + String(top.count) + ' 笔 · ' + pctText(top.pct)
        + (empties.length === 0
          ? '；五个金额档都有落点。'
          : '；' + empties.join('、') + ' 这 ' + String(empties.length) + ' 档一笔都没有。');
    const caliber = [
      '金额按绝对值归五档，区间左闭右开：「10 元以下」「10~50」「50~100」「100~500」「500 以上」',
      '笔数为 0 的档不出柱身，明细里照实写 0 笔',
      total === 0 ? '这段时间一笔都没有，图卡改出说明句' : '',
      '转账不计入收支',
    ].filter((s) => s !== '').join('；') + '。';

    return {
      title: '看分布',
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
          { label: '统计口径', value: direction.word },
          { label: '总笔数', value: String(total), unit: '笔' },
          { label: '期间', value: periodLabel },
        ],
        chips: [],
        charts: [{
          title: '金额区间分布',
          kind: 'bar',
          input: barInputOf(buckets, periodLabel + ' 一笔都没有，五个金额档都是空的。'),
        }],
        listCards: [],
        factCards: [{
          title: '各区间明细',
          rows: buckets.map((b) => ({ k: b.name, v: String(b.count) + ' 笔 · ' + pctText(b.pct) })),
        }],
        empty: {
          text: periodLabel + ' 这段时间还没有记录。',
          hint: '先说「记支出」或「记收入」记一笔，回来看这里就有数了。',
        },
      },
    };
  },
};
