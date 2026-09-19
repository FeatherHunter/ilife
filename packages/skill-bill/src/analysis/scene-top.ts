/** 场景件：**看大额**（`kind = 'top'`，命令 `bill.analysis.trend`）——本件只是差异声明与取值，
 *  块位序列住 `./template-bars.ts`（族＝读数＋条）。
 *
 * 老侧对应件：`scripts/analysis/cli.py` 的 `cmd_top`（`:572-594`）
 *  ＋ 模板 `templates/分析/analysis_view.html` 的 `renderTop`（`:721-742`）。
 *
 * 本件的差异（照老侧那一页逐点对）：
 *   ① **参数**（老侧只有 `--from`／`--to` 两个窗口参数）：
 *      · `limit`＝取前几笔，缺省 10；给了就必须是 1~50 的整数，否则 `POLICY_BAD_INPUT` 阻断（不猜、不夹取）；
 *      · 窗口三选一——给 `month` 取整月，给 `start`／`end` 取闭区间（缺一即缺槽位阻断，与老侧
 *        「`--from` 和 `--to` 必须同时指定」同一条口径），都不给＝全部时间；
 *   ② 排行取 `./agg.js` 的 `expenseTop`（支出绝对值降序、同额时间晚的在前、转账除外——老侧那段
 *      `sorted((r for r in records if r.amount < 0), key=amount)[:limit]` 的等价物）；
 *   ③ 老侧每一笔的备注另占一行，新侧并进数值栏那句话（`金额 元 · 日期 · 备注`，#681 偏好 3：
 *      信息等价、版式可全新设计），条长按最大一笔折算；
 *   ④ 期间芯片＝`TOP N · 期间`（老侧 `TOP ${limit} · ${period}` 那枚 `.filter-chip`）；
 *   ⑤ 载荷＝`./views.js` 的 `buildTrend('top', …)`（`limit` 照传）。
 */
import type { BillDb, BillRow } from '../fetch/db.js';
import { BillPolicyError } from '../fetch/errors.js';
import { dayOf, expenseTop, kpiOf, round1, windowWithRecords } from './agg.js';
import { NO_WINDOW, money, textOrDash } from './pageParts.js';
import type { AnalysisScene } from './scene.js';
import { buildTrend } from './views.js';

/** 取前几笔的读数：缺省 10；给了就必须是 1~50 的整数，否则阻断（坏输入不冒充正常）。 */
function limitOf(params: Record<string, unknown>): number {
  const raw = params.limit;
  if (raw === undefined || raw === null || raw === '') return 10;
  const n = typeof raw === 'string' && raw.trim() !== '' ? Number(raw.trim()) : raw;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > 50) {
    throw new BillPolicyError('POLICY_BAD_INPUT', 'limit 须为 1~50 的整数：' + String(raw));
  }
  return n;
}


export const sceneTop: AnalysisScene = {
  id: 'top',
  key: 'bill.analysis.trend',
  kind: 'top',
  title: '看大额',
  family: 'bars',
  values: ({ params, db }) => {
    const limit = limitOf(params);
    const win = windowWithRecords(params, db, { fallback: 'all-time' });
    const items = expenseTop(win.records, limit);
    const peak = items.length === 0 ? 0 : Math.max(...items.map((r) => Math.abs(r.amount)));
    const sum = items.reduce((total, r) => total + Math.abs(r.amount), 0);
    const head = items[0];
    const chip = 'TOP ' + String(limit) + ' · ' + win.label;
    return {
      title: '看大额',
      label: win.label,
      from: win.from,
      to: win.to,
      count: items.length,
      conclusion: head === undefined
        ? win.label + '：没有支出记录。'
        : '支出最大的 ' + String(items.length) + ' 笔合计 ' + money(sum) + ' 元；最贵的一笔是 '
          + textOrDash(dayOf(head.time)) + ' 的「' + textOrDash(head.category) + '」'
          + money(Math.abs(head.amount)) + ' 元。',
      caliber: '支出金额从大到小取前 ' + String(limit) + ' 笔，同额先出时间晚的；条长按最大一笔折算；'
        + '转账与收入都不上这一页。',
      chips: [chip],
      payload: buildTrend('top', [...win.records], { limit }),
      kpi: kpiOf(win.records),
      page: {
        kpis: [],
        chips: [chip],
        charts: [],
        barGroups: [{
          title: '大额支出排行（' + String(items.length) + ' 笔）',
          rows: items.map((r, i) => ({
            label: String(i + 1) + '. ' + textOrDash(r.category),
            text: money(Math.abs(r.amount)) + ' 元 · ' + textOrDash(dayOf(r.time)) + ' · ' + textOrDash(r.note),
            pct: peak === 0 ? 0 : round1((Math.abs(r.amount) / peak) * 100),
          })),
          emptyText: '这段时间还没有支出记录',
        }],
        listCards: [],
        factCards: [],
        empty: {
          text: win.label + ' 还没有支出记录。',
          hint: '先说「记支出」记一笔，回来看这里就有数了。',
        },
      },
    };
  },
};
