/** 场景件：**看分期**（`kind = 'installment'`，命令 `bill.analysis.trend`）——本件只是差异声明与取值，
 *  块位序列住 `./template-tables.ts`（族＝读数＋表）。
 *
 *  老侧对应件：`scripts/analysis/cli.py` 的 `_parse_installment_note`（`:871-878`）与
 *  `cmd_installment_summary`（`:881-927`）＋ 模板 `templates/分析/analysis_view.html` 的
 *  `renderInstallmentSummary`（`:1011-1042`）。
 *
 *  本件的差异（照老侧那一页逐点对）：
 *    ① **无参数、取全库**（老侧 `cmd_installment_summary` 也不读参数）；
 *    ② 记录＝备注带 `#分期` 的，标签匹配走 `./agg.js` 的 `tagRecords`（精确整词）——老侧自写的那两段
 *      标签正则（`:794-804`）不搬；**名目与期数仍照老侧 `:875` 从备注里解析**
 *      （形态 `#分期 {名目} 第X期/N`），解析不出名目记「未命名分期」；
 *    ③ 分组后照老侧 `:886-916` 算：总额／笔数／总期数／已还期数（记录日期不晚于今天）／剩余期数／
 *      剩余金额（日期还没到的那些期的金额和）／首期日期；
 *    ④ 每期金额照老侧 `:905-907`：取**出现 ≥2 次**的众数金额，没有出现两次的取最小额。
 *      平手（两个金额出现次数相同）时老侧取的是集合序、结果不定；新侧定死取**时间上最早出现**的那个，
 *      只为可复现，读数与老侧同一条规则；
 *    ⑤ 总期数取该名目下**时间最早**那条记录的 N（老侧取它拿到的第一条——它那次取数是倒序，新侧
 *      `fetchAll` 是升序；只有同一名目的 N 前后不一致时两侧才有差别）；
 *    ⑥ 状态＝剩余期数大于 0 记「进行中」、否则记「已还清」；老侧那张「历史分期(已还清)」是键值行，
 *      新侧照 #688 §五 5.2 第 12 行走**小表卡**（名目／总额／期数／首期，按首期日期降序）；
 *    ⑦ 载荷走 `./views.js` 的 `buildTrend('installment', …)`；
 *    ⑧ 老侧 `_calc_kpi` 把转账也计进收支，新侧走 `./agg.js` 的 `kpiOf`（转账不算收支，#691 口径）。
 */
import { runWithLanguage } from 'base-entries';
import type { BillRow } from '../fetch/db.js';
import { allRecords, dayOf, kpiOf, round2, tagRecords, today } from './agg.js';
import { NO_WINDOW, money, textOrDash } from './pageParts.js';
import type { AnalysisScene } from './scene.js';
import { buildTrend } from './views.js';
import { m } from '../entries/index.js';

/** 一家分期在库里攒出来的那份账（老侧 `cmd_installment_summary` 里 `groups` 字典的一格）。 */
interface InstallmentGroup {
  readonly name: string;
  total: number;
  count: number;
  periods: number;
  paid: number;
  /** 首期日期（各记录日期里最早的那个；一条都没有＝`null`，与老侧 `None` 同义）。 */
  firstDate: string | null;
  readonly amounts: number[];
  futureAmount: number;
}

/** 一家分期摊在页面上的那几个读数。 */
interface InstallmentCard {
  readonly name: string;
  readonly total: number;
  readonly each: number;
  readonly periods: number;
  readonly paid: number;
  readonly remaining: number;
  readonly remainingAmount: number;
  readonly firstDate: string;
}

/** 备注里那句分期说明（老侧 `_parse_installment_note` 同形）：`#分期 {名目} 第X期/N`。
 *  解析不出＝`null`。**期序这一栏老侧解析了也不上屏**，这里同样只把名目与总期数交给页面。 */
function parseInstallmentNote(note: string): { readonly name: string; readonly periods: number } | null {
  const hit = /#分期\s+(.+?)\s+第(\d+)期\/(\d+)/.exec(note);
  if (hit === null) return null;
  return { name: hit[1].trim(), periods: Number(hit[3]) };
}

