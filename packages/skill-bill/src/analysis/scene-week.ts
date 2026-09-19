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
import { listRange } from '../fetch/index.js';
import { weekRange } from '../shared/dateRange.js';
import { compareTwo, dayOf, expenseTop, kpiOf, round1, windowRecords } from './agg.js';
import { money, pctText, textOrDash, windowLabel } from './pageParts.js';
import { BillPolicyError } from '../fetch/errors.js';
import type { AnalysisScene } from './scene.js';
import { buildOverview } from './views.js';

/** 日期串左移／右移整周（`YYYY-MM-DD`，UTC 口径——周一是几号与本地时区无关）。 */
function shiftDays(date: string, days: number): string {
  const ms = Date.parse(date + 'T00:00:00Z');
  if (!Number.isFinite(ms)) throw new BillPolicyError('POLICY_BAD_INPUT', '日期串认不得：' + date);
  return new Date(ms + days * 86400000).toISOString().slice(0, 10);
}

/** `YYYY-MM-DD` → `MM/DD`（周区间标签用）。 */
function mmdd(date: string): string { return date.slice(5).replace('-', '/'); }

/** 一段周区间的标签：`MM/DD~MM/DD 周`（与老侧 `_compare_two` 那两个期间标签同形）。 */
function weekKey(start: string, end: string): string { return mmdd(start) + '~' + mmdd(end) + ' 周'; }

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

export const sceneWeek: AnalysisScene = {
  id: 'week',
  key: 'bill.analysis.overview',
  kind: 'week',
  title: '看周报',
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
    const word = diff > 0 ? '上涨' : diff < 0 ? '下降' : '持平';
    const top = expenseTop(records, 5);
    const maxTop = top.length === 0 ? 0 : Math.max(...top.map((r) => Math.abs(r.amount)));
    const sameCount = kpi.count === lastRecords.length;
    const changeClause = sameCount && diff === 0
      ? '支出与上周一样多。'
      : '支出比上周 ' + arrow + ' ' + money(Math.abs(diff)) + ' 元（' + pctText(Math.abs(pct)) + '），' + word + '。';
    return {
      title: '看周报',
      label,
      from: start,
      to: end,
      count: records.length,
      conclusion: kpi.count === 0
        ? label + ' 一笔都没有记；上一周 ' + lastLabel + ' 记了 ' + String(lastRecords.length) + ' 笔。'
        : label + ' 一共记了 ' + String(kpi.count) + ' 笔：支出 ' + money(kpi.expense) + ' 元、收入 '
          + money(kpi.income) + ' 元、净额 ' + money(kpi.net) + ' 元；' + changeClause,
      caliber: '本周从周一起算七天；条长按本周最大一笔支出折算，只出前 5 笔；转账不计入收支。',
      chips: [label],
      payload: buildOverview(label, [...records]),
      kpi,
      page: {
        kpis: [
          { label: '本周支出', value: money(kpi.expense), unit: '元' },
          { label: '本周收入', value: money(kpi.income), unit: '元' },
          { label: '净额', value: money(kpi.net), unit: '元', detail: kpi.net >= 0 ? '收大于支' : '支大于收' },
          { label: '笔数', value: String(kpi.count), unit: '笔' },
        ],
        chips: [],
        charts: [],
        barGroups: [{
          title: '本周大额支出 TOP ' + String(top.length),
          rows: top.map((r, i) => ({
            label: String(i + 1) + '. ' + r.category,
            text: money(Math.abs(r.amount)) + ' 元 · ' + dayOf(r.time) + ' · ' + textOrDash(r.note),
            pct: maxTop === 0 ? 0 : round1((Math.abs(r.amount) / maxTop) * 100),
          })),
          emptyText: '本周还没有支出记录',
        }],
        listCards: [],
        factCards: [{
          title: '本周 vs 上周',
          rows: [
            { k: '本周笔数', v: String(kpi.count) + ' 笔' },
            { k: '本周支出', v: money(kpi.expense) + ' 元' },
            { k: '本周收入', v: money(kpi.income) + ' 元' },
            { k: '本周净额', v: money(kpi.net) + ' 元' },
            { k: '上周笔数', v: String(lastRecords.length) + ' 笔' },
            { k: '上周支出', v: money(pair.b.expense) + ' 元' },
            { k: '上周收入', v: money(pair.b.income) + ' 元' },
            { k: '上周净额', v: money(pair.b.net) + ' 元' },
          ],
        }],
        empty: {
          text: label + ' 这一周还没有记录。',
          hint: '先说「记支出」或「记收入」记一笔，回来看这里就有数了。',
        },
      },
    };
  },
};
