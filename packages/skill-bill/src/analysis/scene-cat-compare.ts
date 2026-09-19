/** 场景件：**看分类对比**（`kind = 'category'`，命令 `bill.analysis.compare`）——本件只是差异声明与取值，
 *  块位序列住 `./template-compare.ts`（族＝对比＋变更）。
 *
 *  老侧对应件：`scripts/analysis/cli.py` 的 `cmd_cat_compare`（`:485-519`）＋ 模板
 *  `templates/分析/analysis_view.html` 的 `renderCatCompare`（`:602-627`）。
 *
 *  本件的差异（照老侧那一页逐点对）：
 *   ① **两套槽位名都认**（与「看双区间」同一条）：先取 `startA`／`endA`／`startB`／`endB`，
 *      任缺再退回老侧那套 `from1`／`to1`／`from2`／`to2`；缺一个即 `POLICY_MISSING_SLOT`；
 *   ② **只算支出侧**（老侧 `_filter(..., type_="expense")`）：两段各按 L1 归堆算金额与笔数，
 *      并起来算金额差与笔数差，绝对差降序取前 10（老侧 `rows[:10]`），条长按最大金额差折算；
 *   ③ 老侧那页把每条差异摆成 `↑ 金额` 一行——新侧改摆**条卡**（#681 偏好 3：版式可全新设计），
 *      两段金额、金额差与两段笔数一件不少（条卡比老侧那行多了两段笔数）。
 */
import { BillPolicyError } from '../fetch/errors.js';
import { listRange } from '../fetch/index.js';
import { normalizeDate } from '../shared/dateRange.js';
import { aggByL1, filterOf, kpiOf, round1, round2 } from './agg.js';
import { money, signedMoney } from './pageParts.js';
import type { AnalysisScene } from './scene.js';
import { buildCompare } from './views.js';

/** 一段对比窗口：期间标签 ＋ 起止日。 */
interface Win {
  readonly label: string;
  readonly start: string;
  readonly end: string;
}

