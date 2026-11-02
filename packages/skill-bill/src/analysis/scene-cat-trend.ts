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
import { runWithLanguage, listJoin, currentRenderLanguage } from 'base-entries';
import type { BillRow } from '../fetch/db.js';
import { BillPolicyError } from '../fetch/errors.js';
import { EXPENSE_L1 } from '../shared/category.js';
import { monthRange } from '../shared/dateRange.js';
import { allRecords, filterOf, kpiOf, monthOf, monthSeries, round2 } from './agg.js';
import type { MonthPoint } from './agg.js';
import { MISSING, NO_WINDOW, money, windowLabel } from './pageParts.js';
import type { AnalysisScene, ChartCard } from './scene.js';
import { buildTrend } from './views.js';
import { m } from '../entries/index.js';

/** 分类名（缺＝「餐饮」，与老侧同一句缺省；取共用位分类表第一项，数据不译）。给了但不是非空串即报参数错。 */
const DEFAULT_CATEGORY = EXPENSE_L1[0];

function categoryOf(params: Record<string, unknown>): string {
  const raw = params['category'];
  if (raw === undefined || raw === null || raw === '') return DEFAULT_CATEGORY;
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

function buildScene(): AnalysisScene {
  return {
  id: 'cat_trend',
  key: 'bill.analysis.trend',
  kind: 'category',
  title: m('skill-bill.analysis-scene-cat-trend.title'),
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
    const peakTail = peak > 0 ? m('skill-bill.analysis-scene-cat-trend.c003', { p0: String(peakMonth), p1: String(money(peak)) }) : '';
    const conclusion = kpi.count === 0
      ? m('skill-bill.analysis-scene-cat-trend.c004', { p0: String(category), p1: String(String(months)) })
      : m('skill-bill.analysis-scene-cat-trend.c005', {
        p0: String(category),
        p1: String(String(series.length)),
        p2: String(money(totalExpense)),
        p3: String(peakTail),
        p4: String(money(avg)),
      });
    const caliber = [
      m('skill-bill.analysis-scene-cat-trend.c006', { p0: String(category), p1: String(category) }),
      m('skill-bill.analysis-scene-cat-trend.c007', { p0: String(String(months)) }),
      gaps.length === 0
        ? m('skill-bill.analysis-scene-cat-trend.c008', { p0: String(String(series.length)) })
        : m('skill-bill.analysis-scene-cat-trend.c009', {
          p0: String(listJoin(currentRenderLanguage(), gaps)),
          p1: String(String(gaps.length)),
        }),
      m('skill-bill.analysis-scene-cat-trend.c010'),
      bars.length < 2 ? m('skill-bill.analysis-scene-cat-trend.c011') : '',
      m('skill-bill.analysis-scene-cat-trend.c012'),
    ].filter((s) => s !== '').join('；') + '。';

    return {
      title: m('skill-bill.analysis-scene-cat-trend.title'),
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
          { label: m('skill-bill.analysis-scene-cat-trend.c014'), value: category },
          { label: m('skill-bill.analysis-scene-cat-trend.c015'), value: peakMonth },
          { label: m('skill-bill.analysis-scene-cat-trend.c016'), value: money(peak), unit: m('skill-bill.analysis-scene-cat-trend.c017') },
          { label: m('skill-bill.analysis-scene-cat-trend.c018'), value: money(avg), unit: m('skill-bill.analysis-scene-cat-trend.c019') },
        ],
        chips: [],
        charts: [{
          title: m('skill-bill.analysis-scene-cat-trend.c020', { p0: String(category) }),
          kind: 'bar',
          input: barInputOf(series, m('skill-bill.analysis-scene-cat-trend.c021')),
        }],
        /* #1138：DETAIL 段那 5 行（判地 entry-rows 逐字对）：总额 1 行 ＋ 有支出的月各 1 行 ＋ 峰值月 1 行 ＋ 月均 1 行。
           月份集合与图卡取同一批（`bars`＝支出>0 的月），两处不走散；序号由装配点的行序计数器给（#1135）。 */
        listCards: kpi.count === 0 ? [] : [{
          title: m('skill-bill.analysis-scene-cat-trend.c022'),
          rows: [
            { left: m('skill-bill.analysis-scene-cat-trend.c023'), main: m('skill-bill.analysis-scene-cat-trend.c024', {
              p0: String(category),
              p1: String(String(series.length)),
              p2: String(String(kpi.count)),
            }), right: m('skill-bill.analysis-scene-cat-trend.c025', { p0: String(money(totalExpense)) }) },
            ...bars.map((p) => ({ left: p.month, main: m('skill-bill.analysis-scene-cat-trend.c026', { p0: String(String(p.count)) }), right: m('skill-bill.analysis-scene-cat-trend.c027', { p0: String(money(p.expense)) }) })),
            { left: m('skill-bill.analysis-scene-cat-trend.c028'), main: peakMonth, right: m('skill-bill.analysis-scene-cat-trend.c029', { p0: String(money(peak)) }) },
            { left: m('skill-bill.analysis-scene-cat-trend.c030'), main: m('skill-bill.analysis-scene-cat-trend.c031', { p0: String(String(series.length)) }), right: m('skill-bill.analysis-scene-cat-trend.c032', { p0: String(money(avg)) }) },
          ],
          emptyText: m('skill-bill.analysis-scene-cat-trend.c033', { p0: String(category), p1: String(String(months)) }),
        }],
        factCards: [],
        empty: {
          text: m('skill-bill.analysis-scene-cat-trend.c034', { p0: String(String(months)), p1: String(category) }),
          hint: m('skill-bill.analysis-scene-cat-trend.c035'),
        },
      },
    };
  },
  };
}

export const sceneCatTrend: AnalysisScene = buildScene();

/** 按语言重建本场景（#1197：文案经词条层，语言是运行期参数）。 */
export function sceneCatTrendFor(language: string): AnalysisScene {
  return runWithLanguage(language, buildScene);
}
