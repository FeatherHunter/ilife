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
import { runWithLanguage } from 'base-entries';
import type { BillRow } from '../fetch/db.js';
import { listRange } from '../fetch/index.js';
import { aggBy, kpiOf, readWindow, round1, round2 } from './agg.js';
import { money } from './pageParts.js';
import type { AnalysisScene } from './scene.js';
import { buildOverview } from './views.js';
import { m } from '../entries/index.js';

/** 一个账本的收支归堆行（老侧 `cmd_ledger` 的 `items` 四样同数：支出／收入／净额／笔数）。 */
interface LedgerRow {
  readonly name: string;
  readonly expense: number;
  readonly income: number;
  readonly net: number;
  readonly count: number;
}

/** 账本名空着时记的名字（老侧 `r.get("ledger") or "未分账本"` 那一句的同义词）。
 *  按需取词：语言在渲染期才定，模块级常量会把语言固化在加载时。 */
function unnamedLabel(): string {
  return m('skill-bill.analysis-scene-ledger.c012');
}

/** 按账本归堆：支出侧与收入侧各走一次 `aggBy` 再合并（转账由 `aggBy` 剔，本件不自己看金额正负），
 *  支出多的在前、同额按名字排。空账本名在这里补成「未分账本」（`aggBy` 会跳过空键，故先补再聚合）。 */
function byLedger(records: readonly BillRow[]): LedgerRow[] {
  const keyOf = (r: BillRow): string => (r.ledger.trim() === '' ? unnamedLabel() : r.ledger);
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

function buildScene(): AnalysisScene {
  return {
  id: 'ledger',
  key: 'bill.analysis.overview',
  kind: 'ledger',
  title: m('skill-bill.analysis-scene-ledger.title'),
  family: 'bars',
  values: ({ params, db }) => {
    const win = readWindow(params);
    const records = listRange(db, win.from, win.to);
    const kpi = kpiOf(records);
    const rows = byLedger(records);
    const head = rows[0];
    const max = rows.length === 0 ? 0 : Math.max(...rows.map((x) => x.expense));
    const headTail = head === undefined
      ? '。'
      : m('skill-bill.analysis-scene-ledger.c002', { p0: String(head.name), p1: String(money(head.expense)) });
    return {
      title: m('skill-bill.analysis-scene-ledger.title'),
      label: win.label,
      from: win.from,
      to: win.to,
      count: records.length,
      conclusion: rows.length === 0
        ? m('skill-bill.analysis-scene-ledger.c004', { p0: String(win.label) })
        : m('skill-bill.analysis-scene-ledger.c005', {
          p0: String(win.label),
          p1: String(String(kpi.count)),
          p2: String(String(rows.length)),
          p3: String(money(kpi.expense)),
          p4: String(money(kpi.income)),
          p5: String(headTail),
        }),
      caliber: m('skill-bill.analysis-scene-ledger.c006'),
      chips: [win.label],
      payload: buildOverview(win.label, [...records]),
      kpi,
      page: {
        kpis: [],
        chips: [win.label],
        charts: [],
        barGroups: [{
          title: m('skill-bill.analysis-scene-ledger.c007', { p0: String(String(rows.length)) }),
          rows: rows.map((x) => ({
            label: x.name,
            text: m('skill-bill.analysis-scene-ledger.c008', {
              p0: String(money(x.expense)),
              p1: String(money(x.income)),
              p2: String(money(x.net)),
              p3: String(String(x.count)),
            }),
            pct: max === 0 ? 0 : round1((x.expense / max) * 100),
          })),
          emptyText: m('skill-bill.analysis-scene-ledger.c009'),
        }],
        listCards: [],
        factCards: [],
        empty: {
          text: m('skill-bill.analysis-scene-ledger.c010', { p0: String(win.label) }),
          hint: m('skill-bill.analysis-scene-ledger.c011'),
        },
      },
    };
  },
  };
}

export const sceneLedger: AnalysisScene = buildScene();

/** 按语言重建本场景（#1197：文案经词条层，语言是运行期参数）。 */
export function sceneLedgerFor(language: string): AnalysisScene {
  return runWithLanguage(language, buildScene);
}