/** 参数槽位的空写法（缺省、空串、非字符串一律当「没给」）。 */
function slotText(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** 两套槽位名择一：`startA` 那套优先，缺了退回 `from1` 那套。 */
function slotOf(params: Record<string, unknown>, fresh: string, legacy: string): string {
  const v = slotText(params[fresh]);
  return v === '' ? slotText(params[legacy]) : v;
}

/** 本次要比的两段：四个槽位缺一个即阻断；起止形态归一走 `../shared/dateRange.js`。 */
function windowsOf(params: Record<string, unknown>): { readonly a: Win; readonly b: Win } {
  const a = { start: slotOf(params, 'startA', 'from1'), end: slotOf(params, 'endA', 'to1') };
  const b = { start: slotOf(params, 'startB', 'from2'), end: slotOf(params, 'endB', 'to2') };
  if (a.start === '' || a.end === '' || b.start === '' || b.end === '') {
    throw new BillPolicyError('POLICY_MISSING_SLOT', '缺槽位 startA/endA/startB/endB（老写法 from1/to1/from2/to2 也认）');
  }
  const startA = normalizeDate(a.start, 'startA');
  const endA = normalizeDate(a.end, 'endA');
  const startB = normalizeDate(b.start, 'startB');
  const endB = normalizeDate(b.end, 'endB');
  if (startA > endA) throw new BillPolicyError('POLICY_BAD_INPUT', '区间一起点不得晚于终点：' + startA + '~' + endA);
  if (startB > endB) throw new BillPolicyError('POLICY_BAD_INPUT', '区间二起点不得晚于终点：' + startB + '~' + endB);
  return {
    a: { label: startA + '~' + endA, start: startA, end: endA },
    b: { label: startB + '~' + endB, start: startB, end: endB },
  };
}

export const sceneCatCompare: AnalysisScene = {
  id: 'cat_compare',
  key: 'bill.analysis.compare',
  kind: 'category',
  title: '看分类对比',
  family: 'compare',
  values: ({ params, db }) => {
    const { a: winA, b: winB } = windowsOf(params);
    const ra = listRange(db, winA.start, winA.end);
    const rb = listRange(db, winB.start, winB.end);
    /* 只算支出侧：转账与收入都不进来（`filterOf` 已剔转账）。 */
    const ea = filterOf(ra, { direction: 'expense' });
    const eb = filterOf(rb, { direction: 'expense' });
    const ga = new Map(aggByL1(ea).map((x) => [x.key, x]));
    const gb = new Map(aggByL1(eb).map((x) => [x.key, x]));
    const all = [...new Set([...ga.keys(), ...gb.keys()])]
      .map((key) => {
        const x = ga.get(key);
        const y = gb.get(key);
        const av = x === undefined ? 0 : x.value;
        const bv = y === undefined ? 0 : y.value;
        const aCount = x === undefined ? 0 : x.count;
        const bCount = y === undefined ? 0 : y.count;
        return {
          key, a: av, b: bv, aCount, bCount,
          amount: round2(av - bv),
          countDiff: aCount - bCount,
        };
      })
      .sort((x, y) => Math.abs(y.amount) - Math.abs(x.amount) || x.key.localeCompare(y.key));
    /* 条卡只摆前 10 类（老侧 `rows[:10]`）；结论句里的类数报**全部**几类（老侧标题那枚 `TOP 10` 报的是摆出来的条数）。 */
    const rows = all.slice(0, 10);
    const maxAbs = rows.reduce((m, r) => Math.max(m, Math.abs(r.amount)), 0);
    /* 两段支出合计的差只用来定方向（老侧 `cmd_cat_compare` 只打分类那一列，本页不出变更徽标）。 */
    const sumA = round2(ea.reduce((s, r) => s + Math.abs(r.amount), 0));
    const sumB = round2(eb.reduce((s, r) => s + Math.abs(r.amount), 0));
    const diff = round2(sumA - sumB);
    const direction: 'up' | 'down' | 'flat' = diff > 0.01 ? 'up' : diff < -0.01 ? 'down' : 'flat';
    const head = rows[0];
    return {
      title: '看分类对比',
      label: winA.label + ' 与 ' + winB.label,
      from: winA.start < winB.start ? winA.start : winB.start,
      to: winA.end > winB.end ? winA.end : winB.end,
      count: ra.length + rb.length,
      conclusion: head === undefined
        ? winA.label + ' 与 ' + winB.label + ' 两段都没有支出记录。'
        : winA.label + ' 与 ' + winB.label + ' 两段共 ' + String(all.length) + ' 类支出：金额差最大的是「'
          + head.key + '」' + signedMoney(head.amount) + ' 元（' + money(head.a) + ' → ' + money(head.b)
          + '）；两段支出合计差 ' + signedMoney(diff) + ' 元。',
      caliber: '只算支出侧；分类按一级归堆（两级／三级分类并到一级），条长按最大金额差折算，金额差降序取前 10 类；转账不计入收支。',
      chips: ['区间一 ' + winA.start + '~' + winA.end, '区间二 ' + winB.start + '~' + winB.end],
      payload: buildCompare({ labelA: winA.label, labelB: winB.label, a: [...ra], b: [...rb] }),
      kpi: kpiOf([...ra, ...rb]),
      page: {
        kpis: [],
        chips: ['区间一 ' + winA.start + '~' + winA.end, '区间二 ' + winB.start + '~' + winB.end],
        sides: [],
        change: { text: '', detail: '', direction },
        barGroups: [{
          title: '金额变化最大（' + String(rows.length) + ' 类）',
          rows: rows.map((r) => ({
            label: r.key,
            text: money(r.a) + ' → ' + money(r.b) + ' · ' + signedMoney(r.amount)
              + '（' + String(r.aCount) + '笔→' + String(r.bCount) + '笔）',
            pct: maxAbs === 0 ? 0 : round1((Math.abs(r.amount) / maxAbs) * 100),
          })),
          emptyText: '两段都没有支出记录',
        }],
        factCards: [],
        empty: {
          text: '两段都没有支出记录。',
          hint: '先说「记支出」记一笔，回来看这里就有数了。',
        },
      },
    };
  },
};
