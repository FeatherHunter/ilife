/** 场景件：**看报销**（`kind = 'reimburse'`，命令 `bill.analysis.trend`）——本件只是差异声明与取值，
 *  块位序列住 `./template-tables.ts`（族＝读数＋表）。
 *
 *  老侧对应件：`scripts/analysis/cli.py` 的 `cmd_reimburse_summary`（`:847-868`）
 *   ＋ 模板 `templates/分析/analysis_view.html` 的 `renderReimburseSummary`（`:982-1008`）。
 *
 *  本件的差异（照老侧那一页逐点对）：
 *    ① **无参数、取全库**（老侧 `cmd_reimburse_summary` 也不读参数）；
 *    ② 两批记录＝备注带 `#待报销` 的与带 `#报销到账` 的，标签匹配走 `./agg.js` 的 `tagRecords`
 *      （精确整词，与查询域同一条规则）——老侧自写的那两段标签正则（`:794-804`）不搬；
 *    ③ 金额一律取**绝对值**（老侧 `abs(r.get("amount"))` 同义：待报销那笔在库里是负数支出、
 *      到账那笔是正数收入，两批在同一张表里按同一口径显示）；
 *    ④ 历史＝两批合起来按时间降序（老侧 `history.sort(..., reverse=True)`），状态分别是「待报销」／「已到账」；
 *    ⑤ 老侧那张「历史报销」是流水行（`.record`）＋ 状态徽章，新侧照 #688 §五 5.2 第 12 行走**小表卡**
 *      （时间／分类／金额／状态／备注）——事实一条不少，只是换了摆法；
 *    ⑥ 载荷走 `./views.js` 的 `buildTrend('reimburse', …)`；
 *    ⑦ 老侧 `_calc_kpi` 把转账也计进收支，新侧走 `./agg.js` 的 `kpiOf`（转账不算收支，#691 口径）。
 */
import { runWithLanguage } from 'base-entries';
import type { BillRow } from '../fetch/db.js';
import { allRecords, dayOf, kpiOf, round2, tagRecords } from './agg.js';
import { NO_WINDOW, money, textOrDash } from './pageParts.js';
import type { AnalysisScene } from './scene.js';
import { buildTrend } from './views.js';
import { m } from '../entries/index.js';

/** 一笔报销在历史表里的样子（记录 ＋ 它落的那一栏）。 */
interface ReimburseRow {
  readonly row: BillRow;
  readonly status: string;
}

/** 备注里那两串标签，按它们在库里的**原文写法**（带 `#`）立常量——与写入域
 *  （`../write/scene-reimburse.ts` 的 `TAG`、`../write/scene-reimburse-done.ts` 的 `TAG_WAIT`／`TAG_ARRIVE`）
 *  同形：那边也是带 `#` 写、本件取数时去掉 `#` 交给 `agg.js` 的 `tagRecords`（它按不含 `#` 的标签名比对）。 */
const TAG_WAIT = '#待报销';
const TAG_ARRIVED = '#报销到账';

/** 一批记录的金额合计（报销一律按绝对值累计，老侧 `abs(...)` 同义）。 */
function totalOf(rows: readonly BillRow[]): number {
  let sum = 0;
  for (const r of rows) sum += Math.abs(r.amount);
  return round2(sum);
}

function buildScene(): AnalysisScene {
  return {
  id: 'reimburse',
  key: 'bill.analysis.trend',
  kind: 'reimburse',
  title: m('skill-bill.analysis-scene-reimburse.title'),
  family: 'tables',
  values: ({ db }) => {
    const all = allRecords(db);
    const pending = tagRecords(all, TAG_WAIT.slice(1));
    const received = tagRecords(all, TAG_ARRIVED.slice(1));
    const rows = [...pending, ...received];
    const history: ReimburseRow[] = [
      ...pending.map((row) => ({ row, status: m('skill-bill.analysis-scene-reimburse.c002') })),
      ...received.map((row) => ({ row, status: m('skill-bill.analysis-scene-reimburse.c003') })),
    ].sort((a, b) => b.row.time.localeCompare(a.row.time));
    const pendingTotal = totalOf(pending);
    const receivedTotal = totalOf(received);
    const newest = history.at(0);
    const newestTail = newest === undefined
      ? '。'
      : m('skill-bill.analysis-scene-reimburse.c004', {
        p0: String(dayOf(newest.row.time)),
        p1: String(money(Math.abs(newest.row.amount))),
        p2: String(newest.status),
      });
    return {
      title: m('skill-bill.analysis-scene-reimburse.title'),
      label: m('skill-bill.analysis-scene-reimburse.c006'),
      from: NO_WINDOW,
      to: NO_WINDOW,
      count: rows.length,
      conclusion: rows.length === 0
        ? m('skill-bill.analysis-scene-reimburse.c007')
        : m('skill-bill.analysis-scene-reimburse.c008', {
          p0: String(money(pendingTotal)),
          p1: String(String(pending.length)),
          p2: String(money(receivedTotal)),
          p3: String(String(received.length)),
          p4: String(newestTail),
        }),
      caliber: m('skill-bill.analysis-scene-reimburse.c009'),
      chips: [],
      payload: buildTrend('reimburse', [...rows]),
      kpi: kpiOf(rows),
      page: {
        kpis: [
          { label: m('skill-bill.analysis-scene-reimburse.c010'), value: money(pendingTotal), unit: m('skill-bill.analysis-scene-reimburse.c011') },
          { label: m('skill-bill.analysis-scene-reimburse.c012'), value: String(pending.length), unit: m('skill-bill.analysis-scene-reimburse.c013') },
          { label: m('skill-bill.analysis-scene-reimburse.c014'), value: money(receivedTotal), unit: m('skill-bill.analysis-scene-reimburse.c015') },
          { label: m('skill-bill.analysis-scene-reimburse.c016'), value: String(received.length), unit: m('skill-bill.analysis-scene-reimburse.c017') },
        ],
        chips: [],
        tables: [{
          title: m('skill-bill.analysis-scene-reimburse.c018', { p0: String(String(history.length)) }),
          columns: [
            { key: 'time', label: m('skill-bill.analysis-scene-reimburse.c019') },
            { key: 'category', label: m('skill-bill.analysis-scene-reimburse.c020') },
            { key: 'amount', label: m('skill-bill.analysis-scene-reimburse.c021'), align: 'right' },
            { key: 'status', label: m('skill-bill.analysis-scene-reimburse.c022') },
            { key: 'note', label: m('skill-bill.analysis-scene-reimburse.c023') },
          ],
          rows: history.map((h) => ({
            time: textOrDash(h.row.time),
            category: textOrDash(h.row.category),
            amount: money(Math.abs(h.row.amount)),
            status: textOrDash(h.status),
            note: textOrDash(h.row.note),
          })),
          emptyText: m('skill-bill.analysis-scene-reimburse.c024'),
        }],
        factCards: [],
        empty: {
          text: m('skill-bill.analysis-scene-reimburse.c025'),
          hint: m('skill-bill.analysis-scene-reimburse.c026'),
        },
      },
    };
  },
  };
}

export const sceneReimburse: AnalysisScene = buildScene();

/** 按语言重建本场景（#1197：文案经词条层，语言是运行期参数）。 */
export function sceneReimburseFor(language: string): AnalysisScene {
  return runWithLanguage(language, buildScene);
}