/** 每期金额（老侧 `:905-907` 同义）：出现 **≥2 次**的众数金额；没有出现两次的取最小额。
 *  平手取时间上最早出现的那个（`Map` 迭代序＝首次出现序；老侧用集合序、平手不定）。 */
function eachAmountOf(amounts: readonly number[]): number {
  const freq = new Map<number, number>();
  for (const a of amounts) freq.set(a, (freq.get(a) ?? 0) + 1);
  let mode: number | null = null;
  let best = 0;
  let min: number | null = null;
  for (const [value, n] of freq) {
    if (n > best) {
      best = n;
      mode = value;
    }
    if (min === null || value < min) min = value;
  }
  if (mode !== null && best >= 2) return mode;
  return min ?? 0;
}

/** 按月分组**之前**的那一步：一条记录落进它那个名目的账里（老侧 `:886-901` 的循环体同义）。 */
function addRecord(groups: Map<string, InstallmentGroup>, r: BillRow, todayStr: string): void {
  const parsed = parseInstallmentNote(r.note);
  const name = parsed === null || parsed.name === '' ? m('skill-bill.analysis-scene-installment.c001') : parsed.name;
  const g = groups.get(name) ?? {
    name,
    total: 0,
    count: 0,
    periods: parsed === null ? 0 : parsed.periods,
    paid: 0,
    firstDate: null,
    amounts: [],
    futureAmount: 0,
  };
  const amount = Math.abs(r.amount);
  const day = dayOf(r.time);
  g.total += amount;
  g.count += 1;
  g.amounts.push(amount);
  if (day !== '' && day <= todayStr) g.paid += 1;
  else g.futureAmount += amount;
  if (g.firstDate === null || (day !== '' && day < g.firstDate)) g.firstDate = day;
  groups.set(name, g);
}

/** 一组账 → 页面那几栏读数（老侧 `:902-914` 的 `card` 同数）。 */
function cardOf(g: InstallmentGroup): InstallmentCard {
  const remaining = Math.max(g.periods - g.paid, 0);
  return {
    name: g.name,
    total: round2(g.total),
    each: round2(eachAmountOf(g.amounts)),
    periods: g.periods,
    paid: g.paid,
    remaining,
    remainingAmount: round2(g.futureAmount),
    firstDate: g.firstDate ?? '',
  };
}

