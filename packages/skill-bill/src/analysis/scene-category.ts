/** 场景件：**看分类**（`kind = 'category'`，命令 `bill.analysis.overview`）——本件只是差异声明与取值，
 *  块位序列住 `./template-bars.ts`（族＝读数＋条）。
 *
 * 老侧对应件：`scripts/analysis/cli.py` 的 `cmd_category`（`:272-300`）
 *  ＋ 模板 `templates/分析/analysis_view.html` 的 `renderCategory`（`:381-418`）。
 *
 * 本件的差异（照老侧那一页逐点对）：
 *   ① 期间＝起止两端（`start`／`end` **同给**，校验走 `./params.js` 的 `needRange`；缺一即缺槽位阻断），
 *      没给就按月（缺 `month` 即本月，老侧 `args.month or date.today()...` 那条兼容路）；
 *      **两端优先于月份**——老侧 `if args.from_date or args.to_date` 同一条次序；
 *   ② 归堆按**一级分类**（老侧 `_agg_expense_by(..., lambda r: _l1(r.category))`），全路径不并档——
 *      与「看月度」那一页（全路径归堆）**故意不同**，两页各有各的口径；
 *   ③ 账户筛选与收支方向走 `./agg.js` 的 `filterOf`（老侧 `_filter` 同义）；**转账已由聚合件剔掉**
 *      （#691 定死的口径，本件不自己看金额正负）；
 *   ④ 每类均值＝该类金额 ÷ 该类笔数（老侧 `c.avg`），条长按**最大一类**折算（老侧 `Math.max(...)`），
 *      环形图圆心读数＝本期该方向的合计（老侧 donut 的 `centerValue`）；
 *   ⑤ 载荷照搬迁前那一支（`./views.js` 的 `buildOverview`），一字不改。
 */
import { runWithLanguage } from 'base-entries';
import { BillPolicyError } from '../fetch/errors.js';
import { listRange } from '../fetch/index.js';
import { aggByL1, filterOf, kpiOf, readWindow, round1, round2 } from './agg.js';
import type { Direction } from './agg.js';
import { money, pctText } from './pageParts.js';
import type { AnalysisScene } from './scene.js';
import { buildOverview } from './views.js';
import { m } from '../entries/index.js';


/** 收支方向槽：缺＝支出；只认支出／收入两个方向，别的一律如实抛（本件不猜、不兜底）。 */
function readDirection(params: Record<string, unknown>): Direction {
  const raw = params.type;
  if (raw === undefined || raw === null || raw === '') return 'expense';
  if (raw === 'expense' || raw === 'income') return raw;
  throw new BillPolicyError('POLICY_BAD_INPUT', '收支方向只能取支出或收入：' + JSON.stringify(raw));
}

/** 账户筛选槽：给了非空账户名就只看它，没给＝全账户（老侧 `args.account` 那条）。 */
function readAccount(params: Record<string, unknown>): string {
  return typeof params.account === 'string' ? params.account.trim() : '';
}

function buildScene(): AnalysisScene {
  return {
  id: 'category',
  key: 'bill.analysis.overview',
  kind: 'category',
  title: m('skill-bill.analysis-scene-category.title'),
  family: 'bars',
  values: ({ params, db }) => {
    const win = readWindow(params);
    const direction = readDirection(params);
    const account = readAccount(params);
    const records = filterOf(listRange(db, win.from, win.to), { account, direction });
    const kpi = kpiOf(records);
    const cats = aggByL1(records, { direction });
    const side = direction === 'income' ? m('skill-bill.analysis-scene-category.c002') : m('skill-bill.analysis-scene-category.c003');
    const total = direction === 'income' ? kpi.income : kpi.expense;
    const head = cats[0];
    const max = cats.length === 0 ? 0 : Math.max(...cats.map((c) => c.value));
    const accountTail = account === '' ? '。' : m('skill-bill.analysis-scene-category.c004', { p0: String(account) });
    return {
      title: m('skill-bill.analysis-scene-category.title'),
      label: win.label,
      from: win.from,
      to: win.to,
      count: records.length,
      conclusion: head === undefined
        ? m('skill-bill.analysis-scene-category.c006', { p0: String(win.label), p1: String(side) })
        : m('skill-bill.analysis-scene-category.c007', {
          p0: String(win.label),
          p1: String(side),
          p2: String(money(total)),
          p3: String(String(cats.length)),
          p4: String(head.key),
          p5: String(money(head.value)),
          p6: String(pctText(head.pct)),
        }),
      caliber: m('skill-bill.analysis-scene-category.c008', { p0: String(side), p1: String(accountTail) }),
      chips: [win.label],
      payload: buildOverview(win.label, [...records]),
      kpi,
      page: {
        kpis: [
          { label: m('skill-bill.analysis-scene-category.c009', { p0: String(side) }), value: money(total), unit: m('skill-bill.analysis-scene-category.c010') },
          { label: m('skill-bill.analysis-scene-category.c011'), value: String(cats.length), unit: m('skill-bill.analysis-scene-category.c012') },
          { label: m('skill-bill.analysis-scene-category.c013'), value: win.label },
        ],
        chips: [win.label],
        charts: cats.length === 0 ? [] : [{
          title: m('skill-bill.analysis-scene-category.c014'),
          kind: 'donut',
          input: {
            items: cats.map((c) => ({ label: c.key, value: c.value })),
            options: { centerLabel: m('skill-bill.analysis-scene-category.c015', { p0: String(side) }), centerValue: money(total) },
          },
        }],
        barGroups: [{
          title: m('skill-bill.analysis-scene-category.c016', { p0: String(String(cats.length)) }),
          rows: cats.map((c) => ({
            label: c.key,
            text: m('skill-bill.analysis-scene-category.c017', {
              p0: String(money(c.value)),
              p1: String(String(c.count)),
              p2: String(pctText(c.pct)),
              p3: String(money(round2(c.value / c.count))),
            }),
            pct: max === 0 ? 0 : round1((c.value / max) * 100),
          })),
          emptyText: m('skill-bill.analysis-scene-category.c018', { p0: String(side) }),
        }],
        listCards: [],
        factCards: [],
        empty: {
          text: m('skill-bill.analysis-scene-category.c019', { p0: String(win.label) }),
          hint: m('skill-bill.analysis-scene-category.c020'),
        },
      },
    };
  },
  };
}

export const sceneCategory: AnalysisScene = buildScene();

/** 按语言重建本场景（#1197：文案经词条层，语言是运行期参数）。 */
export function sceneCategoryFor(language: string): AnalysisScene {
  return runWithLanguage(language, buildScene);
}
