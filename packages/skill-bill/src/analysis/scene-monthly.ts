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
import { runWithLanguage } from 'base-entries';
import { listRange } from '../fetch/index.js';
import { monthRange } from '../shared/dateRange.js';
import { aggBy, kpiOf, round1 } from './agg.js';
import { buildAnalysisCopy } from './copyTextAnalysis.js';
import { money, pctText } from './pageParts.js';
import { projectWakeWord } from '../triggers/wakeTable.js';
import { needMonth } from './params.js';
import type { AnalysisScene } from './scene.js';
import { buildOverview } from './views.js';
import { m } from '../entries/index.js';

function buildScene(): AnalysisScene {
  return {
  id: 'monthly',
  key: 'bill.analysis.overview',
  kind: 'monthly',
  title: m('skill-bill.analysis-scene-monthly.title'),
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
    const headTail = head === undefined
      ? '。'
      : m('skill-bill.analysis-scene-monthly.c002', { p0: String(head.key), p1: String(money(head.value)) });
    return {
      title: m('skill-bill.analysis-scene-monthly.title'),
      label: month,
      from: start,
      to: end,
      count: records.length,
      conclusion: kpi.count === 0
        ? m('skill-bill.analysis-scene-monthly.c004', { p0: String(month) })
        : m('skill-bill.analysis-scene-monthly.c005', {
          p0: String(month),
          p1: String(String(kpi.count)),
          p2: String(money(kpi.expense)),
          p3: String(money(kpi.income)),
          p4: String(money(kpi.net)),
          p5: String(headTail),
        }),
      caliber: m('skill-bill.analysis-scene-monthly.c006'),
      chips: [month],
      payload: buildOverview(month, [...records]),
      kpi,
      copy: buildAnalysisCopy({
        kind: 'period', word: projectWakeWord({ key: 'bill.analysis.overview', kind: 'monthly' }), label: month, kpi,
        topKey: head === undefined ? null : head.key,
        topValue: head === undefined ? 0 : head.value,
      }),
      page: {
        kpis: [
          { label: m('skill-bill.analysis-scene-monthly.c007'), value: money(kpi.expense), unit: m('skill-bill.analysis-scene-monthly.c008') },
          { label: m('skill-bill.analysis-scene-monthly.c009'), value: money(kpi.income), unit: m('skill-bill.analysis-scene-monthly.c010') },
          { label: m('skill-bill.analysis-scene-monthly.c011'), value: money(kpi.net), unit: m('skill-bill.analysis-scene-monthly.c012'), detail: kpi.net >= 0 ? m('skill-bill.analysis-scene-monthly.c013') : m('skill-bill.analysis-scene-monthly.c014') },
          { label: m('skill-bill.analysis-scene-monthly.c015'), value: String(kpi.count), unit: m('skill-bill.analysis-scene-monthly.c016') },
        ],
        chips: [],
        charts: [],
        barGroups: [{
          title: m('skill-bill.analysis-scene-monthly.c017', { p0: String(String(cats.length)) }),
          rows: top.map((c) => ({
            label: c.key,
            text: m('skill-bill.analysis-scene-monthly.c018', {
              p0: String(money(c.value)),
              p1: String(String(c.count)),
              p2: String(pctText(c.pct)),
            }),
            pct: max === 0 ? 0 : round1((c.value / max) * 100),
          })),
          emptyText: m('skill-bill.analysis-scene-monthly.c019'),
        }],
        listCards: [],
        factCards: [],
        empty: {
          text: m('skill-bill.analysis-scene-monthly.c020', { p0: String(month) }),
          hint: m('skill-bill.analysis-scene-monthly.c021'),
        },
      },
    };
  },
  };
}

export const sceneMonthly: AnalysisScene = buildScene();

/** 按语言重建本场景（#1197：文案经词条层，语言是运行期参数）。 */
export function sceneMonthlyFor(language: string): AnalysisScene {
  return runWithLanguage(language, buildScene);
}
