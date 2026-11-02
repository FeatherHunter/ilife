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
 *      条文本按原型 `a06-看账户-v2.1.html` 明细卡逐字：无收入的户短式
 *      （`35.00 元 · 1 笔 · 63.6%`），有收入的户长式
 *      （`支出 0.00 元 · 收入 8000.00 元 · 1 笔 · 支出占比 0.0%`）；
 *   ⑤ 账户筛选不在本件（那属「看分类」的槽）；转账不入收支（#691），故四样里一笔转账都不算，
 *      本件不自己看金额正负，归堆走 `./agg.js` 的 `aggBy`；
 *   ⑥ 载荷照搬迁前那一支（`./views.js` 的 `buildOverview`），一字不改。
 *
 * #1210：文案迁词条层——模块级场景对象改成 `buildScene()` 构造（照 #1207 的 `scene-stats.ts`）：
 *  取值里每一句上屏文案走 `m()`，语言由渲染语言上下文给；静态导出 `sceneAccount` 是 zh 快照
 *  （未进入语言上下文时逐字节不变），非基准语言由 `sceneAccountFor(language)` 重建。
 */
import { runWithLanguage } from 'base-entries';
import type { BillRow } from '../fetch/db.js';
import { listRange } from '../fetch/index.js';
import { m } from '../entries/index.js';
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
function unnamed(): string {
  return m('skill-bill.analysis-scene-account.c001');
}

/** 按账户归堆：支出侧与收入侧各走一次 `aggBy` 再合并（转账由 `aggBy` 剔，本件不自己看金额正负），
 *  支出多的在前、同额按名字排。空账户名在这里补成「未填账户」（`aggBy` 会跳过空键，故先补再聚合）。 */
function byAccount(records: readonly BillRow[]): AccountRow[] {
  const keyOf = (r: BillRow): string => (r.account.trim() === '' ? unnamed() : r.account);
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

/** 这一页的场景对象（按当前渲染语言取词；模块级只构造一份 zh 快照）。 */
function buildScene(): AnalysisScene {
  return {
    id: 'account',
    key: 'bill.analysis.overview',
    kind: 'account',
    title: m('skill-bill.analysis-scene-account.title'),
    family: 'bars',
    values: ({ params, db }) => {
      const win = readWindow(params);
      const records = listRange(db, win.from, win.to);
      const kpi = kpiOf(records);
      const rows = byAccount(records);
      const head = rows[0];
      const max = rows.length === 0 ? 0 : Math.max(...rows.map((x) => x.expense));
      /* #1210：这一句原先嵌在结论串的末尾（条件表达式），抽成局部变量才迁得动词条。 */
      const top = head === undefined ? '' : m('skill-bill.analysis-scene-account.c003', { p0: String(head.name), p1: String(money(head.expense)) });
      return {
        title: m('skill-bill.analysis-scene-account.title'),
        label: win.label,
        from: win.from,
        to: win.to,
        count: records.length,
        conclusion: rows.length === 0
          ? m('skill-bill.analysis-scene-account.c005', { p0: String(win.label) })
          : m('skill-bill.analysis-scene-account.c006', {
            p0: String(win.label),
            p1: String(String(kpi.count)),
            p2: String(String(rows.length)),
            p3: String(money(kpi.expense)),
            p4: String(money(kpi.income)),
            p5: String(top),
          }),
        caliber: m('skill-bill.analysis-scene-account.c007'),
        chips: [win.label],
        payload: buildOverview(win.label, [...records]),
        kpi,
        page: {
          kpis: [],
          chips: [win.label],
          charts: [],
          barGroups: [{
            title: m('skill-bill.analysis-scene-account.c008', { p0: String(String(rows.length)) }),
            rows: rows.map((x) => {
              const share = pctText(kpi.expense === 0 ? 0 : round1((x.expense / kpi.expense) * 100));
              return {
                label: x.name,
                text: x.income > 0
                  ? m('skill-bill.analysis-scene-account.c009', {
                    p0: String(money(x.expense)),
                    p1: String(money(x.income)),
                    p2: String(String(x.count)),
                    p3: String(share),
                  })
                  : m('skill-bill.analysis-scene-account.c010', {
                    p0: String(money(x.expense)),
                    p1: String(String(x.count)),
                    p2: String(share),
                  }),
                pct: max === 0 ? 0 : round1((x.expense / max) * 100),
              };
            }),
            emptyText: m('skill-bill.analysis-scene-account.c011'),
          }],
          listCards: [{
            title: m('skill-bill.analysis-scene-account.c012', { p0: String(String(rows.length)) }),
            /* #I（a06 返工）：判地这三行是 `idx ＋ 整句`（无 left 列）——之前把「N 笔」塞进 left 槽，
               顶出一大截空白，负责人点名缩小。整句并进 main，left／right 给空串（公共层 `optText`
               视为空＝不出那一列，行拿 `row-no-left`，一字不占位）。长句的截断由 #1134 popover 兜。 */
            rows: rows.map((x) => ({
              left: '',
              main: m('skill-bill.analysis-scene-account.c013', {
                p0: String(x.name),
                p1: String(String(x.count)),
                p2: String(money(x.expense)),
                p3: String(money(x.income)),
              }),
              right: '',
            })),
            emptyText: m('skill-bill.analysis-scene-account.c014'),
          }],
          factCards: [],
          empty: {
            text: m('skill-bill.analysis-scene-account.c015', { p0: String(win.label) }),
            hint: m('skill-bill.analysis-scene-account.c016'),
          },
        },
      };
    },
  };
}

/** zh 快照（静态落点，未进入语言上下文时用它，产物与 #1210 之前逐字节相同）。 */
export const sceneAccount: AnalysisScene = buildScene();

/** 按语言重建这一页（#1207 先例：进 `runWithLanguage` 内取词，出了上下文即回 zh）。 */
export function sceneAccountFor(language: string): AnalysisScene {
  return runWithLanguage(language, buildScene);
}
