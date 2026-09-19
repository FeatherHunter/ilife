/** 场景件：**看账本**（`kind = 'ledger'`，命令 `bill.analysis.overview`）——本件只是差异声明与取值，
 *  块位序列住 `./template-bars.ts`（族＝读数＋条）。
 *
 * 老侧对应件：`scripts/analysis/cli.py` 的 `cmd_ledger`（`:342-378`）
 *  ＋ 模板 `templates/分析/analysis_view.html` 的 `renderLedger`（`:485-499`）。
 *
 * 本件的差异（照老侧那一页逐点对）：
 *   ① 期间＝起止两端（`start`／`end` **同给**，校验走 `./params.js` 的 `needRange`），没给就按月
 *      （缺 `month` 即本月）；两端优先于月份——老侧 `if args.from_date or args.to_date` 同一条次序；
 *   ② 归堆按账本，**空账本名记作「未分账本」**（老侧 `r.get("ledger") or "未分账本"` 同一条）；
 *      每户四样：支出／收入／净额（＝收入 − 支出）／笔数，四样**并进条卡那一行**——
 *      老侧一个账本一张读数卡（三枚 KPI ＋ 标题里的笔数），新侧本族的槽只有条卡组，信息一条不少；
 *   ③ **没有读数卡**（`kpis: []`）：老侧那一页只有各账本自己的卡，没有整页读数行；
 *   ④ 条长按**支出最多的那个账本**折算（老侧 `Math.max(...x.expense)`）；
 *   ⑤ 转账不入收支（#691）：转账那笔账本 `转账` 不落在任何一行上，故本页不列它——老侧会把它当
 *      一个账本行出（那是差异表里的口径差异，不是本件的选择）；归堆走 `./agg.js` 的 `aggBy`，
 *      本件不自己看金额正负；
 *   ⑥ 载荷照搬迁前那一支（`./views.js` 的 `buildOverview`），一字不改。
 */
import type { BillRow } from '../fetch/db.js';
import { listRange } from '../fetch/index.js';
import { aggBy, kpiOf, readWindow, round1, round2 } from './agg.js';
import { money } from './pageParts.js';
import type { AnalysisScene } from './scene.js';
import { buildOverview } from './views.js';

/** 一个账本的收支归堆行（老侧 `cmd_ledger` 的 `items` 四样同数：支出／收入／净额／笔数）。 */
interface LedgerRow {
  readonly name: string;
  readonly expense: number;
  readonly income: number;
  readonly net: number;
  readonly count: number;
}

/** 账本名空着时记的名字（老侧 `r.get("ledger") or "未分账本"` 那一句的同义词）。 */
const UNNAMED = '未分账本';

/** 按账本归堆：支出侧与收入侧各走一次 `aggBy` 再合并（转账由 `aggBy` 剔，本件不自己看金额正负），
 *  支出多的在前、同额按名字排。空账本名在这里补成「未分账本」（`aggBy` 会跳过空键，故先补再聚合）。 */
function byLedger(records: readonly BillRow[]): LedgerRow[] {
  const keyOf = (r: BillRow): string => (r.ledger.trim() === '' ? UNNAMED : r.ledger);
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

export const sceneLedger: AnalysisScene = {
  id: 'ledger',
  key: 'bill.analysis.overview',
  kind: 'ledger',
  title: '看账本',
  family: 'bars',
  values: ({ params, db }) => {
    const win = readWindow(params);
    const records = listRange(db, win.from, win.to);
    const kpi = kpiOf(records);
    const rows = byLedger(records);
    const head = rows[0];
    const max = rows.length === 0 ? 0 : Math.max(...rows.map((x) => x.expense));
    return {
      title: '看账本',
      label: win.label,
      from: win.from,
      to: win.to,
      count: records.length,
      conclusion: rows.length === 0
        ? win.label + ' 这段时间一笔都没有记。'
        : win.label + ' 记了 ' + String(kpi.count) + ' 笔，分在 ' + String(rows.length) + ' 个账本里：支出 '
          + money(kpi.expense) + ' 元、收入 ' + money(kpi.income) + ' 元'
          + (head === undefined ? '。' : '；支出最多的是「' + head.name + '」' + money(head.expense) + ' 元。'),
      caliber: '按账本归堆，空账本名记作「未分账本」，笔数＝该账本参与收支的记录条数；'
        + '条长按支出最多的那个账本折算；转账不计入收支，也不占账本行。',
      chips: [win.label],
      payload: buildOverview(win.label, [...records]),
      kpi,
      page: {
        kpis: [],
        chips: [win.label],
        charts: [],
        barGroups: [{
          title: '各账本汇总（' + String(rows.length) + ' 个账本）',
          rows: rows.map((x) => ({
            label: x.name,
            text: '支出 ' + money(x.expense) + ' 元 · 收入 ' + money(x.income) + ' 元 · 净额 ' + money(x.net)
              + ' 元 · ' + String(x.count) + ' 笔',
            pct: max === 0 ? 0 : round1((x.expense / max) * 100),
          })),
          emptyText: '这段时间还没有账本记录',
        }],
        listCards: [],
        factCards: [],
        empty: {
          text: win.label + ' 这段时间还没有记录。',
          hint: '先说「记支出」或「记收入」记一笔，回来看这里就有数了。',
        },
      },
    };
  },
};
