/** 场景件：**看分类趋势**（`kind = 'category'`，命令 `bill.analysis.trend`）——本件只是差异声明与取值，
 *  块位序列住 `./template-charts.ts`（族＝读数＋图；#729）。
 *
 * 老侧对应件：`scripts/analysis/cli.py` 的 `cmd_cat_trend`（`:546-567`）
 *  ＋ 模板 `templates/分析/analysis_view.html` 的 `renderCatTrend`（`:695-718`，柱图那一支）。
 *
 * 本件的差异（照老侧那一页逐点对；#688 §四 裁定 3 的四条图判据住本件）：
 *   ① 取数先用 `filterOf(rows, { categoryL1 })` 按**一级分类**归堆（老侧 `_filter` 的 `category_l1` 前缀匹配同义），
 *      再走 `monthSeries`——**序列终点＝该分类最新一条记录所在的月**，不是今天；
 *   ② 图卡＝**逐月柱图**：`singleColor`（色由公共层管，本件不写色值）＋ `showValues` ＋ 纵轴**可读刻度**（`yTicks: 4`）；
 *   ③ **零值不出柱身**：没有记录的月、以及有记录但支出为 0 的月都不进图元（老侧把空月画成 0 高的柱）；
 *   ④ **点数不足改出说明句**：有支出的月不到 2 个时图卡改出说明句，不画半个逐月图；
 *   ⑤ 口径句**点名没有记录的月**（老侧那一页没有这句）；
 *   ⑥ 峰值月：窗口里这个分类一笔支出都没有时写缺值 `—`（老侧会写成窗口最早那个月）。
 *
 * 谁在用（一个调用点，指名）：`src/analysis/read.ts` 的 `pageOf`——`family === 'charts'` 的 4 件场景
 *  由落点表 `./scene.js` 取到本件（同 kind 的「看分类」「看分类对比」住别的命令名那一支）。
 */
import type { BillRow } from '../fetch/db.js';
import { BillPolicyError } from '../fetch/errors.js';
import { monthRange } from '../shared/dateRange.js';
import { allRecords, filterOf, kpiOf, monthOf, monthSeries, round2 } from './agg.js';
import type { MonthPoint } from './agg.js';
import { MISSING, NO_WINDOW, money, windowLabel } from './pageParts.js';
import type { AnalysisScene, ChartCard } from './scene.js';
import { buildTrend } from './views.js';

/** 分类名（缺＝「餐饮」，与老侧同一句缺省）。给了但不是非空串即报参数错。 */
function categoryOf(params: Record<string, unknown>): string {
  const raw = params['category'];
  if (raw === undefined || raw === null || raw === '') return '餐饮';
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new BillPolicyError('POLICY_BAD_INPUT', '分类名须是非空字符串');
  }
  return raw.trim();
}

/** 正整数型参数（缺＝缺省值）。老侧 `args.months or 12` 的严格版：形态不对即报参数错。 */
function monthsOf(params: Record<string, unknown>, fallback: number): number {
  const raw = params['months'];
  if (raw === undefined || raw === null || raw === '') return fallback;
  const n = typeof raw === 'number' ? raw : Number(String(raw));
  if (!Number.isFinite(n) || n < 1) throw new BillPolicyError('POLICY_BAD_INPUT', '窗口月数须是正整数');
  return Math.floor(n);
}

/** 窗口内的记录（序列覆盖的那些月）。 */
function windowRowsOf(rows: readonly BillRow[], series: readonly MonthPoint[]): BillRow[] {
  const keep = new Set(series.map((p) => p.month));
  return rows.filter((r) => keep.has(monthOf(r.time)));
}

/** 序列里**没有记录**的月份（`count === 0`＝那个月这个分类一条记录都没有）。 */
function gapsOf(series: readonly MonthPoint[]): readonly string[] {
  return series.filter((p) => p.count === 0).map((p) => p.month);
}

/** 逐月柱图的数据：**只有支出大于 0 的月进图元**（零值不出柱身）；可用点不到 2 个改出说明句。 */
function barInputOf(series: readonly MonthPoint[], emptyText: string): ChartCard['input'] {
  const bars = series.filter((p) => p.expense > 0);
  if (bars.length < 2) return { items: [], options: { emptyText } };
  return {
    items: bars.map((p) => ({ label: p.month.slice(2), value: p.expense })),
    options: { singleColor: true, showValues: true, yTicks: 4, format: money },
  };
}

