/** 场景件：**看趋势**（`kind = 'trend'`，命令 `bill.analysis.trend`）——本件只是差异声明与取值，
 *  块位序列住 `./template-charts.ts`（族＝读数＋图；#729）。
 *
 * 老侧对应件：`scripts/analysis/cli.py` 的 `cmd_trend`（`:524-543`）
 *  ＋ 模板 `templates/分析/analysis_view.html` 的 `renderTrend`（`:630-663`）与折线渲染 `renderTrendChart`（`:1122-1143`）。
 *
 * 本件的差异（照老侧那一页逐点对；#688 §四 裁定 3 的四条图判据住本件）：
 *   ① 窗口＝近 N 个月（缺省 12）；**序列终点＝库里最新一条记录所在的月**（不是今天）——老侧同口径，
 *      算式住 `./agg.js` 的 `monthSeries`；
 *   ② 图卡＝**两条折线**（支出／收入）：**没有记录的月不出点**（`value: null`）＋ 跨空档**同色虚线**
 *      （`gapStyle: 'dashed'`）＋ 纵轴**可读刻度**（`yTicks: 4`）；
 *   ③ **可用点少于 2 个时不画半截线**：图卡改出说明句（公共层空态承载那一句），口径句里也点名；
 *   ④ 逐月明细**只列有记录的月**（老侧把空月也列成 `0 笔`——那是把「没有记录」读成「花了 0 元」）；
 *   ⑤ 口径句**点名没有记录的月**（老侧那一页没有这句）；
 *   ⑥ 峰值月：窗口里一笔支出都没有时写缺值 `—`（老侧会写成窗口最早那个月——把 0 当成了峰值）。
 *
 * 谁在用（一个调用点，指名）：`src/analysis/read.ts` 的 `pageOf`——`family === 'charts'` 的 4 件场景
 *  由落点表 `./scene.js` 取到本件，`values` 出的形状交给 `./template-charts.js` 拼页。
 */
import { runWithLanguage, listJoin, currentRenderLanguage } from 'base-entries';
import type { BillRow } from '../fetch/db.js';
import { BillPolicyError } from '../fetch/errors.js';
import { monthRange } from '../shared/dateRange.js';
import { allRecords, kpiOf, monthOf, monthSeries, round2 } from './agg.js';
import type { MonthPoint } from './agg.js';
import { MISSING, NO_WINDOW, money, windowLabel } from './pageParts.js';
import type { AnalysisScene, ChartCard } from './scene.js';
import { buildAnalysisCopy } from './copyTextAnalysis.js';
import { projectWakeWord } from '../triggers/wakeTable.js';
import { buildTrend } from './views.js';
import { m } from '../entries/index.js';

/** 正整数型参数（缺＝缺省值）。老侧 `args.months or 12` 的严格版：形态不对即报参数错，不悄悄退回缺省。 */
function monthsOf(params: Record<string, unknown>, fallback: number): number {
  const raw = params['months'];
  if (raw === undefined || raw === null || raw === '') return fallback;
  const n = typeof raw === 'number' ? raw : Number(String(raw));
  if (!Number.isFinite(n) || n < 1) throw new BillPolicyError('POLICY_BAD_INPUT', '窗口月数须是正整数');
  return Math.floor(n);
}

/** 窗口内的记录（序列覆盖的那些月；含转账，收支口径由 `kpiOf` 剔）。 */
function windowRowsOf(rows: readonly BillRow[], series: readonly MonthPoint[]): BillRow[] {
  const keep = new Set(series.map((p) => p.month));
  return rows.filter((r) => keep.has(monthOf(r.time)));
}

/** 序列里**没有记录**的月份（`count === 0` 即那个月一条记录都没有）。 */
function gapsOf(series: readonly MonthPoint[]): readonly string[] {
  return series.filter((p) => p.count === 0).map((p) => p.month);
}

/** 折线点：没有记录的月 `value: null`——公共层据此不出点，并按 `gapStyle: 'dashed'` 出同色虚线桥接。 */
function lineItemsOf(
  series: readonly MonthPoint[],
  pick: (p: MonthPoint) => number,
): { readonly label: string; readonly value: number | null }[] {
  return series.map((p) => ({ label: p.month.slice(2), value: p.count === 0 ? null : pick(p) }));
}

/** 折线图卡的数据：两条系列（支出／收入）＋ 纵轴刻度 ＋ 同色虚线跨空档；可用点少于 2 个改出说明句。 */
function lineInputOf(series: readonly MonthPoint[], usable: number, emptyText: string): ChartCard['input'] {
  if (usable < 2) return { items: [], options: { emptyText } };
  const expense = lineItemsOf(series, (p) => p.expense);
  const income = lineItemsOf(series, (p) => p.income);
  return {
    items: expense,
    options: {
      series: [{ name: m('skill-bill.analysis-scene-trend.c001'), items: expense }, { name: m('skill-bill.analysis-scene-trend.c002'), items: income }],
      yTicks: 4,
      /* 纵轴下界恒 0：金额没有负数，公共层派生的那 6% 下外扩会印出「-732.26 元」这种读不出意思的刻度。 */
      yMin: 0,
      legend: true,
      tooltip: true,
      labels: 'select',
      gapStyle: 'dashed',
      format: money,
    },
  };
}

