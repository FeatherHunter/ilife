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
import { runWithLanguage } from 'base-entries';
import { BillPolicyError } from '../fetch/errors.js';
import { listRange } from '../fetch/index.js';
import { monthRange, weekRange } from '../shared/dateRange.js';
import { compareTwo, kpiOf, prevMonth, round2, thisMonth } from './agg.js';
import { sideKpisOf } from './cards.js';
import { money, pctText, signedMoney } from './pageParts.js';
import { needMonth } from './params.js';
import type { AnalysisScene } from './scene.js';
import { buildCompare } from './views.js';
import { m } from '../entries/index.js';

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
      a: { label: m('skill-bill.analysis-scene-period-compare.c001', {
        p0: String(mmdd(thisWeek.start)),
        p1: String(mmdd(thisWeek.end)),
      }), start: thisWeek.start, end: thisWeek.end },
      b: { label: m('skill-bill.analysis-scene-period-compare.c002', {
        p0: String(mmdd(lastStart)),
        p1: String(mmdd(lastEnd)),
      }), start: lastStart, end: lastEnd },
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

function buildScene(): AnalysisScene {
  return {
  id: 'period_compare',
  key: 'bill.analysis.compare',
  kind: 'period',
  title: m('skill-bill.analysis-scene-period-compare.title'),
  family: 'compare',
  values: ({ params, db }) => {
    const { a: winA, b: winB } = windowsOf(params);
    const ra = listRange(db, winA.start, winA.end);
    const rb = listRange(db, winB.start, winB.end);
    const cmp = compareTwo(ra, rb, winA.label, winB.label);
    const diff = cmp.change.diff;
    const direction: 'up' | 'down' | 'flat' = diff > 0.01 ? 'up' : diff < -0.01 ? 'down' : 'flat';
    const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→';
    const word = direction === 'up' ? m('skill-bill.analysis-scene-period-compare.c004') : direction === 'down' ? m('skill-bill.analysis-scene-period-compare.c005') : m('skill-bill.analysis-scene-period-compare.c006');
    /* 百分比带上方向前缀（与箭头一致）：上涨 `+4.5%`／下降 `-4.5%`／持平 `0.0%`。 */
    const pct = direction === 'up'
      ? '+' + pctText(Math.abs(cmp.change.pct))
      : direction === 'down' ? '-' + pctText(Math.abs(cmp.change.pct)) : pctText(0);
    const total = ra.length + rb.length;
    return {
      title: m('skill-bill.analysis-scene-period-compare.title'),
      label: m('skill-bill.analysis-scene-period-compare.c008', { p0: String(winA.label), p1: String(winB.label) }),
      from: winA.start < winB.start ? winA.start : winB.start,
      to: winA.end > winB.end ? winA.end : winB.end,
      count: total,
      conclusion: total === 0
        ? m('skill-bill.analysis-scene-period-compare.c009', { p0: String(winA.label), p1: String(winB.label) })
        : m('skill-bill.analysis-scene-period-compare.c010', {
          p0: String(winA.label),
          p1: String(money(cmp.a.expense)),
          p2: String(winB.label),
          p3: String(money(cmp.b.expense)),
          p4: String(word),
          p5: String(money(Math.abs(diff))),
          p6: String(pct),
        }),
      caliber: m('skill-bill.analysis-scene-period-compare.c011'),
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
          text: m('skill-bill.analysis-scene-period-compare.c012', {
            p0: String(arrow),
            p1: String(money(Math.abs(diff))),
            p2: String(pct),
            p3: String(word),
          }),
          detail: m('skill-bill.analysis-scene-period-compare.c013', {
            p0: String(money(cmp.a.expense)),
            p1: String(money(cmp.b.expense)),
          }),
          direction,
        },
        barGroups: [],
        /* 明细 9 行（原型 a10-看对比-v2.1逐像素：两侧各 4 行＋变化 1 行，只搬家不重算；
           两侧取自 compareTwo 两侧 KPI（与 sides 同源），变化取 B-A 有符号差（与载荷 buildCompare 同向）；
           票据纸明细经 ./template-compare.ts 的 factCards 支呈现，载荷键不动）。 */
        factCards: [
          {
            title: winA.label,
            rows: [
              { k: m('skill-bill.analysis-scene-period-compare.c014'), v: m('skill-bill.analysis-scene-period-compare.c015', { p0: String(String(cmp.a.count)) }) },
              { k: m('skill-bill.analysis-scene-period-compare.c016'), v: m('skill-bill.analysis-scene-period-compare.c017', { p0: String(money(cmp.a.expense)) }) },
              { k: m('skill-bill.analysis-scene-period-compare.c018'), v: m('skill-bill.analysis-scene-period-compare.c019', { p0: String(money(cmp.a.income)) }) },
              { k: m('skill-bill.analysis-scene-period-compare.c020'), v: m('skill-bill.analysis-scene-period-compare.c021', { p0: String(money(cmp.a.net)) }) },
            ],
          },
          {
            title: winB.label,
            rows: [
              { k: m('skill-bill.analysis-scene-period-compare.c022'), v: m('skill-bill.analysis-scene-period-compare.c023', { p0: String(String(cmp.b.count)) }) },
              { k: m('skill-bill.analysis-scene-period-compare.c024'), v: m('skill-bill.analysis-scene-period-compare.c025', { p0: String(money(cmp.b.expense)) }) },
              { k: m('skill-bill.analysis-scene-period-compare.c026'), v: m('skill-bill.analysis-scene-period-compare.c027', { p0: String(money(cmp.b.income)) }) },
              { k: m('skill-bill.analysis-scene-period-compare.c028'), v: m('skill-bill.analysis-scene-period-compare.c029', { p0: String(money(cmp.b.net)) }) },
            ],
          },
          {
            title: m('skill-bill.analysis-scene-period-compare.c030'),
            rows: [
              { k: m('skill-bill.analysis-scene-period-compare.c031'), v: m('skill-bill.analysis-scene-period-compare.c032', {
                p0: String(signedMoney(round2(cmp.b.expense - cmp.a.expense))),
                p1: String(winA.label),
                p2: String(winB.label),
              }) },
            ],
          },
        ],
        empty: {
          text: m('skill-bill.analysis-scene-period-compare.c033', {
            p0: String(winA.label),
            p1: String(winB.label),
          }),
          hint: m('skill-bill.analysis-scene-period-compare.c034'),
        },
      },
    };
  },
  };
}

export const scenePeriodCompare: AnalysisScene = buildScene();

/** 按语言重建本场景（#1197：文案经词条层，语言是运行期参数）。 */
export function scenePeriodCompareFor(language: string): AnalysisScene {
  return runWithLanguage(language, buildScene);
}
