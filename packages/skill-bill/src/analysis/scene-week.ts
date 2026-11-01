/** 场景件：**看周报**（`kind = 'week'`，命令 `bill.analysis.overview`）——本件只是差异声明与取值，
 *  块位序列住 `./template-bars.ts`（族＝读数＋条）。
 *
 * 老侧对应件：`scripts/analysis/cli.py` 的 `cmd_week`（`:240-267`）
 *  ＋ 模板 `templates/分析/analysis_view.html` 的 `renderWeek`（`:347-378`）。
 *
 * 本件的差异（照老侧那一页逐点对）：
 *   ① 期间＝参数 `offset` 定的那一周（0＝本周、1＝上周，缺即本周；非「零或正整数」即如实抛）；
 *      本周＝`weekRange()`（周一起算）给的起点起 7 天，上一周＝起点再往前 7 天的那一段；
 *   ② 上周的记录**另取一次**（`windowRecords`），与本周各算各的读数（老侧 `_fetch` 两次同义）；
 *   ③ 老侧那枚**变更徽标**（`↑ 533.00 元 (1025.0%) · 支出上涨`）本族没有槽位，
 *      信息**并进结论句**（箭头、金额、百分比、涨跌三个字都在那一句里），事实卡「本周 vs 上周」出八行读数；
 *   ④ 大额支出只出本周前 5 笔（`expenseTop`），条长按本页最大一笔折算，标签带序号；
 *   ⑤ 载荷照搬迁前那一支（`./views.js` 的 `buildOverview`），一字不改。
 */
import { runWithLanguage } from 'base-entries';
import { listRange } from '../fetch/index.js';
import { weekRange } from '../shared/dateRange.js';
import { compareTwo, dayOf, expenseTop, kpiOf, round1, windowRecords } from './agg.js';
import { money, pctText, textOrDash, windowLabel } from './pageParts.js';
import { BillPolicyError } from '../fetch/errors.js';
import type { AnalysisScene } from './scene.js';
import { buildOverview } from './views.js';
import { m } from '../entries/index.js';

/** 日期串左移／右移整周（`YYYY-MM-DD`，UTC 口径——周一是几号与本地时区无关）。 */
function shiftDays(date: string, days: number): string {
  const ms = Date.parse(date + 'T00:00:00Z');
  if (!Number.isFinite(ms)) throw new BillPolicyError('POLICY_BAD_INPUT', '日期串认不得：' + date);
  return new Date(ms + days * 86400000).toISOString().slice(0, 10);
}

/** `YYYY-MM-DD` → `MM/DD`（周区间标签用）。 */
function mmdd(date: string): string { return date.slice(5).replace('-', '/'); }

/** 一段周区间的标签：`MM/DD~MM/DD 周`（与老侧 `_compare_two` 那两个期间标签同形）。 */
function weekKey(start: string, end: string): string { return m('skill-bill.analysis-scene-week.c001', { p0: String(mmdd(start)), p1: String(mmdd(end)) }); }

/** 周区间起点：本周起点就是本周一的日期，最准确也最省事。 */
function anchorStart(): string { return weekRange().start; }

/** `offset` 槽：缺＝0（本周）；只认零或正整数，认不得即如实抛。 */
function readOffset(params: Record<string, unknown>): number {
  const raw = params.offset;
  if (raw === undefined || raw === null || raw === '') return 0;
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n) || Math.floor(n) !== n || n < 0) {
    throw new BillPolicyError('POLICY_BAD_INPUT', 'offset 得是零或正整数：' + JSON.stringify(raw));
  }
  return n;
}

