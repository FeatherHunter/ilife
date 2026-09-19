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
import type { BillRow } from '../fetch/db.js';
import { BillPolicyError } from '../fetch/errors.js';
import { monthRange } from '../shared/dateRange.js';
import { allRecords, kpiOf, monthOf, monthSeries, round2 } from './agg.js';
import type { MonthPoint } from './agg.js';
import { MISSING, NO_WINDOW, money, windowLabel } from './pageParts.js';
import type { AnalysisScene, ChartCard } from './scene.js';
import { buildTrend } from './views.js';

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
      series: [{ name: '支出', items: expense }, { name: '收入', items: income }],
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

export const sceneTrend: AnalysisScene = {
  id: 'trend',
  key: 'bill.analysis.trend',
  kind: 'trend',
  title: '看趋势',
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
    const conclusion = kpi.count === 0
      ? '这 ' + String(series.length) + ' 个月还没有记录。'
      : '这 ' + String(series.length) + ' 个月一共记了 ' + String(kpi.count) + ' 笔：支出 ' + money(kpi.expense)
        + ' 元、收入 ' + money(kpi.income) + ' 元，平均每月支出 ' + money(avg) + ' 元'
        + (peak > 0 ? '，最高的是 ' + peakMonth + '（' + money(peak) + ' 元）。' : '；窗口里一笔支出都没有。');
    const caliber = [
      '窗口取近 ' + String(months) + ' 个月，终点是库里最新一条记录所在的月（不是今天）',
      gaps.length === 0
        ? '这 ' + String(series.length) + ' 个月每个月都有记录'
        : gaps.join('、') + ' 这 ' + String(gaps.length) + ' 个月没有记录，折线在那里断开、用同色虚线桥接',
      recorded.length < 2 ? '有记录的月不到 2 个，不画半截线、图卡改出说明句' : '',
      '支出与收入各一条线，纵轴刻度标在图上',
      '转账不计入收支',
    ].filter((s) => s !== '').join('；') + '。';

    return {
      title: '看趋势',
      label: windowLabel(firstMonth, lastMonth),
      from: firstMonth === '' ? NO_WINDOW : monthRange(firstMonth).start,
      to: lastMonth === '' ? NO_WINDOW : monthRange(lastMonth).end,
      count: rows.length,
      conclusion,
      caliber,
      chips: [],
      payload: buildTrend('trend', [...all], { limit: 12 }),
      kpi,
      page: {
        kpis: [
          { label: '峰值月', value: peakMonth },
          { label: '峰值支出', value: money(peak), unit: '元' },
          { label: '月均支出', value: money(avg), unit: '元' },
          { label: '窗口月数', value: String(months), unit: '个月' },
        ],
        chips: [],
        charts: [{
          title: '逐月收支走势',
          kind: 'line',
          input: lineInputOf(series, recorded.length, '有记录的月不到 2 个，画不出折线；下面那张明细按月列了每一笔。'),
        }],
        listCards: [{
          title: '逐月明细',
          rows: recorded.map((p) => ({
            left: p.month,
            main: String(p.count) + ' 笔',
            right: '支出 ' + money(p.expense) + ' ／ 收入 ' + money(p.income),
          })),
          emptyText: '这 ' + String(months) + ' 个月一笔都没有记',
        }],
        factCards: [],
        empty: {
          text: '这 ' + String(months) + ' 个月还没有记录。',
          hint: '先说「记支出」或「记收入」记一笔，回来看这里就有数了。',
        },
      },
    };
  },
};
