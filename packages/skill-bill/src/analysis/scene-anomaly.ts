/** 场景件：**看异常**（`kind = 'anomaly'`，命令 `bill.analysis.trend`）——本件只是差异声明与取值，
 *  块位序列住 `./template-charts.ts`（族＝读数＋图；#729）。
 *
 * 老侧对应件：`scripts/analysis/cli.py` 的 `cmd_anomaly`（`:742-789`）
 *  ＋ 模板 `templates/分析/analysis_view.html` 的 `renderAnomaly`（`:917-957`）。
 *
 * 本件的差异（照老侧那一页逐点对；#688 §四 裁定 3 的图判据住本件）：
 *   ① 窗口＝近 N 个月（缺省 6）；图卡＝**折线**（支出／收入两条）：没有记录的月**不出点**
 *      （`value: null`）＋ 跨空档**同色虚线**（`gapStyle: 'dashed'`）＋ 纵轴**可读刻度**（`yTicks: 4`）；
 *   ② **环比只算相邻两个月都有支出的那些月**（老侧只要求前一个月大于 0——空月或支出为 0 的月会被
 *      算成「降了 100%」，那是把「没有记录」读成了「没花钱」）；不画半截线：可用点不到 2 个时图卡改出说明句；
 *   ③ **分类暴涨**：最近一个月 vs **上一个有记录的月**（老侧 `months_sorted` 同义），按一级分类算**支出**——
 *      老侧那一支把收入（如工资）也按 `abs(amount)` 混进同一堆，本件只算支出侧；
 *   ④ 口径句**点名没有记录的月**（老侧那一页没有这句）；
 *   ⑤ #688 §二 C9：这一页必须给出可执行的下一步——老侧那句「建议核对: 是否存在一次性大额 / 记错分类 / 真实增长」
 *      逐字搬进口径句；
 *   ⑥ 老侧列表行里那枚「⚠ 幅度较大」徽标（幅度 ≥ 50% 时出）不上屏——百分比就在同一行右侧，
 *      徽标只是同一事实的第二遍；要恢复就在 `main` 里补那句话。
 *
 * 谁在用（一个调用点，指名）：`src/analysis/read.ts` 的 `pageOf`——`family === 'charts'` 的 4 件场景
 *  由落点表 `./scene.js` 取到本件。
 */
import { runWithLanguage } from 'base-entries';
import type { BillRow } from '../fetch/db.js';
import { BillPolicyError } from '../fetch/errors.js';
import { monthRange } from '../shared/dateRange.js';
import { aggByL1, allRecords, kpiOf, monthOf, monthSeries, round1 } from './agg.js';
import type { MonthPoint } from './agg.js';
import { MISSING, NO_WINDOW, money, pctText, windowLabel } from './pageParts.js';
import type { AnalysisScene, ChartCard } from './scene.js';
import { buildTrend } from './views.js';
import { m } from '../entries/index.js';

/** 环比一行的读数。 */
interface MomRow {
  readonly month: string;
  readonly prev: number;
  readonly cur: number;
  readonly pct: number;
}

/** 分类暴涨一行的读数。 */
interface SurgeRow {
  readonly category: string;
  readonly prev: number;
  readonly cur: number;
  readonly pct: number;
}

/** 正整数型参数（缺＝缺省值）。老侧 `args.months or 6` 的严格版：形态不对即报参数错。 */
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

/** 序列里**没有记录**的月份（`count === 0`＝那个月一条记录都没有）。 */
function gapsOf(series: readonly MonthPoint[]): readonly string[] {
  return series.filter((p) => p.count === 0).map((p) => p.month);
}

/** 月度环比：只算相邻两个月**都有支出**的那些月（空月与支出为 0 的月不参与对比）。 */
function momOf(series: readonly MonthPoint[]): MomRow[] {
  const out: MomRow[] = [];
  for (let i = 1; i < series.length; i += 1) {
    const prev = series[i - 1];
    const cur = series[i];
    if (prev.expense <= 0 || cur.expense <= 0) continue;
    out.push({
      month: cur.month,
      prev: prev.expense,
      cur: cur.expense,
      pct: round1(((cur.expense - prev.expense) / prev.expense) * 100),
    });
  }
  return out;
}

/** 分类暴涨：最近一个月 vs 上一个**有记录的**月，按一级分类算支出，涨幅降序取前 10（老侧同序）。 */
function surgeOf(rows: readonly BillRow[], last: string, prev: string): SurgeRow[] {
  const before = new Map(aggByL1(rows.filter((r) => monthOf(r.time) === prev)).map((a) => [a.key, a.value]));
  return aggByL1(rows.filter((r) => monthOf(r.time) === last))
    .map((a) => {
      const base = before.get(a.key) ?? 0;
      return { category: a.key, prev: base, cur: a.value, pct: base === 0 ? 0 : round1(((a.value - base) / base) * 100) };
    })
    .filter((x) => x.prev > 0 && x.cur > x.prev)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 10);
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
      series: [{ name: m('skill-bill.analysis-scene-anomaly.c001'), items: expense }, { name: m('skill-bill.analysis-scene-anomaly.c002'), items: income }],
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

/** 一行的箭头与百分比（升／降／持平三态；持平不留白、也不谎报降）。 */
function deltaText(pct: number): string {
  return (pct > 0 ? '↑ ' : pct < 0 ? '↓ ' : '→ ') + pctText(Math.abs(pct));
}