export const sceneCatTrend: AnalysisScene = {
  id: 'cat_trend',
  key: 'bill.analysis.trend',
  kind: 'category',
  title: '看分类趋势',
  family: 'charts',
  values: ({ params, db }) => {
    /* ① 取数：先按一级分类筛，再取近 N 个月的逐月序列（终点＝该分类最新一条记录所在的月）。 */
    const months = monthsOf(params, 12);
    const category = categoryOf(params);
    const all = allRecords(db);
    const rows = filterOf(all, { categoryL1: category });
    const series = monthSeries(rows, months);
    const windowRows = windowRowsOf(rows, series);
    const kpi = kpiOf(windowRows);
    const gaps = gapsOf(series);
    const bars = series.filter((p) => p.expense > 0);

    /* ② 峰值与月均（老侧同式：月均的分母是窗口月数，不是有支出的月数）。 */
    const totalExpense = series.reduce((sum, p) => sum + p.expense, 0);
    const peak = series.reduce((max, p) => (p.expense > max ? p.expense : max), 0);
    const avg = series.length === 0 ? 0 : round2(totalExpense / series.length);
    const head = series.find((p) => p.count > 0 && p.expense === peak);
    const peakMonth = peak > 0 && head !== undefined ? head.month : MISSING;

    /* ③ 期间标签与来源脚注的窗口起止。 */
    const firstMonth = series.length === 0 ? '' : series[0].month;
    const lastMonth = series.length === 0 ? '' : series[series.length - 1].month;

    /* ④ 结论句与口径句：空月点名（裁定 3 第 4 条）＋ 零值不出柱 ＋ 点数不足的说明句。 */
    const conclusion = kpi.count === 0
      ? '「' + category + '」近 ' + String(months) + ' 个月一笔支出都没有。'
      : '「' + category + '」近 ' + String(series.length) + ' 个月一共支出 ' + money(totalExpense) + ' 元'
        + (peak > 0 ? '：最高的是 ' + peakMonth + '（' + money(peak) + ' 元）' : '')
        + '，平均每月 ' + money(avg) + ' 元。';
    const caliber = [
      '按一级分类「' + category + '」归堆（' + category + ' 下面的二级、三级分类一并算进来）',
      '窗口取近 ' + String(months) + ' 个月，终点是这个分类最新一条记录所在的月（不是今天）',
      gaps.length === 0
        ? '这 ' + String(series.length) + ' 个月每个月都有记录'
        : gaps.join('、') + ' 这 ' + String(gaps.length) + ' 个月没有记录，柱图里不出那几个月',
      '支出为 0 的月同样不出柱身',
      bars.length < 2 ? '有支出的月不到 2 个，不画半个逐月图、图卡改出说明句' : '',
      '转账不计入收支',
    ].filter((s) => s !== '').join('；') + '。';

    return {
      title: '看分类趋势',
      label: category + ' · ' + windowLabel(firstMonth, lastMonth),
      from: firstMonth === '' ? NO_WINDOW : monthRange(firstMonth).start,
      to: lastMonth === '' ? NO_WINDOW : monthRange(lastMonth).end,
      count: windowRows.length,
      conclusion,
      caliber,
      chips: [],
      payload: buildTrend('category', [...rows], { limit: 12 }),
      kpi,
      page: {
        kpis: [
          { label: '分类', value: category },
          { label: '峰值月', value: peakMonth },
          { label: '峰值支出', value: money(peak), unit: '元' },
          { label: '月均', value: money(avg), unit: '元' },
        ],
        chips: [],
        charts: [{
          title: category + ' 逐月支出',
          kind: 'bar',
          input: barInputOf(series, '有支出的月不到 2 个，画不出逐月柱子；合计与峰值看上面那排读数。'),
        }],
        listCards: [],
        factCards: [],
        empty: {
          text: '近 ' + String(months) + ' 个月里「' + category + '」还没有记录。',
          hint: '先说「记支出」记一笔，或者换一个分类再看；回来看这里就有数了。',
        },
      },
    };
  },
};
