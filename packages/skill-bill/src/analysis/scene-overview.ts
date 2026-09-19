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
import { listRange } from '../fetch/index.js';
import { monthRange } from '../shared/dateRange.js';
import { daysBetween, kpiOf, round2, thisMonth } from './agg.js';
import { money, windowLabel } from './pageParts.js';
import { needRange } from './params.js';
import type { AnalysisScene } from './scene.js';
import { buildOverview } from './views.js';

/** 起止槽：两端同给就用它们（形态不对即抛）；缺则退回本月（老侧那条兼容路的同义写法）。 */
function readSpan(params: Record<string, unknown>): { start: string; end: string; month: boolean } {
  if (params.start === undefined && params.end === undefined) {
    return { ...monthRange(thisMonth()), month: true };
  }
  const { start, end } = needRange(params);
  return { start, end, month: false };
}

export const sceneOverview: AnalysisScene = {
  id: 'overview',
  key: 'bill.analysis.overview',
  kind: 'overview',
  title: '看总览',
  family: 'bars',
  values: ({ params, db }) => {
    const span = readSpan(params);
    const records = listRange(db, span.start, span.end);
    const kpi = kpiOf(records);
    const days = daysBetween(span.start, span.end);
    const label = windowLabel(span.start, span.end);
    const dailyAvg = days === 0 ? 0 : round2(kpi.expense / days);
    return {
      title: '看总览',
      label,
      from: span.start,
      to: span.end,
      count: records.length,
      conclusion: kpi.count === 0
        ? label + ' 这段时间一笔都没有记。'
        : label + ' 一共记了 ' + String(kpi.count) + ' 笔：支出 ' + money(kpi.expense) + ' 元、收入 '
          + money(kpi.income) + ' 元、净额 ' + money(kpi.net) + ' 元，' + String(days) + ' 天日均支出 '
          + money(dailyAvg) + ' 元。',
      caliber: '天数按起止两端含首尾算（跨月、跨年照算），日均支出＝支出 ÷ 天数；转账不计入收支。',
      chips: [label],
      payload: buildOverview(label, [...records]),
      kpi,
      page: {
        kpis: [
          { label: '笔数', value: String(kpi.count), unit: '笔' },
          { label: '支出', value: money(kpi.expense), unit: '元' },
          { label: '收入', value: money(kpi.income), unit: '元' },
          { label: '净额', value: money(kpi.net), unit: '元', detail: kpi.net >= 0 ? '收大于支' : '支大于收' },
        ],
        chips: [],
        charts: [],
        barGroups: [],
        listCards: [],
        factCards: [{
          title: '区间标注',
          rows: [
            { k: '期间', v: label },
            { k: '日均支出', v: money(dailyAvg) + ' 元' },
          ],
        }],
        empty: {
          text: label + ' 这段时间还没有记录。',
          hint: '先说「记支出」或「记收入」记一笔，回来看这里就有数了。',
        },
      },
    };
  },
};
