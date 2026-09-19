/** 场景件：**看洞察**（`kind = 'insight'`，命令 `bill.analysis.trend`）——本件只是差异声明与取值，
 *  块位序列住 `./template-insight.ts`（族＝解读＋多卡）。
 *
 *  老侧对应件：`scripts/analysis/cli.py` 的 `cmd_insight`（`:725-739`，事实层走 `scripts/insights.py` 的
 *  `build_insight_facts`＝`:42-170`）＋ 模板 `templates/分析/analysis_view.html` 的 `renderInsight`（`:862-914`）。
 *
 *  本件的差异（照老侧那一页逐点对）：
 *   ① **区间**＝库里**最后一条记录所在月**往前数 `months` 个月（不是今天）——老侧拿全库记录算区间汇总，
 *      新侧先把窗口切出来再算，于是「区间支出／收入／净额／笔数」与「大额支出」都落在这段窗口里；
 *   ② **月度均值／最大偏离月**照老侧那一支：均值＝窗口内各月支出的算术平均，偏离度＝
 *      (该月支出 − 均值)/均值，取绝对值最大的那个月（均值不是两段均值，是「每月支出」的平均）；
 *      老侧还算了一个中位数，但那一页没有它的落点（老页面只摆 3 行事实），本件不产出无落点的数；
 *   ③ 老侧那一段 `parseAiNote`（把 AI 解读文本切段）**不照抄**（#688 §二 C8）：新侧分析页由本地 CLI
 *      渲染、没有 AI 解读文本可切，解读那一段由页头**结论句**承载（把「这批数说明了什么」写进 `conclusion`）；
 *   ④ **载荷**照搬迁前那一支（`./views.js` 的 `buildTrend`），一字不改。
 */
import { BillPolicyError } from '../fetch/errors.js';
import { listRange } from '../fetch/index.js';
import { monthRange } from '../shared/dateRange.js';
import { aggByL1, allRecords, dayOf, expenseTop, firstTimeOf, kpiOf, lastTimeOf, monthOf, monthSeries, prevMonth, round1, thisMonth } from './agg.js';
import type { MonthPoint } from './agg.js';
import { money, pctText, signedMoney, windowLabel } from './pageParts.js';
import type { AnalysisScene, ChartCard } from './scene.js';
import { buildTrend } from './views.js';

/** 窗口月数（缺省 6，与老侧 `args.months or 6` 同义）；形态不对即阻断。 */
function monthsOf(params: Record<string, unknown>): number {
  const raw = params.months;
  if (raw === undefined || raw === null || raw === '') return 6;
  const n = typeof raw === 'string' ? Number(raw.trim()) : raw;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 1) {
    throw new BillPolicyError('POLICY_BAD_INPUT', 'months 须是大于 0 的数：' + JSON.stringify(raw));
  }
  return Math.floor(n);
}

/** 从 `end` 这个月往回数 `months` 个月，返回起点月（闭区间：含 `end` 那一月）。 */
function startMonthOf(end: string, months: number): string {
  let cur = end;
  for (let i = 1; i < months; i += 1) cur = prevMonth(cur);
  return cur;
}

/** 偏离度的上屏写法（正数带 `+`；老侧 `fmtPct(max_deviation.deviation_pct)` 同义）。 */
function devText(pct: number): string {
  return (pct >= 0 ? '+' : '') + pctText(pct);
}