function buildScene(): AnalysisScene {
  return {
  id: 'anomaly',
  key: 'bill.analysis.trend',
  kind: 'anomaly',
  title: m('skill-bill.analysis-scene-anomaly.title'),
  family: 'charts',
  values: ({ params, db }) => {
    /* ① 取数：窗口＝近 N 个月，序列终点＝库里最新一条记录所在的月（不取今天的月）。 */
    const months = monthsOf(params, 6);
    const all = allRecords(db);
    const series = monthSeries(all, months);
    const rows = windowRowsOf(all, series);
    const kpi = kpiOf(rows);
    const gaps = gapsOf(series);
    const recorded = series.filter((p) => p.count > 0);
    const mom = momOf(series);
    const widest = mom.length === 0 ? null : [...mom].sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))[0];

    /* ② 分类暴涨：最近一个月 vs 上一个有记录的月（按一级分类算支出，涨幅降序前 10）。 */
    const withRows = [...new Set(all.map((r) => monthOf(r.time)))].sort();
    const lastMonth = withRows.length >= 2 ? withRows[withRows.length - 1] : '';
    const prevMonth = withRows.length >= 2 ? withRows[withRows.length - 2] : '';
    const surge = lastMonth === '' ? [] : surgeOf(all, lastMonth, prevMonth);
    const topSurge = surge.length === 0 ? null : surge[0];

    /* ③ 期间标签与来源脚注的窗口起止。 */
    const firstMonth = series.length === 0 ? '' : series[0].month;
    const endMonth = series.length === 0 ? '' : series[series.length - 1].month;

    /* ④ 结论句与口径句：空月点名（裁定 3 第 4 条）＋ 可执行的下一步（#688 §二 C9）。 */
    const surgeTail = topSurge === null
      ? m('skill-bill.analysis-scene-anomaly.c004')
      : m('skill-bill.analysis-scene-anomaly.c005', {
        p0: String(topSurge.category),
        p1: String(pctText(topSurge.pct)),
      });
    const conclusion = kpi.count === 0
      ? m('skill-bill.analysis-scene-anomaly.c006', { p0: String(String(months)) })
      : widest === null
        ? m('skill-bill.analysis-scene-anomaly.c007', { p0: String(String(series.length)) })
        : m('skill-bill.analysis-scene-anomaly.c008', {
          p0: String(String(series.length)),
          p1: String(widest.month),
          p2: String(money(widest.prev)),
          p3: String(money(widest.cur)),
          p4: String(deltaText(widest.pct)),
          p5: String(surgeTail),
        });
    const caliber = [
      m('skill-bill.analysis-scene-anomaly.c009'),
      m('skill-bill.analysis-scene-anomaly.c010', { p0: String(String(months)) }),
      gaps.length === 0
        ? m('skill-bill.analysis-scene-anomaly.c011', { p0: String(String(series.length)) })
        : m('skill-bill.analysis-scene-anomaly.c012', {
          p0: String(gaps.join('、')),
          p1: String(String(gaps.length)),
        }),
      recorded.length < 2 ? m('skill-bill.analysis-scene-anomaly.c013') : '',
      lastMonth === '' ? m('skill-bill.analysis-scene-anomaly.c014') : m('skill-bill.analysis-scene-anomaly.c015', { p0: String(prevMonth), p1: String(lastMonth) }),
      m('skill-bill.analysis-scene-anomaly.c016'),
      m('skill-bill.analysis-scene-anomaly.c017'),
    ].filter((s) => s !== '').join('；') + '。';

    return {
      title: m('skill-bill.analysis-scene-anomaly.title'),
      label: windowLabel(firstMonth, endMonth),
      from: firstMonth === '' ? NO_WINDOW : monthRange(firstMonth).start,
      to: endMonth === '' ? NO_WINDOW : monthRange(endMonth).end,
      count: rows.length,
      conclusion,
      caliber,
      chips: [m('skill-bill.analysis-scene-anomaly.c019', { p0: String(String(months)) })],
      payload: buildTrend('anomaly', [...all], { limit: 6 }),
      kpi,
      page: {
        kpis: [],
        chips: [m('skill-bill.analysis-scene-anomaly.c020', { p0: String(String(months)) })],
        charts: [{
          title: m('skill-bill.analysis-scene-anomaly.c021'),
          kind: 'line',
          input: lineInputOf(series, recorded.length, m('skill-bill.analysis-scene-anomaly.c022')),
        }],
        listCards: [{
          title: m('skill-bill.analysis-scene-anomaly.c023'),
          rows: mom.map((x) => ({
            left: x.month,
            main: money(x.prev) + ' → ' + money(x.cur),
            right: deltaText(x.pct),
          })),
          emptyText: m('skill-bill.analysis-scene-anomaly.c024'),
        }],
        factCards: [{
          title: m('skill-bill.analysis-scene-anomaly.c025'),
          rows: surge.length === 0
            ? [{ k: m('skill-bill.analysis-scene-anomaly.c026'), v: MISSING }]
            : surge.map((x) => ({ k: x.category + ' +' + pctText(x.pct), v: money(x.prev) + ' → ' + money(x.cur) })),
        }],
        empty: {
          text: m('skill-bill.analysis-scene-anomaly.c027', { p0: String(String(months)) }),
          hint: m('skill-bill.analysis-scene-anomaly.c028'),
        },
      },
    };
  },
  };
}

export const sceneAnomaly: AnalysisScene = buildScene();

/** 按语言重建本场景（#1197：文案经词条层，语言是运行期参数）。 */
export function sceneAnomalyFor(language: string): AnalysisScene {
  return runWithLanguage(language, buildScene);
}
