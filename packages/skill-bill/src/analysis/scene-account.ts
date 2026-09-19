/** 场景件：**看账户**（`kind = 'account'`，命令 `bill.analysis.overview`）——本件只是差异声明与取值，
 *  块位序列住 `./template-bars.ts`（族＝读数＋条）。
 *
 * 老侧对应件：`scripts/analysis/cli.py` 的 `cmd_account`（`:303-339`）
 *  ＋ 模板 `templates/分析/analysis_view.html` 的 `renderAccount`（`:446-482`）。
 *
 * 本件的差异（照老侧那一页逐点对）：
 *   ① 期间＝起止两端（`start`／`end` **同给**，校验走 `./params.js` 的 `needRange`），没给就按月
 *      （缺 `month` 即本月）；两端优先于月份——老侧 `if args.from_date or args.to_date` 同一条次序；
 *   ② 归堆按账户，**空账户名记作「未填账户」**（老侧 `r.get("account") or "未填账户"` 同一条）；
 *      每户四样：支出／收入／净额（＝收入 − 支出）／笔数；
 *   ③ **没有读数卡**（`kpis: []`）：老侧那一页本来就没有读数行——它报的是「分组的读数」，
 *      两个合计另立事实卡会与「看结构」那页重样，本页按老侧只出分组那两张卡；
 *   ④ 条长按**支出最多的那个账户**折算（老侧 `Math.max(...x.expense)`），占比＝占本期支出合计；
 *   ⑤ 账户筛选不在本件（那属「看分类」的槽）；转账不入收支（#691），故四样里一笔转账都不算，
 *      本件不自己看金额正负，归堆走 `./agg.js` 的 `aggBy`；
 *   ⑥ 载荷照搬迁前那一支（`./views.js` 的 `buildOverview`），一字不改。
 */
import type { BillRow } from '../fetch/db.js';
import { listRange } from '../fetch/index.js';
import { aggBy, kpiOf, readWindow, round1, round2 } from './agg.js';
import { money, pctText } from './pageParts.js';
import type { AnalysisScene } from './scene.js';
import { buildOverview } from './views.js';

/** 一个账户的收支归堆行（老侧 `cmd_account` 的 `items` 四样同数：支出／收入／净额／笔数）。 */
interface AccountRow {
  readonly name: string;
  readonly expense: number;
  readonly income: number;
  readonly net: number;
  readonly count: number;
}

/** 账户名空着时记的名字（老侧 `r.get("account") or "未填账户"` 那一句的同义词）。 */
const UNNAMED = '未填账户';

/** 按账户归堆：支出侧与收入侧各走一次 `aggBy` 再合并（转账由 `aggBy` 剔，本件不自己看金额正负），
 *  支出多的在前、同额按名字排。空账户名在这里补成「未填账户」（`aggBy` 会跳过空键，故先补再聚合）。 */
function byAccount(records: readonly BillRow[]): AccountRow[] {
  const keyOf = (r: BillRow): string => (r.account.trim() === '' ? UNNAMED : r.account);
  const merged = new Map<string, { expense: number; income: number; count: number }>();
  for (const row of aggBy(records, keyOf)) {
    merged.set(row.key, { expense: row.value, income: 0, count: row.count });
  }
  for (const row of aggBy(records, keyOf, { direction: 'income' })) {
    const it = merged.get(row.key) ?? { expense: 0, income: 0, count: 0 };
    it.income = row.value;
    it.count += row.count;
    merged.set(row.key, it);
  }
  const rows = [...merged.entries()].map(([name, v]) => ({
    name, expense: v.expense, income: v.income, net: round2(v.income - v.expense), count: v.count,
  }));
  rows.sort((a, b) => b.expense - a.expense || a.name.localeCompare(b.name));
  return rows;
}

export const sceneAccount: AnalysisScene = {
  id: 'account',
  key: 'bill.analysis.overview',
  kind: 'account',
  title: '看账户',
  family: 'bars',
  values: ({ params, db }) => {
    const win = readWindow(params);
    const records = listRange(db, win.from, win.to);
    const kpi = kpiOf(records);
    const rows = byAccount(records);
    const head = rows[0];
    const max = rows.length === 0 ? 0 : Math.max(...rows.map((x) => x.expense));
    return {
      title: '看账户',
      label: win.label,
      from: win.from,
      to: win.to,
      count: records.length,
      conclusion: rows.length === 0
        ? win.label + ' 这段时间一笔都没有记。'
        : win.label + ' 记了 ' + String(kpi.count) + ' 笔，落在 ' + String(rows.length) + ' 个账户上：支出 '
          + money(kpi.expense) + ' 元、收入 ' + money(kpi.income) + ' 元'
          + (head === undefined ? '。' : '；支出最多的是「' + head.name + '」' + money(head.expense) + ' 元。'),
      caliber: '按账户归堆，空账户名记作「未填账户」，笔数＝该账户参与收支的记录条数；'
        + '条长按支出最多的那个账户折算，占比＝占本期支出合计；转账不计入收支。',
      chips: [win.label],
      payload: buildOverview(win.label, [...records]),
      kpi,
      page: {
        kpis: [],
        chips: [win.label],
        charts: [],
        barGroups: [{
          title: '账户占比（' + String(rows.length) + ' 个账户）',
          rows: rows.map((x) => ({
            label: x.name,
            text: money(x.expense) + ' 元 · ' + String(x.count) + ' 笔 · '
              + pctText(kpi.expense === 0 ? 0 : round1((x.expense / kpi.expense) * 100)),
            pct: max === 0 ? 0 : round1((x.expense / max) * 100),
          })),
          emptyText: '这段时间还没有账户记录',
        }],
        listCards: [{
          title: '各账户汇总（' + String(rows.length) + ' 个）',
          rows: rows.map((x) => ({
            left: String(x.count) + ' 笔',
            main: x.name,
            right: '支出 ' + money(x.expense) + ' ／ 收入 ' + money(x.income),
          })),
          emptyText: '这段时间还没有账户记录',
        }],
        factCards: [],
        empty: {
          text: win.label + ' 这段时间还没有记录。',
          hint: '先说「记支出」或「记收入」记一笔，回来看这里就有数了。',
        },
      },
    };
  },
};
