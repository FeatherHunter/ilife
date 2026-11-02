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
import { runWithLanguage } from 'base-entries';
import type { BillRow } from '../fetch/db.js';
import { allRecords, dayOf, firstTimeOf, kpiOf, lastTimeOf, monthOf, monthSeries, round1, tagRecords } from './agg.js';
import { NO_WINDOW, money, textOrDash } from './pageParts.js';
import type { AnalysisScene } from './scene.js';
import { buildTrend } from './views.js';
import { m } from '../entries/index.js';

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

function buildScene(): AnalysisScene {
  return {
  id: 'refund',
  key: 'bill.analysis.trend',
  kind: 'refund',
  title: m('skill-bill.analysis-scene-refund.title'),
  family: 'bars',
  values: ({ db }) => {
    const rows = tagRecords(allRecords(db), '退款');
    const total = rows.reduce((sum, r) => sum + Math.abs(r.amount), 0);
    const monthly = monthSeries(rows, monthSpan(rows)).filter((m) => m.count > 0);
    const peak = monthly.length === 0 ? 0 : Math.max(...monthly.map((m) => m.count));
    const recent = lastTimeOf(rows);
    return {
      title: m('skill-bill.analysis-scene-refund.title'),
      label: m('skill-bill.analysis-scene-refund.c004'),
      from: NO_WINDOW,
      to: NO_WINDOW,
      count: rows.length,
      conclusion: rows.length === 0
        ? m('skill-bill.analysis-scene-refund.c005')
        : m('skill-bill.analysis-scene-refund.c006', {
          p0: String(String(rows.length)),
          p1: String(money(total)),
          p2: String(textOrDash(dayOf(recent))),
        }),
      caliber: m('skill-bill.analysis-scene-refund.c007'),
      chips: [],
      payload: buildTrend('refund', [...rows]),
      kpi: kpiOf(rows),
      page: {
        kpis: [
          { label: m('skill-bill.analysis-scene-refund.c008'), value: money(total), unit: m('skill-bill.analysis-scene-refund.c009') },
          { label: m('skill-bill.analysis-scene-refund.c010'), value: String(rows.length), unit: m('skill-bill.analysis-scene-refund.c011') },
        ],
        chips: [],
        charts: [],
        barGroups: [{
          title: m('skill-bill.analysis-scene-refund.c012', { p0: String(String(monthly.length)) }),
          rows: monthly.map((pt) => ({
            label: pt.month,
            text: m('skill-bill.analysis-scene-refund.c013', { p0: String(String(pt.count)) }),
            pct: peak === 0 ? 0 : round1((pt.count / peak) * 100),
          })),
          emptyText: m('skill-bill.analysis-scene-refund.c014'),
        }],
        listCards: [{
          title: m('skill-bill.analysis-scene-refund.c015', { p0: String(String(rows.length)) }),
          rows: [...rows]
            .sort((a, b) => b.time.localeCompare(a.time))
            .map((r) => ({
              left: textOrDash(dayOf(r.time)),
              main: textOrDash(r.category) + ' · ' + textOrDash(r.note),
              right: '+' + money(Math.abs(r.amount)),
            })),
          emptyText: m('skill-bill.analysis-scene-refund.c016'),
        }],
        factCards: [],
        empty: {
          text: m('skill-bill.analysis-scene-refund.c017'),
          hint: m('skill-bill.analysis-scene-refund.c018'),
        },
      },
    };
  },
  };
}

export const sceneRefund: AnalysisScene = buildScene();

/** 按语言重建本场景（#1197：文案经词条层，语言是运行期参数）。 */
export function sceneRefundFor(language: string): AnalysisScene {
  return runWithLanguage(language, buildScene);
}
