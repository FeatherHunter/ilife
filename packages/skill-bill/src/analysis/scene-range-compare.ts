/** 场景件：**看双区间**（`kind = 'range'`，命令 `bill.analysis.compare`）——本件只是差异声明与取值，
 *  块位序列住 `./template-compare.ts`（族＝对比＋变更）。
 *
 *  老侧对应件：`scripts/analysis/cli.py` 的 `cmd_range_compare`（`:436-462`）＋ 模板
 *  `templates/分析/analysis_view.html` 的 `renderRangeCompare`（`:554-580`）。
 *
 *  本件的差异（照老侧那一页逐点对）：
 *   ① **两套槽位名都认**：先取 `startA`／`endA`／`startB`／`endB`，任缺再退回老侧那套
 *      `from1`／`to1`／`from2`／`to2`；四个槽位仍缺一个即 `POLICY_MISSING_SLOT`（老侧那句
 *      「必须全部指定」的同义阻断）；
 *   ② **分类差异条**按 L1 归堆（老侧 `_agg_expense_by(..., lambda r: _l1(...))` 同口径），
 *      两段金额差按绝对值降序取前 8，条长按本组**最大绝对差**折算（老侧 `_compare_two` 的
 *      两段读数 ＋ `diffs` 那一支）；
 *   ③ 老侧那页把每条差异摆成 `↑ +金额 (a → b)` 一行事实——新侧改摆**条卡**（版式可全新设计，
 *      #681 偏好 3）：金额差、两段读数与两段笔数一件不少，只是换了摆法。
 */
import { BillPolicyError } from '../fetch/errors.js';
import { listRange } from '../fetch/index.js';
import { normalizeDate } from '../shared/dateRange.js';
import { aggByL1, compareTwo, kpiOf, round1, round2 } from './agg.js';
import { sideKpisOf } from './cards.js';
import { money, pctText, signedMoney } from './pageParts.js';
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
  const a = {
    start: slotOf(params, 'startA', 'from1'),
    end: slotOf(params, 'endA', 'to1'),
  };
  const b = {
    start: slotOf(params, 'startB', 'from2'),
    end: slotOf(params, 'endB', 'to2'),
  };
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

export const sceneRangeCompare: AnalysisScene = {
  id: 'range_compare',
  key: 'bill.analysis.compare',
  kind: 'range',
  title: '看双区间',
  family: 'compare',
  values: ({ params, db }) => {
    const { a: winA, b: winB } = windowsOf(params);
    const ra = listRange(db, winA.start, winA.end);
    const rb = listRange(db, winB.start, winB.end);
    const cmp = compareTwo(ra, rb, winA.label, winB.label);
    const diff = cmp.change.diff;
    const direction: 'up' | 'down' | 'flat' = diff > 0.01 ? 'up' : diff < -0.01 ? 'down' : 'flat';
    const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→';
    const word = direction === 'up' ? '支出上涨' : direction === 'down' ? '支出下降' : '支出持平';
    const pct = direction === 'up'
      ? '+' + pctText(Math.abs(cmp.change.pct))
      : direction === 'down' ? '-' + pctText(Math.abs(cmp.change.pct)) : pctText(0);

    /* 分类差异：两段各按 L1 归堆（只算支出侧），并起来算金额差与笔数差，绝对差降序取前 8。 */
    const ga = new Map(aggByL1(ra).map((x) => [x.key, x]));
    const gb = new Map(aggByL1(rb).map((x) => [x.key, x]));
    const diffs = [...new Set([...ga.keys(), ...gb.keys()])]
      .map((key) => {
        const x = ga.get(key);
        const y = gb.get(key);
        const av = x === undefined ? 0 : x.value;
        const bv = y === undefined ? 0 : y.value;
        return {
          key, a: av, b: bv,
          aCount: x === undefined ? 0 : x.count,
          bCount: y === undefined ? 0 : y.count,
          diff: round2(av - bv),
        };
      })
      .sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff) || x.key.localeCompare(y.key))
      .slice(0, 8);
    const maxAbs = diffs.reduce((m, d) => Math.max(m, Math.abs(d.diff)), 0);
    const head = diffs[0];
    const total = ra.length + rb.length;
    return {
      title: '看双区间',
      label: winA.label + ' 与 ' + winB.label,
      from: winA.start < winB.start ? winA.start : winB.start,
      to: winA.end > winB.end ? winA.end : winB.end,
      count: total,
      conclusion: head === undefined
        ? winA.label + ' 与 ' + winB.label + ' 两段都没有支出记录。'
        : winA.label + ' 支出 ' + money(cmp.a.expense) + ' 元，' + winB.label + ' 支出 ' + money(cmp.b.expense)
          + ' 元：' + word + ' ' + money(Math.abs(diff)) + ' 元（' + pct + '）；两段差得最多的是「'
          + head.key + '」' + signedMoney(head.diff) + ' 元。',
      caliber: '两段各取自己那一段的整段记录，支出按绝对值累计；分类按一级归堆（两级／三级分类并到一级）；百分比以区间二为分母、区间二支出为 0 时记 0；转账不计入收支。',
      chips: [winA.label, winB.label],
      payload: buildCompare({ labelA: winA.label, labelB: winB.label, a: [...ra], b: [...rb] }),
      kpi: kpiOf([...ra, ...rb]),
      page: {
        kpis: [],
        chips: [],
        sides: [
          { title: winA.label, kpis: sideKpisOf(winA.label, cmp.a, money) },
          { title: winB.label, kpis: sideKpisOf(winB.label, cmp.b, money) },
        ],
        change: {
          text: '支出 ' + arrow + ' ' + money(Math.abs(diff)) + ' 元（' + pct + '）· ' + word,
          detail: '区间一支出 ' + money(cmp.a.expense) + ' 元，区间二支出 ' + money(cmp.b.expense) + ' 元；两段各取自己那一段。',
          direction,
        },
        barGroups: [{
          title: '分类差异 TOP（' + String(diffs.length) + ' 类）',
          rows: diffs.map((d) => ({
            label: d.key,
            text: money(d.a) + ' → ' + money(d.b) + ' · ' + signedMoney(d.diff)
              + '（' + String(d.aCount) + '笔→' + String(d.bCount) + '笔）',
            pct: maxAbs === 0 ? 0 : round1((Math.abs(d.diff) / maxAbs) * 100),
          })),
          emptyText: '两段都没有支出记录',
        }],
        factCards: [],
        empty: {
          text: winA.label + ' 与 ' + winB.label + ' 两段都没有记录。',
          hint: '先说「记支出」或「记收入」记一笔，回来看这里就有数了。',
        },
      },
    };
  },
};
