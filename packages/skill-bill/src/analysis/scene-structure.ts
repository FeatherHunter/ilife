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
import { listRange } from '../fetch/index.js';
import { aggByL1, kpiOf, readWindow } from './agg.js';
import { money } from './pageParts.js';
import type { AnalysisScene, ChartCard } from './scene.js';
import { buildOverview } from './views.js';


export const sceneStructure: AnalysisScene = {
  id: 'structure',
  key: 'bill.analysis.overview',
  kind: 'structure',
  title: '看结构',
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
        title: '收入来源结构',
        kind: 'donut',
        input: {
          items: income.map((x) => ({ label: x.key, value: x.value })),
          options: { centerLabel: '总收入', centerValue: money(kpi.income) },
        },
      });
    }
    if (expense.length > 0) {
      charts.push({
        title: '支出去向结构',
        kind: 'donut',
        input: {
          items: expense.map((x) => ({ label: x.key, value: x.value })),
          options: { centerLabel: '总支出', centerValue: money(kpi.expense) },
        },
      });
    }
    const head = expense[0];
    return {
      title: '看结构',
      label: win.label,
      from: win.from,
      to: win.to,
      count: records.length,
      conclusion: kpi.count === 0
        ? win.label + ' 这段时间一笔都没有记。'
        : win.label + ' 记了 ' + String(kpi.count) + ' 笔：收入 ' + money(kpi.income) + ' 元来自 '
          + String(income.length) + ' 个一级分类，支出 ' + money(kpi.expense) + ' 元流向 '
          + String(expense.length) + ' 个一级分类'
          + (head === undefined ? '。' : '，去得最多的是「' + head.key + '」' + money(head.value) + ' 元。'),
      caliber: '收支两侧都按一级分类归堆（全路径不并档），环形图占比＝各一级分类占该侧合计；转账不计入收支。',
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
          title: '收支合计',
          rows: [
            { k: '收入合计', v: money(kpi.income) + ' 元' },
            { k: '支出合计', v: money(kpi.expense) + ' 元' },
          ],
        }],
        empty: {
          text: win.label + ' 这段时间还没有记录。',
          hint: '先说「记支出」或「记收入」记一笔，回来看这里就有数了。',
        },
      },
    };
  },
};
