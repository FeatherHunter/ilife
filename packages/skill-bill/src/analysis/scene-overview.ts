/** 场景件：**看总览**（`kind = 'overview'`，命令 `bill.analysis.overview`）——本件只是差异声明与取值，
 *  块位序列住 `./template-bars.ts`（族＝读数＋条）。
 *
 * 老侧对应件：`scripts/analysis/cli.py` 的 `cmd_overview`（`:213-237`）
 *  ＋ 模板 `templates/分析/analysis_view.html` 的 `renderOverview`（`:330-344`）。
 *
 * 本件的差异（照老侧那一页逐点对）：
 *   ① 期间＝参数给的起止（`start`／`end` **同给**，校验走 `./params.js` 的 `needRange`；两端缺一即
 *      缺槽位阻断），缺时退回**本月**（老侧 `args.month or date.today().strftime("%Y-%m")` 那条兼容路）；
 *   ② 天数＝`daysBetween(start, end)`，与老侧 `(to − from).days + 1` 同为**含首尾**的天数；
 *   ③ 这一页**没有条卡**（`barGroups: []`）：老侧那页只有读数行 ＋「区间标注」那张事实卡两行；
 *   ④ 载荷照搬迁前那一支（`./views.js` 的 `buildOverview`），一字不改。
 */
import { runWithLanguage } from 'base-entries';
import { listRange } from '../fetch/index.js';
import { monthRange } from '../shared/dateRange.js';
import { daysBetween, kpiOf, round2, thisMonth } from './agg.js';
import { money, windowLabel } from './pageParts.js';
import { needRange } from './params.js';
import type { AnalysisScene } from './scene.js';
import { buildOverview } from './views.js';
import { m } from '../entries/index.js';

/** 起止槽：两端同给就用它们（形态不对即抛）；缺则退回本月（老侧那条兼容路的同义写法）。 */
function readSpan(params: Record<string, unknown>): { start: string; end: string; month: boolean } {
  if (params.start === undefined && params.end === undefined) {
    return { ...monthRange(thisMonth()), month: true };
  }
  const { start, end } = needRange(params);
  return { start, end, month: false };
}

function buildScene(): AnalysisScene {
  return {
  id: 'overview',
  key: 'bill.analysis.overview',
  kind: 'overview',
  title: m('skill-bill.analysis-scene-overview.title'),
  family: 'bars',
  values: ({ params, db }) => {
    const span = readSpan(params);
    const records = listRange(db, span.start, span.end);
    const kpi = kpiOf(records);
    const days = daysBetween(span.start, span.end);
    const label = windowLabel(span.start, span.end);
    const dailyAvg = days === 0 ? 0 : round2(kpi.expense / days);
    return {
      title: m('skill-bill.analysis-scene-overview.title'),
      label,
      from: span.start,
      to: span.end,
      count: records.length,
      conclusion: kpi.count === 0
        ? m('skill-bill.analysis-scene-overview.c003', { p0: String(label) })
        : m('skill-bill.analysis-scene-overview.c004', {
          p0: String(label),
          p1: String(String(kpi.count)),
          p2: String(money(kpi.expense)),
          p3: String(money(kpi.income)),
          p4: String(money(kpi.net)),
          p5: String(String(days)),
          p6: String(money(dailyAvg)),
        }),
      caliber: m('skill-bill.analysis-scene-overview.c005'),
      chips: [label],
      payload: buildOverview(label, [...records]),
      kpi,
      page: {
        kpis: [
          { label: m('skill-bill.analysis-scene-overview.c006'), value: String(kpi.count), unit: m('skill-bill.analysis-scene-overview.c007') },
          { label: m('skill-bill.analysis-scene-overview.c008'), value: money(kpi.expense), unit: m('skill-bill.analysis-scene-overview.c009') },
          { label: m('skill-bill.analysis-scene-overview.c010'), value: money(kpi.income), unit: m('skill-bill.analysis-scene-overview.c011') },
          { label: m('skill-bill.analysis-scene-overview.c012'), value: money(kpi.net), unit: m('skill-bill.analysis-scene-overview.c013'), detail: kpi.net >= 0 ? m('skill-bill.analysis-scene-overview.c014') : m('skill-bill.analysis-scene-overview.c015') },
        ],
        chips: [],
        charts: [],
        barGroups: [],
        listCards: [],
        factCards: [{
          title: m('skill-bill.analysis-scene-overview.c016'),
          rows: [
            { k: m('skill-bill.analysis-scene-overview.c017'), v: label },
            { k: m('skill-bill.analysis-scene-overview.c018'), v: m('skill-bill.analysis-scene-overview.c019', {
              p0: String(money(dailyAvg)),
              p1: String(String(days)),
            }) },
          ],
        }],
        empty: {
          text: m('skill-bill.analysis-scene-overview.c020', { p0: String(label) }),
          hint: m('skill-bill.analysis-scene-overview.c021'),
        },
      },
    };
  },
  };
}

export const sceneOverview: AnalysisScene = buildScene();

/** 按语言重建本场景（#1197：文案经词条层，语言是运行期参数）。 */
export function sceneOverviewFor(language: string): AnalysisScene {
  return runWithLanguage(language, buildScene);
}
