/** 场景件：**看对比**（`kind = 'period'`，命令 `bill.analysis.compare`）——本件只是差异声明与取值，
 *  块位序列住 `./template-compare.ts`（族＝对比＋变更）。
 *
 *  老侧对应件：`scripts/analysis/cli.py` 的 `cmd_compare`（`:415-433`，取数走 `analyze.compare_periods`
 *  ＝ `scripts/analyze.py:114-172`）＋ 模板 `templates/分析/analysis_view.html` 的 `renderCompare`（`:532-551`）。
 *
 *  本件的差异（照老侧那一页逐点对）：
 *   ① **两套参数**：给了 `monthA`／`monthB`（`YYYY-MM`）就照那两个月各取一整月；没给才走老侧那一条
 *      `period`（`week`＝本周 vs 上周、`month`＝本月 vs 上月，缺省 `month`）——老侧只认后者；
 *   ② **方向与变更句**照老侧那一支（差 > 0.01 记上涨、< −0.01 记下降、否则持平；百分比以对比期为分母、
 *      对比期支出为 0 时记 0）——数与 `./agg.js` 的 `compareTwo` 同源，本件不另算一套；
 *   ③ **载荷**照搬迁前那一支（`./views.js` 的 `buildCompare`），一字不改。
 */
import { BillPolicyError } from '../fetch/errors.js';
import { listRange } from '../fetch/index.js';
import { monthRange, weekRange } from '../shared/dateRange.js';
import { compareTwo, kpiOf, prevMonth, thisMonth } from './agg.js';
import { sideKpisOf } from './cards.js';
import { money, pctText } from './pageParts.js';
import { needMonth } from './params.js';
import type { AnalysisScene } from './scene.js';
import { buildCompare } from './views.js';

/** 一段对比窗口：期间标签 ＋ 起止日（老侧 `period_a.label`／`_fetch(from, to)` 那两样）。 */
interface Win {
  readonly label: string;
  readonly start: string;
  readonly end: string;
}

/** 参数槽位的空写法（缺省、空串、非字符串一律当「没给」——老侧 `args.month or ...` 同义）。 */
function slotText(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** 日期串挪 N 天（`YYYY-MM-DD`；只做日期算术，不读时钟）。本周与上周那两段用它。 */
function shiftDays(date: string, days: number): string {
  return new Date(Date.parse(date + 'T00:00:00Z') + days * 86400000).toISOString().slice(0, 10);
}

/** `2026-06-08` → `06/08`（周标签照老侧那两种写法里的第二种）。 */
function mmdd(date: string): string {
  return date.slice(5).replace('-', '/');
}

/** 本次要比的两段：两套参数择一，缺槽位即阻断（不猜、不兜底）。 */
function windowsOf(params: Record<string, unknown>): { readonly a: Win; readonly b: Win } {
  const rawA = slotText(params.monthA);
  const rawB = slotText(params.monthB);
  if (rawA !== '' || rawB !== '') {
    if (rawA === '' || rawB === '') {
      throw new BillPolicyError('POLICY_MISSING_SLOT', '缺槽位 monthA/monthB（两段月份要一起给）');
    }
    const monthA = needMonth(params, 'monthA');
    const monthB = needMonth(params, 'monthB');
    return {
      a: { label: monthA, ...monthRange(monthA) },
      b: { label: monthB, ...monthRange(monthB) },
    };
  }
  // 缺省＝**周**（老侧 `analyze.compare_periods` 的 `period` 缺省就是 `"week"`——那是老行为，
  // 照默认真相办；`看对比` 那条唤醒词问的「周期」给了什么就用什么）。
  const period = slotText(params.period) === '' ? 'week' : slotText(params.period);
  if (period === 'week') {
    const thisWeek = weekRange();
    const lastStart = shiftDays(thisWeek.start, -7);
    const lastEnd = shiftDays(thisWeek.start, -1);
    return {
      a: { label: mmdd(thisWeek.start) + '~' + mmdd(thisWeek.end) + ' 周', start: thisWeek.start, end: thisWeek.end },
      b: { label: mmdd(lastStart) + '~' + mmdd(lastEnd) + ' 周', start: lastStart, end: lastEnd },
    };
  }
  if (period !== 'month') {
    throw new BillPolicyError('POLICY_BAD_INPUT', 'period 只认 week／month：' + period);
  }
  const thisM = thisMonth();
  const lastM = prevMonth(thisM);
  return {
    a: { label: thisM, ...monthRange(thisM) },
    b: { label: lastM, ...monthRange(lastM) },
  };
}

export const scenePeriodCompare: AnalysisScene = {
  id: 'period_compare',
  key: 'bill.analysis.compare',
  kind: 'period',
  title: '看对比',
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
    /* 百分比带上方向前缀（与箭头一致）：上涨 `+4.5%`／下降 `-4.5%`／持平 `0.0%`。 */
    const pct = direction === 'up'
      ? '+' + pctText(Math.abs(cmp.change.pct))
      : direction === 'down' ? '-' + pctText(Math.abs(cmp.change.pct)) : pctText(0);
    const total = ra.length + rb.length;
    return {
      title: '看对比',
      label: winA.label + ' 与 ' + winB.label,
      from: winA.start < winB.start ? winA.start : winB.start,
      to: winA.end > winB.end ? winA.end : winB.end,
      count: total,
      conclusion: total === 0
        ? winA.label + ' 与 ' + winB.label + ' 两段都还没有记录。'
        : winA.label + ' 支出 ' + money(cmp.a.expense) + ' 元，' + winB.label + ' 支出 ' + money(cmp.b.expense)
          + ' 元：' + word + ' ' + money(Math.abs(diff)) + ' 元（' + pct + '）。',
      caliber: '两段各取自己那一段的整段记录，支出按绝对值累计；百分比以对比期为分母，对比期支出为 0 时记 0；转账不计入收支。',
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
          detail: '本期支出 ' + money(cmp.a.expense) + ' 元，对比期支出 ' + money(cmp.b.expense) + ' 元；两段各取自己的窗口。',
          direction,
        },
        barGroups: [],
        factCards: [],
        empty: {
          text: winA.label + ' 与 ' + winB.label + ' 两段都没有记录。',
          hint: '先说「记支出」或「记收入」记一笔，回来看这里就有数了。',
        },
      },
    };
  },
};
