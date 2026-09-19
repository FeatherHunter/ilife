/** 场景件：**看年度**（`kind = 'yearly'`，命令 `bill.analysis.overview`）——本件只是差异声明与取值，
 *  块位序列住 `./template-bars.ts`（族＝读数＋条）。
 *
 * 老侧对应件：`scripts/analysis/cli.py` 的 `cmd_yearly`（`:194-210`）
 *  ＋ 模板 `templates/分析/analysis_view.html` 的 `renderYearly`（`:306-327`）。
 *
 * 本件的差异（照老侧那一页逐点对）：
 *   ① 期间＝参数给的年份（缺 `year` 即今年，老侧 `args.year or date.today().year` 同条口径；
 *      数字与数字串都认——参数走命令行 JSON，`"2026"` 与 `2026` 都到得了这里）；
 *   ② 逐月趋势取 `monthSeries(rows, 12)`：**序列终点＝库里最新一条记录所在的月**（老侧 `_month_series`
 *      就这口径，本件不改成从今天起算），12 条不论有没有记录都出一条（空月读数是 0 笔）；
 *   ③ 大额分类**按一级分类归堆**（老侧 `_agg_expense_by(..., lambda r: _l1(r.category), top_n=8)`），
 *      只出前 8 类；条长按**本页最大一类**折算（老侧 `Math.max(...cats…)` 的分母是截过前 8 名的那一份）；
 *   ④ 逐月条卡与分类条卡的空态句各出一句（老侧两张卡各自的 `emptyState({text})`）；
 *   ⑤ 载荷照搬迁前那一支（`./views.js` 的 `buildOverview`），一字不改。
 */
import { listRange } from '../fetch/index.js';
import { BillPolicyError } from '../fetch/errors.js';
import { aggByL1, kpiOf, monthSeries, round1, yearRange } from './agg.js';
import { money, pctText } from './pageParts.js';
import type { AnalysisScene } from './scene.js';
import { buildOverview } from './views.js';

/** 年份槽：缺＝今年；数字与数字串都认，认不得即如实抛。 */
function readYear(params: Record<string, unknown>): number {
  const raw = params.year;
  if (raw === undefined || raw === null || raw === '') return new Date().getFullYear();
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n) || Math.floor(n) !== n || n < 1000 || n > 9999) {
    throw new BillPolicyError('POLICY_BAD_INPUT', 'year 得是四位年份：' + JSON.stringify(raw));
  }
  return n;
}

export const sceneYearly: AnalysisScene = {
  id: 'yearly',
  key: 'bill.analysis.overview',
  kind: 'yearly',
  title: '看年度',
  family: 'bars',
  values: ({ params, db }) => {
    const year = readYear(params);
    const { start, end } = yearRange(year);
    const records = listRange(db, start, end);
    const kpi = kpiOf(records);
    const monthly = monthSeries(records, 12);
    const cats = aggByL1(records, { topN: 8 });
    const maxMonth = monthly.length === 0 ? 0 : Math.max(...monthly.map((m) => m.expense));
    const maxCat = cats.length === 0 ? 0 : Math.max(...cats.map((c) => c.value));
    const label = String(year);
    return {
      title: '看年度',
      label,
      from: start,
      to: end,
      count: records.length,
      conclusion: kpi.count === 0
        ? label + ' 这一年一笔都没有记。'
        : label + ' 年一共记了 ' + String(kpi.count) + ' 笔：支出 ' + money(kpi.expense) + ' 元、收入 '
          + money(kpi.income) + ' 元、净额 ' + money(kpi.net) + ' 元。',
      caliber: '逐月趋势的条长按全年支出最多的那个月折算，没有记录的月照实出 0 笔；大额分类只出前 8 名，'
        + '按一级分类归堆、占比按全年支出合计算；转账不计入收支。',
      chips: [label + ' 年'],
      payload: buildOverview(label, [...records]),
      kpi,
      page: {
        kpis: [
          { label: '全年支出', value: money(kpi.expense), unit: '元' },
          { label: '全年收入', value: money(kpi.income), unit: '元' },
          { label: '净额', value: money(kpi.net), unit: '元', detail: kpi.net >= 0 ? '收大于支' : '支大于收' },
          { label: '笔数', value: String(kpi.count), unit: '笔' },
        ],
        chips: [],
        charts: [],
        barGroups: [
          {
            title: '逐月趋势（' + String(monthly.length) + ' 个月）',
            rows: monthly.map((m) => ({
              label: m.month,
              text: money(m.expense) + ' 元 · ' + String(m.count) + ' 笔',
              pct: maxMonth === 0 ? 0 : round1((m.expense / maxMonth) * 100),
            })),
            emptyText: '这一年还没有可对比的月度数据',
          },
          {
            title: '大额分类 TOP',
            rows: cats.map((c) => ({
              label: c.key,
              text: money(c.value) + ' 元 · ' + pctText(c.pct) + ' · ' + String(c.count) + ' 笔',
              pct: maxCat === 0 ? 0 : round1((c.value / maxCat) * 100),
            })),
            emptyText: '这一年还没有支出记录',
          },
        ],
        listCards: [],
        factCards: [],
        empty: {
          text: label + ' 年这段时间还没有记录。',
          hint: '先说「记支出」或「记收入」记一笔，回来看这里就有数了。',
        },
      },
    };
  },
};
