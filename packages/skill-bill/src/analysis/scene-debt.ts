/** 场景件：**看借贷**（`kind = 'debt'`，命令 `bill.analysis.trend`）——本件只是差异声明与取值，
 *  块位序列住 `./template-tables.ts`（族＝读数＋表）。
 *
 *  老侧对应件：`scripts/analysis/cli.py` 的 `cmd_debt_summary`（`:807-844`）
 *   ＋ 模板 `templates/分析/analysis_view.html` 的 `renderDebtSummary`（`:960-979`）。
 *
 *  本件的差异（照老侧那一页逐点对）：
 *    ① **无参数、取全库**（老侧 `cmd_debt_summary` 也不读参数）；
 *    ② 标签匹配走 `./agg.js` 的 `tagRecords`（精确整词，与查询域同一条规则）——老侧自写的那两段
 *      标签正则（`:794-804`）不搬；
 *    ③ 对象名仍照老侧 `:816-818` 的形态解析（借出看 `#借给X`、借入看 `#向X借`），解析不出记「未知对象」；
 *    ④ 老侧那张「对象列表」是键值行（`.fact-row`），新侧照 #688 §五 5.2 第 12 行走**小表卡**
 *      （对象／借出未还／借入未还／合计，按合计降序）——事实一条不少，只是换了摆法；
 *    ⑤ 载荷走 `./views.js` 的 `buildTrend('debt', …)`；
 *    ⑥ 老侧 `_calc_kpi` 把转账也计进收支，新侧走 `./agg.js` 的 `kpiOf`（转账不算收支，#691 口径）。
 */
import type { BillRow } from '../fetch/db.js';
import { allRecords, kpiOf, round2, tagRecords } from './agg.js';
import { NO_WINDOW, money, textOrDash } from './pageParts.js';
import type { AnalysisScene } from './scene.js';
import { buildTrend } from './views.js';

/** 借贷的两个方向（老侧 `_target` 的那对分支）。 */
type DebtDirection = '借出' | '借入';

/** 备注里那两串标签的**对象名形态**（老侧 `:816-818` 同形）：借出看 `#借给X`、借入看 `#向X借`；
 *  解析不出＝空串，由调用方记「未知对象」。**标签本身的匹配不在这里**——那走 `./agg.js` 的 `tagRecords`。 */
function targetOf(note: string, direction: DebtDirection): string {
  const hit = direction === '借出' ? /#借给\s*([^\s#]+)/.exec(note) : /#向\s*([^\s#]+)借/.exec(note);
  return hit === null ? '' : hit[1];
}

/** 一批记录的金额合计（借贷一律按绝对值累计，老侧 `abs(...)` 同义）。 */
function totalOf(rows: readonly BillRow[]): number {
  let sum = 0;
  for (const r of rows) sum += Math.abs(r.amount);
  return round2(sum);
}

/** 一个借贷对象的未还两栏。 */
interface DebtObject {
  readonly target: string;
  readonly lent: number;
  readonly borrowed: number;
  readonly total: number;
}

/** 未还的借出／借入按对象归堆（老侧 `by_obj` 同义）：先归堆，再按合计降序。
 *  老侧只按键值排序、同额时顺序不定；新侧同额按对象名兜底，读数与老侧一致、次序可复现。 */
function objectsOf(unpaidLent: readonly BillRow[], unpaidBorrowed: readonly BillRow[]): DebtObject[] {
  const byObject = new Map<string, { lent: number; borrowed: number }>();
  const add = (target: string, side: DebtDirection, amount: number): void => {
    const it = byObject.get(target) ?? { lent: 0, borrowed: 0 };
    if (side === '借出') it.lent += amount;
    else it.borrowed += amount;
    byObject.set(target, it);
  };
  for (const r of unpaidLent) add(targetOf(r.note, '借出') || '未知对象', '借出', Math.abs(r.amount));
  for (const r of unpaidBorrowed) add(targetOf(r.note, '借入') || '未知对象', '借入', Math.abs(r.amount));
  return [...byObject.entries()]
    .map(([target, v]) => ({
      target,
      lent: round2(v.lent),
      borrowed: round2(v.borrowed),
      total: round2(v.lent + v.borrowed),
    }))
    .sort((a, b) => b.total - a.total || a.target.localeCompare(b.target));
}

export const sceneDebt: AnalysisScene = {
  id: 'debt',
  key: 'bill.analysis.trend',
  kind: 'debt',
  title: '看借贷',
  family: 'tables',
  values: ({ db }) => {
    const all = allRecords(db);
    const lent = tagRecords(all, '借出');
    const borrowed = tagRecords(all, '借入');
    const unpaidLent = tagRecords(lent, '未还');
    const unpaidBorrowed = tagRecords(borrowed, '未还');
    const paidLent = tagRecords(lent, '已还');
    const paidBorrowed = tagRecords(borrowed, '已还');
    // 一笔同时带两个方向标签时只算一条（两侧取自同一个全库数组，同一对象的引用去重即够）。
    const rows = [...new Set([...lent, ...borrowed])];
    const objects = objectsOf(unpaidLent, unpaidBorrowed);
    const lentUnpaidTotal = totalOf(unpaidLent);
    const borrowedUnpaidTotal = totalOf(unpaidBorrowed);
    return {
      title: '看借贷',
      label: '全部时间',
      from: NO_WINDOW,
      to: NO_WINDOW,
      count: rows.length,
      conclusion: rows.length === 0
        ? '全库还没有带 #借出／#借入 的记录。'
        : '未还的有 ' + String(objects.length) + ' 个对象：借出 ' + money(lentUnpaidTotal) + ' 元（'
          + String(unpaidLent.length) + ' 笔）、借入 ' + money(borrowedUnpaidTotal) + ' 元（'
          + String(unpaidBorrowed.length) + ' 笔）；已还清的 借出 ' + String(paidLent.length) + ' 笔、借入 '
          + String(paidBorrowed.length) + ' 笔。',
      caliber: '借贷按备注里的 #借出／#借入 两个标签取记录，同一笔要同时带 #未还 或 #已还 才算进那一栏；'
        + '对象名读备注里的 #借给X／#向X借，读不出来记作「未知对象」；转账不计入收支。',
      chips: [],
      payload: buildTrend('debt', [...rows]),
      kpi: kpiOf(rows),
      page: {
        kpis: [
          { label: '借出未还', value: money(lentUnpaidTotal), unit: '元' },
          { label: '借入未还', value: money(borrowedUnpaidTotal), unit: '元' },
          { label: '已还(借出)', value: String(paidLent.length), unit: '笔' },
          { label: '已还(借入)', value: String(paidBorrowed.length), unit: '笔' },
        ],
        chips: [],
        tables: [{
          title: '对象列表（' + String(objects.length) + ' 人）',
          columns: [
            { key: 'target', label: '对象' },
            { key: 'lent', label: '借出未还', align: 'right' },
            { key: 'borrowed', label: '借入未还', align: 'right' },
            { key: 'total', label: '合计', align: 'right' },
          ],
          rows: objects.map((o) => ({
            target: textOrDash(o.target),
            lent: money(o.lent),
            borrowed: money(o.borrowed),
            total: money(o.total),
          })),
          emptyText: '暂无未还借贷',
        }],
        factCards: [],
        empty: {
          text: '全库还没有借贷记录。',
          hint: '先说「记借出」或「记借入」记一笔，回来看这里就有数了。',
        },
      },
    };
  },
};
