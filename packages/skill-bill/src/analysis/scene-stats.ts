/** 场景件：**做统计**（`kind = 'stats'`，命令 `bill.analysis.overview`）——本件只是差异声明与取值，
 *  块位序列住 `./template-bars.ts`（族＝读数＋条）。
 *
 * 老侧对应件：`scripts/analysis/cli.py` 的 `cmd_stats`（`:671-692`，取数走 `_fetch()` 全库）
 *  ＋ 模板 `templates/分析/analysis_view.html` 的 `renderStats`（`:800-821`）。
 *
 * 本件的差异（照老侧那一页逐点对）：
 *   ① **无参数、取全库**（老侧 `_fetch()` 不带窗口）：来源脚注的窗口＝首末记录所在日期，没有记录时写「不限」；
 *   ② 三格读数＝总笔数／记账天数（有记录的不同日期数）／日均笔数（总笔数 ÷ 记账天数，两位小数）；
 *   ③ 「时间范围」两行（首笔时间／最近记录）走**事实卡**——老侧是同形两枚读数卡，版式改、事实一条不少；
 *   ④ 月度分布＝`./agg.js` 的 `monthSeries` 逐月笔数，**没有记录的月不出行**（老侧 `by_month` 也只收有记录的月，
 *      与 #688 裁定 3「零值不出柱身」同向）；条长按最大月折算；
 *   ⑤ 载荷＝`./views.js` 的 `buildOverview(label, …)`（`stat` 形的 `metrics` 全 number）——与本命令
 *      另 8 条场景同一支，搬迁前那条命令的载荷形状一字不改（本件**不**另加 `summary` 字段）。
 *      **另附 `buildOverview` 的 `metrics`**——本命令的形状是 `stat`（出口守卫要 `data.metrics` 且值全 number），
 *      只给 `summary` 会在 `buildBillEnvelope` 处报「stat 形缺 metrics 对象」而 exit 2。
 */
import type { BillRow } from '../fetch/db.js';
import { allRecords, dayOf, firstTimeOf, kpiOf, lastTimeOf, monthOf, monthSeries, round1, round2 } from './agg.js';
import { NO_WINDOW, money, textOrDash } from './pageParts.js';
import type { AnalysisScene } from './scene.js';
import { buildOverview } from './views.js';

/** 记录跨了几个月（首笔所在月到最近一笔所在月，含首尾）；没有记录＝0。 */
function monthSpan(records: readonly BillRow[]): number {
  const first = firstTimeOf(records);
  const last = lastTimeOf(records);
  if (first === '' || last === '') return 0;
  const a = monthOf(first);
  const b = monthOf(last);
  const span = (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12
    + (Number(b.slice(5, 7)) - Number(a.slice(5, 7))) + 1;
  return span < 1 ? 1 : span;
}

export const sceneStats: AnalysisScene = {
  id: 'stats',
  key: 'bill.analysis.overview',
  kind: 'stats',
  title: '做统计',
  family: 'bars',
  values: ({ db }) => {
    const rows = allRecords(db);
    const kpi = kpiOf(rows);
    const days = new Set(rows.map((r) => dayOf(r.time))).size;
    const daily = days === 0 ? 0 : round2(kpi.count / days);
    const first = firstTimeOf(rows);
    const last = lastTimeOf(rows);
    const series = monthSeries(rows, monthSpan(rows)).filter((m) => m.count > 0);
    const peak = series.length === 0 ? 0 : Math.max(...series.map((m) => m.count));
    const label = '全部时间';
    return {
      title: '做统计',
      label,
      from: first === '' ? NO_WINDOW : dayOf(first),
      to: last === '' ? NO_WINDOW : dayOf(last),
      count: rows.length,
      conclusion: rows.length === 0
        ? '全库一条记录都没有。'
        : '全库一共 ' + String(kpi.count) + ' 笔，落在 ' + String(days) + ' 个记账日，日均 ' + money(daily)
          + ' 笔；第一笔在 ' + textOrDash(first) + '，最近一笔在 ' + textOrDash(last) + '。',
      caliber: '笔数与月度分布走转账除外的口径（转账不入收支），没有记录的月不出行；'
        + '记账天数＝库里有记录的不同日期数，时间范围取库内首末两条记录的时刻。',
      chips: [],
      payload: buildOverview(label, [...rows]),
      kpi,
      page: {
        kpis: [
          { label: '总笔数', value: String(kpi.count), unit: '笔' },
          { label: '记账天数', value: String(days), unit: '天' },
          { label: '日均笔数', value: money(daily), unit: '笔/天' },
        ],
        chips: [],
        charts: [],
        barGroups: [{
          title: '月度分布（' + String(series.length) + ' 个月）',
          rows: series.map((m) => ({
            label: m.month,
            text: String(m.count) + ' 笔',
            pct: peak === 0 ? 0 : round1((m.count / peak) * 100),
          })),
          emptyText: '还没有记录，看不出月度分布',
        }],
        listCards: [],
        factCards: [{
          title: '时间范围',
          rows: [
            { k: '首笔时间', v: textOrDash(first) },
            { k: '最近记录', v: textOrDash(last) },
          ],
        }],
        empty: {
          text: '全库还没有记录。',
          hint: '先说「记支出」或「记收入」记一笔，回来看这里就有数了。',
        },
      },
    };
  },
};
