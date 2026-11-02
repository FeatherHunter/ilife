/** 场景件：**看结构**（`kind = 'structure'`，命令 `bill.analysis.overview`）——本件只是差异声明与取值，
 *  块位序列住 `./template-bars.ts`（族＝读数＋条）。
 *
 * 老侧对应件：`scripts/analysis/cli.py` 的 `cmd_structure`（`:381-410`）
 *  ＋ 模板 `templates/分析/analysis_view.html` 的 `renderStructure`（`:502-529`）。
 *
 * 本件的差异（照老侧那一页逐点对）：
 *   ① 期间＝起止两端（`start`／`end` **同给**，校验走 `./params.js` 的 `needRange`），没给就按月
 *      （缺 `month` 即本月）；两端优先于月份——老侧 `if args.from_date or args.to_date` 同一条次序；
 *   ② 收入侧与支出侧**各按一级分类归堆**（`aggByL1(rows, {direction})`；老侧两次 `_agg_expense_by`
 *      ＋ `_l1`），环形图两张：收入来源结构／支出去向结构，圆心读数＝该侧合计；
 *   ③ **没有读数卡**（`kpis: []`）：老侧那一页本来就只有两张环形图，各侧的合计原先只住在圆心；
 *      新侧把两个合计另立一张事实卡（「收入合计／支出合计」），读数一个不少；
 *   ④ 转账不入收支（#691），故两侧合计都走 `kpiOf` 的收支读数——老侧 `_agg_expense_by` 会把转账
 *      一起累计，那是差异表里的口径差异，不是本件的选择；
 *   ⑤ 载荷照搬迁前那一支（`./views.js` 的 `buildOverview`），一字不改。
 */
import { runWithLanguage } from 'base-entries';
import { listRange } from '../fetch/index.js';
import { aggByL1, kpiOf, readWindow } from './agg.js';
import { money } from './pageParts.js';
import type { AnalysisScene, ChartCard } from './scene.js';
import { buildOverview } from './views.js';
import { m } from '../entries/index.js';


function buildScene(): AnalysisScene {
  return {
  id: 'structure',
  key: 'bill.analysis.overview',
  kind: 'structure',
  title: m('skill-bill.analysis-scene-structure.title'),
  family: 'bars',
  values: ({ params, db }) => {
    const win = readWindow(params);
    const records = listRange(db, win.from, win.to);
    const kpi = kpiOf(records);
    const income = aggByL1(records, { direction: 'income' });
    const expense = aggByL1(records);
    const charts: ChartCard[] = [];
    if (income.length > 0) {
      charts.push({
        title: m('skill-bill.analysis-scene-structure.c002'),
        kind: 'donut',
        input: {
          items: income.map((x) => ({ label: x.key, value: x.value })),
          options: { centerLabel: m('skill-bill.analysis-scene-structure.c003'), centerValue: money(kpi.income) },
        },
      });
    }
    if (expense.length > 0) {
      charts.push({
        title: m('skill-bill.analysis-scene-structure.c004'),
        kind: 'donut',
        input: {
          items: expense.map((x) => ({ label: x.key, value: x.value })),
          options: { centerLabel: m('skill-bill.analysis-scene-structure.c005'), centerValue: money(kpi.expense) },
        },
      });
    }
    const head = expense[0];
    const headTail = head === undefined ? '。' : m('skill-bill.analysis-scene-structure.c006', { p0: String(head.key), p1: String(money(head.value)) });
    return {
      title: m('skill-bill.analysis-scene-structure.title'),
      label: win.label,
      from: win.from,
      to: win.to,
      count: records.length,
      conclusion: kpi.count === 0
        ? m('skill-bill.analysis-scene-structure.c008', { p0: String(win.label) })
        : m('skill-bill.analysis-scene-structure.c009', {
          p0: String(win.label),
          p1: String(String(kpi.count)),
          p2: String(money(kpi.income)),
          p3: String(String(income.length)),
          p4: String(money(kpi.expense)),
          p5: String(String(expense.length)),
          p6: String(headTail),
        }),
      caliber: m('skill-bill.analysis-scene-structure.c010'),
      chips: [win.label],
      payload: buildOverview(win.label, [...records]),
      kpi,
      page: {
        kpis: [],
        chips: [win.label],
        charts,
        barGroups: [],
        listCards: [],
        factCards: [{
          title: m('skill-bill.analysis-scene-structure.c011'),
          rows: [
            { k: m('skill-bill.analysis-scene-structure.c012'), v: m('skill-bill.analysis-scene-structure.c013', { p0: String(money(kpi.income)) }) },
            { k: m('skill-bill.analysis-scene-structure.c014'), v: m('skill-bill.analysis-scene-structure.c015', { p0: String(money(kpi.expense)) }) },
          ],
        }],
        empty: {
          text: m('skill-bill.analysis-scene-structure.c016', { p0: String(win.label) }),
          hint: m('skill-bill.analysis-scene-structure.c017'),
        },
      },
    };
  },
  };
}

export const sceneStructure: AnalysisScene = buildScene();

/** 按语言重建本场景（#1197：文案经词条层，语言是运行期参数）。 */
export function sceneStructureFor(language: string): AnalysisScene {
  return runWithLanguage(language, buildScene);
}