function buildScene(): AnalysisScene {
  return {
  id: 'installment',
  key: 'bill.analysis.trend',
  kind: 'installment',
  title: m('skill-bill.analysis-scene-installment.title'),
  family: 'tables',
  values: ({ db }) => {
    const records = tagRecords(allRecords(db), '分期');
    const todayStr = today();
    const groups = new Map<string, InstallmentGroup>();
    for (const r of records) addRecord(groups, r, todayStr);
    const cards = [...groups.values()].map(cardOf);
    const active = cards
      .filter((c) => c.remaining > 0)
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
    const done = cards
      .filter((c) => c.remaining === 0)
      .sort((a, b) => b.firstDate.localeCompare(a.firstDate) || a.name.localeCompare(b.name));
    const remainingPeriods = active.reduce((sum, c) => sum + c.remaining, 0);
    const remainingAmount = round2(active.reduce((sum, c) => sum + c.remainingAmount, 0));
    const head = active.at(0);
    const headTail = head === undefined
      ? '。'
      : m('skill-bill.analysis-scene-installment.c004', {
        p0: String(head.name),
        p1: String(money(head.total)),
      });
    return {
      title: m('skill-bill.analysis-scene-installment.title'),
      label: m('skill-bill.analysis-scene-installment.c006'),
      from: NO_WINDOW,
      to: NO_WINDOW,
      count: records.length,
      conclusion: records.length === 0
        ? m('skill-bill.analysis-scene-installment.c007')
        : m('skill-bill.analysis-scene-installment.c008', {
          p0: String(String(cards.length)),
          p1: String(String(active.length)),
          p2: String(String(remainingPeriods)),
          p3: String(money(remainingAmount)),
          p4: String(String(done.length)),
          p5: String(headTail),
        }),
      caliber: m('skill-bill.analysis-scene-installment.c009'),
      chips: [m('skill-bill.analysis-scene-installment.c010', { p0: String(String(active.length)) }), m('skill-bill.analysis-scene-installment.c011', { p0: String(String(done.length)) })],
      payload: buildTrend('installment', [...records]),
      kpi: kpiOf(records),
      page: {
        kpis: [
          { label: m('skill-bill.analysis-scene-installment.c012'), value: String(active.length), unit: m('skill-bill.analysis-scene-installment.c013') },
          { label: m('skill-bill.analysis-scene-installment.c014'), value: String(remainingPeriods), unit: m('skill-bill.analysis-scene-installment.c015') },
          { label: m('skill-bill.analysis-scene-installment.c016'), value: money(remainingAmount), unit: m('skill-bill.analysis-scene-installment.c017') },
        ],
        chips: [m('skill-bill.analysis-scene-installment.c018', { p0: String(String(active.length)) }), m('skill-bill.analysis-scene-installment.c019', { p0: String(String(done.length)) })],
        tables: [
          {
            title: m('skill-bill.analysis-scene-installment.c020', { p0: String(String(active.length)) }),
            columns: [
              { key: 'name', label: m('skill-bill.analysis-scene-installment.c021') },
              { key: 'total', label: m('skill-bill.analysis-scene-installment.c022'), align: 'right' },
              { key: 'each', label: m('skill-bill.analysis-scene-installment.c023'), align: 'right' },
              { key: 'paid', label: m('skill-bill.analysis-scene-installment.c024'), align: 'right' },
              { key: 'remaining', label: m('skill-bill.analysis-scene-installment.c025'), align: 'right' },
              { key: 'remainingAmount', label: m('skill-bill.analysis-scene-installment.c026'), align: 'right' },
            ],
            rows: active.map((c) => ({
              name: textOrDash(c.name),
              total: m('skill-bill.analysis-scene-installment.c027', { p0: String(money(c.total)) }),
              each: m('skill-bill.analysis-scene-installment.c028', { p0: String(money(c.each)) }),
              paid: m('skill-bill.analysis-scene-installment.c029', { p0: String(String(c.paid)) }),
              remaining: m('skill-bill.analysis-scene-installment.c030', { p0: String(String(c.remaining)) }),
              remainingAmount: m('skill-bill.analysis-scene-installment.c031', { p0: String(money(c.remainingAmount)) }),
            })),
            emptyText: m('skill-bill.analysis-scene-installment.c032'),
          },
          {
            title: m('skill-bill.analysis-scene-installment.c033', { p0: String(String(done.length)) }),
            columns: [
              { key: 'name', label: m('skill-bill.analysis-scene-installment.c034') },
              { key: 'total', label: m('skill-bill.analysis-scene-installment.c035'), align: 'right' },
              { key: 'periods', label: m('skill-bill.analysis-scene-installment.c036'), align: 'right' },
              { key: 'firstDate', label: m('skill-bill.analysis-scene-installment.c037'), align: 'right' },
            ],
            rows: done.map((c) => ({
              name: textOrDash(c.name),
              total: m('skill-bill.analysis-scene-installment.c038', { p0: String(money(c.total)) }),
              periods: String(c.periods),
              firstDate: textOrDash(c.firstDate),
            })),
            emptyText: m('skill-bill.analysis-scene-installment.c039'),
          },
        ],
        factCards: [],
        empty: {
          text: m('skill-bill.analysis-scene-installment.c040'),
          hint: m('skill-bill.analysis-scene-installment.c041'),
        },
      },
    };
  },
  };
}

export const sceneInstallment: AnalysisScene = buildScene();

/** 按语言重建本场景（#1197：文案经词条层，语言是运行期参数）。 */
export function sceneInstallmentFor(language: string): AnalysisScene {
  return runWithLanguage(language, buildScene);
}
