/** 场景件：**看分类**（`kind = 'category'`，命令 `bill.analysis.overview`）——本件只是差异声明与取值，
 *  块位序列住 `./template-bars.ts`（族＝读数＋条）。
 *
 * 老侧对应件：`scripts/analysis/cli.py` 的 `cmd_category`（`:272-300`）
 *  ＋ 模板 `templates/分析/analysis_view.html` 的 `renderCategory`（`:381-418`）。
 *
 * 本件的差异（照老侧那一页逐点对）：
 *   ① 期间＝起止两端（`start`／`end` **同给**，校验走 `./params.js` 的 `needRange`；缺一即缺槽位阻断），
 *      没给就按月（缺 `month` 即本月，老侧 `args.month or date.today()...` 那条兼容路）；
 *      **两端优先于月份**——老侧 `if args.from_date or args.to_date` 同一条次序；
 *   ② 归堆按**一级分类**（老侧 `_agg_expense_by(..., lambda r: _l1(r.category))`），全路径不并档——
 *      与「看月度」那一页（全路径归堆）**故意不同**，两页各有各的口径；
 *   ③ 账户筛选与收支方向走 `./agg.js` 的 `filterOf`（老侧 `_filter` 同义）；**转账已由聚合件剔掉**
 *      （#691 定死的口径，本件不自己看金额正负）；
 *   ④ 每类均值＝该类金额 ÷ 该类笔数（老侧 `c.avg`），条长按**最大一类**折算（老侧 `Math.max(...)`），
 *      环形图圆心读数＝本期该方向的合计（老侧 donut 的 `centerValue`）；
 *   ⑤ 载荷照搬迁前那一支（`./views.js` 的 `buildOverview`），一字不改。
 */
import { BillPolicyError } from '../fetch/errors.js';
import { listRange } from '../fetch/index.js';
import { aggByL1, filterOf, kpiOf, readWindow, round1, round2 } from './agg.js';
import type { Direction } from './agg.js';
import { money, pctText } from './pageParts.js';
import type { AnalysisScene } from './scene.js';
import { buildOverview } from './views.js';


/** 收支方向槽：缺＝支出；只认支出／收入两个方向，别的一律如实抛（本件不猜、不兜底）。 */
function readDirection(params: Record<string, unknown>): Direction {
  const raw = params.type;
  if (raw === undefined || raw === null || raw === '') return 'expense';
  if (raw === 'expense' || raw === 'income') return raw;
  throw new BillPolicyError('POLICY_BAD_INPUT', '收支方向只能取支出或收入：' + JSON.stringify(raw));
}

/** 账户筛选槽：给了非空账户名就只看它，没给＝全账户（老侧 `args.account` 那条）。 */
function readAccount(params: Record<string, unknown>): string {
  return typeof params.account === 'string' ? params.account.trim() : '';
}

export const sceneCategory: AnalysisScene = {
  id: 'category',
  key: 'bill.analysis.overview',
  kind: 'category',
  title: '看分类',
  family: 'bars',
  values: ({ params, db }) => {
    const win = readWindow(params);
    const direction = readDirection(params);
    const account = readAccount(params);
    const records = filterOf(listRange(db, win.from, win.to), { account, direction });
    const kpi = kpiOf(records);
    const cats = aggByL1(records, { direction });
    const side = direction === 'income' ? '收入' : '支出';
    const total = direction === 'income' ? kpi.income : kpi.expense;
    const head = cats[0];
    const max = cats.length === 0 ? 0 : Math.max(...cats.map((c) => c.value));
    return {
      title: '看分类',
      label: win.label,
      from: win.from,
      to: win.to,
      count: records.length,
      conclusion: head === undefined
        ? win.label + ' 这段时间一笔' + side + '都没有记。'
        : win.label + ' 的' + side + '共 ' + money(total) + ' 元，分在 ' + String(cats.length) + ' 个一级分类里；'
          + '最多的是「' + head.key + '」' + money(head.value) + ' 元，占 ' + pctText(head.pct) + '。',
      caliber: '按一级分类归堆（全路径不并档），占比与环形图都按本期' + side + '合计算；条长按最大一类折算。'
        + '转账不计入收支' + (account === '' ? '。' : '；本页只看账户「' + account + '」的记录。'),
      chips: [win.label],
      payload: buildOverview(win.label, [...records]),
      kpi,
      page: {
        kpis: [
          { label: '总' + side, value: money(total), unit: '元' },
          { label: '分类数', value: String(cats.length), unit: '类' },
          { label: '期间', value: win.label },
        ],
        chips: [win.label],
        charts: cats.length === 0 ? [] : [{
          title: '分类占比',
          kind: 'donut',
          input: {
            items: cats.map((c) => ({ label: c.key, value: c.value })),
            options: { centerLabel: '总' + side, centerValue: money(total) },
          },
        }],
        barGroups: [{
          title: '占比明细（' + String(cats.length) + ' 类）',
          rows: cats.map((c) => ({
            label: c.key,
            text: money(c.value) + ' 元 · ' + String(c.count) + ' 笔 · ' + pctText(c.pct)
              + ' · 均 ' + money(round2(c.value / c.count)),
            pct: max === 0 ? 0 : round1((c.value / max) * 100),
          })),
          emptyText: '这段时间还没有' + side + '记录',
        }],
        listCards: [],
        factCards: [],
        empty: {
          text: win.label + ' 这段时间还没有记录。',
          hint: '先说「记支出」或「记收入」记一笔，回来看这里就有数了。',
        },
      },
    };
  },
};
