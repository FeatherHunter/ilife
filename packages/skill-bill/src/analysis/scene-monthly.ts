/** 场景件：**看月度**（`kind = 'monthly'`，命令 `bill.analysis.overview`）——本件只是差异声明与取值，
 *  块位序列住 `./template-bars.ts`（族＝读数＋条）。
 *
 * 老侧对应件：`scripts/analysis/cli.py` 的 `cmd_monthly`（`:180-191`，取数走 `analyze.monthly_summary`）
 *  ＋ 模板 `templates/分析/analysis_view.html` 的 `renderMonthly`（`:287-303`）。
 *
 * 本件的差异（照老侧那一页逐点对）：
 *   ① 期间＝参数给的月份（缺 `month` 即报参数错——老侧 `--month` 也是必填，口径同一条，
 *      校验走 `./params.js` 的 `needMonth`，本件不自己写第二套月份校验）；
 *   ② 分类排行**按完整分类路径归堆**（老侧 `monthly_summary` 的 `GROUP BY category`），不是 L1——
 *      与「看分类」那一页（L1 归堆）**故意不同**，两页各有各的口径；
 *   ③ 条卡只出前 8 类（老侧 `cats.slice(0, 8)`），条长按本期间**最大一类**折算（老侧 `Math.max(...)`）；
 *   ④ 载荷照搬迁前那一支（`./views.js` 的 `buildOverview`：`stat` 形的 `metrics` 全 number），一字不改。
 */
import { listRange } from '../fetch/index.js';
import { monthRange } from '../shared/dateRange.js';
import { aggBy, kpiOf, round1 } from './agg.js';
import { money, pctText } from './pageParts.js';
import { needMonth } from './params.js';
import type { AnalysisScene } from './scene.js';
import { buildOverview } from './views.js';

export const sceneMonthly: AnalysisScene = {
  id: 'monthly',
  key: 'bill.analysis.overview',
  kind: 'monthly',
  title: '看月度',
  family: 'bars',
  values: ({ params, db }) => {
    const month = needMonth(params);
    const { start, end } = monthRange(month);
    const records = listRange(db, start, end);
    const kpi = kpiOf(records);
    const cats = aggBy(records, (r) => r.category);
    const top = cats.slice(0, 8);
    const max = cats.length === 0 ? 0 : Math.max(...cats.map((c) => c.value));
    const head = cats[0];
    return {
      title: '看月度',
      label: month,
      from: start,
      to: end,
      count: records.length,
      conclusion: kpi.count === 0
        ? month + ' 一笔都没有记。'
        : month + ' 一共记了 ' + String(kpi.count) + ' 笔：支出 ' + money(kpi.expense) + ' 元、收入 '
          + money(kpi.income) + ' 元、净额 ' + money(kpi.net) + ' 元'
          + (head === undefined ? '。' : '；花得最多的是「' + head.key + '」' + money(head.value) + ' 元。'),
      caliber: '支出按分类全路径归堆（不并到一级），条长按本期间最大一类折算；转账不计入收支。',
      chips: [month],
      payload: buildOverview(month, [...records]),
      kpi,
      page: {
        kpis: [
          { label: '支出', value: money(kpi.expense), unit: '元' },
          { label: '收入', value: money(kpi.income), unit: '元' },
          { label: '净额', value: money(kpi.net), unit: '元', detail: kpi.net >= 0 ? '收大于支' : '支大于收' },
          { label: '笔数', value: String(kpi.count), unit: '笔' },
        ],
        chips: [],
        charts: [],
        barGroups: [{
          title: '分类排行（' + String(cats.length) + ' 类）',
          rows: top.map((c) => ({
            label: c.key,
            text: money(c.value) + ' 元 · ' + String(c.count) + ' 笔 · ' + pctText(c.pct),
            pct: max === 0 ? 0 : round1((c.value / max) * 100),
          })),
          emptyText: '这个月还没有支出记录',
        }],
        listCards: [],
        factCards: [],
        empty: {
          text: month + ' 这段时间还没有记录。',
          hint: '先说「记支出」或「记收入」记一笔，回来看这里就有数了。',
        },
      },
    };
  },
};
