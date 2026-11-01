/** 场景件：**看同比**（`kind = 'yoy'`，命令 `bill.analysis.compare`）——本件只是差异声明与取值，
 *  块位序列住 `./template-compare.ts`（族＝对比＋变更）。
 *
 *  老侧对应件：`scripts/analysis/cli.py` 的 `cmd_yoy`（`:465-482`）＋ 模板
 *  `templates/分析/analysis_view.html` 的 `renderYoy`（`:583-599`）。
 *
 *  本件的差异（照老侧那一页逐点对）：
 *   ① 月份缺省＝**当刻所在月**（老侧 `args.month or date.today().strftime("%Y-%m")` 同义）；
 *   ② 去年同月＝**年份减一、月份不动**（老侧 `f"{y - 1}-{month[5:]}"`）——不是「上一月」
 *      （`./agg.js` 的 `prevMonth` 只退一个月，本件不用它算去年同月，只用它算「本月 vs 上月」
 *      那条不在本件里）；
 *   ③ 变更句把方向说成 `同比上涨／下降／持平`（老侧 `renderYoy` 那句 `· 同比…`），
 *      差 > 0.01 记上涨、< −0.01 记下降、否则持平；百分比以去年同月为分母、为 0 时记 0。
 */
import { runWithLanguage } from 'base-entries';
import { BillPolicyError } from '../fetch/errors.js';
import { listRange } from '../fetch/index.js';
import { monthRange } from '../shared/dateRange.js';
import { compareTwo, kpiOf, thisMonth } from './agg.js';
import { sideKpisOf } from './cards.js';
import { money, pctText } from './pageParts.js';
import { needMonth } from './params.js';
import type { AnalysisScene } from './scene.js';
import { buildCompare } from './views.js';
import { m } from '../entries/index.js';

/** 参数槽位的空写法（缺省、空串、非字符串一律当「没给」——老侧 `args.month or ...` 同义）。 */
function slotText(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** 去年同月：年份减一、月份逐字不动（老侧 `cmd_yoy` 那两行）。 */
function lastYearMonth(month: string): string {
  const year = Number(month.slice(0, 4));
  if (!Number.isFinite(year) || year < 2000) {
    throw new BillPolicyError('POLICY_BAD_INPUT', '月份年份异常：' + month);
  }
  return String(year - 1) + '-' + month.slice(5);
}

function buildScene(): AnalysisScene {
  return {
  id: 'yoy',
  key: 'bill.analysis.compare',
  kind: 'yoy',
  title: m('skill-bill.analysis-scene-yoy.title'),
  family: 'compare',
  values: ({ params, db }) => {
    const month = slotText(params.month) === '' ? thisMonth() : needMonth(params);
    const last = lastYearMonth(month);
    const thisRange = monthRange(month);
    const lastRange = monthRange(last);
    const ra = listRange(db, thisRange.start, thisRange.end);
    const rb = listRange(db, lastRange.start, lastRange.end);
    const labelA = m('skill-bill.analysis-scene-yoy.c002', { p0: String(month) });
    const labelB = m('skill-bill.analysis-scene-yoy.c003', { p0: String(last) });
    const cmp = compareTwo(ra, rb, labelA, labelB);
    const diff = cmp.change.diff;
    const direction: 'up' | 'down' | 'flat' = diff > 0.01 ? 'up' : diff < -0.01 ? 'down' : 'flat';
    const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→';
    const word = direction === 'up' ? m('skill-bill.analysis-scene-yoy.c004') : direction === 'down' ? m('skill-bill.analysis-scene-yoy.c005') : m('skill-bill.analysis-scene-yoy.c006');
    const pct = direction === 'up'
      ? '+' + pctText(Math.abs(cmp.change.pct))
      : direction === 'down' ? '-' + pctText(Math.abs(cmp.change.pct)) : pctText(0);
    const total = ra.length + rb.length;
    return {
      title: m('skill-bill.analysis-scene-yoy.title'),
      label: m('skill-bill.analysis-scene-yoy.c008', { p0: String(labelA), p1: String(labelB) }),
      from: lastRange.start,
      to: thisRange.end,
      count: total,
      conclusion: total === 0
        ? m('skill-bill.analysis-scene-yoy.c009', { p0: String(month), p1: String(last) })
        : m('skill-bill.analysis-scene-yoy.c010', {
          p0: String(month),
          p1: String(money(cmp.a.expense)),
          p2: String(last),
          p3: String(money(cmp.b.expense)),
          p4: String(word),
          p5: String(money(Math.abs(diff))),
          p6: String(pct),
        }),
      caliber: m('skill-bill.analysis-scene-yoy.c011'),
      chips: [labelA, labelB],
      payload: buildCompare({ labelA, labelB, a: [...ra], b: [...rb] }),
      kpi: kpiOf([...ra, ...rb]),
      page: {
        kpis: [],
        chips: [],
        sides: [
          { title: labelA, kpis: sideKpisOf(labelA, cmp.a, money) },
          { title: labelB, kpis: sideKpisOf(labelB, cmp.b, money) },
        ],
        change: {
          text: m('skill-bill.analysis-scene-yoy.c012', {
            p0: String(arrow),
            p1: String(money(Math.abs(diff))),
            p2: String(pct),
            p3: String(word),
          }),
          detail: m('skill-bill.analysis-scene-yoy.c013', {
            p0: String(money(cmp.a.expense)),
            p1: String(money(cmp.b.expense)),
          }),
          direction,
        },
        barGroups: [],
        factCards: [],
        empty: {
          text: m('skill-bill.analysis-scene-yoy.c014', { p0: String(month), p1: String(last) }),
          hint: m('skill-bill.analysis-scene-yoy.c015'),
        },
      },
    };
  },
  };
}

export const sceneYoy: AnalysisScene = buildScene();

/** 按语言重建本场景（#1197：文案经词条层，语言是运行期参数）。 */
export function sceneYoyFor(language: string): AnalysisScene {
  return runWithLanguage(language, buildScene);
}
