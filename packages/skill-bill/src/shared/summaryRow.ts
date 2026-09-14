/** 结论摘要行（每张页都有的一行，**唯一定义地**）：金额、方向、三级分类、账户、账本、时间一眼看完。
 *
 * 谁在用（两个调用点，指名）：
 *   ① `src/record/collect.ts`——过程型采集页：事实取自本次 `--params`（缺的槽位写「未给」）；
 *   ② `src/record/receipt.ts`——结果型回执整页：事实取自写库后库内那一行（`BillRow`）。
 *  第二个消费者：`src/query/`（随兄弟图 #403 的查询域一起到位，出来的是同一套采集页／回执页／复制区）。
 *
 * 两件出去：`moneyDirection`（符号即方向那句话的唯一定义地）＋ `summaryRow`（那几格卡）。
 *  分两件是因为方向那句话在采集页的阻断条、回执页的状态卡上都要引用同一份措辞，别处不许各写一句。
 *
 * 口径出处：`docs/skills/skill-bill/t407-页面块清单-16词.md` 第一节第 3 行（`renderKpiCard` ＋ `renderKpiGrid`
 *  ＋ `renderCaliberLine`）。三级分类的一级取自 `src/policy/category.ts` 的 `l1Of`（分类口径的唯一真相源），
 *  本件不另写一份 L1 名单。
 */
import { renderCaliberLine, renderKpiGrid } from 'base-paint/blocks';
import type { KpiCardInput } from 'base-paint/blocks';
import { l1Of } from '../policy/category.js';

/** 摘要行的事实：六格取值。`amount` 用 `null` 表示「还没给」（0 是给了，但本仓不记零）。 */
export interface SummaryFacts {
  readonly amount: number | null;
  readonly category: string;
  readonly account: string;
  readonly ledger: string;
  readonly time: string;
}

/** 金额一律两位小数；`null`＝未给。 */
function moneyText(amount: number | null): string {
  if (amount === null || !Number.isFinite(amount)) return '未给';
  return (amount > 0 ? '+' : '') + amount.toFixed(2);
}

/** 方向那句话（**唯一定义地**）：符号即方向——支出负数、收入正数。 */
export function moneyDirection(amount: number | null): string {
  if (amount === null || !Number.isFinite(amount)) return '未判（金额还没给）';
  if (amount < 0) return '支出（取负数）';
  if (amount > 0) return '收入（取正数）';
  return '零（本仓不记零）';
}

/** 结论摘要行的几格（**唯一定义地**）：采集页直接出网格，回执页把它们并进自己那张网格里。
 *  `amount` 未给时那一格写「未给」，不拿 0 顶替。 */
export function summaryCards(facts: SummaryFacts): readonly KpiCardInput[] {
  const l1 = facts.category.trim() === '' ? '' : l1Of(facts.category);
  return [
    { label: '金额', value: moneyText(facts.amount), detail: moneyDirection(facts.amount) },
    {
      label: '分类',
      value: facts.category.trim() === '' ? '未给' : facts.category,
      detail: facts.category.trim() === '' ? '三级分类：L1/L2/L3 都要能对上' : '一级＝' + l1 + '（L1/L2/L3 三级）',
    },
    { label: '账户', value: facts.account.trim() === '' ? '未给' : facts.account, detail: '缺省＝默认账户' },
    { label: '账本', value: facts.ledger.trim() === '' ? '未给' : facts.ledger, detail: '缺省＝默认账本' },
    { label: '时间', value: facts.time.trim() === '' ? '未给' : facts.time, detail: '缺省＝今天 12:00:00' },
  ];
}

/** 结论摘要行：那张网格 ＋ 一行口径。 */
export function summaryRow(facts: SummaryFacts): string {
  return renderKpiGrid(summaryCards(facts))
    + renderCaliberLine('金额符号即方向：支出记负、收入记正；分类按 L1/L2/L3 三级给，别只给一级。');
}