function buildScene(): AnalysisScene {
  return {
  id: 'week',
  key: 'bill.analysis.overview',
  kind: 'week',
  title: m('skill-bill.analysis-scene-week.title'),
  family: 'bars',
  values: ({ params, db }) => {
    const offset = readOffset(params);
    const start = shiftDays(anchorStart(), -7 * offset);
    const end = shiftDays(start, 6);
    const lastStart = shiftDays(start, -7);
    const lastEnd = shiftDays(start, -1);
    const records = listRange(db, start, end);
    const lastRecords = windowRecords(db, lastStart, lastEnd);
    const kpi = kpiOf(records);
    const label = weekKey(start, end);
    const lastLabel = weekKey(lastStart, lastEnd);
    const pair = compareTwo(records, lastRecords, label, lastLabel);
    const diff = pair.change.diff;
    const pct = pair.change.pct;
    const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
    const word = diff > 0 ? m('skill-bill.analysis-scene-week.c003') : diff < 0 ? m('skill-bill.analysis-scene-week.c004') : m('skill-bill.analysis-scene-week.c005');
    const top = expenseTop(records, 5);
    const maxTop = top.length === 0 ? 0 : Math.max(...top.map((r) => Math.abs(r.amount)));
    const sameCount = kpi.count === lastRecords.length;
    const changeClause = sameCount && diff === 0
      ? m('skill-bill.analysis-scene-week.c006')
      : m('skill-bill.analysis-scene-week.c007', {
        p0: String(arrow),
        p1: String(money(Math.abs(diff))),
        p2: String(pctText(Math.abs(pct))),
        p3: String(word),
      });
    return {
      title: m('skill-bill.analysis-scene-week.title'),
      label,
      from: start,
      to: end,
      count: records.length,
      conclusion: kpi.count === 0
        ? m('skill-bill.analysis-scene-week.c009', {
          p0: String(label),
          p1: String(lastLabel),
          p2: String(String(lastRecords.length)),
        })
        : m('skill-bill.analysis-scene-week.c010', {
          p0: String(label),
          p1: String(String(kpi.count)),
          p2: String(money(kpi.expense)),
          p3: String(money(kpi.income)),
          p4: String(money(kpi.net)),
          p5: String(changeClause),
        }),
      caliber: m('skill-bill.analysis-scene-week.c011'),
      chips: [label],
      payload: buildOverview(label, [...records]),
      kpi,
      page: {
        kpis: [
          { label: m('skill-bill.analysis-scene-week.c012'), value: money(kpi.expense), unit: m('skill-bill.analysis-scene-week.c013') },
          { label: m('skill-bill.analysis-scene-week.c014'), value: money(kpi.income), unit: m('skill-bill.analysis-scene-week.c015') },
          { label: m('skill-bill.analysis-scene-week.c016'), value: money(kpi.net), unit: m('skill-bill.analysis-scene-week.c017'), detail: kpi.net >= 0 ? m('skill-bill.analysis-scene-week.c018') : m('skill-bill.analysis-scene-week.c019') },
          { label: m('skill-bill.analysis-scene-week.c020'), value: String(kpi.count), unit: m('skill-bill.analysis-scene-week.c021') },
        ],
        chips: [],
        charts: [],
        barGroups: [{
          title: m('skill-bill.analysis-scene-week.c022', { p0: String(String(top.length)) }),
          rows: top.map((r, i) => ({
            label: String(i + 1) + '. ' + r.category,
            text: m('skill-bill.analysis-scene-week.c023', {
              p0: String(money(Math.abs(r.amount))),
              p1: String(dayOf(r.time)),
              p2: String(textOrDash(r.note)),
            }),
            pct: maxTop === 0 ? 0 : round1((Math.abs(r.amount) / maxTop) * 100),
          })),
          emptyText: m('skill-bill.analysis-scene-week.c024'),
        }],
        listCards: [],
        factCards: [{
          title: m('skill-bill.analysis-scene-week.c025'),
          rows: [
            { k: m('skill-bill.analysis-scene-week.c026'), v: m('skill-bill.analysis-scene-week.c027', { p0: String(String(kpi.count)) }) },
            { k: m('skill-bill.analysis-scene-week.c028'), v: m('skill-bill.analysis-scene-week.c029', { p0: String(money(kpi.expense)) }) },
            { k: m('skill-bill.analysis-scene-week.c030'), v: m('skill-bill.analysis-scene-week.c031', { p0: String(money(kpi.income)) }) },
            { k: m('skill-bill.analysis-scene-week.c032'), v: m('skill-bill.analysis-scene-week.c033', { p0: String(money(kpi.net)) }) },
            { k: m('skill-bill.analysis-scene-week.c034'), v: m('skill-bill.analysis-scene-week.c035', { p0: String(String(lastRecords.length)) }) },
            { k: m('skill-bill.analysis-scene-week.c036'), v: m('skill-bill.analysis-scene-week.c037', { p0: String(money(pair.b.expense)) }) },
            { k: m('skill-bill.analysis-scene-week.c038'), v: m('skill-bill.analysis-scene-week.c039', { p0: String(money(pair.b.income)) }) },
            { k: m('skill-bill.analysis-scene-week.c040'), v: m('skill-bill.analysis-scene-week.c041', { p0: String(money(pair.b.net)) }) },
          ],
        }],
        empty: {
          text: m('skill-bill.analysis-scene-week.c042', { p0: String(label) }),
          hint: m('skill-bill.analysis-scene-week.c043'),
        },
      },
    };
  },
  };
}

export const sceneWeek: AnalysisScene = buildScene();

/** 按语言重建本场景（#1197：文案经词条层，语言是运行期参数）。 */
export function sceneWeekFor(language: string): AnalysisScene {
  return runWithLanguage(language, buildScene);
}