function buildScene(): AnalysisScene {
  return {
  id: 'trend',
  key: 'bill.analysis.trend',
  kind: 'trend',
  title: m('skill-bill.analysis-scene-trend.title'),
  family: 'charts',
  values: ({ params, db }) => {
    /* ① 取数：窗口＝近 N 个月，序列终点＝库里最新一条记录所在的月（不取今天的月）。 */
    const months = monthsOf(params, 12);
    const all = allRecords(db);
    const series = monthSeries(all, months);
    const rows = windowRowsOf(all, series);
    const kpi = kpiOf(rows);
    const gaps = gapsOf(series);
    const recorded = series.filter((p) => p.count > 0);

    /* ② 峰值与月均（老侧同式：峰值月取第一个达到峰值的月）。 */
    const totalExpense = series.reduce((sum, p) => sum + p.expense, 0);
    const peak = series.reduce((max, p) => (p.expense > max ? p.expense : max), 0);
    const avg = series.length === 0 ? 0 : round2(totalExpense / series.length);
    const head = series.find((p) => p.count > 0 && p.expense === peak);
    const peakMonth = peak > 0 && head !== undefined ? head.month : MISSING;

    /* ③ 期间标签与来源脚注的窗口起止（月份窗口写成首月起～末月末）。 */
    const firstMonth = series.length === 0 ? '' : series[0].month;
    const lastMonth = series.length === 0 ? '' : series[series.length - 1].month;

    /* ④ 结论句与口径句：口径句点名没有记录的月（裁定 3 第 4 条），点数不足时也在这里说清。 */
    /* 峰值那一句先算成变量：让结论句成为一条只拼字面量与变量的链，迁移器才能整句取词。 */
    const peakClause = peak > 0
      ? m('skill-bill.analysis-scene-trend.c004', { p0: String(peakMonth), p1: String(money(peak)) })
      : m('skill-bill.analysis-scene-trend.c005');
    const conclusion = kpi.count === 0
      ? m('skill-bill.analysis-scene-trend.c006', { p0: String(String(series.length)) })
      : m('skill-bill.analysis-scene-trend.c007', {
        p0: String(String(series.length)),
        p1: String(String(kpi.count)),
        p2: String(money(kpi.expense)),
        p3: String(money(kpi.income)),
        p4: String(money(avg)),
        p5: String(peakClause),
      });
    const caliber = [
      m('skill-bill.analysis-scene-trend.c008', { p0: String(String(months)) }),
      gaps.length === 0
        ? m('skill-bill.analysis-scene-trend.c009', { p0: String(String(series.length)) })
        : m('skill-bill.analysis-scene-trend.c010', {
          p0: String(listJoin(currentRenderLanguage(), gaps)),
          p1: String(String(gaps.length)),
        }),
      recorded.length < 2 ? m('skill-bill.analysis-scene-trend.c011') : '',
      m('skill-bill.analysis-scene-trend.c012'),
      m('skill-bill.analysis-scene-trend.c013'),
    ].filter((s) => s !== '').join('；') + '。';

    return {
      title: m('skill-bill.analysis-scene-trend.title'),
      label: windowLabel(firstMonth, lastMonth),
      from: firstMonth === '' ? NO_WINDOW : monthRange(firstMonth).start,
      to: lastMonth === '' ? NO_WINDOW : monthRange(lastMonth).end,
      count: rows.length,
      conclusion,
      caliber,
      chips: [],
      payload: buildTrend('trend', [...all], { limit: 12 }),
      kpi,
      copy: buildAnalysisCopy({
        kind: 'trend', word: projectWakeWord({ key: 'bill.analysis.trend', kind: 'trend' }), months, kpi, avg, peakMonth, peak,
        points: recorded.map((p) => ({
          month: p.month, count: p.count, expense: p.expense, income: p.income,
        })),
      }),
      page: {
        kpis: [
          { label: m('skill-bill.analysis-scene-trend.c015'), value: peakMonth },
          { label: m('skill-bill.analysis-scene-trend.c016'), value: money(peak), unit: m('skill-bill.analysis-scene-trend.c017') },
          { label: m('skill-bill.analysis-scene-trend.c018'), value: money(avg), unit: m('skill-bill.analysis-scene-trend.c019') },
          { label: m('skill-bill.analysis-scene-trend.c020'), value: String(months), unit: m('skill-bill.analysis-scene-trend.c021') },
        ],
        chips: [],
        charts: [{
          title: m('skill-bill.analysis-scene-trend.c022'),
          kind: 'line',
          input: lineInputOf(series, recorded.length, m('skill-bill.analysis-scene-trend.c023')),
        }],
        listCards: [{
          title: m('skill-bill.analysis-scene-trend.c024'),
          rows: recorded.map((p) => ({
            left: p.month,
            main: m('skill-bill.analysis-scene-trend.c025', { p0: String(String(p.count)) }),
            right: m('skill-bill.analysis-scene-trend.c026', {
              p0: String(money(p.expense)),
              p1: String(money(p.income)),
            }),
          })),
          emptyText: m('skill-bill.analysis-scene-trend.c027', { p0: String(String(months)) }),
        }],
        factCards: [],
        empty: {
          text: m('skill-bill.analysis-scene-trend.c028', { p0: String(String(months)) }),
          hint: m('skill-bill.analysis-scene-trend.c029'),
        },
      },
    };
  },
  };
}

export const sceneTrend: AnalysisScene = buildScene();

/** 按语言重建本场景（#1197：文案经词条层，语言是运行期参数）。 */
export function sceneTrendFor(language: string): AnalysisScene {
  return runWithLanguage(language, buildScene);
}
