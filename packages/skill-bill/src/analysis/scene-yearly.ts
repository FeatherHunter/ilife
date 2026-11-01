/** 场景件：**看年度**（`kind = 'yearly'`，命令 `bill.analysis.overview`）——本件只是差异声明与取值，
 *  块位序列住 `./template-bars.ts`（族＝读数＋条）。
 *
 * 老侧对应件：`scripts/analysis/cli.py` 的 `cmd_yearly`（`:194-210`）
 *  ＋ 模板 `templates/分析/analysis_view.html` 的 `renderYearly`（`:306-327`）。
 *
 * 本件的差异（照老侧那一页逐点对）：
 *   ① 期间＝参数给的年份（缺 `year` 即今年，老侧 `args.year or date.today().year` 同条口径；
 *      数字与数字串都认——参数走命令行 JSON，`"2026"` 与 `2026` 都到得了这里）；
 *   ② 逐月趋势取 `monthSeries(rows, 12)`：**序列终点＝库里最新一条记录所在的月**（老侧 `_month_series`
 *      就这口径，本件不改成从今天起算），12 条不论有没有记录都出一条（空月读数是 0 笔）；
 *   ③ 大额分类**按一级分类归堆**（老侧 `_agg_expense_by(..., lambda r: _l1(r.category), top_n=8)`），
 *      只出前 8 类；条长按**本页最大一类**折算（老侧 `Math.max(...cats…)` 的分母是截过前 8 名的那一份）；
 *   ④ 逐月条卡与分类条卡的空态句各出一句（老侧两张卡各自的 `emptyState({text})`）；
 *   ⑤ 载荷照搬迁前那一支（`./views.js` 的 `buildOverview`），一字不改。
 */
import { runWithLanguage } from 'base-entries';
import { listRange } from '../fetch/index.js';
import { BillPolicyError } from '../fetch/errors.js';
import { aggByL1, kpiOf, monthSeries, round1, yearRange } from './agg.js';
import { money, pctText } from './pageParts.js';
import type { AnalysisScene } from './scene.js';
import { buildOverview } from './views.js';
import { m } from '../entries/index.js';

/** 年份槽：缺＝今年；数字与数字串都认，认不得即如实抛。 */
function readYear(params: Record<string, unknown>): number {
  const raw = params.year;
  if (raw === undefined || raw === null || raw === '') return new Date().getFullYear();
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n) || Math.floor(n) !== n || n < 1000 || n > 9999) {
    throw new BillPolicyError('POLICY_BAD_INPUT', 'year 得是四位年份：' + JSON.stringify(raw));
  }
  return n;
}

function buildScene(): AnalysisScene {
  return {
  id: 'yearly',
  key: 'bill.analysis.overview',
  kind: 'yearly',
  title: m('skill-bill.analysis-scene-yearly.title'),
  family: 'bars',
  values: ({ params, db }) => {
    const year = readYear(params);
    const { start, end } = yearRange(year);
    const records = listRange(db, start, end);
    const kpi = kpiOf(records);
    const monthly = monthSeries(records, 12);
    const cats = aggByL1(records, { topN: 8 });
    const maxMonth = monthly.length === 0 ? 0 : Math.max(...monthly.map((p) => p.expense));
    const maxCat = cats.length === 0 ? 0 : Math.max(...cats.map((c) => c.value));
    const label = String(year);
    return {
      title: m('skill-bill.analysis-scene-yearly.title'),
      label,
      from: start,
      to: end,
      count: records.length,
      conclusion: kpi.count === 0
        ? m('skill-bill.analysis-scene-yearly.c003', { p0: String(label) })
        : m('skill-bill.analysis-scene-yearly.c004', {
          p0: String(label),
          p1: String(String(kpi.count)),
          p2: String(money(kpi.expense)),
          p3: String(money(kpi.income)),
          p4: String(money(kpi.net)),
        }),
      caliber: m('skill-bill.analysis-scene-yearly.c005'),
      chips: [m('skill-bill.analysis-scene-yearly.c006', { p0: String(label) })],
      payload: buildOverview(label, [...records]),
      kpi,
      page: {
        kpis: [
          { label: m('skill-bill.analysis-scene-yearly.c007'), value: money(kpi.expense), unit: m('skill-bill.analysis-scene-yearly.c008') },
          { label: m('skill-bill.analysis-scene-yearly.c009'), value: money(kpi.income), unit: m('skill-bill.analysis-scene-yearly.c010') },
          { label: m('skill-bill.analysis-scene-yearly.c011'), value: money(kpi.net), unit: m('skill-bill.analysis-scene-yearly.c012'), detail: kpi.net >= 0 ? m('skill-bill.analysis-scene-yearly.c013') : m('skill-bill.analysis-scene-yearly.c014') },
          { label: m('skill-bill.analysis-scene-yearly.c015'), value: String(kpi.count), unit: m('skill-bill.analysis-scene-yearly.c016') },
        ],
        chips: [],
        charts: [],
        barGroups: [
          {
            title: m('skill-bill.analysis-scene-yearly.c017', { p0: String(String(monthly.length)) }),
            rows: monthly.map((p) => ({
              label: p.month,
              text: m('skill-bill.analysis-scene-yearly.c018', {
                p0: String(money(p.expense)),
                p1: String(String(p.count)),
              }),
              pct: maxMonth === 0 ? 0 : round1((p.expense / maxMonth) * 100),
            })),
            emptyText: m('skill-bill.analysis-scene-yearly.c019'),
          },
          {
            title: m('skill-bill.analysis-scene-yearly.c020'),
            rows: cats.map((c) => ({
              label: c.key,
              text: m('skill-bill.analysis-scene-yearly.c021', {
                p0: String(money(c.value)),
                p1: String(pctText(c.pct)),
                p2: String(String(c.count)),
              }),
              pct: maxCat === 0 ? 0 : round1((c.value / maxCat) * 100),
            })),
            emptyText: m('skill-bill.analysis-scene-yearly.c022'),
          },
        ],
        listCards: [],
        factCards: [],
        empty: {
          text: m('skill-bill.analysis-scene-yearly.c023', { p0: String(label) }),
          hint: m('skill-bill.analysis-scene-yearly.c024'),
        },
      },
    };
  },
  };
}

export const sceneYearly: AnalysisScene = buildScene();

/** 按语言重建本场景（#1197：文案经词条层，语言是运行期参数）。 */
export function sceneYearlyFor(language: string): AnalysisScene {
  return runWithLanguage(language, buildScene);
}