export const sceneInsight: AnalysisScene = {
  id: 'insight',
  key: 'bill.analysis.trend',
  kind: 'insight',
  title: '看洞察',
  family: 'insight',
  values: ({ params, db }) => {
    const months = monthsOf(params);
    const lastTime = lastTimeOf(allRecords(db));
    const endMonth = lastTime === '' ? thisMonth() : monthOf(lastTime);
    const startMonth = startMonthOf(endMonth, months);
    const records = listRange(db, startMonth + '-01', monthRange(endMonth).end);
    const kpi = kpiOf(records);
    const cats = aggByL1(records);
    const top = cats.slice(0, 8);
    const max = cats.reduce((m, c) => Math.max(m, c.value), 0);
    const series = monthSeries(records, months);
    const mean = series.length === 0 ? 0 : series.reduce((s, m) => s + m.expense, 0) / series.length;
    let worst: { readonly month: string; readonly pct: number } | undefined;
    for (const m of series) {
      const pct = mean === 0 ? 0 : round1(((m.expense - mean) / mean) * 100);
      if (worst === undefined || Math.abs(pct) > Math.abs(worst.pct)) worst = { month: m.month, pct };
    }
    const tops = expenseTop(records, 10);
    const head = cats[0];
    const span = windowLabel(dayOf(firstTimeOf(records)), dayOf(lastTimeOf(records)));
    const label = '近 ' + String(months) + ' 个月（' + startMonth + ' ~ ' + endMonth + '）';
    /* 月度走势：支出／收入两条系列；**没有记录的月给 `null`**（图上断开、不按 0 画）。 */
    const points = (pick: (m: MonthPoint) => number): { readonly label: string; readonly value: number | null }[] =>
      series.map((m) => ({ label: m.month, value: m.count === 0 ? null : pick(m) }));
    const expenseItems = points((m) => m.expense);
    const chart: ChartCard = {
      title: '月度走势（近 ' + String(months) + ' 个月）',
      kind: 'line',
      input: {
        items: expenseItems,
        options: {
          yTicks: 3,
          labels: 'select',
          legend: true,
          gapStyle: 'dashed',
          series: [
            { name: '支出', items: expenseItems },
            { name: '收入', items: points((m) => m.income) },
          ],
        },
      },
    };
    return {
      title: '看洞察',
      label,
      from: startMonth + '-01',
      to: monthRange(endMonth).end,
      count: records.length,
      conclusion: kpi.count === 0
        ? label + ' 一条记录都没有。'
        : label + ' 共 ' + String(kpi.count) + ' 笔：支出 ' + money(kpi.expense) + ' 元、收入 ' + money(kpi.income)
          + ' 元、净额 ' + money(kpi.net) + ' 元'
          + (head === undefined ? '。' : '；花得最多的是「' + head.key + '」' + money(head.value) + ' 元（占 ' + pctText(head.pct) + '）')
          + (worst === undefined ? '。' : '；' + worst.month + ' 支出偏离月均 ' + devText(worst.pct) + '。'),
      caliber: '区间按库里最后一条记录所在的月份往前数 ' + String(months) + ' 个月（不按今天）；分类按一级归堆（两级／三级分类并到一级），条长按最大一类折算；月度走势里没有记录的月不补 0、在图上断开；转账不计入收支。',
      chips: [],
      payload: buildTrend('insight', [...records], { limit: 10 }),
      kpi,
      page: {
        kpis: [
          { label: '区间支出', value: money(kpi.expense), unit: '元' },
          { label: '区间收入', value: money(kpi.income), unit: '元' },
          { label: '净额', value: money(kpi.net), unit: '元', detail: kpi.net >= 0 ? '收大于支' : '支大于收' },
          { label: '笔数', value: String(kpi.count), unit: '笔' },
        ],
        factCards: [{
          title: '这批数的事实',
          rows: [
            { k: '区间', v: span },
            { k: '趋势均值', v: money(mean) + ' 元/月' },
            { k: '最大偏离月', v: worst === undefined ? '' : worst.month + '（' + devText(worst.pct) + '）' },
          ],
        }],
        barGroups: [{
          title: '消费习惯（分类分布，共 ' + String(cats.length) + ' 类）',
          rows: top.map((c) => ({
            label: c.key,
            text: money(c.value) + ' 元 · ' + String(c.count) + ' 笔 · ' + pctText(c.pct),
            pct: max === 0 ? 0 : round1((c.value / max) * 100),
          })),
          emptyText: '这一段还没有支出记录',
        }],
        charts: [chart],
        listCards: [{
          title: '大额支出 TOP ' + String(tops.length),
          rows: tops.map((r) => ({
            left: dayOf(r.time),
            main: r.note === '' ? r.category : r.category + ' · ' + r.note,
            right: signedMoney(r.amount),
          })),
          emptyText: '这一段还没有支出记录',
        }],
        empty: {
          text: '这 ' + String(months) + ' 个月里一条记录都没有。',
          hint: '先说「记支出」或「记收入」记一笔，回来看这里就有数了。',
        },
      },
    };
  },
};
