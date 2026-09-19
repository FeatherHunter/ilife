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
import { BillPolicyError } from '../fetch/errors.js';
import { listRange } from '../fetch/index.js';
import { monthRange } from '../shared/dateRange.js';
import { compareTwo, kpiOf, thisMonth } from './agg.js';
import { sideKpisOf } from './cards.js';
import { money, pctText } from './pageParts.js';
import { needMonth } from './params.js';
import type { AnalysisScene } from './scene.js';
import { buildCompare } from './views.js';

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

export const sceneYoy: AnalysisScene = {
  id: 'yoy',
  key: 'bill.analysis.compare',
  kind: 'yoy',
  title: '看同比',
  family: 'compare',
  values: ({ params, db }) => {
    const month = slotText(params.month) === '' ? thisMonth() : needMonth(params);
    const last = lastYearMonth(month);
    const thisRange = monthRange(month);
    const lastRange = monthRange(last);
    const ra = listRange(db, thisRange.start, thisRange.end);
    const rb = listRange(db, lastRange.start, lastRange.end);
    const labelA = month + ' 今年';
    const labelB = last + ' 去年';
    const cmp = compareTwo(ra, rb, labelA, labelB);
    const diff = cmp.change.diff;
    const direction: 'up' | 'down' | 'flat' = diff > 0.01 ? 'up' : diff < -0.01 ? 'down' : 'flat';
    const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→';
    const word = direction === 'up' ? '同比上涨' : direction === 'down' ? '同比下降' : '同比持平';
    const pct = direction === 'up'
      ? '+' + pctText(Math.abs(cmp.change.pct))
      : direction === 'down' ? '-' + pctText(Math.abs(cmp.change.pct)) : pctText(0);
    const total = ra.length + rb.length;
    return {
      title: '看同比',
      label: labelA + ' 与 ' + labelB,
      from: lastRange.start,
      to: thisRange.end,
      count: total,
      conclusion: total === 0
        ? month + ' 与去年同月 ' + last + ' 两段都还没有记录。'
        : month + ' 支出 ' + money(cmp.a.expense) + ' 元，去年同月 ' + last + ' 支出 ' + money(cmp.b.expense)
          + ' 元：' + word + ' ' + money(Math.abs(diff)) + ' 元（' + pct + '）。',
      caliber: '两段各取自己那一整月，支出按绝对值累计；百分比以去年同月为分母，去年同月支出为 0 时记 0；转账不计入收支。',
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
          text: '支出 ' + arrow + ' ' + money(Math.abs(diff)) + ' 元（' + pct + '）· ' + word,
          detail: '今年这一侧支出 ' + money(cmp.a.expense) + ' 元，去年同月支出 ' + money(cmp.b.expense) + ' 元；两段各取自己那一整月。',
          direction,
        },
        barGroups: [],
        factCards: [],
        empty: {
          text: month + ' 与去年同月 ' + last + ' 都没有记录。',
          hint: '先说「记支出」或「记收入」记一笔，回来看这里就有数了。',
        },
      },
    };
  },
};
