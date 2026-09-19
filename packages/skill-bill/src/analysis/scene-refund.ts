/** 场景件：**看退款**（`kind = 'refund'`，命令 `bill.analysis.trend`）——本件只是差异声明与取值，
 *  块位序列住 `./template-bars.ts`（族＝读数＋条）。
 *
 * 老侧对应件：`scripts/analysis/cli.py` 的 `cmd_refund_summary`（`:930-949`，取数走 `_tag_records("退款")`）
 *  ＋ 模板 `templates/分析/analysis_view.html` 的 `renderRefundSummary`（`:1045-1065`）。
 *
 * 本件的差异（照老侧那一页逐点对）：
 *   ① 取数＝`./agg.js` 的 `tagRecords(allRecords(db), '退款')`——备注里带 `#退款` 标签的那些记录
 *      （老侧 `_tag_records` 的等价物，整词匹配规则住共用位 `../fetch/db.js` 的 `tagMatch`）；
 *   ② **无参数**（老侧同：`cmd_refund_summary` 不收窗口），来源脚注的窗口写「不限」；
 *   ③ 两格读数＝退款总额（各笔金额绝对值合计）／退款次数；
 *   ④ 月份分布＝`./agg.js` 的 `monthSeries` 逐月次数，**只列有退款的月**（老侧 `by_month` 同），
 *      条长按最多的那个月折算；
 *   ⑤ 退款明细按时间倒序（老侧 `sorted(..., reverse=True)` 同）、每笔一行：
 *      左＝日期、主文＝「分类 · 备注」、右＝`+金额`（老侧那条备注另占一行，新侧并进主文，#681 偏好 3）；
 *      老侧超过 200 条即截断并注明「仅显示前 200 条」，新侧不截断（一页列全，见回报）；
 *   ⑥ 载荷＝`./views.js` 的 `buildTrend('refund', …)`。
 */
import type { BillRow } from '../fetch/db.js';
import { allRecords, dayOf, firstTimeOf, kpiOf, lastTimeOf, monthOf, monthSeries, round1, tagRecords } from './agg.js';
import { NO_WINDOW, money, textOrDash } from './pageParts.js';
import type { AnalysisScene } from './scene.js';
import { buildTrend } from './views.js';

/** 记录跨了几个月（首笔所在月到最近一笔所在月，含首尾）；没有记录＝0。 */
function monthSpan(records: readonly BillRow[]): number {
  const first = firstTimeOf(records);
  const last = lastTimeOf(records);
  if (first === '' || last === '') return 0;
  const a = monthOf(first);
  const b = monthOf(last);
  const span = (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12
    + (Number(b.slice(5, 7)) - Number(a.slice(5, 7))) + 1;
  return span < 1 ? 1 : span;
}

export const sceneRefund: AnalysisScene = {
  id: 'refund',
  key: 'bill.analysis.trend',
  kind: 'refund',
  title: '看退款',
  family: 'bars',
  values: ({ db }) => {
    const rows = tagRecords(allRecords(db), '退款');
    const total = rows.reduce((sum, r) => sum + Math.abs(r.amount), 0);
    const monthly = monthSeries(rows, monthSpan(rows)).filter((m) => m.count > 0);
    const peak = monthly.length === 0 ? 0 : Math.max(...monthly.map((m) => m.count));
    const recent = lastTimeOf(rows);
    return {
      title: '看退款',
      label: '全部时间',
      from: NO_WINDOW,
      to: NO_WINDOW,
      count: rows.length,
      conclusion: rows.length === 0
        ? '还没有一笔备注里带退款标签的记录。'
        : '退款 ' + String(rows.length) + ' 次，合计 ' + money(total) + ' 元；最近一次在 '
          + textOrDash(dayOf(recent)) + '。',
      caliber: '取备注里带 #退款 标签的记录；金额按绝对值合计，月份分布按记录时间逐月归堆、只列有退款的月。',
      chips: [],
      payload: buildTrend('refund', [...rows]),
      kpi: kpiOf(rows),
      page: {
        kpis: [
          { label: '退款总额', value: money(total), unit: '元' },
          { label: '退款次数', value: String(rows.length), unit: '次' },
        ],
        chips: [],
        charts: [],
        barGroups: [{
          title: '月份分布（' + String(monthly.length) + ' 个月）',
          rows: monthly.map((m) => ({
            label: m.month,
            text: String(m.count) + ' 次',
            pct: peak === 0 ? 0 : round1((m.count / peak) * 100),
          })),
          emptyText: '还没有退款记录，看不出月份分布',
        }],
        listCards: [{
          title: '退款明细（' + String(rows.length) + ' 笔）',
          rows: [...rows]
            .sort((a, b) => b.time.localeCompare(a.time))
            .map((r) => ({
              left: textOrDash(dayOf(r.time)),
              main: textOrDash(r.category) + ' · ' + textOrDash(r.note),
              right: '+' + money(Math.abs(r.amount)),
            })),
          emptyText: '还没有退款记录',
        }],
        factCards: [],
        empty: {
          text: '还没有一笔备注里带退款标签的记录。',
          hint: '哪一笔退了钱，就在备注里写上 #退款，回来看这里就有数了。',
        },
      },
    };
  },
};
